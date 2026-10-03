import { expect,test } from 'vitest';
import { advancePodRescues,exitPodRescue,reconcilePodRescueResults,resolveSelectedPodRescue } from '../src/sim/pod-rescue.ts';
import { validPawnPodRescue,validPodRescueShape,validatePodRescues } from '../src/sim/pod-rescue-save.ts';
import { POD_RESCUE_FALL_TICKS,POD_RESCUE_OPEN_TICKS,POD_RESCUE_LIMIT } from '../src/sim/pod-rescue-state.ts';
import { medicalStatus,createMedicalRecord } from '../src/sim/injury-state.ts';
import { injurePawn,updatePawnHealth } from '../src/sim/health.ts';
import { advanceHumanCorpses } from '../src/sim/human-corpses.ts';
import { startTravel } from '../src/sim/movement.ts';
import { createPrisonerState } from '../src/sim/prisoner-state.ts';
import type { Pawn,World } from '../src/sim/types.ts';
import { deconstructionCamp,fixtureBuilding } from './scenarios/deconstruction.ts';

const at=(w:World,tick:number)=>{w.tick=tick;advancePodRescues(w);};
function opened():{w:World;p:Pawn} {
  const w=deconstructionCamp(1);expect(resolveSelectedPodRescue(w,187)).toBe(true);
  at(w,w.podRescues!.pending!.openAt);const p=w.pawns.find(p=>p.podRescue)!;
  expect(p).toBeDefined();return {w,p};
}
/** Prepared recovered checkpoint for terminal boundary tests. Medical recovery
 * itself is exercised centrally through the actual rescue/treatment pipeline. */
function recovered():{w:World;p:Pawn} {
  const result=opened(),{w,p}=result;
  p.health=createMedicalRecord(w.tick);p.state='idle';p.podRescue!.admittedAt=w.tick;
  p.x=1;p.z=1;return result;
}
function arriveEdge(w:World,p:Pawn):void {
  expect(startTravel(w,p,{x:0,z:1})).toBe(true);
  expect(exitPodRescue(w,p)).toBe(false);
  w.tick=Math.ceil(p.motion!.end);p.moveCooldown=0;
  updatePawnHealth(w,p);
}
function mapIds(w:World):Set<number> {return new Set([...w.pawns.map(p=>p.id),...w.piles.map(p=>p.id),...w.structures.map(s=>s.id)]);}

test('pod staging opens exactly once, preserving world RNG, identities and checkpoint continuation',()=>{
  const w=deconstructionCamp(1),rng=w.rng,nextId=w.nextId,pawns=w.pawns.length;
  expect(resolveSelectedPodRescue(w,187)).toBe(true);
  const pending=structuredClone(w.podRescues!.pending!);
  expect(pending.landAt-pending.start).toBe(POD_RESCUE_FALL_TICKS);
  expect(pending.openAt-pending.landAt).toBe(POD_RESCUE_OPEN_TICKS);
  for(let tick=w.tick+1;tick<pending.openAt;tick++){at(w,tick);expect(w.pawns).toHaveLength(pawns);expect(w.nextId).toBe(nextId);}
  const copy=structuredClone(w);at(w,pending.openAt);at(copy,pending.openAt);expect(copy).toEqual(w);
  const p=w.pawns.find(p=>p.podRescue)!;
  expect(p.faction).toBe('outlanders');expect(p.podRescue!.admittedAt).toBeUndefined();expect(p.state).toBe('downed');
  expect(medicalStatus(p.health!)).toBe('downed');expect(p.health!.death).toBeUndefined();expect(p.health!.injuries).toHaveLength(5);
  expect(Object.values(p.priorities).every(n=>n===0)).toBe(true);expect(p.bedId).toBeNull();
  expect(w.piles.filter(i=>'pawnId' in i.owner&&i.owner.pawnId===p.id)).toMatchObject([{id:nextId+1,item:'cloth-shirt',owner:{type:'apparel',pawnId:nextId}}]);
  expect(w.nextId).toBe(nextId+2);expect(w.rng).toBe(rng);expect(w.podRescues!.pending).toBeUndefined();
  at(w,w.tick+1);expect(w.podRescues!.incidents).toHaveLength(1);expect(w.pawns).toHaveLength(pawns+1);
  expect(validatePodRescues(w,175,mapIds(w))).toEqual([]);
});

