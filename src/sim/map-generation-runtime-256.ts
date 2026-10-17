import {isSchema256Or257} from './schema-compatibility-257.ts';
/** Two real generation statics, owned by the campaign registry. Working
 * roots/rectangles are cleared per map and are deliberately not stored here.
 * Persisting these small lists is an Elsewhere deterministic-save adaptation:
 * Core process statics themselves are not reconstructed from a saved terrain. */
export interface MapGenerationRuntime256 {
 readonly revision:1;
 /** null is genuinely never materialized, not an arbitrary chosen order. */
 readonly adjacentPermutation:readonly number[]|null;
 readonly edgeSelection?:{readonly width:number;readonly height:number;readonly edgeCells:readonly number[]};
}
type Edge256=NonNullable<MapGenerationRuntime256['edgeSelection']>;
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.getOwnPropertyDescriptor(v,k)?.enumerable===true&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
const integer=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
function dense(v:unknown,n:number):v is number[] {
 if(!Array.isArray(v)||Object.getPrototypeOf(v)!==Array.prototype||v.length!==n||Reflect.ownKeys(v).length!==n+1)return false;
 for(let i=0;i<n;i++){const d=Object.getOwnPropertyDescriptor(v,String(i));if(!d||!Object.hasOwn(d,'value')||!d.enumerable)return false;}return true;
}
function permutation(v:unknown):v is number[] {return dense(v,8)&&v.every(n=>integer(n,0,7))&&new Set(v).size===8;}
function edge(v:unknown):v is Edge256 {
 if(!record(v)||Reflect.ownKeys(v).length!==3||!integer(v.width,8,400)||!integer(v.height,8,400)||!dense(v.edgeCells,2*(v.width+v.height)-4))return false;
 const width=v.width,height=v.height;
 return new Set(v.edgeCells).size===v.edgeCells.length&&v.edgeCells.every(c=>integer(c,0,width*height-1)&&(c%width===0||c%width===width-1||Math.floor(c/width)===0||Math.floor(c/width)===height-1));
}
export function validMapGenerationRuntime256(v:unknown):v is MapGenerationRuntime256 {
 return record(v)&&Object.hasOwn(v,'revision')&&Object.hasOwn(v,'adjacentPermutation')&&Reflect.ownKeys(v).every(k=>k==='revision'||k==='adjacentPermutation'||k==='edgeSelection')&&v.revision===1&&(v.adjacentPermutation===null||permutation(v.adjacentPermutation))&&(!Object.hasOwn(v,'edgeSelection')||edge(v.edgeSelection));
}
/** RAW gate, also used before legacy migration. An explicitly undefined field
 * or accessor is never equivalent to historical absence. */
export function validMapGenerationRuntimeEnvelope256(registry:unknown,version:number,planetRevision:unknown):boolean {
 if(!registry||typeof registry!=='object')return false;
 const d=Object.getOwnPropertyDescriptor(registry,'generationRuntime');
 if(!d)return !('generationRuntime'in registry);
 return isSchema256Or257(version)&&planetRevision===3&&d.enumerable===true&&Object.hasOwn(d,'value')&&validMapGenerationRuntime256(d.value);
}
/** Only the real new-campaign producer calls this; never a load/migration. */
export function initialMapGenerationRuntime256():MapGenerationRuntime256 {return Object.freeze({revision:1,adjacentPermutation:null});}
/** Private transaction inputs. The first materialization order is the actual
 * GenAdj table N/E/S/W/SE/NE/NW/SW, before its first real Shuffle. It is not
 * installed in the campaign merely by requesting or cancelling a draft. */
export function captureMapGenerationRuntime256(state:MapGenerationRuntime256,width:number,height:number):{adjacentPermutation:number[];edgeContext?:{width:number;height:number;edgeCells:number[]}} {
 if(!validMapGenerationRuntime256(state)||!integer(width,8,400)||!integer(height,8,400))throw Error('Missing actual generation runtime owner');
 const e=state.edgeSelection;
 return {adjacentPermutation:state.adjacentPermutation===null?[0,1,2,3,4,5,6,7]:[...state.adjacentPermutation],...(e&&e.width===width&&e.height===height?{edgeContext:{width,height,edgeCells:[...e.edgeCells]}}:{})};
}
/** Prepare before entry can commit. The caller installs the returned immutable
 * value in the SAME successful entry transaction, never on progress/failure.
 * An unused lazy list remains unmaterialized; a foreign-size edge list survives
 * until CellFinder really needs to replace it, just as the process static does. */
export function finishMapGenerationRuntime256(state:MapGenerationRuntime256,result:{adjacentPermutation:readonly number[];adjacentUses:number;edgeContext?:Edge256}):MapGenerationRuntime256 {
 if(!validMapGenerationRuntime256(state)||!permutation(result.adjacentPermutation)||!integer(result.adjacentUses,0,Number.MAX_SAFE_INTEGER)||result.edgeContext!==undefined&&!edge(result.edgeContext))throw Error('Invalid actual generation runtime result');
 if(result.adjacentUses===0){const expected=state.adjacentPermutation??[0,1,2,3,4,5,6,7];if(result.adjacentPermutation.some((v,i)=>v!==expected[i]))throw Error('Unused adjacent static changed');}
 const e=result.edgeContext??state.edgeSelection;
 return Object.freeze({revision:1,adjacentPermutation:state.adjacentPermutation===null&&result.adjacentUses===0?null:Object.freeze([...result.adjacentPermutation]),...(e?{edgeSelection:Object.freeze({width:e.width,height:e.height,edgeCells:Object.freeze([...e.edgeCells])})}:{})});
}
