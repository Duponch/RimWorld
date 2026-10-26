import {expect,test} from 'vitest';
import {createWorld} from '../src/sim/engine';
import {actualPlantDensity256} from '../src/sim/wild-plant-actual-runtime-256';
import {advanceGeographicRenewal262,geographicRenewalTarget262} from '../src/sim/geographic-renewal-runtime-262';
import {CORE_4871_PAWN_KIND_ORDER} from '../src/sim/core-definition-order-4871';
import {produceInitialAnimals256} from '../src/sim/initial-animals-256';
import {WorldGenerationRandom} from '../src/sim/world-generation-random';
import {advanceWildlife,enableBiomeWildlife,enableWildlife} from '../src/sim/wildlife';
import {deteriorationExposure} from '../src/sim/deterioration-rules';
import {moodThoughts} from '../src/sim/mood';
import {recreationSiteValid} from '../src/sim/recreation-space';
import {processRecreation} from '../src/sim/recreation';
import {capturePartySpace292,partyTaskSiteValid292} from '../src/sim/party-space-292';
import {weatherConditionInspection,weatherConditionLabel} from '../src/ui/weather-inspection';
import {readNativeDomainAlerts} from '../src/ui3d/native-domain-alerts';
import type {NeedContext} from '../src/sim/needs';
import type {RecreationTask} from '../src/sim/recreation-rules';
import type {MaterialPile,World} from '../src/sim/types';
import type {WildAnimal} from '../src/sim/wildlife-state';

/** Declared 32-square reader/subsystem fixture, not an accepted save or a
 * played incident. No dose, cell death, rotten item or clinical outcome is
 * supplied. Those effects remain under their separate runtime owners. */
function prepared():World {
  const world=createWorld(481,32,32);
  world.schemaVersion=294;world.tick=122;
  world.tiles=Array.from({length:1024},()=>({terrain:'soil-natural'}));
  world.resources=[];world.structures=[];world.jobs=[];world.piles=[];world.packed=[];
  delete world.roofing;delete world.thermal;delete world.wildlife;
  world.site={revision:3,tileId:0,mapSeed:481,biome:'temperate-forest',hilliness:'flat',river:'none',stones:['granite','slate'],coastAngle:null,mutatorCode:0};
  world.climate={revision:4,tileId:0,adoptedAt:0,calendarOrigin:100000,definition:{latitude:0,longitude:0,meanTemperature:20,rainfall:900,amplitude:3}};
  world.miscIncidents={profile:'cassandra-misc-v1',adoptedAt:0,rng:41,nextCheck:3000,introDone:true,checks:1,opportunities:1,heatwaves:0,
    toxicFallout:{adoptedAt:0,count:1,lastStart:122,active:{startCore:1220,endCore:20000,rng:97,cursor:0}}};
  return world;
}
const active=(w:World)=>w.miscIncidents!.toxicFallout!.active!;
const end=(w:World)=>{delete w.miscIncidents!.toxicFallout!.active;};
const cell=(w:World,x:number,z:number)=>z*w.width+x;
function roof(w:World,cells:number[]){w.roofing={constructed:[...cells].sort((a,b)=>a-b),build:[],remove:[],cursor:0};}
function animal(w:World):WildAnimal{return {id:w.nextId++,species:'hare',sex:'female',x:8,z:8,ageTicks:6000,food:.2,rest:1,state:'idle',path:[],nextDecision:w.tick+100};}
function pile(w:World):MaterialPile{return {id:w.nextId++,item:'wood',kind:'wood',quantity:10,owner:{type:'ground',x:5,z:5},damage:4};}
const falloutThought=(w:World,p=w.pawns[0]!)=>moodThoughts(w,p).filter(t=>t.id==='toxic-fallout');

test('plant density follows the local inclusive Core interval without aging or removing existing resources',()=>{
  const w=prepared(),other=structuredClone(w);end(other);
  for(const [tick,expected] of [[121,1],[122,0],[2000,0],[2001,1]] as const){
    w.tick=tick;const before=JSON.stringify(w);expect(actualPlantDensity256(w)).toBe(expected);expect(JSON.stringify(w)).toBe(before);
  }
  expect(actualPlantDensity256(other)).toBe(1);
  w.tick=122;(w as unknown as {schemaVersion:number}).schemaVersion=293;expect(actualPlantDensity256(w)).toBe(1);
});

