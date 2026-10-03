import type { Command, Pawn, World } from '../sim/types';
import { appearanceOf } from '../sim/pawn-appearance';
import { biologicalYears } from '../sim/human-age';
import { isColonist, isCarePatient } from '../sim/affiliation';
import { recreationInspection } from './recreation-inspection';
import { setTooltip } from './tooltip';

export function pawnNeedsMarkup(): string {
  const need=(id:string,label:string)=>`<div class="pawn-need" data-need="${id}" tabindex="0"><label for="${id}-meter">${label} <span id="selected-${id}"></span></label><meter id="${id}-meter" min="0" max="100" low="25" optimum="100"></meter></div>`;
  return `<div class="needs">${need('hunger','Nourriture')}${need('rest','Sommeil')}</div>${recreationInspection()}<div class="needs minor-needs">${need('beauty','Beauté')}${need('comfort','Confort')}</div>`;
}
const needHelp = {
  hunger: ['Nourriture', 'La nourriture diminue au fil du temps. Elle remonte quand le repas est réellement consommé. À zéro, la malnutrition progresse.'],
  rest: ['Sommeil', 'Le repos remonte pendant le sommeil. Un lit permet de récupérer plus efficacement que le sol ; une fatigue extrême peut provoquer un effondrement.'],
  comfort: ['Confort', 'Le confort dépend du lit ou du siège utilisé. Son niveau influe sur les pensées et redescend hors des meubles confortables.'],
  beauty: ['Beauté', 'L’exposition récente à la beauté du décor influence ce besoin et les pensées. Les objets, le terrain et la saleté autour de la personne participent à cette exposition.'],
} as const;

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
  for (const need of ['hunger', 'rest', 'beauty', 'comfort'] as const) {
    const row = root.querySelector<HTMLElement>(`[data-need="${need}"]`);
    if (!row) continue;
    const value = pawn.state === 'dead' ? '—' : `${Math.round(pawn[need])} %`;
    row.querySelector(`#selected-${need}`)!.textContent = value;
    row.querySelector<HTMLMeterElement>('meter')!.value = pawn.state === 'dead' ? 0 : pawn[need];
    setTooltip(row, { title: `${needHelp[need][0]} : ${value}`, body: needHelp[need][1] });
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
