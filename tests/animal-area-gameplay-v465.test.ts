import {expect,test} from 'vitest';
import {SCHEMA_VERSION} from '../src/sim/types.ts';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {fixturePower} from './scenarios/power.ts';
import {triggerBreakdown,retireBreakdownJob} from '../src/sim/breakdowns.ts';
import {planJobDrops} from '../src/sim/work-release.ts';
import {ANIMAL_SPECIES_IDS} from '../src/sim/animal-species.ts';
import {registeredMapId} from '../src/sim/world-map-context.ts';
import {supportsAnimalAreas287,currentAnimalAreaChoice287,captureAnimalAreaPolicy287,animalAreaPolicyFromCells287,createAnimalAreaPolicyReader287} from '../src/sim/animal-area-policy-287.ts';
import {prepareAnimalAreaChange287} from '../src/sim/animal-area-change-287.ts';
import {processAnimalAreaReturn287} from '../src/sim/animal-area-runtime-287.ts';
import {animalNavigation,moveAnimal} from '../src/sim/wildlife-navigation.ts';
import {animalFoods,animalMealTarget} from '../src/sim/wildlife-food.ts';
import {reconcileAnimalRest,animalSpotAvailable} from '../src/sim/animal-rest.ts';
import {constructFreshInitialWildAnimal256} from '../src/sim/initial-animal-constructor-256.ts';
import {INITIAL_ANIMAL_FACTS_256} from '../src/sim/initial-animal-data-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {TAMENESS_DECAY} from '../src/sim/animal-handling.ts';
import {setAnimalTrainingWanted282,advanceAnimalTraining282,completeAnimalTraining282} from '../src/sim/animal-training-282.ts';
import {storageCells} from '../src/sim/shelf-storage.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {WeightedSearch} from '../src/sim/weighted-search.ts';
import {EMPTY_NAVIGATION_COSTS} from '../src/sim/navigation-costs.ts';
import type {Cell} from '../src/sim/types.ts';

// Real existing32² colony and actual fresh Labrador constructor. Choices,
// positions and jobs below are authored initial conditions, not played gains.
function camp(){const f=animalHaulingCamp459();f.animal.path=[];f.animal.state='idle';f.animal.nextDecision=f.world.tick;return f;}
function choice(f:ReturnType<typeof camp>,cells:readonly Cell[]){
 const w=f.world,id=w.nextId++;w.allowedAreas=[{id,label:'Cour des animaux',color:0x123456,cells:cells.map(c=>c.z*w.width+c.x).sort((a,b)=>a-b)}];
 f.animal.animalMapAreas287={revision:1,assignments:[{mapId:registeredMapId(w)!,choice:{kind:'allowed',areaId:id}}]};return w.allowedAreas[0]!;
}
// Same real tracker preparation used by V459 unit fixtures; no lesson/food
// service or elapsed clinical campaign is claimed by these authored clocks.
function trained(f:ReturnType<typeof camp>){
 expect(setAnimalTrainingWanted282(f.world,f.animal.id,'haul',true).ok).toBe(true);
 for(const skill of ['obedience','haul'] as const)for(let i=0;i<(skill==='obedience'?3:7);i++){
  if(f.animal.training!.lastAttemptCore!==undefined)f.world.tick=Math.max(f.world.tick,Math.ceil((f.animal.training!.lastAttemptCore+15000)/10));
  advanceAnimalTraining282(f.world,f.animal);expect(completeAnimalTraining282(f.world,f.animal,skill,true,f.handler.id)).toBe(true);
 }
}

test('all represented species resolve to32 area profiles and21 pen profiles, independently of Haul',()=>{
 expect(ANIMAL_SPECIES_IDS.filter(supportsAnimalAreas287)).toHaveLength(32);
 expect(ANIMAL_SPECIES_IDS.filter(s=>!supportsAnimalAreas287(s))).toHaveLength(21);
 expect(supportsAnimalAreas287('cat')).toBe(true);expect(supportsAnimalAreas287('muffalo')).toBe(false);
});

