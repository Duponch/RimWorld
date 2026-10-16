import {detachMapOwners} from './world-lost-owners.ts';
import {notifyMapLost} from './world-map-lost.ts';
import {settlementLimit} from './world-map-options.ts';
import {captureHumanOwners} from './human-owners.ts';
import {captureLocalMap,sharedCampaignData} from './world-map-context.ts';
import type {World,CommandResult,Pawn,MaterialPile} from './types.ts';
import type {CampaignState,CampaignSummary,CampaignMapSummary,MapAction,WorldMapCommand,WorldMapKind,CampaignGroupSummary} from './world-map-state.ts';
import {registeredCampaign,registeredMap,registeredMapId,registeredMaps,selectedRegisteredMap,brandGroupProjection,worldGroupContext,hasLoadedRoot,boundWorldGroup,flushRegisteredMap,promoteRootMap,clearRootMap} from './world-map-context.ts';
import {isColonist,activeThreat} from './affiliation.ts';
import {captureGroupMass} from './group-capture.ts';
import {freightGroup} from './group-freight.ts';
import {dropRetainingIdentity} from './ground-placement.ts';
import {captureCivilianReturnFinder} from './civilian-return.ts';
import {captureStandability} from './furniture-travel.ts';
import {draftSite} from './secondary-site.ts';
import {refreshStock} from './materials.ts';
import {ensureFilth} from './filth-rules.ts';
const ok:MapAction={ok:true},no=(reason:string):MapAction=>({ok:false,reason}),fail=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
const own=(p:MaterialPile,id:number)=>'pawnId' in p.owner&&p.owner.pawnId===id&&['inventory','equipment','apparel','pawn'].includes(p.owner.type);
export function campaignLog(root:CampaignState,message:string):void {const events=root.worldGroups!.events;events.push({tick:root.tick,type:'command',message});if(events.length>80)events.splice(0,events.length-80);}
function settlementAt(root:CampaignState,tile:number):boolean {return tile===root.planet?.civilianTile||!!root.worldMaps?.sites.some(s=>s.kind==='settlement'&&s.tile===tile);}
export function settlementTileAction(root:CampaignState,tile:number,existingId?:number):MapAction {
 const planet=root.planet,t=planet?.tiles[tile];if(!t||t.biome==='ocean')return no('Cette tuile ne permet pas une implantation.');
 if(t.hilliness==='mountainous')return no('La génération montagneuse de cette révision reste indisponible.');
 if(root.worldMaps!.sites.filter(s=>s.kind==='settlement').length>=settlementLimit(root))return no('Le nombre maximal de colonies est atteint.');
 if(settlementAt(root,tile)&&!root.worldMaps!.sites.some(s=>s.id===existingId&&s.kind!=='settlement'))return no('Une implantation occupe cette tuile.');
 if(t.neighbours.some(id=>settlementAt(root,id)))return no('Une implantation voisine empêche de s’installer ici.');
 if(root.worldMaps!.retired.some(s=>s.tile===tile&&(s.markerUntilCore===undefined||s.markerUntilCore>root.tick*10)))return no('Le marqueur d’un site abandonné occupe encore cette tuile.');
 return ok;
}
export function mapActions(input:CampaignState,id:number):CampaignMapSummary['actions'] {
 const root=registeredCampaign(input),record=root.worldMaps?.sites.find(s=>s.id===id),map=record?registeredMap(root,id):undefined;
 if(!record||!map){const missing=no('Cette carte n’existe plus.');return {view:missing,settle:missing,abandon:missing};}
 let settle=record.kind==='settlement'?no('Ce site est déjà une colonie.'):record.tile===null?no('Aucune tuile mondiale confirmée.'):settlementTileAction(root,record.tile,id);
 if(settle.ok&&!map.pawns.some(p=>isColonist(p)&&!p.prisoner&&p.state!=='dead'))settle=no('Un colon libre doit être présent sur la carte.');
 if(settle.ok&&(map.pawns.some(p=>p.faction==='outlaws'&&!p.prisoner&&activeThreat(p))||(map.mechanoids??[]).some(m=>!['dead','downed'].includes(m.state))||(map.wildlife?.animals??[]).some(a=>a.manhunter&&a.state!=='dead'&&a.state!=='downed')))settle=no('Terminez la menace active avant de vous installer.');
 const legacy=registeredMaps(root).some(m=>!!m.scout&&'pawn' in m.scout&&m.scout.pawn.state!=='dead'||!!m.commercialTrip&&'pawn' in m.commercialTrip&&m.commercialTrip.pawn.state!=='dead')||root.worldGroups!.legacyTravellers.some(r=>!!r.scout&&'pawn' in r.scout&&r.scout.pawn.state!=='dead'||!!r.commercialTrip&&'pawn' in r.commercialTrip&&r.commercialTrip.pawn.state!=='dead');
 const caravan=legacy||root.worldGroups!.groups.some(g=>'members' in g.state&&g.state.members.some(p=>isColonist(p)&&p.state!=='dead'));
 const elsewhere=registeredMaps(root).some(other=>registeredMapId(other)!==id&&other.pawns.some(p=>isColonist(p)&&!p.prisoner&&p.state!=='dead'));
 return {view:ok,settle,abandon:caravan||elsewhere?ok:no('Conservez une caravane ou un colon libre sur une autre carte avant d’abandonner.')};
}
export function mapChoices(input:CampaignState):CampaignMapSummary[] {const root=registeredCampaign(input);return (root.worldMaps?.sites??[]).map(record=>{const map=registeredMap(root,record.id)!;return {id:record.id,tile:record.tile,kind:record.kind,createdAt:record.createdAt,pawnCount:map.pawns.length,selected:root.worldMaps!.selectedMapId===record.id,actions:mapActions(root,record.id),abandonConsequences:{pawns:map.pawns.filter(p=>isColonist(p)&&p.state!=='dead').map(p=>({id:p.id,name:p.name})),groundItems:map.piles.filter(p=>p.owner.type==='ground').reduce((n,p)=>n+p.quantity,0),structures:map.structures.length}};});}
export function groupEntryActions(input:CampaignState|CampaignSummary,groupId:number):Record<'visit'|'camp'|'settle',MapAction> {
 if(!('worldMaps' in input)||!input.worldMaps){const rows='campaignMap' in input&&input.campaignMap?.revision===2?input.campaignMap.groups:(input as CampaignSummary).groups;const row=rows?.find(g=>g.id===groupId);return row?.entryActions??{visit:no('Aucun groupe confirmé.'),camp:no('Aucun groupe confirmé.'),settle:no('Aucun groupe confirmé.')};}
 const root=registeredCampaign(input as CampaignState),g=root.worldGroups!.groups.find(g=>g.state.id===groupId)?.state;
 const unavailable=no('Faites réellement arriver le groupe avant d’entrer.');if(!g||!('members' in g)||!['at-site','awaiting-entry'].includes(g.phase)||g.segment||g.tile!==g.destination)return {visit:unavailable,camp:unavailable,settle:unavailable};
 const existing=root.worldMaps!.sites.find(s=>s.tile===g.tile),tile=root.planet?.tiles[g.tile];let empty=tile&&tile.biome!=='ocean'&&tile.hilliness!=='mountainous'&&g.tile!==root.planet!.civilianTile?ok:no('Ce terrain n’est pas une entrée locale disponible.');
 if(root.worldMaps!.retired.some(s=>s.tile===g.tile&&(s.markerUntilCore===undefined||s.markerUntilCore>root.tick*10)))empty=no('Un objet mondial abandonné occupe cette tuile.');
 return {visit:existing?ok:no('Aucune carte ou site existant à visiter.'),camp:existing?no('Une carte existe déjà sur cette tuile.'):empty,settle:existing?no('Entrez puis utilisez S’installer sur cette carte.'):empty.ok?settlementTileAction(root,g.tile):empty};
}
export function groupChoices(root:CampaignState):CampaignGroupSummary[] {return root.worldGroups!.groups.map(record=>{const g=record.state,map=record.localMapId===null?undefined:registeredMap(root,record.localMapId),ids='members' in g?g.members.map(p=>p.id):g.memberIds,members='members' in g?g.members:map?.pawns.filter(p=>ids.includes(p.id))??[],items='members' in g?g.items:map?.piles.filter(p=>'pawnId' in p.owner&&ids.includes(p.owner.pawnId))??[],mass=captureGroupMass(members,items,freightGroup(g));return {id:g.id,originMapId:record.originMapId,localMapId:record.localMapId,phase:g.phase,originTile:root.worldMaps!.sites.find(s=>s.id===record.originMapId)?.tile??root.worldMaps!.retired.find(s=>s.id===record.originMapId)?.tile??null,filthPresent:!!worldGroupContext(root,g.id)?.filth||root.worldGroups!.abandonedContents.find(a=>a.mapId===record.originMapId)?.filthPresent===true,tile:'tile' in g?g.tile:root.worldMaps!.sites.find(s=>s.id===record.localMapId)?.tile??null,memberIds:ids,mass:mass?{grams:mass.grams,capacityGrams:mass.capacityGrams}:null,state:g,...worldGroupContext(root,g.id)?.civilianPost?{postId:record.postId??root.worldGroups!.canonicalPostId!,post:worldGroupContext(root,g.id)!.civilianPost}:{},context:record.context,entryActions:groupEntryActions(root,g.id)};});}
/** Public read-only group façade, including the no-map/globe state. */
export function groupWorld(input:World|CampaignSummary,id:number|null):World|undefined {
 if('worldMaps' in input&&input.worldMaps&&id!==null)return worldGroupContext(input,id);
 const summary='maps' in input?input as CampaignSummary:input.campaignMap?.revision===2?{...input,...input.campaignMap} as unknown as CampaignSummary:undefined;
 if(!summary)return input as World;const row=id===null?undefined:summary.groups.find(g=>g.id===id);if(id!==null&&!row)return;
 const source='tiles' in input&&Array.isArray(input.tiles)&&summary.activeMapId!==null?input as World:undefined;
 const view={...source,...summary,...row?.context,seed:row?.context.seed??summary.campaignSeed,width:row?.context.width??summary.mapSize.width,height:row?.context.height??summary.mapSize.height,pawns:source?.pawns??[],piles:source?.piles??[],packed:source?.packed??[],jobs:source?.jobs??[],resources:source?.resources??[],structures:source?.structures??[],stockpiles:source?.stockpiles??[],tiles:source?.tiles??[],...row?{group:row.state,...row.post?{civilianPost:row.post}:{}}:{},campaignPeople:summary.people??('campaignPeople' in input?input.campaignPeople:undefined),groupLosses:summary.groupLosses} as World;
 const owned=new Set(view.pawns.map(p=>p.id));if(view.group&&'members'in view.group)for(const p of view.group.members)owned.add(p.id);for(const loss of view.groupLosses??[])owned.add(loss.pawn.id);view.campaignPeople=view.campaignPeople?.filter(p=>!owned.has(p.id));if(row)brandGroupProjection(view,{originMapId:row.originMapId,localMapId:row.localMapId,context:row.context,state:row.state},row.originTile,row.filthPresent);return view;
}
function inventoryDropPlan(map:World):MaterialPile[]|undefined {const view={...map,piles:map.piles.map(p=>({...p,owner:{...p.owner}}))};for(const pile of view.piles)if(pile.owner.type==='inventory'){const ownerId=pile.owner.pawnId,pawn=map.pawns.find(p=>p.id===ownerId);if(!pawn||!isColonist(pawn)&&!pawn.visitor)continue;if(!dropRetainingIdentity(view,pile,pawn))return;}return view.piles;}
export function settleRegisteredMap(root:CampaignState,id:number):CommandResult {const permission=mapActions(root,id).settle;if(!permission.ok)return fail(permission.reason!);const map=registeredMap(root,id)!,record=root.worldMaps!.sites.find(s=>s.id===id)!,planned=inventoryDropPlan(map);if(!planned)return fail('Le sol ne permet pas de déposer tous les inventaires.');for(let i=0;i<planned.length;i++)map.piles[i]!.owner=planned[i]!.owner;record.kind='settlement';refreshStock(map);flushRegisteredMap(map);campaignLog(root,'Le camp devient une colonie, avec sa carte, ses habitants et ses biens réels.');return {ok:true};}
/** Centre entry for genuinely new Camp/Settle; no terrain or resource is cleared. */
function centreEntries(map:World,count:number):{x:number;z:number}[]|undefined {const stand=captureStandability(map),result:{x:number;z:number}[]=[],cx=Math.floor(map.width/2),cz=Math.floor(map.height/2),used=new Set(map.pawns.map(p=>p.z*map.width+p.x));for(let r=0;r<Math.max(map.width,map.height);r++)for(let z=Math.max(0,cz-r);z<=Math.min(map.height-1,cz+r);z++)for(let x=Math.max(0,cx-r);x<=Math.min(map.width-1,cx+r);x++){if(Math.max(Math.abs(x-cx),Math.abs(z-cz))!==r||used.has(z*map.width+x)||!stand({x,z}))continue;used.add(z*map.width+x);result.push({x,z});if(result.length===count)return result;}return;}
export function enterRegisteredSite(root:CampaignState,groupId:number,mode:'visit'|'camp'|'settle',select=true):CommandResult {
 const permission=groupEntryActions(root,groupId)[mode];if(!permission.ok)return fail(permission.reason!);const record=root.worldGroups!.groups.find(g=>g.state.id===groupId)!,g=record.state;if(!('members' in g))return fail('Le groupe ne possède pas de voyageurs.');
 let site=root.worldMaps!.sites.find(s=>s.tile===g.tile),draft:ReturnType<typeof draftSite>|undefined,newSite=!site;
 if(!site){if(!Number.isSafeInteger(root.worldMaps!.nextMapId+1))return fail('Le registre des cartes est plein.');const context=worldGroupContext(root,groupId)!;context.seed=root.worldMaps!.campaignSeed;context.width=mode==='camp'?200:root.worldMaps!.mapSize.width;context.height=mode==='camp'?200:root.worldMaps!.mapSize.height;draft=draftSite(context,g.tile);if(!draft)return fail('La génération de cette tuile est refusée.');site={id:root.worldMaps!.nextMapId,tile:g.tile,kind:mode==='camp'?'camp':'settlement',createdAt:root.tick,map:draft.site.map,visit:null};}
 const map=site.id===root.worldMaps!.rootMapId?root as World:site.map?{...site.map,...sharedCampaignData(root)} as World:undefined;if(!map||map.pawns.length+g.members.length>map.width*map.height||map.piles.length+g.items.length>32768)return fail('La carte ne peut accueillir tous les voyageurs et leurs biens.');
 const used=new Set<number>(),find=captureCivilianReturnFinder(map),positions=newSite?centreEntries(map,g.members.length):g.members.map(()=>{const p=find(g.entry,c=>!used.has(c.z*map.width+c.x));if(p)used.add(p.z*map.width+p.x);return p;});if(!positions||positions.some(p=>!p))return fail('Aucun accès réel n’accueille le groupe complet.');
 const staging={...map,pawns:[...map.pawns,...g.members.map((p,i)=>({...p,...positions[i]!}))],piles:[...map.piles,...g.items]};const drop=mode==='settle'?inventoryDropPlan(staging):undefined;if(mode==='settle'&&!drop)return fail('Le sol ne permet pas de déposer les inventaires.');
 if(newSite){root.worldMaps!.sites.push(site);root.worldMaps!.nextMapId++;root.nextId=draft!.nextId;}
 const actual=registeredMap(root,site.id)!;
 for(let i=0;i<g.members.length;i++){const p=g.members[i]!;Object.assign(p,positions[i]!);p.path=[];p.moveCooldown=0;p.planCooldown=0;delete p.motion;delete p.allowedAreaId;if(p.state!=='downed')p.state='idle';}
 actual.pawns.push(...g.members);actual.piles.push(...g.items);if(drop)for(let i=0;i<drop.length;i++)actual.piles[i]!.owner=drop[i]!.owner;
 const pending=g.items.filter(p=>p.owner.type==='inventory').map(p=>p.id);if(!newSite&&site.kind==='settlement'&&pending.length){record.localMapId=site.id;record.context={seed:actual.seed,width:actual.width,height:actual.height,...actual.climate?{climate:actual.climate}:{},...actual.site?{site:actual.site}:{},...actual.scenario?{scenario:actual.scenario}:{}};record.state={id:g.id,startedAt:g.startedAt,destination:g.destination,ledger:g.ledger,...g.originTile!==undefined?{originTile:g.originTile}:{},...g.provisions?{provisions:g.provisions}:{},...g.freight?{freight:g.freight}:{},phase:'unloading',memberIds:g.members.map(p=>p.id),pendingPileIds:pending};}else{root.worldGroups!.groups=root.worldGroups!.groups.filter(row=>row!==record);if(root.worldGroups!.selectedGroupId===groupId)root.worldGroups!.selectedGroupId=null;}if(select)root.worldMaps!.selectedMapId=site.id;
 ensureFilth(actual);refreshStock(actual);flushRegisteredMap(actual);if(root.worldMaps!.rootMapId===null)promoteRootMap(root,site.id);
 campaignLog(root,mode==='camp'?'Le groupe établit un camp temporaire et conserve ses inventaires.':mode==='settle'?'Le groupe fonde une colonie sur sa nouvelle carte.':'Le groupe entre sur la carte existante avec ses biens.');return {ok:true};
}

