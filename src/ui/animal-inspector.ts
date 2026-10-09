import { animalSpecies } from '../sim/animal-species';
import { animalBodyModel } from '../sim/body-model';
import { foodPoisoningStage, FOOD_POISON_UNIT } from '../sim/food-poisoning';
import { BLOOD_UNIT, HP_UNIT, INJURY_RULES } from '../sim/injury-rules';
import { medicalBleed, medicalPain } from '../sim/injury-state';
import { INFECTION_UNIT, infectionStage } from '../sim/infection-rules';
import { MALNUTRITION_LABELS, MALNUTRITION_UNIT, malnutritionStage } from '../sim/malnutrition';
import type { World } from '../sim/types';
import { animalBody } from '../sim/wildlife-health';
import { handlingSkill,tameRefusal } from '../sim/animal-handling';
import { MEDICAL_CARE,type MedicalCare } from '../sim/medicine-rules';
import { isColonist } from '../sim/affiliation';
import { animalPenStatus } from './pen-status';
import { animalActivity } from './animal-activity';
import { ANIMAL_PRODUCTS, productFullness, productKind } from '../sim/animal-products';
import { animalBodySize,animalFoodPerDay,animalLifeStage,animalNutritionMax,gestationTicks } from '../sim/animal-life';
import { animalCareTargets } from '../sim/animal-care';
import { veterinaryCareSpeciesAllowed,veterinaryNeedsRest } from '../sim/veterinary-rules';
import { ANIMAL_FEED_HUNGER,ANIMAL_FEED_TICKS,animalFeedingPatientReady } from '../sim/animal-feeding-rules';
import { ITEM_DEFINITIONS } from '../sim/items';
import type { WildAnimal } from '../sim/wildlife-state';

export type AnimalInspectorTab = 'info' | 'health';
export interface AnimalInspectorOptions {
  onHunt: (animalId: number, enabled: boolean) => void;
  onTame?: (animalId: number, enabled: boolean) => void;
  onCarePolicy?: (animalId: number, care: MedicalCare) => void;
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
  canTame:boolean;
  tameDesignated:boolean;
  tameReason:string;
  domestic:boolean;
  care?:MedicalCare;
  careAvailable:boolean;
  dead:boolean;
  species: readonly string[];
  needs: readonly string[];
  health: readonly string[];
}

const poisonStage = { none: 'fin de récupération', initial: 'phase initiale', major: 'phase majeure', recovering: 'récupération' } as const;
const infectionLabel = { minor: 'mineure', major: 'majeure', extreme: 'extrême', critical: 'critique' } as const;
const percent = (value: number): string => `${Math.round(value * 100)} %`;
const stageLabel={baby:'Petit',juvenile:'Jeune',adult:'Adulte'} as const;

/** Describes published clinical ownership; it does not reserve a doctor,
 * inspect reachable medicine or turn a policy into a manual treatment order. */
function veterinaryLines(world:World,animal:WildAnimal):string[] {
  if(!animal.domestic)return [];
  if(animal.state==='dead'||animal.health?.death)return ['Soins vétérinaires : animal décédé.'];
  if(!veterinaryCareSpeciesAllowed(animal.species,world.schemaVersion))return ['Soins vétérinaires : indisponibles pour cette espèce dans cette sauvegarde.'];
  const lines=[`Politique médicale : ${MEDICAL_CARE[animal.domestic.care]}`];
  if(animal.domestic.care==='none')lines.push('Soins vétérinaires : interdits par la politique médicale.');
  else if(animal.manhunter||animal.burning||animal.flee||animal.threat||animal.retaliation)lines.push('Soins vétérinaires : en attente de sécurité ; le danger reste prioritaire.');
  else {
    const doctor=world.pawns.find(p=>p.animalCare?.animalId===animal.id),task=doctor?.animalCare;
    if(doctor&&task){
      const medicine=task.medicine?ITEM_DEFINITIONS[task.medicine.item].label:undefined;
      lines.push(`Soigneur : ${doctor.name}`);
      lines.push(task.phase==='pickup'?`Soins vétérinaires : collecte de ${medicine??'médicaments'}.`:
        task.phase==='approach'?`Soins vétérinaires : rejoint l’animal${medicine?` avec ${medicine}`:' pour des soins sans médicament'}.`:
        `Soins vétérinaires : pansement en cours${task.duration?` · ${percent(Math.min(1,task.progress/task.duration))}`:''}${medicine?` · ${medicine}`:' · sans médicament'}.`);
    }else if(animalCareTargets(animal).length){
      const lying=(animal.state==='sleeping'||animal.state==='downed')&&(!animal.motion||animal.motion.end<=world.tick);
      lines.push(lying?'Soins vétérinaires : pansements nécessaires ; en attente d’un médecin disponible et d’un accès sûr.':'Soins vétérinaires : pansements nécessaires ; l’animal doit dormir ou être à terre, sans déplacement engagé.');
    }else if(animal.health&&veterinaryNeedsRest(animal.health))lines.push('Récupération : plaies déjà pansées ou immunité en cours ; repos au sol selon la faim et le danger.');
    else lines.push('Soins vétérinaires : aucun pansement nécessaire actuellement.');
  }
  lines.push('Soins au sol : aucun bonus de lit hospitalier ou de moniteur vital.');
  return lines;
}

