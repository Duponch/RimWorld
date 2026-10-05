import { expect, test } from 'vitest';
import { aggressiveCrisisAdmission, aggressiveCrisisPopulation } from '../src/sim/aggressive-crisis-admission.ts';
import { applyCommand, stepWorld } from '../src/sim/engine.ts';
import { startBerserk, startFoodBinge, startMurderousRage, startSadWander, startTantrum, updateMentalBreak } from '../src/sim/mental-break.ts';
import { mentalState } from '../src/sim/mental-state.ts';
import { addGroundMaterial } from '../src/sim/materials.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { effectiveSkillLevel } from '../src/sim/work-types.ts';
import type { Command, Pawn, World } from '../src/sim/types.ts';
import { controlledInjury } from './scenarios/health.ts';
import { recruitmentUiFixture } from './scenarios/prison-camp.ts';
import { AGGRESSIVE_CRISIS_KINDS, crisisBuildings, exposeToCrisis, makeCrisisPacifist, mentalCrisesCamp, type AggressiveCrisisKind } from './helpers/mental-crises-v211.ts';

const starters:Record<AggressiveCrisisKind,(world:World,pawn:Pawn)=>boolean>={tantrum:startTantrum,berserk:startBerserk,'murderous-rage':startMurderousRage};
function camp(count=3):World {const world=mentalCrisesCamp(count);crisisBuildings(world);return world;}
function sample(world:World,pawn:Pawn):void {world.tick+=(15-(world.tick+pawn.id)%15)%15;updateMentalBreak(world,pawn);}
function ageTick(world:World,pawn:Pawn):void {world.tick+=1+(3-(world.tick+1+pawn.id)%3)%3;updateMentalBreak(world,pawn);}

test('sampled mood chooses the admitted intensity, preserves minor fallback and replays both extreme contents',()=>{
  const major=camp(),p=major.pawns[0]!;exposeToCrisis(major,p,'tantrum',1);
  const replay=deserializeWorld(serializeWorld(major));sample(major,p);sample(replay,replay.pawns[0]!);
  expect(p.mental?.crisis?.kind).toBe('tantrum');expect(replay).toEqual(major);expect(validateWorld(major)).toEqual([]);
  const absent=mentalCrisesCamp();exposeToCrisis(absent,absent.pawns[0]!,'tantrum',1);sample(absent,absent.pawns[0]!);
  expect(['sad-wander','food-binge']).toContain(absent.pawns[0]!.mental?.crisis?.kind);
  const minor=camp(),minorPawn=minor.pawns[0]!;exposeToCrisis(minor,minorPawn,'tantrum',1);
  minorPawn.mood=25;mentalState(minorPawn).below=[2100,0,0];sample(minor,minorPawn);
  expect(['sad-wander','food-binge']).toContain(minorPawn.mental?.crisis?.kind);
  const found=new Set<string>();
  // A bounded producer witness, not a population-frequency estimate. No state
  // is forced and every accepted draw is repeated from the pre-entry save.
  for(let rng=1;rng<=256&&found.size<2;rng++){
    const world=camp(),pawn=world.pawns[0]!;exposeToCrisis(world,pawn,'berserk',rng);
    const peer=deserializeWorld(serializeWorld(world));sample(world,pawn);sample(peer,peer.pawns[0]!);expect(peer).toEqual(world);
    if(pawn.mental?.crisis){found.add(pawn.mental.crisis.kind);expect(['berserk','murderous-rage']).toContain(pawn.mental.crisis.kind);}
  }
  expect([...found].sort()).toEqual(['berserk','murderous-rage']);
  const alone=mentalCrisesCamp(1);exposeToCrisis(alone,alone.pawns[0]!,'berserk',1);sample(alone,alone.pawns[0]!);
  expect(alone.pawns[0]!.mental?.crisis?.kind).toBe('berserk');
  const healthy=camp(),q=healthy.pawns[0]!,rng=healthy.rng;sample(healthy,q);
  expect(q.mental).toBeUndefined();expect(healthy.rng).toBe(rng);
});

