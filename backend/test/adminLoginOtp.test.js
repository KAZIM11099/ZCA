import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADMIN_LOGIN_OTP_TTL_MS,
  createAdminLoginChallengeToken,
  createAdminLoginCode,
  getAdminLoginContext,
  hashAdminLoginChallenge,
  hashAdminLoginCode,
  verifyAdminLoginCode,
} from '../src/services/adminLoginOtp.js';

test('admin login codes are six digits and expire after five minutes', () => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    assert.match(createAdminLoginCode(), /^\d{6}$/);
  }
  assert.equal(ADMIN_LOGIN_OTP_TTL_MS, 5 * 60 * 1000);
});

test('admin login challenge and code verification are bound together', () => {
  const challengeHash = hashAdminLoginChallenge(createAdminLoginChallengeToken());
  const codeHash = hashAdminLoginCode(challengeHash, '012345');

  assert.equal(verifyAdminLoginCode(challengeHash, '012345', codeHash), true);
  assert.equal(verifyAdminLoginCode(challengeHash, '012346', codeHash), false);
  assert.equal(verifyAdminLoginCode(`${challengeHash}0`, '012345', codeHash), false);
  assert.equal(verifyAdminLoginCode(challengeHash, '12345', codeHash), false);
});

test('login email context reports approximate local GeoIP and device details', () => {
  const context = getAdminLoginContext(
    '8.8.8.8',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
  );
  assert.equal(context.location.includes('United States'), true);
  assert.equal(context.device, 'Desktop · Chrome · Windows');
  assert.equal(context.ip, '8.8.8.8');

  const unknownLocation = getAdminLoginContext('127.0.0.1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1');
  assert.equal(unknownLocation.location, 'Location unavailable');
  assert.match(unknownLocation.device, /^Mobile · Safari · iOS$/);
});
