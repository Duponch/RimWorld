import {heldShipCasketHumanSlots277,heldShipCasketLivingIds277,heldShipCasketGCUnknown277} from './world-pawn-ship-casket-277.ts';
import {heldPlayerCasketHumanSlots271,heldPlayerCasketLivingIds271,heldPlayerCasketGCUnknown271} from './world-pawn-player-casket-271.ts';
import type {WorldPawnsState256} from './world-pawn-state-256.ts';
import type {HumanOwnerSlot} from './human-owners.ts';
import type {WorldPawnGCFacts256} from './world-pawn-gc-256.ts';
/** A derived membership only. The complete retained casket is the ONE physical
 * owner; there is no second actor row, politics, clinical clock or index. */
export function heldCasketLivingIds259(state:WorldPawnsState256|undefined):number[]{
 const ids:number[]=[],seen=new Set<number>();
 for(const entry of state?.heldCaskets259??[])for(const p of [...entry.casket.casket.humans,...entry.casket.casket.animals])if(p.state!=='dead'&&!p.health?.death){if(seen.has(p.id))throw Error('Duplicate retained casket membership');seen.add(p.id);ids.push(p.id);}
 for(const id of heldShipCasketLivingIds277(state)){if(seen.has(id))throw Error('Duplicate retained spatial-casket membership');seen.add(id);ids.push(id);}
 for(const id of heldPlayerCasketLivingIds271(state)){if(seen.has(id))throw Error('Duplicate retained player-casket membership');seen.add(id);ids.push(id);}
 return ids;
}
export function heldCasketGCUnknown259(state:WorldPawnsState256):readonly (readonly [number,WorldPawnGCFacts256])[]{
 const ancient=(state.heldCaskets259??[]).flatMap(e=>[...e.casket.casket.humans,...e.casket.casket.animals].filter(p=>p.state!=='dead'&&!p.health?.death).map(p=>p.id));
 return [...ancient.map(id=>[id,{keep:[],unknown:['actual-retained-cryptosleep-holder-terminal-uncomposed',...state.heldCaskets259?.some(e=>e.casket.casket.humans.some(p=>p.id===id&&!p.worldAffiliation259))?['literal-historical-faction-instance-absent']:[]],relatedIds:[],memoryIds:[]}] as const),...heldPlayerCasketGCUnknown271(state),...heldShipCasketGCUnknown277(state)];
}
export function heldCasketHumanSlots259(state:WorldPawnsState256|undefined):HumanOwnerSlot[]{
 return [...(state?.heldCaskets259??[]).flatMap(e=>e.casket.casket.humans.map(p=>({
  id:p.id,name:p.name,kind:'ancient-casket' as const,simulation:'frozen' as const,place:{kind:'ancient-casket' as const,casketId:e.casket.id},
  status:p.state==='dead'?'dead' as const:'away' as const,validationTick:p.health?.death?.tick??e.casket.casket.heldAt,pawn:p,
  items:e.casket.casket.items.filter((i):i is import('./types.ts').MaterialPile=>'pawnId'in i.owner&&i.owner.pawnId===p.id),packed:[],
  ...p.health?.death?{deathAt:p.health.death.tick}:{},
 }))),...heldPlayerCasketHumanSlots271(state),...heldShipCasketHumanSlots277(state)];
}
