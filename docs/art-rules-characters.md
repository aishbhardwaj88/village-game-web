# Character art rules (locked 19 Sep 2026)

## The style decision
Characters are STYLISED FORMS with REAL MATERIALS. The world stays grounded realism.
We are not attempting photoreal faces. Tripo cannot deliver them and a half-real face is
the uncanny one. Declaring the style is the decision, not a compromise.

## Reference images (Characters V1/people/_real/)
Reference images exist only to carry THREE things:
1. the character design (face, proportions, clothes, colours, props)
2. a clean A-pose with EMPTY HANDS (props are separate models)
3. a sharp tall portrait on a plain mid-grey background

They do NOT define material quality. Gemini cannot produce matte skin: every attempt
either adds gloss or loses detail. Do not spend credits fighting it.

## MATTE IS ENFORCED IN THE ENGINE, NOT IN THE IMAGE  <-- the rule
Whatever the reference or the Tripo texture looks like, the game overrides it on import:
- skin material: roughness >= 0.75, metalness 0, no clearcoat, no sheen
- cotton, wool, jute, canvas, hair: roughness >= 0.8, metalness 0
- leather: roughness >= 0.6
- painted wood and plaster: roughness >= 0.7
- ONLY metal and glass may be reflective: metal roughness 0.25-0.45 with metalness 1,
  glass its own transparent material
- no character or cloth material may ever have an environment reflection strong enough
  to read as plastic
Apply this as a single enforcement pass over every loaded model, so no imported asset
can bypass it. A material that arrives shinier than these limits is clamped, not trusted.

## Props
Anything a character holds (pot, tray, book, bag, tool, kadhai) is its own model,
attached at a hand bone. Never baked into the body.

## Camera
Mid-distance always. Never closer than 3 m to a face. No cutscene close-ups.
