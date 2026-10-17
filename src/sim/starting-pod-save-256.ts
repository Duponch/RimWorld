import {isSchema256Or257} from './schema-compatibility-257.ts';
import {registeredCampaign,registeredMapId} from './world-map-context.ts';
import {plainWorldPawnData256} from './world-pawn-save-256.ts';
import {CORE_STARTING_ARRIVAL_PROFILE_256,type CoreStartingArrival256} from './starting-pod-state-256.ts';
import {CORE_STARTING_SUPPLIES_256} from './starting-scenparts-data-256.ts';
import {validatePawnRecordShape} from './pawn-record-save.ts';
import {validatePawnHealthRecord} from './health-save.ts';
import {validCaravanAnimalRecord256} from './group-animal-record-save-256.ts';
import {validStartingPetHeader256,validateStartingPetLinks256} from './starting-pet-state-256.ts';
import {ITEM_DEFINITIONS} from './items.ts';
import {isApparelItem,newApparelState} from './apparel-rules.ts';
import {isWeaponItem,newWeaponState} from './equipment-rules.ts';
import {setMaterialForbidden256} from './material-permission-256.ts';
import {validStartingApparelColor256} from './starting-apparel-color-256.ts';
import {duckPhysicalOwnerCount256} from './duck-flyer-runtime-256.ts';
import {MAX_WILDLIFE} from './wildlife-state.ts';
import type {World,MaterialPile} from './types.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const keys=(v:object,expected:readonly string[],optional:readonly string[]=[])=>expected.every(k=>Object.hasOwn(v,k))&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&(expected.includes(k)||optional.includes(k)));
function equalData(a:unknown,b:unknown):boolean {
 if(a===b)return true;if(!object(a)||!object(b)||Array.isArray(a)!==Array.isArray(b))return false;
 const aa=Object.keys(a),bb=Object.keys(b);return aa.length===bb.length&&aa.every(k=>Object.hasOwn(b,k)&&equalData(a[k],b[k]));
}
const cell=(c:unknown,w:Pick<World,'width'|'height'>)=>object(c)&&keys(c,['x','z'])&&int(c.x,0,w.width-1)&&int(c.z,0,w.height-1);
/** Header BEFORE any owner/geography hydration. The generic plain-data walk
 * is bounded, descriptor-only and rejects accessors, holes, symbols and NaN. */
