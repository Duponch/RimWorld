import type { GroupState } from './group-state.ts';
import type { Pawn } from './types.ts';
import type { FoodPolicy } from './food-policy.ts';
import { allowedFoodFromPolicies } from './food-policy.ts';
import { ITEM_DEFINITIONS,adultHungerFactor,mealQuantity } from './items.ts';
import { commercialItemMassGrams } from './commercial-mass.ts';
import { ingestionFoodPoison,exposeFoodPoisoning } from './food-poisoning.ts';
import { createMedicalRecord,medicalStatus } from './injury-state.ts';
import { rememberIngestionAt } from './wellbeing.ts';
import type { ConsumedGroupMass } from './group-care.ts';
type ActiveGroup=Extract<GroupState,{members:unknown}>;
export interface GroupIngestionContext {
  tick:number;schemaVersion:number;foodPolicies:readonly FoodPolicy[];foodPoisonFactor:number;
  random():number;notice(person:Pawn,message:string):void;
}
/** Initial inventory catalog is deliberately bounded to the survival-meal
 * already delivered by formation/V193. All living carriers share their food. */
export function advanceGroupIngestion(group:ActiveGroup,c:GroupIngestionContext):ConsumedGroupMass {
  if(group.lastPersonalTick!==c.tick)throw Error('Ingestion precedes personal frontier');
  const removed:ConsumedGroupMass['removed']=[];
  for(const person of group.members){
    if(person.state==='dead'||person.health?.death||adultHungerFactor(person.hunger)>=1)continue;
    if(!allowedFoodFromPolicies(c.foodPolicies,person).includes('survival-meal'))continue;
    const pile=group.items.find(p=>{const sourceOwner=p.owner;return p.item==='survival-meal'&&sourceOwner.type==='inventory'&&group.members.some(owner=>owner.id===sourceOwner.pawnId&&owner.state!=='dead');});
    if(!pile)continue;
    const owner=pile.owner,index=group.items.indexOf(pile),mass=commercialItemMassGrams(pile.item);
    if(owner.type!=='inventory'||index<0||mass===undefined||!Number.isSafeInteger(pile.quantity)||pile.quantity<1)throw Error('Invalid group food ownership');
    const quantity=mealQuantity(person,pile,pile.quantity),consumed=group.ledger.foodConsumed+quantity;
    if(quantity!==1||!Number.isSafeInteger(consumed)||consumed<0)throw Error('Invalid food consumption counter');
    const cause=c.schemaVersion>=89?ingestionFoodPoison(pile,true,c.foodPoisonFactor,c.random):undefined;
    if(pile.quantity===quantity)group.items.splice(index,1);else pile.quantity-=quantity;
    person.hunger=Math.min(100,person.hunger+ITEM_DEFINITIONS[pile.item].nutrition*quantity);
    // No dining-room observation or missing-table thought without that job.
    rememberIngestionAt(person,c.tick,{raw:false,food:pile.item});
    group.ledger.foodConsumed=consumed;
    removed.push({pawnId:owner.pawnId,grams:mass*quantity});
    if(cause){
      person.health??=createMedicalRecord(c.tick);
      person.health.foodPoisoning=exposeFoodPoisoning(person.health.foodPoisoning,cause,pile.item,c.tick);
      const status=medicalStatus(person.health);if(status!=='mobile')person.state=status;
      c.notice(person,`${person.name} souffre d’une intoxication alimentaire.`);
    }
    if(!group.items.some(p=>p.item==='survival-meal'))c.notice(person,'Le groupe a consommé sa dernière ration.');
  }
  const massRemovedGrams=removed.reduce((sum,r)=>sum+r.grams,0);
  if(!Number.isSafeInteger(massRemovedGrams))throw Error('Food mass overflow');
  return {massRemovedGrams,removed};
}