test('canonical Home survives its empty effect; fresh same-tick reads observe in-place cells without mutation',()=>{
 const f=camp(),{world:w,animal:a}=f;
 a.animalMapAreas287={revision:1,assignments:[{mapId:registeredMapId(w)!,choice:{kind:'home'}}]};delete w.home;
 const before=JSON.stringify(w);expect(currentAnimalAreaChoice287(w,a)).toEqual({kind:'home'});expect(captureAnimalAreaPolicy287(w,a)).toBeUndefined();expect(JSON.stringify(w)).toBe(before);
 w.home=[12*w.width+12];const old=captureAnimalAreaPolicy287(w,a)!;w.home.push(12*w.width+13);
 expect(old.has(12*w.width+13)).toBe(false);expect(captureAnimalAreaPolicy287(w,a)!.has(12*w.width+13)).toBe(true);
 Object.assign(w,{schemaVersion:286});expect(currentAnimalAreaChoice287(w,a)).toBeNull();expect(captureAnimalAreaPolicy287(w,a)).toBeUndefined();
 Object.assign(w,{schemaVersion:SCHEMA_VERSION+1});expect(captureAnimalAreaPolicy287(w,a)).toBeUndefined();
});

test('a shared navigation object reads this original current choice; disjoint islands remain connected through outside',()=>{
 const f=camp(),{world:w,animal:a}=f;Object.assign(a,{x:10,z:10});const area=choice(f,[{x:10,z:10},{x:12,z:10}]);
 const nav=animalNavigation(w);expect(nav.step(a,{x:11,z:10})).toBe(true);
 expect(nav.route(a,[{x:11,z:10}])).toBeUndefined();expect(nav.route(a,[{x:12,z:10}])).toEqual([{x:11,z:10},{x:12,z:10}]);
 area.cells=[10*w.width+10,10*w.width+11];expect(nav.route(a,[{x:11,z:10}])).toEqual([{x:11,z:10}]);expect(nav.route(a,[{x:12,z:10}])).toBeUndefined();
});

test('two original animals share geometry and a pass reader without sharing their different area grids',()=>{
 const f=camp(),{world:w,animal:a}=f;Object.assign(a,{x:10,z:10});choice(f,[{x:10,z:10},{x:12,z:10}]);
 const random=WorldGenerationRandom.fromState(f.preparation.constructorState),made=constructFreshInitialWildAnimal256({fact:INITIAL_ANIMAL_FACTS_256.LabradorRetriever,id:w.nextId,cell:{x:10,z:11},tick:w.tick,random});
 if(made.status!=='ready')throw Error('Second original refused without retry: '+made.reason);const other=made.animal;w.nextId++;
 other.domestic={since:w.tick,care:'herbal',tameness:5,nextDecay:w.tick+TAMENESS_DECAY};w.wildlife!.animals.push(other);
 const second={id:w.nextId++,label:'Deuxième cour',color:0x654321,cells:[11*w.width+10,11*w.width+12]};w.allowedAreas!.push(second);
 other.animalMapAreas287={revision:1,assignments:[{mapId:registeredMapId(w)!,choice:{kind:'allowed',areaId:second.id}}]};
 const read=createAnimalAreaPolicyReader287(w),nav=animalNavigation(w,false,true,undefined,false,undefined,read);
 expect(nav.route(a,[{x:12,z:10}])).toBeDefined();expect(nav.route(other,[{x:12,z:10}])).toBeUndefined();
 expect(nav.route(other,[{x:12,z:11}])).toBeDefined();expect(nav.route(a,[{x:12,z:11}])).toBeUndefined();
});

test('outside cost is additive60000 even between repeaters, with ordinary diagonal/cardinal scale untouched',()=>{
 const policy=animalAreaPolicyFromCells287({width:3,height:1},{kind:'home'},[0,2])!;
 const repeaters=new Set([0,1,2]),extra={get:()=>900,has:()=>true,maximum:900};
 const search=new WeightedSearch(3,1,0,new Uint8Array(3),extra,repeaters,EMPTY_NAVIGATION_COSTS,new Set(),policy.costs);
 expect(search.finish(new Set([2])).costs[2]).toBe(62000);
});

