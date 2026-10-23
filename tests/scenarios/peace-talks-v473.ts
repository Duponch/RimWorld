import {preparedTradeRequestCamp462} from './trade-requests-v462.ts';
import {preparePeaceTalksBirth293} from '../../src/sim/peace-talks-producer-293.ts';
import {admitBornCaravan261} from '../../src/sim/caravan-incidents-261.ts';
import type {PeaceTalksSite293} from '../../src/sim/peace-talks-state-293.ts';
import type {World} from '../../src/sim/types.ts';

export const PEACE_CAMP_PREPARATION_473='Declared initial preparation from the acquired V462 geographic campaign and its original caravan. Its existing civil Outlander relation is prepared hostile; no new people, cargo or geography are supplied. Optional site is born through the real PeaceTalks producer; the same caravan is initially positioned there and prospectively admitted through admitBornCaravan261 for isolated resolution tests, without claiming a played formation or journey. The false branch preserves its old admission literally: native must acquire modern formation through a real command before its order. No step or post-departure repair.';
export function peaceTalksCamp473(preparedSite=true):{w:World;groupId:number;siteId?:number;factionId:number} {
 const {w,groupId,factionId}=preparedTradeRequestCamp462(),factions=w.worldFactions!;
 const relation=factions.relations.find(r=>r.aId===Math.min(factionId,factions.playerFactionId)&&r.bId===Math.max(factionId,factions.playerFactionId))!;
 relation.goodwill=-80;relation.kind='hostile';w.worldSites263??={revision:1,nextId:1,entries:[]};
 if(!preparedSite)return {w,groupId,factionId};
 const born=preparePeaceTalksBirth293(w);if(!born.ok)throw Error('PeaceTalks fixture birth refused: '+born.reason);born.commit();
 const site=born.site as PeaceTalksSite293,record=w.worldGroups!.groups.find(r=>r.state.id===groupId)!,g=record.state;if(!('members'in g))throw Error('Original caravan absent');
 admitBornCaravan261(w,record);
 g.tile=g.destination=site.tile;g.phase='at-site';g.segment=null;g.route=[site.tile];g.stop={kind:'at-site'};g.paused=false;g.lastPersonalTick=w.tick;delete record.arrival261;
 return {w,groupId,siteId:site.id,factionId:site.factionId};
}
