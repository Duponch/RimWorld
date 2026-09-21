/** One generated atlas shared by the HUD, tool cursors and world designations. */
export const UI_ICONS = ['mine', 'chop', 'harvest', 'cut', 'wood', 'steel', 'component', 'silver', 'medicine', 'blocks', 'food', 'meal', 'home', 'clock', 'people', 'research', 'leaf', 'eye', 'layers', 'pointer'] as const;
export type UiIcon = typeof UI_ICONS[number];
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
    const icon = document.createElement('span'); decorate(icon, tabs[button.dataset.panel!] ?? 'layers'); button.prepend(icon);
  }
  const tools: Record<string, UiIcon> = { mine:'mine', chop:'chop', harvest:'harvest', cut:'cut', select:'pointer', deconstruct:'mine', growing:'leaf', stockpile:'blocks', 'haul-chunks':'blocks' };
  for (const [id, icon] of Object.entries(tools)) {
    const node = root.querySelector<HTMLElement>(`[data-tool="${id}"] .tool-icon`); if (node) decorate(node, icon);
  }
  // Rasterize five small cursor surfaces once at atlas load, never during a frame.
  // The original generated artwork remains unchanged and also supplies the GPU atlas.
  const image = new Image(); image.src = '/assets/ui/lisiere/icons.png';
  image.onload = () => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
    const context = canvas.getContext('2d'); if (!context) return;
    for (const icon of ['pointer', 'mine', 'chop', 'harvest', 'cut'] as const) {
      const index = UI_ICONS.indexOf(icon), width = image.width / 4, height = image.height / 5;
      context.clearRect(0, 0, 32, 32);
      context.drawImage(image, index % 4 * width, Math.floor(index / 4) * height, width, height, 0, 0, 32, 32);
      root.style.setProperty(`--cursor-${icon}`, `url("${canvas.toDataURL()}") 7 5, ${icon === 'pointer' ? 'default' : 'crosshair'}`);
    }
  };
}
