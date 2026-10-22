import {hasCoupleFields285} from './couple-owner-save-285.ts';
import {validCouplePawnContext285} from './couple-save-285.ts';
import {isSchema277OrLater} from './schema-compatibility-257.ts';
import {isShipCasket277,validShipCasketField277,type ShipCasket277} from './ship-casket-state-277.ts';
import {SHIP_CASKET_CONTENT_277} from './ship-casket-content-277.ts';
import {shipCasketCells277} from './ship-casket-geometry-277.ts';
import {validAncientCasketWickField256} from './ancient-casket-explosive-state-256.ts';
import {shipCasketActor277,type ShipCasketOccupant277} from './ship-casket-state-277.ts';
import {validateShipCasketPawnShape277,validateRetainedShipCasketPawnShape277} from './pawn-record-save.ts';
import {validatePawnHealthRecord} from './health-save.ts';
import {medicalCivilTick271} from './suspended-human-clock-271.ts';
import {validatePileRecordShape} from './material-record-save.ts';
import {validateEquipmentOwners259} from './equipment-save.ts';
import {validateApparelOwners259} from './apparel-save.ts';
import {validatePackedFurnitureRecords} from './furniture-transfer-save.ts';
import {validateGroupPackedComponents258} from './group-packed-components-258.ts';
import {validFilthFeet} from './filth-save.ts';
import {validateRecreationRecordShape} from './recreation-save.ts';
import {validateHumanSocial} from './social-save.ts';
import {captureHumanOwners} from './human-owners.ts';
import {validSchedule} from './schedule.ts';
import {validCaravanAnimalRecord256} from './group-animal-record-save-256.ts';
import {validMechanoidShape} from './mechanoid-save.ts';
import {validMechanicalWorldFaction259} from './mechanoid-world-faction-259.ts';
import {medicalStatus} from './injury-state.ts';
import {isPerishable,ROT_DAYS,ticksUntilRot} from './food-preservation.ts';
import {treePackExpiry271} from './tree-transfer-rules.ts';
import type {MinifiedTreePile} from './tree-transfer-state.ts';
import {TICKS_PER_DAY,type World,type Pawn,type MaterialPile} from './types.ts';
import type {NumericMembershipLookup,NumericMembershipSink} from './numeric-membership.ts';

const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const data=(v:object,k:PropertyKey)=>{const d=Object.getOwnPropertyDescriptor(v,k);return d?.enumerable&&Object.hasOwn(d,'value')?d:undefined;};
type ShipCasketHeader277=Pick<World,'width'|'height'|'nextId'>&Partial<Pick<World,'worldFactions'>>;
/** No ongoing beam/support/roof requirement is invented for an existing
 * original. Physical admission at construction is a separate authority. */
export function validShipCasketBuilding277(raw:unknown,version:number,w:ShipCasketHeader277,tick=Number.MAX_SAFE_INTEGER):boolean {
 if(!plain(raw)||!validShipCasketField277(raw,version,tick))return false;
 if(!isShipCasket277(raw))return true;
 if(!isSchema277OrLater(version))return false;
 const allowed=['id','kind','x','z','orientation','footprint','material','power','damage','factionId','shipCryptosleep277','casketWick'];
 if(Reflect.ownKeys(raw).some(k=>typeof k!=='string'||!allowed.includes(k)||!data(raw,k))
  ||!['id','kind','x','z','orientation','footprint','material','power','shipCryptosleep277'].every(k=>data(raw,k)))return false;
 const c=raw as unknown as ShipCasket277,p=c.power;
 return integer(c.id,1,w.nextId-1)&&integer(c.x,0,w.width-1)&&integer(c.z,0,w.height-1)&&integer(c.orientation,0,3)&&c.footprint==='standard'&&c.material==='steel'
  &&(!Object.hasOwn(c,'damage')||integer(c.damage,1,SHIP_CASKET_CONTENT_277.maxHitPoints-1))
  &&(!Object.hasOwn(c,'factionId')||c.factionId===null||integer(c.factionId,1,w.nextId-1)&&c.factionId===w.worldFactions?.playerFactionId)
  &&plain(p)&&Reflect.ownKeys(p).length===2&&!!data(p,'on')&&!!data(p,'parentId')&&p.on===false&&p.parentId===null
  &&validAncientCasketWickField256(raw,version,tick)
  &&(!c.casketWick?.instigatorKey||integer(Number(c.casketWick.instigatorKey.slice(c.casketWick.instigatorKey.indexOf(':')+1)),1,w.nextId-1))
  &&shipCasketCells277(c,c.orientation).every(cell=>integer(cell.x,0,w.width-1)&&integer(cell.z,0,w.height-1));
}

