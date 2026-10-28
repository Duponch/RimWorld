import {test} from 'vitest';
import assert from 'node:assert/strict';
import {createWorld,applyCommand,advanceWorldCore297} from '../src/sim/engine';
import {serializeWorld,validateWorld} from '../src/sim/serialization';
import {effectiveCore297} from '../src/sim/core-phase-297';
import {finalizeInitialWorldRegistry} from '../src/sim/world-map-context';
import {NATURAL_TERRAIN_BINDINGS_256} from '../src/sim/local-terrain-definitions-256';
import {addMaterial,refreshStock} from '../src/sim/materials';
import {createMedicalRecord,addResolvedInjury} from '../src/sim/injury-state';
import {animalNutritionMax} from '../src/sim/animal-life';
import {attachNewbornAnimalGrowth256,validAnimalGrowthTracker256,validAnimalGrowthClinicalOwner256} from '../src/sim/animal-growth-runtime-256';
import {constructInitialWildAnimal256} from '../src/sim/initial-animal-constructor-256';
import {INITIAL_ANIMAL_FACTS_256} from '../src/sim/initial-animal-data-256';
import {enableWildlife} from '../src/sim/wildlife';
import type {World,MaterialPile,Job} from '../src/sim/types';
import type {WildAnimal} from '../src/sim/wildlife-state';
import {captureActorPhaseDependencies297,equalActorPhaseDependencies297,type ActorPhaseDependencies297} from '../src/bridge/actor-phase-dependencies-297';
import {captureCoreActor297} from '../src/bridge/core-phase-data-297';
import {PawnLayer,humanCorpseVisualStage as mainCorpseStage} from '../src/render/PawnLayer';
import {bodyBloodWord as mainBlood,bodyBloodRegion as mainRegion} from '../src/render/body-blood';
import {bodyBloodWord,bodyBloodRegion} from '../src/render/body-blood-word-297';
import {WildlifeBodyScale} from '../src/render/wildlife-frame-state';
import {fixtureBuilding} from './scenarios/deconstruction';

