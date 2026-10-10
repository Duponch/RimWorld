import './ui-fonts.css';

/** Complete, unmodified Google Fonts files, served locally with their OFL licences. */
export const UI_FONT_CHOICES = [
  { id: 'comfortaa', label: 'Comfortaa', family: 'Comfortaa', asset: '/assets/fonts/v306/comfortaa.ttf', weight: '300 700' },
  { id: 'baloo-2', label: 'Baloo 2', family: 'Baloo 2', asset: '/assets/fonts/v306/baloo-2.ttf', weight: '400 800' },
  { id: 'bree-serif', label: 'Bree Serif', family: 'Bree Serif', asset: '/assets/fonts/v306/bree-serif.ttf', weight: '400' },
  { id: 'grandstander', label: 'Grandstander', family: 'Grandstander', asset: '/assets/fonts/v306/grandstander.ttf', weight: '100 900' },
  { id: 'patrick-hand', label: 'Patrick Hand', family: 'Patrick Hand', asset: '/assets/fonts/v306/patrick-hand.ttf', weight: '400' },
  { id: 'quicksand', label: 'Quicksand', family: 'Quicksand', asset: '/assets/fonts/v306/quicksand.ttf', weight: '300 700' },
] as const;
export type UiFontId = typeof UI_FONT_CHOICES[number]['id'];
export const DEFAULT_UI_FONT: UiFontId = 'comfortaa';
export const UI_FONT_STORAGE_KEY = 'lisiere.ui-font';

function fontChoice(id: unknown) {
  return UI_FONT_CHOICES.find(choice => choice.id === id) ?? UI_FONT_CHOICES[0];
}

/** A denied storage permission or an obsolete preference keeps the default usable. */
export function readUiFont(storage?: Pick<Storage, 'getItem'>): UiFontId {
  try { return fontChoice((storage ?? localStorage).getItem(UI_FONT_STORAGE_KEY)).id; }
  catch { return DEFAULT_UI_FONT; }
}

export function saveUiFont(id: UiFontId, storage?: Pick<Storage, 'setItem'>): void {
  try { (storage ?? localStorage).setItem(UI_FONT_STORAGE_KEY, fontChoice(id).id); }
  catch { /* The choice still applies for this session when storage is unavailable. */ }
}

/** Apply immediately; font loading never delays input or changes layout sizes explicitly. */
export function applyUiFont(id: UiFontId, root: HTMLElement = document.documentElement): void {
  const choice = fontChoice(id);
  const family = `"${choice.family}", "Segoe UI", sans-serif`;
  root.dataset.uiFont = choice.id;
  root.style.setProperty('--ui-font', family);
  root.style.setProperty('--font-body', family);
  root.style.setProperty('--font-pop', family);
}

/** Optional readiness barrier for the selected face only, including French glyphs. */
export async function loadUiFont(id: UiFontId, fonts: Pick<FontFaceSet, 'load'> = document.fonts): Promise<void> {
  const choice = fontChoice(id);
  await Promise.all([400, 700].map(weight => fonts.load(`${weight} 16px "${choice.family}"`, 'Éléonore, cœur, œuf, ça, où, Noël.')));
}
