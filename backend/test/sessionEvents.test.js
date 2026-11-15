import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publishCustomerSessionRevoked, subscribeToCustomerSession } from '../src/services/sessionEvents.js';

function createResponse() {
  return {
    body: '',
    writableEnded: false,
    write(chunk) { this.body += chunk; },
    end() { this.writableEnded = true; },
    clearCookie() {},
  };
}

test('session revocation is delivered only to that customers connected clients', async () => {
  const customerResponse = createResponse();
  const otherResponse = createResponse();
  const unsubscribe = subscribeToCustomerSession(101, customerResponse);
  const unsubscribeOther = subscribeToCustomerSession(202, otherResponse);

  await publishCustomerSessionRevoked(101);

  assert.match(customerResponse.body, /event: session-revoked/);
  assert.equal(customerResponse.writableEnded, true);
  assert.equal(otherResponse.writableEnded, false);
  unsubscribe();
  unsubscribeOther();
});

