import * as THREE from 'three/webgpu';
import {SPEAR_ITEMS_272,spearColor272,type SpearItem272} from '../sim/spear-content-272';

export const SPEAR_DYE272=-15;
export const SPEAR_EQUIPMENT272=7;
/** Original long pole with stepped leaf point, socket, binding and butt cap.
 * The same rigid authored parts serve piles, cargo, portraits and equipment. */
export const SPEAR_PARTS272=[
 {size:[1.36,.055,.055],center:[-.12,0,0],color:0xffffff},
 {size:[.26,.105,.028],center:[.665,0,0],color:0xffffff},
 {size:[.12,.055,.023],center:[.85,0,0],color:0xe0e0e0},
 {size:[.18,.032,.041],center:[.65,0,0],color:0xc8c8c8},
 {size:[.08,.095,.075],center:[.50,0,0],color:0xb8b8b8},
 {size:[.26,.072,.068],center:[-.17,0,0],color:0x727272},
 {size:[.10,.08,.08],center:[-.84,0,0],color:0xababab},
] as const;
const tinted=new Map(SPEAR_ITEMS_272.map(item=>[item,SPEAR_PARTS272.map(part=>({...part,color:new THREE.Color(part.color).multiply(new THREE.Color(spearColor272(item))).getHex()}))]));
export const spearParts272=(item:SpearItem272)=>tinted.get(item)!;
export const spearEquipment272=(item:SpearItem272):number=>SPEAR_EQUIPMENT272+(SPEAR_ITEMS_272.indexOf(item)+1)/8;
export const spearStrikeActivity272=(tool:string|undefined,equippedItem?:string):number=>equippedItem!==undefined&&!tool?.startsWith(`${equippedItem}-`)?0:tool?.endsWith('-spear-shaft-blunt')?11:tool?.endsWith('-spear-shaft-poke')?12:tool?.endsWith('-spear-point')?13:0;
