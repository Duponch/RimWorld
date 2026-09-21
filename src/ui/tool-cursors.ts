import type { Tool } from './layout';

export const UI_ICONS = ['mine', 'chop', 'harvest', 'cut', 'wood', 'steel', 'component', 'silver', 'medicine', 'blocks', 'food', 'meal', 'home', 'clock', 'people', 'research', 'leaf', 'eye', 'layers', 'pointer'] as const;
export type UiIcon = typeof UI_ICONS[number];

export const TOOL_CURSOR_KINDS = ['select', 'mine', 'chop', 'harvest', 'cut', 'build', 'deconstruct', 'zones', 'cancel'] as const;
export type ToolCursorKind = typeof TOOL_CURSOR_KINDS[number];

const ZONE_TOOLS = new Set<Tool>([
  'home', 'remove-home', 'ignore-roof', 'haul-chunks', 'stockpile', 'remove-stockpile',
  'growing', 'remove-growing', 'build-roof', 'remove-roof',
]);

/** Collapse every real architect tool onto the small cursor vocabulary. */
export function toolCursorKind(tool: Tool): ToolCursorKind {
  if (tool === 'select' || tool === 'mine' || tool === 'chop' || tool === 'harvest' || tool === 'cut' || tool === 'cancel') return tool;
  if (tool === 'deconstruct' || tool === 'uninstall' || tool === 'remove-floor') return 'deconstruct';
  if (ZONE_TOOLS.has(tool)) return 'zones';
  return 'build';
}

/** Called from applyTool: the tool state, rather than button presentation, is authoritative. */
export function syncToolCursor(viewport: HTMLElement, tool: Tool): ToolCursorKind {
  const cursor = toolCursorKind(tool);
  if (viewport.dataset.cursor !== cursor) viewport.dataset.cursor = cursor;
  return cursor;
}

type CursorRecipe = { icon: UiIcon; fallback: string; badge?: 'minus' | 'cross' };
const CURSOR_RECIPES: Record<ToolCursorKind, CursorRecipe> = {
  select: { icon: 'pointer', fallback: 'default' },
  mine: { icon: 'mine', fallback: 'crosshair' },
  chop: { icon: 'chop', fallback: 'crosshair' },
  harvest: { icon: 'harvest', fallback: 'crosshair' },
  cut: { icon: 'cut', fallback: 'crosshair' },
  build: { icon: 'home', fallback: 'crosshair' },
  deconstruct: { icon: 'mine', fallback: 'crosshair', badge: 'minus' },
  zones: { icon: 'layers', fallback: 'crosshair' },
  cancel: { icon: 'pointer', fallback: 'not-allowed', badge: 'cross' },
};

const CURSOR_SIZE = 40;
const HOTSPOT = 4;
let cursorSurfaces: Promise<Record<ToolCursorKind, string>> | undefined;

function drawTarget(context: CanvasRenderingContext2D): void {
  context.save();
  context.lineCap = 'round';
  context.lineWidth = 2;
  context.strokeStyle = '#24180d';
  context.fillStyle = '#ffe2a0';
  context.beginPath(); context.arc(HOTSPOT, HOTSPOT, 3, 0, Math.PI * 2); context.fill(); context.stroke();
  context.strokeStyle = '#fff7d5'; context.lineWidth = 1;
  context.beginPath();
  context.moveTo(HOTSPOT, 0); context.lineTo(HOTSPOT, 8);
  context.moveTo(0, HOTSPOT); context.lineTo(8, HOTSPOT);
  context.stroke();
  context.restore();
}

function drawBadge(context: CanvasRenderingContext2D, badge: CursorRecipe['badge']): void {
  if (!badge) return;
  context.save();
  context.lineCap = 'round'; context.lineWidth = 5; context.strokeStyle = '#32180f';
  const strokes = badge === 'cross'
    ? [[[27, 27], [36, 36]], [[36, 27], [27, 36]]]
    : [[[26, 32], [37, 32]]];
  for (const [[x1, y1], [x2, y2]] of strokes) { context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke(); }
  context.lineWidth = 2; context.strokeStyle = badge === 'cross' ? '#f08b63' : '#ffe2a0';
  for (const [[x1, y1], [x2, y2]] of strokes) { context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke(); }
  context.restore();
}

function loadCursorSurfaces(atlasUrl: string): Promise<Record<ToolCursorKind, string>> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = CURSOR_SIZE;
      const context = canvas.getContext('2d');
      if (!context) { reject(new Error('Canvas 2D indisponible pour les curseurs.')); return; }
      const cellWidth = image.width / 4, cellHeight = image.height / 5;
      const surfaces = {} as Record<ToolCursorKind, string>;
      for (const cursor of TOOL_CURSOR_KINDS) {
        const recipe = CURSOR_RECIPES[cursor], index = UI_ICONS.indexOf(recipe.icon);
        context.clearRect(0, 0, CURSOR_SIZE, CURSOR_SIZE);
        context.drawImage(image, index % 4 * cellWidth, Math.floor(index / 4) * cellHeight, cellWidth, cellHeight, 8, 7, 31, 31);
        drawBadge(context, recipe.badge); drawTarget(context);
        surfaces[cursor] = `url("${canvas.toDataURL('image/png')}") ${HOTSPOT} ${HOTSPOT}, ${recipe.fallback}`;
      }
      resolve(surfaces);
    };
    image.onerror = () => reject(new Error(`Atlas de curseurs introuvable : ${atlasUrl}`));
    image.src = atlasUrl;
  });
}

/** Rasterize the existing icon atlas once, then share its cursor surfaces as CSS variables. */
export function installToolCursors(root: HTMLElement, atlasUrl = '/assets/ui/lisiere/icons.png'): void {
  cursorSurfaces ??= loadCursorSurfaces(atlasUrl);
  void cursorSurfaces.then(surfaces => {
    for (const cursor of TOOL_CURSOR_KINDS) root.style.setProperty(`--cursor-tool-${cursor}`, surfaces[cursor]);
  }).catch(() => {
    // CSS fallbacks remain usable if the decorative atlas cannot be loaded.
  });
}
