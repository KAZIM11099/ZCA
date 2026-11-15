import 'dotenv/config';
import { z } from 'zod';

const optionalString = z.preprocess(
  (value) => value === '' ? undefined : value,
  z.string().trim().min(1).optional(),
);
const optionalUrl = z.preprocess(
  (value) => value === '' ? undefined : value,
  z.string().url().optional(),
);
const optionalEmail = z.preprocess(
  (value) => value === '' ? undefined : value,
  z.string().email().optional(),
);
const optionalOriginList = z.preprocess(
  (value) => typeof value === 'string' && value.trim()
    ? value.split(',').map((origin) => origin.trim())
    : undefined,
  z.array(z.string().url()).min(1).optional(),
);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  TRUST_PROXY: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.coerce.number().int().min(0).optional(),
  ),
  CLIENT_ORIGIN: z.string().url(),
  CLIENT_ORIGINS: optionalOriginList,
  SITE_URL: optionalUrl,
  API_URL: optionalUrl,
  ADMIN_NOTIFY_EMAIL: optionalEmail,
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_NAME: z.string().default('zavikoo_atelier'),
  DB_USER: z.string().default('zavikoo_app'),
  DB_PASSWORD: z.string().default(''),
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),
  DATABASE_URL: z.string().url().optional(),
  SESSION_SECRET: z.string().min(16),
  GOOGLE_CLIENT_ID: z.string().trim().default(''),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().email().optional().or(z.literal('')),
  SMTP_PASS: z.string().optional().or(z.literal('')),
  SMTP_FROM: z.string().email().optional().or(z.literal('')),
  REDIS_URL: optionalUrl,
  SENTRY_DSN: optionalUrl,
  OBJECT_STORAGE_ENDPOINT: optionalUrl,
  OBJECT_STORAGE_BUCKET: optionalString,
  OBJECT_STORAGE_REGION: optionalString,
  OBJECT_STORAGE_ACCESS_KEY_ID: optionalString,
  OBJECT_STORAGE_SECRET_ACCESS_KEY: optionalString,
  OBJECT_STORAGE_PUBLIC_BASE_URL: optionalUrl,
  WHATSAPP_TOKEN: optionalString,
  LEOPARDS_API_KEY: optionalString,
  LEOPARDS_API_PASSWORD: optionalString,
  ADMIN_EMAIL: optionalEmail,
  ADMIN_NAME: optionalString,
}).superRefine((value, context) => {
  if (value.NODE_ENV !== 'production') return;
  if (!Number.isInteger(value.TRUST_PROXY)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['TRUST_PROXY'], message: 'Set TRUST_PROXY to the number of trusted proxy hops in production.' });
  }
  if (value.SESSION_SECRET.length < 64 || /change[-_ ]?me|example|placeholder/i.test(value.SESSION_SECRET)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['SESSION_SECRET'], message: 'Use a unique secret generated from at least 48 random bytes in production.' });
  }
  const clientOrigins = [...new Set([value.CLIENT_ORIGIN, ...(value.CLIENT_ORIGINS || [])])];
  if (clientOrigins.some((origin) => !origin.startsWith('https://'))) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['CLIENT_ORIGINS'], message: 'All production client origins must use HTTPS.' });
  }
  for (const key of ['SITE_URL', 'API_URL', 'ADMIN_NOTIFY_EMAIL']) {
    if (!value[key]) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} is required in production.` });
    }
  }
  for (const key of ['SITE_URL', 'API_URL']) {
    if (value[key] && !value[key].startsWith('https://')) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `Production ${key} must use HTTPS.` });
    }
  }
  let hasDatabasePassword = Boolean(value.DB_PASSWORD);
  let databaseUser = value.DB_USER;
  if (value.DATABASE_URL) {
    try {
      const databaseUrl = new URL(value.DATABASE_URL);
      hasDatabasePassword = Boolean(databaseUrl.password);
      databaseUser = decodeURIComponent(databaseUrl.username);
    } catch {
      hasDatabasePassword = false;
    }
  }
  if (!hasDatabasePassword) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['DB_PASSWORD'], message: 'Set a dedicated database password in production.' });
  }
  if (!databaseUser.trim() || databaseUser.trim().toLowerCase() === 'root') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['DB_USER'], message: 'Use a dedicated non-root MySQL account in production.' });
  }
  if ((value.SMTP_USER && !value.SMTP_PASS) || (!value.SMTP_USER && value.SMTP_PASS)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['SMTP_PASS'], message: 'SMTP_USER and SMTP_PASS must be configured together.' });
  }
  if (!value.SMTP_USER || !value.SMTP_PASS) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['SMTP_USER'], message: 'Configure SMTP_USER and SMTP_PASS in production.' });
  }
  const storageCredentials = [
    value.OBJECT_STORAGE_ENDPOINT,
    value.OBJECT_STORAGE_BUCKET,
    value.OBJECT_STORAGE_ACCESS_KEY_ID,
    value.OBJECT_STORAGE_SECRET_ACCESS_KEY,
  ];
  const storageConfiguration = [
    ...storageCredentials,
    value.OBJECT_STORAGE_REGION,
    value.OBJECT_STORAGE_PUBLIC_BASE_URL,
  ];
  if (storageConfiguration.some(Boolean) && !storageCredentials.every(Boolean)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['OBJECT_STORAGE_ENDPOINT'], message: 'Configure the full object-storage endpoint, bucket, access key, and secret key together.' });
  }
}).transform((value) => {
  const databaseUrl = value.DATABASE_URL || `mysql://${value.DB_USER}:${encodeURIComponent(value.DB_PASSWORD || '')}@${value.DB_HOST}:${value.DB_PORT}/${value.DB_NAME}?connection_limit=${value.DB_CONNECTION_LIMIT}`;
  return {
    ...value,
    TRUST_PROXY: value.TRUST_PROXY ?? 0,
    CLIENT_ORIGINS: [...new Set([value.CLIENT_ORIGIN, ...(value.CLIENT_ORIGINS || [])])]
      .map((origin) => new URL(origin).origin),
    DATABASE_URL: databaseUrl,
    SMTP_FROM: value.SMTP_FROM || value.SMTP_USER,
  };
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

process.env.DATABASE_URL = parsed.data.DATABASE_URL;
export const env = parsed.data;