test('outside routing preference never becomes a physical movement delay or changes RNG',()=>{
 const f=camp(),{world:w,animal:a}=f;Object.assign(a,{x:10,z:10});choice(f,[{x:10,z:10},{x:12,z:10}]);
 const baseline=structuredClone(w),other=baseline.wildlife!.animals.find(p=>p.id===a.id)!;delete other.animalMapAreas287;
 a.path=[{x:11,z:10}];other.path=[{x:11,z:10}];const before=w.rng;
 const n=animalNavigation(w),b=animalNavigation(baseline);
 expect(moveAnimal(w,a,n.step,1,n.geometry)).toBe(true);expect(moveAnimal(baseline,other,b.step,1,b.geometry)).toBe(true);
 expect(a.motion).toEqual(other.motion);expect(w.rng).toBe(before);expect(a.motion!.to).toEqual({x:11,z:10});
});

test('food source outside is refused even when its contact cell is inside; empty effect restores real source',()=>{
 const f=camp(),{world:w,animal:a}=f,area=choice(f,[{x:9,z:12}]);
 a.meal={kind:'pile',id:f.kibbleId,quantity:1,progress:0};const before=JSON.stringify(w);
 expect(animalFoods(w,a)).toEqual([]);expect(animalMealTarget(w,a)).toBeUndefined();expect(JSON.stringify(w)).toBe(before);
 area.cells=[];expect(animalFoods(w,a).some(p=>p.id===f.kibbleId)).toBe(true);expect(animalMealTarget(w,a)).toEqual({type:'ground',x:8,z:12});
});

test('cold preparation is pure and keeps meal progress/path when the real source remains admitted',()=>{
 const f=camp(),{world:w,animal:a}=f,source=w.piles.find(p=>p.id===f.kibbleId)!;
 a.meal={kind:'pile',id:source.id,quantity:1,progress:17};a.path=[{x:11,z:12},{x:10,z:12},{x:9,z:12}];a.state='moving';
 const oldPath=a.path,oldMeal=a.meal,before=JSON.stringify(w),plan=prepareAnimalAreaChange287(w,[{animal:a,choice:{kind:'home'},cells:[12*w.width+8]}]);
 expect(plan.ok).toBe(true);expect(JSON.stringify(w)).toBe(before);if(!plan.ok)throw Error(plan.reason);
 expect(plan.noop).toBe(true);expect(plan.commit()).toBe(true);expect(a.path).toBe(oldPath);expect(a.meal).toBe(oldMeal);expect(plan.commit()).toBe(false);expect(JSON.stringify(w)).toBe(before);
});

test('a same-tick source mutation invalidates the cold admission before any planned write',()=>{
 const f=camp(),{world:w,animal:a}=f;a.meal={kind:'pile',id:f.kibbleId,quantity:1,progress:0};
 const plan=prepareAnimalAreaChange287(w,[{animal:a,choice:{kind:'home'},cells:[0]}]);if(!plan.ok)throw Error(plan.reason);
 expect(plan.current()).toBe(true);a.meal.progress=3;const changed=JSON.stringify(w);
 expect(plan.current()).toBe(false);expect(plan.commit()).toBe(false);expect(JSON.stringify(w)).toBe(changed);
});

test('voluntary sleeping bed outside is interrupted without losing assignment; guarded refusal mutates nothing',()=>{
 const f=camp(),{world:w,animal:a}=f;Object.assign(a,{x:12,z:19,state:'sleeping'});a.animalRest={spotId:f.spotId,phase:'sleep'};
 const row={animal:a,choice:{kind:'home' as const},cells:[12*w.width+12]},before=JSON.stringify(w),plan=prepareAnimalAreaChange287(w,[row]);
 expect(plan.ok).toBe(true);expect(JSON.stringify(w)).toBe(before);if(!plan.ok)throw Error(plan.reason);expect(plan.commit()).toBe(true);
 expect(a.animalRest).toBeUndefined();expect(a.state).toBe('idle');expect(a.domestic!.bedId).toBe(f.spotId);
 a.meal={kind:'pile',id:f.kibbleId,quantity:1,progress:0};Object.defineProperty(a,'meal',{configurable:false});
 const guarded=JSON.stringify(w);expect(prepareAnimalAreaChange287(w,[row]).ok).toBe(false);expect(JSON.stringify(w)).toBe(guarded);
});

