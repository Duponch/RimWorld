/** Original resolved Core4871 facts for the five actual Monument dependencies.
 * These are structures, never item/sculpture aliases. All work is Core work. */
import {BUILDING_MATERIALS,type ConstructionMaterial} from './building-materials.ts';
import type {Cell} from './types.ts';
export const ANCIENT_MONUMENT_KINDS_256=Object.freeze(['column','urn','stele-large','stele-grand','sarcophagus'] as const);
export type AncientMonumentKind256=typeof ANCIENT_MONUMENT_KINDS_256[number];
export const isAncientMonumentKind256=(v:unknown):v is AncientMonumentKind256=>typeof v==='string'&&(ANCIENT_MONUMENT_KINDS_256 as readonly string[]).includes(v);
export const ANCIENT_MONUMENT_DEFS_256=Object.freeze({
 column:Object.freeze({width:1,depth:1,hitPoints:160,coreWork:750,cost:20,pathCost:0,beauty:5,flammability:1,support:'Light',holdsRoof:true,minifiable:false,quality:false,art:false,massGrams:10000,rotatable:false} as const),
 urn:Object.freeze({width:1,depth:1,hitPoints:40,coreWork:500,cost:20,pathCost:30,beauty:5,flammability:1,support:'Light',holdsRoof:false,minifiable:true,quality:false,art:false,massGrams:5000,rotatable:false} as const),
 'stele-large':Object.freeze({width:2,depth:2,hitPoints:200,coreWork:8000,cost:125,pathCost:50,beauty:15,flammability:0,support:'Medium',holdsRoof:false,minifiable:false,quality:false,art:true,massGrams:1000,rotatable:false} as const),
 'stele-grand':Object.freeze({width:3,depth:3,hitPoints:400,coreWork:16000,cost:250,pathCost:50,beauty:30,flammability:0,support:'Heavy',holdsRoof:false,minifiable:false,quality:false,art:true,massGrams:1000,rotatable:false} as const),
 sarcophagus:Object.freeze({width:1,depth:2,hitPoints:250,coreWork:2400,cost:60,pathCost:42,beauty:0,flammability:1,support:'Light',holdsRoof:false,minifiable:false,quality:true,art:true,massGrams:1000,rotatable:true} as const),
});
const stony=(m:unknown)=>typeof m==='string'&&(m==='jade'||['granite-blocks','limestone-blocks','marble-blocks','sandstone-blocks','slate-blocks'].includes(m));
export function ancientMonumentMaterial256(kind:unknown,material:unknown,version:number):material is ConstructionMaterial {
 if(version<256||!isAncientMonumentKind256(kind))return false;
 return stony(material)||!kind.startsWith('stele-')&&(material==='steel'||kind!=='urn'&&material==='wood');
}
export function ancientMonumentMaxHp256(kind:AncientMonumentKind256,material:ConstructionMaterial):number {
 if(!ancientMonumentMaterial256(kind,material,256))throw Error('Invalid actual ancient Stuff');
 return ancientNeutralMaxHp256(kind,material);
}
export function ancientNeutralMaxHp256(kind:AncientMonumentKind256|'wall'|'door'|'table'|'table-square',material:ConstructionMaterial):number {
 const base=isAncientMonumentKind256(kind)?ANCIENT_MONUMENT_DEFS_256[kind].hitPoints:{wall:300,door:160,table:75,'table-square':100}[kind];
 const factors:Partial<Record<ConstructionMaterial,number>>={wood:.65,steel:1,jade:.5,'granite-blocks':1.7,'limestone-blocks':1.55,'marble-blocks':1.2,'sandstone-blocks':1.4,'slate-blocks':1.3};
 if(factors[material]===undefined)throw Error('Invalid actual neutral Stuff');
 const hp=Math.fround(base*Math.fround(factors[material]!)),round=(n:number)=>{const i=Math.floor(n);return n-i===.5?i+(i%2):Math.round(n);};
 return hp>200?round(hp/5)*5:round(hp);
}
export function ancientMonumentRecipe256(kind:AncientMonumentKind256,material:ConstructionMaterial) {
 if(!ancientMonumentMaterial256(kind,material,256))throw Error('Invalid actual ancient recipe');
 const d=ANCIENT_MONUMENT_DEFS_256[kind],s=BUILDING_MATERIALS[material],coreWork=Math.round(d.coreWork*s.workFactor+s.workOffset);
 return {ingredients:[{item:material,quantity:d.cost}],work:Math.ceil(coreWork/10),coreWork};
}
/** GenAdj odd/even occupancy, not the historical table-square anchor. */
export function ancientMonumentCells256(kind:AncientMonumentKind256,position:Cell,orientation=0):Cell[] {
 const d=ANCIENT_MONUMENT_DEFS_256[kind];if(!Number.isInteger(orientation)||orientation<0||orientation>3||!d.rotatable&&orientation!==0)throw Error('Invalid ancient orientation');
 const width=orientation%2?d.depth:d.width,depth=orientation%2?d.width:d.depth;
 // Core OccupiedRect uses (size-1)/2, so a 2x2 starts on its anchor.
 const x=position.x-Math.floor((width-1)/2)-(width%2===0&&(orientation===2||orientation===3)?1:0),z=position.z-Math.floor((depth-1)/2)-(depth%2===0&&(orientation===1||orientation===2)?1:0);
 return Array.from({length:width*depth},(_,i)=>({x:x+i%width,z:z+Math.floor(i/width)}));
}
