/** Real-owner operation captures, never parallel saved state. */
import type { PlanetState } from './planet-state.ts';
import type { GroupState, GroupDepartureBaseline } from './group-state.ts';
import { GROUP_MAX_MEMBERS } from './group-state.ts';
import type { Cell, MaterialPile, Pawn, World } from './types.ts';
import { commercialItemMassGrams } from './commercial-mass.ts';

export type PreparingGroup=Extract<GroupState,{memberIds:number[];manifest:unknown}>;
export type AwayGroup=Extract<GroupState,{members:Pawn[]}>;
export interface GroupMassCapture {
  readonly grams:number;
  readonly capacityGrams:number;
  readonly carriers:readonly {pawnId:number;grams:number;capacityGrams:number}[];
}
export interface GroupTravelCapture {
  /** One mass object: preview, overload guard and edge context share this reference. */
  readonly mass:GroupMassCapture;
  readonly incapableIds:readonly number[];
  readonly anyRestNeed:boolean;
}
export interface FormationNamespace {
  /** Complete real human ownership capture, including away/terminal/archive owners.
   * IDs of references alone never produce a slot. Root validates this capture. */
  readonly byId:ReadonlyMap<number,{pawn?:Pawn;local:boolean}>;
}
/** Root injects real guards/common physical captures; no projected World. */
export interface GroupFormationAuthority {
  namespace(world:World):FormationNamespace;
  memberReason(world:World,pawn:Pawn):string|undefined;
  residentCapable(world:World,pawn:Pawn):boolean;
  sourceReason(world:World,pile:MaterialPile,carrier:Pawn):string|undefined;
  reservedQuantity(world:World,pileId:number,exceptGroupId?:number):number;
  /** Actual common local navigation quota; unknown remains deferred. */
  sourceAccess(world:World,pawn:Pawn,pile:MaterialPile):'reachable'|'unreachable'|'deferred';
  /** Thing/global-owner/loss-cap guards stay root-owned, with concrete owners. */
  namespaceReason(world:World,request:{additionalPiles:number;members:readonly Pawn[];items:readonly MaterialPile[]}):string|undefined;
}
export interface GroupCandidatesCapture {
  tick:number;
  namespace:FormationNamespace;
  members:readonly Pawn[];
  items:readonly MaterialPile[];
  sources:ReadonlyMap<number,MaterialPile>;
  mass:GroupMassCapture;
}
export type CaptureResult<T>={kind:'ready';capture:T}|{kind:'refused';reason:string};
const possession=(pile:MaterialPile,idSet:ReadonlySet<number>):boolean=>
  'pawnId' in pile.owner&&idSet.has(pile.owner.pawnId);
const allowedOwner=(pile:MaterialPile):boolean=>['inventory','equipment','apparel'].includes(pile.owner.type);
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;

/** Actual items only; no descriptors with user-supplied eligible/unitMass fields. */
export function captureGroupMass(members:readonly Pawn[],items:readonly MaterialPile[]):GroupMassCapture|undefined {
  if(members.length<1||members.length>GROUP_MAX_MEMBERS||new Set(members.map(p=>p.id)).size!==members.length)return undefined;
  const byId=new Map(members.map(p=>[p.id,{pawnId:p.id,grams:0,capacityGrams:35000}])),pileIds=new Set<number>(),counts=new Map<number,number>();
  for(const pile of items){
    if(pileIds.has(pile.id)||!Number.isSafeInteger(pile.id)||pile.id<1||!Number.isSafeInteger(pile.quantity)||pile.quantity<1
      ||!allowedOwner(pile)||!('pawnId' in pile.owner))return undefined;
    pileIds.add(pile.id);const owner=byId.get(pile.owner.pawnId),unit=commercialItemMassGrams(pile.item);
    if(!owner||unit===undefined||pile.owner.type!=='inventory'&&pile.quantity!==1)return undefined;
    const count=(counts.get(owner.pawnId)??0)+1;if(count>256)return undefined;counts.set(owner.pawnId,count);
    owner.grams+=unit*pile.quantity;if(!Number.isSafeInteger(owner.grams))return undefined;
  }
  const carriers=[...byId.values()],grams=carriers.reduce((n,c)=>n+c.grams,0),capacityGrams=carriers.reduce((n,c)=>n+c.capacityGrams,0);
  if(!Number.isSafeInteger(grams)||!Number.isSafeInteger(capacityGrams))return undefined;
  return Object.freeze({grams,capacityGrams,carriers:Object.freeze(carriers.map(c=>Object.freeze(c)))});
}

