import { carrierOf } from './rescue-state.ts';
import { PRODUCTION_RECIPES, productionWorkTotal, taskRecipe } from './production-recipes.ts';
import { deconstructionAvailable } from './deconstruction-rules.ts';
import { constructionObstruction, constructionSiteFree, isConstruction } from './construction-rules.ts';
import { constructionRecipe, deliveredMaterial } from './construction-materials.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import { reservedDestination } from './materials.ts';
import { workType } from './work-planner.ts';
import { COOK_TICKS, INGREDIENT_UNITS } from './cooking-bills.ts';
import { REFUEL_WORK_TICKS } from './fuel.ts';
import { allowedFood, type FoodItemId } from './food-policy.ts';
import type { Job, JobDiagnostic, Pawn, World } from './types.ts';

// Pure presentation queries. No navigation flood or world mutation.
export function queryJobStatus(world: World, job: Job): JobDiagnostic {
  const costs = constructionRecipe(job).ingredients;
  const required = costs.reduce((n,c) => n+c.quantity,0), delivered = costs.reduce((n,c) => n+deliveredMaterial(world,job,c.item),0);
  const queued=job.reservedBy===null?undefined:world.pawns.find(p=>p.id===job.reservedBy&&p.orders.queue.includes(job.id));
  if(queued)return {code:'working',reason:`Réservé dans la file de ${queued.name}.`,delivered,required};
  if(job.kind==='deconstruct'&&!deconstructionAvailable(world,job,job.reservedBy??undefined))return {code:'blocked',reason:'Attend la fin de l’utilisation du bâtiment.',delivered,required};
  if(isConstruction(job)){
    const {plant,pile,pack}=constructionObstruction(world,job);
    if(plant||pile||pack)return {code:'clearing',reason:pack?'Attend le déplacement du meuble emballé hors de l’emprise.':plant?'Attend la coupe de la plante qui gêne le chantier.':`Attend le déplacement de ${pile!.quantity} unités hors de l’emprise.`,delivered,required};
    if(!constructionSiteFree(world,job,job.reservedBy??undefined))return {code:'blocked',reason:'Attend la libération de l’emprise par un colon en place ou en mouvement.',delivered,required};
  }
  if (job.reservedBy !== null) return { code: 'working', reason: 'Travail attribué à un colon.', delivered, required };
  if (required > delivered) {
    const shipping = reservedDestination(world, { type: 'job', jobId: job.id });
    return { code: shipping ? 'delivering' : 'missing-materials', reason: shipping ? `Livraison en cours : ${costs.map(c=>`${deliveredMaterial(world,job,c.item)}/${c.quantity} ${ITEM_DEFINITIONS[c.item].label}`).join(" + ")}.` : `Attend ${costs.filter(c=>deliveredMaterial(world,job,c.item)<c.quantity).map(c=>`${c.quantity-deliveredMaterial(world,job,c.item)} ${ITEM_DEFINITIONS[c.item].label}`).join(" + ")} ; vérifier Construction/Transport et l’accès.`, delivered, required };
  }
  const enabled = world.pawns.some(pawn => job.kind==='install'?pawn.priorities.build>0||pawn.priorities.haul>0:pawn.priorities[workType(job)]>0);
  return { code: enabled ? 'ready' : 'waiting-worker', reason: enabled ? 'Prêt ; attend un colon disponible et un accès.' : 'Travail désactivé pour tous les colons.', delivered, required };
}
export function queryPawnStatus(world: World, pawn: Pawn): { code: string; reason: string } {
  if(pawn.mental?.crisis)return {code:'mental-break',reason:'Errance triste : ne travaille plus et refuse les ordres. Cherche encore nourriture et sommeil en cas de besoin extrême.'};
  if(pawn.shooting)return {code:'shooting',reason:pawn.shooting.stance?.phase==='cooldown'?'Récupère après son tir.':pawn.shooting.order?.auto?.kind==='response'?'Riposte civile à une menace proche.':'Vise une cible depuis sa position.'};
  if(pawn.melee)return {code:'melee',reason:pawn.melee.strike?'Récupère après sa frappe.':'Rejoint ou frappe sa cible au contact.'};
  if(pawn.equipmentTask)return {code:'equipment',reason:({equip:'Rejoint son arme avant de l’équiper.',drop:'Dépose son arme au sol.',wear:pawn.state==='working'?'Enfile son vêtement.':'Rejoint le vêtement au sol.',remove:'Retire son vêtement avant de le déposer.'})[pawn.equipmentTask.action]};
  const carrier=carrierOf(world,pawn.id);
  if(carrier)return {code:'carried-patient',reason:`Transporté par ${carrier.name} vers un lit.`};
  if(pawn.feed)return {code:'feed',reason:`${pawn.feed.phase==='pickup'?'Prélève une portion pour':pawn.feed.phase==='deliver'?'Apporte une portion à':'Nourrit'} ${world.pawns.find(p=>p.id===pawn.feed!.patientId)?.name??'un patient'}.`};
    if(pawn.tend){
      const t=pawn.tend,target=t.patientId===pawn.id?'ses propres blessures':world.pawns.find(p=>p.id===t.patientId)?.name??'un patient';
      const supply=t.medicine?`avec ${ITEM_DEFINITIONS[t.medicine.item].label.toLowerCase()}`:'sans médicament';
      return {code:'tend',reason:t.phase==='pickup'?`Prélève ${ITEM_DEFINITIONS[t.medicine!.item].label.toLowerCase()} pour ${target}.`:t.phase==='find-medicine'?`Recherche une nouvelle dose pour ${target}.`:`${t.phase==='tend'?'Soigne':'Rejoint'} ${target} ${supply}.`};
    }
  if(pawn.state==='resting')return {code:'patient',reason:pawn.medicalSleep?'Dort pendant sa récupération médicale.':'Attend des soins ou récupère au lit, éveillé.'};
  if(pawn.rescue)return {code:'rescue',reason:`${pawn.rescue.phase==='carry'?'Porte':'Rejoint'} ${world.pawns.find(p=>p.id===pawn.rescue!.patientId)?.name??'un patient'} pour le secourir.`};
  if(pawn.state==='dead')return {code:'dead',reason:'Décédé ; dépouille conservée sur place. Le transport et les sépultures ne sont pas encore disponibles.'};
  if(pawn.state==='downed')return {code:'downed',reason:'Incapacité médicale : ne peut pas agir. Consultez ses blessures et ses capacités dans Santé.'};
  if(pawn.interruptedCargo)return {code:'interrupted-cargo',reason:'Travail interrompu ; cargaison conservée. Libérez une case de sol proche pour permettre son dépôt.'};
  if(pawn.recreation.task) {
    const task=pawn.recreation.task, activity=task.activity==='horseshoes'?'jouer aux fers à cheval':'observer le ciel';
    return {code:'recreation',reason:task.phase==='travel'?`Rejoint une place pour ${activity}.`:`Prend le temps de ${activity} (${Math.round(pawn.recreation.level)} %).`};
  }
  if(pawn.research)return {code:'research',reason:pawn.state==='working'?'Recherche Vêtements complexes au bureau.':'Rejoint son bureau de recherche.'};
  if(pawn.cooking) {
    const task=pawn.cooking,recipe=PRODUCTION_RECIPES[taskRecipe(task)];
    if(task.phase==='interrupted')return {code:'cooking-interrupted',reason:'Ingrédient perdu ; attend une case libre pour déposer la cargaison restante.'};
    if(task.phase==='work')return {code:'cooking',reason:`${task.recipe==='shirt'?'Confectionne une chemise':task.recipe==='tribalwear'?'Confectionne une tenue tribale':task.recipe==='stone-blocks'?'Taille des blocs de pierre':'Prépare un repas simple'} (${Math.floor(task.progress/productionWorkTotal(taskRecipe(task))*100)} %).`};
    if(task.phase==='output')return {code:'cooking-output',reason:task.storageId===null?'Porte le produit fabriqué vers un dépôt au sol.':'Porte le produit fabriqué vers sa réserve.'};
    if(task.ingredients.some(i=>i.item==='unfinished-tribalwear'||i.item==='unfinished-shirt'))return {code:'gathering-ingredients',reason:'Reprend son ouvrage inachevé au poste.'};
    const placed=task.ingredients.filter(i=>i.stage==='placed').reduce((n,i)=>n+i.quantity,0);
    return {code:'gathering-ingredients',reason:placed===recipe.units?'Ingrédients rassemblés ; rejoint sa place au poste.':`Rassemble les ingrédients (${placed}/${recipe.units} déposés au poste).`};
  }
  if(pawn.haul?.destination.type==='fuel') {
    const task=pawn.haul;
    return {code:'refueling',reason:task.phase==='pickup'?`Va prélever ${task.quantity} bois pour le combustible.`:task.serviceProgress?`Ravitaille le bâtiment (${Math.floor(task.serviceProgress/REFUEL_WORK_TICKS*100)} %).`:`Porte ${task.quantity} bois vers le bâtiment.`};
  }
  if (pawn.need?.kind === 'eat') return { code: pawn.need.phase, reason: pawn.need.phase === 'pickup' ? 'Va chercher une portion réservée.' : pawn.need.phase === 'choose-spot' ? 'Cherche une place pour manger sa portion.' : pawn.need.phase === 'travel' ? 'Porte sa portion vers sa place réservée.' : `Mange la portion tenue en main (${Math.floor(pawn.need.progress / 50 * 100)} %).` };
  if (pawn.need?.kind === 'sleep') return { code: pawn.need.phase, reason: pawn.need.phase === 'travel' ? pawn.need.bedId === null ? 'Libère le lit et cherche une place au sol.' : 'Se rend à son lit réservé.' : pawn.need.bedId === null ? 'Dort au sol ; aucun lit utilisable ou épuisement.' : 'Dort dans son lit.' };
  if(pawn.haul?.whole)return {code:pawn.haul.phase,reason:pawn.haul.phase==='pickup'?'Rejoint un meuble emballé réservé.':pawn.haul.destination.type==='aside'?'Déplace le meuble entier pour dégager l’emplacement.':'Porte le meuble entier vers sa réserve.'};
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
