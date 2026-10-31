import {isCorePhysicalSchema297} from './physical-schema-297.ts';
import {worldGroupContext} from './world-map-context.ts';
import {draftForeignRoster261} from './caravan-foreign-roster-261.ts';
import {visitorPoints} from './visitor-state.ts';
import {caravanMapAllowed261} from './caravan-incidents-261.ts';
import type {CampaignState} from './world-map-state.ts';
import type {PendingCaravanEncounter261} from './caravan-encounter-state-261.ts';

/** The approved V261 budget/composition adapter, not native ThreatBig wealth.
 * A forced actual faction is never reselected and every foreign owner is finite. */
export function draftPeaceDisaster293(input:{root:CampaignState;groupId:number;siteId:number;factionId:number;atCore:number;rng:number;nextId:number}):
 {ok:false;reason:string}|{ok:true;pending:Extract<PendingCaravanEncounter261,{kind:'peace-talks'}>;points:number;nextId:number;rng:number;enemyIds:number[]} {
 const {root}=input,no=(reason:string)=>({ok:false as const,reason}),record=root.worldGroups?.groups.find(r=>r.state.id===input.groupId),g=record?.state;
 if((Number(root.schemaVersion)!==293&&(Number(root.schemaVersion)!==294&&(Number(root.schemaVersion)!==295&&(Number(root.schemaVersion)!==296&&!isCorePhysicalSchema297(Number(root.schemaVersion))))))||!record||record.localMapId!==null||!g||!('members'in g)||record.pending261||record.pendingEntry263||input.atCore!==root.tick*10||input.nextId!==root.nextId||!caravanMapAllowed261(root,g.tile))return no('La vraie caravane ne peut pas recevoir cette attaque forcée.');
 const view=worldGroupContext(root,g.id);if(!view)return no('Le propriétaire de caravane est absent.');
 const random={rng:input.rng},points=visitorPoints(random,'visitor'),roster=draftForeignRoster261(view,'combat',input.factionId,points,random.rng);
 if(!roster||!roster.people.length)return no('La troupe finie de cette faction ne peut pas être produite.');
 const pending:Extract<PendingCaravanEncounter261,{kind:'peace-talks'}>={revision:1,kind:'peace-talks',decision:'forced',peaceTalksSiteId293:input.siteId,atCore:input.atCore,factionId:input.factionId,people:roster.people,animals:[],items:roster.items,packed:[]};
 return {ok:true,pending,points,nextId:roster.nextId,rng:roster.rng,enemyIds:roster.people.map(p=>p.id)};
}
