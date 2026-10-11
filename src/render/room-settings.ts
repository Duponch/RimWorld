/** Browser presentation preference; independent of the cardboard diorama. */
export const ROOM_PREFERENCE_KEY = 'lisiere.presentation.room.v1';
export const DEFAULT_ROOM_ENABLED = true;

export function roomEnabled(value: unknown): boolean {
  return value === false || value === 'false' ? false : DEFAULT_ROOM_ENABLED;
}
