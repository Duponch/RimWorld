import {expect,test} from 'vitest';
import {INITIAL_CALENDAR_YEAR_256,averageInitialTwelfthTemperature256,firstSeasonTwelfth256,firstWarmStartingTwelfth256,configuredInitialCalendarScalars256} from '../src/sim/initial-calendar-256.ts';
import type {ClimateDefinition} from '../src/sim/site-climate.ts';
const climate=(longitude=0,latitude=40):ClimateDefinition=>({latitude,longitude,meanTemperature:20,amplitude:3,rainfall:1000});

test('source default5500 and Auto warm whole year start at the first twelfth, absolute06h before any played tick',()=>{
 const clock=configuredInitialCalendarScalars256(climate(),{season:'auto'});
 expect(INITIAL_CALENDAR_YEAR_256).toBe(5500);expect(clock.twelfth).toBe(0);expect(clock.averages).toHaveLength(12);expect(clock.averages!.every(v=>v>=12&&v<=9999)).toBe(true);
 expect(clock.configuredTicksAbsCore).toBe(15000);expect(clock.localStartAbsCore).toBe(15000);expect(clock.timeZone).toBe(0);
});

test('true east/west configuration retains Core next-local-day behaviour and separate absolute/local clocks',()=>{
 const east=configuredInitialCalendarScalars256(climate(15),{season:'spring'}),west=configuredInitialCalendarScalars256(climate(-15),{season:'spring'});
 expect(east).toMatchObject({twelfth:0,timeZone:1,configuredTicksAbsCore:72500,localStartAbsCore:75000});
 expect(west).toMatchObject({twelfth:0,timeZone:-1,configuredTicksAbsCore:17500,localStartAbsCore:15000});
 expect(east.localStartAbsCore%60000).toBe(15000);expect(west.localStartAbsCore%60000).toBe(15000);
});

test('TimeZoneAt ties use the even integer, including negative longitudes and both date-line endpoints',()=>{
 for(const [longitude,timeZone,absolute] of [[7.5,0,15000],[-7.5,0,15000],[22.5,2,70000],[-22.5,-2,20000],[37.5,2,70000],[-37.5,-2,20000],[180,12,45000],[-180,-12,45000]] as const){
  const r=configuredInitialCalendarScalars256(climate(longitude),{season:'spring'});expect(r.timeZone).toBe(timeZone);expect(r.configuredTicksAbsCore).toBe(absolute);expect(r.localStartAbsCore%60000).toBe(15000);
 }
});

test('warm selection preserves wraparound, inclusive12/9999 bounds and all-warm special case',()=>{
 const wrap=[12,12,0,0,0,0,0,0,0,0,12,9999];expect(firstWarmStartingTwelfth256(wrap,40)).toBe(10);
 expect(firstWarmStartingTwelfth256(Array(12).fill(12),40)).toBe(0);
 expect(firstWarmStartingTwelfth256([0,9999,10000,0,0,0,0,0,0,0,0,0],40)).toBe(1);
 expect(firstWarmStartingTwelfth256(Array(12).fill(10000),40)).toBe(3);
});

test('summer fallback and explicit season use real hemisphere; the equator belongs to north',()=>{
 expect(firstWarmStartingTwelfth256(Array(12).fill(-40),40)).toBe(3);expect(firstWarmStartingTwelfth256(Array(12).fill(-40),-40)).toBe(9);
 expect(firstSeasonTwelfth256('spring',0)).toBe(0);expect(firstSeasonTwelfth256('spring',-1)).toBe(6);expect(firstSeasonTwelfth256('fall',-1)).toBe(0);expect(firstSeasonTwelfth256('winter',-1)).toBe(3);
 expect(firstSeasonTwelfth256('permanent-summer',40)).toBe(0);expect(firstSeasonTwelfth256('permanent-winter',-40)).toBe(0);
 const north=configuredInitialCalendarScalars256({...climate(),meanTemperature:-60},{season:'auto'}),south=configuredInitialCalendarScalars256({...climate(0,-40),meanTemperature:-60},{season:'auto'});
 expect(north.configuredTicksAbsCore).toBe(915000);expect(south.configuredTicksAbsCore).toBe(2715000);
});

test('average source samples keep f32 state and reject unknown periods/facts rather than manufacture a local date',()=>{
 for(const twelfth of [0,3,9,11])expect(averageInitialTwelfthTemperature256({...climate(),meanTemperature:19.875,amplitude:0},twelfth)).toBe(19.875);
 expect(()=>averageInitialTwelfthTemperature256(climate(),12)).toThrow();expect(()=>firstWarmStartingTwelfth256([12],40)).toThrow();
 expect(()=>firstWarmStartingTwelfth256(Array(12).fill(NaN),40)).toThrow();expect(()=>configuredInitialCalendarScalars256(climate(181),{season:'auto'})).toThrow();
});
