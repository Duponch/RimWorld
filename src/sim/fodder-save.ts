import {animalNutritionMax} from './animal-life.ts';
import {validAnimalAgeCoreRemainder256} from './initial-animal-age-owner-256.ts';
import {captureHumanOwners} from './human-owners.ts';
import {validFoodPoisoning} from './food-poisoning-save.ts';
import {TICKS_PER_DAY,type World} from './types.ts';
import {animalMealTarget} from './wildlife-food.ts';
import {animalSpecies} from './animal-species.ts';
import {ITEM_DEFINITIONS} from './items.ts';
import type {WildAnimal} from './wildlife-state.ts';

const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const field=(value:unknown,key:string):unknown=>object(value)?value[key]:undefined;
const list=(value:unknown):unknown[]=>{
  if(value===undefined)return [];
  if(!Array.isArray(value))throw Error('Malformed transport container');
  return value;
};
const records=(value:unknown):Record<string,unknown>[]=>list(value).map(entry=>{
  if(!object(entry))throw Error('Malformed transport record');
  return entry;
});
const fodder=(value:unknown):boolean=>value==='hay'||value==='kibble';
const fodderKeys=(value:unknown):boolean=>object(value)&&(Object.hasOwn(value,'hay')||Object.hasOwn(value,'kibble'));
const cropKey=(value:unknown):boolean=>object(value)&&Object.hasOwn(value,'haygrass');
const poisonedByFodder=(health:unknown):boolean=>fodder(field(field(health,'foodPoisoning'),'item'));
const futureProduction=(task:unknown):boolean=>object(task)&&(task.recipe==='make-kibble'
  ||fodderKeys(task.filters)||records(task.ingredients).some(part=>fodder(part.item)));

interface RawTransport {people:Record<string,unknown>[];piles:Record<string,unknown>[];buildings:Record<string,unknown>[]}
/** Original containers only. Historical versions may omit modern containers,
 * clocks and Pawn fields; references in offers/memberIds are never owners. */
function originalTransport(raw:Record<string,unknown>):RawTransport {
  const people=records(raw.pawns),piles=records(raw.piles),packs=records(raw.packed);
  const trips=[raw.scout,raw.commercialTrip];
  for(const trip of trips){
    const pawn=field(trip,'pawn');if(object(pawn))people.push(pawn);
    piles.push(...records(field(trip,'items')));
  }
  people.push(...records(field(raw.group,'members')));
  piles.push(...records(field(raw.group,'items')));
  const departures=[...records(raw.groupLosses),...records(field(raw.visitors,'departed')),
    ...records(field(raw.podRescues,'departed')),...records(field(raw.raids,'departed')),...records(raw.prisonDepartures)];
  for(const departure of departures){
    if(object(departure.pawn))people.push(departure.pawn);
    piles.push(...records(departure.items));packs.push(...records(departure.packed));
  }
  piles.push(...records(field(raw.civilianPost,'stock')));
  const jobs=records(raw.jobs),buildings=[...records(raw.structures),...jobs];
  for(const pack of packs)if(object(pack.building))buildings.push(pack.building);
  for(const job of jobs)for(const key of ['furniture','deconstruction','flick','fixBreakdown']){
    if(object(job[key]))buildings.push(job[key]);
  }
  return {people,piles,buildings};
}

function containsFutureFodder(raw:Record<string,unknown>,transport:RawTransport):boolean {
  if(transport.piles.some(p=>fodder(p.item)||poisonedByFodder(field(p.corpse,'health'))))return true;
  if(records(raw.resources).some(resource=>resource.kind==='haygrass')
    ||records(raw.growingZones).some(zone=>zone.plant==='haygrass'))return true;
  // Sowing jobs reference the actual growing zone; there is no serialized
  // independent crop payload to normalize before checking that zone's plant.
  if(records(raw.stockpiles).some(zone=>fodderKeys(zone.items)||fodderKeys(zone.filters)))return true;
  if(records(raw.foodPolicies).some(policy=>list(policy.allowed).some(fodder)))return true;
  for(const building of transport.buildings){
    if(fodderKeys(building.items)||fodderKeys(building.filters))return true;
    if(records(building.bills).some(futureProduction))return true;
  }
  for(const pawn of transport.people){
    if(futureProduction(pawn.cooking)||records(pawn.memories).some(memory=>memory.kind==='ate-kibble')
      ||poisonedByFodder(pawn.health))return true;
    for(const order of list(field(pawn.orders,'queue')))if(object(order)&&futureProduction(order.cooking))return true;
  }
  for(const animal of records(field(raw.wildlife,'animals')))if(poisonedByFodder(animal.health))return true;
  const destruction=raw.destroyed,fire=field(raw.fires,'ledger'),trade=raw.trade;
  if([raw.spoiled,field(destruction,'items'),field(fire,'items'),field(trade,'bought'),field(trade,'sold')].some(fodderKeys)
    ||[field(destruction,'resources'),field(fire,'resources')].some(cropKey))return true;
  for(const receipt of records(field(trade,'recent')))if(records(receipt.lines).some(line=>fodder(line.item)))return true;
  return false;
}

