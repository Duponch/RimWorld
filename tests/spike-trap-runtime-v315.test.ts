import { expect,test } from 'vitest';
import { applySpikeTrapSwitch,reconcileSpikeTrapContacts,spikeTrapWindow,trySpringSpikeTrap } from '../src/sim/spike-traps.ts';
import { rebuildSpikeTrap } from '../src/sim/spike-trap-rebuild.ts';
import { initialSpikeTrapState,spikeTrapPhysicalCell,spikeTrapTargetKey } from '../src/sim/spike-trap-state.ts';
import { planSpikeTrapImpact } from '../src/sim/spike-trap-impact.ts';
import { createMedicalRecord,addResolvedInjury,medicalStatus } from '../src/sim/injury-state.ts';
import { createMechaMedicalRecord } from '../src/sim/mechanoid-health.ts';
import { healthRandom,reconcilePawnHealth } from '../src/sim/health.ts';
import { startTravel } from '../src/sim/movement.ts';
import { applyBulletStagger } from '../src/sim/stagger.ts';
import { addMaterial,refreshStock } from '../src/sim/materials.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { enableWildlife } from '../src/sim/wildlife.ts';
import { animalNutritionMax } from '../src/sim/animal-life.ts';
import { legacyHumanAge } from '../src/sim/human-age.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import { medicalCamp } from './scenarios/health.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { fixtureMechanoid } from './scenarios/mechanoid-combat-v213.ts';
import type { Pawn,Structure,World } from '../src/sim/types.ts';

function camp(count=1){
  const w=medicalCamp(count);w.structures=[];w.jobs=[];w.resources=[];w.piles=[];w.packed=[];delete w.home;w.tiles=w.tiles.map(()=>({terrain:'soil'}));
  // This fixture starts healthy, as the existing real-shot hunting fixture does.
  // Later injuries/deaths come from the actual trap medical transaction.
  for(const [i,p] of w.pawns.entries()){
    p.age=legacyHumanAge();delete p.health;
    Object.assign(p,{x:13+i,z:16,hunger:100,rest:100,restZeroTicks:0,collapsePending:false,state:'idle',path:[],motion:null,moveCooldown:0});
  }
  const s:Structure={id:w.nextId++,kind:'spike-trap',x:16,z:16,orientation:0,footprint:'standard',material:'wood',spikeTrap:initialSpikeTrapState(w,{x:16,z:16})};
  w.structures.push(s);refreshStock(w);return {w,p:w.pawns[0]!,s};
}
function updateCooldowns(w:World){for(const p of w.pawns)p.moveCooldown=Math.max(0,(p.motion?.end??w.tick)-w.tick);}
/** Runs only the actual sparse Core contact window, with no decision, physiology
 * or additional random producer hidden in the helper. */
function window(w:World){
  const value=spikeTrapWindow(w);let changed=false;
  if(value)for(let core=(w.tick-1)*10+1;core<=w.tick*10;core++)changed=value.advance(core)||changed;
  updateCooldowns(w);return changed;
}
function arrive(w:World,p:Pawn){expect(Number.isFinite(p.motion?.end)).toBe(true);while(p.motion!.end>w.tick){w.tick++;window(w);}expect(p.motion!.end<=w.tick).toBe(true);}

