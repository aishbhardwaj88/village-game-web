# Tripo day — adding the 6 new models

This is for whoever is downloading the finished models from Tripo and putting them
into the game. You don't need to know how to code to do this. Just follow the steps
in order.

## What you're adding

Six files, one for each of these:

1. The tractor
2. The mother character
3. The halwai's stall (the sweet shop building)
4. A neem tree
5. A peepal tree
6. A bush

Right now, each of these is a plain coloured box standing in a row on open ground
near the chowk, with its name floating above it. That's normal — it's there so all
six can be looked at side by side, at the right size, before the real models go in.

## Step 1 — name the files exactly right

When you download each finished model from Tripo, rename it to exactly this
(lowercase, with the underscores, ending in `.glb`):

- `tripo_tractor.glb`
- `tripo_mother.glb`
- `tripo_halwai_kiosk.glb`
- `tripo_tree_neem.glb`
- `tripo_tree_peepal.glb`
- `tripo_bush.glb`

If a name is even slightly different (a space, a capital letter, a missing
underscore), the game will not find it, and the coloured box will stay instead.

## Step 2 — put the files in the right folder

Copy all 6 renamed files into this folder in the project:

```
public/assets/models/
```

Just drop them in next to the files that are already there. Don't put them in a
subfolder, and don't rename the folder.

## Step 3 — look at the result

Ask whoever is running the project to start it up (they'll know the command), or if
you're running it yourself, open a terminal in the project folder and run:

```
npm run dev
```

Then open the link it prints in a web browser, click "Play", and walk (or drive) the
character down to the chowk, south of the bazaar. Look at the row of models.

## What "it worked" looks like

- Each model you dropped in has completely replaced its coloured box — the box and
  its floating name label are both gone.
- Each model is standing the right size next to the others (the tractor is small
  next to the sweet shop; the trees tower over the bush).
- Each one is standing flat on the ground — no floating, no sinking into the dirt.
- Nothing looks shiny, glossy, or plastic-looking. Everything should look matte, like
  cloth, dust, wood, or dulled metal — never like a toy or a mirror.
- Each model is facing the right way (the tractor's nose points forward, not
  backward; the mother character faces forward; the sweet shop's open counter faces
  the viewer).

If all of that is true for a model, it's done — there is nothing else to set up for
it.

## If something looks wrong

**The coloured box is still there instead of the model.**
The file name or folder is wrong. Go back to Step 1 and check the name character by
character (it's case-sensitive), then check it's directly inside
`public/assets/models/`, not in a folder inside that folder.

**The model is there, but it's the wrong size, floating, sunk into the ground, or
facing backwards.**
Tell whoever is technical on the project — this means something about how the model
file itself was exported needs a look, not something you did wrong by dropping it
in. Don't try to fix the size or position yourself; there's nothing to adjust on your
end for this.

**The model looks shiny or plastic-looking.**
This shouldn't happen — the game is supposed to automatically flatten any shine down
to a dull, realistic look the moment the file is dropped in. If you still see
something shiny, tell whoever is technical — that's a real bug worth reporting, not
something to fix yourself.

**Nothing changed at all after dropping the files in.**
Make sure you reloaded the page (or restarted `npm run dev`) after copying the files
in — the game only checks for them when it starts up.

## One more thing

You can drop in some of the 6 files without having all of them ready yet — whichever
ones are missing just keep showing their coloured box, and everything else keeps
working normally. There's no "all or nothing" — add them one at a time as they're
ready.
