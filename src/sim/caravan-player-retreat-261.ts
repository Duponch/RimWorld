import {planetTile} from './planet-geography-256.ts';
import {newGroupForageRevision256} from './group-forage-state-256.ts';
import {previewFormation,previewGroupFormation} from './group-authority.ts';
import {newGroupAdmissionRevision259} from './group-human-admission-259.ts';
import {groupHumanMobile257,groupFreeHuman257} from './group-human-admission-257.ts';
import {emptyGroupLedger} from './group-loading.ts';
import {newGroupProvisions} from './group-provisions.ts';
import {newGroupFreight} from './group-freight.ts';
import {registeredCampaign,registeredMap,registeredMapId,boundWorldGroup} from './world-map-context.ts';
import {prepareRetainedReform261} from './caravan-retained-261.ts';
import {temporaryRetainedOwner263} from './world-target-retained-263.ts';
import {captureGroupMass} from './group-capture.ts';
import {openGroupReorganization} from './group-reorganization-balance.ts';
import {mergedGroupState261} from './group-reorganization.ts';
import type {World,CommandResult} from './types.ts';
import type {CampaignState,WorldGroupRecord} from './world-map-state.ts';
import type {GroupCommand} from './group-state.ts';
import type {AwayGroup} from './group-capture.ts';
import type {EncounterMap261} from './caravan-encounter-state-261.ts';

type Start=Extract<GroupCommand,{type:'group-start'}>;
const no=(reason:string)=>({ok:false as const,reason});
const arrayRefs261=<T>(read:()=>readonly T[]|undefined)=>{const original=read(),refs=original?.slice();return ()=>{const now=read();return now===original&&(!now||now.length===refs!.length&&now.every((v,i)=>v===refs![i]));};};
const writable=(o:object,k:string)=>{const d=Object.getOwnPropertyDescriptor(o,k);return d?Object.hasOwn(d,'value')&&d.writable===true:!(k in o)&&Object.isExtensible(o);};
/** No pause, tick, person, pending or inventory is manufactured. Each owner
 * gets an independent ordinary physical preparation, so another owner's
 * unfinished edge/patient/source never holds an already exiting owner. */
