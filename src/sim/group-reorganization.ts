import {groupPlayerOwner256} from './group-route-interval-256.ts';
import {validWorldAffiliationForeignKeys259} from './world-affiliation-259.ts';
import {validGroupAdmission257} from './group-human-admission-257.ts';
import {groupPhysicalPawns256} from './group-mixed-pawns-256.ts';
import {validCaravanAnimalRecord256} from './group-animal-record-save-256.ts';
import {exchangeGroupPackedBalance256} from './group-packed-balance-256.ts';
import {validCaravanBedrollPacks256} from './group-bedroll-capture-256.ts';
import {newGroupForageRevision256} from './group-forage-state-256.ts';
import type {CampaignState,WorldGroupRecord} from './world-map-state.ts';
import type {GroupState,GroupDepartureBaseline} from './group-state.ts';
import type {CommandResult,MaterialPile,Pawn} from './types.ts';
import type {GroupReorganizationCommand,GroupMemberOrigin,GroupReorganization} from './group-reorganization-state.ts';
import {validGroupReorganizationCommand} from './group-reorganization-save.ts';
import {openGroupReorganization,withGroupExchange,groupInventoryVector,groupReorganizationBalance} from './group-reorganization-balance.ts';
import {draftSplitInventory,splitInventoryDraftCurrent,commitSplitInventory,type GroupInventorySplitDraft,type GroupInventoryReceipt} from './group-inventory-reorganization.ts';
import {emptyGroupLedger} from './group-loading.ts';
import {newGroupProvisions} from './group-provisions.ts';
import {newGroupFreight} from './group-freight.ts';
import {isColonist} from './affiliation.ts';
import type {GroupMotionRuntime} from './group-motion-runtime.ts';
type Away=Extract<GroupState,{members:unknown}>;
const fail=(reason:string)=>({kind:'refused' as const,reason});
const owner=groupPlayerOwner256;
const capableOwner=(p:Pawn)=>owner(p)&&p.state!=='downed'&&p.state!=='dead'&&!p.health?.death;
const originals=(r:WorldGroupRecord):r is WorldGroupRecord&{state:Away}=>r.localMapId===null&&'members'in r.state;
const origins=(r:WorldGroupRecord&{state:Away}):GroupMemberOrigin[]=>r.state.members.map(p=>{if(!r.state.reorganization)return {pawnId:p.id,originMapId:r.originMapId,context:r.context};const o=r.state.reorganization.memberOrigins.find(o=>o.pawnId===p.id);if(!o)throw Error('Missing original member context');return o;});
function opening(root:CampaignState,r:WorldGroupRecord&{state:Away}):GroupReorganization {
 return r.state.reorganization?structuredClone(r.state.reorganization):openGroupReorganization(r.state,root.worldGroups!.losses,root.tick,origins(r));
}
function baseline(items:readonly MaterialPile[]):GroupDepartureBaseline {
 const q=groupInventoryVector(items);return {food:q['survival-meal']??0,pemmican:q.pemmican??0,silver:q.silver??0,cargo:{cloth:q.cloth??0,'muffalo-wool':q['muffalo-wool']??0},medicine:q.medicine??0,component:q.component??0,freight:{wood:q.wood??0,steel:q.steel??0}};
}
interface Change {record:WorldGroupRecord;beforeState:GroupState;signature:string;next:Away}
export interface GroupReorganizationPlan {
 root:CampaignState;tick:number;rng:number;nextId:number;nextGroupId:number;
 registry:NonNullable<CampaignState['worldGroups']>;originalGroups:WorldGroupRecord[];
 changes:Change[];created:WorldGroupRecord[];removed:WorldGroupRecord[];
 nextThingId:number;nextRng:number;inventory?:GroupInventorySplitDraft;
 /** One command can contain several Core cohorts; no transitive closure. */
 survivors:number[];receipts:GroupInventoryReceipt[];
}
function planBase(root:CampaignState):GroupReorganizationPlan {
 return {root,tick:root.tick,rng:root.rng,nextId:root.nextId,nextGroupId:root.planet!.nextGroupId,registry:root.worldGroups!,originalGroups:root.worldGroups!.groups,changes:[],created:[],removed:[],nextThingId:root.nextId,nextRng:root.rng,survivors:[],receipts:[]};
}
function knownOriginals(root:CampaignState,records:readonly (WorldGroupRecord&{state:Away})[]):boolean {
 const ids=new Set<number>(),piles=new Set<number>();
 for(const r of records){if(r.state.lastPersonalTick!==root.tick||!validGroupAdmission257(r.state.admission,root.schemaVersion)||!r.state.members.some(owner)||r.state.members.some(p=>!owner(p)&&!(root.schemaVersion===259&&r.state.admission?.revision===2&&p.worldAffiliation259?.guestStatus==='Prisoner'&&p.worldAffiliation259.hostFactionId===root.worldFactions?.playerFactionId&&validWorldAffiliationForeignKeys259(p,root.worldFactions))||p.state==='dead'||p.health?.death||ids.has(p.id)||piles.has(p.id)||p.id<1||p.id>=root.nextId))return false;for(const p of r.state.members)ids.add(p.id);
  const physical=groupPhysicalPawns256(r.state);for(const a of r.state.animalOwners?.members??[]){const origin=r.state.animalOwners!.origins.find(o=>o.pawnId===a.id);if(!origin||ids.has(a.id)||piles.has(a.id)||a.state==='dead'||a.health?.death||!validCaravanAnimalRecord256(a,{context:origin.context,tick:root.tick,nextId:root.nextId,version:root.schemaVersion}))return false;ids.add(a.id);}
  for(const p of r.state.items){const ownerId='pawnId'in p.owner?p.owner.pawnId:undefined;if(piles.has(p.id)||ids.has(p.id)||p.id<1||p.id>=root.nextId||ownerId===undefined||!physical.some(m=>m.id===ownerId))return false;piles.add(p.id);}
  if(!validCaravanBedrollPacks256(r.state.packed,physical,root.nextId,root.schemaVersion))return false;for(const p of r.state.packed??[]){if(ids.has(p.building.id)||piles.has(p.building.id))return false;piles.add(p.building.id);}
  if(r.state.reorganization&&!groupReorganizationBalance(r.state,r.state.reorganization,root.worldGroups!.losses))return false;
 }
 return true;
}
export function prepareGroupSplit(root:CampaignState,c:Extract<GroupReorganizationCommand,{type:'group-split'}>):{kind:'ready';plan:GroupReorganizationPlan}|{kind:'refused';reason:string} {
 try{
  if(!validGroupReorganizationCommand(c,root.schemaVersion)||!root.worldMaps||!root.worldGroups||!root.planet)return fail('Commande de séparation invalide.');
  const r=root.worldGroups.groups.find(r=>r.state.id===c.groupId);if(!r||!originals(r)||!knownOriginals(root,[r]))return fail('Caravane réelle indisponible.');
  const g=r.state,animalIds=new Set(c.animalIds??[]),childIds=new Set([...c.memberIds,...animalIds]),childMembers=g.members.filter(p=>childIds.has(p.id)),sourceMembers=g.members.filter(p=>!childIds.has(p.id));
  if(g.members.filter(owner).length<2||childMembers.length!==c.memberIds.length||animalIds.size!==(g.animalOwners?.members.filter(a=>animalIds.has(a.id)).length??0)||!childMembers.some(capableOwner)||!sourceMembers.some(capableOwner))return fail('Chaque moitié doit conserver un propriétaire joueur non à terre.');
  if(!Number.isSafeInteger(root.planet.nextGroupId+1))return fail('Identités de caravanes épuisées.');
  const inventory=draftSplitInventory(groupPhysicalPawns256(g),g.items,childIds,c.inventory,root.nextId,root.rng,root.tick,g.packed??[],c.packedIds??[],undefined,root.schemaVersion);if(!inventory)return fail('Les inventaires choisis ne peuvent pas être transférés exactement.');
  const staged=new Map(inventory.updates.map(u=>[u.original.id,u.next])),values=(items:readonly MaterialPile[])=>items.map(p=>staged.get(p.id)??p),allOrigins=origins(r),retainedOrigins=allOrigins.filter(o=>!childIds.has(o.pawnId)),childOrigins=allOrigins.filter(o=>childIds.has(o.pawnId));
  const sourceBalance=withGroupExchange(opening(root,r),'sent',values(inventory.child));sourceBalance.memberOrigins=retainedOrigins;sourceBalance.packed=exchangeGroupPackedBalance256(sourceBalance.packed,'sent',inventory.childPacked);if(sourceBalance.packed===undefined)delete sourceBalance.packed;
  const sourceNext:Away={...g,members:sourceMembers,items:inventory.source,...inventory.sourcePacked.length?{packed:inventory.sourcePacked}:{packed:undefined},reorganization:sourceBalance};
  if(!inventory.sourcePacked.length)delete sourceNext.packed;
  if(g.animalOwners){const old=g.animalOwners;sourceNext.animalOwners={...old,members:old.members.filter(a=>!animalIds.has(a.id)),origins:old.origins.filter(o=>!animalIds.has(o.pawnId)),order:old.order.filter(id=>!childIds.has(id))};}
  const childId=root.planet.nextGroupId,childNext:Away={id:childId,startedAt:root.tick,destination:g.tile,ledger:emptyGroupLedger(),provisions:newGroupProvisions(),freight:newGroupFreight(),phase:'stationary',members:childMembers,items:inventory.child,...inventory.childPacked.length?{packed:inventory.childPacked}:{},departedAt:root.tick,lastPersonalTick:root.tick,baseline:baseline(values(inventory.child)),entry:{...g.entry},tile:g.tile,route:[g.tile],segment:null,paused:false,stop:{kind:'stationary'},travel:{revision:1,tickDelta:0,forage:newGroupForageRevision256(values(inventory.child))}};
  if(g.animalOwners&&animalIds.size)childNext.animalOwners={revision:1,members:g.animalOwners.members.filter(a=>animalIds.has(a.id)),origins:g.animalOwners.origins.filter(o=>animalIds.has(o.pawnId)),order:g.animalOwners.order.filter(id=>childIds.has(id))};
  if(g.admission)childNext.admission={revision:g.admission.revision};
  childNext.reorganization=openGroupReorganization({...childNext,items:values(inventory.child)},[],root.tick,childOrigins);childNext.reorganization.birth={kind:'split',parentGroupId:g.id,at:root.tick};
  if(!groupReorganizationBalance({...sourceNext,items:values(inventory.source)},sourceBalance,root.worldGroups.losses)||!groupReorganizationBalance({...childNext,items:values(inventory.child)},childNext.reorganization,[]))return fail('Bilan des deux moitiés non fermé.');
  const plan=planBase(root);plan.inventory=inventory;plan.nextThingId=inventory.nextId;plan.nextRng=inventory.rng;plan.receipts=inventory.receipts;plan.changes.push({record:r,beforeState:g,signature:JSON.stringify(g),next:sourceNext});plan.created.push({...r,state:childNext,localMapId:null});plan.survivors=[g.id,childId];return {kind:'ready',plan};
 }catch{return fail('Séparation refusée sans modification des propriétaires.');}
}
export function prepareGroupMerge(root:CampaignState,c:Extract<GroupReorganizationCommand,{type:'group-merge'}>,motion:GroupMotionRuntime):{kind:'ready';plan:GroupReorganizationPlan}|{kind:'refused';reason:string} {
 try{
  if(!validGroupReorganizationCommand(c,root.schemaVersion)||!root.worldMaps||!root.worldGroups||!root.planet)return fail('Commande de fusion invalide.');
  const records=c.groupIds.map(id=>root.worldGroups!.groups.find(r=>r.state.id===id));if(records.some(r=>!r||!originals(r)))return fail('Une caravane sélectionnée n’existe plus.');
  const selected=records as (WorldGroupRecord&{state:Away})[];if(!knownOriginals(root,selected))return fail('Propriétaires de caravanes invalides.');
  if(selected.some(r=>r.state.admission?.revision===2)&&selected.some(r=>r.state.admission?.revision!==2||r.state.reorganization?.memberOrigins.some(o=>o.enteredAtAbsCore===undefined)||r.state.animalOwners?.origins.some(o=>o.enteredAtAbsCore===undefined)))return fail('La fusion mélange des entrées mondiales historiques sans reçu : aucune date n’est reconstruite ni aucun bien déplacé.');
  const pending=[...selected],plan=planBase(root);
  while(pending.length){
   const first=pending.shift()!,cohort=[first];
   for(let i=pending.length-1;i>=0;i--){const other=pending[i]!;if(motion.closeTo(first.state,other.state)){cohort.push(other);pending.splice(i,1);}}
   if(cohort.length<2)continue;
   let survivor=cohort[0]!;for(const r of cohort)if(groupPhysicalPawns256(r.state).length>groupPhysicalPawns256(survivor.state).length)survivor=r;
   const absorbed=cohort.filter(r=>r!==survivor),members=[...survivor.state.members,...absorbed.flatMap(r=>r.state.members)],items=[...survivor.state.items,...absorbed.flatMap(r=>r.state.items)],incoming=absorbed.flatMap(r=>r.state.items);
   const balance=withGroupExchange(opening(root,survivor),'received',incoming);const packed=[...(survivor.state.packed??[]),...absorbed.flatMap(r=>r.state.packed??[])];balance.packed=exchangeGroupPackedBalance256(balance.packed,'received',absorbed.flatMap(r=>r.state.packed??[]));if(balance.packed===undefined)delete balance.packed;balance.memberOrigins=[...origins(survivor),...absorbed.flatMap(origins)];
   const next:Away={...survivor.state,members,items,...packed.length?{packed}:{},reorganization:balance};
   if(cohort.some(r=>r.state.admission))next.admission={revision:cohort.every(r=>r.state.admission?.revision===2)?2:1};
   const animalMembers=[...survivor.state.animalOwners?.members??[],...absorbed.flatMap(r=>r.state.animalOwners?.members??[])];
   if(animalMembers.length||survivor.state.animalOwners||absorbed.some(r=>r.state.animalOwners)){const old=survivor.state.animalOwners;next.animalOwners={revision:1,members:animalMembers,origins:[...old?.origins??[],...absorbed.flatMap(r=>r.state.animalOwners?.origins??[])],order:[...groupPhysicalPawns256(survivor.state),...absorbed.flatMap(r=>groupPhysicalPawns256(r.state))].map(p=>p.id),...!next.travel?{interval:old?.interval??{revision:1,startedAt:root.tick,atCore:root.tick*10,tickDelta:0}}:{}};}
   if(!groupReorganizationBalance(next,balance,root.worldGroups.losses))return fail('Bilan de fusion non fermé.');
   plan.changes.push({record:survivor,beforeState:survivor.state,signature:JSON.stringify(survivor.state),next});plan.removed.push(...absorbed);for(const r of absorbed)plan.changes.push({record:r,beforeState:r.state,signature:JSON.stringify(r.state),next:r.state});plan.survivors.push(survivor.state.id);
  }
  if(!plan.removed.length)return fail('Aucune paire sélectionnée n’est assez proche.');return {kind:'ready',plan};
 }catch{return fail('Fusion refusée sans modification des propriétaires.');}
}
/** Every refusal precedes the first authoritative write. The caller registers
 * only child motion after success and removes absorbed IDs without reset of
 * source/survivor tweens; no implicit speed request belongs to this function. */
