import type { FiscalNoteStatus } from '../enums';

/** Fiscal note (NFC-e / NF-e) representation */
export interface FiscalNoteDTO {
  id: string;
  unitId: string;
  checkId: string;
  externalRef: string;
  status: FiscalNoteStatus;
  type: string;
  number: string | null;
  series: string | null;
  accessKey: string | null;
  danfeUrl: string | null;
  totalAmount: number;
  customerCpf: string | null;
  errorMessage: string | null;
  issuedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}
