/** Original declarations from resolved Core4871 facts. Generated edifice,
 * never a constructible blueprint, road prop, stone chunk or nominal stock. */
import type {Cell,Structure} from './types.ts';
export type ShipChunkKind256='ship-chunk';
export const isShipChunk256=(v:unknown):v is ShipChunkKind256=>v==='ship-chunk';
export const SHIP_CHUNK_DEF_256=Object.freeze({width:2,depth:2,hitPoints:300,flammability:0,pathCost:42,fill:.5,beauty:-20,coreWork:12000,blockWind:true,claimable:false,alwaysDeconstructible:true});
export const SLAG_STEEL_CHUNK_ITEM_256='slag-steel-chunk' as const;
export const SHIP_CHUNK_COST_256=Object.freeze([{item:'component',quantity:11},{item:'steel',quantity:40}] as const);
export const shipChunkRecipe256=()=>({ingredients:SHIP_CHUNK_COST_256,coreWork:12000,work:1200});
export function createShipChunk256(id:number,cell:Cell):Structure {
 if(!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(cell.x)||!Number.isSafeInteger(cell.z)||cell.x<0||cell.z<0)throw Error('Invalid actual ShipChunk original');
 return {id,kind:'ship-chunk',x:cell.x,z:cell.z,orientation:0,footprint:'standard',factionId:null};
}
/** Only the generated north-facing original is produced in875. General map
 * namespace/overlap/terrain validators still run; no material or quality. */
export function validShipChunkStructure256(value:unknown,version:number,h:{width:number;height:number;nextId:number}):boolean {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return false;
 const d=Object.getOwnPropertyDescriptors(value),read=(k:string)=>d[k]&&Object.hasOwn(d[k],'value')&&d[k].enumerable?d[k].value:undefined;
 if(read('kind')!=='ship-chunk')return false;
 const keys=['id','kind','x','z','orientation','footprint','factionId','damage'];
 if(version<256||Reflect.ownKeys(value).some(k=>typeof k!=='string'||!keys.includes(k)||!d[k]||!Object.hasOwn(d[k],'value')||!d[k].enumerable))return false;
 const int=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=min&&n<=max;
 return int(read('id'),1,h.nextId-1)&&int(read('x'),0,h.width-2)&&int(read('z'),0,h.height-2)
  &&read('orientation')===0&&read('footprint')==='standard'&&Object.hasOwn(value,'factionId')&&read('factionId')===null
  &&(!Object.hasOwn(value,'damage')||int(read('damage'),1,299));
}
