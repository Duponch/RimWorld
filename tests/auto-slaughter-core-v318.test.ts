import { expect,test } from 'vitest';
import { animalLifeStage,adultAgeTicks,juvenileAgeTicks,gestationTicks } from '../src/sim/animal-life.ts';
import { autoSlaughterCounts,autoSlaughterTargets,setAutoSlaughterPolicy,slaughterIntent } from '../src/sim/auto-slaughter.ts';
import { AUTO_SLAUGHTER_SPECIES,defaultAutoSlaughterConfig,type AutoSlaughterConfig,type AutoSlaughterSpecies } from '../src/sim/auto-slaughter-state.ts';
import { designateSlaughter,processSlaughter,slaughterProposal,slaughterWanted,startSlaughter,SLAUGHTER_WORK_TICKS,type SlaughterTask } from '../src/sim/animal-slaughter.ts';
import { animalClaimed } from '../src/sim/animal-rest-state.ts';
import { animalRescueProposal,animalRescueWanted,applyAnimalRescue } from '../src/sim/animal-rescue.ts';
import { reconcileAnimalRest } from '../src/sim/animal-rest.ts';
import { advanceCorpses } from '../src/sim/corpses.ts';
import { reconcileDomesticWork } from '../src/sim/domestic-reconcile.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import { reconcileAnimalHealth } from '../src/sim/wildlife-health.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { blockedCells,reachableCells } from '../src/sim/pathfinding.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { releaseWork } from '../src/sim/work-release.ts';
import { validateWorld,serializeWorld,deserializeWorld } from '../src/sim/serialization.ts';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots.ts';
import type { World } from '../src/sim/types.ts';
import type { WildAnimal } from '../src/sim/wildlife-state.ts';
import { huntingCamp } from './scenarios/hunting.ts';

function camp(species:AutoSlaughterSpecies='hare'){
  const world=huntingCamp(),pawn=world.pawns[0]!,animal=world.wildlife!.animals[0]!;
  world.pawns=[pawn];world.resources=[];world.piles=[];world.stockpiles=[];world.structures=[];
  delete pawn.background;pawn.priorities.hunt=0;pawn.priorities.handle=1;
  Object.assign(animal,{species,sex:'male',ageTicks:adultAgeTicks(species)+100,x:pawn.x+1,z:pawn.z,food:.2,rest:1,nextDecision:world.tick+80,path:[]});
  delete animal.motion;
  animal.domestic={since:world.tick,care:'herbal',tameness:5,nextDecay:world.tick+45000,lastTraining:world.tick,...species==='muffalo'?{productFullness:0}:{}};
  refreshStock(world);
  return {world,pawn,animal};
}
function add(world:World,sex:'female'|'male',ageTicks:number):WildAnimal {
  const animal=structuredClone(world.wildlife!.animals[0]!);animal.id=world.nextId++;animal.sex=sex;animal.ageTicks=ageTicks;
  animal.x=8+world.wildlife!.animals.length;animal.z=12;
  delete animal.health;delete animal.pregnancy;delete animal.domestic!.slaughter;
  if(animal.species==='muffalo'||animal.species==='dromedary'&&sex==='female')animal.domestic!.productFullness=0;
  else delete animal.domestic!.productFullness;
  world.wildlife!.animals.push(animal);return animal;
}
function policy(world:World,changes:Partial<Omit<AutoSlaughterConfig,'species'>>,species:AutoSlaughterSpecies='hare'){
  const config={...defaultAutoSlaughterConfig(species),...changes};
  expect(setAutoSlaughterPolicy(world,{type:'auto-slaughter-policy',config})).toEqual({ok:true});return config;
}
function targets(world:World){return [...autoSlaughterTargets(world)];}
function begin(world:World){
  const pawn=world.pawns[0]!,proposal=slaughterProposal(world,pawn,reachableCells(world,pawn,blockedCells(world),new Set()));
  expect(proposal).toBeDefined();startSlaughter(pawn,proposal!);return pawn.animalHandling as SlaughterTask;
}
function context(world:World){return {search:()=>null,candidates:()=>null,blocked:()=>blockedCells(world),move:()=>{throw Error('Unexpected movement in contact fixture');},release:()=>releaseWork(world,world.pawns[0]!),event:()=>{}};}

