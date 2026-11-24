# API endpoints

These contracts are consumed by the Angular frontend. All endpoints below are
implemented in NestJS. The project catalog contains the 14 supplied repositories,
with French and English descriptions based on their concepts and source trees.
Journey and skills retain the existing portfolio content; missing documents remain
`null`. Contact delivery requires the destination configuration described below.

See [Information needed from you](#information-needed-from-you) for the content
and configuration still needed to complete your portfolio.

## Routing

The browser uses `/api` to separate HTTP API requests from Angular page routes.
The development proxy targets `http://nestjs:3000` in Compose, or
`http://127.0.0.1:3000` outside containers. Configure another target with
`PORTFOLIO_API_TARGET`.

For the endpoints documented here, the proxy removes `/api` before forwarding:

| Browser request | NestJS endpoint |
| --- | --- |
| `GET /api/projets` | `GET /projets` |
| `GET /api/projets/<category>` | `GET /projets/<category>` |
| `GET /api/parcours` | `GET /parcours` |
| `GET /api/skills` | `GET /skills` |
| `GET /api/documents` | `GET /documents` |
| `GET /api/documents/files/<locale>/<name>` | `GET /documents/files/<locale>/<name>` |
| `POST /api/contact-form` | `POST /contact-form` |
| `GET /api/stats/github` | `GET /stats/github` |
| `GET /api/stats/github/languages` | `GET /stats/github/languages` |

Query parameters are preserved. Production hosting must provide the same proxy
routing. The frontend API prefix is configured by `apiBaseUrl` in
`frontend/src/app/core/portfolio.config.ts`.

The `/fr` and `/en` prefixes are for Angular pages, for example `/fr/projets` and
`/en/projects`. They are not added to backend endpoints: both pages request
`/api/projets`, with `locale=fr` or `locale=en` respectively. Project fallback data
uses the matching `projects.fr.json` or `projects.en.json` file. Interface labels,
loading messages, form validation, and errors are translated into the page language.

### Locales and editable content

The content endpoints accept `locale=fr` and `locale=en`. The default is `fr`.
Regional variants such as `fr-FR` or `en-GB` use their base language;
matching is case-insensitive. Unsupported, empty, or repeated locale parameters
return `400 Bad Request`; content is never silently translated to another language.
GitHub statistics do not depend on locale.

Backend content lives in `backend/src/content/data/`:

| Files | Used by |
| --- | --- |
| `projects.fr.json`, `projects.en.json` | `/projets` and every project category |
| `journey.fr.json`, `journey.en.json` | `/parcours` |
| `skills.fr.json`, `skills.en.json` | `/skills` |

These files are the API's content source and were initially copied from the existing
frontend fixtures. Edit the backend files to populate the API. Keep the frontend
project/journey fallback files in sync when changing that content. There is no
database, CMS, or public write endpoint. Nest copies the JSON into `dist/content/data`
during builds. An optional `PORTFOLIO_CONTENT_DIR` can point to an external directory
with the same filenames; Compose reads the mounted source directory directly.

The server reads and validates content on each request. Changes are visible on
the next server request without a backend restart; Angular keeps successful
responses for its current application session, so reload the page to fetch edits.
Invalid/missing JSON, duplicate IDs within a list, or invalid required fields return
`503` with `Portfolio content is temporarily unavailable`. An intentional empty
array is valid. Internal paths and file contents are not included in errors.

## Projects

| Method | NestJS endpoint | Filter |
| --- | --- | --- |
| GET | `/projets` | Tous |
| GET | `/projets/fullstack` | Fullstack |
| GET | `/projets/relative-low-level` | Bas niveau relatif |
| GET | `/projets/low-level` | Bas niveau |
| GET | `/projets/backend` | Back-end |
| GET | `/projets/frontend` | Front-web |
| GET | `/projets/devops` | Dev Ops |
| GET | `/projets/ai` | IA |

All requests include a `locale` query parameter, for example
`GET /projets/fullstack?locale=fr`. Return localized content as a JSON array of
`Project` objects. The TypeScript contract is defined in
`frontend/src/app/core/project.contract.ts` and re-exported by `portfolio.models.ts`.
`ProjectCaseStudy` follows the existing ft_transcendance presentation:

```json
[
  {
    "id": "ft-transcendance",
    "name": "ft_transcendance",
    "repositoryUrl": "https://github.com/ErwanLucienMMV/ft_transcendance",
    "categories": ["fullstack", "backend", "frontend", "devops"],
    "description": "Plateforme d’échecs, parties en temps réel, REST et microservices.",
    "type": "school",
    "technologies": ["Angular", "NestJS", "Docker"],
    "featured": true,
    "caseStudy": {
      "summary": "Reproduire l’expérience d’une plateforme de jeu d’échecs multijoueur.",
      "architecture": ["Angular → NestJS API", "PostgreSQL / chess-engine / Forgemail", "Prometheus / Grafana / Backups"],
      "contributions": ["Infrastructure Docker & Nginx", "API REST, parties, matchmaking & puzzles", "WebSockets, sauvegardes & monitoring"]
    }
  }
]
```

Required fields are `id`, `name`, `categories`, `description`, `type`, and
`technologies`. `categories` is a list of category slugs from the seven filters
above; use `categories` instead of the previous singular `category` property.
For example, both ft_transcendance and the completed 42matcha project belong to
`["fullstack", "backend", "frontend", "devops"]`. Projects using Docker or
containerization must include `devops`. Categories are explicit in the API and
fallback data; filter membership is based on this list. `type` is
`school`, `personal`, or `professional`. Optional fields are `repositoryUrl` (the
source repository link, even without a case study), `featured`, `image`
(`url`, `alt`, `width`, `height`), and `caseStudy`. When `caseStudy` is provided,
`summary`, `architecture`, and `contributions` are required; `repositoryUrl`,
`diagramUrl`, and `reflection` are optional. See `ProjectImage` and
`ProjectCaseStudy` in the contract for their types. The Accueil preview selects
featured projects; the frontend paginates
the returned list in groups of three.

Return `200` with `[]` for a successful request with no projects. A filtered endpoint
returns projects whose `categories` list contains that slug, for example
`project.categories.includes('backend')` for `/projets/backend`. A project can
therefore appear in several filtered lists, once per list. The fixture fallback
uses the same membership rule.

The frontend displays loading skeletons while waiting. Only an HTTP error, network
error, invalid JSON response, or a 15-second timeout triggers the fallback in
`frontend/public/data/projects.<language>.json`, filtered to the selected category.
A successful empty array does not trigger sample data. If the fallback also fails,
an error and retry button appear. Successful API responses are cached for the
application session; API errors are not cached as successful fallback responses.

### Current project catalog

`GET /projets?locale=fr` and `GET /projets?locale=en` return **14 projects**, one
per supplied repository link, in the supplied order. Each entry has a stable ID,
the repository URL, a localized short description, technologies, and categories.
The frontend fallback files contain the same catalog. Existing featured flags
and the ft_transcendance case study are preserved.

The concepts and stacks below were checked against repository READMEs,
documentation, dependency manifests and source trees on 24 November 2026.
Categories are editorial classifications of those concepts; they do not certify
completion. Docker projects belong to `devops`; Camagru's category and stack
describe its documented target, with its planning status explicit in the description.

| Repository / source | Concept | Categories |
| --- | --- | --- |
| [AtlasDominion](https://github.com/ErwanLucienMMV/AtlasDominion) | Discord control of Docker game servers, monitoring and backups | `backend`, `devops` |
| [ft_irc](https://github.com/ErwanLucienMMV/ft_irc) | C++98 multi-client IRC server with channels and private messages | `relative-low-level`, `backend` |
| [ft_transcendance](https://github.com/ErwanLucienMMV/ft_transcendance) | Real-time online chess, matchmaking, puzzles and messaging | `fullstack`, `backend`, `frontend`, `devops` |
| [Inception](https://github.com/ErwanLucienMMV/Inception) | Containerized NGINX/TLS, WordPress/PHP-FPM and MariaDB infrastructure | `devops` |
| [my_philosopher](https://github.com/ErwanLucienMMV/my_philosopher) | C threading and mutex synchronization through dining philosophers | `relative-low-level` |
| [mypushswap](https://github.com/ErwanLucienMMV/mypushswap) | Cost-optimized sorting with two stacks and restricted operations | `relative-low-level` |
| [minirt](https://github.com/ErwanLucienMMV/minirt) | C/MiniLibX ray tracing, lighting, shadows and reflections | `low-level` |
| [ft_minishell](https://github.com/ErwanLucienMMV/ft_minishell) | Bash-style shell, command parsing, pipes, redirections and signals | `relative-low-level` |
| [DrQuinn](https://github.com/ErwanLucienMMV/DrQuinn) | Self-reproducing programs in C, x86-64 assembly and Python | `low-level` |
| [Piscine-Django-42](https://github.com/ErwanLucienMMV/Piscine-Django-42) | Python/Django web exercises, SQL/ORM, sessions and WebSocket chat | `fullstack`, `backend`, `frontend` |
| [FullStackPortfolio](https://github.com/ErwanLucienMMV/FullStackPortfolio) | Bilingual Angular/NestJS portfolio and REST API | `fullstack`, `backend`, `frontend`, `devops` |
| [42matcha](https://github.com/ErwanLucienMMV/42matcha) | Angular/Spark Java dating app with discovery, matching and live messaging | `fullstack`, `backend`, `frontend`, `devops` |
| [42Learn2Slither](https://github.com/ErwanLucienMMV/42Learn2Slither) | Playable Snake environment for a future reinforcement-learning agent | `ai` |
| [42camagru](https://github.com/ErwanLucienMMV/42camagru) | PHP photo-compositing app planning and implementation guides | `fullstack`, `backend`, `frontend`, `devops` |

The Django repository has no root README; its SQL exercises and final AJAX/chat
README establish the concept. Matcha's architecture, matching and realtime docs
plus Maven/Angular manifests establish its stack. Learn2Slither currently has no
learning agent, training loop or trained model. Camagru currently contains guides
and a proposed stack, rather than an implemented application. Descriptions state
these limits explicitly. New personal contribution claims, screenshots and
completion dates were not inferred from the code.

This portfolio catalog is independent of the public-repository selection used by
the GitHub statistics endpoints. Adding a catalog entry does not alter the profile
automation's statistics configuration or a source repository's visibility.

## Journey / Parcours

`GET /parcours?locale=fr` (or `locale=en`)

The journey page requests `/api/parcours`; the proxy forwards to `/parcours` on
NestJS. Return `200 OK` with an ordered JSON array of `JourneyEntry` objects.
Both the timeline and the expanded experience/education content use this same list.

The contract is defined in `frontend/src/app/core/journey.contract.ts` and
re-exported by `portfolio.models.ts`:

```ts
type JourneyKind = 'experience' | 'education' | 'project' | 'goal';

interface JourneyHighlight {
  id: string;
  title: string;
  description: string;
  technologies: readonly string[];
}

interface JourneySection {
  title: string;
  description: string;
  highlights?: readonly JourneyHighlight[];
  topics?: readonly string[];
}

interface JourneyEntry {
  id: string;
  kind: JourneyKind;
  period: string;
  title: string;
  description: string;
  details: readonly string[];
  section?: JourneySection;
}
```

- `id`: stable, unique entry identifier, shared between French and English content.
- `kind`: determines the translated heading for an optional expanded section.
- `period`: localized display text, such as `2023 — 2024` or `À suivre`; no date parsing.
- `title`: organization, school, project, or milestone name.
- `description`: short role or summary displayed in the timeline card.
- `details`: list of additional paragraphs inside the card. An empty list is valid.
- `section`: optional expanded content below the timeline. `highlights` contains
  detailed cards, each with a stable unique `id`; `topics` contains training/topic
  labels. Both lists can be omitted or empty. `technologies` can also be empty.

All fields except those marked `?` are required. Localize display strings for the
requested locale; keep identifiers, `kind`, and technology names stable.
The response order controls the timeline, numbering, and expanded sections; the
frontend does not impose four cards or hardcode an employer or school.

Example response:

```json
[
  {
    "id": "hn-services",
    "kind": "experience",
    "period": "2023 — 2024",
    "title": "HN SERVICES",
    "description": "Ingénieur d’études et développement",
    "details": ["Angular, TypeScript, GraphQL · équipe de 5"],
    "section": {
      "title": "HN Services — Développement web",
      "description": "Septembre 2023 – Juillet 2024 · Développement en équipe",
      "highlights": [
        {
          "id": "forum-development",
          "title": "Développement de fonctionnalités Angular et TypeScript",
          "description": "Travail sur une application de forum avec GraphQL pour l’API, Angular 17 pour le front-end et NestJS, au sein d’une équipe de cinq personnes.",
          "technologies": ["Angular", "TypeScript", "NestJS", "Docker", "GraphQL"]
        }
      ]
    }
  }
]
```

Journey requests always try the API first, independently of the skills/documents
fixture setting. HTTP/network errors, invalid JSON, and a 15-second timeout load
`frontend/public/data/journey.fr.json` or `journey.en.json` as a fallback. These files
follow the same interface and hold the existing four milestones and their expanded
content. A successful empty array displays an empty state, without loading fallback
content. If both sources fail, the page displays an error and a retry button.
Successful API requests are cached; failed API responses do not permanently cache
the fallback. Navigating away cancels unfinished requests.

## Skills

`GET /skills?locale=fr` (browser URL `/api/skills?locale=fr`)

Returns `200 OK` with `TechnicalSkill[]`. The initial list contains C, C++, SQL,
Linux, Git, GDB, and Valgrind. Ratings and evidence are deliberately unfilled:

```json
[
  {
    "id": "c",
    "name": "C",
    "rating": null,
    "certifications": [],
    "contexts": []
  }
]
```

All fields are required. `rating` is a finite number from 0 through 10, or `null`
when you have not supplied an assessment. A real zero is distinct from `null`.
`certifications` and `contexts` are arrays of display strings; empty arrays are
valid. Localize descriptions in the French/English JSON while keeping IDs stable.
Add any further skills to those files once you decide which ones to display.
The response order is the display order. A successful empty list is valid.

Skills and document metadata now use the API by default. Explicitly setting
`PORTFOLIO_CONFIG.source` to `fixtures` still enables their old sample-data mode.
In API mode, failures show the existing error/retry UI without a fixture fallback.

## Documents and downloads

`GET /documents?locale=fr` (browser URL `/api/documents?locale=fr`)

Returns `200 OK` with `PortfolioDocuments`. All three keys are always present:

```json
{
  "resumePdf": {
    "url": "/api/documents/files/fr/resume.pdf",
    "filename": "resume.fr.pdf"
  },
  "resumeDocx": null,
  "portfolioPdf": null
}
```

The server discovers nonempty regular files with these exact names. There is no
public upload endpoint; supply the files on the server or through the host mount:

| Metadata key | French file | English file |
| --- | --- | --- |
| `resumePdf` | `backend/documents/fr/resume.pdf` | `backend/documents/en/resume.pdf` |
| `resumeDocx` | `backend/documents/fr/resume.docx` | `backend/documents/en/resume.docx` |
| `portfolioPdf` | `backend/documents/fr/portfolio.pdf` | `backend/documents/en/portfolio.pdf` |

No documents are bundled initially, so all keys return `null`. Missing, empty,
nonregular, and symlink files are unavailable. There is no cross-language file
fallback. If one document is intended for both languages, place a copy in both
directories. Permission or other storage errors return `503` with
`Documents are temporarily unavailable`.

`GET /documents/files/:locale/:name` streams a supported file or returns `404`.
The locale follows the same validation rules as the query parameter. Only
`resume.pdf`, `resume.docx`, and `portfolio.pdf` are accepted filenames. PDFs use
`application/pdf` with an inline disposition for the CV preview; DOCX uses the
Word MIME type with an attachment disposition. The localized download filename
is provided in metadata and `Content-Disposition`, such as `resume.en.docx`.
Metadata and download responses use `Cache-Control: no-store`; downloads also set
`X-Content-Type-Options: nosniff`. File contents must match their advertised formats;
the backend checks availability, not PDF/DOCX structure.

`PORTFOLIO_DOCUMENTS_DIR` overrides the document root. It defaults to `documents/`
relative to the backend working directory. Compose mounts `backend/documents/`
read-only at `/app/documents`, keeping files outside the image. PDFs/DOCX files in
this host directory are ignored by Git. Replacing a file is reflected on the next
request; reload Angular to refresh its cached metadata. Production must forward
`/api/documents/**` as well as `/api/documents`, since metadata URLs use that prefix.

## Contact form

`POST /contact-form`

Send a JSON body with these four required string fields:

```json
{
  "name": "Camille Dupont",
  "email": "camille@example.com",
  "subject": "Une opportunité",
  "message": "Bonjour, je souhaite échanger avec vous."
}
```

The frontend trims all fields before submission. Name, subject, and message must
contain at least one non-whitespace character. The email must match:

```regex
^[^\s@]+@[^\s@]+\.[^\s@]+$
```

This checks the address format; it does not verify that a mailbox exists. The
backend trims the fields and enforces this format. It rejects nonstring or missing
fields, whitespace-only values, unexpected keys, and control characters. Name,
email, and subject must be single-line values; message can contain line breaks.
Maximum trimmed lengths (JavaScript UTF-16 code units) are:

| Field | Maximum length |
| --- | --- |
| `name` | 120 |
| `email` | 254 |
| `subject` | 200 |
| `message` | 10,000 |

Send `Content-Type: application/json`; other media types return `415`. Invalid
fields or malformed JSON return `400`. Nest's default JSON body limit is 100 KB;
larger request bodies return `413`.

The implementation forwards the normalized four-field JSON body to a configured
HTTP receiver, then returns `204 No Content` only after that receiver responds with
a successful 2xx status. The frontend does not read a response payload. On success
it clears the form and displays `Votre message a bien été envoyé.`

Configure these backend-only environment variables:

| Variable | Meaning |
| --- | --- |
| `CONTACT_WEBHOOK_URL` | Required HTTPS URL of a receiver accepting the JSON above |
| `CONTACT_WEBHOOK_TOKEN` | Optional bearer token for that receiver |

Compose forwards these from an exported environment or local ignored `.env`.
Recreate the NestJS container after changing them. Plain HTTP is allowed only
for `localhost`, `127.0.0.1`, and `[::1]` development receivers. URL credentials,
fragments, and redirects are rejected. The receiver must accept this exact JSON
contract; arbitrary email-provider or chat APIs may need an adapter that translates
it into their format. No recipient is taken from the public request.

Without `CONTACT_WEBHOOK_URL`, valid submissions return `503` with
`Contact delivery is not configured`. A receiver error, invalid configuration, or
10-second transport timeout returns `503` with
`Contact delivery is temporarily unavailable`. Tokens, destination URLs, submitted
messages, and upstream response bodies are not included in errors or logged by
the contact service. The backend does not persist messages, queue them, or retry
delivery automatically. A receiver's 2xx means accepted for processing, not a
guarantee that an email has reached an inbox. If a timeout happens after the
receiver accepted a message, a visitor retry can produce a duplicate.

During submission the frontend shows a spinning circle and `Envoi en cours…`,
and disables the fields and submit button to prevent duplicate requests. On an
HTTP error, network failure, or no response within 15 seconds, it displays
`Une erreur s'est produite`, stops the spinner, preserves the entered text, and
allows another attempt. It does not automatically retry this POST or simulate a
successful send. Navigating away cancels the frontend request.

## GitHub activity statistics

`GET /stats/github`

The Projets page requests this endpoint through `/api/stats/github`, independently
of the project list. It always uses the API, even when skills and documents use
fixtures. There are no query parameters or request body.

Return `200 OK` with a JSON object matching `GithubStats` in
`frontend/src/app/core/portfolio.models.ts`:

```json
{
  "publicRepositories": 12,
  "contributions": 345,
  "mainLanguages": ["TypeScript", "C", "Java"]
}
```

All fields are required. The backend computes them from the public repositories
selected by the profile README automation:

- `publicRepositories`: number of eligible repositories in that selection, rather
  than every public repository on the account.
- `contributions`: sum of commits authored by `ErwanLucienMMV` on each selected
  repository's default branch, filtered by GitHub's `since` and `until` parameters
  over the rolling 365 days ending when the snapshot starts collecting activity.
  Merge commits are included when attributed to this author. This is a commit
  count per repository, not GitHub's contribution-calendar total: issues, reviews,
  pull requests, private activity, and commits outside these branches are excluded.
  A commit present in two selected repositories counts in each repository.
- `mainLanguages`: up to the configured `top_n` language names, sorted by summed
  GitHub Linguist bytes descending, with alphabetical tie-breaking. `Other` is
  not added as a synthetic language here.

The counts are non-negative integers. Zero counts and an empty language array are
valid responses. Commit pagination is counted using `per_page=1` and GitHub's
last-page link, so the count is not limited to the first page. The time filter
uses GitHub's commit timestamps, rather than the date a commit was pushed.

The section description is `Mes statistiques d'activites sur github`. While loading,
the frontend displays dashes for unavailable values and `…` for the connection
status. After a successful response it displays the returned statistics and `LIVE`.
The main-languages card shows at most three languages, one per compact line in a
fixed-height value area. Longer names are ellipsized and further languages are
omitted to preserve card spacing; the API still returns the full ordered list.
An HTTP error, network failure, invalid JSON response, or no response within
15 seconds displays `Offline`, with dashes instead of fabricated statistics. There
is no fixture fallback. Successful results are cached for the application session;
failed requests can be attempted again when the page is revisited. Navigating away
cancels any unfinished request.

### Language distribution

`GET /stats/github/languages` (browser URL `/api/stats/github/languages`)

Returns the language distribution for the same selection and cached snapshot:

```json
{
  "username": "ErwanLucienMMV",
  "repositories": ["AngularPortfolio", "AtlasDominion"],
  "totalBytes": 1000,
  "languages": [
    { "name": "TypeScript", "bytes": 700, "percentage": 70 },
    { "name": "C", "bytes": 250, "percentage": 25 },
    { "name": "Other", "bytes": 50, "percentage": 5 }
  ],
  "updatedAt": "2026-11-24T12:00:00.000Z"
}
```

This is an illustrative payload. `repositories` lists the eligible public names,
sorted case-insensitively. `totalBytes` sums all nonzero language byte counts.
`updatedAt` is the UTC snapshot completion time. Percentages use the README's
largest-remainder rounding to tenths of a percent and total 100.0 for nonempty
data. Only the configured `top_n` languages are shown; `show_other=true` groups
the rest into `Other`. With `show_other=false`, percentages are normalized to the
displayed subset, while `totalBytes` still includes all languages. Empty code
produces `totalBytes: 0` and `languages: []`.

These bytes measure repository code distribution, not skill or the owner's share
of the code. The Accueil/Home development-environment chart consumes this endpoint
when its section enters the viewport, using `GithubLanguageDistribution` in
`frontend/src/app/core/portfolio.models.ts`. It renders the returned language names
and percentages in their server-provided order, including `Other` (shown as
`Autres` in French). Percentages are visible in the legend and format follows the
page language. Colors are assigned by the frontend; no language values are hardcoded.

During the request the chart shows a loading skeleton. A successful response shows
`LIVE`; an empty distribution displays an empty state. Errors and a 15-second
timeout show `Offline` and a retry button, with no sample-data fallback. Successful
responses are shared for the application session, and navigating away cancels
unfinished requests. The source note explains that values describe the distribution
of code across the selected repositories.

### Selection, caching, and configuration

The backend reads the current
[profile configuration](https://github.com/ErwanLucienMMV/ErwanLucienMMV/blob/main/config/languages.json)
from the profile repository's default branch at each refresh. It follows the same
rules as the [README automation](https://github.com/ErwanLucienMMV/ErwanLucienMMV/blob/main/scripts/language_data.py):
only `include` names are eligible, `exclude` takes precedence, the profile itself
is always excluded, and forks/archives require explicit `allow_forks` or
`allow_archived` entries. Comparisons are case-insensitive. The current config
contains 22 names, including the allowed collaborative forks `minirt` and
`ft_minishell`.

Metadata is batched through GitHub's paginated public user-repository listing;
only eligible selected repositories have languages and commits queried. A missing
or private selected repository, malformed configuration/data, timeout, rate limit,
or other GitHub failure returns `503 Service Unavailable` with:

```json
{
  "message": "GitHub statistics are temporarily unavailable",
  "error": "Service Unavailable",
  "statusCode": 503
}
```

No partial statistics or fabricated zero values are returned on failure. Both
endpoints share a six-hour in-memory cache per backend process; concurrent requests
share one refresh. Failed refreshes have a 60-second retry cooldown. Expired data
is not served as a fresh success. Restarting the backend clears the cache. A refresh
has a 12-second overall deadline, five seconds per GitHub request, and at most six
concurrent GitHub requests. API responses use `Cache-Control: no-store`; the
frontend still retains successful data for its current application session.

Optional backend-only `GITHUB_TOKEN` authenticates requests and increases the
available GitHub rate limit. Compose forwards this variable only to NestJS; it can
be set in the local ignored `.env` or exported before starting Compose. Do not put
it in frontend configuration. Public-only unauthenticated requests also work,
subject to GitHub's shared IP rate limit. With 22 eligible repositories and one
metadata page, a cold refresh needs 46 requests, so a token is recommended for
restarts or multiple instances. GitHub permissions cannot be inherited from the
coding assistant's connection; the deployed backend needs its own environment.

References: [repository languages](https://docs.github.com/en/rest/repos/repos#list-repository-languages),
[commit author/time filters](https://docs.github.com/en/rest/commits/commits#list-commits),
and [REST pagination](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api).

## Information needed from you

All routes exist. The items below concern the content and delivery configuration
still needed to finish populating them. Project descriptions now reflect the
repository review; journey descriptions retain the existing drafts. No new
experience, rating, certification, or document has been invented. You can answer
in plain text; matching JSON is not required.

### Projects — `/projets` and category endpoints

The 14 supplied repositories are now populated; see the
[current project catalog](#current-project-catalog). Concepts, short French/English
descriptions, source links, stacks and categories have been filled from repository
evidence. Please provide only corrections or additional editorial detail below.
Projects can belong to several categories.

For each project, provide or confirm:

| Information | How it populates the API |
| --- | --- |
| Display name and short French/English description | `name`, `description` |
| School, personal, or professional context | `type` |
| Categories: fullstack, relative-low-level, low-level, backend, frontend, devops, ai | `categories`; include devops for Docker/container work |
| Exact languages, frameworks, databases, tools and versions worth displaying | `technologies` |
| Whether to feature it on the home page and preferred order | `featured`, JSON list order |
| Any correction to the supplied source link | `repositoryUrl`; `caseStudy.repositoryUrl` remains available for existing case studies |
| Goal, architecture/services, and your own contributions | `caseStudy.summary`, `architecture`, `contributions` |
| Optional architecture diagram and lessons learned | `caseStudy.diagramUrl`, `reflection` |
| Optional screenshot: image file/URL, alt text, original width/height | `image` |

Matcha now lists its Angular, Java/Spark, PostgreSQL/JDBC, WebSocket and Docker
stack. Your own contributions and lessons learned are still needed for a detailed
case study. Confirm the existing ft_transcendance architecture and personal
contributions before treating them as final portfolio copy. The basic French and
English descriptions are supplied; preferred wording, screenshots and detailed
case studies can be added later.

### Journey — `/parcours`

Current seed: HN Services (September 2023–July 2024), 42 (2025), ft_transcendance
(2026), and a next-step entry seeking an internship/apprenticeship in Île-de-France.
Please confirm or correct these details.

- [ ] For every experience: organization, job title, start/end dates, location if
  it should be mentioned, team size, responsibilities, technologies, and concrete
  achievements that can be published.
- [ ] For every education entry: school, course/qualification, dates, completion
  status, main topics, and any projects or highlights to feature.
- [ ] Any other milestones to include, and their intended chronological order.
- [ ] Your current goal: desired role, internship/apprenticeship/employment,
  availability/start date, location/remote preference, and whether the current
  next-step text is still accurate.
- [ ] Preferred French/English wording, or permission to draft a translation.

### Skills — `/skills`

Current seed: C, C++, SQL, Linux, Git, GDB, and Valgrind. All ratings are `null`
and all certifications/usage contexts are empty pending your input.

- [ ] Confirm the list and order; name any web, backend, DevOps, database, or other
  skills you want added.
- [ ] For each skill, give a self-assessed rating **out of 10**, or keep it unfilled.
- [ ] For each skill, list the projects, training, or professional experiences in
  which you used it, with a short concrete example.
- [ ] Relevant certification names (and issuer/date if you want them in the display
  text), or explicitly none.

### Documents — `/documents` and downloads

- [ ] Final French CV as PDF; optional editable DOCX version.
- [ ] Final English CV as PDF; optional editable DOCX version, or indicate that
  the same document should be used in both languages.
- [ ] Portfolio PDF for each language, if you want that download available.

Place approved files under the exact paths in [Documents and downloads](#documents-and-downloads).
Until supplied, their metadata stays `null` and the corresponding buttons remain
disabled. There is no need to send a file merely to finish implementing the route.

### Contact — `/contact-form`

- [ ] Preferred delivery destination: an existing webhook accepting the documented
  JSON, or the email service/provider you want to use if an adapter must be added.
- [ ] The receiver URL and whether it requires bearer-token authentication.
- [ ] If the receiver sends email: destination inbox, verified sender/domain, and
  desired subject prefix. These belong in the receiver/provider configuration;
  the visitor's email should be used as a reply-to address.
- [ ] Whether a confirmation email to the visitor is desired; none is currently sent.

Configure secrets directly in your local environment or ignored `.env`, rather
than writing them into these docs. Until a receiver is configured, valid contact
requests return `503`; the form does not falsely report successful delivery.

### GitHub — existing statistics endpoints

No further repository list is needed: the profile automation remains the source
of truth. Optional backend `GITHUB_TOKEN` increases the rate limit. Confirm only
if you want to change the current scope: selected public repositories, authored
default-branch commits over the past 365 days, and byte-weighted language totals.

### Quick response template

```text
Projects to keep/add/remove:
Project (repeat for each):
  Name / context / categories:
  Description / exact stack:
  Feature on home page? Preferred order:
  Repository / screenshot / architecture:
  What I personally built / lessons learned:

Journey corrections / additional experiences / education:
Current job-search goal and availability:

Skill (repeat): name / rating out of 10 or unfilled / usage / certifications:
CV and portfolio files available in FR / EN:
Contact receiver or preferred email provider / destination inbox:
English copy: I will provide it / please draft it:
```
