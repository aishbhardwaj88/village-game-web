# Eye patch v2: Tripo carves eyelids/lashes as thin flaps that stick out of the face; seen from below or
# above, their stretched undersides read as grey jagged lids, thick liner bands and hooded eyes.
# Fix (free): push the flaps behind the skin and lay a smooth, skinned patch over each eye that carries a
# clean front-on copy of the model's own painted eye. Blink key is rebuilt on the patch.
import bpy, bmesh, math, sys, json, numpy as np, mathutils
from mathutils.bvhtree import BVHTree
from scipy import ndimage
args=sys.argv[sys.argv.index('--')+1:]
src,out,name=args[0],args[1],args[2]; eyes=json.loads(args[3])
P=json.loads(args[4]) if len(args)>4 else {}
WX=P.get('wx',0.42); WT=P.get('wt',0.20); WB=P.get('wb',0.22); BULGE=P.get('bulge',0.8)/1000; TUCK=P.get('tuck',1.2)/1000
GLASSES=P.get('glasses',0.010)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
sc=bpy.context.scene
for o in list(sc.objects):
    if o.type=='MESH' and len(o.data.vertices)<1000: bpy.data.objects.remove(o)
arm=[o for o in sc.objects if o.type=='ARMATURE'][0]
act=arm.animation_data.action if arm.animation_data else None
if arm.animation_data: arm.animation_data.action=None
for b in arm.pose.bones: b.matrix_basis=mathutils.Matrix()
bpy.context.view_layer.update()
m=[o for o in sc.objects if o.type=='MESH'][0]; me=m.data
mw=m.matrix_world.copy(); inv=mw.inverted(); Ri=inv.to_3x3()
cx,zc,sz,res=map(float,open(name+'_head.txt').read().split()); s=sz/res
E=[[cx+(p[0]-res/2)*s, zc-(p[1]-res/2)*s] for p in eyes]
D=abs(E[1][0]-E[0][0])
V=np.array([tuple(mw@v.co) for v in me.vertices])
bm0=bmesh.new(); bm0.from_mesh(me); bm0.transform(mw); bvh=BVHTree.FromBMesh(bm0)
def front_y(x,z):
    hit=bvh.ray_cast(mathutils.Vector((x,-1.0,z)),mathutils.Vector((0,1,0)),3.0)
    return hit[0].y if hit[0] else np.nan
# --- emission setup for front-on renders of the painted face
mat0=me.materials[0]; nt=mat0.node_tree
bsdf=[n for n in nt.nodes if n.type=='BSDF_PRINCIPLED'][0]; base_from=bsdf.inputs['Base Color'].links[0].from_socket
outn=[n for n in nt.nodes if n.type=='OUTPUT_MATERIAL'][0]; old_surface=outn.inputs['Surface'].links[0].from_socket
em=nt.nodes.new('ShaderNodeEmission'); nt.links.new(base_from, em.inputs['Color']); nt.links.new(em.outputs[0], outn.inputs['Surface'])
sc.render.engine='BLENDER_EEVEE_NEXT'; sc.view_settings.view_transform='Standard'; sc.eevee.taa_render_samples=4
TW=768; HM=max(WT,WB); TH=int(round(TW*HM/WX)); TH+=TH%2
sc.render.resolution_x=TW; sc.render.resolution_y=TH
cam=bpy.data.cameras.new('c'); cam.type='ORTHO'
co=bpy.data.objects.new('c',cam); sc.collection.objects.link(co); sc.camera=co
def render_eye(ex,ez,k,tag):
    hh=max(WT,WB)*D; cam.ortho_scale=2*WX*D   # width; height = width/2
    co.location=(ex,-2,ez); co.rotation_euler=(math.radians(90),0,0)
    sc.render.filepath=f'/tmp/{name}_{tag}{k}.png'; bpy.ops.render.render(write_still=True)
    img=bpy.data.images.load(sc.render.filepath); return np.array(img.pixels[:],dtype=np.float32).reshape(TH,TW,4)
# re-centre each eye on its pupil (darkest iris-sized blob near the guess)
for k in range(2):
    px=render_eye(E[k][0],E[k][1],k,'probe')
    lum=px[...,:3].mean(-1); sm=ndimage.uniform_filter(lum, size=int(TW*0.06))
    yy,xx=np.mgrid[0:TH,0:TW]; pen=((xx-TW/2)/(TW*0.35))**2+((yy-TH/2)/(TH*0.45))**2
    j,i=np.unravel_index(np.argmin(sm+0.15*pen),sm.shape)
    E[k][0]+= (i-TW/2)/TW*(2*WX*D); E[k][1]+= (j-TH/2)/TH*(2*HM*D)   # rows bottom-first: +j = up
