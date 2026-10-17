import {validateGroupPackedComponents258} from './group-packed-components-258.ts';
import {pileMaxHp} from './thing-damage-rules.ts';
import {isPerishable,ROT_DAYS,ticksUntilRot} from './food-preservation.ts';
import {TICKS_PER_DAY} from './types.ts';
import {isMinifiedTree} from './tree-transfer-state.ts';
import {planetTile} from './planet-geography-256.ts';
import type {World} from './types.ts';
import type {AwayGroup,PreparingGroup} from './group-capture.ts';
import type {GroupMemberOrigin} from './group-reorganization-state.ts';
import {validGroupMemberOrigin} from './group-reorganization-save.ts';
import {validCaravanAnimalRecord256} from './group-animal-record-save-256.ts';
import {validCaravanBedrollPacks256} from './group-bedroll-capture-256.ts';
import {validatePileRecordShape} from './material-record-save.ts';
import {registeredCampaign} from './world-map-context.ts';
import {groupMemberOriginAuthority} from './group-member-origin.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const keys=(v:Record<string,unknown>,required:string[],optional:string[]=[])=>required.every(k=>Object.hasOwn(v,k))&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&(required.includes(k)||optional.includes(k)));
const dense=(v:unknown,max:number):v is unknown[]=>Array.isArray(v)&&Object.getPrototypeOf(v)===Array.prototype&&v.length<=max&&Reflect.ownKeys(v).length===v.length+1&&Array.from({length:v.length},(_,i)=>Object.hasOwn(v,i)&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,String(i))!,'value')).every(Boolean);
export function validGroupAnimalPreparation256(g:PreparingGroup,w:World,version:number,referencesOnly=false):boolean {
 const d=Object.getOwnPropertyDescriptor(g,'animalPreparation');if(!d)return true;if(version<256||!Object.hasOwn(d,'value')||!d.enumerable||g.travelPreparation!==true||!object(d.value)||!keys(d.value,['revision','lines'])||d.value.revision!==1||!dense(d.value.lines,w.nextId-1)||!d.value.lines.length)return false;
 const animals=new Set<number>(),carriers=new Set<number>();for(const line of d.value.lines){if(!object(line)||!keys(line,['animalId','handlerId','mode','gathered'])||!integer(line.animalId,1,w.nextId-1)||animals.has(line.animalId)||g.memberIds.includes(line.animalId)||!g.memberIds.includes(line.handlerId as number)||!['lead','carry'].includes(String(line.mode))||typeof line.gathered!=='boolean')return false;
  animals.add(line.animalId);if(line.mode==='carry'){if(carriers.has(line.handlerId as number))return false;carriers.add(line.handlerId as number);}
  if(!referencesOnly&&!w.wildlife?.animals.some(a=>a.id===line.animalId&&a.domestic&&a.state!=='dead'))return false;
 }
 return true;
}
export function validGroupAnimalOwners256(g:AwayGroup,w:World,version:number,authority:(origin:GroupMemberOrigin)=>boolean):boolean {
 const d=Object.getOwnPropertyDescriptor(g,'animalOwners');if(!d)return true;if(version<256||!Object.hasOwn(d,'value')||!d.enumerable||!g.reorganization||!object(d.value))return false;const own=d.value;
 if(!keys(own,['revision','members','origins','order'],['interval'])||own.revision!==1||!dense(own.members,w.nextId-1)||!dense(own.origins,own.members.length)||own.origins.length!==own.members.length||!dense(own.order,w.nextId-1))return false;
 const ids=new Set(g.members.map(p=>p.id));for(const a of own.members){if(!object(a)||!integer(a.id,1,w.nextId-1)||ids.has(a.id)||a.state==='dead'||a.manhunter!==undefined)return false;const origin=own.origins.find(o=>object(o)&&o.pawnId===a.id);
  if(!validGroupMemberOrigin(origin,a.id,w.nextId,authority,version)||!validCaravanAnimalRecord256(a,{context:origin.context,tick:w.tick,nextId:w.nextId,version}))return false;ids.add(a.id);
 }
 if(own.order.length!==ids.size||new Set(own.order).size!==ids.size||own.order.some(id=>!integer(id,1,w.nextId-1)||!ids.has(id)))return false;
 if(g.travel)return !Object.hasOwn(own,'interval');const i=own.interval;return object(i)&&keys(i,['revision','startedAt','atCore','tickDelta'])&&i.revision===1&&integer(i.startedAt,g.departedAt,w.tick)&&i.atCore===w.tick*10&&integer(i.tickDelta,0,15);
}
/** One real terminal animal and its possessions, checked only against the
 * scalar original header. No local map, clock advance or owner is fabricated. */
