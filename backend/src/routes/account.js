import { Router } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../db.js';
import { env } from '../config/env.js';
import { optionalCustomer, requireCustomer } from '../middleware/requireCustomer.js';
import { verifySameOrigin } from '../middleware/requireAdmin.js';
import {
  createEmailRateBackoff,
  createEmailRateLimiter,
  createRateBackoff,
  createRateLimiter,
} from '../services/rateLimiters.js';
import { hashPassword, verifyPassword, verifyPasswordOrDummy } from '../services/passwords.js';
import { escapeHtml, isMailerConfigured, sendEmail } from '../services/mailer.js';
import { publishCustomerSessionRevoked, subscribeToCustomerSession } from '../services/sessionEvents.js';
import { isValidDesignImageDataUrl, MAX_DESIGN_IMAGE_BYTES } from '../services/designImage.js';
import {
  createSession,
  hashSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '../services/sessions.js';

const router = Router();
const googleAuthClient = new OAuth2Client();
const registerIpLimiter = createRateLimiter('customer-register-ip', {
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { success: false, error: { message: 'Too many registration attempts. Please try again later.' } },
});
const registerEmailLimiter = createEmailRateLimiter('customer-register-email', {
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  message: { success: false, error: { message: 'Too many registration attempts. Please try again later.' } },
});
const registerIpBackoff = createRateBackoff('customer-register-ip-backoff', {
  windowMs: 15 * 60 * 1000,
  skipSuccessfulRequests: true,
});
const registerEmailBackoff = createEmailRateBackoff('customer-register-email-backoff', {
  windowMs: 15 * 60 * 1000,
  skipSuccessfulRequests: true,
});
const loginIpLimiter = createRateLimiter('customer-login-ip', {
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { success: false, error: { message: 'Too many login attempts. Please try again later.' } },
});
const loginEmailLimiter = createEmailRateLimiter('customer-login-email', {
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  message: { success: false, error: { message: 'Too many login attempts. Please try again later.' } },
});
const loginIpBackoff = createRateBackoff('customer-login-ip-backoff', {
  windowMs: 15 * 60 * 1000,
  skipSuccessfulRequests: true,
});
const loginEmailBackoff = createEmailRateBackoff('customer-login-email-backoff', {
  windowMs: 15 * 60 * 1000,
  skipSuccessfulRequests: true,
});
const googleLoginLimiter = createRateLimiter('customer-google-login', {
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { success: false, error: { message: 'Too many Google sign-in attempts. Please try again later.' } },
});
const googleEmailLimiter = createEmailRateLimiter('customer-google-login-email', {
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  message: { success: false, error: { message: 'Too many Google sign-in attempts. Please try again later.' } },
});
const googleIpBackoff = createRateBackoff('customer-google-login-ip-backoff', {
  windowMs: 15 * 60 * 1000,
  skipSuccessfulRequests: true,
});
const googleEmailBackoff = createEmailRateBackoff('customer-google-login-email-backoff', {
  windowMs: 15 * 60 * 1000,
  skipSuccessfulRequests: true,
});
const passwordResetRequestIpLimiter = createRateLimiter('password-reset-request-ip', {
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: { success: false, error: { message: 'Too many requests. Please try again later.' } },
});
const passwordResetRequestEmailLimiter = createEmailRateLimiter('password-reset-request-email', {
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: { success: false, error: { message: 'Too many requests. Please try again later.' } },
});
const passwordResetLimiter = createRateLimiter('password-reset-submit-ip', {
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { success: false, error: { message: 'Too many attempts. Please request a new reset link later.' } },
});
const passwordResetTokenLimiter = createRateLimiter('password-reset-submit-token', {
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => {
    const token = req.body?.token;
    if (typeof token !== 'string' || !token) return `missing:${req.ip}`;
    return `token:${createHash('sha256').update(token).digest('hex')}`;
  },
  message: { success: false, error: { message: 'Too many attempts. Please request a new reset link later.' } },
});
const passwordResetBackoff = createRateBackoff('password-reset-submit-ip-backoff', {
  windowMs: 15 * 60 * 1000,
  skipSuccessfulRequests: true,
});

const credentialsSchema = z.object({
  email: z.string().trim().email().max(191),
  password: z.string().min(12).max(256),
});
const resetRequestMessage = 'If an account exists for that email, a password reset link will be sent shortly.';
const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(191),
  phone: z.string().trim().min(7).max(40),
});
const addressSchema = z.object({
  label: z.string().trim().min(2).max(80),
  recipient: z.string().trim().min(2).max(191),
  phone: z.string().trim().min(7).max(40),
  line1: z.string().trim().min(4).max(191),
  line2: z.string().trim().max(191).optional().default(''),
  city: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().max(30).optional().default(''),
  country: z.string().trim().min(2).max(100).default('Pakistan'),
  isDefault: z.boolean().default(false),
});
const designPositionSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(5).max(90),
  height: z.number().min(5).max(80),
});
const designPositionsSchema = z.object({
  front: designPositionSchema.optional(),
  back: designPositionSchema.optional(),
}).optional();
const savedDesignSchema = z.object({
  customProductId: z.number().int().positive(),
  design: z.object({
    schemaVersion: z.literal(1),
    text: z.string().max(80).default(''),
    textPlacement: z.enum(['front', 'back', 'both']),
    imagePlacement: z.enum(['front', 'back', 'both']),
    textSize: z.number().int().min(12).max(32),
    textFont: z.string().trim().min(1).max(191).optional().default('Hanken Grotesk'),
    textColorMode: z.enum(['solid', 'gradient']).optional().default('solid'),
    textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#202020'),
    textGradientStart: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#F59E0B'),
    textGradientEnd: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#EF4444'),
    textGradientAngle: z.number().int().min(0).max(360).optional().default(90),
    imageSizeInches: z.number().int().refine((value) => [10, 12, 14, 16, 18].includes(value)).optional().default(14),
    textWidthInches: z.number().int().refine((value) => [3, 4, 5, 6, 7].includes(value)).optional().default(5),
    imageScale: z.number().min(0.5).max(2),
    textPositions: designPositionsSchema,
    imagePositions: designPositionsSchema,
    imageData: z.string().max(7_000_000)
      .refine((value) => !value || isValidDesignImageDataUrl(value), `Use a valid PNG, JPEG, or WebP design image no larger than ${MAX_DESIGN_IMAGE_BYTES / 1024 / 1024} MB.`)
      .default(''),
    color: z.string().trim().min(1).max(40),
    colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    size: z.enum(['XS', 'S', 'M', 'L', 'XL']),
    xsMeasurements: z.object({ length: z.number().positive().max(200), chest: z.number().positive().max(300) }).optional(),
    rightsConfirmed: z.literal(true),
  }).refine((design) => Boolean(design.text.trim() || design.imageData), 'Add text or a design image.'),
});

