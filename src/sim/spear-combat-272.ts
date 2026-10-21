import {SPEAR_ITEMS_272,SPEAR_DEFINITIONS_272,spearMaterial272,type SpearItem272} from './spear-content-272.ts';

/** Two Core Tools expose three verbs. Each captured identity retains its
 * material and recovery after an equipment exchange. Poke is blunt armor. */
export type SpearToolId272=`${SpearItem272}-${'shaft-blunt'|'shaft-poke'|'point'}`;
export interface SpearTool272 {readonly id:SpearToolId272;readonly damage:number;readonly penetration:number;readonly kind:'blunt'|'poke'|'stab';readonly cooldownCore:number}
const entries=SPEAR_ITEMS_272.flatMap(item=>{
 const m=SPEAR_DEFINITIONS_272[spearMaterial272(item)],cooldownCore=Math.round(156*m.cooldownMultiplier),shaft=13*m.bluntMultiplier;
 return [Object.freeze({id:`${item}-shaft-blunt` as const,damage:shaft,penetration:shaft*.015,kind:'blunt' as const,cooldownCore}),
  Object.freeze({id:`${item}-shaft-poke` as const,damage:shaft,penetration:shaft*.015,kind:'poke' as const,cooldownCore}),
  // Explicit ArmorPenetration .50 receives weapon quality, not Stuff sharp.
  Object.freeze({id:`${item}-point` as const,damage:23*m.sharpMultiplier,penetration:.5,kind:'stab' as const,cooldownCore})];
});
const profiles=Object.freeze(Object.fromEntries(entries.map(t=>[t.id,t]))) as Readonly<Record<SpearToolId272,SpearTool272>>;
export const SPEAR_TOOL_IDS_272:readonly SpearToolId272[]=Object.freeze(entries.map(t=>t.id));
export const isSpearToolId272=(value:unknown):value is SpearToolId272=>typeof value==='string'&&Object.hasOwn(profiles,value);
export const spearTool272=(id:SpearToolId272):SpearTool272=>profiles[id];
