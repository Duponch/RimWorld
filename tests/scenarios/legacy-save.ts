import { withoutHunting } from './legacy-skills';
/** Fixture construction only: pre-V178 policies never listed fox meat. This
 * does not sanitize serializer input or remove future fields in refusal tests. */
export function withoutPredatorFoodPolicies<T>(world:T):T {
  for(const policy of (world as {foodPolicies?:Array<{allowed:string[]}>}).foodPolicies??[])
    policy.allowed=policy.allowed.filter(item=>item!=='red-fox-meat');
  return world;
}
/** Historical registry expectation: preserve every prior permission and ID. */
export function withoutPredatorApparelPolicies<T>(world:T):T {
  const w=world as {apparelPolicies?:Array<{allowedItems:readonly string[];allowedMaterials:readonly string[]}>};
  if(w.apparelPolicies)w.apparelPolicies=w.apparelPolicies.map(policy=>({...policy,
    allowedItems:policy.allowedItems.filter(item=>!item.startsWith('foxfur-')),
    allowedMaterials:policy.allowedMaterials.filter(material=>material!=='foxfur')}));
  return world;
}
/** Historical fixtures omit fields that their claimed schema never stored. */
export function withoutFoodPolicies<T extends {packed?:unknown;deconstructed?: unknown; jobs?: Array<{construction?:unknown;clearance?:unknown}>; foodPolicies?: unknown; nextFoodPolicyId?: unknown; pawns: Array<{foodPolicyId?: unknown; recreation?: unknown; orders?:unknown}>}>(data: T): T {
  withoutHunting(data);
  for(const job of data.jobs??[]){delete job.construction;delete job.clearance;}
  delete data.deconstructed;delete data.packed;
  delete data.foodPolicies; delete data.nextFoodPolicyId;
  for (const pawn of data.pawns) { delete pawn.foodPolicyId; delete pawn.recreation; delete pawn.orders; }
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
