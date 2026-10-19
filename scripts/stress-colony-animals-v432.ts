/** Explicit prepared stress population, never earned breeding/taming history.
 * No import-time World creation, simulation, output, RNG draw or runtime edit. */
import assert from 'node:assert/strict';
import {canTameSpecies,TAMENESS_DECAY} from '../src/sim/animal-handling.ts';
import {adultAgeTicks,animalNutritionMax} from '../src/sim/animal-life.ts';
import {attachGeneratedAnimalGrowth256} from '../src/sim/animal-growth-runtime-256.ts';
import {initializeAnimalEggLayer256} from '../src/sim/animal-egg-local-v256.ts';
import {PEN_ANIMALS,invalidateAnimalPens,penRegion} from '../src/sim/animal-pens.ts';
import {productKind} from '../src/sim/animal-products.ts';
import {isAnimalSpeciesInVersion,type AnimalSpeciesId} from '../src/sim/animal-species.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {duckPhysicalOwnerCount256} from '../src/sim/duck-flyer-runtime-256.ts';
import {canStandAt} from '../src/sim/furniture-travel.ts';
import {MAX_WILDLIFE,type WildAnimal} from '../src/sim/wildlife-state.ts';
import type {Cell,World} from '../src/sim/types.ts';

export interface StressAnimalPen432 {readonly markerId:number;readonly cells:readonly Cell[]}
export interface StressAnimalSummary432 {
  notice:string;
  tick:number;
  originalWild:number;
  originalDomestic:number;
  addedWild:number;
  domestic:number;
  wild:number;
  total:number;
  remainingCapacity:number;
  addedIds:number[];
  domesticSpecies:Partial<Record<AnimalSpeciesId,number>>;
  wildSpecies:Partial<Record<AnimalSpeciesId,number>>;
  productsReady:{milk:number;shear:number};
  relocated:{id:number;from:Cell;to:Cell;previousActivity:Partial<WildAnimal>}[];
  pens:{markerId:number;closed:boolean;accessible:boolean;cells:number;animals:number;species:Partial<Record<AnimalSpeciesId,number>>}[];
  unchangedRng:{world:number;wildlife:number};
  unavailableRequestedSpecies:readonly string[];
}

// Cows, sheep and chickens have no current species definition. Actual native
// producers supply camel/yak milk, muffalo/alpaca wool and duck/turkey eggs.
const HERD:readonly {species:AnimalSpeciesId;count:number}[]=[
  {species:'muffalo',count:10},{species:'dromedary',count:10},
  {species:'alpaca',count:10},{species:'yak',count:5},
  {species:'duck',count:3},{species:'turkey',count:2},
];
const WILD:readonly AnimalSpeciesId[]=['deer','hare','gazelle'];
const ACTIVITY_KEYS=['state','path','motion','meal','predation','flee','exiting','sleepUntilCore','wander','nextDecision'] as const;

/** The caller owns a fresh actual263 single settlement after ordinary pods.
 * All admission and constructors finish before the first persistent mutation.
 * Original animal identity, clinical history and prospective biology survive;
 * conflicting movement/feeding is explicitly stopped only when relocating.
 */
