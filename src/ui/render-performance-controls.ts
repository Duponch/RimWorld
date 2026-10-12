import { DEFAULT_SHADOW_SETTINGS, SHADOW_FREQUENCY_OPTIONS, SHADOW_RESOLUTION_OPTIONS, parseShadowSettings, type ShadowSettings } from '../render/shadow-settings';
import { DEFAULT_ANIMATION_SETTINGS, parseAnimationSettings, type AnimationSettings } from '../render/animation-settings';

export interface RenderPerformanceControls {
  getShadows: () => ShadowSettings;
  setShadows: (settings: ShadowSettings) => boolean;
  getAnimations: () => AnimationSettings;
  setAnimations: (settings: AnimationSettings) => boolean;
  onStorageFailure: () => void;
}

/** One layout and binding for the home and in-game menus. IDs are scoped so
 * both menus can exist at once without sharing labels or event listeners. */
export function renderPerformanceLayout(prefix: string): string {
  const row = (id: string, label: string, description: string, control: string, output = false) =>
    `<label class="presentation-setting"><span><strong id="${prefix}${id}-label">${label}</strong><small id="${prefix}${id}-description">${description}</small>${output ? `<output id="${prefix}${id}-value"></output>` : ''}</span>${control}</label>`;
  const attributes = (id: string, output = false) => `id="${prefix}${id}" aria-labelledby="${prefix}${id}-label" aria-describedby="${prefix}${id}-description${output ? ` ${prefix}${id}-value` : ''}"`;
  const select = (id: string, choices: readonly { value: number; label: string }[]) => `<select ${attributes(id)}>${choices.map(({value,label})=>`<option value="${value}">${label}</option>`).join('')}</select>`;
  const slider = (id: string, min: number, max: number) => `<input ${attributes(id,true)} type="range" min="${min}" max="${max}" step="1">`;
  return row('shadow-frequency','Fréquence des ombres','Plafond de rafraîchissement en lecture. Un changement de caméra ou d’affichage actualise immédiatement les ombres.',select('shadow-frequency',SHADOW_FREQUENCY_OPTIONS))
    + row('shadow-resolution','Résolution des ombres','Précision de la carte d’ombres, indépendante de sa fréquence. 2048 conserve la précision habituelle.',select('shadow-resolution',SHADOW_RESOLUTION_OPTIONS))
    + row('animation-enabled','Adapter toutes les animations à la distance','Gestes, déplacements visibles, animaux, végétaux, effets et astres. La simulation et les règles continuent normalement.',`<input ${attributes('animation-enabled')} type="checkbox">`)
    + row('animation-near','Animations complètes','Taille apparente minimale d’une case à l’écran. En dessous : poses et effets mis en cache à fréquence réduite.',slider('animation-near',4,96),true)
    + row('animation-far','Arrêt des animations éloignées','Sous cette taille apparente, les poses restent fixes et les particules sont retirées. 0 : aucun arrêt. Zoom isométrique et profondeur en perspective pris en compte.',slider('animation-far',0,48),true)
    + row('animation-frequency','Fréquence à mi-distance','Mises à jour par seconde réelle, indépendamment de la vitesse ×1 ou ×6. La caméra et les interactions restent immédiates.',slider('animation-frequency',1,60),true)
    + `<div class="render-performance-presets"><button id="${prefix}performance-balanced" type="button">Équilibré</button><button id="${prefix}performance-continuous" type="button">Tout animer à chaque image</button></div>`;
}

export function bindRenderPerformanceControls(host: ParentNode, prefix: string, options: RenderPerformanceControls): () => void {
  const get = <T extends HTMLElement>(id: string): T => {
    const node = host.querySelector<T>(`#${prefix}${id}`);
    if (!node) throw new Error(`Missing render option: ${prefix}${id}`);
    return node;
  };
  const shadowFrequency=get<HTMLSelectElement>('shadow-frequency'), resolution=get<HTMLSelectElement>('shadow-resolution');
  const enabled=get<HTMLInputElement>('animation-enabled'), near=get<HTMLInputElement>('animation-near'), far=get<HTMLInputElement>('animation-far'), frequency=get<HTMLInputElement>('animation-frequency');
  const refresh = () => {
    const shadows=parseShadowSettings(options.getShadows()), animations=parseAnimationSettings(options.getAnimations());
    shadowFrequency.value=String(shadows.frequency);resolution.value=String(shadows.resolution);
    far.max=String(Math.min(48,animations.nearPixels-1));
    enabled.checked=animations.enabled;near.value=String(animations.nearPixels);far.value=String(animations.farPixels);frequency.value=String(animations.middleHz);
    get('animation-near-value').textContent=`${animations.nearPixels} px / case`;
    get('animation-far-value').textContent=animations.farPixels===0?'Aucun arrêt':`${animations.farPixels} px / case`;
    get('animation-frequency-value').textContent=`${animations.middleHz} Hz`;
    near.disabled=far.disabled=frequency.disabled=!animations.enabled;
  };
  const save = (stored: boolean) => { refresh();if(!stored)options.onStorageFailure(); };
  shadowFrequency.addEventListener('change',()=>save(options.setShadows(parseShadowSettings({...options.getShadows(),frequency:Number(shadowFrequency.value)}))));
  resolution.addEventListener('change',()=>save(options.setShadows(parseShadowSettings({...options.getShadows(),resolution:Number(resolution.value)}))));
  enabled.addEventListener('change',()=>save(options.setAnimations({...options.getAnimations(),enabled:enabled.checked})));
  near.addEventListener('input',()=>save(options.setAnimations(parseAnimationSettings({...options.getAnimations(),nearPixels:Number(near.value)}))));
  far.addEventListener('input',()=>save(options.setAnimations(parseAnimationSettings({...options.getAnimations(),farPixels:Number(far.value)}))));
  frequency.addEventListener('input',()=>save(options.setAnimations(parseAnimationSettings({...options.getAnimations(),middleHz:Number(frequency.value)}))));
  get('performance-balanced').addEventListener('click',()=>{
    const shadows=options.setShadows({...DEFAULT_SHADOW_SETTINGS}), animations=options.setAnimations({...DEFAULT_ANIMATION_SETTINGS});save(shadows&&animations);
  });
  get('performance-continuous').addEventListener('click',()=>{
    const shadows=options.setShadows({...options.getShadows(),frequency:0}), animations=options.setAnimations({...options.getAnimations(),enabled:false});save(shadows&&animations);
  });
  refresh();return refresh;
}