/** Published tasks describe work actually owned by a doctor. Waiting text
 * does not claim food availability or reserve a patient while inspecting. */
function animalFeedingLines(world:World,animal:WildAnimal):string[] {
  if(!animal.domestic||animal.state==='dead'||animal.health?.death)return [];
  if(world.schemaVersion<214)return ['Alimentation assistée : indisponible ; les pansements ne nourrissent pas un animal immobilisé.'];
  if(!veterinaryCareSpeciesAllowed(animal.species,world.schemaVersion))return ['Alimentation assistée : indisponible pour cette espèce.'];
  const doctor=world.pawns.find(p=>p.animalFeed?.animalId===animal.id),task=doctor?.animalFeed;
  if(doctor&&task){
    const pile=world.piles.find(p=>p.id===(task.phase==='pickup'?task.sourcePileId:task.carryPileId));
    const portion=pile?`${task.quantity} × ${ITEM_DEFINITIONS[pile.item].label}`:'la portion réservée';
    return [`Alimentation assistée · soigneur : ${doctor.name}`,
      task.phase==='pickup'?`Collecte de nourriture : ${portion}.`:
      task.phase==='deliver'?`Apport de nourriture : rejoint l’animal avec ${portion}.`:
      `Alimentation au contact : ${percent(Math.min(1,task.progress/ANIMAL_FEED_TICKS))} · ${portion}.`];
  }
  if(animal.manhunter||animal.burning||animal.flee||animal.threat||animal.retaliation||animal.strike)
    return ['Alimentation assistée : en attente de sécurité ; le danger reste prioritaire.'];
  if(animal.food<=animalNutritionMax(animal)*ANIMAL_FEED_HUNGER&&animalFeedingPatientReady(world,animal))return ['Alimentation assistée : en attente d’un médecin disponible, d’une portion compatible et d’un accès sûr.','La politique médicale ne bloque pas l’apport de nourriture.'];
  return ['Alimentation assistée : réservée aux animaux affamés à terre ou au repos médical, physiquement arrêtés.'];
}

/** One selected-animal lookup; all other values come from that animal or its species definition. */
export function animalInspectorView(world: World, animalId: number): AnimalInspectorView | null {
  const animal = world.wildlife?.animals.find(candidate => candidate.id === animalId);
  if (!animal) return null;
  const species = animalSpecies(animal.species), health = animal.health,stage=animalLifeStage(animal);
  const model = animalBodyModel(animal.species), capacities = animalBody(animal).capacities;
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
  const minimum=handlingSkill(animal.species);
  const tameReason=tameRefusal(world,animal),qualified=world.pawns.some(p=>isColonist(p)&&p.priorities.handle>0&&(p.skills.animals?.level??0)>=minimum&&p.state!=='dead'&&p.state!=='downed');
  const handling=tameReason??(qualified
    ? `Animaux ${minimum} minimum · deux nourrissages physiques par tentative.`
    : `Aucun dresseur actif de niveau Animaux ${minimum} ; la désignation attendra un colon qualifié et de la nourriture.`);
  const penStatus=animalPenStatus(world,animal);
  const product=animal.domestic?productKind(animal):undefined;
  const productLabel=product==='milk'?'Lait':'Laine de mufalo';
  const productWork=product==='milk'?'Traite':'Tonte';
  const productTask=product&&world.pawns.find(pawn=>pawn.animalHandling?.animalId===animal.id&&pawn.animalHandling.kind===product)?.animalHandling;
  const productLines=product?[
    `${productLabel} : ${percent(Math.max(0,Math.min(1,productFullness(animal))))} de maturité${productFullness(animal)>=1?' · prêt à récolter':''}`,
    ...(productTask?[`${productWork} : ${productTask.phase==='interact'?`${percent(Math.max(0,Math.min(1,productTask.progress/ANIMAL_PRODUCTS[product].work)))} du travail`:'en approche'}`]:[]),
  ]:[];
  const pregnancy=animal.pregnancy?[
    `Gestation : ${percent(Math.min(1,animal.pregnancy.progress/gestationTicks(animal.species)))} · père ${animal.pregnancy.fatherId}`,
  ]:[];
  const parentage=animal.parents?[
    `Parents : mère ${animal.parents.motherId} · père ${animal.parents.fatherId}`,
  ]:[];
  return {
    id: animal.id,
    title: `${species.label[0]!.toLocaleUpperCase('fr-FR')}${species.label.slice(1)} ${animal.id}`,
    identity: `${animal.sex === 'female' ? 'Femelle' : 'Mâle'} · ${stageLabel[stage]} · ${animal.domestic?(penStatus?'domestique':'domestique libre'):'sauvage'}`,
    activity: animalActivity(world,animal),
    position: `${animal.x}, ${animal.z}`,
    hunted: world.hunting?.targets.includes(animal.id) ?? false,
    canHunt: animal.state !== 'dead'&&!animal.domestic,
    canTame:!tameReason,
    tameDesignated:!!animal.taming?.designated,
    tameReason:handling,
    domestic:!!animal.domestic,
    care:animal.domestic?.care,
    careAvailable:!!animal.domestic&&veterinaryCareSpeciesAllowed(animal.species,world.schemaVersion),
    dead:animal.state==='dead',
    species: [
      `Espèce : ${species.label}`,
      ...(animal.manhunter?['État : rage temporaire · attaque les humains','Récupération : durée variable ; le sommeil ordinaire ne met pas fin à la rage']:[]),
      `Régime : ${species.predator?'carnivore · viande, repas et dépouilles fraîches':'herbivore'}`,
      `Stade de vie : ${stageLabel[stage]}`,
      `Âge : ${(animal.ageTicks/6000).toLocaleString('fr-FR',{maximumFractionDigits:1})} jour(s)`,
      `Taille corporelle : ${animalBodySize(animal).toLocaleString('fr-FR')}`,
      `Besoins alimentaires quotidiens : ${animalFoodPerDay(animal).toLocaleString('fr-FR')} unité de nutrition`,
      animal.domestic?`Familiarité : ${animal.domestic.tameness} / 5`:`Apprivoisement : ${handling}`,
      ...(penStatus?[`Enclos : ${penStatus}`]:[]),
      ...parentage,
      ...pregnancy,
      ...productLines,
    ],
    needs: [
      `Nourriture : ${percent(Math.max(0, Math.min(1, animal.food / animalNutritionMax(animal))))}`,
      `Repos : ${percent(Math.max(0, Math.min(1, animal.rest)))}`,
    ],
    health:[...(animal.domestic&&!penStatus?['Statut : domestique libre']:[]),...veterinaryLines(world,animal),...animalFeedingLines(world,animal),...condition],
  };
}