test('geographic renewal has zero target during fallout without removing current animals or consuming arrival RNG',()=>{
  const w=prepared(),resident=animal(w);
  w.wildlife={profile:'geographic-fauna-v3',rng:1,animals:[resident],eatenPlants:0,eatenItems:0,eatenNutrition:0,
    geographicRenewal262:{revision:1,adoptedAt:121,lastTick:121}};
  const residents=JSON.stringify(w.wildlife.animals),id=w.nextId,rng=w.wildlife.rng;
  expect(geographicRenewalTarget262(w)).toMatchObject({density:0,weight:0});
  expect(geographicRenewalTarget262(w).current).toBeGreaterThan(0);
  expect(advanceGeographicRenewal262(w,()=>{throw Error('A zero target cannot call the animal producer');})).toBe('full');
  expect(w.wildlife.geographicRenewal262!.lastTick).toBe(122);expect(w.wildlife.rng).toBe(rng);expect(w.nextId).toBe(id);
  expect(JSON.stringify(w.wildlife.animals)).toBe(residents);
  end(w);expect(geographicRenewalTarget262(w).density).toBeGreaterThan(0);expect(geographicRenewalTarget262(w).weight).toBeGreaterThan(0);
});

test('the actual initial fauna producer returns no original and spends no generation draw under zero density',()=>{
  const w=prepared(),random=new WorldGenerationRandom(481),before=JSON.stringify(w),frontier=random.state;
  const result=produceInitialAnimals256(w,{random,pawnKindOrder:CORE_4871_PAWN_KIND_ORDER,unspawnedAnimals:[]});
  expect(result).toMatchObject({status:'ready',density:0,targetWeight:0,attempts:0,originals:[],initialGrowth:[],nextId:w.nextId});
  expect(random.state).toEqual(frontier);expect(JSON.stringify(w)).toBe(before);
});

test('legacy initial population gates offer no animals while preserving the ordinary stored target for the end',()=>{
  const biome=prepared();enableBiomeWildlife(biome,'temperate-forest');
  expect(biome.wildlife!.animals).toEqual([]);expect(biome.wildlife!.population!.targetWeight).toBeGreaterThan(0);
  const owned=biome.wildlife;enableBiomeWildlife(biome,'temperate-forest');expect(biome.wildlife).toBe(owned);
  const old=prepared(),id=old.nextId;enableWildlife(old,4);
  expect(old.wildlife!.animals).toEqual([]);expect(old.nextId).toBe(id);
});

test('a legacy population check advances its calendar but cannot spend RNG or manufacture an arrival during fallout',()=>{
  const w=prepared();w.wildlife={profile:'biome-fauna-v2',rng:123,animals:[],eatenPlants:0,eatenItems:0,eatenNutrition:0,
    population:{biome:'temperate-forest',fullTargetWeight:10,targetWeight:10,nextCheck:122,checks:0,arrivals:0}};
  const id=w.nextId;advanceWildlife(w);
  expect(w.wildlife.animals).toEqual([]);expect(w.wildlife.rng).toBe(123);expect(w.nextId).toBe(id);
  expect(w.wildlife.population).toMatchObject({targetWeight:10,checks:1,arrivals:0,nextCheck:244});
});

test('deterioration multiplies the final unroofed rate after rain, terrain and enclosure without changing damage',()=>{
  const w=prepared(),p=pile(w),index=cell(w,5,5),environment={shelves:new Set<number>(),rain:.5};
  for(const inside of [false,true])for(const marsh of [false,true]){
    if(inside)w.thermal={regions:[{cells:[index],temperature:20}]};else delete w.thermal;
    w.tiles[index]={terrain:marsh?'marsh':'soil-natural'};
    const exposed=deteriorationExposure(w,p,environment);end(w);const ordinary=deteriorationExposure(w,p,environment);
    expect(exposed.rate).toBe(ordinary.rate*3);expect(exposed.baseRate).toBe(ordinary.baseRate);expect(exposed.rate).toBeGreaterThan(0);
    w.miscIncidents!.toxicFallout!.active={startCore:1220,endCore:20000,rng:97,cursor:0};
  }
  expect(p.damage).toBe(4);expect(p.quantity).toBe(10);
});

