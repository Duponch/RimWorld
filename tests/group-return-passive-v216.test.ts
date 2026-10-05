import { expect,test } from 'vitest';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots.ts';
import { tryGroupDeparture } from '../src/sim/group-driver.ts';
import { validateGroupState } from '../src/sim/group-save.ts';
import type { AwayGroup } from '../src/sim/group-capture.ts';
import { captureCivilianReturnFinder } from '../src/sim/civilian-return.ts';
import { addMaterial,refreshStock,transferPile } from '../src/sim/materials.ts';
import { groundCapacity,groundPile,nearbyGround } from '../src/sim/ground-placement.ts';
import { equippedWeapon } from '../src/sim/equipment-rules.ts';
import { pawnBody } from '../src/sim/health-rules.ts';
import { createMedicalRecord,addResolvedInjury,medicalStatus,medicalBleed } from '../src/sim/injury-state.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import { FLU_INITIAL } from '../src/sim/flu-rules.ts';
import { exposeFoodPoisoning } from '../src/sim/food-poisoning.ts';
import type { Pawn,World } from '../src/sim/types.ts';

function valid(w:World):void {expect(validateWorld(w)).toEqual([]);}
function checkpoint(w:World):World {
  valid(w);const twin=deserializeWorld(serializeWorld(w));expect(twin).toEqual(w);
  const adoption=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));
  expect(adoption.status).toBe('applied');if(adoption.status==='applied')expect(adoption.world).toEqual(w);
  return twin;
}

/** Prepare the last return frontier. Departure still transfers the actual
 * originals through its producer; this fixture does not claim a played route. */
function returning(beforeDeparture?:(w:World,p:Pawn)=>void) {
  const w=createScenarioWorld(216,32,'survivors'),members=w.pawns.slice(0,2),p=members[0]!;
  for(const person of w.pawns){
    person.recreation.level=100;person.schedule.fill('work');person.apparelAutomation=false;
    for(const key of Object.keys(person.priorities) as (keyof Pawn['priorities'])[])person.priorities[key]=0;
  }
  for(const person of members){delete person.health;delete person.background;delete person.traits;person.hunger=90;person.rest=90;}
  beforeDeparture?.(w,p);
  addMaterial(w,'weapon',1,{type:'equipment',pawnId:p.id},'plasteel-knife');
  const weapon=equippedWeapon(w,p)!;weapon.weapon!.quality='good';weapon.weapon!.hitPoints=137;
  addMaterial(w,'food',2,{type:'inventory',pawnId:p.id},'survival-meal');
  expect(applyCommand(w,{type:'planet-adopt'}).ok).toBe(true);
  expect(applyCommand(w,{type:'group-start',memberIds:members.map(p=>p.id),destination:w.planet!.civilianTile,sources:[]}).ok).toBe(true);
  const preparing=w.group;if(!preparing||!('manifest' in preparing))throw Error('Missing real formation');
  preparing.phase='leaving';
  for(const exit of preparing.exits){
    const person=w.pawns.find(p=>p.id===exit.pawnId)!;
    if(!exit.cell)throw Error('Missing prepared exit');
    person.x=exit.cell.x;person.z=exit.cell.z;person.path=[];person.moveCooldown=0;person.planCooldown=0;delete person.motion;
  }
  tryGroupDeparture(w);
  const g=w.group;if(!g||!('members' in g))throw Error('Actual owners did not depart');
  g.phase='awaiting-entry';g.tile=w.planet!.homeTile;g.destination=g.tile;g.route=[g.tile];g.segment=null;g.stop={kind:'awaiting-entry'};
  const entry=captureCivilianReturnFinder(w)(g.entry);if(!entry)throw Error('Prepared home has no accessible return');g.entry=entry;
  checkpoint(w);return {w,g,p,weapon};
}

function impair(p:Pawn,tick:number,kind:'downed'|'no-manipulation'):void {
  p.health=createMedicalRecord(tick);
  const parts=kind==='downed'?['left-leg','right-leg'] as const:['left-arm','right-arm'] as const;
  for(const part of parts)addResolvedInjury(p.health,part,'cut',30_000,()=>.999999);
  const status=medicalStatus(p.health);p.state=status==='mobile'?'idle':status;
  if(kind==='downed')expect(p.state).toBe('downed');else expect(pawnBody(p).capacities.manipulation).toBe(0);
}

