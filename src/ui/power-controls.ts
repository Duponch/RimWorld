import { footprintContains } from '../sim/definitions';
import { canFlickPower, actualPowerSwitch } from '../sim/power-flick';
import { isElectrical } from '../sim/power-rules';
import { buildingLabels } from './building-labels';
import { powerInspection } from './power-inspection';
import type { Cell, Command, World } from '../sim/types';

/** A cable under a wall remains inspectable and removable by its identity. */
export function updatePowerControls(root: HTMLElement, world: World, cell: Cell, send: (command: Command) => void): void {
  let section = root.querySelector<HTMLElement>('[data-power-controls]');
  if (!section) {
    section = document.createElement('section'); section.dataset.powerControls = '';
    section.className = 'power-controls'; section.setAttribute('aria-label', 'Électricité'); root.append(section);
  }
  const structures = world.structures.filter(s => isElectrical(s.kind) && footprintContains(s, cell));
  section.hidden = !structures.length;
  for (const card of section.querySelectorAll<HTMLElement>('[data-power-id]')) {
    if (!structures.some(s => s.id === Number(card.dataset.powerId))) card.remove();
  }
  for (const structure of structures) {
    let card = section.querySelector<HTMLElement>(`[data-power-id="${structure.id}"]`);
    if (!card) {
      card = document.createElement('div'); card.dataset.powerId = String(structure.id);
      card.innerHTML = '<h3></h3><p data-power-state></p><p data-power-request role="status"></p><button type="button" data-power-flick class="secondary-action"></button><button type="button" data-power-remove class="secondary-action">Déconstruire ce câble</button>';
      section.append(card);
    }
    card.dataset.powerKind = structure.kind;
    card.querySelector('h3')!.textContent = buildingLabels[structure.kind];
    card.querySelector('[data-power-state]')!.textContent = powerInspection(world, structure).replace(/^ · /, '');
    const pending = world.jobs.find(j => j.flick?.structureId === structure.id);
    const removing = world.jobs.some(j => j.deconstruction?.structureId === structure.id);
    card.querySelector('[data-power-request]')!.textContent = pending ? `${pending.flick!.on ? 'Mise en marche' : 'Arrêt'} demandé · attend l’intervention d’un colon (Tâches élémentaires).` : '';
    const flick = card.querySelector<HTMLButtonElement>('[data-power-flick]')!;
    flick.hidden = !canFlickPower(structure); flick.disabled = removing;
    flick.textContent = pending ? 'Annuler la demande' : actualPowerSwitch(structure) ? 'Demander l’arrêt' : 'Demander la mise en marche';
    flick.onclick = () => send({type: 'power-flick', structureId: structure.id, on: pending ? actualPowerSwitch(structure) : !actualPowerSwitch(structure)});
    const remove = card.querySelector<HTMLButtonElement>('[data-power-remove]')!;
    remove.hidden = structure.kind !== 'power-conduit'; remove.disabled = removing;
    remove.onclick = () => send({type: 'designate', kind: 'deconstruct', targetId: structure.id, x: structure.x, z: structure.z});
  }
}
