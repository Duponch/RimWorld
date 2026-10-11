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

/** Installed once. Dynamic weather changes only the existing data-weather
 * attribute; no DOM observer or SVG generation runs in the simulation loop. */
function hudSvgUrl(body: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g stroke="#17202e" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" fill="none">${body}</g></svg>`)}`;
}
function installConditionIcons(root: HTMLElement): void {
  const temperature = root.querySelector<HTMLElement>('#outdoor-temperature');
  if (temperature) temperature.style.setProperty('--temperature-icon', `url('${hudSvgUrl('<path d="M25 12a7 7 0 0 1 14 0v25a13 13 0 1 1-14 0Z" fill="#fff7e9"/><path d="M32 19v24" stroke="#ff6b5e" stroke-width="6"/><circle cx="32" cy="48" r="7" fill="#ff6b5e" stroke="none"/><path d="M43 16h6m-6 10h6m-6 10h6" stroke="#d9ecff"/>')}')`);
  const weather = root.querySelector<HTMLElement>('#weather');
  if (!weather) return;
  const cloud = '<path d="M15 39a10 10 0 0 1 0-20c1-13 20-15 25-4 13-4 23 15 10 24Z" fill="#e6edf7"/>';
  const rain = '<path d="m20 46-4 8m18-8-4 8m18-8-4 8" stroke="#6eb9ff" stroke-width="5"/>';
  const fog = '<path d="M10 45h44M15 52h35" stroke="#adc4db" stroke-width="4"/>';
  const lightning = '<path d="m34 30-13 16h10l-4 13 17-20H33l6-9Z" fill="#ffc23c"/>';
  const snow = '<g stroke="#9fd4ff" stroke-width="3"><path d="M19 46v12m-5-9 10 6m0-6-10 6M43 46v12m-5-9 10 6m0-6-10 6"/></g>';
  const bodies = {
    clear: '<circle cx="32" cy="32" r="14" fill="#ffc23c"/><path d="M32 4v7m0 42v7M4 32h7m42 0h7M12 12l5 5m30 30 5 5M12 52l5-5m30-30 5-5" stroke="#ffc23c" stroke-width="4"/>',
    fog: cloud + fog,
    rain: cloud + rain,
    'dry-thunderstorm': cloud + lightning,
    'rainy-thunderstorm': cloud + rain + lightning,
    'foggy-rain': cloud + '<path d="m20 42-3 6m24-6-3 6M10 54h44" stroke="#6eb9ff" stroke-width="4"/>',
    'snow-gentle': cloud + snow,
    'snow-hard': cloud + snow + '<circle cx="32" cy="45" r="2" fill="#9fd4ff" stroke="none"/><circle cx="32" cy="57" r="2" fill="#9fd4ff" stroke="none"/>',
  };
  for (const [kind, body] of Object.entries(bodies)) weather.style.setProperty(`--weather-icon-${kind}`, `url('${hudSvgUrl(body)}')`);
}

function installViewIcons(root: HTMLElement): void {
  const icons: Record<string, string> = {
    'wall-cutaway': modelIconUrl('wall'),
    'roof-toggle': hudSvgUrl('<path d="m5 32 27-22 27 22-6 7-21-17-21 17Z" fill="#9d7155"/><path d="M15 34v20h34V34" stroke="#a4b3c6"/>'),
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
