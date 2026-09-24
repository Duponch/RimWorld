export type ColonistInspectorTab = 'bio' | 'needs' | 'health' | 'gear' | 'social' | 'prisoner';

export interface ColonistInspectorState {
  pawnId: number;
  activeTab: ColonistInspectorTab;
}

export interface ColonistInspectorOptions extends ColonistInspectorState {
  prisoner: boolean;
  onTabChange: (tab: ColonistInspectorTab) => void;
}

interface InspectorTabDefinition {
  id: ColonistInspectorTab;
  label: string;
  selectors: readonly string[];
}

const TAB_DEFINITIONS: readonly InspectorTabDefinition[] = Object.freeze([
  { id: 'bio', label: 'Bio', selectors: ['.skills-inspection'] },
  { id: 'needs', label: 'Besoins', selectors: ['.needs', '#recreation-tolerance', '#mood-inspection', '#room-description'] },
  { id: 'health', label: 'Santé', selectors: ['#health-inspection', '#hygiene-controls', '#burial-controls'] },
  { id: 'gear', label: 'Équipement', selectors: ['#equipment-details'] },
  { id: 'social', label: 'Social', selectors: ['#social-inspection'] },
  { id: 'prisoner', label: 'Prisonnier', selectors: ['#prisoner-inspection'] },
]);

const SUMMARY_SELECTORS = ['.panel-heading', '#selected-action'] as const;
const ACTION_SELECTORS = ['#draft-controls', '#manage-work', '#selected-orders', '#clear-orders'] as const;

export function colonistInspectorLayoutContract(): {
  summary: readonly string[];
  actions: readonly string[];
  panels: Readonly<Record<ColonistInspectorTab, readonly string[]>>;
} {
  return {
    summary: SUMMARY_SELECTORS,
    actions: ACTION_SELECTORS,
    panels: Object.fromEntries(TAB_DEFINITIONS.map(tab => [tab.id, tab.selectors])) as Record<ColonistInspectorTab, readonly string[]>,
  };
}

export function colonistInspectorTabs(prisoner: boolean): readonly Pick<InspectorTabDefinition, 'id' | 'label'>[] {
  return TAB_DEFINITIONS.filter(tab => prisoner || tab.id !== 'prisoner').map(({ id, label }) => ({ id, label }));
}

export function resolveColonistInspectorTab(tab: ColonistInspectorTab, prisoner: boolean): ColonistInspectorTab {
  return tab === 'prisoner' && !prisoner ? 'bio' : tab;
}

/** Keeps the inspected category while moving between people, as long as that
 * category exists for the newly selected person. The caller remains the owner
 * of this presentation state. */
export function colonistInspectorState(
  previous: ColonistInspectorState | undefined,
  pawnId: number,
  prisoner: boolean,
  requested?: ColonistInspectorTab,
): ColonistInspectorState {
  const activeTab = resolveColonistInspectorTab(requested ?? previous?.activeTab ?? 'bio', prisoner);
  return { pawnId, activeTab };
}

/** Static markup is exported so its accessibility contract can be checked
 * without requiring a second browser DOM in the unit-test process. */
export function colonistInspectorScaffold(prisoner: boolean): string {
  const tabs = colonistInspectorTabs(prisoner);
  return `<div class="colonist-inspector-scroll"><section class="colonist-inspector-summary" aria-label="Résumé du personnage sélectionné"></section><div class="colonist-inspector-tabs" role="tablist" aria-label="Dossiers du personnage">${tabs.map(tab => `<button type="button" role="tab" id="colonist-tab-${tab.id}" aria-controls="colonist-panel-${tab.id}" aria-selected="false" tabindex="-1" data-colonist-tab="${tab.id}">${tab.label}</button>`).join('')}</div><div class="colonist-inspector-pages">${tabs.map(tab => `<section role="tabpanel" id="colonist-panel-${tab.id}" aria-labelledby="colonist-tab-${tab.id}" tabindex="0" data-colonist-panel="${tab.id}" hidden><h3 class="inspector-page-title">${tab.label}</h3></section>`).join('')}</div><section class="colonist-inspector-actions" aria-label="Actions du personnage"></section></div>`;
}

