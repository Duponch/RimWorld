import { footprintCells } from '../sim/definitions';
import { furnitureIntentAt } from '../sim/furniture-rules';
import { choppable, harvestable, isPlant } from '../sim/plants';
import { sharesConstructionLayer } from '../sim/power-grid';
import { isRoofJob } from '../sim/roof-rules';
import type { Cell, Command, Job, MaterialPile, Resource, Structure, World } from '../sim/types';
import { mapObjectCells, type MapObjectSelection } from './map-object-selection';
import { mapObjectGroupCells } from './map-object-group-selection';

export type MapObjectActionId = 'mine' | 'chop' | 'harvest' | 'cut' | 'haul-chunks' | 'deconstruct' | 'cancel';
export interface MapObjectAction { id: MapObjectActionId; label: string; command: Command }
export interface MapObjectGroupAction { id: MapObjectActionId; label: string; commands: Command[] }
const same = (a: Cell, b: Cell) => a.x === b.x && a.z === b.z;
const contains = (job: Job, cell: Cell) => footprintCells(job).some(target => same(target, cell));
const cancellable = (job: Job) => job.kind !== 'repair' && job.kind !== 'fix-breakdown';
interface GroupLookups {
  resources?: Map<number, Resource>;
  firstResources?: Map<string, Resource>;
  piles?: Map<number, MaterialPile>;
  structures?: Map<number, Structure>;
}
const cellKey = (cell: Cell) => `${cell.x}:${cell.z}`;

/** A presentation offer, never command authority. Worker execution rechecks
 * eligibility, ownership and conservative drops against its current World.
 * No generic engine import or whole-map area index is needed for this menu. */
export function mapObjectActions(world: World, selected: MapObjectSelection): MapObjectAction[] {
  if (selected.kind === 'growing' || selected.kind === 'stockpile') return [];
  return actionsFor(world, selected, mapObjectCells(world, selected));
}

function actionsFor(world: World, selected: MapObjectSelection, cells: readonly Cell[], lookups?: GroupLookups): MapObjectAction[] {
  const cell = cells[0];
  if (!cell) return [];
  const actions: MapObjectAction[] = [];
  const firstAt = (at: Cell) => world.jobs.find(job => contains(job, at)) ?? furnitureIntentAt(world, at);
  const blocked = (kind: Job['kind'], targets: readonly Cell[], deconstruct = false) => world.jobs.some(job => !isRoofJob(job)
    && !(deconstruct && ['repair', 'fix-breakdown', 'flick'].includes(job.kind))
    && sharesConstructionLayer(job.furniture?.kind ?? job.deconstruction?.kind ?? job.flick?.kind ?? job.fixBreakdown?.kind ?? job.kind, kind)
    && footprintCells(job).some(at => targets.some(target => same(at, target))));
  const designate = (id: 'mine' | 'chop' | 'harvest' | 'cut', label: string) => {
    if (!blocked(id, [cell])) actions.push({ id, label, command: { type: 'designate', kind: id, x: cell.x, z: cell.z } });
  };
  let ownsJob: ((job: Job) => boolean) | undefined;
  if (selected.kind === 'rock' || selected.kind === 'resource') {
    const resource = selected.kind === 'resource' ? lookups?.resources
      ? lookups.resources.get(selected.id) : world.resources.find(resource => resource.id === selected.id) : undefined;
    if (selected.kind === 'rock' || resource?.kind === 'rock') {
      if (world.tiles[cell.z * world.width + cell.x]?.terrain === 'rock') designate('mine', 'Miner');
      ownsJob = job => job.kind === 'mine';
    } else if (resource && (lookups?.firstResources ? lookups.firstResources.get(cellKey(cell))
      : world.resources.find(resource => same(resource, cell)))?.id === selected.id) {
      if (choppable(world, resource)) designate('chop', 'Couper du bois');
      if (harvestable(world, resource)) designate('harvest', 'Récolter');
      if (isPlant(resource)) designate('cut', resource.blight ? 'Couper ce plant malade' : resource.kind === 'tree' ? 'Déraciner' : 'Couper les plantes');
      ownsJob = job => ['chop', 'harvest', 'cut'].includes(job.kind);
    }
  } else if (selected.kind === 'pile') {
    const pile = lookups?.piles ? lookups.piles.get(selected.id) : world.piles.find(pile => pile.id === selected.id);
    if (pile?.kind === 'chunk' && pile.owner.type === 'ground' && !pile.haulRequested) {
      actions.push({ id: 'haul-chunks', label: 'Transporter les fragments',
        command: { type: 'area', action: 'haul-chunks', from: { x: cell.x, z: cell.z }, to: { x: cell.x, z: cell.z } } });
    }
    // A haul flag is permission, not a cancellable Job. No synthetic cancel.
  } else if (selected.kind === 'structure') {
    const structure = lookups?.structures ? lookups.structures.get(selected.id) : world.structures.find(structure => structure.id === selected.id);
    if (structure && !world.jobs.some(job => job.furniture?.structureId === structure.id) && !blocked(structure.kind, cells, true)) {
      actions.push({ id: 'deconstruct', label: 'Déconstruire',
        command: { type: 'designate', kind: 'deconstruct', targetId: structure.id, x: structure.x, z: structure.z } });
    }
    ownsJob = job => job.deconstruction?.structureId === selected.id || job.furniture?.structureId === selected.id || job.flick?.structureId === selected.id;
  } else if (selected.kind === 'packed') ownsJob = job => job.furniture?.structureId === selected.id;
  else if (selected.kind === 'job') ownsJob = job => job.id === selected.id;
  // Coordinate cancellation resolves the FIRST matching Job, then furniture
  // source fallback. Offer a cell only when that exact intent belongs here.
  const cancelCell = ownsJob && cells.find(at => { const job = firstAt(at); return !!job && cancellable(job) && ownsJob!(job); });
  if (cancelCell) actions.push({ id: 'cancel', label: 'Annuler cet ordre', command: { type: 'cancel', x: cancelCell.x, z: cancelCell.z } });
  return actions;
}

