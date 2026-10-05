import type { Cell,Pawn } from './types.ts';

/** The refuge owns its route while the interrupted mandate remains present. */
export function bombRefugeRouteTarget(p:Pawn,target:Cell|null|undefined,version:number):Cell|null|undefined {
  return version>=193&&p.bombRefuge?p.bombRefuge.target:target;
}
