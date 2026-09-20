/** Immutable cost capture for one synchronous navigation decision. The terrain
 * byte array and sparse overlays are owned by the capture, never cached. */
export interface NavigationCostLookup {
  get(index:number):number|undefined;
  has(index:number):boolean;
  readonly maximum:number;
}

export const EMPTY_NAVIGATION_COSTS:NavigationCostLookup=Object.freeze({get:()=>undefined,has:()=>false,maximum:0});

/** Sparse objects can raise a terrain cost, including a present zero-cost door.
 * The dense layer is shared by total and non-repeatable floor costs. */
export function overlayNavigationCosts(terrain:Uint8Array,terrainMaximum:number,sparse:ReadonlyMap<number,number>):NavigationCostLookup {
  let maximum=terrainMaximum;for(const cost of sparse.values())maximum=Math.max(maximum,cost);
  return {
    get(index){const floor=terrain[index]||undefined,extra=sparse.get(index);return extra===undefined?floor:Math.max(extra,floor??0);},
    has:index=>!!terrain[index]||sparse.has(index),maximum,
  };
}

/** Preserve already-rounded integer search units (67 becomes 201, not 200).
 * Scaling a lookup does not copy its dense layer or sparse entries. */
export function scaleNavigationCosts(costs:NavigationCostLookup|undefined,factor:number):NavigationCostLookup|undefined {
  return costs?{get(index){const value=costs.get(index);return value===undefined?undefined:value*factor;},has:index=>costs.has(index),maximum:costs.maximum*factor}:undefined;
}
