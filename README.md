# Full Stack Portfolio

An Angular portfolio based on the supplied Figma PNG export, with a separate
NestJS API and Docker Compose for local development.

See [the UML diagrams](docs/uml.md) for backend/frontend classes, content
contracts, request sequences, loading states, and the production deployment.

Versions verified on 2026-11-24:

| Dependency | Exact version |
| --- | --- |
| Angular and Angular CLI | 22.3.0 |
| NestJS framework | 12.6.0 |
| Nest CLI (separate release cycle) | 12.0.15 |
| TypeScript | 6.0.3 (compatible with Angular 22) |
| Node.js | 26.13.1 (`node:26.13.1-bookworm-slim`) |

Sources: [Angular](https://registry.npmjs.org/@angular/core/latest),
[Angular CLI](https://registry.npmjs.org/@angular/cli/latest),
[NestJS](https://registry.npmjs.org/@nestjs/core/latest),
[Nest CLI](https://registry.npmjs.org/@nestjs/cli/latest),
[Angular compatibility](https://angular.dev/reference/versions), and the
[Node release index](https://nodejs.org/dist/index.json).

## Node version

Both Dockerfiles pin `node:26.13.1-bookworm-slim`, the approved stable release.
Node 26.14.0 is not published at verification time.

Framework packages are pinned in their respective `package.json` and
`package-lock.json` files and installed with `npm ci`.

## Run

For production on Debian 13, Nginx HTTPS on port **9042**, certificates and
deployment/rollback instructions, see [the production runbook](docs/production.md).
Production uses separate Dockerfiles and standalone `compose.production.yaml`.

Use the Makefile to build, start in the background, and stop the stack:

```sh
make build
make up
make down
```

The Compose command can be overridden, for example `make build COMPOSE=podman-compose`.
The Makefile detects Podman, including the `docker` compatibility wrapper, and
adds `compose.podman.yaml`. This maps your host UID/GID to the containers' `node`
user so it can read bind-mounted files on rootless Podman, including NFS mounts.
Run `make down && make up` once to recreate containers started without this mapping.

With Docker Engine, you can also run Compose directly:

```sh
docker compose config
docker compose up --build
```

When using Podman directly, include the override:

```sh
podman-compose -f compose.yaml -f compose.podman.yaml up -d --build
```

Frontend: <http://localhost:4200>. Backend: <http://localhost:3000>, returning
`{"status":"ok"}`. Both services support live reload and run as the non-root
`node` user. Source and configuration files are mounted from the host. Dependencies,
caches, and build output stay inside the containers. These are development images.

```sh
docker compose down
```

After changing a package manifest and its lockfile, rebuild that service. For
example:

```sh
docker compose up -d --build angular
```

## Validation

Both Docker images build successfully, and both starter apps compile inside
their Node 26.13.1 containers. Compose parsing and lockfile consistency were
verified. The backend's HTTP 200 JSON response was also checked on the host.

Full Compose startup through `make down && make up` was verified with rootless
Podman and the UID/GID mapping override. Both applications compiled successfully;
the frontend returned HTTP 200 and the backend returned `{"status":"ok"}`.

## Angular portfolio

The six screens are available in French and English:

| Page | Français | English |
| --- | --- | --- |
| Home | `/fr` | `/en` |
| Journey | `/fr/parcours` | `/en/journey` |
| Projects | `/fr/projets` | `/en/projects` |
| Skills | `/fr/competences` | `/en/skills` |
| Contact | `/fr/contact` | `/en/contact` |
| About | `/fr/a-propos` | `/en/about` |

`/` and the previous unprefixed French URLs redirect to their `/fr` equivalents.
Invalid URLs display a centered light-blue 404, preserving the requested URL.
The FR/EN links switch to the equivalent page, preserving query parameters,
selected projects, and translated resume/case-study anchors. They reload the page
to load the matching localized application and its server-rendered HTML.

Each route loads a separate JavaScript chunk. The
home-page project collection, technical skills and document panel render on the
server and hydrate when entering the viewport. The GitHub language chart loads
in the browser on viewport entry. Skeletons cover both lazy
code loading and HTTP requests; failed requests have retry controls. Projects
support category filtering, pagination, empty states, and selectable case studies.
The project contract is defined in `frontend/src/app/core/project.contract.ts`.
Projects use a `categories` list and may appear in several filters; both
ft_transcendance and the completed 42matcha project belong to Fullstack, Back-end,
Front-web, and DevOps. Projects using Docker belong in the DevOps category.

Journey timeline cards, their detail paragraphs, and expanded experience/education
sections are rendered from one `JourneyEntry[]` list, defined in
`frontend/src/app/core/journey.contract.ts`. The page requests
`GET /parcours?locale=fr|en` first, then uses `frontend/public/data/journey.<language>.json`
only if the API request fails. The list order controls the timeline and numbering;
the layout adapts to the number of entries. See [docs/endpoints.md](docs/endpoints.md)
for the complete interface and an example response.

Projects on Accueil and Projets are requested from the API through
`PortfolioRepository`. Each filter has its own endpoint. Only a failed API request
(including a timeout) loads sample projects from
`frontend/public/data/projects.<language>.json`, filtered to the selected category. A
successful empty response displays an empty state. Successful API responses are
shared between consumers; sample data does not replace the API in the cache, so
returning to a failed filter retries its API request. Skills and document metadata
also use the API by default; explicit fixture mode remains available for those two
resources in `PORTFOLIO_CONFIG`.
The templates use `@for` loops with stable IDs; records are not hardcoded in templates.
Your GitHub and LinkedIn URLs are configured in
`frontend/src/app/core/portfolio.config.ts`.

### NestJS API contract

The project, journey, contact form, and GitHub statistics contracts, payloads, validation,
proxy routing, and error handling are documented in [docs/endpoints.md](docs/endpoints.md).

Keep the repository adapter as the boundary when designing the backend. Its
contract is below; NestJS implements all of these routes as well as
`POST /contact-form`. The project catalog includes the 14 supplied GitHub repositories,
with source links, categories, technologies and short French/English descriptions
based on repository inspection. See the [catalog](docs/endpoints.md#current-project-catalog)
for the concepts and current implementation status. Journey retains the existing
French/English portfolio content. Skills retain unfilled ratings, and document
metadata stays `null` until files are supplied. Contact delivery needs a configured
receiver before submissions can succeed. See
[Information needed from you](docs/endpoints.md#information-needed-from-you)
for the full content and configuration checklist.

| GET endpoint | Response |
| --- | --- |
| `/projets?locale=fr` | `Project[]` (all projects) |
| `/projets/fullstack?locale=fr` | `Project[]` |
| `/projets/relative-low-level?locale=fr` | `Project[]` |
| `/projets/low-level?locale=fr` | `Project[]` |
| `/projets/backend?locale=fr` | `Project[]` |
| `/projets/frontend?locale=fr` | `Project[]` |
| `/projets/devops?locale=fr` | `Project[]` |
| `/projets/ai?locale=fr` | `Project[]` |
| `/parcours?locale=fr` | `JourneyEntry[]` |
| `/stats/github` | `GithubStats` |
| `/stats/github/languages` | GitHub language bytes and percentages |
| `/skills?locale=fr` | `TechnicalSkill[]` |
| `/documents?locale=fr` | `PortfolioDocuments` |
| `/documents/files/fr/resume.pdf` | File stream, if supplied |

Types live in `frontend/src/app/core/portfolio.models.ts`. Project, journey, skill, and
document content is localized by the server; the client supplies its active locale.
Shared requests are cached for the current application session. Failed requests
can be retried, in-flight subscriptions are cancelled on component destruction,
and requests time out after 15 seconds.

The development proxy forwards `/api/**` to `http://nestjs:3000` inside Compose,
or `http://127.0.0.1:3000` outside Docker. Override `PORTFOLIO_API_TARGET` to change
that target. Browser requests use `/api/projets`, `/api/projets/<category>`, `/api/parcours`,
`/api/contact-form`, `/api/skills`, `/api/documents` (including downloads), and
`/api/stats/github`; the proxy removes `/api` from these
paths before forwarding to NestJS. This keeps the Angular `/projets` page accessible. Production
hosting should apply the same proxy routing and project path rewrite.

Document metadata comes from the same data adapter, rather than compiled download
paths. An example response is:

```json
{
  "resumePdf": { "url": "/api/documents/files/fr/resume.pdf", "filename": "resume.fr.pdf" },
  "resumeDocx": null,
  "portfolioPdf": null
}
```

The API discovers `resume.pdf`, `resume.docx`, and `portfolio.pdf` placed in
`backend/documents/fr/` or `backend/documents/en/`. Compose mounts that directory
read-only, and these document files are ignored by Git. Missing files return
`null`; no documents are bundled today. The download endpoint streams the supplied
files and the UI enables downloads/preview from the returned metadata.

Edit `backend/src/content/data/{projects,journey,skills}.{fr,en}.json` to populate
the other content endpoints. They are read and validated on each request, and
copied to `dist/content/data` during builds. `PORTFOLIO_CONTENT_DIR` and
`PORTFOLIO_DOCUMENTS_DIR` optionally override the runtime content/document roots.
Keep the frontend project/journey fallback JSON in sync with later content edits.

The contact form validates its fields and posts to `/contact-form`. It shows a
spinner while submitting and an error on HTTP/network failure or a 15-second
timeout. The backend also validates and trims fields, then forwards the four-field
JSON body to `CONTACT_WEBHOOK_URL`, with optional `CONTACT_WEBHOOK_TOKEN` bearer
authentication. Set these backend-only values in the exported environment or local
ignored `.env`, then recreate the NestJS container. The receiver must accept the
documented JSON contract. Success returns 204; an unconfigured or failed receiver
returns 503. No messages are stored locally or retried automatically. LinkedIn
is also available for direct contact. The development-environment chart loads
real language percentages from `/stats/github/languages` when it enters the viewport.
GitHub activity requests `/stats/github`, displays returned statistics on success,
and shows `Offline` on failure or a 15-second timeout. Unfilled skill ratings remain
`null`, distinct from a rating of zero.

The GitHub backend reads the repository selection directly from
[`ErwanLucienMMV/config/languages.json`](https://github.com/ErwanLucienMMV/ErwanLucienMMV/blob/main/config/languages.json),
following the README automation's inclusion/exclusion and fork/archive rules.
`/stats/github` reports the selected public repository count, authored commits
on those default branches in the past 365 days, and leading languages by code
bytes. `/stats/github/languages` adds byte counts and percentages using the
README's rounding rules. Both endpoints share a six-hour cache and return 503
if GitHub cannot supply a complete fresh snapshot. The Angular summary consumes
the first endpoint and the development-environment chart consumes the language
endpoint. The chart shows visible percentages, an empty state when no languages
are returned, and `Offline` with retry on failure; it has no sample-data fallback.
See [the endpoint documentation](docs/endpoints.md#github-activity-statistics)
for exact scope and error behavior.

Optional `GITHUB_TOKEN` is read only by the backend. Set it in your local ignored
`.env` before starting Compose to increase GitHub's API rate limit; then recreate
the NestJS container. Public requests also work without a token, within the shared
IP rate limit. No credential is embedded in the repository or sent to Angular.
The coding assistant's GitHub connection does not configure runtime credentials.

Run the backend build and offline tests with:

```sh
cd backend
npm test
```

Tests cover selection rules, byte distribution, commit pagination and time range,
shared caching, GitHub errors/timeouts, every localized content route and category,
missing/invalid content, document discovery/downloads, and contact validation and
delivery. GitHub and contact receivers are mocked; HTTP route tests use temporary
local servers and document files.

### Translation and frontend checks

French is the source locale. UI copy uses Angular `i18n` markers and `$localize`,
with stable message IDs. The extracted XLIFF 2 source catalog is
`frontend/src/locale/messages.xlf`; English translations live in
`frontend/src/locale/messages.en.json`, in its `translations` object (standard
Angular JSON format with `locale: "en"`). Translation placeholders use Angular's
`{$PLACEHOLDER_NAME}` format and must be preserved.

Development detects `/fr` or `/en` before bootstrap and loads translations at
runtime; both languages work with one `ng serve`. Production builds separate
French/English browser and server bundles using AngularNodeAppEngine and
RenderMode.Server. Pages include localized metadata, API content and hydration
state. Hydration reuses the DOM and HTTP responses. Unknown routes return HTTP
404 with the existing screen. GitHub statistics load after browser rendering.

```sh
cd frontend
npm test
npm run build
npm run i18n:extract
```

To preview SSR outside Docker, start the backend on port 3000, build the frontend,
then run `PORTFOLIO_ASSET_DIR="$PWD/dist/portfolio/browser" npm run serve:ssr` in
`frontend/`. It listens on port 4000; `PORTFOLIO_API_TARGET` overrides the API URL.
`ng serve` remains a client-side development server with hot reload. Browser checks
against a running production stack use `npx playwright install chromium` then
`npm run test:ssr`; `BASE_URL` overrides `https://localhost:9042`.

After changing UI text, extract the source catalog and update the English JSON
entries with the same IDs. English projects, journey entries, skills, and document metadata are
provided in `frontend/public/data/*.en.json`. API content requests receive the
active locale in `?locale=fr` or `?locale=en`; backend endpoint names remain stable.
French assets resolve from `/`; English assets resolve from `/en/`. APP_BASE_HREF
keeps router paths rooted at `/`, avoiding duplicate prefixes. Production Nginx
serves static assets and proxies pages to Angular SSR, retaining the separate API
proxy rules documented above. Inter is
self-hosted, and its license is included in `frontend/public/fonts/LICENSE.txt`.

Unit checks cover HTTP caching/locale/retry, loading and cancellation, project
filters/pagination, missing versus zero ratings, and document metadata/preview
handling. The interface also supports a mobile navigation menu, keyboard focus,
screen-reader loading announcements, and reduced-motion preferences.
