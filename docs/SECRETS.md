# Secrets and credential rotation

Never commit credentials, upload `.env` files, or paste secret values into chat, issues, logs, or support requests. Keep production credentials in the hosting platform's secret manager and grant access only to the people and services that need it.

## If a credential may have been exposed

Treat it as compromised even if there is no evidence of use:

1. Revoke or rotate it at the service that issued it. Do not send the old or replacement value to anyone.
2. Update the deployment secret and restart/redeploy affected services.
3. Check provider and application audit logs for unexpected use.
4. Remove the value from the working tree and, if it was committed, coordinate a history rewrite with repository owners. Revocation is still required because removing a file does not invalidate a credential.

## Credentials to protect

- **SMTP:** rotate `SMTP_PASS` at the mail provider. For Gmail, use a dedicated Google App Password with two-step verification enabled; do not use the account's normal password. Keep the sender account limited to application mail.
- **Sessions:** set `SESSION_SECRET` to at least 48 cryptographically random bytes. Generate it locally, for example with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`. Replacing it invalidates existing sessions, so plan for customers and staff to sign in again.
- **MySQL:** use a dedicated application account, not `root`. Grant only the privileges needed by the running app (normally `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on this database). Use a separate, controlled migration account for schema changes that require DDL privileges, and do not give either account global privileges.
- **Google OAuth:** if a client secret or configuration that should be private was exposed, rotate it in Google Cloud Console, update the deployment secret, and verify authorized origins and redirect URIs. Browser client IDs are public identifiers, not passwords, but still keep their configuration restricted to approved origins.
- **Other provider tokens:** rotate any exposed object-storage, Redis, Sentry, messaging, or deployment token with its issuer; use narrowly scoped tokens and avoid reusing credentials across environments.

## Local environment files

Use `backend/.env.example` as the variable-name reference and keep real values in an untracked `backend/.env`. The same rule applies to any local `.env.*` file. Do not replace example placeholders with real credentials. Before sharing diagnostics, redact connection strings, passwords, tokens, private keys, and personal data.

## Secret scanning

After installing the root tools package in a Git checkout, the Husky pre-commit hook runs Gitleaks against staged changes. Install Gitleaks locally and ensure `gitleaks` is available on `PATH`; commits fail closed if it is missing. The GitHub Actions workflow also scans pushes and pull requests. A scan is a detection layer, not a substitute for rotating a credential that was exposed.
