#!/usr/bin/env bash
# COVENANT realm setup on a QEA-governed TideCloak realm. Run by a human operator, not the app:
# the app server never holds admin credentials. On a QEA realm, every role grant below is only
# FILED as a change request; it takes effect after tide-realm-admins approve it at
#   <auth-server-url>/realms/<realm>/tide-console/  ->  QEA Approvals
#
#   bash scripts/realm-setup.sh roles                          # create covenant-finance / covenant-procurement
#   bash scripts/realm-setup.sh grant lawyer covenant-finance  # approver role (governed)
#   bash scripts/realm-setup.sh grant admin covenant-procurement
#   bash scripts/realm-setup.sh admin survivor                 # 3rd tide-realm-admin -> quorum 2 of 3
#   bash scripts/realm-setup.sh escalate survivor              # rogue admin: give one person BOTH roles
#   bash scripts/realm-setup.sh pending                        # list pending change requests
#
# Needs KC_PASSWORD (TideCloak master admin) in the environment or in .env.admin. Never commit it.
# Not .env: Next.js loads .env into the app server, which must never hold admin credentials.
set -euo pipefail
cd "$(dirname "$0")/.."
[[ -z "${KC_PASSWORD:-}" && -f .env.admin ]] && set -a && . ./.env.admin && set +a
: "${KC_PASSWORD:?Set KC_PASSWORD (TideCloak master admin password) in .env.admin}"
MODE="${1:?usage: realm-setup.sh roles|grant|admin|escalate|pending [user] [role]}"
URL="$(jq -r '."auth-server-url"' tidecloak.json | sed 's#/$##')"
REALM="$(jq -r .realm tidecloak.json)"
KC_USER="${KC_USER:-admin}"

RESP=$(curl -s -X POST "${URL}/realms/master/protocol/openid-connect/token" \
  --data-urlencode "username=${KC_USER}" --data-urlencode "password=${KC_PASSWORD}" -d grant_type=password -d client_id=admin-cli) \
  || { echo "cannot reach TideCloak at ${URL}" >&2; exit 1; }
TOKEN=$(jq -r '.access_token // empty' <<<"$RESP" 2>/dev/null || true)
[[ -z "$TOKEN" ]] && { echo "admin login failed as '${KC_USER}': $(jq -r '.error_description // .error // .' <<<"$RESP" 2>/dev/null || echo "$RESP") (check KC_USER / KC_PASSWORD in .env.admin)" >&2; exit 1; }
auth=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")
api() { curl -s -w '\nHTTP %{http_code}\n' "$@" "${auth[@]}"; }

user_id() {
  local id
  id=$(curl -s "${URL}/admin/realms/${REALM}/users?username=$1&exact=true" "${auth[@]}" | jq -r '.[0].id // empty')
  [[ -z "$id" ]] && { echo "user $1 not found in ${REALM}" >&2; exit 1; }
  echo "$id"
}
grant() { # user role
  local role
  role=$(curl -s "${URL}/admin/realms/${REALM}/roles/$2" "${auth[@]}")
  [[ "$(jq -r .name <<<"$role")" != "$2" ]] && { echo "role $2 missing; run: realm-setup.sh roles" >&2; exit 1; }
  echo "Filing: give $1 the role $2"
  api -X POST "${URL}/admin/realms/${REALM}/users/$(user_id "$1")/role-mappings/realm" -d "[${role}]"
}

case "$MODE" in
  roles)
    for r in covenant-finance covenant-procurement; do
      echo "Creating realm role $r"
      api -X POST "${URL}/admin/realms/${REALM}/roles" -d "{\"name\":\"$r\",\"description\":\"COVENANT payment approver\"}"
    done ;;
  grant) grant "${2:?user}" "${3:?role}" ;;
  admin)
    RM=$(curl -s "${URL}/admin/realms/${REALM}/clients?clientId=realm-management" "${auth[@]}" | jq -r '.[0].id')
    ROLE=$(curl -s "${URL}/admin/realms/${REALM}/clients/${RM}/roles/tide-realm-admin" "${auth[@]}")
    echo "Filing: make ${2:?user} a tide-realm-admin"
    api -X POST "${URL}/admin/realms/${REALM}/users/$(user_id "$2")/role-mappings/clients/${RM}" -d "[${ROLE}]" ;;
  escalate)
    echo "ROGUE ADMIN: trying to give ${2:?user} both approver roles (one person could then approve a \$12k payment alone)"
    grant "$2" covenant-finance
    grant "$2" covenant-procurement
    echo "Now open QEA Approvals: with 3 realm admins this needs 2 distinct approvals to commit." ;;
  pending) api "${URL}/admin/realms/${REALM}/iga/change-requests?status=PENDING" ;;
  *) echo "unknown mode ${MODE}" >&2; exit 1 ;;
esac