function retreatUnits261(w:World,c:Start){
 const root=registeredCampaign(w),id=registeredMapId(w),site=(root.worldMaps?.sites??(w.campaignMap?.revision===2?w.campaignMap.maps:[])).find(s=>s.id===id),planet=root.planet;
 if((Number(w.schemaVersion)!==261&&(Number(w.schemaVersion)!==262&&Number(w.schemaVersion)!==263))||c.retreat261!==true||id!==c.originMapId||!site||!temporaryRetainedOwner263(root,site)||!planet||!root.worldFactions)return no('La fuite exige sa vraie carte temporaire et son propriétaire retenu.');
 const full=previewFormation(w,c.memberIds,c.sources,c.destination,c.packedIds??[],c.animalIds??[],true);if(full.kind!=='ready')return no(full.kind==='deferred'?'La route attend une nouvelle tentative.':full.reason);
 const owners=full.loading.capture.members.filter(p=>groupFreeHuman257(p)&&groupHumanMobile257(p));if(!owners.length)return no('Un propriétaire autonome doit sortir.');
 const units=new Map(owners.map(p=>[p.id,new Set([p.id])])),ownerOf=new Map(owners.map(p=>[p.id,p.id]));
 for(const p of full.loading.capture.members)if(!ownerOf.has(p.id)){const carrier=full.humanPreparation?.passengers.find(row=>row.pawnId===p.id)?.carrierId??owners[0]!.id;if(!units.has(carrier))return no('Le vrai porteur ne possède pas son unité de sortie.');units.get(carrier)!.add(p.id);ownerOf.set(p.id,carrier);}
 const animalOwner=new Map((full.animalPreparation?.lines??[]).map(l=>[l.animalId,ownerOf.get(l.handlerId)]));
 if([...animalOwner.values()].some(v=>v===undefined))return no('Un animal n’a pas de vrai porteur ou meneur sélectionné.');
 const records:WorldGroupRecord[]=[];
 for(const [owner,ids]of units){
  const lines=new Map<number,number>();for(const l of full.loading.manifest)if((ownerOf.get(l.carrierId)??animalOwner.get(l.carrierId))===owner)lines.set(l.pileId,(lines.get(l.pileId)??0)+l.quantity);
  const packedIds=(full.bedrollLoading?.manifest??[]).filter(l=>(ownerOf.get(l.carrierId)??animalOwner.get(l.carrierId))===owner).map(l=>l.structureId),animalIds=[...animalOwner].filter(([,v])=>v===owner).map(([id])=>id);
  const p=previewFormation(w,[...ids],[...lines].map(([pileId,quantity])=>({pileId,quantity})),c.destination,packedIds,animalIds,true);if(p.kind!=='ready')return no(p.kind==='deferred'?'Une route attend une nouvelle tentative.':p.reason);
  // One autonomous human per preparation. Passengers and animals retain their
  // real ordinary carry/lead contacts, including captured movement edges.
  const state:Extract<import('./group-state.ts').GroupState,{manifest:unknown}>={id:planet.nextGroupId+records.length,startedAt:w.tick,destination:c.destination,originTile:site.tile!,ledger:emptyGroupLedger(),provisions:newGroupProvisions(),freight:newGroupFreight(),admission:{revision:newGroupAdmissionRevision259(w)},travelPreparation:true,phase:'gathering',memberIds:[...ids],rendezvous:p.rendezvous,meeting:p.meeting,manifest:p.loading.manifest,cursor:0,exits:p.exits,...p.humanPreparation?{humanPreparation:p.humanPreparation}:{},...p.animalPreparation?{animalPreparation:p.animalPreparation}:{},...p.bedrollLoading?{bedrollLoading:p.bedrollLoading}:{}};
  records.push({originMapId:id!,localMapId:id!,context:{seed:w.seed,width:w.width,height:w.height,...w.climate?{climate:w.climate}:{},...w.site?{site:w.site}:{},...w.scenario?{scenario:w.scenario}:{}},state,encounters261:{revision:1},retreat261:{revision:1}});
 }
 return {ok:true as const,records,root,site,planet};
}
export function preparePlayerRetreat261(w:World,c:Start){
 const p=retreatUnits261(w,c);if(!p.ok)return p;const {records,root,site,planet}=p,registry=root.worldGroups;if(!registry)return no('Le vrai registre de sortie est absent.');
 if(!Number.isSafeInteger(planet.nextGroupId+records.length)||!writable(planet,'nextGroupId')||!writable(registry,'groups')||!writable(registry,'selectedGroupId'))return no('Le registre de sortie n’est pas modifiable.');
 const nextId=planet.nextGroupId,tick=root.tick,groups=registry.groups,sourceStamp=()=>JSON.stringify([site.id,site.tile,site.battlefield261,site.target263,root.nextId,root.rng,registry.groups.map(r=>[r.state.id,r.localMapId,'members'in r.state?r.state.members.map(p=>p.id):r.state.memberIds]),c.memberIds.map(id=>w.pawns.find(p=>p.id===id)),w.piles.filter(p=>c.sources.some(l=>l.pileId===p.id)||'pawnId'in p.owner&&c.memberIds.includes(p.owner.pawnId)),w.packed.filter(p=>c.packedIds?.includes(p.building.id)),w.wildlife?.animals.filter(a=>c.animalIds?.includes(a.id))]),source=sourceStamp();
 return {ok:true as const,records,commit():CommandResult{if(root.tick!==tick||planet.nextGroupId!==nextId||registry.groups!==groups||sourceStamp()!==source)return {ok:false,code:'invalid-command',reason:'La source de fuite a changé.'};registry.groups=[...groups,...records];registry.selectedGroupId=records[0]!.state.id;planet.nextGroupId+=records.length;return {ok:true};}};
}
export function previewPlayerRetreat261(w:World,c:Start){const p=retreatUnits261(w,c);return p.ok?previewGroupFormation(w,c.memberIds,c.sources,c.destination,c.packedIds??[],c.animalIds??[],true):p;}

