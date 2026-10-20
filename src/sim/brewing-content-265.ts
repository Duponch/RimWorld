import {pawnBody} from './health-rules.ts';
import {cookingSkill} from './cooking-statistics.ts';
import type {Pawn} from './types.ts';

/** Resolved Core DrugCookingSpeed, independent of the meal CookingSpeed curve.
 * Station/light/temperature still belong to the existing work environment. */
export function brewingSpeed265(pawn:Pawn):number {
  const c=pawnBody(pawn).capacities;
  return Math.max(.1,(.4+.06*cookingSkill(pawn).level)*c.manipulation*(.7+.3*Math.min(1,c.sight)));
}
export function validWortIngredients265(parts:readonly {item:string;quantity:number}[]):boolean {
  return parts.length>0&&parts.every(p=>p.item==='hops'&&Number.isSafeInteger(p.quantity)&&p.quantity>0)&&parts.reduce((n,p)=>n+p.quantity,0)===25;
}
