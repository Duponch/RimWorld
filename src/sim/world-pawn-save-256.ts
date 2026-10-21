import {isSchema271OrLater} from './schema-compatibility-257.ts';
import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import {validHeldPlayerCasketEnvelope271,validateHeldPlayerCaskets271} from './world-pawn-player-casket-271.ts';
import {validHeldCasketEnvelope259,validateHeldWorldCaskets259} from './world-pawn-casket-259.ts';
import {validMechanicalWorldPawn259} from './world-pawn-mechanical-259.ts';
import {isMechanoidKind} from './mechanoid-definition.ts';
import {geographicPlanetClimateDefinition256,geographicLongitudeOffsetCore256} from './site-climate.ts';
import {validMapExitHeader261,validMapExitReceipt261} from './caravan-map-exit-save-261.ts';
import {caravanCessionUsesRetiredOrigin261} from './caravan-person-lost-save-261.ts';
import {planetTileCount} from './planet-geography-256.ts';
import {validateEquipmentOwners259} from './equipment-save.ts';
import {validateApparelOwners259} from './apparel-save.ts';
import {validWorldAffiliationForeignKeys259} from './world-affiliation-259.ts';
import {validSuspendedWorldPawnGoods259} from './world-pawn-held-259.ts';
import {validateGroupPackedComponents258} from './group-packed-components-258.ts';
import {isSchema256Or257} from './schema-compatibility-257.ts';
import {validPhysicalWorldPawnOrder256} from './world-pawn-native-order-256.ts';
import {worldPawnRetiredOriginMatches256,settlementMemoryUsesRetiredOrigin259} from './world-pawn-origin-projection-256.ts';
import {validMentalShape} from './mental-save.ts';
import {validToxicBuildupTransport256} from './toxic-buildup-save-256.ts';
import {validateRecreationRecordShape} from './recreation-save.ts';
import {validateHumanSocial} from './social-save.ts';
import {validSchedule} from './schedule.ts';
import {APPAREL_POLICY_INTERVAL} from './apparel-renewal.ts';
import type {NumericMembershipSink} from './numeric-membership.ts';
import type {CampaignMapPresentation,CampaignSummary} from './world-map-state.ts';
import {worldPawnMothballReadiness256} from './world-pawn-life-256.ts';
import {validateDetachedPawnRecordShape} from './pawn-record-save.ts';
import {validatePawnHealthRecord} from './health-save.ts';
import {validCaravanAnimalRecord256} from './group-animal-record-save-256.ts';
import {validatePileRecordShape} from './material-record-save.ts';
import {validatePackedFurnitureRecords} from './furniture-transfer-save.ts';
import {validGroupMapContext} from './world-map-context-save.ts';
import {deadWorldPawn256,terminalWorldPawn256,type WorldPawnsState256,type WorldPawnOwner256} from './world-pawn-state-256.ts';
import type {World} from './types.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.getOwnPropertyDescriptor(v,k)?.enumerable===true&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
const exact=(v:Record<string,unknown>,required:readonly string[],optional:readonly string[]=[])=>required.every(k=>Object.hasOwn(v,k))&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&(required.includes(k)||optional.includes(k)));
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
function dense(v:unknown,max:number):v is unknown[]{if(!Array.isArray(v)||Object.getPrototypeOf(v)!==Array.prototype||v.length>max||Reflect.ownKeys(v).length!==v.length+1)return false;for(let i=0;i<v.length;i++){const d=Object.getOwnPropertyDescriptor(v,String(i));if(!d||!Object.hasOwn(d,'value')||!d.enumerable)return false;}return true;}

/** Prospective scalar witnesses only. No source map, guest status or historical
 * encounter is inferred from a missing field. All older rows reject both. */