const teeGarmentTypes = ['tshirt', 'drop-shoulder', 'long-sleeve'];
const customSizesByGarmentType = {
  tshirt: ['XS', 'S', 'M', 'L', 'XL'],
  'drop-shoulder': ['XS', 'S', 'M', 'L', 'XL'],
  'long-sleeve': ['XS', 'S', 'M', 'L', 'XL'],
  hoodie: ['S', 'M', 'L', 'XL'],
  sweatshirt: ['S', 'M', 'L', 'XL'],
};

function publicUser(user) {
  return { id: user.id, email: user.email, fullName: user.fullName, phone: user.phone };
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = canonicalJson(value[key]);
      return result;
    }, {});
  }
  return value;
}

function designKey(design) {
  return JSON.stringify(canonicalJson(design.layoutJson));
}

async function startSession(res, userId) {
  const { token } = await createSession(userId);
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
}

async function verifyGoogleCredential(req, res, next) {
  if (!env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ success: false, error: { message: 'Google sign-in is not configured yet.' } });
  }
  const parsed = z.object({ credential: z.string().min(100).max(10_000) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { message: 'A valid Google credential is required.' } });
  }

  let payload;
  try {
    const ticket = await googleAuthClient.verifyIdToken({
      idToken: parsed.data.credential,
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (verificationError) {
    console.warn('Google sign-in credential verification failed.', verificationError.name);
    return res.status(401).json({ success: false, error: { message: 'Google sign-in could not be completed. Please try again.' } });
  }

  if (!payload?.sub || typeof payload.email !== 'string' || payload.email_verified !== true) {
    return res.status(401).json({ success: false, error: { message: 'Google sign-in could not be completed. Please try again.' } });
  }
  req.verifiedGooglePayload = payload;
  req.rateLimitEmail = payload.email.trim().toLowerCase();
  return next();
}

router.post('/password/forgot', passwordResetRequestIpLimiter, passwordResetRequestEmailLimiter, verifySameOrigin, async (req, res, next) => {
  const parsed = z.object({ email: z.string().trim().email().max(191) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Enter a valid email address.' } });
  }
  if (!isMailerConfigured()) {
    return res.status(503).json({ success: false, error: { message: 'Password reset email is temporarily unavailable. Please contact support.' } });
  }

  const email = parsed.data.email.toLowerCase();
  let resetToken;
  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, fullName: true, role: true, isActive: true },
    });
    if (!user || user.role !== 'CUSTOMER' || !user.isActive) {
      return res.json({ success: true, data: { message: resetRequestMessage } });
    }

    resetToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(resetToken).digest('hex');
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({
        data: {
          tokenHash,
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      }),
    ]);

    const resetUrl = new URL('/reset-password', env.CLIENT_ORIGIN);
    resetUrl.searchParams.set('token', resetToken);
    const safeName = escapeHtml(user.fullName);
    const safeUrl = escapeHtml(resetUrl.toString());
    await sendEmail({
      to: user.email,
      subject: 'Reset your ZAVIKOO password',
      text: `Hi ${user.fullName},\n\nUse this link within 1 hour to reset your ZAVIKOO password:\n${resetUrl.toString()}\n\nIf you did not request this, you can ignore this email.\n\nZAVIKOO Custom Atelier`,
      html: `<p>Hi ${safeName},</p><p>We received a request to reset the password for your ZAVIKOO account.</p><p style="margin:28px 0;"><a href="${safeUrl}" style="display:inline-block;padding:14px 24px;background:#211f1a;color:#fff;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;letter-spacing:1px;">RESET PASSWORD</a></p><p>This link expires in 1 hour and can only be used once. If you did not request this, you can ignore this email.</p>`,
    });
    return res.json({ success: true, data: { message: resetRequestMessage } });
  } catch (error) {
    if (user && resetToken) {
      const tokenHash = createHash('sha256').update(resetToken).digest('hex');
      try {
        await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
      } catch (cleanupError) {
        console.error('Password reset token cleanup failed.', cleanupError.name);
      }
    }
    console.error('Password reset email request failed.', error.name);
    return next(error);
  }
});

