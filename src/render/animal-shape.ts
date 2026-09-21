import { HARE_PARTS,type HarePart } from './hare-shape';

/** Original low-poly silhouettes, shared by living rigs and carried/ground bodies. */
export function animalParts(species:string):readonly HarePart[] {
  if(species==='hare')return HARE_PARTS;
  if(species==='snow-hare')return HARE_PARTS.map(p=>({...p,color:p.color===0x302d29?p.color:p.color===0xc19583?0xd4b6ad:0xe3e0d5}));
  const parts:HarePart[]=[],camel=species==='dromedary',muffalo=species==='muffalo',gazelle=species==='gazelle';
  const width=muffalo?.78:camel?.62:gazelle?.30:.46,length=muffalo?1.34:camel?1.32:gazelle?.78:1.02;
  const leg=muffalo?.48:camel?.84:gazelle?.59:.68,height=muffalo?.75:camel?.52:gazelle?.30:.43;
  const color=muffalo?0x95a3bd:camel?0xc4a478:gazelle?0xc29358:0x97714e;
  const add=(size:HarePart['size'],center:HarePart['center'],bone=0,pivot:HarePart['pivot']=[0,0,0],tint=color)=>parts.push({size,center,bone,pivot,color:tint});
  add([width,height,length],[0,leg+height/2,0]);
  for(const side of [-1,1])for(const front of [-1,1]){
    const x=side*width*.36,z=front*length*.34,pivot:[number,number,number]=[x,leg,z];
    add([width*.18,leg,.13],[x,leg*.5,z],side===front?1:2,pivot,muffalo?0x6e7b96:color);
    add([width*.22,.10,.17],[x,.055,z+.015],side===front?1:2,pivot,0x49433d);
  }
  const neck=camel?.65:muffalo?.25:.32,headY=leg+height+neck*.55,headZ=length*.50;
  const headPivot:[number,number,number]=[0,leg+height*.6,length*.35];
  add([width*.48,neck+.2,.27],[0,leg+height*.8+neck*.3,length*.40],3,headPivot);
  add([width*.55,.25,.37],[0,headY,headZ+.1],3,headPivot);
  add([width*.38,.16,.19],[0,headY-.05,headZ+.33],3,headPivot,muffalo?0x747f96:0xbba185);
  for(const side of [-1,1]){
    add([.13,.08,.17],[side*width*.36,headY+.12,headZ+.02],3,headPivot);
    add([.028,.035,.04],[side*width*.285,headY+.035,headZ+.21],3,headPivot,0x22262a);
    if(muffalo||gazelle)add([.055,muffalo?.22:.29,.06],[side*width*.29,headY+.24,headZ-.025],3,headPivot,0xd6c8a5);
  }
  add([.07,.27,.065],[0,leg+height*.35,-length*.55],0,[0,0,0],0x655347);
  if(camel){add([.48,.40,.55],[0,leg+height+.12,-.1]);add([.30,.18,.33],[0,leg+height+.40,-.12]);}
  if(muffalo){add([width*1.08,.40,.83],[0,leg+height+.07,.18]);add([width*.75,.32,.35],[0,headY-.23,headZ],3,headPivot,0x8795b0);}
  return parts;
}