test('real entering edge cannot trigger before its paid end; the arrival commits damage and one whole structural loss',()=>{
  const {w,p,s}=camp();s.material='steel';p.faction='outlaws';p.x=s.x-1;p.state='moving';w.rng=1;
  const id=p.id,nextId=w.nextId,health=structuredClone(p.health),rng=w.rng;
  expect(startTravel(w,p,s)).toBe(true);const end=p.motion!.end;
  expect(Number.isFinite(end)).toBe(true);
  while(w.tick<Math.ceil(end)){
    w.tick++;const contacts=spikeTrapWindow(w)!;
    for(let core=(w.tick-1)*10+1;core<=w.tick*10;core++){
      const changed=contacts.advance(core);
      if(core<Math.ceil(end*10)){
        expect(changed).toBe(false);expect(w.structures).toContain(s);expect(p.health).toEqual(health);expect(w.rng).toBe(rng);expect(s.spikeTrap!.touching).toEqual([]);
      }else if(changed){expect(core).toBe(Math.ceil(end*10));break;}
    }
    updateCooldowns(w);
  }
  expect(w.structures).not.toContain(s);expect(w.pawns.find(a=>a.id===id)).toBe(p);expect(w.nextId).toBe(nextId);
  expect(p.health!.injuries.length+p.health!.missing.length).toBeGreaterThan(0);
  expect(w.rng).not.toBe(rng);expect(w.destroyed?.count).toBe(1);expect(w.destroyed?.lost.steel).toBe(45);expect(w.piles).toEqual([]);expect(w.jobs).toEqual([]);
  // A fall or death is allowed; the original person/record is still authoritative.
  expect(p.health!.tick).toBe(w.tick);expect(trySpringSpikeTrap(w,s,spikeTrapTargetKey(p),w.tick*10)).toBe(false);
});
test('a failed known contact draws once, survives reload while departing, then draws once on real re-entry',()=>{
  const {w,p,s}=camp();p.x=s.x;p.z=s.z;w.rng=0xdeadbeef;
  const expected={rng:w.rng};expect(healthRandom(expected)).toBeGreaterThanOrEqual(.005);
  expect(trySpringSpikeTrap(w,s,spikeTrapTargetKey(p),w.tick*10)).toBe(false);expect(w.rng).toBe(expected.rng);expect(s.spikeTrap!.touching).toEqual([spikeTrapTargetKey(p)]);
  p.draft={lastActiveTick:w.tick,target:null,queue:[]};expect(startTravel(w,p,{x:s.x+1,z:s.z})).toBe(true);p.state='moving';
  w.tick++;window(w);expect(s.spikeTrap!.touching).toEqual([spikeTrapTargetKey(p)]);expect(w.rng).toBe(expected.rng);
  expect(validateWorld(w)).toEqual([]);const copy=deserializeWorld(serializeWorld(w)),q=copy.pawns[0]!,t=copy.structures[0]!;
  expect(copy).toEqual(w);window(copy);expect(copy.rng).toBe(expected.rng);expect(t.spikeTrap!.touching).toEqual(s.spikeTrap!.touching);
  while(p.motion!.end>w.tick){w.tick++;copy.tick++;window(w);window(copy);expect(copy).toEqual(w);}
  expect(s.spikeTrap!.touching).toEqual([]);expect(w.rng).toBe(expected.rng);
  expect(healthRandom(expected)).toBeGreaterThanOrEqual(.005);
  expect(startTravel(w,p,s)).toBe(true);expect(startTravel(copy,q,t)).toBe(true);
  while(p.motion!.end>w.tick){w.tick++;copy.tick++;window(w);window(copy);expect(copy).toEqual(w);}
  expect(w.rng).toBe(expected.rng);expect(s.spikeTrap!.touching).toEqual([spikeTrapTargetKey(p)]);
  // A second decision visit is at the current physical time; replaying this
  // tick's earlier Core times would manufacture a departure and another entry.
  spikeTrapWindow(w)!.visit(p);expect(w.rng).toBe(expected.rng);expect(p.health).toBeUndefined();expect(w.structures).toContain(s);
});
test('a known neutral has exact zero chance, records contact and never consumes random state while remaining',()=>{
  const {w,p,s}=camp();p.faction='outlanders';p.x=s.x;p.z=s.z;w.rng=1;const before=structuredClone(p.health);
  expect(trySpringSpikeTrap(w,s,spikeTrapTargetKey(p),w.tick*10)).toBe(false);
  for(let i=0;i<3;i++){w.tick++;window(w);reconcileSpikeTrapContacts(w);expect(w.rng).toBe(1);}
  expect(s.spikeTrap!.touching).toEqual([spikeTrapTargetKey(p)]);expect(p.health).toEqual(before);expect(w.structures).toContain(s);
});

