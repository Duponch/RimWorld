import { emptyLandscape } from './generation.ts';
import type { ValidatePodRescueDeparture } from './pod-rescue-save.ts';
import type { World } from './types.ts';

/** A frozen departure has its own clock and no map authority. Reuse the
 * complete human/item validator without replaying generation, needs or RNG.
 * This lazy view exists only during save validation, never in gameplay. */
export function createPodDepartureValidator(validate:(world:unknown)=>string[]):ValidatePodRescueDeparture {
  let base:World|undefined;
  return (departure,version,world)=>{
    const p=departure.pawn;
    if(Object.hasOwn(p,'bombRefuge'))return ['Archived pod rescue retains an active bomb refuge.'];
    if(!Number.isSafeInteger(p.foodPolicyId)||p.foodPolicyId<1||p.foodPolicyId>=world.nextFoodPolicyId)
      return ['Invalid historical pod rescue food policy identity.'];
    // Civilians cannot acquire packed furniture through the delivered loop.
    if(departure.packed?.length)return ['Civilian pod rescue cannot export packed furniture.'];
    base??=emptyLandscape(world.seed,world.width,world.height);
    if(!base.tiles.length)base.tiles=Array.from({length:world.width*world.height},()=>({terrain:'grass'}));
    const pawn={...p};delete pawn.podRescue;
    // V208 deliberately preserves frozen archives. Like visitor validation,
    // an archive may omit this later family. Materialize its neutral defaults
    // only in this temporary view; malformed or future partial keys still go
    // through the strict validator, and the historical record is untouched.
    if(version>=190&&pawn.recreation&&pawn.recreation.tolerance&&pawn.recreation.bored
      &&!Object.hasOwn(pawn.recreation.tolerance,'television')&&!Object.hasOwn(pawn.recreation.bored,'television'))
      pawn.recreation={...pawn.recreation,tolerance:{...pawn.recreation.tolerance,television:0},bored:{...pawn.recreation.bored,television:false}};
    const view:World={...base,schemaVersion:version as World['schemaVersion'],tick:departure.tick,nextId:world.nextId,
      pawns:[pawn],piles:departure.items,packed:[],nextFoodPolicyId:world.nextFoodPolicyId,
      // A deleted historical policy need not become a live colony policy.
      // No food intention survives export; only its allocated ID is checked.
      foodPolicies:[{id:p.foodPolicyId,name:'Régime archivé',allowed:[]}]};
    return validate(view).map(error=>`Invalid frozen pod rescue person/items: ${error}`);
  };
}
