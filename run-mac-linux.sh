#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
echo "AsterPath local preview: http://localhost:4173"
exec node server.mjs
