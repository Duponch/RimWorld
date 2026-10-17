import type {World} from './types.ts';
import type {PreparingGroup} from './group-capture.ts';
import {validGroupBedrollLoadingField256,validGroupBedrollLoadingReferences256} from './group-bedroll-loading-256.ts';
/** Inactive projection has references only. Full RAW binds every receipt to
 * its actual physical package; neither branch manufactures a missing owner. */
export function validPreparingGroupPacked256(g:PreparingGroup,w:World,version:number,referencesOnly:boolean):boolean {
 const d=Object.getOwnPropertyDescriptor(g,'bedrollLoading');if(!d)return true;return version>=256&&Object.hasOwn(d,'value')&&d.enumerable===true&&validGroupBedrollLoadingReferences256(d.value,w,g,version)&&(referencesOnly||validGroupBedrollLoadingField256(g,w,version));
}
