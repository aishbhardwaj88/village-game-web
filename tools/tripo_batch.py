#!/usr/bin/env python3
"""
tripo_batch.py — turn a character's four view images into a rigged-ready .glb via the Tripo API.

Usage (from the "Village nostalgia" folder):
    python3 tools/tripo_batch.py postman            # generate + rig check
    python3 tools/tripo_batch.py postman --rig      # also auto-rig (biped) and save the rigged .glb
    python3 tools/tripo_batch.py postman --rig-only # rig the LAST generated model only (no new generation, ~30 cr)
    python3 tools/tripo_batch.py --all              # every character that has a 3d_inputs set
    python3 tools/tripo_batch.py --balance          # just print remaining API credits
    add --v2 to any command to use the older server (needed while credits sit in the Free Wallet)
    add --views=front,back to ignore other view files present in the folder
    add --ultra for Tripo's Ultra geometry (+20 credits) — off by default, polycount is reduced locally anyway
    add --texstd for standard texture quality (-10 credits) — background characters only

Inputs:  any folder named 3d_inputs under "Characters V1" containing
         <name>_front.png (required), <name>_left.png, <name>_right.png, <name>_back.png
Outputs: VillageGame/Assets/Characters3D/<slug>.glb        (what the Unity swap pipeline reads)
         <that 3d_inputs folder>/<name>_tripo_preview.png    (Tripo's own render, for a first look)
         tools/tripo_runs/<name>_<timestamp>.json            (full task log, task ids, credit info)

Needs only Python 3 — no extra packages. Reads TRIPO_API_KEY from the .env file in the repo root.
"""
import json, mimetypes, os, sys, time, uuid, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API_V3 = "https://openapi.tripo3d.ai/v3"
API_V2 = "https://api.tripo3d.ai/v2/openapi"   # older server; retired 1 Nov 2026, but the Free Wallet lives here
API = API_V3
V2 = False
MODEL_VERSION = "v3.1-20260211"
OUT_DIR = ROOT / "VillageGame" / "Assets" / "Characters3D"
RUNS_DIR = ROOT / "tools" / "tripo_runs"
VIEW_ORDER = ["front", "left", "back", "right"]


def load_key():
    env = ROOT / ".env"
    if not env.exists():
        sys.exit("No .env file found in the repo root (expected a line TRIPO_API_KEY=...)")
    for line in env.read_text().splitlines():
        if line.startswith("TRIPO_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit(".env exists but has no TRIPO_API_KEY= line")


KEY = None
ULTRA = False      # --ultra  : geometry_quality=detailed (+20 credits)
TEX_STD = False    # --texstd : texture_quality=standard (-10 credits), for background characters


def call(method, path, body=None, files=None):
    url = f"{API}{path}"
    headers = {"Authorization": f"Bearer {KEY}",
               "User-Agent": "Mozilla/5.0 (Macintosh) village-batch/1.0",
               "Accept": "application/json"}
    data = None
    if files:
        boundary = uuid.uuid4().hex
        parts = []
        for field, fpath in files.items():
            ctype = mimetypes.guess_type(fpath)[0] or "application/octet-stream"
            parts.append(
                f"--{boundary}\r\nContent-Disposition: form-data; name=\"{field}\"; "
                f"filename=\"{Path(fpath).name}\"\r\nContent-Type: {ctype}\r\n\r\n".encode()
                + Path(fpath).read_bytes() + b"\r\n")
        parts.append(f"--{boundary}--\r\n".encode())
        data = b"".join(parts)
        headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
    elif body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            payload = json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code} on {method} {path}: {e.read().decode()[:500]}")
    if payload.get("code") != 0:
        sys.exit(f"Tripo error on {method} {path}: {json.dumps(payload)[:500]}")
    return payload["data"]


def balance():
    d = call("GET", "/user/balance" if V2 else "/account/balance")
    print(f"Credits: {d.get('balance')} available, {d.get('frozen')} reserved by running tasks")
    return d


def upload(path):
    if V2:
        d = call("POST", "/upload", files={"file": str(path)})
        return d["image_token"]
    d = call("POST", "/files", files={"file": str(path)})
    return d["file_token"]


def wait(task_id, label):
    last = None
    while True:
        d = call("GET", f"/task/{task_id}" if V2 else f"/tasks/{task_id}")
        status, prog = d.get("status"), d.get("progress")
        if (status, prog) != last:
            print(f"  [{label}] {status} {prog}%")
            last = (status, prog)
        if status == "success":
            return d
        if status in ("failed", "cancelled", "banned", "expired", "unknown"):
            sys.exit(f"  [{label}] ended with status {status}: {json.dumps(d)[:600]}")
        time.sleep(8)