test('refused seed, occupied pending and unavailable landing are atomic',()=>{
  const w=deconstructionCamp(1);
  for(const seed of [0,-1,NaN,.5,0x100000000]){const before=structuredClone(w);expect(resolveSelectedPodRescue(w,seed)).toBe(false);expect(w).toEqual(before);}
  expect(resolveSelectedPodRescue(w,7)).toBe(true);const before=structuredClone(w);
  expect(resolveSelectedPodRescue(w,8)).toBe(false);expect(w).toEqual(before);
  const sealed=deconstructionCamp(1);sealed.tiles=sealed.tiles.map(()=>({terrain:'rock'}));
  const snapshot=structuredClone(sealed);expect(resolveSelectedPodRescue(sealed,187)).toBe(false);expect(sealed).toEqual(snapshot);
});

test('opening blocked after descent waits on the original cell without allocating or drawing',()=>{
  const w=deconstructionCamp(1);expect(resolveSelectedPodRescue(w,19)).toBe(true);
  const pending=structuredClone(w.podRescues!.pending!),wall=fixtureBuilding(w,'wall',pending.cell.x,pending.cell.z),next=w.nextId,rng=w.rng;
  at(w,pending.openAt);expect(w.podRescues!.pending).toEqual(pending);expect(w.nextId).toBe(next);expect(w.rng).toBe(rng);
  const copy=structuredClone(w);at(w,w.tick+3);at(copy,copy.tick+3);expect(copy).toEqual(w);
  w.structures=w.structures.filter(s=>s!==wall);at(w,w.tick+1);
  const p=w.pawns.find(p=>p.podRescue)!;expect({x:p.x,z:p.z}).toEqual(pending.cell);expect(w.podRescues!.incidents[0]!.openedAt).toBe(w.tick);
});

test('completed treatment is observed separately from death and the physical corpse retains provenance',()=>{
  const {w,p}=opened();advancePodRescues(w);expect(w.podRescues!.incidents[0]!.tendedAt).toBeUndefined();
  // A prepared completed-treatment medical record is the observation boundary.
  p.health!.injuries[0]!.tended=0;at(w,w.tick+1);const tendedAt=w.tick;
  expect(w.podRescues!.incidents[0]!.tendedAt).toBe(tendedAt);
  injurePawn(w,p,'brain','crush',99000);advancePodRescues(w);advanceHumanCorpses(w);
  const i=w.podRescues!.incidents[0]!;expect(i).toMatchObject({result:'dead',resolvedAt:w.tick,tendedAt});
  expect(w.pawns.find(q=>q.id===p.id)).toBe(p);expect(p.podRescue).toEqual({incidentId:i.id});
  expect(w.piles.find(x=>x.humanCorpse?.pawnId===p.id)).toBeDefined();expect(w.podRescues!.departed).toHaveLength(0);
  expect(validatePodRescues(w,175,mapIds(w))).toEqual([]);
});

test('border departure waits for real captured edge, exports owners once and survives replay',()=>{
  const {w,p}=recovered(),shirt=w.piles.find(i=>i.owner.type==='apparel'&&i.owner.pawnId===p.id)!,nextId=w.nextId;
  expect(exitPodRescue(w,p)).toBe(false);arriveEdge(w,p);
  const copy=structuredClone(w),clone=copy.pawns.find(q=>q.id===p.id)!;
  expect(exitPodRescue(w,p)).toBe(true);expect(exitPodRescue(copy,clone)).toBe(true);expect(copy).toEqual(w);
  expect(w.pawns.some(q=>q.id===p.id)).toBe(false);expect(w.piles.some(i=>i.id===shirt.id)).toBe(false);expect(w.nextId).toBe(nextId);
  const d=w.podRescues!.departed[0]!;expect(d.items).toContainEqual(shirt);expect(d.pawn.id).toBe(p.id);expect(d.pawn.podRescue).toEqual(p.podRescue);
  expect(exitPodRescue(w,p)).toBe(false);expect(w.podRescues!.departed).toHaveLength(1);
  const clocks:number[]=[];
  expect(validatePodRescues(w,175,mapIds(w),departure=>{clocks.push(departure.tick);return [];})).toEqual([]);expect(clocks).toEqual([d.tick]);
  const corrupted=structuredClone(w);corrupted.podRescues!.departed[0]!.items[0]!.owner={type:'inventory',pawnId:corrupted.pawns[0]!.id};
  expect(validatePodRescues(corrupted,175,mapIds(corrupted),()=>[]).length).toBeGreaterThan(0);
});

