import { expect,test } from 'vitest';
import { empForcedMissRadius,emitEmpProjectile } from '../src/sim/emp-emission.ts';
import { emitRevolverBullet,type BulletEmissionInput } from '../src/sim/bullet-emission.ts';
import { rangedWeaponProfile } from '../src/sim/ranged-statistics.ts';
import { createBulletFlight } from '../src/sim/bullet-flight.ts';
import { registerWorldProjectile,advanceWorldProjectiles } from '../src/sim/projectile-system.ts';
import { advanceWorldCombat } from '../src/sim/combat-system.ts';
import { applyShootingCommand } from '../src/sim/shooting.ts';
import { validateBombWaves } from '../src/sim/bomb-state.ts';
import { startEmpExplosion,advanceBombWave } from '../src/sim/bomb-system.ts';
import { validateWorld,serializeWorld,deserializeWorld } from '../src/sim/serialization.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { captureWorldShotGrid } from '../src/sim/combat-world.ts';
import { shotAim,shotCover } from '../src/sim/combat-report.ts';
import { firingCamp } from './scenarios/shooting.ts';
import { fixtureMechanoid } from './scenarios/mechanoid-combat-v213.ts';
import { huntingWanted } from '../src/sim/hunting.ts';
import { enableWildlife } from '../src/sim/wildlife.ts';
import { WEAPON_QUALITIES as QUALITIES } from '../src/sim/equipment-rules.ts';

function camp(){const w=firingCamp();w.piles=[];const pawn=w.pawns[0]!;
  addMaterial(w,'weapon',1,{type:'equipment',pawnId:pawn.id},'emp-launcher');
  const m=fixtureMechanoid(w,pawn.x+2,pawn.z);return {w,pawn,m};}
function emissionInput():BulletEmissionInput {
  const {w,pawn,m}=camp(),grid=captureWorldShotGrid(w),cover=shotCover(grid,pawn,m,`mech:${m.id}`);
  return {grid,line:{from:pawn,to:m},origin:{x:pawn.x+.5,z:pawn.z+.5},launcherKey:`pawn:${pawn.id}`,equipmentKey:'pile:1',
    target:{key:`mech:${m.id}`,cell:m,full:false,canBenefitFromCover:true},cover,
    aim:shotAim({distance:2,pawnAccuracy:1,weaponAccuracy:[1,1,1,1],targetSize:1,standing:true,weather:1,blindSmoke:false},1),
    profile:rangedWeaponProfile('emp-launcher','normal')!,canHitOtherPawns:true,preventFriendlyFire:false,coverAnchor:()=>undefined};
}
test('EMP profile and forced radius retain quality, distance thresholds and centre fallback draw order',()=>{
  expect(QUALITIES.map(q=>rangedWeaponProfile('emp-launcher',q)!.damage)).toEqual([45,50,50,50,50,62,75]);
  for(const [d,r] of [[2,0],[3,.95],[5,1.52],[7,1.9]])expect(empForcedMissRadius({x:0,z:0},{x:d!,z:0})).toBe(r);
  const input=emissionInput(),a:number[]=[],b:number[]=[];
  expect(emitEmpProjectile(input,()=>{a.push(.5);return .5;})).toEqual(emitRevolverBullet(input,()=>{b.push(.5);return .5;}));expect(a).toEqual(b);
  input.target.cell={x:input.line.from.x+7,z:input.line.from.z};input.line.to=input.target.cell;
  const draws=[.99,.25,.5,.5];const result=emitEmpProjectile(input,()=>draws.shift()!);
  expect(result.branch).toBe('forced');expect(result.flight.flags).toBe(7);expect(result.flight.usedKey).toBeNull();expect(draws).toEqual([]);
});
test('a real aimed EMP emits at 210 Core, pauses through save and neutralises without physical damage',()=>{
  const {w,pawn,m}=camp();expect(applyShootingCommand(w,{type:'shoot',pawnIds:[pawn.id],targetId:m.id})).toEqual({ok:true});
  const start=w.tick,health=structuredClone(m.health);let copy=deserializeWorld(serializeWorld(w));
  for(let i=1;i<=24;i++){w.tick++;copy.tick++;advanceWorldCombat(w);advanceWorldCombat(copy);expect(copy).toEqual(w);
    if(i===20)expect(w.projectiles).toBeUndefined();
    if(i===21){expect(w.projectiles?.[0]?.weaponItem).toBe('emp-launcher');expect(w.projectiles?.[0]?.emittedAtCore).toBe(start*10+210);}
  }
  expect(m.emp).toBeDefined();expect(m.health).toEqual(health);expect(m.emp!.stunUntilCore-m.emp!.lastAtCore).toBe(1500);expect(m.emp!.adaptedUntilCore-m.emp!.lastAtCore).toBe(2200);
  expect(pawn.shooting?.stance?.phase).toBe('cooldown');expect(w.fires).toBeUndefined();expect(validateWorld(w)).toEqual([]);
});
test('physical EMP landing creates a saveable cross-cell wave and never Bullet damage to flesh, plants or piles',()=>{
  const {w,pawn,m}=camp();Object.assign(m,{x:pawn.x+8,z:pawn.z});const target=w.pawns[1]!;
  const beforeHealth=structuredClone(target.health),pile={id:w.nextId++,kind:'component' as const,item:'component' as const,quantity:2,owner:{type:'ground' as const,x:target.x,z:target.z}};w.piles.push(pile);
  const tree={id:w.nextId++,kind:'tree' as const,x:target.x,z:target.z,amount:12};w.resources.push(tree);
  const flight=createBulletFlight({launcherKey:`pawn:${pawn.id}`,equipmentKey:`pile:${w.piles[0]!.id}`,intendedKey:`pawn:${target.id}`,usedKey:`pawn:${target.id}`,flags:7,preventFriendlyFire:false,
    origin:{x:target.x+.4,z:target.z+.5},destination:{x:target.x+.5,z:target.z+.5},speedPerCoreTick:.4});
  const p=registerWorldProjectile(w,flight,'normal',{friendlyPawnIds:[],friendlyFireFactor:1},w.rng,w.tick*10,'emp-launcher');
  w.tick++;advanceWorldProjectiles(w);expect(p.arrival?.effect).toBe('pawn');expect(target.health).toEqual(beforeHealth);expect(tree).not.toHaveProperty('damage');expect(pile).not.toHaveProperty('damage');expect(target.stun).toBeUndefined();expect(w.fires).toBeUndefined();
  const wave=w.bombWaves![0]!;expect(wave.emp).toEqual({quality:'normal'});expect(wave.cells).toHaveLength(5);expect(wave.nextCell).toBe(5);
  const errors:string[]=[];validateBombWaves(w,errors);expect(errors).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});
