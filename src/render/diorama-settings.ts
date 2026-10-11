/** Browser presentation preference; it never belongs to a colony save. */
export const DIORAMA_PREFERENCE_KEY = 'lisiere.presentation.diorama.v1';
export const DEFAULT_DIORAMA_ENABLED = true;

export function dioramaEnabled(value: unknown): boolean {
  return value === false || value === 'false' ? false : DEFAULT_DIORAMA_ENABLED;
}
