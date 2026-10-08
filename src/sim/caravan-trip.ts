import { commercialRegistryView } from './commercial-trip.ts';
import { findCivilianReturnEntry } from './civilian-return.ts';
import { isColonist } from './affiliation.ts';
import { adultHungerFactor, ITEM_DEFINITIONS } from './items.ts';
import { foodAllowed } from './food-policy.ts';
import { groundCapacity } from './ground-placement.ts';
import { advanceHumanAge } from './human-age.ts';
import { medicalStatus } from './injury-state.ts';
import { malnutritionModifiers } from './malnutrition.ts';
import { expireMealMemories } from './mood.ts';
import { HUNGER_PER_TICK } from './needs.ts';
import { updateRest } from './rest.ts';
import { tickSkills } from './skills.ts';
import { expireSocialMemories } from './social-state.ts';
import { visitorAtEdge } from './visitor-navigation.ts';
import { SCOUT_RETURN_RETRY_TICKS, SCOUT_TRIP_TICKS, type ScoutState } from './caravan-state.ts';
import type { Cell, MaterialPile, Pawn, World } from './types.ts';

const same=(a:Cell,b:Cell):boolean=>a.x===b.x&&a.z===b.z;
const onMap=(s:ScoutState):s is Extract<ScoutState,{phase:'loading'|'leaving'}>=>s.phase==='loading'||s.phase==='leaving';
const log=(w:World,message:string):void=>{w.events.push({tick:w.tick,type:'command',message});if(w.events.length>80)w.events.splice(0,w.events.length-80);};

export function scoutOnMapId(w:World):number|null {return w.scout&&onMap(w.scout)?w.scout.pawnId:null;}
export function scoutPawn(w:World):Pawn|null {
  const state=w.scout;
  if(!state)return null;
  return onMap(state)?w.pawns.find(p=>p.id===state.pawnId)??null:state.pawn;
}
/** A read-only reference projection for shared identity and policy validators.
 * It is never installed into World or used by movement, stocks or rendering. */
export function scoutRegistryView(w:World):World {
  const state=w.scout;
  return state&&!onMap(state)?{...w,pawns:[...w.pawns,state.pawn],piles:[...w.piles,...state.items]}:commercialRegistryView(w);
}

function acuteCondition(p:Pawn):boolean {
  const h=p.health;
  return !!h&&(!!h.death||h.injuries.length>0||h.missing.length>0||h.bloodLoss>0||!!h.heatstroke||!!h.hypothermia||!!h.malnutrition||!!h.infections||!!h.flu||!!h.immuneDiseases?.malaria?.severity||!!h.immuneDiseases?.plague?.severity||!!h.immuneDiseases?.malaria?.vomit||!!h.foodPoisoning||!!h.anesthetic||medicalStatus(h)!=='mobile');
}
function activeTask(p:Pawn):boolean {
  return p.jobId!==null||p.haul!==null||p.cooking!==null||p.need!==null||p.orders.active!==null||p.orders.queue.length>0
    ||!!(p.animalHandling||p.animalCare||p.burial||p.cleaning||p.trade||p.firefighting||p.ward||p.heatRefuge||p.research||p.hunting||p.feed||p.tend||p.surgery||p.surgeryRequest||p.rescue||p.equipmentTask||p.recreation.task||p.priorityWork);
}
function unstable(p:Pawn,w:World):boolean {
  return !!(p.prisoner||p.visitor||p.raid||p.draft||p.mental?.crisis||p.social?.fight||p.burning||p.flee||p.tactics||p.melee||p.shooting?.order||p.shooting?.stance
    ||p.bombRefuge||p.interruptedCargo||p.equipmentDropPending||p.transitExit||p.stagger&&p.stagger.untilCore>w.tick*10||p.stun&&p.stun.untilCore>w.tick*10);
}

/** Beginning a trip cannot silently interrupt work or export another cargo. */
export function scoutEligible(w:World,p:Pawn):string|null {
  if(w.scout||w.commercialTrip||w.group)return 'Un voyage ou groupe est déjà en cours.';
  const preparation=scoutPreparationReason(w,p);if(preparation)return preparation;
  if(activeTask(p)||p.state!=='idle'||p.path.length||p.moveCooldown>0||(p.motion?.end??0)>w.tick)return 'Le colon doit être libre de tout travail ou déplacement.';
  if(w.piles.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)||w.packed.some(i=>'pawnId' in i.owner&&i.owner.pawnId===p.id))return 'Déposez d’abord la cargaison de travail ou le meuble porté.';
  if(w.piles.some(i=>i.owner.type==='inventory'&&i.owner.pawnId===p.id))return 'L’inventaire doit être vide avant le chargement des rations.';
  return null;
}

