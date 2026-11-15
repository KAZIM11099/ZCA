import { createHmac, randomBytes } from 'node:crypto';
import { prisma } from '../db.js';
import { env } from '../config/env.js';

export const SESSION_COOKIE = 'zavikoo_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export function hashSessionToken(token) {
  return createHmac('sha256', env.SESSION_SECRET).update(token).digest('hex');
}

export async function createSession(userId, database = prisma) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  await database.session.create({
    data: { userId, tokenHash: hashSessionToken(token), expiresAt },
  });
  return { token, expiresAt };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1',
    maxAge: SESSION_MAX_AGE_SECONDS * 1000,
  };
}

