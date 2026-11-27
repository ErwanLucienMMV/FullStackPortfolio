# Inception: UML

Reviewed source: [1747305fbe30](https://github.com/ErwanLucienMMV/Inception/tree/1747305fbe305d8e7841e1db197b57dd658b3d92).

UML sequence of the configured runtime request path. This repository is infrastructure, not an application class library: its startup script downloads WordPress with WP-CLI. The PHP/database exchange represents the configured WordPress dependency rather than a specific SQL query implemented in this repository. NGINX and WordPress share the wordpress volume; MariaDB has its own persistent volume. Only NGINX publishes a host port (443).

[Open SVG](../../../backend/src/content/diagrams/inception.svg).
Portfolio: `/fr/projets?project=inception` and `/en/projects?project=inception`.
API: `/api/diagrams/inception.svg`.

```mermaid
sequenceDiagram
 actor Browser
 participant Nginx as NGINX container :443 TLS
 participant Files as Shared wordpress volume
 participant PHP as WordPress / PHP-FPM :9000
 participant DB as MariaDB :3306
 Browser->>Nginx: HTTPS request
 Nginx->>Files: Resolve URI under /var/www/wordpress
 alt Existing static asset
 Files-->>Nginx: Asset bytes
 Nginx-->>Browser: HTTPS static response
 else PHP request or index.php fallback
 Nginx->>PHP: FastCGI with SCRIPT_FILENAME
 PHP->>Files: Load WordPress PHP files
 opt Page requires persisted content
 PHP->>DB: WordPress configured database access
 DB-->>PHP: Stored content
 end
 PHP-->>Nginx: Generated HTTP response
 Nginx-->>Browser: HTTPS page
 end
 Note over PHP,DB: Private Compose network inception
 Note over DB: Persistent mariadb volume
```

Inspected implementation files:

- [srcs/docker-compose.yml](https://github.com/ErwanLucienMMV/Inception/blob/1747305fbe305d8e7841e1db197b57dd658b3d92/srcs/docker-compose.yml)
- [srcs/requirements/nginx/conf/nginx.conf](https://github.com/ErwanLucienMMV/Inception/blob/1747305fbe305d8e7841e1db197b57dd658b3d92/srcs/requirements/nginx/conf/nginx.conf)
- [srcs/requirements/wordpress/Dockerfile](https://github.com/ErwanLucienMMV/Inception/blob/1747305fbe305d8e7841e1db197b57dd658b3d92/srcs/requirements/wordpress/Dockerfile)
- [srcs/requirements/wordpress/conf/start.sh](https://github.com/ErwanLucienMMV/Inception/blob/1747305fbe305d8e7841e1db197b57dd658b3d92/srcs/requirements/wordpress/conf/start.sh)
- [srcs/requirements/mariadb/conf/start.sh](https://github.com/ErwanLucienMMV/Inception/blob/1747305fbe305d8e7841e1db197b57dd658b3d92/srcs/requirements/mariadb/conf/start.sh)
