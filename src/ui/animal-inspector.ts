import { animalSpecies } from '../sim/animal-species';
import { animalBodyModel } from '../sim/body-model';
import { foodPoisoningStage, FOOD_POISON_UNIT } from '../sim/food-poisoning';
import { BLOOD_UNIT, HP_UNIT, INJURY_RULES } from '../sim/injury-rules';
import { medicalBleed, medicalPain } from '../sim/injury-state';
import { INFECTION_UNIT, infectionStage } from '../sim/infection-rules';
import { MALNUTRITION_LABELS, MALNUTRITION_UNIT, malnutritionStage } from '../sim/malnutrition';
import type { World } from '../sim/types';
import { animalBody } from '../sim/wildlife-health';
import type { WildAnimal } from '../sim/wildlife-state';

export type AnimalInspectorTab = 'info' | 'health';
export interface AnimalInspectorOptions {
  onHunt: (animalId: number, enabled: boolean) => void;
  onClose: () => void;
}
export interface AnimalInspectorView {
  id: number;
  title: string;
  identity: string;
  activity: string;
  position: string;
  hunted: boolean;
  canHunt: boolean;
  species: readonly string[];
  needs: readonly string[];
  health: readonly string[];
}

const activity: Readonly<Record<WildAnimal['state'], string>> = {
  idle: 'Se repose', moving: 'Se déplace', eating: 'Mange', sleeping: 'Dort',
  hungry: 'Cherche à manger', downed: 'À terre', dead: 'Mort',
};
const poisonStage = { none: 'fin de récupération', initial: 'phase initiale', major: 'phase majeure', recovering: 'récupération' } as const;
const infectionLabel = { minor: 'mineure', major: 'majeure', extreme: 'extrême', critical: 'critique' } as const;
const percent = (value: number): string => `${Math.round(value * 100)} %`;

/** One selected-animal lookup; all other values come from that animal or its species definition. */
export function animalInspectorView(world: World, animalId: number): AnimalInspectorView | null {
  const animal = world.wildlife?.animals.find(candidate => candidate.id === animalId);
  if (!animal) return null;
  const species = animalSpecies(animal.species), health = animal.health;
  const model = animalBodyModel(animal.species), capacities = animalBody(animal).capacities;
  const state = animal.state === 'moving' && !animal.path.length && !animal.meal && (!animal.motion || animal.motion.end <= world.tick) ? 'idle' : animal.state;
  const currentActivity = animal.strike ? 'Riposte' : animal.threat ? 'Se défend' : animal.flee ? 'Fuit' : activity[state];
  const injuries = health?.injuries.map(injury => `${model.byId[injury.part].label} : ${injury.scar?.pain !== undefined ? 'Cicatrice' : INJURY_RULES[injury.kind].label}, −${(injury.severity / HP_UNIT).toFixed(2)} PV${injury.tended !== undefined ? ` (traitée, qualité ${Math.round(injury.tended / 10)} %)` : ''}`) ?? [];
  const missing = health?.missing.map(part => `${model.byId[part.part].label} : partie perdue${part.tended ? ' (plaie traitée)' : ''}`) ?? [];
  const cases = health?.infections?.cases.map(infection => `${model.byId[infection.part].label} : infection ${infectionLabel[infectionStage(infection.severity)]}, ${(infection.severity * 100 / INFECTION_UNIT).toFixed(1)} %`) ?? [];
  const condition = health?.death ? ['Mort · lésions conservées'] : !health ? ['Aucune lésion'] : [
    `${animal.state === 'downed' ? 'À terre · ' : ''}Douleur ${percent(medicalPain(health))} · Sang perdu ${(health.bloodLoss * 100 / BLOOD_UNIT).toFixed(1)} % · Saignement ${(medicalBleed(health) * 100).toFixed(1)} %/jour`,
  ];
  if (animal.state !== 'dead') condition.push(`Conscience ${percent(capacities.consciousness)} · Mobilité ${percent(capacities.moving)} · Vue ${percent(capacities.sight)} · Ouïe ${percent(capacities.hearing)}`);
  if (health?.malnutrition) condition.push(`Malnutrition ${MALNUTRITION_LABELS[malnutritionStage(health.malnutrition)]} : ${(health.malnutrition * 100 / MALNUTRITION_UNIT).toFixed(1)} %`);
  if (health?.foodPoisoning) condition.push(`Intoxication alimentaire · ${poisonStage[foodPoisoningStage(health.foodPoisoning)]} · ${(health.foodPoisoning.severity * 100 / FOOD_POISON_UNIT).toFixed(1)} %${health.foodPoisoning.vomit ? ' · Vomit' : ''}`);
  if (health?.infections?.cases.length) condition.push(`Immunité ${Math.min(100, health.infections.immunity * 100 / INFECTION_UNIT).toFixed(1)} %`);
  condition.push(...cases, ...injuries, ...missing);
  return {
    id: animal.id,
    title: `${species.label[0]!.toLocaleUpperCase('fr-FR')}${species.label.slice(1)} ${animal.id}`,
    identity: `${animal.sex === 'female' ? 'Femelle' : 'Mâle'} · sauvage`,
    activity: `${currentActivity}${animal.meal && state === 'moving' ? ' vers sa nourriture' : ''}`,
    position: `${animal.x}, ${animal.z}`,
    hunted: world.hunting?.targets.includes(animal.id) ?? false,
    canHunt: animal.state !== 'dead',
    species: [
      `Espèce : ${species.label}`,
      `Taille corporelle : ${species.bodySize.toLocaleString('fr-FR')}`,
      `Besoins alimentaires quotidiens : ${species.foodPerDay.toLocaleString('fr-FR')} unité de nutrition`,
    ],
    needs: [
      `Nourriture : ${percent(Math.max(0, Math.min(1, animal.food / species.nutrition)))}`,
      `Repos : ${percent(Math.max(0, Math.min(1, animal.rest)))}`,
    ],
    health: condition,
  };
}

