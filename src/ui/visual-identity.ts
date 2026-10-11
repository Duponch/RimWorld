import { installToolCursors, UI_ICONS, type UiIcon } from './tool-cursors';
import {UI_ATLAS_URL,modelIconUrl,pictogramDataUrl} from './pictograms';
export { UI_ICONS, type UiIcon } from './tool-cursors';

/** The paper atlas retains the historical four-column marker addresses. */
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

/** Installed once. Weather still changes through the existing data attribute. */
function installConditionIcons(root: HTMLElement): void {
  const temperature = root.querySelector<HTMLElement>('#outdoor-temperature');
  if (temperature) temperature.style.setProperty('--temperature-icon', `url('${pictogramDataUrl('temperature')}')`);
  const weather = root.querySelector<HTMLElement>('#weather');
  if (!weather) return;
  for (const kind of ['clear','fog','rain','dry-thunderstorm','rainy-thunderstorm','foggy-rain','snow-gentle','snow-hard'])
    weather.style.setProperty(`--weather-icon-${kind}`, `url('${pictogramDataUrl(`weather-${kind}`)}')`);
}

function installViewIcons(root: HTMLElement): void {
  const icons: Record<string, string> = {
    'wall-cutaway': pictogramDataUrl('wall'),
    'roof-toggle': pictogramDataUrl('roof'),
    'foliage-toggle': pictogramDataUrl('leaf'),
    'zones-toggle': pictogramDataUrl('layers'),
    'view-home': pictogramDataUrl('home'),
    'camera-mode': pictogramDataUrl('eye'),
  };
  for (const [id, url] of Object.entries(icons)) {
    const button = root.querySelector<HTMLElement>(`#${id}`);
    if (!button) continue;
    let icon = button.querySelector<HTMLElement>('.ui-icon');
    if (!icon) {
      const label = document.createElement('span'); label.className = 'view-control-label'; label.textContent = button.textContent;
      icon = document.createElement('span'); icon.className = 'ui-icon'; button.replaceChildren(icon, label);
    }
    icon.setAttribute('aria-hidden', 'true'); icon.style.backgroundImage = `url('${url}')`; icon.style.backgroundSize = 'contain'; icon.style.backgroundPosition = 'center';
  }
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
  installConditionIcons(root);
  installViewIcons(root);
}
