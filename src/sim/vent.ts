import {coolerFaces,coolerFaceBlocked} from './cooler.ts';
import {complexFurnitureUnlocked} from './research.ts';
import type {Cell,Orientation,World} from './types.ts';
import type {ThermalLayout} from './thermal-topology.ts';

export interface VentState {open:boolean}
export const newVentState=():VentState=>({open:true});
export const VENT_INTERVAL=25; // 250 Core ticks, one nominal rare impulse.
export const VENT_RATE=14;
/** Same two opposite faces as the cooler, without a hot/cold source. */
export function ventFaces(at:Cell&{orientation?:Orientation}):readonly [Cell,Cell]{const f=coolerFaces(at);return [f.cold,f.hot];}
export function ventPlacementAllowed(world:World,at:Cell&{orientation?:Orientation}):boolean {
  return ventFaces(at).every(face=>!coolerFaceBlocked(world,face,true));
}
/** One original deterministic local phase per Thing identity. No saved clock,
 * replay of missed pulses, random draw, or per-frame business query. The rare
 * impulse and shared clamp preserve Core's rate, rather than smearing14/25. */
export function advanceVents(world:World,layout:ThermalLayout,outside:number):void {
  const regions=world.thermal?.regions;if(!regions)return;
  for(const port of layout.vents??[]){
    const s=world.structures[port.structureIndex];
    if(!s||s.id!==port.id||s.kind!=='vent'||!s.vent?.open||world.tick%VENT_INTERVAL!==s.id%VENT_INTERVAL)continue;
    const [a,b]=port.sides;if(a===b)continue;
    const ra=a<0?undefined:regions[a],rb=b<0?undefined:regions[b];
    if(!ra&&!rb)continue;
    const ta=ra?.temperature??outside,tb=rb?.temperature??outside,mean=(ta+tb)/2;
    // The SAME factor must clamp both contributions: separate clamps invent
    // heat between unequal volumes. Outdoor is an unchanged reservoir.
    const clamp=Math.min(1,ra?ra.cells.length/VENT_RATE:1,rb?rb.cells.length/VENT_RATE:1);
    if(ra)ra.temperature=ta+(mean-ta)*VENT_RATE*clamp/ra.cells.length;
    if(rb)rb.temperature=tb+(mean-tb)*VENT_RATE*clamp/rb.cells.length;
  }
}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const state=(v:unknown):boolean=>{if(!object(v)||Reflect.ownKeys(v).length!==1)return false;const field=Object.getOwnPropertyDescriptor(v,'open');return !!field&&Object.hasOwn(field,'value')&&typeof field.value==='boolean';};
/** Shared shape gate for saves and the active-map checkpoint/delta. A vent is
 * never packaged or a door/power consumer. Jobs contain intent, not real state. */
export function validVentTransport(raw:unknown,version:number):boolean {
  if(!object(raw)||!Array.isArray(raw.structures)||!Array.isArray(raw.jobs)||raw.packed!==undefined&&!Array.isArray(raw.packed))return false;
  let hasVent=false;
  for(const [list,finished] of [[raw.structures,true],[raw.jobs,false]] as const)for(const s of list){
    if(!object(s))return false;
    const vent=s.kind==='vent';
    if(vent){
      hasVent=true;if(version<244||s.material!=='steel'||s.footprint!=='standard'||Object.hasOwn(s,'power')||Object.hasOwn(s,'door')||Object.hasOwn(s,'fuel'))return false;
      if(finished?!state(s.vent):Object.hasOwn(s,'vent'))return false;
    }else if(Object.hasOwn(s,'vent'))return false;
    for(const key of ['flick','deconstruction','furniture','repair'] as const){const target=s[key];if(object(target)&&target.kind==='vent'){hasVent=true;if(version<244||key==='furniture')return false;}}
  }
  for(const p of (raw.packed??[]) as unknown[]){if(!object(p)||!object(p.building)||p.building.kind==='vent'||Object.hasOwn(p.building,'vent'))return false;}
  return !hasVent||complexFurnitureUnlocked(raw as unknown as World);
}