/** Recovery from a cancelled loading stays available even if the colon has
 * since become hungry or tired; the unloading module checks the actual pile
 * and physical ground capacity. */
export function scoutUnloadEligible(w:World,p:Pawn):string|null {
  if(w.scout||w.commercialTrip)return 'Terminez ou annulez le voyage en cours.';
  if(!w.pawns.includes(p)||!isColonist(p)||p.prisoner||p.visitor||p.state==='dead'||p.state==='downed')return 'Choisissez un colon libre et présent.';
  if(unstable(p,w)||activeTask(p)||p.state!=='idle'||p.path.length||p.moveCooldown>0||(p.motion?.end??0)>w.tick)return 'Le colon doit être libre de tout travail, combat ou déplacement.';
  if(w.piles.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)||w.packed.some(i=>'pawnId' in i.owner&&i.owner.pawnId===p.id))return 'Déposez d’abord la cargaison de travail ou le meuble porté.';
  return null;
}

/** A preparation can continue walking while these safety conditions hold. */
export function scoutPreparationReason(w:World,p:Pawn):string|null {
  if(!w.pawns.includes(p)||!isColonist(p)||p.prisoner||p.visitor||p.state==='dead'||p.state==='downed')return 'Choisissez un colon libre et présent.';
  if(w.pawns.filter(other=>other!==p&&isColonist(other)&&!other.prisoner&&other.state!=='dead'&&other.state!=='downed'&&!other.mental?.crisis).length===0)return 'Un autre colon capable doit rester sur la carte.';
  if(acuteCondition(p))return 'Le colon doit être sain avant de partir.';
  if(p.rest<50||p.hunger<=20||p.collapsePending)return 'Le colon doit être reposé et nourri avant le départ.';
  if(unstable(p,w))return 'Le colon est mobilisé, en crise ou engagé dans un combat.';
  if(!foodAllowed(w,p,'survival-meal'))return 'Le régime du colon interdit les repas de survie.';
  return null;
}

/** Called again at the real edge. A changed world can refuse departure while
 * the already loaded food remains the colon's ordinary inventory. */
export function departureReason(w:World,p:Pawn):string|null {
  const s=w.scout;
  if(!s||s.phase!=='leaving'||s.pawnId!==p.id||!w.pawns.includes(p))return 'Aucun départ de reconnaissance actif pour ce colon.';
  if(!visitorAtEdge(w,p))return 'Le colon n’a pas atteint le bord de la carte.';
  const preparation=scoutPreparationReason(w,p);if(preparation)return preparation;
  if(activeTask(p)||p.state!=='idle'||p.moveCooldown>0||(p.motion?.end??0)>w.tick||p.path.length)return 'Le colon est encore engagé dans une tâche ou une arête.';
  const owned=w.piles.filter(i=>'pawnId' in i.owner&&i.owner.pawnId===p.id);
  if(owned.length>32)return 'Le voyageur porte trop d’objets pour ce premier circuit.';
  if(w.pawns.some(q=>q!==p&&(q.rescue?.patientId===p.id||q.tend?.patientId===p.id||q.feed?.patientId===p.id||q.ward?.patientId===p.id||q.surgery?.patientId===p.id||q.melee?.order?.targetId===p.id||q.melee?.strike?.targetId===p.id||q.shooting?.order?.targetId===p.id)))return 'Une action encore active vise ce colon.';
  const inventory=owned.filter(i=>i.owner.type==='inventory');
  if(inventory.length!==1||inventory[0]?.id!==s.foodPileId||inventory[0].item!=='survival-meal'||inventory[0].quantity!==s.quantity||!!inventory[0].foodPoison)return 'Les rations chargées ne correspondent plus au manifeste.';
  if(owned.some(i=>i.owner.type==='pawn'||i.owner.type==='inventory'&&i.id!==s.foodPileId)||w.packed.some(i=>'pawnId' in i.owner&&i.owner.pawnId===p.id))return 'Une cargaison incompatible empêche le départ.';
  return null;
}
export const scoutDepartureReason=departureReason;

