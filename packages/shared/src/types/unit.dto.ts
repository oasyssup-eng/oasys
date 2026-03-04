import type { OrderPolicy } from '../enums';

/** Lightweight unit representation for lists and references */
export interface UnitDTO {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  timezone: string;
  orderPolicy: OrderPolicy;
  createdAt: string;
  updatedAt: string;
}

/** Full unit details including fiscal and operational fields */
export interface UnitDetailsDTO extends UnitDTO {
  // Fiscal fields (PRD-06)
  cnpj: string | null;
  stateRegistration: string | null;
  legalName: string | null;
  streetAddress: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  ibgeCode: string | null;

  // Operational fields
  serviceFeeRate: number | null;
  tipSuggestions: string | null;
  operatingHoursStart: string | null;
  operatingHoursEnd: string | null;
}
