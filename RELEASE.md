# Nasab Release Guide

## Release gate

Run from a clean checkout:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

With the app running, execute the cross-platform browser gate in another terminal:

```bash
npm run test:browser
```

Verify the landing page, local tree creation, editor tour, JSON export/import, account sign-in/out, cloud save, and cloud delete confirmation at desktop and mobile widths.

## Versioning

Nasab uses semantic version tags:

- `v0.x.y` while the product is pre-1.0.
- Patch: fixes and polish without changing stored data.
- Minor: new user-facing capability or backward-compatible schema change.
- Major: breaking storage, API, or migration behavior.

Create releases only from a clean `main` branch after CI succeeds:

```bash
npm version patch
git push origin main --follow-tags
```

The release workflow validates the tagged commit and publishes generated release notes on GitHub. A tag pushed from `main` also receives its own immutable Vercel deployment through the Git integration.

## Production verification

1. Confirm the custom domain serves the tagged commit over HTTPS.
2. Check `/`, `/app`, `/login`, `/privacy`, and `/terms` on mobile and desktop.
3. Test Google sign-in with a fresh private browser window.
4. Test email sign-up/sign-in and sign-out.
5. Save a local tree to the account, reload, reopen it, then delete it.
6. Confirm browser console and network requests contain no unexpected errors.

## Rollback

Promote the previous known-good Vercel deployment. Database rollback is safe only when migrations remain backward compatible; use additive migrations and never edit an applied migration.
