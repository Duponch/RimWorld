import {expect,test} from 'vitest';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {initialWorldRegistry,registeredMapId} from '../src/sim/world-map-context.ts';
import {constructFreshInitialWildAnimal256} from '../src/sim/initial-animal-constructor-256.ts';
import {INITIAL_ANIMAL_FACTS_256} from '../src/sim/initial-animal-data-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {createAnimalAirReader466} from '../src/sim/animal-thermal-air-v466.ts';
import {animalThermalProfile466,applyAnimalThermal466} from '../src/sim/animal-thermal-v466.ts';
import {processAnimalThermalRefuge288} from '../src/sim/animal-thermal-refuge-288.ts';
import {animalNavigation,moveAnimal} from '../src/sim/wildlife-navigation.ts';
import {captureAnimalAreaPolicy287,supportsAnimalAreas287} from '../src/sim/animal-area-policy-287.ts';
import {groupPawnInterval256} from '../src/sim/group-core-cadence-256.ts';
import {animalBody,reconcileAnimalHealth} from '../src/sim/wildlife-health.ts';
import {animalNutritionMax} from '../src/sim/animal-life.ts';
import {animalBodyModel} from '../src/sim/body-model.ts';
import {addResolvedInjury} from '../src/sim/injury-state.ts';
import {newDoorState} from '../src/sim/door-rules.ts';
import {reconcileTemperature,temperatureAt} from '../src/sim/temperature.ts';
import {stepWorld} from '../src/sim/engine.ts';
import type {Cell,Structure,World} from '../src/sim/types.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';

// Declared unit preparations, not played acquisition: the existing finite32²
// colony and its true fresh-constructor Labrador, explicit initial severity
// and air regions. Additional species use their own fresh constructor once,
// without retry, renaming, favourable endpoint RNG, or a copied human record.
function camp(){
 const f=animalHaulingCamp459();initialWorldRegistry(f.world);
 Object.assign(f.animal,{state:'idle',path:[],nextDecision:f.world.tick});
 f.animal.health=createAnimalMedicalRecord256(f.world,f.animal);return f;
}
type Camp=ReturnType<typeof camp>;
const cellIndex=(w:World,c:Cell)=>c.z*w.width+c.x;
function due(w:World,a:WildAnimal,interval=60,minimum=w.tick){
 for(let tick=minimum;tick<minimum+interval;tick++)if(groupPawnInterval256(a.id,tick*10,interval,10)){w.tick=tick;return;}
 throw Error('Declared personal opportunity missing');
}
function air(w:World,temperature:number,exceptions:readonly {cell:Cell;temperature:number}[]=[]){
 w.thermal={regions:[{cells:w.tiles.map((_,i)=>i),temperature},...exceptions.map(e=>({cells:[cellIndex(w,e.cell)],temperature:e.temperature}))]};
}
function choice(f:Camp,cells:readonly Cell[]){
 const {world:w,animal:a}=f,id=w.nextId++;
 w.allowedAreas=[{id,label:'Refuge déclaré',color:0x123456,cells:cells.map(c=>cellIndex(w,c)).sort((x,y)=>x-y)}];
 a.animalMapAreas287={revision:1,assignments:[{mapId:registeredMapId(w)!,choice:{kind:'allowed',areaId:id}}]};
}
function original(f:Camp,def:'Hare'|'Muffalo'|'Megascarab'){
 const {world:w}=f,made=constructFreshInitialWildAnimal256({fact:INITIAL_ANIMAL_FACTS_256[def],id:w.nextId,
  cell:{x:12,z:12},tick:w.tick,random:new WorldGenerationRandom(w.seed)});
 if(made.status!=='ready')throw Error('Declared '+def+' original blocked without retry: '+made.reason);
 if(made.animal.health)throw Error('Declared healthy species fixture received initial disease; original not erased');
 const a=made.animal;w.nextId++;a.domestic={since:w.tick,care:'herbal',tameness:5,nextDecay:w.tick+45000};
 w.wildlife!.animals.push(a);a.health=createAnimalMedicalRecord256(w,a);return a;
}
function run(w:World,a:WildAnimal,quota=true){
 const policy=captureAnimalAreaPolicy287(w,a),nav=animalNavigation(w,false,!['muffalo','deer','gazelle','dromedary'].includes(a.species)),reader=createAnimalAirReader466(w);
 let searches=0,starts=0;
 const handled=processAnimalThermalRefuge288(w,a,{nav,air:reader,policy,takeSearch:()=>{searches++;return quota;},
  interruptHaul:()=>{throw Error('No haul was prepared in this runtime fixture');},startJob:()=>{starts++;},
  move:()=>{moveAnimal(w,a,nav.step,animalBody(a).capacities.moving,nav.geometry);}});
 return {handled,searches,starts,reader};
}
function wait(f:Camp,startedAtCore=f.world.tick*10){
 const {world:w,animal:a}=f;a.state='idle';a.path=[];
 a.animalThermalRefuge288={mapId:registeredMapId(w)!,target:{x:a.x,z:a.z},phase:'wait',startedAtCore};
 return a.animalThermalRefuge288;
}

