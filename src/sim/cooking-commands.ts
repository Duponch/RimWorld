import {smithingRecipeAvailable267,isSmithingRecipe267} from './smithing-content-267.ts';
import {isSchema283OrLater} from './schema-compatibility-257.ts';
import {validBillWorkerPolicy283} from './bill-worker-rules-283.ts';
import {queryBillWorkerOptions283} from './bill-worker-owners-283.ts';
import {isSchema267OrLater} from './schema-compatibility-257.ts';
import {isBurnApparelRecipe} from './burn-apparel-rules.ts';
import {hasTravellingCargo,interruptWork} from './interrupted-cargo.ts';
import { productionResearchUnlocked } from './machining.ts';
import { isKibbleRecipe } from './fodder-recipes.ts';
import { isSmeltingRecipe } from './smelting-rules.ts';
import { isCremationRecipe } from './cremation-rules.ts';
import { PRODUCTION_RECIPES, stationAccepts, stationRecipe } from './production-recipes.ts';
import { isCookingOrder } from './order-types.ts';
import { newCookingBill, validBillSettings } from './cooking-bills.ts';
import { releaseWork, type DropPlan } from './work-release.ts';
import type { Command, CommandResult, World } from './types.ts';

type BillCommand=Extract<Command,{type:'bill-add'|'bill-update'|'bill-remove'|'bill-move'|'bill-worker-policy'}>;
export function applyBillCommand(world:World,command:BillCommand,drops:DropPlan):CommandResult {
  const station=world.structures.find(s=>s.id===command.structureId&&stationRecipe(s)!==null);
  if(!station?.bills)return {ok:false,code:'missing-target',reason:'Poste de production introuvable.'};
  if(command.type==='bill-add') {
    if(station.bills.length>=64||!Number.isSafeInteger(world.nextId+1))return {ok:false,code:'invalid-command',reason:'Limite de factures atteinte.'};
    const recipe=command.recipe??stationRecipe(station)!;if(isSmithingRecipe267(recipe)&&!smithingRecipeAvailable267(recipe,world.schemaVersion)||recipe==='smelt-apparel'&&!isSchema267OrLater(world.schemaVersion)||isBurnApparelRecipe(recipe)&&world.schemaVersion<251||recipe==='make-pemmican'&&world.schemaVersion<248||isKibbleRecipe(recipe)&&world.schemaVersion<227||isCremationRecipe(recipe)&&world.schemaVersion<225||isSmeltingRecipe(recipe)&&world.schemaVersion<222||!stationAccepts(station,recipe)||!productionResearchUnlocked(world,recipe))return {ok:false,code:'invalid-command',reason:'Recette indisponible : vérifiez le poste et sa recherche préalable.'};
    station.bills.push(newCookingBill(world.nextId++,recipe,world.schemaVersion));return {ok:true};
  }
  const index=station.bills.findIndex(b=>b.id===command.billId),bill=station.bills[index];
  if(!bill)return {ok:false,code:'missing-target',reason:'Facture introuvable.'};
  if(command.type==='bill-worker-policy') {
    if(!isSchema283OrLater(world.schemaVersion)||!validBillWorkerPolicy283(command.policy,world.nextId))return {ok:false,code:'invalid-command',reason:'Réglage de l’exécutant invalide.'};
    const policy=command.policy;
    if(policy.pawnId!==null&&policy.pawnId!==bill.worker?.pawnId&&!queryBillWorkerOptions283(world,station.id,bill.id)?.candidates.some(p=>p.pawnId===policy.pawnId&&p.enabled))return {ok:false,code:'invalid-command',reason:'Cette personne ne peut pas être désignée pour cette facture.'};
    // The job already admitted keeps its ingredients, author and queue place.
    // Only later searches/new orders consult the new preference.
    bill.worker={pawnId:policy.pawnId,skillMin:policy.skillMin,skillMax:policy.skillMax};
    return {ok:true,affected:1};
  }
  if(command.type==='bill-move') {
    if(command.direction!==1&&command.direction!==-1)return {ok:false,code:'invalid-command',reason:'Direction invalide.'};
    const next=index+command.direction;
    if(next<0||next>=station.bills.length)return {ok:false,code:'invalid-command',reason:'Extrémité de la liste.'};
    [station.bills[index],station.bills[next]]=[station.bills[next]!,bill];return {ok:true};
  }
  if(command.type==='bill-update'&&(!command.settings||typeof command.settings!=='object'||'worker'in command.settings||!validBillSettings(command.settings,bill.recipe,world.schemaVersion)))return {ok:false,code:'invalid-command',reason:'Réglages de recette invalides.'};
  for(const pawn of world.pawns)if(pawn.cooking?.stationId===station.id&&pawn.cooking.billId===bill.id) {
    if(isBurnApparelRecipe(pawn.cooking.recipe)&&hasTravellingCargo(world,pawn)){interruptWork(world,pawn,true);continue;}
    if(!releaseWork(world,pawn,drops))return {ok:false,code:'occupied',reason:'Aucune place pour conserver la cargaison.'};
  }
  for(const pawn of world.pawns)pawn.orders.queue=pawn.orders.queue.filter(o=>!isCookingOrder(o)||o.cooking.stationId!==station.id||o.cooking.billId!==bill.id);
  if(command.type==='bill-remove')station.bills.splice(index,1);
  else {
    const s=command.settings;
    bill.mode=s.mode;bill.target=s.target;bill.suspended=s.suspended;
    bill.filters=Object.fromEntries(PRODUCTION_RECIPES[bill.recipe].inputs.filter(i=>s.filters[i]!==undefined).map(i=>[i,s.filters[i]]));
    bill.radius=s.radius;bill.destination=s.destination;
    if(Object.hasOwn(s,'apparelCount'))bill.apparelCount={...s.apparelCount!};else delete bill.apparelCount;
    if(bill.recipe==='smelt-weapon'||bill.recipe==='smelt-apparel'||isBurnApparelRecipe(bill.recipe))bill.smeltFilter={...s.smeltFilter!};
    if(isCremationRecipe(bill.recipe))bill.cremationFilter={...s.cremationFilter!};
  }
  return {ok:true};
}
