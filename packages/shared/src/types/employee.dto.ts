import type { Role } from '../enums';

/** Lightweight employee representation for lists and references */
export interface EmployeeDTO {
  id: string;
  unitId: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Full employee details including personal data */
export interface EmployeeDetailsDTO extends EmployeeDTO {
  cpf: string | null;
  email: string | null;
  phone: string | null;
  hiredAt: string | null;
  terminatedAt: string | null;
}
