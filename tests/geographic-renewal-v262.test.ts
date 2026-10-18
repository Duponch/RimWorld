import {test,expect} from 'vitest';
import {emptyGeographicLandscape256} from '../src/sim/generation';
import {initializeGeographicRenewal262,validGeographicRenewal262,validGeographicRenewalCampaignRaw262} from '../src/sim/geographic-renewal-state-262';
import {geographicRenewalDue262,geographicRenewalTarget262,advanceGeographicRenewal262} from '../src/sim/geographic-renewal-runtime-262';
import {captureGeographicRenewalSpace262} from '../src/sim/geographic-renewal-space-262';
import {advanceWildlife} from '../src/sim/wildlife';
import {INITIAL_ANIMAL_FACTS_256} from '../src/sim/initial-animal-data-256';
import {localBiomeRules256} from '../src/sim/local-biome-rules-v256';
import {stagedCampArrivalRandom256} from '../src/sim/camp-center-entry-256';
import {SCHEMA_VERSION,type World} from '../src/sim/types';
import {attachGeneratedAnimalGrowth256} from '../src/sim/animal-growth-runtime-256';
import {adultAgeTicks} from '../src/sim/animal-life';
import {MAX_WILDLIFE,type WildAnimal} from '../src/sim/wildlife-state';
import {initialAnimalTargetWeight256} from '../src/sim/initial-animals-256';

/** Declared small physical subsystem fixture. No accepted Planet/campaign,
 * composed generation, Core seed parity or natural chronology is claimed.
 * The tested producer is the real SIM advanceWildlife, never a spawn mock. */
function prepared(){
 expect(SCHEMA_VERSION).toBe(262);
 const w=emptyGeographicLandscape256(262,32,32);w.tick=121;w.tiles=Array.from({length:1024},()=>({terrain:'soil-natural'}));
 w.site={revision:3,tileId:0,mapSeed:262,biome:'temperate-forest',hilliness:'flat',river:'none',stones:['granite','slate'],coastAngle:null,mutatorCode:0};
 w.climate={revision:4,tileId:0,adoptedAt:121,calendarOrigin:100000,definition:{latitude:0,longitude:0,meanTemperature:20,rainfall:900,amplitude:3}};
 w.wildlife={profile:'geographic-fauna-v3',rng:1,animals:[],eatenPlants:0,eatenItems:0,eatenNutrition:0};initializeGeographicRenewal262(w);return w;
}
const random=()=>{const r=stagedCampArrivalRandom256(41);return {...r,float:(min:number,max:number)=>min+(max-min)*r.value()};};

test('1213Core is visited in successive ten-Core windows, without122-step drift or catch-up',()=>{
 const due:number[]=[];for(let tick=1;tick<=1213;tick++)if(geographicRenewalDue262(tick-1,tick))due.push(tick);
 expect(due).toEqual([122,243,364,486,607,728,850,971,1092,1213]);
 expect(()=>geographicRenewalDue262(121,123)).toThrow(/discontinuity/);expect(()=>geographicRenewalDue262(121,121)).toThrow();
});

test('absent historical marker stays literal and saves refuse stale/future/accessor clocks on every original map',()=>{
 const w=prepared();delete w.wildlife!.geographicRenewal262;const before=JSON.stringify(w);
 expect(advanceGeographicRenewal262(w,()=>{throw Error('Historical runtime must remain absent');})).toBe('absent');expect(JSON.stringify(w)).toBe(before);
 const marker={revision:1 as const,adoptedAt:121,lastTick:121};w.wildlife!.geographicRenewal262=marker;
 expect(validGeographicRenewal262(w,262)).toBe(true);for(const version of [255,256,259,260,261,263])expect(validGeographicRenewal262(w,version)).toBe(false);
 marker.lastTick=120;expect(validGeographicRenewal262(w,262)).toBe(false);marker.lastTick=121;
 const raw={tick:121,worldMaps:{sites:[{id:1,map:{site:w.site,wildlife:w.wildlife}}]}};
 expect(validGeographicRenewalCampaignRaw262(raw,262)).toBe(true);expect(validGeographicRenewalCampaignRaw262(raw,261)).toBe(false);
 let calls=0;Object.defineProperty(w.wildlife,'geographicRenewal262',{enumerable:true,get(){calls++;return marker;}});expect(validGeographicRenewal262(w,262)).toBe(false);expect(calls).toBe(0);
});

