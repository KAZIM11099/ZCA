import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const DUMMY_PASSWORD_HASH = `scrypt$${Buffer.alloc(16).toString('base64url')}$${Buffer.alloc(KEY_LENGTH).toString('base64url')}`;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(password, storedHash) {
  const [algorithm, saltText, keyText] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !saltText || !keyText) return false;

  const salt = Buffer.from(saltText, 'base64url');
  const expectedKey = Buffer.from(keyText, 'base64url');
  if (expectedKey.length !== KEY_LENGTH) return false;

  const actualKey = await scrypt(password, salt, expectedKey.length);
  return timingSafeEqual(actualKey, expectedKey);
}

export async function verifyPasswordOrDummy(password, storedHash) {
  const valid = await verifyPassword(password, storedHash || DUMMY_PASSWORD_HASH);
  return Boolean(storedHash) && valid;
}
