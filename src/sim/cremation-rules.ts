import {medicalCivilTick271} from './suspended-human-clock-271.ts';
import { CREMATION_FILTER_KEYS,CREMATION_INPUTS,isCremationRecipe } from './cremation-content.ts';
import { validCorpseRot,validCorpseShape } from './corpse-save.ts';
import { validCorpseConsumption } from './corpse-anatomy.ts';
import { corpseStage } from './corpses.ts';
import { isColonist } from './affiliation.ts';
import { validateMedicalRecord } from './injury-validation.ts';
import { biofuelProductionSpeed } from './machining.ts';
import type { CookingBill,CremationFilter } from './cooking-types.ts';
import type { MaterialPile,Pawn,World } from './types.ts';
export { CREMATION_INPUTS,CREMATION_WORK_TICKS,isCremationRecipe,type CremationRecipe,type CremationFilter } from './cremation-content.ts';

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const corpseItem=(item:unknown):item is typeof CREMATION_INPUTS[number]=>typeof item==='string'&&(CREMATION_INPUTS as readonly string[]).includes(item);
export function validCremationFilter(value:unknown):value is CremationFilter {
  return record(value)&&Reflect.ownKeys(value).every(k=>typeof k==='string'&&(CREMATION_FILTER_KEYS as readonly string[]).includes(k))
    &&CREMATION_FILTER_KEYS.every(k=>Object.hasOwn(value,k)&&typeof value[k]==='boolean');
}
export function validCremationIngredients(parts:readonly {item:unknown;quantity:number}[]):boolean {
  return parts.length===1&&parts[0]!.quantity===1&&corpseItem(parts[0]!.item);
}
/** Ownership and reservations belong to the caller. Buried bodies are never inputs. */
export function cremationIngredientAllowed(world:World,bill:CookingBill,pile:MaterialPile):boolean {
  if(!isCremationRecipe(bill.recipe)||!validCremationFilter(bill.cremationFilter)||!corpseItem(pile.item)
    ||pile.kind!=='corpse'||pile.quantity!==1||pile.owner.type==='grave'||bill.filters[pile.item]!==true)return false;
  const filter=bill.cremationFilter;
  if(pile.item==='human-corpse'){
    const c=pile.humanCorpse;
    if(!record(c)||!Object.hasOwn(c,'pawnId')||pile.corpse!==undefined||Object.keys(c).some(k=>!['pawnId','nextBileTick'].includes(k))
      ||!Number.isSafeInteger(c.pawnId)||Number(c.pawnId)<1||c.nextBileTick!==undefined&&(!Number.isSafeInteger(c.nextBileTick)||Number(c.nextBileTick)<0||Number(c.nextBileTick)>world.tick+6000))return false;
    const person=world.pawns.find(p=>p.id===c.pawnId),body=person?.body;
    if(!person||person.state!=='dead'||!person.health?.death||!body||body.pileId!==pile.id||body.lostAt!==undefined
      ||!Number.isSafeInteger(body.observedAt)||body.observedAt<person.health.death.tick||medicalCivilTick271(person.health)>world.tick
      ||validateMedicalRecord(person.health,true,true,true,true,false,false,true,true,true,true,true,world.schemaVersion,world.schemaVersion>=127)!==null
      ||!validCorpseRot(pile.rot,world.tick,body.observedAt,world.schemaVersion,person.health)||!filter[isColonist(person)?'colonists':'strangers'])return false;
  }else{
    // The existing animal metadata validator is independent of the carrier.
    if(pile.humanCorpse!==undefined||!validCorpseShape({...pile,owner:{type:'ground'}},world.schemaVersion))return false;
    const c=pile.corpse!;
    if(c.health.tick>world.tick||!validCorpseRot(pile.rot,world.tick,c.health.death!.tick,world.schemaVersion,c.health)
      ||!validCorpseConsumption(c,world.tick)||world.wildlife?.animals.some(a=>a.id===c.animalId))return false;
  }
  return filter[corpseStage(pile,world.tick)];
}
/** Same Core GeneralLaborSpeed as refining; no skill, learning or extra multiplier. */
export const cremationSpeed=(pawn:Pawn):number=>biofuelProductionSpeed(pawn);
