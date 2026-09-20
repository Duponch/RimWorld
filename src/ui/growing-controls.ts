import type { Command, GrowingZone } from '../sim/types';
import { PLANT_DEFINITIONS } from '../sim/plants';
import { CROP_KINDS, type CropKind } from '../sim/crops';

const CULTURE_HELP:Record<CropKind,string>={
  rice:'Le riz mûr donne 6 unités. Cycle court, sensible à la fertilité : utile pour les premières récoltes.',
  potato:'Un plant mûr donne 11 pommes de terre. Cycle intermédiaire, moins pénalisé par le gravier ; le gain en terre riche est aussi plus faible. Conservation : 30 jours à température ambiante.',
  corn:'Un plant mûr donne 22 unités de maïs. Cycle long et sensible à la fertilité : prévoyez de quoi manger avant la récolte. Conservation : 60 jours à température ambiante.',
  cotton:'Le coton mûr donne 10 tissus. Cycle plus long que le riz ; le tissu sert à confectionner une tenue tribale, puis une chemise après recherche.',
};

export function growingControls(zone: GrowingZone, send: (command: Command) => void): HTMLElement {
  const panel = document.createElement('div'); panel.className = 'storage-settings';
  const heading = document.createElement('p'); heading.textContent = `Zone de culture · ${PLANT_DEFINITIONS[zone.plant].label} · ${zone.cells.length} cases`;
  panel.append(heading);
  const choice=document.createElement('label'),plant=document.createElement('select');plant.id='growing-plant';
  for(const kind of CROP_KINDS){const option=document.createElement('option');option.value=kind;option.textContent=PLANT_DEFINITIONS[kind].label;plant.append(option);}
  plant.value=zone.plant;choice.append('Culture ',plant);panel.append(choice);
  const help=document.createElement('p');help.className='muted';
  const updateHelp=()=>{help.textContent=CULTURE_HELP[plant.value as CropKind];};
  updateHelp();plant.addEventListener('change',updateHelp);
  panel.append(help);
  const controls = new Map<string, HTMLInputElement>();
  for (const [field, title] of [['allowSow', 'Autoriser les semis'], ['allowCut', 'Couper les plantes indésirables']] as const) {
    const label = document.createElement('label'), checkbox = document.createElement('input');
    checkbox.type = 'checkbox'; checkbox.checked = zone[field]; checkbox.id = `growing-${field}`;
    controls.set(field, checkbox); label.append(checkbox, title); panel.append(label);
  }
  const apply = document.createElement('button'); apply.className = 'secondary-action'; apply.textContent = 'Appliquer les réglages de culture';
  apply.onclick = () => send({type:'growing-policy',zoneId:zone.id,plant:plant.value as GrowingZone['plant'],allowSow:controls.get('allowSow')!.checked,allowCut:controls.get('allowCut')!.checked});
  panel.append(apply); return panel;
}
