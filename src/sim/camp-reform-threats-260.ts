import {registeredCampaign} from './world-map-context.ts';
import {foggedCell256} from './exploration-state-256.ts';
import {isAggressiveCrisis} from './aggressive-crisis.ts';
import type {World} from './types.ts';
/** Camp refuses every current active enemy, including fogged actors. The
 * battlefield map-parent alone grants CanReformFoggedEnemies. No dormant
 * machine state is fabricated: all current living, standing machines count. */
export function campHasActiveThreat260(w:World,canReformFoggedEnemies=false):boolean {
 const factions=registeredCampaign(w).worldFactions;
 const counts=(p:{x:number;z:number})=>!canReformFoggedEnemies||!foggedCell256(w,p.z*w.width+p.x);
 if(w.pawns.some(p=>{
  if(p.state==='dead'||p.state==='downed'||p.health?.death||p.prisoner||!counts(p))return false;
  const id=p.worldAffiliation259?.factionId;if(id===undefined)return p.faction==='outlaws';
  return id!==null&&!!factions?.relations.some(r=>r.aId===Math.min(id,factions.playerFactionId)&&r.bId===Math.max(id,factions.playerFactionId)&&r.kind==='hostile');
 }))return true;
 return (w.mechanoids??[]).some(m=>m.state!=='dead'&&m.state!=='downed'&&counts(m))||(w.wildlife?.animals??[]).some(a=>a.manhunter&&a.state!=='dead'&&a.state!=='downed'&&counts(a));
}
export function campReformThreatReason260(w:World,battlefield=false):string|undefined {
 if(campHasActiveThreat260(w,battlefield))return battlefield?'La menace active visible empêche de reformer la caravane.':'La menace active empêche de reformer la caravane.';
 if(w.pawns.some(p=>p.mental&&isAggressiveCrisis(p.mental)))return 'Une crise agressive doit se terminer avant la réforme.';
 return;
}
