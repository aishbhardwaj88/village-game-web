import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { getBounds } from '@gltf-transform/functions';
import fs from 'fs';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const dir=process.argv[2];
for (const f of fs.readdirSync(dir).filter(f=>f.endsWith('.glb')).sort()){
  const d=await io.read(dir+'/'+f); const sc=d.getRoot().getDefaultScene()||d.getRoot().listScenes()[0];
  const b=getBounds(sc); let tri=0;
  for(const m of d.getRoot().listMeshes()) for(const p of m.listPrimitives()){const i=p.getIndices();tri+=(i?i.getCount():p.getAttribute('POSITION').getCount())/3;}
  const tx=d.getRoot().listTextures().map(t=>t.getSize()?.join('x')).join(',');
  const a=d.getRoot().getAsset();
  const sz=b.max.map((v,i)=>+(v-b.min[i]).toFixed(2));
  console.log(f,'MB',(fs.statSync(dir+'/'+f).size/1e6).toFixed(2),'size',sz.join('x'),'min',b.min.map(v=>+v.toFixed(2)).join(','),'tri',Math.round(tri),'tex',tx,'mats',d.getRoot().listMaterials().length,'|',a.copyright||'',JSON.stringify(a.extras||{}).slice(0,150));
}
