import { z } from 'zod';

const envSchema = z.object({
  API_PORT: z.coerce.number().default(3001),
  API_HOST: z.string().default('0.0.0.0'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  PAGARME_API_KEY: z.string().optional(),
  PAGARME_PUBLIC_KEY: z.string().optional(),
  PAGARME_WEBHOOK_SECRET: z.string().optional(),
  PAGARME_BASE_URL: z.string().url().default('https://api.pagar.me/core/v5'),

  // FocusNFe — Fiscal NFC-e (PRD-06)
  FOCUSNFE_TOKEN: z.string().optional(),
  FOCUSNFE_BASE_URL: z
    .string()
    .url()
    .default('https://homologacao.focusnfe.com.br'),
  FOCUSNFE_ENVIRONMENT: z
    .enum(['homologation', 'production'])
    .default('homologation'),
});

export type EnvConfig = z.infer<typeof envSchema>;

let _config: EnvConfig | null = null;

export function loadConfig(): EnvConfig {
  if (_config) return _config;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const missing = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(', ')}`)
      .join('\n');
    throw new Error(`Missing or invalid environment variables:\n${missing}`);
  }

  _config = result.data;
  return _config;
}

export function getConfig(): EnvConfig {
  if (!_config) throw new Error('Config not loaded. Call loadConfig() first.');
  return _config;
}
