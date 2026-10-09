import { expect,test } from 'vitest';
import { herdCareCamp } from './helpers/veterinary-v277.ts';
import { animalCareInProgress,animalCareProposal,animalCareTargets,animalCareWanted,
  applyAnimalCarePolicy,processAnimalCare,startAnimalCare } from '../src/sim/animal-care.ts';
import { veterinaryCareSpeciesAllowed,veterinaryNeedsRest } from '../src/sim/veterinary-rules.ts';
import { animalBodyModel } from '../src/sim/body-model.ts';
import { animalNutritionMax } from '../src/sim/animal-life.ts';
import { addResolvedInjury } from '../src/sim/injury-state.ts';
import { advanceAnimalHealth,reconcileAnimalHealth } from '../src/sim/wildlife-health.ts';
import { advanceWildlife } from '../src/sim/wildlife.ts';
import { advanceCorpses } from '../src/sim/corpses.ts';
import { reconcileDomesticWork } from '../src/sim/domestic-reconcile.ts';
import { addMaterial,reservedSource } from '../src/sim/materials.ts';
import { medicineClaims } from '../src/sim/medicine-logistics.ts';
import { blockedCells,reachableCells } from '../src/sim/pathfinding.ts';
import { releaseWork } from '../src/sim/work-release.ts';
import { startingPawn } from '../src/sim/starting-pawns.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import type { AnimalSpeciesId } from '../src/sim/animal-species.ts';
import type { AnimalCareContext } from '../src/sim/animal-care.ts';
import type { Pawn,World } from '../src/sim/types.ts';

function camp(species:AnimalSpeciesId='muffalo'){
  const fixture=herdCareCamp(species),w=fixture.world;
  return {...fixture,w,a:w.wildlife!.animals.find(a=>a.id===fixture.animalId)!,doctor:w.pawns.find(p=>p.id===fixture.doctorId)!};
}
const reach=(w:World,p:Pawn)=>reachableCells(w,p,blockedCells(w),new Set());
function context(w:World,p:Pawn):AnimalCareContext {
  return {search:()=>reach(w,p),candidates:()=>reach(w,p),blocked:()=>blockedCells(w),
    move:cell=>{p.x=cell.x;p.z=cell.z;p.path=[];},release:()=>releaseWork(w,p),event:()=>{}};
}
const medicineUnits=(w:World)=>w.piles.reduce((n,p)=>n+(p.kind==='medicine'?p.quantity:0),0);
function advanceCare(w:World,p:Pawn,until:'pickup'|'approach'|'treat'|'done'='done'){
  const ctx=context(w,p);
  for(let i=0;i<180&&p.animalCare&&(until==='done'||p.animalCare.phase!==until);i++){
    w.tick++;processAnimalCare(w,p,ctx,()=>1);
  }
}

test.each(['deer','gazelle','muffalo','dromedary'] as const)('%s receives one physical dose for its own two anatomical wounds',species=>{
  const {w,a,doctor,sourceId}=camp(species),body=a.health!,injuries=body.injuries.map(i=>i.id);
  expect(validateWorld(w)).toEqual([]);
  expect(body.body).toBe(species);expect(animalBodyModel(species).byId['left-hand']).toBeUndefined();
  expect(animalCareTargets(a)).toHaveLength(2);
  const proposal=animalCareProposal(w,doctor,reach(w,doctor))!;
  expect(proposal.target).toBe(a);expect(proposal.task.medicine).toMatchObject({sourcePileId:sourceId,quantity:1});
  startAnimalCare(doctor,proposal);expect(reservedSource(w,sourceId)).toBe(1);
  advanceCare(w,doctor,'approach');
  expect(w.piles.some(p=>p.kind==='medicine'&&p.owner.type==='pawn'&&p.owner.pawnId===doctor.id)).toBe(true);
  expect(medicineUnits(w)).toBe(3);
  if(species==='muffalo')expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  advanceCare(w,doctor);
  expect(a.health).toBe(body);expect(body.injuries.map(i=>i.id)).toEqual(injuries);
  expect(body.injuries.every(i=>i.tended!==undefined)).toBe(true);
  expect(animalCareTargets(a)).toHaveLength(0);expect(veterinaryNeedsRest(body)).toBe(true);
  expect(medicineUnits(w)).toBe(2);expect(doctor.skills.medicine.xp).toBeGreaterThan(0);
  expect(doctor.animalCare).toBeUndefined();expect(validateWorld(w)).toEqual([]);
});

