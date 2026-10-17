import {beforeAll,expect,test} from 'vitest';
import {generateGeographicWorldDraft256} from '../src/sim/world-geographic-draft.ts';
import {defaultWorldGenerationSettings} from '../src/sim/world-generation-settings.ts';
import {captureGeneratedGeography256,type CampaignGeography256} from '../src/sim/world-geography-owner-256.ts';
import {planetFactionTargets256} from '../src/sim/planet-faction-targets-256.ts';
import {createGeographicPlanet256} from '../src/sim/planet-factory-256.ts';
import {canPlaceWorldSettlement} from '../src/sim/world-settlement-placement.ts';
import {generateStartingWorld,startingSiteChoices} from '../src/sim/starting-world.ts';
import {findPlanetRoute,planetEdgeCost,planetDifficulty,planetQueryBudget,planetAbsoluteCore256,planetTileCoordinates,groupTicksPerMove,validPlanetRoute} from '../src/sim/planet-navigation.ts';
import {preparePlanetNavigation256} from '../src/sim/planet-route-256.ts';
import {worldSurfaceCoordinates,worldSurfaceDifficulty} from '../src/sim/world-surface-movement.ts';
import {visibleWorldRoads,WORLD_ROADS} from '../src/sim/world-roads.ts';
import {groupDestinationValid} from '../src/sim/group-capture.ts';
import {climateDate,geographicLongitudeOffsetCore256,createGeographicSiteClimate256,geographicPlanetClimateDefinition256,validClimateDefinition,validGeographicClimateDefinition256,seasonalAmplitude} from '../src/sim/site-climate.ts';
import {validGeographicSiteClimate256} from '../src/sim/site-climate-save.ts';
import type {GeographicPlanetState} from '../src/sim/planet-state.ts';
import type {World} from '../src/sim/types.ts';
import type {WorldFactionRegistry256} from '../src/sim/world-faction-state.ts';
import {emptyLandscape} from '../src/sim/generation.ts';
import {initialWorldRegistry} from '../src/sim/world-map-context.ts';
import {registeredMapPresentation} from '../src/sim/world-map-presentation.ts';
import {registerProjectedFactionOwners256} from '../src/sim/world-faction-projection-save-256.ts';
import {validateWorldFactionRegistry256} from '../src/sim/world-faction-save.ts';
let owner:CampaignGeography256,planet:GeographicPlanetState,road:readonly[number,number];
let factions:WorldFactionRegistry256,nextThingId:number;
const mass={grams:10000,capacityGrams:35000,carriers:[{pawnId:1,grams:10000,capacityGrams:35000}]},context={homeCivilCore:900000,mass};
/** One shared original30% geographic preparation; no campaign ticks or map
 * generation. ROOT may substitute its already-acquired draft at this boundary. */
beforeAll(()=>{const iterator=generateGeographicWorldDraft256({seed:'Elsewhere',settings:defaultWorldGenerationSettings(),tick:0,nextThingId:1,playerDef:'PlayerColony',playerName:'Colonie'});let n=iterator.next();while(!n.done)n=iterator.next();const draft=n.value;factions=draft.factions;nextThingId=draft.nextThingId;owner=captureGeneratedGeography256(draft);const targets=planetFactionTargets256(draft.factions,owner.surface.tiles);if(!targets)throw Error('No actual faction geography');const home=owner.surface.tiles.find(t=>t.biome==='temperate-forest'&&t.hilliness==='flat'&&canPlaceWorldSettlement(owner.surface.tiles,t.id,{settlementTiles:targets.occupied}));if(!home)throw Error('Prepared default world lacks actual temperate flat start');planet=createGeographicPlanet256({geography:owner,factions:draft.factions,homeTile:home.id,adoptedAt:0,nextGroupId:1});preparePlanetNavigation256(planet);let pair:readonly[number,number]|undefined;for(const t of owner.surface.tiles){const link=visibleWorldRoads(t,owner.roads[t.id]!).find(l=>groupDestinationValid(planet,t.id)&&groupDestinationValid(planet,l.neighbour));if(link){pair=[t.id,link.neighbour];break;}}if(!pair)throw Error('Prepared actual default world has no road witness');road=pair;},120000);

test('legacy drafts, choices, coordinates and quotas remain literal162',()=>{for(const revision of [1,2] as const){const p=generateStartingWorld(216,revision),bytes=JSON.stringify(p);expect(p.revision).toBe(revision);expect(p.tiles).toHaveLength(162);expect(planetQueryBudget(p)).toEqual({nodes:162,arcs:960});expect(startingSiteChoices(p)).toContain(p.homeTile);const route=findPlanetRoute(p,p.homeTile,p.civilianTile,context,planetQueryBudget(p));expect(route.kind).toBe('found');if(route.kind!=='found')throw Error('Literal route lost');expect(validPlanetRoute(p,route.tiles,p.homeTile,p.civilianTile)).toBe(true);expect(JSON.stringify(p)).toBe(bytes);}});