test('cold drop projects human cargo first, then preserves the exact animal pile and its active edge',()=>{
 const f=camp(),{world:w,animal:a}=f;trained(f);const pile=w.piles.find(p=>p.id===f.woodId)!,zone=storageCells(w)[0]!;
 for(let z=9;z<=11;z++)for(let x=9;x<=12;x++)if(!(z===10&&(x===10||x===11)))fixtureBuilding(w,'wall',x,z);
 Object.assign(a,{x:11,z:10,state:'moving'});a.path=[{x:12,z:10}];a.motion={from:{x:10,z:10},to:{x:11,z:10},start:w.tick,end:w.tick+2,speedFactor:1.5,terrainDelay:0};
 pile.owner={type:'inventory',pawnId:a.id};a.haul={sourcePileId:pile.id,quantity:pile.quantity,phase:'deliver',carryPileId:pile.id,destination:{type:'stockpile',stockpileId:zone.id},startedAtCore:w.tick*10};
 Object.assign(f.handler,{x:10,z:10});const humanId=w.nextId;addMaterial(w,'steel',1,{type:'pawn',pawnId:f.handler.id},'steel');f.handler.interruptedCargo=true;
 const oldMotion=a.motion,before=JSON.stringify(w),prior=new Map([[humanId,{x:10,z:10}]]),plan=prepareAnimalAreaChange287(w,[{animal:a,choice:{kind:'home'},cells:[12*w.width+12]}],prior);
 expect(plan.ok).toBe(true);expect(JSON.stringify(w)).toBe(before);if(!plan.ok)throw Error(plan.reason);
 expect(plan.begin()).toBe(true);w.piles.find(p=>p.id===humanId)!.owner={type:'ground',x:10,z:10};expect(plan.adoptAdmitted()).toBe(true);
 expect(pile.owner).toEqual({type:'ground',x:11,z:10});expect(a.motion).toBe(oldMotion);expect(a.haul).toBeUndefined();expect(a.path).toEqual([]);expect(w.piles.filter(p=>p.id===pile.id)).toEqual([pile]);expect(w.nextId).toBe(humanId+1);
});

test('a real delivered breakdown component is projected before an interrupted animal haul, while a missing job refuses purely',()=>{
 const f=camp(),{world:w,animal:a}=f;trained(f);const generator=fixturePower(w,'wood-generator',24,24),zone=storageCells(w)[0]!,pile=w.piles.find(p=>p.id===f.woodId)!;
 w.home=[w.width+1,zone.z*w.width+zone.x,generator.z*w.width+generator.x].sort((x,y)=>x-y);
 expect(triggerBreakdown(w,generator.id)).toBe(true);const job=w.jobs.find(j=>j.fixBreakdown?.structureId===generator.id)!;expect(job).toBeDefined();
 const componentId=w.nextId;addMaterial(w,'component',1,{type:'job',jobId:job.id},'component');const component=w.piles.find(p=>p.id===componentId)!;
 Object.assign(a,{x:24,z:23,state:'idle'});pile.owner={type:'inventory',pawnId:a.id};
 a.haul={sourcePileId:pile.id,quantity:pile.quantity,phase:'deliver',carryPileId:pile.id,destination:{type:'stockpile',stockpileId:zone.id},startedAtCore:w.tick*10};
 const prior=planJobDrops(w,job.id);expect(prior).not.toBeNull();const changes=[{animal:a,choice:{kind:'home' as const},cells:[w.width+1]}];
 const originalOwner=component.owner;component.owner={type:'job',jobId:w.nextId+100};const malformed=JSON.stringify(w);
 expect(prepareAnimalAreaChange287(w,changes,prior!).ok).toBe(false);expect(JSON.stringify(w)).toBe(malformed);component.owner=originalOwner;
 const before=JSON.stringify(w),nextId=w.nextId,rng=w.rng,plan=prepareAnimalAreaChange287(w,changes,prior!);
 expect(plan.ok).toBe(true);expect(JSON.stringify(w)).toBe(before);if(!plan.ok)throw Error(plan.reason);expect(plan.begin()).toBe(true);
 w.home=[w.width+1];expect(retireBreakdownJob(w,job)).toBe(true);expect(component.owner).toEqual({type:'ground',...prior!.get(componentId)!});
 expect(plan.adoptAdmitted()).toBe(true);expect(a.haul).toBeUndefined();expect(pile.owner.type).toBe('ground');expect(pile.owner).not.toEqual(component.owner);
 expect(w.jobs.some(j=>j.id===job.id)).toBe(false);expect(w.piles.filter(p=>p.id===componentId)).toEqual([component]);expect(w.piles.filter(p=>p.id===pile.id)).toEqual([pile]);
 expect(component.quantity).toBe(1);expect(w.nextId).toBe(nextId);expect(w.rng).toBe(rng);
});