export function animalInspectorScaffold(): string {
  const tabs: readonly { id: AnimalInspectorTab; label: string }[] = [
    { id: 'info', label: 'Info' }, { id: 'health', label: 'Santé' },
  ];
  return `<div class="animal-inspector-scroll"><header class="animal-inspector-summary"><div class="panel-heading"><h2 data-animal-title></h2><button type="button" data-animal-close aria-label="Fermer l’inspection">×</button></div><p data-animal-identity></p><p data-animal-activity></p><p data-animal-position></p></header><div class="animal-inspector-tabs" role="tablist" aria-label="Dossiers de l’animal">${tabs.map(tab => `<button type="button" role="tab" id="animal-tab-${tab.id}" aria-controls="animal-panel-${tab.id}" aria-selected="false" tabindex="-1" data-animal-tab="${tab.id}">${tab.label}</button>`).join('')}</div><div class="animal-inspector-pages">${tabs.map(tab => `<section role="tabpanel" id="animal-panel-${tab.id}" aria-labelledby="animal-tab-${tab.id}" tabindex="0" data-animal-panel="${tab.id}" hidden><div data-animal-content="${tab.id}"></div></section>`).join('')}</div><div class="animal-inspector-actions"><label><input type="checkbox" data-animal-hunt><span>Chasser</span></label></div></div>`;
}

function selectTab(root: HTMLElement, tab: AnimalInspectorTab): void {
  root.dataset.animalInspectorTab = tab;
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-animal-tab]')) {
    const selected = button.dataset.animalTab === tab;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  }
  for (const panel of root.querySelectorAll<HTMLElement>('[data-animal-panel]')) panel.hidden = panel.dataset.animalPanel !== tab;
}

/** Mount once per switch into animal selection. Updates keep tabs and their scroll state. */
export function createAnimalInspector(root: HTMLElement, options: AnimalInspectorOptions): void {
  if (root.querySelector('.animal-inspector-tabs')) return;
  root.classList.remove('colonist-inspector-host');
  root.classList.add('animal-inspector-host');
  root.innerHTML = animalInspectorScaffold();
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-animal-tab]')];
  for (const button of buttons) {
    button.addEventListener('click', () => selectTab(root, button.dataset.animalTab as AnimalInspectorTab));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = buttons.indexOf(button);
      const next = event.key === 'Home' ? buttons[0] : event.key === 'End' ? buttons.at(-1) : buttons[(index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length];
      if (next) { next.focus(); selectTab(root, next.dataset.animalTab as AnimalInspectorTab); }
    });
  }
  root.querySelector<HTMLButtonElement>('[data-animal-close]')!.onclick = options.onClose;
  root.querySelector<HTMLInputElement>('[data-animal-hunt]')!.onchange = event => {
    const id = Number(root.dataset.animalInspectorId);
    if (Number.isSafeInteger(id)) options.onHunt(id, (event.currentTarget as HTMLInputElement).checked);
  };
  selectTab(root, 'info');
}

function renderSections(root: HTMLElement, key: AnimalInspectorTab, groups: readonly { title: string; lines: readonly string[] }[]): void {
  const container = root.querySelector<HTMLElement>(`[data-animal-content="${key}"]`)!;
  const signature = JSON.stringify(groups);
  if (container.dataset.lines === signature) return;
  container.dataset.lines = signature;
  container.replaceChildren(...groups.map(group => {
    const section = document.createElement('section');
    section.className = 'animal-inspector-section';
    const heading = document.createElement('h3');
    heading.textContent = group.title;
    const facts = document.createElement('div');
    facts.className = 'animal-inspector-facts';
    for (const line of group.lines) {
      const paragraph = document.createElement('p');
      paragraph.className = 'animal-inspector-fact';
      const separator = line.indexOf(' : ');
      if (separator < 0) paragraph.textContent = line;
      else {
        const label = document.createElement('strong');
        label.textContent = line.slice(0, separator);
        paragraph.append(label, document.createTextNode(` : ${line.slice(separator + 3)}`));
      }
      facts.append(paragraph);
    }
    section.append(heading, facts);
    return section;
  }));
}

/** Returns false when the selected animal has left the world. */
export function updateAnimalInspector(root: HTMLElement, world: World, animalId: number): boolean {
  const view = animalInspectorView(world, animalId);
  if (!view || !root.querySelector('.animal-inspector-tabs')) return false;
  root.dataset.animalInspectorId = String(view.id);
  root.querySelector('[data-animal-title]')!.textContent = view.title;
  root.querySelector('[data-animal-identity]')!.textContent = view.identity;
  root.querySelector('[data-animal-activity]')!.textContent = view.activity;
  root.querySelector('[data-animal-position]')!.textContent = `Position ${view.position}`;
  const hunt = root.querySelector<HTMLInputElement>('[data-animal-hunt]')!;
  hunt.checked = view.hunted;
  hunt.disabled = !view.canHunt;
  renderSections(root, 'info', [
    { title: 'Espèce', lines: view.species },
    { title: 'Besoins', lines: view.needs },
  ]);
  renderSections(root, 'health', [{ title: 'État de santé', lines: view.health }]);
  return true;
}
