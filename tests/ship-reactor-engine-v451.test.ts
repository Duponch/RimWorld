import {expect,test} from 'vitest';
import {shipReactorWorkshop275,SHIP_REACTOR_PREPARATION_275} from './scenarios/ship-reactor-v451.ts';
import {writeTestFileSync} from './test-output.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {constructionSupplied,deliveredMaterial} from '../src/sim/construction-materials.ts';
import {SHIP_REACTOR_CONSTRUCTION_275} from '../src/sim/ship-reactor-content-275.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {powerWatts,isPowerActive} from '../src/sim/power-rules.ts';
import {readShipReactorStart275} from '../src/sim/ship-reactor-runtime-275.ts';
import {finishDeconstruction} from '../src/sim/deconstruction.ts';
import {designateDeconstruction} from '../src/sim/deconstruction-rules.ts';
import {validateDeconstruction} from '../src/sim/deconstruction-save.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import type {Command,World} from '../src/sim/types.ts';

const units=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
const command=(w:World,c:Command)=>{const r=applyCommand(w,c);expect(r.ok,r.reason??JSON.stringify(c)).toBe(true);};
function reload(w:World){const text=serializeWorld(w),copy=deserializeWorld(text);expect(serializeWorld(copy)).toBe(text);return copy;}
function until(w:World,done:()=>boolean,limit:number,observe?:()=>void){
 for(let i=0;i<limit&&!done();i++){stepWorld(w);observe?.();}
 if(!done()||validateWorld(w).length)writeTestFileSync('tmp/ship-reactor-v451/engine-failure.json',serializeWorld(w));
 expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns.map(p=>({id:p.id,state:p.state,x:p.x,z:p.z,jobId:p.jobId,haul:p.haul,need:p.need,path:p.path})),events:w.events.slice(-4)})).toBe(true);
 expect(validateWorld(w)).toEqual([]);
}
/** Compare RAW replay separately from the admitted public representation. A
 * new full checkpoint is the oracle for the same actual campaign projection. */
function publicProbe(w:World){
 const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder();
 const first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(first.status).toBe('applied');
 if(first.status!=='applied')throw Error('Initial paid-work checkpoint refused');
 const retained=first.world,retainedValue=structuredClone(retained);
 return {send:()=>{
  const packet=structuredClone(encoder.encode(w,0,0));expect(packet.kind).toBe('delta');
  const next=decoder.adopt(packet);expect(next.status).toBe('applied');if(next.status!=='applied')throw Error('Actual work delta refused');
  const reference=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder({structureDelta:true}).encode(w,0,0)));
  expect(reference.status).toBe('applied');if(reference.status!=='applied')throw Error('Same-world full checkpoint refused');
  expect(next.world).toEqual(reference.world);expect(retained).toEqual(retainedValue);
  expect(next.world.tick).toBe(w.tick);expect(next.world.structures).toEqual(w.structures);expect(next.world.jobs).toEqual(w.jobs);expect(next.world.piles).toEqual(w.piles);
  return next.world;
 }};
}

