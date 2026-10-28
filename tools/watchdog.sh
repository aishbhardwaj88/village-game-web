#!/bin/bash
# Fails loudly when the loop stops changing the game. The 27-28 Oct stall ran 21 hours
# because nobody checked whether runs were producing anything. This checks every run.
cd "$(dirname "$0")/.." || exit 1
STATE=tmp/watchdog.state
mkdir -p tmp
# Count commits in the last 3 hours that touched something OUTSIDE docs/.
PROD=$(git log --since="3 hours ago" --name-only --pretty=format:%H \
       | grep -v '^$' | grep -v '^docs/' | grep -v '^[0-9a-f]\{40\}$' | wc -l | tr -d ' ')
TS=$(date '+%Y-%m-%d %H:%M')
if [ "$PROD" -eq 0 ]; then
  STRIKES=$(( $(cat "$STATE" 2>/dev/null || echo 0) + 1 ))
  echo "$STRIKES" > "$STATE"
  echo "[$TS] WATCHDOG: 0 game files changed in 3h. Strike $STRIKES." >> tmp/autopilot.log
  if [ "$STRIKES" -ge 2 ]; then
    # Put it at the very top of the order file, where it cannot be outranked.
    TMPF=$(mktemp)
    {
      echo "# !! WATCHDOG: THE LOOP HAS PRODUCED NO GAME CHANGE FOR 6+ HOURS !!"
      echo
      echo "You are stalled. Whatever you believe is blocking you is NOT a reason to stop."
      echo "Do not write a handoff. Do not summarise. Open \`docs/PARALLEL.md\`, pick the"
      echo "first unbuilt family, and spawn builders NOW. Delete this banner only after a"
      echo "commit that changes a file outside docs/."
      echo
      cat docs/AUTOPILOT.md
    } > "$TMPF"
    mv "$TMPF" docs/AUTOPILOT.md
    echo "[$TS] WATCHDOG: banner injected into docs/AUTOPILOT.md" >> tmp/autopilot.log
  fi
else
  echo 0 > "$STATE"
fi
