import sharp from 'sharp';
import fs from 'fs';
for (const p of process.argv.slice(2)) {
  const fl = fs.readdirSync(`Places V1/${p}`).filter(f=>/^MAIN_.*\.png$/.test(f)).sort();
  const f = fl.find(x=>/iso|front|3q|three/i.test(x)) || fl[0];
  const {data,info} = await sharp(`Places V1/${p}/${f}`).resize(160,160,{fit:'inside'}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const b = new Map();
  for (let i=0;i<data.length;i+=3){const r=data[i],g=data[i+1],bl=data[i+2];
    const mx=Math.max(r,g,bl),mn=Math.min(r,g,bl); if(mx<60||mn>250||mx-mn<22) continue;
    if(g>r+8&&g>bl+8) continue; // foliage
    const k=[r,g,bl].map(v=>Math.round(v/24)*24).join(',');b.set(k,(b.get(k)||0)+1);}
  const tot=[...b.values()].reduce((a,c)=>a+c,0);
  const top=[...b].sort((a,c)=>c[1]-a[1]).slice(0,6).map(([k,n])=>'#'+k.split(',').map(v=>Math.min(255,+v).toString(16).padStart(2,'0')).join('').toUpperCase()+':'+Math.round(100*n/tot)+'%');
  console.log(p.padEnd(14),f.slice(5,40).padEnd(30),top.join(' '));
}
