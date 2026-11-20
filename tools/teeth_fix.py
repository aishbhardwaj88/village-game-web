# Teeth fix (free): Tripo painted Pitaji's teeth at ~1 texel per mm, so they read as yellow, gappy and
# crooked. This lays a thin skinned patch over the mouth with its own high-res texture: the model's own
# lips/moustache copied front-on, and clean even teeth painted into the teeth band. Shape keys (smile,
# blink) and skin weights are copied from the nearest original vertex so the patch moves with the face.
# usage: blender python teeth_fix.py -- in.glb out.glb ['{"mx":0,"mz":0.8778,"hw":0.0165,"z0":0.8742,"z1":0.8815}']
import bpy, bmesh, math, sys, json, numpy as np, mathutils
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
from PIL import Image
args=sys.argv[sys.argv.index('--')+1:]; src,out=args[0],args[1]
P={"mx":0.0,"hw":0.0165,"z0":0.8742,"z1":0.8815}
if len(args)>2: P.update(json.loads(args[2]))
X0,X1,Z0,Z1=P['mx']-P['hw'],P['mx']+P['hw'],P['z0'],P['z1']
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
sc=bpy.context.scene
for o in list(sc.objects):
    if o.type=='MESH' and len(o.data.vertices)<1000: bpy.data.objects.remove(o)
arm=[o for o in sc.objects if o.type=='ARMATURE'][0]
act=arm.animation_data.action if arm.animation_data else None
if arm.animation_data: arm.animation_data.action=None
for b in arm.pose.bones: b.matrix_basis=mathutils.Matrix()
bpy.context.view_layer.update()
m=[o for o in sc.objects if o.type=='MESH'][0]; me=m.data
mw=m.matrix_world.copy(); inv=mw.inverted()
mat0=me.materials[0]; nt=mat0.node_tree
bsdf=[n for n in nt.nodes if n.type=='BSDF_PRINCIPLED'][0]; base_from=bsdf.inputs['Base Color'].links[0].from_socket
outn=[n for n in nt.nodes if n.type=='OUTPUT_MATERIAL'][0]; old_surface=outn.inputs['Surface'].links[0].from_socket
em=nt.nodes.new('ShaderNodeEmission'); nt.links.new(base_from, em.inputs['Color']); nt.links.new(em.outputs[0], outn.inputs['Surface'])
# other materials (e.g. eye patch) black out of the way: not in view anyway
W=X1-X0; H=Z1-Z0; RW=1024; RH=int(round(RW*H/W))
sc.render.engine='BLENDER_EEVEE_NEXT'; sc.view_settings.view_transform='Standard'
sc.render.resolution_x=RW; sc.render.resolution_y=RH
cam=bpy.data.cameras.new('c'); cam.type='ORTHO'; cam.ortho_scale=W
co=bpy.data.objects.new('c',cam); sc.collection.objects.link(co); sc.camera=co
co.location=((X0+X1)/2,-2,(Z0+Z1)/2); co.rotation_euler=(math.radians(90),0,0)
sc.render.filepath='/tmp/teeth_src.png'; bpy.ops.render.render(write_still=True)
nt.links.new(old_surface, outn.inputs['Surface']); nt.nodes.remove(em)
im=np.asarray(Image.open('/tmp/teeth_src.png').convert('RGB')).astype(np.float32)/255  # row 0 = top
# ---- find the teeth band: per column, the run of pale low-saturation pixels that holds the bright core
from scipy import ndimage
L=im.mean(-1); S=im.max(-1)-im.min(-1)
pale=ndimage.binary_opening((L>0.5)&(S<0.28),iterations=2)
core=(L>0.62)&(S<0.2)
lab,_=ndimage.label(pale)
keep=np.unique(lab[core&(lab>0)]); pale=np.isin(lab,keep)&(lab>0)
topc=np.full(RW,np.nan); botc=np.full(RW,np.nan)
for i in range(RW):
    r=np.where(pale[:,i])[0]
    if len(r)>RH*0.12: topc[i]=r.min(); botc[i]=r.max()
ok=~np.isnan(topc); xi=np.where(ok)[0]
xa,xb=xi.min(),xi.max()
def smooth(a):
    a=np.interp(np.arange(RW),xi,a[ok]); k=int(RW*0.08)|1
    return ndimage.uniform_filter1d(ndimage.median_filter(a,size=k),size=k)
