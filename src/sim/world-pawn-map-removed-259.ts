import {GEOGRAPHIC_FAUNA_PROFILE_256} from './geographic-fauna-profile-256.ts';
import type {ReformDeparture260} from './group-reform-departure-260.ts';
export type {ReformDeparture260} from './group-reform-departure-260.ts';
import {prepareReformRemovalAreas260} from './group-reform-removal-areas-260.ts';
import {brandHeldCasketRemoval259,prepareHeldCasketRemoval259} from './world-pawn-casket-259.ts';
import {areaRemovalWrites259,removalWritesApplied259,removalWritesMutable259,sealRemovalOriginal259} from './map-removal-writes-259.ts';
import {prepareRemovedMapBeds256} from './actor-bed-transition-256.ts';
import {heldCasketLivingIds259} from './world-pawn-casket-membership-259.ts';
import {passNativeWorldPawnOrder256} from './native-world-pawn-order-256.ts';
import {isAncientCasket256,ancientCasketHasContents256} from './ancient-casket-state-256.ts';
import {isColonist} from './affiliation.ts';
import type {Mechanoid} from './mechanoid-state.ts';
import {cleanMapRemovedMechanical259} from './world-pawn-mechanical-259.ts';
import {validMechanicalWorldFaction259} from './mechanoid-world-faction-259.ts';
import {validMechanoidShape} from './mechanoid-save.ts';
import type {Pawn,World} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';
import type {CampaignState,AbandonedMapContents} from './world-map-state.ts';
import type {CampMapRemoved256} from './world-pawn-map-removed-256.ts';
import {actualCampRemovalAbsCore256} from './world-pawn-map-removed-256.ts';
import {registeredCampaign,registeredMapId,registeredMap} from './world-map-context.ts';
import {captureHumanOwners} from './human-owners.ts';
import {captureDuckMapRemovedOwners256} from './duck-owner-capture-256.ts';
import {cleanMapRemovedAnimal256,cleanMapRemovedHumanRecord259,hasMapRemovalJob259} from './world-lost-owners.ts';
import {clearReleasedPawnAssignments259,planPawnDrops,planReformRemainingDrops260} from './work-release.ts';
import {finishRoomRest,rememberRoomUse} from './room-experience.ts';
import {releaseAllowedAreaReturn} from './allowed-area-state.ts';
import {cancelAutomaticCombat} from './automatic-combat-state.ts';
import {cancelHunting} from './hunting-state.ts';
import {unclaimDetachedActorBed256} from './actor-map-bed-256.ts';
import {prepareRemovedMapAreas,removedMapAreasCurrent,commitRemovedMapAreas} from './pawn-map-areas.ts';
import {cancelCryptosleepVomit256} from './cryptosleep-sickness-256.ts';
import {cancelToxicVomit256} from './toxic-buildup-256.ts';
import {validWorldAffiliationForeignKeys259} from './world-affiliation-259.ts';
import {WORLD_FACTION_TECH_LEVEL_259} from './world-faction-catalog.ts';
import {preparePassedToWorld256,type WorldPawnFactionCondition256} from './world-pawn-transition-256.ts';
import {worldPawnActiveBoundary256} from './world-pawn-life-256.ts';
import {suspendWorldPawnGoods259} from './world-pawn-held-259.ts';
import {plainWorldPawnData256,validateWorldPawnOwners256} from './world-pawn-save-256.ts';
import {mutableWorldPawnOriginal256,type WorldPawnOwner256,type WorldPawnsState256} from './world-pawn-state-256.ts';
import {nativeWorldPawnOrderCurrent256,commitNativeWorldPawnOrder256} from './world-pawn-native-order-256.ts';
import {cancelWorldPawnGC256} from './world-pawn-gc-256.ts';
import {healthRandom} from './health.ts';
const alive=(a:Pawn|WildAnimal)=>a.state!=='dead'&&!a.health?.death;
/** Preparation touches only a private original record and read-only real-map
 * observations. Cross-actor surgery/carry/rope notifiers refuse beforehand. */