test.each(['downed','no-manipulation'] as const)('return of an armed %s original performs a physical identity-preserving drop before publication',kind=>{
  const {w,p,weapon}=returning(),id=weapon.id,metadata=structuredClone(weapon.weapon);
  impair(p,w.tick,kind);const twin=checkpoint(w),nextId=w.nextId;
  stepWorld(w);stepWorld(twin);
  expect(w).toEqual(twin);expect(w.pawns.find(q=>q.id===p.id)).toBe(p);expect(w.piles.find(i=>i.id===id)).toBe(weapon);
  expect(weapon.owner.type).toBe('ground');expect(weapon.weapon).toEqual({...metadata,forbidden:true});
  expect(p.equipmentDropPending).toBeUndefined();expect(equippedWeapon(w,p)).toBeUndefined();expect(w.nextId).toBe(nextId);
  const resumed=checkpoint(w);stepWorld(w,3);stepWorld(resumed,3);expect(w).toEqual(resumed);valid(w);
});

test('a saturated return retains the disabled original weapon, then retries after a real pile merge frees ground',()=>{
  const {w,g,p,weapon}=returning();impair(p,w.tick,'downed');
  for(const cell of nearbyGround(w,g.entry))if(!groundPile(w,cell)&&groundCapacity(w,cell,'wood')>=1)addMaterial(w,'wood',1,{type:'ground',...cell},'wood');
  refreshStock(w);checkpoint(w);stepWorld(w);
  expect(w.pawns).toContain(p);expect(w.piles).toContain(weapon);expect(weapon.owner).toEqual({type:'equipment',pawnId:p.id});
  expect(p.equipmentDropPending).toBe(true);expect(weapon.weapon?.forbidden).toBeUndefined();
  checkpoint(w);
  const nearby=nearbyGround(w,p),filler=nearby.map(c=>groundPile(w,c)).find(i=>i?.item==='wood'&&i.quantity===1)!;
  const destination=nearby.find(c=>{const i=groundPile(w,c);return i&&i!==filler&&i.item==='wood'&&groundCapacity(w,c,'wood')>=1;});
  if(!filler||!destination)throw Error('No actual saturated-floor merge available');
  const stock=w.stock.wood,nextId=w.nextId;
  expect(transferPile(w,filler,{type:'ground',...destination})).toBe(true);expect(w.stock.wood).toBe(stock);
  const resumed=checkpoint(w);
  for(let i=0;i<20&&p.equipmentDropPending;i++){stepWorld(w);stepWorld(resumed);expect(w).toEqual(resumed);}
  expect(p.equipmentDropPending).toBeUndefined();expect(w.piles.find(i=>i.id===weapon.id)).toBe(weapon);
  expect(weapon.owner.type).toBe('ground');expect(weapon.weapon?.forbidden).toBe(true);expect(w.nextId).toBe(nextId);checkpoint(w);
});

function terminal(customPolicy=false) {
  let policyId=0;
  const {w,g,p,weapon}=returning(customPolicy?(world,person)=>{
    expect(applyCommand(world,{type:'food-policy-create',name:'Régime conservé'}).ok).toBe(true);
    policyId=world.nextFoodPolicyId-1;expect(applyCommand(world,{type:'food-policy-assign',pawnId:person.id,policyId}).ok).toBe(true);
    person.apparelPolicyId=2;
  }:undefined);
  g.phase='at-site';g.tile=w.planet!.civilianTile;g.destination=g.tile;g.route=[g.tile];g.stop={kind:'at-site'};
  p.health=createMedicalRecord(w.tick);addResolvedInjury(p.health,'left-hand','cut',6000,()=>.999999);p.health.bloodLoss=BLOOD_UNIT-1;p.medicalCare='none';
  expect(medicalBleed(p.health)).toBeGreaterThanOrEqual(.1);
  const status=medicalStatus(p.health);p.state=status==='mobile'?'idle':status;
  checkpoint(w);
  for(let i=0;i<6&&!w.groupLosses?.some(l=>l.pawn.id===p.id);i++)stepWorld(w);
  const loss=w.groupLosses?.find(l=>l.pawn.id===p.id);if(!loss)throw Error('No real clinical terminal transfer');
  expect(loss.pawn).toBe(p);expect(loss.items).toContain(weapon);expect(loss.tick).toBe(p.health!.death!.tick);checkpoint(w);
  return {w,p,loss,policyId};
}

