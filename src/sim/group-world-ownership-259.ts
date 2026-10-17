import type {World,Pawn,MaterialPile} from './types.ts';
import type {AwayGroup} from './group-capture.ts';
import type {GroupMemberOrigin} from './group-reorganization-state.ts';
import type {WildAnimal} from './wildlife-state.ts';
import type {WorldPawnOwner256} from './world-pawn-state-256.ts';
import {registeredCampaign,registeredMapId} from './world-map-context.ts';
import {actualCampRemovalAbsCore256} from './world-pawn-map-removed-256.ts';
import {validGeographicSiteClimate256} from './site-climate-save.ts';
import {geographicPlanetClimateDefinition256,geographicLongitudeOffsetCore256} from './site-climate.ts';
import {prospectiveHuman259} from './group-human-admission-259.ts';
import {validWorldAffiliationForeignKeys259} from './world-affiliation-259.ts';
import {worldPawnActiveBoundary256} from './world-pawn-life-256.ts';
import {prepareWorldPawnEntryEffects256} from './world-pawn-transition-256.ts';
import {suspendWorldPawnGoods259} from './world-pawn-held-259.ts';
import {cancelWorldPawnGC256} from './world-pawn-gc-256.ts';
import {nativeWorldPawnOrderCurrent256,commitNativeWorldPawnOrder256} from './world-pawn-native-order-256.ts';
import {passNativeWorldPawnOrder256} from './native-world-pawn-order-256.ts';
import {groupPlayerOwner256} from './group-route-interval-256.ts';
/** Read-only arithmetic on an admitted displayed-map projection. This returns
 * no entry receipt or authority; true exit/removal still require worldMaps. */
function projectedExitClock259(w:World):{absolute:number;mapId:number} {
 const m=w.campaignMap,c=w.climate,p=w.planet;
 if((Number(w.schemaVersion)!==259&&w.schemaVersion!==260)||Object.hasOwn(w,'worldMaps')||Object.hasOwn(w,'worldGroups')||m?.revision!==2||!Number.isSafeInteger(w.tick)||w.tick<0||m.activeMapId===null||!Number.isSafeInteger(m.activeMapId)||m.activeMapId<0||!Number.isSafeInteger(m.calendarOrigin)||p?.revision!==3||c?.revision!==4||w.site?.revision!==3||w.seed!==(w.site.mapSeed>>>0)||c.tileId!==w.site.tileId)throw Error('Missing confirmed local projection clock');
 const active=m.maps.find(row=>row.id===m.activeMapId);
 if(!active||active.tile!==c.tileId||!validGeographicSiteClimate256(c,w.schemaVersion,w))throw Error('Projected local climate differs from its actual map/anchor');
 const local=(c.calendarOrigin+w.tick-c.adoptedAt)*10-geographicLongitudeOffsetCore256(c.definition.longitude),home=geographicPlanetClimateDefinition256(p,p.homeTile),shared=(m.calendarOrigin!+w.tick)*10-geographicLongitudeOffsetCore256(home.longitude);
 if(!Number.isSafeInteger(local)||local<0||local!==shared)throw Error('Projected absolute clock differs from its confirmed campaign anchor');
 return {absolute:local,mapId:m.activeMapId};
}
/** Future loss is preflightable at the true new formation, rather than
 * discovering missing faction/holder authority after the last Owner died. */