// Root-only proposals. All worlds originate in the real Engine. Macro/work
// cases are played and save-validated. Controlled renderer-input cases are
// deliberately not claims of gameplay admission, Native provenance or timing.
function world(drafted=true):World {
 const w=createWorld(492,24,24);assert.equal(Number(w.schemaVersion),297);assert.equal(effectiveCore297(w),0);
 w.tiles=Array.from({length:w.width*w.height},()=>({terrain:NATURAL_TERRAIN_BINDINGS_256.Soil}));
 w.resources=[];w.piles=[];w.jobs=[];w.structures=[];w.packed=[];w.stockpiles=[];w.growingZones=[];
 if(w.wildlife)w.wildlife.animals=[];if(w.mechanoids)w.mechanoids=[];refreshStock(w);
 for(const [i,p]of w.pawns.entries()){
  Object.assign(p,{x:5+i*4,z:5,state:'idle',path:[],jobId:null,planCooldown:0,needCooldown:20,hunger:80,rest:80});
  p.schedule.fill('anything');p.recreation.level=100;for(const k of Object.keys(p.priorities)as(keyof typeof p.priorities)[])p.priorities[k]=0;
 }
 if(drafted)assert.equal(applyCommand(w,{type:'draft',pawnIds:w.pawns.map(p=>p.id),enabled:true}).ok,true);
 finalizeInitialWorldRegistry(w);assert.deepEqual(validateWorld(w),[],'Initial Engine fixture must really save');assert.equal(typeof serializeWorld(w),'string');return w;
}
function capture(w:World,saveValidated=false):ActorPhaseDependencies297 {
 const before=structuredClone(w),json=JSON.stringify(w),serialized=saveValidated?serializeWorld(w):undefined;
 const value=captureActorPhaseDependencies297(w);
 assert.equal(JSON.stringify(w),json,'A dependency read cannot change any owned World data');assert.deepEqual(w,before);
 if(saveValidated)assert.equal(serializeWorld(w),serialized,'Whole validated save, not a selected projection, stays exact');return value;
}
function advance(w:World,count:number):void {for(let n=0;n<count;n++){const before=effectiveCore297(w);assert.equal(advanceWorldCore297(w).core,before+1);}}
function primitiveStreams(w:World){
 const before=JSON.stringify(w),layer=new PawnLayer();
 try{layer.update(w,1,true);const g=layer.feedbackSource!;assert.ok(g);const tuple=(name:string,n=4)=>{const a=g.getAttribute(name);assert.ok(a);return [a.getX(0),...(n>1?[a.getY(0)]:[]),...(n>2?[a.getZ(0)]:[]),...(n>3?[a.getW(0)]:[])];};
  return{from:tuple('aFrom'),to:tuple('aTo'),motion:tuple('aMotion'),equipment:tuple('aEquipment'),cargo:tuple('aCargo'),hair:tuple('aHair',3),blood:tuple('aBodyBlood',1)};
 }finally{layer.dispose();assert.equal(JSON.stringify(w),before,'Real Main primitive preparation is read-only');}
}
function animal(w:World,adult:boolean):WildAnimal {
 enableWildlife(w,0);assert.ok(w.wildlife,'The real opt-in producer owns the initially empty wildlife state');assert.deepEqual(validateWorld(w),[],'Producer-created wildlife is a valid297 owner before controlled growth inputs');
 let a:WildAnimal;
 if(adult){
  // Exact endpoint sequence already exercised by initial-animals-v256; not a seed/RNG comparison or a retry.
  const result=constructInitialWildAnimal256({fact:INITIAL_ANIMAL_FACTS_256.Hare,id:w.nextId++,cell:{x:12,z:12},tick:w.tick,
   random:{value:()=>1,float:(min:number,_max:number)=>Math.fround(min),integer:(min:number,_max:number)=>min},unspawnedAnimals:[]});
  assert.equal(result.status,'ready','The real initial constructor must produce the original; blocked branches are not retried');if(result.status!=='ready')throw Error('Actual animal constructor was not ready');
  a=result.animal;assert.equal(a.growthTracker?.value,1,'This constructor endpoint is actually adult');
 }else{
  // Real newborn creation operation: food starts at zero before the growth owner establishes the stage maximum.
  a={id:w.nextId++,species:'hare',sex:'female',x:12,z:12,ageTicks:0,food:0,rest:1,state:'idle',path:[],nextDecision:w.tick+1};
  attachNewbornAnimalGrowth256(a,effectiveCore297(w),w.schemaVersion);a.food=animalNutritionMax(a)*.45;
  assert.equal(a.growthTracker?.value,0,'The newborn constructor owns the initial growth primitive');
 }
 assert.equal(validAnimalGrowthTracker256(a,w.schemaVersion,w.tick),true,'The actual constructor output passes its unmodified growth guard');
 assert.equal(validAnimalGrowthClinicalOwner256(a,w.schemaVersion),true,'The constructor preserves its own clinical witness');
 w.wildlife.animals.push(a);return a;
}
function material(w:World,kind:MaterialPile['kind'],item:MaterialPile['item'],owner:MaterialPile['owner'],quantity=1):MaterialPile {
 const ids=new Set(w.piles.map(p=>p.id));addMaterial(w,kind,quantity,owner,item);const result=w.piles.find(p=>!ids.has(p.id));assert.ok(result,'Use a real material producer');return result;
}

test('owned dependency data is deeply frozen, contains no World aliases and does not mutate a real save',()=>{
 const w=world(),value=capture(w,true),borrowed=new Set<object>();
 const collect=(v:unknown)=>{if(!v||typeof v!=='object'||borrowed.has(v))return;borrowed.add(v);for(const k of Reflect.ownKeys(v)){const d:PropertyDescriptor=Object.getOwnPropertyDescriptor(v,k)!;if('value'in d)collect(d.value);}};collect(w);
 const seen=new Set<object>(),visit=(v:unknown)=>{if(!v||typeof v!=='object'||seen.has(v))return;seen.add(v);assert.equal(Object.isFrozen(v),true);assert.equal(borrowed.has(v),false,'No actor, appearance, clinical record, pile, array or World alias survives');for(const k of Reflect.ownKeys(v)){const d:PropertyDescriptor=Object.getOwnPropertyDescriptor(v,k)!;assert.ok('value'in d,'No lazy getters');assert.equal(d.enumerable,!(Array.isArray(v)&&k==='length'),'Only the built-in Array length is non-enumerable');visit(d.value);}};visit(value);
 assert.ok(seen.size>10,'An empty witness cannot pass');assert.equal(equalActorPhaseDependencies297(value,capture(w,true)),true);
});

