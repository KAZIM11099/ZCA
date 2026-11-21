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
import { escapeHtml, sendEmail } from '../services/mailer.js';
import { hashPassword, verifyPasswordOrDummy } from '../services/passwords.js';
import {
  createSession,
  hashSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '../services/sessions.js';
import {
  ADMIN_LOGIN_CHALLENGE_COOKIE,
  ADMIN_LOGIN_OTP_TTL_MS,
  ADMIN_LOGIN_OTP_EMAIL,
  createAdminLoginChallengeToken,
  createAdminLoginCode,
  getAdminLoginContext,
  hashAdminLoginChallenge,
  hashAdminLoginCode,
  verifyAdminLoginCode,
} from '../services/adminLoginOtp.js';

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
const loginVerificationIpLimiter = createRateLimiter('admin-login-verification-ip', {
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { success: false, error: { message: 'Too many verification attempts. Sign in again later.' } },
});
const loginOtpSendIpLimiter = createRateLimiter('admin-login-otp-send-ip', {
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { success: false, error: { message: 'Too many sign-in codes requested. Try again later.' } },
});

const loginSchema = z.object({
  email: z.string().trim().email().max(191),
  password: z.string().min(1).max(256),
});
const loginCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit verification code.'),
});
const adminLoginCookieOptions = () => ({
  ...sessionCookieOptions(),
  path: '/api/v1/auth',
  maxAge: ADMIN_LOGIN_OTP_TTL_MS,
});
const clearAdminLoginChallenge = (res) => {
  const options = adminLoginCookieOptions();
  delete options.maxAge;
  return res.clearCookie(ADMIN_LOGIN_CHALLENGE_COOKIE, options);
};

router.post('/login', loginOtpSendIpLimiter, loginIpLimiter, loginEmailLimiter, loginIpBackoff, loginEmailBackoff, verifySameOrigin, async (req, res, next) => {
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

    const challengeToken = createAdminLoginChallengeToken();
    const challengeHash = hashAdminLoginChallenge(challengeToken);
    const code = createAdminLoginCode();
    const expiresAt = new Date(Date.now() + ADMIN_LOGIN_OTP_TTL_MS);
    const context = getAdminLoginContext(req.ip, req.get('user-agent'));

    await prisma.adminLoginChallenge.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        challengeHash,
        codeHash: hashAdminLoginCode(challengeHash, code),
        expiresAt,
      },
      update: {
        challengeHash,
        codeHash: hashAdminLoginCode(challengeHash, code),
        expiresAt,
        createdAt: new Date(),
      },
    });
    res.cookie(ADMIN_LOGIN_CHALLENGE_COOKIE, challengeToken, adminLoginCookieOptions());

    try {
      await sendEmail({
        to: ADMIN_LOGIN_OTP_EMAIL,
        subject: 'Your ZAVIKOO admin sign-in code',
        text: `Your ZAVIKOO admin verification code is ${code}. It expires in 5 minutes.\n\nApproximate location: ${context.location}\nDevice: ${context.device}\nIP address: ${context.ip}\n\nIf you did not try to sign in, ignore this email and secure your admin password.`,
        html: `<div data-zavikoo-email-template><p>A sign-in was attempted for the ZAVIKOO admin panel.</p><p style="font-size:30px;font-weight:bold;letter-spacing:8px;color:#211f1a;">${code}</p><p>This one-time code expires in <strong>5 minutes</strong>.</p><table role="presentation" cellspacing="0" cellpadding="6"><tr><td><strong>Approximate location</strong></td><td>${escapeHtml(context.location)}</td></tr><tr><td><strong>Device</strong></td><td>${escapeHtml(context.device)}</td></tr><tr><td><strong>IP address</strong></td><td>${escapeHtml(context.ip)}</td></tr></table><p>If you did not try to sign in, ignore this email and secure your admin password.</p></div>`,
      });
    } catch (emailError) {
      await prisma.adminLoginChallenge.deleteMany({ where: { userId: user.id, challengeHash } });
      clearAdminLoginChallenge(res);
      throw emailError;
    }

    return res.status(202).json({
      success: true,
      data: { verificationRequired: true, destination: ADMIN_LOGIN_OTP_EMAIL },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/verify-login-code', loginVerificationIpLimiter, verifySameOrigin, async (req, res, next) => {
  const parsed = loginCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Enter the 6-digit verification code.' } });
  }

  const challengeToken = req.cookies?.[ADMIN_LOGIN_CHALLENGE_COOKIE];
  if (!challengeToken) {
    clearAdminLoginChallenge(res);
    return res.status(401).json({ success: false, error: { message: 'The verification code expired. Sign in again.' } });
  }

  try {
    const challengeHash = hashAdminLoginChallenge(challengeToken);
    const challenge = await prisma.adminLoginChallenge.findUnique({
      where: { challengeHash },
      include: { user: { select: { id: true, email: true, fullName: true, role: true, isActive: true } } },
    });
    const now = new Date();
    if (
      !challenge
      || challenge.expiresAt <= now
      || !challenge.user.isActive
      || !['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'PRODUCT_MANAGER', 'SUPPORT'].includes(challenge.user.role)
    ) {
      if (challenge) await prisma.adminLoginChallenge.deleteMany({ where: { id: challenge.id } });
      clearAdminLoginChallenge(res);
      return res.status(401).json({ success: false, error: { message: 'The verification code expired. Sign in again.' } });
    }

    if (!verifyAdminLoginCode(challengeHash, parsed.data.code, challenge.codeHash)) {
      await prisma.adminLoginChallenge.deleteMany({ where: { id: challenge.id } });
      clearAdminLoginChallenge(res);
      return res.status(401).json({ success: false, error: { message: 'The verification code is incorrect. Sign in again.' } });
    }

    const sessionToken = await prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findFirst({
        where: {
          id: challenge.user.id,
          isActive: true,
          role: { in: ['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'PRODUCT_MANAGER', 'SUPPORT'] },
        },
        select: { id: true },
      });
      if (!currentUser) return null;

      const claimedChallenge = await tx.adminLoginChallenge.deleteMany({
        where: { id: challenge.id, challengeHash, codeHash: challenge.codeHash, expiresAt: { gt: new Date() } },
      });
      if (claimedChallenge.count !== 1) return null;

      const { token } = await createSession(currentUser.id, tx);
      await tx.auditLog.create({
        data: {
          actorId: currentUser.id,
          action: 'admin.login_verified',
          targetType: 'User',
          targetId: String(currentUser.id),
        },
      });
      return token;
    });

    clearAdminLoginChallenge(res);
    if (!sessionToken) {
      return res.status(401).json({ success: false, error: { message: 'The verification code expired or was already used. Sign in again.' } });
    }
    res.cookie(SESSION_COOKIE, sessionToken, sessionCookieOptions());
    return res.json({
      success: true,
      data: { user: { id: challenge.user.id, email: challenge.user.email, fullName: challenge.user.fullName, role: challenge.user.role } },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/cancel-login-verification', verifySameOrigin, async (req, res, next) => {
  const challengeToken = req.cookies?.[ADMIN_LOGIN_CHALLENGE_COOKIE];
  try {
    if (challengeToken) {
      await prisma.adminLoginChallenge.deleteMany({
        where: { challengeHash: hashAdminLoginChallenge(challengeToken) },
      });
    }
    clearAdminLoginChallenge(res);
    return res.json({ success: true, data: { cancelled: true } });
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