def download(url, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh) village-batch/1.0"})
    with urllib.request.urlopen(req, timeout=300) as r, open(dest, "wb") as f:
        f.write(r.read())
    print(f"  saved {dest.relative_to(ROOT)} ({dest.stat().st_size // 1024} KB)")


def make_matte(glb_path):
    """Tripo ships metallic=1 + a roughness map; many viewers/engines read that as shiny plastic.
    Force the house look: non-metallic, rough (matte-satin), keep the normal map for sculpt detail."""
    import struct
    raw = Path(glb_path).read_bytes()
    magic, version, total = struct.unpack_from("<III", raw, 0)
    if magic != 0x46546C67:
        return False
    jlen, jtype = struct.unpack_from("<II", raw, 12)
    js = json.loads(raw[20:20 + jlen].decode())
    rest = raw[20 + jlen:]
    for m in js.get("materials", []):
        pbr = m.setdefault("pbrMetallicRoughness", {})
        pbr["metallicFactor"] = 0.0
        pbr["roughnessFactor"] = 0.92
        pbr.pop("metallicRoughnessTexture", None)
    jb = json.dumps(js, separators=(",", ":")).encode()
    jb += b" " * ((4 - len(jb) % 4) % 4)
    out = struct.pack("<III", magic, version, 12 + 8 + len(jb) + len(rest)) + struct.pack("<II", len(jb), jtype) + jb + rest
    Path(glb_path).write_bytes(out)
    return True


def find_inputs(name):
    for folder in (ROOT / "Characters V1").rglob("3d_inputs"):
        if (folder / f"{name}_front.png").exists():
            return folder
    return None


def slug(name):
    return "".join(c for c in name.lower() if c.isalnum())


def run_character(name, do_rig=False, views=None):
    folder = find_inputs(name)
    if not folder:
        print(f"!! no 3d_inputs folder with {name}_front.png — skipping")
        return
    print(f"\n=== {name}  (inputs: {folder.relative_to(ROOT)})")
    log = {"name": name, "started": time.strftime("%Y-%m-%d %H:%M:%S"), "model_version": MODEL_VERSION}

    inputs = []
    wanted = views or VIEW_ORDER
    for view in VIEW_ORDER:
        p = folder / f"{name}_{view}.png"
        if view not in wanted:
            print(f"  {view}: skipped (--views)")
            continue
        if p.exists():
            print(f"  uploading {view} ...")
            inputs.append({view: upload(p)})
        else:
            print(f"  {view}: not provided")
    log["views_provided"] = [list(d)[0] for d in inputs]

    # Credits (v3.1 multiview): base 30 · +20 geometry_quality=detailed (Ultra) · +10 texture_quality=detailed.
    # Polycount is NOT billed and is reduced locally for free, so Ultra is opt-in (--ultra) and
    # detailed texture is the default for anchors/named NPCs; use --texstd for background characters.
    common = {"texture": True, "pbr": True,
              "texture_quality": "standard" if TEX_STD else "detailed",
              "geometry_quality": "detailed" if ULTRA else "standard",
              "orientation": "align_image"}
    print("  requesting multiview_to_model ...")
    if V2:
        by_view = {list(d)[0]: list(d.values())[0] for d in inputs}
        files = [{"type": "png", "file_token": by_view[v]} if v in by_view else {"type": "png", "file_token": None}
                 for v in VIEW_ORDER]
        body = {"type": "multiview_to_model", "files": files, "model_version": MODEL_VERSION, **common}
        gen_id = call("POST", "/task", body=body)["task_id"]
    else:
        body = {"inputs": inputs, "model": MODEL_VERSION, **common}
        gen_id = call("POST", "/generation/multiview-to-model", body=body)["task_id"]
    log["generate_task_id"] = gen_id
    result = wait(gen_id, "generate")
    out = result.get("output", {})
    log["generate_output"] = out

    model_url = (out.get("model_url") or out.get("pbr_model_url") or out.get("base_model_url")
                 or out.get("pbr_model") or out.get("model") or out.get("base_model"))
    if not model_url:
        sys.exit(f"  no model url in output: {json.dumps(out)[:600]}")
    raw_dir = folder.parent / "3d_outputs_raw"
    download(model_url, raw_dir / f"{name}_tripo_raw.glb")          # untouched original, kept for the record
    import shutil
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(raw_dir / f"{name}_tripo_raw.glb", OUT_DIR / f"{slug(name)}.glb")
    if make_matte(OUT_DIR / f"{slug(name)}.glb"):
        print(f"  applied matte material fix to {slug(name)}.glb (non-metallic, roughness 0.92)")
    preview = out.get("rendered_image_url") or out.get("rendered_image")
    if preview:
        download(preview, folder / f"{name}_tripo_preview.png")
    log["credits_consumed_generate"] = result.get("credits_consumed")

    print("  rig check ...")
    if V2:
        chk_id = call("POST", "/task", body={"type": "animate_prerigcheck", "original_model_task_id": gen_id})["task_id"]
    else:
        chk_id = call("POST", "/animations/rig-check", body={"input": gen_id})["task_id"]
    chk = wait(chk_id, "rig-check")
    riggable = chk.get("output", {}).get("riggable")
    rig_type = chk.get("output", {}).get("rig_type")
    log["riggable"], log["rig_type"] = riggable, rig_type
    print(f"  riggable: {riggable} (recommended rig: {rig_type})")

    if do_rig and riggable:
        print("  auto-rig (biped) ...")
        if V2:
            rig_id = call("POST", "/task", body={"type": "animate_rig", "original_model_task_id": gen_id,
                                                  "out_format": "glb", "rig_type": "biped", "spec": "mixamo"})["task_id"]
        else:
            rig_id = call("POST", "/animations/rig", body={
                "input": gen_id, "model": "v1.0-20240301", "rig_type": "biped",
                "spec": "mixamo", "out_format": "glb"})["task_id"]
        rig = wait(rig_id, "rig")
        rig_url = rig.get("output", {}).get("model_url") or rig.get("output", {}).get("model")
        log["rig_task_id"] = rig_id
        if rig_url:
            download(rig_url, OUT_DIR / f"{slug(name)}.glb")   # rigged version replaces the static one
            make_matte(OUT_DIR / f"{slug(name)}.glb")
            log["rigged"] = True

    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    (RUNS_DIR / f"{name}_{time.strftime('%Y%m%d_%H%M%S')}.json").write_text(json.dumps(log, indent=2))
    print(f"  done: {name}")



