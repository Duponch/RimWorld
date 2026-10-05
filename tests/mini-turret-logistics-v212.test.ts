import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { addGroundMaterial,refreshStock } from '../src/sim/materials.ts';
import { constructionSupplied } from '../src/sim/construction-materials.ts';
import { turretReloadCapacity } from '../src/sim/mini-turret-reload.ts';
import { assignBackground } from '../src/sim/background-generation.ts';
import { campTurret,miniTurretCamp } from './scenarios/mini-turret-v212.ts';
import type { World } from '../src/sim/types.ts';

function prepared():World {
  const w=miniTurretCamp();w.pawns=[w.pawns[0]!];
  const p=w.pawns[0]!;p.x=13;p.z=31;assignBackground(p,{childhood:'quiet-child'});
  p.hunger=100;p.rest=100;p.recreation.level=100;p.schedule.fill('work');
  campTurret(w).turret!.holdFire=true;refreshStock(w);return w;
}
function until(w:World,done:()=>boolean,limit=1600):void {
  for(let i=0;i<limit&&!done();i++)stepWorld(w);
  expect(done(),`Missing physical frontier at ${w.tick}`).toBe(true);expect(validateWorld(w)).toEqual([]);
}
function replay(w:World,ticks=5):void {const copy=deserializeWorld(serializeWorld(w));stepWorld(w,ticks);stepWorld(copy,ticks);expect(copy).toEqual(w);}
const units=(w:World,item:'steel'|'component')=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);

test('research and Construction5 gate real 100steel+3component delivery and completion with intrinsic full canon',()=>{
  const w=prepared(),p=w.pawns[0]!;w.structures=[];
  delete w.research!.gunTurrets;
  expect(applyCommand(w,{type:'designate',kind:'mini-turret',x:16,z:32}).ok).toBe(false);
  w.research=structuredClone(miniTurretCamp().research);p.priorities.build=1;p.priorities.haul=2;p.skills.construction.level=4;
  addGroundMaterial(w,'steel',100,{x:12,z:32},'steel');addGroundMaterial(w,'component',2,{x:12,z:33},'component');
  expect(applyCommand(w,{type:'designate',kind:'mini-turret',x:16,z:32,orientation:3}).ok).toBe(false);
  expect(applyCommand(w,{type:'designate',kind:'mini-turret',x:16,z:32,orientation:0}).ok).toBe(true);
  const job=w.jobs[0]!;stepWorld(w,200);expect(job.progress).toBe(0);expect(w.structures).toEqual([]);
  addGroundMaterial(w,'component',1,{x:13,z:33},'component');until(w,()=>constructionSupplied(w,job));
  stepWorld(w,20);expect(job.progress).toBe(0);p.skills.construction.level=5;p.planCooldown=0;
  until(w,()=>job.progress>0);replay(w);until(w,()=>w.structures.some(s=>s.kind==='mini-turret'));
  const s=campTurret(w);expect(s).toMatchObject({material:'steel',orientation:0,footprint:'standard',turret:{ammoQ:240,autoReload:true,holdFire:false,targetKey:null,burst:null,warmup:null,cooldownCore:0}});
  expect(s.quality).toBeUndefined();expect(units(w,'steel')).toBe(0);expect(units(w,'component')).toBe(0);
  expect(applyCommand(w,{type:'designate',kind:'uninstall',x:s.x,z:s.z}).ok).toBe(false);replay(w);
});

test('mobilized pacifist physically picks steel, carries and completes 24 ticks of service with exact saved reprise',()=>{
  const w=prepared(),p=w.pawns[0]!,s=campTurret(w);s.turret!.ammoQ=232;s.turret!.autoReload=false;s.power!.switchOn=false;s.power!.on=false;
  assignBackground(p,{childhood:'quiet-child',adulthood:'medic'});p.priorities.haul=1;
  addGroundMaterial(w,'steel',3,{x:13,z:32},'steel');
  expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-haul',pawnId:p.id,target:{type:'turret',structureId:s.id},queue:false}).ok).toBe(true);
  until(w,()=>p.haul?.phase==='deliver');expect(s.turret!.ammoQ).toBe(232);expect(units(w,'steel')).toBe(3);
  until(w,()=>p.haul?.serviceProgress===10);expect(s.turret!.ammoQ).toBe(232);replay(w,3);
  until(w,()=>p.haul===null);expect(s.turret!.ammoQ).toBe(240);expect(units(w,'steel')).toBe(0);expect(p.draft).toBeDefined();replay(w);
});

test('automatic 50percent threshold and exclusive station preserve physical cargo when policy stops in transit',()=>{
  const w=prepared(),p=w.pawns[0]!,s=campTurret(w);p.priorities.haul=1;s.turret!.ammoQ=124;
  addGroundMaterial(w,'steel',10,{x:12,z:32},'steel');stepWorld(w,3);expect(p.haul).toBeNull();
  s.turret!.ammoQ=120;p.planCooldown=0;until(w,()=>p.haul?.phase==='deliver');
  expect(turretReloadCapacity(w,s.id)).toBe(0);const carried=p.haul!.carryPileId;
  expect(applyCommand(w,{type:'turret-auto-reload',structureId:s.id,enabled:false}).ok).toBe(true);
  expect(p.haul).toBeNull();expect(s.turret!.ammoQ).toBe(120);expect(units(w,'steel')).toBe(10);
  expect(w.piles.find(i=>i.id===carried)?.owner.type).toBe('ground');expect(validateWorld(w)).toEqual([]);replay(w);
});

test('last steel unit tolerance and direct personal priority refill are conserved across multiple trips',()=>{
  const w=prepared(),p=w.pawns[0]!,s=campTurret(w);p.priorities.haul=1;s.turret!.ammoQ=0;s.turret!.autoReload=false;
  addGroundMaterial(w,'steel',75,{x:12,z:32},'steel');addGroundMaterial(w,'steel',5,{x:12,z:33},'steel');
  expect(applyCommand(w,{type:'order-haul',pawnId:p.id,target:{type:'turret',structureId:s.id},queue:false}).ok).toBe(true);
  until(w,()=>s.turret!.ammoQ===240,1800);expect(units(w,'steel')).toBe(0);stepWorld(w);expect(p.priorityWork).toBeUndefined();replay(w);
  s.turret!.ammoQ=238;expect(turretReloadCapacity(w,s.id,p.id,true)).toBe(0);
  addGroundMaterial(w,'steel',1,{x:12,z:32},'steel');expect(applyCommand(w,{type:'order-haul',pawnId:p.id,target:{type:'turret',structureId:s.id},queue:false}).ok).toBe(false);expect(units(w,'steel')).toBe(1);
});
