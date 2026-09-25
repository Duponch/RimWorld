import {isArtRecipe,artWorkTotal,isArtMaterial} from './art-rules.ts';
import {furnitureSlot} from './furniture-haul-rules.ts';
import { V91_ITEM_IDS } from './biome-items.ts';
import { isGunRecipe, isTailoring, unfinishedItem, stationAccepts, PRODUCTION_RECIPES, productionWorkTotal, legacyProductionTicks, stationRecipe, taskRecipe, taskWork, isRecipeProduct, blockFor, type ProductionIngredient, type StoneIngredient } from './production-recipes.ts';
import { validGunIngredients } from './machining.ts';
import { fuelStationReserved } from './fuel.ts';
import { cookingSpot, ingredientPlaceFree, ingredientWithinReach, validBillSettings } from './cooking-bills.ts';
import { groundCapacity, storageCapacity } from './ground-placement.ts';
import { reservedSource } from './materials.ts';
import type { World } from './types.ts';

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
/** Called after the base schema's structures/pawns/piles are shape-checked. */
export function validateCooking(input:unknown,version:number,ids:Set<number>):string[] {
  const w=input as World,errors:string[]=[];
  const cell=(v:unknown)=>record(v)&&int(v.x,0,w.width-1)&&int(v.z,0,w.height-1);
  for(const s of [...w.structures,...(version>=32?w.packed.map(p=>p.building):[])]) {
    const recipe=stationRecipe(s);
    if(!recipe||version<32&&recipe==='stone-blocks'||version<72&&recipe==='tribalwear'||version<79&&recipe==='butcher-creature'||version<101&&s.kind==='machining-table'||version<104&&s.kind==='art-bench') {if(s.bills!==undefined)errors.push('Bills attached to a non-workstation.');continue;}
    if(!Array.isArray(s.bills)||s.bills.length>64){errors.push('Invalid workstation bills.');continue;}
    for(const b of s.bills) {
      if(!record(b)||!int(b.id,1,w.nextId-1)||!stationAccepts(s,b.recipe)||version<101&&isGunRecipe(b.recipe)||version<104&&isArtRecipe(b.recipe)||!validBillSettings(b,b.recipe)||version<91&&Object.keys(b.filters??{}).some(i=>V91_ITEM_IDS.includes(i))||version<79&&b.filters&&Object.hasOwn(b.filters,'hare-meat')||version<84&&b.filters&&['potato','corn'].some(i=>Object.hasOwn(b.filters,i)))errors.push('Invalid cooking bill.');
      else {if(ids.has(b.id))errors.push('Duplicate bill identity.');ids.add(b.id);}
    }
  }
  for(const p of w.pawns) {
    if(version<32?p.priorities.craft!==undefined:!int(p.priorities.craft,0,4))errors.push('Invalid or future craft priority.');
    if(version<10) {if(p.cooking!==undefined||p.priorities.cook!==undefined)errors.push('Legacy save contains cooking fields.');continue;}
    if(!int(p.priorities.cook,0,4))errors.push('Invalid cooking priority.');
    if(p.cooking===null)continue;
    const c=p.cooking;
    if(!record(c)||c.recipe!==undefined&&(!((version>=32&&c.recipe==='stone-blocks')||(version>=72&&c.recipe==='tribalwear')||(version>=73&&c.recipe==='shirt')||(version>=79&&c.recipe==='butcher-creature')||(version>=90&&['pants','duster','parka'].includes(String(c.recipe)))||(version>=101&&isGunRecipe(c.recipe))||(version>=104&&isArtRecipe(c.recipe))))){errors.push('Invalid or future production recipe.');continue;}
    const recipe=PRODUCTION_RECIPES[taskRecipe(c)];
    if(c.workTicks!==undefined&&(version<79||taskWork(c)!=='cook'||c.phase!=='work'||!int(c.workTicks,1,Math.floor(Number.MAX_SAFE_INTEGER/1000))))errors.push('Invalid cooking work duration.');
    if(c.storageQuantity!==undefined&&(version<32||c.recipe!=='stone-blocks'&&c.recipe!=='butcher-creature'||c.phase!=='output'||c.storageId===null||!int(c.storageQuantity,1,recipe.outputUnits)))errors.push('Invalid production output quantity.');
    if(!record(c)||!int(c.stationId,1)||!int(c.billId,1)||!cell(c.spot)||!cell(c.actionCell)||!['gather','work','output',...(version>=11?['interrupted']:[])].includes(c.phase as string)
      ||!int(c.progress,0,version>=36?(isArtRecipe(c.recipe)?artWorkTotal(c.recipe,'granite-blocks'):productionWorkTotal(taskRecipe(c))):legacyProductionTicks(taskRecipe(c)))||!(c.productId===null||int(c.productId,1,w.nextId-1))||!(c.storageId===null||int(c.storageId,1,w.nextId-1))
      ||!Array.isArray(c.ingredients)||c.ingredients.length>recipe.units) {errors.push('Invalid cooking task.');continue;}
    for(const i of c.ingredients)if(!record(i)||!int(i.pileId,1,w.nextId-1)||!int(i.quantity,1,recipe.units)||!(recipe.inputs.includes(i.item as ProductionIngredient)&&(version>=91||!V91_ITEM_IDS.includes(String(i.item)))&&(version>=79||i.item!=='hare-meat'&&i.item!=='hare-corpse')&&(version>=84||i.item!=='potato'&&i.item!=='corn')||isTailoring(c.recipe)&&i.item===unfinishedItem(c.recipe)&&i.quantity===1||version>=101&&isGunRecipe(c.recipe)&&i.item==='unfinished-gun'&&i.quantity===1||version>=104&&isArtRecipe(c.recipe)&&i.item==='unfinished-sculpture'&&i.quantity===1)||!['source','held','placed'].includes(i.stage as string)||!cell(i.cell))errors.push('Invalid recipe ingredient reservation.');
  }
  if(errors.length||version<10)return errors;
  const stations=new Set<number>(),spots=new Set<number>();
  for(const p of w.pawns)if(p.cooking) {
    const c=p.cooking,station=w.structures.find(s=>s.id===c.stationId&&stationAccepts(s,taskRecipe(c))),bill=station?.bills?.find(b=>b.id===c.billId);
    if(!station||!bill||bill.recipe!==taskRecipe(c)||bill.suspended||p.priorities[taskWork(c)]===0&&!(version>=20&&p.orders.active==='cook')||p.jobId!==null||p.haul!==null||p.need!==null){errors.push('Invalid cooking task ownership.');continue;}
    const recipe=PRODUCTION_RECIPES[taskRecipe(c)],spot=cookingSpot(station),key=c.spot.z*w.width+c.spot.x;
    if(spot.x!==c.spot.x||spot.z!==c.spot.z||stations.has(station.id)||spots.has(key))errors.push('Invalid or duplicate cooking work spot.');
    stations.add(station.id);spots.add(key);
    if(version>=19&&fuelStationReserved(w,station.id,p.id))errors.push('Conflicting queued workstation reservation.');
    if(w.pawns.some(o=>o.id!==p.id&&(o.haul?.destination.type==='fuel'&&o.haul.destination.structureId===station.id||o.need?.kind==='eat'&&o.need.dining?.target.x===spot.x&&o.need.dining?.target.z===spot.z||o.need?.kind==='sleep'&&(version<14||o.need.bedId!==null)&&o.need.target.x===spot.x&&o.need.target.z===spot.z)))errors.push('Conflicting workstation reservation.');
    const unfinishedApparel=isTailoring(c.recipe)&&c.ingredients.length===1&&c.ingredients[0]!.item===unfinishedItem(c.recipe);
    const unfinishedGun=isGunRecipe(c.recipe)&&c.ingredients.length===1&&c.ingredients[0]!.item==='unfinished-gun';
    const unfinishedArt=isArtRecipe(c.recipe)&&c.ingredients.length===1&&c.ingredients[0]!.item==='unfinished-sculpture';
    const unfinished=unfinishedApparel||unfinishedGun||unfinishedArt;
    const owned=w.piles.filter(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id);
    if(c.phase==='output'&&isArtRecipe(c.recipe)) {
      const carried=w.packed.filter(q=>q.owner.type==='pawn'&&q.owner.pawnId===p.id),product=carried[0];
      if(c.ingredients.length||c.progress!==0||owned.length||carried.length!==1||product?.building.id!==c.productId||product.building.kind!==c.recipe||product.building.art?.authorId!==p.id)errors.push('Invalid sculpture product ownership.');
      if(c.storageId!==null){const zone=w.stockpiles.find(z=>z.id===c.storageId);if(!zone||!zone.filters.furniture||!furnitureSlot(w,zone,p.id))errors.push('Invalid sculpture output reservation.');}
    } else if(c.phase==='output') {
      if(c.ingredients.length||c.progress!==0||owned.length!==1||owned[0]?.id!==c.productId||!isRecipeProduct(taskRecipe(c),owned[0]!.item)||!int(owned[0]?.quantity,1,version>=91&&c.recipe==='butcher-creature'?75:recipe.outputUnits)||c.recipe==='stone-blocks'&&!recipe.inputs.some(i=>bill.filters[i]&&blockFor(i as StoneIngredient)===owned[0]!.item))errors.push('Invalid cooked product ownership.');
      if(c.storageId!==null){const storage=w.stockpiles.find(s=>s.id===c.storageId),product=owned[0],quantity=c.storageQuantity??1;if(!product||(c.recipe==='stone-blocks'||c.recipe==='butcher-creature')&&c.storageQuantity===undefined||quantity>(product?.quantity??0)||!storage||storageCapacity(w,storage,product.item,p.id)<quantity)errors.push('Invalid cooking output reservation.');}
    } else {
      if(c.productId!==null||c.storageId!==null||(c.phase==='gather'||c.phase==='interrupted')&&c.progress!==0
        ||(c.phase==='interrupted'?c.ingredients.length!==1||c.ingredients[0]?.stage!=='held':c.ingredients.reduce((n,i)=>n+i.quantity,0)!==(unfinished?1:recipe.units))
        ||isGunRecipe(c.recipe)&&c.phase!=='interrupted'&&!unfinished&&!validGunIngredients(c.recipe,c.ingredients))errors.push('Invalid recipe quantity or phase.');
      if(isArtRecipe(c.recipe)&&!unfinished&&c.phase!=='interrupted'&&(new Set(c.ingredients.map(i=>i.item)).size!==1||!isArtMaterial(c.ingredients[0]?.item)))errors.push('Sculpture requires homogeneous material.');
      const held=c.ingredients.filter(i=>i.stage==='held');
      if(held.length>1||owned.length!==held.length||held.length&&owned[0]?.id!==held[0]?.pileId)errors.push('Invalid ingredient cargo.');
      const incoming=new Map<number,{item:ProductionIngredient;quantity:number}>();
      for(const i of c.ingredients) {
        const pile=w.piles.find(q=>q.id===i.pileId);
        if((!unfinished&&!bill.filters[i.item])||!pile||pile.item!==i.item||pile.quantity<i.quantity){errors.push('Missing recipe ingredient.');continue;}
        if(unfinishedApparel&&(!pile.unfinished||pile.unfinished.recipe!==c.recipe||pile.unfinished.authorId!==p.id||pile.unfinished.billId!==undefined&&pile.unfinished.billId!==c.billId||c.phase==='work'&&pile.unfinished.progress!==c.progress))errors.push('Invalid unfinished work ownership or progress.');
        if(unfinishedArt&&(!pile.artWork||pile.artWork.recipe!==c.recipe||pile.artWork.authorId!==p.id||pile.artWork.billId!==undefined&&pile.artWork.billId!==c.billId||pile.artWork.billId===undefined&&!bill.filters[pile.artWork.material]||c.phase==='work'&&pile.artWork.progress!==c.progress))errors.push('Invalid unfinished sculpture ownership or progress.');
        if(unfinishedGun&&(!pile.gunWork||pile.gunWork.recipe!==c.recipe||pile.gunWork.authorId!==p.id||pile.gunWork.billId!==undefined&&pile.gunWork.billId!==c.billId||pile.gunWork.billId===undefined&&!pile.gunWork.parts.every(part=>bill.filters[part.item])||c.phase==='work'&&pile.gunWork.progress!==c.progress))errors.push('Invalid unfinished gun ownership or progress.');
        if(i.stage==='held') {if(pile.owner.type!=='pawn'||pile.owner.pawnId!==p.id||pile.quantity!==i.quantity)errors.push('Wrong ingredient carrier.');}
        else {
          if(pile.owner.type!=='ground'||reservedSource(w,pile.id)>pile.quantity)errors.push('Invalid ground ingredient reservation.');
          if(i.stage==='placed'&&pile.owner.type==='ground'&&(pile.owner.x!==i.cell.x||pile.owner.z!==i.cell.z))errors.push('Ingredient not placed at workstation.');
        }
        if(!ingredientWithinReach(i.cell,spot,station)||c.recipe!==undefined&&c.phase!=='interrupted'&&!ingredientPlaceFree(w,i.cell,spot,taskRecipe(c),station))errors.push('Ingredient staging beyond work reach.');
        if(i.stage!=='placed'&&c.phase!=='interrupted') {
          const key=i.cell.z*w.width+i.cell.x,prior=incoming.get(key);
          if(prior&&prior.item!==i.item)errors.push('Mixed ingredient staging reservation.');
          const quantity=(prior?.quantity??0)+i.quantity;incoming.set(key,{item:i.item,quantity});
          if(groundCapacity(w,i.cell,i.item,p.id)<quantity)errors.push('Invalid ingredient staging capacity.');
        }
      }
      if(c.phase==='work'&&(c.ingredients.some(i=>i.stage!=='placed')||p.x!==spot.x||p.z!==spot.z||p.path.length||p.state!=='working'))errors.push('Cooking before gathering or away from workstation.');
    }
  }
  return errors;
}