router.post('/password/reset', passwordResetLimiter, passwordResetTokenLimiter, passwordResetBackoff, verifySameOrigin, async (req, res, next) => {
  const parsed = z.object({
    token: z.string().min(32).max(128),
    password: z.string().min(12).max(256),
  }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Use a valid reset link and a password of at least 12 characters.' } });
  }

  const tokenHash = createHash('sha256').update(parsed.data.token).digest('hex');
  try {
    const token = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, role: true, isActive: true } } },
    });
    if (!token || token.expiresAt <= new Date() || token.user.role !== 'CUSTOMER' || !token.user.isActive) {
      return res.status(400).json({ success: false, error: { message: 'This password reset link is invalid or has expired. Request a new one to continue.' } });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const resetApplied = await prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.deleteMany({
        where: { id: token.id, expiresAt: { gt: new Date() } },
      });
      if (consumed.count !== 1) return false;
      await tx.user.update({ where: { id: token.userId }, data: { passwordHash } });
      await tx.session.deleteMany({ where: { userId: token.userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId: token.userId } });
      return true;
    });
    if (!resetApplied) {
      return res.status(400).json({ success: false, error: { message: 'This password reset link is invalid or has expired. Request a new one to continue.' } });
    }
    publishCustomerSessionRevoked(token.userId, 'session-ended');
    return res.json({ success: true, data: { message: 'Your password has been updated. Please sign in with your new password.' } });
  } catch (error) {
    return next(error);
  }
});