test('passive living and terminal owners accept ordinary disease but reject forged spatial vomiting through save and decoder',()=>{
  const live=returning(),dead=terminal();
  live.g.phase='at-site';live.g.tile=live.w.planet!.civilianTile;live.g.destination=live.g.tile;live.g.route=[live.g.tile];live.g.stop={kind:'at-site'};
  for(const fixture of [{w:live.w,p:live.p},{w:dead.w,p:dead.p}])for(const disease of ['foodPoisoning','flu'] as const){
    const clean=structuredClone(fixture.w);
    const person=clean.group&&'members' in clean.group?clean.group.members.find(p=>p.id===fixture.p.id)??clean.groupLosses?.find(l=>l.pawn.id===fixture.p.id)?.pawn:clean.groupLosses?.find(l=>l.pawn.id===fixture.p.id)?.pawn;
    if(!person)throw Error('Missing actual passive owner');
    person.health??=createMedicalRecord(clean.tick);
    if(disease==='foodPoisoning')person.health.foodPoisoning=exposeFoodPoisoning(undefined,'unknown','survival-meal',person.health.tick);
    else person.health.flu={bornAt:person.health.tick,severity:FLU_INITIAL,immunity:0,luck:1_000_000};
    const status=medicalStatus(person.health);person.state=status==='mobile'?'idle':status;checkpoint(clean);
    const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(clean,0,1)));
    expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Baseline passive disease rejected');
    const retained=JSON.stringify(first.world),bad=structuredClone(clean);
    const owner=person.state==='dead'?bad.groupLosses!.find(l=>l.pawn.id===person.id)!.pawn:(bad.group as AwayGroup).members.find(p=>p.id===person.id)!;
    owner.health![disease]!.vomit={remainingCore:890,cell:{x:owner.x,z:owner.z}};
    expect(validateGroupState(bad,196).length).toBeGreaterThan(0);expect(()=>serializeWorld(bad)).toThrow();
    expect(decoder.adopt(structuredClone(encoder.encode(bad,0,1))).status).toBe('resync');expect(JSON.stringify(first.world)).toBe(retained);
    expect(decoder.adopt(structuredClone(encoder.encode(clean,0,1))).status).toBe('applied');
  }
});

test('a real terminal keeps its frozen policy references after deletion, while live and future policy references remain strict',()=>{
  const {w,p,loss,policyId}=terminal(true),frozen=JSON.stringify(loss);
  expect(applyCommand(w,{type:'food-policy-delete',policyId}).ok).toBe(true);
  expect(w.foodPolicies.some(policy=>policy.id===policyId)).toBe(false);expect(JSON.stringify(loss)).toBe(frozen);checkpoint(w);
  const withoutApparel=structuredClone(w);withoutApparel.apparelPolicies=withoutApparel.apparelPolicies!.filter(policy=>policy.id!==p.apparelPolicyId);
  checkpoint(withoutApparel);expect(JSON.stringify(withoutApparel.groupLosses!.find(l=>l.pawn.id===p.id))).toBe(frozen);
  for(const corrupt of [
    (world:World)=>{world.groupLosses![0]!.pawn.foodPolicyId=world.nextFoodPolicyId;},
    (world:World)=>{world.groupLosses![0]!.pawn.apparelPolicyId=world.nextApparelPolicyId;},
    (world:World)=>{(world.group as AwayGroup).members[0]!.foodPolicyId=policyId;},
    (world:World)=>{(world.group as AwayGroup).members[0]!.apparelPolicyId=p.apparelPolicyId;},
  ]){const bad=structuredClone(withoutApparel);corrupt(bad);expect(validateGroupState(bad,196).length).toBeGreaterThan(0);}
  const resumed=checkpoint(w);stepWorld(w,3);stepWorld(resumed,3);expect(w).toEqual(resumed);expect(JSON.stringify(loss)).toBe(frozen);valid(w);
});
