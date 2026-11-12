#!/bin/zsh
# Opens a TEMPORARY public link to the demo running on this laptop.
# Run it yourself from the project folder:  zsh scripts/share.sh
# Stop it with Ctrl-C. The link stops working when this stops or the laptop sleeps.
# Demo only: fictional data, no real payments. Anyone with the link can open it.
set -e
export PATH=/opt/homebrew/bin:$PATH
cd "$(dirname "$0")/.."
PORT=3100
LOG=$(mktemp)

if [ ! -f .next/BUILD_ID ]; then
  echo "Building the site first (a minute or two)..."
  npm run build
fi

cloudflared tunnel --url "http://localhost:$PORT" >"$LOG" 2>&1 &
TUNNEL=$!
trap 'kill $TUNNEL 2>/dev/null; rm -f "$LOG"' EXIT

URL=""
for i in {1..30}; do
  URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG" | head -1 || true)
  [ -n "$URL" ] && break
  sleep 1
done
if [ -z "$URL" ]; then
  echo "Could not open the link. Details:"; cat "$LOG"; exit 1
fi

echo ""
echo "  Share this link:  $URL"
echo "  Keep this window open. Press Ctrl-C to take the link down."
echo ""
APP_URL="$URL" DEMO_MODE=true caffeinate -i npx next start -p "$PORT"
