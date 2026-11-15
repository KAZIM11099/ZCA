# Hardening decisions

## Production environment requirements

`TRUST_PROXY`, `SITE_URL`, `API_URL`, and `ADMIN_NOTIFY_EMAIL` are required for production startup. `TRUST_PROXY` is an explicit trusted-hop count; configure the actual proxy chain (for example, Cloudflare plus Nginx is typically two hops). Production also requires HTTPS site/API URLs, a 48-random-byte session secret, a non-root MySQL account with a password, and configured SMTP credentials.

`REDIS_URL` and `SENTRY_DSN` remain optional. Object-storage variables are optional until the Phase 2 storage driver is implemented and deployed; partial S3-compatible credentials are rejected. Requiring an unimplemented storage backend at this stage would make production configuration appear ready when the application cannot yet use it.

## Rate-limit storage and account enumeration

When `REDIS_URL` is unset, production retains the in-process rate-limit store for compatibility and emits a startup warning; multi-instance deployments must configure Redis for shared limits. Password and Google login failures use generic account-independent responses and dummy scrypt work for unknown password accounts. Duplicate-registration responses remain distinguishable until the email-verification workflow is implemented; changing only the response without fixing registration/session behavior would still expose account existence.

## Frontend security-header templates

The Nginx and static-host header templates use `shop.example.com`, `api.example.com`, and `images.example.com` as replaceable deployment placeholders because the production API and image-CDN origins were not provided. Replace them before publishing. HSTS preload is intentionally disabled pending owner confirmation.

## Prisma Linux validation

The Prisma client now includes Windows native, Debian OpenSSL 3, and Linux musl OpenSSL 3 engines. A clean Linux container smoke test is still required: Docker is not installed in the current Windows workspace, so local generation and import checks do not certify `npm ci` or server startup on Linux.
