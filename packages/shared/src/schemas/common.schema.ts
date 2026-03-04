import { z } from 'zod';

/** CPF: 11 numeric digits */
export const cpfSchema = z
  .string()
  .regex(/^\d{11}$/, 'CPF must be exactly 11 digits');

/** CNPJ: 14 numeric digits */
export const cnpjSchema = z
  .string()
  .regex(/^\d{14}$/, 'CNPJ must be exactly 14 digits');

/** CEP (Brazilian postal code): 8 numeric digits */
export const cepSchema = z
  .string()
  .regex(/^\d{8}$/, 'CEP must be exactly 8 digits');

/** IBGE municipality code: 7 numeric digits */
export const ibgeCodeSchema = z
  .string()
  .regex(/^\d{7}$/, 'IBGE code must be exactly 7 digits');

/** Employee PIN: 4 numeric digits */
export const pinSchema = z
  .string()
  .regex(/^\d{4}$/, 'PIN must be exactly 4 digits');

/** Time in HH:mm format */
export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm format');

/** CUID string identifier */
export const cuidSchema = z
  .string()
  .cuid('Must be a valid CUID');
