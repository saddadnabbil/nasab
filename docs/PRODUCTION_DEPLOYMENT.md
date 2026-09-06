# Production deployment — Cloudflare Workers

Canonical production URL: `https://nasab.saddadnabbil.my.id`

Nasab deploys as a full-stack TanStack Start Worker. Nitro builds the Worker and static assets; Wrangler publishes them and attaches the custom domain. PostgreSQL remains a managed external database.

## 1. One-time Cloudflare setup

1. In Cloudflare, create an API token with **Workers Scripts: Edit** and **Workers Routes: Edit** for the account/zone that owns `saddadnabbil.my.id`.
2. In GitHub repository settings, create the `production` environment.
3. Add these GitHub environment secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `RESEND_API_KEY`
4. Generate a new, unique `BETTER_AUTH_SECRET` of at least 32 random bytes. Never reuse local or preview credentials.
5. Run **Deploy Cloudflare** manually once. Future published GitHub releases deploy automatically.

`wrangler.jsonc` owns the Worker name, compatibility flags, observability, and custom domain. Because this is a Cloudflare Custom Domain, Wrangler creates the required DNS record and TLS certificate; do not create a competing CNAME first.

## 2. Runtime configuration

The deployment workflow writes these non-secret variables to the Worker:

| Variable | Production value |
| --- | --- |
| `VITE_AUTH_ENABLED` | `true` |
| `BETTER_AUTH_URL` | `https://nasab.saddadnabbil.my.id` |

The remaining values are uploaded as encrypted Worker secrets by the Cloudflare action. `DATABASE_URL` must use TLS. For higher database traffic, put the same database behind Cloudflare Hyperdrive and update the connection string after testing.

## 3. Google OAuth production setup

Nasab connects directly to Google through Better Auth. Register this exact redirect URI on the Google Web application client:

```text
https://nasab.saddadnabbil.my.id/api/auth/oauth2/callback/google
```

Use the dedicated `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for Nasab production. Do not reuse Timesmith or another app's credentials.

### Google Cloud OAuth client

In Google Cloud Console:

1. Set the app name to **Nasab** and upload Nasab's logo.
2. Set the homepage to `https://nasab.saddadnabbil.my.id`.
3. Set the privacy policy to `https://nasab.saddadnabbil.my.id/privacy`.
4. Set the terms page to `https://nasab.saddadnabbil.my.id/terms`.
5. Add `saddadnabbil.my.id` as an authorized domain.
6. Add the exact Nasab callback above under **Authorized redirect URIs**.
7. While the consent screen is in Testing, add the reviewer accounts as test users. Publish/verify the app before public portfolio traffic if Google requires it.

Google redirect URIs are exact matches: scheme, hostname, path, port, and trailing slash all matter.

## 4. Release and deploy

```bash
npm ci
npm run typecheck
npm test
npm run build
git tag -a v0.1.1 -m "Nasab v0.1.1"
git push origin v0.1.1
```

The tag runs the full release gate and creates a GitHub Release. Publishing that release triggers `.github/workflows/deploy-cloudflare.yml`. The deployment first applies migrations, then uploads Worker configuration and secrets, and finally deploys the immutable tagged source.

## 5. Production acceptance

- `/`, `/login`, `/app`, `/privacy`, and `/terms` return successfully.
- Light/dark theme does not flash during first paint.
- Email sign-up, sign-in, forgot-password, reset link, and sign-out work.
- Google consent says **Nasab**, returns to the canonical domain, and creates the expected user session on the first click.
- Local trees still open without login; authenticated sync is scoped to the current user.
- Desktop and mobile have no horizontal overflow or uncaught console errors.
- Resend uses a verified sender on the production domain.

## 6. Rollback

Use Workers & Pages → Nasab → Deployments to roll traffic back to the previous Worker version. Only roll application code backward when database migrations are backward compatible; migrations should remain additive until the old version is retired.

## Common failures

| Symptom | Check |
| --- | --- |
| `redirect_uri_mismatch` | Compare Nasab's `/api/auth/oauth2/callback/google` URI character-for-character with Google Cloud. |
| Consent screen names another app | Create/select the OAuth consent brand owned by the Nasab Google Cloud project. |
| Callback returns `Invalid origin` | Confirm `BETTER_AUTH_URL`, Google callback, and browser origin all use the canonical HTTPS domain. |
| Worker deploy rejects secrets | Add every required value to the GitHub `production` environment and rerun the workflow. |
| Database connection fails | Require TLS and validate the provider supports connections from Cloudflare Workers; use Hyperdrive when appropriate. |
