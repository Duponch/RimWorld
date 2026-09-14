import { JOB_WOOD_COST } from './definitions.ts';
import { deliveredStock, reservedDestination } from './materials.ts';
import { workType } from './work-planner.ts';
import { COOK_TICKS, INGREDIENT_UNITS } from './cooking-bills.ts';
import { REFUEL_WORK_TICKS } from './fuel.ts';
import type { Job, JobDiagnostic, Pawn, World } from './types.ts';

// Pure presentation queries. No navigation flood or world mutation.
export function queryJobStatus(world: World, job: Job): JobDiagnostic {
  const delivered = deliveredStock(world, job.id).wood; const required = JOB_WOOD_COST[job.kind];
  if (job.reservedBy !== null) return { code: 'working', reason: 'Travail attribué à un colon.', delivered, required };
  if (required > delivered) {
    const shipping = reservedDestination(world, { type: 'job', jobId: job.id });
    return { code: shipping ? 'delivering' : 'missing-materials', reason: shipping ? `Livraison en cours : ${delivered}/${required} bois reçus.` : `Attend ${required - delivered} bois livrés ; vérifier le transport et l’accès.`, delivered, required };
  }
  const enabled = world.pawns.some(pawn => pawn.priorities[workType(job)] > 0);
  return { code: enabled ? 'ready' : 'waiting-worker', reason: enabled ? 'Prêt ; attend un colon disponible et un accès.' : 'Travail désactivé pour tous les colons.', delivered, required };
}
export function queryPawnStatus(world: World, pawn: Pawn): { code: string; reason: string } {
  if(pawn.cooking) {
    const task=pawn.cooking;
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
  if (pawn.haul) return { code: pawn.haul.phase, reason: pawn.haul.destination.type === 'aside' ? `Libère les cultures : ${pawn.haul.quantity} unités à déplacer hors des champs.` : pawn.haul.phase === 'pickup' ? `Va prélever ${pawn.haul.quantity} unités réservées.` : `Porte ${pawn.haul.quantity} unités vers ${pawn.haul.destination.type === 'job' ? 'un chantier' : 'le stockage'}.` };
  if (pawn.jobId !== null) return { code: 'working', reason: pawn.state === 'moving' ? 'Se rend à son travail.' : 'Travaille sur sa cible.' };
  if (pawn.state === 'sleeping') return { code: 'sleeping', reason: 'Se repose.' };
  if (pawn.state === 'hungry') return { code: 'hungry', reason: 'Faim critique ; attend de la nourriture ou une récolte accessible.' };
  return { code: world.jobs.length ? 'waiting' : 'idle', reason: world.jobs.length ? 'Aucun travail actuellement admissible : priorités, matériaux ou accès à vérifier.' : 'Aucun travail admissible actuellement.' };
}
