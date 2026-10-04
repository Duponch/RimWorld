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

export const ARCHITECT_ICON_ORDER = Object.freeze([...FIRST_ATLAS.flatMap(id=>id==='door'?[id,'autodoor']:id==='wall'?[id,'sandbags','fence','fence-gate','pen-marker']:id==='bed'?[id,'hospital-bed']:id==='horseshoes'?[id,'chess-table','tube-television']:[id]), ...SECOND_ATLAS.flatMap(id=>id==='standing-lamp'?[id,'sun-lamp']:id==='tailor-bench'?[id,'art-bench','machining-table','hi-tech-research-bench','multi-analyzer','fabrication-bench']:[id])]);

// Small original vector additions share the existing Architecte icon installer.
// They do not change the historical two-atlas coordinates.
const vectorIcon=(body:string):string=>`url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><g fill="none" stroke="#365647" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`)}")`;
const CUSTOM_ICONS:Readonly<Record<string,string>>=Object.freeze({
  'tube-television':vectorIcon('<rect x="5" y="10" width="30" height="22" rx="4" fill="#b9aa8e"/><rect x="9" y="14" width="19" height="14" rx="3" fill="#a9cec6"/><circle cx="31" cy="17" r="1"/><circle cx="31" cy="24" r="1"/><path d="M11 33v3M29 33v3M15 5l5 5 6-6"/>'),
  sandbags:vectorIcon('<rect x="5" y="24" width="15" height="9" rx="3" fill="#d7cba5"/><rect x="20" y="24" width="15" height="9" rx="3" fill="#cec19b"/><rect x="10" y="15" width="20" height="9" rx="3" fill="#e0d4b3"/><path d="M8 29h9M23 29h9M14 20h12" stroke="#a99e7e" stroke-width="1"/>'),
  'hospital-bed':vectorIcon('<path d="M6 18v16M34 18v16M6 27h28M10 18h20v9H10zM6 20h4M30 20h4M12 17v-4h7v4"/><path d="M26 5v10M21 10h10" stroke="#6d9f99"/><path d="M9 31h22"/>'),
  'sun-lamp':vectorIcon('<path d="M8 9h24l3 6H5zM20 15v19M13 35h14M10 20l-2 5M30 20l2 5M15 20v4M25 20v4"/><path d="M24 32c0-5 4-6 8-5-1 4-4 6-8 5M24 32l5-3" fill="#b8cc9e"/>'),
  autodoor:vectorIcon('<path d="M5 7h30v29H5zM10 12h9v20h-9zM21 12h9v20h-9zM20 8v27"/><path d="m25 16-3 5h3l-2 5 5-7h-3l2-3"/><circle cx="7.5" cy="20" r="1.3" fill="#365647" stroke="none"/>'),
  fence:vectorIcon('<path d="M5 9v27M20 9v27M35 9v27M5 15h30M5 29h30"/><path d="M5 9l3 3M20 9l3 3M35 9l-3 3"/>'),
  'fence-gate':vectorIcon('<path d="M5 9v27M35 9v27M5 15h30M5 29h30M12 15v14M28 15v14M20 16v13"/><circle cx="24" cy="23" r="1" fill="#365647"/>'),
  'pen-marker':vectorIcon('<path d="M20 8v28M11 12h18v16H11zM15 16c2-2 4-2 5 0 1-2 3-2 5 0M16 23h8"/>'),
  'chess-table':vectorIcon('<rect x="5" y="5" width="30" height="30" rx="2"/><path d="M12.5 5v30M20 5v30M27.5 5v30M5 12.5h30M5 20h30M5 27.5h30" stroke-width="1"/><path d="M13 7h6v5h-6zM28 7h5v5h-5zM6 13h6v6H6zM21 13h6v6h-6zM13 21h6v6h-6zM28 21h5v6h-5zM6 28h6v5H6zM21 28h6v5h-6z" fill="#365647" stroke="none"/><circle cx="9" cy="9" r="2" fill="#e6c989" stroke="none"/><circle cx="31" cy="31" r="2" fill="#e6c989" stroke="none"/>'),
  'hi-tech-research-bench':vectorIcon('<path d="M4 27h32M8 27V12h24v15M13 16h14v8H13zM17 32h6M20 27v5"/><path d="M15 19h10M15 22h7"/>'),
  'multi-analyzer':vectorIcon('<path d="M8 30h24M12 30V11h16v19M16 15h8v10h-8zM19 8h2M6 18h4M30 18h4"/><circle cx="20" cy="20" r="2"/>'),
  'fabrication-bench':vectorIcon('<path d="M4 27h32M8 27V13h24v14M12 18h16M14 21l4-3 4 3 4-3M13 31h3M24 31h3"/><circle cx="20" cy="10" r="2"/>'),
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
export const ARCHITECT_ICON_MAPPING:Readonly<Record<string,ArchitectIconCell>>=Object.freeze(Object.fromEntries(ARCHITECT_ICON_ORDER.map(id=>[id,id==='machining-table'?originalCells['electric-tailor-bench']!:id==='art-bench'?originalCells.stonecutter!:CUSTOM_ICONS[id]?originalCells.wall!:originalCells[id]!])));

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
    if (!icon || !cell && !CUSTOM_ICONS[id]) {
      missing.push(id);
      continue;
    }
    icon.classList.add('ui-icon');
    if(CUSTOM_ICONS[id]) {
      icon.style.backgroundImage=CUSTOM_ICONS[id];
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
