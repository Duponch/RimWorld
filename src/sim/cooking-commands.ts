import { newCookingBill, validBillSettings } from './cooking-bills.ts';
import { releaseWork, type DropPlan } from './work-release.ts';
import type { Command, CommandResult, World } from './types.ts';

type BillCommand=Extract<Command,{type:'bill-add'|'bill-update'|'bill-remove'|'bill-move'}>;
export function applyBillCommand(world:World,command:BillCommand,drops:DropPlan):CommandResult {
  const station=world.structures.find(s=>s.id===command.structureId&&s.kind==='campfire');
  if(!station?.bills)return {ok:false,code:'missing-target',reason:'Poste de cuisine introuvable.'};
  if(command.type==='bill-add') {
    if(station.bills.length>=64||!Number.isSafeInteger(world.nextId+1))return {ok:false,code:'invalid-command',reason:'Limite de factures atteinte.'};
    station.bills.push(newCookingBill(world.nextId++));return {ok:true};
  }
  const index=station.bills.findIndex(b=>b.id===command.billId),bill=station.bills[index];
  if(!bill)return {ok:false,code:'missing-target',reason:'Facture introuvable.'};
  if(command.type==='bill-move') {
    if(command.direction!==1&&command.direction!==-1)return {ok:false,code:'invalid-command',reason:'Direction invalide.'};
    const next=index+command.direction;
    if(next<0||next>=station.bills.length)return {ok:false,code:'invalid-command',reason:'Extrémité de la liste.'};
    [station.bills[index],station.bills[next]]=[station.bills[next]!,bill];return {ok:true};
  }
  if(command.type==='bill-update'&&!validBillSettings(command.settings))return {ok:false,code:'invalid-command',reason:'Réglages de recette invalides.'};
  for(const pawn of world.pawns)if(pawn.cooking?.stationId===station.id&&pawn.cooking.billId===bill.id) {
    if(!releaseWork(world,pawn,drops))return {ok:false,code:'occupied',reason:'Aucune place pour conserver la cargaison.'};
  }
  if(command.type==='bill-remove')station.bills.splice(index,1);
  else {
    const s=command.settings;
    bill.mode=s.mode;bill.target=s.target;bill.suspended=s.suspended;bill.filters={rice:s.filters.rice,berries:s.filters.berries};bill.radius=s.radius;bill.destination=s.destination;
  }
  return {ok:true};
}
