import { installToolCursors, UI_ICONS, type UiIcon } from './tool-cursors';
import { ARCHITECT_ICON_ATLASES, ARCHITECT_ICON_MAPPING } from './architect-icons';
export { UI_ICONS, type UiIcon } from './tool-cursors';

/** One generated atlas shared by the HUD, tool cursors and world designations. */
export function iconPosition(icon: UiIcon): [number, number] {
  const index = UI_ICONS.indexOf(icon);
  return [(index % 4) * 100 / 3, Math.floor(index / 4) * 25];
}
export function portraitIndex(id: number, name?: string): number { const familiar = ['Ada', 'Noé', 'Mina'].indexOf(name ?? ''); return familiar >= 0 ? familiar : Math.abs(id - 1) % 6; }
function decorate(element: HTMLElement, icon: UiIcon): void {
  const [x, y] = iconPosition(icon);
  element.classList.add('ui-icon'); element.style.backgroundPosition = `${x}% ${y}%`;
  element.textContent = ''; element.setAttribute('aria-hidden', 'true');
}
export function installVisualIdentity(root: HTMLElement): void {
  installToolCursors(root);
  root.querySelector<HTMLElement>('#viewport')?.setAttribute('data-cursor', 'select');
  const timePanel = root.querySelector<HTMLElement>('.time-panel');
  if (timePanel) new ResizeObserver(() => {
    root.style.setProperty('--time-panel-height', `${timePanel.getBoundingClientRect().height}px`);
  }).observe(timePanel);
  for (const [id, icon] of Object.entries({ wood:'wood', steel:'steel', component:'component', silver:'silver', medicine:'medicine', blocks:'blocks', food:'food' } as const)) {
    const symbol = root.querySelector<HTMLElement>(`#${id}`)?.parentElement?.querySelector<HTMLElement>('.resource-symbol');
    if (symbol) decorate(symbol, icon);
  }
  const tabs: Record<string, UiIcon> = { architect:'home', work:'chop', schedule:'clock', assign:'people', animals:'leaf', wildlife:'leaf', research:'research', quests:'layers', world:'leaf', history:'layers', factions:'people', menu:'layers' };
  for (const button of root.querySelectorAll<HTMLElement>('.main-tabs [data-panel]')) {
    const label = document.createElement('span'); label.className = 'tab-label'; label.textContent = button.textContent;
    const icon = document.createElement('span'); decorate(icon, tabs[button.dataset.panel!] ?? 'layers'); button.replaceChildren(icon, label);
  }
  for (const row of root.querySelectorAll<HTMLElement>('#resources > .resource')) {
    const name = row.querySelector<HTMLElement>('span:not(.resource-symbol)');
    if (name) { name.classList.add('resource-name'); row.title = name.textContent ?? ''; }
  }
  const cloth = root.querySelector<HTMLElement>('#cloth-stock .resource-symbol');
  if (cloth) {
    const cell = ARCHITECT_ICON_MAPPING['tailor-bench'];
    cloth.classList.add('ui-icon'); cloth.textContent = ''; cloth.setAttribute('aria-hidden', 'true');
    cloth.style.backgroundImage = `url('${ARCHITECT_ICON_ATLASES[cell.atlas]}')`;
    cloth.style.backgroundSize = '600% 500%';
    cloth.style.backgroundPosition = `${cell.column * 20}% ${cell.row * 25}%`;
  }
  const recenter = root.querySelector<HTMLElement>('#view-home');
  if (recenter) { const icon = document.createElement('span'); decorate(icon, 'home'); recenter.replaceChildren(icon); recenter.setAttribute('aria-label', 'Recentrer sur la colonie'); }
  const tools: Record<string, UiIcon> = { mine:'mine', chop:'chop', harvest:'harvest', cut:'cut', select:'pointer', deconstruct:'mine', growing:'leaf', stockpile:'blocks', 'haul-chunks':'blocks' };
  for (const [id, icon] of Object.entries(tools)) {
    const node = root.querySelector<HTMLElement>(`[data-tool="${id}"] .tool-icon`); if (node) decorate(node, icon);
  }
}
