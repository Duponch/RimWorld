import {deconstructionCamp,fixtureBuilding} from './deconstruction.ts';
import {applyCommand} from '../../src/sim/engine.ts';
import {constructFreshInitialWildAnimal256} from '../../src/sim/initial-animal-constructor-256.ts';
import {INITIAL_ANIMAL_FACTS_256} from '../../src/sim/initial-animal-data-256.ts';
import {WorldGenerationRandom} from '../../src/sim/world-generation-random.ts';
import {enableWildlife} from '../../src/sim/wildlife.ts';
import {addMaterial,refreshStock} from '../../src/sim/materials.ts';
import {TAMENESS_DECAY} from '../../src/sim/animal-handling.ts';
import {legacyHumanAge} from '../../src/sim/human-age.ts';

/** Declared BEFORE training/hauling property, on the existing valid32² legacy
 * colony fixture. The Labrador is ONE original from the same admitted fresh
 * constructor as starting-pets-four-v256, not a renamed hare or copied Pawn.
 * Species and ownership are prepared, not a claimed random starting-pet draw
 * or played taming. No startingPet/Obedience/Haul receipt is manufactured. */
export function animalHaulingCamp459(){
  const world=deconstructionCamp(1,32),handler=world.pawns[0]!;
  world.stockpiles=[];world.growingZones=[];world.packed=[];
  delete world.wildlife;
  Object.assign(handler,{name:'Soigneur des réserves',x:10,z:12,age:legacyHumanAge(),hunger:100,rest:100});
  delete handler.health;delete handler.background;delete handler.traits;
  handler.recreation.level=100;handler.schedule.fill('anything');handler.apparelAutomation=false;
  for(const key of Object.keys(handler.priorities) as (keyof typeof handler.priorities)[])handler.priorities[key]=0;
  handler.priorities.handle=1;handler.skills.animals={level:20,xp:0,dailyXp:0,passion:0};
  const bed=fixtureBuilding(world,'bed',8,19),spot=fixtureBuilding(world,'animal-sleeping-spot',12,19);
  handler.bedId=bed.id;

  // One normal creation stream, inherited seed42, never searched/restarted or
  // replaced by favourable endpoints. Blocked/clinical output is not healed or
  // rerolled to hide a generation boundary.
  const random=new WorldGenerationRandom(world.seed),made=constructFreshInitialWildAnimal256({
    fact:INITIAL_ANIMAL_FACTS_256.LabradorRetriever,id:world.nextId,cell:{x:12,z:12},tick:world.tick,random,
  });
  if(made.status!=='ready')throw Error('Declared Labrador construction blocked without retry: '+made.reason);
  const animal=made.animal;
  if(animal.health)throw Error('Declared healthy Labrador needs an uninjured constructor output; no history was erased');
  world.nextId++;
  animal.domestic={since:world.tick,care:'herbal',tameness:5,nextDecay:world.tick+TAMENESS_DECAY,bedId:spot.id};
  enableWildlife(world,0);world.wildlife!.animals.push(animal);

  const kibbleId=world.nextId;addMaterial(world,'food',60,{type:'ground',x:8,z:12},'kibble');
  const secondKibbleId=world.nextId;addMaterial(world,'food',60,{type:'ground',x:8,z:13},'kibble');
  const woodId=world.nextId;addMaterial(world,'wood',20,{type:'ground',x:8,z:15},'wood');
  for(const x of [8,9])addMaterial(world,'food',6,{type:'ground',x,z:16},'survival-meal');
  for(const [x,z] of [[20,11],[21,11],[20,12],[21,12]] as const){
    const result=applyCommand(world,{type:'stockpile',x,z,enabled:true,filters:{wood:true,food:true}});
    if(!result.ok)throw Error('Declared finite storage refused: '+result.reason);
  }
  refreshStock(world);
  return {world,handler,animal,handlerId:handler.id,animalId:animal.id,bedId:bed.id,spotId:spot.id,woodId,kibbleId,kibbleIds:[kibbleId,secondKibbleId],
    preparation:{kind:'declared-before-animal-training' as const,fromTick:world.tick,
      map:'Existing simple32x32 legacy colony, known grass and four ordinary wood/food storage cells; no geographic-generation or voyage claim.',
      handler:'One healthy adult free handler, Animals20/Handling1, other work disabled, ordinary human bed and initial needs prepared once.',
      animal:'One actual Labrador fresh-constructor original, native generated age/growth/sex/needs and unchanged creation draws; domestic ownership prepared, no training tracker, startingPet receipt, Obedience or Haul steps offered.',
      property:'One hundred twenty kibble in two stacks of60, twenty wood, twelve survival meals in two stacks of6, one human bed and one ordinary animal sleeping spot, all finite initial property.',
      random:'One unmodified WorldGenerationRandom(world.seed) constructor stream. No favourable seed search, outcome pin, gameplay RNG reset, or needs refill after play.',
      constructorState:random.state}};
}
