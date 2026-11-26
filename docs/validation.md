# Restoration validation — 26 November 2026

Restored production hosting, localized SSR and CI/CD are committed in `b7010fd`,
`a0076e2` and `b863561`. Content data and translation wording were left unchanged.
The English UI catalog was wrapped in Angular's standard locale/translations
structure to support compiled locale bundles.

## Completed locally

- Backend: 48 tests passed; frontend: 70 tests passed.
- Deployment/certificate regression tests: 8 passed. Deployment failure and rollback
  tests use a fake Docker transport to verify release transitions and commands.
- Production SSR compilation and client-side development compilation passed.
- Backend, Nginx and SSR production images built successfully, in sequence, with
  `--jobs=1`. Podman graph/run roots, build contexts, npm cache and dependencies
  were placed under `/tmp/portfolio-restore`; the workspace image store was unused.
- All three real containers passed their health checks. Non-root UIDs were 1000
  (backend/SSR) and 101 (Nginx); the SSR root filesystem was read-only.
- HTTPS on 9042 and plain HTTP redirecting on that same port passed with public
  certificate verification. Redirects preserved paths, port and query parameters.
- Smoke checks passed for all twelve localized pages, real API content, browser
  assets, mixed concurrent French/English requests and HTTP 404s.
- Chromium verified readable content without JavaScript, SSR DOM reuse, no duplicate
  initial journey API request, both locales, client navigation, menus and filters.
- SSR fallbacks passed with the API offline. Untrusted Host headers were rejected.
- Nginx recovered after the test backend changed IP, without restarting the proxy;
  the complete smoke check passed again.
- ShellCheck, actionlint, content/fallback equality and whitespace checks passed.

The frontend unit suite retains its existing jsdom IntersectionObserver warnings;
real Chromium hydration/interaction checks completed without application errors.
Isolated Podman health checks were run explicitly because this temporary store did
not receive automatic health-check scheduling from the desktop's default store.

## External steps

Local container verification used amd64. The workflow also builds and verifies
arm64 on GitHub runners. Remote workflow execution, registry publication and SSH
deployment require pushing the commits and configuring the GitHub/server settings
in [the production runbook](production.md). No production deployment was performed.
