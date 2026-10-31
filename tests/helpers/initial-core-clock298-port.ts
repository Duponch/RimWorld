import {newCorePathBudget297} from '../../src/sim/core-path-budget-297';
import type {World} from '../../src/sim/types';

/** Declared fixture initialization only, before commands, ticking or ownership capture.
 * Never use this on a saved/live World or to reset credits after playing phase1..9. */
function assertUnplayedFixture(w:World):void {
 const b=w.corePathBudget297;
 if(Number(w.schemaVersion)!==298||w.tick!==0||w.phaseCore297!==0||!b||b.tick!==0||b.remaining!==8||b.pairs!==32768)
  throw Error('Expected an unplayed phase-zero fixture with untouched owned budget');
 if(w.pawns.some(p=>p.motion!==undefined||p.draft!==undefined||p.shooting!==undefined||p.melee!==undefined))
  throw Error('A commanded or captured actor is not an initial fixture');
}
/** Existing fixtures deliberately begin at civil3000; initialize their new local
 * owner at the same instant. No clock catch-up, played time, RNG or clinical repair. */
export function initializeDeclaredFixtureTick298(w:World,tick:number):void {
 assertUnplayedFixture(w);
 if(!Number.isSafeInteger(tick)||tick<0)throw Error('Invalid declared initial tick');
 w.tick=tick;w.corePathBudget297=newCorePathBudget297(tick);
}
