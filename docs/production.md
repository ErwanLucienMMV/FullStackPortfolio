# Debian 13 production deployment

Production uses standalone `compose.production.yaml`, separate multi-stage
Dockerfiles, non-root processes, read-only container filesystems, health checks,
rotating logs, and persistent documents/certificates. Only **TCP 9042** is published.
Nginx terminates HTTPS and redirects HTTP received on that same port to HTTPS.
Its upstream removes `/api/` before forwarding requests to the private NestJS API.

## Install Docker and tools

On the Debian server, install [Docker Engine and Compose from the official repository](https://docs.docker.com/engine/install/debian/).
If Docker is already installed, retain the existing installation and add missing tools.

```sh
sudo apt-get update
sudo apt-get install -y ca-certificates curl openssl python3 util-linux
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
docker compose version
```

Use Compose v2 with `up --wait` support. Allow inbound TCP 9042 and your SSH port in
the provider firewall. Account for Docker's forwarding rules in a host firewall;
UFW INPUT rules alone do not constrain published container ports. No ports 80 or
443 are required for this self-signed setup. Nginx runs in a container, so no host
Nginx installation is needed.

## Create the deployment account

```sh
sudo adduser --disabled-password --gecos '' portfolio-deploy
sudo usermod -aG docker portfolio-deploy
sudo install -d -m 700 -o portfolio-deploy -g portfolio-deploy /opt/fullstackportfolio
sudo -u portfolio-deploy mkdir -p /opt/fullstackportfolio/releases
sudo -u portfolio-deploy mkdir -p /opt/fullstackportfolio/documents/fr /opt/fullstackportfolio/documents/en
sudo -u portfolio-deploy mkdir -p /home/portfolio-deploy/.ssh
sudo chmod 700 /home/portfolio-deploy/.ssh
```

Docker group membership grants control of the host through Docker; use the account
only for deployment. New membership applies on the next login.
On your workstation generate a dedicated Actions key outside the repository:

```sh
ssh-keygen -t ed25519 -f ./portfolio-deploy-key -C github-actions-portfolio -N ''
```

Append the public `.pub` file to the deployment account's `authorized_keys` on the
server. Prefix its line with `restrict ` to disable PTY and forwarding while
allowing deployment commands. Set ownership to `portfolio-deploy` and mode 600.

## Configure the server and certificate

From the local checkout, replacing SERVER_IP (add `-P` for a nonstandard SSH port):

```sh
scp deploy/server.env.example portfolio-deploy@SERVER_IP:/opt/fullstackportfolio/.env
scp deploy/backend.env.example portfolio-deploy@SERVER_IP:/opt/fullstackportfolio/backend.env
scp deploy/generate-certificate.sh portfolio-deploy@SERVER_IP:/opt/fullstackportfolio/generate-certificate.sh
```

As `portfolio-deploy`, edit `.env`:

```dotenv
BIND_ADDRESS=0.0.0.0
PROXY_PORT=9042
TLS_DOMAIN=portfolio.example.test
PUBLIC_URL=https://${TLS_DOMAIN}:${PROXY_PORT}
```

Then generate a matching certificate:

```sh
chmod 600 /opt/fullstackportfolio/.env /opt/fullstackportfolio/backend.env
TLS_DOMAIN=portfolio.example.test bash /opt/fullstackportfolio/generate-certificate.sh /opt/fullstackportfolio
```

`TLS_DOMAIN` is an environment variable, not a fixed domain. The generator creates
an RSA certificate with a DNS SAN (or an IP SAN for IPv4). `TLS_DAYS` defaults to
365. It refuses to overwrite an existing key or certificate. Keep the deployment
root mode **700**: the mounted TLS files are readable by the unprivileged Nginx
UID, while the private parent restricts access from other host users.

Without DNS, add `127.0.0.1 portfolio.example.test` to **the server's** `/etc/hosts`
for deployment verification. Add `SERVER_IP portfolio.example.test` to **your
workstation's** hosts file for browsing. Copy only `tls/fullchain.pem` to clients
and explicitly trust it (or add a browser exception). Never share `privkey.pem`.

Edit `backend.env` on the server. `CONTACT_WEBHOOK_URL` is required for successful
contact delivery; `CONTACT_WEBHOOK_TOKEN` is an optional bearer credential.
`GITHUB_TOKEN` optionally raises GitHub's public API rate limit. Secrets stay in
NestJS and never enter frontend assets. Use single quotes around values containing
`$` or `#`; Compose env files are not shell scripts and must not be sourced.

Optional public documents go in `documents/fr/` and `documents/en/` as `resume.pdf`,
`resume.docx`, and `portfolio.pdf`. Set directories to 755 and files to 644 for
container read access. Documents are mounted read-only and survive releases.

## Operate and roll back

A release directory contains `compose.production.yaml`, `release.env` with exact
image digests, `deploy.sh`, and `smoke.py`. Activate it as `portfolio-deploy`:

```sh
bash /opt/fullstackportfolio/releases/RELEASE_ID/deploy.sh /opt/fullstackportfolio /opt/fullstackportfolio/releases/RELEASE_ID
```

The script serializes deployments using a file lock, validates configuration,
pulls images before touching containers, waits for health, and checks the HTTPS
site against the public certificate. Only verified releases become `current`;
`previous` retains the prior release. Startup/smoke failures restore the previous
release's Compose file and retained images. A failed first deployment leaves
containers for diagnosis and creates no `current`. Pull failures leave running
containers untouched. Compose updates can cause brief downtime.

```sh
cd /opt/fullstackportfolio
export DEPLOY_ROOT="$PWD"
docker compose --env-file .env --env-file current/release.env -f current/compose.production.yaml ps
docker compose --env-file .env --env-file current/release.env -f current/compose.production.yaml logs --tail 100 -f
python3 current/smoke.py https://portfolio.example.test:9042 --ca-file tls/fullchain.pem
bash current/deploy.sh "$PWD" "$(readlink -f previous)"
```

Shared `.env`, `backend.env`, TLS files and documents are not rolled back. Back
them up securely. Retain images/releases referenced by `current` and `previous`;
avoid broad system pruning on a shared server. Monitor uptime and expiry:

```sh
openssl x509 -in /opt/fullstackportfolio/tls/fullchain.pem -noout -enddate
```

For renewal, back up the existing TLS pair outside `tls/`, remove both files,
rerun the generator, and run `docker compose --env-file .env --env-file current/release.env -f current/compose.production.yaml exec frontend nginx -s reload`
from the deployment root with `DEPLOY_ROOT` exported. Clients need to trust the
new self-signed certificate. A future CA certificate can replace the same pair;
recreate the frontend after changing its configured domain.

References: [unprivileged Nginx](https://github.com/nginx/docker-nginx-unprivileged),
[same-port HTTP error 497](https://nginx.org/en/docs/http/ngx_http_ssl_module.html#errors),
[production Compose](https://docs.docker.com/compose/how-tos/production/).
