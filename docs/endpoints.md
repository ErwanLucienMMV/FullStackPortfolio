# API endpoints

These contracts are consumed by the Angular frontend. NestJS implements `GET /`,
`GET /stats/github`, and `GET /stats/github/languages`. The project, journey, and
contact endpoints below still need backend implementations.

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
`school`, `personal`, or `professional`. Optional fields are `featured`, `image`
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
backend should enforce the same required fields and validate the email too.

Return `204 No Content`, or another successful 2xx response with valid JSON, once
the message has been accepted. The frontend does not read a response payload. On
success it clears the form and displays `Votre message a bien été envoyé.`

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