export function validCoreStartingArrivalShape256(value:unknown,version:number,w:Pick<World,'tick'|'width'|'height'>):value is CoreStartingArrival256 {
 if(!isSchema256Or257(version)||!int(w.tick)||!int(w.tick*10)||!int(w.width,1)||!int(w.height,1)||!plainWorldPawnData256(value)||!object(value)||value.profile!==CORE_STARTING_ARRIVAL_PROFILE_256||value.start!==0||!int(value.landAt,12,20)||!int(value.openAt,24,32))return false;
 if(value.openAt<value.landAt+11||value.openAt>value.landAt+12)return false;
 const destroyed=value.destroyedPods;
 if(Object.hasOwn(value,'destroyedPods')&&(!Array.isArray(destroyed)||destroyed.length<1||destroyed.length>3))return false;
 const lost:Array<{id:number;humanId:number;animalIds:number[]}>=[],lostIds=new Set<number>();
 for(const p of Array.isArray(destroyed)?destroyed:[]){
  if(!object(p)||!keys(p,['id','cell','atTick','humanId','animalIds'])||!int(p.id,1)||!cell(p.cell,w)||!int(p.atTick,12,w.tick)||!int(p.humanId,1)||!Array.isArray(p.animalIds)||p.animalIds.length>1||!p.animalIds.every(id=>int(id,1)))return false;
  for(const id of [p.id,p.humanId,...p.animalIds]){if(lostIds.has(id))return false;lostIds.add(id);}
  lost.push({id:p.id,humanId:p.humanId,animalIds:p.animalIds});
 }
 if(value.phase==='opened')return keys(value,['profile','phase','start','landAt','openAt','openedAt','cells'],['destroyedPods'])&&int(value.openedAt,lost.length?value.landAt:value.openAt,w.tick)&&Array.isArray(value.cells)&&value.cells.length+lost.length===3&&value.cells.every(c=>cell(c,w))&&(!value.cells.length||Number(value.openedAt)>=24)&&(!Array.isArray(destroyed)||destroyed.every(p=>p.atTick<=Number(value.openedAt)));
 if(!keys(value,['profile','phase','start','landAt','openAt','personalTick','atCore','pods','openedCells'],['destroyedPods'])||!['incoming','landed'].includes(String(value.phase))||value.personalTick!==0||!int(value.atCore)||value.atCore!==w.tick*10||!Array.isArray(value.pods)||value.pods.length<1||value.pods.length>3||!Array.isArray(value.openedCells)||value.pods.length+value.openedCells.length+lost.length!==3||!value.openedCells.every(c=>cell(c,w)))return false;
 for(const pod of value.pods){if(!object(pod)||!keys(pod,['id','skyfallerId','cell','pawn','items','animals','order','phase','fallCore','remainingCore','ageCore','roofHit'],['damage'])||!int(pod.id,1)||!int(pod.skyfallerId,1)||!cell(pod.cell,w)||!object(pod.pawn)||!Array.isArray(pod.items)||!pod.items.every(object)||!Array.isArray(pod.animals)||pod.animals.length>1||!pod.animals.every(object)||!Array.isArray(pod.order)||!int(pod.fallCore,120,200)||!int(pod.remainingCore,0,pod.fallCore)||!int(pod.ageCore,0,111)||typeof pod.roofHit!=='boolean')return false;
  if(Object.hasOwn(pod,'damage')&&(pod.phase!=='landed'||!int(pod.damage,1,499))||[pod.id,pod.skyfallerId,pod.pawn.id,...pod.items.map(p=>p.id),...pod.animals.map(p=>p.id)].some(id=>typeof id==='number'&&lostIds.has(id)))return false;
  if(pod.phase==='incoming'?(pod.ageCore!==0||pod.remainingCore>15&&pod.roofHit!==false||pod.remainingCore===0&&pod.roofHit!==false):(pod.phase!=='landed'||pod.remainingCore!==0||pod.roofHit!==true))return false;
  const elapsed=w.tick*10;
  if(pod.phase==='incoming'){
   // A failed HitRoof deliberately parks remaining0 at the real15Core
   // boundary. Positive remaining never stalls or resets in this runtime.
   if(pod.remainingCore===0?elapsed<pod.fallCore-15:pod.remainingCore!==pod.fallCore-elapsed||pod.roofHit!==(pod.remainingCore<=15))return false;
  }else if(elapsed<pod.fallCore||pod.ageCore>Math.min(111,elapsed-pod.fallCore))return false;
  const refs=new Set<number>();for(const r of pod.order)if(!object(r)||!keys(r,['kind','id'])||!['human','animal','item'].includes(String(r.kind))||!int(r.id,1)||refs.has(r.id))return false;else refs.add(r.id);
 }
 if(value.openAt<value.landAt+11||value.openAt>value.landAt+12||value.openedCells.length>0&&w.tick<24)return false;
 if(value.openedCells.length===0&&!lost.length){const maxFall=Math.max(...value.pods.map(p=>p.fallCore));if(value.landAt!==Math.ceil(maxFall/10)||value.openAt!==Math.ceil((maxFall+111)/10))return false;}
 return value.phase===(value.pods.some(p=>p.phase==='incoming')?'incoming':'landed');
}
/** An exact newborn stack, including its recipe-specific Silver800 and Meal50 quantities.
 * No caller can use this to admit an enlarged ground/inventory stack. */
function validBornSupply(pile:MaterialPile,podId:number,item:typeof CORE_STARTING_SUPPLIES_256[number][0],quantity:number,nextId:number):boolean {
 if(!int(pile.id,1,nextId-1))return false;const definition=ITEM_DEFINITIONS[item];if(!definition)return false;
 const expected:MaterialPile={id:pile.id,item,kind:definition.kind,quantity,owner:{type:'starting-pod',podId},...isApparelItem(item)?{apparel:newApparelState(item)}:isWeaponItem(item)?{weapon:newWeaponState(item)}:{}};
 if(pile.apparel){if(!validStartingApparelColor256(pile.apparel,item,256))return false;if(item==='flak-pants'||item==='flak-vest'){if(!Object.hasOwn(pile.apparel,'birthColor'))return false;expected.apparel!.birthColor=pile.apparel.birthColor;}}
 setMaterialForbidden256(expected,true);return equalData(pile,expected);
}
/** Real original actor/clinical guards at the held clock0. The source recipe
 * controls oversized contents; IDs and owners remain globally registered by
 * the existing arrival namespace callsite after this validation. */
