import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAdmin, verifySameOrigin } from '../middleware/requireAdmin.js';
import {
  createEmailRateBackoff,
  createEmailRateLimiter,
  createRateBackoff,
  createRateLimiter,
} from '../services/rateLimiters.js';
import { hashPassword, verifyPasswordOrDummy } from '../services/passwords.js';
import {
  createSession,
  hashSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '../services/sessions.js';

const router = Router();
const loginIpLimiter = createRateLimiter('admin-login-ip', {
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { success: false, error: { message: 'Too many login attempts. Try again later.' } },
});
const loginEmailLimiter = createEmailRateLimiter('admin-login-email', {
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  message: { success: false, error: { message: 'Too many login attempts. Try again later.' } },
});
const loginIpBackoff = createRateBackoff('admin-login-ip-backoff', {
  windowMs: 15 * 60 * 1000,
  skipSuccessfulRequests: true,
});
const loginEmailBackoff = createEmailRateBackoff('admin-login-email-backoff', {
  windowMs: 15 * 60 * 1000,
  skipSuccessfulRequests: true,
});

const loginSchema = z.object({
  email: z.string().trim().email().max(191),
  password: z.string().min(1).max(256),
});

router.post('/login', loginIpLimiter, loginEmailLimiter, loginIpBackoff, loginEmailBackoff, verifySameOrigin, async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Enter a valid email and password' } });
  }

  try {
    const email = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    const valid = await verifyPasswordOrDummy(parsed.data.password, user?.passwordHash);

    if (!valid || !user?.isActive || !['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'PRODUCT_MANAGER', 'SUPPORT'].includes(user.role)) {
      return res.status(401).json({ success: false, error: { message: 'Email or password is incorrect' } });
    }

    const { token } = await createSession(user.id);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
    return res.json({
      success: true,
      data: { user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } },
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

router.post('/logout', verifySameOrigin, async (req, res, next) => {
  const token = req.cookies?.[SESSION_COOKIE];
  try {
    if (token) {
      await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
    }
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
    return res.json({ success: true, data: { loggedOut: true } });
  } catch (error) {
    return next(error);
  }
});

router.post('/change-password', verifySameOrigin, requireAdmin, async (req, res, next) => {
  const parsed = z.object({
    currentPassword: z.string().min(1).max(256),
    newPassword: z.string().min(12).max(256),
  }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { message: 'New password must be at least 12 characters long.' } });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !await verifyPassword(parsed.data.currentPassword, user.passwordHash)) {
      return res.status(400).json({ success: false, error: { message: 'Current password is incorrect.' } });
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    const { token } = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.auditLog.create({
        data: { actorId: user.id, action: 'admin.password_changed', targetType: 'User', targetId: String(user.id) },
      });
      return createSession(user.id, tx);
    });
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
    return res.json({ success: true, data: { changed: true } });
  } catch (error) {
    return next(error);
  }
});

export default router;