print('eyes',[(round(a,4),round(b,4)) for a,b in E])
atlas=np.zeros((TH*2,TW,4),dtype=np.float32)
for k,(ex,ez) in enumerate(E): atlas[(1-k)*TH:(2-k)*TH]=render_eye(ex,ez,k,'eye')
nt.links.new(old_surface, outn.inputs['Surface']); nt.nodes.remove(em)
eyeimg=bpy.data.images.new(name+'_eyes',TW,TH*2,alpha=False); eyeimg.pixels=atlas.ravel()
eyeimg.filepath_raw=f'/tmp/{name}_eyes.png'; eyeimg.file_format='PNG'; eyeimg.save(); eyeimg.pack()
pm=mat0.copy(); pm.name=name+'_eyes_mat'; pnt=pm.node_tree
pb=[n for n in pnt.nodes if n.type=='BSDF_PRINCIPLED'][0]
tex=pnt.nodes.new('ShaderNodeTexImage'); tex.image=eyeimg
pnt.links.new(tex.outputs['Color'], pb.inputs['Base Color'])
# the patch UVs index the eye atlas, so drop every other map (they'd sample the wrong spots)
for inp in ['Metallic','Roughness','Normal','Alpha','Emission Color','Specular Tint','Coat Normal']:
    if inp in pb.inputs and pb.inputs[inp].links: pnt.links.remove(pb.inputs[inp].links[0])
pb.inputs['Metallic'].default_value=0; pb.inputs['Roughness'].default_value=bsdf.inputs['Roughness'].default_value
for n in list(pnt.nodes):
    if n.type=='TEX_IMAGE' and n.name!=tex.name: pnt.nodes.remove(n)
me.materials.append(pm); pmi=len(me.materials)-1
# --- smooth skin depth map per eye (flaps removed by an opening, then blurred)
G=0.0005
maps=[]
for ex,ez in E:
    xs=np.arange(ex-0.7*D, ex+0.7*D, G); zs=np.arange(ez-0.42*D, ez+0.42*D, G)
    Y=np.array([[front_y(x,z) for x in xs] for z in zs])
    raw=Y.copy(); Y=np.where(np.isnan(Y), np.nanmax(Y), Y)
    r=int(0.003/G)
    op=ndimage.grey_closing(Y, size=(2*r+1,2*r+1))   # closing on depth (y grows backwards) removes thin forward flaps
    sm=ndimage.gaussian_filter(op, sigma=P.get('blur',0.001)/G)
    cl=ndimage.gaussian_filter(op, sigma=0.6)
    maps.append((xs,zs,cl,sm))
def sample(arr,xs,zs,x,z):
    fi=(x-xs[0])/G; fj=(z-zs[0])/G
    return ndimage.map_coordinates(arr,[[fj],[fi]],order=1,mode='nearest')[0]
def rnorm(dx,dz): return math.sqrt((dx/(WX*D))**2+(dz/((WT if dz>0 else WB)*D))**2)
# --- tuck the original eye-window geometry behind the smooth skin
delta=np.zeros_like(V)
for (ex,ez),(xs,zs,raw,sm) in zip(E,maps):
    for i in np.where((np.abs(V[:,0]-ex)<WX*D)&(np.abs(V[:,2]-ez)<max(WT,WB)*D))[0]:
        dx=V[i,0]-ex; dz=V[i,2]-ez; r=rnorm(dx,dz)/0.85   # tuck stays inside the patch, so no see-through slit at its edge
        if r>=1: continue
        ys=sample(sm,xs,zs,V[i,0],V[i,2])
        if V[i,1]<ys-GLASSES or V[i,1]>ys+0.02: continue   # glasses in front / back of head
        w=min(1,(1-r)/0.3); w=w*w*(3-2*w)
        yc=sample(raw,xs,zs,V[i,0],V[i,2])   # 'raw' here is the flap-free (closed) depth
        if V[i,1]<yc-0.0003:                  # a flap in front of the skin: always tuck fully
            delta[i,1]=max(V[i,1],max(yc,ys)+TUCK)-V[i,1]
        else:
            delta[i,1]=(max(V[i,1],ys+TUCK)-V[i,1])*w
L=np.array([tuple(Ri@mathutils.Vector(d)) for d in delta])
keys=me.shape_keys.key_blocks if me.shape_keys else []
for kb in keys:
    c=np.zeros(len(me.vertices)*3); kb.data.foreach_get('co',c); kb.data.foreach_set('co',(c.reshape(-1,3)+L).ravel())
