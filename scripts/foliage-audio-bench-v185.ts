import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { cpus } from 'node:os';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { deserializeWorld,serializeWorld } from '../src/sim/index.ts';
import { FoliageAmbience } from '../src/audio/ambience.ts';

const file=process.argv[2]??'public/test-saves/v98/mixed-100.json';
const stored=readFileSync(file,'utf8'),envelope=JSON.parse(stored);
const raw=envelope.format==='lisiere-save'&&envelope.codec==='gzip-base64'
  ?gunzipSync(Buffer.from(envelope.payload,'base64')).toString('utf8'):stored;
const world=deserializeWorld(raw),before=serializeWorld(world);
const field=new FoliageAmbience();
for(let i=0;i<80;i++)field.adopt(world);
const quantile=(samples:number[],p:number)=>[...samples].sort((a,b)=>a-b)[Math.min(samples.length-1,Math.floor(samples.length*p))]!;
const adoption:number[]=[],queries:number[]=[];
let checksum=0;
for(let repeat=0;repeat<20;repeat++){
  let start=performance.now();
  for(let i=0;i<30;i++)field.adopt(world);
  adoption.push((performance.now()-start)/30);
  start=performance.now();
  for(let i=0;i<10000;i++)checksum+=field.gain(i%world.width,(i*37)%world.height);
  queries.push((performance.now()-start)/10000);
}
assert.equal(serializeWorld(world),before);
const report={file,width:world.width,height:world.height,resources:world.resources.length,
  trees:world.resources.filter(r=>r.kind==='tree').length,cpu:cpus()[0]?.model,
  iterations:20,adoptionMs:{median:quantile(adoption,.5),p95:quantile(adoption,.95)},
  queryMs:{median:quantile(queries,.5),p95:quantile(queries,.95)},checksum,
  worldAndRngUnchanged:true,limit:'Isolated snapshot census/query; not a full frame, worker, GPU or listening test.'};
mkdirSync('tmp/v185',{recursive:true});writeFileSync('tmp/v185/foliage-audio-cpu.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
