import { Box3, Frustum, Matrix4, PerspectiveCamera, Vector3, type OrthographicCamera } from 'three/webgpu';
import { QUALITY_LABELS, type WeaponQuality } from '../sim/equipment-rules';
import { ITEM_DEFINITIONS } from '../sim/items';
import type { MaterialPile, World } from '../sim/types';
import { perspectiveDetailRange } from './map-overlay-detail';

export const PILE_LABEL_MIN_CELL_PIXELS = 96;

const QUALITY_SHORT: Readonly<Record<WeaponQuality, string>> = {
  awful: 'dépl.', poor: 'médi.', normal: 'norm.', good: 'bon',
  excellent: 'exc.', masterwork: 'chef-d’œuvre', legendary: 'lég.',
};

function pileCaption(pile: MaterialPile): string {
  // Core labels even a single unit when the thing's stack limit is above one.
  if (ITEM_DEFINITIONS[pile.item].stackLimit > 1) return String(pile.quantity);
  const quality = pile.weapon?.quality ?? pile.apparel?.quality;
  if (quality) return QUALITY_SHORT[quality] ?? QUALITY_LABELS[quality];
  return '';
}

/** Close-zoom GUI labels, batched in one 2D canvas. No per-pile DOM or GPU mesh. */
export class MapLabelsOverlay {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly point = new Vector3();
  private readonly frustum = new Frustum();
  private readonly projectionView = new Matrix4();
  private source: World | null | undefined;
  private chunks: { bounds: Box3; entries: { x: number; z: number; label: string }[] }[] = [];
  private width = 0;
  private height = 0;
  private ratio = 1;
  private visible = false;

  constructor(host: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'map-labels-overlay';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.hidden = true;
    this.context = this.canvas.getContext('2d', { alpha: true })!;
    // Keep the WebGPU canvas as the sole #viewport canvas; the existing input
    // and accessibility helpers intentionally target that single surface.
    // Keep the overlay next to the viewport but before the interface panels
    // in paint order. It must stay outside #viewport: WebGPU is its sole canvas.
    host.after(this.canvas);
  }

  private index(world: World): void {
    if (this.source === world) return;
    this.source = world;
    const chunks = new Map<number, { bounds: Box3; entries: { x: number; z: number; label: string }[] }>();
    const add = (x: number, z: number, label: string): void => {
      if (!label) return;
      const cx = Math.floor(x / 16), cz = Math.floor(z / 16), key = cz * Math.ceil(world.width / 16) + cx;
      let chunk = chunks.get(key);
      if (!chunk) {
        chunk = {
          bounds: new Box3(new Vector3(cx * 16 - .5, -.5, cz * 16 - .5), new Vector3(cx * 16 + 15.5, 2.5, cz * 16 + 15.5)),
          entries: [],
        };
        chunks.set(key, chunk);
      }
      chunk.entries.push({ x, z, label });
    };
    for (const pile of world.piles) if (pile.owner.type === 'ground') add(pile.owner.x, pile.owner.z, pileCaption(pile));
    for (const packed of world.packed) if (packed.owner.type === 'ground' && packed.building.quality)
      add(packed.owner.x, packed.owner.z, QUALITY_SHORT[packed.building.quality]);
    this.chunks = [...chunks.values()];
  }

  draw(world: World | null | undefined, camera: OrthographicCamera | PerspectiveCamera, cellPixels: number, width: number, height: number): void {
    // RimWorld shows item overlays at its closest detail levels. At other
    // scales the early exit avoids the pile scan and all canvas operations.
    if (!world || cellPixels < PILE_LABEL_MIN_CELL_PIXELS || !width || !height) {
      if (this.visible) { this.canvas.hidden = true; this.visible = false; }
      return;
    }
    if (!this.visible) { this.canvas.hidden = false; this.visible = true; }
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    if (this.width !== width || this.height !== height || this.ratio !== ratio) {
      this.width = width; this.height = height; this.ratio = ratio;
      this.canvas.width = Math.ceil(width * ratio);
      this.canvas.height = Math.ceil(height * ratio);
    }
    const ctx = this.context;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.font = '12px Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(24, 29, 27, .85)';
    ctx.fillStyle = '#fff4d9';
    camera.updateMatrixWorld();
    this.index(world);
    this.frustum.setFromProjectionMatrix(this.projectionView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const maxDistance = camera instanceof PerspectiveCamera
      ? perspectiveDetailRange(camera, height, PILE_LABEL_MIN_CELL_PIXELS) : Infinity;
    const maxDistanceSquared = maxDistance * maxDistance;
    const occupied = new Map<number, number>();
    for (const chunk of this.chunks) {
      if (!this.frustum.intersectsBox(chunk.bounds) || chunk.bounds.distanceToPoint(camera.position) > maxDistance) continue;
      for (const { x, z, label } of chunk.entries) {
        this.point.set(x, .32, z);
        if (this.point.distanceToSquared(camera.position) > maxDistanceSquared) continue;
        this.point.project(camera);
        if (this.point.z < -1 || this.point.z > 1 || Math.abs(this.point.x) > 1.08 || Math.abs(this.point.y) > 1.08) continue;
        const screenX = (this.point.x + 1) * width * .5;
        const screenY = (1 - this.point.y) * height * .5;
        const cell = z * world.width + x, overlap = occupied.get(cell) ?? 0;
        occupied.set(cell, overlap + 1);
        const y = screenY + Math.min(overlap, 3) * 12;
        ctx.strokeText(label, screenX, y); ctx.fillText(label, screenX, y);
      }
    }
  }

  dispose(): void { this.canvas.remove(); }
}
