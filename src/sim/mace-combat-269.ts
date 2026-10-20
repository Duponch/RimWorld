import {MACE_ITEMS_269,MACE_DEFINITIONS_269,maceMaterial269,type MaceItem269} from './mace-content-269.ts';

/** The tool keeps its material after a stop, drop or equipment exchange. A
 * saved recovery never rereads the actor's currently equipped weapon. */
export type MaceToolId269=`${MaceItem269}-${'handle'|'head'}`;
export interface MaceTool269 {readonly id:MaceToolId269;readonly damage:number;readonly kind:'poke'|'blunt';readonly cooldownCore:number}
const entries=MACE_ITEMS_269.flatMap(item=>{
 const material=MACE_DEFINITIONS_269[maceMaterial269(item)],cooldownCore=Math.round(120*material.cooldownMultiplier);
 return [Object.freeze({id:`${item}-handle` as const,damage:9*material.bluntMultiplier,kind:'poke' as const,cooldownCore}),
  Object.freeze({id:`${item}-head` as const,damage:15.7*material.bluntMultiplier,kind:'blunt' as const,cooldownCore})];
});
const profiles=Object.freeze(Object.fromEntries(entries.map(tool=>[tool.id,tool]))) as Readonly<Record<MaceToolId269,MaceTool269>>;
export const MACE_TOOL_IDS_269:readonly MaceToolId269[]=Object.freeze(entries.map(tool=>tool.id));
export const isMaceToolId269=(value:unknown):value is MaceToolId269=>typeof value==='string'&&Object.hasOwn(profiles,value);
export const maceTool269=(id:MaceToolId269):MaceTool269=>profiles[id];
