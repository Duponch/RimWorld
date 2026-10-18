import {expect,test} from 'vitest';
import {irregularTemperatureOffset262,irregularTemperatureSeed262,IRREGULAR_TEMPERATURE_FREQUENCY_262,validIrregularClimateMarker262} from '../src/sim/geographic-irregular-temperature-262';
import {createWorldPerlin} from '../src/sim/world-coherent-noise';
import {seasonalOutdoorTemperature,geographicOutdoorTemperature262,geographicSeasonTemperature256,geographicLongitudeOffsetCore256,type ClimateWorld,type GeographicSiteClimate256} from '../src/sim/site-climate';
import {validGeographicSiteClimate256} from '../src/sim/site-climate-save';

test('tile seed and sampled signed float offset use the existing independent Perlin kernel with primary constants',()=>{
 const f=Math.fround;for(const tile of [0,17,119903])for(const at of [0,1,59,60,2700000,6300000]){
  const hash=Math.imul(tile,397),seed=(hash^(199372327+2654435769+(hash<<6)+(hash>>2)))|0;expect(irregularTemperatureSeed262(tile)).toBe(seed);
  const sample=at-at%60,noise=createWorldPerlin({frequency:4.999999873689376E-06,lacunarity:2,persistence:.5,octaves:3,quality:'medium',seed});expect(irregularTemperatureOffset262(tile,at)).toBe(f(f(noise(sample===0?1:sample,0,0))*7));
 }expect(IRREGULAR_TEMPERATURE_FREQUENCY_262).toBe(Math.fround(.000005));
 expect(irregularTemperatureOffset262(17,2700000)).not.toBe(irregularTemperatureOffset262(17,6300000));
});

test('historical revision4 stays literal while the same new marked map uses its absolute clock without resetting adoption',()=>{
 const definition={latitude:40,longitude:15,meanTemperature:10,amplitude:20,rainfall:900},climate:GeographicSiteClimate256={revision:4,tileId:17,adoptedAt:137,calendarOrigin:277637,definition},w={tick:139,climate} as ClimateWorld;
 const sample=137,civil=climate.calendarOrigin+sample-climate.adoptedAt,absolute=civil*10-geographicLongitudeOffsetCore256(definition.longitude),literal=geographicSeasonTemperature256(definition,absolute)+7*Math.cos(2*Math.PI*(civil%6000/6000+.32));
 const before=JSON.stringify(w);expect(seasonalOutdoorTemperature(w)).toBe(literal);expect(JSON.stringify(w)).toBe(before);
 const next={...w,climate:{...climate,irregular262:true as const}};expect(seasonalOutdoorTemperature(next)).toBe(geographicOutdoorTemperature262(definition,17,absolute));expect(next.climate.adoptedAt).toBe(137);expect(next.climate.calendarOrigin).toBe(climate.calendarOrigin);expect(Object.hasOwn(climate,'irregular262')).toBe(false);
});

test('only own enumerable true at262 is admitted; no retroactive marker, inherited field, getter or future schema',()=>{
 for(const version of [1,4,259,260,261,263])expect(validIrregularClimateMarker262({irregular262:true},version)).toBe(false);
 expect(validIrregularClimateMarker262({},261)).toBe(true);expect(validIrregularClimateMarker262({},262)).toBe(true);expect(validIrregularClimateMarker262({irregular262:true},262)).toBe(true);
 for(const marker of [false,undefined,null,1])expect(validIrregularClimateMarker262({irregular262:marker},262)).toBe(false);
 expect(validIrregularClimateMarker262(Object.create({irregular262:true}),262)).toBe(false);expect(validIrregularClimateMarker262(Object.defineProperty({},'irregular262',{value:true}),262)).toBe(false);
 let reads=0;const getter=Object.defineProperty({},'irregular262',{enumerable:true,get(){reads++;throw Error('Must not execute marker getter');}});expect(validIrregularClimateMarker262(getter,262)).toBe(false);expect(reads).toBe(0);
 const c={revision:4,adoptedAt:0,calendarOrigin:1500,tileId:17,definition:{latitude:40,longitude:15,meanTemperature:10,amplitude:20,rainfall:900},irregular262:true},unread=Object.defineProperty({tick:0},'planet',{get(){reads++;throw Error('Old schema must refuse future field before owner lookup');}});
 expect(validGeographicSiteClimate256(c,261,unread)).toBe(false);expect(reads).toBe(0);
});
