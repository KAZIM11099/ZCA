# ZAVIKOO CUSTOM ATELIER — Delivery Status

## Implemented and verified in this phase

- Prisma/MySQL schema migrations for sessions, quotes, custom designs, order design relations, and order/customer data.
- Database-backed catalog, category, and collection APIs, including query validation, filtering, sorting, and pagination.
- Development seed data for categories, collections, product images, product variants, and stock.
- Admin authentication using scrypt password hashes, hashed server-side session tokens, HttpOnly/SameSite cookies, origin checks, role checks, login throttling, logout, password change, and password reset tooling.
- Separate customer registration/login, profile updates, address book with a default address, account-linked order history, and checkout prefill from saved profile/address details.
- Admin API/dashboard workflows for products, categories, orders, customer summaries, quotes, design moderation, and audit logs.
- Server-priced guest cash-on-delivery checkout with variant stock reservation, transaction rollback, optional idempotency key, order snapshots, and COD payment records.
- Email-and-order-number protected order status lookup.
- Frontend database integration for catalog discovery, product details, quote requests, checkout, tracking, admin, and browser-local wishlists.
- A limited text design preview that saves rights-confirmed design metadata with an order and supports admin review.
- Frontend production build, Prisma schema validation, migrations, development seed, and API readiness/auth-boundary smoke checks.

## Remaining before production launch

- Payment gateway, verified provider webhooks, live courier integration, actual shipping pricing/rules, transactional email, and official WhatsApp provider setup.
- Customer password reset/email verification, server-side wishlist, coupon/review/newsletter workflows.
- Secure customer artwork uploads, private object storage, production-ready canvas/print-file validation, and complete custom-design communications.
- Remaining brief modules: configurable store/content/settings, richer category/collection CRUD, analytics, FAQ/policy CMS, and full OpenAPI documentation.
- Automated integration/E2E/accessibility/security tests, staging deployment, monitoring, backup/restore drill, production imagery, and domain-specific legal/privacy review.

Do not describe the current local checkout as card-payment-ready or the carrier status as live tracking. See `README.md` for local setup and launch blockers.