test.each(['heatstroke','hypothermia'] as const)('%s serious boundary is inclusive, below350000000 does not choose a job',condition=>{
 for(const severity of [349_999_999,350_000_000]){
  const {world:w,animal:a}=camp();due(w,a);a.health![condition]=severity;air(w,20);
  const before=structuredClone(a.health),rest=a.rest,age=a.ageTicks,rng=w.rng,wildRng=w.wildlife!.rng;
  const result=run(w,a);expect(result.handled).toBe(severity===350_000_000);expect(result.searches).toBe(0);
  expect(a.animalThermalRefuge288?.phase).toBe(severity===350_000_000?'wait':undefined);
  expect(a.health).toEqual(before);expect(a.rest).toBe(rest);expect(a.ageTicks).toBe(age);expect(w.rng).toBe(rng);expect(w.wildlife!.rng).toBe(wildRng);
 }
});

test.each([-30,40])('Labrador comfortable bound %s permits awake waiting without free clinic, rest or random draws',temperature=>{
 const f=camp(),{world:w,animal:a}=f;due(w,a);a.health![temperature<0?'hypothermia':'heatstroke']=350_000_000;
 expect(animalBody(a).movingCapable).toBe(true);
 air(w,temperature);const before=structuredClone(a.health),rest=a.rest,rng=w.rng,wildRng=w.wildlife!.rng;
 expect(run(w,a).handled).toBe(true);expect(a.animalThermalRefuge288).toMatchObject({phase:'wait',startedAtCore:w.tick*10,target:{x:a.x,z:a.z}});
 expect(a.state).toBe('idle');expect(a.motion).toBeUndefined();expect(a.path).toEqual([]);expect(a.animalRest).toBeUndefined();
 expect(a.health).toEqual(before);expect(a.rest).toBe(rest);expect(w.rng).toBe(rng);expect(w.wildlife!.rng).toBe(wildRng);
});

test('combined serious conditions which actually remove mobility grant no autonomous movement or waiting job',()=>{
 const {world:w,animal:a}=camp();due(w,a);a.health!.heatstroke=350_000_000;a.health!.hypothermia=350_000_000;air(w,20);
 expect(animalBody(a).capacities.moving).toBe(0);const before=structuredClone(a);
 expect(run(w,a).handled).toBe(false);expect(a).toEqual(before);
});