export function groupExitAuthorityReason259(w:World,members:readonly Pawn[],items:readonly MaterialPile[],animals:readonly WildAnimal[]=[]):string|undefined {
 if(!prospectiveHuman259(w))return;
 const root=registeredCampaign(w),state=root.worldPawns!,factions=root.worldFactions!;
 if(!Object.isExtensible(state.owners)||!Object.getOwnPropertyDescriptor(state.owners,'length')?.writable||!nativeWorldPawnOrderCurrent256(state,state.nativeOrder))return 'L’ordre WorldPawns réel n’est pas disponible pour ce départ.';
 let abs:number,mapId:number;try{if(root.worldMaps){abs=actualCampRemovalAbsCore256(root,w);mapId=registeredMapId(w)!;}else{const projected=projectedExitClock259(w);abs=projected.absolute;mapId=projected.mapId;}}catch{return 'Cette sortie exige l’horloge géographique absolue réellement détenue.';}
 const context={seed:w.seed,width:w.width,height:w.height,...w.climate?{climate:w.climate}:{},...w.site?{site:w.site}:{},...w.scenario?{scenario:w.scenario}:{}};
 for(const p of members){if(!validWorldAffiliationForeignKeys259(p,factions)||p.prisoner&&!p.worldAffiliation259)return 'Le captif historique ne possède pas de preuve de faction et d’hôte ; aucun statut n’est reconstruit.';
  if(p.originQuestId!==undefined||p.podRescue)return 'Terminez le mandat local ou de quête avant ce départ mondial.';
  const row:WorldPawnOwner256={kind:'human',actor:p,factionId:(p.worldAffiliation259?p.worldAffiliation259.factionId:factions.playerFactionId),originMapId:mapId,context,clockCore:w.tick*10,enteredAtAbsCore:abs,mode:'active',items:structuredClone(items.filter(i=>'pawnId'in i.owner&&i.owner.pawnId===p.id)),packed:structuredClone(w.packed.filter(i=>i.owner.type==='inventory'&&i.owner.pawnId===p.id))};
  suspendWorldPawnGoods259(row,w.tick*10);const boundary=worldPawnActiveBoundary256(row,259);if(boundary)return boundary;
 }
 for(const a of animals){if(!a.growthTracker)return 'L’animal historique ne possède pas de vrai propriétaire prospectif complet.';const row:WorldPawnOwner256={kind:'animal',actor:a,factionId:a.domestic?factions.playerFactionId:null,originMapId:mapId,context,clockCore:w.tick*10,enteredAtAbsCore:abs,mode:'active',items:structuredClone(items.filter(i=>'pawnId'in i.owner&&i.owner.pawnId===a.id)),packed:structuredClone(w.packed.filter(i=>i.owner.type==='inventory'&&i.owner.pawnId===a.id))};suspendWorldPawnGoods259(row,w.tick*10);const boundary=worldPawnActiveBoundary256(row,259);if(boundary)return boundary;}
}
/** TRUE local exit. Entry effects are prepared without creating/removing a
 * synthetic WorldPawn registry membership. CaravanMember never auto-tends,
 * reaffiliates or ClearMind; the real clinical owner stays this caravan. */
export function captureCaravanEntry259(w:World,g:AwayGroup):number|undefined {
 if(w.schemaVersion<259||g.admission?.revision!==2)return;
 const root=registeredCampaign(w),factions=root.worldFactions;if(!factions||!root.worldPawns)throw Error('Missing actual prospective entry owner');
 const abs=actualCampRemovalAbsCore256(root,w),mapId=registeredMapId(w);if(mapId===undefined)throw Error('Actual exit map absent');
 const context={seed:w.seed,width:w.width,height:w.height,...w.climate?{climate:w.climate}:{},...w.site?{site:w.site}:{},...w.scenario?{scenario:w.scenario}:{}};
 for(const p of [...g.members,...g.animalOwners?.members??[]]){
  const common={originMapId:mapId,context,clockCore:w.tick*10,enteredAtAbsCore:abs,mode:'active' as const,items:[],packed:[]};
  const row:WorldPawnOwner256='species'in p?{...common,kind:'animal',actor:p,factionId:p.domestic?factions.playerFactionId:null}:{...common,kind:'human',actor:p,factionId:(p.worldAffiliation259?p.worldAffiliation259.factionId:factions.playerFactionId)};
  const effects=prepareWorldPawnEntryEffects256(row,w.tick*10,factions,{float(){throw Error('CaravanMember must not draw faction RNG');}},{version:259,situation:'CaravanMember'});if(!effects.ok)throw Error(effects.reason);
  // For the supported CaravanMember contract all owned fields stay literal.
  if(JSON.stringify(effects.row.actor)!==JSON.stringify(p))throw Error('CaravanMember entry unexpectedly changed its true original');
 }
 return abs;
}
/** Called only AFTER a real clinical death removed the last IsOwner. No
 * Notify_PassedToWorld, ClearMind, auto-tend, faction choice, guest reset or
 * reconstructed entry date is executed here. Base AbandonedAtTile callbacks
 * on the supported inventory Things have no mutation; possessions stay held. */