test('medical work, carried objects and committed melee recovery cannot disappear at the border',()=>{
  const {w,p}=recovered();arriveEdge(w,p);const doctor=w.pawns[0]!;
  p.health!.injuries.push({id:1,part:'torso',kind:'bruise',severity:1000,bornAt:w.tick});
  expect(exitPodRescue(w,p)).toBe(false);p.health=createMedicalRecord(w.tick);
  const item={id:w.nextId++,kind:'wood' as const,item:'wood' as const,quantity:1,owner:{type:'pawn' as const,pawnId:p.id}};w.piles.push(item);
  expect(exitPodRescue(w,p)).toBe(false);w.piles=w.piles.filter(i=>i!==item);
  doctor.melee={order:{targetId:p.id,startedDowned:false},strike:{targetId:p.id,atCore:w.tick*10,untilCore:w.tick*10+120,tool:'left-fist',outcome:'hit'}};
  const strike=structuredClone(doctor.melee.strike);expect(exitPodRescue(w,p)).toBe(false);
  expect(doctor.melee?.order).toBeNull();expect(doctor.melee?.strike).toEqual(strike);expect(w.pawns).toContain(p);
  delete doctor.melee;expect(exitPodRescue(w,p)).toBe(true);
});

test('strict metadata rejects future fields, wrong clocks, malformed results and duplicate histories',()=>{
  const {w,p}=opened();expect(validPodRescueShape(w.podRescues,175,w)).toBe(true);
  expect(validPodRescueShape(w.podRescues,174,w)).toBe(false);expect(validPawnPodRescue(p,174,w)).toBe(false);
  for(const change of [
    (c:World)=>Object.assign(c.podRescues!,{invented:true}),
    (c:World)=>{c.podRescues!.incidents[0]!.openedAt=0;},
    (c:World)=>{c.podRescues!.incidents.push(structuredClone(c.podRescues!.incidents[0]!));},
    (c:World)=>{Object.assign(c.podRescues!.incidents[0]!,{result:{toString:'bad'},resolvedAt:c.tick});},
  ]){const copy=structuredClone(w);change(copy);expect(validPodRescueShape(copy.podRescues,175,copy)).toBe(false);}
  p.podRescue!.admittedAt=w.tick+1;expect(validPawnPodRescue(p,175,w)).toBe(false);
});

test('historical admission quota refuses without dropping an archive or changing RNG',()=>{
  const {w}=opened();w.podRescues!.serial=POD_RESCUE_LIMIT;
  const before=structuredClone(w);expect(resolveSelectedPodRescue(w,27)).toBe(false);expect(w).toEqual(before);
});

test('capture observation keeps the same person and provenance without retrying another opening',()=>{
  const {w,p}=opened();expect(resolveSelectedPodRescue(w,93)).toBe(true);
  const pending=structuredClone(w.podRescues!.pending!);
  p.prisoner=createPrisonerState(w,p);w.tick=pending.openAt;
  const nextId=w.nextId;reconcilePodRescueResults(w);
  expect(w.nextId).toBe(nextId);expect(w.podRescues!.pending).toEqual(pending);
  expect(w.podRescues!.incidents[0]).toMatchObject({result:'captured',resolvedAt:w.tick,pawnId:p.id});
  expect(p.podRescue).toEqual({incidentId:1});expect(w.pawns).toContain(p);expect(exitPodRescue(w,p)).toBe(false);
  expect(validatePodRescues(w,175,mapIds(w))).toEqual([]);
});

test('an ordinary bed assigned before admission requires the held forced rescue relationship',()=>{
  const {w,p}=opened(),doctor=w.pawns[0]!,bed=fixtureBuilding(w,'bed',p.x+1,p.z);
  p.bedId=bed.id;expect(validatePodRescues(w,175,mapIds(w)).length).toBeGreaterThan(0);
  doctor.orders.active='rescue';doctor.rescue={patientId:p.id,bedId:bed.id,phase:'approach'};
  expect(validatePodRescues(w,175,mapIds(w))).toEqual([]);
  doctor.orders.active=null;expect(validatePodRescues(w,175,mapIds(w)).length).toBeGreaterThan(0);
});

test('a nonadmitted person who recovers can leave with untended wounds but an admitted one cannot',()=>{
  const {w,p}=recovered();arriveEdge(w,p);delete p.podRescue!.admittedAt;
  p.health!.injuries.push({id:1,part:'torso',kind:'bruise',severity:1000,bornAt:w.tick});
  expect(medicalStatus(p.health!)).toBe('mobile');expect(exitPodRescue(w,p)).toBe(true);
  expect(w.podRescues!.incidents[0]).toMatchObject({result:'departed'});
});
