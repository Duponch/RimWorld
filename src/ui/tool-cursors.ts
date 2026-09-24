import type { Tool } from './layout';

export const UI_ICONS = ['mine', 'chop', 'harvest', 'cut', 'wood', 'steel', 'component', 'silver', 'medicine', 'blocks', 'food', 'meal', 'home', 'clock', 'people', 'research', 'leaf', 'eye', 'layers', 'pointer'] as const;
export type UiIcon = typeof UI_ICONS[number];

/** Cursor shapes describe interactions, never the artwork of an Architect tool. */
export const CURSOR_KINDS = ['pointer', 'link', 'wait', 'zoom', 'text', 'grab', 'grabbing', 'forbidden', 'resize'] as const;
export type CursorKind = typeof CURSOR_KINDS[number];
export const CURSOR_ATLAS = '/assets/ui/lisiere/cursors-v95.png';
export const CURSOR_CELLS: Readonly<Record<CursorKind, readonly [number, number]>> = Object.freeze({
  pointer: [0, 0], link: [1, 0], wait: [2, 0],
  zoom: [0, 1], text: [1, 1], grab: [2, 1],
  grabbing: [0, 2], forbidden: [1, 2], resize: [2, 2],
});

/** Every map tool keeps the standard arrow, including cancellation. */
export function toolCursorKind(_tool: Tool): CursorKind { return 'pointer'; }
export function syncToolCursor(viewport: HTMLElement, tool: Tool): CursorKind {
  const cursor = toolCursorKind(tool);
  if (viewport.dataset.cursor !== cursor) viewport.dataset.cursor = cursor;
  return cursor;
}

const CURSOR_SIZE = 40;
const CURSOR_MARGIN = 1;
const ALPHA_THRESHOLD = 8;
const cursorSurfaces = new Map<string, Promise<Record<CursorKind, string>>>();
type AlphaGeometry = { x: number; y: number; width: number; height: number; apexX: number; apexY: number };

function alphaGeometry(context: CanvasRenderingContext2D, width: number, height: number): AlphaGeometry | undefined {
  const pixels = context.getImageData(0, 0, width, height).data;
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (pixels[(y * width + x) * 4 + 3]! < ALPHA_THRESHOLD) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right < left) return undefined;
  const apexRow: number[] = [];
  for (let x = left; x <= right; x++) if (pixels[(top * width + x) * 4 + 3]! >= ALPHA_THRESHOLD) apexRow.push(x);
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1, apexX: apexRow[Math.floor(apexRow.length / 2)] ?? left, apexY: top };
}

/** Pointer and finger act at the tip; the lens acts within its glass. */
export function cursorHotspot(kind: CursorKind, geometry: AlphaGeometry, targetWidth: number, targetHeight: number): readonly [number, number] {
  if (kind === 'pointer' || kind === 'link') {
    const hotspotX = CURSOR_MARGIN + Math.round((geometry.apexX - geometry.x) * targetWidth / geometry.width);
    const hotspotY = CURSOR_MARGIN + Math.round((geometry.apexY - geometry.y) * targetHeight / geometry.height);
    return [hotspotX, hotspotY];
  }
  if (kind === 'zoom') return [CURSOR_MARGIN + Math.round(targetWidth * .36), CURSOR_MARGIN + Math.round(targetHeight * .35)];
  return [CURSOR_MARGIN + Math.round(targetWidth / 2), CURSOR_MARGIN + Math.round(targetHeight / 2)];
}

const FALLBACK: Readonly<Record<CursorKind, string>> = {
  pointer: 'default', link: 'pointer', wait: 'wait', zoom: 'zoom-in', text: 'text',
  grab: 'grab', grabbing: 'grabbing', forbidden: 'not-allowed', resize: 'nwse-resize',
};