c=np.zeros(len(me.vertices)*3); me.vertices.foreach_get('co',c); me.vertices.foreach_set('co',(c.reshape(-1,3)+L).ravel()); me.update()
# --- patches: elliptical polar grid
headg=[g for g in m.vertex_groups if g.name.lower().endswith('head')][0]
orig_cn=[tuple(c.vector) for c in me.corner_normals]
# smooth original normals (local space) for the patch edges: from the untouched source mesh
bm0.normal_update(); bm0.faces.ensure_lookup_table()
pnorm={}
bm=bmesh.new(); bm.from_mesh(me)
dl=bm.verts.layers.deform.verify(); uvl=bm.loops.layers.uv.active
sk={kb.name: bm.verts.layers.shape.get(kb.name) for kb in keys}
NR,NA=26,96; sD=D/0.052
for k,((ex,ez),(xs,zs,raw,sm)) in enumerate(zip(E,maps)):
    def mk(x,z):
        dx=x-ex; dz=z-ez; r=rnorm(dx,dz)
        w=min(1,(1-r)/0.3); w=w*w*(3-2*w)
        yo=sample(raw,xs,zs,x,z); ys=sample(sm,xs,zs,x,z)
        if np.isnan(yo): yo=ys
        ro=math.sqrt((dx/(0.27*D))**2+(dz/(0.115*D))**2)
        off=-0.0002
        y=yo*(1-w)+(ys-BULGE*max(0,1-ro*ro))*w+off
        v=bm.verts.new(inv@mathutils.Vector((x,y,z))); v[dl][headg.index]=1.0
        # shading normal: the closed skin surface's gradient in the core, the real skin normal at the edge
        e=0.0006
        gx=(sample(raw,xs,zs,x+e,z)-sample(raw,xs,zs,x-e,z))/(2*e); gz=(sample(raw,xs,zs,x,z+e)-sample(raw,xs,zs,x,z-e))/(2*e)
        ncore=mathutils.Vector((gx,-1.0,gz)).normalized()
        hit=bvh.ray_cast(mathutils.Vector((x,-1.0,z)),mathutils.Vector((0,1,0)),3.0)
        nedge=ncore
        if hit[0] is not None:
            f0=bm0.faces[hit[2]]; vs=[l.vert for l in f0.loops]
            wts=mathutils.interpolate.poly_3d_calc([q.co for q in vs], hit[0])
            nn=sum((q.normal*w0 for q,w0 in zip(vs,wts)), mathutils.Vector())
            if nn.length>0 and nn.normalized().y<-0.2: nedge=nn.normalized()
        we=min(1,max(0,(r-0.6)/0.4)); we=we*we*(3-2*we)
        pnorm[v]=(Ri@(ncore*(1-we)+nedge*we)).normalized()
        zl=ez-0.0035*sD; zt=ez+0.010*sD; hw=max(0,1-abs(dx)/(0.020*sD)); hw=hw*hw*(3-2*hw); bz=z
        if zl<=z<=zt:
            t=(z-zl)/(zt-zl); t2=max(0,(t-0.45)/0.55); bz=z+((zl+t2*(zt-zl))-z)*hw
        for nmk,lay in sk.items(): v[lay]=inv@mathutils.Vector((x,y,bz if nmk=='blink' else z))
        u=0.5+dx/(2*WX*D); vv=0.5+dz/(2*HM*D)
        return (v,u,vv)
    cen=mk(ex,ez); rings=[]
    for a in range(1,NR+1):
        t=a/NR; ring=[]
        for b in range(NA):
            th=2*math.pi*b/NA; dzs=WT if math.sin(th)>0 else WB
            ring.append(mk(ex+t*WX*D*math.cos(th), ez+t*dzs*D*math.sin(th)))
        rings.append(ring)
    def face(q):
        fc=bm.faces.new([a[0] for a in q]); fc.material_index=pmi; fc.smooth=True
        for lp,a in zip(fc.loops,q): lp[uvl].uv=(a[1], a[2]*0.5+(0.5 if k==0 else 0.0))
    for b in range(NA): face([cen,rings[0][b],rings[0][(b+1)%NA]])
    for a in range(NR-1):
        for b in range(NA): face([rings[a][b],rings[a+1][b],rings[a+1][(b+1)%NA],rings[a][(b+1)%NA]])
bm.normal_update(); bm.faces.index_update(); bm.verts.index_update()
patch_n={}
for fc in bm.faces:
    if fc.material_index==pmi:
        for l in fc.loops: patch_n[(fc.index,l.vert.index)]=tuple(pnorm[l.vert])
bm.to_mesh(me); me.update()
cn=[]; oi=0
for poly in me.polygons:
    for li in poly.loop_indices:
        if poly.material_index==pmi: cn.append(patch_n[(poly.index, me.loops[li].vertex_index)])
        else: cn.append(orig_cn[oi]); oi+=1
me.normals_split_custom_set(cn); me.update()
print('patch faces', sum(1 for p in me.polygons if p.material_index==pmi), 'D', round(D,4))
if arm.animation_data is not None and act: arm.animation_data.action=act
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_morph=True, export_animations=True, export_skins=True)
