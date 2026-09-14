import { deconstructionAvailable } from './deconstruction-rules.ts';
import { constructionObstruction, constructionSiteFree, isConstruction } from './construction-rules.ts';
import { JOB_WOOD_COST } from './definitions.ts';
import { deliveredStock, reservedDestination } from './materials.ts';
import { workType } from './work-planner.ts';
import { COOK_TICKS, INGREDIENT_UNITS } from './cooking-bills.ts';
import { REFUEL_WORK_TICKS } from './fuel.ts';
import { allowedFood, type FoodItemId } from './food-policy.ts';
import type { Job, JobDiagnostic, Pawn, World } from './types.ts';

// Pure presentation queries. No navigation flood or world mutation.
export function queryJobStatus(world: World, job: Job): JobDiagnostic {
  const delivered = deliveredStock(world, job.id).wood; const required = JOB_WOOD_COST[job.kind];
  const queued=job.reservedBy===null?undefined:world.pawns.find(p=>p.id===job.reservedBy&&p.orders.queue.includes(job.id));
  if(queued)return {code:'working',reason:`Réservé dans la file de ${queued.name}.`,delivered,required};
  if(job.kind==='deconstruct'&&!deconstructionAvailable(world,job,job.reservedBy??undefined))return {code:'blocked',reason:'Attend la fin de l’utilisation du bâtiment.',delivered,required};
  if(isConstruction(job)){
    const {plant,pile}=constructionObstruction(world,job);
    if(plant||pile)return {code:'clearing',reason:plant?'Attend la coupe de la plante qui gêne le chantier.':`Attend le déplacement de ${pile!.quantity} unités hors de l’emprise.`,delivered,required};
    if(!constructionSiteFree(world,job,job.reservedBy??undefined))return {code:'blocked',reason:'Attend la libération de l’emprise par un colon en place ou en mouvement.',delivered,required};
  }
  if (job.reservedBy !== null) return { code: 'working', reason: 'Travail attribué à un colon.', delivered, required };
  if (required > delivered) {
    const shipping = reservedDestination(world, { type: 'job', jobId: job.id });
    return { code: shipping ? 'delivering' : 'missing-materials', reason: shipping ? `Livraison en cours : ${delivered}/${required} bois reçus.` : `Attend ${required - delivered} bois livrés ; vérifier Construction/Transport et l’accès.`, delivered, required };
  }
  const enabled = world.pawns.some(pawn => pawn.priorities[workType(job)] > 0);
  return { code: enabled ? 'ready' : 'waiting-worker', reason: enabled ? 'Prêt ; attend un colon disponible et un accès.' : 'Travail désactivé pour tous les colons.', delivered, required };
}
export function queryPawnStatus(world: World, pawn: Pawn): { code: string; reason: string } {
  if(pawn.recreation.task) {
    const task=pawn.recreation.task, activity=task.activity==='horseshoes'?'jouer aux fers à cheval':'observer le ciel';
    return {code:'recreation',reason:task.phase==='travel'?`Rejoint une place pour ${activity}.`:`Prend le temps de ${activity} (${Math.round(pawn.recreation.level)} %).`};
  }
  if(pawn.cooking) {
    const task=pawn.cooking;
    if(task.phase==='interrupted')return {code:'cooking-interrupted',reason:'Ingrédient perdu ; attend une case libre pour déposer la cargaison restante.'};
    if(task.phase==='work')return {code:'cooking',reason:`Prépare un repas simple (${Math.floor(task.progress/COOK_TICKS*100)} %).`};
    if(task.phase==='output')return {code:'cooking-output',reason:task.storageId===null?'Porte le repas préparé vers un dépôt au sol.':'Porte le repas préparé vers sa réserve.'};
    const placed=task.ingredients.filter(i=>i.stage==='placed').reduce((n,i)=>n+i.quantity,0);
    return {code:'gathering-ingredients',reason:placed===INGREDIENT_UNITS?'Ingrédients rassemblés ; rejoint sa place au feu.':`Rassemble les ingrédients (${placed}/${INGREDIENT_UNITS} déposés au poste).`};
  }
  if(pawn.haul?.destination.type==='fuel') {
    const task=pawn.haul;
    return {code:'refueling',reason:task.phase==='pickup'?`Va prélever ${task.quantity} bois pour le feu.`:task.serviceProgress?`Recharge le feu (${Math.floor(task.serviceProgress/REFUEL_WORK_TICKS*100)} %).`:`Porte ${task.quantity} bois vers le feu.`};
  }
  if (pawn.need?.kind === 'eat') return { code: pawn.need.phase, reason: pawn.need.phase === 'pickup' ? 'Va chercher une portion réservée.' : pawn.need.phase === 'choose-spot' ? 'Cherche une place pour manger sa portion.' : pawn.need.phase === 'travel' ? 'Porte sa portion vers sa place réservée.' : `Mange la portion tenue en main (${Math.floor(pawn.need.progress / 50 * 100)} %).` };
  if (pawn.need?.kind === 'sleep') return { code: pawn.need.phase, reason: pawn.need.phase === 'travel' ? pawn.need.bedId === null ? 'Libère le lit et cherche une place au sol.' : 'Se rend à son lit réservé.' : pawn.need.bedId === null ? 'Dort au sol ; aucun lit utilisable ou épuisement.' : 'Dort dans son lit.' };
  if (pawn.haul) return { code: pawn.haul.phase, reason: pawn.haul.destination.type === 'aside' ? `Libère ${pawn.haul.destination.constructionId===undefined?'les cultures':'le chantier'} : ${pawn.haul.quantity} unités à déplacer.` : pawn.haul.phase === 'pickup' ? `Va prélever ${pawn.haul.quantity} unités réservées.` : `Porte ${pawn.haul.quantity} unités vers ${pawn.haul.destination.type === 'job' ? 'un chantier' : 'le stockage'}.` };
  if (pawn.jobId !== null) return { code: 'working', reason: pawn.state === 'moving' ? 'Se rend à son travail.' : 'Travaille sur sa cible.' };
  if (pawn.state === 'sleeping') return { code: 'sleeping', reason: 'Se repose.' };
  if (pawn.state === 'hungry') {
    const allowed = allowedFood(world, pawn);
    const stock = world.piles.filter(p => p.kind === 'food' && (p.owner.type === 'ground' || p.owner.type === 'pawn' && p.owner.pawnId === pawn.id));
    if (stock.length && !stock.some(p => allowed.includes(p.item as FoodItemId))) return {code: 'food-policy-blocked', reason: 'Le régime exclut tous les aliments au sol ou en main. Modifier le régime ou produire un aliment autorisé.'};
    return { code: 'hungry', reason: 'Faim critique ; attend de la nourriture autorisée et accessible.' };
  }
  return { code: world.jobs.length ? 'waiting' : 'idle', reason: world.jobs.length ? 'Aucun travail actuellement admissible : priorités, matériaux ou accès à vérifier.' : 'Aucun travail admissible actuellement.' };
}
