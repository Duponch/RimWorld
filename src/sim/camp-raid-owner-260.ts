import type {World} from './types.ts';
import {adoptColonyEconomy} from './colony-economy.ts';
/** Birth only: never called by load, old Camp visit or pressure attempt. */
export function initializeCampRaidOwner260(w:World):void {
 if(w.schemaVersion<260)return;if(w.raids)throw Error('New Camp already owns a raid calendar');
 adoptColonyEconomy(w);
 w.raids={profile:'camp-pressure-v1',rng:((w.seed^0x7a1d068)>>>0)||1,nextCheck:null,serial:0,completed:0,departed:[],mechanoid:{adoptedAt:w.tick,rng:((w.seed^0x2135ca7)>>>0)||1,ranged:{adoptedAt:w.tick}}};
}
