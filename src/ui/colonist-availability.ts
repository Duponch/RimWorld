import { isColonist } from '../sim/affiliation';
import { everyHumanPawnOwner } from '../sim/human-owners';
import type { Pawn,World } from '../sim/types';

export type LocalColonistAvailabilityCause='detained'|'downed'|'mental-crisis';
export interface LocalColonistAvailability {
  readonly id:number;readonly name:string;
  readonly causes:readonly LocalColonistAvailabilityCause[];
}
export type AwayColonistOwner='scout-away'|'commercial-away'|'group-away';
export type AwayColonistPhase=NonNullable<World['scout']>['phase']
  |NonNullable<World['commercialTrip']>['phase']|NonNullable<World['group']>['phase'];
export interface AwayColonistAvailability {
  readonly id:number;readonly name:string;readonly owner:AwayColonistOwner;readonly phase:AwayColonistPhase;
}
export interface ConfirmedColonistDeath {
  readonly id:number;readonly name:string;
  readonly owner:'map'|'group-loss'|'scout-away'|'commercial-away';
  /** Legacy dead states need no invented clinical timestamp. */
  readonly deathAt?:number;
}
export interface SuspendedColonistAvailability {
  readonly id:number;readonly name:string;
  readonly owner:'player-casket'|'ship-casket';readonly casketId:number;
}
export type ColonistAvailability=
  |{readonly kind:'available';readonly pawnIds:readonly number[]}
  |{readonly kind:'arriving';readonly pawnIds:readonly number[]}
  |{readonly kind:'unavailable';readonly local:readonly LocalColonistAvailability[];
    readonly away:readonly AwayColonistAvailability[];readonly deaths:readonly ConfirmedColonistDeath[];
    readonly suspended?:readonly SuspendedColonistAvailability[]};

const alive=(pawn:Pawn):boolean=>pawn.state!=='dead'&&!pawn.health?.death;
/** Existing UI selection policy, not a promise that any particular work or
 * violent order is executable. Sleep, work and held possessions do not remove
 * control. The worker still decides whether an actual command is accepted. */
export const isLocallyControllableColonist=(pawn:Pawn):boolean=>
  isColonist(pawn)&&!pawn.prisoner&&alive(pawn)&&pawn.state!=='downed'&&!pawn.mental?.crisis;

const byId=(a:{id:number},b:{id:number})=>a.id-b.id;
/** Read only a confirmed snapshot. An available local team needs no traversal
 * of other owners. Otherwise inspect original Pawn owners without reading any
 * possessions, registering IDs, retaining mutable references or consuming RNG.
 * Formation references and foreign/frozen archives are not active colonists. */
export function readColonistAvailability(world:World):ColonistAvailability {
  const pawnIds=world.pawns.filter(isLocallyControllableColonist).map(p=>p.id).sort((a,b)=>a-b);
  if(pawnIds.length)return {kind:'available',pawnIds};
  const contained:number[]=[],local:LocalColonistAvailability[]=[],away:AwayColonistAvailability[]=[],deaths:ConfirmedColonistDeath[]=[],suspended:SuspendedColonistAvailability[]=[];
  let caskets:Map<Pawn,Pick<SuspendedColonistAvailability,'owner'|'casketId'>>|undefined;
  const suspendedPlace=(pawn:Pawn)=>{
    if(!caskets){
      caskets=new Map();
      for(const s of world.structures){
        if(s.kind==='cryptosleep-casket'&&s.cryptosleep?.human)caskets.set(s.cryptosleep.human,{owner:'player-casket',casketId:s.id});
        else if(s.kind==='ship-cryptosleep-casket'&&s.shipCryptosleep277?.occupant?.kind==='human')caskets.set(s.shipCryptosleep277.occupant.pawn,{owner:'ship-casket',casketId:s.id});
      }
    }
    return caskets.get(pawn);
  };
  everyHumanPawnOwner(world,(pawn,owner)=>{
    if(owner==='visitor-departure'||owner==='pod-departure'||!isColonist(pawn))return true;
    if(!alive(pawn)){
      if(owner==='map'||owner==='group-loss'||owner==='scout-away'||owner==='commercial-away')
        deaths.push({id:pawn.id,name:pawn.name,owner,...pawn.health?.death?{deathAt:pawn.health.death.tick}:{}});
      return true;
    }
    if(owner==='starting-pod'){contained.push(pawn.id);return true;}
    if(owner==='player-casket'||owner==='ship-casket'){
      const place=suspendedPlace(pawn);if(place?.owner===owner)suspended.push({id:pawn.id,name:pawn.name,...place});
      return true;
    }
    if(owner==='map'){
      const causes:LocalColonistAvailabilityCause[]=[];
      if(pawn.prisoner)causes.push('detained');
      if(pawn.state==='downed')causes.push('downed');
      if(pawn.mental?.crisis)causes.push('mental-crisis');
      local.push({id:pawn.id,name:pawn.name,causes});
    }else if(owner==='scout-away'||owner==='commercial-away'||owner==='group-away'){
      const phase=owner==='scout-away'?world.scout!.phase:owner==='commercial-away'?world.commercialTrip!.phase:world.group!.phase;
      away.push({id:pawn.id,name:pawn.name,owner,phase});
    }
    return true;
  });
  if(contained.length)return {kind:'arriving',pawnIds:contained.sort((a,b)=>a-b)};
  return {kind:'unavailable',local:local.sort(byId),away:away.sort(byId),deaths:deaths.sort(byId),...suspended.length?{suspended:suspended.sort(byId)}:{}};
}
