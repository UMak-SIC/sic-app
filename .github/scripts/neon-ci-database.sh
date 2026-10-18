#!/usr/bin/env bash
# Creates or deletes the throwaway Neon branch a single CI run tests against.
#
#   neon-ci-database.sh create <branch-name>
#     Branches from the project's default branch, creates an empty "ci"
#     database on it, and exports TEST_DATABASE_URL (pooled) and
#     MIGRATE_DATABASE_URL (direct) to later steps. The branch id is written
#     to the step output as soon as the branch exists, so the delete step can
#     clean up even when a later part of this script fails.
#
#   neon-ci-database.sh delete <branch-id>
#
# Requires NEON_API_KEY and NEON_PROJECT_ID.
set -euo pipefail

: "${NEON_API_KEY:?NEON_API_KEY is required}"
: "${NEON_PROJECT_ID:?NEON_PROJECT_ID is required}"

api="https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}"
database_name="ci"

neon() {
  local method="$1" path="$2" body="${3:-}"
  curl --silent --show-error --fail-with-body --retry 3 \
    --request "$method" "${api}${path}" \
    --header "Authorization: Bearer ${NEON_API_KEY}" \
    --header "Accept: application/json" \
    --header "Content-Type: application/json" \
    ${body:+--data "$body"}
}

wait_for_operations() {
  local ids status
  ids=$(jq -r '.operations[]?.id')
  for id in $ids; do
    for _ in $(seq 1 60); do
      status=$(neon GET "/operations/${id}" | jq -r '.operation.status')
      case "$status" in
        finished) break ;;
        failed | error | cancelled)
          echo "Neon operation ${id} ended with status ${status}." >&2
          exit 1
          ;;
      esac
      sleep 2
    done
    if [ "$status" != "finished" ]; then
      echo "Neon operation ${id} did not finish in time." >&2
      exit 1
    fi
  done
}

create() {
  local name="$1" created branch_id role password host pooler_host
  created=$(neon POST "/branches" "$(jq -n --arg name "$name" \
    '{branch: {name: $name}, endpoints: [{type: "read_write"}]}')")

  branch_id=$(jq -r '.branch.id' <<<"$created")
  echo "branch_id=${branch_id}" >>"$GITHUB_OUTPUT"

  role=$(jq -r '.connection_uris[0].connection_parameters.role' <<<"$created")
  password=$(jq -r '.connection_uris[0].connection_parameters.password' <<<"$created")
  host=$(jq -r '.connection_uris[0].connection_parameters.host' <<<"$created")
  pooler_host=$(jq -r '.connection_uris[0].connection_parameters.pooler_host // empty' <<<"$created")
  pooler_host="${pooler_host:-${host/./-pooler.}}"
  echo "::add-mask::${password}"

  wait_for_operations <<<"$created"

  neon POST "/branches/${branch_id}/databases" "$(jq -n \
    --arg name "$database_name" --arg owner "$role" \
    '{database: {name: $name, owner_name: $owner}}')" | wait_for_operations

  local credentials
  credentials="$(jq -rn --arg v "$role" '$v|@uri'):$(jq -rn --arg v "$password" '$v|@uri')"
  {
    echo "MIGRATE_DATABASE_URL=postgresql://${credentials}@${host}/${database_name}?sslmode=require"
    echo "TEST_DATABASE_URL=postgresql://${credentials}@${pooler_host}/${database_name}?sslmode=require"
  } >>"$GITHUB_ENV"

  echo "Created Neon branch ${name} (${branch_id}) with an empty ${database_name} database."
}

delete() {
  local branch_id="$1"
  neon DELETE "/branches/${branch_id}" >/dev/null
  echo "Deleted Neon branch ${branch_id}."
}

case "${1:-}" in
  create) create "${2:?branch name required}" ;;
  delete) delete "${2:?branch id required}" ;;
  *)
    echo "usage: $0 create <branch-name> | delete <branch-id>" >&2
    exit 2
    ;;
esac
