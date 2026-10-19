#!/bin/bash
# Double-click this file to open the Dopahar progress dashboard.
# Starts the local dashboard server if it isn't already running, then opens
# it in your default browser. Nothing here touches the internet - it only
# reads files in this folder.

cd "$(dirname "$0")" || exit 1

PORT=4321
URL="http://127.0.0.1:$PORT"

if ! curl -s -o /dev/null "$URL"; then
  nohup node tools/dashboard/server.js > /tmp/dopahar-dashboard.log 2>&1 &
  disown || true

  for i in 1 2 3 4 5 6 7 8 9 10; do
    if curl -s -o /dev/null "$URL"; then
      break
    fi
    sleep 0.5
  done
fi

open "$URL"
