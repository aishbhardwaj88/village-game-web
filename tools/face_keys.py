import bpy, math, sys, numpy as np, mathutils
src, out, eyes, mouth = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
# eyes/mouth as px coords "x1,y1,x2,y2" in the 600px 0.30m render centred at cam
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
sc=bpy.context.scene
for o in sc.objects:
    if o.type=='ARMATURE' and o.animation_data: o.animation_data.action=None
    if o.type=='ARMATURE':
        for b in o.pose.bones: b.matrix_basis=mathutils.Matrix()
meshes=[o for o in sc.objects if o.type=='MESH']
cx,zc,sz=map(float,open(out+'_cam.txt').read().split())
px=sz/600
def w(p): return (cx+(p[0]-300)*px, zc-(p[1]-300)*px)
E=[float(v) for v in eyes.split(',')]; M=[float(v) for v in mouth.split(',')]
eyesW=[w(E[0:2]), w(E[2:4])]; mouthW=[w(M[0:2]), w(M[2:4])]
def smooth(t): t=max(0,min(1,t)); return t*t*(3-2*t)
for o in meshes:
    mw=o.matrix_world; inv=mw.inverted()
    V=[mw@v.co for v in o.data.vertices]
    ys=np.array([v.y for v in V]); zs=np.array([v.z for v in V])
    headmask=zs>zc-0.15
    fronty=np.percentile(ys[headmask],3) if headmask.any() else 0
    if not o.data.shape_keys: o.shape_key_add(name='Basis')
    blinkL=o.shape_key_add(name='blink'); smile=o.shape_key_add(name='smile')
    cy=float(np.median(ys[headmask]))
    # skin depth per eye: front-half verts in a small window; the back-most cluster is skin (glasses / cap brims sit in front)
    eyeRange=[]
    for ex,ez in eyesW:
        sel=[v.y for v in V if abs(v.x-ex)<0.012 and abs(v.z-ez)<0.008 and v.y<cy]
        sel=sorted(sel,reverse=True)
        lo=sel[0] if sel else -9
        for a,b in zip(sel,sel[1:]):
            if a-b>0.009: break
            lo=b
        eyeRange.append((lo-0.004, sel[0]+0.004 if sel else 9))
    for i,v in enumerate(V):
        if v.z<zc-0.2 or v.y>cy: continue
        nb=v.copy(); ns=v.copy()
        for (ex,ez),(ylo,yhi) in zip(eyesW,eyeRange):
            dx=abs(v.x-ex); rx=0.020
            if dx<rx and ylo<=v.y<=yhi:
                hw=smooth(1-dx/rx)
                zl=ez-0.0035; zt=ez+0.010
                if zl<=v.z<=zt:
                    t=(v.z-zl)/(zt-zl); t2=max(0,(t-0.45)/0.55)
                    nz=zl+t2*(zt-zl)
                    nb.z=v.z+(nz-v.z)*hw
        for k,(mx,mz) in enumerate(mouthW):
            d=math.hypot(v.x-mx,v.z-mz); r=0.016
            if d<r:
                f=smooth(1-d/r); side=-1 if k==0 else 1
                ns.z+=0.005*f; ns.x+=0.002*f*side
        lb=inv@nb; ls=inv@ns
        blinkL.data[i].co=lb; smile.data[i].co=ls
sc.render.engine='BLENDER_EEVEE_NEXT'; sc.render.resolution_x=600; sc.render.resolution_y=600
wd=bpy.data.worlds.new('w'); sc.world=wd; wd.use_nodes=True; wd.node_tree.nodes['Background'].inputs[0].default_value=(0.6,0.6,0.6,1); wd.node_tree.nodes['Background'].inputs[1].default_value=1.5
cam=bpy.data.cameras.new('c'); cam.type='ORTHO'; cam.ortho_scale=sz
co=bpy.data.objects.new('c',cam); sc.collection.objects.link(co); sc.camera=co
co.location=(cx,-2,zc); co.rotation_euler=(math.radians(90),0,0)
for name,vals in [('neutral',(0,0)),('blink',(1,0)),('smile',(0,1))]:
    for o in meshes:
        kb=o.data.shape_keys.key_blocks; kb['blink'].value=vals[0]; kb['smile'].value=vals[1]
    sc.render.filepath=f'{out}_{name}.png'; bpy.ops.render.render(write_still=True)
bpy.ops.export_scene.gltf(filepath=out+'_keys.glb', export_morph=True, export_animations=True)
