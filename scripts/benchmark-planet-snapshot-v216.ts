/** Publication-only paired probe on an unchanged 250² map. A planet is
 * explicitly adopted; no group trip is prepared or claimed by this probe. */
import { performance } from 'node:perf_hooks';
import { mkdirSync,writeFileSync } from 'node:fs';
import { cpus,platform,release } from 'node:os';
import { createWorld,applyCommand,stepWorld } from '../src/sim/index.ts';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots.ts';
import type { World } from '../src/sim/types.ts';

const base=createWorld(42,250,250);stepWorld(base);
const globe=structuredClone(base);
const adopted=applyCommand(globe,{type:'planet-adopt'});
if(!adopted.ok)throw Error(adopted.reason);
const without=new SnapshotEncoder(),withGlobe=new SnapshotEncoder(),decodeA=new SnapshotDecoder(),decodeB=new SnapshotDecoder();
const times={without:{encode:[] as number[],clone:[] as number[],decode:[] as number[]},globe:{encode:[] as number[],clone:[] as number[],decode:[] as number[]}};
let bytesA=0,bytesB=0;
function sample(w:World,encoder:SnapshotEncoder,decoder:SnapshotDecoder,kind:'without'|'globe',record:boolean){
  const start=performance.now(),packet=encoder.encode(w,0,1,true),encoded=performance.now();
  const clone=structuredClone(packet),cloned=performance.now(),result=decoder.adopt(clone),finished=performance.now();
  if(result.status!=='applied')throw Error(`${kind}: ${result.status}`);
  if(record){times[kind].encode.push(encoded-start);times[kind].clone.push(cloned-encoded);times[kind].decode.push(finished-cloned);}
  return Buffer.byteLength(JSON.stringify(packet));
}
for(let i=0;i<4;i++){sample(base,without,decodeA,'without',false);sample(globe,withGlobe,decodeB,'globe',false);}
// ABBA limits one-sided ordering bias; bytes are serialization size, not
// structured-clone transfer or browser memory. Both sources stay unchanged.
for(let i=0;i<8;i++){
  bytesA=sample(base,without,decodeA,'without',true);bytesB=sample(globe,withGlobe,decodeB,'globe',true);
  bytesB=sample(globe,withGlobe,decodeB,'globe',true);bytesA=sample(base,without,decodeA,'without',true);
}
function stats(values:number[]){const sorted=[...values].sort((a,b)=>a-b);return {count:values.length,mean:values.reduce((a,b)=>a+b,0)/values.length,median:sorted[Math.floor(sorted.length/2)],p95:sorted[Math.ceil(sorted.length*.95)-1]};}
const summary=Object.fromEntries(Object.entries(times).map(([kind,stages])=>[kind,Object.fromEntries(Object.entries(stages).map(([stage,samples])=>[stage,stats(samples)]))]));
const result={version:1,source:'V216 working tree',time:new Date().toISOString(),hardware:{cpu:cpus()[0]?.model,platform:platform(),release:release()},
  scene:{seed:42,width:250,height:250,pawns:base.pawns.length,planetTiles:globe.planet?.tiles.length,group:false,sourceTick:base.tick},
  mode:'checkpoint at unchanged confirmed tick, warmed ABBA',milliseconds:summary,jsonBytes:{without:bytesA,globe:bytesB,delta:bytesB-bytesA},
  limitations:['No simulation tick or dynamic group cost measured','Node adoption, no browser RAF/GPU','JSON size is not structured-clone bytes','Single prepared map and hardware; no general speed/FPS claim']};
mkdirSync('tmp/planet-group-v216',{recursive:true});writeFileSync('tmp/planet-group-v216/publication.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