/** Exhaustive possessions from the real map array; no bool-only admission. */
export function captureGroupCandidates(world:World,memberIds:readonly number[],authority:GroupFormationAuthority):CaptureResult<GroupCandidatesCapture> {
  const fail=(reason:string):CaptureResult<GroupCandidatesCapture>=>({kind:'refused',reason});
  if(memberIds.length<1||memberIds.length>GROUP_MAX_MEMBERS||new Set(memberIds).size!==memberIds.length
    ||memberIds.some(id=>!Number.isSafeInteger(id)||id<1||id>=world.nextId))return fail('members');
  const namespace=authority.namespace(world),map=new Map<number,Pawn>();
  for(const pawn of world.pawns){if(map.has(pawn.id))return fail('duplicate-map-person');map.set(pawn.id,pawn);}
  const members:Pawn[]=[];
  for(const id of [...memberIds].sort((a,b)=>a-b)){
    const pawn=map.get(id),slot=namespace.byId.get(id);
    if(!pawn||!slot?.local||slot.pawn!==pawn)return fail('exclusive-human-owner');
    const reason=authority.memberReason(world,pawn);if(reason)return fail(reason);members.push(pawn);
  }
  const ids=new Set(memberIds);
  if(!world.pawns.some(p=>!ids.has(p.id)&&authority.residentCapable(world,p)))return fail('resident');
  const sources=new Map<number,MaterialPile>(),items:MaterialPile[]=[];
  for(const pile of world.piles){
    if(sources.has(pile.id))return fail('duplicate-map-pile');sources.set(pile.id,pile);
    if(possession(pile,ids)){if(!allowedOwner(pile))return fail('temporary-cargo');items.push(pile);}
  }
  if(world.packed.some(p=>'pawnId' in p.owner&&ids.has(p.owner.pawnId)))return fail('packed-cargo');
  const mass=captureGroupMass(members,items);if(!mass)return fail('unknown-mass');
  if(mass.carriers.some(c=>c.grams>c.capacityGrams))return fail('overload');
  const reason=authority.namespaceReason(world,{additionalPiles:0,members,items});if(reason)return fail(reason);
  return {kind:'ready',capture:{tick:world.tick,namespace,members,items,sources,mass}};
}

export interface GroupDepartureCapture extends GroupCandidatesCapture {
  baseline:GroupDepartureBaseline;
  exitCells:readonly {pawnId:number;cell:Cell}[];
  /** Real originals, to be removed/adopted together by root's transaction. */
  mapPawns:readonly Pawn[];
  mapPiles:readonly MaterialPile[];
  nextThingId:number;
  /** Protect same-tick paused changes as well as array replacement. Root still
   * performs full global owner/version preflight in its adoption transaction. */
  memberSignatures:readonly string[];
  itemSignatures:readonly string[];
}
function departureBaseline(items:readonly MaterialPile[]):GroupDepartureBaseline|undefined {
  const result:GroupDepartureBaseline={food:0,silver:0,cargo:{cloth:0,'muffalo-wool':0},medicine:0,component:0};
  for(const item of items){
    if(item.owner.type!=='inventory')continue;
    if(item.item==='survival-meal'){if(item.foodPoison)return undefined;result.food+=item.quantity;}
    else if(item.item==='silver')result.silver+=item.quantity;
    else if(item.item==='cloth'||item.item==='muffalo-wool')result.cargo[item.item]+=item.quantity;
    else if(item.item==='medicine'||item.item==='component')result[item.item]+=item.quantity;
  }
  return [result.food,result.silver,result.cargo.cloth,result.cargo['muffalo-wool'],result.medicine,result.component].every(Number.isSafeInteger)?result:undefined;
}

