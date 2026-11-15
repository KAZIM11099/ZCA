import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const backendRoot = fileURLToPath(new URL('../', import.meta.url));
const missingTestEnv = fileURLToPath(new URL('../.missing-test-env', import.meta.url));
const envModule = './src/config/env.js';
const sessionSecret = 'a'.repeat(64);

function productionEnvironment(overrides = {}) {
  return {
    NODE_ENV: 'production',
    TRUST_PROXY: '2',
    CLIENT_ORIGIN: 'https://shop.example.com',
    SITE_URL: 'https://shop.example.com',
    API_URL: 'https://api.example.com',
    ADMIN_NOTIFY_EMAIL: 'owner@example.com',
    DATABASE_URL: 'mysql://zavikoo_app:test-password@127.0.0.1:3306/zavikoo_test',
    SESSION_SECRET: sessionSecret,
    SMTP_USER: 'mailer@example.com',
    SMTP_PASS: 'test-smtp-password',
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    DOTENV_CONFIG_PATH: missingTestEnv,
    ...overrides,
  };
}

function loadProductionEnv(environment) {
  return spawnSync(
    process.execPath,
    ['--input-type=module', '-e', `import('${envModule}').then(() => console.log('environment accepted'))`],
    { cwd: backendRoot, env: environment, encoding: 'utf8' },
  );
}

test('production environment accepts secure required configuration', () => {
  const result = loadProductionEnv(productionEnvironment());

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /environment accepted/);
});

test('production environment accepts an HTTPS client-origin allow-list', () => {
  const result = loadProductionEnv(productionEnvironment({
    CLIENT_ORIGINS: 'https://shop.example.com,https://admin.example.com',
  }));

  assert.equal(result.status, 0, result.stderr);
});

test('production environment rejects insecure origins in the client-origin allow-list', () => {
  const result = loadProductionEnv(productionEnvironment({
    CLIENT_ORIGINS: 'https://shop.example.com,http://admin.example.com',
  }));

  assert.equal(result.status, 1);
  assert.match(result.stderr, /All production client origins must use HTTPS/);
});

test('production environment requires an explicit trusted proxy count', () => {
  const environment = productionEnvironment();
  delete environment.TRUST_PROXY;
  const result = loadProductionEnv(environment);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /TRUST_PROXY/);
});

test('production environment rejects missing public URLs and owner email', () => {
  const environment = productionEnvironment({
    SITE_URL: '',
    API_URL: '',
    ADMIN_NOTIFY_EMAIL: '',
  });
  const result = loadProductionEnv(environment);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /SITE_URL/);
  assert.match(result.stderr, /API_URL/);
  assert.match(result.stderr, /ADMIN_NOTIFY_EMAIL/);
});

test('production environment rejects root database credentials', () => {
  const result = loadProductionEnv(productionEnvironment({
    DATABASE_URL: 'mysql://root:test-password@127.0.0.1:3306/zavikoo_test',
  }));

  assert.equal(result.status, 1);
  assert.match(result.stderr, /non-root MySQL account/);
});

test('production environment rejects partial object-storage configuration', () => {
  const result = loadProductionEnv(productionEnvironment({
    OBJECT_STORAGE_BUCKET: 'zavikoo-media',
  }));

  assert.equal(result.status, 1);
  assert.match(result.stderr, /full object-storage/);
});
