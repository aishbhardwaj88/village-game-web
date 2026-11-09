"""world-dump2.json (every object's real top-down footprint, read from the running game) -> compact map-data.json."""
import json, math, re, collections
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
from shapely import STRtree

D = json.load(open('/home/claude/vgame/world-dump2.json'))
V = json.load(open('/home/claude/vmap/village.json'))
NAMES = {p['id']: (p['en'], p['hi']) for p in V['places']}

MOVING = re.compile(r'^(vehicle_|npc_|ambient_life|player_cycle|animals|people|scooters|jeep|trolley|bazaar_life|characterPaint|vehiclePaint|contact_shadows|vendors$|icecream_carts|vehicle_cart)')
def cat(it):
    mn, p, z = it['mn'], it['p'], it['z'] or ''
    top = p.split('/')[0]
    if 'contact_shadow' in p: return None
    if MOVING.match(top) or MOVING.match(z) or mn.startswith(('characterPaint', 'vehiclePaint', 'people_pool')): return 'moving'
    if 'tree' in mn or 'leaves' in mn or mn.startswith('grass'): return 'tree'
    if mn in ('crop', 'sarson', 'cane') or top == 'field' or z == 'sugarcane_belt': return 'crop'
    return 'solid'

PAL = {  # material name -> fill colour (textures are atlases, so colour comes from what the material is)
    'hb_main': '#d9c7a6', 'hb_cmain': '#d9c7a6', 'plaster': '#e2d3b5', 'hb_thatch': '#c9a55a', 'hb_brick': '#b5654a', 'brick': '#b5654a',
    'hb_terracotta': '#c0714f', 'terracotta': '#c0714f', 'hb_metal': '#8f9aa3', 'metal': '#8f9aa3', 'tin': '#9aa6ad', 'hb_tin': '#9aa6ad',
    'sp_steel': '#9aa6ad', 'jute': '#c8ad7a', 'hb_jute': '#c8ad7a', 'wood': '#8a6440', 'hb_wood': '#8a6440', 'map_gates_wood': '#8a6440',
    'tarpaulin': '#4f7fa8', 'sp_blue': '#4f7fa8', 'concrete': '#b9b6ad', 'site_props': '#a89a83', 'hb_props': '#a89a83',
    'shop_goods': '#d39b4a', 'small_shop_goods': '#d39b4a', 'vendor_goods': '#d39b4a', 'signboard': '#e0b84f', 'wayfinding': '#e0b84f',
    'wall_writing': '#d9c7a6', 'hb_decal': '#d9c7a6', 'sp_green': '#5f8f5a', 'sp_red': '#b5503f', 'sp_chalk': '#ece6d6',
    'dip_earth': '#9d8461', 'ground': '#d8c79c', 'village_water': '#6f9fb4', 'lane': '#cbb592', 'hb_net': '#a89a83',
    'laundry_cloth_model': '#c4677a', 'flagpole': '#8f9aa3',
}
def colour(mn, c):
    if mn in PAL: return PAL[mn]
    if c and c.lower() not in ('ffffff', 'fefefe'): return '#' + c
    return '#b3a68c'

def bbox(poly):
    xs = [p[0] for p in poly]; zs = [p[1] for p in poly]
    return min(xs), min(zs), max(xs), max(zs)

# ---- items: dedupe (place_batches copies the zone models) ----------------------------------------
groups = collections.defaultdict(list)
for it in D['items']:
    k = cat(it)
    if k is None: continue
    it['cat'] = k
    groups[k].append(it)
seen = {}
solids = []
for it in sorted(groups['solid'] + groups['moving'], key=lambda i: 0 if i['z'] else 1):
    b = bbox(it['poly'])
    key = (it['mn'], round(b[0] * 2), round(b[1] * 2), round(b[2] * 2), round(b[3] * 2), round(it['y1']))
    if key in seen: continue
    seen[key] = 1
    solids.append(it)
print('solids', len(solids), 'from', len(groups['solid']) + len(groups['moving']))

