import {beforeAll,expect,test} from 'vitest';
import {generateGeographicWorldDraft256,type GeographicWorldDraft256} from '../src/sim/world-geographic-draft.ts';
import {defaultWorldGenerationSettings} from '../src/sim/world-generation-settings.ts';
import {captureGeneratedGeography256,type CampaignGeography256} from '../src/sim/world-geography-owner-256.ts';
import {createGeographicPlanet256} from '../src/sim/planet-factory-256.ts';
import {canPlaceWorldSettlement} from '../src/sim/world-settlement-placement.ts';
import {prepareGeographicPhysicalMap256} from '../src/sim/geographic-map-physical-256.ts';
import {initialWorldRegistry,registeredMap,flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {initialWorldPawns256} from '../src/sim/world-pawn-state-256.ts';
import {initialMapGenerationRuntime256} from '../src/sim/map-generation-runtime-256.ts';
import {startingPawn} from '../src/sim/starting-pawns.ts';
import {crashlandedProfile} from '../src/sim/game-profile.ts';
import {enableCassandraRaids} from '../src/sim/cassandra-raids.ts';
import {emptyGroupLedger} from '../src/sim/group-loading.ts';
import {newGroupFreight} from '../src/sim/group-freight.ts';
import {newGroupProvisions} from '../src/sim/group-provisions.ts';
import {abandonRegisteredMap,groupEntryActions} from '../src/sim/world-map-authority.ts';
import {prepareActualSettlementEntry257} from '../src/sim/group-camp-entry-256.ts';
import {draftActualGroupCamp256} from '../src/sim/group-camp-draft-256.ts';
import {captureMapGenerationRuntime256} from '../src/sim/map-generation-runtime-256.ts';
import {portableLocalRoadAngular256} from '../src/sim/local-road-angular-256.ts';
import {serializeCampaign,deserializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import type {AwayGroup} from '../src/sim/group-capture.ts';
import type {CampaignState} from '../src/sim/world-map-state.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';
import {addMaterial} from '../src/sim/materials.ts';

let draft:GeographicWorldDraft256,geography:CampaignGeography256,home:number,target:number;
beforeAll(()=>{
 const iterator=generateGeographicWorldDraft256({seed:'Elsewhere',settings:defaultWorldGenerationSettings(),tick:0,nextThingId:1,playerDef:'PlayerColony',playerName:'Colonie'});
 let step=iterator.next();while(!step.done)step=iterator.next();draft=step.value;geography=captureGeneratedGeography256(draft);
 const occupied=new Set(draft.factions.settlements.map(s=>s.tile));
 const eligible=geography.surface.tiles.filter(t=>t.biome==='temperate-forest'&&t.hilliness==='flat'&&canPlaceWorldSettlement(geography.surface.tiles,t.id,{settlementTiles:occupied}));
 if(eligible.length<2)throw Error('Fixed world has no pair of actual admissible temperate sites');
 home=eligible[0]!.id;target=eligible[1]!.id;
},120000);

/** Declared prepared32² source and already-away owner, no loading/trip history
 * claimed. Actual command abandons that source; actual production pipeline
 * generates the250² successor, with no old save or Camp replay as fixture. */
function fixture(remove=true){
 const planet=createGeographicPlanet256({geography,factions:draft.factions,homeTile:home,adoptedAt:0,nextGroupId:2});
 const w=prepareGeographicPhysicalMap256({planet,factions:structuredClone(draft.factions),tile:home,width:32,height:32,tick:0,calendarOrigin:90000,nextId:draft.nextThingId,rng:123456,initialWeather:{gameInitDataPresent:false,daysPassedSinceSettle:0},definitionContext:{isStartingMap:false,mapInitializing:true,tutorial:false,nomadicFactor:.5,usedRectCells:new Set()}}).world;
 w.scenario={id:'crashlanded',revision:1,landing:{x:16,z:16}};w.gameProfile=crashlandedProfile();enableCassandraRaids(w,true);w.worldPawns=initialWorldPawns256();initialWorldRegistry(w);
 Object.assign(w.worldMaps!,{mapSize:{width:250,height:250},generationRuntime:initialMapGenerationRuntime256(),nextLordId:0,nextAncientCasketGroupId:0});
 const pawn=startingPawn(w.nextId++,'Propriétaire préparé',16,16,0,80,w.seed,0,SCHEMA_VERSION);
 // Prepared local ownership precedes the declared already-away baseline. The
 // real material producer must observe its actual carrier before allocation.
 w.pawns.push(pawn);addMaterial(w,'silver',7,{type:'inventory',pawnId:pawn.id},'silver');w.pawns.pop();const items=w.piles.splice(0),silver=items[0]!;
 const context={seed:w.seed,width:32,height:32,climate:w.climate,site:w.site};
 const g:AwayGroup={id:1,startedAt:0,departedAt:0,lastPersonalTick:0,destination:target,tile:target,phase:'at-site',route:[target],segment:null,stop:{kind:'at-site'},paused:false,members:[pawn],items,entry:{x:16,z:16},ledger:emptyGroupLedger(),freight:newGroupFreight(),provisions:newGroupProvisions(),baseline:{food:0,pemmican:0,silver:7,cargo:{cloth:0,'muffalo-wool':0},medicine:0,component:0,freight:{wood:0,steel:0}}};
 w.worldGroups!.groups.push({originMapId:0,localMapId:null,context,state:g});w.worldGroups!.selectedGroupId=1;
 if(remove){const result=abandonRegisteredMap(w,0,true);expect(result.ok,result.reason).toBe(true);expect(validateWorld(w)).toEqual([]);}
 return {w:w as CampaignState,g,pawn,silver};
}
const drain=<Y,T>(iterator:Generator<Y,T,void>)=>{let step=iterator.next();while(!step.done)step=iterator.next();return step.value;};

test('max1 rejects before generation; wrong campaign size and missing allocator stay literal',()=>{
 const occupied=fixture(false),before=JSON.stringify(occupied.w);
 expect(groupEntryActions(occupied.w,1).settle.ok).toBe(false);
 expect(drain(prepareActualSettlementEntry257(occupied.w,1))).toMatchObject({status:'blocked'});
 expect(JSON.stringify(occupied.w)).toBe(before);
 const f=fixture();f.w.worldMaps!.mapSize={width:280,height:280};
 expect(drain(prepareActualSettlementEntry257(f.w,1))).toMatchObject({status:'blocked',phase:'settlement-size'});
 f.w.worldMaps!.mapSize={width:250,height:250};delete f.w.worldMaps!.nextLordId;
 expect(drain(prepareActualSettlementEntry257(f.w,1))).toMatchObject({status:'blocked',phase:'settlement-allocators'});
});

test('cancelling after private physical generation adopts no map, allocator, RNG or static',()=>{
 const f=fixture(),before=serializeCampaign(f.w),iterator=prepareActualSettlementEntry257(f.w,1);
 expect(iterator.next().done).toBe(false);expect(iterator.next().done).toBe(false);
 iterator.return({status:'blocked',phase:'cancelled',reason:'Explicit test cancellation'});
 expect(serializeCampaign(f.w)).toBe(before);expect(f.w.worldMaps!.sites).toHaveLength(0);
});

test('real non-starting Base_Player250 pipeline keeps source untouched and a stale final draft refuses',()=>{
 const f=fixture(),before=serializeCampaign(f.w),captured=captureMapGenerationRuntime256(f.w.worldMaps!.generationRuntime!,250,250);
 const result=drain(draftActualGroupCamp256(f.w,1,{angular:portableLocalRoadAngular256,context:{tutorial:false,nomadicFactor:.5,layoutRects:[],usedRects:[]},adjacentPermutation:captured.adjacentPermutation,fog:{rootsToUnfog:[],...captured.edgeContext?{edgeContext:captured.edgeContext}:{}},animalRuntimeRng:f.w.rng},'settle'));
 expect(result.status,JSON.stringify(result.status==='blocked'?result:result.settlement)).toBe('ready');if(result.status!=='ready')throw Error(result.reason);
 expect(result.draft.site.map).toMatchObject({width:250,height:250});expect(result.draft.site.map).not.toHaveProperty('expeditionSite');expect(result.draft.site.map).not.toHaveProperty('startingArrival');expect(result.draft.site.map.pawns).toHaveLength(0);
 expect(result.runtimeAfter.steps.map(s=>s.phase)).toEqual(expect.arrayContaining(['shrines750','ruins750','hives1120','scenParts875-no-game-init-data']));
 expect(serializeCampaign(f.w)).toBe(before);expect(result.current(f.w)).toBe(true);
 f.w.worldMaps!.nextLordId!++;expect(result.current(f.w)).toBe(false);
},120000);

test('commit creates settlement directly, retains original people and exact RAW continuation',()=>{
 const f=fixture(),before={tick:f.w.tick,nextMapId:f.w.worldMaps!.nextMapId,nextId:f.w.nextId,planet:f.w.planet,factions:f.w.worldFactions},entry=drain(prepareActualSettlementEntry257(f.w,1));
 expect(entry.status,JSON.stringify(entry.status==='blocked'?entry:null)).toBe('ready');if(entry.status!=='ready')throw Error(entry.reason);
 expect(f.w.worldMaps!.sites).toHaveLength(0);const result=entry.commit();expect(result.ok,result.reason).toBe(true);
 const record=f.w.worldMaps!.sites[0]!,map=registeredMap(f.w,record.id)!;
 expect(record.kind).toBe('settlement');expect(record.id).toBe(before.nextMapId);expect(map.width).toBe(250);expect(map.height).toBe(250);expect(map.pawns[0]).toBe(f.pawn);expect(map.planet).toBe(before.planet);expect(map.worldFactions).toBe(before.factions);expect(map.tick).toBe(before.tick);
 expect(record.settledAt).toBe(before.tick);expect(map).not.toHaveProperty('scenario');expect(map).not.toHaveProperty('startingArrival');expect(map).not.toHaveProperty('expeditionSite');expect(map.raids?.profile).toBe('cassandra-raids-v1');expect(map.raids?.cassandra?.cycle).toBeGreaterThanOrEqual(0);expect(map.visitors?.introAt).toBeNull();expect(map.economy?.adoptedAt).toBe(before.tick);
 expect(map.piles.find(p=>p.id===f.silver.id)).toBe(f.silver);expect(f.silver.quantity).toBe(7);expect(f.silver.owner.type).toBe('ground');
 expect(f.w.nextId).toBeGreaterThan(before.nextId);expect(f.w.worldMaps!.sites.some(s=>s.kind==='camp')).toBe(false);expect(f.w.worldMaps!.retired.some(s=>s.kind==='camp')).toBe(false);expect(f.w.worldGroups!.groups).toHaveLength(0);
 flushRegisteredMap(map);const raw=serializeCampaign(f.w);expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);expect(entry.commit().ok).toBe(false);
 const missingBirth=JSON.parse(raw);delete missingBirth.worldMaps.sites[0].settledAt;expect(()=>deserializeCampaign(JSON.stringify(missingBirth))).toThrow();
 const old=JSON.parse(raw);old.schemaVersion=258;delete old.worldMaps.sites[0].settledAt;expect(()=>deserializeCampaign(JSON.stringify(old))).toThrow(/258/);
},120000);
