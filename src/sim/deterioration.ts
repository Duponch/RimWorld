import {captureDeteriorationEnvironment,deteriorationExposure} from './deterioration-rules.ts';
import {DETERIORATION_INTERVAL,isDeteriorationItem} from './deterioration-content.ts';
import {damagePile} from './thing-damage.ts';
import {TICKS_PER_DAY,type World} from './types.ts';
import type {ThermalLayout} from './thermal-topology.ts';
/** Called once on EVERY real local tick, on both maps. Never backfill old weather.
 * Snapshot/command adoption must not call this producer. */
export function advanceDeterioration(w:World,layout:ThermalLayout):boolean {
 if(w.schemaVersion<252)return false;
 const state=w.deterioration;if(!state)throw Error('Missing prospective deterioration calendar.');
 const elapsed=w.tick-state.lastTick;if(elapsed<0||elapsed>DETERIORATION_INTERVAL)throw Error('Deterioration interval was skipped; local engine must call every tick.');
 if(elapsed<DETERIORATION_INTERVAL)return false;state.lastTick=w.tick;
 // Snapshot initial originals only. A later destruction can release/drop other goods;
 // those are not newly visited by the same pass. Reverse indices usually remain valid.
 const candidates=[];for(let i=w.piles.length-1;i>=0;i--){const pile=w.piles[i]!;if(pile.owner.type==='ground'&&isDeteriorationItem(pile.item)&&pile.quantity>0)candidates.push({pile,index:i});}
 if(!candidates.length)return false;
 const environment=captureDeteriorationEnvironment(w,layout);let changed=false;
 for(const candidate of candidates){const pile=candidate.pile;
  const index=w.piles[candidate.index]===pile?candidate.index:w.piles.indexOf(pile);
  if(index<0||pile.owner.type!=='ground'||pile.quantity<=0)continue;
  const exposure=deteriorationExposure(w,pile,environment);if(exposure.rate<=0)continue;
  let x=state.rng;x^=x<<13;x^=x>>>17;x^=x<<5;state.rng=x>>>0;
  if(state.rng/4294967296<exposure.rate*DETERIORATION_INTERVAL/TICKS_PER_DAY)
   changed=damagePile(w,pile,1,'deterioration',index)||changed;
 }
 return changed;
}
