/** Root-only sequential A/B decoder probe. Run only on frozen sources after
 * campaigns finish. Node adoption/clone stages do not establish RAF/GPU/FPS. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {cpus,platform,release} from 'node:os';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage} from '../src/bridge/snapshots.ts';
import {applyCommand,createWorld,stepWorld} from '../src/sim/index.ts';
import {prepareGroupScenario} from '../src/sim/group-scenario.ts';
import {serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import type {World} from '../src/sim/types.ts';

const option=(name:string)=>process.argv.slice(2).find(v=>v.startsWith(name+'='))?.slice(name.length+1);
const baselineRoot=option('--baseline');
assert.ok(baselineRoot,'Provide --baseline=absolute/path/to/immutable/V216/copy');
const baseline=resolve(baselineRoot),manifestRaw=readFileSync(resolve(baseline,'validation-snapshot.json'));
const manifest=JSON.parse(manifestRaw.toString('utf8')) as {sourceCommit:string;files:{path:string;sha256:string;bytes:number}[]};
assert.equal(manifest.sourceCommit,'fa1b149760dd2021b677b1660d6232b95cb28f01');
const hash=(raw:string|Buffer)=>createHash('sha256').update(raw).digest('hex');
function verifyBaseline(){
  assert.equal(hash(readFileSync(resolve(baseline,'validation-snapshot.json'))),hash(manifestRaw));
  for(const file of manifest.files.filter(f=>f.path.startsWith('src/')||f.path==='package.json'||f.path==='package-lock.json'))
    assert.equal(hash(readFileSync(resolve(baseline,file.path))),file.sha256,file.path);
}
verifyBaseline();
const old=await import(pathToFileURL(resolve(baseline,'src/bridge/snapshots.ts')).href) as typeof import('../src/bridge/snapshots.ts');
const candidatePaths=execFileSync('git',['ls-files','-z','src','package.json','package-lock.json'],{encoding:'utf8'}).split('\0').filter(Boolean);
for(const path of ['src/bridge/planet-validation-cache.ts','src/sim/planet-validation-context.ts',fileURLToPath(import.meta.url)])if(!candidatePaths.includes(path))candidatePaths.push(path);
const candidateHashes=Object.fromEntries(candidatePaths.map(path=>[path,hash(readFileSync(path))]));
function verifyCandidate(){for(const [path,sha] of Object.entries(candidateHashes))assert.equal(hash(readFileSync(path)),sha,'Sources changed during run: '+path);}
const output=resolve(option('--output')??('tmp/planet-cache-v217/decoder-'+new Date().toISOString().replaceAll(':','-')+'.json'));
const warmup=Number(option('--warmup')??40),samples=Number(option('--samples')??40),cycles=Number(option('--cycles')??2);
assert.ok([warmup,samples,cycles].every(Number.isSafeInteger)&&warmup>=8&&samples>=16&&samples<=200&&cycles>=1&&cycles<=4);
const without=createWorld(42,250,250);stepWorld(without);
const planet=structuredClone(without);assert.equal(applyCommand(planet,{type:'planet-adopt'}).ok,true);
const group=prepareGroupScenario();assert.equal(applyCommand(group,{type:'planet-adopt'}).ok,true);
const sources=group.piles.filter(p=>p.item==='survival-meal').map(p=>({pileId:p.id,quantity:4}));
assert.equal(applyCommand(group,{type:'group-start',memberIds:group.pawns.slice(0,2).map(p=>p.id),destination:group.planet!.civilianTile,sources}).ok,true);
for(let i=0;i<600&&!(group.group&&'members' in group.group);i++)stepWorld(group);
assert.ok(group.group&&'members' in group.group,'Actual departure required, no owner preparation');
for(const world of [without,planet,group])assert.deepEqual(validateWorld(world),[]);
const scenes=[{name:'without-planet-250',world:without},{name:'planet-250',world:planet},{name:'actual-group-32',world:group}];
// A subsequent browser A/B uses these exact initial serialized Worlds. This
// export is outside every timed region and never turns a prepared scene into
// a native gameplay or whole-campaign validation.
const sceneDirectory=option('--scene-directory');
const sceneFiles=sceneDirectory?scenes.map(scene=>{
  const path=resolve(sceneDirectory,scene.name+'.json'),raw=serializeWorld(scene.world);
  mkdirSync(dirname(path),{recursive:true});
  if(existsSync(path))assert.equal(readFileSync(path,'utf8'),raw,'Existing scene differs: '+path);
  else writeFileSync(path,raw,{flag:'wx'});
  return {scene:scene.name,path,sha256:hash(raw)};
}):[];
const oracle:{scene:string;checks:number}[]=[];
// Preserve the existing transport boundary rather than accidentally adding a
// schema guard to an absence-cache operation. The historical acceptance of a
// fractional number without those owners is a separate hardening debt; no
// context/planet authority is minted for this absence. A ballistic owner still
// invokes the complete existing domain guard and rejects the same number.
const transportCompatibility:{owner:boolean;status:string;reason?:string}[]=[];
for(const owner of [false,true]){
  const aPacket=structuredClone(new old.SnapshotEncoder().encode(without,0,1,true)),bPacket=structuredClone(new SnapshotEncoder().encode(without,0,1,true));
  assert.deepEqual(aPacket,bPacket);
  for(const packet of [aPacket,bPacket]){
    (packet.world as unknown as Record<string,unknown>).schemaVersion=196.5;
    if(owner)packet.world.projectiles=[];
  }
  const aResult=new old.SnapshotDecoder().adopt(structuredClone(aPacket)),bResult=new SnapshotDecoder().adopt(structuredClone(bPacket));
  assert.deepEqual(aResult,bResult,'Absent-world schema compatibility changed');
  assert.equal(aResult.status,owner?'resync':'applied');
  transportCompatibility.push({owner,status:aResult.status,...aResult.status==='resync'?{reason:aResult.reason}:{}});
}
for(const scene of scenes){
  const world=structuredClone(scene.world),aEncoder=new old.SnapshotEncoder(),bEncoder=new SnapshotEncoder(),a=new old.SnapshotDecoder(),b=new SnapshotDecoder();
  const accepted:World[]=[];const frozen:string[]=[];let checks=0;
  const compare=(pa:SnapshotMessage,pb:SnapshotMessage,applied?:boolean)=>{
    assert.deepEqual(pa,pb,'Encoder packet changed');
    const ra=a.adopt(structuredClone(pa)),rb=b.adopt(structuredClone(pb));assert.deepEqual(ra,rb,'Decoder outcome/reason/World differs');
    if(applied!==undefined)assert.equal(ra.status,applied?'applied':'resync');
    accepted.forEach((w,i)=>assert.equal(serializeWorld(w),frozen[i],'An earlier adopted frame changed'));
    if(ra.status==='applied'){accepted.push(ra.world,rb.status==='applied'?rb.world:ra.world);frozen.push(serializeWorld(ra.world),serializeWorld(ra.world));}
    checks++;return ra;
  };
  const encode=(checkpoint=false)=>compare(aEncoder.encode(world,0,1,checkpoint),bEncoder.encode(world,0,1,checkpoint),true);
  encode();
  for(let tick=0;tick<4;tick++){stepWorld(world);encode(tick===2);}
  if(world.planet){
    const goodA=aEncoder.encode(world,0,1),goodB=bEncoder.encode(world,0,1);
    const mutations:((p:SnapshotMessage)=>void)[]=[
      p=>p.world.planet!.tiles[0]!.meanTemperature+=1,
      p=>p.world.planet!.tiles[0]!.rainfall=-1,
      p=>p.world.planet!.tiles[0]!.center[0]=NaN,
      p=>p.world.planet!.tiles[0]!.neighbours[0]=0,
      p=>delete (p.world.planet!.tiles as unknown[])[0],
      p=>delete (p.world.planet!.tiles[0]!.center as unknown[])[1],
      p=>(p.world.planet!.tiles[0] as unknown as Record<string,unknown>).future=undefined,
      p=>p.world.planet!.generationSeed=-1,
      p=>p.world.planet!.adoptedAt=p.world.tick+1,
      p=>p.world.planet!.nextGroupId=0,
      p=>delete p.world.planet,
      p=>(p.world as unknown as Record<string,unknown>).relationships={profile:'invalid'},
    ];
    for(const mutate of mutations){const pa=structuredClone(goodA),pb=structuredClone(goodB);mutate(pa);mutate(pb);compare(pa,pb,false);}
    compare(goodA,goodB,true);compare(goodA,goodB);
    // A replacement must cold-validate a different genuine generated globe.
    const replacement=createWorld(93,32,32);stepWorld(replacement);assert.equal(applyCommand(replacement,{type:'planet-adopt'}).ok,true);
    const oldEpochA=aEncoder.encode(world,0,1),oldEpochB=bEncoder.encode(world,0,1);
    const replacementA=aEncoder.encode(replacement,0,1),replacementB=bEncoder.encode(replacement,0,1);
    const lateA=structuredClone(replacementA),lateB=structuredClone(replacementB);
    for(const p of [lateA,lateB])(p.world as unknown as Record<string,unknown>).relationships={profile:'invalid'};
    compare(lateA,lateB,false);
    const changedOldA=structuredClone(oldEpochA),changedOldB=structuredClone(oldEpochB);
    changedOldA.world.planet!.tiles[161]!.rainfall++;changedOldB.world.planet!.tiles[161]!.rainfall++;
    compare(changedOldA,changedOldB,false);compare(oldEpochA,oldEpochB,true);
    compare(replacementA,replacementB,true);
    const plain=createWorld(2048,32,32);stepWorld(plain);compare(aEncoder.encode(plain,0,1),bEncoder.encode(plain,0,1),true);
    compare(aEncoder.encode(world,0,1),bEncoder.encode(world,0,1),true);
  }
  assert.deepEqual(validateWorld(world),[]);oracle.push({scene:scene.name,checks});
}
// Independent clones and one decoder per side. Clone is measured separately;
// construction is outside the adoption timer. Stable frames retain real
// epoch/revision rules; cold frames use
// a new decoder and a real checkpoint. No simulation is in the timed regions.
type Sample={cycle:number;block:number;side:'A'|'B';index:number;cloneMs:number;adoptMs:number;status:string};
const cases:{scene:string;mode:string;samples:Sample[];stats:unknown}[]=[];
const stats=(v:number[])=>{const sorted=[...v].sort((a,b)=>a-b);return {count:v.length,mean:v.reduce((s,x)=>s+x,0)/v.length,median:sorted[Math.floor(sorted.length/2)],p95:sorted[Math.ceil(sorted.length*.95)-1]};};
for(const scene of scenes)for(const mode of ['checkpoint-stable','delta-stable','checkpoint-cold']){
  const encoder=new SnapshotEncoder(),initial=encoder.encode(scene.world,0,1,true);
  const stable=mode!=='checkpoint-cold',packet=stable&&mode==='delta-stable'?encoder.encode(scene.world,0,1):initial;
  const a=new old.SnapshotDecoder(),b=new SnapshotDecoder();
  if(stable){assert.equal(a.adopt(structuredClone(initial)).status,'applied');assert.equal(b.adopt(structuredClone(initial)).status,'applied');}
  const rows:Sample[]=[];
  const sample=(side:'A'|'B',cycle:number,block:number,index:number,record:boolean)=>{
    const start=performance.now(),input=structuredClone(packet),cloned=performance.now();
    input.revision=last[side]+1;
    // Each independent decoder advances from its own confirmed revision.
    const decoder=stable?(side==='A'?a:b):(side==='A'?new old.SnapshotDecoder():new SnapshotDecoder());
    if(input.kind==='delta')input.baseRevision=side==='A'?last.A:last.B;
    const before=performance.now(),result=decoder.adopt(input),after=performance.now();
    assert.equal(result.status,'applied',scene.name+'/'+mode+'/'+side);
    last[side]=input.revision;
    if(record)rows.push({cycle,block,side,index,cloneMs:cloned-start,adoptMs:after-before,status:result.status});
  };
  const last={A:initial.revision,B:initial.revision};
  for(let i=0;i<warmup;i++){sample('A',-1,-1,i,false);sample('B',-1,-1,i,false);}
  for(let cycle=0;cycle<cycles;cycle++)for(const [block,side] of (['A','B','B','A'] as const).entries())
    for(let i=0;i<samples;i++)sample(side,cycle,block,i,true);
  const perSide=Object.fromEntries((['A','B'] as const).map(side=>[side,{adoptMs:stats(rows.filter(r=>r.side===side).map(r=>r.adoptMs)),cloneMs:stats(rows.filter(r=>r.side===side).map(r=>r.cloneMs))}]));
  cases.push({scene:scene.name,mode,samples:rows,stats:perSide});
}
verifyBaseline();verifyCandidate();
const result={revision:1,at:new Date().toISOString(),sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baselineCommit:manifest.sourceCommit,
  baselineManifestSha256:hash(manifestRaw),candidateHashes,hardware:{cpu:cpus()[0]?.model,platform:platform(),release:release(),node:process.version},
  options:{warmup,samplesPerBlock:samples,cycles,order:'A/B/B/A'},oracle,transportCompatibility,sceneFiles,scenes:scenes.map(s=>({name:s.name,width:s.world.width,height:s.world.height,tick:s.world.tick,worldSha256:hash(serializeWorld(s.world))})),cases,
  limits:['Node clone and adoption, not real postMessage/worker queue','No simulation, RAF, GPU, FPS or memory claim','Cold/stable/checkpoint/delta workloads are separately reported','Raw samples retained, no GC causal attribution','Both source trees unchanged before/after measurement']};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,oracle,cases:cases.map(c=>({scene:c.scene,mode:c.mode,stats:c.stats}))}));
