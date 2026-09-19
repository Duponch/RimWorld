import { SCHEMA_VERSION } from '../src/sim/types';
import { expect,test } from 'vitest';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { encounterCamp } from './scenarios/encounter';
import { fixtureBuilding } from './scenarios/deconstruction';
import { automaticShotScore,chooseAutomaticTarget } from '../src/sim/automatic-targets';
import { captureWorldShotGrid } from '../src/sim/combat-world';
import { considerAutomaticCombat } from '../src/sim/automatic-combat';
import { addMaterial } from '../src/sim/materials';
import { startTravel } from '../src/sim/movement';
const camp=()=>{const w=encounterCamp();w.piles=w.piles.filter(p=>p.owner.type!=='equipment'||p.owner.pawnId!==w.pawns[3].id);return w;};
const fire=(w:ReturnType<typeof camp>,enabled:boolean)=>applyCommand(w,{type:'fire-at-will',pawnIds:[w.pawns[0].id],enabled});
function run(w:ReturnType<typeof camp>,n:number){for(let i=0;i<n;i++){stepWorld(w);expect(validateWorld(w)).toEqual([]);}}

test('drafted autofire, hold-fire during aim and recovery, direct order and redraft defaults',()=>{
  const w=camp(),p=w.pawns[0];run(w,5);expect(p.shooting).toBeUndefined();
  expect(fire(w,true).ok).toBe(true);run(w,1);expect(p.shooting?.order?.auto?.kind).toBe('draft');
  const rng=w.rng;fire(w,false);expect(p.shooting).toBeUndefined();run(w,3);expect(w.rng).toBe(rng);
  fire(w,true);run(w,3);expect(p.shooting?.stance?.phase).toBe('cooldown');const until=p.shooting!.stance!.endsAtCore;
  fire(w,false);expect(p.shooting?.stance?.endsAtCore).toBe(until);
  applyCommand(w,{type:'shoot',pawnIds:[p.id],targetId:w.pawns[3].id});expect(p.shooting?.order?.auto).toBeUndefined();run(w,15);expect(p.lastAttack).toBeDefined();
  applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:false});applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true});expect(p.draft?.holdFire).toBeUndefined();
  const direct=camp(),actor=direct.pawns[0];fire(direct,true);
  applyCommand(direct,{type:'shoot',pawnIds:[actor.id],targetId:direct.pawns[3].id});run(direct,1);
  const oldEnd=actor.shooting!.stance!.endsAtCore,unchangedRng=direct.rng;fire(direct,false);
  expect(actor.shooting?.stance?.endsAtCore).toBe(oldEnd+10);expect(actor.shooting?.order?.auto).toBeUndefined();expect(direct.rng).toBe(unchangedRng);
  run(direct,2);expect(actor.lastAttack).toBeDefined();
});

test('automatic attacks yield to captured/queued movement, then retain the held position and exact continuation',()=>{
  const w=camp(),p=w.pawns[0];fire(w,true);
  expect(applyCommand(w,{type:'draft-move',pawnIds:[p.id],target:{x:6,z:13},queue:false}).ok).toBe(true);
  expect(applyCommand(w,{type:'draft-move',pawnIds:[p.id],target:{x:8,z:13},queue:true}).ok).toBe(true);
  for(let i=0;i<14;i++){stepWorld(w);expect(p.shooting).toBeUndefined();}
  run(w,8);expect(p.shooting).toBeDefined();expect(p.draft?.target).toEqual({x:8,z:13});
  const copy=deserializeWorld(serializeWorld(w));for(let i=0;i<60;i++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);}
});