function loadCursorSurfaces(atlasUrl: string): Promise<Record<CursorKind, string>> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const sample = document.createElement('canvas');
      const output = document.createElement('canvas'); output.width = output.height = CURSOR_SIZE;
      const sampleContext = sample.getContext('2d', { willReadFrequently: true });
      const outputContext = output.getContext('2d');
      if (!sampleContext || !outputContext) { reject(new Error('Canvas 2D indisponible pour les curseurs.')); return; }
      const surfaces = {} as Record<CursorKind, string>;
      for (const kind of CURSOR_KINDS) {
        const [column, row] = CURSOR_CELLS[kind];
        const sourceX = Math.round(column * image.width / 3), sourceY = Math.round(row * image.height / 3);
        const sourceRight = Math.round((column + 1) * image.width / 3), sourceBottom = Math.round((row + 1) * image.height / 3);
        const sourceWidth = sourceRight - sourceX, sourceHeight = sourceBottom - sourceY;
        sample.width = sourceWidth; sample.height = sourceHeight;
        sampleContext.clearRect(0, 0, sourceWidth, sourceHeight);
        sampleContext.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
        const geometry = alphaGeometry(sampleContext, sourceWidth, sourceHeight);
        if (!geometry) { reject(new Error(`Curseur vide dans l'atlas : ${kind}`)); return; }
        const scale = Math.min((CURSOR_SIZE - 2) / geometry.width, (CURSOR_SIZE - 2) / geometry.height);
        const targetWidth = Math.max(1, Math.round(geometry.width * scale)), targetHeight = Math.max(1, Math.round(geometry.height * scale));
        outputContext.clearRect(0, 0, CURSOR_SIZE, CURSOR_SIZE);
        outputContext.imageSmoothingEnabled = true;
        outputContext.imageSmoothingQuality = 'high';
        outputContext.drawImage(sample, geometry.x, geometry.y, geometry.width, geometry.height,
          CURSOR_MARGIN, CURSOR_MARGIN, targetWidth, targetHeight);
        const [hotspotX, hotspotY] = cursorHotspot(kind, geometry, targetWidth, targetHeight);
        surfaces[kind] = `url("${output.toDataURL('image/png')}") ${hotspotX} ${hotspotY}, ${FALLBACK[kind]}`;
      }
      resolve(surfaces);
    };
    image.onerror = () => reject(new Error(`Atlas de curseurs introuvable : ${atlasUrl}`));
    image.src = atlasUrl;
  });
}

function installViewportGestures(root: HTMLElement): void {
  const viewport = root.querySelector<HTMLElement>('#viewport');
  if (!viewport) return;
  let activePointer: number | null = null;
  let gestureTimer: ReturnType<typeof setTimeout> | undefined;
  const clearTimer = () => { if (gestureTimer !== undefined) clearTimeout(gestureTimer); gestureTimer = undefined; };
  const restore = () => { clearTimer(); viewport.removeAttribute('data-cursor-gesture'); };
  const briefly = (kind: 'grab' | 'zoom') => {
    clearTimer(); viewport.dataset.cursorGesture = kind;
    gestureTimer = setTimeout(restore, kind === 'zoom' ? 360 : 180);
  };
  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 1 && event.button !== 2) return;
    clearTimer(); activePointer = event.pointerId; viewport.dataset.cursorGesture = 'grabbing';
  }, true);
  window.addEventListener('pointerup', event => {
    if (event.pointerId !== activePointer) return;
    activePointer = null; briefly('grab');
  }, true);
  window.addEventListener('pointercancel', event => { if (event.pointerId === activePointer) { activePointer = null; restore(); } }, true);
  window.addEventListener('blur', () => { activePointer = null; restore(); });
  viewport.addEventListener('wheel', () => { if (activePointer === null) briefly('zoom'); }, { passive: true });
}

/** Crop each cell once; native CSS cursors remain available if the atlas fails. */
export function installToolCursors(root: HTMLElement, atlasUrl = CURSOR_ATLAS): void {
  let surfacesPromise = cursorSurfaces.get(atlasUrl);
  if (!surfacesPromise) { surfacesPromise = loadCursorSurfaces(atlasUrl); cursorSurfaces.set(atlasUrl, surfacesPromise); }
  void surfacesPromise.then(surfaces => {
    for (const kind of CURSOR_KINDS) root.style.setProperty(`--cursor-${kind}`, surfaces[kind]);
  }).catch(() => {
    // Native CSS fallbacks remain usable when the decorative atlas cannot load.
  });
  installViewportGestures(root);
}
