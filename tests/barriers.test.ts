import { withoutResearch,withMigratedResearch } from './scenarios/legacy-skills';
import { expect,test } from 'vitest';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { barrierHp,barrierMaxHp,damageBarrier } from '../src/sim/barriers';
import { inHome } from '../src/sim/repairs';
import { queryArea } from '../src/sim/designation';
import { combatShotBatch } from '../src/sim/combat-shot-batch';
import { deconstructionCamp,fixtureBuilding } from './scenarios/deconstruction';
import type { Structure,World } from '../src/sim/types';
import { constructionMaterials } from '../src/sim/construction-materials';
import { advanceRepair } from '../src/sim/repairs';
import { pawnBody } from '../src/sim/health-rules';
import { createBulletFlight } from '../src/sim/bullet-flight';
import { registerWorldProjectile } from '../src/sim/projectile-system';

const home=(w:World,s:Structure,enabled=true)=>applyCommand(w,{type:'area',action:enabled?'home':'remove-home',from:s,to:s});
const attack=(w:World,s:Structure)=>{const p=w.pawns[0]!;expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(true);return applyCommand(w,{type:'melee',pawnIds:[p.id],targetId:s.id,structure:true});};
function until(w:World,predicate:()=>boolean,limit=2000){for(let i=0;i<limit&&!predicate();i++)stepWorld(w);expect(predicate()).toBe(true);expect(validateWorld(w)).toEqual([]);}
function replay(w:World,ticks=35){const restored=deserializeWorld(serializeWorld(w));for(let i=0;i<ticks;i++){stepWorld(w);stepWorld(restored);expect(validateWorld(w)).toEqual([]);expect(serializeWorld(restored)).toBe(serializeWorld(w));}}

test('material HP, physical attack, recovery/save and construction repair preserve real materials and skill domains',()=>{
  for(const kind of ['wall','door'] as const){const hp=constructionMaterials(kind).map(material=>barrierMaxHp({kind,material}));expect(hp).toEqual(kind==='wall'?[195,300,510,465,360,420,390]:[104,160,272,248,192,224,208]);}
  const w=deconstructionCamp(),p=w.pawns[0]!,s:Structure=fixtureBuilding(w,'wall',p.x+4,p.z);s.material='granite-blocks';
  expect(attack(w,s).ok).toBe(true);const xp=p.skills.melee.dailyXp;
  stepWorld(w);expect(s.damage).toBeUndefined();until(w,()=>!!p.melee?.strike);
  expect(s.damage).toBeGreaterThan(0);expect(p.skills.melee.dailyXp).toBe(xp);
  for(const mutate of [(v:World)=>v.pawns[0]!.melee!.strike!.structure!.x++,(v:World)=>v.pawns[0]!.melee!.strike!.targetId=p.id]){const v=structuredClone(w);mutate(v);expect(()=>deserializeWorld(JSON.stringify(v))).toThrow();}
  replay(w,20);
  expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:false}).ok).toBe(true);
  until(w,()=>!p.melee);const damage=s.damage!,savedPiles=JSON.stringify(w.piles);
  stepWorld(w,50);expect(s.damage).toBe(damage);expect(w.jobs).toEqual([]);
  expect(home(w,s).ok).toBe(true);until(w,()=>p.state==='working');replay(w,3);
  const beforeXp=p.skills.construction.dailyXp;until(w,()=>!s.damage);
  expect(p.skills.construction.dailyXp).toBeGreaterThan(beforeXp);expect(JSON.stringify(w.piles)).toBe(savedPiles);expect(w.destroyed).toBeUndefined();expect(w.jobs).toEqual([]);
});

test('repair cadence has an 80-work warmup then 20, no instant HP, and interruptions restart warmup without undoing HP',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!,s:Structure=fixtureBuilding(w,'wall',p.x+1,p.z);s.damage=100;home(w,s);
  const j=w.jobs[0]!;p.jobId=j.id;j.reservedBy=p.id;j.status='active';p.skills.construction.level=8;p.skills.construction.passion=0;
  for(let i=0;i<4;i++)advanceRepair(w,p,j,1,pawnBody(p));expect(s.damage).toBe(100);
  advanceRepair(w,p,j,1,pawnBody(p));expect(s.damage).toBe(99);expect(j.repair?.warmed).toBe(true);
  advanceRepair(w,p,j,1,pawnBody(p));expect(s.damage).toBe(98);
  expect(p.skills.construction.dailyXp).toBe(1050); // 60 Core ticks x .05 XP x .35 no-passion.
  expect(home(w,s,false).ok).toBe(true);expect(p.jobId).toBeNull();expect(w.jobs).toHaveLength(0);expect(s.damage).toBe(98);
  home(w,s);expect(w.jobs[0]!.repair?.warmed).toBeUndefined();expect(w.jobs[0]!.progress).toBe(0);expect(validateWorld(w)).toEqual([]);
  p.priorities.build=0;stepWorld(w,50);expect(s.damage).toBe(98);
  p.priorities.build=1;p.planCooldown=0;until(w,()=>p.state==='working');replay(w,7);
});

