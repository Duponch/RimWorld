import {createWorld,refreshStock,stepWorld,applyCommand} from '../../src/sim/index.ts';
import {adoptMiscIncidents} from '../../src/sim/cassandra-misc.ts';
import {crashlandedProfile} from '../../src/sim/game-profile.ts';
import {enableCassandraRaids} from '../../src/sim/cassandra-raids.ts';
import {adoptFluIncidents} from '../../src/sim/flu-incidents.ts';
import {createDeteriorationState} from '../../src/sim/deterioration-content.ts';
import {newBreakdownCalendar} from '../../src/sim/breakdowns.ts';
import {createApparelWearCalendar} from '../../src/sim/apparel-renewal.ts';
import {adoptSiteClimate} from '../../src/sim/site-climate.ts';
import {resolveSite} from '../../src/sim/site.ts';
import {initializeWildFlora} from '../../src/sim/wild-flora.ts';
import {startingPawn} from '../../src/sim/starting-pawns.ts';
import {constructFreshInitialWildAnimal256} from '../../src/sim/initial-animal-constructor-256.ts';
import {INITIAL_ANIMAL_FACTS_256} from '../../src/sim/initial-animal-data-256.ts';
import {WorldGenerationRandom} from '../../src/sim/world-generation-random.ts';
import {enableWildlife} from '../../src/sim/wildlife.ts';
import {TAMENESS_DECAY} from '../../src/sim/animal-handling.ts';
import {addGroundMaterial} from '../../src/sim/materials.ts';
import {createPlantLife} from '../../src/sim/plant-life.ts';
import {PLANT_DEFINITIONS} from '../../src/sim/plants.ts';
import {resolveSelectedToxicFallout294} from '../../src/sim/toxic-fallout-incident-294.ts';
import {TOXIC_FALLOUT_DOSE_INTERVAL294} from '../../src/sim/toxic-fallout-state-294.ts';
import {TICKS_PER_DAY,type World,type Command,type Cell,type Resource,type Structure} from '../../src/sim/types.ts';

export const FALLOUT_PREPARED_DAY481=60*TICKS_PER_DAY;

/** Empty late-start fixture, not sixty played days. Every physical calendar is
 * created at this frontier and the caller must play the first step normally.
 * Shared by Node, ordinary browser import and tests; no vitest dependency. */
export function makeFalloutColony481(size=32):World {
 const w=createWorld(481,size,size);w.pawns=[];w.resources=[];w.piles=[];w.jobs=[];w.structures=[];w.stockpiles=[];w.growingZones=[];refreshStock(w);
 w.gameProfile=crashlandedProfile();w.tick=FALLOUT_PREPARED_DAY481-1;w.scenario={id:'crashlanded',revision:8,landing:{x:4,z:4}};w.site=resolveSite(w.seed,{hilliness:'flat',biome:'boreal-forest'});
 w.deterioration=createDeteriorationState(w.seed,w.tick);w.breakdown=newBreakdownCalendar(w.seed,w.tick);w.apparelWear=createApparelWearCalendar(w.tick,(w.seed^0x0a77e1)>>>0);
 if(w.site.revision===2)initializeWildFlora(w,w.site);
 enableCassandraRaids(w,true);adoptFluIncidents(w);adoptSiteClimate(w);adoptMiscIncidents(w);return w;
}

function command481(w:World,c:Command):void {const result=applyCommand(w,c);if(!result.ok)throw Error('Fallout scenario command refused: '+c.type+' / '+result.reason);}

/** Declared finite property with one genuinely started environmental incident.
 * No injuries, poison, corpse, forced death, restored needs or favourable seed
 * search is used. Native factory ailments and all creation draws are retained. */