function validWorldPawnWitnesses261(row:Record<string,unknown>,version:number,atCore:number):boolean {
 const captive=Object.hasOwn(row,'captivity261'),birth=Object.hasOwn(row,'encounterBirth261');
 if((version!==261&&(Number(version)!==262&&!isSchema263OrLater(Number(version)))))return !captive&&!birth;
 if(captive){const c=row.captivity261,a=row.actor;
  if(!object(c)||!exact(c,['factionId','atCore'])||!int(c.factionId,1)||!int(c.atCore,0,Number(row.clockCore))||c.atCore%10||c.atCore>atCore||row.kind!=='human'||row.mode==='mothballed'||row.destroyed||row.free||row.startingPawnLeftBehind||birth||row.originMapId===null||row.entryKind259!=='caravan-exit'&&row.entryKind261!=='map-exit'||c.factionId===row.factionId||!object(a)||!object(a.worldAffiliation259)||a.worldAffiliation259.factionId!==row.factionId||a.worldAffiliation259.hostFactionId!==null||a.worldAffiliation259.guestStatus!=='Guest'||a.prisoner)return false;
 }
 if(birth){const b=row.encounterBirth261;
  if(!object(b)||!exact(b,['groupId','tile','atCore','kind'])||!int(b.groupId,1)||!int(b.tile)||!int(b.atCore,0,Number(row.clockCore))||b.atCore%10||b.atCore>atCore||!['ambush','meeting','demand'].includes(String(b.kind))||row.originMapId!==null||row.startingPawnLeftBehind||Object.hasOwn(row,'entryKind259')||captive||!['human','animal'].includes(String(row.kind)))return false;
 }
 return true;
}

/** Data admission before nested clinical/item readers. Shared scalar headers
 * are allowed; cycles, accessors, non-enumerable fields and NaN are refused. */
export function plainWorldPawnData256(value:unknown):boolean {
 const active=new WeakSet<object>(),done=new WeakSet<object>();
 const stack:{v:unknown;exit?:boolean}[]=[{v:value}];
 while(stack.length){const {v,exit}=stack.pop()!;if(v===null||typeof v==='string'||typeof v==='boolean')continue;if(typeof v==='number'){if(!Number.isFinite(v))return false;continue;}if(typeof v!=='object')return false;if(exit){active.delete(v);done.add(v);continue;}if(active.has(v))return false;if(done.has(v))continue;
  const array=Array.isArray(v);if(array?!dense(v,Number.MAX_SAFE_INTEGER):!object(v))return false;
  active.add(v);stack.push({v,exit:true});for(const key of Reflect.ownKeys(v)){if(array&&key==='length')continue;const d=Object.getOwnPropertyDescriptor(v,key)!;if(!Object.hasOwn(d,'value')||!d.enumerable)return false;stack.push({v:d.value});}
 }return true;
}