test('civilian armed response respects its exact radius, two-shot cycles, policy and physical cargo interruption',()=>{
  const w=camp(),p=w.pawns[0],enemy=w.pawns[3];applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:false});
  applyCommand(w,{type:'hostility-response',pawnId:p.id,response:'attack'});enemy.x=24;
  considerAutomaticCombat(w,p,{remaining:4,pairs:32768});expect(p.shooting).toBeUndefined();
  enemy.x=23;addMaterial(w,'wood',7,{type:'pawn',pawnId:p.id});const cargo=w.piles.find(x=>x.owner.type==='pawn'&&x.owner.pawnId===p.id)!;p.interruptedCargo=true;
  startTravel(w,p,{x:7,z:10});considerAutomaticCombat(w,p,{remaining:4,pairs:32768});
  expect(p.shooting?.order?.auto).toMatchObject({kind:'response',remaining:2});expect(cargo.owner).toEqual({type:'pawn',pawnId:p.id});
  let zero=false;for(let i=0;i<36;i++){stepWorld(w);expect(validateWorld(w)).toEqual([]);if(p.shooting?.order?.auto?.kind==='response'&&p.shooting.order.auto.remaining===0){zero=true;break;}}
  expect(zero).toBe(true);const copy=deserializeWorld(serializeWorld(w));run(copy,10);
  applyCommand(w,{type:'hostility-response',pawnId:p.id,response:'ignore'});expect(p.shooting?.order).toBeNull();run(w,15);expect(p.shooting).toBeUndefined();expect(w.piles.find(x=>x.id===cargo.id)?.quantity).toBe(7);
  // A direct task interrupts aim; recovery retains its existing explicit refusal.
  for(const elapsed of [1,3]) {
    const forced=camp(),actor=forced.pawns[0];applyCommand(forced,{type:'draft',pawnIds:[actor.id],enabled:false});applyCommand(forced,{type:'hostility-response',pawnId:actor.id,response:'attack'});run(forced,elapsed);
    forced.resources.push({id:forced.nextId++,kind:'tree',x:4,z:10,amount:12});actor.priorities.gather=1;
    expect(applyCommand(forced,{type:'designate',kind:'chop',x:4,z:10}).ok).toBe(true);
    const recovery=actor.shooting?.stance?.phase==='cooldown'?actor.shooting.stance.endsAtCore:undefined;
    const command={type:'order-job' as const,pawnId:actor.id,jobId:forced.jobs[0].id,queue:false};
    if(recovery){const before=serializeWorld(forced);expect(applyCommand(forced,command).ok).toBe(false);expect(serializeWorld(forced)).toBe(before);applyCommand(forced,{type:'hostility-response',pawnId:actor.id,response:'ignore'});actor.priorities.gather=0;run(forced,12);actor.priorities.gather=1;}
    expect(applyCommand(forced,command)).toEqual({ok:true});
    expect(validateWorld(forced)).toEqual([]);const reloaded=deserializeWorld(serializeWorld(forced));run(forced,15);run(reloaded,15);expect(reloaded).toEqual(forced);
  }
});

test('unarmed civilians approach within eight cells, while hold-fire drafted pawns retaliate only at contact',()=>{
  const w=camp(),p=w.pawns[0],enemy=w.pawns[3];w.piles=[];applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:false});applyCommand(w,{type:'hostility-response',pawnId:p.id,response:'attack'});
  enemy.x=15;considerAutomaticCombat(w,p,{remaining:4,pairs:32768});expect(p.melee).toBeUndefined();enemy.x=14;
  considerAutomaticCombat(w,p,{remaining:4,pairs:32768});expect(p.melee?.order?.auto).toBe('response');run(w,35);expect(p.lastAttack).toBeDefined();
  const stationary=camp(),q=stationary.pawns[0],foe=stationary.pawns[3];foe.x=8;run(stationary,4);expect(q.melee).toBeUndefined();foe.x=7;
  run(stationary,3);expect(q.lastAttack?.targetId).toBe(foe.id);expect(q.x).toBe(6);expect(q.draft?.holdFire).toBe(true);
});

