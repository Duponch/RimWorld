import { isColonist } from './affiliation.ts';
import { animalSpecies } from './animal-species.ts';
import type { AnimalHandlingTask, DomesticCommand } from './domestic-state.ts';
import { ingestFoodRisk } from './food-hygiene.ts';
import { healthRandom } from './health.ts';
import { cancelHunting } from './hunting-state.ts';
import { medicalWorkRefusal, pawnBody } from './health-rules.ts';
import { ITEM_DEFINITIONS, type ItemId } from './items.ts';
import { reservedSource } from './materials.ts';
import type { NeedContext } from './needs.ts';
import { adjacent, routeToJob, type Reachability } from './pathfinding.ts';
import { copyPileCondition } from './pile-condition.ts';
import { learnSkill } from './skills.ts';
import { TICKS_PER_DAY, type Cell, type CommandResult, type Pawn, type World } from './types.ts';
import { animalBody } from './wildlife-health.ts';
import type { WildAnimal } from './wildlife-state.ts';
import { interruptWork } from './interrupted-cargo.ts';
import { releaseWork } from './work-release.ts';

/** Core's 60,000-tick day is represented by 6,000 local ticks. */
export const TAME_COOLDOWN = TICKS_PER_DAY / 2;
export const TRAIN_COOLDOWN = TICKS_PER_DAY / 4;
export const TAMENESS_DECAY = TICKS_PER_DAY * 7.5;
export const MIN_HANDLING = 8;
const TALK_TICKS = 27;
const FINAL_TAME_TICKS = 35;
const FINAL_TRAIN_TICKS = 10;
const FEED_NUTRITION_MILLI = Math.round(Math.min(.15 * animalSpecies('hare').nutrition, .3)*1000);
const FOOD:ReadonlySet<ItemId> = new Set(['berries','rice','potato','corn','agave-fruit']);
const FEEDS = 2;
const MAX_TAMENESS = 5;
/** All five explicitly supported raw foods have 0.05 nutrition per unit. */
export const HANDLING_FEED_TICKS=Math.ceil(TALK_TICKS*(ITEM_DEFINITIONS.berries.nutrition*10)/FEED_NUTRITION_MILLI);
export function handlingStepDuration(task:Pick<AnimalHandlingTask,'kind'|'step'>):number {
  return task.step===2||task.step===4?HANDLING_FEED_TICKS
    :task.step===5?task.kind==='tame'?FINAL_TAME_TICKS:FINAL_TRAIN_TICKS:TALK_TICKS;
}