router.post('/register', registerIpLimiter, registerEmailLimiter, registerIpBackoff, registerEmailBackoff, verifySameOrigin, async (req, res, next) => {
  const parsed = z.object({
    ...credentialsSchema.shape,
    fullName: z.string().trim().min(2).max(191),
    phone: z.string().trim().min(7).max(40),
  }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Enter your name, a valid email, a phone number, and a password of at least 12 characters.' } });
  }
  try {
    const email = parsed.data.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      return res.status(409).json({ success: false, error: { message: 'An account with this email already exists.' } });
    }
    const user = await prisma.user.create({
      data: {
        email,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        passwordHash: await hashPassword(parsed.data.password),
      },
      select: { id: true, email: true, fullName: true, phone: true },
    });
    await startSession(res, user.id);
    return res.status(201).json({ success: true, data: { user } });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, error: { message: 'An account with this email already exists.' } });
    }
    return next(error);
  }
});

router.post('/login', loginIpLimiter, loginEmailLimiter, loginIpBackoff, loginEmailBackoff, verifySameOrigin, async (req, res, next) => {
  const parsed = z.object({
    email: z.string().trim().email().max(191),
    password: z.string().min(1).max(256),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Enter a valid email and password.' } });
  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    const passwordValid = await verifyPasswordOrDummy(parsed.data.password, user?.passwordHash);
    if (!user || user.role !== 'CUSTOMER' || !user.isActive || !passwordValid) {
      return res.status(401).json({ success: false, error: { message: 'Email or password is incorrect.' } });
    }
    await startSession(res, user.id);
    return res.json({ success: true, data: { user: publicUser(user) } });
  } catch (error) {
    return next(error);
  }
});

router.post('/google', googleLoginLimiter, googleIpBackoff, verifySameOrigin, verifyGoogleCredential, googleEmailLimiter, googleEmailBackoff, async (req, res, next) => {
  try {
    const payload = req.verifiedGooglePayload;
    const email = req.rateLimitEmail;
    let user = await prisma.user.findUnique({ where: { email } });
    if (user && (user.role !== 'CUSTOMER' || !user.isActive)) {
      return res.status(401).json({ success: false, error: { message: 'Google sign-in could not be completed. Please try again.' } });
    }

    if (!user) {
      try {
        user = await prisma.user.create({
          data: {
            email,
            fullName: (payload.name || email.split('@')[0]).trim().slice(0, 191),
            passwordHash: await hashPassword(randomBytes(32).toString('base64url')),
          },
        });
      } catch (createError) {
        if (createError.code !== 'P2002') throw createError;
        user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role !== 'CUSTOMER' || !user.isActive) {
          return res.status(401).json({ success: false, error: { message: 'Google sign-in could not be completed. Please try again.' } });
        }
      }
    }

    await startSession(res, user.id);
    return res.json({ success: true, data: { user: publicUser(user) } });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', verifySameOrigin, async (req, res, next) => {
  const token = req.cookies?.[SESSION_COOKIE];
  try {
    if (token) await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
    return res.json({ success: true, data: { loggedOut: true } });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', optionalCustomer, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.json({ success: true, data: { user: null } });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, fullName: true, phone: true, createdAt: true },
    });
    return res.json({ success: true, data: { user } });
  } catch (error) {
    return next(error);
  }
});