topS=smooth(topc); botS=smooth(botc)
xx1=np.arange(RW); sel=(xx1>=xa)&(xx1<=xb)
topS=np.polyval(np.polyfit(xx1[sel],topS[sel],2),xx1); botS=np.polyval(np.polyfit(xx1[sel],botS[sel],2),xx1)
# the pale run above the teeth is gum/upper lip; teeth take the lower ~80% of it, never more than 0.45 RH tall
topS=np.maximum(topS, botS-0.45*RH)
xc=(xa+xb)/2; hwid=(xb-xa)/2
print('band x',xa,xb,'top',topS[int(xc)],'bot',botS[int(xc)],'img',RW,RH)
# ---- paint the teeth (sRGB)
yy,xx=np.mgrid[0:RH,0:RW].astype(np.float32)
u=(xx-xc)/hwid; au=np.abs(u)
top=topS[None,:]+0*yy; bot=botS[None,:]+0*yy
PM=18; PMT=7  # patch margin around the band (below / above), px
def in_patch(xi,yi):
    xi=min(max(int(xi),0),RW-1); uu=abs((xi-xc)/hwid)
    return uu<=1.14 and topS[xi]-PMT<=yi<=botS[xi]+PM
def patch_w(xi,yi):
    xi=min(max(int(xi),0),RW-1); uu=abs((xi-xc)/hwid)
    d=min(yi-(topS[xi]-PMT), (botS[xi]+PM)-yi, (1.14-uu)*hwid)
    return float(np.clip(d/10.0,0,1))
edges=np.array([0.0,0.30,0.53,0.73,0.88])
dmin=np.min(np.stack([np.abs(au-e) for e in edges]),0)
bh=np.maximum(bot-top,1)
top=top+0.13*bh*np.exp(-(dmin/0.035)**2)        # gum dips between the teeth
bot=bot-0.06*bh*np.exp(-(dmin/0.025)**2)        # softly rounded biting edges
t=np.clip((yy-top)/np.maximum(bot-top,1),0,1)
inband=(yy>=top-3)&(yy<=bot+3)&(au<=1.08)
base=np.array([0.83,0.795,0.735])               # soft natural off-white
col=np.ones((RH,RW,3),np.float32)*base
shade=1-0.22*np.clip(1-t/0.30,0,1)**1.4         # shadow under the upper lip
shade*=1-0.07*np.clip((t-0.82)/0.18,0,1)        # slightly greyer biting edge
col*=shade[...,None]
cw=np.clip((au-0.55)/0.4,0,1)**1.3               # mouth corners fall into warm shadow
col=col*(1-0.75*cw[...,None])+np.array([0.42,0.30,0.27])*(0.75*cw[...,None])
sep=np.zeros_like(u)
for e in edges:
    wdt=0.020 if e==0 else 0.018
    d=np.abs(au-e)
    sep=np.maximum(sep,np.exp(-(d/wdt)**2))
sep*=0.035+0.07*t                               # faint at the gum, a touch more at the biting edge
col*=(1-sep)[...,None]
idx=np.clip(np.digitize(au,edges),0,5)
col*=np.array([1.0,1.0,0.985,0.97,0.96,0.95])[idx][...,None]
rng=np.random.default_rng(3); col*=(1+0.012*ndimage.gaussian_filter(rng.standard_normal((RH,RW)),1.5))[...,None]
fe=np.minimum(np.clip((yy-(top-2))/3.0,0,1),np.clip(((bot+2)-yy)/3.0,0,1))
fe*=np.clip((1.06-au)/0.16,0,1)
fe=np.where(inband,fe,0)
outim=im*(1-fe[...,None])+col*fe[...,None]
Image.fromarray((np.clip(outim,0,1)*255).astype(np.uint8)).save('/tmp/teeth_patch.png')
# ---- patch material
pm=mat0.copy(); pm.name='teeth_patch_mat'; pnt=pm.node_tree
pb=[n for n in pnt.nodes if n.type=='BSDF_PRINCIPLED'][0]
timg=bpy.data.images.load('/tmp/teeth_patch.png'); timg.pack()
tx=pnt.nodes.new('ShaderNodeTexImage'); tx.image=timg; tx.extension='EXTEND'
pnt.links.new(tx.outputs['Color'], pb.inputs['Base Color'])
if pb.inputs['Metallic'].links: pnt.links.remove(pb.inputs['Metallic'].links[0])
pb.inputs['Metallic'].default_value=0
me.materials.append(pm); pmi=len(me.materials)-1
# ---- patch geometry
bm0=bmesh.new(); bm0.from_mesh(me); bm0.transform(mw); bm0.normal_update(); bm0.faces.ensure_lookup_table(); bvh=BVHTree.FromBMesh(bm0)
V=np.array([tuple(mw@v.co) for v in me.vertices])
cand=np.where((np.abs(V[:,0]-(X0+X1)/2)<W)&(V[:,2]>Z0-0.01)&(V[:,2]<Z1+0.01))[0]
yfr=np.percentile(V[cand,1],3); cand=cand[V[cand,1]<yfr+0.02]
kd=KDTree(len(cand))
for n,i in enumerate(cand): kd.insert(mathutils.Vector(V[i]),n)
kd.balance()
keys=me.shape_keys.key_blocks if me.shape_keys else []
KD={}
for kb in keys:
    c=np.zeros(len(me.vertices)*3); kb.data.foreach_get('co',c); KD[kb.name]=c.reshape(-1,3)