test('finite four-material delivery and every real construction tick produce one reactor, with exact RAW/public continuations and real1000W before startup',()=>{
 const {w,builderId,lampId,plan}=shipReactorWorkshop275();
 expect(validateWorld(w)).toEqual([]);expect(w.structures.some(s=>s.kind==='ship-reactor')).toBe(false);
 const lamp=w.structures.find(s=>s.id===lampId)!;expect(lamp.power!.on).toBe(false);
 const before=Object.fromEntries(SHIP_REACTOR_CONSTRUCTION_275.ingredients.map(i=>[i.item,units(w,i.item)]));
 command(w,plan);const jobId=w.jobs.find(j=>j.kind==='ship-reactor')!.id,carried=new Set<string>();let partial=false;
 const observe=()=>{const p=w.pawns.find(p=>p.id===builderId)!,j=w.jobs.find(j=>j.id===jobId);
  if(p.haul?.destination.type==='job'&&p.haul.destination.jobId===jobId&&p.haul.phase==='deliver'){
   const pile=w.piles.find(q=>q.owner.type==='pawn'&&q.owner.pawnId===p.id);if(pile)carried.add(pile.item);
  }
  if(j&&deliveredMaterial(w,j,'steel')>0&&!constructionSupplied(w,j))partial=true;
 };
 until(w,()=>{const j=w.jobs.find(j=>j.id===jobId);return !!j&&j.construction==='frame'&&constructionSupplied(w,j);},12000,observe);
 expect(partial).toBe(true);expect([...carried].sort()).toEqual(['advanced-component','plasteel','steel','uranium']);
 const frame=w.jobs.find(j=>j.id===jobId)!;
 for(const i of SHIP_REACTOR_CONSTRUCTION_275.ingredients){expect(deliveredMaterial(w,frame,i.item)).toBe(i.quantity);expect(units(w,i.item)).toBe(before[i.item]);}
 const cancelled=reload(w);command(cancelled,{type:'area',action:'cancel',from:plan,to:plan});
 expect(cancelled.jobs.some(j=>j.id===jobId)).toBe(false);expect(cancelled.piles.some(q=>q.owner.type==='job'&&q.owner.jobId===jobId)).toBe(false);
 for(const i of SHIP_REACTOR_CONSTRUCTION_275.ingredients)expect(units(cancelled,i.item)).toBe(before[i.item]);reload(cancelled);
 until(w,()=>{const j=w.jobs.find(j=>j.id===jobId),p=w.pawns.find(p=>p.id===builderId)!;return !!j&&j.progress>0&&p.jobId===jobId&&p.state==='working';},1500);
 const p=w.pawns.find(p=>p.id===builderId)!,working=w.jobs.find(j=>j.id===jobId)!,cells=footprintCells(working);
 expect(cells.some(c=>c.x===p.x&&c.z===p.z)).toBe(false);expect(cells.some(c=>Math.abs(c.x-p.x)+Math.abs(c.z-p.z)===1)).toBe(true);
 expect(working.progress).toBeGreaterThan(0);expect(working.progress).toBeLessThan(6500);
 writeTestFileSync('tmp/ship-reactor-v451/native-paid-frame.json',serializeWorld(w));
 writeTestFileSync('tmp/ship-reactor-v451/native-paid-frame.meta.json',JSON.stringify({...SHIP_REACTOR_PREPARATION_275,tick:w.tick,jobId,builderId,lampId,progress:working.progress,actualFourIngredientsDelivered:true,actualWorkAtExteriorContact:true,terminalReactorPrepared:false},null,2));
 const copy=reload(w),at=w.tick,transport=publicProbe(w);let contact=false;
 until(w,()=>w.structures.some(s=>s.kind==='ship-reactor'),18000,()=>{
  const j=w.jobs.find(j=>j.id===jobId),actor=w.pawns.find(p=>p.id===builderId)!;
  if(j&&actor.jobId===jobId&&actor.state==='working'&&j.progress>0)contact=true;
 });
 stepWorld(copy,w.tick-at);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(contact).toBe(true);
 const reactor=w.structures.find(s=>s.kind==='ship-reactor')!;
 expect(w.jobs.some(j=>j.id===jobId)).toBe(false);expect(reactor.shipReactor275).toBeUndefined();expect(powerWatts(reactor,w)).toBe(1000);expect(isPowerActive(reactor)).toBe(true);
 for(const i of SHIP_REACTOR_CONSTRUCTION_275.ingredients)expect(units(w,i.item)).toBe(before[i.item]-i.quantity);
 // The native grid connects at construction, then starts consumers on its
 // ordinary gradual boundary. It does not energize the lamp in completeJob.
 expect(lamp.power!.parentId).toBe(reactor.id);const connectedAt=w.tick;
 until(w,()=>isPowerActive(lamp),100);stepWorld(copy,w.tick-connectedAt);expect(serializeWorld(copy)).toBe(serializeWorld(w));
 expect(lamp.power).toEqual({on:true,parentId:reactor.id});expect(powerWatts(lamp,w)).toBe(-30);
 transport.send();reload(w);
 writeTestFileSync('tmp/ship-reactor-v451/constructed.json',serializeWorld(w));
 writeTestFileSync('tmp/ship-reactor-v451/constructed.meta.json',JSON.stringify({...SHIP_REACTOR_PREPARATION_275,tick:w.tick,reactorId:reactor.id,originalJobId:jobId,builderId,lampId,actualConstructionFinished:true,rawExactReplay:true,publicCheckpointAndDelta:true},null,2));

 const start=readShipReactorStart275(w,reactor.id);expect(start.ok).toBe(true);if(!start.ok)throw Error(start.reason);
 command(w,{type:'ship-reactor-start',reactorId:reactor.id,reactorIds:[...start.reactorIds]});
 const dates=structuredClone(reactor.shipReactor275!);expect(dates.state).toBe('starting');expect(powerWatts(reactor,w)).toBe(1000);transport.send();
 const started=reload(w),startedAt=w.tick;stepWorld(w,17);stepWorld(started,17);expect(serializeWorld(started)).toBe(serializeWorld(w));
 expect(w.tick).toBe(startedAt+17);expect(reactor.shipReactor275).toEqual(dates);expect(lamp.power).toEqual({on:true,parentId:reactor.id});transport.send();

 // Both loss branches start from this exact played structure. No second
 // building, ingredient source, favorable state or ID is manufactured.
 const demolition=reload(w),destroyed=reload(w),lostBefore=structuredClone(demolition.deconstructed),deadBefore=structuredClone(destroyed.destroyed);
 const demolish=demolition.structures.find(s=>s.id===reactor.id)!;command(demolition,{type:'designate',kind:'deconstruct',x:demolish.x,z:demolish.z,targetId:demolish.id});
 const demolitionTransport=publicProbe(demolition);until(demolition,()=>!demolition.structures.some(s=>s.id===reactor.id),2500);
 const expected={steel:175,plasteel:140,uranium:35,'advanced-component':4};
 for(const i of SHIP_REACTOR_CONSTRUCTION_275.ingredients)expect(units(demolition,i.item)).toBe(expected[i.item]);
 expect(demolition.deconstructed.lostSteel!-(lostBefore.lostSteel??0)).toBe(175);
 expect(demolition.deconstructed.lostPlasteel275!-(lostBefore.lostPlasteel275??0)).toBe(140);
 expect(demolition.deconstructed.lostUranium!-(lostBefore.lostUranium??0)).toBe(35);
 expect(demolition.deconstructed.lostAdvancedComponents271!-(lostBefore.lostAdvancedComponents271??0)).toBe(4);
 expect(demolition.deconstructed.count).toBe(lostBefore.count+1);expect(demolition.packed.some(q=>q.building.id===reactor.id)).toBe(false);
 expect(demolition.structures.find(s=>s.id===lampId)!.power!.on).toBe(false);demolitionTransport.send();reload(demolition);

 const destructionTransport=publicProbe(destroyed),actual=destroyed.structures.find(s=>s.id===reactor.id)!,destroyedPeer=reload(destroyed);
 expect(damageStructure(destroyed,actual,500,'bullet')).toBe(true);
 expect(damageStructure(destroyedPeer,destroyedPeer.structures.find(s=>s.id===reactor.id)!,500,'bullet')).toBe(true);
 expect(serializeWorld(destroyedPeer)).toBe(serializeWorld(destroyed));expect(destroyed.structures.some(s=>s.id===reactor.id)).toBe(false);
 for(const i of SHIP_REACTOR_CONSTRUCTION_275.ingredients){
  const returned=units(destroyed,i.item),lost=(destroyed.destroyed!.lost[i.item]??0)-(deadBefore?.lost[i.item]??0);
  expect(returned).toBeGreaterThanOrEqual(Math.floor(i.quantity/4));expect(returned).toBeLessThanOrEqual(Math.ceil(i.quantity/4));expect(returned+lost).toBe(i.quantity);
 }
 expect(destroyed.destroyed!.count).toBe((deadBefore?.count??0)+1);expect(destroyed.packed.some(q=>q.building.id===reactor.id)).toBe(false);
 expect(destroyed.structures.find(s=>s.id===lampId)!.power!.on).toBe(false);destructionTransport.send();reload(destroyed);
},180000);

