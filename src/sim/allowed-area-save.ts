import {validPawnMapAreasRecord,validPawnMapAreaBindings} from './pawn-map-areas.ts';
import { captureHumanOwners,everyHumanPawnOwner } from './human-owners.ts';
import type { AllowedArea,Cell,Pawn,World } from './types.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,lo=0,hi=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=lo&&Number(v)<=hi;
const keys=(v:Record<string,unknown>,required:readonly string[])=>Reflect.ownKeys(v).length===required.length&&required.every(k=>Object.hasOwn(v,k));
const dense=(v:unknown):v is unknown[]=>Array.isArray(v)&&Reflect.ownKeys(v).length===v.length+1&&Array.from({length:v.length},(_,i)=>Object.hasOwn(v,i)).every(Boolean);
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;
export function validAllowedAreaLabel(v:unknown):v is string {
  return typeof v==='string'&&v.length>=1&&v.length<=64&&v===v.trim()&&v===v.normalize('NFC');
}
export function validAllowedAreaCell(v:unknown,w:Pick<World,'width'|'height'>):v is Cell {
  return object(v)&&keys(v,['x','z'])&&int(v.x,0,w.width-1)&&int(v.z,0,w.height-1);
}
export function validAllowedAreaRecord(v:unknown,w:Pick<World,'width'|'height'|'nextId'>):v is AllowedArea {
  return object(v)&&keys(v,['id','label','color','cells'])&&int(v.id,1,w.nextId-1)&&validAllowedAreaLabel(v.label)&&int(v.color,0,0xffffff)
    &&dense(v.cells)&&v.cells.length<=w.width*w.height&&v.cells.every((n,i,a)=>int(n,0,w.width*w.height-1)&&(i===0||Number(a[i-1])<n));
}
/** Presence, including undefined, is prospective. References remain on original
 * living and frozen owners; a return is a separate local spatial intention. */
export function validAllowedAreaPawnShape(p:Record<string,unknown>,w:World,version:number):boolean {
  if(!validPawnMapAreasRecord(p,version,w.nextId))return false;
  if(version<223)return !Object.hasOwn(p,'allowedAreaId')&&!Object.hasOwn(p,'allowedAreaReturn');
  if(Object.hasOwn(p,'allowedAreaId')&&(!int(p.allowedAreaId,1,w.nextId-1)||!Array.isArray(w.allowedAreas)||!w.allowedAreas.some(a=>object(a)&&a.id===p.allowedAreaId)))return false;
  return !Object.hasOwn(p,'allowedAreaReturn')||object(p.allowedAreaReturn)&&keys(p.allowedAreaReturn,['target'])&&validAllowedAreaCell(p.allowedAreaReturn.target,w);
}
function preparation(w:World,p:Pawn):boolean {
  return !!w.group&&['gathering','loading','leaving'].includes(w.group.phase)&&'memberIds' in w.group&&w.group.memberIds.includes(p.id)
    ||!!w.scout&&['loading','leaving'].includes(w.scout.phase)&&'pawnId' in w.scout&&w.scout.pawnId===p.id
    ||!!w.commercialTrip&&['loading','leaving'].includes(w.commercialTrip.phase)&&'pawnId' in w.commercialTrip&&w.commercialTrip.pawnId===p.id;
}
function returnExclusive(w:World,p:Pawn):boolean {
  return (p.faction??'colony')==='colony'&&!p.prisoner&&!p.visitor&&!p.raid&&!p.podRescue&&!p.draft&&!p.mental?.crisis&&!preparation(w,p)
    &&!p.health?.death&&!p.medicalSleep&&!p.collapsePending&&!p.transitExit&&!p.burning&&!p.flee&&!p.bombRefuge&&!p.heatRefuge
    &&!p.interruptedCargo&&!p.equipmentDropPending&&['idle','moving'].includes(p.state)
    &&p.jobId===null&&!p.haul&&!p.cooking&&!p.need&&!p.hunting&&!p.animalHandling&&!p.animalCare&&!p.animalFeed&&!p.animalRescue
    &&!p.openCasket&&!p.burial&&!p.cleaning&&!p.firefighting&&!p.research&&!p.deepWork&&!p.orbitalTrade&&!p.trade&&!p.ward&&!p.feed&&!p.tend&&!p.surgery&&!p.rescue
    &&!p.equipmentTask&&!p.recreation.task&&!p.priorityWork&&p.orders.active===null&&!p.orders.queue.length
    &&(p.tactics?.targetId===undefined||p.tactics.targetId===null)&&!p.tactics?.post&&!p.social?.fight
    &&!p.melee?.order&&!p.melee?.strike&&!p.shooting?.order&&!p.shooting?.stance
    &&!w.pawns.some(q=>q.rescue?.phase==='carry'&&q.rescue.patientId===p.id)
    &&!w.piles.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)&&!(w.packed??[]).some(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id);
}
/** No path search, health evaluation, random draw or repair. Topology and
 * temporary ability are reconciled by runtime, not inferred at admission. */