test('absent and infinite policies preserve every historical animal and the random streams',()=>{
  const {world,animal}=camp(),rng=world.rng,wildlifeRng=world.wildlife!.rng,before=structuredClone(world);
  expect(targets(world)).toEqual([]);expect(slaughterIntent(world,animal)).toBe(false);expect(world).toEqual(before);
  policy(world,{});expect(world.autoSlaughter).toBeUndefined();expect(targets(world)).toEqual([]);
  policy(world,{allowPregnant:true});expect(targets(world)).toEqual([]);
  expect(world.rng).toBe(rng);expect(world.wildlife!.rng).toBe(wildlifeRng);
});

test.each(AUTO_SLAUGHTER_SPECIES)('%s zero quota selects its live owned population, never wild or dead bodies',species=>{
  const {world,animal}=camp(species),wild=add(world,'male',animal.ageTicks+100),dead=add(world,'female',animal.ageTicks+200);
  delete wild.domestic;dead.state='dead';policy(world,{maxTotal:0},species);
  expect(targets(world)).toEqual([animal.id]);expect(animal.domestic!.slaughter).toBeUndefined();
  expect(slaughterIntent(world,animal,227)).toBe(false);expect([...autoSlaughterTargets(world,227)]).toEqual([]);
});

test('babies and juveniles share young quotas; reproductive adults have separate sex limits',()=>{
  const {world,animal}=camp(),adult=adultAgeTicks('hare');
  const maleBaby=add(world,'male',0),maleJuvenile=add(world,'male',juvenileAgeTicks('hare'));
  const femaleAdult=add(world,'female',adult),femaleBaby=add(world,'female',0),femaleJuvenile=add(world,'female',adult-1);
  expect(animalLifeStage(maleBaby)).toBe('baby');expect(animalLifeStage(maleJuvenile)).toBe('juvenile');
  policy(world,{maxMales:0,maxMalesYoung:1,maxFemales:0,maxFemalesYoung:1});
  expect(targets(world)).toEqual([femaleAdult.id,femaleJuvenile.id,animal.id,maleJuvenile.id]);
  expect(autoSlaughterCounts(world,'hare')).toEqual({total:6,males:1,malesYoung:2,females:1,femalesYoung:2,pregnant:0});
  expect(slaughterIntent(world,maleBaby)).toBe(false);expect(slaughterIntent(world,femaleBaby)).toBe(false);
});

test('category removals are subtracted once before the total limit, with oldest remaining selected',()=>{
  const {world,animal}=camp(),adult=adultAgeTicks('hare');
  const oldestFemale=add(world,'female',adult+600),youngerFemale=add(world,'female',adult+300),oldestMale=add(world,'male',adult+400);
  policy(world,{maxFemales:1,maxTotal:2});expect(targets(world)).toEqual([oldestFemale.id,oldestMale.id]);
  expect(slaughterIntent(world,youngerFemale)).toBe(false);expect(slaughterIntent(world,animal)).toBe(false);
});

test('pregnancy protection excludes mothers from both maxima, without hiding the visible pregnancies',()=>{
  const {world,animal}=camp(),adult=adultAgeTicks('hare');
  const mother1=add(world,'female',adult+800),mother2=add(world,'female',adult+900),female=add(world,'female',adult+500);
  mother1.pregnancy={fatherId:animal.id,progress:1};mother2.pregnancy={fatherId:animal.id,progress:gestationTicks('hare')};
  policy(world,{maxTotal:2,maxFemales:1});expect(targets(world)).toEqual([]);
  expect(autoSlaughterCounts(world,'hare')).toEqual({total:2,males:1,malesYoung:0,females:1,femalesYoung:0,pregnant:2});
  policy(world,{maxTotal:0});expect(targets(world)).toEqual([female.id,animal.id]);
});

