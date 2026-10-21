import {describe,expect,test} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GIFT_CAMP_SOURCE274,GIFT_CAMP_SOURCE_SHA274} from './helpers/diplomatic-gifts-v450.ts';
import {deserializeCampaign,deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {planetGeography256} from '../src/sim/planet-geography-256.ts';
import {generateForeignWorldFactions256,completeWorldFactionRegistry256} from '../src/sim/world-faction-generation.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {canPlaceWorldSettlement} from '../src/sim/world-settlement-placement.ts';
import {createGeographicPlanet256} from '../src/sim/planet-factory-256.ts';
import {geographicLocalSite256} from '../src/sim/site-geographic-256.ts';
import {prepareGeographicPhysicalMap256} from '../src/sim/geographic-map-physical-256.ts';
import {populateGeographicRoads256} from '../src/sim/geographic-roads-256.ts';
import {portableLocalRoadAngular256} from '../src/sim/local-road-angular-256.ts';
import {generateLocalGeysers256} from '../src/sim/local-geyser-generation-256.ts';
import {initializeActualWildFlora256} from '../src/sim/wild-plant-actual-runtime-256.ts';
import {initializeExploration256} from '../src/sim/exploration-initial-256.ts';
import {captureActualFogPhysical256} from '../src/sim/exploration-physical-256.ts';
import {captureGeographicGenerationReachability256} from '../src/sim/geographic-generation-reachability-256.ts';
import {initializeGeographicInitialSnow256,INITIAL_SNOW_SEED_PART_256} from '../src/sim/initial-snow-256.ts';
import {localGenerationStepSeed} from '../src/sim/world-site-geography.ts';
import {initialWorldRegistry} from '../src/sim/world-map-context.ts';
import {startingPawn} from '../src/sim/starting-pawns.ts';
import {bindBornHumanFaction259} from '../src/sim/world-affiliation-259.ts';
import {actualMechanicalBirthFaction259} from '../src/sim/mechanoid-world-faction-259.ts';
import {createMedicalRecord,addResolvedInjury} from '../src/sim/injury-state.ts';
import {createMechaMedicalRecord,commitMechanoidImpact} from '../src/sim/mechanoid-health.ts';
import {advanceMechanoidRaid,chooseMechanoidComposition} from '../src/sim/mechanoid-raids.ts';
import {advanceMechanoidCorpses} from '../src/sim/mechanoid-corpse.ts';
import {injurePawn} from '../src/sim/health.ts';
import {advanceRaids} from '../src/sim/raids.ts';
import {raidRandom} from '../src/sim/raid-state.ts';
import {shipReactorCycleHits275,shipReactorThreatSeed275,advanceShipReactorThreats275} from '../src/sim/ship-reactor-threats-275.ts';
import {readShipReactorStart275} from '../src/sim/ship-reactor-runtime-275.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import type {World} from '../src/sim/types.ts';
import type {Mechanoid} from '../src/sim/mechanoid-state.ts';
import {writeTestFileSync} from './test-output.ts';

export const REACTOR_PRESSURE_PREPARATION275='Declared isolated32² engineering/combat fixture. Only immutable acquired geography is reused; factions, leaders, local physical map/clocks and one healthy original colonist are made by their real producers. Forty-five-day date, cleared soil/roof/inventory, one already-owned reactor and initial absence of flora are prepared, not earned or elapsed. Required road/geyser/flora/snow/fog owners are made by their actual constructors. Both branches reuse this same validated baseline. A declared defeated competing faction isolates the human/mechanical branch; a bounded pure composition oracle chooses a mechanical pressure-stream state before birth. No world/map seed is rerolled, no actual attempt is retried and no native RNG equivalence or natural raid frequency is claimed. The actual next physical step owns opportunity, faction check, roster, entry, IDs and admission.';
let baseline275:string|undefined;
const replayBaseline275=process.env.SHIP_REACTOR_PRESSURE_BASELINE275;

/** A complete real World is checked before either actual raid is admitted.
 * No stale calendar in an old campaign is shifted to manufacture day45. */
export function preparedShipReactorPressureWorld275():World {
 if(baseline275)return deserializeWorld(baseline275);
 if(replayBaseline275){
  const text=readFileSync(replayBaseline275,'utf8'),w=deserializeWorld(text);
  expect(validateWorld(w)).toEqual([]);expect(serializeWorld(w)).toBe(text);expect(w.width).toBe(32);expect(w.height).toBe(32);
  expect(w.pawns).toHaveLength(1);expect(w.tick).toBeGreaterThanOrEqual(45*6000);expect(w.shipReactorThreats275).toBeUndefined();expect(w.raids).toBeUndefined();
  expect(w.structures.filter(s=>s.kind==='ship-reactor')).toHaveLength(1);expect(w.structures.find(s=>s.kind==='ship-reactor')!.shipReactor275).toBeUndefined();
  expect(actualMechanicalBirthFaction259(w.worldFactions)).not.toBeNull();baseline275=text;return w;
 }
 const text=readFileSync(GIFT_CAMP_SOURCE274,'utf8');expect(createHash('sha256').update(text).digest('hex')).toBe(GIFT_CAMP_SOURCE_SHA274);
 const acquired=deserializeCampaign(text);if(acquired.planet?.revision!==3)throw Error('Actual immutable acquired geography required');
 const geography=planetGeography256(acquired.planet),random=new WorldGenerationRandom(718);
 const foreign=generateForeignWorldFactions256({version:275,tick:0,tiles:geography.surface.tiles,selection:[...geography.definition.factions],population:3,nextFactionId:1,nextSettlementId:1,nextThingId:1,random});
 if(!foreign.ok)throw Error(foreign.reason);
 const made=completeWorldFactionRegistry256({version:275,draft:foreign.draft,playerDef:'PlayerColony',name:'Réacteur déclaré',postWorldRandom:new WorldGenerationRandom(991)});
 if(!made.ok)throw Error(made.reason);
 const occupied=new Set(made.registry.settlements.map(s=>s.tile));
 const home=geography.surface.tiles.find(t=>t.biome==='temperate-forest'&&t.hilliness==='flat'&&!geography.roads[t.id]!.length&&canPlaceWorldSettlement(geography.surface.tiles,t.id,{settlementTiles:occupied}));
 if(!home)throw Error('No actual flat forest tile in the fixed acquired geography');
 const planet=createGeographicPlanet256({geography,factions:made.registry,homeTile:home.id,adoptedAt:0,nextGroupId:1});
 const site=geographicLocalSite256(planet,home.id),seed=shipReactorThreatSeed275({seed:site.mapSeed>>>0},0);
 let due:number|undefined;
 for(let cycle=30;cycle<38&&due===undefined;cycle++)for(const hit of shipReactorCycleHits275(seed,cycle)){const core=(cycle*90+hit)*1000;if(core>45*60000){due=core;break;}}
 if(due===undefined)throw Error('The fixed disposition has no future opportunity in eight cycles');
 const tick=due/10-1;
 const {world:w}=prepareGeographicPhysicalMap256({schemaVersion:275,planet,factions:made.registry,tile:home.id,width:32,height:32,tick,calendarOrigin:0,nextId:foreign.nextThingId,rng:451,initialWeather:{gameInitDataPresent:false,daysPassedSinceSettle:45},definitionContext:{isStartingMap:false,mapInitializing:true,tutorial:false,nomadicFactor:.5,usedRectCells:new Set()}});
 // Finite declared preparation of a control landscape; no clearing yield or
 // natural acquisition is asserted. All subsequent actors remain physical.
 w.tiles=w.tiles.map(()=>({terrain:'soil-natural'}));delete w.roofing;
 populateGeographicRoads256(w,[],portableLocalRoadAngular256);
 generateLocalGeysers256(w,{waterCovered:false,biomeFactor:1,mutatorFactors:[],layoutRects:[],usedRects:[],ancientCaskets:[],mapInitializing:true,planEdificeRemoval:()=>null},new WorldGenerationRandom(451));
 initializeActualWildFlora256(w);
 initializeGeographicInitialSnow256(w,new WorldGenerationRandom(localGenerationStepSeed(site.mapSeed,INITIAL_SNOW_SEED_PART_256,0)));
 const reach=captureGeographicGenerationReachability256(w);
 initializeExploration256(w,{start:16*32+16,rootsToUnfog:[],readers:{standable:reach.physical.standable,roofed:reach.physical.roofed,canReachMapEdgeNoPassClosedDoorsOrWater:reach.canReachMapEdgeNoPassClosedDoorsOrWater}},captureActualFogPhysical256(w),new WorldGenerationRandom(451));
 const p=startingPawn(w.nextId++,'Témoin déclaré',16,16,0,100,w.seed,w.tick,275);p.health=createMedicalRecord(w.tick);p.hunger=100;p.rest=100;p.mood=100;p.hostilityResponse='ignore';p.schedule.fill('work');
 for(const key of Object.keys(p.priorities) as (keyof typeof p.priorities)[])p.priorities[key]=0;
 expect(bindBornHumanFaction259(w,p,w.worldFactions!.playerFactionId)).toBe(true);w.pawns.push(p);
 w.structures.push({id:w.nextId++,kind:'ship-reactor',x:25,z:25,orientation:1,footprint:'standard',material:'steel',power:{on:true,parentId:null}});
 initialWorldRegistry(w);w.worldMaps!.campaignSeed=planet.generationSeed;w.worldMaps!.calendarOrigin=0;
 expect(actualMechanicalBirthFaction259(w.worldFactions)).not.toBeNull();expect(validateWorld(w)).toEqual([]);
 baseline275=serializeWorld(w);expect(serializeWorld(deserializeWorld(baseline275))).toBe(baseline275);
 writeTestFileSync('tmp/ship-reactor-v451/pressure-baseline.json',baseline275);
 writeTestFileSync('tmp/ship-reactor-v451/pressure-baseline.meta.json',JSON.stringify({preparation:REACTOR_PRESSURE_PREPARATION275,input:GIFT_CAMP_SOURCE274,inputSha256:GIFT_CAMP_SOURCE_SHA274,sha256:createHash('sha256').update(baseline275).digest('hex'),tick:w.tick,mapId:0,tile:home.id,width:w.width,height:w.height,completeWorldValidatedBeforeBirth:true,raidAlreadyBorn:false},null,2));
 expect(createHash('sha256').update(readFileSync(GIFT_CAMP_SOURCE274)).digest('hex')).toBe(GIFT_CAMP_SOURCE_SHA274);
 return deserializeWorld(baseline275);
}

function publicProbe(w:World){
 const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));
 expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Complete pressure baseline refused publicly');
 const original=first.world,frozen=structuredClone(original);
 return {send:()=>{
  const packet=structuredClone(encoder.encode(w,0,0));expect(packet.kind).toBe('delta');const next=decoder.adopt(packet);expect(next.status).toBe('applied');if(next.status!=='applied')throw Error('Actual pressure continuation refused publicly');
  const reference=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder({structureDelta:true}).encode(w,0,0)));expect(reference.status).toBe('applied');if(reference.status!=='applied')throw Error('Same actual pressure checkpoint refused');
  expect(next.world).toEqual(reference.world);expect(original).toEqual(frozen);return next.world;
 }};
}
function raw(w:World){expect(validateWorld(w)).toEqual([]);const text=serializeWorld(w),copy=deserializeWorld(text);expect(serializeWorld(copy)).toBe(text);return copy;}
function start(w:World,kind:'human'|'mechanoid'){
 const competing=w.worldFactions!.factions.find(f=>f.def===(kind==='human'?'Mechanoid':'Pirate'))!;competing.lifecycle259!.defeated=true;
 const reactor=w.structures.find(s=>s.kind==='ship-reactor')!,quote=readShipReactorStart275(w,reactor.id);expect(quote.ok).toBe(true);if(!quote.ok)throw Error(quote.reason);
 expect(applyCommand(w,{type:'ship-reactor-start',reactorId:reactor.id,reactorIds:quote.reactorIds}).ok).toBe(true);
 advanceShipReactorThreats275(w,true);expect(w.shipReactorThreats275!.recent).toEqual([]);
 if(kind==='mechanoid'){
  // Branch-only pure PRNG preparation, never a sequence of actual births.
  let chosen:number|undefined;
  for(let seed=1;seed<=1024&&chosen===undefined;seed++){const r={rng:seed};raidRandom(r);const c=chooseMechanoidComposition(500,r,true);if(c?.roster.every(k=>k==='scyther'))chosen=seed;}
  expect(chosen).toBeDefined();w.shipReactorThreats275!.rng=chosen!;
 }
 expect(validateWorld(w)).toEqual([]);return reactor.id;
}
function kill(w:World,m:Mechanoid){
 const medical=createMechaMedicalRecord(w.tick,m.mechKind);addResolvedInjury(medical,`${m.mechKind}-reactor`,'crack',100000,()=>{throw Error('No biological mechanical draw');});
 expect(commitMechanoidImpact(w,m,medical,{rng:w.rng},w.tick*10)).toBe(true);advanceMechanoidRaid(w);advanceMechanoidCorpses(w);
}