def rig_only(name):
    """Rig an already-generated model (no new generation, ~30 credits). Uses the newest run log's task id."""
    import glob
    logs = sorted(glob.glob(str(RUNS_DIR / f"{name}_*.json")))
    if not logs:
        sys.exit(f"No run log for {name} in {RUNS_DIR}")
    prev = json.load(open(logs[-1]))
    gen_id = prev.get("generate_task_id")
    if not gen_id:
        sys.exit("Run log has no generate_task_id")
    print(f"[{name}] rig-only from task {gen_id}  (log: {Path(logs[-1]).name})")
    print(f"  credits before: {balance()}")
    if V2:
        rig_id = call("POST", "/task", body={"type": "animate_rig", "original_model_task_id": gen_id,
                                              "out_format": "glb", "rig_type": "biped", "spec": "mixamo"})["task_id"]
    else:
        rig_id = call("POST", "/animations/rig", body={"input": gen_id, "model": "v1.0-20240301",
                                                        "rig_type": "biped", "spec": "mixamo", "out_format": "glb"})["task_id"]
    rig = wait(rig_id, "rig")
    rig_url = rig.get("output", {}).get("model_url") or rig.get("output", {}).get("model")
    if not rig_url:
        sys.exit(f"Rig finished but no model url in output: {rig.get('output')}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    static = OUT_DIR / f"{slug(name)}.glb"
    if static.exists():
        static.rename(OUT_DIR / f"{slug(name)}_static.glb")
    dest = OUT_DIR / f"{slug(name)}.glb"
    download(rig_url, dest)
    make_matte(dest)
    prev["rig_task_id"] = rig_id
    prev["rigged"] = True
    prev["rig_spec"] = "mixamo"
    stamp = time.strftime("%Y%m%d_%H%M%S")
    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    json.dump(prev, open(RUNS_DIR / f"{name}_{stamp}_rig.json", "w"), indent=2)
    print(f"  rigged glb -> {dest}  (mixamo bone names)")
    print(f"  credits after: {balance()}")

def main():
    global KEY, API, V2
    KEY = load_key()
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    global ULTRA, TEX_STD
    ULTRA, TEX_STD = "--ultra" in flags, "--texstd" in flags
    if "--v2" in flags:
        API, V2 = API_V2, True
        print("Using the older Tripo server (v2) -- this is where the Free Wallet credits are spent")
    balance()
    if "--balance" in flags and not args:
        return
    if "--all" in flags:
        names = sorted({p.name[:-len("_front.png")] for p in (ROOT / "Characters V1").rglob("3d_inputs/*_front.png")})
        print(f"Characters with inputs: {', '.join(names)}")
    else:
        names = args
    if not names:
        sys.exit("Give a character name (e.g. postman), or --all")
    views = None
    for f in flags:
        if f.startswith("--views="):
            views = [v.strip() for v in f.split("=",1)[1].split(",") if v.strip()]
    for n in names:
        if "--rig-only" in flags:
            rig_only(n)
        else:
            run_character(n, do_rig="--rig" in flags, views=views)
    balance()


if __name__ == "__main__":
    main()