test('authorized mothers follow all non-pregnant animals; more advanced pregnancy is selected first among them',()=>{
  const {world,animal}=camp(),adult=adultAgeTicks('hare');
  const early=add(world,'female',adult+900),late=add(world,'female',adult+200),female=add(world,'female',adult+300);
  early.pregnancy={fatherId:animal.id,progress:1};late.pregnancy={fatherId:animal.id,progress:100};
  policy(world,{maxTotal:1,allowPregnant:true});expect(targets(world)).toEqual([female.id,animal.id,late.id]);
  policy(world,{maxFemales:1,allowPregnant:true});expect(targets(world)).toEqual([female.id,late.id]);
  expect(autoSlaughterCounts(world,'hare').females).toBe(3);
});

test('equal age and pregnancy use stable IDs despite reversing the resident array',()=>{
  const {world,animal}=camp(),other=add(world,'male',animal.ageTicks);
  policy(world,{maxMales:1});expect(targets(world)).toEqual([animal.id]);
  world.wildlife!.animals.reverse();expect(targets(world)).toEqual([animal.id]);
  animal.sex=other.sex='female';animal.pregnancy={fatherId:world.pawns[0]!.id,progress:10};other.pregnancy={fatherId:world.pawns[0]!.id,progress:10};
  policy(world,{maxFemales:1,allowPregnant:true});expect(targets(world)).toEqual([animal.id]);
});

test('selection sees birth, death, ownership, maturation and pregnancy changes within the same tick',()=>{
  const {world,animal}=camp(),adult=adultAgeTicks('hare'),tick=world.tick;
  policy(world,{maxTotal:1,maxMalesYoung:0});expect(targets(world)).toEqual([]);
  const baby=add(world,'male',0);expect(targets(world)).toEqual([baby.id]);
  baby.ageTicks=adult;expect(targets(world)).toEqual([animal.id]);
  animal.health={...createMedicalRecord(world.tick),body:'hare',death:{tick:world.tick,cause:'execution'}};
  expect(targets(world)).toEqual([]);delete animal.health;
  delete animal.domestic;expect(targets(world)).toEqual([]);
  animal.domestic={...baby.domestic!};expect(targets(world)).toEqual([animal.id]);
  animal.sex='female';animal.pregnancy={fatherId:baby.id,progress:0};expect(targets(world)).toEqual([]);
  delete animal.pregnancy;expect(targets(world)).toEqual([animal.id]);expect(world.tick).toBe(tick);
});

test('cache captures scalar witnesses, changes ranking at the same tick, and survives uniform ageing',()=>{
  const {world,animal}=camp(),other=add(world,'male',animal.ageTicks-1);
  policy(world,{maxTotal:1});const before=autoSlaughterTargets(world);
  expect([...before]).toEqual([animal.id]);world.tick++;animal.ageTicks++;other.ageTicks++;
  expect(autoSlaughterTargets(world)).toBe(before);
  other.ageTicks=animal.ageTicks+1;expect(targets(world)).toEqual([other.id]);expect([...before]).toEqual([animal.id]);
  world.autoSlaughter![0]!.maxTotal=0;expect(targets(world)).toEqual([other.id,animal.id]);
});

test.each(['care','feed','lead','carry','slaughter','danger'] as const)('%s keeps selected animals in the population and never manufactures a replacement',kind=>{
  const {world,pawn,animal}=camp(),other=add(world,'male',animal.ageTicks-1);
  policy(world,{maxTotal:1});
  const handler=structuredClone(pawn);handler.id=world.nextId++;world.pawns.push(handler);
  if(kind==='care')handler.animalCare={animalId:animal.id,spot:{x:animal.x,z:animal.z},phase:'approach',progress:0};
  if(kind==='feed')handler.animalFeed={animalId:animal.id,sourcePileId:0,carryPileId:null,quantity:1,phase:'pickup',progress:0,spot:{x:animal.x,z:animal.z}};
  if(kind==='lead')handler.animalHandling={animalId:animal.id,kind:'lead',sourcePileId:0,carryPileId:null,quantity:0,phase:'approach',step:0,progress:0};
  if(kind==='carry')handler.animalRescue={animalId:animal.id,spotId:world.nextId++,phase:'carry'};
  if(kind==='slaughter')handler.animalHandling={animalId:animal.id,kind:'slaughter',sourcePileId:0,carryPileId:null,quantity:0,phase:'approach',step:0,progress:0};
  if(kind==='danger')animal.burning={phase:'panic',remainingCore:100};
  else expect(animalClaimed(world,animal.id)).toBe(true);
  expect(targets(world)).toEqual([animal.id]);expect(autoSlaughterCounts(world,'hare').total).toBe(2);
  expect(slaughterWanted(world,pawn)).toBe(false);expect(slaughterIntent(world,other)).toBe(false);
});

