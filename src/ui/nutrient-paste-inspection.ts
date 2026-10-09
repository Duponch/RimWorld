import { pasteAvailableUnits,pasteHoppers,pasteSpot,hopperAccepts } from '../sim/nutrient-paste';
import { footprintCells } from '../sim/definitions';
import { isPowerActive } from '../sim/power-rules';
import { reservedSource } from '../sim/materials';
import { ITEM_DEFINITIONS } from '../sim/items';
import type { Pawn,Structure,World } from '../sim/types';

export function pasteTaskLabel(world:World,pawn:Pawn):string|undefined {
  const eat=pawn.need?.kind==='eat'?pawn.need:undefined,task=eat?.paste?eat:pawn.feed?.paste?pawn.feed:undefined;
  if(!task)return;
  const patient=task===pawn.feed?world.pawns.find(p=>p.id===pawn.feed!.patientId):undefined;
  if(task.phase==='collect')return patient?`Récupère un repas de pâte nutritive pour ${patient.name}`:'Récupère un repas de pâte nutritive';
  if(task.phase==='pickup')return patient?`Rejoint le distributeur pour nourrir ${patient.name}`:'Rejoint le distributeur de pâte nutritive';
}

/** All counts describe current physical piles, never prospective output. */
export function nutrientPasteInspection(world:World,structure:Structure):string {
  if(structure.kind==='nutrient-paste-dispenser'){
    const state=structure.breakdown?'En panne':structure.power?.switchOn===false?'Arrêt manuel':isPowerActive(structure)?'Alimenté':'Sans alimentation';
    const hoppers=pasteHoppers(world,structure),units=pasteAvailableUnits(world,structure),spot=pasteSpot(structure);
    const operators=world.pawns.filter(p=>(p.need?.kind==='eat'&&p.need.paste?.dispenserId===structure.id&&(p.need.phase==='pickup'||p.need.phase==='collect'))||p.feed?.paste?.dispenserId===structure.id&&(p.feed.phase==='pickup'||p.feed.phase==='collect'));
    const operatorsText=operators.map(p=>`${p.name} ${p.need?.kind==='eat'&&p.need.phase==='collect'||p.feed?.phase==='collect'?'récupère son repas':'rejoint le distributeur'}`).join(', ');
    return `${state} · 200 W · ${hoppers.length} trémie(s) liée(s) · ${units} unité(s) crue(s) disponible(s) · ${units>=6?'six unités disponibles pour un repas':'six unités nécessaires pour un repas'} · Retrait en ${spot.x}, ${spot.z}${operatorsText?` · ${operatorsText}`:''} · 1 repas de 0,9 nutrition, récupéré sur place · Remplissage par Transport, priorité Important fixe · Le régime du mangeur ou du patient doit autoriser la pâte nutritive`;
  }
  if(structure.kind!=='hopper')return '';
  const dispensers=world.structures.filter(s=>s.kind==='nutrient-paste-dispenser'&&pasteHoppers(world,s).some(h=>h.id===structure.id));
  const adjacentPlan=world.jobs.some(j=>j.kind==='nutrient-paste-dispenser'&&footprintCells(j).some(c=>Math.abs(c.x-structure.x)+Math.abs(c.z-structure.z)===1));
  const piles=world.piles.filter(p=>p.owner.type==='ground'&&p.owner.x===structure.x&&p.owner.z===structure.z);
  const stock=piles.map(p=>`${p.quantity} ${ITEM_DEFINITIONS[p.item].label}${hopperAccepts(p.item)?` (${Math.max(0,p.quantity-reservedSource(world,p.id))} disponibles)`:' · aliment refusé'}`).join(', ')||'vide';
  return ` · Trémie sans énergie · ${dispensers.length} distributeur(s) lié(s)${!dispensers.length&&adjacentPlan?' · plan adjacent en construction':''} · Stock au sol : ${stock} · Aliments crus uniquement, filtre fixe · Priorité Important (3), fixe · Transport remplit à 35 % de la pile ou moins, en conservant son type · Aucune liaison diagonale · Le stock reste présent après retrait du distributeur`;
}
