#!/bin/zsh

cd "$(dirname "$0")" || exit 1

PORT=3020
URL="http://localhost:${PORT}"

echo "Starting Artist Application Studio..."
echo "Project: $(pwd)"
echo "URL: ${URL}"
echo

if lsof -ti tcp:${PORT} >/dev/null 2>&1; then
  echo "Artist Application Studio is already running on ${URL}"
  open "${URL}"
  exit 0
fi

(
  sleep 3
  open "${URL}"
) &

npm run dev -- -p "${PORT}"
