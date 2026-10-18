import {campaignLivingObservers} from './campaign-people.ts';
import {opinionOf} from './social-state.ts';
import {relationshipIndex} from './relationship-runtime.ts';
import {closestFamilyRelation} from './relationship-state.ts';
import {lostMemoryDays,type LostCampaignMemory} from './world-map-lost.ts';
import {isColonist} from './affiliation.ts';
import {TICKS_PER_DAY,type Pawn,type World} from './types.ts';
import type {CampaignState} from './world-map-state.ts';
import type {EncounterGroup261,CaptiveWorldPawn261} from './caravan-encounter-state-261.ts';
import {validCaravanCessionMemory261,type CaravanCession261} from './caravan-person-lost-save-261.ts';
/** Same existing living-loss memories as a real person unavailable to the
 * colony. No death, last-settlement optimism, new person or recovery is asserted. */
export function draftCaravanPersonLost261(root:CampaignState,context:World,record:EncounterGroup261,victim:Pawn,captive:CaptiveWorldPawn261):LostCampaignMemory[] {
 const now=root.tick;
 const g=record.state,pending=record.pending261,originMapId=captive.originMapId;
 if((Number(root.schemaVersion)!==261&&root.schemaVersion!==262)||!root.worldGroups?.groups.includes(record)||record.localMapId!==null||!('members'in g)||!g.members.includes(victim)||g.lastPersonalTick!==now||pending?.kind!=='demand'||pending.atCore!==now*10||pending.demands.length!==1||pending.demands[0]!.kind!=='human'||pending.demands[0]!.id!==victim.id||victim.worldAffiliation259?.factionId!==root.worldFactions?.playerFactionId||captive.kind!=='human'||captive.actor.id!==victim.id||captive.clockCore!==now*10||captive.captivity261?.atCore!==now*10||captive.captivity261.factionId!==pending.factionId||originMapId===null||captive.entryKind259!=='caravan-exit')throw Error('Actual human Give receipt is absent');
 const witness:CaravanCession261={groupId:g.id,tile:g.tile,captorFactionId:pending.factionId};
 let memories=root.worldGroups!.lostMemories.filter(m=>m.at+lostMemoryDays(m.kind)*TICKS_PER_DAY>now);
 const add=(memory:LostCampaignMemory)=>{
  const m:LostCampaignMemory={...memory,caravanCession261:{...witness}};
  if(!validCaravanCessionMemory261(m,root))throw Error('Actual human Give memory source is invalid');
  const limit=['colonist-lost','friend-lost','rival-lost'].includes(m.kind)?5:10;
  memories=memories.filter(v=>!(v.receiverId===m.receiverId&&v.kind===m.kind&&v.otherId===m.otherId));
  const same=memories.filter(v=>v.receiverId===m.receiverId&&v.kind===m.kind);
  if(same.length>=limit){const oldest=same.reduce((a,b)=>a.at<b.at?a:b);memories=memories.filter(v=>v!==oldest);}
  memories.push(m);
 };
 for(const receiver of campaignLivingObservers(context)){
  const p=receiver.pawn;if(p.id===victim.id||!isColonist(p)||p.prisoner||p.visitor||p.state==='dead')continue;
  add({receiverId:p.id,mapId:originMapId,otherId:victim.id,kind:'colonist-lost',at:now});
  const opinion=opinionOf(p,victim.id,now,receiver.world);
  if(opinion>=20||opinion<=-20)add({receiverId:p.id,mapId:originMapId,otherId:victim.id,kind:opinion>=20?'friend-lost':'rival-lost',at:now,opinion});
  const family=closestFamilyRelation(relationshipIndex(receiver.world),p.id,victim.id);
  if(family)add({receiverId:p.id,mapId:originMapId,otherId:victim.id,kind:`${family}-lost`,at:now});
 }
 return memories;
}
