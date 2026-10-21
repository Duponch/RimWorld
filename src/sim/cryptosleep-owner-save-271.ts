import {isPlayerCasket271,validCryptosleepField271,type PlayerCasket271} from './cryptosleep-state-271.ts';
import {validAncientCasketWickField256} from './ancient-casket-explosive-state-256.ts';
import {cryptosleepCells271} from './cryptosleep-content-271.ts';
import {terrainSupportsAffordance256} from './natural-terrain-runtime-256.ts';
import {validatePawnRecordShape,validateRetainedPlayerCasketPawnShape271} from './pawn-record-save.ts';
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
import {isColonist} from './affiliation.ts';
import {biologicalYears} from './human-age.ts';
import {isPerishable,ROT_DAYS,ticksUntilRot} from './food-preservation.ts';
import {TICKS_PER_DAY,type MaterialPile,type Pawn,type World} from './types.ts';
import {treePackExpiry271} from './tree-transfer-rules.ts';
import type {MinifiedTreePile} from './tree-transfer-state.ts';
import type {NumericMembershipLookup,NumericMembershipSink} from './numeric-membership.ts';

const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
type Header271=Pick<World,'width'|'height'|'nextId'>&Partial<Pick<World,'worldFactions'>>;
export type RetainedCryptosleepContext271=Pick<World,'schemaVersion'|'tick'|'width'|'height'|'nextId'|'climate'>&Partial<Pick<World,'worldFactions'|'foodPolicies'|'apparelPolicies'|'research'>>;

/** Fixed paid definition. A player casket has no minified, quality, electrical,
 * fuel or production state. The holder's descriptor-first guard runs first. */
export function validCryptosleepBuilding271(raw:unknown,version:number,world:Header271,tick=Number.MAX_SAFE_INTEGER):boolean {
 if(!object(raw))return false;
 const kind=Object.getOwnPropertyDescriptor(raw,'kind');
 if(!kind||!Object.hasOwn(kind,'value')||!kind.enumerable)return false;
 if(kind.value!=='cryptosleep-casket')return validCryptosleepField271(raw,version,tick);
 if(!validCryptosleepField271(raw,version,tick))return false;
 const allowed=['id','kind','x','z','orientation','footprint','material','damage','factionId','cryptosleep','casketWick'];
 if(Reflect.ownKeys(raw).some(k=>{const d=Object.getOwnPropertyDescriptor(raw,k);return typeof k!=='string'||!allowed.includes(k)||!d?.enumerable||!Object.hasOwn(d,'value');}))return false;
 const s=raw as unknown as PlayerCasket271;
 return version===271&&integer(s.id,1,world.nextId-1)&&integer(s.x,0,world.width-1)&&integer(s.z,0,world.height-1)
  &&integer(s.orientation,0,3)&&s.footprint==='standard'&&s.material==='steel'
  &&(!Object.hasOwn(s,'damage')||integer(s.damage,1,249))
  &&(!Object.hasOwn(s,'factionId')||s.factionId===null||integer(s.factionId,1,world.nextId-1)&&s.factionId===world.worldFactions?.playerFactionId)
  &&validAncientCasketWickField256(raw,version,tick)
  &&(!s.casketWick?.instigatorKey||integer(Number(s.casketWick.instigatorKey.slice(s.casketWick.instigatorKey.indexOf(':')+1)),1,world.nextId-1))
  &&cryptosleepCells271(s,s.orientation).every(c=>integer(c.x,0,world.width-1)&&integer(c.z,0,world.height-1));
}

/** Only owned original Things are enumerated. References (including the bed)
 * retain their identity but never register a second owner. Tree originals are
 * registered by the common tree registrar from the human-owner capture. */
function* containedIds271(c:PlayerCasket271):Generator<number> {
 const h=c.cryptosleep;if(h.human)yield h.human.id;
 for(const pile of h.items)yield pile.id;
 for(const pack of h.packed){yield pack.building.id;for(const bill of pack.building.bills??[])yield bill.id;for(const id of pack.building.shelf?.cells??[])yield id;}
}