/** Group UI keeps action order and submits each physical coordinate/target once.
 * Co-located buildings retain distinct targetIds; no aggregate command invented. */
export function mapObjectGroupActions(world: World, selected: readonly MapObjectSelection[]): MapObjectGroupAction[] {
  const groups = new Map<MapObjectActionId, MapObjectGroupAction>(), seen = new Set<string>();
  const objects = selected.filter(object => object.kind !== 'growing' && object.kind !== 'stockpile');
  const cells = mapObjectGroupCells(world, objects), lookups: GroupLookups = {};
  const idsFor = (kind: MapObjectSelection['kind']) => new Set(objects.filter(object => object.kind === kind).map(object => object.id));
  const resources = idsFor('resource'), piles = idsFor('pile'), structures = idsFor('structure');
  if (resources.size) {
    lookups.resources = new Map(); lookups.firstResources = new Map();
    const wantedCells = new Set(objects.flatMap((object, index) => object.kind === 'resource' ? cells[index]!.map(cellKey) : []));
    for (const resource of world.resources) {
      if (resources.has(resource.id) && !lookups.resources.has(resource.id)) lookups.resources.set(resource.id, resource);
      const key = cellKey(resource);
      if (wantedCells.has(key) && !lookups.firstResources.has(key)) lookups.firstResources.set(key, resource);
    }
  }
  if (piles.size) {
    lookups.piles = new Map();
    for (const pile of world.piles) if (piles.has(pile.id) && !lookups.piles.has(pile.id)) lookups.piles.set(pile.id, pile);
  }
  if (structures.size) {
    lookups.structures = new Map();
    for (const structure of world.structures) if (structures.has(structure.id) && !lookups.structures.has(structure.id)) lookups.structures.set(structure.id, structure);
  }
  for (let index = 0; index < objects.length; index++) for (const action of actionsFor(world, objects[index]!, cells[index]!, lookups)) {
    const key = JSON.stringify(action.command);
    if (seen.has(key)) continue;
    seen.add(key);
    const group = groups.get(action.id);
    if (group) group.commands.push(action.command);
    else groups.set(action.id, { id: action.id, label: action.label, commands: [action.command] });
  }
  return [...groups.values()];
}