export function validateCoreStartingArrivalOwners256(w:World,a:CoreStartingArrival256):string[] {
 if(!isSchema256Or257(w.schemaVersion)||w.site?.revision!==3||w.planet?.revision!==3||w.climate?.revision!==4||!validCoreStartingArrivalShape256(a,256,w))return ['Invalid Core starting-arrival provenance'];
 return validateCoreStartingArrivalContents256(w,a);
}
/** Worker substep preflight of actual held records; not a RAW header gate. */
export function validateCoreStartingArrivalContents256(w:World,a:CoreStartingArrival256):string[] {
 const root=registeredCampaign(w),mapId=registeredMapId(w),rows=root.worldPawns?.owners;
 if(a.destroyedPods){
  if(!rows||mapId===undefined)return ['Destroyed starting originals lack their true WorldPawns authority'];
  for(const lost of a.destroyedPods){
   if(lost.id>=w.nextId)return ['Destroyed starting pod receipt exceeds the real namespace'];
   for(const [kind,id] of [['human',lost.humanId],...lost.animalIds.map(id=>['animal',id] as const)] as const){
    const matches=rows.filter(r=>r.actor.id===id);
    if(matches.length!==1||matches[0]!.kind!==kind||matches[0]!.destroyed!==true||matches[0]!.mode!=='dead'||matches[0]!.clockCore!==0||matches[0]!.originMapId!==mapId||matches[0]!.actor.state==='dead'||matches[0]!.actor.health?.death)return ['Destroyed starting receipt lost its actual non-clinical original'];
   }
  }
 }
 if(a.phase==='opened')return [];
 if(duckPhysicalOwnerCount256(w)+a.pods.reduce((n,p)=>n+p.animals.length,0)>MAX_WILDLIFE)return ['Actual initial animal owners exceed physical capacity'];
 const errors:string[]=[],ids=new Set<number>(),groups=new Set<number>(),humans=new Map<number,object>();for(const p of a.pods)humans.set(p.pawn.id,p.pawn);for(const p of w.pawns)humans.set(p.id,p);for(const row of w.worldPawns?.owners??[])if(row.kind==='human')humans.set(row.actor.id,row.actor);
 const add=(id:number)=>{if(!int(id,1,w.nextId-1)||ids.has(id))errors.push('Duplicate initial Thing');ids.add(id);};
 for(const pod of a.pods){add(pod.id);add(pod.skyfallerId);add(pod.pawn.id);
  if(pod.pawn.x!==pod.cell.x||pod.pawn.z!==pod.cell.z||pod.pawn.state!=='idle'||pod.pawn.jobId!==null||pod.pawn.path.length||pod.pawn.motion||pod.pawn.orders.active||pod.pawn.orders.queue.length||pod.pawn.haul||pod.pawn.cooking||pod.pawn.need)errors.push('Initial original retained a spawned local action');
  errors.push(...validatePawnRecordShape(pod.pawn as unknown as Record<string,unknown>,w,256,0),...validatePawnHealthRecord(pod.pawn,{schemaVersion:256,tick:0,width:w.width,height:w.height}));
  const humanRefs=pod.order.filter(r=>r.kind==='human');if(humanRefs.length!==1||humanRefs[0]!.id!==pod.pawn.id||pod.order[0]?.kind!=='human')errors.push('Initial human order is not original');
  const loose=pod.items.filter(p=>p.owner.type==='starting-pod'),groupIndex=loose.some(p=>p.item==='silver')?0:loose.some(p=>p.item==='survival-meal')?1:2,group=CORE_STARTING_SUPPLIES_256.filter((_,i)=>i%3===groupIndex);
  if(groups.has(groupIndex))errors.push('Duplicate initial supply group');groups.add(groupIndex);
  if(loose.length!==group.length||loose.some((p,i)=>!validBornSupply(p,pod.id,group[i]![0],group[i]![1],w.nextId)))errors.push('Starting contents do not match the actual ordered recipe');
  if(pod.items.length!==loose.length)errors.push('Initial adapted constructor unexpectedly acquired unrepresented starting possessions');
  const expectedOrder=[{kind:'human',id:pod.pawn.id},...loose.map(p=>({kind:'item',id:p.id})),...pod.animals.map(p=>({kind:'animal',id:p.id}))];
  if(pod.order.length!==expectedOrder.length||pod.order.some((r,i)=>r.kind!==expectedOrder[i]!.kind||r.id!==expectedOrder[i]!.id))errors.push('Mixed contained Thing order is not physical');
  for(const pile of pod.items)add(pile.id);
  if(pod.animals.length!==(groupIndex===1?1:0))errors.push('Initial pet does not belong to its actual round-robin group');
  for(const animal of pod.animals){add(animal.id);if(animal.x!==pod.cell.x||animal.z!==pod.cell.z||!validCaravanAnimalRecord256(animal,{context:w,tick:0,nextId:w.nextId,version:256})||!validStartingPetHeader256(animal,256)||!validateStartingPetLinks256(animal,256,id=>humans.get(id)))errors.push('Invalid actual initial pet');}
 }
 return errors;
}
