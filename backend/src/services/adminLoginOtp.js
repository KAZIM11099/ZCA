import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import geoip from 'geoip-lite';
import { env } from '../config/env.js';

export const ADMIN_LOGIN_CHALLENGE_COOKIE = 'zavikoo_admin_login_challenge';
export const ADMIN_LOGIN_OTP_TTL_MS = 5 * 60 * 1000;
export const ADMIN_LOGIN_OTP_EMAIL = 'zavikoocustomatelier@gmail.com';

export function createAdminLoginCode() {
  return String(randomInt(100_000, 1_000_000));
}

export function createAdminLoginChallengeToken() {
  return randomBytes(32).toString('base64url');
}

export function hashAdminLoginChallenge(token) {
  return createHmac('sha256', env.SESSION_SECRET).update(`admin-login:${token}`).digest('hex');
}

export function hashAdminLoginCode(challengeHash, code) {
  return createHmac('sha256', env.SESSION_SECRET).update(`${challengeHash}:${code}`).digest('hex');
}

export function verifyAdminLoginCode(challengeHash, code, codeHash) {
  if (!/^\d{6}$/.test(code) || !/^[a-f0-9]{64}$/i.test(codeHash || '')) return false;
  const expected = Buffer.from(codeHash, 'hex');
  const actual = Buffer.from(hashAdminLoginCode(challengeHash, code), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function normalizeIp(ip) {
  return String(ip || '').replace(/^::ffff:/i, '');
}

function describeDevice(userAgent) {
  const agent = String(userAgent || '');
  const type = /ipad|tablet/i.test(agent)
    ? 'Tablet'
    : /mobile|iphone|ipod|android/i.test(agent)
      ? 'Mobile'
      : 'Desktop';
  const browser = /edg\//i.test(agent)
    ? 'Edge'
    : /firefox\//i.test(agent)
      ? 'Firefox'
      : /chrome\//i.test(agent)
        ? 'Chrome'
        : /safari\//i.test(agent)
          ? 'Safari'
          : 'Unknown browser';
  const operatingSystem = /windows/i.test(agent)
    ? 'Windows'
    : /android/i.test(agent)
      ? 'Android'
      : /iphone|ipad|ios/i.test(agent)
        ? 'iOS'
        : /mac os|macintosh/i.test(agent)
          ? 'macOS'
          : /linux/i.test(agent)
            ? 'Linux'
            : 'Unknown OS';
  return `${type} · ${browser} · ${operatingSystem}`;
}

export function getAdminLoginContext(ip, userAgent) {
  const normalizedIp = normalizeIp(ip);
  const geo = normalizedIp ? geoip.lookup(normalizedIp) : null;
  const country = geo?.country
    ? new Intl.DisplayNames(['en'], { type: 'region' }).of(geo.country)
    : undefined;
  const locationParts = geo
    ? [geo.city, geo.region, country].filter((part, index, parts) => part && parts.indexOf(part) === index)
    : [];
  return {
    location: locationParts.length ? locationParts.join(', ') : 'Location unavailable',
    device: describeDevice(userAgent),
    ip: normalizedIp || 'Unavailable',
  };
}