test('aggressive admission is atomic for unavailable actors and missing targets, while a targetless Berserk is valid',()=>{
  for(const kind of AGGRESSIVE_CRISIS_KINDS){
    for(const posture of ['sleeping','downed','dead'] as const){
      const world=camp(),pawn=world.pawns[0]!;
      if(posture==='sleeping')pawn.state='sleeping';
      else if(posture==='dead')controlledInjury(world,pawn,'brain',99000,'crush');
      else {controlledInjury(world,pawn,'left-leg',30000);controlledInjury(world,pawn,'right-leg',30000);}
      const before=JSON.stringify(world);expect(starters[kind](world,pawn)).toBe(false);expect(JSON.stringify(world)).toBe(before);
    }
    const detached=camp(),offMap=structuredClone(detached.pawns[0]!);offMap.id=detached.nextId++;
    const detachedBefore=JSON.stringify(detached);expect(starters[kind](detached,offMap)).toBe(false);expect(JSON.stringify(detached)).toBe(detachedBefore);
    const {world:prison,patientId}=recruitmentUiFixture(),prisoner=prison.pawns.find(p=>p.id===patientId)!;
    crisisBuildings(prison);const prisonBefore=JSON.stringify(prison);expect(starters[kind](prison,prisoner)).toBe(false);expect(JSON.stringify(prison)).toBe(prisonBefore);
    const foreign=camp(),visitor=foreign.pawns[0]!;visitor.faction='outlanders';
    const foreignBefore=JSON.stringify(foreign);expect(starters[kind](foreign,visitor)).toBe(false);expect(JSON.stringify(foreign)).toBe(foreignBefore);
  }
  const one=camp(1),solo=one.pawns[0]!;one.structures.pop();let before=JSON.stringify(one);
  expect(startTantrum(one,solo)).toBe(false);expect(JSON.stringify(one)).toBe(before);
  before=JSON.stringify(one);expect(startMurderousRage(one,solo)).toBe(false);expect(JSON.stringify(one)).toBe(before);
  expect(startBerserk(one,solo)).toBe(true);expect(solo.mental?.crisis?.kind).toBe('berserk');expect(validateWorld(one)).toEqual([]);
});

test('pacifist past does not exclude involuntary entry or expose its stored melee level as effective capacity',()=>{
  for(const kind of AGGRESSIVE_CRISIS_KINDS){
    const world=camp(),pawn=world.pawns[0]!;makeCrisisPacifist(pawn);const skill=structuredClone(pawn.skills.melee);
    expect(effectiveSkillLevel(pawn,'melee',pawn.skills.melee.level)).toBe(0);
    expect(applyCommand(world,{type:'draft',pawnIds:[pawn.id],enabled:true}).ok).toBe(true);
    const before=serializeWorld(world);expect(applyCommand(world,{type:'melee',pawnIds:[pawn.id],targetId:world.pawns[1]!.id}).ok).toBe(false);expect(serializeWorld(world)).toBe(before);
    expect(starters[kind](world,pawn)).toBe(true);expect(pawn.mental?.crisis?.kind).toBe(kind);expect(pawn.skills.melee).toEqual(skill);
    expect(pawn.draft).toBeUndefined();
    expect(effectiveSkillLevel(pawn,'melee',pawn.skills.melee.level)).toBe(0);expect(validateWorld(world)).toEqual([]);
  }
});

test('read-only admission counts living free map colonists and accepts a physical downed or sleeping prisoner as Murder victim',()=>{
  const world=camp(),actor=world.pawns[0]!,downed=world.pawns[1]!,body=world.pawns[2]!;
  controlledInjury(world,downed,'left-leg',30000);controlledInjury(world,downed,'right-leg',30000);
  expect(aggressiveCrisisPopulation(world)).toBe(3);controlledInjury(world,body,'brain',99000,'crush');
  expect(aggressiveCrisisPopulation(world)).toBe(2);const before=JSON.stringify(world);
  expect(aggressiveCrisisAdmission(world,actor,'murderous-rage')).toEqual({population:2,targetIds:[downed.id]});expect(JSON.stringify(world)).toBe(before);
  expect(aggressiveCrisisAdmission(world,actor,'tantrum',{remaining:0,pairs:0})).toBeNull();expect(JSON.stringify(world)).toBe(before);
  const {world:prison,actorId,patientId}=recruitmentUiFixture(),warden=prison.pawns.find(p=>p.id===actorId)!,prisoner=prison.pawns.find(p=>p.id===patientId)!;
  for(const asleep of [false,true]){
    prisoner.state=asleep?'sleeping':'idle';prisoner.need=asleep?{kind:'sleep',phase:'sleep',bedId:prisoner.bedId,target:{x:prisoner.x,z:prisoner.z}}:null;
    const saved=JSON.stringify(prison),admission=aggressiveCrisisAdmission(prison,warden,'murderous-rage');
    expect(admission?.population).toBe(2);expect(admission?.targetIds).toContain(prisoner.id);expect(JSON.stringify(prison)).toBe(saved);expect(validateWorld(prison)).toEqual([]);
  }
  const journey=camp(),traveller=journey.pawns[0]!;addGroundMaterial(journey,'food',2,{x:traveller.x,z:traveller.z+1},'survival-meal');
  const food=journey.piles.find(p=>p.item==='survival-meal')!;expect(applyCommand(journey,{type:'scout-start',pawnId:traveller.id,pileId:food.id,quantity:2}).ok).toBe(true);
  for(let i=0;i<700&&!(journey.scout&&'pawn' in journey.scout);i++)stepWorld(journey);
  if(!journey.scout||!('pawn' in journey.scout))throw new Error('Expected an original off-map scout.');
  expect(aggressiveCrisisPopulation(journey)).toBe(2);const saved=JSON.stringify(journey);
  expect(startBerserk(journey,journey.scout.pawn)).toBe(false);expect(JSON.stringify(journey)).toBe(saved);expect(validateWorld(journey)).toEqual([]);
});

