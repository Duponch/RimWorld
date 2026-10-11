export interface LightingSettings { sun: number; moon: number; ambient: number }

export const LIGHTING_PREFERENCE_KEY = 'lisiere.presentation.lighting.v1';
export const DEFAULT_LIGHTING_SETTINGS: Readonly<LightingSettings> = Object.freeze({ sun: 1, moon: 1, ambient: 1 });
export const LIGHTING_CONTROLS = [
  { key: 'sun', label: 'Soleil', description: 'Intensité de la lumière du soleil.' },
  { key: 'moon', label: 'Lune', description: 'Intensité de la lumière de la lune.' },
  { key: 'ambient', label: 'Ambiance', description: 'Lumière douce pour lire la carte, même la nuit.' },
] as const;

/** Browser presentation only. Missing or invalid fields use their own default. */
export function parseLightingSettings(value: unknown): LightingSettings {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return { ...DEFAULT_LIGHTING_SETTINGS }; }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_LIGHTING_SETTINGS };
  const record = value as Record<string, unknown>;
  const intensity = (key: keyof LightingSettings) => typeof record[key] === 'number' && Number.isFinite(record[key])
    ? Math.max(0, Math.min(3, record[key] as number)) : DEFAULT_LIGHTING_SETTINGS[key];
  return { sun: intensity('sun'), moon: intensity('moon'), ambient: intensity('ambient') };
}

export function lightingPercentLabel(value: number): string { return `${Math.round(value * 100)} %`; }
