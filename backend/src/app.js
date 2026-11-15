import { randomUUID } from 'node:crypto';
import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { createRateLimiter } from './services/rateLimiters.js';
import { env } from './config/env.js';
import health from './routes/health.js';
import storefront from './routes/storefront.js';
import auth from './routes/auth.js';
import account from './routes/account.js';
import admin from './routes/admin.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { verifySameOrigin } from './middleware/requireAdmin.js';
import seo from './routes/seo.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', env.TRUST_PROXY);
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  strictTransportSecurity: env.NODE_ENV === 'production'
    ? { maxAge: 31_536_000, includeSubDomains: true, preload: false }
    : false,
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'img-src': ["'self'", 'data:', 'https:'],
    },
  },
}));
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use((req, res, next) => {
  req.id = randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});
app.use(pinoHttp({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  genReqId: (req) => req.id,
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url.split('?')[0],
    }),
    res: (res) => ({ statusCode: res.statusCode }),
    err: (error) => ({ type: error.name, code: error.code, status: error.status || error.statusCode }),
  },
  customLogLevel: (req, res, error) => {
    if (error || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
}));
app.use(compression({
  filter: (req, res) => {
    if (String(res.getHeader('Content-Type') || '').toLowerCase().startsWith('text/event-stream')) return false;
    return compression.filter(req, res);
  },
}));
app.use(cors({
  origin: (origin, callback) => callback(null, Boolean(origin && env.CLIENT_ORIGINS.includes(origin))),
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
}));
app.use('/api', createRateLimiter('global-api', {
  windowMs: 15 * 60 * 1000,
  limit: 300,
  handler: (req, res) => res.status(429).json({
    success: false,
    error: { message: 'Too many requests. Please try again later.' },
  }),
}));
app.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  return verifySameOrigin(req, res, next);
});
app.use(express.json({
  limit: '100kb',
  type: (req) => !(
    req.path === '/api/v1/quote'
    || req.path === '/api/v1/checkout'
    || req.path === '/api/v1/admin'
    || req.path.startsWith('/api/v1/admin/')
  ),
}));
app.use(cookieParser());

app.use('/health', health);
app.use('/api/v1/health', health);
app.use('/api/v1/auth', auth);
app.use('/api/v1/account', account);
app.use('/api/v1/admin', admin);
app.use('/api/v1', storefront);
app.use('/', seo);

app.use(notFound);
app.use(errorHandler);
export default app;
