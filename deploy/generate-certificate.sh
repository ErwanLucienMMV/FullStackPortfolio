#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
root=$(realpath -m "${1:?Usage: TLS_DOMAIN=hostname bash generate-certificate.sh DEPLOY_ROOT}")
domain=${TLS_DOMAIN:?Set TLS_DOMAIN to your template hostname}
days=${TLS_DAYS:-365}
if [[ ! $domain =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ ]] || ((${#domain} > 253)); then
    echo 'TLS_DOMAIN must be a DNS hostname or IPv4 address, without scheme or port.' >&2
    exit 1
fi
if [[ ! $days =~ ^[1-9][0-9]{0,3}$ ]] || ((days > 3650)); then
    echo 'TLS_DAYS must be 1–3650.' >&2
    exit 1
fi
command -v openssl >/dev/null
mkdir -p "$root"
# Nginx can read the mounted key; the private parent restricts host access.
chmod 700 "$root"
mkdir -p "$root/tls"
chmod 755 "$root/tls"
if [[ -e $root/tls/privkey.pem || -e $root/tls/fullchain.pem ]]; then
    echo 'Certificate files already exist. Back them up before intentional rotation.' >&2
    exit 1
fi
temporary=$(mktemp -d "$root/tls/.generate.XXXXXX")
trap 'rm -rf "$temporary"' EXIT
san="DNS:$domain"
if [[ $domain =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then san="IP:$domain"; fi
openssl req -x509 -newkey rsa:3072 -sha256 -nodes -days "$days" \
    -keyout "$temporary/privkey.pem" -out "$temporary/fullchain.pem" \
    -subj "/CN=$domain" -addext "subjectAltName=$san" \
    -addext 'extendedKeyUsage=serverAuth' -addext 'basicConstraints=critical,CA:FALSE'
chmod 644 "$temporary/privkey.pem" "$temporary/fullchain.pem"
mv "$temporary/privkey.pem" "$root/tls/privkey.pem"
mv "$temporary/fullchain.pem" "$root/tls/fullchain.pem"
echo "Created a self-signed certificate for $domain (valid $days days)."
echo 'Keep DEPLOY_ROOT mode 700. Trust fullchain.pem on clients; never share privkey.pem.'
