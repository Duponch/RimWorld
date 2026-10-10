import { installToolCursors, UI_ICONS, type UiIcon } from './tool-cursors';
import {UI_ATLAS_URL,modelIconUrl,pictogramDataUrl} from './pictograms';
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
  element.style.backgroundImage=`url('${UI_ATLAS_URL}')`;
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
  const tabs: Record<string, string> = { architect:'home', work:'chop', schedule:'clock', assign:'people', animals:'animals', wildlife:'wildlife', research:'research', quests:'quests', world:'world', history:'history', factions:'factions', menu:'menu' };
  for (const button of root.querySelectorAll<HTMLElement>('.main-tabs [data-panel]')) {
    const label = document.createElement('span'); label.className = 'tab-label'; label.textContent = button.textContent;
    const icon = document.createElement('span');icon.className='ui-icon';icon.setAttribute('aria-hidden','true');icon.style.backgroundImage=`url('${pictogramDataUrl(tabs[button.dataset.panel!]??'layers')}')`;icon.style.backgroundSize='contain';icon.style.backgroundPosition='center';button.replaceChildren(icon, label);
  }
  for (const row of root.querySelectorAll<HTMLElement>('#resources > .resource')) {
    const name = row.querySelector<HTMLElement>('span:not(.resource-symbol)');
    if (name) { name.classList.add('resource-name'); row.title = name.textContent ?? ''; }
  }
  for(const [id,item]of Object.entries({wood:'wood',steel:'steel',plasteel:'plasteel',gold:'gold',cloth:'cloth',component:'component','advanced-component':'advanced-component',chemfuel:'chemfuel',silver:'silver',medicine:'medicine',blocks:'granite-blocks',food:'rice'})){
    const symbol=root.querySelector<HTMLElement>(`#${id}`)?.parentElement?.querySelector<HTMLElement>('.resource-symbol');if(!symbol)continue;
    symbol.classList.add('ui-icon');symbol.textContent='';symbol.setAttribute('aria-hidden','true');symbol.style.backgroundImage=`url('${modelIconUrl(`item-${item}`)}')`;symbol.style.backgroundSize='contain';symbol.style.backgroundPosition='center';
  }
  const recenter = root.querySelector<HTMLElement>('#view-home');
  if (recenter) { const icon = document.createElement('span'); decorate(icon, 'home'); recenter.replaceChildren(icon); recenter.setAttribute('aria-label', 'Recentrer sur la colonie'); }
}
