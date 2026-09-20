import { isColonist } from './affiliation.ts';
import { ITEM_DEFINITIONS, type ItemId } from './items.ts';
import type { CommandResult, Pawn, World } from './types.ts';

export type FoodItemId = {[K in ItemId]: typeof ITEM_DEFINITIONS[K]['nutrition'] extends 0 ? never : K}[ItemId];
export const FOOD_ITEMS = Object.keys(ITEM_DEFINITIONS).filter(id => ITEM_DEFINITIONS[id as ItemId].nutrition > 0) as FoodItemId[];
export const MAX_FOOD_POLICIES = 32;
export interface FoodPolicy {id: number; name: string; allowed: FoodItemId[]}
export type FoodPolicyCommand =
  | {type: 'food-policy-create'; name: string; copyFromId?: number}
  | {type: 'food-policy-update'; policyId: number; name: string; allowed: FoodItemId[]}
  | {type: 'food-policy-delete'; policyId: number}
  | {type: 'food-policy-assign'; pawnId: number; policyId: number};

export function initialFoodPolicies(includeMeat=true,includeFoodCrops=true): FoodPolicy[] {
  const items=FOOD_ITEMS.filter(id=>(includeMeat||id!=='hare-meat')&&(includeFoodCrops||id!=='potato'&&id!=='corn'));
  return [
    {id: 1, name: 'Sans restriction', allowed: [...items]},
    {id: 2, name: 'Repas uniquement', allowed: ['simple-meal', 'survival-meal', 'legacy-portion']},
    {id: 3, name: 'Sans rations', allowed: items.filter(id => id !== 'survival-meal')},
    {id: 4, name: 'Rien', allowed: []},
  ];
}
export const validPolicyName = (name: unknown): name is string => typeof name === 'string' && name.trim().length > 0 && name.length <= 60;
export const validAllowedFood = (v: unknown): v is FoodItemId[] => Array.isArray(v) && v.length <= FOOD_ITEMS.length
  && Array.from(v).every(id => FOOD_ITEMS.includes(id)) && new Set(v).size === v.length;
export function foodAllowed(world: World, pawn: Pawn, item: ItemId): boolean {
  return allowedFood(world, pawn).includes(item as FoodItemId);
}
export const allowedFood = (world: World, pawn: Pawn): readonly FoodItemId[] => pawn.mental?.crisis ? FOOD_ITEMS : world.foodPolicies.find(policy => policy.id === pawn.foodPolicyId)?.allowed ?? [];

/** Policy IDs have their own namespace: migrations never renumber entities. */
export function applyFoodPolicyCommand(world: World, command: FoodPolicyCommand): CommandResult {
  const invalid = (reason: string): CommandResult => ({ok: false, code: 'invalid-command', reason});
  if (command.type === 'food-policy-create') {
    const source = command.copyFromId === undefined ? undefined : world.foodPolicies.find(p => p.id === command.copyFromId);
    if (!validPolicyName(command.name) || (command.copyFromId !== undefined && !source)) return invalid('Nom ou régime à copier invalide.');
    if (world.foodPolicies.length >= MAX_FOOD_POLICIES || !Number.isSafeInteger(world.nextFoodPolicyId + 1)) return invalid('Limite de régimes atteinte.');
    world.foodPolicies.push({id: world.nextFoodPolicyId++, name: command.name.trim(), allowed: [...(source?.allowed ?? FOOD_ITEMS)]});
    return {ok: true};
  }
  const policy = world.foodPolicies.find(p => p.id === command.policyId);
  if (!policy) return invalid('Régime introuvable.');
  if (command.type === 'food-policy-update') {
    if (!validPolicyName(command.name) || !validAllowedFood(command.allowed)) return invalid('Nom ou liste des aliments invalide.');
    policy.name = command.name.trim(); policy.allowed = FOOD_ITEMS.filter(id => command.allowed.includes(id));
    for (const pawn of world.pawns) if (pawn.foodPolicyId === policy.id) pawn.needCooldown = 0;
  } else if (command.type === 'food-policy-assign') {
    const pawn = world.pawns.find(p => p.id === command.pawnId);
    if (!pawn) return invalid('Colon introuvable.');
    pawn.foodPolicyId = policy.id; pawn.needCooldown = 0;
  } else {
    if (world.pawns.some(p => isColonist(p)&&p.foodPolicyId === policy.id)) return invalid('Ce régime est utilisé : réaffectez ses colons avant de le supprimer.');
    if (world.foodPolicies.length === 1) return invalid('Conservez au moins un régime.');
    world.foodPolicies.splice(world.foodPolicies.indexOf(policy), 1);
    for(const p of world.pawns)if(!isColonist(p)&&p.foodPolicyId===policy.id)p.foodPolicyId=world.foodPolicies[0]!.id;
  }
  // An accepted meal remains committed. Filtering applies at the next food choice,
  // independently of hauling, ingredient permissions and preservation.
  return {ok: true};
}