function animalAvailable(a:WildAnimal):boolean {
  return a.species==='hare'&&!['dead','downed','sleeping','eating'].includes(a.state)
    &&!a.stun&&!a.burning&&!a.flee&&!a.health?.foodPoisoning?.vomit;
}
function handlerAvailable(p:Pawn):boolean {
  const body=pawnBody(p).capacities;
  return isColonist(p)&&p.priorities.handle>0&&(p.skills.animals?.level??0)>=MIN_HANDLING&&!p.draft&&!p.mental?.crisis&&!p.flee&&!p.interruptedCargo
    &&!medicalWorkRefusal(p)&&body.talking>0&&body.hearing>0&&body.manipulation>0;
}
function trainableAt(w:World,a:WildAnimal):boolean {
  return !!a.domestic&&a.domestic.tameness<MAX_TAMENESS
    &&w.tick-(a.domestic.lastTraining??a.domestic.since)>=TRAIN_COOLDOWN;
}
function tameableAt(w:World,a:WildAnimal,p:Pawn):boolean {
  return !!a.taming?.designated&&!a.domestic&&(p.skills.animals?.level??0)>=MIN_HANDLING
    &&w.tick-(a.taming.lastAttempt??-TAME_COOLDOWN)>=TAME_COOLDOWN;
}
export function animalHandlingClaimed(w:World,id:number):boolean {
  return w.pawns.some(p=>p.animalHandling?.animalId===id||p.animalCare?.animalId===id);
}
/** Only physical contact freezes wildlife movement, not a distant reservation. */
export function animalHandlingHolding(w:World,id:number):boolean {
  const a=w.wildlife?.animals.find(a=>a.id===id);
  if(!a||!animalAvailable(a)||(a.motion?.end??0)>w.tick)return false;
  return w.pawns.some(p=>p.animalHandling?.animalId===id&&p.animalHandling.phase==='interact'
    &&p.moveCooldown===0&&adjacent(p,a)&&handlerAvailable(p));
}
export function handlingWanted(w:World,p:Pawn):boolean {
  if(!handlerAvailable(p))return false;
  return !!w.wildlife?.animals.some(a=>animalAvailable(a)&&!animalHandlingClaimed(w,a.id)
    &&(trainableAt(w,a)||tameableAt(w,a,p)));
}
export interface HandlingProposal { task:AnimalHandlingTask; path:Cell[]; target:Cell }
export function handlingProposal(w:World,p:Pawn,reach:Reachability):HandlingProposal|undefined {
  if(!handlingWanted(w,p))return;
  const animals=w.wildlife!.animals.filter(a=>animalAvailable(a)&&!animalHandlingClaimed(w,a.id)
    &&(trainableAt(w,a)||tameableAt(w,a,p)))
    .sort((a,b)=>(a.x-p.x)**2+(a.z-p.z)**2-((b.x-p.x)**2+(b.z-p.z)**2)||a.id-b.id);
  const sources=w.piles.filter(i=>i.kind==='food'&&FOOD.has(i.item)&&i.owner.type==='ground'
    &&i.quantity-reservedSource(w,i.id)>=FEEDS)
    .sort((a,b)=>(a.owner.type==='ground'?(a.owner.x-p.x)**2+(a.owner.z-p.z)**2:Infinity)
      -(b.owner.type==='ground'?(b.owner.x-p.x)**2+(b.owner.z-p.z)**2:Infinity)||a.id-b.id);
  for(const a of animals) {
    // An inaccessible animal must not reserve food, a worker or its attempt.
    if(!routeToJob(w,a,reach,false))continue;
    for(const pile of sources) {
    if(pile.owner.type!=='ground')continue;
    const path=routeToJob(w,pile.owner,reach,true);if(!path)continue;
    return {task:{animalId:a.id,kind:a.domestic?'maintain':'tame',sourcePileId:pile.id,carryPileId:null,
      quantity:FEEDS,phase:'pickup',step:0,progress:0},path,target:pile.owner};
    }
  }
}
export function startHandling(p:Pawn,proposal:HandlingProposal):void {
  p.animalHandling=proposal.task;p.path=proposal.path;p.state=proposal.path.length?'moving':'working';p.planCooldown=0;
}
export function tameRefusal(_w:World,a:WildAnimal|undefined):string|undefined {
  return !a||a.state==='dead'?'Lièvre vivant introuvable.'
    :a.species!=='hare'?'Cette espèce n’est pas encore apprivoisable ici.'
    :a.domestic?'Ce lièvre appartient déjà à la colonie.':undefined;
}
export function applyTaming(w:World,cmd:Extract<DomesticCommand,{type:'tame'}>):CommandResult {
  const fail=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
  const a=w.wildlife?.animals.find(a=>a.id===cmd.animalId);
  if(!Number.isSafeInteger(cmd.animalId)||typeof cmd.enabled!=='boolean')return fail('Ordre d’apprivoisement invalide.');
  const refusal=tameRefusal(w,a);if(refusal)return fail(refusal);
  if(!a)return fail('Lièvre vivant introuvable.');
  if(cmd.enabled) {
    if(!a.taming)a.taming={designated:true};else a.taming.designated=true;
  } else {
    const worker=w.pawns.find(p=>p.animalHandling?.animalId===a.id);
    if(worker&&!releaseWork(w,worker))return fail('Impossible de déposer la nourriture portée.');
    if(a.taming)a.taming.designated=false;
  }
  for(const p of w.pawns)p.planCooldown=0;
  return {ok:true};
}
function capacityFactor(value:number,weight:number,allowedDefect:number):number {
  return Math.max(0,Math.min(1,1-weight*(1-Math.max(allowedDefect,Math.min(1,value)))));
}
export function tameChance(p:Pawn):number {
  const c=pawnBody(p).capacities,level=p.skills.animals?.level??0;
  return Math.max(.01,(.04+.03*level)*.5
    *capacityFactor(c.talking,.9,.2)*capacityFactor(c.hearing,.3,.05)*capacityFactor(c.manipulation,.5,.2));
}
export function trainChance(p:Pawn):number {
  const c=pawnBody(p).capacities,level=p.skills.animals?.level??0;
  return Math.max(.01,(.10+.05*level)*.75
    *capacityFactor(c.talking,.7,.2)*capacityFactor(c.hearing,.3,.05)*capacityFactor(c.manipulation,.5,.2));
}
function stillValid(w:World,p:Pawn,a:WildAnimal,task:AnimalHandlingTask):boolean {
  return handlerAvailable(p)&&animalAvailable(a)&&
    (task.kind==='tame'?!!a.taming?.designated&&!a.domestic:(!!a.domestic&&a.domestic.tameness<MAX_TAMENESS))
    &&!w.pawns.some(o=>o!==p&&(o.animalHandling?.animalId===a.id||o.animalCare?.animalId===a.id));
}
function carried(w:World,p:Pawn,task:AnimalHandlingTask) {
  return w.piles.find(i=>i.id===task.carryPileId&&i.owner.type==='pawn'&&i.owner.pawnId===p.id
    &&i.kind==='food'&&FOOD.has(i.item)&&i.quantity===task.quantity);
}
function finish(w:World,p:Pawn,a:WildAnimal,task:AnimalHandlingTask,ctx:NeedContext):void {
  const skill=p.skills.animals;
  if(skill)learnSkill(skill,task.kind==='tame'?90_000:70_000,p);
  const success=healthRandom(w)<(task.kind==='tame'?tameChance(p):trainChance(p));
  if(task.kind==='tame') {
    if(success){a.domestic={since:w.tick,care:'herbal',tameness:MAX_TAMENESS,nextDecay:w.tick+TAMENESS_DECAY,lastTraining:w.tick};
      delete a.taming;delete a.flee;delete a.threat;delete a.retaliation;
      if(w.hunting)w.hunting.targets=w.hunting.targets.filter(id=>id!==a.id);
      for(const hunter of w.pawns)if(hunter.hunting?.animalId===a.id){cancelHunting(hunter);hunter.path=[];hunter.state='idle';hunter.planCooldown=0;}
      ctx.event(`${p.name} a apprivoisé le lièvre ${a.id}.`);
    } else ctx.event(`${p.name} n’a pas réussi à apprivoiser le lièvre ${a.id}.`);
  } else if(a.domestic) {
    if(success)a.domestic.tameness=Math.min(MAX_TAMENESS,a.domestic.tameness+1);
    ctx.event(`${p.name} ${success?'a entretenu':'n’a pas amélioré'} la familiarité du lièvre ${a.id}.`);
  }
  if(!releaseWork(w,p))interruptWork(w,p);
}
interface HandlingContext extends NeedContext { candidates():Reachability|null; blocked():Uint8Array }
export function processHandling(w:World,p:Pawn,ctx:HandlingContext):void {
  const task=p.animalHandling;if(!task)return;
  const a=w.wildlife?.animals.find(a=>a.id===task.animalId);
  if(!a||!stillValid(w,p,a,task)){interruptWork(w,p);return;}
  if(task.phase==='pickup') {
    const pile=w.piles.find(i=>i.id===task.sourcePileId);
    if(!pile||pile.owner.type!=='ground'||pile.kind!=='food'||!FOOD.has(pile.item)
      ||pile.quantity-reservedSource(w,pile.id,p.id)<task.quantity){interruptWork(w,p);return;}
    if(!adjacent(p,pile.owner)&&(p.x!==pile.owner.x||p.z!==pile.owner.z)){ctx.move(pile.owner,false);return;}
    if(pile.quantity===task.quantity){pile.owner={type:'pawn',pawnId:p.id};task.carryPileId=pile.id;}
    else {
      if(w.piles.length>=32768||!Number.isSafeInteger(w.nextId+1)){interruptWork(w,p);return;}
      pile.quantity-=task.quantity;task.carryPileId=w.nextId++;
      w.piles.push({id:task.carryPileId,kind:'food',item:pile.item,quantity:task.quantity,
        owner:{type:'pawn',pawnId:p.id},...copyPileCondition(pile)});
    }
    task.phase='approach';p.path=[];p.state='moving';return;
  }
  const food=task.quantity>0?carried(w,p,task):undefined;
  if(task.quantity>0&&!food||task.quantity===0&&task.step!==5){interruptWork(w,p);return;}
  if(!adjacent(p,a)||(a.motion?.end??0)>w.tick||a.meal) {
    task.phase='approach';task.progress=0;
    if(!adjacent(p,a)){ctx.move(a,false);return;}
    p.path=[];p.state='idle';return;
  }
  task.phase='interact';p.path=[];p.state='working';
  if(task.kind==='tame'&&task.step===5&&task.progress===0&&a.taming
    &&(a.taming.lastAttempt===undefined||w.tick-a.taming.lastAttempt>=TAME_COOLDOWN))a.taming.lastAttempt=w.tick;
  if(task.kind==='maintain'&&task.step===5&&task.progress===0&&a.domestic
    &&w.tick-(a.domestic.lastTraining??a.domestic.since)>=TRAIN_COOLDOWN)a.domestic.lastTraining=w.tick;
  const feeding=task.step===2||task.step===4,final=task.step===5;
  const duration=handlingStepDuration(task);
  if(++task.progress<duration)return;
  task.progress=0;
  if(feeding) {
    const consumed=food!;
    const foodRisk={item:consumed.item,...consumed.foodPoison?{foodPoison:{...consumed.foodPoison}}:{}};
    consumed.quantity--;task.quantity--;
    if(!consumed.quantity){w.piles.splice(w.piles.indexOf(consumed),1);task.carryPileId=null;}
    a.food=Math.min(animalSpecies(a.species).nutrition,a.food+ITEM_DEFINITIONS[consumed.item].nutrition/100);
    ingestFoodRisk(w,a,foodRisk,false);
    if(a.state==='dead'||a.state==='downed'){interruptWork(w,p);return;}
  } else if(!final&&p.skills.animals)learnSkill(p.skills.animals,70_000,p);
  task.step++;
  if(task.step===6)finish(w,p,a,task,ctx);
}
/** Sparse caller: once per world tick, with no path or map scan. */
export function advanceTameness(w:World):void {
  for(const a of w.wildlife?.animals??[]) {
    const d=a.domestic;if(!d||a.species!=='hare'||a.state==='dead'||w.tick<d.nextDecay)continue;
    while(a.domestic&&w.tick>=a.domestic.nextDecay) {
      a.domestic.tameness--;
      if(a.domestic.tameness<=0){delete a.domestic;delete a.taming;break;}
      a.domestic.nextDecay+=TAMENESS_DECAY;
    }
  }
}