test('herd admission is prospective, preserves historical hare care and never grants wild ownership',()=>{
  expect(veterinaryCareSpeciesAllowed('hare',105)).toBe(false);
  expect(veterinaryCareSpeciesAllowed('hare',106)).toBe(true);
  for(const species of ['deer','gazelle','muffalo','dromedary'] as const){
    expect(veterinaryCareSpeciesAllowed(species,211)).toBe(false);
    expect(veterinaryCareSpeciesAllowed(species,212)).toBe(true);
  }
  for(const species of ['snow-hare','red-fox'] as const)expect(veterinaryCareSpeciesAllowed(species,212)).toBe(false);
  const {w,a,doctor}=camp();w.schemaVersion=211 as World['schemaVersion'];
  expect(animalCareWanted(w,doctor)).toBe(false);
  expect(applyAnimalCarePolicy(w,{animalId:a.id,care:'herbal'}).ok).toBe(false);
  w.schemaVersion=212 as World['schemaVersion'];
  const domestic=a.domestic!;delete a.domestic;
  expect(animalCareWanted(w,doctor)).toBe(false);
  expect(applyAnimalCarePolicy(w,{animalId:a.id,care:'industrial'}).ok).toBe(false);
  a.domestic=domestic;a.state='idle';expect(animalCareWanted(w,doctor)).toBe(false);
  a.state='sleeping';a.domestic.care='none';expect(animalCareWanted(w,doctor)).toBe(false);
  expect(applyAnimalCarePolicy(w,{animalId:a.id,care:'industrial'}).ok).toBe(true);
  expect(animalCareWanted(w,doctor)).toBe(true);
  const old=camp('hare');old.w.schemaVersion=211 as World['schemaVersion'];
  expect(animalCareWanted(old.w,old.doctor)).toBe(true);
});

test('one patient cannot be reserved twice or while attached to a group-leading claim',()=>{
  const {w,a,doctor}=camp(),other=startingPawn(w.nextId++,'Autre médecin',8,8,0,100,w.seed,w.tick);
  w.pawns.push(other);
  startAnimalCare(doctor,animalCareProposal(w,doctor,reach(w,doctor))!);
  expect(animalCareProposal(w,other,reach(w,other))).toBeUndefined();
  releaseWork(w,doctor);
  other.animalHandling={animalId:w.nextId++,kind:'lead',markerId:1,sourcePileId:0,carryPileId:null,
    quantity:0,step:0,progress:0,phase:'lead',ropees:[a.id]};
  expect(animalCareProposal(w,doctor,reach(w,doctor))).toBeUndefined();
  other.animalHandling.ropees=[];other.animalHandling.gatherId=a.id;
  expect(animalCareWanted(w,doctor)).toBe(false);
  delete other.animalHandling;
  expect(animalCareWanted(w,doctor)).toBe(true);
});

test('ordinary and prosthetic surgery count toward the shared ten-medicine-reserver limit',()=>{
  const {w,doctor,sourceId}=camp(),source=w.piles.find(p=>p.id===sourceId)!;
  source.quantity=30;
  for(let i=0;i<10;i++){
    const p=startingPawn(w.nextId++,`Chirurgien ${i}`,i+1,2,0,100,w.seed,w.tick);
    p.surgery={patientId:doctor.id,part:'left-leg',bedId:1,spot:{x:i+1,z:2},phase:'pickup',progress:0,workCore:0,
      ...(i===9?{implant:'peg-leg' as const,ingredients:[{pileId:sourceId,item:'medicine' as const,quantity:1,stage:'source' as const,cell:{x:3,z:8}}]}:
        {medicine:{item:'medicine' as const,sourcePileId:sourceId,carryPileId:null,quantity:1}})};
    w.pawns.push(p);
  }
  expect(medicineClaims(w,sourceId)).toBe(10);expect(reservedSource(w,sourceId)).toBe(10);
  expect(animalCareProposal(w,doctor,reach(w,doctor))!.task.medicine).toBeUndefined();
  delete w.pawns.at(-1)!.surgery;
  expect(animalCareProposal(w,doctor,reach(w,doctor))!.task.medicine).toMatchObject({sourcePileId:sourceId,quantity:1});
});

test('the real planner collects medicine, survives a treatment reload and leaves the herd resting to heal',()=>{
  const {w,a,doctor}=camp();
  for(let i=0;i<450&&doctor.animalCare?.phase!=='treat';i++)stepWorld(w);
  expect(doctor.animalCare?.phase).toBe('treat');expect(animalCareInProgress(w,a)).toBe(true);
  expect(validateWorld(w)).toEqual([]);
  const copy=deserializeWorld(serializeWorld(w));
  for(let i=0;i<180&&animalCareTargets(a).length;i++){stepWorld(w);stepWorld(copy);}
  expect(copy).toEqual(w);expect(animalCareTargets(a)).toHaveLength(0);
  expect(medicineUnits(w)).toBe(2);expect(a.state).toBe('sleeping');
  expect(a.health!.injuries.length).toBeGreaterThan(0);expect(veterinaryNeedsRest(a.health!)).toBe(true);
  expect(validateWorld(w)).toEqual([]);
});

