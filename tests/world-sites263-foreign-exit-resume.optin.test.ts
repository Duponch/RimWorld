import {test,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {registeredMap} from '../src/sim/world-map-context';
import {registeredMapPresentation} from '../src/sim/world-map-presentation';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {decodeStoredSave} from '../src/ui/save-storage-codec';
import * as retreat from '../src/sim/caravan-player-retreat-261';
import * as lifecycle from '../src/sim/world-target-lifecycle-263';
import {groupInventoryVector,groupNetEffects,groupReorganizationBalance} from '../src/sim/group-reorganization-balance';
import {runtime415} from './helpers/reform-v260-fixture';
import {writeTestFileSync} from './test-output';
import {SCHEMA_VERSION,type World,type Pawn,type MaterialPile,type Command} from '../src/sim/types';
import type {CampaignState} from '../src/sim/world-map-state';
import type {AwayGroup} from '../src/sim/group-capture';

const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
function admitted(root:CampaignState):asserts root is World {
 if(Number(root.schemaVersion)!==263||!('pawns'in root)||root.planet?.revision!==3||!root.worldMaps||!root.worldGroups||!root.worldFactions||!root.worldPawns)throw Error('Actual complete263 campaign required');
 expect(validateWorld(root)).toEqual([]);
}
function restored(raw:string){const root=deserializeCampaign(raw);admitted(root);return root;}
const inventory=(items:readonly MaterialPile[])=>groupInventoryVector(items);
const held=(p:MaterialPile,ids:ReadonlySet<number>)=>'pawnId'in p.owner&&ids.has(p.owner.pawnId);

/** Resume ONLY acquired RED checkpoint afce... at6807 after the real7 exit.
 * No first exit, entry, reformation, source closure or favourable replay. The7
 * identity witness begins at THIS exact restoration; only8's future real exit
 * and the real MapRemoved boundary are observed. At most250 ordinary ticks. */
test.skipIf(process.env.WORLD_SITES263_FOREIGN_EXIT_RESUME_SIM!=='1')('actual6807 first-exit checkpoint: only8 exits and JOINs7, real retirement, paused exact reload',async()=>{
 expect(SCHEMA_VERSION).toBe(263);
 const input=process.env.WORLD_SITES263_FOREIGN_EXIT_RESUME_INPUT,inputSHA=process.env.WORLD_SITES263_FOREIGN_EXIT_RESUME_INPUT_SHA256;
 if(!input||inputSHA!=='afce7fe4f03f58389032e1d1e3de8b4e9a612bd52ebafa6c2a8ba453ddaf6b70')throw Error('Only the acquired6807 RED raw afce... is allowed; no entry/first-exit/reformation replay');
 const bytes=readFileSync(input,'utf8');expect(sha(bytes)).toBe(inputSHA);const raw=await decodeStoredSave(bytes);
 let root=restored(raw);expect(root.tick).toBe(6807);expect(serializeCampaign(root)).toBe(raw);
 const maps=root.worldMaps!,mapId=maps.selectedMapId!,header=maps.sites.find(s=>s.id===mapId),target=header?.target263;
 if(header?.kind!=='foreign-settlement'||target?.kind!=='foreign-settlement'||target.destroyedSiteId!==undefined||header.battlefield261||header.campPressure)throw Error('Actual selected foreign parent required, without Camp/Battlefield/Destroyed alias');
 const map=registeredMap(root,mapId),settlement=root.worldFactions!.settlements.find(s=>s.id===target.settlementId);
 if(!map||header.tile===null||!settlement?.attack263||settlement.attack263.mapId!==mapId||settlement.factionId!==target.factionId)throw Error('Actual physical foreign map and settlement binding required');
 expect(map.miscIncidents).toBeUndefined();expect(map.smallIncidents).toBeUndefined();expect(map.fluIncidents).toBeDefined();
 if(root.worldGroups!.groups.length!==1||root.worldGroups!.groups.some(g=>g.pending261||g.pendingEntry263))throw Error('Exact checkpoint must retain only the already exited7 owner');
 const firstRecord=root.worldGroups!.groups[0]!;if(firstRecord.state.id!==2||firstRecord.originMapId!==mapId||firstRecord.localMapId!==null||!('members'in firstRecord.state)||firstRecord.state.phase!=='stationary'||firstRecord.state.members.length!==1||firstRecord.state.members[0]!.id!==7||firstRecord.retreat261?.autoJoinable!==true)throw Error('Acquired first escape owner changed');
 const firstState=firstRecord.state,openingItems=firstState.items.slice(),openingPacked=firstState.packed?.slice()??[],openingVector=structuredClone(inventory(firstState.items)),openingEffects=structuredClone(groupNetEffects(firstState)),openingOrigins=structuredClone(firstState.reorganization?.memberOrigins??[]);if(openingOrigins.length!==1||openingOrigins[0]!.enteredAtAbsCore!==2838070)throw Error('The acquired7 origin receipt changed');
 expect(target.retained).toEqual({passStory:false,next:null,destination:null});
 const players=[firstState.members[0],map.pawns.find(p=>p.id===8)];if(players.some(p=>!p||p.state==='dead'||p.state==='downed'||p.health?.death)||map.pawns.some(p=>p.id===7))throw Error('Checkpoint must retain7 away and8 genuinely on map');
 const foreign=map.pawns.filter(p=>p.worldAffiliation259?.factionId===target.factionId&&p.id!==7&&p.id!==8);
 if(!foreign.length||foreign.some(p=>p.state==='dead'||p.health?.death)||map.structures.some(s=>s.casket))throw Error('This bounded live-defender/building witness requires actual alive foreign originals and no occupied-casket extension');
 const foreignIds=foreign.map(p=>p.id),initialPositions=players.map(p=>({id:p!.id,x:p!.x,z:p!.z})),tile=header.tile,sourceTick=root.tick,attackBefore=structuredClone(settlement.attack263);
 const run=runtime415(root);
 const checkpoint=(label:string,extra:object={})=>{const name=`artifacts/world-sites263-foreign-exit-resume/${label}-RAW.json`;writeTestFileSync(name,JSON.stringify(root));admitted(root);const saved=serializeCampaign(root);writeTestFileSync(name,saved);writeTestFileSync(name.replace(/-RAW\.json$/,'-receipt.json'),JSON.stringify({input,inputSHA256:inputSHA,sha256:sha(saved),mapId,tile,tick:root.tick,...extra},null,2));return saved;};
 const command=(c:Command)=>{const result=applyCommand(root,c,run);if(!result.ok){checkpoint('actual-command-refused',{command:c,reason:result.reason});throw Error(result.reason??'Actual command refused');}};
 const away=(id:number)=>{const record=root.worldGroups!.groups.find(r=>r.state.id===id);if(!record||record.localMapId!==null||!('members'in record.state))throw Error('Actual away owner missing');return {record,g:record.state};};
 type Exit={id:number;targetId:number|undefined;members:Pawn[];items:MaterialPile[];packed:NonNullable<AwayGroup['packed']>;vector:ReturnType<typeof inventory>;effects:ReturnType<typeof groupNetEffects>;origins:NonNullable<AwayGroup['reorganization']>['memberOrigins'];cells:{id:number;x:number;z:number}[]};
 const exits:Exit[]=[];
 const observed:{removal?:{tick:number;people:Pawn[];items:MaterialPile[];quantities:number[];packed:NonNullable<AwayGroup['packed']>;structures:number;resources:number}}={};
 const prepareExit=retreat.preparePlayerRetreatDeparture261,prepareRemoval=lifecycle.prepareWorldTargetMapRemoval263;
 const exitSpy=vi.spyOn(retreat,'preparePlayerRetreatDeparture261').mockImplementation((...args:Parameters<typeof prepareExit>)=>{
  const plan=prepareExit(...args);if(plan.ok&&plan.current()&&args[1].members.some(p=>p.id===7||p.id===8)){
   const next=plan.next;if(!exits.some(e=>e.id===next.id)){
    for(const p of next.members)expect(p.x===0||p.z===0||p.x===map.width-1||p.z===map.height-1).toBe(true);
    if(!next.reorganization)throw Error('Actual physical origin receipts required');
    exits.push({id:next.id,targetId:plan.targetId,members:next.members.slice(),items:next.items.slice(),packed:next.packed?.slice()??[],vector:structuredClone(inventory(next.items)),effects:structuredClone(groupNetEffects(next)),origins:structuredClone(next.reorganization.memberOrigins),cells:next.members.map(p=>({id:p.id,x:p.x,z:p.z}))});
   }
  }return plan;
 });
 const removalSpy=vi.spyOn(lifecycle,'prepareWorldTargetMapRemoval263').mockImplementation((...args:Parameters<typeof prepareRemoval>)=>{
  const plan=prepareRemoval(...args);if(args[1].id===mapId&&plan&&plan.current()){
   const actual=registeredMap(root,mapId);if(!actual)throw Error('True removal body missing');
   expect(actual.miscIncidents).toBeUndefined();expect(actual.smallIncidents).toBeUndefined();expect(actual.fluIncidents).toBeDefined();
   const people=actual.pawns.filter(p=>foreignIds.includes(p.id));expect(people.map(p=>p.id).sort((a,b)=>a-b)).toEqual([...foreignIds].sort((a,b)=>a-b));
   expect(people.every(p=>p.state!=='dead'&&!p.health?.death)).toBe(true);
   const items=actual.piles.filter(p=>held(p,new Set(foreignIds))&&p.owner.type!=='pawn');
   const packed=actual.packed.filter(p=>p.owner.type==='inventory'&&foreignIds.includes(p.owner.pawnId));
   observed.removal={tick:root.tick,people:people.slice(),items:items.slice(),quantities:items.map(p=>p.quantity),packed:packed.slice(),structures:actual.structures.length,resources:actual.resources.length};
  }return plan;
 });
 try{
  checkpoint('00-acquired6807-first-exit-retained',{initialPositions,foreignIds,sourceTick,opening7:'Reference/values begin at this exact RAW restoration, not at the former exit call'});
  const encoderAtOpening=new SnapshotEncoder(),decoderAtOpening=new SnapshotDecoder();for(const kind of ['checkpoint','delta']as const){const packet=structuredClone(encoderAtOpening.encode(root,0,0));expect(packet.kind).toBe(kind);const adopted=decoderAtOpening.adopt(packet);expect(adopted.status).toBe('applied');if(adopted.status!=='applied')throw Error('Actual6807 retained stationary transport refused');expect(adopted.world).toEqual(registeredMapPresentation(root));expect(serializeCampaign(root)).toBe(raw);}
  const firstId=firstRecord.state.id;
  const first=away(firstId);expect(first.g.members.map(p=>p.id)).toEqual([7]);expect(first.g.members[0]).toBe(players[0]);expect(first.record.originMapId).toBe(mapId);expect(first.record.retreat261).toEqual({revision:1,autoJoinable:true});expect(first.g.tile).toBe(tile);
  expect(registeredMap(root,mapId)!.pawns).toContain(players[1]);expect(registeredMap(root,mapId)!.pawns).not.toContain(players[0]);expect(header.target263).toEqual({...target,retained:{passStory:false,next:null,destination:null}});
  command({type:'group-pause',groupId:firstId,paused:true});
  const secondId=root.planet!.nextGroupId,keptRoute=structuredClone({destination:first.g.destination,route:first.g.route,segment:first.g.segment,story:first.record.story261});
  command({type:'group-start',retreat261:true,originMapId:mapId,memberIds:[8],sources:[],destination:tile});
  for(let n=0;n<250&&root.worldMaps!.sites.some(s=>s.id===mapId);n++)stepWorld(root,1,undefined,run);
  checkpoint('02-second-exit-and-removal-or-refusal',{firstId,secondId});
  expect(root.worldMaps!.sites.some(s=>s.id===mapId)).toBe(false);expect(root.worldGroups!.groups.some(r=>r.state.id===secondId)).toBe(false);
  const joined=away(firstId);expect(joined.g.members.map(p=>p.id).sort((a,b)=>a-b)).toEqual([7,8]);for(const p of players)expect(joined.g.members).toContain(p);
  expect(joined.g.paused).toBe(true);expect(joined.g.tile).toBe(tile);expect(joined.g.segment).toBeNull();expect({destination:joined.g.destination,route:joined.g.route,segment:joined.g.segment,story:joined.record.story261}).toEqual(keptRoute);
  expect(exits).toHaveLength(1);expect(exits.map(e=>e.members.map(p=>p.id))).toEqual([[8]]);
  expect(exits.map(e=>e.targetId)).toEqual([firstId]);
  for(const origin of openingOrigins)expect(joined.g.reorganization?.memberOrigins).toContainEqual(origin);
  for(const exit of exits)for(const origin of exit.origins){expect(origin.originMapId).toBe(mapId);expect(joined.g.reorganization?.memberOrigins).toContainEqual(origin);expect(origin.enteredAtAbsCore).toEqual(expect.any(Number));}
  expect(joined.g.reorganization).toBeDefined();expect(groupReorganizationBalance(joined.g,joined.g.reorganization!,root.worldGroups!.losses)).toBe(true);
  const vector=inventory(joined.g.items),effects=groupNetEffects(joined.g),keys=new Set([...Object.keys(vector),...Object.keys(effects),...Object.keys(openingVector),...Object.keys(openingEffects),...exits.flatMap(e=>[...Object.keys(e.vector),...Object.keys(e.effects)])]);
  for(const item of keys){const key=item as keyof typeof vector;expect(vector[key]??0).toBe((openingVector[key]??0)-(openingEffects[key]??0)+exits.reduce((n,e)=>n+(e.vector[key]??0)-(e.effects[key]??0),0)+(effects[key]??0));}
  for(const p of joined.g.items)if(exits.some(e=>e.items.some(q=>q.id===p.id)))expect(exits.flatMap(e=>e.items).find(q=>q.id===p.id)).toBe(p);
  for(const p of openingItems)if(joined.g.items.some(q=>q.id===p.id))expect(joined.g.items.find(q=>q.id===p.id)).toBe(p);
  expect(joined.g.packed??[]).toHaveLength(openingPacked.length+exits.reduce((n,e)=>n+e.packed.length,0));for(const p of [...openingPacked,...exits.flatMap(e=>e.packed)])expect(joined.g.packed).toContain(p);
  const removal=observed.removal;if(!removal)throw Error('Actual MapRemoved boundary was never reached; preserve the checkpoint, no manual deletion');
  const removed=root.worldMaps!.retired.find(s=>s.id===mapId);expect(removed).toMatchObject({kind:'foreign-settlement',tile,reason:'abandon',removedAt:removal.tick});expect(Object.hasOwn(removed!,'markerUntilCore')).toBe(false);
  const actualSettlement=root.worldFactions!.settlements.find(s=>s.id===target.settlementId);expect(actualSettlement).toBe(settlement);
  const retainedForeignIds=new Set(root.worldPawns!.owners.filter(r=>r.kind==='human'&&r.factionId===target.factionId).map(r=>r.actor.id));
  expect(actualSettlement!.attack263).toEqual({...attackBefore,mapId:null,cooldownUntilCore:removal.tick*10+60000,inhabitantIds:attackBefore.inhabitantIds.filter(id=>retainedForeignIds.has(id))});
  expect(root.worldSites263!.entries.some(s=>s.kind==='destroyed-settlement'&&s.sourceSettlementId===settlement.id)).toBe(false);
  for(const p of removal.people){const rows=root.worldPawns!.owners.filter(r=>r.actor.id===p.id);expect(rows).toHaveLength(1);expect(rows[0]!.actor).toBe(p);expect(rows[0]!.originMapId).toBe(mapId);expect(rows[0]!.factionId).toBe(target.factionId);expect(root.worldGroups!.abandonedContents.flatMap(a=>a.humans).some(h=>h.id===p.id)).toBe(false);}
  for(const [i,p]of removal.items.entries()){const row=root.worldPawns!.owners.find(r=>r.items.some(q=>q.id===p.id));expect(row?.items.find(q=>q.id===p.id)).toBe(p);expect(p.quantity).toBe(removal.quantities[i]);expect(joined.g.items.some(q=>q.id===p.id)).toBe(false);}
  for(const p of removal.packed){const row=root.worldPawns!.owners.find(r=>r.packed.some(q=>q.building.id===p.building.id));expect(row?.packed.find(q=>q.building.id===p.building.id)).toBe(p);expect(joined.g.packed?.some(q=>q.building.id===p.building.id)??false).toBe(false);}
  const lost=root.worldGroups!.abandonedContents.find(a=>a.mapId===mapId);expect(lost?.lost.structures).toBe(removal.structures);expect(lost?.lost.resources).toBe(removal.resources);for(const id of [7,8])expect(root.worldPawns!.owners.some(r=>r.actor.id===id)).toBe(false);
  command({type:'group-pause',groupId:firstId,paused:true});const finalTick=root.tick,final=checkpoint('03-paused-joined-before-exact-reload',{firstId,secondId,foreignIds,opening7:{checkpointSHA256:inputSHA,origins:openingOrigins},observed8ExitEdges:exits.map(e=>e.cells),cooldownUntilCore:removal.tick*10+60000});
  root=restored(final);expect(serializeCampaign(root)).toBe(final);expect(root.tick).toBe(finalTick);expect(away(firstId).g.paused).toBe(true);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();for(const kind of ['checkpoint','delta']as const){const packet=structuredClone(encoder.encode(root,0,0));expect(packet.kind).toBe(kind);const adopted=decoder.adopt(packet);expect(adopted.status).toBe('applied');if(adopted.status!=='applied')throw Error('Exact reloaded transport required');expect(adopted.world).toEqual(registeredMapPresentation(root));expect(serializeCampaign(root)).toBe(final);}
  expect(sha(readFileSync(input,'utf8'))).toBe(inputSHA);
 }finally{exitSpy.mockRestore();removalSpy.mockRestore();}
},120_000);