test('actual geometry coordinates and movement use real biome/climate and reciprocal roads',()=>{const [a,b]=road,tile=owner.surface.tiles[b]!,link=visibleWorldRoads(owner.surface.tiles[a]!,owner.roads[a]!).find(l=>l.neighbour===b)!;expect(planetTileCoordinates(planet,b)).toEqual(worldSurfaceCoordinates(tile));expect(planetDifficulty(planet,b,context)).toBe(worldSurfaceDifficulty(tile,owner.surface.settings.temperature,planetAbsoluteCore256(planet,context.homeCivilCore)));const f=Math.fround,expected=Math.max(1,Math.min(30000,Math.trunc(f(f(groupTicksPerMove(mass)*worldSurfaceDifficulty(tile,owner.surface.settings.temperature,planetAbsoluteCore256(planet,context.homeCivilCore)))*WORLD_ROADS[link.road].movement))));expect(planetEdgeCost(planet,a,b,context)).toBe(expected);expect(planetEdgeCost(planet,a,a,context)).toBe(0);const water=owner.surface.tiles.find(t=>t.biome==='ocean'||t.biome==='lake')!,impassable=owner.surface.tiles.find(t=>t.hilliness==='impassable')!,mountain=owner.surface.tiles.find(t=>t.hilliness==='mountainous'&&t.biome!=='ocean'&&t.biome!=='lake')!;expect(groupDestinationValid(planet,water.id)).toBe(false);expect(groupDestinationValid(planet,impassable.id)).toBe(false);expect(groupDestinationValid(planet,mountain.id)).toBe(true);});

test('dense route query admits full quota before work, keeps original geometry and returns actual path',()=>{const budget=planetQueryBudget(planet),tooSmall={nodes:budget.nodes-1,arcs:budget.arcs};expect(findPlanetRoute(planet,road[0],road[1],context,tooSmall)).toEqual({kind:'deferred',nodes:0,arcs:0});expect(tooSmall).toEqual({nodes:budget.nodes-1,arcs:budget.arcs});const before=owner.surface.tiles,route=findPlanetRoute(planet,road[0],road[1],context,budget);expect(route.kind).toBe('found');if(route.kind!=='found')throw Error('Actual adjacent road is unavailable');expect(validPlanetRoute(planet,route.tiles,road[0],road[1])).toBe(true);expect(route.nodes).toBeGreaterThan(0);expect(budget.nodes).toBe(planetQueryBudget(planet).nodes-route.nodes);expect(owner.surface.tiles).toBe(before);expect(planet.nextGroupId).toBe(1);preparePlanetNavigation256(planet);expect(planetQueryBudget(planet)).toEqual({nodes:before.length,arcs:before.reduce((n,t)=>n+t.neighbours.length,0)});});

test('prospective climate4 preserves global time, binds actual tile exactly and keeps old climate limits strict',()=>{const maps:NonNullable<World['worldMaps']>={revision:1,rootMapId:0,selectedMapId:0,nextMapId:1,campaignSeed:planet.generationSeed,calendarOrigin:90000,mapSize:{width:250,height:250},sites:[{id:0,tile:planet.homeTile,kind:'settlement',createdAt:0,visit:null}],retired:[]};const site={revision:2 as const,biome:'temperate-forest' as const,hilliness:'flat' as const,river:'none' as const,stones:['granite','slate'] as ('granite'|'slate')[]},world={tick:12345,planet,site,worldMaps:maps},climate=createGeographicSiteClimate256(planet,planet.homeTile,{tick:world.tick,calendarOrigin:maps.calendarOrigin});expect(climate.calendarOrigin-climate.adoptedAt).toBe(maps.calendarOrigin);expect(climate.definition).toEqual(geographicPlanetClimateDefinition256(planet,planet.homeTile));expect(validGeographicSiteClimate256(climate,256,world)).toBe(true);expect(validGeographicSiteClimate256(climate,255,world)).toBe(false);expect(validGeographicSiteClimate256({...climate,calendarOrigin:climate.calendarOrigin+1},256,world)).toBe(false);const altered={...climate,definition:{...climate.definition,meanTemperature:climate.definition.meanTemperature+1}};expect(validGeographicSiteClimate256(altered,256,world)).toBe(false);const extreme={latitude:80,longitude:0,meanTemperature:-140,rainfall:50000,amplitude:seasonalAmplitude(80)};expect(validClimateDefinition(extreme)).toBe(false);expect(validGeographicClimateDefinition256(extreme)).toBe(true);expect(validGeographicSiteClimate256({...climate,definition:extreme},256,world)).toBe(false);const later=createGeographicSiteClimate256(planet,planet.homeTile,{tick:world.tick+77,calendarOrigin:maps.calendarOrigin});expect(later.calendarOrigin-climate.calendarOrigin).toBe(77);});

