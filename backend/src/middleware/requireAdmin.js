import { prisma } from '../db.js';
import { env } from '../config/env.js';
import { hashSessionToken, SESSION_COOKIE } from '../services/sessions.js';

export async function requireAdmin(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
  }

  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: { select: { id: true, email: true, fullName: true, role: true, isActive: true } } },
    });

    if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      return res.status(401).json({ success: false, error: { message: 'Session expired or invalid' } });
    }

    if (!['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'PRODUCT_MANAGER', 'SUPPORT'].includes(session.user.role)) {
      return res.status(403).json({ success: false, error: { message: 'Administrator access required' } });
    }

    req.user = session.user;
    req.sessionId = session.id;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { message: 'You do not have permission to perform this action' } });
    }
    return next();
  };
}

export function verifySameOrigin(req, res, next) {
  const origin = req.get('origin');
  const referer = req.get('referer');
  let refererOrigin;
  if (!origin && referer) {
    try {
      refererOrigin = new URL(referer).origin;
    } catch {
      refererOrigin = undefined;
    }
  }
  const requestOrigin = origin || refererOrigin;
  if (
    (requestOrigin && !env.CLIENT_ORIGINS.includes(requestOrigin))
    || (!requestOrigin && req.get('cookie'))
  ) {
    return res.status(403).json({ success: false, error: { message: 'Request origin is not allowed' } });
  }
  return next();
}