test('every real roof kind, shelves, non-ground owners and out-of-scope items preserve ordinary deterioration protection',()=>{
  const w=prepared(),p=pile(w),index=cell(w,5,5),environment={shelves:new Set<number>(),rain:1};
  for(const kind of ['constructed','natural-thin','natural-thick'] as const){
    w.roofing={constructed:kind==='constructed'?[index]:[],build:[],remove:[],cursor:0,natural:{thin:kind==='natural-thin'?[index]:[],thick:kind==='natural-thick'?[index]:[]}};
    const before=JSON.stringify(w),covered=deteriorationExposure(w,p,environment);expect(JSON.stringify(w)).toBe(before);
    const inactive=structuredClone(w);end(inactive);expect(covered.rate).toBe(deteriorationExposure(inactive,p,environment).rate);expect(covered.roofed).toBe(true);
  }
  delete w.roofing;
  expect(deteriorationExposure(w,p,{...environment,shelves:new Set([index])})).toMatchObject({status:'protected-shelf',rate:0});
  expect(deteriorationExposure(w,{...p,owner:{type:'pawn',pawnId:w.pawns[0]!.id}},environment)).toMatchObject({status:'not-ground',rate:0});
  expect(deteriorationExposure(w,{...p,item:'steel',kind:'steel'},environment)).toMatchObject({status:'out-of-scope',rate:0});
  active(w).endCore=1219;const expired=deteriorationExposure(w,p,environment),inactive=structuredClone(w);end(inactive);
  expect(expired).toEqual(deteriorationExposure(inactive,p,environment));expect(p.damage).toBe(4);
});

test('weather reads expose a useful local warning with no invented end date, protection or healing',()=>{
  const w=prepared(),before=JSON.stringify(w),rows=weatherConditionInspection(w),condition=rows.find(r=>r.kind==='toxic-fallout');
  expect(condition).toMatchObject({title:'Retombées toxiques',summary:'Retombées toxiques · restez sous un toit'});
  expect(condition!.summary).not.toContain('reste ');
  expect(condition!.body).toContain('Un mur seul ne protège pas');expect(condition!.body).toContain('vêtements actuellement disponibles n’offrent pas de protection');
  expect(condition!.body).toContain('sans guérir les lésions');expect(condition!.body).toContain('objets sensibles à la détérioration');
  expect(weatherConditionLabel(w)).toBe('Retombées toxiques');expect(JSON.stringify(w)).toBe(before);
  w.tick=2000;expect(weatherConditionLabel(w)).toBe('Retombées toxiques');w.tick=2001;expect(weatherConditionLabel(w)).toBe('');
});

test('native alerts reuse the existing warning channel and disappear on actual end without mutating the world',()=>{
  const w=prepared(),before=JSON.stringify(w),alert=readNativeDomainAlerts(w,0).find(a=>a.key==='domain:toxic-fallout');
  expect(alert).toMatchObject({severity:'warning',title:'Retombées toxiques',action:{kind:'site',condition:'toxic-fallout'},targets:[]});
  expect(alert!.tooltip.body).toBe(alert!.body);expect(JSON.stringify(w)).toBe(before);
  end(w);expect(readNativeDomainAlerts(w,0).some(a=>a.key==='domain:toxic-fallout')).toBe(false);
  expect(weatherConditionInspection({tick:122})).toEqual([]);
});

test('the environmental thought is a current minus-five situation removed by a roof or condition end, not a dose or need grant',()=>{
  const w=prepared(),p=w.pawns[0]!;p.x=5;p.z=5;
  const before=JSON.stringify(w);expect(falloutThought(w)).toMatchObject([{offset:-5,kind:'situation'}]);expect(JSON.stringify(w)).toBe(before);
  roof(w,[cell(w,5,5)]);expect(falloutThought(w)).toEqual([]);
  delete w.roofing;end(w);expect(falloutThought(w)).toEqual([]);
});

