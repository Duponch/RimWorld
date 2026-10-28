import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {applyCommand,advanceWorldCore297} from '../src/sim/engine.ts';
import {validateWorld,serializeWorld} from '../src/sim/serialization.ts';
import {effectiveCore297} from '../src/sim/core-phase-297.ts';
import {startTravel} from '../src/sim/movement.ts';
import {combatCell297,meleeThreatTarget} from '../src/sim/combat-target.ts';
import {captureWorldProjectileTargets} from '../src/sim/projectile-world.ts';
import {captureCoreProjectileBatch297} from '../src/sim/core-projectile-batch-297.ts';
import {advanceBulletFlight,createBulletFlight} from '../src/sim/bullet-flight.ts';
import {meleeContact,captureMeleePlaces} from '../src/sim/melee-space.ts';
import {captureTurretTargets,turretShotPlan} from '../src/sim/mini-turret.ts';
import {shotPlan,shootingQueries} from '../src/sim/shooting.ts';
import {hostileCells} from '../src/sim/combat-navigation.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import type {Cell,Pawn,World} from '../src/sim/types.ts';

function camp(){
 const w=deconstructionCamp(3,32);
 expect(Number(w.schemaVersion)).toBe(297);expect(w.phaseCore297).toBe(0);
 for(const [i,p]of w.pawns.entries()){
  Object.assign(p,{x:3+i*7,z:5,hunger:70,rest:80,needCooldown:20});p.schedule.fill('anything');p.recreation.level=100;
  for(const k of Object.keys(p.priorities)as(keyof Pawn['priorities'])[])p.priorities[k]=0;
 }
 if(w.wildlife)w.wildlife.animals=[];
 expect(validateWorld(w)).toEqual([]);
 for(const p of w.pawns)expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(true);
 return w;
}
function move(w:World,p:Pawn,to:Cell){
 const from={x:p.x,z:p.z};expect(startTravel(w,p,to)).toBe(true);
 expect(p.motion?.from).toEqual(from);expect(p.motion?.to).toEqual(to);expect(p.motion!.end*10).toBeGreaterThan(effectiveCore297(w));
 expect(validateWorld(w)).toEqual([]);return Math.ceil(p.motion!.end*10);
}
function through(w:World,core:number){
 for(let n=0;n<180&&effectiveCore297(w)<core;n++)expect(advanceWorldCore297(w).core).toBe(effectiveCore297(w));
 expect(effectiveCore297(w)).toBe(core);
}
const point=(c:Cell)=>({x:c.x,z:c.z});

test('full and retained-batch captures keep an unpaid human at its source, then refresh at the paid end without mutating old views or RAW',()=>{
 const w=camp(),p=w.pawns[0]!,end=move(w,p,{x:4,z:5}),key=`pawn:${p.id}`;
 const before=serializeWorld(w),full=captureWorldProjectileTargets(w),batch=captureCoreProjectileBatch297(w),scene=batch.refresh(w)(new Set(),1);
 expect(full.anchor(key)).toEqual({x:3,z:5});expect(scene.target(key)?.cell).toEqual({x:3,z:5});
 expect(scene.at({x:3,z:5}).map(t=>t.key)).toContain(key);expect(scene.at({x:4,z:5}).map(t=>t.key)).not.toContain(key);
 expect(serializeWorld(w)).toBe(before);expect(point(p)).toEqual({x:4,z:5});
 through(w,end);
 expect(captureWorldProjectileTargets(w).anchor(key)).toEqual({x:4,z:5});expect(batch.refresh(w)(new Set(),1).target(key)?.cell).toEqual({x:4,z:5});
 expect(full.anchor(key)).toEqual({x:3,z:5});expect(scene.target(key)?.cell).toEqual({x:3,z:5});expect(point(p)).toEqual({x:4,z:5});
});

test('the unchanged ballistic kernel sees the physical destination-cell candidate, equally from full and owned captures',()=>{
 const w=camp(),p=w.pawns[0]!;move(w,p,{x:4,z:5});const key=`pawn:${p.id}`;
 // No used-target identity bypass: this is the kernel's real destination fallback.
 const flight=createBulletFlight({origin:{x:1.5,z:5.5},destination:{x:3.5,z:5.5},launcherKey:`pawn:${w.pawns[1]!.id}`,equipmentKey:null,intendedKey:null,usedKey:null,flags:2,preventFriendlyFire:false,speedPerCoreTick:1});
 const full=captureWorldProjectileTargets(w).scene(new Set(),1),owned=captureCoreProjectileBatch297(w).refresh(w)(new Set(),1);
 expect(advanceBulletFlight(flight,full,()=>0,2).arrival?.targetKey).toBe(key);
 expect(advanceBulletFlight(flight,owned,()=>0,2).arrival?.targetKey).toBe(key);
 expect(flight.completed).toBe(false);expect(point(p)).toEqual({x:4,z:5});
});