test('prospective reactor losses reject old/future fields and refuse every accumulator overflow before material, ID or RNG changes',()=>{
 const {w,plan}=shipReactorWorkshop275();
 // Isolated failure preflight fixture, not the played building proof above.
 const reactor={id:w.nextId++,kind:'ship-reactor' as const,x:plan.x,z:plan.z,orientation:plan.orientation,footprint:'standard' as const,material:'steel' as const,power:{on:true,parentId:null}};w.structures.push(reactor);
 designateDeconstruction(w,reactor);const job=w.jobs.find(j=>j.deconstruction?.structureId===reactor.id)!;
 for(const key of ['lostSteel','lostPlasteel275','lostUranium','lostAdvancedComponents271'] as const){
  const copy=structuredClone(w);copy.deconstructed[key]=Number.MAX_SAFE_INTEGER;const before=structuredClone(copy);
  expect(finishDeconstruction(copy,copy.pawns[0]!,copy.jobs.find(j=>j.id===job.id)!)).toBe(false);expect(copy).toEqual(before);
 }
 w.deconstructed.lostPlasteel275=140;expect(validateDeconstruction(w,275,true)).toEqual([]);
 for(const version of [274,277])expect(validateDeconstruction(w,version,true).some(s=>s.includes('ledger')||s.includes('plasteel'))).toBe(true);
 for(const value of [0,-1,.5,Number.MAX_SAFE_INTEGER+1]){w.deconstructed.lostPlasteel275=value;expect(validateDeconstruction(w,275,true)).not.toEqual([]);}
});
