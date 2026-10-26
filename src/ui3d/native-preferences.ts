export interface NativeDockPreferences {bottom:boolean;notifications:boolean}
export const NATIVE_DOCK_PREFERENCE_KEY='elsewhere.ui3d.auto-hide.v1';
export const NATIVE_UI_SCALE_PREFERENCE_KEY='elsewhere.ui3d.scale.v1';
export const NATIVE_UI_SCALE_LIMITS={min:.75,max:2,step:.05,default:1} as const;
/** One logical scale shared by scene layout and pointer conversion. This is a
 * display preference only; it never enters a colony or campaign save. */
export function normalizeNativeUiScale(value:number):number {
 if(!Number.isFinite(value))return NATIVE_UI_SCALE_LIMITS.default;
 return Math.round(Math.max(NATIVE_UI_SCALE_LIMITS.min,Math.min(NATIVE_UI_SCALE_LIMITS.max,value))*20)/20;
}
export function parseNativeUiScale(raw:string|null):number {
 try{const value:unknown=raw===null?undefined:JSON.parse(raw);if(typeof value==='number')return normalizeNativeUiScale(value);}catch{ /* Keep the default if browser storage is unreadable. */ }
 return NATIVE_UI_SCALE_LIMITS.default;
}
export function parseNativeDockPreferences(raw:string|null):NativeDockPreferences {
 try{const value:unknown=raw?JSON.parse(raw):undefined;if(value&&typeof value==='object')return {bottom:'bottom'in value&&value.bottom===true,notifications:'notifications'in value&&value.notifications===true};}catch{ /* Keep visible controls when storage is unreadable. */ }
 return {bottom:false,notifications:false};
}
