#!/bin/sh

set -eu

FAKE_QUEUE_NAME="${PRINTPAGE_FAKE_QUEUE_NAME:-Brother_QL700}"
FAKE_QUEUE_OUTPUT="${PRINTPAGE_FAKE_QUEUE_OUTPUT:-/tmp/printpage-jobs/label-output.pdf}"
FAKE_QUEUE_PPD="/app/printpage/testing/fake-brother-ql700.ppd"

mkdir -p "$(dirname "$FAKE_QUEUE_OUTPUT")"
touch "$FAKE_QUEUE_OUTPUT"

rm -f /run/cups/cups.sock
/usr/sbin/cupsd

if ! lpstat -p "$FAKE_QUEUE_NAME" >/dev/null 2>&1; then
  /usr/sbin/lpadmin \
    -p "$FAKE_QUEUE_NAME" \
    -E \
    -v "file:$FAKE_QUEUE_OUTPUT" \
    -P "$FAKE_QUEUE_PPD"
fi

lpadmin -d "$FAKE_QUEUE_NAME"

exec uvicorn printpage:app --host 0.0.0.0 --port 8000
