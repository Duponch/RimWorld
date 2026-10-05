import { expect,test } from 'vitest';
import { medicalCamp } from './scenarios/health.ts';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { createMechanoidRaid,advanceMechanoidRaid } from '../src/sim/mechanoid-raids.ts';
import { createMechaMedicalRecord,commitMechanoidImpact,mechaMass } from '../src/sim/mechanoid-health.ts';
import { addResolvedInjury } from '../src/sim/injury-state.ts';
import { advanceMechanoidCorpses } from '../src/sim/mechanoid-corpse.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { validMechCorpseShape } from '../src/sim/mechanoid-corpse-save.ts';
import type { Mechanoid } from '../src/sim/mechanoid-state.ts';
import type { World } from '../src/sim/types.ts';
import { SCHEMA_VERSION } from '../src/sim/types.ts';

const noDraw=()=>{throw new Error('No mechanical biological draw');};
function raidCamp(count=2){
  const w=createScenarioWorld(42,32,'crashlanded');
  // Keep the actual creation provenance and incident calendars. Only the
  // spatial inventory is cleared to isolate the mechanical transfer.
  w.resources=[];w.piles=[];w.jobs=[];w.structures=[];w.stockpiles=[];w.growingZones=[];
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));delete w.wildlife;refreshStock(w);
  stepWorld(w);
  const group=createMechanoidRaid(w,{budget:count*150,roster:Array.from({length:count},()=> 'scyther' as const)},
    {rng:0x12345678},Array.from({length:count},(_,i)=>({x:0,z:8+i*2})));
  expect(group).not.toBeNull();expect(validateWorld(w)).toEqual([]);return w;
}
function kill(w:World,m:Mechanoid,amputate=false){
  const r=createMechaMedicalRecord(w.tick);
  if(amputate)addResolvedInjury(r,'scyther-left-blade','cut',27000,noDraw);
  addResolvedInjury(r,'scyther-reactor','crack',27000,noDraw);
  expect(commitMechanoidImpact(w,m,r,{rng:w.rng},w.tick*10)).toBe(true);
  advanceMechanoidRaid(w);advanceMechanoidCorpses(w);
}
function checkpoint(w:World){expect(validateWorld(w)).toEqual([]);const twin=deserializeWorld(serializeWorld(w));expect(twin).toEqual(w);return twin;}

test('real raid and medical producers preserve staging, losses, corpse identity and frozen anatomy across saves',()=>{
  const w=raidCamp(),initialIds=w.mechanoids!.map(m=>m.id),next=w.nextId;
  let twin=checkpoint(w);expect(twin.raids!.mechActive!.phase).toBe('staging');
  for(const current of [w,twin])kill(current,current.mechanoids![0]!,true);
  expect(twin).toEqual(w);expect(w.raids!.mechActive!.phase).toBe('assault');
  expect(w.raids!.mechActive!.lost).toEqual([initialIds[0]]);expect(w.nextId).toBe(next);
  const corpse=w.piles.find(p=>p.id===initialIds[0])!;
  expect(corpse).toMatchObject({id:initialIds[0],item:'scyther-corpse',kind:'mech-corpse',quantity:1});
  expect(mechaMass(corpse.mechCorpse!)).toBeCloseTo(53.799,12); // blade .04335 and reactor .06 are absent.
  const frozen=structuredClone(corpse.mechCorpse!.health);twin=checkpoint(w);
  for(const current of [w,twin])kill(current,current.mechanoids![0]!);
  expect(twin).toEqual(w);expect(w.raids!.mechActive).toBeUndefined();expect(w.raids!.completed).toBe(1);
  expect(w.raids!.last).toMatchObject({mechanoid:true,reason:'defended',killed:2,downed:0,escaped:0});
  expect(w.mechanoids).toEqual([]);expect(w.piles.map(p=>p.id).sort((a,b)=>a-b)).toEqual(initialIds);
  expect(w.piles.find(p=>p.id===initialIds[0])!.mechCorpse!.health).toEqual(frozen);checkpoint(w);
});

test('death during a captured edge retains the real actor until its physical endpoint, then transfers the same ID',()=>{
  const w=raidCamp(1),m=w.mechanoids![0]!,id=m.id;
  // Prepared valid physical checkpoint, followed by a real medical producer.
  m.motion={from:{x:0,z:m.z},to:{x:1,z:m.z},start:w.tick-1,end:w.tick+2};m.x=1;m.moveCooldown=2;m.state='moving';
  kill(w,m);expect(w.mechanoids!.map(a=>a.id)).toEqual([id]);expect(w.piles).toHaveLength(0);
  const twin=checkpoint(w),last=w.tick;
  for(const current of [w,twin]){
    stepWorld(current);stepWorld(current);
  }
  expect(w.tick).toBe(last+2);
  expect(twin).toEqual(w);expect(w.mechanoids).toEqual([]);expect(w.piles[0]!.id).toBe(id);
  expect(w.piles[0]!.mechCorpse!.health.tick).toBe(last);checkpoint(w);
});

test('strict193 migration changes only the version and rejects future mechanical owners and metadata',()=>{
  const base=medicalCamp(),historical={...structuredClone(base),schemaVersion:193},before=structuredClone(historical);
  const migrated=deserializeWorld(JSON.stringify(historical));expect(migrated).toEqual({...before,schemaVersion:SCHEMA_VERSION});
  expect(migrated.mechanoids).toBeUndefined();expect(migrated.mechSalvage).toBeUndefined();expect(migrated.raids).toBeUndefined();
  for(const extra of [{mechanoids:[]},{mechSalvage:{completed:1,steel:15}}])
    expect(()=>deserializeWorld(JSON.stringify({...historical,...extra}))).toThrow(/Invalid version 193 save/);
  const raided=raidCamp(1),oldRaid={...structuredClone(raided),schemaVersion:193};
  expect(()=>deserializeWorld(JSON.stringify(oldRaid))).toThrow(/Invalid version 193 save/);
  kill(raided,raided.mechanoids![0]!);const corpse=raided.piles[0]!;
  expect(validMechCorpseShape(corpse,194,raided.tick)).toBe(true);expect(validMechCorpseShape(corpse,193,raided.tick)).toBe(false);
  const bad=structuredClone(raided);bad.piles[0]!.mechCorpse!.health.bloodLoss=1;
  expect(()=>serializeWorld(bad)).toThrow();
});