router.get('/session-events', async (req, res, next) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return res.status(204).end();

  let unsubscribe;
  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: { select: { id: true, role: true, isActive: true } } },
    });
    if (!session || session.expiresAt <= new Date() || !session.user.isActive || session.user.role !== 'CUSTOMER') {
      res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
      res.status(200).set('Content-Type', 'text/event-stream');
      res.write('event: session-revoked\ndata: {"reason":"session-ended"}\n\n');
      return res.end();
    }

    res.status(200).set({
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    res.write(': connected\n\n');
    unsubscribe = subscribeToCustomerSession(session.user.id, res);
    res.on('close', unsubscribe);
    const confirmedSession = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: { select: { id: true, role: true, isActive: true } } },
    });
    if (!confirmedSession || confirmedSession.expiresAt <= new Date() || !confirmedSession.user.isActive || confirmedSession.user.role !== 'CUSTOMER') {
      if (!res.writableEnded) {
        unsubscribe();
        res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
        res.write('event: session-revoked\ndata: {"reason":"session-ended"}\n\n');
        res.end();
      }
    }
  } catch (error) {
    unsubscribe?.();
    if (res.headersSent) {
      console.error('Customer session event stream failed.', error.name);
      return res.end();
    }
    return next(error);
  }
});

router.use(requireCustomer);

router.patch('/profile', verifySameOrigin, async (req, res, next) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Enter a valid name and phone number.' } });
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: parsed.data,
      select: { id: true, email: true, fullName: true, phone: true, createdAt: true },
    });
    return res.json({ success: true, data: { user } });
  } catch (error) {
    return next(error);
  }
});

router.patch('/password', verifySameOrigin, async (req, res, next) => {
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
    if (parsed.data.currentPassword === parsed.data.newPassword) {
      return res.status(400).json({ success: false, error: { message: 'New password must be different from your current password.' } });
    }
    const passwordHash = await hashPassword(parsed.data.newPassword);
    const { token } = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await tx.session.deleteMany({ where: { userId: user.id } });
      return createSession(user.id, tx);
    });
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
    return res.json({ success: true, data: { changed: true } });
  } catch (error) {
    return next(error);
  }
});

router.get('/addresses', async (req, res, next) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return res.json({ success: true, data: addresses });
  } catch (error) {
    return next(error);
  }
});

router.post('/addresses', verifySameOrigin, async (req, res, next) => {
  const parsed = addressSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Complete all required address fields.' } });
  try {
    const address = await prisma.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { userId: req.user.id } });
      if (count >= 12) {
        const error = new Error('You can save up to 12 addresses.');
        error.status = 400;
        throw error;
      }
      const isDefault = parsed.data.isDefault || count === 0;
      if (isDefault) await tx.address.updateMany({ where: { userId: req.user.id, isDefault: true }, data: { isDefault: false } });
      return tx.address.create({
        data: { ...parsed.data, line2: parsed.data.line2 || null, postalCode: parsed.data.postalCode || null, userId: req.user.id, isDefault },
      });
    });
    return res.status(201).json({ success: true, data: address });
  } catch (error) {
    return next(error);
  }
});

router.patch('/addresses/:id', verifySameOrigin, async (req, res, next) => {
  const parsed = addressSchema.safeParse(req.body);
  const id = z.coerce.number().int().positive().safeParse(req.params.id);
  if (!parsed.success || !id.success) return res.status(400).json({ success: false, error: { message: 'Enter valid address details.' } });
  try {
    const address = await prisma.$transaction(async (tx) => {
      const existing = await tx.address.findFirst({ where: { id: id.data, userId: req.user.id } });
      if (!existing) return null;
      if (parsed.data.isDefault) await tx.address.updateMany({ where: { userId: req.user.id, isDefault: true }, data: { isDefault: false } });
      return tx.address.update({
        where: { id: existing.id },
        data: { ...parsed.data, line2: parsed.data.line2 || null, postalCode: parsed.data.postalCode || null },
      });
    });
    if (!address) return res.status(404).json({ success: false, error: { message: 'Address not found.' } });
    return res.json({ success: true, data: address });
  } catch (error) {
    return next(error);
  }
});

router.delete('/addresses/:id', verifySameOrigin, async (req, res, next) => {
  const id = z.coerce.number().int().positive().safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ success: false, error: { message: 'Invalid address.' } });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.address.findFirst({ where: { id: id.data, userId: req.user.id } });
      if (!existing) return false;
      await tx.address.delete({ where: { id: existing.id } });
      if (existing.isDefault) {
        const nextDefault = await tx.address.findFirst({ where: { userId: req.user.id }, orderBy: { createdAt: 'asc' } });
        if (nextDefault) await tx.address.update({ where: { id: nextDefault.id }, data: { isDefault: true } });
      }
      return true;
    });
    if (!result) return res.status(404).json({ success: false, error: { message: 'Address not found.' } });
    return res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    return next(error);
  }
});

