import { SCHEMA_VERSION } from '../src/sim/types';
import { expect,test } from 'vitest';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { firingCamp } from './scenarios/shooting';
import { fixtureBuilding } from './scenarios/deconstruction';
import { controlledInjury } from './scenarios/health';
import { startTravel } from '../src/sim/movement';
import { PresentationChanges } from '../src/bridge/presentation-changes';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import type { World } from '../src/sim/types';

const fire=(w:World)=>applyCommand(w,{type:'shoot',pawnIds:[w.pawns[0].id],targetId:w.pawns[1].id});

test('command → preparation → real emission → medical impact, precise Core cadence and replay of every phase',()=>{
  const w=firingCamp(),p=w.pawns[0],start=w.tick*10,observer=new PresentationChanges(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const xp=p.skills.shooting.xp;expect(fire(w)).toEqual({ok:true});expect(p.shooting?.stance).toMatchObject({phase:'aim',startedAtCore:start,endsAtCore:start+18});
  const copies=[deserializeWorld(serializeWorld(w))];let arrived=false,emitted=false;
  for(let i=0;i<16;i++){
    stepWorld(w);for(const c of copies){stepWorld(c);expect(c).toEqual(w);}
    expect(validateWorld(w)).toEqual([]);observer.capture(w);
    const received=decoder.adopt(structuredClone(encoder.encode(w,0,6)));expect(received.status).toBe('applied');if(received.status==='applied')expect(received.world).toEqual(w);
    if(i===0){expect(w.projectiles).toBeUndefined();expect(p.skills.shooting.xp).toBe(xp);}
    for(const b of w.projectiles??[]) {
      if(b.emittedAtCore===start+18){emitted=true;expect(p.skills.shooting.xp).toBe(xp+38000);}
      if(b.arrival?.effect==='pawn')arrived=true;
    }
    copies.push(deserializeWorld(serializeWorld(w)));
  }
  expect(emitted).toBe(true);expect(arrived).toBe(true);expect(w.pawns[1].health).toBeDefined();
});

test('cancel aim spends no RNG/XP; stop, retarget, undraft and movement cannot erase cooldown',()=>{
  const w=firingCamp(),p=w.pawns[0],start=w.tick;expect(fire(w).ok).toBe(true);stepWorld(w);
  const rng=w.rng,xp=p.skills.shooting.xp;
  expect(applyCommand(w,{type:'draft-stop',pawnIds:[p.id]}).ok).toBe(true);stepWorld(w,2);
  expect(p.shooting).toBeUndefined();expect(w.projectiles).toBeUndefined();expect(w.rng).toBe(rng);expect(p.skills.shooting.xp).toBe(xp);
  expect(fire(w).ok).toBe(true);stepWorld(w,2);const until=p.shooting!.stance!.endsAtCore;
  expect(applyCommand(w,{type:'shoot',pawnIds:[p.id],targetId:w.pawns[2].id}).ok).toBe(true);expect(p.shooting!.stance!.endsAtCore).toBe(until);
  expect(applyCommand(w,{type:'draft-move',pawnIds:[p.id],target:{x:8,z:8},queue:false}).ok).toBe(true);
  expect(p.shooting?.order).toBeNull();const position={x:p.x,z:p.z};
  while((w.tick+1)*10<until){stepWorld(w);expect({x:p.x,z:p.z}).toEqual(position);expect(validateWorld(w)).toEqual([]);}
  stepWorld(w);expect(p.motion).toBeDefined();expect(w.tick).toBeGreaterThan(start+10);
  const other=firingCamp();fire(other);stepWorld(other,2);const end=other.pawns[0].shooting!.stance!.endsAtCore;
  applyCommand(other,{type:'draft',pawnIds:[other.pawns[0].id],enabled:false});
  expect(other.pawns[0].shooting?.order).toBeNull();expect(other.pawns[0].shooting?.stance?.endsAtCore).toBe(end);expect(validateWorld(other)).toEqual([]);
});

test('atomic refusals, lost line, captured edge, target falls and shooter incapacity',()=>{
  const w=firingCamp(),p=w.pawns[0];const before=serializeWorld(w);
  expect(applyCommand(w,{type:'shoot',pawnIds:[p.id,w.pawns[2].id],targetId:w.pawns[1].id}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  fixtureBuilding(w,'wall',9,10);expect(fire(w).ok).toBe(false);w.structures=[];
  applyCommand(w,{type:'draft-move',pawnIds:[p.id],target:{x:5,z:10},queue:false});stepWorld(w);expect(p.motion).toBeDefined();expect(fire(w).ok).toBe(true);
  while(p.moveCooldown>0){expect(validateWorld(w)).toEqual([]);stepWorld(w);}
  const lost=firingCamp();fire(lost);fixtureBuilding(lost,'wall',9,10);stepWorld(lost);expect(lost.pawns[0].shooting).toBeUndefined();expect(lost.projectiles).toBeUndefined();
  const fall=firingCamp();fire(fall);controlledInjury(fall,fall.pawns[1],'torso',2000,'cut');
  // Use an actual incapacity record rather than an impossible state-only save.
  controlledInjury(fall,fall.pawns[1],'left-leg',30000,'cut');controlledInjury(fall,fall.pawns[1],'right-leg',30000,'cut');
  stepWorld(fall);expect(fall.pawns[0].shooting).toBeUndefined();expect(fall.projectiles).toBeUndefined();
  const crossing=firingCamp(),walker=crossing.pawns[0];fixtureBuilding(crossing,'table',5,10);
  expect(startTravel(crossing,walker,{x:5,z:10})).toBe(true);walker.state='moving';walker.draft!.target={x:6,z:10};walker.path=[{x:6,z:10}];
  expect(validateWorld(crossing)).toEqual([]);const captured=serializeWorld(crossing);
  expect(fire(crossing)).toMatchObject({ok:false,reason:expect.stringContaining('franchissement')});expect(serializeWorld(crossing)).toBe(captured);
});

test('V55 migration is strict; current phase shape and skill cannot conceal invalid ownership or timing',()=>{
  const w=firingCamp(),legacy=structuredClone(w) as any;legacy.schemaVersion=55;
  for(const p of legacy.pawns){delete p.skills.shooting;delete p.skills.melee;}
  const migrated=deserializeWorld(JSON.stringify(legacy));expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);expect(migrated.pawns[0].skills.shooting).toEqual({level:8,xp:0,dailyXp:0,passion:0});
  legacy.pawns[0].shooting={order:null,stance:null};expect(()=>deserializeWorld(JSON.stringify(legacy))).toThrow(/version 55/);
  fire(w);const mutations=[(s:any)=>s.pawns[0].shooting.stance.endsAtCore++, (s:any)=>s.pawns[0].shooting.order.weaponId++, (s:any)=>s.pawns[0].shooting.order=null,(s:any)=>s.pawns[0].skills.shooting.level=21,(s:any)=>s.pawns[0].shooting.stance.invented=true];
  for(const mutate of mutations){const invalid=structuredClone(w);mutate(invalid);expect(validateWorld(invalid).length).toBeGreaterThan(0);expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow();}
});

test('fractional cadence, fall between cycles and an emitted bullet outlive interruption independently',()=>{
  const w=firingCamp(),start=w.tick*10,dates=new Set<number>();fire(w);
  for(let i=0;i<26;i++){stepWorld(w);for(const p of w.projectiles??[])dates.add(p.emittedAtCore);}
  expect([...dates].slice(0,3)).toEqual([start+18,start+132,start+246]);
  const fall=firingCamp();fire(fall);stepWorld(fall,2);
  const until=fall.pawns[0].shooting!.stance!.endsAtCore;
  controlledInjury(fall,fall.pawns[1],'left-leg',30000,'cut');controlledInjury(fall,fall.pawns[1],'right-leg',30000,'cut');
  stepWorld(fall);expect(fall.pawns[0].shooting?.order).toBeNull();expect(fall.pawns[0].shooting?.stance?.endsAtCore).toBe(until);
  stepWorld(fall,12);expect(fall.pawns[0].shooting).toBeUndefined();
  const stopped=firingCamp();fire(stopped);stepWorld(stopped,2);const bulletId=stopped.projectiles![0].id;
  controlledInjury(stopped,stopped.pawns[0],'left-leg',30000,'cut');controlledInjury(stopped,stopped.pawns[0],'right-leg',30000,'cut');
  const resumed=deserializeWorld(serializeWorld(stopped));let arrived=false;
  for(let i=0;i<5;i++){stepWorld(stopped);stepWorld(resumed);expect(resumed).toEqual(stopped);expect(validateWorld(stopped)).toEqual([]);if(stopped.projectiles?.find(p=>p.id===bulletId)?.arrival)arrived=true;}
  expect(stopped.pawns[0].shooting).toBeUndefined();expect(arrived).toBe(true);
  for(const phase of ['aim','cooldown','undrafted-cooldown']) {
    const exhausted=firingCamp(),shooter=exhausted.pawns[0];fire(exhausted);
    if(phase!=='aim')stepWorld(exhausted,2);
    if(phase==='undrafted-cooldown')applyCommand(exhausted,{type:'draft',pawnIds:[shooter.id],enabled:false});
    const emitted=exhausted.projectiles?.[0]?.id;
    shooter.rest=0;shooter.collapsePending=true;stepWorld(exhausted);
    expect(shooter.shooting,phase).toBeUndefined();expect(shooter.state,phase).toBe('sleeping');expect(shooter.rest).toBeGreaterThan(0);
    expect(validateWorld(exhausted),phase).toEqual([]);
    if(emitted)expect(exhausted.projectiles?.some(p=>p.id===emitted)).toBe(true);
    const copy=deserializeWorld(serializeWorld(exhausted));stepWorld(exhausted,8);stepWorld(copy,8);expect(copy).toEqual(exhausted);
  }
});
