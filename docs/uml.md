# Repository UML diagrams

These diagrams describe the current implementation in `frontend/src`,
`backend/src`, and `compose.production.yaml`. Open this file on GitHub or in a
Markdown viewer with Mermaid support to see the graphs. Standalone SVG copies
are linked below. Edit the Mermaid blocks to update the sources, then regenerate
the SVG copies with Mermaid CLI; no application dependency is required.

The views focus on application classes, contracts, and important runtime paths.
Framework internals and incidental members are omitted. Dashed class arrows are
dependencies; solid arrows are associations. TypeScript interfaces are marked
`interface`; they are data contracts, not database entities. The frontend and
backend declare corresponding contracts separately rather than importing one
shared package. Optional members are marked `?`, and `readonly` is omitted for
readability.

| Diagram source | Standalone image |
| --- | --- |
| [Backend classes](#backend-classes) | [SVG](uml/backend-classes.svg) |
| [Frontend classes](#frontend-classes) | [SVG](uml/frontend-classes.svg) |
| [Content contracts](#content-contracts) | [SVG](uml/content-contracts.svg) |
| [Project loading sequence](#project-loading-sequence) | [SVG](uml/project-loading-sequence.svg) |
| [Contact submission sequence](#contact-submission-sequence) | [SVG](uml/contact-submission-sequence.svg) |
| [GitHub statistics sequence](#github-statistics-sequence) | [SVG](uml/github-statistics-sequence.svg) |
| [Resource loading states](#resource-loading-states) | [SVG](uml/resource-loading-states.svg) |
| [Production deployment overview](#production-deployment-overview) | [SVG](uml/production-deployment-overview.svg) |

## Backend classes

Sources: [application module](../backend/src/app.module.ts),
[content](../backend/src/content/), [contact](../backend/src/contact/),
and [GitHub](../backend/src/github/).

```mermaid
classDiagram
    direction LR
    class AppModule
    class AppController {
        +status()
    }
    class ContentModule
    class ContactModule
    class GithubModule
    class ContentController {
        +projects(locale)
        +filteredProjects(category, locale)
        +journey(locale)
        +skills(locale)
        +documentMetadata(locale)
        +download(locale, name)
    }
    class ContentService {
        +projects(locale, category) Promise~Project[]~
        +journey(locale) Promise~JourneyEntry[]~
        +skills(locale) Promise~TechnicalSkill[]~
        -load(resource, locale) Promise
    }
    class DocumentsService {
        +metadata(locale) Promise~PortfolioDocuments~
        +download(locale, name) Promise~StreamableFile~
        -openDocument(language, name)
    }
    class ContactController {
        +submit(body, contentType)
    }
    class ContactService {
        +submit(body) Promise~void~
    }
    class GithubController {
        +stats()
        +languages()
    }
    class GithubService {
        -cached : Snapshot
        -pending : Promise~Snapshot~
        -retryAt : number
        +stats() Promise~GithubStats~
        +languages() Promise~GithubLanguageDistribution~
        -snapshot() Promise~Snapshot~
        -refresh() Promise~Snapshot~
        -commitCount(repo, since, until, signal) Promise~number~
    }
    AppModule ..> AppController : registers
    AppModule ..> ContentModule : imports
    AppModule ..> ContactModule : imports
    AppModule ..> GithubModule : imports
    ContentModule ..> ContentController : registers
    ContentModule ..> ContentService : provides
    ContentModule ..> DocumentsService : provides
    ContactModule ..> ContactController : registers
    ContactModule ..> ContactService : provides
    GithubModule ..> GithubController : registers
    GithubModule ..> GithubService : provides
    ContentController --> ContentService : injected
    ContentController --> DocumentsService : injected
    ContactController --> ContactService : injected
    GithubController --> GithubService : injected
```

`ContentService` reads and validates localized JSON on every request.
`DocumentsService` discovers and streams files from disk. `ContactService`
validates with the `contactMessage` function and forwards to a configured
webhook. `GithubService` fetches GitHub data and keeps a shared in-memory snapshot.
There is no database in this implementation.

## Frontend classes

Sources: [routes](../frontend/src/app/app.routes.ts),
[pages](../frontend/src/app/pages/), [shared components](../frontend/src/app/shared/),
[repository](../frontend/src/app/core/portfolio.repository.ts), and
[SSR HTTP transport](../frontend/src/app/core/server-http-backend.ts).

```mermaid
classDiagram
    direction TB
    class AppComponent
    class RouterOutlet
    class HomePage
    class ProjectsPage
    class JourneyPage
    class SkillsPage
    class ContactPage {
        +status
        +errors
        +submit(event)
    }
    class AboutPage
    class NotFoundPage
    class ProjectCollectionComponent {
        +category
        +page
        +resource
        +selectCategory(category)
        +selectPage(page)
    }
    class LanguageChartComponent
    class TechnicalSkillsComponent
    class DocumentPanelComponent
    class PortfolioRepository {
        -cache : Map
        +projects(category) Observable
        +journey() Observable
        +skills() Observable
        +documents() Observable
        +githubStats() Observable
        +githubLanguages() Observable
        -get(key, url, params) Observable
    }
    class PortfolioConfig {
        <<interface>>
        +source : api or fixtures
        +apiBaseUrl : string
    }
    class HttpClient
    class HttpBackend {
        <<interface>>
        +handle(request) Observable
    }
    class ServerHttpBackend {
        +handle(request) Observable
    }
    class FetchBackend
    AppComponent ..> RouterOutlet : hosts routed page
    RouterOutlet ..> HomePage : route
    RouterOutlet ..> ProjectsPage : route
    RouterOutlet ..> JourneyPage : route
    RouterOutlet ..> SkillsPage : route
    RouterOutlet ..> ContactPage : route
    RouterOutlet ..> AboutPage : route
    RouterOutlet ..> NotFoundPage : unmatched route
    HomePage ..> ProjectCollectionComponent : renders
    HomePage ..> LanguageChartComponent : renders
    ProjectsPage ..> ProjectCollectionComponent : renders
    SkillsPage ..> TechnicalSkillsComponent : renders
    ContactPage ..> DocumentPanelComponent : renders
    ProjectCollectionComponent --> PortfolioRepository : projects
    ProjectsPage --> PortfolioRepository : projects and GitHub stats
    JourneyPage --> PortfolioRepository : journey
    LanguageChartComponent --> PortfolioRepository : GitHub languages
    TechnicalSkillsComponent --> PortfolioRepository : skills
    DocumentPanelComponent --> PortfolioRepository : documents
    PortfolioRepository --> PortfolioConfig : PORTFOLIO_CONFIG token
    PortfolioRepository --> HttpClient : injected
    ContactPage --> HttpClient : submits directly
    HttpClient ..> HttpBackend : HTTP transport boundary
    HttpBackend <|.. ServerHttpBackend : SSR provider
    ServerHttpBackend --> FetchBackend : forwards API requests
```

Route components are lazy loaded. `loadResource` is a function used by the
data-consuming components, not an injected service. Contact submissions bypass
`PortfolioRepository`. On SSR, `ServerHttpBackend` rewrites `/api/` URLs to the
backend and reads supported fallback JSON requests from disk; the browser uses
the normal HTTP transport. Angular hydration can reuse server HTTP responses.

## Content contracts

Sources: [project contract](../frontend/src/app/core/project.contract.ts),
[journey contract](../frontend/src/app/core/journey.contract.ts),
[portfolio models](../frontend/src/app/core/portfolio.models.ts), and
[backend content types](../backend/src/content/content.types.ts).

```mermaid
classDiagram
    direction LR
    class Project {
        <<interface>>
        +id : string
        +name : string
        +repositoryUrl? : string
        +categories : ProjectCategory[]
        +description : string
        +type : school or personal or professional
        +technologies : string[]
        +featured? : boolean
    }
    class ProjectImage {
        <<interface>>
        +url : string
        +alt : string
        +width : number
        +height : number
    }
    class ProjectCaseStudy {
        <<interface>>
        +summary : string
        +architecture : string[]
        +contributions : string[]
        +repositoryUrl? : string
        +diagramUrl? : string
        +reflection? : string
    }
    class JourneyEntry {
        <<interface>>
        +id : string
        +kind : experience or education or project or goal
        +period : string
        +title : string
        +description : string
        +details : string[]
    }
    class JourneySection {
        <<interface>>
        +title : string
        +description : string
        +topics? : string[]
    }
    class JourneyHighlight {
        <<interface>>
        +id : string
        +title : string
        +description : string
        +technologies : string[]
    }
    class TechnicalSkill {
        <<interface>>
        +id : string
        +name : string
        +rating : number or null
        +certifications : string[]
        +contexts : string[]
    }
    class PortfolioDocuments {
        <<interface>>
    }
    class PublicDocument {
        <<interface>>
        +url : string
        +filename : string
    }
    Project "1" *-- "0..1" ProjectImage : image
    Project "1" *-- "0..1" ProjectCaseStudy : caseStudy
    JourneyEntry "1" *-- "0..1" JourneySection : section
    JourneySection "1" *-- "0..*" JourneyHighlight : highlights
    PortfolioDocuments "1" --> "0..1" PublicDocument : resumePdf
    PortfolioDocuments "1" --> "0..1" PublicDocument : resumeDocx
    PortfolioDocuments "1" --> "0..1" PublicDocument : portfolioPdf
```

Composition here represents nested JSON values. Missing document slots are
explicitly `null`; optional project/journey members may be absent. Project
categories are `fullstack`, `relative-low-level`, `low-level`, `backend`,
`frontend`, `devops`, and `ai`; one project may belong to several categories.

## Project loading sequence

Sources: [project collection](../frontend/src/app/shared/project-collection.component.ts),
[repository](../frontend/src/app/core/portfolio.repository.ts),
[content controller](../backend/src/content/content.controller.ts), and
[content service](../backend/src/content/content.service.ts).

```mermaid
sequenceDiagram
    participant UI as ProjectCollectionComponent
    participant Repo as PortfolioRepository
    participant HTTP as HTTP transport / proxy
    participant API as ContentController
    participant Content as ContentService
    participant Files as Localized JSON files
    UI->>Repo: projects(category), subscribe
    alt Completed API response already cached
        Repo-->>UI: Replay Project[]
    else New request or retry after failure
        Repo->>HTTP: GET /api/projets[/category]?locale=fr|en
        HTTP->>API: GET /projets[/category]?locale=fr|en
        API->>Content: projects(locale, category)
        Content->>Files: Read projects.locale.json and validate
        alt API succeeds
            Files-->>Content: Valid Project[]
            Content-->>API: Filtered Project[]
            API-->>HTTP: 200 Project[]
            HTTP-->>Repo: Project[]
            Repo-->>UI: Share response, including empty arrays
        else API fails or client request exceeds 15 seconds
            Note over Repo,Files: Fallback is outside the API response cache
            Repo->>HTTP: GET data/projects.locale.json
            HTTP->>Files: Browser static asset or SSR file read
            alt Fallback available
                Files-->>HTTP: Sample Project[]
                HTTP-->>Repo: Sample Project[]
                Repo-->>UI: Filter samples by category
            else Fallback also fails
                HTTP-->>Repo: Error
                Repo-->>UI: Error state with retry
            end
        end
    end
```

Concurrent consumers share the request for the same cache key. A successful
empty API response stays empty. A later subscription after API failure retries
the API, even if fallback data was available. Journey has the same API-first
fallback policy; skills and documents instead follow the explicit configured
source, and GitHub statistics have no fixture fallback.

## Contact submission sequence

Sources: [contact page](../frontend/src/app/pages/contact.page.ts),
[controller](../backend/src/contact/contact.controller.ts), and
[service and validation](../backend/src/contact/contact.service.ts).

```mermaid
sequenceDiagram
    actor Visitor
    participant Page as ContactPage
    participant HTTP as HttpClient / API proxy
    participant API as ContactController
    participant Service as ContactService
    participant Receiver as Configured webhook
    Visitor->>Page: Submit form
    Page->>Page: Trim fields and validate required values/email
    alt Client validation fails
        Page-->>Visitor: Field errors, no HTTP request
    else Client validation succeeds
        Page->>Page: status = sending
        Page->>HTTP: POST /api/contact-form, JSON ContactMessage
        HTTP->>API: POST /contact-form
        alt Content-Type is not application/json
            API-->>HTTP: 415 Unsupported Media Type
        else JSON Content-Type accepted
            API->>Service: submit(body)
            Service->>Service: Validate and trim fields, check lengths and email
            alt Invalid payload
                Service-->>API: 400 Bad Request
                API-->>HTTP: 400 Bad Request
            else Webhook missing or delivery fails
                Note over Service,Receiver: Invalid destination, timeout or upstream failure
                Service-->>API: 503 Service Unavailable
                API-->>HTTP: 503 Service Unavailable
            else Webhook accepts message
                Service->>Receiver: POST JSON, optional bearer token (10s timeout)
                Receiver-->>Service: Successful HTTP response
                Service-->>API: Complete
                API-->>HTTP: 204 No Content
            end
        end
        alt 204 response
            HTTP-->>Page: Success
            Page-->>Visitor: status = success, reset form
        else HTTP error, network failure or 15s client timeout
            HTTP-->>Page: Error
            Page-->>Visitor: status = error
        end
    end
```

`ContactMessage` contains `name`, `email`, `subject`, and `message`. Messages are
not stored locally or automatically retried. A client timeout does not prove
that the receiver failed to accept a message.

## GitHub statistics sequence

Sources: [GitHub service](../backend/src/github/github.service.ts),
[selection and aggregation functions](../backend/src/github/github.data.ts),
and [response types](../backend/src/github/github.types.ts).

```mermaid
sequenceDiagram
    participant Client as PortfolioRepository
    participant API as GithubController
    participant Service as GithubService
    participant GitHub as GitHub REST API
    Client->>API: GET /stats/github or /stats/github/languages (via /api proxy)
    API->>Service: stats() or languages()
    Service->>Service: snapshot()
    alt Snapshot younger than six hours
        Service-->>API: Cached endpoint data
    else Refresh already in progress
        Service->>Service: Await shared pending Promise
        Service-->>API: Endpoint data or 503 on refresh failure
    else Within one-minute retry cooldown
        Service-->>API: 503 Service Unavailable
    else Refresh required
        Service->>GitHub: Read repository selection config
        GitHub-->>Service: Selection rules
        loop Public repository metadata pages
            Service->>GitHub: GET user repositories
            GitHub-->>Service: Repository metadata and pagination
        end
        Service->>Service: Apply include/exclude and fork/archive rules
        loop Selected repositories, up to six workers
            Service->>GitHub: GET repository language bytes
            GitHub-->>Service: Language totals
            Service->>GitHub: GET authored commits on default branch, last 365 days
            GitHub-->>Service: Commit page and pagination count
        end
        alt Complete valid snapshot
            Service->>Service: Aggregate and cache both responses for six hours
            Service-->>API: Requested endpoint data
        else Refresh fails or exceeds 12 seconds
            Service->>Service: Set one-minute retry cooldown
            Service-->>API: 503, no stale or partial statistics
        end
    end
    API-->>Client: JSON response or HTTP error
```

The refresh has a 12-second overall deadline and individual GitHub fetches have
a 5-second timeout. The cache is shared by both endpoints within one API process;
it is not a shared external cache. Browser HTTP paths have the `/api` prefix,
which is removed before NestJS handles them.

## Resource loading states

Sources: [`LoadState`](../frontend/src/app/core/portfolio.models.ts) and
[`loadResource` / `loadBrowserResource`](../frontend/src/app/core/load-resource.ts).

```mermaid
stateDiagram-v2
    [*] --> Loading
    Loading --> Ready: Request emits data
    Loading --> Error: Request fails, including fallback failure
    Ready --> Loading: retry() or reloadOn dependency changes
    Error --> Loading: retry() or reloadOn dependency changes
    Loading --> Loading: New trigger cancels previous subscription
    Loading --> [*]: Component destroyed, subscription cancelled
    Ready --> [*]: Component destroyed
    Error --> [*]: Component destroyed
    note right of Loading
        status = loading
        loadBrowserResource waits until
        afterNextRender before requesting
    end note
    note right of Ready
        status = ready
        data may be an empty collection
    end note
    note right of Error
        status = error
        UI can offer retry()
    end note
```

The status values in code are lowercase: `loading`, `ready`, and `error`.
The initial state is loading; `loadBrowserResource` suppresses requests during
SSR and starts them after browser rendering. A successful fallback produces
the ready state.

## Production deployment overview

This supplementary architecture view uses a Mermaid flowchart rather than
formal UML deployment notation. It follows
[production Compose](../compose.production.yaml),
[Nginx routing](../frontend/nginx/routes.conf), and
[the Angular server](../frontend/src/server.ts).

```mermaid
flowchart LR
    Browser["Browser: Angular application"]
    GitHub["GitHub REST API"]
    Webhook["Contact webhook"]
    subgraph Host["Production host / Compose network"]
        Nginx["frontend service: Nginx TLS :8080<br/>Published host port :9042 by default"]
        Static["Built browser assets<br/>FR/EN bundles and fallback JSON"]
        SSR["ssr service: Angular Node server :4000"]
        SSRAssets["Browser assets inside SSR image<br/>Localized fallback JSON"]
        API["backend service: NestJS :3000"]
        Content["Localized content JSON<br/>inside backend image"]
        Documents["Documents directory<br/>read-only bind mount"]
        TLS["TLS certificates<br/>read-only bind mount"]
    end
    Browser -->|"HTTPS pages, assets and /api requests"| Nginx
    Nginx -->|"Static requests"| Static
    Nginx -->|"Page requests"| SSR
    Nginx -->|"/api/*, strip /api prefix"| API
    SSR -->|"ServerHttpBackend: API requests"| API
    SSR -->|"Read fallback JSON from disk"| SSRAssets
    API -->|"Read and validate per request"| Content
    API -->|"Discover and stream"| Documents
    API -->|"HTTPS, optional GITHUB_TOKEN"| GitHub
    API -->|"POST JSON, optional bearer token"| Webhook
    Nginx --- TLS
```

Only Nginx publishes a host port in production Compose. SSR and NestJS are
reached over the internal Compose network. The Node SSR server also supports
an `/api/` proxy for standalone previews; production Nginx sends browser API
requests directly to NestJS. The SSR image contains its own browser assets for
fallback reads, separate from Nginx's copy.
