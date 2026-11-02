#!/bin/bash
# ONE command that answers "is what I am about to tell her actually true?"
#
# Every failure this week came from reporting a claim instead of measuring it:
# a loop reported alive that was dead for 3 days, turns reported done that were not,
# ETAs counted from a task list instead of the observed commit rate.
# Checking used to cost many tool calls and relaying a claim cost none, so the cheap
# path won. This makes the check one call. Run it BEFORE every status.
cd "$(dirname "$0")/.." || exit 1
echo "=== TRUTH CHECK  $(date '+%d %b %H:%M %Z') ==="

# 1. LOOP ALIVE. Measured by log movement, never by pgrep: pgrep matched this sandbox's
#    own processes and reported a dead loop as alive for three days.
LOG=tmp/autopilot.log
if [ -f "$LOG" ]; then
  AGE=$(( ($(date +%s) - $(stat -c %Y "$LOG" 2>/dev/null || stat -f %m "$LOG")) / 60 ))
  LAST=$(grep "^=== Run" "$LOG" | tail -1)
  if [ "$AGE" -lt 60 ]; then echo "LOOP: ALIVE (log moved ${AGE} min ago) | $LAST"
  else echo "LOOP: ** DEAD or STUCK ** (log last moved ${AGE} min ago) | $LAST"; fi
else echo "LOOP: ** NO LOG **"; fi

# 2. REAL THROUGHPUT. Game commits only, docs do not count as work.
for H in 3 12; do
  N=$(git log --since="$H hours ago" --name-only --pretty=format:%H 2>/dev/null \
      | grep -v '^$' | grep -v '^docs/' | grep -v '^[0-9a-f]\{40\}$' | sort -u | wc -l | tr -d ' ')
  C=$(git log --since="$H hours ago" --oneline 2>/dev/null | wc -l | tr -d ' ')
  echo "LAST ${H}H: $C commits, $N game files changed"
done
echo "RATE: $(echo "scale=1; $(git log --since='12 hours ago' --oneline | wc -l)/12" | bc 2>/dev/null) commits/hour  <-- ETAs MUST use this, not a task count"

# 3. PUBLISHED. Work she cannot load is not done.
echo "UNPUSHED: $(git log origin/main..main --oneline 2>/dev/null | wc -l | tr -d ' ')"
echo "UNCOMMITTED: $(git status -s 2>/dev/null | wc -l | tr -d ' ')"

# 4. IS THE VILLAGE ACTUALLY ON HER MAP. The claim that matters most.
node --input-type=module -e "
import { ANCHORS } from './src/anchors.js';
import { MAP_SHIFT } from './src/mapPlan.js';
import fs from 'fs';
const plan=JSON.parse(fs.readFileSync('docs/layout/village-plan-positions-2026-11-01.json','utf8'));
const n=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const m=new Map();
for(const p of plan.places){const c=p.in_code_today; if(!c||/NEW/i.test(String(c)))continue;
  for(const t of String(c).split(/[,/;]| or /)){const k=n(t); if(k)m.set(k,p);}}
let pos=0,posBad=[],rotBad=[];
for(const [id,a] of Object.entries(ANCHORS)){const p=m.get(n(id)); if(!p)continue;
  const d=Math.hypot(a.x-(p.centre[0]+MAP_SHIFT.x), a.z-(p.centre[1]+MAP_SHIFT.z));
  const dr=Math.abs(((a.ry||0)+(p.turn_deg||0)*Math.PI/180)*180/Math.PI);
  if(d>2) posBad.push(id+' '+d.toFixed(1)+'m'); else pos++;
  if(d<=2&&dr>2.5) rotBad.push(id+' '+dr.toFixed(1)+'deg');}
console.log('MAP POSITIONS correct:', pos, '| WRONG:', posBad.length, posBad.slice(0,8).join(', '));
console.log('MAP TURNS wrong:', rotBad.length, rotBad.slice(0,8).join(', '));
console.log('   (anchors.ry only. A turn applied in geometry code, e.g. HALWAI_YAW, shows here as a false positive: CHECK BEFORE EDITING.)');
" 2>/dev/null || echo "MAP CHECK: could not run"

# 5. HER OPEN ITEMS
echo "WAITING ON HER: $(grep -c 'status: open' docs/NEEDS_YOU.md 2>/dev/null) open lines in docs/NEEDS_YOU.md"
echo "=== END. Do not report anything this check did not confirm. ==="
