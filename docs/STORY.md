# Story — Dopahar

One summer afternoon in Amrai Khera. Tonight is Dada's (grandfather's) 75th birthday —
everyone in the house is busy getting ready, so the player (the son, ~10-12 years old)
is sent out to run the afternoon's errands. Eight missions, one continuous dayline from
hot afternoon to warm sunset (`src/dayline.js`), ending on the roof with the whole
family together.

Tone: warm, funny, child-friendly, never sad or scary. The "chase" in M6 is slapstick,
not a threat. Nobody is ever in real danger. Per CLAUDE.md §4: no real brands/village
names, no alcohol/tobacco, era pre-2015, English primary / Hindi secondary in every UI
string (signboards are the one exception, already handled by `src/signboards.js`).

Language note for implementers: every dialogue/objective line below is written as
`English / Hindi`. Hindi lines here are plain-language drafts — keep them simple,
spoken-register, not literary.

---

## M1 — Jalebi for Maa (exists)

Maa is busy in the kitchen; send the boy to the halwai for jalebi, the first sweet for
tonight. Light, simple, establishes controls.

- Maa: "Dada turns 75 tonight — go on, get jalebi from the halwai before the syrup
  cools. / Dada aaj pachattar saal ke ho rahe hain — ja, halwai se jalebi le aa, syrup
  thanda hone se pehle."
- Halwai (handing over): "Fresh and hot, just for your Dada! Tell him the halwai sends
  his blessings. / Garam garam, khaas Dada ke liye! Keh dena halwai ne ashirwad bheja
  hai."
- Maa (on return): "Good boy. One done, six to go before tonight. / Shaabash. Ek ho
  gaya, raat tak chhe aur baaki hain."

## M2 — Tiffin to school, bring sister home (exists)

- Maa: "Your sister forgot her tiffin — and school's almost out. Run! / Tumhari behen
  tiffin bhool gayi — aur school chhutne wala hai. Bhaago!"
- Teacher: "Right on time. Sit, wait for the bell with the others. / Theek samay par.
  Baitho, dusron ke saath ghanti ka intezaar karo."
- Sister: "Finally! Race you home — loser tells Dada about tonight. / Aakhir aaye!
  Ghar tak daud — haarne wala Dada ko raat ke baare mein batayega."

## M3 — Wheat sacks to kirana, earn money for Dada's gift (exists, reframe)

Reframe existing dialogue around the birthday gift, keep all mechanics (one sack on
foot, up to 3 via trolley).

- Pitaji: "We need a little extra tonight — for Dada's gift. Load the wheat, sell it at
  the kirana, see what we can afford. / Aaj raat thodi zyada zaroorat hai — Dada ke
  tohfe ke liye. Gehu laad, kirane mein bech, dekhte hain kya le sakte hain."
- Kirana shopkeeper: "Good grain. Here — and buy something nice with the change, it's a
  special day. / Accha anaaj hai. Lo — aur baaki paison se kuch accha le lena, aaj khaas
  din hai."
- Pitaji (on return): "That's enough for the gift, and a little left over. Well done. /
  Tohfe ke liye kaafi hai, aur thoda bach bhi gaya. Shaabash."

## M4 — The postman's letter (new)