export function prepareStressAnimals432(world:World,pens:readonly StressAnimalPen432[],wildCells:readonly Cell[]):StressAnimalSummary432 {
  assert.equal(Number(world.schemaVersion),263);
  assert.equal(world.width,250);assert.equal(world.height,250);
  assert.equal(pens.length,4,'The stress population requires four real pens.');
  assert.equal(new Set(pens.map(p=>p.markerId)).size,4,'Pen identities must be distinct.');
  assert.equal(world.worldMaps?.sites.length,1,'Only the fresh single settlement is supported.');
  assert.equal(world.worldMaps?.rootMapId,0);
  assert.equal(world.worldMaps?.sites[0]?.kind,'settlement');
  assert.equal(world.worldGroups?.groups.length,0);
  assert.equal(world.startingArrival?.phase,'opened','Open the actual starting capsules first.');
  const fauna=world.wildlife;assert.ok(fauna,'Keep the actual generated wildlife owner.');
  assert.equal(fauna.flyers?.length??0,0,'Held flyers need their real entry, never a prepared relocation.');
  const originalWild=fauna.animals.filter(a=>!a.domestic).length;
  const originalDomestic=fauna.animals.length-originalWild;
  const targetTotal=240+originalDomestic;
  assert.ok(originalWild<=80,'The original wild fauna must fit the requested total of eighty wild animals.');
  assert.ok(fauna.animals.every(a=>a.state!=='dead'&&a.state!=='downed'),'Only live original animals are admitted.');
  assert.ok(fauna.animals.every(a=>!a.domestic||a.species==='husky'&&a.domestic.penMarkerId===undefined),'Preserve the actual original companion outside the prepared livestock pens.');
  assert.ok(!world.pawns.some(p=>p.animalHandling||p.animalCare||p.animalFeed||p.animalRescue||p.hunting),'Prepare before humans acquire any original animal task.');
  assert.ok(Number.isSafeInteger(world.nextId+160+80-originalWild),'Animal identity namespace exhausted.');
  assert.ok(targetTotal<=MAX_WILDLIFE&&duckPhysicalOwnerCount256(world)===fauna.animals.length);
  for(const {species} of HERD){
    assert.ok(isAnimalSpeciesInVersion(species,world.schemaVersion)&&canTameSpecies(species)&&PEN_ANIMALS.includes(species),`Unsupported penned species ${species}.`);
  }
  for(const species of WILD)assert.ok(isAnimalSpeciesInVersion(species,world.schemaVersion));

  const originalCount=fauna.animals.length,rng=world.rng,faunaRng=fauna.rng;
  const registry=()=>JSON.stringify([world.worldMaps,world.worldGroups,world.worldPawns,world.worldFactions,world.worldSites263]);
  const registryBefore=registry();
  const index=(c:Cell)=>c.z*world.width+c.x;
  const validCell=(c:Cell)=>Number.isInteger(c.x)&&Number.isInteger(c.z)&&c.x>0&&c.z>0&&c.x<world.width-1&&c.z<world.height-1;
  // Include traversable furniture, supplies and previous actor positions:
  // nobody initially shares a square, sleeping spot, gate or stockpile stack.
  const fixed=new Set<number>([
    ...world.pawns.map(index),...(world.mechanoids??[]).map(index),
    ...world.structures.flatMap(s=>footprintCells(s).map(index)),
    ...world.piles.flatMap(p=>p.owner.type==='ground'?[index(p.owner)]:[]),
    ...world.packed.flatMap(p=>p.owner.type==='ground'?[index(p.owner)]:[]),
  ]);
  invalidateAnimalPens(world);
  const allPenCells=new Set<number>();
  const penPlans=pens.map(p=>{
    const marker=world.structures.find(s=>s.id===p.markerId&&s.kind==='pen-marker');
    const region=penRegion(world,p.markerId);
    assert.ok(marker?.pen&&region?.closed&&region.accessible,`Pen ${p.markerId} is not physically closed and accessible.`);
    for(const n of region.cells){assert.ok(!allPenCells.has(n),'The four markers must identify separate enclosed regions.');allPenCells.add(n);}
    return {marker,region,supplied:p.cells};
  });
  const occupied=new Set(fixed),originalCells=new Set(fauna.animals.map(index));
  const relocationPlan:{animal:WildAnimal;to:Cell;previousActivity:Partial<WildAnimal>}[]=[];
  const wildAvailable:Cell[]=[],seenWild=new Set<number>();
  for(const c of wildCells){
    if(!validCell(c))continue;const n=index(c);
    if(seenWild.has(n))continue;seenWild.add(n);
    if(!fixed.has(n)&&!allPenCells.has(n)&&!originalCells.has(n)&&canStandAt(world,c))wildAvailable.push({...c});
  }
  let wildCursor=0;
  const takeWild=()=>{const c=wildAvailable[wildCursor++];assert.ok(c,'Insufficient distinct standable wild cells outside all pens.');occupied.add(index(c));return c;};
  for(const a of fauna.animals){
    const n=index(a),conflict=!validCell(a)||occupied.has(n)||allPenCells.has(n)||!canStandAt(world,a)
      ||!a.domestic&&a.path.some(c=>fixed.has(index(c))||allPenCells.has(index(c))||!canStandAt(world,c))
      ||!!a.motion&&(fixed.has(index(a.motion.from))||allPenCells.has(index(a.motion.from))||!canStandAt(world,a.motion.from));
    if(conflict){
      assert.ok(!a.hive&&!a.flight&&!a.exitFlight&&!a.threat&&!a.retaliation&&!a.strike&&!a.manhunter&&!a.burning&&!a.stun&&!a.confusion,'Relocation of a combat, held or clinical activity requires its actual transaction.');
      const previousActivity:Partial<WildAnimal>={};
      for(const k of ACTIVITY_KEYS)if(Object.hasOwn(a,k))Object.assign(previousActivity,{[k]:structuredClone(a[k])});
      relocationPlan.push({animal:a,to:takeWild(),previousActivity});
    }else occupied.add(n);
  }
  const made:WildAnimal[]=[],penSummaries:StressAnimalSummary432['pens']=[];
  let nextId=world.nextId;
  const animal=(species:AnimalSpeciesId,sex:WildAnimal['sex'],cell:Cell):WildAnimal=>{
    const a:WildAnimal={id:nextId++,species,sex,...cell,ageTicks:adultAgeTicks(species)+6000,
      food:0,rest:.9,state:'idle',path:[],nextDecision:world.tick+1,caravanCarrySick:false};
    attachGeneratedAnimalGrowth256(a,world.tick*10,world.schemaVersion);
    initializeAnimalEggLayer256(a);a.food=Math.fround(animalNutritionMax(a)*.8);return a;
  };
  for(const plan of penPlans){
    const cells:Cell[]=[],seen=new Set<number>();
    for(const c of plan.supplied){
      if(!validCell(c))continue;const n=index(c);
      if(seen.has(n))continue;seen.add(n);
      if(plan.region.cells.has(n)&&!occupied.has(n)&&!originalCells.has(n)&&canStandAt(world,c))cells.push({...c});
    }
    assert.ok(cells.length>=40,`Pen ${plan.marker.id} has fewer than forty distinct physical placements.`);
    let cursor=0;const speciesCounts:Partial<Record<AnimalSpeciesId,number>>={};
    for(const entry of HERD)for(let i=0;i<entry.count;i++){
      // One declared male of every species per pen; mating and egg production
      // subsequently use ordinary runtime contact and biology, never a fixture.
      const a=animal(entry.species,i===entry.count-1?'male':'female',cells[cursor++]!);
      a.domestic={since:world.tick,care:'herbal',tameness:5,nextDecay:world.tick+TAMENESS_DECAY,penMarkerId:plan.marker.id};
      if(productKind(a))a.domestic.productFullness=1;
      occupied.add(index(a));made.push(a);speciesCounts[a.species]=(speciesCounts[a.species]??0)+1;
    }
    penSummaries.push({markerId:plan.marker.id,closed:plan.region.closed,accessible:plan.region.accessible,cells:plan.region.cells.size,animals:40,species:speciesCounts});
  }
  for(let i=originalWild;i<80;i++)made.push(animal(WILD[(i-originalWild)%WILD.length]!,i%2?'male':'female',takeWild()));
  assert.equal(made.length+originalCount,targetTotal);
  assert.ok(duckPhysicalOwnerCount256(world)+made.length<=MAX_WILDLIFE);

  // Commit once all four pens, relocation destinations and new originals have
  // passed admission. Existing IDs, ages, needs and clinical records stay put.
  for(const plan of penPlans)for(const {species} of HERD)if(!plan.marker.pen!.accepted.includes(species))plan.marker.pen!.accepted.push(species);
  const relocated:StressAnimalSummary432['relocated']=[];
  for(const {animal:a,to,previousActivity} of relocationPlan){
    relocated.push({id:a.id,from:{x:a.x,z:a.z},to:{...to},previousActivity});
    Object.assign(a,to);a.path=[];a.state='idle';a.nextDecision=world.tick+1;
    delete a.motion;delete a.meal;delete a.predation;delete a.flee;delete a.exiting;delete a.sleepUntilCore;
    if(a.wander)delete a.wander.job;
  }
  fauna.animals.push(...made);world.nextId=nextId;
  assert.equal(world.rng,rng);assert.equal(fauna.rng,faunaRng);assert.equal(registry(),registryBefore);
  const domesticSpecies:StressAnimalSummary432['domesticSpecies']={},wildSpecies:StressAnimalSummary432['wildSpecies']={};
  const productsReady={milk:0,shear:0};
  for(const a of fauna.animals){
    const counts=a.domestic?domesticSpecies:wildSpecies;counts[a.species]=(counts[a.species]??0)+1;
    const product=productKind(a);if(product&&a.domestic?.productFullness===1)productsReady[product]++;
  }
  return {notice:'Prepared finite stress inheritance: 160 new penned domestic animals, original domestic companion retained with its actual bond and clinical history, wild population completed to 80, declared conflict relocations, adult biological owners and initially full milk/wool. No taming, breeding, grazing, milking, shearing or egg laying has been preplayed. Original population/renewal clocks and RNG are unchanged; normal births, renewal and departures remain active.',
    tick:world.tick,originalWild,originalDomestic,addedWild:80-originalWild,domestic:160+originalDomestic,wild:80,total:fauna.animals.length,
    remainingCapacity:MAX_WILDLIFE-duckPhysicalOwnerCount256(world),addedIds:made.map(a=>a.id),domesticSpecies,wildSpecies,
    productsReady,relocated,pens:penSummaries,unchangedRng:{world:rng,wildlife:faunaRng},unavailableRequestedSpecies:['chicken','sheep','cow']};
}
