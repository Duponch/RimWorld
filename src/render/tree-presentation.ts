import type {Resource} from '../sim/types';
import type {Placement} from './primitives';

export type TreeVisualTraits=Readonly<Pick<Resource,'species'|'growth'>> & {readonly blight?:boolean|Resource['blight']};
const SPECIES=[undefined,'oak','pine','birch','poplar','drago'] as const;
const colors={oak:0x57754d,pine:0x47684c,birch:0x8fa467,poplar:0x849752,drago:0x728966};
export const treeGrowthStep=(tree:TreeVisualTraits|undefined):number=>!tree?.species?4:Math.ceil(Math.max(0,Math.min(1,tree.growth??1))*4);
const speciesIndex=(tree:TreeVisualTraits|undefined)=>Math.max(0,SPECIES.findIndex(s=>s===tree?.species));
/** Presentation IDs only; no resource/wrapper identity or gameplay kind. */
export const treeCargoKind=(tree?:TreeVisualTraits):number=>600+speciesIndex(tree)*5+treeGrowthStep(tree)+(tree?.blight?30:0);
export const TREE_CARGO_MODELS=Object.freeze([false,true].flatMap(blight=>SPECIES.flatMap((species,index)=>
  Array.from({length:index===0?1:5},(_,ordinal)=>{
    const step=index===0?4:ordinal,traits=Object.freeze({species,growth:step/4,...blight?{blight:true}:{}} as TreeVisualTraits);
    return Object.freeze({kind:600+index*5+step+(blight?30:0),traits});
  }))));

/** Same species proportions and four growth steps as the resident forest.
 * A root ball identifies the extracted object; the planted ghost omits it. */
export function treeVisualParts(tree?:TreeVisualTraits,packed=true):Placement[] {
  const species=tree?.species,height=species==='pine'?4.6:species==='poplar'?4.3:species==='drago'?3.25:3.8;
  const growth=tree?.species ? .3+.7*treeGrowthStep(tree)/4 : 1,scale=(packed?.24:1)*growth,lift=packed?.22:0;
  const tint=tree?.blight?0xa26b32:species&&species in colors?colors[species as keyof typeof colors]:0x57754d,parts:Placement[]=[];
  const add=(shape:Placement['shape'],y:number,sx:number,sy:number,sz:number,color:number)=>parts.push({shape,x:0,y:lift+y*scale,z:0,sx:sx*scale,sy:sy*scale,sz:sz*scale,color});
  if(packed)parts.push({shape:'item-nugget',x:0,y:.13,z:0,sx:.52,sy:.26,sz:.48,color:0x756047});
  const drago=species==='drago';add('item-disc',height*(drago?.36:.25),species==='birch'?.17:.2,height*(drago?.72:.5),species==='birch'?.27:.32,species==='birch'?0xcac9b4:0x70573e);
  if(species==='pine'){add('trap-spike',height*.53,2,height*.6,2,tint);add('trap-spike',height*.70,1.4,height*.4,1.4,tint);}
  else{const width=drago?2.86:species==='poplar'?1.4:2;add('item-nugget',height*(drago?.79:.65),width,height*(drago?.32:.48),width,tint);if(!drago)add('item-nugget',height*.87,1.32,height*.32,1.32,tint);}
  return parts;
}
/** Centre used by the same normalized cargo assembly during ground handoff. */
export function treeCargoCenterY(tree?:TreeVisualTraits):number {
  const parts=treeVisualParts(tree);return (Math.min(...parts.map(p=>p.y-(p.sy??1)/2))+Math.max(...parts.map(p=>p.y+(p.sy??1)/2)))/2;
}
