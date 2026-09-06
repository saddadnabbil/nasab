# Production deployment

Canonical production hostname: `https://nasab.saddadnabbil.my.id`.

## 1. GitHub and Vercel

1. Import `saddadnabbil/nasab` into Vercel and keep `main` as the production branch.
2. Use Node.js 22 and the repository build command `npm run build`.
3. Do not set a custom output directory. Nitro emits the Vercel Build Output API bundle under `.vercel/output`.
4. Provision a production PostgreSQL/Neon database and set `DATABASE_URL` for Production and Preview.
5. Add all server variables through Vercel Project Settings. Never prefix secrets with `VITE_`.

Required production variables:

| Variable                  | Production value/purpose                                                  |
| ------------------------- | ------------------------------------------------------------------------- |
| `VITE_AUTH_ENABLED`       | `true`                                                                    |
| `BETTER_AUTH_URL`         | `https://nasab.saddadnabbil.my.id`                                        |
| `BETTER_AUTH_SECRET`      | A unique random secret of at least 32 bytes                               |
| `DATABASE_URL`            | Production PostgreSQL connection string                                   |
| `GROK_AUTH_ISSUER`        | The deployed broker issuer, currently `https://auth.grok.me`              |
| `GROK_AUTH_CLIENT_ID`     | Per-app client registered for Nasab in the broker                         |
| `GROK_AUTH_CLIENT_SECRET` | Matching server-only broker client secret                                 |
| `RESEND_API_KEY`          | Server-only key for account email when password reset delivery is enabled |

Do not reuse preview credentials or secrets from another application. Preview deployments should use a separate database and callback registration where supported.

## 2. Domain

Add `nasab.saddadnabbil.my.id` to the Vercel project before changing DNS. Inspect the domain in Vercel and use the exact record it requests. For a subdomain, Vercel normally provides a CNAME target such as `cname.vercel-dns-0.com`.

At the current Cloudflare DNS zone:

- Type: `CNAME`
- Name: `nasab`
- Target: the value shown by Vercel's domain inspector
- Proxy: DNS only until Vercel verifies ownership and issues TLS; proxying can be enabled later only if HTTPS and auth redirects are retested

After DNS resolves, make the custom hostname the Vercel project's primary production domain. Avoid using the generated `*.vercel.app` hostname for OAuth tests because cookies and callback origins must match the canonical host.

## 3. Google OAuth through the broker

Nasab does not send users directly to Google. Its Better Auth instance is an OAuth client of the shared broker, and the broker owns the upstream Google client. This produces two distinct callback registrations:

1. Register this exact Nasab callback in the broker client:

   `https://nasab.saddadnabbil.my.id/api/auth/callback/grok-google`

2. In Google Cloud, register the broker's Google callback—not the Nasab callback. Use the exact redirect URI emitted by the broker's Google authorization request. A redirect URI must match exactly, including scheme, host, path, and trailing slash behavior.

Configure Google Auth Platform branding with:

- App name: `Nasab`
- App homepage: `https://nasab.saddadnabbil.my.id`
- Privacy policy: `https://nasab.saddadnabbil.my.id/privacy`
- Terms: `https://nasab.saddadnabbil.my.id/terms`
- Authorized domain: `saddadnabbil.my.id`
- Scopes: `openid`, `email`, and `profile` only

The consent screen's app name and logo must represent Nasab. If it still displays another product name, the wrong Google Cloud OAuth client is configured at the broker. Create or select a Nasab-branded production OAuth client and update the broker's Google credentials; do not patch the frontend label.

## 4. OAuth smoke test

Use a private browser window on the canonical domain:

1. Open `/login` and choose Google once.
2. Confirm the first click immediately navigates to the broker/Google flow.
3. Confirm the consent screen says Nasab and requests only basic identity scopes.
4. Complete login and confirm the browser returns to `/app` on the canonical domain.
5. Reload; the session must remain active without a light-theme flash.
6. Sign out; protected cloud data must no longer be returned.

Typical failures:

| Error                                         | Check                                                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `Invalid origin`                              | `BETTER_AUTH_URL` must exactly equal the canonical HTTPS origin.                                            |
| `redirect_uri_mismatch` at the broker         | Register Nasab's `/api/auth/callback/grok-google` callback in the broker client.                            |
| `redirect_uri_mismatch` at Google             | Register the broker's exact upstream Google callback in Google Cloud.                                       |
| Wrong app name/logo                           | Replace the broker's upstream Google OAuth client with the Nasab-branded client.                            |
| Works on `vercel.app`, fails on custom domain | Stop mixing origins; make the custom hostname canonical and update `BETTER_AUTH_URL` plus broker callbacks. |

## 5. Release and operations

Every push and pull request runs CI and secret scanning. Tags matching `v*` run the full release gate and create a GitHub Release. Production deploys from `main`; retain the prior Vercel deployment for immediate rollback.