function cleanHumanDraft(map:World,p:Pawn,area:ReturnType<typeof prepareRemovedMapAreas>['updates'][number]|undefined):Pawn {
 const draft=structuredClone(p);if(draft.motion&&draft.motion.end>map.tick){draft.x=draft.motion.from.x;draft.z=draft.motion.from.z;}delete draft.motion;draft.path=[];draft.moveCooldown=0;
 if(draft.health){cancelCryptosleepVomit256(draft.health);cancelToxicVomit256(draft.health);}
 if(area?.next)draft.mapAreas=structuredClone(area.next);
 releaseAllowedAreaReturn(draft);finishRoomRest(map,draft);
 const task=draft.recreation.task;if((task?.activity==='horseshoes'||task?.activity==='chess'||task?.activity==='watch-television')&&task.phase==='active'&&task.elapsed>0)rememberRoomUse(map,draft,'recreation');
 cancelAutomaticCombat(draft);cancelHunting(draft);draft.orders.queue=[];clearReleasedPawnAssignments259(draft);cleanMapRemovedHumanRecord259(draft,map.tick);unclaimDetachedActorBed256(draft);return draft;
}
/** Actual259 MapRemoved, including a final home. Historical missing actor or
 * lifecycle authority refuses BEFORE memories, cleanup, clocks or RNG change. */
