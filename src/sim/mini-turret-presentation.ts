import { animalSpecies } from './animal-species.ts';
import { pawnBodyLocation } from './human-corpses.ts';
import { isPowerActive } from './power-rules.ts';
import type { TurretLivingKey } from './mini-turret-state.ts';
import type { Cell, Structure, World } from './types.ts';
import { MINI_TURRET_PROFILE } from './mini-turret-profile.ts';
import { BOMB_RADIUS } from './bomb-state.ts';

export const MINI_TURRET_DISPLAY_RANGE=MINI_TURRET_PROFILE.range;
export const MINI_TURRET_DISPLAY_BOMB_RADIUS=BOMB_RADIUS;
export interface MiniTurretTarget { key:TurretLivingKey; label:string; cell:Cell|null }
/** One index per adopted World; presentation never acquires a target or draws RNG. */
export function miniTurretTargets(world:World):ReadonlyMap<TurretLivingKey,MiniTurretTarget> {
  const targets=new Map<TurretLivingKey,MiniTurretTarget>();
  for(const pawn of world.pawns){const key=`pawn:${pawn.id}` as const,body=pawnBodyLocation(world,pawn);targets.set(key,{key,label:pawn.name,cell:body?{x:body.x,z:body.z}:null});}
  for(const animal of world.wildlife?.animals??[]){const key=`animal:${animal.id}` as const;targets.set(key,{key,label:`${animalSpecies(animal.species).label} ${animal.id}`,cell:{x:animal.x,z:animal.z}});}
  return targets;
}
const missing=(key:TurretLivingKey):MiniTurretTarget=>({key,label:`${key.startsWith('pawn:')?'Personne':'Animal'} ${key.slice(key.indexOf(':')+1)} indisponible`,cell:null});
export const turretSeconds=(core:number):string=>`${(core/60).toFixed(2).replace(/0$/,'').replace('.',',')} s`;
export function miniTurretView(world:World,structure:Structure,targets=miniTurretTargets(world)) {
  const state=structure.kind==='mini-turret'?structure.turret:undefined;if(!state)return null;
  const target=state.targetKey?targets.get(state.targetKey)??missing(state.targetKey):null;
  const burstTarget=state.burst?targets.get(state.burst.targetKey)??missing(state.burst.targetKey):null;
  const active=isPowerActive(structure);
  const phase=state.burst?'burst':state.warmup?'warmup':state.cooldownCore>0?'cooldown':'idle';
  const reason=structure.breakdown?'En panne':!active?'Sans courant actif':state.ammoQ<4?'Canon sans coup disponible':state.holdFire?'Feu retenu':!target?'Aucune cible acquise':undefined;
  const phaseLabel=phase==='burst'?`Rafale engagée · seconde balle dans ${turretSeconds(state.burst!.delayCore)}${active?'':' · suspendue'}`
    :phase==='warmup'?`Échauffement · ${turretSeconds(state.warmup!.remainingCore)} restantes`
      :phase==='cooldown'?`Recharge entre rafales · ${turretSeconds(state.cooldownCore)}${active?'':' · suspendue'}`:reason??'Prête';
  const services=world.pawns.flatMap(p=>p.haul?.destination.type==='turret'&&p.haul.destination.structureId===structure.id
    ?[{pawnId:p.id,name:p.name,phase:p.haul.phase,quantity:p.haul.quantity,progress:p.haul.serviceProgress??0,carryPileId:p.haul.carryPileId}]:[]);
  return {id:structure.id,cell:{x:structure.x,z:structure.z},ammoQ:state.ammoQ,shots:Math.floor(state.ammoQ/4),
    reserve:state.ammoQ/4,full:240-state.ammoQ<3,autoReload:state.autoReload,holdFire:state.holdFire,
    active,phase,phaseLabel,reason,target,burstTarget,aim:burstTarget??target,services,
    wick:state.wick?{...state.wick,remainingCore:Math.max(0,state.wick.endCore-world.tick*10)}:null};
}
/** Geometric indication only: no LOS, reachability or admission promise. */
export function miniTurretRadiusCells(world:Pick<World,'width'|'height'>,center:Cell,radius:number):number[] {
  const cells:number[]=[],reach=Math.ceil(radius);
  for(let z=Math.max(0,center.z-reach);z<=Math.min(world.height-1,center.z+reach);z++)
    for(let x=Math.max(0,center.x-reach);x<=Math.min(world.width-1,center.x+reach);x++)
      if((x-center.x)**2+(z-center.z)**2<=radius*radius)cells.push(z*world.width+x);
  return cells;
}