# ---- trees and crops: cluster many small cards into canopies / field patches -----------------------
def cluster(items, gap, simplify):
    polys = []
    for it in items:
        try:
            p = Polygon(it['poly']) if len(it['poly']) >= 3 else None
            if p is None or not p.is_valid or p.area < 0.01:
                x0, z0, x1, z1 = bbox(it['poly']); p = Polygon([(x0, z0), (x1, z0), (x1, z1), (x0, z1)])
            polys.append((p.buffer(gap / 2, 4), it))
        except Exception: pass
    merged = unary_union([p for p, _ in polys])
    geoms = list(merged.geoms) if hasattr(merged, 'geoms') else [merged]
    tree = STRtree([p for p, _ in polys])
    out = []
    for g in geoms:
        idx = tree.query(g)
        mem = [polys[i][1] for i in idx]
        h = max((m['y1'] for m in mem), default=0)
        zs = collections.Counter(m['z'] or m['p'].split('/')[0] for m in mem).most_common(1)
        mns = collections.Counter(m['mn'] for m in mem).most_common(1)
        shape = g.buffer(-gap / 2 * 0.8).simplify(simplify) if g.area > 1 else g.simplify(simplify)
        if shape.is_empty: shape = g.simplify(simplify)
        for sg in (shape.geoms if hasattr(shape, 'geoms') else [shape]):
            if sg.is_empty or sg.area < 0.05: continue
            out.append({'poly': [[round(x, 1), round(y, 1)] for x, y in sg.exterior.coords[:-1]], 'y1': round(h, 1), 'z': zs[0][0] if zs else '', 'mn': mns[0][0] if mns else '', 'n': len(mem)})
    return out
trees = cluster(groups['tree'], 0.25, 0.2)
crops = cluster(groups['crop'], 1.2, 0.4)
print('trees', len(trees), 'crops', len(crops))

# ---- flats (roads, ground, water, durries): union triangles per material, keep real outline --------
flat_by = collections.defaultdict(list)
for f in D['flats']:
    t = f['tri']
    for i in range(0, len(t), 6):
        flat_by[(f['mn'], f['z'] or f['p'].split('/')[0], f['y'])].append(Polygon([(t[i], t[i + 1]), (t[i + 2], t[i + 3]), (t[i + 4], t[i + 5])]))
flats = []
dup = set()
for (mn, z, y), tris in flat_by.items():
    u = unary_union([p.buffer(0.02, 1) for p in tris if p.is_valid])
    if mn == 'lane': u = u.buffer(2.0, 6).buffer(-4.0, 6).buffer(2.0, 6).simplify(0.25)  # the lane mesh is built on a 1 m grid; round off the stair-steps
    else: u = u.simplify(0.08)
    if u.is_empty: continue
    b = tuple(round(v) for v in u.bounds)
    if (mn, b) in dup: continue
    dup.add((mn, b))
    for g in (u.geoms if hasattr(u, 'geoms') else [u]):
        if g.is_empty or g.area < 0.2: continue
        rings = [[[round(x, 1), round(yy, 1)] for x, yy in g.exterior.coords[:-1]]] + [[[round(x, 1), round(yy, 1)] for x, yy in r.coords[:-1]] for r in g.interiors]
        flats.append({'mn': mn, 'z': z, 'y': y, 'rings': rings, 'area': round(g.area)})
print('flat polys', len(flats))

# ---- encode ------------------------------------------------------------------------------------------
labels = []; lab_ix = {}
def L(s):
    if s not in lab_ix: lab_ix[s] = len(labels); labels.append(s)
    return lab_ix[s]
cols = []; col_ix = {}
def C(c):
    if c not in col_ix: col_ix[c] = len(cols); cols.append(c)
    return col_ix[c]
q = lambda v: int(round(v * 10))
def enc_poly(poly):
    out = [len(poly)]
    for x, z in poly: out += [q(x), q(z)]
    return out

WORD = {'hb_main': 'Wall or roof', 'hb_cmain': 'Wall or roof', 'hb_thatch': 'Thatch roof', 'hb_brick': 'Brick', 'brick': 'Brick', 'hb_metal': 'Metal', 'metal': 'Metal',
  'tin': 'Tin sheet', 'hb_tin': 'Tin sheet', 'jute': 'Jute or charpai', 'hb_jute': 'Jute or charpai', 'wood': 'Wooden', 'hb_wood': 'Wooden', 'tarpaulin': 'Tarpaulin awning',
  'concrete': 'Concrete', 'plaster': 'Plastered wall', 'site_props': 'Prop', 'hb_props': 'Prop', 'shop_goods': 'Shop goods', 'signboard': 'Signboard', 'wayfinding': 'Signpost'}
