import { createHash } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { slowDown } from 'express-slow-down';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import { env } from '../config/env.js';

let redisClient;

if (env.REDIS_URL) {
  redisClient = createClient({
    url: env.REDIS_URL,
    socket: { connectTimeout: 5000 },
  });
  redisClient.on('error', (error) => {
    console.error('Rate-limit Redis connection error.', {
      errorType: error.name,
      errorCode: error.code,
    });
  });
  redisClient.connect().catch((error) => {
    console.error('Unable to connect to the configured rate-limit Redis store.', {
      errorType: error.name,
      errorCode: error.code,
    });
    process.exit(1);
  });
} else if (env.NODE_ENV === 'production') {
  console.warn('REDIS_URL is unset; rate limits are local to this process.');
}

function createRedisStore(name) {
  if (!redisClient) return undefined;
  return new RedisStore({
    prefix: `zavikoo:rate:${name}:`,
    sendCommand: (...args) => redisClient.sendCommand(args),
  });
}

function fieldKeyGenerator(field, normalize) {
  return (req) => {
    const value = (field === 'email' && req.rateLimitEmail) || req.body?.[field];
    if (typeof value !== 'string' || !value.trim()) return `missing:${req.ip}`;
    const normalizedValue = normalize(value);
    if (!normalizedValue) return `missing:${req.ip}`;
    const key = createHash('sha256').update(normalizedValue).digest('hex');
    return `${field}:${key}`;
  };
}

export function createRateLimiter(name, options) {
  const store = createRedisStore(name);
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
    ...(store ? { store } : {}),
  });
}

export function createEmailRateLimiter(name, options) {
  return createFieldRateLimiter(name, 'email', options, (email) => email.trim().toLowerCase());
}

export function createFieldRateLimiter(name, field, options, normalize = (value) => value.trim()) {
  return createRateLimiter(name, {
    ...options,
    keyGenerator: fieldKeyGenerator(field, normalize),
  });
}

export function createRateBackoff(name, options) {
  const store = createRedisStore(name);
  return slowDown({
    delayAfter: 1,
    delayMs: (used) => Math.min(250 * 2 ** Math.max(0, used - 2), 8000),
    maxDelayMs: 8000,
    ...options,
    ...(store ? { store } : {}),
  });
}

export function createEmailRateBackoff(name, options) {
  return createRateBackoff(name, {
    ...options,
    keyGenerator: fieldKeyGenerator('email', (email) => email.trim().toLowerCase()),
  });
}

export async function closeRateLimitRedis() {
  if (redisClient?.isOpen) await redisClient.quit();
}

export async function pingRateLimitRedis() {
  if (!redisClient) return false;
  await redisClient.ping();
  return true;
}
