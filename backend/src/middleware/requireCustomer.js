import { prisma } from '../db.js';
import { hashSessionToken, SESSION_COOKIE, sessionCookieOptions } from '../services/sessions.js';

export async function requireCustomer(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    return res.status(401).json({ success: false, error: { message: 'Please sign in to access your account.' } });
  }

  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: { select: { id: true, email: true, fullName: true, phone: true, role: true, isActive: true } } },
    });
    if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
      return res.status(401).json({ success: false, error: { message: 'Your session has expired. Please sign in again.' } });
    }
    if (session.user.role !== 'CUSTOMER') {
      return res.status(403).json({ success: false, error: { message: 'A customer account is required.' } });
    }

    req.user = session.user;
    req.sessionId = session.id;
    return next();
  } catch (error) {
    return next(error);
  }
}

export async function optionalCustomer(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next();

  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: { select: { id: true, role: true, isActive: true } } },
    });
    if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
      return res.status(401).json({ success: false, error: { message: 'Your session has expired. Please sign in again.' } });
    }
    if (session.user.role === 'CUSTOMER') req.user = session.user;
    return next();
  } catch (error) {
    return next(error);
  }
}

