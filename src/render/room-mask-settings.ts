/** Central cutout for the room's suspended decorations, in fractions of the
 * viewport's shorter side. The cloud preference remains independent. */
export const DEFAULT_ROOM_MASK_RADIUS = .31;
export const ROOM_MASK_RADIUS_KEY = 'lisiere.presentation.room-mask-radius.v1';

export function roomMaskRadius(value: unknown): number {
  if (value === null || value === undefined || typeof value === 'string' && value.trim() === '') return DEFAULT_ROOM_MASK_RADIUS;
  if (typeof value !== 'number' && typeof value !== 'string') return DEFAULT_ROOM_MASK_RADIUS;
  const radius = Number(value);
  return Number.isFinite(radius) ? Math.max(0, Math.min(1, radius)) : DEFAULT_ROOM_MASK_RADIUS;
}

export function roomMaskRadiusLabel(radius: number): string {
  const percent = Math.round(roomMaskRadius(radius) * 100);
  return percent === 0 ? 'Aucun masquage central' : `Rayon : ${percent} % du petit côté de l’écran`;
}
