// Shared enums — mirrors Prisma enums without depending on @prisma/client
// Uses "as const" pattern for runtime access + type inference

// ============================================================================
// People & Auth
// ============================================================================

export const Role = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  WAITER: 'WAITER',
  BARTENDER: 'BARTENDER',
  CASHIER: 'CASHIER',
  KITCHEN: 'KITCHEN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

// ============================================================================
// Check & Order Lifecycle
// ============================================================================

export const CheckStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const;
export type CheckStatus = (typeof CheckStatus)[keyof typeof CheckStatus];

export const OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  DELIVERED: 'DELIVERED',
  HELD: 'HELD',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

// ============================================================================
// Payments
// ============================================================================

export const PaymentMethod = {
  CASH: 'CASH',
  CREDIT_CARD: 'CREDIT_CARD',
  DEBIT_CARD: 'DEBIT_CARD',
  PIX: 'PIX',
  VOUCHER: 'VOUCHER',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

// ============================================================================
// Unit Configuration
// ============================================================================

export const OrderPolicy = {
  PRE_PAYMENT: 'PRE_PAYMENT',
  POST_PAYMENT: 'POST_PAYMENT',
  HYBRID: 'HYBRID',
} as const;
export type OrderPolicy = (typeof OrderPolicy)[keyof typeof OrderPolicy];

// ============================================================================
// Cash Register
// ============================================================================

export const CashRegisterStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  SUSPENDED: 'SUSPENDED',
} as const;
export type CashRegisterStatus = (typeof CashRegisterStatus)[keyof typeof CashRegisterStatus];

// ============================================================================
// Stock
// ============================================================================

export const MovementType = {
  IN: 'IN',
  OUT: 'OUT',
  ADJUSTMENT: 'ADJUSTMENT',
  LOSS: 'LOSS',
  TRANSFER: 'TRANSFER',
} as const;
export type MovementType = (typeof MovementType)[keyof typeof MovementType];

// ============================================================================
// Fiscal
// ============================================================================

export const FiscalNoteStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  AUTHORIZED: 'AUTHORIZED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  ERROR: 'ERROR',
} as const;
export type FiscalNoteStatus = (typeof FiscalNoteStatus)[keyof typeof FiscalNoteStatus];

// ============================================================================
// Tables
// ============================================================================

export const TableStatus = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  RESERVED: 'RESERVED',
  BLOCKED: 'BLOCKED',
} as const;
export type TableStatus = (typeof TableStatus)[keyof typeof TableStatus];

// ============================================================================
// Alerts & Notifications
// ============================================================================

export const AlertType = {
  LOW_STOCK: 'LOW_STOCK',
  ORDER_DELAYED: 'ORDER_DELAYED',
  CASH_REGISTER_OPEN: 'CASH_REGISTER_OPEN',
  SYSTEM: 'SYSTEM',
} as const;
export type AlertType = (typeof AlertType)[keyof typeof AlertType];

export const AlertSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;
export type AlertSeverity = (typeof AlertSeverity)[keyof typeof AlertSeverity];

export const NotificationType = {
  ORDER_READY: 'ORDER_READY',
  ORDER_NEW: 'ORDER_NEW',
  TABLE_REQUEST: 'TABLE_REQUEST',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  STOCK_LOW: 'STOCK_LOW',
  SYSTEM: 'SYSTEM',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

// ============================================================================
// LGPD / Consent
// ============================================================================

export const ConsentType = {
  MARKETING_WHATSAPP: 'MARKETING_WHATSAPP',
  MARKETING_EMAIL: 'MARKETING_EMAIL',
  MARKETING_SMS: 'MARKETING_SMS',
  DATA_PROCESSING: 'DATA_PROCESSING',
} as const;
export type ConsentType = (typeof ConsentType)[keyof typeof ConsentType];

// ============================================================================
// WhatsApp (Phase 2 — enum defined here for schema compatibility)
// ============================================================================

export const WhatsAppSessionState = {
  GREETING: 'GREETING',
  BROWSING_MENU: 'BROWSING_MENU',
  BUILDING_ORDER: 'BUILDING_ORDER',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  FEEDBACK: 'FEEDBACK',
  IDLE: 'IDLE',
  ENDED: 'ENDED',
} as const;
export type WhatsAppSessionState = (typeof WhatsAppSessionState)[keyof typeof WhatsAppSessionState];