test('independent owned captures compare exactly; copied shapes and wrappers are not owned captures',()=>{
 const w=world(),a=capture(w),b=capture(w);assert.notEqual(a,b);assert.equal(equalActorPhaseDependencies297(a,b),true);assert.equal(equalActorPhaseDependencies297(a,a),true);
 assert.equal(equalActorPhaseDependencies297(structuredClone(a),b),false);assert.equal(equalActorPhaseDependencies297({...a},b),false);assert.equal(equalActorPhaseDependencies297(Object.create(a),b),false);
});

test('hunger, rest and an invisible need countdown do not create a graphical dependency change',()=>{
 const w=world(),a=capture(w,true),p=w.pawns[0]!;p.hunger-=1;p.rest-=1;p.needCooldown=19;
 assert.equal(equalActorPhaseDependencies297(a,capture(w,true)),true);
 advance(w,10);assert.equal(effectiveCore297(w),10);assert.equal(equalActorPhaseDependencies297(a,capture(w,true)),true,'A genuinely completed calm macro keeps the graphic witness');
});

test('real Engine deconstruction progresses without changing the contact/appearance witness',()=>{
 const w=world(false),p=w.pawns[0]!;p.priorities.build=1;const wall=Object.assign(fixtureBuilding(w,'wall',p.x+1,p.z),{material:'wood'as const});
 assert.equal(applyCommand(w,{type:'designate',kind:'deconstruct',x:wall.x,z:wall.z}).ok,true);const job=w.jobs.find(j=>j.kind==='deconstruct');assert.ok(job);
 assert.equal(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:false}).ok,true);finalizeInitialWorldRegistry(w);assert.deepEqual(validateWorld(w),[]);
 for(let n=0;n<300&&!(p.state==='working'&&job.progress>0);n++)advance(w,1);assert.equal(p.state,'working');assert.ok(job.progress>0,'The actual work system, not a synthetic progress number, ran');
 const progress=job.progress,a=capture(w,true);advance(w,10);assert.ok(w.jobs.includes(job),'Compare the same still-active work item');assert.ok(job.progress>progress);assert.equal(equalActorPhaseDependencies297(a,capture(w,true)),true);
});

test('adult biological ageing with unchanged real body scale remains graphically equivalent',()=>{
 const w=world(),a=animal(w,true),scale=new WildlifeBodyScale(),size=scale.read(a),before=capture(w);a.ageTicks+=1;
 assert.equal(scale.read(a),size);assert.equal(equalActorPhaseDependencies297(before,capture(w)),true,'Age itself is not the graphical signature');
});

test('a real juvenile growth primitive changing its Main body scale invalidates the witness',()=>{
 const w=world(),a=animal(w,false);assert.ok(a.growthTracker);const scale=new WildlifeBodyScale(),oldScale=scale.read(a),before=capture(w);
 a.growthTracker.value=Math.fround(.5);assert.notEqual(scale.read(a),oldScale);assert.equal(equalActorPhaseDependencies297(before,capture(w)),false);
});

test('changing hair pigment changes both the real Main stream and the owned witness without aliasing the seed',()=>{
 const w=world(),p=w.pawns[0]!;assert.ok(p.appearance);const seed=capture(w),seedData=JSON.stringify(seed),shown=primitiveStreams(w),old=p.appearance.hairColor;
 p.appearance.hairColor=old^0x000101;assert.notDeepEqual(primitiveStreams(w).hair,shown.hair);assert.equal(equalActorPhaseDependencies297(seed,capture(w)),false);assert.equal(JSON.stringify(seed),seedData);
 p.appearance.hairColor=old;assert.equal(equalActorPhaseDependencies297(seed,capture(w)),true,'The pure helper does not own or clear Publisher hard latches');
});

test('seated recreation is a real pose dependency, not the recreation elapsed counter',()=>{
 const w=world(),p=w.pawns[0]!;delete p.draft;p.state='recreating';p.recreation.task={activity:'social-relax',buildingId:null,target:{x:p.x,z:p.z},phase:'active',elapsed:1};
 const seat=fixtureBuilding(w,'stool',p.x,p.z),standing=capture(w),shown=primitiveStreams(w);p.recreation.task.elapsed=2;assert.equal(equalActorPhaseDependencies297(standing,capture(w)),true);
 p.recreation.task.seatId=seat.id;assert.notDeepEqual(primitiveStreams(w).motion,shown.motion);assert.equal(equalActorPhaseDependencies297(standing,capture(w)),false,'Controlled renderer-input task uses a real stool ID; Raw task admission remains outside this case');
});

