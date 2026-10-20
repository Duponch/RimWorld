import * as THREE from 'three/webgpu';
import {MACE_ITEMS_269,maceColor269,type MaceItem269} from '../sim/mace-content-269';

export const MACE_DYE269=-13;
export const MACE_EQUIPMENT269=5;
/** One original rigid family: bare shaft, wrapped grip and a four-flanged head.
 * White/grey are pigment factors, shared by the worn rig and ground models. */
export const MACE_PARTS269=[
 {size:[.57,.052,.052],center:[-.045,0,0],color:0xffffff},
 {size:[.19,.068,.068],center:[-.235,0,0],color:0x777777},
 {size:[.14,.16,.16],center:[.285,0,0],color:0xffffff},
 {size:[.19,.055,.24],center:[.285,0,0],color:0xffffff},
 {size:[.19,.24,.055],center:[.285,0,0],color:0xffffff},
 {size:[.055,.079,.079],center:[-.345,0,0],color:0xbcbcbc},
] as const;
const tinted=new Map(MACE_ITEMS_269.map(item=>[item,MACE_PARTS269.map(part=>({...part,color:new THREE.Color(part.color).multiply(new THREE.Color(maceColor269(item))).getHex()}))]));
export const maceParts269=(item:MaceItem269)=>tinted.get(item)!;
export const maceEquipment269=(item:MaceItem269):number=>MACE_EQUIPMENT269+(MACE_ITEMS_269.indexOf(item)+1)/8;
/** Presentation activity codes, only while the persisted weapon tool strikes. */
export const maceStrikeActivity269=(tool:string|undefined,equippedItem?:string):number=>equippedItem!==undefined&&!tool?.startsWith(`${equippedItem}-`)?0:tool?.endsWith('-mace-head')?6:tool?.endsWith('-mace-handle')?7:0;
