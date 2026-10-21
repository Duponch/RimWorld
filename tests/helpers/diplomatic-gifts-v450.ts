import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,validateWorld} from '../../src/sim/serialization.ts';
import {withWorldGroup} from '../../src/sim/world-map-context.ts';
import {arriveGeographicGroupPost256} from '../../src/sim/group-geographic-post-256.ts';
import {withGroupExchange} from '../../src/sim/group-reorganization-balance.ts';
import type {MaterialPile,World} from '../../src/sim/types.ts';

export const GIFT_CAMP_SOURCE274='tmp/test-runs/caravan-owners-v414-departure-expiry01-2026-10-17T19-08-08.417Z-26072/artifacts/caravan-owners-v259/actual259-paused2905-before-abandon-refusal.json';
export const GIFT_CAMP_SOURCE_SHA274='5ff387667bb3933d4b3957c65dd9516c4c3470e13d3c888b2a917878f9778525';
export const GIFT_CAMP_PREPARATION274='Acquired geographic campaign259/tick2905. DECLARED preparation: the existing caravan5 is placed at an existing nonhostile OutlanderCivil settlement; its old travel edge is cleared and destination/route/stop set to that actual tile.60cloth and40muffalo-wool are supplied to the same original Léonie inventory, recorded as declared received quantities. Original people, patient injuries, animals, carried goods, faction goodwill and map histories are preserved. The finite post stock is created by the real arrival producer. No natural journey, production, capture or diplomatic success is claimed by this preparation.';

/** No Vitest/browser dependency and no tick is played. A declared control
 * state reuses the acquired actual geography and exclusive original owners. */
export function preparedGiftCamp274():{w:World;groupId:number;clothId:number;woolId:number;factionId:number;postId:number;settlementId:number} {
 const raw=readFileSync(GIFT_CAMP_SOURCE274,'utf8');if(createHash('sha256').update(raw).digest('hex')!==GIFT_CAMP_SOURCE_SHA274)throw Error('Acquired gift preparation source changed');
 const campaign=deserializeCampaign(raw);if(!('pawns'in campaign))throw Error('Gift preparation requires the acquired loaded map');const w=campaign;
 const record=w.worldGroups?.groups.find(r=>r.state.id===5);if(!record||!('members'in record.state)||record.localMapId!==null||record.pending261)throw Error('Original acquired caravan5 unavailable');
 const g=record.state,donor=g.members.find(p=>p.id===7);if(!donor||!g.reorganization)throw Error('Original Léonie/reorganization absent');
 const factions=w.worldFactions!,faction=factions.factions.find(f=>f.def==='OutlanderCivil')!,settlement=factions.settlements.find(s=>s.factionId===faction.id);if(!settlement)throw Error('Actual civil settlement absent');
 g.phase='at-site';g.tile=settlement.tile;g.destination=settlement.tile;g.route=[settlement.tile];g.segment=null;g.stop={kind:'at-site'};g.paused=false;
 const cloth:MaterialPile={id:w.nextId++,item:'cloth',kind:'textile',quantity:60,owner:{type:'inventory',pawnId:donor.id}},wool:MaterialPile={id:w.nextId++,item:'muffalo-wool',kind:'textile',quantity:40,owner:{type:'inventory',pawnId:donor.id}};
 g.items.push(cloth,wool);g.reorganization=withGroupExchange(g.reorganization,'received',[cloth,wool]);
 const arrived=withWorldGroup(w,g.id,view=>arriveGeographicGroupPost256(view,g)),actual=w.worldFactions!.settlements.find(s=>s.id===settlement.id);if(!arrived||actual?.postId===undefined||actual.postId===null)throw Error('Actual finite post arrival refused');
 const errors=validateWorld(w);if(errors.length)throw Error('Invalid declared gift campaign: '+errors.join('; '));
 return {w,groupId:g.id,clothId:cloth.id,woolId:wool.id,factionId:faction.id,postId:actual.postId,settlementId:settlement.id};
}
