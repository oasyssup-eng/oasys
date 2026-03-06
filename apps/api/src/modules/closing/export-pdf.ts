/**
 * PDF export for daily closing reports.
 * Uses pdfkit for simple text-based layout.
 */

import PDFDocument from 'pdfkit';
import type { RevenueResult, PaymentSummary, HourlyRevenueEntry, OperationsSummary } from './consolidation';
import type { Divergence } from './reconciliation';

interface ExportableReport {
  date: string | Date;
  revenue: RevenueResult;
  paymentSummary: PaymentSummary;
  hourlyData: HourlyRevenueEntry[];
  operations: OperationsSummary;
  divergences: Divergence[];
}

interface UnitInfo {
  name: string;
  legalName: string | null;
  cnpj: string | null;
  streetAddress: string | null;
  addressNumber: string | null;
  city: string | null;
  state: string | null;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

export function generateClosingPDF(
  report: ExportableReport,
  unit: UnitInfo,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Header ─────────────────────────────────────────────────────
    doc.fontSize(18).font('Helvetica-Bold').text('Relatório de Fechamento', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(unit.name, { align: 'center' });

    if (unit.legalName) {
      doc.fontSize(9).text(unit.legalName, { align: 'center' });
    }
    if (unit.cnpj) {
      doc.fontSize(9).text(`CNPJ: ${unit.cnpj}`, { align: 'center' });
    }
    if (unit.streetAddress) {
      const address = [unit.streetAddress, unit.addressNumber, unit.city, unit.state]
        .filter(Boolean)
        .join(', ');
      doc.fontSize(9).text(address, { align: 'center' });
    }
    doc.moveDown(0.3);
    doc.fontSize(10).text(`Data: ${formatDate(report.date)}`, { align: 'center' });
    doc.moveDown(1);

    // ── Financial Summary ──────────────────────────────────────────
    doc.fontSize(14).font('Helvetica-Bold').text('Resumo Financeiro');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');

    const financialRows = [
      ['Faturamento Bruto', formatCurrency(report.revenue.grossRevenue)],
      ['Taxa de Serviço', formatCurrency(report.revenue.serviceFees)],
      ['Gorjetas', formatCurrency(report.revenue.tips)],
      ['Descontos', formatCurrency(report.revenue.discounts)],
      ['Cancelamentos', formatCurrency(report.revenue.cancellationAmount)],
      ['Cortesias', formatCurrency(report.revenue.courtesyAmount)],
      ['Consumo Interno', formatCurrency(report.revenue.staffMealAmount)],
    ];

    for (const [label, value] of financialRows) {
      doc.text(`${label}: ${value}`);
    }

    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').text(`Faturamento Líquido: ${formatCurrency(report.revenue.netRevenue)}`);
    doc.moveDown(1);

    // ── Operations Summary ─────────────────────────────────────────
    doc.fontSize(14).font('Helvetica-Bold').text('Operações');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total de Contas: ${report.operations.totalChecks}`);
    doc.text(`Contas Pagas: ${report.operations.paidChecks}`);
    doc.text(`Contas Abertas: ${report.operations.openChecks}`);
    doc.text(`Total de Pedidos: ${report.operations.totalOrders}`);
    doc.text(`Pedidos Cancelados: ${report.operations.cancelledOrders}`);
    doc.text(`Ticket Médio: ${formatCurrency(report.operations.avgTicket)}`);
    if (report.operations.peakHour != null) {
      doc.text(`Hora Pico: ${String(report.operations.peakHour).padStart(2, '0')}:00 (${formatCurrency(report.operations.peakHourRevenue)})`);
    }
    doc.moveDown(1);

    // ── Payment Methods ────────────────────────────────────────────
    doc.fontSize(14).font('Helvetica-Bold').text('Pagamentos');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');

    for (const [method, amount] of Object.entries(report.paymentSummary.byMethod)) {
      doc.text(`${method}: ${formatCurrency(amount)}`);
    }
    doc.font('Helvetica-Bold').text(`Total: ${formatCurrency(report.paymentSummary.totalConfirmed)}`);

    if (report.paymentSummary.pendingCount > 0) {
      doc.font('Helvetica').text(
        `Pendente: ${report.paymentSummary.pendingCount} pagamento(s) - ${formatCurrency(report.paymentSummary.pendingAmount)}`,
      );
    }
    doc.moveDown(1);

    // ── Hourly Revenue ─────────────────────────────────────────────
    doc.fontSize(14).font('Helvetica-Bold').text('Faturamento por Hora');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');

    for (const h of report.hourlyData) {
      const hourStr = `${String(h.hour).padStart(2, '0')}:00`;
      doc.text(`${hourStr}  |  ${formatCurrency(h.revenue)}  |  ${h.orderCount} pedidos  |  ${h.checkCount} contas`);
    }
    doc.moveDown(1);

    // ── Divergences ────────────────────────────────────────────────
    if (report.divergences.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Divergências');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');

      for (const d of report.divergences) {
        const icon = d.severity === 'CRITICAL' ? '⚠' : '⚡';
        doc.text(`${icon} [${d.severity}] ${d.description}`);
      }
      doc.moveDown(1);
    }

    // ── Footer ─────────────────────────────────────────────────────
    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica').text(
      `Gerado em: ${new Date().toLocaleString('pt-BR')} — OASYS`,
      { align: 'center' },
    );

    doc.end();
  });
}
