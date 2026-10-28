import type {BulletFlight} from './bullet-flight.ts';
import {validWorldProjectile} from './projectile-save.ts';
import type {ProjectileProfileId} from './ranged-statistics.ts';
import type {ProjectileRelations,WorldProjectile} from './projectile-state.ts';
import type {WeaponQuality} from './equipment-rules.ts';
import type {World} from './types.ts';
import {effectiveCore297} from './core-phase-297.ts';

export function registerWorldProjectile297(world:World,flight:BulletFlight,quality:WeaponQuality,relations:ProjectileRelations,rng=world.rng,at=effectiveCore297(world),weaponItem:ProjectileProfileId='revolver'):WorldProjectile {
  if(Number(world.schemaVersion)!==297||!Number.isSafeInteger(world.nextId+1)||!Number.isSafeInteger(rng)||rng<1||rng>0xffffffff||world.projectiles&&world.projectiles.length>=world.width*world.height)throw new RangeError('Cannot register projectile');
  if(!Number.isSafeInteger(at)||at!==effectiveCore297(world))throw new RangeError('Invalid emission time');
  if(weaponItem==='mini-turret-gun'&&!world.structures.some(s=>s.kind==='mini-turret'&&s.turret&&flight.launcherKey===`structure:${s.id}`&&s.id<world.nextId))throw new RangeError('Invalid intrinsic emission owner');
  if((weaponItem==='lancer-gun'||weaponItem==='pikeman-gun')&&(world.schemaVersion<197||quality!=='normal'||flight.equipmentKey!==null
    ||!world.mechanoids?.some(m=>m.mechKind===(weaponItem==='lancer-gun'?'lancer':'pikeman')&&m.state!=='dead'&&!m.health?.death
      &&flight.launcherKey===`mech:${m.id}`&&m.id<world.nextId)))throw new RangeError('Invalid mechanical emission owner');
  const projectile:WorldProjectile={id:world.nextId,quality,...weaponItem!=='revolver'?{weaponItem}:{},emittedAtCore:at,advancedAtCore:at,flight:{...flight,origin:{...flight.origin},destination:{...flight.destination}},relations:{friendlyPawnIds:[...new Set(relations.friendlyPawnIds)].sort((a,b)=>a-b),friendlyFireFactor:relations.friendlyFireFactor,
    ...relations.friendlyTargetKeys!==undefined?{friendlyTargetKeys:[...new Set(relations.friendlyTargetKeys)].sort()}:{}},arrival:null};
  if(projectile.flight.completed||!validWorldProjectile(projectile,world,world.schemaVersion,at))throw new RangeError('Invalid projectile emission');
  world.nextId++;world.rng=rng;(world.projectiles??=[]).push(projectile);return projectile;
}
