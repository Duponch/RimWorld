export type ShadowFrequency = 0 | 30 | 60 | 120;
export type ShadowResolution = 512 | 1024 | 2048 | 4096;
export interface ShadowSettings { frequency: ShadowFrequency; resolution: ShadowResolution }

export const SHADOW_PREFERENCE_KEY = 'lisiere.presentation.shadows.v1';
export const DEFAULT_SHADOW_SETTINGS: Readonly<ShadowSettings> = Object.freeze({ frequency: 60, resolution: 2048 });
export const SHADOW_FREQUENCY_OPTIONS = [
  { value: 30, label: '30 Hz' }, { value: 60, label: '60 Hz' },
  { value: 120, label: '120 Hz' }, { value: 0, label: 'À chaque image' },
] as const;
export const SHADOW_RESOLUTION_OPTIONS = [
  { value: 512, label: '512' }, { value: 1024, label: '1024' },
  { value: 2048, label: '2048' }, { value: 4096, label: '4096' },
] as const;

/** Presentation preference only. Each malformed field uses its own default. */
export function parseShadowSettings(value: unknown): ShadowSettings {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return { ...DEFAULT_SHADOW_SETTINGS }; }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_SHADOW_SETTINGS };
  const record = value as Record<string, unknown>;
  return {
    frequency: SHADOW_FREQUENCY_OPTIONS.some(option => option.value === record.frequency)
      ? record.frequency as ShadowFrequency : DEFAULT_SHADOW_SETTINGS.frequency,
    resolution: SHADOW_RESOLUTION_OPTIONS.some(option => option.value === record.resolution)
      ? record.resolution as ShadowResolution : DEFAULT_SHADOW_SETTINGS.resolution,
  };
}