/** An explicit map removal never credits the surviving colony or caravan. */
export function abandonRegisteredMap(root:CampaignState,id:number,confirm:boolean,automatic=false):CommandResult {
 const record=root.worldMaps!.sites.find(s=>s.id===id),map=record?registeredMap(root,id):undefined;if(!record||!map||record.tile===null)return fail('Carte absente ou tuile inconnue.');
 const permission=mapActions(root,id).abandon;if(!automatic&&!permission.ok)return fail(permission.reason!);
 const affected=map.pawns.filter(p=>isColonist(p)&&p.state!=='dead');if(!automatic&&affected.length&&!confirm)return fail('Confirmez les personnes réellement laissées sur cette carte.');
 notifyMapLost(root,map,id,record.kind==='settlement'&&!root.worldMaps!.sites.some(s=>s.id!==id&&s.kind==='settlement'));
 const registry=root.worldGroups!,compact=detachMapOwners(map,id,record.tile);
 if(map.scout&&'pawn' in map.scout||map.commercialTrip&&'pawn' in map.commercialTrip){registry.legacyTravellers.push({originMapId:id,...record.postId!==undefined?{postId:record.postId}:{},context:{seed:map.seed,width:map.width,height:map.height,...map.climate?{climate:map.climate}:{},...map.site?{site:map.site}:{},...map.scenario?{scenario:map.scenario}:{}},...map.scout&&'pawn' in map.scout?{scout:map.scout}:{},...map.commercialTrip&&'pawn' in map.commercialTrip?{commercialTrip:map.commercialTrip}:{}});delete map.scout;delete map.commercialTrip;}
 registry.abandonedContents.push(compact);
 registry.groups=registry.groups.filter(g=>g.localMapId!==id);if(registry.selectedGroupId!==null&&!registry.groups.some(g=>g.state.id===registry.selectedGroupId))registry.selectedGroupId=null;
 const maps=root.worldMaps!,wasSelected=maps.selectedMapId===id,wasRoot=maps.rootMapId===id;
 if(wasRoot){const other=maps.sites.filter(s=>s.id!==id).sort((a,b)=>a.id-b.id)[0];if(other)promoteRootMap(root,other.id);else clearRootMap(root);}
 maps.sites=maps.sites.filter(s=>s.id!==id);maps.retired.push({id:record.id,tile:record.tile,kind:record.kind,createdAt:record.createdAt,removedAt:root.tick,reason:automatic?'camp-empty':'abandon',...record.kind==='camp'?{markerUntilCore:root.tick*10+1800000}:{}});if(wasSelected)maps.selectedMapId=maps.sites.slice().sort((a,b)=>a.id-b.id)[0]?.id??null;
 campaignLog(root,automatic?'Le camp vide est retiré. Les biens laissés ne sont pas récupérés.':'La carte est abandonnée. Les personnes restantes sont perdues au monde, leurs biens ne reviennent pas au stock.');return {ok:true};
}
const dataCommand=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
export function validWorldMapCommand(v:unknown):v is WorldMapCommand {
 if(!dataCommand(v))return false;const keys=Reflect.ownKeys(v),exact=(names:string[])=>keys.length===names.length&&names.every(k=>Object.hasOwn(v,k)),id=(x:unknown)=>Number.isSafeInteger(x)&&Number(x)>=0;
 if(v.type==='map-view')return exact(['type','mapId'])&&(v.mapId===null||id(v.mapId));
 if(v.type==='map-settle')return exact(['type','mapId'])&&id(v.mapId);
 if(v.type==='map-abandon')return exact(['type','mapId','confirm'])&&id(v.mapId)&&typeof v.confirm==='boolean';
 if(v.type==='group-select')return exact(['type','groupId'])&&(v.groupId===null||Number.isSafeInteger(v.groupId)&&Number(v.groupId)>=1);
 return v.type==='group-enter'&&exact(['type','groupId','mode'])&&Number.isSafeInteger(v.groupId)&&Number(v.groupId)>=1&&typeof v.mode==='string'&&['visit','camp','settle'].includes(v.mode);
}
export function applyWorldMapCommand(input:CampaignState,command:WorldMapCommand):CommandResult {
 if(!validWorldMapCommand(command))return fail('Commande de carte invalide.');const root=registeredCampaign(input);if(root.schemaVersion<255||!root.worldMaps||!root.worldGroups)return fail('Le registre de cartes n’est pas disponible.');
 switch(command.type){
  case 'map-view':if(command.mapId!==null&&!registeredMap(root,command.mapId))return fail('Carte absente.');root.worldMaps.selectedMapId=command.mapId;return {ok:true};
  case 'map-settle':return settleRegisteredMap(root,command.mapId);
  case 'map-abandon':return abandonRegisteredMap(root,command.mapId,command.confirm);
  case 'group-select':if(command.groupId!==null&&!root.worldGroups.groups.some(g=>g.state.id===command.groupId))return fail('Groupe absent.');root.worldGroups.selectedGroupId=command.groupId;return {ok:true};
  case 'group-enter':return enterRegisteredSite(root,command.groupId,command.mode);
 }
}
/** Temporary maps do not expire after four days. A living colonist, including downed, blocks removal. */
export function removeEmptyCamps(root:CampaignState):void {for(const site of root.worldMaps!.sites.slice().sort((a,b)=>a.id-b.id)){if(site.kind!=='camp')continue;const map=registeredMap(root,site.id)!;if(map.pawns.some(p=>isColonist(p)&&p.state!=='dead')||map.startingArrival&&map.startingArrival.phase!=='opened')continue;abandonRegisteredMap(root,site.id,true,true);}}
