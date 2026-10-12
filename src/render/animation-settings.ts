/** Presentation preference only. Thresholds are apparent pixels per world
 * cell, including orthographic zoom and each actor's perspective depth. */
export interface AnimationSettings {
  enabled:boolean;
  nearPixels:number;
  farPixels:number;
  middleHz:number;
}

export const ANIMATION_PREFERENCE_KEY='lisiere.presentation.animation-detail.v1';
export const DEFAULT_ANIMATION_SETTINGS:Readonly<AnimationSettings>=Object.freeze({enabled:true,nearPixels:24,farPixels:8,middleHz:12});
export const ANIMATION_SETTING_LIMITS=Object.freeze({
  nearPixels:Object.freeze({min:4,max:96,step:1}),
  farPixels:Object.freeze({min:0,max:48,step:1}),
  middleHz:Object.freeze({min:1,max:60,step:1}),
});

export function parseAnimationSettings(value:unknown):AnimationSettings {
  if(typeof value==='string'){
    try{value=JSON.parse(value) as unknown;}catch{value=undefined;}
  }
  const input=value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Partial<AnimationSettings>:{};
  const number=(key:'nearPixels'|'farPixels'|'middleHz'):number=>{
    const value=input[key],limits=ANIMATION_SETTING_LIMITS[key];
    return typeof value==='number'&&Number.isFinite(value)
      ?Math.max(limits.min,Math.min(limits.max,Math.round(value))):DEFAULT_ANIMATION_SETTINGS[key];
  };
  const nearPixels=number('nearPixels');
  return {enabled:typeof input.enabled==='boolean'?input.enabled:DEFAULT_ANIMATION_SETTINGS.enabled,
    nearPixels,farPixels:Math.min(number('farPixels'),nearPixels-1),middleHz:number('middleHz')};
}