function humanTaskTargetsHay(task:unknown,hayIds:ReadonlySet<unknown>):boolean {
  if(!object(task))return false;
  if(hayIds.has(task.sourcePileId)||hayIds.has(task.carryPileId))return true;
  // A paste request carries source identities, rather than item names. These
  // remain human food sources even before the resulting meal is materialized.
  return records(field(task.paste,'ingredients')).some(part=>hayIds.has(part.pileId));
}

/** Only new-food animal records enter this frontier. Historical meals retain
 * their existing validation path. Target lookup reuses the local food contract;
 * no route search or complete wildlife validator is introduced here. */
function validAnimalFodder(w:World,raw:Record<string,unknown>,version:number):boolean {
  const animals=records(field(raw.wildlife,'animals')),piles=list(raw.piles),plants=list(raw.resources);
  for(const record of animals){
    const poisoning=field(record.health,'foodPoisoning');
    if(poisonedByFodder(record.health)&&!validFoodPoisoning(poisoning,w.tick,false,version))return false;
    const meal=record.meal;if(!object(meal))continue;
    const pile=piles.find(p=>field(p,'id')===meal.id),item=field(pile,'item');
    const plant=plants.find(r=>field(r,'id')===meal.id);
    if(!fodder(item)&&field(plant,'kind')!=='haygrass')continue;
    if(!validAnimalAgeCoreRemainder256(record,version,w.tick))return false;
    const animal=record as unknown as WildAnimal,species=animalSpecies(animal.species);
    if(Object.keys(meal).some(key=>!['kind','id','quantity','progress'].includes(key))
      ||meal.kind!=='plant'&&meal.kind!=='pile'||!Number.isSafeInteger(meal.id)||Number(meal.id)<1||Number(meal.id)>=w.nextId
      ||!Number.isSafeInteger(meal.quantity)||Number(meal.quantity)<1||Number(meal.quantity)>75
      ||meal.kind==='plant'&&meal.quantity!==1||typeof meal.progress!=='number'||!Number.isFinite(meal.progress)
      ||meal.progress<0||meal.progress>=species.ingestTicks||!['moving','eating'].includes(animal.state)
      ||!Number.isSafeInteger(animal.x)||animal.x<0||animal.x>=w.width||!Number.isSafeInteger(animal.z)||animal.z<0||animal.z>=w.height
      ||!Array.isArray(animal.path)||animal.state==='moving'&&meal.progress!==0
      ||record.motion!==undefined&&(!object(record.motion)||typeof record.motion.end!=='number'||!Number.isFinite(record.motion.end)||record.motion.end<0))return false;
    if(meal.kind==='pile'&&fodder(item)&&Number(meal.quantity)>Math.max(1,Math.ceil((animal.growthTracker?animalNutritionMax(animal):species.nutrition)/(ITEM_DEFINITIONS[item as 'hay'|'kibble'].nutrition/100))))return false;
    const target=animalMealTarget(w,animal);
    if(!target||animal.state==='eating'&&(animal.path.length||Math.abs(animal.x-target.x)+Math.abs(animal.z-target.z)>1
      ||(animal.motion?.end??0)>w.tick))return false;
  }
  return true;
}

/** Prospective file/bridge frontier, before migrations or owner projections.
 * This guard never repairs a record, resolves a job, produces food or draws RNG.
 * Existing domain guards retain all general shapes, pile ownership and recipe
 * staging checks; ROOT separately invokes validKibbleProductionTransport. */
export function validFodderTransport(w:World,version:number=w?.schemaVersion):boolean {
  try {
    if(!object(w)||!Number.isSafeInteger(version)||version<1)return false;
    const raw=w as unknown as Record<string,unknown>,transport=originalTransport(raw);
    if(version<227)return !containsFutureFodder(raw,transport);
    if(!validAnimalFodder(w,raw,version))return false;
    if(records(raw.foodPolicies).some(policy=>list(policy.allowed).includes('hay')))return false;
    const hayIds=new Set(transport.piles.filter(p=>p.item==='hay').map(p=>p.id));
    const personalFodder=transport.people.some(p=>records(p.memories).some(m=>m.kind==='ate-kibble')||poisonedByFodder(p.health));
    // A crop, recipe or plain kibble pile has no human validation clock. Keep
    // the complete owner census for actual hay targets or personal records.
    if(!hayIds.size&&!personalFodder)return true;
    const owners=captureHumanOwners(w);
    for(const slot of owners.pawnOwners){
      const pawn=slot.pawn!;
      if(pawn.need?.kind==='eat'&&humanTaskTargetsHay(pawn.need,hayIds)||humanTaskTargetsHay(pawn.feed,hayIds)
        ||pawn.ward?.kind==='food'&&humanTaskTargetsHay(pawn.ward,hayIds))return false;
      let kibbleMemory=false;
      for(const memory of records(pawn.memories))if(memory.kind==='ate-kibble'){
        if(kibbleMemory||Object.keys(memory).length!==2||!Object.hasOwn(memory,'expiresAt')
          ||!Number.isSafeInteger(memory.expiresAt)||Number(memory.expiresAt)<=slot.validationTick
          ||Number(memory.expiresAt)>slot.validationTick+TICKS_PER_DAY)return false;
        kibbleMemory=true;
      }
      const poisoning=pawn.health?.foodPoisoning;
      if(fodder(poisoning?.item)&&!validFoodPoisoning(poisoning,slot.validationTick,true,version))return false;
    }
    return true;
  }catch{return false;}
}