describe.skipIf(!existsSync(GIFT_CAMP_SOURCE274)&&!(replayBaseline275&&existsSync(replayBaseline275)))('complete pressure275 on actual acquired geography, declared branch preparation',()=>{
 test('real mechanical opportunity, faction, staging loss, physical attack, reactor loss and corpse IDs survive RAW and public continuations',()=>{
  const w=preparedShipReactorPressureWorld275(),reactorId=start(w,'mechanoid'),probe=publicProbe(w),victimId=w.pawns[0]!.id,before=w.nextId;
  const twin=raw(w);stepWorld(w);stepWorld(twin);expect(serializeWorld(twin)).toBe(serializeWorld(w));
  const event=w.shipReactorThreats275!.recent[0]!;expect(event.result).toBe('mechanoid');expect(w.raids!.active).toBeUndefined();expect(w.raids!.mechActive).toBeUndefined();
  const group=w.raids!.extraMechActive261![0]!,ids=[...group.members],faction=actualMechanicalBirthFaction259(w.worldFactions)!;
  expect(group.phase).toBe('staging');expect(ids[0]).toBeGreaterThanOrEqual(before);expect(new Set(ids).size).toBe(ids.length);expect(group.composition.roster.every(k=>k==='scyther')).toBe(true);
  expect(w.mechanoids!.every(m=>ids.includes(m.id)&&m.worldFaction259?.factionId===faction.factionId&&(m.x===0||m.z===0||m.x===31||m.z===31))).toBe(true);
  expect(group.shipReactor275).toMatchObject({mapId:0,tile:w.planet!.homeTile,factionId:faction.factionId,atCore:w.tick*10});raw(w);probe.send();

  const accepted=new SnapshotDecoder(),encoder=new SnapshotEncoder(),first=accepted.adopt(structuredClone(encoder.encode(w,0,0)));expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Actual machine checkpoint refused');const retained=first.world,frozen=structuredClone(retained);
  for(const mutate of [
   (bad:World)=>{bad.raids!.extraMechActive261![0]!.shipReactor275!.factionId=bad.worldFactions!.playerFactionId;},
   (bad:World)=>{bad.mechanoids![0]!.id=bad.pawns[0]!.id;bad.raids!.extraMechActive261![0]!.members[0]=bad.pawns[0]!.id;},
   (bad:World)=>{Object.assign(bad.raids!.extraMechActive261![0]!.shipReactor275!,{future276:true});},
  ]){
   const bad={...structuredClone(w),planet:w.planet};mutate(bad);expect(validateWorld(bad)).not.toEqual([]);expect(()=>serializeWorld(bad)).toThrow();
   expect(accepted.adopt(structuredClone(encoder.encode(bad,0,0,true))).status).toBe('resync');expect(retained).toEqual(frozen);
   expect(accepted.adopt(structuredClone(encoder.encode(w,0,0,true))).status).toBe('applied');
  }

  // The actual cumulative30% loss rule, without retrodating the stage timer.
  const stageLosses=Math.ceil(ids.length*.3);for(let n=0;n<stageLosses;n++)kill(w,w.mechanoids![0]!);
  expect(group.phase).toBe('assault');expect(group.lost).toEqual(ids.slice(0,stageLosses));raw(w);probe.send();
  let attacked=false;
  for(let n=0;n<400&&!attacked;n++){stepWorld(w);attacked=w.mechanoids!.some(m=>m.melee?.strike?.targetId===victimId);}
  expect(attacked).toBe(true);raw(w);probe.send();
  const actorIds=w.mechanoids!.map(m=>m.id),reactor=w.structures.find(s=>s.id===reactorId)!;
  expect(damageStructure(w,reactor,500,'bullet')).toBe(true);stepWorld(w);
  expect(w.structures.some(s=>s.id===reactorId)).toBe(false);expect(w.shipReactorThreats275!.active).toBe(false);expect(w.mechanoids!.map(m=>m.id)).toEqual(actorIds);raw(w);probe.send();
  for(const m of w.mechanoids!.slice())kill(w,m);
  for(let n=0;n<30&&w.mechanoids!.length;n++)stepWorld(w);
  advanceRaids(w);expect(w.mechanoids).toEqual([]);expect(w.raids!.extraMechActive261).toEqual([]);expect(w.raids!.last).toMatchObject({id:group.id,mechanoid:true,killed:ids.length,shipReactor275:group.shipReactor275});
  expect(w.piles.filter(p=>p.mechCorpse&&ids.includes(p.id)).map(p=>p.id).sort((a,b)=>a-b)).toEqual(ids.slice().sort((a,b)=>a-b));raw(w);probe.send();
 },120000);

 test('the same complete baseline admits a real human Lord, retains carried goods on physical retreat and reloads the retained result',()=>{
  const w=preparedShipReactorPressureWorld275(),reactorId=start(w,'human'),probe=publicProbe(w);raw(w);stepWorld(w);
  expect(w.shipReactorThreats275!.recent[0]!.result).toBe('human');const group=w.raids!.extraActive261![0]!,members=[...group.members];
  expect(w.raids!.active).toBeUndefined();expect(w.raids!.mechActive).toBeUndefined();expect(w.pawns.filter(p=>members.includes(p.id)).every(p=>p.worldAffiliation259?.factionId===group.shipReactor275!.factionId)).toBe(true);
  raw(w);probe.send();
  const lossCount=Math.ceil(members.length*group.lossPermille!/1000);
  for(const id of members.slice(0,lossCount))injurePawn(w,w.pawns.find(p=>p.id===id)!,'brain','crush',99000);
  advanceRaids(w);expect(group.phase).toBe('withdraw');
  const survivors=members.slice(lossCount),carried=w.piles.filter(p=>'pawnId'in p.owner&&survivors.includes(p.owner.pawnId)).map(p=>({id:p.id,item:p.item}));
  expect(carried.length).toBeGreaterThan(0);const reactor=w.structures.find(s=>s.id===reactorId)!;expect(damageStructure(w,reactor,500,'bullet')).toBe(true);
  const twin=raw(w);
  for(let n=0;n<80&&w.raids!.extraActive261!.length;n++){stepWorld(w);stepWorld(twin);}
  expect(serializeWorld(twin)).toBe(serializeWorld(w));expect(w.raids!.extraActive261).toEqual([]);expect(w.shipReactorThreats275!.active).toBe(false);
  expect(w.raids!.departed.filter(d=>survivors.includes(d.pawnId))).toHaveLength(survivors.length);
  const departed=w.raids!.departed.flatMap(d=>d.items);for(const item of carried)expect(departed.some(p=>p.id===item.id&&p.item===item.item)).toBe(true);
  expect(w.raids!.last).toMatchObject({id:group.id,shipReactor275:group.shipReactor275});raw(w);probe.send();
 },120000);
});
