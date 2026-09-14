/** Historical fixtures omit fields that their claimed schema never stored. */
export function withoutFoodPolicies<T extends {foodPolicies?: unknown; nextFoodPolicyId?: unknown; pawns: Array<{foodPolicyId?: unknown}>}>(data: T): T {
  delete data.foodPolicies; delete data.nextFoodPolicyId;
  for (const pawn of data.pawns) delete pawn.foodPolicyId;
  return data;
}
export function withoutPostV11Fields<T extends {restRules?: unknown; pawns: Array<{foodPolicyId?: unknown; schedule?: unknown; restZeroTicks?: unknown; collapsePending?: unknown}>}>(data: T): T {
  withoutFoodPolicies(data);
  delete data.restRules;
  for (const pawn of data.pawns) { delete pawn.schedule; delete pawn.restZeroTicks; delete pawn.collapsePending; }
  return data;
}
export function withoutPostV10Fields<T extends {spoiled?: unknown; piles: Array<{rot?: unknown}>; pawns: Array<{schedule?: unknown; restZeroTicks?: unknown; collapsePending?: unknown}>}>(data: T): T {
  withoutPostV11Fields(data); delete data.spoiled;
  for (const pile of data.piles) delete pile.rot;
  return data;
}
