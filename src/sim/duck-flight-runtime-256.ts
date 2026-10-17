import {duckFlying256,forceDuckLand256,newDuckFlight256,stepDuckFlightCore256,type DuckFlight256} from './duck-flight-state-256.ts';
import {animalCarrier} from './animal-rest-state.ts';
import type {World} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';
export type DuckFlightJob256='GotoWander'|'AttackMelee'|'Wait_Combat'|'StandAndStare'|'Wait_MaintainPosture'|'other';
export const isDuckRuntime256=(w:Pick<World,'schemaVersion'>,a:Pick<WildAnimal,'species'>):boolean=>w.schemaVersion>=256&&a.species==='duck';
export const duckFlightMoveFactor256=(w:Pick<World,'schemaVersion'>,a:Pick<WildAnimal,'species'|'flight'>):number=>isDuckRuntime256(w,a)&&duckFlying256(a.flight)?2.8:1;
/** Caller invokes only at a confirmed new job, not each animation/route step.
 * Core Rand.Chance returns directly at0/1; no RNG draw for override1. */
export function notifyDuckFlightJob256(w:World,a:WildAnimal,job:DuckFlightJob256,random:()=>number):void {
 if(job!=='GotoWander'&&a.wander)delete a.wander.job;
 if(!isDuckRuntime256(w,a)||a.state==='dead'||animalCarrier(w,a.id))return;
 const f=a.flight??newDuckFlight256(w.tick*10),tryFly=['GotoWander','AttackMelee','Wait_Combat'].includes(job),keep=tryFly||job==='StandAndStare'||job==='Wait_MaintainPosture';
 if(tryFly&&!duckFlying256(f)&&f.cooldownCore<=0){const chance=job==='GotoWander'?.05:1;if(chance>=1||random()<chance){f.phase='taking-off';f.lerpCore=0;f.flyingCore=-1;}}
 else if(keep&&duckFlying256(f)){a.flight=f;return;}
 else if(duckFlying256(f))forceDuckLand256(f);
 if(a.flight||duckFlying256(f)||f.cooldownCore)a.flight=f;
}
/** One local10Core physical step. The real owner must synchronously preflight
 * Kill+DestroyCorpse on a downed unwalkable landing. No free stock fallback. */
export function advanceDuckFlight256(w:World,a:WildAnimal,landing:{walkable(core:number):boolean;retireDowned():boolean}):boolean {
 const f=a.flight;if(!isDuckRuntime256(w,a)||!f||a.state==='dead')return true;
 const now=w.tick*10;if(f.atCore===now)return true;if(f.atCore!==now-10)throw Error('Duck flight clock discontinuity');
 if(animalCarrier(w,a.id)){f.atCore=now;return true;}
 const next:DuckFlight256={...f};
 for(let i=0;i<10;i++)if(stepDuckFlightCore256(next)&&a.state==='downed'&&!landing.walkable(now-10+i+1)){if(!landing.retireDowned()){f.atCore=now;return false;}return true;}
 next.atCore=now;a.flight=next;return true;
}