export function commitGroupReorganization(plan:GroupReorganizationPlan):CommandResult {
 const root=plan.root,r=root.worldGroups;
 const inventoryCurrent=!plan.inventory||plan.changes.some(c=>'members'in c.record.state&&splitInventoryDraftCurrent(c.record.state.items,plan.inventory!,c.record.state.packed??[]));
 if(root.tick!==plan.tick||root.rng!==plan.rng||root.nextId!==plan.nextId||root.planet?.nextGroupId!==plan.nextGroupId||r!==plan.registry||r.groups!==plan.originalGroups||plan.changes.some(c=>!r.groups.includes(c.record)||c.record.state!==c.beforeState||JSON.stringify(c.record.state)!==c.signature)||!inventoryCurrent)return {ok:false,code:'invalid-command',reason:'La caravane a changé avant la confirmation.'};
 if(plan.inventory)commitSplitInventory(plan.inventory);
 for(const change of plan.changes)if(!plan.removed.includes(change.record))change.record.state=change.next;
 r.groups=[...r.groups.filter(g=>!plan.removed.includes(g)),...plan.created];root.nextId=plan.nextThingId;root.rng=plan.nextRng;root.planet!.nextGroupId+=plan.created.length;
 r.selectedGroupId=plan.created[0]?.state.id??plan.survivors[0]??r.selectedGroupId;
 return {ok:true};
}