export function prepareMapRemoved259(input:CampaignState,map:World,mapId:number,automatic:boolean,departure?:ReformDeparture260):CampMapRemoved256 {
 const root=registeredCampaign(input),no=(reason:string):CampMapRemoved256=>({ok:false,reason}),site=root.worldMaps?.sites.find(s=>s.id===mapId);
 if((Number(root.schemaVersion)!==259&&Number(root.schemaVersion)!==260&&(Number(root.schemaVersion)!==261&&(Number(root.schemaVersion)!==262&&Number(root.schemaVersion)!==263)))||!site||registeredCampaign(map)!==root||registeredMapId(map)!==mapId||registeredMap(root,mapId)!==map||map.tick!==root.tick)return no('Le retrait doit viser sa vraie carte actuelle.');
 // One capture: local physical slots plus knowledge of the actual humans in
 // the campaign. Remembered interlocutors may already be in a true caravan.
 const humans=captureHumanOwners(map),captures=humans.slots.filter(s=>s.kind==='map'&&s.pawn&&alive(s.pawn)&&!departure?.ids.has(s.pawn.id));
 const lostColonists=captures.map(s=>s.pawn!).filter(p=>isColonist(p)&&!p.prisoner&&!p.visitor&&p.state!=='dead');
 const animals=[...(map.wildlife?.animals??[]).filter(alive).map(animal=>({animal,clock:map.tick})),...captureDuckMapRemovedOwners256(map)].filter(r=>!departure?.ids.has(r.animal.id));
 const mechanical=map.mechanoids??[];
 if(!departure&&!captures.length&&!animals.length&&!mechanical.length&&!map.structures.some(c=>isAncientCasket256(c)&&ancientCasketHasContents256(c.casket)))return {ok:true,current:()=>true,commit(){}};
 const state=root.worldPawns,factions=root.worldFactions;if(!state||!factions)return no('Les propriétaires WorldPawns et factions réellement nés manquent ; aucun passé n’est créé.');
 const mechanicalExtras=Object.getOwnPropertyDescriptor(map.raids??{},'extraMechActive261');
 if(mechanicalExtras&&!mechanicalExtras.configurable)return no('Le vrai propriétaire des cohortes mécaniques ne permet pas son retrait.');
 const mechanicalExtrasRef=map.raids?.extraMechActive261,mechanicalExtrasRows=mechanicalExtrasRef?.slice(),mechanicalExtrasValue=JSON.stringify(mechanicalExtrasRef);
 const mechanicalExtrasCurrent=()=>{const d=Object.getOwnPropertyDescriptor(map.raids??{},'extraMechActive261');return mechanicalExtras?!!d&&d.configurable===true&&Object.hasOwn(d,'value')&&d.value===mechanicalExtrasRef&&JSON.stringify(d.value)===mechanicalExtrasValue&&mechanicalExtrasRef!.length===mechanicalExtrasRows!.length&&mechanicalExtrasRef!.every((g,i)=>g===mechanicalExtrasRows![i]):d===undefined;};
 const nativeBefore=state.nativeOrder,now=root.tick*10,at=state.atCore;
 if(!Object.isExtensible(state.owners)||!Object.getOwnPropertyDescriptor(state.owners,'length')?.writable)return no('Le vrai registre WorldPawns n’est pas mutable.');
 if(map.pawns.some(p=>!departure?.ids.has(p.id)&&(p.surgery||p.rescue||p.raid?.kidnap261||p.animalRescue||p.animalHandling?.kind==='lead')))return no('Terminez le soin, portage ou cordage physique entre originaux avant ce retrait de carte.');
 if(!nativeWorldPawnOrderCurrent256(state,nativeBefore)||at!==now&&!(automatic&&at+10===now))return no('La frontière réelle WorldPawns/carte ne permet pas ce retrait.');
 let absolute:number;try{absolute=actualCampRemovalAbsCore256(root,map);}catch(e){return no(e instanceof Error?e.message:String(e));}
 if(root.worldFactions?.settlements.some(s=>s.tile===site.tile&&s.factionId!==factions.playerFactionId)&&captures.some(s=>s.pawn!.worldAffiliation259?.factionId===factions.playerFactionId))return no('Le vrai destinataire du kidnapping sur carte-parent hostile manque ; la carte est conservée.');
 for(const s of captures){const p=s.pawn!;
  if(s.kind!=='map'||!p.worldAffiliation259||!validWorldAffiliationForeignKeys259(p,factions))return no('La personne historique ou contenue ne possède pas sa vraie faction/hôte de sortie ; aucun dossier n’est reconstruit.');
  if(p.originQuestId!==undefined||p.podRescue)return no('Le mandat réel de quête/secours doit être résolu avant le retrait de la carte.');
  if(!hasMapRemovalJob259(p)&&(map.piles.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)||map.packed.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)))return no('Déposez la cargaison interrompue avant ce retrait : son vrai holder ne peut pas être omis.');
  if(p.surgery||p.rescue||p.raid?.kidnap261||p.animalRescue||p.animalHandling?.kind==='lead')return no('Terminez le soin, portage ou cordage physique entre originaux avant ce retrait de carte.');
  if(!mutableWorldPawnOriginal256(p)||p.health&&p.health.tick!==map.tick)return no('Le retrait exige l’original humain mutable à son horloge réelle.');
 }
 for(const m of mechanical){if(!plainWorldPawnData256(m)||!mutableWorldPawnOriginal256(m)||!m.worldFaction259||!validMechanicalWorldFaction259(m,root.schemaVersion,factions)||!validMechanoidShape(m,root.schemaVersion,map.tick))return no('Le mécanique historique ou sa vraie faction/frontière de sortie manque ; aucun dossier n’est reconstruit.');if(map.piles.some(i=>'pawnId'in i.owner&&i.owner.pawnId===m.id)||map.packed.some(p=>p.owner.type!=='ground'&&p.owner.pawnId===m.id))return no('Le vrai holder mécanique de ces biens n’est pas représenté.');}
 if(mechanical.length&&(!Object.getOwnPropertyDescriptor(map,'mechanoids')?.writable||map.raids?.mechActive&&!Object.getOwnPropertyDescriptor(map.raids,'mechActive')?.configurable))return no('Le propriétaire mécanique local n’est pas mutable.');
 const areaIds=new Set((map.allowedAreas??[]).map(a=>a.id)),areaPlan=departure?prepareReformRemovalAreas260(root,mapId,areaIds,departure):prepareRemovedMapAreas(root,mapId,areaIds),areaByPawn=new Map(areaPlan.updates.map(u=>[u.pawn,u]));
 const dropping=new Set(map.pawns.filter(p=>!departure?.ids.has(p.id)&&hasMapRemovalJob259(p)).map(p=>p.id)),dropPlan=departure?planReformRemainingDrops260(map,dropping,departure):planPawnDrops(map,dropping);if(!dropPlan)return no('Les cargaisons de travail réellement déposées par le retrait n’ont pas de place.');
 const dropEntries=[...dropPlan].map(([id,cell])=>({id,cell,x:cell.x,z:cell.z})),dropsCurrent=()=>dropPlan.size===dropEntries.length&&dropEntries.every(r=>dropPlan.get(r.id)===r.cell&&r.cell.x===r.x&&r.cell.z===r.z);
 const areaWrites=areaRemovalWrites259(areaPlan),areaDefinitions=map.allowedAreas,areaDefinitionSeal:(stage:0|1|2)=>boolean=areaDefinitions?sealRemovalOriginal259(areaDefinitions,[],[]):()=>true;let bedPlan:ReturnType<typeof prepareRemovedMapBeds256>;
 try{bedPlan=prepareRemovedMapBeds256(root,map,mapId,new Set(dropPlan.keys()),departure);}catch(e){return no(e instanceof Error?e.message:String(e));}
 const bedWrites=bedPlan?.removalWrites259??[],recipientsMutable=()=>removalWritesMutable259(areaWrites)&&removalWritesMutable259(bedWrites);
 if(!recipientsMutable())return no('Les références d’aires/lits à retirer ne sont pas mutables.');
 const context={seed:map.seed,width:map.width,height:map.height,...map.climate?{climate:map.climate}:{},...map.site?{site:map.site}:{},...map.scenario?{scenario:map.scenario}:{}};
 const conditions:WorldPawnFactionCondition256[]=[];
 for(const f of factions.factions)if(f.lifecycle259)conditions.push({factionId:f.id,defeated:f.lifecycle259.defeated,temporary:f.lifecycle259.temporary,techLevel:WORLD_FACTION_TECH_LEVEL_259[f.def]});
 const randomState={rng:root.rng},random={float:(min:number,max:number)=>min+(max-min)*healthRandom(randomState)},staged:WorldPawnsState256={...state,atCore:now,owners:state.owners.slice()};
 type Prepared={original:Pawn|WildAnimal|Mechanoid;kind:'human'|'animal'|'mechanical';outcome:WorldPawnOwner256;cleaned:string;items:World['piles'];packed:World['packed']};
 const prepared:Prepared[]=[],ids=new Set<number>();
 const add=(original:Pawn|WildAnimal|Mechanoid,kind:'human'|'animal'|'mechanical',actor:Pawn|WildAnimal|Mechanoid,factionId:number|null)=>{
  if(ids.has(original.id)||!mutableWorldPawnOriginal256(original)||state.owners.some(r=>r.actor.id===original.id))throw Error('Duplicate or nonmutable actual MapRemoved original');ids.add(original.id);
  const items=map.piles.filter(i=>'pawnId'in i.owner&&i.owner.pawnId===original.id&&i.owner.type!=='pawn'&&departure?.items.get(i.id)!==null),packed=map.packed.filter(p=>p.owner.type==='inventory'&&p.owner.pawnId===original.id&&!departure?.packedIds.has(p.building.id));
  const common={factionId,originMapId:mapId,context,clockCore:now,enteredAtAbsCore:absolute,mode:'active' as const,items:structuredClone(items.map(i=>departure?.items.get(i.id)??i)),packed:structuredClone(packed)};
  const row:WorldPawnOwner256=kind==='human'?{...common,kind,actor:actor as Pawn}:kind==='animal'?{...common,kind,actor:actor as WildAnimal,...map.wildlife?.profile===GEOGRAPHIC_FAUNA_PROFILE_256&&map.wildlife.animals.includes(original as WildAnimal)?{everSeenByPlayer:true as const}:{}}:{...common,kind,actor:actor as Mechanoid,mechanicalTimersAtCore259:now,mode:actor.state==='dead'||actor.health?.death?'dead':'active'};suspendWorldPawnGoods259(row,now);
  const boundary=worldPawnActiveBoundary256(row,root.schemaVersion);if(boundary)throw Error(boundary);
  const cleaned=JSON.stringify(actor);const pass=preparePassedToWorld256(staged,row,factions,random,{version:root.schemaVersion,situation:'Free',conditions});if(!pass.ok)throw Error(pass.reason);pass.commit();prepared.push({original,kind,outcome:pass.row,cleaned,items,packed});
 };
 try{
  for(const s of captures){const p=s.pawn!;const actor=cleanHumanDraft(map,p,areaByPawn.get(p));add(p,'human',actor,actor.worldAffiliation259!.factionId);}
  for(const {animal:a,clock} of animals){if(clock!==map.tick||!a.growthTracker||!a.wander)throw Error('L’animal restant n’a pas sa vraie horloge ou son propriétaire prospectif complet.');const actor=structuredClone(a);cleanMapRemovedAnimal256(actor,map.tick);unclaimDetachedActorBed256(actor);add(a,'animal',actor,a.domestic?factions.playerFactionId:null);}
   for(const m of mechanical){const actor=structuredClone(m);cleanMapRemovedMechanical259(actor,map.tick);add(m,'mechanical',actor,m.worldFaction259!.factionId);}
 }catch(e){return no(e instanceof Error?e.message:String(e));}
 let held:ReturnType<typeof prepareHeldCasketRemoval259>;try{held=prepareHeldCasketRemoval259(root,map,mapId,absolute,areaWrites,bedWrites);}catch(e){return no(e instanceof Error?e.message:String(e));}
 if(held.records.length){staged.heldCaskets259=[...state.heldCaskets259??[],...held.records];if(staged.nativeOrder)for(const id of heldCasketLivingIds259({ ...state,heldCaskets259:held.records }))staged.nativeOrder=passNativeWorldPawnOrder256(staged.nativeOrder,id,false);}
 const errors=validateWorldPawnOwners256(staged,root,new Set(),undefined,new Set(humans.people.keys()));if(errors.length)return no(errors[0]!);
 if(lostColonists.some(p=>!prepared.some(row=>row.kind==='human'&&row.original===p)))return no('A lost colonist has no actual staged human transfer');
 const rng=root.rng,nextId=root.nextId,owners=state.owners.slice(),before=prepared.map(p=>JSON.stringify(p.original)),heldBefore=prepared.map(p=>JSON.stringify([p.items,p.packed])),beforePawns=map.pawns.slice(),beforeAnimals=map.wildlife?.animals.slice(),beforeFlyers=map.wildlife?.flyers?.slice(),beforeMechs=mechanical.slice();let used=false;
 const sourceSeals=prepared.map(p=>sealRemovalOriginal259(p.original,areaWrites,bedWrites)),areaSourceSeals=areaPlan.updates.filter(u=>!departure?.ids.has(u.pawn.id)).map(u=>sealRemovalOriginal259(u.pawn,areaWrites,bedWrites));let phase:'prepared'|'begun'|'departed'|'areas'|'beds'='prepared',departed=false;
 const departureSeal=departure?.seal(),departureAreasSeal=departure?.seal(areaWrites);
 const afterPawns=beforePawns.filter(p=>!departure?.ids.has(p.id)),afterAnimals=beforeAnimals?.filter(a=>!departure?.ids.has(a.id)),heldAfter=prepared.map(p=>JSON.stringify([p.items.map(i=>departure?.items.get(i.id)??i),p.packed]));
 const header=()=>!used&&recipientsMutable()&&held.current()&&(map.mechanoids?.length??0)===beforeMechs.length&&!map.mechanoids?.some((m,i)=>m!==beforeMechs[i])&&root.tick*10===now&&root.rng===rng&&root.nextId===(departed?departure!.nextId:nextId)&&root.worldPawns===state&&state.atCore===at&&nativeWorldPawnOrderCurrent256(state,nativeBefore)&&state.owners.length===owners.length&&state.owners.every((r,i)=>r===owners[i])&&prepared.every((p,i)=>JSON.stringify([p.items,p.packed])===(departed?heldAfter[i]:heldBefore[i]))&&map.wildlife?.animals.length===(departed?afterAnimals:beforeAnimals)?.length&&!map.wildlife?.animals.some((a,i)=>a!==(departed?afterAnimals:beforeAnimals)![i])&&map.wildlife?.flyers?.length===beforeFlyers?.length&&!map.wildlife?.flyers?.some((a,i)=>a!==beforeFlyers![i]);
 const rosterCurrent=()=>map.pawns.length===(departed?afterPawns:beforePawns).length&&map.pawns.every((p,i)=>p===(departed?afterPawns:beforePawns)[i]);
 const areaDefinitionsCurrent=()=>map.allowedAreas===areaDefinitions&&areaDefinitionSeal(0);
 const initialCurrent=()=>mechanicalExtrasCurrent()&&dropsCurrent()&&header()&&rosterCurrent()&&areaDefinitionsCurrent()&&(departure?departure.current()&&departureAreasSeal!(0):removedMapAreasCurrent(areaPlan))&&(bedPlan?.current?.()??true)&&sourceSeals.every(check=>check(0))&&areaSourceSeals.every(check=>check(0))&&prepared.every((p,i)=>JSON.stringify(p.original)===before[i]);
 const departureCurrent=()=>!!departure&&dropsCurrent()&&header()&&rosterCurrent()&&areaDefinitionsCurrent()&&departureSeal!(1)&&sourceSeals.every(check=>check(0))&&areaSourceSeals.every(check=>check(0));
 const detachCurrent=()=>phase==='areas'&&header()&&rosterCurrent()&&areaDefinitionsCurrent()&&(!departure||departureAreasSeal!(1))&&removalWritesApplied259(areaWrites)&&sourceSeals.every(check=>check(1))&&areaSourceSeals.every(check=>check(1));
 const plan:CampMapRemoved256={ok:true,current:()=>phase==='prepared'&&initialCurrent(),commit(compact:AbandonedMapContents){
  if(phase!=='beds'||!header()||!removalWritesApplied259(areaWrites)||!removalWritesApplied259(bedWrites)||compact.mapId!==mapId||compact.removedAt!==root.tick||Object.hasOwn(compact,'lostColonistIds259'))throw Error('Stale actual259 MapRemoved transaction');
  for(const p of prepared){const count=p.kind==='human'?compact.humans.filter(h=>h.pawn===p.original).length:p.kind==='animal'?compact.animals.filter(a=>a.animal===p.original).length:map.mechanoids?.filter(m=>m===p.original).length;if(count!==1||JSON.stringify(p.original)!==p.cleaned)throw Error('Actual MapRemoved cleanup differs from its admitted original');}
  used=true;cancelWorldPawnGC256(state);held.commit();
  for(const p of prepared){const original=p.original,history=p.kind==='human'?(original as Pawn).prisonerHistory259:undefined;for(const k of Object.keys(original))delete (original as unknown as Record<string,unknown>)[k];Object.assign(original,p.outcome.actor);if(history)(original as Pawn).prisonerHistory259=history;if(p.outcome.kind==='human')p.outcome.actor=original as Pawn;else if(p.outcome.kind==='animal')p.outcome.actor=original as WildAnimal;else p.outcome.actor=original as Mechanoid;p.outcome.items=p.items;p.outcome.packed=p.packed;suspendWorldPawnGoods259(p.outcome,now);state.owners.push(p.outcome);}
  commitNativeWorldPawnOrder256(state,nativeBefore,staged.nativeOrder);root.rng=randomState.rng;
  if(lostColonists.length)compact.lostColonistIds259=lostColonists.map(p=>p.id);
  const moved=new Set(prepared.map(p=>p.original));compact.humans=compact.humans.filter(h=>!h.pawn||!moved.has(h.pawn));compact.animals=compact.animals.filter(a=>!moved.has(a.animal));map.pawns=map.pawns.filter(p=>!moved.has(p));if(map.mechanoids)map.mechanoids=map.mechanoids.filter(m=>!moved.has(m));if(map.wildlife){map.wildlife.animals=map.wildlife.animals.filter(a=>!moved.has(a));if(map.wildlife.flyers)map.wildlife.flyers=map.wildlife.flyers.filter(a=>!moved.has(a.animal));}
 }};
 return brandHeldCasketRemoval259(plan,map,detachCurrent,()=>{
  // Consumed while every true source is still unchanged, before Reform writes.
  if(!plan.ok||!plan.current())throw Error('Stale actual MapRemoved begin');phase='begun';
  return {...departure?{drops260:dropPlan}:{},departed260(){if(!departure||phase!=='begun')throw Error('Unexpected Reform departure phase');departed=true;phase='departed';if(!departureCurrent())throw Error('Unexpected admitted Reform departure');},
   areas(){if(departure?phase!=='departed'||!departureCurrent():phase!=='begun'||!initialCurrent())throw Error('Stale MapRemoved before area commit');commitRemovedMapAreas(areaPlan);held.confirmAreas();phase='areas';if(!detachCurrent())throw Error('Unexpected MapRemoved area result');},
   beds(){if(phase!=='areas'||!header()||!removalWritesApplied259(areaWrites))throw Error('Stale MapRemoved before bed commit');bedPlan?.commit();held.confirmBeds();phase='beds';if(!header()||!removalWritesApplied259(bedWrites))throw Error('Unexpected MapRemoved bed result');}};
 },()=>plan.ok&&plan.current());
}
