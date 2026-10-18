import {expect,test} from 'vitest';
import {createScenarioWorld} from '../src/sim/new-game';
import {generatePlanet,planetHomeInput} from '../src/sim/planet-generation';
import {previewGenericItinerary261,previewGroupItinerary} from '../src/sim/group-travel-estimate';
import {planetHomeCivilCore,tileHour,planetEdgeCost,planetTicksPerMove} from '../src/sim/planet-navigation';
import {actualFinalPushDestination256} from '../src/sim/group-campaign-geometry-256';

/** Existing small literal-planet fixture, deliberately prepared flat/warm.
 * It checks units/conservation, not geographical generation/native chronology. */
function prepared(){
 const w=createScenarioWorld(214,32),planet=generatePlanet(w.seed,planetHomeInput(w),w.tick);w.planet=planet;
 const home=planet.homeTile,next=planet.tiles[home]!.neighbours.find(id=>planet.tiles[id]!.biome!=='ocean');if(next===undefined)throw Error('Prepared adjacent land tile absent');
 for(const tile of planet.tiles){tile.meanTemperature=100;tile.hilliness='flat';}
 const hour=tileHour(planet,home,planetHomeCivilCore(w));w.tick+=Math.round(((12-hour+24)%24)*250);
 return {w,planet,home,next};
}
test('generic ETA uses3464Core/movement, search scalar3300 is distinct, and real masses keep their current cost',()=>{
 const f=prepared(),homeCivilCore=planetHomeCivilCore(f.w),before=JSON.stringify(f.w);
 expect(planetTicksPerMove({homeCivilCore,genericTicksPerMove:3300})).toBe(3300);
 expect(planetEdgeCost(f.planet,f.home,f.next,{homeCivilCore,genericTicksPerMove:3464})).toBe(3464);
 const generic=previewGenericItinerary261(f.w,[f.home,f.next]);if(!generic.ok)throw Error(generic.reason);expect(generic.durationCore).toBe(3464);expect(generic.route).toEqual([f.home,f.next]);
 const real={grams:0,capacityGrams:35000,byMember:[],rations:0,pemmicanUnits:0,provisionNutrition:0},group=previewGroupItinerary(f.w,[f.home,f.next],real);if(!group.ok)throw Error(group.reason);
 expect(group.durationCore).toBe(2210);expect(JSON.stringify(f.w)).toBe(before);expect(f.w.group).toBeUndefined();
});
test('generic night arrival and later legs use the real civil clock, without allocating owners or changing RNG',()=>{
 const f=prepared(),noon=tileHour(f.planet,f.home,planetHomeCivilCore(f.w));expect(noon).toBeCloseTo(12,6);
 // The old +1100 local ticks meant16:24, still daylight. Prepare23:00 by
 // the real250-local-ticks/hour conversion, before the conservation baseline.
 f.w.tick+=Math.round(((23-noon+24)%24)*250);const homeCore=planetHomeCivilCore(f.w),hour=tileHour(f.planet,f.home,homeCore);expect(hour).toBeCloseTo(23,6);
 const before=JSON.stringify(f.w),result=previewGenericItinerary261(f.w,[f.home,f.next,f.home]);if(!result.ok)throw Error(result.reason);
 const first=(30-hour)*2500+3464;expect(result.route).toEqual([f.home,f.next,f.home]);expect(result.waypointCore[1]).toBeGreaterThan(3464);expect(result.waypointCore[1]).toBeCloseTo(first,6);
 // Independent two-edge arithmetic: the return uses the *arrival* civil
 // clock at its real origin, never the original23:00 or a second first-leg wait.
 const secondHour=tileHour(f.planet,f.next,homeCore+first),dawnWait=secondHour<6?(6-secondHour)*2500:secondHour>22?(30-secondHour)*2500:0;
 const daylight=(22-(dawnWait?6:secondHour))*2500,nightRest=daylight<3464&&!actualFinalPushDestination256(f.w,f.home)?20000:0;
 expect(planetEdgeCost(f.planet,f.next,f.home,{homeCivilCore:homeCore+first,genericTicksPerMove:3464})).toBe(3464);
 expect(result.waypointCore[2]).toBeGreaterThan(result.waypointCore[1]!);expect(result.waypointCore[2]).toBeCloseTo(first+dawnWait+3464+nightRest,6);expect(result.durationCore).toBe(result.waypointCore[2]);expect(JSON.stringify(f.w)).toBe(before);
});
test('free generic origin can be cleared; actual impassable tiles, duplicates and more than25points refuse',()=>{
 const f=prepared(),water=f.planet.tiles.find(t=>t.biome==='ocean')!;
 expect(previewGenericItinerary261(f.w,[])).toEqual({ok:true,points:[],route:[],arrivals:[],waypointCore:[],durationCore:0});
 expect(previewGenericItinerary261(f.w,[water.id]).ok).toBe(false);expect(previewGenericItinerary261(f.w,[f.home,f.home]).ok).toBe(false);expect(previewGenericItinerary261(f.w,Array.from({length:26},(_,i)=>i%2?f.home:f.next)).ok).toBe(false);
});
