import {expect,test} from 'vitest';
import {validWildlifeMotionTiming as valid} from '../src/sim/wildlife-save.ts';
import {moveAnimal} from '../src/sim/wildlife-navigation.ts';
import {actualAnimalProfile256,actualAnimalMoveSpeedFactor256} from '../src/sim/actual-animal-profile-256.ts';
import {animalStageAgeTicks256} from '../src/sim/animal-core-v256.ts';
import {newWeatherState} from '../src/sim/weather.ts';
import {weatherMoveFactor} from '../src/sim/weather-exposure.ts';
import {newDuckFlight256} from '../src/sim/duck-flight-state-256.ts';
import {travelEnd,type TravelSegment} from '../src/sim/travel-timing.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';
import type {World} from '../src/sim/types.ts';
const tick=15091;
const adult=(species:WildAnimal['species'])=>({species,ageTicks:species==='tortoise'?animalStageAgeTicks256('tortoise','adult'):0} as WildAnimal);
const edge=(speedFactor:number,terrainDelay=0):TravelSegment=>{const m={from:{x:3,z:3},to:{x:4,z:4},start:tick,end:tick,speedFactor,terrainDelay};m.end=travelEnd(m);return m;};

test('captured geographic256 tortoise edges from actual arrival15091 admit unchanged, without querying current illness or weather',()=>{
 const a=adult('tortoise');
 const edges:TravelSegment[]=[
  {from:{x:111,z:25},to:{x:110,z:24},start:15071.578737779539,end:15127.602957346899,speedFactor:.076,terrainDelay:.2},
  {from:{x:81,z:21},to:{x:82,z:20},start:15066.120945942766,end:15131.793796052632,speedFactor:.06480000000000002,terrainDelay:.2},
 ];
 const before=JSON.stringify(edges);
 for(const m of edges){expect(valid(tick,256,a,m)).toBe(true);expect(valid(tick,263,a,m)).toBe(true);expect(valid(tick,255,a,m)).toBe(false);}
 expect(JSON.stringify(edges)).toBe(before);
});

test('prepared clear-weather timing adaptation: real moveAnimal captures a baby tortoise diagonal longer than100, no World tick or clinical condition is played',()=>{
 // Minimal physical-edge inputs only; this does not qualify map generation,
 // navigation or a campaign. The supplied step is the already-approved edge.
 const w={schemaVersion:256,tick:100,width:8,height:8,tiles:Array.from({length:64},()=>({terrain:'grass' as const})),structures:[],jobs:[],piles:[],weather:newWeatherState(7,100)} as unknown as World;
 // This prepared producer witness intentionally uses the real constructor's
 // clear weather (factor1), not a claimed rainy-thunderstorm factor.
 const a={id:1,species:'tortoise',ageTicks:0,x:3,z:3,state:'idle',path:[{x:4,z:4}]} as WildAnimal;
 expect(actualAnimalProfile256(a).walkTicks).toBe(30);expect(actualAnimalMoveSpeedFactor256(a)).toBe(.5);
 expect(weatherMoveFactor(w,a)).toBe(1);expect(moveAnimal(w,a,()=>true,.16)).toBe(true);
 const m=a.motion!,before=JSON.stringify(m);expect(m.end).toBeGreaterThan(w.tick+100);expect(m.speedFactor).toBeCloseTo(.008,12);
 expect(valid(w.tick,256,a,m)).toBe(true);
 // Current stage/weather may change while the captured edge is still owned.
 a.ageTicks=animalStageAgeTicks256('tortoise','adult');w.weather!.current=w.weather!.previous='rainy-thunderstorm';w.weather!.ageCore=4000;
 expect(valid(w.tick,263,a,m)).toBe(true);expect(JSON.stringify(m)).toBe(before);
 m.stuns=[{start:w.tick,end:w.tick+9.5}];m.stagger=[{start:w.tick,end:w.tick+9.4}];m.end=travelEnd(m);
 expect(valid(w.tick,263,a,m)).toBe(true);expect(valid(w.tick,263,a,JSON.parse(JSON.stringify(m)))).toBe(true);
 m.stuns[0]!.end=w.tick+9.6;m.end=travelEnd(m);expect(valid(w.tick,263,a,m)).toBe(false);
});

