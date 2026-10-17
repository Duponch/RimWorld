import {neutralLossPlan} from './destruction-losses.ts';
import {stopExitTargeting} from './wildlife-exit.ts';
import {interruptWork} from './interrupted-cargo.ts';
import {animalServiceIds,animalCarrier} from './animal-rest-state.ts';
import {cancelMelee} from './melee-state.ts';
import {cancelMechanoidRanged} from './mechanoid-ranged-state.ts';
import type {World} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';
/** Pawn_FlightTracker completes an unwalkable downed landing with Kill then
 * DestroyCorpse. No pile, ID, inventory or archived target is manufactured.
 * The caller removes this original from the collection AFTER its iteration. */
export function retireDownedDuckLanding256(w:World,a:WildAnimal):boolean {
 if(w.schemaVersion<256||a.species!=='duck'||a.state!=='downed'||animalCarrier(w,a.id)||!w.wildlife?.animals.includes(a))return false;
 const loss=neutralLossPlan(w,{items:{'duck-corpse':1}});if(!loss)throw Error('Duck landing loss cannot be represented');
 detachDuckTargetOrders256(w,a);
 w.destroyed=loss;w.events.push({tick:w.tick,type:'need',message:`Canard ${a.id} mort après un atterrissage sans appui ; corps perdu.`});if(w.events.length>80)w.events.splice(0,w.events.length-80);
 return true;
}

/** DeSpawn also ends map targets, while busy recoveries retain their timers. */
export function detachDuckTargetOrders256(w:World,a:WildAnimal):void {
 stopExitTargeting(w,a.id);
 for(const p of w.pawns){
  if(animalServiceIds(p).includes(a.id))interruptWork(w,p);
  if(p.melee?.strike?.targetId===a.id&&!p.melee.strike.structure)p.melee.strike.targetId=null;
  if(p.tactics?.targetId===a.id){p.tactics.targetId=null;p.tactics.post=null;p.tactics.reviewAtCore=0;}
  const crisis=p.mental?.crisis;if(crisis?.kind==='berserk'&&crisis.targetId===a.id){crisis.targetId=null;crisis.jobUntilCore=null;}
 }
 for(const other of w.wildlife?.animals??[])if(other.strike?.targetId===a.id&&!other.strike.structure)other.strike.targetId=null;
 for(const mech of w.mechanoids??[]){
  if(mech.melee?.order?.targetId===a.id){cancelMelee(mech);mech.path=[];}
  if(mech.melee?.strike?.targetId===a.id&&!mech.melee.strike.structure)mech.melee.strike.targetId=null;
  if(mech.ranged?.order?.targetKey===`animal:${a.id}`)cancelMechanoidRanged(mech);
 }
}