test('convalescence outlasts the last pansement, yields to hunger and leaves old schemas literal',()=>{
  const current=camp(),old=camp();old.w.schemaVersion=211 as World['schemaVersion'];
  for(const {a} of [current,old])for(const i of a.health!.injuries)i.tended=700;
  current.w.tick++;advanceWildlife(current.w);old.w.tick++;advanceWildlife(old.w);
  expect(current.a.state).toBe('sleeping');expect(old.a.state).not.toBe('sleeping');
  expect(animalCareTargets(current.a)).toHaveLength(0);
  current.a.food=animalNutritionMax(current.a)*.44;
  current.w.tick++;advanceWildlife(current.w);expect(current.a.state).not.toBe('sleeping');
  const h=current.a.health!;h.injuries=[{id:1,part:'left-front-leg',kind:'cut',severity:1000,bornAt:h.tick,
    tended:700,scar:{threshold:1000,pain:0}}];h.missing=[];
  expect(veterinaryNeedsRest(h)).toBe(false);
});

test('a herd wound infection is tended on its own anatomy and retains shared immunity after the visit',()=>{
  const {w,a,doctor}=camp('deer'),h=a.health!;
  h.infections={nextId:2,immunity:0,cases:[{id:1,part:'left-front-leg',bornAt:w.tick,severity:100_000_000,luck:1_000_000}]};
  startAnimalCare(doctor,animalCareProposal(w,doctor,reach(w,doctor))!);advanceCare(w,doctor);
  expect(h.infections.cases[0]!.tend?.quality).toEqual(expect.any(Number));
  expect(animalCareTargets(a)).toHaveLength(0);expect(veterinaryNeedsRest(h)).toBe(true);
  const immunity=h.infections.immunity;w.tick+=20;advanceAnimalHealth(w,a);
  expect(h.infections.immunity).toBeGreaterThan(immunity);
  // The infection is a separate treatment from the batch of two wounds.
  expect(h.body).toBe('deer');expect(medicineUnits(w)).toBe(1);
  h.injuries=[];h.infections.immunity=1_000_000_000;
  expect(veterinaryNeedsRest(h)).toBe(false);
});

test('danger interrupts actual treatment without consuming its carried dose or rewriting a captured animal edge',()=>{
  const {w,a,doctor}=camp();startAnimalCare(doctor,animalCareProposal(w,doctor,reach(w,doctor))!);
  advanceCare(w,doctor,'treat');expect(animalCareInProgress(w,a)).toBe(true);
  const before=medicineUnits(w),xp=doctor.skills.medicine.xp,rng=w.rng;
  a.strike={targetId:doctor.id,atCore:w.tick*10,untilCore:w.tick*10+120,tool:'head',outcome:'miss'};
  expect(animalCareInProgress(w,a)).toBe(false);
  processAnimalCare(w,doctor,context(w,doctor),()=>1);
  expect(doctor.animalCare).toBeUndefined();expect(medicineUnits(w)).toBe(before);
  expect(doctor.skills.medicine.xp).toBe(xp);expect(w.rng).toBe(rng);
  delete a.strike;a.state='moving';
  a.motion={from:{x:a.x-1,z:a.z},to:{x:a.x,z:a.z},start:w.tick,end:w.tick+3,speedFactor:1,terrainDelay:0};
  const edge=a.motion;expect(animalCareWanted(w,doctor)).toBe(false);expect(a.motion).toBe(edge);
});

test('patient death during medicine transport releases the claim and preserves medicine on saturated ground',()=>{
  const {w,a,doctor}=camp();startAnimalCare(doctor,animalCareProposal(w,doctor,reach(w,doctor))!);
  advanceCare(w,doctor,'approach');
  const held=w.piles.find(p=>p.kind==='medicine'&&p.owner.type==='pawn')!,before=medicineUnits(w);
  expect(held).toBeDefined();
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++){
    if(w.piles.some(p=>p.owner.type==='ground'&&p.owner.x===x&&p.owner.z===z))continue;
    addMaterial(w,'wood',75,{type:'ground',x,z},'wood');
  }
  addResolvedInjury(a.health!,'brain','gunshot',animalBodyModel(a.species).byId.brain.hp*1000,()=>.999999);
  reconcileAnimalHealth(w,a);expect(a.state).toBe('dead');
  advanceCorpses(w);reconcileDomesticWork(w);
  expect(w.wildlife!.animals).toContain(a);expect(doctor.animalCare).toBeUndefined();
  expect(doctor.interruptedCargo).toBe(true);
  expect(w.piles.find(p=>p.id===held.id)?.owner).toEqual({type:'pawn',pawnId:doctor.id});
  expect(medicineUnits(w)).toBe(before);expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});