test('entry interrupts an actual reserved edge, clears its queue and rejects individual and mixed commands without mutation',()=>{
  const world=camp(),pawn=world.pawns[0]!,other=world.pawns[1]!;pawn.priorities.gather=1;
  for(const x of [15,17]){world.resources.push({id:world.nextId++,kind:'tree',x,z:pawn.z,amount:12});expect(applyCommand(world,{type:'designate',kind:'chop',x,z:pawn.z}).ok).toBe(true);}
  const first=world.jobs[0]!,second=world.jobs[1]!;
  expect(applyCommand(world,{type:'order-job',pawnId:pawn.id,jobId:first.id,queue:false}).ok).toBe(true);
  expect(applyCommand(world,{type:'order-job',pawnId:pawn.id,jobId:second.id,queue:true}).ok).toBe(true);
  stepWorld(world,2);expect(pawn.motion).toBeTruthy();expect(first.reservedBy).toBe(pawn.id);expect(pawn.orders.queue).toContain(second.id);
  const motion=structuredClone(pawn.motion),progress=first.progress,skill=structuredClone(pawn.skills.plants);
  expect(startTantrum(world,pawn)).toBe(true);expect(pawn.motion).toEqual(motion);expect(pawn.jobId).toBeNull();expect(first.reservedBy).toBeNull();
  expect(pawn.orders.active).toBeNull();expect(pawn.orders.queue).toEqual([]);expect(validateWorld(world)).toEqual([]);
  const before=serializeWorld(world),commands:Command[]=[
    {type:'draft',pawnIds:[pawn.id],enabled:true},{type:'draft',pawnIds:[pawn.id,other.id],enabled:true},
    {type:'order-job',pawnId:pawn.id,jobId:first.id,queue:false},{type:'clear-orders',pawnId:pawn.id},
    {type:'melee',pawnIds:[pawn.id],targetId:other.id},{type:'shoot',pawnIds:[pawn.id],targetId:other.id},
  ];
  for(const command of commands){expect(applyCommand(world,command).ok).toBe(false);expect(serializeWorld(world)).toBe(before);}
  stepWorld(world);expect(first.progress).toBe(progress);expect(pawn.skills.plants).toEqual(skill);
  expect(applyCommand(world,{type:'hostility-response',pawnId:pawn.id,response:'attack'}).ok).toBe(true);
});

test('Core-age bounds and real sleep, downing and death have distinct recovery rewards without resurrecting work',()=>{
  for(const [kind,beforeMin,beforeMax] of [['tantrum',7950,11970],['berserk',39960,59970],['murderous-rage',99930,99990]] as const){
    const world=camp(),pawn=world.pawns[0]!;expect(starters[kind](world,pawn)).toBe(true);
    pawn.mental!.crisis!.age=beforeMin;const rng=world.rng;ageTick(world,pawn);
    expect(pawn.mental?.crisis).toBeDefined();expect(world.rng).toBe(rng);
    pawn.mental!.crisis!.age=beforeMax;ageTick(world,pawn);
    expect(pawn.mental?.crisis).toBeUndefined();expect(pawn.mental?.cooldown).toBe(1500);expect(pawn.mental?.catharsis).toEqual([world.tick+18000]);
    expect(pawn.orders.active).toBeNull();expect(pawn.orders.queue).toEqual([]);expect(validateWorld(world)).toEqual([]);
    expect(applyCommand(world,{type:'draft',pawnIds:[pawn.id],enabled:true}).ok).toBe(true);
    const asleep=camp(),sleeper=asleep.pawns[0]!;expect(starters[kind](asleep,sleeper)).toBe(true);
    // Prepared physical sleep boundary, not a claim that changing the schedule
    // makes an aggressive episode choose voluntary bed rest.
    sleeper.need={kind:'sleep',phase:'sleep',bedId:null,target:{x:sleeper.x,z:sleeper.z}};sleeper.state='sleeping';
    updateMentalBreak(asleep,sleeper);expect(sleeper.mental?.crisis).toBeUndefined();expect(sleeper.need?.kind).toBe('sleep');
    expect(sleeper.mental?.catharsis).toEqual([asleep.tick+18000]);expect(validateWorld(asleep)).toEqual([]);
    const down=camp(),patient=down.pawns[0]!;expect(starters[kind](down,patient)).toBe(true);
    controlledInjury(down,patient,'left-leg',30000);controlledInjury(down,patient,'right-leg',30000);
    expect(patient.state).toBe('downed');expect(patient.mental?.crisis).toBeUndefined();expect(patient.mental?.catharsis).toEqual([down.tick+18000]);expect(validateWorld(down)).toEqual([]);
    const dead=camp(),body=dead.pawns[0]!;expect(starters[kind](dead,body)).toBe(true);controlledInjury(dead,body,'brain',99000,'crush');
    expect(body.state).toBe('dead');expect(body.mental?.crisis).toBeUndefined();expect(body.mental?.catharsis).toEqual([]);expect(validateWorld(dead)).toEqual([]);
  }
  // The existing kinds remain independent rather than acquiring an aggressive
  // target or losing their historical continuation fields.
  for(const start of [startSadWander,startFoodBinge]){const world=camp(),pawn=world.pawns[0]!;expect(start(world,pawn)).toBe(true);expect(pawn.mental?.crisis).toHaveProperty('target',null);}
});