/** Owner header only; validates original descriptors before any consumer. */
export function validWorldPawnsEnvelope256(raw:object,version:number,nowCore:number,nextId:number):boolean {
 const d=Object.getOwnPropertyDescriptor(raw,'worldPawns');if(!d)return !('worldPawns'in raw);
 if(!isSchema256Or257(version)||!d.enumerable||!Object.hasOwn(d,'value')||!plainWorldPawnData256(d.value)||!object(d.value))return false;const s=d.value;
 if(!exact(s,['revision','atCore','lastSuccessfulCore','currentRate','owners'],['nativeOrder',...(version===259||version===260||(version===261||(Number(version)===262||isSchema263OrLater(Number(version)))))?['discardedMechanical259','heldCaskets259']:[],...isSchema271OrLater(version)?['heldPlayerCaskets271']:[]])||s.revision!==1||!int(s.atCore,0,nowCore)||s.atCore!==nowCore||s.atCore%10||!int(s.lastSuccessfulCore,0,s.atCore)||!int(s.currentRate,1,16777216)||(s.currentRate&(s.currentRate-1))!==0||!dense(s.owners,nextId))return false;
 if(!validHeldCasketEnvelope259(s as unknown as WorldPawnsState256,version,nowCore,nextId)||!validHeldPlayerCasketEnvelope271(s as unknown as WorldPawnsState256,version,nowCore,nextId))return false;
 const ids=new Set<number>();for(const row of s.owners){if(!object(row)||!exact(row,['factionId','originMapId','context','clockCore','enteredAtAbsCore','mode','items','packed','kind','actor'],['keepForever','startingPawnLeftBehind','everColonist','destroyed','free','everSeenByPlayer',...(version===261||(Number(version)===262||isSchema263OrLater(Number(version))))?['entryKind261','captivity261','encounterBirth261']:[],...(version===259||version===260||(version===261||(Number(version)===262||isSchema263OrLater(Number(version)))))?['entryKind259','heldAtCore259','mechanicalTimersAtCore259']:[]])||row.factionId!==null&&!int(row.factionId,1)||row.originMapId!==null&&!int(row.originMapId)||!object(row.context)||!int(row.clockCore,0,s.atCore)||row.clockCore%10||!int(row.enteredAtAbsCore)||!['active','mothballed','dead'].includes(String(row.mode))||!((version===259||version===260||(version===261||(Number(version)===262||isSchema263OrLater(Number(version)))))?['human','animal','mechanical']:['human','animal']).includes(String(row.kind))||!object(row.actor)||!int(row.actor.id,1,nextId-1)||ids.has(row.actor.id)||!dense(row.items,nextId)||!dense(row.packed,nextId))return false;
  if(!validWorldPawnWitnesses261(row,version,Number(s.atCore))||!validMapExitHeader261(row,version))return false;
  if(Object.hasOwn(row,'entryKind259')&&((version!==259&&version!==260&&(version!==261&&(Number(version)!==262&&!isSchema263OrLater(Number(version)))))||row.entryKind259!=='caravan-exit'||row.originMapId===null)||Object.hasOwn(row,'heldAtCore259')&&((version!==259&&version!==260&&(version!==261&&(Number(version)!==262&&!isSchema263OrLater(Number(version)))))||!int(row.heldAtCore259,0,s.atCore)||Number(row.heldAtCore259)%10))return false;
  if((version===259||version===260||(version===261||(Number(version)===262||isSchema263OrLater(Number(version)))))&&!validSuspendedWorldPawnGoods259(row as unknown as WorldPawnOwner256,Number(s.atCore)))return false;
  if(row.kind==='mechanical'?((version!==259&&version!==260&&(version!==261&&(Number(version)!==262&&!isSchema263OrLater(Number(version)))))||!int(row.mechanicalTimersAtCore259,0,Number(row.clockCore))||Number(row.mechanicalTimersAtCore259)%10||row.items.length>0||row.packed.length>0||row.mode==='mothballed'):Object.hasOwn(row,'mechanicalTimersAtCore259'))return false;
  ids.add(row.actor.id);for(const k of ['keepForever','startingPawnLeftBehind','everColonist','destroyed','free','everSeenByPlayer'])if(Object.hasOwn(row,k)&&row[k]!==true)return false;
  if(row.destroyed&&(row.mode!=='dead'||row.items.length||row.packed.length))return false;
  if(row.free&&(row.mode==='dead'||row.destroyed||row.startingPawnLeftBehind))return false;
  if(Object.hasOwn(row,'everSeenByPlayer')&&row.kind!=='animal')return false;
  if(row.startingPawnLeftBehind&&(row.kind!=='human'||row.keepForever!==true)||row.everColonist&&row.kind!=='human'||row.mode==='active'&&row.clockCore!==s.atCore)return false;
 }
 if(Object.hasOwn(s,'discardedMechanical259')){if((version!==259&&version!==260&&(version!==261&&(Number(version)!==262&&!isSchema263OrLater(Number(version)))))||!dense(s.discardedMechanical259,nextId))return false;for(const r of s.discardedMechanical259){
  if(!object(r)||!exact(r,['id','mechKind','factionId','originMapId','enteredAtAbsCore','discardedAtCore'])||!int(r.id,1,nextId-1)||ids.has(r.id)||!isMechanoidKind(r.mechKind)||!int(r.factionId,1)||!int(r.originMapId)||!int(r.enteredAtAbsCore)||!int(r.discardedAtCore,0,Number(s.atCore))||Number(r.discardedAtCore)%10)return false;ids.add(r.id);
 }}return validPhysicalWorldPawnOrder256(s as unknown as WorldPawnsState256,nextId);
}
/** All caller-owned originals and namespaces must already be enumerated. The
 * scalar headers below are validation contexts, never local World objects. */
