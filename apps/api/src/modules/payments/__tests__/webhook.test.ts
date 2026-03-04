import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pagarme.service BEFORE importing webhook handler
vi.mock('../pagarme.service', () => ({
  getPagarmeService: () => ({
    validateWebhookSignature: vi.fn((body: string, sig: string) => sig === 'valid_signature'),
  }),
}));

// Mock payments.service
vi.mock('../payments.service', () => ({
  checkPaymentCompletion: vi.fn(),
}));

import { handleWebhook } from '../webhook.handler';
import { checkPaymentCompletion } from '../payments.service';

function createMockRequest(body: unknown, signature?: string) {
  return {
    body,
    headers: {
      'x-hub-signature': signature,
    },
    server: {
      prisma: {
        payment: {
          findFirst: vi.fn(),
          findUnique: vi.fn(),
          update: vi.fn(),
        },
      },
    },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  } as unknown as Parameters<typeof handleWebhook>[0];
}

function createMockReply() {
  const reply = {
    status: vi.fn(),
    send: vi.fn(),
  };
  reply.status.mockReturnValue(reply);
  reply.send.mockReturnValue(reply);
  return reply as unknown as Parameters<typeof handleWebhook>[1];
}

describe('Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when signature header is missing', async () => {
    const request = createMockRequest({ type: 'order.paid' }, undefined);
    const reply = createMockReply();

    await handleWebhook(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Missing webhook signature' }),
    );
  });

  it('should return 401 when signature is invalid', async () => {
    const request = createMockRequest({ type: 'order.paid' }, 'bad_signature');
    const reply = createMockReply();

    await handleWebhook(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid webhook signature' }),
    );
  });

  it('should return 200 and ignore when externalId is missing', async () => {
    const request = createMockRequest(
      { type: 'order.paid', data: {} },
      'valid_signature',
    );
    const reply = createMockReply();

    await handleWebhook(request, reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({ received: true });
  });

  it('should return 200 and ignore when payment is not found (idempotent)', async () => {
    const request = createMockRequest(
      { type: 'order.paid', data: { id: 'or_unknown' } },
      'valid_signature',
    );
    const prisma = request.server.prisma;
    (prisma.payment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const reply = createMockReply();

    await handleWebhook(request, reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({ received: true });
  });

  it('should confirm payment on order.paid event', async () => {
    const request = createMockRequest(
      { type: 'order.paid', data: { id: 'or_123' } },
      'valid_signature',
    );
    const prisma = request.server.prisma;
    (prisma.payment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pay_001',
      checkId: 'check_001',
      status: 'PENDING',
    });
    (prisma.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pay_001',
      status: 'PENDING',
    });
    (prisma.payment.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pay_001',
      status: 'CONFIRMED',
    });
    const reply = createMockReply();

    await handleWebhook(request, reply);

    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CONFIRMED' }),
      }),
    );
    expect(checkPaymentCompletion).toHaveBeenCalledWith(prisma, 'check_001');
    expect(reply.status).toHaveBeenCalledWith(200);
  });

  it('should skip update if payment already CONFIRMED (idempotent)', async () => {
    const request = createMockRequest(
      { type: 'order.paid', data: { id: 'or_123' } },
      'valid_signature',
    );
    const prisma = request.server.prisma;
    (prisma.payment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pay_001',
      checkId: 'check_001',
      status: 'CONFIRMED',
    });
    (prisma.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pay_001',
      status: 'CONFIRMED',
    });
    const reply = createMockReply();

    await handleWebhook(request, reply);

    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(200);
  });

  it('should mark payment as FAILED on order.payment_failed', async () => {
    const request = createMockRequest(
      { type: 'order.payment_failed', data: { id: 'or_456' } },
      'valid_signature',
    );
    const prisma = request.server.prisma;
    (prisma.payment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pay_002',
      checkId: 'check_002',
      status: 'PENDING',
    });
    (prisma.payment.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pay_002',
      status: 'FAILED',
    });
    const reply = createMockReply();

    await handleWebhook(request, reply);

    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
  });

  it('should mark payment as CANCELLED on order.canceled', async () => {
    const request = createMockRequest(
      { type: 'order.canceled', data: { id: 'or_789' } },
      'valid_signature',
    );
    const prisma = request.server.prisma;
    (prisma.payment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pay_003',
      checkId: 'check_003',
      status: 'PENDING',
    });
    (prisma.payment.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pay_003',
      status: 'CANCELLED',
    });
    const reply = createMockReply();

    await handleWebhook(request, reply);

    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELLED' }),
      }),
    );
  });

  it('should mark payment as REFUNDED on charge.refunded', async () => {
    const request = createMockRequest(
      { type: 'charge.refunded', data: { id: 'or_101' } },
      'valid_signature',
    );
    const prisma = request.server.prisma;
    (prisma.payment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pay_004',
      checkId: 'check_004',
      status: 'CONFIRMED',
    });
    (prisma.payment.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pay_004',
      status: 'REFUNDED',
    });
    const reply = createMockReply();

    await handleWebhook(request, reply);

    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REFUNDED' }),
      }),
    );
  });

  it('should return 200 for unhandled event types', async () => {
    const request = createMockRequest(
      { type: 'charge.created', data: { id: 'or_999' } },
      'valid_signature',
    );
    const prisma = request.server.prisma;
    (prisma.payment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pay_005',
      checkId: 'check_005',
    });
    const reply = createMockReply();

    await handleWebhook(request, reply);

    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(200);
  });
});
