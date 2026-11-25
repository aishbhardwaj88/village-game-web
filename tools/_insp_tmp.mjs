import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
const dir='/home/claude/village-game-web/public/assets/vehicles_free/';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
await MeshoptDecoder.ready;
for(const f of ['old_tractor','trailer_pack','bicycle','motorbike','moped','thela_gadi','thela_b','auto_rickshaw','tuk_tuk','mini_truck','water_tanker','willys_jeep']){
 const d=await io.read(dir+f+'.glb');const r=d.getRoot();
 console.log(f,'tex',r.listTextures().map(t=>t.getMimeType()+t.getSize()?.join('x')+':'+t.getImage().length),'mats',r.listMaterials().map(m=>m.getName()+(m.getBaseColorTexture()?'T':'-')+(m.getNormalTexture()?'N':'')+(m.getMetallicRoughnessTexture()?'R':'')+(m.getAlphaMode()!=='OPAQUE'?'A':'')).join(','));
 let mn=[9,9],mx=[-9,-9],tr=0;
 for(const m of r.listMeshes())for(const p of m.listPrimitives()){const u=p.getAttribute('TEXCOORD_0');if(!u)continue;const a=u.getArray();for(let i=0;i<a.length;i+=2){mn[0]=Math.min(mn[0],a[i]);mx[0]=Math.max(mx[0],a[i]);mn[1]=Math.min(mn[1],a[i+1]);mx[1]=Math.max(mx[1],a[i+1]);}tr+=p.getIndices().getCount()/3;}
 console.log('  uv',mn.map(v=>v.toFixed(2)),mx.map(v=>v.toFixed(2)),'tris',tr,'prims',r.listMeshes().reduce((s,m)=>s+m.listPrimitives().length,0), 'ext',d.getRoot().listExtensionsUsed().map(e=>e.extensionName).join());
}