test('EMP wave born at final Core resumes once from its captured source and refuses duplicate allocation',()=>{
  const {w,pawn,m}=camp(),core=w.tick*10;
  const flight=createBulletFlight({launcherKey:`pawn:${pawn.id}`,equipmentKey:`pile:${w.piles[0]!.id}`,intendedKey:`mech:${m.id}`,usedKey:`mech:${m.id}`,flags:7,preventFriendlyFire:false,
    origin:{x:m.x+.4,z:m.z+.5},destination:{x:m.x+.5,z:m.z+.5},speedPerCoreTick:.4});
  const p=registerWorldProjectile(w,flight,'normal',{friendlyPawnIds:[],friendlyFireFactor:1},w.rng,core-1,'emp-launcher');advanceWorldProjectiles(w);
  const wave=w.bombWaves![0]!;expect(wave.nextCell).toBe(0);expect(startEmpExplosion(w,p,core)).toBe(false);
  expect(validateWorld(w)).toEqual([]);const copy=deserializeWorld(serializeWorld(w));w.tick++;copy.tick++;advanceWorldCombat(w);advanceWorldCombat(copy);expect(copy).toEqual(w);
  expect(m.emp).toBeDefined();const effect=structuredClone(m.emp);expect(advanceBombWave(w,wave,w.tick*10)).toBe(false);expect(m.emp).toEqual(effect);
});
test('automatic hunting does not select the harmless EMP launcher',()=>{
  const {w,pawn}=camp();delete pawn.draft;pawn.priorities.hunt=4;delete w.wildlife;
  w.resources.push({id:w.nextId++,kind:'berries',x:18,z:18,amount:10});enableWildlife(w,1);w.hunting={targets:[w.wildlife!.animals[0]!.id],completed:0};
  expect(huntingWanted(w,pawn)).toBe(false);w.piles[0]!.item='revolver';expect(huntingWanted(w,pawn)).toBe(true);
});
