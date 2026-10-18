import {tempMapAdoptedAtCore261} from './temp-map-incidents-261.ts';
import {resumeProspectiveVisitorSchedule261} from './visitors.ts';
import {MISC_FIRST_CHECK,MISC_CHECK_INTERVAL,MISC_INTRO_TICK} from './cassandra-misc.ts';
import {smallCycleAt,smallNextCheck,SMALL_INTRO_TICK} from './cassandra-small.ts';
import type {World} from './types.ts';
/** Only the actual Settle commit calls this; never load/bootstrap. Existing
 * effects, counters, business RNG and actor owners are literal throughout. */
export function resumeTempMapHomeAgendas261(w:World):void {
 if((Number(w.schemaVersion)!==261&&w.schemaVersion!==262)||tempMapAdoptedAtCore261(w)===undefined)return;
 const misc=w.miscIncidents;if(misc){misc.nextCheck=Math.max(MISC_FIRST_CHECK,(Math.floor(w.tick/MISC_CHECK_INTERVAL)+1)*MISC_CHECK_INTERVAL);misc.introDone=w.tick>=MISC_INTRO_TICK;}
 const small=w.smallIncidents;if(small){small.nextCheck=smallNextCheck(w.tick);small.cycle=smallCycleAt(w.tick);small.pending=[];small.introDone=w.tick>=SMALL_INTRO_TICK;}
 resumeProspectiveVisitorSchedule261(w);
}
