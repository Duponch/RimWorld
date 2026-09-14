import { initialFoodPolicies, MAX_FOOD_POLICIES, validAllowedFood, validPolicyName } from './food-policy.ts';
import type { World } from './types.ts';

export function validateFoodPolicies(world: World, version: number): string[] {
  if (version < 13) return world.foodPolicies !== undefined || world.nextFoodPolicyId !== undefined || world.pawns.some(p => p.foodPolicyId !== undefined)
    ? ['Legacy save contains food policy fields.'] : [];
  const errors: string[] = [],ids=new Set<number>();
  if (!Number.isSafeInteger(world.nextFoodPolicyId) || world.nextFoodPolicyId < 2) errors.push('Invalid next food policy ID.');
  if (!Array.isArray(world.foodPolicies) || world.foodPolicies.length < 1 || world.foodPolicies.length > MAX_FOOD_POLICIES) return [...errors, 'Invalid food policies.'];
  for (const p of world.foodPolicies) {
    if (!p || typeof p !== 'object' || !Number.isSafeInteger(p.id) || p.id < 1 || p.id >= world.nextFoodPolicyId || ids.has(p.id)
      || !validPolicyName(p.name) || !validAllowedFood(p.allowed)) {errors.push('Invalid food policy.');continue;}
    ids.add(p.id);
  }
  if (world.pawns.some(p => !ids.has(p.foodPolicyId))) errors.push('Pawn food policy missing.');
  return errors;
}
export function initializeFoodPolicies(world: World): void {
  (world as unknown as {schemaVersion:number}).schemaVersion = 13; world.foodPolicies = initialFoodPolicies(); world.nextFoodPolicyId = 5;
  for (const pawn of world.pawns) pawn.foodPolicyId = 1;
  // Preserve all existing jobs, piles, routes, need/food profiles and entity IDs.
}
