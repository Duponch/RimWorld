import { offeredBackground } from '../../src/sim/background-generation.ts';
import { enableQuests } from '../../src/sim/quests.ts';
import { createScenarioWorld } from '../../src/sim/new-game.ts';
import { HUMAN_YEAR_TICKS } from '../../src/sim/human-age.ts';
import { applyCommand,stepWorld } from '../../src/sim/engine.ts';
import { validateWorld } from '../../src/sim/serialization.ts';
import { FAMILY_OFFER_TICK,prepareFamilyDemo } from '../../scripts/create-family-v214-test-save.ts';
import { refreshStock } from '../../src/sim/materials.ts';
import type { World } from '../../src/sim/types.ts';

/** Real factory and first tick; prepared policies/ages/spatial inventory isolate
 * admissions. No relationship, offer, arrival or injury is manufactured. */
function camp(seed:number,kind:'arrival'|'quest'):World {
  const w=createScenarioWorld(seed,32,kind==='quest'?'crashlanded':'survivors');
  w.resources=[];w.structures=[];w.jobs=[];w.piles=[];w.stockpiles=[];w.growingZones=[];
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));delete w.wildlife;delete w.relationships;
  for(const [i,p] of w.pawns.entries()){
    p.age={biologicalTicks:(i?50:20)*HUMAN_YEAR_TICKS,chronologicalTicks:(i?50:20)*HUMAN_YEAR_TICKS};
    if(p.health)delete p.health.ageAilments;
    p.hunger=100;p.rest=100;p.recreation.level=100;p.bedId=null;p.schedule.fill('work');
    for(const work of Object.keys(p.priorities) as (keyof typeof p.priorities)[])p.priorities[work]=0;
    Object.assign(p,{x:12+i*3,z:16});
  }
  refreshStock(w);stepWorld(w);return w;
}
/** A short prepared calendar opportunity and bounded private seeds, not a
 * frequency estimate. Each candidate executes the genuine offer producer. */
export function familyOfferWorld(kind:'arrival'|'quest') {
  const salt=kind==='arrival'?0x210a771:0x210a511;
  let seed=1;
  for(;seed<=64;seed++){
    const age=offeredBackground(seed^salt,1).age.biologicalTicks;
    if(age>36*HUMAN_YEAR_TICKS&&age<64*HUMAN_YEAR_TICKS)break;
  }
  if(seed>64)throw Error('No bounded adult-parent age for the admission fixture.');
  const base=camp(seed,kind),otherId=base.pawns[0]!.id;
  if(kind==='quest')enableQuests(base);
  const due=base.tick+1;
  if(kind==='arrival')base.arrivals!.nextCheck=due;else base.quests!.nextCheck=due;
  for(let rng=1;rng<=512;rng++){
    const w=structuredClone(base);
    if(kind==='arrival')w.arrivals!.rng=rng;else w.quests!.rng=rng;
    // The real due tick advances all private incident/clinical clocks too.
    // Calling only the offer producer would leave a stale rain lastTick.
    stepWorld(w);
    const offer=kind==='arrival'?w.arrivals!.pending:w.quests!.entries[0];
    if(offer?.relationship?.kind==='child'&&offer.relationship.otherId===otherId)
      return {world:w,otherId,preparedPrivateSeed:rng,beforeIds:base.nextId,beforeWorldRng:base.rng};
  }
  throw Error('No bounded genuine family announcement for the admission fixture.');
}

/** The public future scene's actual producer, before answering or allocating
 * the admitted person. Separate from the admission unit-test exposure above. */
export function producedFamilyOffer():World{
  const w=prepareFamilyDemo();
  while(w.tick<FAMILY_OFFER_TICK){stepWorld(w);const errors=validateWorld(w);if(errors.length)throw Error(`Family prefix ${w.tick}: ${errors.join(' | ')}`);}
  if(!w.arrivals?.pending?.relationship)throw Error('The prepared private ticket did not produce a related offer.');
  return w;
}
export function producedFamilyAdmission():World{
  const w=producedFamilyOffer(),offer=w.arrivals!.pending!;
  const result=applyCommand(w,{type:'answer-arrival',offerId:offer.id,accept:true});if(!result.ok)throw Error(result.reason);
  const errors=validateWorld(w);if(errors.length)throw Error(errors.join(' | '));return w;
}