test.each([{from:5,to:4,before:false,after:true},{from:4,to:5,before:true,after:false}])('melee contact uses the actually occupied human cell for edge $from to $to',({from,to,before,after})=>{
 const w=camp(),a=w.pawns[0]!,target=w.pawns[1]!;Object.assign(target,{x:from,z:5});const end=move(w,target,{x:to,z:5});
 expect(meleeContact(w,a,target)).toBe(before);
 const places=captureMeleePlaces(w,a)(target);
 expect(places.some(c=>c.x===from&&c.z===5)).toBe(false);
 through(w,end);expect(meleeContact(w,a,target)).toBe(after);expect(point(target)).toEqual({x:to,z:5});
});

test('pre-spatial ranged planning retains its prior raw target point while projectile occupancy stays physical',()=>{
 const w=camp(),shooter=w.pawns[0]!,target=w.pawns[1]!;Object.assign(target,{x:6,z:5});
 addMaterial(w,'weapon',1,{type:'equipment',pawnId:shooter.id},'revolver');move(w,target,{x:7,z:5});
 const plan=shotPlan(w,shooter,target.id,shootingQueries(w));expect('reason'in plan).toBe(false);if('reason'in plan)throw Error(plan.reason);
 expect(plan.target).toBe(target);expect(plan.line.from).toEqual({x:3,z:5});expect(plan.line.to).toEqual({x:7,z:5});expect(plan.line.distance).toBe(4);
 expect(captureWorldProjectileTargets(w).anchor(`pawn:${target.id}`)).toEqual({x:6,z:5});
 expect(point(target)).toEqual({x:7,z:5});expect(plan.weapon.owner).toEqual({type:'equipment',pawnId:shooter.id});
});

test('pre-spatial turret acquisition and line retain raw target coordinates independently from physical projectile occupancy',()=>{
 const w=camp(),target=w.pawns[1]!;Object.assign(target,{x:7,z:5});const end=move(w,target,{x:8,z:5});target.faction='outlaws';
 const gun=fixtureBuilding(w,'mini-turret',5,5),index=captureTurretTargets(w),q={...shootingQueries(w),turretTargets:()=>index};
 expect(index.near({x:5,z:5},2)).not.toContain(target);expect(index.near({x:5,z:5},3)).toContain(target);
 const plan=turretShotPlan(w,gun,`pawn:${target.id}`,q);expect('reason'in plan).toBe(false);if('reason'in plan)throw Error(plan.reason);
 expect(plan.target).toBe(target);expect(plan.line.to).toEqual({x:8,z:5});expect(plan.line.distance).toBe(3);
 expect(captureWorldProjectileTargets(w).anchor(`pawn:${target.id}`)).toEqual({x:7,z:5});
 delete target.faction;w.structures=w.structures.filter(s=>s!==gun);through(w,end);target.faction='outlaws';
 expect(captureWorldProjectileTargets(w).anchor(`pawn:${target.id}`)).toEqual({x:8,z:5});expect(captureTurretTargets(w).near({x:5,z:5},2)).not.toContain(target);expect(index.near({x:5,z:5},3)).toContain(target);
});

test('retaliation range expires at a paid human entry, not when RAW anticipates that entry',()=>{
 const w=camp(),owner=w.pawns[0]!,attacker=w.pawns[1]!;Object.assign(owner,{x:1,z:5});Object.assign(attacker,{x:4,z:5});
 const end=move(w,attacker,{x:5,z:5});owner.meleeThreat={attackerId:attacker.id,atCore:effectiveCore297(w)};
 expect(meleeThreatTarget(w,owner)).toBe(attacker);
 through(w,end);expect(meleeThreatTarget(w,owner)).toBeUndefined();expect(point(attacker)).toEqual({x:5,z:5});
});

test('traffic still reserves both endpoints while active but releases an ended fractional edge within the same macro tick',()=>{
 const w=camp(),observer=w.pawns[2]!,target=w.pawns[0]!,end=move(w,target,{x:4,z:5});through(w,end);
 target.faction='outlaws';const current=hostileCells(w,observer),source=5*w.width+3,destination=5*w.width+4;
 expect(w.tick).toBeLessThan(target.motion!.end);expect(current.has(destination)).toBe(true);expect(current.has(source)).toBe(false);
 const legacy={...w,schemaVersion:296} as unknown as World;
 expect(hostileCells(legacy,observer).has(source)).toBe(true);
});

test('legacy and plain proposed Cells keep literal coordinates and never inspect human motion for an older schema',()=>{
 const cell={x:4,z:5,skills:{},orders:{},get motion():never{throw Error('Legacy must not read motion');}};
 expect(combatCell297(296,cell,100)).toBe(cell);
 const candidate={x:8,z:9,id:17,motion:{from:{x:1,z:1},to:{x:8,z:9},start:0,end:10}};
 expect(combatCell297(297,candidate,1)).toBe(candidate);
 const w=camp(),p=w.pawns[0]!;move(w,p,{x:4,z:5});
 expect(captureWorldProjectileTargets({...w,schemaVersion:296}as unknown as World).anchor(`pawn:${p.id}`)).toEqual({x:4,z:5});
});
