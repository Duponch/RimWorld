import { expect,test } from 'vitest';
import { deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { injurePawn } from '../src/sim/health.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { advanceHumanCorpses } from '../src/sim/human-corpses.ts';
import { notifyPawnDeath } from '../src/sim/bereavement.ts';
import { deathThoughtsAt,expireDeathThoughts,notifyDeathThoughts } from '../src/sim/death-thoughts.ts';
import { advanceDeathThoughts,colonistUnburiedThought } from '../src/sim/death-thoughts-perception.ts';
import { DEATH_OBSERVATION_INTERVAL,DEATH_THOUGHT_RULES } from '../src/sim/death-thoughts-rules.ts';
import { moodThoughts } from '../src/sim/mood.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { medicalCamp } from './scenarios/health.ts';
import type { Pawn,World } from '../src/sim/types.ts';

function camp(count=2):World {
  const w=medicalCamp(count);for(const p of w.pawns){delete p.traits;p.state='idle';p.path=[];p.motion=null;p.moveCooldown=0;}return w;
}
function kill(w:World,p:Pawn):void {injurePawn(w,p,'heart','bruise',15000);expect(p.state).toBe('dead');}
function observationTick(w:World,p:Pawn):void {
  w.tick+=(DEATH_OBSERVATION_INTERVAL-(w.tick+p.id)%DEATH_OBSERVATION_INTERVAL)%DEATH_OBSERVATION_INTERVAL;
  advanceDeathThoughts(w);
}
const kinds=(p:Pawn)=>p.deathThoughts?.map(m=>m.kind)??[];

test('a witnessed ally death is recorded once, while an absent colon learns the death',()=>{
  const w=camp(3),[near,far,victim]=w.pawns as [Pawn,Pawn,Pawn];
  Object.assign(near,{x:10,z:10});Object.assign(victim,{x:11,z:10});Object.assign(far,{x:26,z:26});
  kill(w,victim);
  expect(kinds(near)).toEqual(['witnessed-ally-death']);expect(kinds(far)).toEqual(['colonist-died']);
  const rng=w.rng;notifyPawnDeath(w,victim);notifyDeathThoughts(w,victim);
  expect(w.rng).toBe(rng);expect(near.deathThoughts).toHaveLength(1);expect(far.deathThoughts).toHaveLength(1);
  expect(deathThoughtsAt(near,w.tick)[0]).toMatchObject({id:'death-witnessed-ally-death',offset:-5,expiresAt:w.tick+12000});
});

test('non-hostile outsiders upset witnesses; enemies do not; bloodlust enjoys either',()=>{
  for(const faction of ['outlanders','outlaws'] as const){
    const w=camp(3),[normal,bloodlust,victim]=w.pawns as [Pawn,Pawn,Pawn];
    bloodlust.traits=['bloodlust'];victim.faction=faction;kill(w,victim);
    expect(kinds(normal)).toEqual(faction==='outlanders'?['witnessed-outsider-death']:[]);
    expect(kinds(bloodlust)).toEqual(['witnessed-bloodlust-death']);
    expect(deathThoughtsAt(bloodlust,w.tick)[0]).toMatchObject({offset:8,expiresAt:w.tick+24000});
  }
});

test('witnessing a blood relative adds its own memory and preserves existing family grief',()=>{
  const w=camp(3),[child,spouse,parent]=w.pawns as [Pawn,Pawn,Pawn];
  w.relationships={links:[{kind:'parent',aId:child.id,bId:parent.id,recordedAt:w.tick},{kind:'spouse',aId:spouse.id,bId:parent.id,recordedAt:w.tick}]};
  kill(w,parent);
  expect(kinds(child)).toEqual(['witnessed-ally-death','witnessed-family-death']);
  expect(child.familyBereavement).toContainEqual({kind:'parent-died',otherId:parent.id,at:w.tick});
  expect(kinds(spouse)).toEqual(['witnessed-ally-death']);
  expect(spouse.familyBereavement?.[0]?.kind).toBe('spouse-died');
});

test('sleep, blindness, walls and the strict twelve-cell boundary prevent witnessing',()=>{
  for(const reason of ['sleep','blind','wall','range'] as const){
    const w=camp(),[p,victim]=w.pawns as [Pawn,Pawn];
    Object.assign(p,{x:10,z:10});Object.assign(victim,{x:12,z:10});
    if(reason==='sleep')p.state='sleeping';
    if(reason==='blind'){p.health=createMedicalRecord(w.tick);p.health.missing=[{part:'left-eye',bornAt:w.tick},{part:'right-eye',bornAt:w.tick}];}
    if(reason==='wall')fixtureBuilding(w,'wall',11,10);
    if(reason==='range')victim.x=22;
    kill(w,victim);expect(kinds(p),reason).toEqual(['colonist-died']);
  }
});

test('executions and active social opponents do not produce the generic death memories',()=>{
  const w=camp(),[p,victim]=w.pawns as [Pawn,Pawn];
  p.social={rng:1,memories:[],fight:{opponentId:victim.id,startedAt:w.tick}};
  // Use the same clinical notification after death: the social-fight exclusion
  // must be tested before ordinary health cleanup ends the fight.
  victim.health=createMedicalRecord(w.tick);victim.health.death={tick:w.tick,cause:'trauma'};victim.state='dead';
  notifyDeathThoughts(w,victim);expect(p.deathThoughts).toBeUndefined();
  delete p.social.fight;victim.health.death.cause='execution';notifyDeathThoughts(w,victim);
  expect(p.deathThoughts).toBeUndefined();
});

test('event memories stack geometrically and evict oldest identities within their own family',()=>{
  const w=camp(7),p=w.pawns[0]!;
  for(const victim of w.pawns.slice(1))kill(w,victim);
  expect(p.deathThoughts).toHaveLength(5);
  expect(p.deathThoughts!.map(m=>m.otherId)).toEqual(w.pawns.slice(2).map(v=>v.id));
  expect(deathThoughtsAt(p,w.tick)[0]?.offset).toBeCloseTo(-5*(1-.75**5)/.25);
  const end=w.tick+DEATH_THOUGHT_RULES['witnessed-ally-death'].duration;
  expect(deathThoughtsAt(p,end)).toEqual([]);expireDeathThoughts(p,end);expect(p.deathThoughts).toBeUndefined();
});

test('ground corpse observations renew the same body, not extra stacks, without RNG',()=>{
  const w=camp(),[p,victim]=w.pawns as [Pawn,Pawn];kill(w,victim);advanceHumanCorpses(w);
  delete p.deathThoughts;const rng=w.rng;
  observationTick(w,p);const first=p.deathThoughts![0]!;
  expect(first).toEqual({kind:'observed-corpse',otherId:victim.id,at:w.tick});
  w.tick+=60;advanceDeathThoughts(w);
  expect(p.deathThoughts).toEqual([{kind:'observed-corpse',otherId:victim.id,at:w.tick}]);expect(w.rng).toBe(rng);
});

test('a corpse becoming non-fresh gives the distinct stronger memory, including desiccation',()=>{
  const w=camp(),[p,victim]=w.pawns as [Pawn,Pawn];kill(w,victim);advanceHumanCorpses(w);delete p.deathThoughts;
  observationTick(w,p);
  const corpse=w.piles.find(i=>i.humanCorpse?.pawnId===victim.id)!;corpse.rot={progress:30000,atTick:w.tick,rate:0};
  w.tick+=60;advanceDeathThoughts(w);
  expect(kinds(p)).toEqual(['observed-corpse','observed-rotting-corpse']);
  expect(deathThoughtsAt(p,w.tick).find(t=>t.id==='death-observed-rotting-corpse')?.offset).toBe(-6);
});

test('carried and buried bodies stop observation while acquired memories remain until expiry',()=>{
  const w=camp(),[p,victim]=w.pawns as [Pawn,Pawn];kill(w,victim);advanceHumanCorpses(w);delete p.deathThoughts;
  observationTick(w,p);const at=w.tick,corpse=w.piles.find(i=>i.humanCorpse?.pawnId===victim.id)!;
  corpse.owner={type:'pawn',pawnId:p.id};w.tick+=60;advanceDeathThoughts(w);
  expect(p.deathThoughts![0]!.at).toBe(at);
  corpse.owner={type:'grave',graveId:w.nextId++};w.tick+=60;advanceDeathThoughts(w);
  expect(p.deathThoughts![0]!.at).toBe(at);expect(deathThoughtsAt(p,w.tick)[0]?.offset).toBe(-4);
  expireDeathThoughts(p,at+3000);expect(p.deathThoughts).toBeUndefined();
});

test('corpse perception respects strict range, opacity, sleep and bloodlust',()=>{
  for(const reason of ['range','wall','sleep','bloodlust'] as const){
    const w=camp(),[p,victim]=w.pawns as [Pawn,Pawn];
    Object.assign(p,{x:10,z:10});Object.assign(victim,{x:12,z:10});kill(w,victim);advanceHumanCorpses(w);delete p.deathThoughts;
    if(reason==='range')p.x=7;if(reason==='wall')fixtureBuilding(w,'wall',11,10);
    if(reason==='sleep')p.state='sleeping';if(reason==='bloodlust')p.traits=['bloodlust'];
    observationTick(w,p);expect(p.deathThoughts,reason).toBeUndefined();
  }
});

test('unburied colon situation uses clinical age strictly above 9000, even frozen fresh, and stops during portage',()=>{
  const w=camp(),[p,victim]=w.pawns as [Pawn,Pawn];p.traits=['bloodlust'];kill(w,victim);advanceHumanCorpses(w);
  const corpse=w.piles.find(i=>i.humanCorpse?.pawnId===victim.id)!;corpse.rot={progress:0,atTick:w.tick,rate:0};
  w.tick=victim.health!.death!.tick+9000;expect(colonistUnburiedThought(w,p)).toBeUndefined();
  w.tick++;expect(colonistUnburiedThought(w,p)).toMatchObject({id:'death-colonist-unburied',offset:-10});
  corpse.owner={type:'pawn',pawnId:p.id};expect(colonistUnburiedThought(w,p)).toBeUndefined();
  corpse.owner={type:'ground',x:victim.x,z:victim.z};victim.faction='outlanders';expect(colonistUnburiedThought(w,p)).toBeUndefined();
  delete victim.faction;victim.body!.lostAt=w.tick;expect(colonistUnburiedThought(w,p)).toBeUndefined();
});

test('a retained body counts once before materialization and preserves observation identity afterwards',()=>{
  const w=camp(),[p,victim]=w.pawns as [Pawn,Pawn];kill(w,victim);delete p.deathThoughts;
  victim.body={observedAt:w.tick,rot:{progress:0,atTick:w.tick}};
  observationTick(w,p);expect(kinds(p)).toEqual(['observed-corpse']);
  advanceHumanCorpses(w);w.tick+=60;advanceDeathThoughts(w);
  expect(p.deathThoughts).toHaveLength(1);expect(p.deathThoughts![0]!.otherId).toBe(victim.id);
});

test('played steps sample corpses and existing mood/save pipelines retain the memories',()=>{
  const w=camp(),[p,victim]=w.pawns as [Pawn,Pawn];kill(w,victim);
  for(let i=0;i<60&&!kinds(p).includes('observed-corpse');i++)stepWorld(w);
  expect(kinds(p)).toContain('observed-corpse');
  expect(moodThoughts(w,p).map(t=>t.id)).toContain('death-observed-corpse');
  expect(validateWorld(w)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(w));
  expect(resumed.pawns[0]!.deathThoughts).toEqual(p.deathThoughts);
  expect(moodThoughts(resumed,resumed.pawns[0]!).filter(t=>t.id.startsWith('death-'))).toEqual(moodThoughts(w,p).filter(t=>t.id.startsWith('death-')));
});

test('historical schema receives no retrospective death or corpse thoughts',()=>{
  const w=camp(),[p,victim]=w.pawns as [Pawn,Pawn];w.schemaVersion=208 as World['schemaVersion'];kill(w,victim);advanceHumanCorpses(w);
  observationTick(w,p);expect(p.deathThoughts).toBeUndefined();
  w.tick+=10000;expect(colonistUnburiedThought(w,p)).toBeUndefined();
  w.schemaVersion=209;notifyDeathThoughts(w,victim);expect(p.deathThoughts).toBeUndefined();
  observationTick(w,p);expect(kinds(p)).toEqual(['observed-corpse']);
});
