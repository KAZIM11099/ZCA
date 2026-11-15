# ZAVIKOO CUSTOM ATELIER

Custom clothing storefront and admin workspace built with React, Vite, Express, Prisma, and MySQL.

## Current working workflows

- Public catalog, categories, collections, search, sorting, and product details use the MySQL API.
- Men, Women, and Kids collections have storefront dropdown links and dynamic collection pages. Product staff can update collection details, visibility, and assigned products in Admin → Collections.
- Customers can save a simple text design, confirm their usage rights, and submit it with a cash-on-delivery order.
- Checkout recalculates prices and reserves variant stock on the server in a database transaction. Repeated requests can use an idempotency key.
- Quote requests and optional PNG/JPG/WebP design images (up to 4 MB) are stored in MySQL and can be reviewed by authorized staff in the protected admin quote inbox.
- `/admin/login` uses database-backed sessions in HttpOnly, SameSite cookies. Server routes enforce roles independently of the frontend.
- Admin workspace: dashboard, products, categories, orders/statuses, tracking references, customers, quote review, design moderation, password changes, and audit log.
- Customers can register and sign in separately from staff, update their name/phone, manage up to 12 saved delivery addresses, view account-linked orders, and use their saved details at checkout.
- The storefront contact form stores enquiries in MySQL. Support staff can search the admin Contact inbox and mark messages new, read, replied, or archived.
- Customers can submit product ratings and reviews; product staff approve or reject them in Admin → Product reviews. Only approved reviews and ratings are public.
- Instagram and TikTok icons are shown in the storefront footer and contact page; set `VITE_INSTAGRAM_URL` and `VITE_TIKTOK_URL` to the official profile URLs before launch.
- Product/category/order/design/quote administration is restricted by role. Administrators can rotate their password from Admin → Security.
- Development catalog seed data is explicitly sample content, not real customer or sales data.


## Storefront design system

The storefront uses a luxury "stencil atelier" look drawn from the brand mark: cargo black, bone, olive, sand and brass.

- Tokens live in `frontend/tailwind.config.js` and `frontend/src/styles/index.css` (buttons `.btn-*`, inputs `.field`, chips `.chip`, headings `.display-*`).
- Fonts (Google Fonts, loaded in `frontend/index.html`): Bodoni Moda (headings), Hanken Grotesk (text), Saira Stencil One (brand wordmark).
- Old colour class names (`ink`, `paper`, `orange`, `cobalt`, `lime`...) are kept as aliases so account and admin pages match automatically.
- After pulling these changes run `npm run build` in `frontend/` to refresh `dist/`.

## Local development (Windows / PowerShell)

Requirements: Node.js 20+, MySQL 8+, and PowerShell.

1. Start MySQL and create the local database in phpMyAdmin or a MySQL console:

   ```sql
   CREATE DATABASE zavikoo_atelier CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Configure the backend:

   ```powershell
   cd backend
   Copy-Item .env.example .env
   ```

   Set `DATABASE_URL` to your local MySQL connection string, `CLIENT_ORIGIN` to the exact Vite origin, and `SESSION_SECRET` to a unique random value. Generate a secret locally with:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
   ```

   Do not share or commit `.env`. If using a MySQL password with URL-reserved characters, URL-encode the username/password in `DATABASE_URL`.

3. Install packages, apply migrations, and add the sample catalog:

   ```powershell
   npm install
   npm run prisma:generate
   npm run prisma:deploy
   npm run prisma:seed
   ```

   `prisma:seed` is development-only and refuses to run when `NODE_ENV=production`. It does not create orders or customers.

4. Create an administrator for a fresh database. Set the email/name, then enter the password at the hidden terminal prompt:

   ```powershell
   $env:ADMIN_EMAIL = "admin@example.com"
   $env:ADMIN_NAME = "Store Admin"
   npm run admin:create
   Remove-Item Env:ADMIN_EMAIL, Env:ADMIN_NAME
   ```

   Password input is not echoed or passed in a command-line argument. For an existing administrator, rotate a password from Admin → Security, or run:

   ```powershell
   npm run admin:reset-password -- admin@example.com
   ```

5. Start the backend and frontend in separate PowerShell terminals:

   ```powershell
   # backend/
   npm run dev
   ```

   ```powershell
   # frontend/
   Copy-Item .env.example .env
   npm install
   npm run dev
   ```

   The API health endpoint is `http://localhost:4000/api/v1/health`; the Vite site is `http://localhost:5173`. Admin login is at `/admin/login`.

   Customer accounts can be created from `/register`; customer sign-in is at `/login`. New passwords must be at least 12 characters. Admin credentials do not sign in as customer accounts.

## Useful commands

