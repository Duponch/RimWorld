import { modelIconUrl, pictogramDataUrl } from './pictograms';

export type MapToolGroup = 'orders' | 'zones';

export interface ArchitectWorkbench {
  /** Collapse only the interface. The caller keeps ownership of the map tool. */
  close(): void;
  readonly openGroup: MapToolGroup | null;
}

const CATEGORY_ICONS: Readonly<Record<string, string>> = {
  temperature: modelIconUrl('heater'),
  structure: modelIconUrl('wall'),
  floors: modelIconUrl('wood-planks'),
  furniture: modelIconUrl('dining-chair'),
  recreation: modelIconUrl('horseshoes'),
  production: modelIconUrl('machining-table'),
  power: modelIconUrl('battery'),
};
const PRODUCTION_ORDER = [
  'hydroponics-basin', 'deep-drill', 'ground-scanner', 'orbital-beacon',
  'comms-console', 'nutrient-paste-dispenser', 'hopper', 'research-bench',
  'tailor-bench', 'drug-lab', 'biofuel-refinery', 'art-bench',
  'machining-table', 'hi-tech-research-bench', 'multi-analyzer', 'fabrication-bench',
  'electric-tailor-bench', 'crafting-spot', 'fueled-stove', 'electric-stove',
] as const;

function image(url: string, className: string): HTMLSpanElement {
  const icon = document.createElement('span');
  icon.className = className;
  icon.style.backgroundImage = `url('${url}')`;
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

/** One-time shell composition. Original tool buttons are moved, so their
 * selection handlers, IDs, shortcuts and model images have one owner. */
export function installArchitectWorkbench(
  root: HTMLElement,
  onOpenGroup: (group: MapToolGroup) => void,
): ArchitectWorkbench {
  const panel = root.querySelector<HTMLElement>('#architect-panel')!;
  const shell = root.querySelector<HTMLElement>('.game-shell')!;
  panel.classList.add('architect-workbench');

  const heading = panel.querySelector<HTMLElement>('.panel-heading h2')!;
  heading.prepend(image(pictogramDataUrl('deconstruct'), 'architect-heading-icon'));

  // Match the supplied workbench order without changing the tool catalogue or
  // hiding the additional production tables below those pictured in the mockup.
  const tools = panel.querySelector<HTMLElement>('.tools')!;
  const production = [...tools.querySelectorAll<HTMLElement>('[data-tool-category="production"]')];
  const ordered = new Map<string, number>(PRODUCTION_ORDER.map((id, index) => [id, index]));
  production.sort((a, b) => (ordered.get(a.dataset.tool!) ?? PRODUCTION_ORDER.length) - (ordered.get(b.dataset.tool!) ?? PRODUCTION_ORDER.length));
  tools.append(...production);

  for (const button of panel.querySelectorAll<HTMLButtonElement>('.architect-categories button')) {
    const category = button.dataset.category;
    if (category === 'orders' || category === 'zones') {
      button.remove();
      continue;
    }
    const label = document.createElement('span');
    label.className = 'architect-category-label';
    label.textContent = button.textContent;
    const arrow = document.createElement('span');
    arrow.className = 'architect-category-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    button.replaceChildren(
      image(category ? CATEGORY_ICONS[category]! : modelIconUrl('mini-turret'), 'architect-category-icon'),
      label,
      arrow,
    );
  }

  const dock = document.createElement('nav');
  dock.className = 'map-tools-dock';
  dock.setAttribute('aria-label', 'Ordres et zones de la carte');
  const headings = new Map<MapToolGroup, HTMLButtonElement>();
  const trays = new Map<MapToolGroup, HTMLElement>();
  let openGroup: MapToolGroup | null = null;

  const close = () => {
    openGroup = null;
    for (const [group, button] of headings) {
      button.setAttribute('aria-expanded', 'false');
      button.classList.remove('active');
      trays.get(group)!.hidden = true;
    }
  };

  for (const group of ['orders', 'zones'] as const) {
    const row = document.createElement('div');
    row.className = 'map-tools-row';
    row.dataset.mapToolGroup = group;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = `${group}-open`;
    button.className = 'map-tools-heading';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', `${group}-tools`);
    const label = document.createElement('span');
    label.textContent = group === 'orders' ? 'Ordres' : 'Zones';
    button.append(image(pictogramDataUrl(group === 'orders' ? 'pointer' : 'layers'), 'map-tools-heading-icon'), label);

    const tray = document.createElement('div');
    tray.id = `${group}-tools`;
    tray.className = 'map-tools-tray';
    tray.setAttribute('role', 'group');
    tray.setAttribute('aria-label', group === 'orders' ? 'Choisir un ordre' : 'Choisir une zone');
    tray.hidden = true;
    for (const tool of panel.querySelectorAll<HTMLButtonElement>(`[data-tool-category="${group}"]`)) {
      tool.hidden = false;
      tool.classList.add('map-tool');
      tray.append(tool);
    }
    headings.set(group, button);
    trays.set(group, tray);
    button.onclick = () => {
      const next = openGroup === group ? null : group;
      close();
      if (!next) return;
      // Existing panel/tool functions may also close this dock; run them first.
      onOpenGroup(next);
      openGroup = next;
      headings.get(next)!.classList.add('active');
      headings.get(next)!.setAttribute('aria-expanded', 'true');
      trays.get(next)!.hidden = false;
    };
    row.append(button, tray);
    dock.append(row);
  }
  shell.append(dock);

  return { close, get openGroup() { return openGroup; } };
}