PL = [(p['id'], NAMES.get(p['id'], (p['id'],))[0], p['x'], p['z']) for p in D['places']]
def near(x, z):
    best = min(PL, key=lambda q: (q[2]-x)**2 + (q[3]-z)**2)
    return best[1], math.hypot(best[2]-x, best[3]-z)
def friendly(it):
    if not it.get('z') and it['p'].split('/')[0] in ('place_batches', 'village_static_merged', 'village_kit_houses', 'background_houses'):
        x0, z0, x1, z1 = bbox(it['poly']); n, dist = near((x0+x1)/2, (z0+z1)/2)
        w = WORD.get(it['mn'], it['mn'].replace('_', ' ').capitalize() or 'Object')
        kind = 'house' if it['p'].startswith(('village_kit_houses', 'background_houses')) else ''
        return f"{w}{', ' + kind if kind else ''}, {'at' if dist < 25 else 'near'} {n} | {it['p']}"

    z = it.get('z') or ''
    p = it.get('p') or ''
    return (z + ' | ' + p) if z else p

S = []
for it in solids:
    layer = 1 if it['cat'] == 'moving' else 0
    S += [layer, C(colour(it['mn'], it.get('c'))), L(friendly(it)), L(it['mn']), q(it['y0']), q(it['y1'])] + enc_poly(it['poly'])
T = []
def nm(t, word):
    x0, z0, x1, z1 = bbox(t['poly']); n, dist = near((x0+x1)/2, (z0+z1)/2)
    return f"{word}, {'at' if dist < 25 else 'near'} {n} | {t['z']}"
for t in trees: T += [q(t['y1']), L(nm(t, 'Trees' if t['n'] > 400 else 'Tree'))] + enc_poly(t['poly'])
CR = []
for c in crops: CR += [L(nm(c, {'sarson': 'Sarson', 'cane': 'Sugarcane'}.get(c['mn'], 'Crop'))), C(colour(c['mn'], None) if c['mn'] in PAL else {'sarson': '#d8c34a', 'cane': '#7fa25a', 'crop': '#a8b866'}.get(c['mn'], '#a8b866'))] + enc_poly(c['poly'])
F = []
for f in sorted(flats, key=lambda f: (f['y'], -f['area'])):
    F += [C(colour(f['mn'], None)), L((f['z'] or '') + ' | ' + f['mn']), q(f['y']), len(f['rings'])]
    for r in f['rings']: F += enc_poly(r)

places = []
for p in D['places']:
    a = D['anchors'].get(p['id'])
    ry = a['ry'] if a else 0
    en, hi = NAMES.get(p['id'], (p['id'], ''))
    places.append({'id': p['id'], 'en': en, 'hi': hi, 'x': p['x'], 'z': p['z'], 'fx': round(-math.sin(ry), 3), 'fz': round(-math.cos(ry), 3)})
known = {p['id'] for p in places}
for k, a in D['anchors'].items():
    if k in known: continue
    en, hi = NAMES.get(k, (k.replace('yard_', '').replace('_', ' '), ''))
    places.append({'id': k, 'en': en[:1].upper() + en[1:], 'hi': hi, 'x': a['x'], 'z': a['z'], 'fx': round(-math.sin(a['ry']), 3), 'fz': round(-math.cos(a['ry']), 3), 'minor': 1})

COL = []
for b in D['colliders']: COL += [q(b[0]), q(b[1]), q(b[2]), q(b[3])]

allx = [v for p in places for v in [p['x']]]
out = {'colors': cols, 'labels': labels, 'solids': S, 'trees': T, 'crops': CR, 'flats': F, 'colliders': COL, 'places': places,
       'stats': {'solids': len(solids), 'trees': len(trees), 'crops': len(crops), 'flats': len(flats), 'colliders': len(D['colliders']), 'zones': len(D['zones'])}}
s = json.dumps(out, separators=(',', ':'))
open('/home/claude/vgame/map-data.json', 'w').write(s)
print('bytes', len(s), out['stats'])