export function transferOwnerlessCaravan259(w:World,g:AwayGroup,animalPersonalTick:number):boolean {
 if(w.schemaVersion<259||g.admission?.revision!==2||g.members.some(groupPlayerOwner256))return false;
 const root=registeredCampaign(w),state=root.worldPawns,factions=root.worldFactions;if(!state||!factions||!nativeWorldPawnOrderCurrent256(state,state.nativeOrder))throw Error('Lost real prospective WorldPawn owner');
 const now=w.tick*10,rows:WorldPawnOwner256[]=[];
 const add=(actor:Pawn|NonNullable<AwayGroup['animalOwners']>['members'][number],origin:GroupMemberOrigin|undefined,clock:number)=>{
  if(!origin||!Number.isSafeInteger(origin.enteredAtAbsCore))throw Error('Missing TRUE CaravanMember entry receipt; never reconstruct it');
  const items=g.items.filter(p=>'pawnId'in p.owner&&p.owner.pawnId===actor.id),packed=(g.packed??[]).filter(p=>p.owner.type!=='ground'&&p.owner.pawnId===actor.id);
  const common={originMapId:origin.originMapId,context:origin.context,enteredAtAbsCore:origin.enteredAtAbsCore!,entryKind259:'caravan-exit' as const,clockCore:clock*10,mode:'active' as const,free:true as const,items,packed};
  const row:WorldPawnOwner256='species'in actor?{...common,kind:'animal',actor,factionId:actor.domestic?factions.playerFactionId:null}:{...common,kind:'human',actor,factionId:actor.worldAffiliation259!.factionId};
  if(state.owners.some(r=>r.actor===actor||r.actor.id===actor.id))throw Error('Surviving original already owned by WorldPawns');
  // Seal only at commit below; preparation must not mutate a real held pile.
  const preview={...row,items:structuredClone(items),packed:structuredClone(packed)};suspendWorldPawnGoods259(preview,now);const boundary=worldPawnActiveBoundary256(preview,259,now);if(boundary)throw Error(boundary);rows.push(row);
 };
 for(const p of g.members){if(p.state==='dead'||p.health?.death)throw Error('Terminal human not removed before exclusive survivor transfer');if(!p.worldAffiliation259||!validWorldAffiliationForeignKeys259(p,factions))throw Error('Lost actual survivor faction/host');add(p,g.reorganization?.memberOrigins.find(o=>o.pawnId===p.id),w.tick);}
 for(const a of g.animalOwners?.members??[]){if(a.state==='dead'||a.health?.death)throw Error('Terminal animal not retired before exclusive survivor transfer');add(a,g.animalOwners!.origins.find(o=>o.pawnId===a.id),animalPersonalTick);}
 const before=state.nativeOrder;let after=before;for(const r of rows)if(after)after=passNativeWorldPawnOrder256(after,r.actor.id,false);
 cancelWorldPawnGC256(state);for(const row of rows){suspendWorldPawnGoods259(row,now);state.owners.push(row);}commitNativeWorldPawnOrder256(state,before,after);
 g.members=[];g.items=[];delete g.packed;if(g.animalOwners){g.animalOwners.members=[];g.animalOwners.origins=[];g.animalOwners.order=[];}delete w.group;return true;
}
