import {expect,test} from 'vitest';
import {validGeographicCreationSize262,validGeographicCreationSeason262,geographicCreationSizeWarns262,validGeographicMapDimension262} from '../src/sim/geographic-creation-options-262';
import {WeightedSearch} from '../src/sim/weighted-search';
import {validMapDimension,validMapDimensionForSchema} from '../src/sim/map-config';
import {validGroupMapContext} from '../src/sim/world-map-context-save';
import {configuredGeographicStartClock256} from '../src/sim/geographic-start-clock-256';
import {configuredInitialCalendarScalars256} from '../src/sim/initial-calendar-256';
import {worldCreationCalendarFacts262} from '../src/ui/world-creation-calendar-262';
import {geographicSurfaceTileClimateDefinition256} from '../src/sim/site-climate';
import type {WorldSurfaceTile} from '../src/sim/world-surface-geography';

test('only the actual creation capacity and four configured seasons plus Auto are admitted',()=>{
 expect([200,225,250,275,300,325].every(validGeographicCreationSize262)).toBe(true);for(const n of [8,128,251,280,350,375,400,'200',null])expect(validGeographicCreationSize262(n)).toBe(false);
 for(const size of [200,225,250,275])expect(geographicCreationSizeWarns262(size)).toBe(false);for(const size of [300,325])expect(geographicCreationSizeWarns262(size)).toBe(true);
 expect(['auto','spring','summer','fall','winter'].every(validGeographicCreationSeason262)).toBe(true);for(const s of ['permanent-summer','permanent-winter','Winter',undefined])expect(validGeographicCreationSeason262(s)).toBe(false);
});

test('only262 widens actual admission while all historical250 limits and the existing prospective400 helper remain literal',()=>{
 for(const size of [275,300,325]){
  expect(validMapDimension(size)).toBe(false);expect(validGeographicMapDimension262(size,262)).toBe(true);
  for(const version of [255,256,259,260,261,263])expect(validGeographicMapDimension262(size,version)).toBe(false);
  const header={seed:7,width:size,height:size};expect(validGroupMapContext(header,0,262)).toBe(true);expect(validGroupMapContext(header,0,261)).toBe(false);
 }
 expect(validMapDimensionForSchema(400,256)).toBe(true);expect(validMapDimensionForSchema(401,262)).toBe(false);
 expect(validGeographicMapDimension262(250,261)).toBe(true);expect(validGeographicCreationSize262(400)).toBe(false);
});

test('325 navigation parents retain real cell indices above65535 without flooding the entire map',()=>{
 // Two-cell corridor only. No World, full factory or performance claim.
 const size=325,count=size*size,start=count-2,goal=count-1,blocked=new Uint8Array(count).fill(1);blocked[start]=0;blocked[goal]=0;
 const field=new WeightedSearch(size,size,start,blocked).finish(new Set([goal]));
 expect(start).toBeGreaterThan(65535);expect(field.parents).toBeInstanceOf(Int32Array);expect(field.parents[goal]).toBe(start);expect(field.parents[start]).toBe(-1);expect(field.visited).toBe(2);
});

test('configured winter keeps northern/southern absolute dates distinct at the actual longitude',()=>{
 const base={latitude:40,longitude:15,meanTemperature:10,amplitude:20,rainfall:800};
 expect(configuredGeographicStartClock256(base,'winter')).toEqual({absoluteCore:2772500,calendarOrigin:277500});
 expect(configuredGeographicStartClock256({...base,latitude:-40},'winter')).toEqual({absoluteCore:972500,calendarOrigin:97500});
 for(const season of ['auto','spring','summer','fall','winter'] as const){const actual=configuredGeographicStartClock256(base,season),expected=configuredInitialCalendarScalars256(base,{season});expect(actual).toEqual({absoluteCore:expected.configuredTicksAbsCore,calendarOrigin:expected.localStartAbsCore/10});}
});

test('site preview uses its actual immutable tile without changing climate or starting a World',()=>{
 // Prepared geographic tile scalars only. This is not a selected favorable map.
 const tile:WorldSurfaceTile={id:17,center:[70,70,0],corners:[],neighbours:[],biome:'boreal-forest',hilliness:'flat',elevation:100,meanTemperature:-5,rainfall:750,swampiness:0,rivers:[],riverDistance:0},before=JSON.stringify(tile),definition=geographicSurfaceTileClimateDefinition256(tile),facts=worldCreationCalendarFacts262(tile,'winter');
 expect(facts.definition).toEqual(definition);expect(facts.clock).toEqual(configuredGeographicStartClock256(definition,'winter'));expect(facts.choice).toBe('Hiver');expect(facts.date).toContain('5500');expect(facts.date).toContain('06:00');expect(JSON.stringify(tile)).toBe(before);
});
