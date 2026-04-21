#!/usr/bin/env bash
# Post-deploy smoke test. Hits the endpoints that silently broke the
# demo on 2026-04-21 (FHIR 422, privacy_notices.short_summary missing,
# document_folios table missing, _table_exists stub). Any 5xx fails
# the Cloud Build so a broken deploy is visible instead of silently
# rolling out.
#
# Auth: we only need to prove the handlers execute without exceptions.
# Hitting protected endpoints without a token returns 401/403 after the
# dependency chain runs, which is enough — the bugs we care about
# raise 500 before the auth gate, so 5xx is always a regression.
#
# Usage: BASE_URL=https://... ./prod_smoke_test.sh
set -u

BASE_URL="${BASE_URL:-https://cortex-backend-246017659362.us-central1.run.app}"
FAILED=0

check() {
    local name="$1"
    local path="$2"
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${BASE_URL}${path}" || echo "000")
    if [ "$code" = "000" ]; then
        echo "FAIL ${name}: connection error"
        FAILED=$((FAILED+1))
    elif [ "$code" -ge 500 ] && [ "$code" -lt 600 ]; then
        echo "FAIL ${name}: HTTP ${code}"
        FAILED=$((FAILED+1))
    else
        echo "ok   ${name}: HTTP ${code}"
    fi
}

echo "smoke test against ${BASE_URL}"
check "health"                "/health"
check "privacy public-notice" "/api/privacy/public-notice"
check "fhir practitioner/me"  "/api/fhir/Practitioner/me"
check "fhir patient everything" "/api/fhir/Patient/1/\$everything"
check "doc folio prescription"  "/api/consultations/1/document-folio?document_type=prescription"

if [ "$FAILED" -gt 0 ]; then
    echo ""
    echo "SMOKE TEST FAILED: ${FAILED} endpoint(s) returned 5xx"
    exit 1
fi
echo ""
echo "smoke OK"