/** Transfer original objects exactly once, after the physical edge is reached. */
export function departScout(w:World,p:Pawn):boolean {
  if(departureReason(w,p))return false;
  const s=w.scout;
  if(!s||s.phase!=='leaving')return false;
  const items=w.piles.filter(i=>'pawnId' in i.owner&&i.owner.pawnId===p.id);
  const entry={x:p.x,z:p.z};
  p.bedId=null;p.path=[];p.state='idle';p.planCooldown=0;p.moveCooldown=0;
  delete p.motion;delete p.shooting;delete p.stagger;delete p.stun;
  w.scout={phase:'travelling',pawn:p,items,foodPileId:s.foodPileId,quantity:s.quantity,startedAt:s.startedAt,departedAt:w.tick,returnAt:w.tick+SCOUT_TRIP_TICKS,consumed:0,entry};
  const ids=new Set(items.map(i=>i.id));
  w.piles=w.piles.filter(i=>!ids.has(i.id));
  w.pawns=w.pawns.filter(q=>q!==p);
  log(w,`${p.name} quitte la carte pour une reconnaissance de six heures avec ${s.quantity} repas de survie.`);
  return true;
}

function returnEntry(w:World,s:Extract<ScoutState,{phase:'travelling'|'awaiting-entry'}>):Cell|null {
  if(w.piles.length+s.items.length>32768)return null;
  return findCivilianReturnEntry(w,s.entry,c=>
    !w.piles.some(p=>p.owner.type==='ground'&&same(p.owner,c))
    &&!w.packed.some(p=>p.owner.type==='ground'&&same(p.owner,c))
    &&s.items.every(p=>p.owner.type!=='inventory'||groundCapacity(w,c,p.item)>=p.quantity));
}

function consumeTrailFood(w:World,s:Extract<ScoutState,{phase:'travelling'|'awaiting-entry'}>):void {
  const p=s.pawn;
  if(p.hunger>30||!foodAllowed(w,p,'survival-meal'))return;
  const pile=s.items.find(i=>i.id===s.foodPileId&&i.item==='survival-meal'&&i.owner.type==='inventory'&&i.owner.pawnId===p.id);
  if(!pile||pile.quantity<1)return;
  p.hunger=Math.min(100,p.hunger+ITEM_DEFINITIONS['survival-meal'].nutrition);
  pile.quantity--;s.consumed++;
  if(pile.quantity===0)s.items.splice(s.items.indexOf(pile),1);
  log(w,`${p.name} mange un repas de survie pendant la reconnaissance.`);
}

/** Only the bounded journey advances needs. A blocked return keeps the same
 * person and remaining goods off-map, without inventing a second journey. */
export function advanceScoutTrip(w:World):void {
  const s=w.scout;
  if(!s||onMap(s))return;
  // Biological age, expiring memories and daily skill maintenance follow the
  // confirmed clock even when a blocked return has stopped the journey.
  if(w.tick>s.departedAt){
    advanceHumanAge(w,s.pawn);tickSkills(w,s.pawn);expireSocialMemories(s.pawn,w.tick);expireMealMemories(w,s.pawn);
    // The supported scout begins healthy. Waiting at a sealed border does not
    // later replay a fictitious on-map exposure when the person returns.
    if(s.pawn.health)s.pawn.health.tick=w.tick;
  }
  if(s.phase==='travelling'&&w.tick>s.departedAt&&w.tick<=s.returnAt){
    const p=s.pawn;
    p.hunger=Math.max(0,p.hunger-(w.foodRules==='legacy'?.015:HUNGER_PER_TICK*adultHungerFactor(p.hunger))*malnutritionModifiers(p.health?.malnutrition).hungerFactor);
    updateRest(w,p);
    if(p.needCooldown>0)p.needCooldown--;
    consumeTrailFood(w,s);
  }
  if(w.tick<s.returnAt)return;
  if(s.phase==='awaiting-entry'&&(w.tick-s.returnAt)%SCOUT_RETURN_RETRY_TICKS!==0)return;
  const entry=returnEntry(w,s);
  if(!entry){s.phase='awaiting-entry';return;}
  s.pawn.x=entry.x;s.pawn.z=entry.z;s.pawn.path=[];s.pawn.state='idle';s.pawn.moveCooldown=0;s.pawn.planCooldown=0;
  delete s.pawn.motion;
  for(const pile of s.items)if(pile.owner.type==='inventory')pile.owner={type:'ground',...entry};
  w.pawns.push(s.pawn);w.piles.push(...s.items);delete w.scout;
  log(w,`${s.pawn.name} revient au bord de la colonie avec ses possessions restantes.`);
}

export { activeTask as scoutActiveTask,unstable as scoutUnstable };