const activityKeys271=['cryptosleepTask','openCasket','brewing','orbitalTrade','deepWork','animalHandling','animalCare','animalFeed','burial','cleaning','trade','firefighting','ward','heatRefuge','research','tend','feed','medicalSleep','equipmentTask','rescue','animalRescue','surgery','hunting','transitExit','priorityWork','allowedAreaReturn','interruptedCargo','draft','shooting','melee','flee','bombRefuge','burning'] as const;
function inactiveHuman271(p:Pawn):boolean {
 return (p.state==='idle'||p.state==='downed')&&p.jobId===null&&p.haul===null&&p.cooking===null&&p.need===null
  &&p.path.length===0&&!p.motion&&p.moveCooldown===0&&p.orders.active===null&&p.orders.queue.length===0&&p.recreation.task===null
  &&!p.collapsePending&&!p.social?.fight&&!p.mental?.crisis&&activityKeys271.every(k=>!Object.hasOwn(p,k));
}
function validHeldRot271(p:MaterialPile,tick:number):boolean {
 if(p.kind==='corpse')return true; // The shared corpse guard owns this clock.
 if(!isPerishable(p.item))return !Object.hasOwn(p,'rot');
 const r=p.rot;if(!object(r))return false;
 return Object.keys(r).every(k=>['progress','atTick','rate'].includes(k))&&Object.hasOwn(r,'progress')&&Object.hasOwn(r,'atTick')
  &&integer(r.atTick,0,tick)&&typeof r.progress==='number'&&Number.isFinite(r.progress)&&r.progress>=0&&r.progress<ROT_DAYS[p.item]*TICKS_PER_DAY
  &&(!Object.hasOwn(r,'rate')||typeof r.rate==='number'&&Number.isFinite(r.rate)&&r.rate>=0&&r.rate<1)&&ticksUntilRot(p,tick)>0;
}

/** Personal contents use their actual physiological frontier and the actual
 * civil bound for external memories. The scalar retained form grants no map,
 * area, route, bed or local activity authority. */
function validateCryptosleepContents271(s:PlayerCasket271,context:RetainedCryptosleepContext271,humanIds:ReadonlySet<number>,local?:World):string[] {
 const errors:string[]=[],h=s.cryptosleep,p=h.human,version=context.schemaVersion;
 if(!p)return errors;
 if(!isColonist(p)||p.prisoner||p.visitor||p.raid||p.podRescue||p.age&&biologicalYears(p.age)<18||p.state==='dead'||p.health?.death)errors.push('Player casket requires one original living adult free colonist.');
 if(p.cryptosleepHeldAt271!==h.heldAt)errors.push('Player-casket human suspension marker differs from its actual holder.');
 if(!inactiveHuman271(p))errors.push('Player-casket human retains an active task, route or work cargo.');
 if(p.health&&medicalCivilTick271(p.health)!==h.heldAt)errors.push('Player-casket human civil clinical frontier differs from its holder.');
 errors.push(...(local?validatePawnRecordShape(p as unknown as Record<string,unknown>,local,version,h.heldAt,{casketId:s.id,heldAt:h.heldAt}):validateRetainedPlayerCasketPawnShape271(p as unknown as Record<string,unknown>,context,version,h.heldAt,{casketId:s.id,heldAt:h.heldAt})));
 if(!local&&(p.bedId!==null||Object.hasOwn(p,'bedSlot')||Object.hasOwn(p,'mapBed')||Object.hasOwn(p,'allowedAreaId')||Object.hasOwn(p,'allowedAreaReturn')))errors.push('Removed-map player-casket human retains local bed or area authority.');
 errors.push(...validatePawnHealthRecord(p,{tick:h.heldAt,width:context.width,height:context.height,schemaVersion:version},true));
 if(p.filthFeet!==undefined&&!validFilthFeet(p.filthFeet,version))errors.push('Invalid held human filth tracker.');
 if(!validSchedule(p.schedule)||!integer(p.restZeroTicks,0,4500)||typeof p.collapsePending!=='boolean')errors.push('Invalid held human schedule or exhaustion.');
 errors.push(...validateRecreationRecordShape(p as unknown as Record<string,unknown>,version,h.heldAt),...validateHumanSocial(p,version,h.heldAt,humanIds,[],context.tick));
 if(context.foodPolicies&&!context.foodPolicies.some(x=>x.id===p.foodPolicyId)||context.apparelPolicies&&!context.apparelPolicies.some(x=>x.id===p.apparelPolicyId))errors.push('Held human lost an actual personal policy.');
 for(const pile of h.items){
  errors.push(...validatePileRecordShape(pile as unknown as Record<string,unknown>,context,version,h.heldAt));
  // Retained holders have their own scalar context and never enter a local
  // map's tree domain. Preserve that domain's same actual expiry frontier.
  if(!local&&pile.innerResource&&pile.plantPack&&h.heldAt>=treePackExpiry271(pile as MinifiedTreePile)&&!pile.plantPack.pendingExpiry)errors.push('Retained player-casket tree passed its actual personal expiry frontier.');
  if(!object(pile.owner)||!['inventory','equipment','apparel'].includes(pile.owner.type)||!('pawnId'in pile.owner)||pile.owner.pawnId!==p.id)errors.push('Player-casket possession lost its original personal owner.');
  if(!validHeldRot271(pile,h.heldAt))errors.push('Invalid held personal food age.');
 }
 errors.push(...validateEquipmentOwners259([p],h.items),...validateApparelOwners259([p],h.items,version));
 errors.push(...validatePackedFurnitureRecords(h.packed,{width:context.width,height:context.height,nextId:context.nextId,tick:h.heldAt},version,new Set(),false),...validateGroupPackedComponents258(context,h.packed,version,h.heldAt));
 for(const pack of h.packed)if(pack.owner.type!=='inventory'||pack.owner.pawnId!==p.id)errors.push('Player-casket furniture lost its original personal inventory owner.');
 return errors;
}

