import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, verifyPasswordOrDummy } from '../src/services/passwords.js';

test('password hashes are salted and verify the original password', async () => {
  const password = 'a-unique-test-password';
  const firstHash = await hashPassword(password);
  const secondHash = await hashPassword(password);

  assert.notEqual(firstHash, secondHash);
  assert.equal(await verifyPassword(password, firstHash), true);
  assert.equal(await verifyPassword('a-different-password', firstHash), false);
});

test('malformed password hashes fail closed', async () => {
  assert.equal(await verifyPassword('anything', 'not-a-valid-hash'), false);
  assert.equal(await verifyPassword('anything', 'scrypt$c2FsdA$YQ'), false);
});

test('login verification performs a dummy scrypt check for unknown accounts', async () => {
  const hash = await hashPassword('a-unique-test-password');

  assert.equal(await verifyPasswordOrDummy('a-unique-test-password', hash), true);
  assert.equal(await verifyPasswordOrDummy('wrong-password', hash), false);
  assert.equal(await verifyPasswordOrDummy('wrong-password', undefined), false);
});