test('the real insect profile never gains Hypothermia or a cold-only refuge, but serious Heatstroke can wait',()=>{
 const f=camp(),w=f.world,a=original(f,'Megascarab');due(w,a);air(w,-60);
 expect(animalThermalProfile466(a)).toEqual({min:0,max:60,cold:false});
 const record=a.health!;applyAnimalThermal466(w,a,record,{temperature:-60,mapHeld:true});
 expect(record.hypothermia).toBeUndefined();expect(run(w,a).handled).toBe(false);expect(a.animalThermalRefuge288).toBeUndefined();
 record.heatstroke=350_000_000;air(w,20);expect(run(w,a).handled).toBe(true);expect(a.animalThermalRefuge288?.phase).toBe('wait');
});

test('wild ownership and an explicitly unmarked historical original never acquire the prospective refuge',()=>{
 const f=camp(),{world:w,animal:a}=f;due(w,a);air(w,20);a.health!.heatstroke=350_000_000;
 delete a.domestic;const wildBefore=structuredClone(a);expect(run(w,a).handled).toBe(false);expect(a).toEqual(wildBefore);
 const hare=original(f,'Hare');delete hare.growthTracker;
 // Admission-only legacy preparation; not removal of a marker from a played
 // patient. Create the actual historical species record after this declaration.
 hare.health=createAnimalMedicalRecord256(w,hare);hare.health.heatstroke=350_000_000;due(w,hare);
 const oldBefore=structuredClone(hare);expect(animalThermalProfile466(hare)).toBeUndefined();expect(run(w,hare).handled).toBe(false);expect(hare).toEqual(oldBefore);
});

test('real path movement uses Jog and actual origin air, retaining Goto through lower severity and changed target air',()=>{
 const f=camp(),{world:w,animal:a}=f,target={x:14,z:12};due(w,a);a.health!.heatstroke=350_000_000;air(w,70,[{cell:target,temperature:20}]);
 const baseline=structuredClone(w),walker=baseline.wildlife!.animals.find(row=>row.id===a.id)!;
 const result=run(w,a);expect(result.handled).toBe(true);expect(result.searches).toBe(1);
 const task=a.animalThermalRefuge288!,first=a.motion!;expect(task).toMatchObject({phase:'travel',target});
 expect(first.from).toEqual({x:12,z:12});expect(first.to).toEqual({x:13,z:12});expect(first.end).toBeGreaterThan(w.tick);
 expect(result.reader.atAnimal(a)).toBe(70);expect(a.path).toEqual([target]);
 walker.path=[{...first.to}];const nav=animalNavigation(baseline,false,true);expect(moveAnimal(baseline,walker,nav.step,animalBody(walker).capacities.moving,nav.geometry)).toBe(true);
 // Native Walk=30/MoveSpeed and Jog=6/MoveSpeed: same actor/capacities and
 // clear cardinal terrain give a factor5, not an extra refuge sprint.
 expect(walker.motion!.end-walker.motion!.start).toBeCloseTo((first.end-first.start)*5,10);
 a.health!.heatstroke=1;w.thermal!.regions.at(-1)!.temperature=90;w.tick=Math.ceil(first.end);
 expect(run(w,a).handled).toBe(true);expect(a.animalThermalRefuge288).toBe(task);expect(task.startedAtCore).toBe(first.start*10);
 expect(a.motion!.to).toEqual(target);expect(a.path).toEqual([]);
 w.tick=Math.ceil(a.motion!.end);expect(run(w,a).handled).toBe(false);expect(a.animalThermalRefuge288).toBeUndefined();
 expect(a.health!.heatstroke).toBe(1);expect(a.state).toBe('idle');
});

test('Wait requires both age500 and personal hash500, retaining its original start on same-job continuation',()=>{
 const f=camp(),{world:w,animal:a}=f;air(w,20);a.health!.heatstroke=350_000_000;const task=wait(f),start=task.startedAtCore;
 // A qualifying hash before the age frontier cannot review this young job.
 due(w,a,500,Math.floor(start/10)+1);if(w.tick*10-start<500){a.health!.heatstroke=1;expect(run(w,a).handled).toBe(true);expect(a.animalThermalRefuge288).toBe(task);}
 w.tick=Math.floor(start/10)+50;while(groupPawnInterval256(a.id,w.tick*10,500,10))w.tick++;
 a.health!.heatstroke=1;expect(run(w,a).handled).toBe(true);expect(a.animalThermalRefuge288).toBe(task);
 due(w,a,500,w.tick+1);a.health!.heatstroke=350_000_000;expect(run(w,a).handled).toBe(true);
 expect(a.animalThermalRefuge288).toBe(task);expect(task.startedAtCore).toBe(start);expect(a.state).toBe('idle');
 a.health!.heatstroke=349_999_999;expect(run(w,a).handled).toBe(false);expect(a.animalThermalRefuge288).toBeUndefined();
});

