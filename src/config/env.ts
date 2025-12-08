import * as dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  SHOPIFY_APP_CLIENT_ID: z.string().min(1, 'SHOPIFY_APP_CLIENT_ID is required'),
  SHOPIFY_APP_SECRET: z.string().min(1, 'SHOPIFY_APP_SECRET is required'),
  SHOPIFY_APP_ENDPOINT: z.string().url('SHOPIFY_APP_ENDPOINT must be a valid URL'),
  STORE_COUNTRY: z.string().default('IS'),
  STORE_CURRENCY: z.string().default('ISK'),
  STORE_LOCALE: z.string().default('is-IS'),
  HTTP_PORT: z.string().default('3022'),
  HTTP_SERVER: z.string().default('localhost'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Parse CLI arguments and override environment variables
 */
export function parseCLIArgs(): Partial<EnvConfig> {
  const args = process.argv.slice(2);
  const overrides: Partial<EnvConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--api-key' && i + 1 < args.length) {
      overrides.SHOPIFY_APP_SECRET = args[++i];
    } else if (arg === '--client-id' && i + 1 < args.length) {
      overrides.SHOPIFY_APP_CLIENT_ID = args[++i];
    } else if (arg === '--endpoint' && i + 1 < args.length) {
      overrides.SHOPIFY_APP_ENDPOINT = args[++i];
    } else if (arg === '--port' && i + 1 < args.length) {
      overrides.HTTP_PORT = args[++i];
    } else if (arg === '--server' && i + 1 < args.length) {
      overrides.HTTP_SERVER = args[++i];
    }
  }

  return overrides;
}

/**
 * Load and validate environment configuration
 * Priority: CLI args > env vars > .env file
 */
export function loadConfig(): EnvConfig {
  const cliOverrides = parseCLIArgs();

  const rawConfig = {
    SHOPIFY_APP_CLIENT_ID: cliOverrides.SHOPIFY_APP_CLIENT_ID ?? process.env.SHOPIFY_APP_CLIENT_ID,
    SHOPIFY_APP_SECRET: cliOverrides.SHOPIFY_APP_SECRET ?? process.env.SHOPIFY_APP_SECRET,
    SHOPIFY_APP_ENDPOINT: cliOverrides.SHOPIFY_APP_ENDPOINT ?? process.env.SHOPIFY_APP_ENDPOINT,
    STORE_COUNTRY: cliOverrides.STORE_COUNTRY ?? process.env.STORE_COUNTRY ?? 'IS',
    STORE_CURRENCY: cliOverrides.STORE_CURRENCY ?? process.env.STORE_CURRENCY ?? 'ISK',
    STORE_LOCALE: cliOverrides.STORE_LOCALE ?? process.env.STORE_LOCALE ?? 'is-IS',
    HTTP_PORT: cliOverrides.HTTP_PORT ?? process.env.HTTP_PORT ?? '3022',
    HTTP_SERVER: cliOverrides.HTTP_SERVER ?? process.env.HTTP_SERVER ?? 'localhost',
  };

  try {
    return envSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:');
      error.issues.forEach((err: z.ZodIssue) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error('Invalid configuration');
  }
}

/**
 * Mask API key for secure logging
 * Shows first 8 and last 4 characters
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 12) {
    return '***';
  }
  const start = apiKey.substring(0, 8);
  const end = apiKey.substring(apiKey.length - 4);
  const middle = '*'.repeat(Math.min(apiKey.length - 12, 20));
  return `${start}${middle}${end}`;
}