test('the before-decision visit records a paid arrival before a new edge replaces its original segment',()=>{
  const {w,p,s}=camp();p.faction='outlanders';p.x=s.x-1;expect(startTravel(w,p,s)).toBe(true);
  w.tick=Math.ceil(p.motion!.end);updateCooldowns(w);const contacts=spikeTrapWindow(w)!,rng=w.rng;
  expect(contacts.visit(p)).toBe(false);expect(s.spikeTrap!.touching).toEqual([spikeTrapTargetKey(p)]);expect(w.rng).toBe(rng);
  expect(startTravel(w,p,{x:s.x+1,z:s.z})).toBe(true);expect(p.motion!.from).toEqual({x:s.x,z:s.z});
  contacts.refresh();
  expect(s.spikeTrap!.touching).toEqual([spikeTrapTargetKey(p)]);expect(w.rng).toBe(rng);
  arrive(w,p);expect(s.spikeTrap!.touching).toEqual([]);expect(w.rng).toBe(rng);
});
test.each([.005,.025,.095])('a short remaining edge fraction %s contacts only at the first paid Core tick',fraction=>{
  const {w,p,s}=camp();p.faction='outlanders';p.x=s.x;p.z=s.z;p.state='moving';
  const end=w.tick-fraction;p.motion={from:{x:s.x-1,z:s.z},to:{x:s.x,z:s.z},start:end-7,end,speedFactor:1,terrainDelay:4};
  const contacts=spikeTrapWindow(w)!,rng=w.rng,due=Math.ceil(end*10);
  for(let core=(w.tick-1)*10+1;core<=w.tick*10;core++){
    expect(contacts.advance(core)).toBe(false);expect(s.spikeTrap!.touching).toEqual(core<due?[]:[spikeTrapTargetKey(p)]);expect(w.rng).toBe(rng);
  }
  contacts.refresh();expect(contacts.advance(w.tick*10+1)).toBe(false);expect(w.rng).toBe(rng);
});
test('real bullet stagger refresh discards an earlier queued arrival and contact waits for the extended edge',()=>{
  const {w,p,s}=camp();p.faction='outlanders';p.x=s.x-1;p.state='moving';expect(startTravel(w,p,s)).toBe(true);
  const original=structuredClone(p.motion!);w.tick=Math.ceil(original.end);updateCooldowns(w);
  const contacts=spikeTrapWindow(w)!,core=(w.tick-1)*10+1,rng=w.rng;
  expect(contacts.advance(core)).toBe(false);expect(s.spikeTrap!.touching).toEqual([]);
  applyBulletStagger(w,p,core,1);expect(p.motion!.end).toBeGreaterThan(original.end);contacts.refresh();
  for(let at=core+1;at<=w.tick*10;at++){expect(contacts.advance(at)).toBe(false);expect(s.spikeTrap!.touching).toEqual([]);expect(w.rng).toBe(rng);}
  expect(spikeTrapPhysicalCell(p,w.tick*10)).toEqual(original.from);arrive(w,p);
  expect(s.spikeTrap!.touching).toEqual([spikeTrapTargetKey(p)]);expect(w.rng).toBe(rng);expect(p.motion!.from).toEqual(original.from);
});
test('an ignorant mechanical contact commits its real protected body and consumes the trap once',()=>{
  const {w,s}=camp();s.material='steel';const m=fixtureMechanoid(w,s.x,s.z);w.rng=1;
  const plan=planSpikeTrapImpact(w,spikeTrapTargetKey(m),'steel',w.tick*10)!;expect(plan).toBeDefined();const nextId=w.nextId;
  expect(trySpringSpikeTrap(w,s,spikeTrapTargetKey(m),w.tick*10)).toBe(true);
  expect(w.mechanoids![0]).toBe(m);expect(m.health).toEqual(plan.record);expect(m.health!.body).toBe('scyther');expect(m.health!.bloodLoss).toBe(0);expect(w.rng).toBe(plan.rngAfter);
  expect(w.nextId).toBe(nextId);expect(w.destroyed?.lost.steel).toBe(45);expect(w.structures).not.toContain(s);const before=structuredClone(w);
  expect(trySpringSpikeTrap(w,s,spikeTrapTargetKey(m),w.tick*10)).toBe(false);expect(w).toEqual(before);
});
test('an ignorant manhunter uses real animal physiology and its own violent-downing stream',()=>{
  const {w,s}=camp();s.material='steel';
  w.resources.push({id:w.nextId++,kind:'berries',x:10,z:10,amount:10,growth:1,growthTick:w.tick});enableWildlife(w,1);const a=w.wildlife!.animals[0]!;
  Object.assign(a,{x:s.x,z:s.z,state:'idle',rest:1,food:animalNutritionMax(a),path:[]});delete a.motion;delete a.meal;
  a.health={...createMedicalRecord(w.tick),body:a.species};a.manhunter={startedAtCore:w.tick*10,rng:1,zeroRestTicks:0};w.rng=1;
  const plan=planSpikeTrapImpact(w,spikeTrapTargetKey(a),'steel',w.tick*10)!;expect(plan).toBeDefined();
  expect(trySpringSpikeTrap(w,s,spikeTrapTargetKey(a),w.tick*10)).toBe(true);
  expect(w.wildlife!.animals[0]).toBe(a);expect(a.health).toEqual(plan.record);expect(w.rng).toBe(plan.rngAfter);expect(a.health!.body).toBe(a.species);
  expect(a.health!.injuries.length+a.health!.missing.length).toBeGreaterThan(0);expect(w.destroyed?.lost.steel).toBe(45);expect(w.piles).toEqual([]);
});
test.each(['injury','chance-injury','loss-count','loss-material'] as const)('%s exhaustion refuses chance, impacts and structural consumption atomically',exhaustion=>{
  const {w,p,s}=camp();p.x=s.x;p.z=s.z;p.faction=exhaustion==='chance-injury'?'colony':'outlaws';w.rng=1;
  if(exhaustion==='injury'||exhaustion==='chance-injury'){p.health=createMedicalRecord(w.tick);p.health.nextInjuryId=Number.MAX_SAFE_INTEGER;}
  if(exhaustion==='chance-injury'){const random={rng:w.rng};expect(healthRandom(random)).toBeLessThan(.005);}
  if(exhaustion==='loss-count')w.destroyed={count:Number.MAX_SAFE_INTEGER,lost:{wood:1}};
  if(exhaustion==='loss-material')w.destroyed={count:1,lost:{wood:Number.MAX_SAFE_INTEGER}};
  expect(validateWorld(w)).toEqual([]);const before=serializeWorld(w);
  expect(trySpringSpikeTrap(w,s,spikeTrapTargetKey(p),w.tick*10)).toBe(false);expect(serializeWorld(w)).toBe(before);
  expect(s.spikeTrap!.touching).toEqual([]);expect(w.structures).toContain(s);
});
test('automatic replacement starts empty and requires another full delivery plus ordinary construction',()=>{
  const {w,p,s}=camp();s.material='steel';s.spikeTrap!.autoRebuild=true;p.priorities.build=1;p.priorities.haul=1;p.skills.construction.level=20;
  const m=fixtureMechanoid(w,s.x,s.z);m.health=createMechaMedicalRecord(w.tick);addResolvedInjury(m.health,'scyther-brain','crack',7000,()=>.999999);expect(medicalStatus(m.health)).toBe('mobile');
  // Select only prospective physiology. The actual death must still be adopted
  // through trySpring; no corpse, fall or material consequence is authored.
  let lethal:ReturnType<typeof planSpikeTrapImpact>;
  for(let seed=1;seed<=64&&!lethal;seed++){w.rng=seed;const candidate=planSpikeTrapImpact(w,spikeTrapTargetKey(m),'steel',w.tick*10);if(candidate?.record.death)lethal=candidate;}
  expect(lethal).toBeDefined();const nextId=w.nextId;
  expect(trySpringSpikeTrap(w,s,spikeTrapTargetKey(m),w.tick*10)).toBe(true);expect(m.state).toBe('dead');
  const job=w.jobs.find(j=>j.kind==='spike-trap')!;expect(job).toMatchObject({id:nextId,construction:'blueprint',material:'steel',progress:0,reservedBy:null,escrow:{wood:0,food:0}});
  expect(w.piles.some(q=>q.owner.type==='job'&&q.owner.jobId===job.id)).toBe(false);expect(w.structures).not.toContain(s);
  stepWorld(w,12);expect(w.structures.some(q=>q.kind==='spike-trap')).toBe(false);expect(job.progress).toBe(0);expect(job.construction).toBe('blueprint');
  addMaterial(w,'steel',45,{type:'ground',x:13,z:15},'steel');refreshStock(w);
  for(let i=0;i<900&&!w.structures.some(q=>q.kind==='spike-trap');i++)stepWorld(w);
  const rebuilt=w.structures.find(q=>q.kind==='spike-trap')!;expect(rebuilt).toBeDefined();expect(rebuilt.id).not.toBe(s.id);expect(rebuilt.material).toBe('steel');
  expect(w.jobs).not.toContain(job);expect(w.piles.filter(q=>q.item==='steel').reduce((sum,q)=>sum+q.quantity,0)).toBe(0);expect(w.destroyed?.lost.steel).toBe(45);
  expect(rebuilt.spikeTrap).toEqual({autoRebuild:false,touching:[]});expect(validateWorld(w)).toEqual([]);
});
test('Home is an initial default; manual reconstruction outside Home and manual disabling are durable',()=>{
  const first=camp();first.w.home=[first.s.z*first.w.width+first.s.x];first.s.spikeTrap=initialSpikeTrapState(first.w,first.s);expect(first.s.spikeTrap.autoRebuild).toBe(true);
  expect(applySpikeTrapSwitch(first.w,{structureId:first.s.id,on:false}).ok).toBe(true);first.p.faction='outlaws';first.p.x=first.s.x;first.p.z=first.s.z;
  expect(trySpringSpikeTrap(first.w,first.s,spikeTrapTargetKey(first.p),first.w.tick*10)).toBe(true);expect(first.w.jobs).toEqual([]);
  const second=camp();second.p.faction='outlaws';second.p.x=second.s.x;second.p.z=second.s.z;expect(second.s.spikeTrap!.autoRebuild).toBe(false);
  expect(applySpikeTrapSwitch(second.w,{structureId:second.s.id,on:true}).ok).toBe(true);
  const copy=deserializeWorld(serializeWorld(second.w)),actor=copy.pawns[0]!,source=copy.structures[0]!;expect(source.spikeTrap!.autoRebuild).toBe(true);
  expect(trySpringSpikeTrap(copy,source,spikeTrapTargetKey(actor),copy.tick*10)).toBe(true);
  expect(copy.jobs).toHaveLength(1);expect(copy.jobs[0]).toMatchObject({kind:'spike-trap',construction:'blueprint',progress:0,escrow:{wood:0,food:0}});
});
test('replacement identity exhaustion consumes a real spring but cannot manufacture another plan or materials',()=>{
  const {w,p,s}=camp();s.spikeTrap!.autoRebuild=true;p.faction='outlaws';p.x=s.x;p.z=s.z;w.nextId=Number.MAX_SAFE_INTEGER;
  expect(validateWorld(w)).toEqual([]);expect(trySpringSpikeTrap(w,s,spikeTrapTargetKey(p),w.tick*10)).toBe(true);
  expect(w.structures).not.toContain(s);expect(w.jobs).toEqual([]);expect(w.piles).toEqual([]);expect(w.nextId).toBe(Number.MAX_SAFE_INTEGER);expect(w.destroyed?.lost.wood).toBe(45);
  const before=structuredClone(w);expect(rebuildSpikeTrap(w,s)).toBeUndefined();expect(w).toEqual(before);
});
test('paused reconciliation prunes a newly carried patient without a spring, random draw or new identity',()=>{
  const {w,p,s}=camp(2),patient=w.pawns[1]!,bed=fixtureBuilding(w,'bed',20,16);Object.assign(bed,{medical:true});
  patient.health={...createMedicalRecord(w.tick),bloodLoss:Math.round(.7*BLOOD_UNIT)};reconcilePawnHealth(w,patient);expect(patient.state).toBe('downed');
  Object.assign(p,{x:s.x,z:s.z,state:'moving'});Object.assign(patient,{x:s.x,z:s.z});p.priorities.doctor=1;p.rescue={patientId:patient.id,bedId:bed.id,phase:'carry'};
  s.spikeTrap!.touching=[spikeTrapTargetKey(patient)];const rng=w.rng,id=w.nextId,health=structuredClone(patient.health);
  reconcileSpikeTrapContacts(w);expect(s.spikeTrap!.touching).toEqual([]);expect(w.rng).toBe(rng);expect(w.nextId).toBe(id);expect(patient.health).toEqual(health);
  expect(trySpringSpikeTrap(w,s,spikeTrapTargetKey(patient),w.tick*10)).toBe(false);expect(w.rng).toBe(rng);expect(w.pawns[1]).toBe(patient);expect(w.structures).toContain(s);
});
