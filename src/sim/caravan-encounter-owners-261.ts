import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import type {CampaignState} from './world-map-state.ts';
import type {HumanOwnershipCapture,HumanOwnerSlot} from './human-owners.ts';
import type {RelationshipPerson} from './relationship-state.ts';
/** The one real pending holder, captured once for the whole campaign. The
 * worker's visible pause keeps this birth/current frontier exact. References in
 * a dialogue, summary or demand never become a second physical registration. */
export function captureEncounterHumans261(root:CampaignState):HumanOwnershipCapture {
 const slots:HumanOwnerSlot[]=[],byId=new Map<number,HumanOwnerSlot>(),people=new Map<number,RelationshipPerson>();
 const rows=root.worldGroups?.groups??('campaignMap'in root&&root.campaignMap?.revision===2?root.campaignMap.groups:[]);
 if((Number(root.schemaVersion)===261||(Number(root.schemaVersion)===262||isSchema263OrLater(Number(root.schemaVersion)))))for(const record of rows){
  const p=record.pending261,g=record.state;if(!p)continue;
  if(!('members'in g)||record.localMapId!==null||p.atCore!==root.tick*10)throw Error('Actual pending encounter frontier is not paused');
  for(const pawn of p.people){
   if(byId.has(pawn.id)||pawn.state==='dead'||pawn.health?.death)throw Error('Encounter original is duplicate or terminal');
   const slot:HumanOwnerSlot={id:pawn.id,name:pawn.name,kind:'caravan-encounter',simulation:'world',place:{kind:'planet',tile:g.tile},status:'away',validationTick:p.atCore/10,pawn,
    items:p.items.filter(i=>'pawnId'in i.owner&&i.owner.pawnId===pawn.id),packed:p.packed.filter(i=>i.owner.type!=='ground'&&i.owner.pawnId===pawn.id),groupId:g.id};
   slots.push(slot);byId.set(pawn.id,slot);people.set(pawn.id,{id:pawn.id,name:pawn.name,status:'away'});
  }
 }
 return {byId,people,slots,pawnOwners:slots,local:[],away:slots,contained:[],terminals:[],frozen:[],census:{localOwned:0,localLiving:0,localDead:0,containedOwned:0,containedLiving:0,containedPiles:0,legacyAwayOwned:0,legacyAwayLiving:0,groupAwayOwned:slots.length,groupAwayLiving:slots.length,terminalOwned:0,frozenPawnArchives:0,simpleDepartureIdentities:0,knownHumans:people.size,mapPiles:0,legacyTravelPiles:0,groupTravelPiles:slots.reduce((n,s)=>n+s.items.length,0),terminalPiles:0,archivedPiles:0,postPiles:0,archivedPacked:0}};
}
