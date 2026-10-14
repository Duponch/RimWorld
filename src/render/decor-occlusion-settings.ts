export const DECOR_OCCLUSION_KEY='lisiere.presentation.decor-occlusion.v1';
export const DEFAULT_DECOR_OCCLUSION_ENABLED=true;
const explicitZero=(value:unknown)=>value!==null&&value!==undefined&&value!==''
  &&(typeof value==='number'||typeof value==='string')&&Number(value)===0;
/** A radius never becomes an occlusion depth. Only a user's explicit disable
 * of both previous masks supplies the initial disabled preference. */
export function decorOcclusionEnabled(value:unknown,oldCloudRadius?:unknown,oldRoomRadius?:unknown):boolean {
  if(value===false||value==='false')return false;
  if(value===true||value==='true')return true;
  if(value===null||value===undefined||value==='')return !(explicitZero(oldCloudRadius)&&explicitZero(oldRoomRadius));
  return DEFAULT_DECOR_OCCLUSION_ENABLED;
}
