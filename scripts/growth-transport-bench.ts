import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { serialize } from 'node:v8';
import { isDeepStrictEqual } from 'node:util';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots.ts';

const world=createScenarioWorld(42,250,'crashlanded',{biome:'temperate-forest',hilliness:'small-hills'});
const encoder=new SnapshotEncoder(),packedDecoder=new SnapshotDecoder(),expandedDecoder=new SnapshotDecoder();
const checkpoint=structuredClone(encoder.encode(world,0,6));packedDecoder.adopt(structuredClone(checkpoint));expandedDecoder.adopt(structuredClone(checkpoint));
stepWorld(world);
const packed=structuredClone(encoder.encode(world,0,6));
if(packed.kind!=='delta'||!packed.resources?.growth?.length)throw Error('Expected a cold-morning growth delta');
const expanded=structuredClone(packed),resources=new Map(world.resources.map(r=>[r.id,r]));
for(let i=0;i<packed.resources.growth.length;i+=4)expanded.resources!.upserted.push(structuredClone(resources.get(packed.resources.growth[i]!)!));
delete expanded.resources!.growth;
const a=packedDecoder.adopt(packed),b=expandedDecoder.adopt(expanded);
if(a.status!=='applied'||b.status!=='applied'||!isDeepStrictEqual(a.world,world)||!isDeepStrictEqual(b.world,world))throw Error('Packed/expanded state differs');
const measure=(value:unknown)=>{
  const samples:number[]=[];for(let i=0;i<20;i++){const t=performance.now();structuredClone(value);samples.push(performance.now()-t);}
  samples.sort((a,b)=>a-b);return {n:samples.length,p50:samples[10],p95:samples[19]};
};
const report={protocol:'Same exact cold-morning delta, both decoded worlds equal the authoritative world. Twenty structuredClone calls per variant, expanded first. V8 serialized bytes are an estimate, not a measured browser wire format.',growthResources:packed.resources.growth.length/4,packedBytes:serialize(packed).byteLength,expandedBytes:serialize(expanded).byteLength,expandedCloneMs:measure(expanded),packedCloneMs:measure(packed)};
writeFileSync('artifacts/growth-transport-v91.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
