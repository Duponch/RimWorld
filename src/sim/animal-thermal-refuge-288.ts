import {animalThermalProfile466} from './animal-thermal-v466.ts';
import {type AnimalAirReader466} from './animal-thermal-air-v466.ts';
import {animalBody} from './wildlife-health.ts';
import {animalCarrier} from './animal-rest-state.ts';
import {groupAnimalPreparation} from './group-animal-formation-256.ts';
import {animalHandlingHolding} from './animal-handling.ts';
import {animalCareInProgress} from './animal-care.ts';
import {animalFeedingInProgress} from './animal-feeding.ts';
import {groupPawnInterval256} from './group-core-cadence-256.ts';
import {registeredMapId} from './world-map-context.ts';
import {HEAT_SERIOUS} from './heat-severity.ts';
import type {AnimalAreaPolicy287} from './animal-area-policy-287.ts';
import type {animalNavigation} from './wildlife-navigation.ts';
import type {WildAnimal} from './wildlife-state.ts';
import type {Cell,World} from './types.ts';

const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;
const replacement=(a:WildAnimal)=>!!(a.meal||a.animalRest||a.haul&&a.haul.phase!=='holding'||a.eggLay||a.mating||a.predation||a.exiting||a.hiveJob||a.wander?.job||a.animalAreaReturn287);

/** End only this job's future route; a committed physical edge survives. */
export function releaseAnimalThermalRefuge288(w:World,a:WildAnimal):void {
  if(!a.animalThermalRefuge288)return;
  delete a.animalThermalRefuge288;
  if(replacement(a))return;
  a.path=[];a.nextDecision=w.tick;
  if(a.state==='moving'&&(a.motion?.end??0)<=w.tick)a.state='idle';
}

/** Position owners and urgent jobs win before the thermal ThinkTree node. */
function available(w:World,a:WildAnimal):boolean {
  if((Number(w.schemaVersion)!==288&&(Number(w.schemaVersion)!==289&&(Number(w.schemaVersion)!==290&&(Number(w.schemaVersion)!==291&&(Number(w.schemaVersion)!==292&&(Number(w.schemaVersion)!==293&&Number(w.schemaVersion)!==294))))))||!a.domestic||!animalThermalProfile466(a)||!w.wildlife?.animals.includes(a)
    ||a.shipCryptosleepHeldAt277!==undefined||a.state==='dead'||a.state==='downed'||a.health?.death
    ||a.sleepUntilCore||a.stun||a.burning||a.flee||a.threat||a.retaliation||a.strike||a.manhunter||a.confusion
    ||a.exitFlight||a.eggLay||a.mating||a.predation||a.hiveJob
    ||animalCarrier(w,a.id)||groupAnimalPreparation(w,a.id)||animalHandlingHolding(w,a.id)
    ||animalCareInProgress(w,a)||animalFeedingInProgress(w,a))return false;
  const body=animalBody(a);return body.movingCapable&&body.canBeAwake&&!body.painShock&&!body.vitalFailure;
}

export function reconcileAnimalThermalRefuge288(w:World,a:WildAnimal,policy?:AnimalAreaPolicy287,free?:(c:Cell)=>boolean):void {
  const task=a.animalThermalRefuge288;if(!task)return;
  if(!available(w,a)||task.mapId!==registeredMapId(w)||replacement(a)||policy&&!policy.has(task.target.z*w.width+task.target.x)||free&&!free(task.target))releaseAnimalThermalRefuge288(w,a);
}

export interface AnimalThermalRefugeContext288 {
  nav:ReturnType<typeof animalNavigation>;
  air:AnimalAirReader466;
  policy?:AnimalAreaPolicy287;
  takeSearch():boolean;
  interruptHaul():void;
  startJob():void;
  move():void;
}

/** Local destination choice adapts native region/random selection to the
 * existing weighted frontier. Waiting retains native hash500 review; absence
 * of a thermal proposal then returns to this game's ordinary scheduler. */
export function processAnimalThermalRefuge288(w:World,a:WildAnimal,c:AnimalThermalRefugeContext288):boolean {
  if(!available(w,a))return false;
  const mapId=registeredMapId(w),range=animalThermalProfile466(a);if(mapId===undefined||!range)return false;
  const now=w.tick*10,comfortable=(cell:Cell)=>{const t=c.air.atCell(cell);return t>=range.min&&t<=range.max;};
  let task=a.animalThermalRefuge288,arrived=false;
  if(task?.phase==='travel'){
    if((a.motion?.end??0)>w.tick)return true;
    if(same(a,task.target)){
      delete a.animalThermalRefuge288;a.path=[];a.state='idle';a.nextDecision=w.tick;task=undefined;arrived=true;
    }else{
      // The actual edge/geometry check owns failure, not changing temperature
      // or severity: GotoSafeTemperature has no thermal end condition.
      if(!a.path.length||!c.nav.step(a,a.path[0]!)){releaseAnimalThermalRefuge288(w,a);return false;}
      c.move();return true;
    }
  }
  if(task?.phase==='wait'&&(now-task.startedAtCore<500||!groupPawnInterval256(a.id,now,500,10)))return true;
  const serious=Math.max(a.health?.heatstroke??0,a.health?.hypothermia??0)>=HEAT_SERIOUS;
  if(!serious){if(task)releaseAnimalThermalRefuge288(w,a);return false;}
  if(!task&&!arrived&&!groupPawnInterval256(a.id,now,60,10))return false;
  const accept=(target:Cell,path:Cell[])=>{
    if(a.haul&&a.haul.phase!=='holding')c.interruptHaul();
    delete a.meal;delete a.animalRest;delete a.exiting;
    if(a.wander)delete a.wander.job;
    c.startJob();
    a.animalThermalRefuge288={mapId,target:{x:target.x,z:target.z},phase:path.length?'travel':'wait',startedAtCore:now};
    a.path=path;a.state=path.length?'moving':'idle';a.nextDecision=w.tick;
    if(path.length)c.move();return true;
  };
  if(comfortable(a)){
    if(task?.phase==='wait')return true; // same Wait/source: retain its start
    return accept(a,[]);
  }
  const isGoal=(index:number)=>{
    const cell={x:index%w.width,z:Math.floor(index/w.width)};
    return (!c.policy||c.policy.has(index))&&comfortable(cell);
  };
  let path=c.nav.failedThermalRefugeRoute(a,isGoal);
  if(path===undefined){if(!c.takeSearch())return !!task;path=c.nav.thermalRefugeRoute(a,isGoal);}
  if(path?.length)return accept(path.at(-1)!,path);
  if(task)releaseAnimalThermalRefuge288(w,a);
  // No comfortable destination is an absent job, never a free safe position.
  return false;
}