test('a changed work target changes actual Main contact primitives and requires a new dependency seed',()=>{
 const w=world(),p=w.pawns[0]!;delete p.draft;p.state='working';const job:Job={id:w.nextId++,kind:'mine',x:p.x+1,z:p.z,orientation:0,footprint:'standard',status:'active',reservedBy:p.id,progress:1,escrow:{wood:0,food:0}};w.jobs.push(job);p.jobId=job.id;
 const before=capture(w),shown=primitiveStreams(w);job.z=p.z+1;
 assert.notDeepEqual(primitiveStreams(w).to,shown.to);assert.equal(equalActorPhaseDependencies297(before,capture(w)),false,'Controlled render contact; no synthetic expected workApproach formula');
});

test('equipment graphical identity invalidates while durability alone stays on the Full/UI horizon',()=>{
 const w=world(),p=w.pawns[0]!,before=capture(w),shown=primitiveStreams(w),weapon=material(w,'weapon','revolver',{type:'equipment',pawnId:p.id});
 assert.notDeepEqual(primitiveStreams(w).equipment,shown.equipment);assert.equal(equalActorPhaseDependencies297(before,capture(w)),false);assert.ok(weapon.weapon);
 const dressed=capture(w),stream=primitiveStreams(w);weapon.weapon.hitPoints-=1;assert.deepEqual(primitiveStreams(w).equipment,stream.equipment);assert.equal(equalActorPhaseDependencies297(dressed,capture(w)),true);
});

test('apparel identity and pigment are graphical inputs; wear hitpoints are not copied into the witness',()=>{
 const w=world(),p=w.pawns[0]!;const shirt=material(w,'apparel','cloth-shirt',{type:'apparel',pawnId:p.id});assert.ok(shirt.apparel);
 const before=capture(w),shown=primitiveStreams(w);material(w,'apparel','flak-vest',{type:'apparel',pawnId:p.id});assert.notDeepEqual(primitiveStreams(w).equipment,shown.equipment);assert.equal(equalActorPhaseDependencies297(before,capture(w)),false);
 const dressed=capture(w);shirt.apparel.hitPoints-=1;assert.equal(equalActorPhaseDependencies297(dressed,capture(w)),true);
});

test('a changed carried quantity or owner changes the real cargo stream and the dependency witness',()=>{
 const w=world(),p=w.pawns[0]!,load=material(w,'wood','wood',{type:'pawn',pawnId:p.id},2),before=capture(w),shown=primitiveStreams(w);
 load.quantity=1;assert.notDeepEqual(primitiveStreams(w).cargo,shown.cargo);assert.equal(equalActorPhaseDependencies297(before,capture(w)),false);
 const smaller=capture(w);load.owner={type:'ground',x:p.x,z:p.z};assert.equal(equalActorPhaseDependencies297(smaller,capture(w)),false);assert.notDeepEqual(primitiveStreams(w).cargo,shown.cargo);
});

test('blood projection is the real preserved Main helper and its paint changes invalidate graphical dependencies',()=>{
 assert.equal(mainBlood,bodyBloodWord);assert.equal(mainRegion,bodyBloodRegion);
 const w=world(),p=w.pawns[0]!;p.health=createMedicalRecord(w.tick);const before=capture(w),shown=primitiveStreams(w);
 assert.ok(addResolvedInjury(p.health,'left-arm','cut',6000,()=>.999999));const word=mainBlood(p.health);assert.ok(word>0);assert.equal(primitiveStreams(w).blood[0],word);assert.notDeepEqual(primitiveStreams(w).blood,shown.blood);assert.equal(equalActorPhaseDependencies297(before,capture(w)),false);
 assert.equal(mainCorpseStage(w,p),0,'Moving the export does not invent a living corpse stage');
});

test('a post-macro own body field with zero value is captured although it is outside the physical allowlist',()=>{
 const w=world();advance(w,10);const p=w.pawns[0]!,before=capture(w,true),physical=captureCoreActor297('human',0,p),shown=primitiveStreams(w);
 p.body={observedAt:w.tick,lostAt:0};assert.equal(Object.hasOwn(p.body,'lostAt'),true);
 assert.deepEqual(captureCoreActor297('human',0,p),physical,'No movement dirty row can stand in for this postmacro dependency');assert.equal(equalActorPhaseDependencies297(before,capture(w)),false);assert.notDeepEqual(primitiveStreams(w).to,shown.to,'Zero is a present hidden-body marker in the actual Main renderer');
});