test('no Near space keeps the original inventory in holding and releases every old reservation',()=>{
 const f=camp(),{world:w,animal:a}=f;trained(f);const pile=w.piles.find(p=>p.id===f.woodId)!,zone=storageCells(w)[0]!;
 Object.assign(a,{x:12,z:12});for(const c of [{x:12,z:11},{x:13,z:12},{x:12,z:13},{x:11,z:12}])fixtureBuilding(w,'wall',c.x,c.z);
 addMaterial(w,'steel',1,{type:'ground',x:12,z:12},'steel');pile.owner={type:'inventory',pawnId:a.id};
 a.haul={sourcePileId:pile.id,quantity:pile.quantity,phase:'deliver',carryPileId:pile.id,destination:{type:'stockpile',stockpileId:zone.id},startedAtCore:w.tick*10};
 const plan=prepareAnimalAreaChange287(w,[{animal:a,choice:{kind:'home'},cells:[0]}]);if(!plan.ok)throw Error(plan.reason);expect(plan.commit()).toBe(true);
 expect(a.haul).toEqual({phase:'holding',carryPileId:pile.id,sinceCore:w.tick*10});expect(pile.owner).toEqual({type:'inventory',pawnId:a.id});expect(w.piles.filter(p=>p.id===pile.id)).toEqual([pile]);
});

test('return uses the one granted frontier, saves a real target and preserves a deferred physical edge',()=>{
 const f=camp(),{world:w,animal:a}=f;Object.assign(a,{x:10,z:10});choice(f,[{x:12,z:10}]);const read=createAnimalAreaPolicyReader287(w),nav=animalNavigation(w,false,true,undefined,false,undefined,read);
 const before=JSON.stringify(w);let searches=0,moves=0;
 expect(processAnimalAreaReturn287(w,a,{policy:read(a),nav,takeSearch:()=>false,move:()=>{moves++;}})).toBe(true);expect(JSON.stringify(w)).toBe(before);expect(moves).toBe(0);
 expect(processAnimalAreaReturn287(w,a,{policy:read(a),nav,takeSearch:()=>{searches++;return true;},move:()=>{moves++;moveAnimal(w,a,nav.step,1,nav.geometry);}})).toBe(true);
 expect(searches).toBe(1);expect(a.animalAreaReturn287).toEqual({mapId:registeredMapId(w),target:{x:12,z:10}});const edge=a.motion;
 expect(processAnimalAreaReturn287(w,a,{policy:read(a),nav,takeSearch:()=>{throw Error('second frontier during edge');},move:()=>{throw Error('second physical step during edge');}})).toBe(true);expect(a.motion).toBe(edge);
});

test('rest reconciliation does not impose animal area on the shared physical spot validator',()=>{
 const f=camp(),{world:w,animal:a}=f;choice(f,[{x:12,z:12}]);Object.assign(a,{x:12,z:19,state:'sleeping'});a.animalRest={spotId:f.spotId,phase:'sleep'};
 const spot=w.structures.find(s=>s.id===f.spotId)!;expect(animalSpotAvailable(w,spot,a,f.handler.id)).toBe(true);
 reconcileAnimalRest(w);expect(a.animalRest).toBeUndefined();expect(a.domestic!.bedId).toBe(f.spotId);expect(animalSpotAvailable(w,spot,a,f.handler.id)).toBe(true);
});