test('an unreachable selected animal leaves younger quota-compliant animals alive',()=>{
  const {world,pawn,animal}=camp(),other=add(world,'male',animal.ageTicks-1);
  animal.x=15;animal.z=15;
  for(let z=14;z<=16;z++)for(let x=14;x<=16;x++)if(x!==15||z!==15)world.tiles[z*world.width+x]={terrain:'rock'};
  policy(world,{maxTotal:1});expect(slaughterProposal(world,pawn,reachableCells(world,pawn,blockedCells(world),new Set()))).toBeUndefined();
  expect(targets(world)).toEqual([animal.id]);expect(other.health?.death).toBeUndefined();
});

test('unchecking manual intent preserves quota work and removing the quota cancels before the terminal gesture',()=>{
  const {world,pawn,animal}=camp();policy(world,{maxTotal:0});
  expect(designateSlaughter(world,{type:'slaughter',animalId:animal.id,enabled:true})).toEqual({ok:true});
  const task=begin(world);processSlaughter(world,pawn,task,context(world));const rng=world.rng;
  expect(designateSlaughter(world,{type:'slaughter',animalId:animal.id,enabled:false})).toEqual({ok:true});
  expect(pawn.animalHandling).toBe(task);expect(task.progress).toBe(1);expect(animal.domestic!.slaughter).toBeUndefined();
  policy(world,{});reconcileDomesticWork(world);
  expect(pawn.animalHandling).toBeUndefined();expect(animal.health?.death).toBeUndefined();expect(world.rng).toBe(rng);
});

test('manual intent survives quota removal and overrides protection of a pregnant mother',()=>{
  const {world,pawn,animal}=camp();animal.sex='female';animal.pregnancy={fatherId:world.nextId++,progress:1};
  policy(world,{maxTotal:0});expect(targets(world)).toEqual([]);
  expect(designateSlaughter(world,{type:'slaughter',animalId:animal.id,enabled:true})).toEqual({ok:true});
  const task=begin(world);processSlaughter(world,pawn,task,context(world));policy(world,{});reconcileDomesticWork(world);
  expect(pawn.animalHandling).toBe(task);expect(animal.domestic!.slaughter).toBe(true);
});

test('quota wakes an actual sleeping-place occupation while keeping its durable assignment',()=>{
  const {world,pawn,animal}=camp(),spot={id:world.nextId++,kind:'animal-sleeping-spot' as const,x:animal.x,z:animal.z,orientation:0 as const,footprint:'standard' as const};
  world.structures.push(spot);animal.domestic!.bedId=spot.id;animal.animalRest={spotId:spot.id,phase:'sleep'};animal.state='sleeping';
  expect(validateWorld(world)).toEqual([]);const rng=world.rng;
  policy(world,{maxTotal:0});reconcileAnimalRest(world);
  expect(animal.animalRest).toBeUndefined();expect(animal.domestic!.bedId).toBe(spot.id);expect(animal.state).toBe('idle');
  const task=begin(world);processSlaughter(world,pawn,task,context(world));expect(task.progress).toBe(1);expect(world.rng).toBe(rng);
  expect(validateWorld(world)).toEqual([]);
});

test('two physical kills in one tick consume only the original excess, then preserve the last survivor',()=>{
  const {world,pawn,animal}=camp(),second=add(world,'male',animal.ageTicks-1),survivor=add(world,'male',animal.ageTicks-2);
  second.x=animal.x;second.z=animal.z+1;policy(world,{maxTotal:1});
  const firstTask=begin(world);for(let i=0;i<SLAUGHTER_WORK_TICKS;i++)processSlaughter(world,pawn,firstTask,context(world));
  expect(animal.health!.death).toBeDefined();expect(targets(world)).toEqual([second.id]);
  const secondTask=begin(world);expect(secondTask.animalId).toBe(second.id);
  for(let i=0;i<SLAUGHTER_WORK_TICKS;i++)processSlaughter(world,pawn,secondTask,context(world));
  expect(second.health!.death).toBeDefined();expect(targets(world)).toEqual([]);expect(slaughterWanted(world,pawn)).toBe(false);
  expect(survivor.health?.death).toBeUndefined();advanceCorpses(world);
  expect(world.piles.filter(p=>p.corpse)).toHaveLength(2);expect(animal.domestic!.slaughter).toBeUndefined();expect(second.domestic!.slaughter).toBeUndefined();
});