/** Called only with the real retained holder and its removal receipt context.
 * Geometry/support is validated on the source map before removal; no grid is
 * constructed to revalidate an archived physical original. */
export function validateRetainedCryptosleepOwner271(casket:PlayerCasket271,context:RetainedCryptosleepContext271,knownHumanIds:ReadonlySet<number>,physicalTick=context.tick):string[] {
 try {
  if(!validCryptosleepBuilding271(casket,context.schemaVersion,context,physicalTick)||!casket.cryptosleep.human)return ['Invalid retained player-casket original.'];
  return validateCryptosleepContents271(casket,context,knownHumanIds);
 }catch{return ['Malformed retained player-casket personal contents.'];}
}

/** Validate original local owners on their actual map. In particular the
 * native persistent bed claim is retained; no detached/fabricated World is
 * used to make local bed, policy or foreign-key checks pass. */
export function validateCryptosleepOwners271(w:World,version:number=w.schemaVersion,existingIds?:NumericMembershipLookup):string[] {
 const errors:string[]=[],heldIds=new Set<number>();let humanIds:ReadonlySet<number>|undefined;
 try {
  const candidates=w.structures.filter(s=>isPlayerCasket271(s)||Object.hasOwn(s,'cryptosleep'));
  for(const pack of w.packed)if(isPlayerCasket271(pack.building)||Object.hasOwn(pack.building,'cryptosleep'))errors.push('A player cryptosleep casket is not minifiable.');
  if(!candidates.length)return errors;
  // RAW/MAIN registrars already captured every ordinary Thing identity. Use
  // that real membership instead of walking the entire geographic flora a
  // second time for one frozen occupant. Direct callers remain autonomous.
  const collectedIds=existingIds?undefined:new Set<number>(),localIds=existingIds??collectedIds!;
  let identitiesLoaded=existingIds!==undefined;
  const add=(id:number)=>{if(!integer(id,1,w.nextId-1)||heldIds.has(id)||localIds.has(id))errors.push('Duplicate or invalid player-casket original Thing identity.');heldIds.add(id);};
  for(const s of candidates){
   if(!validCryptosleepBuilding271(s,version,w,w.tick)){errors.push('Invalid player-casket physical header or holder.');continue;}
   if(!isPlayerCasket271(s))continue;
   if(cryptosleepCells271(s,s.orientation).some(c=>{const t=w.tiles[c.z*w.width+c.x];return !t||['rock','water'].includes(t.terrain)||!terrainSupportsAffordance256(t,'Medium',w);}))errors.push('Player casket lacks actual Medium support.');
   const h=s.cryptosleep,p=h.human;
   if(!p)continue; // The field guard requires both possession lists empty.
   if(!identitiesLoaded){for(const list of [w.pawns,w.piles,w.packed.map(p=>p.building),w.structures,w.resources,w.jobs,w.stockpiles])for(const t of list)collectedIds!.add(t.id);identitiesLoaded=true;}
   humanIds??=new Set(captureHumanOwners(w).people.keys());
   errors.push(...validateCryptosleepContents271(s,w,humanIds,w));
   for(const pile of h.items){
    // Inner tree IDs remain occurrences, independently of the wrapper ID.
    if(pile.innerResource)add(pile.innerResource.id);
   }
   for(const id of containedIds271(s))add(id);
  }
 }catch {errors.push('Malformed original player-casket owner or possession record.');}
 return errors;
}

/** The structure ID has already been registered by the map pass. Do not
 * deduplicate this occurrence stream: repeated originals are save errors. */
export function registerCryptosleepThingIds271(w:World,ids:NumericMembershipSink):string[] {
 const errors=validateCryptosleepOwners271(w,w.schemaVersion,ids);if(errors.length)return errors;
 for(const c of w.structures.filter(isPlayerCasket271))for(const id of containedIds271(c)){
  if(!integer(id,1,w.nextId-1)||ids.has(id))errors.push('Duplicate or invalid player-casket owned Thing ID.');else ids.add(id);
 }
 return errors;
}
