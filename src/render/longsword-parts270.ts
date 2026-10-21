import * as THREE from 'three/webgpu';
import {LONGSWORD_ITEMS_270,longswordColor270,type LongswordItem270} from '../sim/longsword-content-270';

export const LONGSWORD_DYE270=-14;
export const LONGSWORD_EQUIPMENT270=6;
/** Original stepped blade, raised central ridge, crossguard and wrapped grip.
 * One rigid family supplies ground, cargo, worn mesh and portrait geometry. */
export const LONGSWORD_PARTS270=[
 {size:[.68,.09,.027],center:[.12,0,0],color:0xffffff},
 {size:[.14,.052,.023],center:[.53,0,0],color:0xffffff},
 {size:[.56,.027,.039],center:[.12,0,0],color:0xcfcfcf},
 {size:[.055,.27,.065],center:[-.25,0,0],color:0xd4d4d4},
 {size:[.22,.066,.058],center:[-.385,0,0],color:0x777777},
 {size:[.075,.095,.079],center:[-.53,0,0],color:0xbcbcbc},
] as const;
const tinted=new Map(LONGSWORD_ITEMS_270.map(item=>[item,LONGSWORD_PARTS270.map(part=>({...part,color:new THREE.Color(part.color).multiply(new THREE.Color(longswordColor270(item))).getHex()}))]));
export const longswordParts270=(item:LongswordItem270)=>tinted.get(item)!;
export const longswordEquipment270=(item:LongswordItem270):number=>LONGSWORD_EQUIPMENT270+(LONGSWORD_ITEMS_270.indexOf(item)+1)/8;
/** Activity codes are separate from work activity and from the two mace tools. */
export const longswordStrikeActivity270=(tool:string|undefined,equippedItem?:string):number=>equippedItem!==undefined&&!tool?.startsWith(`${equippedItem}-`)?0:tool?.endsWith('-longsword-handle')?8:tool?.endsWith('-longsword-tip')?9:tool?.endsWith('-longsword-edge')?10:0;