test('policy command clones inputs and rejects malformed values atomically without history or RNG',()=>{
  const {world}=camp(),config=defaultAutoSlaughterConfig('hare');config.maxTotal=3;
  expect(setAutoSlaughterPolicy(world,{type:'auto-slaughter-policy',config})).toEqual({ok:true});config.maxTotal=0;
  expect(world.autoSlaughter![0]!.maxTotal).toBe(3);
  for(const value of [-2,.5,Infinity,Number.MAX_SAFE_INTEGER+1]){
    const before=structuredClone(world);
    expect(setAutoSlaughterPolicy(world,{type:'auto-slaughter-policy',config:{...config,maxTotal:value}}).ok).toBe(false);
    expect(world).toEqual(before);
  }
});

test.each(['approach','carry'] as const)('quota added during real rescue %s allows one deposit without reacquiring the patient',phase=>{
  const {world,pawn,animal}=camp();pawn.priorities.handle=0;pawn.priorities.doctor=1;
  animal.x=12;animal.z=pawn.z;animal.food=.15;
  animal.health={...createMedicalRecord(world.tick),body:'hare',bloodLoss:Math.round(BLOOD_UNIT*.65)};
  reconcileAnimalHealth(world,animal);expect(animal.state).toBe('downed');
  const spot={id:world.nextId++,kind:'animal-sleeping-spot' as const,x:6,z:12,orientation:0 as const,footprint:'standard' as const,medical:true as const};
  world.structures.push(spot);
  expect(applyAnimalRescue(world,{type:'order-animal-rescue',pawnId:pawn.id,animalId:animal.id})).toEqual({ok:true});
  const until=(wanted:()=>boolean,max=200)=>{for(let n=0;n<max&&!wanted();n++)stepWorld(world);expect(wanted()).toBe(true);};
  const check=()=>{
    expect(validateWorld(world)).toEqual([]);expect(deserializeWorld(serializeWorld(world))).toEqual(world);
    const decoded=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(world,0,1)));
    expect(decoded.status).toBe('applied');if(decoded.status==='applied')expect(decoded.world).toEqual(world);
  };
  until(()=>pawn.animalRescue?.phase===phase&&!!pawn.motion&&pawn.motion.end>world.tick);
  expect(applyCommand(world,{type:'auto-slaughter-policy',config:{...defaultAutoSlaughterConfig('hare'),maxTotal:0}})).toEqual({ok:true});
  expect(pawn.animalRescue?.phase).toBe(phase);expect(autoSlaughterTargets(world).has(animal.id)).toBe(true);check();
  until(()=>pawn.animalRescue===undefined);
  expect({x:animal.x,z:animal.z}).toEqual({x:spot.x,z:spot.z});expect(animal.state).toBe('downed');
  expect(animal.animalRest).toBeUndefined();expect(animal.domestic!.slaughter).toBeUndefined();check();
  const reach=()=>reachableCells(world,pawn,blockedCells(world),new Set());
  expect(animalRescueWanted(world,pawn)).toBe(false);expect(animalRescueProposal(world,pawn,reach())).toBeUndefined();
  for(let n=0;n<15;n++)stepWorld(world);
  expect(pawn.animalRescue).toBeUndefined();expect(animal.health?.death).toBeUndefined();
  expect(animalRescueWanted(world,pawn)).toBe(false);check();
  expect(applyCommand(world,{type:'auto-slaughter-policy',config:defaultAutoSlaughterConfig('hare')})).toEqual({ok:true});
  expect(animalRescueWanted(world,pawn)).toBe(true);expect(animalRescueProposal(world,pawn,reach())).toBeDefined();check();
});
