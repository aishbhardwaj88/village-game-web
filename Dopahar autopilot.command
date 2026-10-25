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
  while ! curl -s -m 8 -o /dev/null https://api.anthropic.com/ 2>/dev/null; do
    if [ "$waited" -eq 0 ]; then
      echo "=== No internet. Paused $(date). Will resume by itself." | tee -a tmp/autopilot.log
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

while true; do
  i=$((i+1))
  if [ -f tmp/STOP ]; then echo "Stop requested. Done."; break; fi
  wait_for_net || break
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
