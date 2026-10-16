import {validLostArchiveShape,validateLostArchives} from './world-lost-save.ts';
import {captureLostOwners} from './world-lost-owners.ts';
import {validateSchedules} from './schedule-save.ts';
import {validateFoodPolicies} from './food-policy-save.ts';
import {validateRecreationRecordShape} from './recreation-save.ts';
import {validateApparel} from './apparel-save.ts';
import {validateEquipment} from './equipment-save.ts';
import {validateThingDamage} from './fire-save.ts';
import {validateHumanSocial} from './social-save.ts';
import {validHumanBereavement} from './bereavement-save.ts';
import {validateRelationshipWorld} from './relationship-world-save.ts';
import {validFilthFeet} from './filth-save.ts';
import {APPAREL_POLICY_INTERVAL} from './apparel-renewal.ts';
import {validSchedule} from './schedule.ts';
import {validateCommercialBindings} from './commercial-save.ts';
import {validGroupMapContext} from './world-map-context-save.ts';
import {validLostMemories} from './world-map-lost.ts';
import {validateGroupContextsWithPlanet} from './group-save.ts';
import {validateScoutRegistry} from './caravan-save.ts';
import {validateCommercialRegistry} from './commercial-save.ts';
import {validatePawnRecordShape} from './pawn-record-save.ts';
import {validatePileRecordShape} from './material-record-save.ts';
import {validatePawnHealth} from './health-save.ts';
import type {World} from './types.ts';
import type {CampaignState,AbandonedMapContents} from './world-map-state.ts';
import {isMaplessCampaign} from './world-map-state.ts';
import {CAMPAIGN_FIELDS} from './secondary-site-state.ts';
import {LOCAL_FIELDS} from './secondary-site-save.ts';
import {registeredMapForValidation,registeredMapId,sharedCampaignData,brandCampaignContext} from './world-map-context.ts';
import {globalOwnerContexts} from './world-map-owners.ts';
import {validateGroupState} from './group-save.ts';
import {registerGroupThingIds} from './group-namespace-save.ts';
import {validateCivilianPost} from './commercial-post.ts';
import {validatePlanet} from './planet-save.ts';
import {validMapDimension} from './map-config.ts';
import {captureHumanOwners} from './human-owners.ts';
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const fields=(v:Record<string,unknown>,req:string[],opt:string[]=[])=>req.every(k=>Object.hasOwn(v,k))&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&(req.includes(k)||opt.includes(k)));
const dense=(v:unknown,max:number):v is unknown[]=>Array.isArray(v)&&v.length<=max&&Reflect.ownKeys(v).length===v.length+1&&Array.from({length:v.length},(_,i)=>Object.hasOwn(v,i)&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,String(i))!,'value')).every(Boolean);
const kind=(v:unknown)=>v==='settlement'||v==='camp'||v==='legacy-site';
const local=(v:unknown)=>record(v)&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&LOCAL_FIELDS.has(k)&&!['group','groupLosses','civilianPost'].includes(k));
const historicalAbsent=(v:unknown)=>!v||typeof v!=='object'||!Object.hasOwn(v,'worldMaps')&&!Object.hasOwn(v,'worldGroups');
export function validWorldMapHistorical(raw:unknown,version:number):boolean {if(version>=255)return true;if(!historicalAbsent(raw))return false;if(!raw||typeof raw!=='object')return true;const site=Object.getOwnPropertyDescriptor(raw,'secondarySite');if(!site)return true;if(!('value'in site))return false;if(!site.value||typeof site.value!=='object')return true;const map=Object.getOwnPropertyDescriptor(site.value,'map');return !map||'value'in map&&historicalAbsent(map.value);}
/** Cheap registry authority gate before any imported map becomes a context. Not a world walk per tick. */
export function validWorldMapRegistry(raw:unknown):raw is CampaignState {
 if(!record(raw)||raw.schemaVersion!==255||!int(raw.tick)||!int(raw.nextId,1)||!int(raw.rng,1,0xffffffff)||!record(raw.worldMaps)||!record(raw.worldGroups))return false;
 const m=raw.worldMaps,g=raw.worldGroups,nextId=raw.nextId;
 if(!fields(m,['revision','rootMapId','selectedMapId','nextMapId','campaignSeed','calendarOrigin','mapSize','sites','retired'])||m.revision!==1||!int(m.nextMapId,1)||!int(m.campaignSeed,0,0xffffffff)||!Number.isSafeInteger(m.calendarOrigin)||!record(m.mapSize)||!fields(m.mapSize,['width','height'])||!validMapDimension(m.mapSize.width)||!validMapDimension(m.mapSize.height)||!dense(m.sites,m.nextMapId)||!dense(m.retired,m.nextMapId))return false;
 const planet=record(raw.planet)&&Array.isArray(raw.planet.tiles)?raw.planet.tiles:undefined,validTile=(v:unknown)=>int(v,0,(planet?.length??0)-1),ids=new Set<number>(),tiles=new Set<number>();
 for(const s of m.sites){if(!record(s)||!fields(s,['id','tile','kind','createdAt','visit'],['map','postId'])||!int(s.id,0,m.nextMapId-1)||ids.has(s.id)||!kind(s.kind)||!int(s.createdAt,0,raw.tick)||s.tile!==null&&!validTile(s.tile)||s.tile===null&&(s.id!==0||s.kind!=='settlement'||planet!==undefined)||s.tile!==null&&tiles.has(s.tile as number)||(s.id===m.rootMapId?Object.hasOwn(s,'map'):!local(s.map)))return false;ids.add(s.id);if(s.tile!==null)tiles.add(s.tile as number);if(s.postId!==undefined&&!int(s.postId,1))return false;if(s.visit!==null&&(!record(s.visit)||!fields(s.visit,['groupId','memberIds','homeEntry'])||!int(s.visit.groupId,1)||!dense(s.visit.memberIds,8)||!s.visit.memberIds.length||s.visit.memberIds.some(id=>!int(id,1,nextId-1))||new Set(s.visit.memberIds).size!==s.visit.memberIds.length||!record(s.visit.homeEntry)||!fields(s.visit.homeEntry,['x','z'])||!int(s.visit.homeEntry.x,0,m.mapSize.width-1)||!int(s.visit.homeEntry.z,0,m.mapSize.height-1)))return false;}
 if(m.sites.length===0?(m.rootMapId!==null||m.selectedMapId!==null||!isMaplessCampaign(raw)):!int(m.rootMapId,0)||!ids.has(m.rootMapId)||m.selectedMapId!==null&&(!int(m.selectedMapId,0)||!ids.has(m.selectedMapId)))return false;
 if(m.sites.length&&Reflect.ownKeys(raw).some(k=>typeof k!=='string'||![...CAMPAIGN_FIELDS,'worldMaps','worldGroups',...LOCAL_FIELDS].includes(k as never)||['secondarySite','campaignPeople','campaignMap','group','groupLosses','civilianPost'].includes(k as string)))return false;
 for(const s of m.retired){if(!record(s)||!fields(s,['id','tile','kind','createdAt','removedAt','reason'],['markerUntilCore'])||!int(s.id,0,m.nextMapId-1)||ids.has(s.id)||!validTile(s.tile)||!kind(s.kind)||!int(s.createdAt,0,raw.tick)||!int(s.removedAt,s.createdAt,raw.tick)||!['abandon','camp-empty'].includes(s.reason as string)||(s.kind==='camp'?(s.markerUntilCore!==Number(s.removedAt)*10+1800000):Object.hasOwn(s,'markerUntilCore')))return false;ids.add(s.id);}
 if(ids.size!==m.nextMapId)return false;
 if(!fields(g,['revision','lostMemories','events','posts','nextPostId','canonicalPostId','legacyTravellers','selectedGroupId','groups','losses','lossContexts','abandonedPawns','abandonedContents'])||g.revision!==1||!int(g.nextPostId,1)||!dense(g.posts,g.nextPostId)||!dense(g.events,80)||(!validLostMemories(g.lostMemories,raw.tick,raw.nextId))||!dense(g.groups,raw.nextId)||!dense(g.losses,64)||!dense(g.lossContexts,64)||!dense(g.legacyTravellers,m.retired.length)||!dense(g.abandonedPawns,0)||!dense(g.abandonedContents,m.retired.length)||g.abandonedContents.length!==m.retired.length)return false;
 const postIds=new Set<number>();for(const p of g.posts){if(!record(p)||!fields(p,['id','state'])||!int(p.id,1,g.nextPostId-1)||postIds.has(p.id))return false;postIds.add(p.id);}if(postIds.size!==g.nextPostId-1||g.canonicalPostId!==null&&(!int(g.canonicalPostId,1)||!postIds.has(g.canonicalPostId)))return false;
 for(const s of m.sites)if(record(s)&&s.postId!==undefined&&!postIds.has(s.postId as number))return false;
 const lossIds=new Set<number>();for(const c of g.lossContexts){if(!record(c)||!fields(c,['groupId','context','originMapId'])||!int(c.groupId,1)||lossIds.has(c.groupId)||!validGroupMapContext(c.context,raw.tick)||!int(c.originMapId,0,m.nextMapId-1)||!validMapDimension(c.context.width)||!validMapDimension(c.context.height)||!g.losses.some(l=>record(l)&&l.groupId===c.groupId))return false;lossIds.add(c.groupId);}if(g.losses.some(l=>!record(l)||!lossIds.has(l.groupId as number)))return false;
 const groupIds=new Set<number>(),members=new Set<number>();
 for(const r of g.groups){if(!record(r)||!fields(r,['originMapId','localMapId','context','state'],['postId'])||!int(r.originMapId,0,m.nextMapId-1)||r.localMapId!==null&&(!int(r.localMapId,0)||!m.sites.some(s=>record(s)&&s.id===r.localMapId))||!validGroupMapContext(r.context,raw.tick)||!int(r.context.seed,0,0xffffffff)||!validMapDimension(r.context.width)||!validMapDimension(r.context.height)||!record(r.state)||!int(r.state.id,1)||groupIds.has(r.state.id)||r.postId!==undefined&&!postIds.has(r.postId as number))return false;const away=Object.hasOwn(r.state,'members');if(away!==(r.localMapId===null))return false;const roster=away?r.state.members:r.state.memberIds;if(!dense(roster,8)||!roster.length)return false;for(const p of roster){const id=away&&record(p)?p.id:p;if(!int(id,1,raw.nextId-1)||members.has(id))return false;members.add(id);}groupIds.add(r.state.id);}
 if(g.selectedGroupId!==null&&(!int(g.selectedGroupId,1)||!groupIds.has(g.selectedGroupId)))return false;
 for(const r of g.legacyTravellers)if(!record(r)||!fields(r,['originMapId','context'],['postId','scout','commercialTrip'])||!int(r.originMapId,0,m.nextMapId-1)||!m.retired.some(s=>record(s)&&s.id===r.originMapId)||!validGroupMapContext(r.context,raw.tick)||r.scout===undefined&&r.commercialTrip===undefined||r.postId!==undefined&&!postIds.has(r.postId as number))return false;
 const archivedIds=new Set<number>(),archiveOwners=new Map<number,AbandonedMapContents>();for(const r of g.abandonedContents){if(!validLostArchiveShape(r,raw.tick,raw.nextId)||!int(r.mapId,0,m.nextMapId-1)||!validTile(r.tile)||!m.retired.some(s=>record(s)&&s.id===r.mapId&&s.tile===r.tile&&s.removedAt===r.removedAt)||archivedIds.has(r.mapId))return false;archivedIds.add(r.mapId);archiveOwners.set(r.mapId,r);}
 for(const memory of g.lostMemories){const archive=archiveOwners.get(memory.mapId);if(!archive||archive.removedAt!==memory.at||memory.otherId!==null&&!archive.humans.some(h=>h.kind==='world-lost'&&h.id===memory.otherId&&h.pawn&&h.pawn.state!=='dead'))return false;}
 return true;
}
export function validateRegisteredCampaign(raw:unknown,validateLocal:(local:World,ids:Set<number>)=>string[],validateShared:(root:CampaignState)=>string[]):string[] {
 try{if(!validWorldMapRegistry(raw))return ['Invalid or future map/group registry.'];const root=raw as CampaignState,ids=new Set<number>(),humans=new Set<number>(),errors:string[]=validateShared(root);const merge=(next:Set<number>)=>{for(const id of next){if(ids.has(id))errors.push('Thing identity owned by two campaign containers.');ids.add(id);}};
 for(const s of root.worldMaps!.sites){const view=registeredMapForValidation(root,s.id);if(!view)return ['Missing original local map.'];const owned=new Set<number>();errors.push(...validateLocal(view,owned));for(const id of captureHumanOwners(view,{},false).byId.keys())humans.add(id);merge(owned);}
 const localGroups=root.worldGroups!.groups.filter(g=>g.localMapId!==null).map(g=>{const map=registeredMapForValidation(root,g.localMapId!)!;const view={...map,group:g.state,groupLosses:[]};brandCampaignContext(view,root,g.localMapId!,g);return {world:view};});
 const global=globalOwnerContexts(root,true);errors.push(...validateGroupContextsWithPlanet({...sharedCampaignData(root),seed:root.worldMaps!.campaignSeed} as World,[...localGroups,...global.map(world=>({world}))],255));
 for(const view of global){const owned=new Set<number>();{errors.push(...registerGroupThingIds(view,owned));if(view.scout||view.commercialTrip){errors.push(...validateScoutRegistry(view,255),...validateCommercialRegistry(view,255));const capture=captureHumanOwners(view);const union={...view,pawns:capture.away.map(s=>s.pawn!),piles:capture.away.flatMap(s=>[...s.items])};errors.push(...validateSchedules(union,255),...validateFoodPolicies(union,255),...validateApparel(union,255),...validateEquipment(union),...validateThingDamage(union,255),...validateCommercialBindings(view,255),...validateRelationshipWorld(view,255));const known=new Set(capture.people.keys());for(const slot of capture.away){if(slot.pawn){errors.push(...validatePawnRecordShape(slot.pawn as unknown as Record<string,unknown>,view,255,slot.validationTick),...validateRecreationRecordShape(slot.pawn as unknown as Record<string,unknown>,255,slot.validationTick),...validateHumanSocial(slot.pawn,255,slot.validationTick,known,[]));if(!validHumanBereavement(slot.pawn.bereavement,slot.pawn,255,slot.validationTick,capture.people)||slot.pawn.filthFeet!==undefined&&!validFilthFeet(slot.pawn.filthFeet))errors.push('Invalid lifted legacy human continuation.');const p=slot.pawn;if(p.apparelPolicyId!==undefined||p.apparelAutomation!==undefined||p.nextApparelCheckAt!==undefined)if(!Number.isSafeInteger(p.apparelPolicyId)||!view.apparelPolicies?.some(a=>a.id===p.apparelPolicyId)||typeof p.apparelAutomation!=='boolean'||!int(p.nextApparelCheckAt,0,view.tick+APPAREL_POLICY_INTERVAL.max))errors.push('Invalid lifted apparel assignment.');const clinical={...view,pawns:[slot.pawn]};errors.push(...validatePawnHealth(clinical));owned.add(slot.id);}for(const p of slot.items){errors.push(...validatePileRecordShape(p as unknown as Record<string,unknown>,view,255,slot.validationTick));if(owned.has(p.id))errors.push('Duplicate legacy trip item');owned.add(p.id);}}}}for(const id of captureHumanOwners(view,{},false).byId.keys())humans.add(id);merge(owned);}
 const known=new Map<number,import('./relationship-state.ts').RelationshipPerson>();for(const s of root.worldMaps!.sites)for(const [id,p] of captureHumanOwners(registeredMapForValidation(root,s.id)!,{},false).people)known.set(id,p);for(const view of global)for(const [id,p] of captureHumanOwners(view,{},false).people)known.set(id,p);errors.push(...validateLostArchives(root,known,ids));for(const id of captureLostOwners(root).byId.keys())humans.add(id);
 for(const m of root.worldGroups!.lostMemories)if(!humans.has(m.receiverId))errors.push('Lost memory receiver has no actual human owner.');
 for(const p of root.worldGroups!.posts)errors.push(...validateCivilianPost({tick:root.tick,nextId:root.nextId,civilianPost:p.state},255,ids));
 if(root.planet)errors.push(...validatePlanet(root.planet,{...sharedCampaignData(root),seed:root.worldMaps!.campaignSeed} as World,255));return errors;
 }catch{return ['Invalid registry data or global owner namespace.'];}
}