export function prepareFalloutExposureScenario481(size=64){
 if(!Number.isSafeInteger(size)||size<32)throw Error('Fallout scenario requires at least32 cells per side');
 const world=makeFalloutColony481(size);stepWorld(world,1);
 if(world.tick!==FALLOUT_PREPARED_DAY481||!world.miscIncidents?.toxicFallout)throw Error('Fallout scenario did not acquire its played adoption frontier');
 // The landscape and property below are explicit initial preparation, not
 // player construction, geography generation or a sixty-day survival claim.
 world.tiles=world.tiles.map(()=>({terrain:'soil'}));world.resources=[];
 const cells={exposedHuman:{x:10,z:10},coveredHuman:{x:14,z:10},humanShelter:{x:14,z:11},
  animalArea:Array.from({length:9},(_,i)=>({x:8+i%3,z:14+Math.floor(i/3)})),
  exposedFood:{x:20,z:10},coveredFood:{x:22,z:10},exposedWood:{x:20,z:12},coveredWood:{x:22,z:12}};
 const exposed=startingPawn(world.nextId++,'Ada exposée',cells.exposedHuman.x,cells.exposedHuman.z,0,55,world.seed,world.tick,294);
 const covered=startingPawn(world.nextId++,'Noé à couvert',cells.coveredHuman.x,cells.coveredHuman.z,1,55,world.seed,world.tick,294);
 world.pawns.push(exposed,covered);
 // Each distinct roof component is cardinally connected to a true holder.
 // Merely putting a wall within6.9 cells across an unroofed gap is insufficient.
 for(const cell of [{x:15,z:11},{x:23,z:10},{x:23,z:12},{x:24,z:21}])world.structures.push({id:world.nextId++,kind:'wall',...cell,orientation:0,footprint:'standard',material:'wood'} satisfies Structure);
 const roofCells=[cells.coveredHuman,cells.humanShelter,cells.coveredFood,cells.coveredWood,{x:22,z:20},{x:23,z:20},{x:22,z:21},{x:23,z:21}].map(c=>c.z*size+c.x).sort((a,b)=>a-b);
 world.roofing={constructed:roofCells.slice(),build:[],remove:[],cursor:0};
 const creation=new WorldGenerationRandom(world.seed),made=constructFreshInitialWildAnimal256({fact:INITIAL_ANIMAL_FACTS_256.LabradorRetriever,id:world.nextId,cell:{x:9,z:15},tick:world.tick,random:creation});
 if(made.status!=='ready')throw Error('Fixed original Labrador construction blocked: '+made.reason);
 const animal=made.animal;world.nextId++;enableWildlife(world,0);world.wildlife!.animals.push(animal);
 animal.domestic={since:world.tick,care:'herbal',tameness:5,nextDecay:world.tick+TAMENESS_DECAY};
 command481(world,{type:'allowed-area-create',label:'Parcelle exposée préparée'});const animalAreaId=world.allowedAreas!.at(-1)!.id;
 command481(world,{type:'allowed-area-paint',areaId:animalAreaId,enabled:true,from:{x:8,z:14},to:{x:10,z:16}});
 command481(world,{type:'animal-area-assign',animalId:animal.id,choice:{kind:'allowed',areaId:animalAreaId}});
 command481(world,{type:'draft',pawnIds:[exposed.id,covered.id],enabled:true});
 const ground=(cell:Cell,item:'rice'|'wood')=>{const id=world.nextId;addGroundMaterial(world,item==='wood'?'wood':'food',20,cell,item);const p=world.piles.find(p=>p.id===id);if(!p)throw Error('Prepared ground pile did not retain its expected identity');return p.id;};
 const ids={exposedHuman:exposed.id,coveredHuman:covered.id,animal:animal.id,
  exposedFood:ground(cells.exposedFood,'rice'),coveredFood:ground(cells.coveredFood,'rice'),exposedWood:ground(cells.exposedWood,'wood'),coveredWood:ground(cells.coveredWood,'wood'),
  exposedCrops:[] as number[],coveredCrops:[] as number[]};
 const crop=(cell:Cell)=>{const p:Resource={id:world.nextId++,kind:'rice',...cell,amount:PLANT_DEFINITIONS.rice.yield,growth:.4,growthTick:world.tick};p.plantLife=createPlantLife(world,p,true);world.resources=[...world.resources,p];return p.id;};
 for(let i=0;i<20;i++)ids.exposedCrops.push(crop({x:14+i%5,z:20+Math.floor(i/5)}));
 for(const c of [{x:22,z:20},{x:23,z:20},{x:22,z:21},{x:23,z:21}])ids.coveredCrops.push(crop(c));
 refreshStock(world);
 // Explicit selected opportunity, not a claim that Cassandra rolled this
 // event. The ordinary resolver owns duration, stream, cursor and message.
 world.miscIncidents.opportunities++;
 if(!resolveSelectedToxicFallout294(world,1))throw Error('Prepared selected fallout opportunity was ineligible');
 const startedAt=world.tick,nextDoseCore=(Math.floor(world.tick*10/TOXIC_FALLOUT_DOSE_INTERVAL294)+1)*TOXIC_FALLOUT_DOSE_INTERVAL294;
 const baseline={exposedToxic:exposed.health?.toxicBuildup?.severity??0,coveredToxic:covered.health?.toxicBuildup?.severity??0,animalToxic:animal.health?.toxicBuildup?.severity??0};
 return {world,ids,cells,roofCells,startedAt,nextDoseCore,baseline,preparation:{
  clock:'Prepared at day60−1, then one real step advanced all adopted clocks; sixty preceding days were not played.',
  terrain:`Declared empty flat${size}×${size} soil patch with four real cardinally connected support walls and eight prepared roof cells; no completed construction claim.`,
  people:'Two true current startingPawn originals, factory age/ailments/needs preserved; draft commands hold their exposed/covered positions.',
  animal:'One fixed-stream fresh Labrador original, no reroll/healing/refill; domestic affiliation prepared, a real allowed-area assignment keeps its outdoor parcel.',
  goods:'Four ground stacks of20 (rice/wood, exposed/covered), twenty exposed rice crops plus four covered crops, with current actual life/rot anchors.',
  incident:'One selected Misc opportunity explicitly prepared; resolveSelectedToxicFallout294(seed1) really creates duration, RNG, cursor and letter. No poison or corpse is prepared.',
  constructorState:creation.state,
 }};
}