Bua (father's sister, lives elsewhere) has sent a letter for Dada's birthday with her
family — it's out with the postman on his cycle round and hasn't reached the house yet.
Find him somewhere on his usual route (bazaar/lane) before he moves on.

- Pitaji: "The postman should have Bua's letter — he does his round about now. Catch
  him before he moves past the bazaar. / Postman ke paas Bua ki chitthi honi chahiye —
  wo is waqt apna chakkar laga raha hoga. Bazaar se aage jaane se pehle use pakad lo."
- Postman (cycling, flagged down): "Ah, the birthday house! Yes, yes — one letter, all
  the way from Bua's family. Careful, don't crumple it. / Arre, janamdin wala ghar! Haan
  haan — ek chitthi, Bua ke ghar se aayi hai. Sambhal ke, mode mat."
- Player (objective text): "Find the postman before he finishes his round. / Postman ko
  uska chakkar khatam karne se pehle dhoondo."
- On return — Pitaji: "Bua's handwriting — she never misses his birthday. Put it with
  the gifts. / Bua ki likhaai — unka kabhi na-chookna. Tohfon ke saath rakh do."

Implementation note: postman rides a simple waypoint-loop route on the bike (reuse
`src/npcRoutines.js` waypoint-loop + `src/vehicles.js` bike geometry scaled for an NPC,
or a simpler code-built cycling NPC) through the lane/bazaar; player must reach his
current position, not a fixed point — same reachability rules as every other target.

## M5 — Dada's new kurta from the darzi (new)

A new bazaar shop: the darzi (tailor). Dada's new kurta for tonight has been stitched
and is ready for pickup.

- Maa: "The darzi finished Dada's kurta — go get it before the shop closes for the
  evening. / Darzi ne Dada ka kurta sil diya hai — shaam ko dukaan band hone se pehle
  le aa."
- Darzi (handing over a wrapped kurta): "Tell your Dada — stitched by hand, hemmed
  twice so it sits right. Happy birthday to him. / Dada se kehna — haath se siya hai,
  do baar hem kiya taaki theek baithe. Unhe janamdin mubarak."
- Objective text: "Collect Dada's kurta from the darzi. / Darzi se Dada ka kurta le kar
  aao."

Implementation note: the darzi shop is a new bazaar-row unit (reuse the shared shop-
counter "buy"-style interaction pattern from `src/interactions.js`, but the interaction
here just hands over the kurta item rather than spending money) — watch the draw-call
budget (see BACKLOG item 1); build it from `BuildingKit`/merged geometry like every
other bazaar unit, don't add a one-off mesh-per-part structure.

## M6 — The monkey and the kurta (new, comedic)

Walking back with the wrapped kurta, a monkey snatches it off the player (a cutscene-
style grab, not a stat/damage system) and scampers off across rooftops and lanes. Light
chase: follow the monkey through 2-3 waypoints (rooftop, lane, back down) until it drops
the kurta (distracted by a bystander, or trading it for a banana handed off by another
villager) — recoverable and undamaged. Comedic, never scary; the monkey is never
caught/hurt/punished, just outrun and out-waited.

- (Grab, on-screen text, no dialogue needed): "A monkey snatched the kurta! / Bandar
  kurta le kar bhaag gaya!"
- Villager (pointing): "That way — he's heading for the roofs! / Udhar — chhat ki taraf
  ja raha hai!"
- (After the monkey drops it): Player picks the kurta back up — objective text: "Got it
  back — and still in one piece. / Mil gaya — aur bilkul theek-thaak."
- Pitaji (on return, laughing): "A monkey, really? At least Dada will have a story to
  go with his kurta tonight. / Bandar, sach mein? Chalo Dada ke paas aaj raat kurte ke
  saath ek kissa bhi hoga."

Implementation note: this is the one mission that's pure chase/follow, no shop/money
logic — build it as a scripted waypoint sequence with a simple monkey NPC (code-built,
small quadruped-ish silhouette or a reused/rescaled placeholder), not a new systemic
mechanic. Keep it short (under a minute of chase) so it doesn't read as frustrating.

As built (2026-10-19): the chase runs along the bazaar's own frontage and the open
chowk plaza, not literal rooftops — both are already-proven-clear ground, so the
chase didn't need a new rooftop-traversal system. The bystander/banana-trade beat was
simplified to a direct snatch + catch-up-to-recover (no extra dialogue line), kept
short on purpose. See `docs/parked.md`'s 2026-10-19 entries for the full reasoning.

## M7 — Mango baagh run (new, signature verb: knock down mangoes)

Drive the tractor + trolley out to the mango baagh (orchard) beyond the field, knock
down mangoes (the signature verb — a simple timed/aimed shake-or-throw interaction at
marked trees), load them into the trolley, drive home.

- Pitaji: "Take the tractor out to the baagh — Dada always wants fresh mangoes on his
  birthday table. Bring back a trolley-load. / Tractor baagh le jao — Dada ko hamesha
  janamdin ki thali mein taaze aam chahiye hote hain. Trolley bhar ke le aana."
- (At the baagh, objective text): "Knock down mangoes from the marked trees. /
  Nishaan wale pedo se aam giraao."
- Villager/baagh keeper (if present): "Careful of the branches — and leave a few for the
  birds! / Dalion se bachke — aur chidiyon ke liye kuch chhod dena!"
- On return — Pitaji: "That's plenty — Dada's favourite. Good driving. / Itne kaafi hain
  — Dada ke pasandida. Accha chalaya."

Implementation note: reuses the existing tractor+trolley vehicle/collision system
(`src/vehicles.js`) and the field's dirt-track pattern (`src/field.js`) extended to a
new baagh zone; "knock down mangoes" is a new simple interaction (approach a marked
tree, hold/tap interact, a few mango props detach and land, get picked up into a
trolley-cargo count) — not a new physics system. Watch draw-call budget for the new
trees/props.

As built (2026-10-19): the knock itself is a counter increment + a sound
(`playMangoThud`) at 3 marked trees, not a visible falling-mango prop/pickup — the
same simplification the sack-pile/kirana counter in M3 already uses successfully.
The tractor drive to the baagh isn't gated by any new path system; the baagh sits on
open ground past the field's own track loop, reachable by driving across it like any
other open ground in the village.

## M8 — Sunset: the birthday (ending)

Dayline reaches its warmest point. Whole family gathers on the house roof — Maa,
Pitaji, sister, Dada, the player. Mithai (sweets) laid out, including the jalebi from
M1. Short warm dialogue exchange, then the credits roll.

- Dada: "All of you, making such a fuss over an old man. / Tum sab, ek budhe aadmi ke
  liye itni tayyari."
- Maa: "Every year, Bauji — and every year you say the same thing. / Har saal, Bauji —
  aur har saal yahi kehte ho."
- Sister: "The letter came, the kurta came, and the mangoes — Bhai did everything
  today! / Chitthi aayi, kurta aaya, aur aam bhi — Bhai ne aaj sab kiya!"
- Dada (to player, warmly): "Running all over the village for your old Dada. Come,
  sit — the best seat on the roof is yours tonight. / Apne budhe Dada ke liye poore
  gaon mein daud lagai. Aao, baitho — aaj chhat ki sabse achi jagah tumhari hai."
- Pitaji: "Happy birthday, Bauji." / "Janamdin mubarak ho, Bauji."
- (Closing card, before credits): "Dopahar — one afternoon, one family. / Dopahar — ek
  dopahar, ek parivar."

Implementation note: reuse the house roof space already built for the courtyard/
stairs-to-roof interior (`src/village.js`); this is a staged scene (NPCs placed, a
short fixed dialogue sequence, no new interaction verbs needed) that transitions into
the existing credits screen (`src/credits.js`).

As built (2026-10-19): the ending triggers at the real stairs' own roof landing, not
the whole roof footprint — this game's collision is 2D/height-unaware, so the house's
own walls still block the rest of the roof slab even once elevated (see
`docs/parked.md`'s 2026-10-19 entry). No family NPCs are physically placed up there
(the landing is narrow, ~1.2m wide) — the scene is dialogue-only, narrated rather than
staged with visible characters. It rolls into the existing final end card (which
offers a "Credits" button, same as every other mission's end card), not literally
auto-playing credits the moment the dialogue ends.

---

## Hard rules recap (do not violate in any mission)

- No death, no fire, no alcohol/tobacco/intoxicants in any form.
- No real village names, brands, or wordmarks anywhere (dialogue, signage, docs).
- Zero gameplay at any of the four faith buildings (temple/mandir, etc.) — scenery only.
- Era: nothing that would only exist after ~2015.
- English primary / Hindi secondary in every UI string except painted signboards.
