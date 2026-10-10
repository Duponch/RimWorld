/** Radius in fractions of the viewport's shorter side. This affects only the
 * decorative cloud cutout, never weather, visibility or simulation rules. */
export const DEFAULT_CLOUD_MASK_RADIUS = .31;
export const CLOUD_MASK_RADIUS_KEY = 'lisiere.presentation.cloud-mask-radius.v1';

export function cloudMaskRadius(value: unknown): number {
  if (value === null || value === undefined || value === '') return DEFAULT_CLOUD_MASK_RADIUS;
  if (typeof value !== 'number' && typeof value !== 'string') return DEFAULT_CLOUD_MASK_RADIUS;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : DEFAULT_CLOUD_MASK_RADIUS;
}

export function cloudMaskRadiusLabel(radius: number): string {
  const percent = Math.round(cloudMaskRadius(radius) * 100);
  return percent === 0 ? 'Aucun masquage central' : `Rayon : ${percent} % du petit côté de l’écran`;
}