function directMatches(root: HTMLElement, selector: string): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(selector)].filter(node =>
    !node.closest('.colonist-inspector-tabs') && !node.closest('[data-colonist-panel]') &&
    !node.closest('.colonist-inspector-summary') && !node.closest('.colonist-inspector-actions'));
}

function moveMatches(root: HTMLElement, selectors: readonly string[], destination: HTMLElement): void {
  for (const selector of selectors) {
    for (const node of directMatches(root, selector)) destination.append(node);
  }
}

/** Rehomes existing inspection nodes instead of recreating them. This retains
 * every command listener, data attribute and live update target installed by
 * the domain-specific inspection helpers. */
export function refreshColonistInspectorLayout(root: HTMLElement): void {
  const context = root.querySelector<HTMLElement>('#room-description');
  const summary = root.querySelector<HTMLElement>('.colonist-inspector-summary');
  const actions = root.querySelector<HTMLElement>('.colonist-inspector-actions');
  if (!summary || !actions) return;
  // RoomInspection inserts next to the action even after the summary is mounted.
  // Rehome this late-created node explicitly; normal collection skips summary nodes.
  const needs = root.querySelector<HTMLElement>('[data-colonist-panel="needs"]');
  if (context && needs && context.parentElement !== needs) needs.append(context);
  moveMatches(root, SUMMARY_SELECTORS, summary);
  moveMatches(root, ACTION_SELECTORS, actions);
  for (const definition of TAB_DEFINITIONS) {
    const panel = root.querySelector<HTMLElement>(`[data-colonist-panel="${definition.id}"]`);
    if (!panel) continue;
    moveMatches(root, definition.selectors, panel);
  }
}

export function setColonistInspectorTab(root: HTMLElement, requested: ColonistInspectorTab, prisoner: boolean): ColonistInspectorTab {
  const active = resolveColonistInspectorTab(requested, prisoner);
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-colonist-tab]')) {
    const selected = button.dataset.colonistTab === active;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  }
  for (const panel of root.querySelectorAll<HTMLElement>('[data-colonist-panel]')) {
    const selected = panel.dataset.colonistPanel === active;
    panel.hidden = !selected;
    for (const details of panel.querySelectorAll<HTMLDetailsElement>(':scope > details')) details.open = selected;
  }
  root.dataset.colonistInspectorTab = active;
  return active;
}

export function updateColonistInspector(root: HTMLElement, state: ColonistInspectorState, prisoner: boolean): ColonistInspectorTab {
  root.dataset.colonistInspectorPawn = String(state.pawnId);
  root.dataset.colonistInspectorPrisoner = String(prisoner);
  refreshColonistInspectorLayout(root);
  return setColonistInspectorTab(root, state.activeTab, prisoner);
}

export function mountColonistInspector(root: HTMLElement, options: ColonistInspectorOptions): ColonistInspectorTab {
  if (root.querySelector('.colonist-inspector-tabs')) return updateColonistInspector(root, options, options.prisoner);

  root.insertAdjacentHTML('afterbegin', colonistInspectorScaffold(options.prisoner));
  root.classList.add('colonist-inspector-host');
  // Existing nodes remain direct children after the scaffold is inserted.
  // Moving rather than cloning them preserves all action closures.
  refreshColonistInspectorLayout(root);

  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-colonist-tab]')];
  const choose = (button: HTMLButtonElement): void => {
    const tab = button.dataset.colonistTab as ColonistInspectorTab;
    setColonistInspectorTab(root, tab, options.prisoner);
    options.onTabChange(tab);
  };
  for (const button of buttons) {
    button.addEventListener('click', () => choose(button));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = buttons.indexOf(button);
      const target = event.key === 'Home' ? buttons[0]
        : event.key === 'End' ? buttons.at(-1)
          : buttons[(index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length];
      target?.focus();
      if (target) choose(target);
    });
  }
  return updateColonistInspector(root, options, options.prisoner);
}
