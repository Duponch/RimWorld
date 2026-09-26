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

export const ARCHITECT_ICON_ORDER = Object.freeze([...FIRST_ATLAS.flatMap(id=>id==='wall'?[id,'fence','fence-gate','pen-marker']:[id]), ...SECOND_ATLAS.flatMap(id=>id==='tailor-bench'?[id,'art-bench','machining-table']:[id])]);

// Small original vector additions share the existing Architecte icon installer.
// They do not change the historical two-atlas coordinates.
const penIcon=(body:string):string=>`url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><g fill="none" stroke="#365647" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`)}")`;
const PEN_ICONS:Readonly<Record<string,string>>=Object.freeze({
  fence:penIcon('<path d="M5 9v27M20 9v27M35 9v27M5 15h30M5 29h30"/><path d="M5 9l3 3M20 9l3 3M35 9l-3 3"/>'),
  'fence-gate':penIcon('<path d="M5 9v27M35 9v27M5 15h30M5 29h30M12 15v14M28 15v14M20 16v13"/><circle cx="24" cy="23" r="1" fill="#365647"/>'),
  'pen-marker':penIcon('<path d="M20 8v28M11 12h18v16H11zM15 16c2-2 4-2 5 0 1-2 3-2 5 0M16 23h8"/>'),
});

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
// New workbenches reuse existing pictured cells; adding tools never shifts the atlas.
export const ARCHITECT_ICON_MAPPING:Readonly<Record<string,ArchitectIconCell>>=Object.freeze(Object.fromEntries(ARCHITECT_ICON_ORDER.map(id=>[id,id==='machining-table'?originalCells['electric-tailor-bench']!:id==='art-bench'?originalCells.stonecutter!:PEN_ICONS[id]?originalCells.wall!:originalCells[id]!])));

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
    if (!icon || !cell && !PEN_ICONS[id]) {
      missing.push(id);
      continue;
    }
    icon.classList.add('ui-icon');
    if(PEN_ICONS[id]) {
      icon.style.backgroundImage=PEN_ICONS[id];
      icon.style.backgroundSize='contain';
      icon.style.backgroundPosition='center';
    } else {
      icon.style.backgroundImage = `url('${ARCHITECT_ICON_ATLASES[cell!.atlas]}')`;
      icon.style.backgroundSize = `${ATLAS_COLUMNS * 100}% ${ATLAS_ROWS * 100}%`;
      icon.style.backgroundPosition = `${cell!.column * 100 / (ATLAS_COLUMNS - 1)}% ${cell!.row * 100 / (ATLAS_ROWS - 1)}%`;
    }
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
