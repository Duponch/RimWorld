import {heldCasketHumanSlots259} from './world-pawn-casket-membership-259.ts';
import {captureWorldPawnOwners256} from './world-pawn-capture-256.ts';
import {deadWorldPawn256,terminalWorldPawn256,type WorldPawnCampaign256} from './world-pawn-state-256.ts';
import type {HumanOwnershipCapture,HumanOwnerSlot} from './human-owners.ts';
import type {RelationshipPerson} from './relationship-state.ts';
/** One physical capture for the whole campaign, never once per local map. */
export function captureWorldPawnHumans256(root:WorldPawnCampaign256):HumanOwnershipCapture {
 const rows=captureWorldPawnOwners256(root).rows,slots:HumanOwnerSlot[]=[],byId=new Map<number,HumanOwnerSlot>(),people=new Map<number,RelationshipPerson>();
 for(const row of rows){if(row.kind!=='human')continue;const dead=deadWorldPawn256(row),terminal=terminalWorldPawn256(row),deathAt=row.actor.health?.death?.tick;
  const slot:HumanOwnerSlot={id:row.actor.id,name:row.actor.name,kind:'world-pawn',simulation:terminal?'frozen':'world',place:{kind:'world-pawn'},status:dead?'dead':'departed',validationTick:row.clockCore/10,pawn:row.actor,items:row.items,packed:row.packed,...deathAt===undefined?{}:{deathAt}};
  if(byId.has(slot.id))throw Error('Duplicate actual WorldPawn human');slots.push(slot);byId.set(slot.id,slot);people.set(slot.id,{id:slot.id,name:slot.name,status:slot.status,...deathAt===undefined?{}:{deathAt}});
 }
 for(const slot of heldCasketHumanSlots259(root.worldPawns)){if(byId.has(slot.id))throw Error('Contained WorldPawn human has two physical owners');slots.push(slot);byId.set(slot.id,slot);people.set(slot.id,{id:slot.id,name:slot.name,status:slot.status,...slot.deathAt===undefined?{}:{deathAt:slot.deathAt}});}
 return {byId,people,slots,pawnOwners:slots,local:[],away:slots.filter(s=>s.simulation==='world'),contained:slots.filter(s=>s.kind==='ancient-casket'),terminals:slots.filter(s=>s.simulation==='frozen'),frozen:[],census:{localOwned:0,localLiving:0,localDead:0,containedOwned:slots.filter(s=>s.kind==='ancient-casket').length,containedLiving:slots.filter(s=>s.kind==='ancient-casket'&&s.status!=='dead').length,containedPiles:(root.worldPawns?.heldCaskets259??[]).reduce((n,e)=>n+e.casket.casket.items.length,0),legacyAwayOwned:0,legacyAwayLiving:0,groupAwayOwned:0,groupAwayLiving:0,terminalOwned:0,frozenPawnArchives:0,simpleDepartureIdentities:0,knownHumans:people.size,mapPiles:0,legacyTravelPiles:0,groupTravelPiles:0,terminalPiles:0,archivedPiles:0,postPiles:0,archivedPacked:0,worldPawnOwned:rows.length+slots.filter(s=>s.kind==='ancient-casket'&&s.status!=='dead').length,worldPawnLiving:rows.filter(r=>!terminalWorldPawn256(r)).length+slots.filter(s=>s.kind==='ancient-casket'&&s.status!=='dead').length,worldPawnDead:rows.filter(terminalWorldPawn256).length}};
}
