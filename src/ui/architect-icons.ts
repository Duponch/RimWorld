const ATLAS_COLUMNS = 6;
const ATLAS_ROWS = 5;

export const ARCHITECT_ICON_ATLASES = [
  '/assets/ui/lisiere/architect-1.png',
  '/assets/ui/lisiere/architect-2.png',
] as const;

const FIRST_ATLAS = [
  'wood-planks', 'granite-tile', 'limestone-tile', 'marble-tile', 'sandstone-tile', 'slate-tile',
  'steel-tile', 'remove-floor', 'grave', 'select', 'mine', 'haul-chunks',
  'chop', 'harvest', 'cut', 'uninstall', 'deconstruct', 'cancel',
  'door', 'wall', 'bed', 'table', 'table-square', 'table-long',
  'dining-chair', 'armchair', 'end-table', 'dresser', 'flower-pot', 'horseshoes',
] as const;

const SECOND_ATLAS = [
  'heater', 'wind-turbine', 'cooler', 'wood-generator', 'power-conduit', 'power-switch',
  'battery', 'solar-generator', 'standing-lamp', 'passive-cooler', 'campfire', 'research-bench',
  'tailor-bench', 'electric-tailor-bench', 'crafting-spot', 'fueled-stove', 'electric-stove', 'butcher-table',
  'butcher-spot', 'stonecutter', 'stool', 'growing', 'build-roof', 'remove-roof',
  'ignore-roof', 'remove-growing', 'stockpile', 'home', 'remove-home', 'remove-stockpile',
] as const;

export const ARCHITECT_ICON_ORDER = Object.freeze([...FIRST_ATLAS, ...SECOND_ATLAS.flatMap(id=>id==='tailor-bench'?[id,'machining-table']:[id])]);

export interface ArchitectIconCell {
  readonly atlas: 0 | 1;
  readonly column: number;
  readonly row: number;
}

function atlasCells(ids: readonly string[], atlas: 0 | 1): [string, ArchitectIconCell][] {
  return ids.map((id, index) => [id, {
    atlas,
    column: index % ATLAS_COLUMNS,
    row: Math.floor(index / ATLAS_COLUMNS),
  }]);
}

/** Public mapping doubles as the reviewable row-major atlas manifest. */
const originalCells:Readonly<Record<string,ArchitectIconCell>>=Object.fromEntries([
  ...atlasCells(FIRST_ATLAS, 0),
  ...atlasCells(SECOND_ATLAS, 1),
]);
// The new powered workbench shares the existing machine pictogram; atlas cells
// never shift when a tool is added to the menu.
export const ARCHITECT_ICON_MAPPING:Readonly<Record<string,ArchitectIconCell>>=Object.freeze(Object.fromEntries(ARCHITECT_ICON_ORDER.map(id=>[id,id==='machining-table'?originalCells['electric-tailor-bench']!:originalCells[id]!])));

export interface ArchitectIconInstallReport {
  readonly installed: readonly string[];
  readonly missing: readonly string[];
  readonly absent: readonly string[];
}

/** Replaces Architect text glyphs after installVisualIdentity has decorated the shared shell. */
export function installArchitectIcons(root: HTMLElement): ArchitectIconInstallReport {
  const installed: string[] = [];
  const missing: string[] = [];
  const present = new Set<string>();

  for (const button of root.querySelectorAll<HTMLElement>('[data-tool]')) {
    const id = button.dataset.tool;
    if (!id) continue;
    present.add(id);
    const cell = ARCHITECT_ICON_MAPPING[id];
    const icon = button.querySelector<HTMLElement>('.tool-icon');
    if (!cell || !icon) {
      missing.push(id);
      continue;
    }
    icon.classList.add('ui-icon');
    icon.style.backgroundImage = `url('${ARCHITECT_ICON_ATLASES[cell.atlas]}')`;
    icon.style.backgroundSize = `${ATLAS_COLUMNS * 100}% ${ATLAS_ROWS * 100}%`;
    icon.style.backgroundPosition = `${cell.column * 100 / (ATLAS_COLUMNS - 1)}% ${cell.row * 100 / (ATLAS_ROWS - 1)}%`;
    icon.style.backgroundRepeat = 'no-repeat';
    icon.textContent = '';
    icon.setAttribute('aria-hidden', 'true');
    installed.push(id);
  }

  return {
    installed,
    missing,
    absent: ARCHITECT_ICON_ORDER.filter(id => !present.has(id)),
  };
}
