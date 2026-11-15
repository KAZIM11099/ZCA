import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.REDIS_URL = '';

const {
  createEmailRateBackoff,
  createEmailRateLimiter,
} = await import('../src/services/rateLimiters.js');

test('email throttling normalizes account keys and applies exponential delays', async (t) => {
  const app = express();
  app.use(express.json({ limit: '10kb' }));
  app.post('/limited', createEmailRateLimiter('test-email-limit', {
    windowMs: 60_000,
    limit: 2,
    handler: (req, res) => res.status(429).json({
      success: false,
      error: { message: 'Too many requests.' },
    }),
  }), (req, res) => res.sendStatus(204));

  app.post('/backoff', createEmailRateBackoff('test-email-backoff', {
    windowMs: 60_000,
    skipSuccessfulRequests: true,
  }), (req, res) => res.status(401).json({ delay: req.slowDown.delay }));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => {
    server.closeAllConnections();
    server.close(resolve);
  }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const send = (path, email) => fetch(`${origin}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  assert.equal((await send('/limited', 'Shopper@example.com')).status, 204);
  assert.equal((await send('/limited', 'shopper@EXAMPLE.com')).status, 204);
  const limited = await send('/limited', 'shopper@example.com');
  assert.equal(limited.status, 429);
  assert.ok(limited.headers.get('retry-after'));

  const firstDelay = await (await send('/backoff', 'another@example.com')).json();
  const secondDelay = await (await send('/backoff', 'ANOTHER@example.com')).json();
  const thirdDelay = await (await send('/backoff', 'another@example.com')).json();
  assert.equal(firstDelay.delay, 0);
  assert.ok(secondDelay.delay > firstDelay.delay);
  assert.ok(thirdDelay.delay > secondDelay.delay);
});
