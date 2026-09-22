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

const CURSOR_SIZE = 40;
const CURSOR_MARGIN = 1;
const ATLAS_COLUMNS = 3;
const ATLAS_ROWS = 3;
const cursorSurfaces = new Map<string, Promise<Record<ToolCursorKind, string>>>();

/** Public for the visual contract: every cursor owns one cell, in tool-state order. */
export const TOOL_CURSOR_ATLAS = '/assets/ui/lisiere/cursors-v94.png';
export const TOOL_CURSOR_CELLS: Readonly<Record<ToolCursorKind, readonly [number, number]>> = Object.freeze({
  select: [0, 0], mine: [1, 0], chop: [2, 0],
  harvest: [0, 1], cut: [1, 1], build: [2, 1],
  deconstruct: [0, 2], zones: [1, 2], cancel: [2, 2],
});

type AlphaGeometry = { x: number; y: number; width: number; height: number; apexX: number; apexY: number };

function alphaGeometry(context: CanvasRenderingContext2D, width: number, height: number): AlphaGeometry | undefined {
  const pixels = context.getImageData(0, 0, width, height).data;
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (pixels[(y * width + x) * 4 + 3]! < 8) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right < left) return undefined;
  const apexRow: number[] = [];
  for (let x = left; x <= right; x++) if (pixels[(top * width + x) * 4 + 3]! >= 8) apexRow.push(x);
  const apexX = apexRow[Math.floor(apexRow.length / 2)] ?? left;
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1, apexX, apexY: top };
}

function loadCursorSurfaces(atlasUrl: string): Promise<Record<ToolCursorKind, string>> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const sample = document.createElement('canvas');
      const output = document.createElement('canvas'); output.width = output.height = CURSOR_SIZE;
      const sampleContext = sample.getContext('2d', { willReadFrequently: true });
      const outputContext = output.getContext('2d');
      if (!sampleContext || !outputContext) { reject(new Error('Canvas 2D indisponible pour les curseurs.')); return; }
      const surfaces = {} as Record<ToolCursorKind, string>;
      for (const cursor of TOOL_CURSOR_KINDS) {
        const [column, row] = TOOL_CURSOR_CELLS[cursor];
        const sourceX = Math.round(column * image.width / ATLAS_COLUMNS);
        const sourceY = Math.round(row * image.height / ATLAS_ROWS);
        const sourceRight = Math.round((column + 1) * image.width / ATLAS_COLUMNS);
        const sourceBottom = Math.round((row + 1) * image.height / ATLAS_ROWS);
        const sourceWidth = sourceRight - sourceX, sourceHeight = sourceBottom - sourceY;
        sample.width = sourceWidth; sample.height = sourceHeight;
        sampleContext.clearRect(0, 0, sourceWidth, sourceHeight);
        sampleContext.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
        const geometry = alphaGeometry(sampleContext, sourceWidth, sourceHeight);
        if (!geometry) { reject(new Error(`Curseur vide dans l'atlas : ${cursor}`)); return; }
        const scale = Math.min((CURSOR_SIZE - 2) / geometry.width, (CURSOR_SIZE - 2) / geometry.height);
        const targetWidth = Math.max(1, Math.round(geometry.width * scale));
        const targetHeight = Math.max(1, Math.round(geometry.height * scale));
        outputContext.clearRect(0, 0, CURSOR_SIZE, CURSOR_SIZE);
        outputContext.imageSmoothingEnabled = true;
        outputContext.imageSmoothingQuality = 'high';
        outputContext.drawImage(sample, geometry.x, geometry.y, geometry.width, geometry.height,
          CURSOR_MARGIN, CURSOR_MARGIN, targetWidth, targetHeight);
        const hotspotX = CURSOR_MARGIN + Math.round((geometry.apexX - geometry.x) * targetWidth / geometry.width);
        const hotspotY = CURSOR_MARGIN + Math.round((geometry.apexY - geometry.y) * targetHeight / geometry.height);
        const fallback = cursor === 'select' ? 'default' : cursor === 'cancel' ? 'not-allowed' : 'crosshair';
        surfaces[cursor] = `url("${output.toDataURL('image/png')}") ${hotspotX} ${hotspotY}, ${fallback}`;
      }
      resolve(surfaces);
    };
    image.onerror = () => reject(new Error(`Atlas de curseurs introuvable : ${atlasUrl}`));
    image.src = atlasUrl;
  });
}

/** Crop each illustrated arrow once, with its visible tip aligned to the CSS hotspot. */
export function installToolCursors(root: HTMLElement, atlasUrl = TOOL_CURSOR_ATLAS): void {
  let surfacesPromise = cursorSurfaces.get(atlasUrl);
  if (!surfacesPromise) { surfacesPromise = loadCursorSurfaces(atlasUrl); cursorSurfaces.set(atlasUrl, surfacesPromise); }
  void surfacesPromise.then(surfaces => {
    for (const cursor of TOOL_CURSOR_KINDS) root.style.setProperty(`--cursor-tool-${cursor}`, surfaces[cursor]);
  }).catch(() => {
    // CSS fallbacks remain usable if the decorative atlas cannot be loaded.
  });
}
