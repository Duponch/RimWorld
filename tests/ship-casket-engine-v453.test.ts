import {test,expect} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {constructionSupplied,deliveredMaterial} from '../src/sim/construction-materials.ts';
import {isShipCasket277} from '../src/sim/ship-casket-state-277.ts';
import {indexShipParts276,readShipAssembly276} from '../src/sim/ship-part-reader-276.ts';
import {shipCasketWorkshop277,SHIP_CASKET_STOCK277,SHIP_CASKET_PREPARATION277,EARNED_SHIP_SHA276} from './scenarios/ship-casket-v453.ts';
import {writeTestFileSync,testOutputPath} from './test-output.ts';
import type {World,Command} from '../src/sim/types.ts';

const command=(w:World,c:Command)=>{const result=applyCommand(w,c);expect(result.ok,result.reason).toBe(true);};
const roundtrip=(w:World)=>{const text=serializeWorld(w),copy=deserializeWorld(text);expect(serializeWorld(copy)).toBe(text);return copy;};
const units=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((sum,p)=>sum+p.quantity,0);
function until(w:World,done:()=>boolean,limit:number){
 for(let i=0;i<limit&&!done();i++)stepWorld(w);
 if(!done()){
  writeTestFileSync('artifacts/ship-casket-v453/engine-failure.json',JSON.stringify(w));
  throw Error(JSON.stringify({tick:w.tick,people:w.pawns.map(p=>({id:p.id,state:p.state,rest:p.rest,hunger:p.hunger,x:p.x,z:p.z,jobId:p.jobId,need:p.need})),jobs:w.jobs,events:w.events.slice(-6)}));
 }
 expect(validateWorld(w)).toEqual([]);
}
function publicProbe(w:World){
 const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));
 expect(first.status).toBe('applied');if(first.status!=='applied')throw Error(first.status);
 const retained=first.world,before=structuredClone(retained);
 return ()=>{
  const next=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(next.status).toBe('applied');if(next.status!=='applied')throw Error(next.status);
  const full=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder({structureDelta:true}).encode(w,0,0)));expect(full.status).toBe('applied');if(full.status!=='applied')throw Error(full.status);
  expect(next.world).toEqual(full.world);expect(retained).toEqual(before);
 };
}

test('V453 pays and builds a spatial casket, admits the last real colonist and directly ejects the same original',()=>{
 const {w,source,builderId,reactorId,beamId,lampId,plan}=shipCasketWorkshop277();
 expect(w.schemaVersion).toBe(277);expect(w.tick).toBe(source.tick);
 const person=w.pawns.find(p=>p.id===builderId)!,originalHistory=structuredClone(w.events),damageBefore=w.structures.map(s=>[s.id,s.damage]);
 expect(person.rest).toBe(source.pawns.find((p:{id:number})=>p.id===builderId).rest);
 expect(w.structures.map(s=>[s.id,s.damage])).toEqual(damageBefore);expect(w.events).toEqual(originalHistory);
 const before=Object.fromEntries(SHIP_CASKET_STOCK277.map(row=>[row.item,units(w,row.item)]));
 command(w,plan);const job=w.jobs.find(j=>j.kind==='ship-cryptosleep-casket')!;expect(job).toBeDefined();
 until(w,()=>!!w.jobs.find(j=>j.id===job.id&&j.construction==='frame'&&j.progress>0&&constructionSupplied(w,j)),20000);
 const frame=w.jobs.find(j=>j.id===job.id)!;
 for(const row of SHIP_CASKET_STOCK277)expect(deliveredMaterial(w,frame,row.item)).toBe(row.quantity);
 const meta={prepared:SHIP_CASKET_PREPARATION277,sourceSha256:EARNED_SHIP_SHA276,builderId,reactorId,beamId,lampId,jobId:job.id,tick:w.tick,actualFourIngredientsDelivered:true,actualWorkAtExteriorContact:true,terminalCasketPrepared:false};
 writeTestFileSync('artifacts/ship-casket-v453/native-paid-frame.json',serializeWorld(w));
 writeTestFileSync('artifacts/ship-casket-v453/native-paid-frame.meta.json',JSON.stringify(meta,null,2));
 const twin=roundtrip(w),at=w.tick,send=publicProbe(w);
 until(w,()=>!w.jobs.some(j=>j.id===job.id),10000);stepWorld(twin,w.tick-at);expect(serializeWorld(twin)).toBe(serializeWorld(w));
 const casket=w.structures.find(isShipCasket277)!;expect(casket).toBeDefined();expect(casket.shipCryptosleep277.occupant).toBeNull();
 for(const row of SHIP_CASKET_STOCK277)expect(units(w,row.item)).toBe(before[row.item]-row.quantity);
 expect(w.pawns.find(p=>p.id===builderId)).toBe(person);expect(w.structures.find(s=>s.id===reactorId)?.shipReactor275).toBeUndefined();
 send();roundtrip(w);
 writeTestFileSync('artifacts/ship-casket-v453/constructed.json',serializeWorld(w));
 writeTestFileSync('artifacts/ship-casket-v453/constructed.meta.json',JSON.stringify({...meta,tick:w.tick,casketId:casket.id,actualConstructionFinished:true,rawExactReplay:true,publicCheckpointAndDelta:true},null,2));
 // The real final free colonist can enter this player-ejectable spatial holder.
 command(w,{type:'order-enter-ship-casket',pawnId:builderId,casketId:casket.id});
 until(w,()=>casket.shipCryptosleep277.occupant?.kind==='human',1500);
 const held=casket.shipCryptosleep277;expect(held.occupant?.kind).toBe('human');if(held.occupant?.kind!=='human')throw Error('Original not held');
 expect(held.occupant.pawn).toBe(person);expect(w.pawns.some(p=>p.id===builderId)).toBe(false);
 const frozen=structuredClone(held),heldAt=w.tick;send();roundtrip(w);stepWorld(w,40);
 expect(casket.shipCryptosleep277).toEqual(frozen);expect(w.tick).toBe(heldAt+40);send();roundtrip(w);
 const built=indexShipParts276(w.structures,w.width,w.height);expect(built.ok).toBe(true);if(!built.ok)throw Error(built.reason);
 expect(readShipAssembly276(built.index,reactorId)).toMatchObject({ok:true,counts:{casket:1},occupiedCaskets:1,launchImplemented:false});
 writeTestFileSync('artifacts/ship-casket-v453/occupied.json',serializeWorld(w));
 const tick=w.tick;command(w,{type:'eject-ship-casket',casketId:casket.id});expect(w.tick).toBe(tick);
 expect(casket.shipCryptosleep277.occupant).toBeNull();expect(w.pawns.find(p=>p.id===builderId)).toBe(person);
 expect(person.health?.cryptosleepSickness).toBeDefined();expect(person.filthFeet?.carried.some(f=>f.kind==='slime')).toBe(true);
 expect(person.shipCryptosleepHeldAt277).toBeUndefined();send();roundtrip(w);
 writeTestFileSync('artifacts/ship-casket-v453/ejected.json',serializeWorld(w));
 writeTestFileSync('tmp/ship-casket-v453/earned-inputs.json',JSON.stringify({frame:testOutputPath('artifacts/ship-casket-v453/native-paid-frame.json'),constructed:testOutputPath('artifacts/ship-casket-v453/constructed.json'),occupied:testOutputPath('artifacts/ship-casket-v453/occupied.json'),ejected:testOutputPath('artifacts/ship-casket-v453/ejected.json'),casketId:casket.id,builderId,actualPaidConstruction:true,actualLastColonistEntry:true,actualDirectEjection:true},null,2));
},180000);
