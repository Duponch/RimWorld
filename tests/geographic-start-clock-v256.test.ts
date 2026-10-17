import {describe,it,expect} from 'vitest';
import {configuredGeographicStartClock256} from '../src/sim/geographic-start-clock-256.ts';
import type {ClimateDefinition} from '../src/sim/site-climate.ts';
const climate=(longitude=0):ClimateDefinition=>({latitude:0,longitude,meanTemperature:30,amplitude:3,rainfall:1000});
/** Prepared source scalars, no World, clock advance, PRNG or generated map. */
describe('geographic factory delegates Auto to the adopted native calendar',()=>{
 it('keeps true Auto all-warm first twelfth and Greenwich06:00',()=>{expect(configuredGeographicStartClock256(climate())).toEqual({absoluteCore:15000,calendarOrigin:1500});});
 it('wraps east BEFORE adding06:00, preserving absolute and local dates',()=>{
  expect(configuredGeographicStartClock256(climate(15))).toEqual({absoluteCore:72500,calendarOrigin:7500});
  expect(configuredGeographicStartClock256(climate(180))).toEqual({absoluteCore:45000,calendarOrigin:7500});
 });
 it('retains west absolute date and its distinct local anchor',()=>{
  expect(configuredGeographicStartClock256(climate(-15))).toEqual({absoluteCore:17500,calendarOrigin:1500});
  expect(configuredGeographicStartClock256(climate(-180))).toEqual({absoluteCore:45000,calendarOrigin:1500});
 });
 it('uses the supplied amplitude instead of recomputing the historical latitude model',()=>{
  // Deliberately prepared scalar contract: min annual15 remains >=12 all year.
  // This tests the wrapper input, not the climate of a claimed generated tile.
  expect(configuredGeographicStartClock256({...climate(),latitude:40,meanTemperature:18,amplitude:3})).toEqual({absoluteCore:15000,calendarOrigin:1500});
 });
 it('keeps the primary upper bound9999 and real northern summer fallback',()=>{
  // Deliberate out-of-range source scalar; not a represented campaign witness.
  expect(configuredGeographicStartClock256({...climate(),latitude:40,meanTemperature:20000})).toEqual({absoluteCore:915000,calendarOrigin:91500});
 });
});
