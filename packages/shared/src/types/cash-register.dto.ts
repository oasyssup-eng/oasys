import type { CashRegisterStatus } from '../enums';

/** Cash register representation */
export interface CashRegisterDTO {
  id: string;
  unitId: string;
  employeeId: string | null;
  type: string;
  status: CashRegisterStatus;
  openedAt: string;
  closedAt: string | null;
  openingBalance: number;
  closingBalance: number | null;
  expectedBalance: number | null;
  difference: number | null;
  closingNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Cash register operation (withdrawal, supply, adjustment) */
export interface CashRegisterOperationDTO {
  id: string;
  cashRegisterId: string;
  type: string;
  amount: number;
  reason: string;
  employeeId: string;
  authorizedBy: string | null;
  createdAt: string;
}

/** Input for opening a cash register */
export interface OpenCashRegisterInput {
  type: 'OPERATOR' | 'DIGITAL';
  openingBalance: number;
}

/** Input for closing a cash register */
export interface CloseCashRegisterInput {
  closingBalance: number;
  closingNotes?: string;
}

/** Cash register report with summary */
export interface CashRegisterReportDTO extends CashRegisterDTO {
  operations: CashRegisterOperationDTO[];
  summary: {
    totalCashIn: number;
    totalWithdrawals: number;
    totalSupplies: number;
    transactionCount: number;
  };
}