export function animalInspectorScaffold(): string {
  const tabs: readonly { id: AnimalInspectorTab; label: string }[] = [
    { id: 'info', label: 'Info' }, { id: 'health', label: 'Santé' },
  ];
  return `<div class="animal-inspector-scroll"><header class="animal-inspector-summary"><div class="panel-heading"><h2 data-animal-title></h2><button type="button" data-animal-close aria-label="Fermer l’inspection">×</button></div><p data-animal-identity></p><p data-animal-activity></p><p data-animal-position></p></header><div class="animal-inspector-tabs" role="tablist" aria-label="Dossiers de l’animal">${tabs.map(tab => `<button type="button" role="tab" id="animal-tab-${tab.id}" aria-controls="animal-panel-${tab.id}" aria-selected="false" tabindex="-1" data-animal-tab="${tab.id}">${tab.label}</button>`).join('')}</div><div class="animal-inspector-pages">${tabs.map(tab => `<section role="tabpanel" id="animal-panel-${tab.id}" aria-labelledby="animal-tab-${tab.id}" tabindex="0" data-animal-panel="${tab.id}" hidden><div data-animal-content="${tab.id}"></div>${tab.id==='health'?`<label class="animal-care-policy" data-animal-care-wrap>Politique de soins <select data-animal-care>${Object.entries(MEDICAL_CARE).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label>`:''}</section>`).join('')}</div><div class="animal-inspector-actions"><label data-animal-hunt-wrap><input type="checkbox" data-animal-hunt><span>Chasser</span></label><label data-animal-tame-wrap><input type="checkbox" data-animal-tame><span>Apprivoiser</span></label></div></div>`;
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
  root.dataset.animalTameAvailable=String(!!options.onTame);
  root.dataset.animalCareAvailable=String(!!options.onCarePolicy);
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
  root.querySelector<HTMLInputElement>('[data-animal-tame]')!.onchange = event => {
    const id=Number(root.dataset.animalInspectorId);
    if(Number.isSafeInteger(id))options.onTame?.(id,(event.currentTarget as HTMLInputElement).checked);
  };
  root.querySelector<HTMLSelectElement>('[data-animal-care]')!.onchange = event => {
    const id=Number(root.dataset.animalInspectorId);
    if(Number.isSafeInteger(id))options.onCarePolicy?.(id,(event.currentTarget as HTMLSelectElement).value as MedicalCare);
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
  root.querySelector<HTMLElement>('[data-animal-hunt-wrap]')!.hidden=view.domestic;
  const tame=root.querySelector<HTMLInputElement>('[data-animal-tame]')!;
  root.querySelector<HTMLElement>('[data-animal-tame-wrap]')!.hidden=!view.canTame;
  tame.checked=view.tameDesignated;tame.disabled=root.dataset.animalTameAvailable!=='true';
  const care=root.querySelector<HTMLSelectElement>('[data-animal-care]')!;
  root.querySelector<HTMLElement>('[data-animal-care-wrap]')!.hidden=!view.domestic;
  if(view.care)care.value=view.care;
  care.disabled=root.dataset.animalCareAvailable!=='true'||view.dead||!view.careAvailable;
  renderSections(root, 'info', [
    { title: 'Espèce', lines: view.species },
    { title: 'Besoins', lines: view.needs },
  ]);
  renderSections(root, 'health', [{ title: 'État de santé', lines: view.health }]);
  return true;
}
