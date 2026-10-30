import {animalPenAt,PEN_ANIMALS} from './animal-pens.ts';
import {grazingPen} from './wildlife-food.ts';
import {isRoofed,roofCoverage,roofIndex} from './roof-rules.ts';
import {toxicFalloutActive294} from './toxic-fallout-state-294.ts';
import type {animalNavigation} from './wildlife-navigation.ts';
import type {WildAnimal} from './wildlife-state.ts';
import type {World} from './types.ts';

export interface AnimalFalloutShelterContext294 {
 nav:Pick<ReturnType<typeof animalNavigation>,'free'|'step'|'route'>;
 takeSearch():boolean;
 /** Peek at the shared phase budget before allocating any candidate list. */
 canSearch?():boolean;
 startJob():void;
 move():void;
 /** The earlier path hook can revoke an unsafe ordinary wander continuation,
  * but only the final, lowest-priority wander node may request a new route. */
 startNew?:boolean;
}

/** The native node belongs to tame roamers in an actual closed, connected pen.
 * An assigned marker is not evidence that an escaped animal is inside it. */
function shelteredPen(w:World,a:WildAnimal):ReadonlySet<number>|undefined {
 if(!a.domestic||!PEN_ANIMALS.includes(a.species)||!w.wildlife?.animals.includes(a))return;
 const assigned=grazingPen(w,a);if(assigned)return assigned;
 const current=animalPenAt(w,a.x,a.z);return current?.closed?current.cells:undefined;
}

/** 0: ordinary/absent job; 1: this wander job owns the route/quota wait;
 * 2: current covered wander must choose only other covered cells.
 * Paths and optional goto mind are existing physical owners, not a new task
 * registry. Fire, threats, clinical rest, handling, transport and real meals
 * are resolved before this node by the wildlife scheduler and remain intact. */
function activeShelteredPen294(w:World,a:WildAnimal):ReadonlySet<number>|undefined {
 if(!toxicFalloutActive294(w)||a.state==='dead'||a.state==='downed'||a.state==='sleeping'||a.health?.death||a.shipCryptosleepHeldAt277!==undefined
   ||a.burning||a.flee||a.threat||a.retaliation||a.strike||a.stun||a.manhunter||a.confusion
   ||a.meal||a.animalRest||a.animalThermalRefuge288||a.animalAreaReturn287||a.haul||a.eggLay||a.mating||a.predation||a.exiting||a.exitFlight||a.hiveJob)return;
 return shelteredPen(w,a);
}
/** Pure revocation guard for a committed route's next edge. The ordinary
 * macro remains the sole owner of path retirement, mind changes and planning. */
export function animalFalloutNextStepBlocked294(w:World,a:WildAnimal):boolean {
 if(!a.path.length)return false;const pen=activeShelteredPen294(w,a);if(!pen)return false;
 const next=a.path[0]!;return isRoofed(w,roofIndex(w,a))&&(!pen.has(roofIndex(w,next))||!isRoofed(w,roofIndex(w,next)));
}
export function processAnimalFalloutShelter294(w:World,a:WildAnimal,c:AnimalFalloutShelterContext294):0|1|2 {
 const pen=activeShelteredPen294(w,a);if(!pen)return 0;
 const covered=isRoofed(w,roofIndex(w,a));
 if(a.path.length){
  const next=a.path[0]!;
  // Only future low-priority steps are revoked. A committed motion has already
  // been handled by the scheduler and is never rewound or teleported here.
  if(covered&&(!pen.has(roofIndex(w,next))||!isRoofed(w,roofIndex(w,next)))){
   a.path=[];if(a.wander)delete a.wander.job;a.nextDecision=w.tick;
   if((a.motion?.end??0)<=w.tick&&a.state==='moving')a.state='idle';
  }else return covered?2:0;
 }
 if(covered)return 2;
 if(c.startNew===false||a.nextDecision>w.tick)return 0;
 if(c.canSearch&&!c.canSearch())return 1;
 const goals=roofCoverage(w).flatMap(index=>{
  if(!pen.has(index))return [];
  const cell={x:index%w.width,z:Math.floor(index/w.width)};return c.nav.free(cell)?[cell]:[];
 });
 if(!goals.length)return 0;
 if(!c.takeSearch())return 1;
 const path=c.nav.route(a,goals);
 if(!path?.length||!path.every(cell=>pen.has(roofIndex(w,cell)))||!isRoofed(w,roofIndex(w,path.at(-1)!)))return 0;
 c.startJob();a.path=path;a.state='moving';a.nextDecision=w.tick;
 if(a.wander){a.wander.nextMoveOrderIsWait=!a.wander.nextMoveOrderIsWait;a.wander.job={kind:'goto',destination:{...path.at(-1)!}};}
 c.move();return 1;
}