| Directory | Command | Purpose |
|---|---|---|
| `backend` | `npm run prisma:deploy` | Apply committed migrations (staging/production-safe) |
| `backend` | `npm run prisma:migrate -- --name change_name` | Create/apply a development migration |
| `backend` | `npm run prisma:generate` | Generate the Prisma Client |
| `backend` | `npm run prisma:seed` | Add/update the sample catalog in development |
| `backend` | `npm run admin:create` | Create a `SUPER_ADMIN` with hidden password input |
| `backend` | `npm run admin:reset-password -- email` | Rotate an existing administrator password |
| `frontend` | `npm run build` | Create the production frontend bundle |

Stop the backend dev server before changing the Prisma schema and regenerating the client on Windows. A running Node process can lock the generated Prisma engine DLL.

## API overview

- `GET /api/v1/health` — application and database readiness
- `GET /api/v1/products`, `GET /api/v1/products/:slug` — published catalog
- `GET /api/v1/products/:slug/reviews`, `POST /api/v1/products/:slug/reviews` — approved product reviews and moderated review submissions
- `GET /api/v1/categories`, `GET /api/v1/collections` — discovery data
- `GET /api/v1/custom-products` — active custom garments
- `POST /api/v1/checkout` — server-priced guest COD order
- `POST /api/v1/quote` — rate-limited quote intake
- `POST /api/v1/contact` — rate-limited contact enquiry intake
- `POST /api/v1/newsletter/subscribe` — rate-limited, consent-based newsletter subscription
- `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`
- `POST /api/v1/auth/change-password`
- `POST /api/v1/account/register`, `POST /api/v1/account/login`, `POST /api/v1/account/logout`
- Authenticated `GET /api/v1/account/me`, `PATCH /api/v1/account/profile`, `GET/POST /api/v1/account/addresses`, `PATCH/DELETE /api/v1/account/addresses/:id`, `GET /api/v1/account/orders`, and `GET/POST /api/v1/account/designs`
- `/api/v1/admin/*` — authenticated and role-checked admin APIs
- `GET/POST /api/v1/admin/custom-products`, `PATCH/DELETE /api/v1/admin/custom-products/:id` — custom garment management
- `GET /api/v1/admin/contact-messages`, `PATCH /api/v1/admin/contact-messages/:id` — support-staff contact inbox
- `GET /api/v1/admin/newsletter-subscribers` — searchable, paginated subscriber list for support staff
- `GET /api/v1/admin/quotes/:id/design-image` — authenticated support-staff access to a quote's uploaded design image
- `GET /api/v1/admin/collections`, `POST /api/v1/admin/collections`, `PATCH /api/v1/admin/collections/:id` — product staff collection management and product assignments
- `GET /api/v1/admin/reviews`, `PATCH /api/v1/admin/reviews/:id` — product review moderation for product staff

All successful API responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "error": ... }`.

## Production deployment requirements and current limits

This repository is **not yet a turnkey live-commerce deployment**. Configure and test the following before accepting real orders:

- Use a managed production MySQL database, backups, TLS, least-privilege database credentials, and a migration/restore procedure.
- Set `NODE_ENV=production`, `CLIENT_ORIGIN` to the HTTPS storefront origin, a unique 32+ character `SESSION_SECRET`, and a dedicated non-root MySQL account/password. The backend rejects placeholder secrets, non-HTTPS origins, and empty database passwords in production.
- Deploy the backend behind HTTPS and a correctly configured reverse proxy. Configure secure asset storage/CDN and replace sample remote product imagery with owned/licensed product assets.
- Checkout currently supports **cash on delivery only**; shipping cost is not configured and is currently zero. Add the business's actual shipping rules before taking orders. No card payment provider, webhook, email, WhatsApp, or live Leopards integration is configured.
- The customization workflow supports text/style/placement metadata and rights confirmation. It does not yet provide customer artwork uploads, a production-grade canvas, print-file validation, or a full design-approval communication flow.
- Customer password reset, email change verification, server-side wishlist, coupon workflows, and content/settings CMS still need implementation before the corresponding brief requirements can be considered complete.
- Run an end-to-end test order in a separate staging database, confirm stock/cancellation/restock behavior, test role boundaries, configure monitoring, and verify backups before launch.

Never use the development seed catalog as real product inventory and never commit real secrets or customer data.

## Troubleshooting

- `P1001` / database connection failure: check MySQL is running and that `DATABASE_URL` host, port, database, and credentials match your local setup.
- Prisma `EPERM` on Windows: stop all backend/Node processes using this workspace, then run `npm run prisma:generate` again.
- CORS failure: `CLIENT_ORIGIN` must exactly match the browser's storefront origin, including scheme and port.
- Admin login fails: verify that an active administrator exists, use `/admin/login`, and reset its password with the hidden-input command if needed.
- Product pages are empty: run `npm run prisma:seed` in development and confirm the backend health response reports `database: "ok"`.
