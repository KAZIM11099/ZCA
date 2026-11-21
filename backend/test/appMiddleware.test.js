import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';

test('assigns request IDs and applies body limits after route protections', async (t) => {
  process.env.NODE_ENV = 'test';
  const { default: app } = await import('../src/app.js');
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => {
    server.closeAllConnections();
    server.close(resolve);
  }));

  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  const largeValue = 'x'.repeat(120_000);
  const liveHealth = await fetch(`${origin}/health/live`);
  assert.equal(liveHealth.status, 200);
  assert.equal(liveHealth.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(liveHealth.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()');
  assert.equal(liveHealth.headers.get('cross-origin-opener-policy'), 'same-origin-allow-popups');
  assert.equal(liveHealth.headers.get('cross-origin-resource-policy'), 'same-site');
  assert.equal(liveHealth.headers.get('strict-transport-security'), null);
  assert.match(liveHealth.headers.get('content-security-policy'), /default-src 'self'/);

  const sitemap = await fetch(`${origin}/sitemap.xml`);
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.headers.get('content-type'), /application\/xml/);
  assert.match(await sitemap.text(), /sitemap-products\.xml/);

  const guideSitemap = await fetch(`${origin}/sitemap-guides.xml`);
  assert.equal(guideSitemap.status, 200);
  assert.match(await guideSitemap.text(), /\/guides\/artwork-preparation/);

  const allowedOrigin = process.env.CLIENT_ORIGIN;
  const allowedCors = await fetch(`${origin}/health/live`, {
    headers: { Origin: allowedOrigin },
  });
  assert.equal(allowedCors.headers.get('access-control-allow-origin'), allowedOrigin);

  const cookieWriteWithoutOrigin = await fetch(`${origin}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: 'zk_sess=present' },
    body: JSON.stringify({ email: 'customer@example.com', password: 'not-a-real-password' }),
  });
  assert.equal(cookieWriteWithoutOrigin.status, 403);

  const foreignOriginWrite = await fetch(`${origin}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://untrusted.example',
    },
    body: JSON.stringify({ email: 'customer@example.com', password: 'not-a-real-password' }),
  });
  assert.equal(foreignOriginWrite.status, 403);

  const tooLarge = await fetch(`${origin}/api/v1/auth/login?not-logged=secret`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: largeValue }),
  });

  assert.equal(tooLarge.status, 413);
  assert.match(tooLarge.headers.get('x-request-id'), /^[0-9a-f-]{36}$/i);

  const quote = await fetch(`${origin}/api/v1/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: largeValue,
      email: 'customer@example.com',
      projectType: 'custom garments',
      quantity: 1,
      details: 'A valid length detail.',
    }),
  });
  assert.equal(quote.status, 400);

  const admin = await fetch(`${origin}/api/v1/admin/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: largeValue }),
  });
  assert.equal(admin.status, 401);

  const selfCheck = await fetch(`${origin}/api/v1/admin/system/client-ip`);
  assert.equal(selfCheck.status, 401);

  const missingAdminChallenge = await fetch(`${origin}/api/v1/auth/verify-login-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: allowedOrigin,
    },
    body: JSON.stringify({ code: '123456' }),
  });
  assert.equal(missingAdminChallenge.status, 401);
  assert.match(missingAdminChallenge.headers.get('set-cookie'), /zavikoo_admin_login_challenge=/);

  const checkout = await fetch(`${origin}/api/v1/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ design: largeValue }),
  });
  assert.equal(checkout.status, 401);
});