test('a carried person reads the real local carrier and its unfinished physical edge rather than the saved destination',()=>{
  const w=prepared(),patient=w.pawns[0]!,carrier=w.pawns[1]!;patient.x=5;patient.z=5;patient.state='downed';
  carrier.x=8;carrier.z=8;carrier.rescue={patientId:patient.id,bedId:0,phase:'carry'};
  carrier.motion={from:{x:7,z:8},to:{x:8,z:8},start:121,end:123};roof(w,[cell(w,5,5)]);
  const before=JSON.stringify(w);expect(falloutThought(w,patient)).toMatchObject([{offset:-5}]);expect(JSON.stringify(w)).toBe(before);
  roof(w,[cell(w,5,5),cell(w,7,8)]);expect(falloutThought(w,patient)).toEqual([]);
  w.tick=123;expect(falloutThought(w,patient)).toMatchObject([{offset:-5}]);
});

test('off-map, copied and cryosuspended people cannot borrow the displayed map fallout thought',()=>{
  const w=prepared(),p=w.pawns[0]!,copy=structuredClone(p);
  expect(falloutThought(w,copy)).toEqual([]);
  p.cryptosleepHeldAt271=w.tick;expect(falloutThought(w,p)).toEqual([]);delete p.cryptosleepHeldAt271;
  p.shipCryptosleepHeldAt277=w.tick;expect(falloutThought(w,p)).toEqual([]);delete p.shipCryptosleepHeldAt277;
  w.pawns=w.pawns.filter(q=>q!==p);expect(falloutThought(w,p)).toEqual([]);
});

test('the shared recreation gate rejects outside selection and cancels active outside joy without reward, while covered play remains possible',()=>{
  const w=prepared(),p=w.pawns[0]!,pin={id:w.nextId++,kind:'horseshoes' as const,x:5,z:5,orientation:0 as const,footprint:'standard' as const,material:'wood' as const};
  w.structures=[pin];p.schedule.fill('recreation');
  const task:RecreationTask={activity:'horseshoes',target:{x:10,z:5},buildingId:pin.id,phase:'active',elapsed:2};
  expect(recreationSiteValid(w,task)).toBe(false);
  p.recreation.task=task;const level=p.recreation.level;let released=0;
  const context:NeedContext={search:()=>{throw Error('Invalid active site must cancel before a new search');},move:()=>{throw Error('Invalid active site must not move');},event:()=>{},release:()=>{released++;p.recreation.task=null;return true;}};
  expect(processRecreation(w,p,context)).toBe(false);expect(released).toBe(1);expect(p.recreation.level).toBe(level);
  roof(w,[cell(w,10,5)]);expect(recreationSiteValid(w,task)).toBe(true);
  end(w);delete w.roofing;expect(recreationSiteValid(w,task)).toBe(true);
});

test('party selection and continuation keep covered festivities available and exclude only exposed positions during fallout',()=>{
  const w=prepared(),site={x:10,z:10},target={x:11,z:10},siteIndex=cell(w,10,10),targetIndex=cell(w,11,10);
  w.party292={adoptedAtCore:0,nextCheckCore:5000,rng:4,pending:false,lastStartedAtCore:1220,
    active:{startedAtCore:1220,durationCore:5000,advancedAtCore:1220,organizerId:w.pawns[0]!.id,site,members:[]}};
  const task:RecreationTask={activity:'party',target,buildingId:null,partyStartedAtCore:1220,phase:'active',elapsed:0};
  roof(w,[siteIndex,targetIndex]);const covered=capturePartySpace292(w,site),before=JSON.stringify(w);
  expect(covered.standable(site)).toBe(true);expect(covered.standable(target)).toBe(true);
  expect(covered.cells.every(c=>w.roofing!.constructed.includes(cell(w,c.x,c.z)))).toBe(true);
  expect(partyTaskSiteValid292(w,task,covered.topology,covered.standable)).toBe(true);expect(JSON.stringify(w)).toBe(before);
  roof(w,[siteIndex]);expect(partyTaskSiteValid292(w,task)).toBe(false);
  end(w);delete w.roofing;const ordinary=capturePartySpace292(w,site);
  expect(partyTaskSiteValid292(w,task,ordinary.topology,ordinary.standable)).toBe(true);
});
