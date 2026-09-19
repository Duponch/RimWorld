import { expect,test } from 'vitest';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { enableRaids,advanceRaids,exitRaider } from '../src/sim/raids';
import { raidRoute,atMapEdge } from '../src/sim/raid-space';
import { blockedCells } from '../src/sim/pathfinding';
import { barrierMaxHp } from '../src/sim/barriers';
import { HP_UNIT } from '../src/sim/injury-rules';
import { injurePawn } from '../src/sim/health';
import { stopRaidEngagement } from '../src/sim/raids';
import { deconstructionCamp,fixtureBuilding } from './scenarios/deconstruction';
import type { World } from '../src/sim/types';

function attackCamp(){const w=deconstructionCamp(3);enableRaids(w);w.raids!.nextCheck=1;stepWorld(w);return w;}
function replay(w:World,ticks=35){expect(validateWorld(w)).toEqual([]);const copy=deserializeWorld(serializeWorld(w));for(let i=0;i<ticks;i++){stepWorld(w);stepWorld(copy);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);expect(serializeWorld(w)).toBe(serializeWorld(copy));}}
function until(w:World,done:()=>boolean,limit=1600){for(let i=0;i<limit&&!done();i++)stepWorld(w);expect(done(),JSON.stringify({tick:w.tick,raid:w.raids,pawns:w.pawns.map(p=>({id:p.id,x:p.x,z:p.z,state:p.state,path:p.path.length,raid:p.raid,melee:p.melee,tactics:p.tactics,cool:p.planCooldown}))})).toBe(true);expect(validateWorld(w)).toEqual([]);}

test('calendar schedules a real border raid atomically; closed natural sites defer without consuming identities or RNG',()=>{
  const w=deconstructionCamp();enableRaids(w);expect(w.raids!.nextCheck).toBeGreaterThanOrEqual(21000);expect(w.raids!.nextCheck).toBeLessThan(24000);
  const state=serializeWorld(w);enableRaids(w);expect(serializeWorld(w)).toBe(state);
  w.raids!.nextCheck=w.tick+1;const next=w.nextId;stepWorld(w);const raider=w.pawns.find(p=>p.raid)!;
  expect(atMapEdge(w,raider)).toBe(true);expect(w.raids!.active!.members).toEqual([next]);expect(w.piles.find(i=>i.owner.type==='apparel')).toMatchObject({owner:{pawnId:next},item:'cloth-shirt'});replay(w,20);
  const sealed=deconstructionCamp();for(let z=0;z<sealed.height;z++)for(let x=0;x<sealed.width;x++)if(atMapEdge(sealed,{x,z}))sealed.tiles[z*sealed.width+x]={terrain:'rock'};
  enableRaids(sealed);sealed.raids!.nextCheck=1;const rng=sealed.raids!.rng,id=sealed.nextId;stepWorld(sealed);expect(sealed.raids!.active).toBeUndefined();expect(sealed.raids!.rng).toBe(rng);expect(sealed.nextId).toBe(id);expect(sealed.raids!.nextCheck).toBe(1501);expect(validateWorld(sealed)).toEqual([]);
  const split=deconstructionCamp(2),anchor=split.pawns[0]!;split.pawns[1]!.x=25;
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)if(dx||dz)split.tiles[(anchor.z+dz)*split.width+anchor.x+dx]={terrain:'rock'};
  enableRaids(split);split.raids!.nextCheck=1;stepWorld(split);expect(split.raids!.active).toBeDefined();expect(validateWorld(split)).toEqual([]);
});

test('ordinary raid approaches, actually strikes defenders and completes with bodies retained, followed by deterministic continuation',()=>{
  const w=attackCamp(),enemy=w.pawns.find(p=>p.raid)!;
  const defenders=w.pawns.filter(p=>!p.raid);for(const p of defenders)expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(true);
  const origin={x:enemy.x,z:enemy.z};until(w,()=>!!enemy.melee?.strike||defenders.some(p=>!!p.melee?.strike));expect({x:enemy.x,z:enemy.z}).not.toEqual(origin);replay(w);
  until(w,()=>!w.raids!.active,3000);expect(w.raids!.last).toBeDefined();expect(w.pawns.some(p=>!!p.health)).toBe(true);
  expect(w.pawns.some(p=>p.id===enemy.id)||w.raids!.departed.some(d=>d.pawnId===enemy.id)).toBe(true);replay(w,25);
});

