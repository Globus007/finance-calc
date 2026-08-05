#!/usr/bin/env bash
# Configure Vault secrets used by public.cleanup_capture_temp_orphans (Storage API delete).
#
# Usage:
#   # Local stack (pg_net must reach Kong inside Docker):
#   ./supabase/scripts/configure-capture-temp-cleanup.sh --local
#
#   # Linked remote project (uses SUPABASE_ACCESS_TOKEN + linked ref, or env below):
#   SUPABASE_SERVICE_ROLE_KEY=... ./supabase/scripts/configure-capture-temp-cleanup.sh --linked
#
# Env (remote):
#   SUPABASE_URL                 default https://$SUPABASE_PROJECT_REF.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY    required for --linked
#   SUPABASE_DB_PASSWORD         optional; used if provided for link auth

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

MODE="${1:-}"
if [[ "$MODE" != "--local" && "$MODE" != "--linked" ]]; then
  echo "usage: $0 --local | --linked" >&2
  exit 2
fi

if [[ "$MODE" == "--local" ]]; then
  # From inside the Postgres container, Kong is the storage API gateway.
  URL="${SUPABASE_URL:-http://kong:8000}"
  # shellcheck disable=SC1090
  eval "$(npx --yes supabase status -o env)"
  KEY="${SERVICE_ROLE_KEY:?SERVICE_ROLE_KEY missing from supabase status}"
  npx --yes supabase db query --local \
    "select public.configure_capture_temp_cleanup('${URL}', '${KEY}');"
  echo "Configured local capture-temp cleanup → ${URL}"
  exit 0
fi

# --linked
if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "SUPABASE_SERVICE_ROLE_KEY is required for --linked" >&2
  exit 1
fi

REF="${SUPABASE_PROJECT_REF:-}"
if [[ -z "$REF" && -f supabase/.temp/project-ref ]]; then
  REF="$(cat supabase/.temp/project-ref)"
fi
URL="${SUPABASE_URL:-}"
if [[ -z "$URL" ]]; then
  if [[ -z "$REF" ]]; then
    echo "Set SUPABASE_URL or SUPABASE_PROJECT_REF for --linked" >&2
    exit 1
  fi
  URL="https://${REF}.supabase.co"
fi

# Prefer PostgREST RPC (works without direct DB DNS); service_role only.
BODY="$(
  URL="$URL" SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" python3 -c \
    'import json,os; print(json.dumps({
      "p_supabase_url": os.environ["URL"],
      "p_service_role_key": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    }))'
)"

curl -sS -f -X POST "${URL}/rest/v1/rpc/configure_capture_temp_cleanup" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "$BODY" \
  >/dev/null

echo "Configured remote capture-temp cleanup → ${URL}"