export type RetainedShipCasketContext277=Pick<World,'schemaVersion'|'tick'|'width'|'height'|'nextId'|'climate'>&Partial<Pick<World,'worldFactions'|'foodPolicies'|'apparelPolicies'|'research'>>;
const activeHuman277=['shipCasketTask277','cryptosleepTask','openCasket','brewing','orbitalTrade','deepWork','animalHandling','animalCare','animalFeed','burial','cleaning','trade','firefighting','ward','heatRefuge','research','tend','feed','medicalSleep','equipmentTask','rescue','animalRescue','surgery','hunting','transitExit','priorityWork','allowedAreaReturn','interruptedCargo','draft','flee','bombRefuge','burning','tactics'] as const;
function inactiveHuman277(p:Pawn):boolean {
 return ['idle','downed'].includes(p.state)&&p.jobId===null&&p.haul===null&&p.cooking===null&&p.need===null&&!p.motion&&!p.path.length&&p.moveCooldown===0&&p.orders.active===null&&!p.orders.queue.length&&p.recreation.task===null
  &&!p.collapsePending&&!p.restZeroTicks&&!p.social?.fight&&!p.mental?.crisis&&!p.melee?.order&&!p.shooting?.order&&activeHuman277.every(k=>!Object.hasOwn(p,k))
  &&(!p.visitor||p.visitor.goal===null)&&(!p.raid||p.raid.goal===null);
}
function validHeldRot277(p:MaterialPile,tick:number):boolean {
 if(p.kind==='corpse')return true;if(!isPerishable(p.item))return !Object.hasOwn(p,'rot');const r=p.rot;
 return plain(r)&&Object.keys(r).every(k=>['progress','atTick','rate'].includes(k))&&integer(r.atTick,0,tick)&&typeof r.progress==='number'&&Number.isFinite(r.progress)&&r.progress>=0&&r.progress<ROT_DAYS[p.item]*TICKS_PER_DAY
  &&(!Object.hasOwn(r,'rate')||typeof r.rate==='number'&&Number.isFinite(r.rate)&&r.rate>=0&&r.rate<1)&&ticksUntilRot(p,tick)>0;
}
/** Occurrences, never deduplicated. Inner tree originals belong to the common
 * local tree registrar; a retained holder's own registrar includes them. */