test('declared real successful chance births the chosen original group at actual entry cells, preserving goods and reservations',()=>{
 const w=prepared(),items=JSON.stringify({piles:w.piles,jobs:w.jobs,packed:w.packed}),beforeId=w.nextId;
 w.tick=122;advanceWildlife(w);expect(w.wildlife!.animals.length).toBeGreaterThan(0);expect(w.nextId).toBe(beforeId+w.wildlife!.animals.length);
 const chosen=new Set<string>(localBiomeRules256('temperate-forest',262)!.wildAnimals.map(r=>INITIAL_ANIMAL_FACTS_256[r.defId].species));
 for(const a of w.wildlife!.animals){expect(chosen.has(a.species)).toBe(true);expect(a.id).toBeGreaterThanOrEqual(beforeId);expect(a.growthTracker).toBeDefined();expect(a.domestic).toBeUndefined();expect(a.state).not.toBe('dead');expect(Math.min(a.x,a.z,31-a.x,31-a.z)).toBeLessThanOrEqual(8);}
 expect(JSON.stringify({piles:w.piles,jobs:w.jobs,packed:w.packed})).toBe(items);expect(validGeographicRenewal262(w,262)).toBe(true);
 const after=JSON.stringify(w);expect(advanceGeographicRenewal262(w,()=>{throw Error('duplicate tick must not birth');})).toBe('same-tick');expect(JSON.stringify(w)).toBe(after);
});

test('season and actual biome determine all commonalities; an empty/hostile season never aliases a species',()=>{
 const w=prepared();if(w.climate?.revision!==4)throw Error('Declared geographic climate absent');w.climate.definition.meanTemperature=-100;
 const cold=geographicRenewalTarget262(w);expect(cold.entries).toEqual([]);expect(cold.weight).toBe(0);
 w.tick=122;const before=w.nextId;advanceWildlife(w);expect(w.wildlife!.animals).toEqual([]);expect(w.nextId).toBe(before);
 if(w.site?.revision!==3)throw Error('Declared Site3 absent');w.site.biome='sea-ice';const ice=geographicRenewalTarget262(w);expect(ice.entries).toEqual([]);expect(ice.weight).toBe(0);
 // SeaIce has real wild commonalities; this hostile season yields zero.
 // The empty Ocean rule alone exercises transient0/0, not a playable map.
 const ocean=localBiomeRules256('ocean',262)!;expect(ocean.wildAnimals).toEqual([]);const empty=initialAnimalTargetWeight256(w.width*w.height,ocean.scalars.animalDensity,0,0);expect(Number.isNaN(empty.weight)).toBe(true);expect(validGeographicRenewal262(w,262)).toBe(true);
});

test('actual resident capacity counts owned animals without counting them toward wild ecology or truncating the selected group',()=>{
 const w=prepared();
 for(let i=0;i<MAX_WILDLIFE;i++){
  const a:WildAnimal={id:w.nextId++,species:'hare',sex:'female',x:i%32,z:Math.floor(i/32),ageTicks:adultAgeTicks('hare'),food:.1,rest:1,state:'idle',path:[],nextDecision:122,domestic:{since:121,care:'best',tameness:1,nextDecay:6121}};
  attachGeneratedAnimalGrowth256(a,w.tick*10,w.schemaVersion);w.wildlife!.animals.push(a);
 }
 expect(geographicRenewalTarget262(w).current).toBe(0);const before=JSON.stringify(w.wildlife!.animals),nextId=w.nextId;w.tick=122;
 expect(advanceGeographicRenewal262(w,()=>{throw Error('A full physical owner buffer cannot append');})).toBe('capacity');
 expect(JSON.stringify(w.wildlife!.animals)).toBe(before);expect(w.nextId).toBe(nextId);expect(w.wildlife!.animals).toHaveLength(MAX_WILDLIFE);
});

test('real edge gates refuse a roofed border and a solid border; no centre or dry-terrain substitute is created',()=>{
 const w=prepared(),edge:number[]=[];for(let i=0;i<1024;i++){const x=i%32,z=Math.floor(i/32);if(x===0||z===0||x===31||z===31)edge.push(i);}
 w.roofing={constructed:edge,build:[],remove:[],cursor:0};expect(captureGeographicRenewalSpace262(w).entry(random())).toBeUndefined();
 delete w.roofing;for(const i of edge)w.tiles[i]={terrain:'rock',stone:'granite'};const before=JSON.stringify(w.tiles);
 expect(captureGeographicRenewalSpace262(w).entry(random())).toBeUndefined();expect(JSON.stringify(w.tiles)).toBe(before);
});

test('marker and existing wildlife random stream continue exactly after JSON transport; a missing tick refuses instead of replaying',()=>{
 const a=prepared(),b=JSON.parse(JSON.stringify(a)) as World;a.tick++;b.tick++;advanceWildlife(a);advanceWildlife(b);expect(JSON.stringify(b)).toBe(JSON.stringify(a));
 const before=JSON.stringify(a);a.tick+=2;expect(()=>advanceWildlife(a)).toThrow(/discontinuity/);a.tick-=2;expect(JSON.stringify(a)).toBe(before);
});
