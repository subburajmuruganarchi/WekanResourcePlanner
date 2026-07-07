#!/usr/bin/env bash
# Sync chromedriver major version with installed Chrome, then run axe on the login page.
set -euo pipefail

if ! command -v google-chrome >/dev/null 2>&1; then
  echo "google-chrome not found. Install Chrome before running a11y checks."
  exit 1
fi

CHROME_VERSION="$(google-chrome --version)"
CHROME_MAJOR="$(echo "${CHROME_VERSION}" | grep -oE '[0-9]+' | head -1)"
echo "Detected ${CHROME_VERSION} (major ${CHROME_MAJOR})"

echo "Installing chromedriver@${CHROME_MAJOR} to match system Chrome..."
npm install --no-save "chromedriver@${CHROME_MAJOR}"

CHROMEDRIVER_PATH="$(node -p "require('chromedriver').path")"
echo "Using chromedriver at: ${CHROMEDRIVER_PATH}"

npx start-server-and-test \
  "vite preview --port 4173 --strictPort" \
  http://127.0.0.1:4173/login \
  "npx axe http://127.0.0.1:4173/login --exit --chromedriver-path ${CHROMEDRIVER_PATH}"