/** Captures ONLY after all real exit contacts/arêtes and personal pass of tick.
 * Root checks no future personal tick and initializes lastPersonalTick to tick. */
export function captureGroupDeparture(world:World,group:PreparingGroup,authority:GroupFormationAuthority):CaptureResult<GroupDepartureCapture> {
  const fail=(reason:string):CaptureResult<GroupDepartureCapture>=>({kind:'refused',reason});
  if(group.phase!=='leaving'||group.cursor!==group.manifest.length)return fail('phase');
  const result=captureGroupCandidates(world,group.memberIds,authority);if(result.kind!=='ready')return result;
  const capture=result.capture,ids=new Set(group.memberIds),exits=new Map<number,Cell>(),exitKeys=new Set<string>();
  if(group.exits.length!==capture.members.length)return fail('exit-roster');
  for(const exit of group.exits){
    const c=exit.cell;
    if(!ids.has(exit.pawnId)||exits.has(exit.pawnId)||!c||!Number.isSafeInteger(c.x)||!Number.isSafeInteger(c.z)
      ||c.x<0||c.z<0||c.x>=world.width||c.z>=world.height||!(c.x===0||c.z===0||c.x===world.width-1||c.z===world.height-1))return fail('exit');
    const key=`${c.x}:${c.z}`;if(exitKeys.has(key))return fail('duplicate-exit-cell');exitKeys.add(key);
    exits.set(exit.pawnId,c);
  }
  for(const pawn of capture.members){
    const exit=exits.get(pawn.id)!;
    if(!same(pawn,exit)||pawn.path.length||pawn.motion&&pawn.motion.end>world.tick||pawn.moveCooldown>0)return fail('exit-not-complete');
  }
  // Contact receipts are historical. Consumed on-map rations are not recreated.
  const baseline=departureBaseline(capture.items);if(!baseline)return fail('departure-baseline');
  return {kind:'ready',capture:{...capture,baseline,exitCells:[...exits].map(([pawnId,cell])=>({pawnId,cell:{...cell}})),
    mapPawns:world.pawns,mapPiles:world.piles,nextThingId:world.nextId,
    memberSignatures:capture.members.map(p=>JSON.stringify(p)),itemSignatures:capture.items.map(p=>JSON.stringify(p))}};
}

/** Not just tick/nextId: checks exhaustive original membership and quantities.
 * A stale prepared draft must never be used after an await or another command. */
export function groupDepartureCurrent(world:World,capture:GroupDepartureCapture):boolean {
  if(world.tick!==capture.tick||world.nextId!==capture.nextThingId||world.pawns!==capture.mapPawns||world.piles!==capture.mapPiles)return false;
  const ids=new Set(capture.members.map(p=>p.id));
  const actual=world.piles.filter(p=>possession(p,ids));
  return actual.length===capture.items.length&&!world.packed.some(p=>'pawnId' in p.owner&&ids.has(p.owner.pawnId))
    &&capture.members.every((p,i)=>world.pawns.includes(p)&&JSON.stringify(p)===capture.memberSignatures[i])
    &&capture.items.every((p,i)=>actual.includes(p)&&JSON.stringify(p)===capture.itemSignatures[i]);
}

/** Root supplies clinical incapacity/rest semantics; mass derives only owners.
 * The caller then passes exactly capture.mass to planetCostContext. */
export function captureGroupTravel(group:AwayGroup,assess:(pawn:Pawn)=>{incapable:boolean;restNeed:boolean}):GroupTravelCapture|undefined {
  const mass=captureGroupMass(group.members,group.items);if(!mass)return undefined;
  const incapableIds:number[]=[],rest:boolean[]=[];
  for(const pawn of group.members){if(pawn.state==='dead'||pawn.health?.death)return undefined;const status=assess(pawn);
    if(status.incapable)incapableIds.push(pawn.id);rest.push(status.restNeed);}
  return {mass,incapableIds,anyRestNeed:rest.some(Boolean)};
}

/** Geography reference validation stays explicit before formation/departure. */
export const groupDestinationValid=(planet:PlanetState,id:number):boolean=>
  Number.isSafeInteger(id)&&!!planet.tiles[id]&&planet.tiles[id]!.biome!=='ocean';