basis=np.zeros(len(me.vertices)*3); me.vertices.foreach_get('co',basis); basis=basis.reshape(-1,3)
# tuck the original lips/teeth under the patch interior so the two surfaces never fight (shadow acne)
def img_xy(x,z): return (x-X0)/W*RW, (Z1-z)/H*RH
tuck=np.zeros((len(me.vertices),3))
Ri=inv.to_3x3()
for i in cand:
    xi,yi=img_xy(V[i,0],V[i,2])
    if 0<=xi<RW and 0<=yi<RH and in_patch(xi,yi):
        w=patch_w(xi,yi); w=w*w*(3-2*w)
        tuck[i]=np.array(Ri@mathutils.Vector((0,0.0012*w,0)))
for kb in keys:
    c=np.zeros(len(me.vertices)*3); kb.data.foreach_get('co',c); kb.data.foreach_set('co',(c.reshape(-1,3)+tuck).ravel())
c=np.zeros(len(me.vertices)*3); me.vertices.foreach_get('co',c); me.vertices.foreach_set('co',(c.reshape(-1,3)+tuck).ravel()); me.update()
nloops_orig=len(me.loops)
orig_cn=[tuple(cn.vector) for cn in me.corner_normals]
bm=bmesh.new(); bm.from_mesh(me)
dl=bm.verts.layers.deform.verify(); uvl=bm.loops.layers.uv.active
sk={kb.name: bm.verts.layers.shape.get(kb.name) for kb in keys}
R3=mw.to_3x3()
NX,NZ=192,48; grid={}; pnorm={}
for j in range(NZ+1):
    for i in range(NX+1):
        x=X0+W*i/NX; z=Z0+H*j/NZ
        xi,yi=img_xy(x,z)
        if not in_patch(xi,yi): continue
        hit=bvh.ray_cast(mathutils.Vector((x,-1,z)),mathutils.Vector((0,1,0)),3)
        if hit[0] is None: continue
        f=bm0.faces[hit[2]]; vs=[l.vert for l in f.loops]
        wts=mathutils.interpolate.poly_3d_calc([v.co for v in vs], hit[0])
        nrm=sum((v.normal*w for v,w in zip(vs,wts)), mathutils.Vector()).normalized()
        p=mathutils.Vector((x,hit[0].y-0.00015,z))
        _,n,_=kd.find(p); src_i=cand[n]
        lp=inv@p; v=bm.verts.new(lp)
        for g,wt in [(g.group,g.weight) for g in me.vertices[src_i].groups]: v[dl][g]=wt
        for nmk,lay in sk.items():
            d=KD[nmk][src_i]-basis[src_i]; v[lay]=lp+mathutils.Vector(d)
        grid[(i,j)]=(v,i/NX,j/NZ); pnorm[v]=(Ri@nrm).normalized()
bm.faces.ensure_lookup_table()
newfaces=[]
for j in range(NZ):
    for i in range(NX):
        q=[grid.get((i,j)),grid.get((i+1,j)),grid.get((i+1,j+1)),grid.get((i,j+1))]
        if any(a is None for a in q): continue
        fc=bm.faces.new([a[0] for a in q]); fc.material_index=pmi; fc.smooth=True; newfaces.append(fc)
        for l,a in zip(fc.loops,q): l[uvl].uv=(a[1],a[2])
# per-loop normals: originals keep theirs, patch takes the smooth original surface normal underneath
bm.faces.index_update(); bm.verts.index_update()
patch_loop_n={}
for fc in newfaces:
    for l in fc.loops: patch_loop_n[(fc.index,l.vert.index)]=tuple(pnorm[l.vert])
bm.normal_update(); bm.to_mesh(me); me.update()
cn=[]
pset={(fi):1 for (fi,_) in patch_loop_n}
oi=0
for poly in me.polygons:
    for li in poly.loop_indices:
        if poly.material_index==pmi:
            cn.append(patch_loop_n[(poly.index, me.loops[li].vertex_index)])
        else:
            cn.append(orig_cn[oi]); oi+=1
me.normals_split_custom_set(cn); me.update()
print('teeth patch faces', sum(1 for p in me.polygons if p.material_index==pmi))
if arm.animation_data is not None and act: arm.animation_data.action=act
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_morph=True, export_animations=True, export_skins=True)
print('saved',out)
