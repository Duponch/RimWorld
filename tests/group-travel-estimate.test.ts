import {expect,test} from 'vitest';
import {createScenarioWorld} from '../src/sim/new-game';
import {generatePlanet,planetHomeInput} from '../src/sim/planet-generation';
import {estimateGroupTravel,previewGroupItinerary,groupRouteArrivals} from '../src/sim/group-travel-estimate';
import {captureGroupMass,type GroupMassCapture} from '../src/sim/group-capture';
import {previewGroupFormation} from '../src/sim/group-authority';
import {planetHomeCivilCore,tileHour,planetEdgeCost} from '../src/sim/planet-navigation';
import {adultAgeTicks} from '../src/sim/animal-life';
import type {WildAnimal} from '../src/sim/wildlife-state';
import {TICKS_PER_DAY,type MaterialPile} from '../src/sim/types';
import {registryCamp} from './helpers/world-maps-v255';
import {registeredMap} from '../src/sim/world-map-context';
/** Prepared owners/stocks/climate, no played collection, ingestion or route.
 * Calculations remain read-only and exercise actual shared food/diet rules. */
function fixture(){
 const w=createScenarioWorld(214,32),planet=generatePlanet(w.seed,planetHomeInput(w),w.tick);w.planet=planet;w.foodRules='adult';
 for(const tile of planet.tiles)tile.meanTemperature=100;
 for(const p of w.pawns){if(p.skills.plants)p.skills.plants.level=0;}
 const p=w.pawns[0]!,mass:GroupMassCapture={grams:0,capacityGrams:35000,carriers:[{pawnId:p.id,grams:0,capacityGrams:35000}]};
 const pile=(item:MaterialPile['item'],quantity:number):MaterialPile=>({id:w.nextId++,kind:'food',item,quantity,owner:{type:'inventory',pawnId:p.id}});
 const estimate=(items:MaterialPile[],members=[p],animals:WildAnimal[]=[])=>estimateGroupTravel(w,{members,animals,items,route:[w.planet!.homeTile],mass});
 return {w,planet,p,mass,pile,estimate};
}
test('food is allocated once per real stack, policies restrict each eater, and preparation does not change owners or RNG',()=>{
 const f=fixture(),one=f.pile('survival-meal',1),before=JSON.stringify(f.w),a=f.estimate([one]);expect(a.ok).toBe(true);if(!a.ok)throw Error(a.reason);
 expect(a.foodDays).toBeCloseTo(.475,5);expect(a.warnings).toContain('short-food');expect(JSON.stringify(f.w)).toBe(before);expect(one.quantity).toBe(1);
 expect(f.estimate([one,one])).toEqual(expect.objectContaining({ok:false}));
 const other=f.w.pawns[1]!;f.w.foodPolicies.push({id:f.w.nextFoodPolicyId++,name:'Préparé sans aliment',allowed:[]});other.foodPolicyId=f.w.foodPolicies.at(-1)!.id;
 const mixed=f.estimate([f.pile('survival-meal',20)],[f.p,other]);expect(mixed.ok&&mixed.foodDays).toBe(0);
});
test('rot is nutrition-weighted, distinct from coverage, and the75% warning is independent of first-stack expiry',()=>{
 const f=fixture(),meal=f.pile('simple-meal',20);meal.rot={atTick:f.w.tick,progress:3.75*TICKS_PER_DAY,rate:1};
 const a=f.estimate([meal]);if(!a.ok)throw Error(a.reason);expect(a.foodDays).toBeCloseTo(9.5,5);expect(a.rotDays).toBeCloseTo(.25,5);expect(a.warnings).toContain('rot-soon');
 const durable=f.pile('survival-meal',30),mixed=f.estimate([{...meal,quantity:1},durable]);if(!mixed.ok)throw Error(mixed.reason);
 expect(mixed.rotDays).toBe(600);expect(mixed.warnings).not.toContain('rot-soon');expect(meal.rot.progress).toBe(3.75*TICKS_PER_DAY);
});
test('actual animal diets and virtual grazing cannot feed a carnivore or duplicate human food',()=>{
 const f=fixture(),a:WildAnimal={id:f.w.nextId++,species:'muffalo',sex:'female',ageTicks:adultAgeTicks('muffalo'),x:1,z:1,food:1,rest:1,state:'idle',path:[],nextDecision:0};
 f.w.wildlife={profile:'biome-fauna-v2',rng:1,animals:[a],eatenPlants:0,eatenNutrition:0,eatenItems:0};
 const grazing=f.estimate([],[],[a]);if(!grazing.ok)throw Error(grazing.reason);expect(grazing.foodDays).toBe(600);
 const fox:WildAnimal={...a,id:f.w.nextId++,species:'red-fox',ageTicks:adultAgeTicks('red-fox')};const hungry=f.estimate([],[],[fox]);expect(hungry.ok&&hungry.foodDays).toBe(0);
 const withPerson=f.estimate([],[f.p],[a]);expect(withPerson.ok&&withPerson.foodDays).toBe(0);
 const bounded=estimateGroupTravel(f.w,{members:[],animals:[a],items:[],route:[f.w.planet!.homeTile],mass:f.mass},1);expect(bounded).toEqual(expect.objectContaining({ok:false,reason:expect.stringContaining('borne')}));
});
test('formation projection combines chosen ground quantities and owned inventories exactly once',()=>{
 const w=registryCamp(),map=registeredMap(w,w.worldMaps!.rootMapId!)!,p=map.pawns[0]!,food=map.piles.find(i=>i.owner.type==='ground'&&i.item==='survival-meal'&&i.quantity>=2)!;
 const before=JSON.stringify(w),plan=previewGroupFormation(map,[p.id],[{pileId:food.id,quantity:2}],52);expect(plan.ok).toBe(true);if(!plan.ok)throw Error(plan.reason);expect(plan.provisions?.ok).toBe(true);
 const selected=[...map.piles.filter(i=>i.owner.type==='inventory'&&i.owner.pawnId===p.id),{...food,quantity:2}],captured=captureGroupMass([p],map.piles.filter(i=>'pawnId'in i.owner&&i.owner.pawnId===p.id),true,map.schemaVersion)!;
 const direct=estimateGroupTravel(map,{members:[p],animals:[],items:selected,route:plan.route,mass:{...captured,grams:plan.mass.grams,capacityGrams:plan.mass.capacityGrams}});expect(direct.ok&&direct.foodDays).toBe(plan.provisions?.ok&&plan.provisions.foodDays);expect(JSON.stringify(w)).toBe(before);
});
test('itinerary counts night rest, bounds25points and rejects impassable legs without changing the planet',()=>{
 const f=fixture(),planet=f.planet,home=planet.homeTile,next=planet.tiles[home]!.neighbours.find(id=>planet.tiles[id]!.biome!=='ocean')!;
 if(next===undefined)throw Error('Prepared world needs its actual adjacent land tile');
 const current=tileHour(planet,home,planetHomeCivilCore(f.w));f.w.tick+=Math.round(((23-current+24)%24)*250);
 const edge=planetEdgeCost(planet,home,next,{homeCivilCore:planetHomeCivilCore(f.w),mass:f.mass})!,arrivals=groupRouteArrivals(f.w,[home,next],f.mass);expect(arrivals.at(-1)!.elapsedCore).toBeGreaterThan(edge);
 const mass={grams:0,capacityGrams:35000,byMember:f.mass.carriers,rations:0,pemmicanUnits:0,provisionNutrition:0},before=JSON.stringify(f.w);
 expect(previewGroupItinerary(f.w,Array.from({length:26},(_,i)=>i%2?next:home),mass).ok).toBe(false);
 const water=planet.tiles.find(t=>t.biome==='ocean')!;expect(previewGroupItinerary(f.w,[home,water.id],mass).ok).toBe(false);expect(JSON.stringify(f.w)).toBe(before);
});
