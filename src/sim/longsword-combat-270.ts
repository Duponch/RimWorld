import {LONGSWORD_ITEMS_270,LONGSWORD_DEFINITIONS_270,longswordMaterial270,type LongswordItem270} from './longsword-content-270.ts';

/** Captured tool identity keeps its material after a drop or weapon exchange. */
export type LongswordToolId270=`${LongswordItem270}-${'handle'|'tip'|'edge'}`;
export interface LongswordTool270 {readonly id:LongswordToolId270;readonly damage:number;readonly kind:'blunt'|'stab'|'cut';readonly cooldownCore:number}
const entries=LONGSWORD_ITEMS_270.flatMap(item=>{
 const material=LONGSWORD_DEFINITIONS_270[longswordMaterial270(item)];
 // Core converts the material-adjusted seconds to whole ticks at the stance
 // boundary: 2.6s becomes125 for plasteel and172 for uranium.
 const handleCooldown=Math.round(120*material.cooldownMultiplier),bladeCooldown=Math.round(156*material.cooldownMultiplier);
 return [Object.freeze({id:`${item}-handle` as const,damage:9*material.bluntMultiplier,kind:'blunt' as const,cooldownCore:handleCooldown}),
  Object.freeze({id:`${item}-tip` as const,damage:23*material.sharpMultiplier,kind:'stab' as const,cooldownCore:bladeCooldown}),
  Object.freeze({id:`${item}-edge` as const,damage:23*material.sharpMultiplier,kind:'cut' as const,cooldownCore:bladeCooldown})];
});
const profiles=Object.freeze(Object.fromEntries(entries.map(tool=>[tool.id,tool]))) as Readonly<Record<LongswordToolId270,LongswordTool270>>;
export const LONGSWORD_TOOL_IDS_270:readonly LongswordToolId270[]=Object.freeze(entries.map(tool=>tool.id));
export const isLongswordToolId270=(value:unknown):value is LongswordToolId270=>typeof value==='string'&&Object.hasOwn(profiles,value);
export const longswordTool270=(id:LongswordToolId270):LongswordTool270=>profiles[id];
