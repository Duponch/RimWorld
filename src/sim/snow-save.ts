import {animalBodySize} from './animal-life.ts';
import {SNOW_SCHEMA_VERSION,snowVisitsPerLocalTick} from './snow-rules.ts';
import {snowFullCells,terrainRetainsSnow} from './snow-surface.ts';
import type {World} from './types.ts';
const own=(v:object,k:string)=>Object.getOwnPropertyDescriptor(v,k);
const object=(v:unknown):v is Record<string,any>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const data=(v:object,k:string)=>{const d=own(v,k);return !!d&&Object.hasOwn(d,'value')&&d.enumerable;};
const exact=(v:object,keys:readonly string[])=>Reflect.ownKeys(v).length===keys.length&&keys.every(k=>data(v,k));
/** Bounded actor-owner traversal only; never walk the terrain or resources here. */
function futureActorField(v:unknown):boolean {
 if(!v||typeof v!=='object')return false;
 if('snowEntryPending' in v||'snowCell' in v)return true;
 for(const k of Reflect.ownKeys(v)){const d=Object.getOwnPropertyDescriptor(v,k);if(!d||!Object.hasOwn(d,'value'))return true;if(d.value&&typeof d.value==='object'&&futureActorField(d.value))return true;}
 return false;
}
const owners=['pawns','wildlife','startingArrival','group','groupLosses','scout','commercialTrip','podRescues','raids'] as const;
/** Run before historical migrators/projections can discard unknown content. */
export function snowHistoricalFieldsAbsent(raw:unknown,version:number):boolean {
 if(version>=SNOW_SCHEMA_VERSION)return true;if(!object(raw))return false;
 if('snow' in raw||'snowClearArea' in raw)return false;
 if(Array.isArray(raw.tiles)&&raw.tiles.some((t:unknown)=>object(t)&&'snowDepth' in t))return false;
 for(const k of owners){const d=own(raw,k);if(d&&!Object.hasOwn(d,'value')||!d&&k in raw)return false;if(d&&futureActorField(d.value))return false;}
 return true;
}
/** The optional index list is private to Decoder's already-validated predecessor.
 * Full saves/checkpoints always inspect all cells. Full footprints are always
 * rechecked, including a malformed new building over an unchanged snowy tile. */
export function validateSnowTransport(w:World,version:number,changedTiles?:readonly number[]):string[] {
 if(version<SNOW_SCHEMA_VERSION)return snowHistoricalFieldsAbsent(w,version)?[]:['Future snow surface content.'];
 const bad=(s:string)=>[s];
 for(const k of ['snow','snowClearArea']){const d=own(w,k);if(d?(!data(w,k)||d.value===undefined):k in w)return bad('Malformed snow property.');}
 const state=w.snow;
 if(state){if(!object(state)||!exact(state,['revision','adoptedAt','lastTick','cursor','seed'])||state.revision!==1||!int(state.adoptedAt,0,w.tick)||state.lastTick!==w.tick||!int(state.seed,1,0xffffffff)||!int(state.cursor,0,w.tiles.length-1))return bad('Malformed snow clock.');
  const expected=Number((BigInt(w.tick-state.adoptedAt)*BigInt(snowVisitsPerLocalTick(w.tiles.length)))%BigInt(w.tiles.length));if(state.cursor!==expected)return bad('Inconsistent snow phase.');}
 const full=state?snowFullCells(w):new Set<number>(),indices=changedTiles??Array.from({length:w.tiles.length},(_,i)=>i);
 for(const i of indices){const t=w.tiles[i];if(!t)return bad('Invalid snow cell index.');const d=own(t,'snowDepth');if(d?(!state||!data(t,'snowDepth')||typeof d.value!=='number'||!Number.isFinite(d.value)||d.value<=0||d.value>1||!terrainRetainsSnow(t.terrain,!!t.bridge)||full.has(i)):'snowDepth' in t)return bad('Invalid snow depth.');}
 for(const i of full)if(w.tiles[i]?.snowDepth!==undefined)return bad('Snow beneath a Full building.');
 const area=w.snowClearArea;if(area!==undefined){if(!state||!Array.isArray(area)||!area.length||area.length>w.tiles.length)return bad('Invalid snow clearing area.');let last=-1;for(const i of area){if(!int(i,0,w.tiles.length-1)||i<=last)return bad('Invalid snow clearing cell.');last=i;}}
 const checkMotion=(a:{motion?:any},allow:boolean)=>{const m=a.motion;if(!m)return true;const d=own(m,'snowEntryPending');return d?!!state&&allow&&data(m,'snowEntryPending')&&d.value===true&&m.end>w.tick:!('snowEntryPending' in m);};
 for(const p of w.pawns){const carried=w.pawns.some(c=>c.rescue?.phase==='carry'&&c.rescue.patientId===p.id);if(!checkMotion(p,!carried))return bad('Invalid human snow entry.');}
 for(const a of w.wildlife?.animals??[]){const carried=w.pawns.some(c=>c.animalRescue?.phase==='carry'&&c.animalRescue.animalId===a.id);if(!checkMotion(a,!carried&&animalBodySize(a)>.9))return bad('Invalid animal snow entry.');}
 for(const k of owners.filter(k=>k!=='pawns'&&k!=='wildlife'))if(futureActorField(w[k]))return bad('Local snow activity in an off-map owner.');
 return [];
}