/** The manager's true escape-created autoJoinable owners only. Origin and
 * route do not restrict joining; actual planet neighbours do (Core343–381). */
export function playerRetreatJoinTile261(planet:NonNullable<CampaignState['planet']>,from:number,to:number):boolean {return from===to||planet.revision===3&&!!planetTile(planet,from)?.neighbours.includes(to);}

/** Pure exit transaction. The existing driver still validates all originals,
 * exact edges, carry contacts, namespace and UNDRAFT before any live write. */
export function preparePlayerRetreatDeparture261(w:World,next:AwayGroup,enteredAtAbsCore:number|undefined){
 const root=registeredCampaign(w),record=boundWorldGroup(w),site=root.worldMaps?.sites.find(s=>s.id===record?.originMapId),groups=root.worldGroups;
 const retainedParent=site&&temporaryRetainedOwner263(root,site);
 if(!record?.retreat261)return {ok:true as const,next,targetId:undefined,current:()=>true,commit(){return false;}};
 if((Number(w.schemaVersion)!==261&&(Number(w.schemaVersion)!==262&&Number(w.schemaVersion)!==263))||record.localMapId!==site?.id||!site||!retainedParent||!groups||enteredAtAbsCore===undefined||!writable(groups,'groups')||!writable(groups,'selectedGroupId')||!writable(record,'state')||!writable(record,'localMapId')||!writable(record,'story261')||!writable(record,'arrival261')||!writable(record,'retreat261')||!writable(retainedParent,'retained'))return no('Le vrai mandat de sortie n’est plus disponible.');
 const context=record.context,origins=next.members.map(p=>({pawnId:p.id,originMapId:site.id,context,enteredAtAbsCore}));
 let departing:AwayGroup={...next,travel:{revision:1,tickDelta:0,forage:newGroupForageRevision256(next.items)},reorganization:openGroupReorganization(next,[],w.tick,origins)};
 if(departing.animalOwners)departing={...departing,animalOwners:{...departing.animalOwners,origins:departing.animalOwners.members.map(a=>({pawnId:a.id,originMapId:site.id,context,enteredAtAbsCore}))}};
 const mass=captureGroupMass(departing.members,departing.items,true,w.schemaVersion,departing.packed,departing.animalOwners?.members);if(!mass)return no('La charge réelle de sortie est invalide.');
 let target:(WorldGroupRecord&{state:AwayGroup})|undefined,joined:AwayGroup|undefined;
 const donor={...record,state:departing,localMapId:null};
 for(const candidate of groups.groups){
  if(candidate===record||candidate.retreat261?.autoJoinable!==true||candidate.localMapId!==null||candidate.pending261||candidate.pendingEntry263||!('members'in candidate.state)||!root.planet||!playerRetreatJoinTile261(root.planet,departing.tile,candidate.state.tile)||candidate.state.lastPersonalTick!==root.tick||!writable(candidate,'state'))continue;
  let proposed:AwayGroup|undefined;try{proposed=mergedGroupState261(root,{...candidate,state:candidate.state},[donor]);}catch{continue;}
  if(proposed){target=candidate as WorldGroupRecord&{state:AwayGroup};joined=proposed;break;}
 }
 // A real join preserves its survivor's route/story. Only CREATE invokes the
 // map's Notify_CaravanFormed retained contract, once (native ExitMap utility).
 let retained:Extract<ReturnType<typeof prepareRetainedReform261>,{kind:'ready'}>|undefined;
 if(!target){const calendar=registeredMap(root,site.id);if(!calendar)return no('Le calendrier réel de sortie est absent.');const p=prepareRetainedReform261(root,site as EncounterMap261,departing,mass,calendar);if(p.kind!=='ready')return no('La reprise de route est différée sans départ.');retained=p;departing=p.state;}
 // Values and physical originals have separate seals: equal JSON clones
 // cannot replace the real recipient, record, roster or retained owner.
 const tick=root.tick,beforeTarget=target?JSON.stringify(target):null,beforeRetained=JSON.stringify(retainedParent.retained),originalGroups=groups.groups;
 const maps=root.worldMaps!,sites=maps.sites,body=site.map,retainedContainer=retainedParent,retainedOwner=retainedContainer.retained,retainedNext=retainedOwner.next,retainedDestination=retainedOwner.destination,retainedAction=retainedDestination?.action,story=site.story261,sourceState=record.state,sourceContext=record.context,sourceFlag=record.retreat261;
 const groupRefs=arrayRefs261(()=>groups.groups),targetState=target?.state,targetContext=target?.context,targetFlag=target?.retreat261,targetStory=target?.story261,targetArrival=target?.arrival261;
 const targetAnimals=targetState?.animalOwners,targetLedger=targetState?.ledger,targetProvisions=targetState?.provisions,targetFreight=targetState?.freight,targetTravel=targetState?.travel,targetForage=targetTravel?.forage,targetReorganization=targetState?.reorganization;
 const targetArrays=[arrayRefs261(()=>targetState?.members),arrayRefs261(()=>targetState?.items),arrayRefs261(()=>targetState?.packed),arrayRefs261(()=>targetState?.reorganization?.memberOrigins),arrayRefs261(()=>targetAnimals?.members),arrayRefs261(()=>targetAnimals?.origins),arrayRefs261(()=>targetAnimals?.order)];
 const stateObjects=Object.entries(targetState??{}).filter(([,value])=>value!==null&&typeof value==='object');
 const targetBuildings=targetState?.packed?.map(p=>p.building),targetOwners=targetState?.items.map(p=>p.owner);let used=false;
 const identitiesCurrent=()=>!used&&root.worldMaps===maps&&root.worldGroups===groups&&maps.sites===sites&&sites.find(s=>s.id===site.id)===site&&site.map===body&&temporaryRetainedOwner263(root,site)===retainedContainer&&retainedContainer.retained===retainedOwner&&retainedOwner.next===retainedNext&&retainedOwner.destination===retainedDestination&&retainedDestination?.action===retainedAction&&site.story261===story&&record.state===sourceState&&record.context===sourceContext&&record.retreat261===sourceFlag&&groupRefs()&&groups.groups.includes(record)&&(!target||groups.groups.includes(target)&&target.state===targetState&&target.context===targetContext&&target.retreat261===targetFlag&&target.story261===targetStory&&target.arrival261===targetArrival&&targetState!.animalOwners===targetAnimals&&targetState!.ledger===targetLedger&&targetState!.provisions===targetProvisions&&targetState!.freight===targetFreight&&targetState!.travel===targetTravel&&targetTravel?.forage===targetForage&&targetState!.reorganization===targetReorganization&&targetArrays.every(check=>check())&&stateObjects.every(([key,value])=>(targetState as unknown as Record<string,unknown>)[key]===value)&&(!targetState!.packed||targetState!.packed.every((p,i)=>p.building===targetBuildings![i]))&&targetState!.items.every((p,i)=>p.owner===targetOwners![i])&&writable(target,'state'))&&writable(groups,'groups')&&writable(groups,'selectedGroupId')&&writable(record,'state')&&writable(record,'localMapId')&&writable(record,'story261')&&writable(record,'arrival261')&&writable(record,'retreat261')&&writable(retainedContainer,'retained');
 return {ok:true as const,next:departing,targetId:target?.state.id,current:()=>identitiesCurrent()&&root.tick===tick&&groups.groups===originalGroups&&JSON.stringify(retainedContainer.retained)===beforeRetained&&(!target||JSON.stringify(target)===beforeTarget),commit(){
  // Caller has already checked current immediately before its original writes.
  if(used)throw Error('Retreat departure already committed');used=true;
  if(!target){retainedContainer.retained={passStory:false,next:null,destination:null};record.retreat261={revision:1,autoJoinable:true};}
  if(target&&joined){target.state=joined;groups.selectedGroupId=target.state.id;return true;}
  if(retained?.story)record.story261=retained.story;if(retained?.arrival)record.arrival261=retained.arrival;return false;
 }};
}
