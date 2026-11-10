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

# 1. LOOP ALIVE. Measured by log movement, never by pgrep (pgrep matched this sandbox's
#    own processes and reported a dead loop as alive for three days).
#    7 Nov lesson: a quiet log is NOT a dead loop. The loop sat 3.5 h in a usage-limit
#    wait, I called it dead, and she started a second loop on the same files. So: if the
#    last lines show a limit message, report WAITING, with the reset time, and only call
#    it dead when the log is quiet well past that reset. Never tell her to restart it on
#    a WAITING verdict.
LOG=tmp/autopilot.log
if [ -f "$LOG" ]; then
  AGE=$(( ($(date +%s) - $(stat -c %Y "$LOG" 2>/dev/null || stat -f %m "$LOG")) / 60 ))
  LAST=$(grep "^=== Run" "$LOG" | tail -1)
  TAIL=$(tail -8 "$LOG")
  RESET=$(echo "$TAIL" | grep -oE "resets [0-9]+:[0-9]+ ?[ap]m" | tail -1)
  if [ "$AGE" -lt 60 ]; then
    echo "LOOP: ALIVE (log moved ${AGE} min ago) | $LAST"
  elif echo "$TAIL" | grep -qiE "limit|Waiting 30 min|No usable internet"; then
    if [ "$AGE" -lt 300 ]; then
      echo "LOOP: WAITING (quiet ${AGE} min, last message: usage limit, ${RESET:-reset time unknown}). ALIVE. Do NOT ask her to restart."
    else
      echo "LOOP: ** PROBABLY DEAD ** (quiet ${AGE} min, far past the limit wait: ${RESET:-?}). Ask her to check the Terminal window FIRST, restart only if it is gone."
    fi
  else
    echo "LOOP: ** DEAD or STUCK ** (log quiet ${AGE} min, no wait message) | $LAST"
  fi
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
// Turns applied in geometry code instead of anchors.ry (read from the source, so a change there is seen here).
const GEOM={};
const hv=fs.readFileSync('src/village.js','utf8').match(/HALWAI_TURN_DEG\s*=\s*(-?[0-9.]+)/);
if(hv) GEOM.halwai=-parseFloat(hv[1])*Math.PI/180;
// Largest drawn shape: is her outline square (then a quarter turn keeps the same outline)?
const square=p=>{let best=null,ba=0;for(const s of p.shapes||[]){const c=s.corners;if(!c||c.length<3)continue;
  const w=Math.hypot(c[1][0]-c[0][0],c[1][1]-c[0][1]),d=Math.hypot(c[2][0]-c[1][0],c[2][1]-c[1][1]);if(w*d>ba){ba=w*d;best=[w,d];}}
  return best&&Math.abs(best[0]-best[1])/Math.max(best[0],best[1])<0.1;};
// A quarter/half front turn is DELIBERATE when its source line (anchors.js or mapPlan.js) says so in a comment.
const SRC=fs.readFileSync('src/anchors.js','utf8').split('\n').concat(fs.readFileSync('src/mapPlan.js','utf8').split('\n'));
const documented=id=>SRC.some(l=>l.trim().startsWith(id+':')&&/\/[\/*]/.test(l)&&/front|facing|orientation/i.test(l)&&/road-front|facing audit|orientation pass|front path|faces/i.test(l));
let pos=0,posBad=[],rotBad=[],flips=[],okFlips=[];
for(const [id,a] of Object.entries(ANCHORS)){const p=m.get(n(id)); if(!p)continue;
  const d=Math.hypot(a.x-(p.centre[0]+MAP_SHIFT.x), a.z-(p.centre[1]+MAP_SHIFT.z));
  if(d>2){posBad.push(id+' '+d.toFixed(1)+'m');continue;} pos++;
  const ry=id in GEOM?GEOM[id]:(a.ry||0);
  const diff=(ry+(p.turn_deg||0)*Math.PI/180)*180/Math.PI;          // 0 = exactly her map turn
  const q=((Math.round(diff/90)%4)+4)%4, resid=Math.abs(diff-Math.round(diff/90)*90);
  if(resid>2.5) rotBad.push(id+' '+resid.toFixed(1)+'deg off'+(q?' (after a '+q*90+'deg front turn)':''));
  else if(q%2===1&&!square(p)) rotBad.push(id+' outline turned 90deg');
  else if(q){ if(documented(id)) okFlips.push(id+' '+q*90); else flips.push(id+' '+q*90); }
}
console.log('MAP POSITIONS correct:', pos, '| WRONG:', posBad.length, posBad.slice(0,8).join(', '));
console.log('MAP TURNS wrong:', rotBad.length, rotBad.slice(0,8).join(', '));
console.log('FRONT TURNS undocumented (same outline, front turned with no comment saying why):', flips.length, flips.join(', '));
console.log('FRONT TURNS deliberate (documented in anchors.js/mapPlan.js, '+okFlips.length+'):', okFlips.join(', '));
console.log('   (halwai turn read from src/village.js HALWAI_TURN_DEG. A turn applied elsewhere in geometry code still shows as a false positive: CHECK BEFORE EDITING.)');
" 2>/dev/null || echo "MAP CHECK: could not run"

# 5. HER OPEN ITEMS
echo "WAITING ON HER: $(grep -c 'status: open' docs/NEEDS_YOU.md 2>/dev/null) open lines in docs/NEEDS_YOU.md"
echo "=== END. Do not report anything this check did not confirm. ==="
