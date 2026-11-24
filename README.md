# Full Stack Portfolio

Local development with two separate Dockerfiles and Docker Compose. Minimal
Angular and NestJS apps are included because the repository was empty.

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

Use the Makefile to build, start in the background, and stop the stack:

```sh
make build
make up
make down
```

The Compose command can be overridden, for example `make build COMPOSE=podman-compose`.
You can also run Docker Compose directly:

```sh
docker compose config
docker compose up --build
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

Full Compose startup could not be verified in this workspace because the local
Podman DNS service fails to connect to its user scope bus. Temporary verification
containers and the network were removed after testing.
