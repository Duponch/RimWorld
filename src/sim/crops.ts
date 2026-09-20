/** The cultivated catalogue is separate from plants found in the wild. */
export const CROP_KINDS = ['rice', 'potato', 'corn', 'cotton'] as const;
export type CropKind = typeof CROP_KINDS[number];
export const isCropKind = (value: unknown): value is CropKind =>
  typeof value === 'string' && (CROP_KINDS as readonly string[]).includes(value);
export const isCropKindInVersion = (value: unknown, version: number): value is CropKind =>
  value === 'rice' && version >= 8 || value === 'cotton' && version >= 71
  || (value === 'potato' || value === 'corn') && version >= 84;
export const cropProduct = (kind: CropKind): 'rice' | 'potato' | 'corn' | 'cloth' => kind === 'cotton' ? 'cloth' : kind;
