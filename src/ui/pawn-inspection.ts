import type { Command, Pawn, World } from '../sim/types';
import { appearanceOf } from '../sim/pawn-appearance';
import { biologicalYears } from '../sim/human-age';
import { isColonist, isCarePatient } from '../sim/affiliation';
import { recreationInspection } from './recreation-inspection';
import { setTooltip } from './tooltip';
import { needGaugeMarkup, needThresholdRow, updateNeedGauge } from './need-gauge';

export function pawnNeedsMarkup(): string {
  const need=(id:'hunger'|'rest'|'beauty'|'comfort',label:string)=>`<div class="pawn-need" data-need="${id}" tabindex="0"><label for="${id}-meter">${label} <span id="selected-${id}"></span></label>${needGaugeMarkup(id)}</div>`;
  return `<div class="needs">${need('hunger','Nourriture')}${need('rest','Sommeil')}</div>${recreationInspection()}<div class="needs minor-needs">${need('beauty','Beauté')}${need('comfort','Confort')}</div>`;
}
const needHelp = {
  hunger: ['Nourriture', 'La réserve diminue au fil du temps et remonte au repas réellement consommé. Sous 24 % : faim ; sous 12 % : très faim. À zéro, la malnutrition progresse.'],
  rest: ['Sommeil', 'Le repos remonte pendant le sommeil, plus efficacement dans un lit. Sous 28 % : somnolence ; sous 14 % : grande fatigue ; sous 1 % : épuisement. Une fatigue extrême peut provoquer un effondrement.'],
  comfort: ['Confort', 'Le confort vient du lit ou du siège utilisé et redescend hors des meubles confortables. Sous 10 % : inconfort ; à partir de 60, 70, 80 et 90 % : pensées de confort croissantes.'],
  beauty: ['Beauté', 'L’exposition récente aux objets, au terrain et à la saleté influence ce besoin. Jusqu’à 1 % : environnement affreux ; sous 15 % : très laid ; sous 35 % : laid. À partir de 65, 85 et 99 % : pensées de beauté croissantes.'],
} as const;

export function podRescueInspectionStatus(world: Pick<World, 'podRescues'>, pawn: Pick<Pawn, 'id' | 'faction' | 'podRescue' | 'prisoner' | 'state'>): string | undefined {
  const incident = world.podRescues?.incidents.find(entry => entry.pawnId === pawn.id);
  if (!incident?.origin) return;
  const origin = incident.origin === 'independent' ? 'indépendant' : 'affilié à une faction extérieure';
  if (incident.result === 'joined') return `Ancien naufragé ${origin} · A rejoint la colonie après son secours.`;
  if (!pawn.podRescue) return;
  const identity = `Naufragé ${origin}`;
  if (pawn.state === 'dead' || incident.result === 'dead') return `${identity} · Décédé.`;
  if (pawn.prisoner || incident.result === 'captured') return `${identity} · Capturé.`;
  if (pawn.podRescue.admittedAt === undefined) return `${identity} · Pas encore secouru.`;
  if (incident.origin === 'outlander') return `${identity} · Accueilli et en soins · Repartira après sa récupération.`;
  if (incident.decision?.outcome === 'left') return `${identity} · Repartira après sa récupération.`;
  return `${identity} · Accueilli et en soins · N’a pas encore décidé de rester.`;
}

/** The summary and the medical food selector refer to the inspected identity,
 * including captives. Commands still use the ordinary worker admission. */
export function updatePawnInspection(root: HTMLElement, world: World, pawn: Pawn, send: (command: Command) => void): void {
  let identity = root.querySelector<HTMLElement>('#selected-identity');
  if (!identity) {
    identity = document.createElement('p'); identity.id = 'selected-identity';
    root.querySelector('#selected-action')?.before(identity);
  }
  const sex = appearanceOf(pawn, world.seed).sex === 'female' ? 'Femme' : 'Homme';
  const affiliation = pawn.prisoner ? 'Prisonnier' : isColonist(pawn) ? 'Colon' : pawn.visitor ? 'Visiteur' : pawn.podRescue ? 'Naufragé' : 'Hors-la-loi';
  identity.textContent = `${sex}${pawn.age ? ` · ${biologicalYears(pawn.age)} ans` : ''} · ${affiliation}`;
  const rescueStatus = podRescueInspectionStatus(world, pawn);
  let rescueSummary = root.querySelector<HTMLElement>('#selected-pod-rescue');
  if (rescueStatus) {
    if (!rescueSummary) {
      rescueSummary = document.createElement('p'); rescueSummary.id = 'selected-pod-rescue'; identity.after(rescueSummary);
    }
    rescueSummary.textContent = rescueStatus;
  } else rescueSummary?.remove();
  for (const need of ['hunger', 'rest', 'beauty', 'comfort'] as const) {
    const row = root.querySelector<HTMLElement>(`[data-need="${need}"]`);
    if (!row) continue;
    const value = pawn.state === 'dead' ? '—' : `${Math.round(pawn[need])} %`;
    row.querySelector(`#selected-${need}`)!.textContent = value;
    updateNeedGauge(row, pawn[need], pawn.state === 'dead');
    setTooltip(row, { title: `${needHelp[need][0]} : ${value}`, body: needHelp[need][1], rows: [needThresholdRow(need)] });
  }
  const host = root.querySelector<HTMLElement>('[data-health="food-policy"]');
  if (host) {
    let select = host.querySelector<HTMLSelectElement>('select');
    if (!select) {
      select = document.createElement('select'); select.id = 'inspector-food-policy';
      select.setAttribute('aria-label', 'Régime alimentaire du personnage');
      // Read the current selected identity rather than capturing a stale pawn.
      select.onchange = () => send({ type: 'food-policy-assign', pawnId: Number(root.dataset.colonistInspectorPawn), policyId: Number(select!.value) });
      host.append(select);
    }
    const signature = JSON.stringify(world.foodPolicies.map(policy => [policy.id, policy.name]));
    if (select.dataset.signature !== signature) {
      select.dataset.signature = signature;
      select.replaceChildren(...world.foodPolicies.map(policy => {
        const option = document.createElement('option'); option.value = String(policy.id); option.textContent = policy.name; return option;
      }));
    }
    select.value = String(pawn.foodPolicyId); select.disabled = pawn.state === 'dead' || !isCarePatient(pawn);
    setTooltip(host, { title: 'Alimentation', body: 'Choisir les aliments autorisés. Modifier un régime dans Assignations modifie tous ses utilisateurs. Le régime ne change pas les ingrédients de cuisine.',rows:[{label:'Régime actuel',value:world.foodPolicies.find(policy=>policy.id===pawn.foodPolicyId)?.name??'—'}] });
  }
}
