#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
root=$(realpath "${1:?Usage: bash deploy.sh DEPLOY_ROOT RELEASE_DIRECTORY}")
release=$(realpath "${2:?Supply an extracted release directory}")
[[ $release == "$root/releases/"* ]] || { echo 'Release must be inside DEPLOY_ROOT/releases.' >&2; exit 1; }
for tool in docker python3 flock; do command -v "$tool" >/dev/null; done
for file in "$root/.env" "$root/backend.env" "$root/tls/fullchain.pem" "$root/tls/privkey.pem" \
    "$release/compose.production.yaml" "$release/release.env" "$release/smoke.py"; do
    [[ -f $file ]] || { echo "Missing required file: $file" >&2; exit 1; }
done
[[ -d $root/documents ]] || { echo "Create $root/documents/{fr,en} first." >&2; exit 1; }
exec 9>"$root/.deploy.lock"
flock -w 600 9
export DEPLOY_ROOT="$root"
previous=''
if [[ -L $root/current ]]; then previous=$(realpath "$root/current"); fi
compose() {
    local directory=$1
    shift
    docker compose --project-name fullstackportfolio --env-file "$root/.env" \
        --env-file "$directory/release.env" -f "$directory/compose.production.yaml" "$@"
}
verify() {
    local directory=$1 url
    url=$(compose "$directory" config --format json | python3 -c \
        'import json,sys; print(json.load(sys.stdin)["services"]["frontend"]["labels"]["io.fullstackportfolio.public-url"])') || return 1
    python3 "$directory/smoke.py" "$url" --ca-file "$root/tls/fullchain.pem"
}
rollback() {
    trap - ERR INT TERM
    echo 'Deployment failed.' >&2
    compose "$release" ps >&2 || true
    if [[ -n $previous && $previous != "$release" ]]; then
        echo "Restoring previous release: $previous" >&2
        if compose "$previous" up -d --remove-orphans --wait --wait-timeout 120 --pull never && verify "$previous"; then
            echo 'Previous release restored and verified.' >&2
        else
            echo 'ROLLBACK FAILED: inspect containers and restore a known release manually.' >&2
        fi
    else
        echo 'No different previous release exists. Containers are retained for diagnosis.' >&2
    fi
    exit 1
}
# Pull failures leave running containers untouched. Never print resolved secrets.
compose "$release" config --quiet
compose "$release" pull
trap rollback ERR INT TERM
compose "$release" up -d --remove-orphans --wait --wait-timeout 120 --pull never
verify "$release"
if [[ -n $previous && $previous != "$release" ]]; then
    ln -s "$previous" "$root/.previous.$$"
    mv -Tf "$root/.previous.$$" "$root/previous"
fi
ln -s "$release" "$root/.current.$$"
mv -Tf "$root/.current.$$" "$root/current"
trap - ERR INT TERM
echo "Deployed and verified: $release"