export function validGroupAnimalLossRecord256(loss:unknown,w:Pick<World,'tick'|'nextId'|'planet'>,version:number,authority:(origin:GroupMemberOrigin)=>boolean):loss is import('./group-animal-state-256.ts').GroupAnimalLoss256 {
 if(version<256||!object(loss)||!keys(loss,['reason','groupId','tile','tick','animal','origin','items'],['packed'])||!['death','caravan-lost'].includes(String(loss.reason))||!integer(loss.groupId,1,(w.planet?.nextGroupId??1)-1)||!integer(loss.tile)||!w.planet||!planetTile(w.planet,loss.tile)||!integer(loss.tick,0,w.tick)||!object(loss.animal)||!integer(loss.animal.id,1,w.nextId-1)||!validGroupMemberOrigin(loss.origin,loss.animal.id,w.nextId,authority,version))return false;
 const origin=loss.origin,a=loss.animal,animalId=loss.animal.id;
 if(!integer(animalId,1,w.nextId-1))return false;
 if(!validCaravanAnimalRecord256(a,{context:origin.context,tick:loss.tick,nextId:w.nextId,version})||loss.reason==='death'&&(a.state!=='dead'||!object(a.health)||!object(a.health.death)||a.health.death.tick!==loss.tick)||loss.reason==='caravan-lost'&&a.state==='dead')return false;
 const ids=new Set<number>([animalId]);if(!dense(loss.items,w.nextId-1))return false;
 // Items belong to this animal's original200/250/etc header, never the active
 // map's dimensions or climate. This is also the RAW path.
 const personal={...origin.context,tick:loss.tick,nextId:w.nextId};
 for(const p of loss.items){if(!object(p)||!keys(p,['id','kind','item','quantity','owner'],['foodPoison','damage','apparel','weapon','rot','innerResource','plantPack','egg','eggForbidden','forbidden'])||!object(p.owner)||p.owner.type!=='inventory'||p.owner.pawnId!==animalId||!integer(p.id,1,w.nextId-1)||ids.has(p.id)||validatePileRecordShape(p,personal,version,loss.tick).length)return false;
  const pile=p as unknown as import('./types.ts').MaterialPile;
  if(p.damage!==undefined&&(pile.apparel||pile.weapon||!integer(p.damage,1,pileMaxHp(pile,version)-1)))return false;
  if(isPerishable(pile.item)){
   const rot=p.rot;if(!object(rot)||!keys(rot,['progress','atTick'],['rate'])||!integer(rot.atTick,0,loss.tick)||typeof rot.progress!=='number'||!Number.isFinite(rot.progress)||rot.progress<0||rot.progress>=ROT_DAYS[pile.item]*TICKS_PER_DAY||rot.rate!==undefined&&(typeof rot.rate!=='number'||!Number.isFinite(rot.rate)||rot.rate<0||rot.rate>=1)||ticksUntilRot(pile,loss.tick)<=0)return false;
  }else if(p.rot!==undefined)return false;
  ids.add(p.id);if(p.item==='minified-tree'){if(!object(p.innerResource)||!integer(p.innerResource.id,1,w.nextId-1)||ids.has(p.innerResource.id))return false;ids.add(p.innerResource.id);}}
 if(!validCaravanBedrollPacks256(loss.packed,[a as unknown as import('./wildlife-state.ts').WildAnimal],w.nextId,version,Number(loss.tick)))return false;
 for(const p of loss.packed??[]){if(ids.has(p.building.id))return false;ids.add(p.building.id);}return true;
}
/** Shared Thing namespace for actual terminal records; references never enter. */
export function registerGroupAnimalLossRows256(losses:readonly import('./group-animal-state-256.ts').GroupAnimalLoss256[],nextId:number,ids:import('./numeric-membership.ts').NumericMembershipSink):string[] {
 const errors:string[]=[],add=(id:number)=>{if(!integer(id,1,nextId-1)||ids.has(id))errors.push('Duplicate or invalid animal terminal Thing owner.');else ids.add(id);};
 for(const loss of losses){add(loss.animal.id);for(const p of loss.items){add(p.id);if(isMinifiedTree(p)){if(!p.innerResource)errors.push('Missing animal-contained tree original.');else add(p.innerResource.id);}}for(const p of loss.packed??[]){add(p.building.id);for(const b of p.building.bills??[])add(b.id);for(const id of p.building.shelf?.cells??[])add(id);}}return errors;
}
/** Invoke ONCE on the campaign, not once per local map/projection. */
export function validateGroupAnimalLosses256(w:World,version:number):string[] {
 const root=registeredCampaign(w),registry=root.worldGroups;if(!registry)return [];const d=Object.getOwnPropertyDescriptor(registry,'animalLosses');if(!d)return [];
 if(version<256||!Object.hasOwn(d,'value')||d.enumerable!==true||!dense(d.value,root.nextId-1))return ['Invalid or future animal terminal owners.'];
 const ids=new Set<number>();
 for(const loss of d.value){
  if(!validGroupAnimalLossRecord256(loss,root,version,o=>groupMemberOriginAuthority(w,o)))return ['Invalid animal terminal identity, personal record or provenance.'];
  if(validateGroupPackedComponents258(w,loss.packed??[],version,loss.tick).length)return ['Invalid animal terminal packed components.'];
  if(registerGroupAnimalLossRows256([loss],root.nextId,ids).length)return ['Duplicate animal terminal Thing owner.'];
 }
 return [];
}

export function registerGroupAnimalLossThings256(w:World,ids:import('./numeric-membership.ts').NumericMembershipSink):string[] {
 const root=registeredCampaign(w);return registerGroupAnimalLossRows256(root.worldGroups?.animalLosses??[],root.nextId,ids);
}
