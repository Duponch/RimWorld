export interface NativeDockPreferences {bottom:boolean;notifications:boolean}
export const NATIVE_DOCK_PREFERENCE_KEY='elsewhere.ui3d.auto-hide.v1';
export function parseNativeDockPreferences(raw:string|null):NativeDockPreferences {
 try{const value:unknown=raw?JSON.parse(raw):undefined;if(value&&typeof value==='object')return {bottom:'bottom'in value&&value.bottom===true,notifications:'notifications'in value&&value.notifications===true};}catch{ /* Keep visible controls when storage is unreadable. */ }
 return {bottom:false,notifications:false};
}