// Scalar calendar/header fixtures only; these are not complete saved Worlds.
test('geographic southern calendar uses the same hemisphere season shift as literal2/3',()=>{
 const definition={latitude:-30,longitude:0,meanTemperature:12,rainfall:800,amplitude:10};
 for(const revision of [2,3,4] as const){
  const climate=revision===4?{revision,tileId:0,adoptedAt:0,calendarOrigin:0,definition}:{revision,adoptedAt:0,calendarOrigin:0,definition};
  const south=climateDate({tick:0,climate}),north=climateDate({tick:0,climate:{...climate,definition:{...definition,latitude:30}}});
  expect(south.season).toBe('Automne');expect(north.season).toBe('Printemps');expect(south.day).toBe(north.day);expect(south.quadrum).toBe(north.quadrum);
 }
});
test('actual geographic expedition creation fixes the adopted cache frontier as well as annual phase',()=>{
 const target=owner.surface.tiles.find(t=>t.id!==planet.homeTile&&t.id!==planet.civilianTile&&t.biome==='temperate-forest'&&t.hilliness==='flat');if(!target)throw Error('Prepared actual geography has no distinct temperate flat tile');
 const definition=geographicPlanetClimateDefinition256(planet,target.id),home=geographicPlanetClimateDefinition256(planet,planet.homeTile),createdAt=12340,tick=12345,anchor=90000;
 const expeditionSite={tile:target.id,createdAt,calendarOffset:(geographicLongitudeOffsetCore256(definition.longitude)-geographicLongitudeOffsetCore256(home.longitude))/10};
 const site={revision:2 as const,biome:'temperate-forest' as const,hilliness:'flat' as const,river:'none' as const,stones:['granite','slate'] as ('granite'|'slate')[]};
 const worldMaps:NonNullable<World['worldMaps']>={revision:1,rootMapId:0,selectedMapId:0,nextMapId:1,campaignSeed:planet.generationSeed,calendarOrigin:anchor,mapSize:{width:250,height:250},sites:[{id:0,tile:planet.homeTile,kind:'settlement',createdAt:0,visit:null}],retired:[]};
 const header={tick,planet,site,expeditionSite,worldMaps},climate=createGeographicSiteClimate256(planet,target.id,{tick:createdAt,calendarOrigin:anchor});
 expect(validGeographicSiteClimate256(climate,256,header)).toBe(true);
 // Same absolute yearly phase, but a different6tick sample cache anchor.
 expect(validGeographicSiteClimate256({...climate,adoptedAt:createdAt+1,calendarOrigin:climate.calendarOrigin+1},256,header)).toBe(false);
});


test('real geographic faction leader owners survive projection and cannot alias a local Thing; unobserved post references remain RAW-strict',()=>{
 // Declared32x32 neutral domain fixture, not a geographic starting map or a
 // played campaign. It uses the actual119904 draft's factions and namespace.
 const root=emptyLandscape(planet.generationSeed,32,32);root.planet=planet;root.worldFactions=structuredClone(factions);root.nextId=nextThingId;initialWorldRegistry(root);
 const view=registeredMapPresentation(root);if(!view)throw Error('Missing real map projection');const ids=new Set<number>();expect(registerProjectedFactionOwners256(view,ids)).toEqual([]);expect(ids.size).toBe(factions.leaders.length);
 const collision=new Set([factions.leaders[0]!.pawn.id]);expect(registerProjectedFactionOwners256(view,collision).length).toBeGreaterThan(0);expect(collision.size).toBe(1);
 const first=root.worldFactions!.settlements[0]!;first.postId=123;
 const projected=registeredMapPresentation(root)!;expect(registerProjectedFactionOwners256(projected,new Set())).toEqual([]);
 expect(validateWorldFactionRegistry256(root.worldFactions,256,{present:true,tick:root.tick,width:32,height:32,nextId:root.nextId,tileCount:owner.surface.tiles.length,postIds:new Set(),occupiedThingIds:new Set(),knownHumanIds:new Set()}).length).toBeGreaterThan(0);
 const missing={...view};delete missing.worldFactions;expect(registerProjectedFactionOwners256(missing,new Set()).length).toBeGreaterThan(0);
});
