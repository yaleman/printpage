#!/bin/bash

cd "$(dirname "$0")" || {
    echo "failed to cd to $(dirname "$@")"
    exit 1
}

# shellcheck disable=SC1091
source "venv/bin/activate" || {
    echo "Couldn't find virtualenv! at ./venv/bin/activate"
    exit 1
}

uvicorn printpage:app --host 0.0.0.0 --port 8000