export function* shipCasketThingIds277(c:ShipCasket277,innerTrees=false):Generator<number> {
 const h=c.shipCryptosleep277,a=shipCasketActor277(h);if(a)yield a.id;
 for(const pile of h.items){yield pile.id;if(innerTrees&&pile.innerResource)yield pile.innerResource.id;}
 for(const p of h.packed){yield p.building.id;for(const bill of p.building.bills??[])yield bill.id;for(const id of p.building.shelf?.cells??[])yield id;}
}
function validateContents277(c:ShipCasket277,context:RetainedShipCasketContext277,humans:ReadonlySet<number>,local?:World):string[] {
 const errors:string[]=[],h=c.shipCryptosleep277,o=h.occupant;if(!o)return errors;const a=shipCasketActor277(h)!,held=h.heldAt,version=context.schemaVersion;
 if(a.shipCryptosleepHeldAt277!==held||a.state==='dead'||a.health?.death)errors.push('Spatial casket requires its one original living occupant and actual suspension frontier.');
 if(o.kind!=='mechanical'&&a.health&&medicalCivilTick271(a.health)!==held)errors.push('Spatial casket biological clinical frontier differs from its holder.');
 if(o.kind==='human'){
  if(local&&hasCoupleFields285(o.pawn)&&!validCouplePawnContext285(o.pawn,{version,tick:held,civilTick:context.tick,nextId:context.nextId,knownHumanIds:humans}))errors.push('Invalid held spatial-casket couple clock or memory.');
  const p=o.pawn;if(!inactiveHuman277(p)||Object.hasOwn(p,'cryptosleepHeldAt271'))errors.push('Spatial-casket human retains an active job or another holder marker.');
  errors.push(...(local?validateShipCasketPawnShape277(p as unknown as Record<string,unknown>,local,version,held,c.id):validateRetainedShipCasketPawnShape277(p as unknown as Record<string,unknown>,context,version,held,c.id)),
   ...validatePawnHealthRecord(p,{tick:held,width:context.width,height:context.height,schemaVersion:version},true),...validateRecreationRecordShape(p as unknown as Record<string,unknown>,version,held),...validateHumanSocial(p,version,held,humans,[],context.tick));
  if(!validSchedule(p.schedule)||!integer(p.restZeroTicks,0,4500)||typeof p.collapsePending!=='boolean')errors.push('Invalid held human schedule/exhaustion.');
  if(context.foodPolicies&&!context.foodPolicies.some(x=>x.id===p.foodPolicyId)||p.apparelPolicyId!==undefined&&context.apparelPolicies&&!context.apparelPolicies.some(x=>x.id===p.apparelPolicyId))errors.push('Held human lost an actual personal policy.');
  if(!local&&(p.bedId!==null||Object.hasOwn(p,'bedSlot')||Object.hasOwn(p,'mapBed')||Object.hasOwn(p,'allowedAreaId')||Object.hasOwn(p,'allowedAreaReturn')))errors.push('Removed spatial-casket human retains local bed/area authority.');
 }else if(o.kind==='animal'){
  if(!validCaravanAnimalRecord256(o.animal,{context,tick:held,nextId:context.nextId,version,heldShipCasket277:{heldAt:held,...local?{structures:local.structures}:{}}})||!o.animal.health)errors.push('Invalid actual spatial-casket animal record/clock.');
 }else {
  const m=o.mech,status=m.health?medicalStatus(m.health):'mobile';
  if(!validMechanoidShape(m,version,held,held)||!validMechanicalWorldFaction259(m,version,context.worldFactions)||m.id>=context.nextId||m.x>=context.width||m.z>=context.height||m.path.length||m.motion||m.moveCooldown||m.melee?.order||m.ranged?.order||m.raid?.goal||m.temple?.goal||m.site263?.goal||(status==='mobile'?['dead','downed'].includes(m.state):m.state!==status))errors.push('Invalid actual spatial-casket mechanical record/clock.');
  if(h.items.length||h.packed.length)errors.push('Current mechanical owner cannot possess cargo.');
 }
 if(a.filthFeet!==undefined&&!validFilthFeet(a.filthFeet,version))errors.push('Invalid held occupant carried filth.');
 for(const pile of h.items){
  errors.push(...validatePileRecordShape(pile as unknown as Record<string,unknown>,context,version,held));
  if(!plain(pile.owner)||!('pawnId'in pile.owner)||pile.owner.pawnId!==a.id||!(o.kind==='human'?['inventory','equipment','apparel']:['inventory']).includes(pile.owner.type))errors.push('Spatial-casket possession lost its actual personal owner.');
  if(!validHeldRot277(pile,held))errors.push('Invalid held personal food age.');
  if(pile.innerResource&&pile.plantPack&&held>=treePackExpiry271(pile as MinifiedTreePile)&&!pile.plantPack.pendingExpiry)errors.push('Held tree passed its actual personal expiry frontier.');
 }
 if(o.kind==='human')errors.push(...validateEquipmentOwners259([o.pawn],h.items),...validateApparelOwners259([o.pawn],h.items,version));
 errors.push(...validatePackedFurnitureRecords(h.packed,{width:context.width,height:context.height,nextId:context.nextId,tick:held},version,new Set(),false),...validateGroupPackedComponents258(context,h.packed,version,held));
 for(const p of h.packed)if(p.owner.type!=='inventory'||p.owner.pawnId!==a.id)errors.push('Spatial-casket furniture lost its original personal inventory owner.');
 return errors;
}
export function validateRetainedShipCasketOwner277(c:ShipCasket277,context:RetainedShipCasketContext277,humans:ReadonlySet<number>,physicalTick=context.tick):string[] {
 try{return !validShipCasketBuilding277(c,context.schemaVersion,context,physicalTick)||!c.shipCryptosleep277.occupant?['Invalid retained actual spatial casket.']:validateContents277(c,context,humans);}catch{return ['Malformed retained spatial-casket contents.'];}
}
export function validateShipCasketOwners277(w:World,version:number=w.schemaVersion,membership?:NumericMembershipLookup):string[] {
 const errors:string[]=[];
 try{
  const candidates=w.structures.filter(s=>isShipCasket277(s)||Object.hasOwn(s,'shipCryptosleep277'));
  if(w.packed.some(p=>isShipCasket277(p.building)||Object.hasOwn(p.building,'shipCryptosleep277')))errors.push('Spatial casket is not minifiable.');
  if(!candidates.length)return errors;
  let humans:ReadonlySet<number>|undefined,local=membership;const heldIds=new Set<number>();
  for(const s of candidates){
   if(!validShipCasketBuilding277(s,version,w,w.tick)){errors.push('Invalid spatial-casket physical header or holder.');continue;}if(!isShipCasket277(s)||!s.shipCryptosleep277.occupant)continue;
   local??=new Set([...w.pawns,...w.wildlife?.animals??[],...w.mechanoids??[],...w.piles,...w.structures,...w.resources,...w.jobs,...w.stockpiles,...w.packed.map(p=>p.building)].map(t=>t.id));humans??=new Set(captureHumanOwners(w).people.keys());
   const actor=shipCasketActor277(s.shipCryptosleep277)!;if(w.piles.some(p=>'pawnId'in p.owner&&p.owner.pawnId===actor.id)||w.packed.some(p=>p.owner.type!=='ground'&&p.owner.pawnId===actor.id))errors.push('Held occupant has personal goods outside its actual holder.');
   errors.push(...validateContents277(s,w,humans,w));
   for(const id of shipCasketThingIds277(s,true)){if(!integer(id,1,w.nextId-1)||heldIds.has(id)||local.has(id))errors.push('Duplicate or invalid spatial-casket original Thing identity.');heldIds.add(id);}
  }
 }catch{errors.push('Malformed original spatial-casket owner or possessions.');}return errors;
}
export function registerShipCasketThingIds277(w:World,ids:NumericMembershipSink):string[] {
 const errors=validateShipCasketOwners277(w,w.schemaVersion,ids);if(errors.length)return errors;
 for(const c of w.structures.filter(isShipCasket277))for(const id of shipCasketThingIds277(c))if(!integer(id,1,w.nextId-1)||ids.has(id))errors.push('Duplicate or invalid spatial-casket owned Thing ID.');else ids.add(id);
 return errors;
}