test('captured geographic envelope rejects fabricated speeds, nonfinite factors and altered duration curves',()=>{
 const a=adult('tortoise'),floor=3/(actualAnimalProfile256(a).walkTicks/(.16*.8*.5));
 expect(valid(tick,263,a,edge(floor))).toBe(true);
 for(const speed of [0,-1,Number.NaN,Infinity,floor/2,3/actualAnimalProfile256(a).moveTicks*1.01])expect(valid(tick,263,a,edge(speed))).toBe(false);
 const m=edge(.076,.2);m.end+=.01;expect(valid(tick,263,a,m)).toBe(false);
 m.end=Infinity;expect(valid(tick,263,a,m)).toBe(false);
 const far=edge(floor,50);far.end=tick+100000;expect(valid(tick,263,a,far)).toBe(false);
});

test('captured original profiles distinguish marked seven baby floor while the real gazelle purposeful ceiling remains3',()=>{
 const legacy=adult('gazelle'),marked={...legacy,growthTracker:{revision:1 as const,value:1,nextCheckCore:null}},max=3/actualAnimalProfile256(marked).moveTicks;
 expect(max).toBe(3);expect(valid(tick,263,marked,edge(max))).toBe(true);expect(valid(tick,263,legacy,edge(max))).toBe(true);expect(valid(tick,263,marked,edge(max*1.01))).toBe(false);
 const hare=adult('hare'),markedHare={...hare,growthTracker:{revision:1 as const,value:1,nextCheckCore:null}};
 const babyMinimum=3/(actualAnimalProfile256(markedHare).walkTicks/(.16*.8*.5));
 expect(valid(tick,263,markedHare,edge(babyMinimum))).toBe(true);expect(valid(tick,263,hare,edge(babyMinimum))).toBe(false);
});

test('captured Duck flight boost follows the real producer and remains valid after landing; another species cannot acquire it',()=>{
 const w={schemaVersion:256,tick:100,width:8,height:8,tiles:Array.from({length:64},()=>({terrain:'grass' as const})),structures:[],jobs:[],piles:[]} as unknown as World;
 const a={id:1,species:'duck',ageTicks:animalStageAgeTicks256('duck','adult'),x:3,z:3,state:'idle',path:[{x:4,z:4}],flee:{danger:{x:1,z:1},until:200},flight:{...newDuckFlight256(1000),phase:'flying',flyingCore:100}} as WildAnimal;
 expect(moveAnimal(w,a,()=>true)).toBe(true);const m=a.motion!;expect(m.animalFlight).toBe(true);
 a.flight!.phase='grounded';expect(valid(w.tick,263,a,m)).toBe(true);
 const noFlag={...m};delete noFlag.animalFlight;expect(valid(w.tick,263,a,noFlag)).toBe(false);
 expect(valid(w.tick,263,adult('tortoise'),m)).toBe(false);expect(valid(w.tick,255,a,m)).toBe(false);
});

test('historical<=255 and migrated unmarked originals keep literal speed and +100; only proven256 timing expands',()=>{
 const a=adult('hare'),m=edge(.096*.8,50);expect(m.end).toBeGreaterThan(tick+100);
 expect(valid(tick,255,a,m)).toBe(false);expect(valid(tick,256,a,m)).toBe(false);expect(valid(tick,263,a,m)).toBe(false);
 const marked={...a,growthTracker:{revision:1 as const,value:1,nextCheckCore:null}};expect(valid(tick,263,marked,m)).toBe(true);
 for(const speed of [.096*.8,3])expect(valid(tick,263,a,edge(speed))).toBe(true);
 const short=edge(.096*.8);expect(valid(tick,255,a,short)).toBe(true);expect(valid(tick,86,a,short)).toBe(false);
 expect(valid(tick,86,a,edge(.096))).toBe(true);expect(valid(tick,76,a,edge(.6))).toBe(true);expect(valid(tick,76,a,edge(.61))).toBe(false);
});