export function validateAllowedAreas(w:World,version:number):string[] {
  if(!Object.hasOwn(w,'allowedAreas'))return everyHumanPawnOwner(w,p=>!Object.hasOwn(p,'allowedAreaId')&&!Object.hasOwn(p,'allowedAreaReturn')&&validPawnMapAreasRecord(p as unknown as Record<string,unknown>,version,w.nextId)&&validPawnMapAreaBindings(p,w,w.pawns.includes(p)))
    ?[]:['Invalid or future allowed area assignment or return without definitions.'];
  const owners=captureHumanOwners(w),errors:string[]=[];
  if(Object.hasOwn(w,'allowedAreas')){
    if(version<223||!dense(w.allowedAreas)||w.allowedAreas.length<1||w.allowedAreas.length>10||w.allowedAreas.some(a=>!validAllowedAreaRecord(a,w)))return ['Invalid or future allowed area records.'];
    if(new Set(w.allowedAreas.map(a=>a.id)).size!==w.allowedAreas.length)return ['Duplicate allowed area identity.'];
  }
  const areaIds=new Set((w.allowedAreas??[]).map(a=>a.id));
  if(areaIds.size){
    const things=[...w.resources,...w.structures,...w.jobs,...w.piles,...w.stockpiles,...w.growingZones,
      ...(w.wildlife?.animals??[]),...(w.mechanoids??[]),...(w.filth?.items??[]),...(w.fires?.items??[]),...(w.fires?.embers??[]),
      ...(w.projectiles??[]),...(w.bombWaves??[]),...(w.orbital?.ships??[]),...(w.orbital?.pending??[]),...(w.civilianPost?.stock??[]),...(w.packed??[]).map(p=>p.building),
      ...w.structures.flatMap(s=>s.bills??[]),...(w.packed??[]).flatMap(p=>p.building.bills??[])];
    for(const slot of owners.slots){
      if(areaIds.has(slot.id)||slot.pawn?.body?.lostAt!==undefined&&typeof slot.pawn.body.pileId==='number'&&areaIds.has(slot.pawn.body.pileId)||slot.items.some(i=>areaIds.has(i.id))||slot.packed.some(p=>areaIds.has(p.building.id)||p.building.bills?.some(b=>areaIds.has(b.id))))errors.push('Allowed area collides with an original owner or possession.');
    }
    if(things.some(t=>areaIds.has(t.id)))errors.push('Allowed area collides with a map identity.');
  }
  for(const slot of owners.pawnOwners){
    const p=slot.pawn!;
    if(!validAllowedAreaPawnShape(p as unknown as Record<string,unknown>,w,version)||!validPawnMapAreaBindings(p,w,slot.kind==='map')){errors.push('Invalid or future allowed area assignment or return shape.');continue;}
    if(!Object.hasOwn(p,'allowedAreaReturn'))continue;
    const t=p.allowedAreaReturn!,area=w.allowedAreas?.find(a=>a.id===p.allowedAreaId);
    if(slot.kind!=='map'||!area?.cells.length||!returnExclusive(w,p)||!area.cells.includes(t.target.z*w.width+t.target.x)
      ||!Array.isArray(p.path)||(p.path.length?!same(p.path.at(-1)!,t.target):!same(p,t.target)))errors.push('Invalid allowed area return owner, target or route.');
  }
  return errors;
}
export function validAllowedAreaTransport(w:World,version:number):boolean {
  try{return validateAllowedAreas(w,version).length===0;}catch{return false;}
}
