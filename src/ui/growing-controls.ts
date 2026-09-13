import type { Command, GrowingZone } from '../sim/types';

export function growingControls(zone: GrowingZone, send: (command: Command) => void): HTMLElement {
  const panel = document.createElement('div'); panel.className = 'storage-settings';
  const heading = document.createElement('p'); heading.textContent = `Zone de culture · Riz · ${zone.cells.length} cases`;
  panel.append(heading);
  const controls = new Map<string, HTMLInputElement>();
  for (const [field, title] of [['allowSow', 'Autoriser les semis'], ['allowCut', 'Couper les plantes indésirables']] as const) {
    const label = document.createElement('label'), checkbox = document.createElement('input');
    checkbox.type = 'checkbox'; checkbox.checked = zone[field]; checkbox.id = `growing-${field}`;
    controls.set(field, checkbox); label.append(checkbox, title); panel.append(label);
  }
  const apply = document.createElement('button'); apply.className = 'secondary-action'; apply.textContent = 'Appliquer les réglages de culture';
  apply.onclick = () => send({type:'growing-policy',zoneId:zone.id,allowSow:controls.get('allowSow')!.checked,allowCut:controls.get('allowCut')!.checked});
  panel.append(apply); return panel;
}