test('changed Wait air is retained before review and becomes a real Goto at hash500 when another refuge exists',()=>{
 const f=camp(),{world:w,animal:a}=f,target={x:14,z:12};a.health!.heatstroke=350_000_000;const task=wait(f);
 air(w,70,[{cell:target,temperature:20}]);w.tick+=1;expect(run(w,a).handled).toBe(true);expect(a.animalThermalRefuge288).toBe(task);expect(a.motion).toBeUndefined();
 due(w,a,500,Math.ceil(task.startedAtCore/10)+50);expect(run(w,a).handled).toBe(true);
 expect(a.animalThermalRefuge288).toMatchObject({phase:'travel',target,startedAtCore:w.tick*10});expect(a.motion?.end).toBeGreaterThan(w.tick);
});

test('no destination is an absent job; exhausted quota defers choice without clearing a retained Wait',()=>{
 const f=camp(),{world:w,animal:a}=f;due(w,a);a.health!.heatstroke=350_000_000;air(w,70);
 const before=structuredClone(a);expect(run(w,a).handled).toBe(false);expect(a).toEqual(before);
 air(w,70,[{cell:{x:14,z:12},temperature:20}]);expect(run(w,a,false).handled).toBe(false);expect(a).toEqual(before);
 const task=wait(f);due(w,a,500,w.tick+50);expect(run(w,a,false).handled).toBe(true);expect(a.animalThermalRefuge288).toBe(task);
 air(w,70);expect(run(w,a).handled).toBe(false);expect(a.animalThermalRefuge288).toBeUndefined();
});

test('the actual nonempty area admits a farther refuge and rejects the closer exterior temperature',()=>{
 const f=camp(),{world:w,animal:a}=f,near={x:13,z:12},allowed={x:12,z:15};due(w,a);a.health!.heatstroke=350_000_000;
 choice(f,[a,{x:12,z:13},{x:12,z:14},allowed]);air(w,70,[{cell:near,temperature:20},{cell:allowed,temperature:20}]);
 expect(run(w,a).handled).toBe(true);expect(a.animalThermalRefuge288?.target).toEqual(allowed);
 expect(a.path.every(c=>c.x===12)).toBe(true);expect(a.motion?.to).toEqual({x:12,z:13});
});

test('real closed and forbidden passage doors block refuge access; opening the same door admits physical travel',()=>{
 const f=camp(),{world:w,animal:a}=f,target={x:14,z:12};due(w,a);a.health!.heatstroke=350_000_000;
 for(let x=0;x<w.width;x++)for(let z=0;z<w.height;z++)if(z!==12||x<12||x>14)w.tiles[z*w.width+x]={terrain:'rock'};
 const door:Structure=fixtureBuilding(w,'door',13,12);Object.assign(door,{material:'wood',door:newDoorState(w.tick)});air(w,70,[{cell:target,temperature:20}]);
 expect(run(w,a).handled).toBe(false);expect(a.animalThermalRefuge288).toBeUndefined();
 Object.assign(door.door!,{open:true,holdOpen:true,from:1,forbidden:true});expect(run(w,a).handled).toBe(false);
 door.door!.forbidden=false;expect(run(w,a).handled).toBe(true);expect(a.motion?.to).toEqual({x:13,z:12});expect(a.animalThermalRefuge288?.target).toEqual(target);
});