test('closed camp uses real barrier blows, preserves impact recovery and opens multiple layers before reaching a sleeper',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!;p.rest=1;p.need={kind:'sleep',phase:'sleep',bedId:null,target:{x:p.x,z:p.z}};p.state='sleeping';
  for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++)if(dx||dz){const s=fixtureBuilding(w,'wall',p.x+dx,p.z+dz);Object.assign(s,{damage:barrierMaxHp(s)-8});}
  enableRaids(w);w.raids!.nextCheck=1;stepWorld(w);const enemy=w.pawns.find(q=>q.raid)!;
  until(w,()=>!!enemy.melee?.strike?.structure);expect(w.destroyed?.count).toBeGreaterThan(0);replay(w,25);
  until(w,()=>!!p.health);expect(w.destroyed!.count).toBeGreaterThanOrEqual(2);expect(p.state).not.toBe('sleeping');replay(w,10);
});

test('accessible colony route is preferred to destruction; retreat exits physically and exports exactly the worn objects',()=>{
  const w=attackCamp(),enemy=w.pawns.find(p=>p.raid)!;stepWorld(w,40);
  const route=raidRoute(w,enemy,false,blockedCells(w));expect(route).not.toBeNull();expect(route!.barrier).toBeUndefined();
  const start={x:enemy.x,z:enemy.z},gear=w.piles.filter(i=>i.owner.type==='apparel'&&i.owner.pawnId===enemy.id);
  w.raids!.active!.phase='withdraw';w.raids!.active!.reason='losses';w.raids!.active!.lost=[enemy.id];enemy.raid!.exiting=true;delete enemy.tactics;delete enemy.melee;delete enemy.shooting;enemy.path=[];enemy.raid!.goal=null;
  expect(exitRaider(w,enemy)).toBe(false);expect(atMapEdge(w,start)).toBe(false);replay(w,15);
  until(w,()=>!w.pawns.includes(enemy));const d=w.raids!.departed[0]!;expect(atMapEdge(w,d.cell)).toBe(true);expect(d.items).toEqual(gear);expect(w.piles.some(i=>gear.some(g=>g.id===i.id))).toBe(false);expect(w.raids!.last).toMatchObject({escaped:1,reason:'withdrawn'});replay(w,10);
  for(const mutate of [(v:World)=>v.raids!.departed[0]!.items[0]!.id=v.pawns[0]!.id,(v:World)=>v.raids!.departed[0]!.cell={x:3,z:3},(v:World)=>v.raids!.departed[0]!.items[0]!.quantity=2]){const bad=structuredClone(w);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
});

test('strict V67 migration enables no attack, rejects new mandates and calendar contradictions',()=>{
  const w=deconstructionCamp(),old={...w,schemaVersion:67};expect(deserializeWorld(JSON.stringify(old))).toEqual(w);expect(w.raids).toBeUndefined();
  const raid=attackCamp();expect(()=>deserializeWorld(JSON.stringify({...raid,schemaVersion:67}))).toThrow();
  for(const mutate of [(v:World)=>v.raids!.completed=1,(v:World)=>v.raids!.active!.members=[v.pawns[0]!.id],(v:World)=>v.raids!.active!.lost=[999999],(v:World)=>v.raids!.active!.deadline=5,(v:World)=>{v.raids!.active!.phase='withdraw';v.raids!.active!.reason='timeout';v.pawns.find(p=>p.raid)!.raid!.exiting=true;},(v:World)=>v.pawns.find(p=>p.raid)!.raid!.exiting=true,(v:World)=>Object.assign(v.raids!,{unknown:1})]){const bad=structuredClone(raid);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
  const original=serializeWorld(w);expect(applyCommand(w,{type:'enable-raids'}).ok).toBe(true);expect(serializeWorld(w)).not.toBe(original);expect(validateWorld(w)).toEqual([]);
});

test('strategic approach crosses the unseen map without teleporting; an enclosed retreat breaks an exit and keeps saved recovery',()=>{
  const far=deconstructionCamp(1,128),civil=far.pawns[0]!;civil.x=64;civil.z=64;
  enableRaids(far);far.raids!.nextCheck=1;stepWorld(far);const enemy=far.pawns.find(p=>p.raid)!;
  expect(Math.hypot(enemy.x-civil.x,enemy.z-civil.z)).toBeGreaterThan(56);const start={x:enemy.x,z:enemy.z};
  stepWorld(far,8);expect(enemy.path.length).toBeGreaterThan(0);expect(enemy.tactics).toBeUndefined();expect(Math.hypot(enemy.x-start.x,enemy.z-start.z)).toBeLessThan(8);replay(far,20);
  const w=attackCamp(),p=w.pawns.find(q=>q.raid)!;stopRaidEngagement(p);Object.assign(p,{x:5,z:5,motion:null,moveCooldown:0,state:'idle'});
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)if(dx||dz){const wall=fixtureBuilding(w,'wall',5+dx,5+dz);Object.assign(wall,{damage:barrierMaxHp(wall)-1});}
  w.raids!.active!.phase='withdraw';w.raids!.active!.reason='losses';w.raids!.active!.lost=[p.id];p.raid!.exiting=true;
  until(w,()=>!!p.melee?.strike?.structure);expect(w.destroyed?.count).toBe(1);replay(w,10);until(w,()=>!w.raids!.active);expect(w.raids!.departed).toHaveLength(1);
  const rim=attackCamp(),trapped=rim.pawns.find(q=>q.raid)!;Object.assign(trapped,{x:5,z:5,motion:null,moveCooldown:0,state:'idle'});stopRaidEngagement(trapped);
  for(let z=0;z<rim.height;z++)for(let x=0;x<rim.width;x++)if(atMapEdge(rim,{x,z})){const wall=fixtureBuilding(rim,'wall',x,z);Object.assign(wall,{damage:barrierMaxHp(wall)-1});}
  rim.raids!.active!.lost=[trapped.id];advanceRaids(rim);until(rim,()=>!rim.raids!.active);expect(rim.destroyed?.count).toBe(1);expect(atMapEdge(rim,rim.raids!.departed[0]!.cell)).toBe(true);
});

test('group losses stay cumulative after recovery; timeout and colony defeat select retreat without erasing victims',()=>{
  const w=attackCamp(),first=w.pawns.find(p=>p.raid)!;injurePawn(w,first,'brain','crush',99*HP_UNIT);advanceRaids(w);expect(w.raids!.last?.killed).toBe(1);expect(w.pawns.includes(first)).toBe(true);
  w.raids!.nextCheck=w.tick+1;stepWorld(w);const group=w.raids!.active!,pair=w.pawns.filter(p=>p.raid?.group===group.id);expect(pair).toHaveLength(2);group.lossPermille=700;
  // A controlled health-state boundary isolates cumulative group accounting.
  pair[0]!.state='downed';advanceRaids(w);expect(group.lost).toEqual([pair[0]!.id]);expect(group.phase).toBe('assault');
  pair[0]!.state='idle';advanceRaids(w);expect(group.lost).toEqual([pair[0]!.id]);pair[1]!.state='downed';advanceRaids(w);expect(group.phase).toBe('withdraw');expect(pair[0]!.raid!.exiting).toBe(true);
  pair[1]!.state='idle';expect(validateWorld(w)).toEqual([]);replay(w,10);
  const defeated=attackCamp();for(const p of defeated.pawns.filter(p=>!p.raid))injurePawn(defeated,p,'brain','crush',99*HP_UNIT);
  advanceRaids(defeated);expect(defeated.raids!.active?.reason).toBe('colony-down');expect(defeated.pawns.filter(p=>p.state==='dead')).toHaveLength(3);until(defeated,()=>!defeated.raids!.active);expect(defeated.raids!.last?.reason).toBe('colony-down');
  const timed=attackCamp();timed.tick=timed.raids!.active!.deadline;advanceRaids(timed);expect(timed.raids!.active?.reason).toBe('timeout');expect(timed.pawns.some(p=>p.raid)).toBe(true);
});

test('exit waits for unconscious sleep and stun; an existing blow may recover toward a departed target without retaining an attack',()=>{
  const w=attackCamp(),enemy=w.pawns.find(p=>p.raid)!,p=w.pawns[0]!;
  w.raids!.active!.lost=[enemy.id];advanceRaids(w);expect(enemy.raid!.exiting).toBe(true);
  enemy.need={kind:'sleep',phase:'sleep',bedId:null,target:{x:enemy.x,z:enemy.z}};enemy.state='sleeping';expect(exitRaider(w,enemy)).toBe(false);enemy.need=null;enemy.state='idle';
  enemy.stun={sinceCore:w.tick*10,untilCore:w.tick*10+45};expect(exitRaider(w,enemy)).toBe(false);delete enemy.stun;
  p.x=enemy.x===0?1:enemy.x===w.width-1?w.width-2:enemy.x;p.z=enemy.z===0?1:enemy.z===w.height-1?w.height-2:enemy.z;
  expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(true);expect(applyCommand(w,{type:'melee',pawnIds:[p.id],targetId:enemy.id}).ok).toBe(true);
  // Contact attack commits before the departure phase of this same tick.
  stepWorld(w);expect(w.raids!.departed.some(d=>d.pawnId===enemy.id)).toBe(true);expect(p.melee?.strike?.targetId).toBe(enemy.id);expect(p.melee?.order).toBeNull();replay(w,15);
});
