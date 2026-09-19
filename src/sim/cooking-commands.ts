import { PRODUCTION_RECIPES, stationAccepts, stationRecipe } from './production-recipes.ts';
import { isCookingOrder } from './order-types.ts';
import { newCookingBill, validBillSettings } from './cooking-bills.ts';
import { releaseWork, type DropPlan } from './work-release.ts';
import type { Command, CommandResult, World } from './types.ts';

type BillCommand=Extract<Command,{type:'bill-add'|'bill-update'|'bill-remove'|'bill-move'}>;
export function applyBillCommand(world:World,command:BillCommand,drops:DropPlan):CommandResult {
  const station=world.structures.find(s=>s.id===command.structureId&&stationRecipe(s)!==null);
  if(!station?.bills)return {ok:false,code:'missing-target',reason:'Poste de production introuvable.'};
  if(command.type==='bill-add') {
    if(station.bills.length>=64||!Number.isSafeInteger(world.nextId+1))return {ok:false,code:'invalid-command',reason:'Limite de factures atteinte.'};
    const recipe=command.recipe??stationRecipe(station)!;if(!stationAccepts(station,recipe))return {ok:false,code:'invalid-command',reason:'Recette indisponible sur ce poste.'};
    station.bills.push(newCookingBill(world.nextId++,recipe));return {ok:true};
  }
  const index=station.bills.findIndex(b=>b.id===command.billId),bill=station.bills[index];
  if(!bill)return {ok:false,code:'missing-target',reason:'Facture introuvable.'};
  if(command.type==='bill-move') {
    if(command.direction!==1&&command.direction!==-1)return {ok:false,code:'invalid-command',reason:'Direction invalide.'};
    const next=index+command.direction;
    if(next<0||next>=station.bills.length)return {ok:false,code:'invalid-command',reason:'Extrémité de la liste.'};
    [station.bills[index],station.bills[next]]=[station.bills[next]!,bill];return {ok:true};
  }
  if(command.type==='bill-update'&&!validBillSettings(command.settings,bill.recipe))return {ok:false,code:'invalid-command',reason:'Réglages de recette invalides.'};
  for(const pawn of world.pawns)if(pawn.cooking?.stationId===station.id&&pawn.cooking.billId===bill.id) {
    if(!releaseWork(world,pawn,drops))return {ok:false,code:'occupied',reason:'Aucune place pour conserver la cargaison.'};
  }
  for(const pawn of world.pawns)pawn.orders.queue=pawn.orders.queue.filter(o=>!isCookingOrder(o)||o.cooking.stationId!==station.id||o.cooking.billId!==bill.id);
  if(command.type==='bill-remove')station.bills.splice(index,1);
  else {
    const s=command.settings;
    bill.mode=s.mode;bill.target=s.target;bill.suspended=s.suspended;bill.filters=Object.fromEntries(PRODUCTION_RECIPES[bill.recipe].inputs.map(i=>[i,s.filters[i]]));bill.radius=s.radius;bill.destination=s.destination;
  }
  return {ok:true};
}
