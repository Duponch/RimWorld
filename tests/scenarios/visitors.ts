import { deconstructionCamp } from './deconstruction.ts';
import { advanceVisitors,enableVisitors } from '../../src/sim/visitors.ts';
import { INTRO_VISITOR_TICK } from '../../src/sim/visitor-state.ts';
import type { World } from '../../src/sim/types.ts';

/** Controlled boundary fixture, not a played fortnight. Empty physical camp,
 * healthy actor and clock prepared at the actual ClassicIntro opportunity;
 * the real producer creates the group, provisions, IDs and finite trade stock.
 * No event time, actor, inventory or resource is patched after generation. */
export function visitorTradeFixture(count=1):{world:World;traderId:number;pawnId:number} {
  const world=deconstructionCamp(count,32);
  enableVisitors(world,true);world.tick=INTRO_VISITOR_TICK;advanceVisitors(world);
  const trader=world.pawns.find(p=>p.visitor?.role==='trader');
  if(!trader)throw new Error('The reference fixture seed did not generate its expected trader.');
  return {world,traderId:trader.id,pawnId:world.pawns.find(p=>!p.visitor)!.id};
}