export function validateWorldPawnOwners256(s:WorldPawnsState256,root:Readonly<Pick<World,'schemaVersion'|'tick'|'nextId'|'planet'|'worldMaps'|'worldFactions'|'campaignMap'>>&Partial<Readonly<Pick<World,'foodPolicies'|'apparelPolicies'|'research'>>>,ids:NumericMembershipSink,projection?:CampaignMapPresentation|CampaignSummary,knownHumanIds?:ReadonlySet<number>):string[]{
 const humans=new Set(knownHumanIds);for(const row of s.owners)if(row.kind==='human')humans.add(row.actor.id);for(const row of root.worldFactions?.leaders??[])humans.add(row.pawn.id);
 const errors:string[]=[];if(!validPhysicalWorldPawnOrder256(s,root.nextId))errors.push('Native WorldPawn slots do not match actual owners');if(!isSchema256Or257(root.schemaVersion))return ['WorldPawns require prospective256'];const factions=root.worldFactions;const add=(id:number)=>{if(!int(id,1,root.nextId-1)||ids.has(id))errors.push('Duplicate or invalid WorldPawn Thing');ids.add(id);};
 for(const row of s.owners){if(row.factionId!==null&&!factions?.factions.some(f=>f.id===row.factionId))errors.push('WorldPawn actual faction foreign key refused');if(row.startingPawnLeftBehind&&row.factionId!==factions?.playerFactionId)errors.push('Left-behind starter lost actual player faction');const tick=row.clockCore/10,itemTick=(row.heldAtCore259??row.clockCore)/10,c={...row.context,tick,nextId:root.nextId,schemaVersion:root.schemaVersion,worldFactions:root.worldFactions};
  if(!validWorldPawnWitnesses261(row as unknown as Record<string,unknown>,root.schemaVersion,s.atCore))errors.push('Invalid or historical WorldPawn261 witness');
  if(row.entryKind259||row.encounterBirth261){const climate=row.context.climate;if((Number(root.schemaVersion)!==259&&Number(root.schemaVersion)!==260&&(Number(root.schemaVersion)!==261&&(Number(root.schemaVersion)!==262&&!isSchema263OrLater(Number(root.schemaVersion)))))||climate?.revision!==4)errors.push('Caravan entry lacks its actual geographic clock');else {const offset=geographicLongitudeOffsetCore256(climate.definition.longitude),born=climate.calendarOrigin*10-offset,now=(climate.calendarOrigin+root.tick-climate.adoptedAt)*10-offset;if(row.enteredAtAbsCore<born||row.enteredAtAbsCore>now)errors.push('Caravan absolute entry receipt exceeds actual origin clock');if(row.encounterBirth261&&row.enteredAtAbsCore<(climate.calendarOrigin-climate.adoptedAt)*10+row.encounterBirth261.atCore-offset)errors.push('Encounter WorldPawn entry predates its actual birth');}}
  if(row.captivity261&&(!factions?.factions.some(f=>f.id===row.captivity261!.factionId)||row.captivity261.factionId===factions?.playerFactionId))errors.push('Kidnapped WorldPawn lost its actual captor faction');
  if(row.encounterBirth261){const birth=row.encounterBirth261,planet=root.planet;
   // The group may since have entered, reformed or disappeared. Its allocated
   // historical ID remains bounded by the real planet allocator, not live FK.
   if(planet?.revision!==3||!int(birth.groupId,1,planet.nextGroupId-1)||!int(birth.tile,0,planetTileCount(planet)-1)||birth.atCore<planet.adoptedAt*10)errors.push('Encounter WorldPawn lost its actual planet/birth identity');
  }
  if(!validGroupMapContext(row.context,tick,root.schemaVersion,root))errors.push('WorldPawn actual origin context refused');
  if(row.mode==='mothballed'&&worldPawnMothballReadiness256(row)!=='yes')errors.push('Unclosed actual mothball flags');
  if(row.destroyed===true&&(row.mode!=='dead'||row.items.length||row.packed.length||deadWorldPawn256(row)))errors.push('Destroyed WorldPawn cannot invent clinical death or keep possessions');
  if((row.mode==='dead')!==terminalWorldPawn256(row))errors.push('WorldPawn terminal mode mismatch');
  if(row.free&&(terminalWorldPawn256(row)||row.startingPawnLeftBehind))errors.push('Free situation conflicts with actual terminal/starter owner');
  if(Object.hasOwn(row,'everSeenByPlayer')&&row.kind!=='animal')errors.push('Actual seen witness is currently animal-only');
  if(!validMapExitReceipt261(row,root.schemaVersion,root.tick))errors.push('Invalid actual map-exit receipt.');
  if(row.originMapId===null&&!row.startingPawnLeftBehind&&!((Number(root.schemaVersion)===261||(Number(root.schemaVersion)===262||isSchema263OrLater(Number(root.schemaVersion))))&&row.encounterBirth261))errors.push('WorldPawn missing actual origin map');
  if(row.originMapId!==null){
   const retired=root.worldMaps?.retired.find(m=>m.id===row.originMapId),proof=projection?.worldPawnOrigins?.find(m=>m.mapId===row.originMapId);
   const origin=root.worldMaps?(root.worldMaps.sites.find(m=>m.id===row.originMapId)??retired):(projection?.maps.find(m=>m.id===row.originMapId)??proof);
   if(!origin||origin.tile!==null&&row.context.site?.revision===3&&origin.tile!==row.context.site.tileId)errors.push('WorldPawn actual origin identity/tile refused');
   const retiredProof=retired&&retired.tile!==null?{mapId:retired.id,tile:retired.tile,removedAt:retired.removedAt}:proof;
   if(retired&&!retiredProof||retiredProof&&!worldPawnRetiredOriginMatches256(row,retiredProof))errors.push('WorldPawn retired origin/absolute entry provenance refused');
  }
  add(row.actor.id);if(row.kind!=='mechanical'&&!validToxicBuildupTransport256(row.actor,root.schemaVersion,tick))errors.push('Invalid actual unspawned clinical condition owner');
  if(row.kind==='animal'){
   if(!row.actor.growthTracker||(Number(root.schemaVersion)!==259&&Number(root.schemaVersion)!==260&&(Number(root.schemaVersion)!==261&&(Number(root.schemaVersion)!==262&&!isSchema263OrLater(Number(root.schemaVersion)))))&&row.actor.domestic&&row.factionId!==factions?.playerFactionId)errors.push('WorldPawn prospective animal/faction refused');
   if(!validCaravanAnimalRecord256(row.actor,{context:row.context,tick,nextId:root.nextId,version:root.schemaVersion,...row.mode==='mothballed'?{mothballedWorldPawn256:true as const}:{}}))errors.push('Invalid actual world animal');
  }else if(row.kind==='mechanical'){if(!validMechanicalWorldPawn259(row,root.schemaVersion,factions))errors.push('Invalid actual mechanical WorldPawn original/frontier/faction');}
  else {const a=row.actor;
   if(!validWorldAffiliationForeignKeys259(a,factions)||a.worldAffiliation259&&a.worldAffiliation259.factionId!==row.factionId)errors.push('WorldPawn actual faction/host differs from its same original');
   if(!validMentalShape(a.mental,root.schemaVersion,tick,c.width,c.height))errors.push('Invalid retained human mental state');
   errors.push(...validateRecreationRecordShape(a as unknown as Record<string,unknown>,root.schemaVersion,tick),...validateHumanSocial(a,root.schemaVersion,tick,humans,[]));
   if(!validSchedule(a.schedule)||!int(a.restZeroTicks,0,4500)||typeof a.collapsePending!=='boolean')errors.push('Invalid retained human schedule/exhaustion');
   if(root.foodPolicies&&!root.foodPolicies.some(p=>p.id===a.foodPolicyId))errors.push('Missing actual retained food policy');
   if(root.apparelPolicies&&((Number(root.schemaVersion)!==259&&Number(root.schemaVersion)!==260&&(Number(root.schemaVersion)!==261&&(Number(root.schemaVersion)!==262&&!isSchema263OrLater(Number(root.schemaVersion)))))||a.apparelPolicyId!==undefined||a.apparelAutomation!==undefined||a.nextApparelCheckAt!==undefined)&&(!root.apparelPolicies.some(p=>p.id===a.apparelPolicyId)||typeof a.apparelAutomation!=='boolean'||!int(a.nextApparelCheckAt,0,tick+APPAREL_POLICY_INTERVAL.max)))errors.push('Missing actual retained apparel policy');
   if(a.visitor||a.podRescue||a.raid||a.prisoner&&!((Number(root.schemaVersion)===259||Number(root.schemaVersion)===260||(Number(root.schemaVersion)===261||(Number(root.schemaVersion)===262||isSchema263OrLater(Number(root.schemaVersion)))))&&a.worldAffiliation259?.guestStatus==='Prisoner'))errors.push('WorldPawn guest HostFaction producer is not represented');if(a.jobId!==null||a.path.length||a.motion||a.moveCooldown||a.need||a.haul||a.rescue||a.animalRescue||a.medicalSleep||a.bedId!==null||a.orders.active||a.orders.queue.length)errors.push('WorldPawn retains a local task/alias');errors.push(...validateDetachedPawnRecordShape(a as unknown as Record<string,unknown>,c,root.schemaVersion,tick),...validatePawnHealthRecord(a,c,row.mode==='mothballed'));}
  const h=row.actor.health;if(h?.cryptosleepSickness?.vomit||h?.foodPoisoning?.vomit||h?.flu?.vomit||h?.immuneDiseases?.malaria?.vomit||h?.toxicBuildup?.vomit||h?.toxicBuildup?.vomitRequestedAt!==undefined)errors.push('Unspawned WorldPawn retains a physical vomit job');
  if((Number(root.schemaVersion)===259||Number(root.schemaVersion)===260||(Number(root.schemaVersion)===261||(Number(root.schemaVersion)===262||isSchema263OrLater(Number(root.schemaVersion)))))){const humans=row.kind==='human'?[row.actor]:[];errors.push(...validateEquipmentOwners259(humans,row.items),...validateApparelOwners259(humans,row.items,root.schemaVersion));}
  for(const pile of row.items){add(pile.id);if(pile.innerResource)add(pile.innerResource.id);if((Number(root.schemaVersion)===259||Number(root.schemaVersion)===260||(Number(root.schemaVersion)===261||(Number(root.schemaVersion)===262||isSchema263OrLater(Number(root.schemaVersion)))))&&pile.owner.type==='pawn')errors.push('Suspended WorldPawn retains a temporary work carry owner');errors.push(...validatePileRecordShape(pile as unknown as Record<string,unknown>,c,root.schemaVersion,itemTick));if(!('pawnId'in pile.owner)||pile.owner.pawnId!==row.actor.id||!['inventory','equipment','apparel','pawn'].includes(pile.owner.type))errors.push('WorldPawn item lost actual holder');}
  const packedIds=new Set<number>();errors.push(...validatePackedFurnitureRecords(row.packed,{...c,tick:itemTick},root.schemaVersion,packedIds));for(const id of packedIds)add(id);if((Number(root.schemaVersion)===259||Number(root.schemaVersion)===260||(Number(root.schemaVersion)===261||(Number(root.schemaVersion)===262||isSchema263OrLater(Number(root.schemaVersion)))))){errors.push(...validateGroupPackedComponents258(root as World,row.packed,root.schemaVersion,itemTick));for(const pack of row.packed){for(const id of pack.building.shelf?.cells??[])add(id);for(const bill of pack.building.bills??[])add(bill.id);}}for(const p of row.packed)if(p.owner.type==='ground'||p.owner.pawnId!==row.actor.id)errors.push('WorldPawn package lost actual holder');
 }
 errors.push(...validateHeldWorldCaskets259(s,root,ids,projection),...validateHeldPlayerCaskets271(s,root,ids,projection,humans));
 for(const receipt of s.discardedMechanical259??[]){add(receipt.id);if((Number(root.schemaVersion)!==259&&Number(root.schemaVersion)!==260&&(Number(root.schemaVersion)!==261&&(Number(root.schemaVersion)!==262&&!isSchema263OrLater(Number(root.schemaVersion)))))||!factions?.factions.some(f=>f.id===receipt.factionId&&f.def==='Mechanoid'))errors.push('Discarded mechanical receipt lost its actual faction');const retired=root.worldMaps?.retired.find(m=>m.id===receipt.originMapId),proof=projection?.worldPawnOrigins?.find(m=>m.mapId===receipt.originMapId);if(!retired&&!proof||(retired?.removedAt??proof!.removedAt)*10>receipt.discardedAtCore)errors.push('Discarded mechanical receipt lacks its real removed-map origin');
  const removedAt=retired?.removedAt??proof?.removedAt,calendar=root.worldMaps?.calendarOrigin??projection?.calendarOrigin;
  if(root.planet?.revision!==3||removedAt===undefined||calendar===undefined)errors.push('Discarded mechanical receipt lacks its actual absolute calendar');else {const home=geographicPlanetClimateDefinition256(root.planet,root.planet.homeTile),absolute=(calendar+removedAt)*10-geographicLongitudeOffsetCore256(home.longitude);if(!Number.isSafeInteger(absolute)||absolute!==receipt.enteredAtAbsCore)errors.push('Discarded mechanical receipt changed its actual absolute MapRemoved entry');}
 }
 if(projection?.worldPawnOrigins?.some(origin=>!s.owners.some(row=>row.originMapId===origin.mapId)&&!s.discardedMechanical259?.some(row=>row.originMapId===origin.mapId)&&!s.heldCaskets259?.some(row=>row.originMapId===origin.mapId)&&!s.heldPlayerCaskets271?.some(row=>row.originMapId===origin.mapId)&&!settlementMemoryUsesRetiredOrigin259(projection,origin,root.schemaVersion)&&!caravanCessionUsesRetiredOrigin261(projection,origin,root)))errors.push('Unreferenced WorldPawn retired origin metadata');
 return errors;
}
