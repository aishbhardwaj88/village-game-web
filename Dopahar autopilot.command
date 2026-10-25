#!/bin/bash
# Double-click to let Claude Code build Dopahar by itself, run after run.
# To stop: double-click "Dopahar autopilot STOP.command" (it finishes the current run, then stops).
cd "$(dirname "$0")" || exit 1
mkdir -p tmp
rm -f tmp/STOP
caffeinate -i -w $$ &
echo "Dopahar autopilot started $(date). Log: tmp/autopilot.log. Keep this window open, lid open, plugged in."
short=0
i=0

# She travels with no internet for ~90 min at a time. A run started offline just
# burns a cycle and fails, so hold here until the API is actually reachable and
# resume by itself the moment it is.
wait_for_net() {
  local waited=0
  # Not just "is there a network": a cafe/office captive portal happily answers 200
  # with its own login page. Require the real API's own unauthenticated response
  # (401/403/404), which a portal cannot fake.
  while ! case "$(curl -s -m 8 -o /dev/null -w '%{http_code}' https://api.anthropic.com/v1/messages 2>/dev/null)" in 401|403|404|405) true ;; *) false ;; esac; do
    if [ "$waited" -eq 0 ]; then
      echo "=== No usable internet (offline, or a wifi login page not signed into). Paused $(date). Resumes by itself." | tee -a tmp/autopilot.log
    fi
    if [ -f tmp/STOP ]; then return 1; fi
    sleep 30
    waited=$((waited+30))
  done
  if [ "$waited" -gt 0 ]; then
    echo "=== Internet back after $((waited/60)) min. Resuming $(date)." | tee -a tmp/autopilot.log
  fi
  return 0
}

# Independent auto-pusher. The loop only pushes when a run completes, so if a run
# stalls or the loop is between runs, finished commits can sit unpushed for hours
# (happened 25 Oct, ~3 h). This pushes anything local every 3 minutes regardless,
# skipping while git is busy so it can never collide with a run's own git work.
(
  while true; do
    sleep 180
    [ -f tmp/STOP ] && exit 0
    [ -e .git/index.lock ] && continue
    ahead=$(git rev-list --count @{u}..HEAD 2>/dev/null) || continue
    if [ "${ahead:-0}" -gt 0 ]; then
      if git push origin main >> tmp/autopilot.log 2>&1; then
        echo "=== auto-push: $ahead commit(s) pushed $(date)" >> tmp/autopilot.log
      else
        echo "=== auto-push FAILED $(date) (will retry in 3 min)" >> tmp/autopilot.log
      fi
    fi
  done
) &
PUSHER_PID=$!
trap 'kill $PUSHER_PID 2>/dev/null' EXIT

while true; do
  i=$((i+1))
  if [ -f tmp/STOP ]; then echo "Stop requested. Done."; break; fi
  wait_for_net || break
  # After a sleep/wake (lid closed in transit) a run can be killed mid-git and leave
  # a stale lock that breaks every later git command. Clear any lock older than 5 min.
  find .git -maxdepth 2 -name '*.lock' -mmin +5 -delete 2>/dev/null
  start=$(date +%s)
  echo "=== Run $i started $(date)" | tee -a tmp/autopilot.log
  claude -p "$(cat docs/AUTOPILOT.md)" --dangerously-skip-permissions >> tmp/autopilot.log 2>&1
  took=$(( $(date +%s) - start ))
  echo "=== Run $i finished after $((took/60)) min" | tee -a tmp/autopilot.log
  if [ $took -lt 120 ]; then
    short=$((short+1))
    echo "Run was very short ($short in a row)." | tee -a tmp/autopilot.log
    if [ $short -ge 3 ]; then echo "3 short runs in a row: likely a usage limit. Waiting 30 min." | tee -a tmp/autopilot.log; sleep 1800; short=0; else sleep 30; fi
  else
    short=0; sleep 60
  fi
done
echo "Autopilot finished $(date)."