test('visibility/hostility/forced work filter before scoring; cover, recent target and friendly cone influence selection',()=>{
  const w=camp(),p=w.pawns[0],t=w.pawns[3];fire(w,true);fixtureBuilding(w,'wall',11,10);fixtureBuilding(w,'wall',11,9);fixtureBuilding(w,'wall',11,11);
  considerAutomaticCombat(w,p,{remaining:4,pairs:32768});expect(p.shooting).toBeUndefined();w.structures=[];
  const grid=captureWorldShotGrid(w),base=automaticShotScore(w,p,t,grid);p.lastAttack={targetId:t.id,atCore:w.tick*10};expect(automaticShotScore(w,p,t,grid)-base).toBe(40);delete p.lastAttack;
  const ally=w.pawns[1];ally.x=13;ally.z=10;expect(automaticShotScore(w,p,t,grid)).toBeLessThan(base);
  const carrier=w.pawns[2];carrier.rescue={patientId:ally.id,bedId:1,phase:'carry'};expect(automaticShotScore(w,p,t,grid)).toBe(base);delete carrier.rescue;
  expect(chooseAutomaticTarget([{target:'a',score:60},{target:'b',score:40},{target:'c',score:20}],()=>.99)).toBe('b');
  const before=w.rng;expect(chooseAutomaticTarget([],()=>{throw Error('unexpected draw');})).toBeUndefined();expect(w.rng).toBe(before);
  applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:false});applyCommand(w,{type:'hostility-response',pawnId:p.id,response:'attack'});
  p.priorityWork={work:'build',cell:{x:4,z:4},startedAt:w.tick};const unchanged=serializeWorld(w);considerAutomaticCombat(w,p,{remaining:4,pairs:32768});expect(serializeWorld(w)).toBe(unchanged);delete p.priorityWork;
  t.faction='colony';considerAutomaticCombat(w,p,{remaining:4,pairs:32768});expect(p.shooting).toBeUndefined();
});

test('V59 validation precedes neutral migration; automatic ownership, counters and remembered tick are strict',()=>{
  const w=camp(),p=w.pawns[0];const old=JSON.parse(serializeWorld(w));old.schemaVersion=59;delete old.pawns[0].draft.holdFire;
  const migrated=deserializeWorld(JSON.stringify(old));expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);expect(migrated.pawns[0].lastAttack).toBeUndefined();
  old.pawns[0].draft.holdFire=true;expect(()=>deserializeWorld(JSON.stringify(old))).toThrow('version 59');
  fire(w,true);run(w,1);const saved=JSON.parse(serializeWorld(w));saved.pawns[0].shooting.order.auto={kind:'response',remaining:3,until:w.tick+200};expect(()=>deserializeWorld(JSON.stringify(saved))).toThrow();
  const civilian=JSON.parse(serializeWorld(w));delete civilian.pawns[0].draft;civilian.pawns[0].hostilityResponse='attack';civilian.pawns[0].shooting.order.auto={kind:'response',remaining:0,until:w.tick+200};expect(()=>deserializeWorld(JSON.stringify(civilian))).toThrow('automatic shooting phase');
  const held=JSON.parse(serializeWorld(w));held.pawns[0].draft.holdFire=true;expect(()=>deserializeWorld(JSON.stringify(held))).toThrow('automatic shooting phase');
  saved.pawns[0].shooting.order.auto={kind:'draft'};saved.pawns[0].lastAttack={targetId:p.id,atCore:w.tick*10+1};expect(()=>deserializeWorld(JSON.stringify(saved))).toThrow();
  const unarmed=camp(),civil=unarmed.pawns[0];unarmed.piles=[];unarmed.pawns[3].x=7;
  applyCommand(unarmed,{type:'draft',pawnIds:[civil.id],enabled:false});applyCommand(unarmed,{type:'hostility-response',pawnId:civil.id,response:'attack'});run(unarmed,1);
  const malformed=JSON.parse(serializeWorld(unarmed));expect(malformed.pawns[0].melee.order.auto).toBe('response');malformed.pawns[0].melee.order.auto=['response'];
  expect(()=>deserializeWorld(JSON.stringify(malformed))).toThrow('melee or stun shape');
});