test('a real Roamer crosses no fence but receives no fictitious assigned-pen polygon restriction',()=>{
 const f=camp(),w=f.world,a=original(f,'Muffalo'),target={x:14,z:12};due(w,a);a.health!.heatstroke=350_000_000;
 expect(supportsAnimalAreas287(a.species)).toBe(false);expect(captureAnimalAreaPolicy287(w,a)).toBeUndefined();
 for(let x=0;x<w.width;x++)for(let z=0;z<w.height;z++)if(z!==12||x<12||x>14)w.tiles[z*w.width+x]={terrain:'rock'};
 const fence=fixtureBuilding(w,'fence',13,12);air(w,70,[{cell:target,temperature:20}]);expect(run(w,a).handled).toBe(false);
 // Removing an actual obstacle, before play, changes physical reachability.
 // No area/enclosure membership is manufactured for this Roamer.
 w.structures=w.structures.filter(s=>s!==fence);expect(run(w,a).handled).toBe(true);expect(a.animalThermalRefuge288?.target).toEqual(target);expect(a.motion?.to).toEqual({x:13,z:12});
});

test('the real engine reuses an unreachable medical beds search to reach actual useful air instead of starving refuge',()=>{
 const f=camp(),{world:w,animal:a}=f,spot=w.structures.find(s=>s.id===f.spotId)!;
 for(const key of Object.keys(f.handler.priorities) as (keyof typeof f.handler.priorities)[])f.handler.priorities[key]=0;
 Object.assign(f.handler,{x:20,z:20});
 Object.assign(a,{x:10,z:10,food:animalNutritionMax(a)*.95,rest:.95,nextDecision:w.tick});Object.assign(spot,{x:16,z:10});
 // Actual initial geometry: roofed hot room, genuinely open held door, and
 // an existing bed physically isolated by four cardinal walls. All authored
 // before the first step; no construction/acquired illness is claimed here.
 for(let x=8;x<=12;x++)for(let z=8;z<=12;z++)if(x===8||x===12||z===8||z===12){if(x===12&&z===10)continue;fixtureBuilding(w,'wall',x,z);}
 const door=fixtureBuilding(w,'door',12,10);Object.assign(door,{material:'wood',door:{...newDoorState(w.tick),open:true,holdOpen:true,from:1}});
 w.roofing={constructed:[9,10,11].flatMap(z=>[9,10,11].map(x=>z*w.width+x)),build:[],remove:[],cursor:0};
 for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]] as const)fixtureBuilding(w,'wall',spot.x+dx,spot.z+dz);
 const root=animalBodyModel(a.species,a.ageTicks,a.growthTracker?.value).parts.find(p=>p.parent===null)!;
 expect(addResolvedInjury(a.health!,root.id,'bruise',100,()=>.999999)).not.toBeNull();a.health!.heatstroke=400_000_000;reconcileAnimalHealth(w,a);
 expect(a.state).toBe('idle');expect(animalBody(a).movingCapable).toBe(true);reconcileTemperature(w);
 const hot=w.thermal!.regions.find(r=>r.cells.includes(cellIndex(w,a)))!;expect(hot).toBeDefined();hot.temperature=80;
 const record=a.health!,bedId=a.domestic!.bedId;let found=false;
 for(let i=0;i<12&&!found;i++){stepWorld(w,1);found=!!a.animalThermalRefuge288;}
 expect(found).toBe(true);expect(a.animalRest).toBeUndefined();expect(a.animalThermalRefuge288?.phase).toBe('travel');
 const target=a.animalThermalRefuge288!.target;expect(temperatureAt(w,target)).toBeGreaterThanOrEqual(-30);expect(temperatureAt(w,target)).toBeLessThanOrEqual(40);
 expect(a.motion?.end).toBeGreaterThan(w.tick);expect(a.health).toBe(record);expect(a.domestic!.bedId).toBe(bedId);
},20_000);
