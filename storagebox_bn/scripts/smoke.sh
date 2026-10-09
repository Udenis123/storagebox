#!/usr/bin/env bash
# End-to-end smoke test against a running API (npm run dev) + RustFS. Requires curl and jq.
set -euo pipefail

API="${API:-http://localhost:4200}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
pass() { printf '  \033[32m✔\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✘\033[0m %s\n' "$1"; exit 1; }
expect_status() { [ "$1" = "$2" ] && pass "$3 ($1)" || fail "$3 — expected $2, got $1"; }

echo "StorageBox smoke test → $API"

EMAIL="smoke-$(date +%s)@example.com"
SESSION=$(curl -sf "$API/api/auth/register" -H 'content-type: application/json' \
  -d "{\"name\":\"Smoke Tester\",\"email\":\"$EMAIL\",\"password\":\"Password123!\",\"accountName\":\"Smoke Co\"}")
TOKEN=$(jq -r .data.accessToken <<<"$SESSION")
CLOUD=$(jq -r .data.user.account.cloudName <<<"$SESSION")
pass "registered $EMAIL (cloud: $CLOUD)"

KEY=$(curl -sf "$API/api/keys" -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"name":"smoke"}')
BASIC=$(printf '%s:%s' "$(jq -r .data.keyId <<<"$KEY")" "$(jq -r .data.secret <<<"$KEY")" | base64)
AUTH=(-H "authorization: Basic $BASIC")
pass "created API key"

printf '%%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%%%EOF\n' > "$WORK/Invoice 2026.pdf"
node -e "require('sharp')({create:{width:640,height:480,channels:3,background:'#36f'}}).png().toFile('$WORK/photo.png')" \
  2>/dev/null || fail "could not generate test image (run from storagebox_bn)"

PDF=$(curl -sf "$API/v1/files" "${AUTH[@]}" -F "file=@$WORK/Invoice 2026.pdf" -F collection=invoices/2026 -F tags=finance,2026)
PDF_URL=$(jq -r '.data[0].url' <<<"$PDF")
pass "uploaded PDF → $PDF_URL"
expect_status "$(curl -s -o /dev/null -w '%{http_code}' "$PDF_URL")" 200 "public PDF link serves"
expect_status "$(curl -s -o /dev/null -w '%{http_code}' -H 'range: bytes=0-3' "$PDF_URL")" 206 "range request"

IMG=$(curl -sf "$API/v1/files" "${AUTH[@]}" -F "file=@$WORK/photo.png" -F access=PRIVATE -F publicId=team-photo)
[ "$(jq -r '.data[0].width' <<<"$IMG")" = "640" ] && pass "private image stored with dimensions" || fail "image dimensions"
expect_status "$(curl -s -o /dev/null -w '%{http_code}' "$API/f/$CLOUD/team-photo.png")" 403 "private file blocked without signature"

SIGNED=$(curl -sf "$API/v1/files/team-photo/signed-url" "${AUTH[@]}" -H 'content-type: application/json' \
  -d '{"expiresIn":300,"transform":"w_200,h_200,c_fill,f_webp"}' | jq -r .data.url)
curl -sf -o "$WORK/thumb" -D "$WORK/headers" "$SIGNED"
grep -qi 'content-type: image/webp' "$WORK/headers" && pass "signed transform link → webp thumbnail" || fail "transform content type"
TAMPERED="${SIGNED/expires=/expires=9}"
expect_status "$(curl -s -o /dev/null -w '%{http_code}' "$TAMPERED")" 403 "tampered signature rejected"

FROM_URL=$(curl -sf "$API/v1/files" "${AUTH[@]}" -H 'content-type: application/json' -d "{\"url\":\"$PDF_URL\",\"collection\":\"imports\"}")
[ "$(jq -r '.data[0].collectionPath' <<<"$FROM_URL")" = "imports" ] && pass "imported file from URL" || fail "remote import"

TOTAL=$(curl -sf "$API/v1/files?collection=invoices/2026" "${AUTH[@]}" | jq .data.total)
[ "$TOTAL" = "1" ] && pass "list by collection path" || fail "list returned $TOTAL"

READ_KEY=$(curl -sf "$API/api/keys" -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"name":"ro","scope":"READ"}')
READ_BASIC=$(printf '%s:%s' "$(jq -r .data.keyId <<<"$READ_KEY")" "$(jq -r .data.secret <<<"$READ_KEY")" | base64)
expect_status "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$API/v1/files/team-photo" -H "authorization: Basic $READ_BASIC")" 403 "read-only key cannot delete"
expect_status "$(curl -s -o /dev/null -w '%{http_code}' "$API/v1/files" -H 'authorization: Basic Zm9vOmJhcg==')" 401 "bad key rejected"

expect_status "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$API/v1/files/team-photo" "${AUTH[@]}")" 200 "delete file"
expect_status "$(curl -s -o /dev/null -w '%{http_code}' "$SIGNED")" 404 "deleted file is gone"

USAGE=$(curl -sf "$API/v1/usage" "${AUTH[@]}")
pass "usage: $(jq -r '.data.fileCount' <<<"$USAGE") files, $(jq -r '.data.storageBytes' <<<"$USAGE") bytes"
echo "All smoke checks passed."