router.get('/orders', async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      select: {
        orderNumber: true, status: true, createdAt: true, subtotalPaisa: true, discountPaisa: true, shippingPaisa: true, totalPaisa: true, shippingAddress: true, customerNotes: true,
        items: {
          select: {
            nameSnapshot: true, skuSnapshot: true, size: true, color: true, qty: true, unitPricePaisa: true,
            variant: { select: { color: true, size: true, product: { select: { images: { select: { storageKey: true }, orderBy: { sortOrder: 'asc' } } } } } },
            design: {
              select: {
                layoutJson: true,
                customProduct: { select: { name: true, garmentType: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.json({ success: true, data: orders });
  } catch (error) {
    return next(error);
  }
});

router.get('/designs', async (req, res, next) => {
  try {
    const designs = await prisma.customDesign.findMany({
      where: { userId: req.user.id },
      include: {
        product: { select: { name: true, sku: true } },
        customProduct: { select: { id: true, name: true, sku: true, garmentType: true } },
        orderItems: { select: { order: { select: { orderNumber: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const uniqueDesigns = [];
    const designIndexes = new Map();
    for (const design of designs) {
      const key = `${design.customProductId || design.productId || 'custom'}:${designKey(design)}`;
      const existingIndex = designIndexes.get(key);
      if (existingIndex === undefined) {
        designIndexes.set(key, uniqueDesigns.length);
        uniqueDesigns.push(design);
        continue;
      }

      const existing = uniqueDesigns[existingIndex];
      const designIsOrdered = design.orderItems.length > 0;
      const existingIsOrdered = existing.orderItems.length > 0;
      if ((designIsOrdered && !existingIsOrdered) || (design.status !== 'DRAFT' && existing.status === 'DRAFT')) {
        uniqueDesigns[existingIndex] = design;
      }
    }
    return res.json({ success: true, data: uniqueDesigns });
  } catch (error) {
    return next(error);
  }
});

router.post('/designs', verifySameOrigin, async (req, res, next) => {
  const parsed = savedDesignSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Check the design details and try again.' } });
  try {
    const customProduct = await prisma.customProduct.findFirst({
      where: { id: parsed.data.customProductId, isActive: true },
      select: { id: true, name: true, garmentType: true, colors: true },
    });
    if (!customProduct) return res.status(404).json({ success: false, error: { message: 'This custom garment is no longer available.' } });
    const selectedColor = Array.isArray(customProduct.colors)
      ? customProduct.colors.find((color) => color?.name === parsed.data.design.color)
      : null;
    if (!selectedColor) return res.status(400).json({ success: false, error: { message: 'Choose a valid garment color.' } });
    const allowedSizes = customSizesByGarmentType[customProduct.garmentType] || [];
    if (!allowedSizes.includes(parsed.data.design.size)) {
      return res.status(400).json({ success: false, error: { message: 'Choose a valid garment size.' } });
    }
    if (parsed.data.design.size === 'XS' && teeGarmentTypes.includes(customProduct.garmentType) && !parsed.data.design.xsMeasurements) {
      return res.status(400).json({ success: false, error: { message: 'Enter length and chest measurements for XS size.' } });
    }
    const { customProductId, design } = parsed.data;
    const layoutJson = {
      ...design,
      garmentName: customProduct.name,
      garmentType: customProduct.garmentType,
      colorHex: selectedColor.hex,
    };
    const saved = await prisma.customDesign.create({
      data: {
        userId: req.user.id,
        customProductId,
        schemaVersion: design.schemaVersion,
        layoutJson,
        rightsConfirmed: design.rightsConfirmed,
        status: 'DRAFT',
      },
      include: { customProduct: { select: { name: true, sku: true, garmentType: true } } },
    });
    return res.status(201).json({ success: true, data: saved });
  } catch (error) {
    return next(error);
  }
});

export default router;
