import { performance } from 'node:perf_hooks';
import { cpus, platform, release } from 'node:os';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createWorld } from '../src/sim/index.ts';
import { SnapshotEncoder, SnapshotDecoder } from '../src/bridge/snapshots.ts';
import type { World } from '../src/sim/types.ts';

// Compare the exact same mutable world, alternating measurement order. The
// baseline is exported from Git into ignored tmp, never shipped in the game.
const reference=process.argv[2]??'5df8af0',label=process.argv[3]??'comparison';
if(!/^[a-f0-9]{7,40}$/.test(reference)||!/^[a-z0-9-]+$/.test(label))throw Error('Expected a Git hash and report label');
mkdirSync('tmp',{recursive:true});
const baselinePath=resolve('tmp/snapshot-encoder-baseline.ts');
writeFileSync(baselinePath,execFileSync('git',['show',`${reference}:src/bridge/snapshots.ts`],{encoding:'utf8'}).replaceAll("'../sim/","'../src/sim/"));
const {SnapshotEncoder:Baseline}=await import(pathToFileURL(baselinePath).href);
const stats=(a:number[])=>{a.sort((a,b)=>a-b);return {p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1)};};
const modes=['unchanged','metadata','terrain','remove-append','reorder','growth'] as const;
type Mode=typeof modes[number];
function mutate(w:World,mode:Mode,i:number):void {
  const r=w.resources[i%w.resources.length]!;
  if(mode==='metadata')r.amount=r.amount===7?8:7;
  if(mode==='terrain')w.tiles[i%w.tiles.length]={terrain:'rock',stone:'sandstone',miningDamage:80*(1+i%4)};
  if(mode==='remove-append'){w.resources.splice(i%w.resources.length,1);w.resources.push({...r,id:w.nextId++});}
  if(mode==='reorder'){const at=i%w.resources.length;[w.resources[at],w.resources[0]]=[w.resources[0]!,w.resources[at]!];}
  if(mode==='growth')for(const plant of w.resources)if(plant.kind==='berries'){plant.growth??=1;plant.growthTick=i;plant.growthThermalFactor=i%2?1:.8;}
}
const results=[],started=performance.now();
for(const mode of modes){
  const world=createWorld(42,250,250),baseline=new Baseline(),candidate=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const verify=()=>{
    const old=structuredClone(baseline.encode(world,0,6)),next=structuredClone(candidate.encode(world,0,6));
    if(JSON.stringify(old)!==JSON.stringify(next))throw Error(`Packet mismatch: ${mode}`);
    const decoded=decoder.adopt(next);if(decoded.status!=='applied'||JSON.stringify(decoded.world)!==JSON.stringify(world))throw Error(`Reconstruction mismatch: ${mode} (${decoded.status==='resync'?decoded.reason:decoded.status})`);
  };
  verify();for(let i=0;i<12;i++){mutate(world,mode,i);verify();}
  // Verification/cloning is deliberately outside all timed rounds.
  const samples={baseline:[] as number[],candidate:[] as number[]};
  for(let round=0;round<8;round++)for(let i=0;i<150;i++){
    mutate(world,mode,round*150+i);
    for(const key of (round%2?['candidate','baseline']:['baseline','candidate']) as Array<keyof typeof samples>){
      const at=performance.now();(key==='baseline'?baseline:candidate).encode(world,0,6);
      if(round>1)samples[key].push(performance.now()-at);
    }
    if(performance.now()-started>120000)throw Error('Encoder benchmark exceeded 120 seconds');
  }
  results.push({mode,resources:world.resources.length,tiles:world.tiles.length,packetsVerified:13,samples:samples.baseline.length,baseline:stats(samples.baseline),candidate:stats(samples.candidate)});
  console.log(JSON.stringify(results.at(-1)));
}
writeFileSync(`artifacts/snapshot-encoder-${label}.json`,JSON.stringify({date:new Date().toISOString(),reference,cpu:cpus()[0]?.model,node:process.version,os:`${platform()} ${release()}`,scope:'Encoder only, natural 250² seed 42; alternating order; 300 warmup + 900 timed encodes per mode; mutation/clone/decode outside timings. Packet byte equality and reconstructed World checked before timing. No browser/IPC/FPS claim.',elapsedMs:performance.now()-started,results},null,2)+'\n');