test('destruction has no refund; cancels repair/removal orders, opens topology and retains a saved strike after target vanishes',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!,s:Structure=fixtureBuilding(w,'wall',p.x+1,p.z);s.damage=barrierMaxHp(s)-1;
  home(w,s);expect(attack(w,s).ok).toBe(true);const piles=JSON.stringify(w.piles);
  until(w,()=>!w.structures.includes(s));expect(p.melee?.strike?.structure).toEqual({x:s.x,z:s.z});
  expect(w.jobs).toHaveLength(0);expect(w.destroyed).toEqual({count:1,lost:{wood:5}});expect(JSON.stringify(w.piles)).toBe(piles);
  expect(p.melee?.order).toBeNull();replay(w,20);
  const d:Structure=fixtureBuilding(w,'door',p.x+1,p.z);d.material='steel';d.damage=159;
  expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:d.x,z:d.z}).ok).toBe(true);
  damageBarrier(w,d,1);expect(w.jobs).toHaveLength(0);expect(w.destroyed?.lost).toEqual({wood:5,steel:25});expect(w.deconstructed.count).toBe(0);expect(validateWorld(w)).toEqual([]);
});

test('home membership and object ownership enforce refusal, queued repair release, and deconstruction priority',()=>{
  const w=deconstructionCamp(2),s:Structure=fixtureBuilding(w,'wall',20,16);s.damage=40;home(w,s);const j=w.jobs[0]!;
  expect(applyCommand(w,{type:'order-job',pawnId:w.pawns[0]!.id,jobId:j.id,queue:true}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-job',pawnId:w.pawns[1]!.id,jobId:j.id,queue:false}).ok).toBe(false);
  const saved=serializeWorld(w);expect(applyCommand(w,{type:'melee',pawnIds:w.pawns.map(p=>p.id),targetId:s.id,structure:true}).ok).toBe(false);expect(serializeWorld(w)).toBe(saved);
  expect(applyCommand(w,{type:'cancel',x:s.x,z:s.z}).ok).toBe(false);expect(serializeWorld(w)).toBe(saved);
  expect(queryArea(w,{type:'area',action:'cancel',from:s,to:s})).toMatchObject({ok:true,cells:[]});
  expect(applyCommand(w,{type:'area',action:'deconstruct',from:s,to:s}).ok).toBe(true);
  expect(w.jobs.some(j=>j.repair)).toBe(false);expect(w.pawns.every(p=>!p.orders.queue.includes(j.id)&&p.jobId!==j.id)).toBe(true);expect(validateWorld(w)).toEqual([]);
  expect(inHome(w,s.z*w.width+s.x)).toBe(true);
});

test('V66 migration remains neutral; new fields are strict and live/malformed continuations rejected',()=>{
  const w=deconstructionCamp(),old=JSON.parse(serializeWorld(w));(old.schemaVersion=66,withoutResearch(old));
  expect(deserializeWorld(JSON.stringify(old))).toEqual(withMigratedResearch(w));
  for(const field of [{home:[1]},{destroyed:{count:1,lost:{wood:5}}}])expect(()=>deserializeWorld(JSON.stringify({...old,...field}))).toThrow();
  const s:Structure=fixtureBuilding(w,'wall',20,16);s.damage=4;home(w,s);
  for(const mutate of [(v:World)=>v.home=[1,1],(v:World)=>v.home=[-1],(v:World)=>v.structures[0]!.damage=195,(v:World)=>v.structures[0]!.damage=.5,(v:World)=>v.jobs[0]!.repair!.structureId=9999,(v:World)=>v.destroyed={count:1,lost:{wood:-5}}]){const v=structuredClone(w);mutate(v);expect(()=>deserializeWorld(JSON.stringify(v))).toThrow();}
  const legacy=structuredClone(w);Object.assign(legacy,{schemaVersion:66});delete legacy.home;legacy.jobs=[];expect(()=>deserializeWorld(JSON.stringify(legacy))).toThrow();
});

test('destructive projectile invalidates fixed targets before the next shot; lost support causes real roof injuries',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!,s:Structure=fixtureBuilding(w,'wall',p.x+5,p.z);s.damage=194;
  const launch=(distance:number)=>registerWorldProjectile(w,createBulletFlight({origin:{x:s.x-distance+.5,z:s.z+.5},destination:{x:s.x+.5,z:s.z+.5},launcherKey:`pawn:${p.id}`,equipmentKey:null,intendedKey:`structure:${s.id}`,usedKey:`structure:${s.id}`,flags:7,preventFriendlyFire:false,speedPerCoreTick:.55}),'normal',{friendlyPawnIds:[],friendlyFireFactor:.4});
  const far=launch(5),near=launch(1),shots=combatShotBatch(w),old=shots.read();
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);
  expect(near.arrival?.effect).toBe('barrier');expect(far.arrival?.effect).toBe('ground');expect(w.structures).toHaveLength(0);expect(shots.read()).not.toBe(old);expect(validateWorld(w)).toEqual([]);
  const legacy=structuredClone(w);Object.assign(legacy,{schemaVersion:66});delete legacy.destroyed;expect(()=>deserializeWorld(JSON.stringify(legacy))).toThrow();
  const roof=deconstructionCamp(),worker=roof.pawns[0]!,support:Structure=fixtureBuilding(roof,'wall',worker.x+1,worker.z);
  support.damage=194;roof.roofing={constructed:[worker.z*roof.width+worker.x],build:[],remove:[],cursor:0};
  expect(attack(roof,support).ok).toBe(true);until(roof,()=>!roof.structures.length);
  expect(roof.roofing.constructed).toEqual([]);expect(worker.health?.injuries.length??0).toBeGreaterThan(0);replay(roof,20);
});
