import {isColonist} from './affiliation.ts';
import type {Pawn} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';
/** Shared active/remote alert predicates. Knowledge only: no work, damage or clock. */
export const alertManhunter=(a:Pick<WildAnimal,'manhunter'|'state'>):boolean=>!!a.manhunter&&a.state!=='dead'&&a.state!=='downed';
export const alertDownedColonist=(p:Pick<Pawn,'faction'|'state'>):boolean=>isColonist(p)&&p.state==='downed';
