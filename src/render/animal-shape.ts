import { HARE_PARTS,type HarePart } from './hare-shape';

export interface AnimalCoreRing {
  z:number; halfWidth:number; bottom:number; top:number;
  /** Fraction of the confirmed head pose, blended across the continuous neck. */
  headWeight:number; color:number;
}

/** A single faceted outer profile for the living body's back, neck and head.
 * The old parts still describe the compact box proxy used for carried bodies. */
export function animalCoreProfile(species:string):{rings:readonly AnimalCoreRing[];headPivot:readonly [number,number,number]} {
  const hare=species==='hare'||species==='snow-hare';
  if(hare){
    const light=species==='snow-hare',body=light?0xe3e0d5:0xa49c80,head=light?0xe3e0d5:0xb6aa8c,muzzle=light?0xe3e0d5:0xd3c6a5;
    const ring=(z:number,halfWidth:number,bottom:number,top:number,headWeight:number,color=body):AnimalCoreRing=>({z,halfWidth,bottom,top,headWeight,color});
    return {headPivot:[0,.33,.13],rings:[
      ring(-.30,.105,.15,.38,0),ring(-.22,.165,.10,.42,0),
      ring(-.04,.17,.10,.43,0),ring(.10,.15,.16,.47,0),
      ring(.19,.13,.26,.53,.35,head),ring(.28,.125,.285,.535,.8,head),
      ring(.365,.105,.30,.50,1,head),ring(.48,.075,.315,.425,1,muzzle),
    ]};
  }
  const camel=species==='dromedary',muffalo=species==='muffalo',gazelle=species==='gazelle';
  const width=muffalo?.78:camel?.62:gazelle?.30:.46,length=muffalo?1.34:camel?1.32:gazelle?.78:1.02;
  const leg=muffalo?.48:camel?.84:gazelle?.59:.68,height=muffalo?.75:camel?.52:gazelle?.30:.43;
  const neck=camel?.65:muffalo?.25:.32,top=leg+height,headY=top+neck*.55,headZ=length*.5;
  const color=muffalo?0x95a3bd:camel?0xc4a478:gazelle?0xc29358:0x97714e;
  const muzzle=muffalo?0x747f96:0xbba185;
  const hump=camel?[.05,.45,.20,.02,0]:muffalo?[.02,.17,.27,.24,.12]:[0,0,.015,.015,0];
  const ring=(z:number,halfWidth:number,bottom:number,upper:number,headWeight:number,tint=color):AnimalCoreRing=>({z,halfWidth,bottom,top:upper,headWeight,color:tint});
  return {headPivot:[0,leg+height*.6,length*.35],rings:[
    ring(-length*.5,width*.32,leg+height*.08,top-height*.08,0),
    ring(-length*.36,width*.48,leg+height*.02,top+hump[0]!,0),
    ring(-length*.10,width*.50,leg,top+hump[1]!,0),
    ring(length*.18,width*.52,leg,top+hump[2]!,0),
    ring(length*.34,width*.46,leg+height*.04,top+hump[3]!,0),
    ring(headZ,width*.34,leg+height*.32,top+neck*.38+hump[4]!,0),
    ring(headZ+.045,width*.29,headY-.34,headY+.13,.52,muffalo?0x8795b0:color),
    ring(headZ+.10,width*.275,headY-.125,headY+.125,1),
    ring(headZ+.27,width*.24,headY-.12,headY+.115,1,muzzle),
    ring(headZ+.425,width*.19,headY-.115,headY+.04,1,muzzle),
  ]};
}

/** Original low-poly silhouettes; carried/ground bodies use their box proxies. */
export function animalParts(species:string):readonly HarePart[] {
  if(species==='hare')return HARE_PARTS;
  if(species==='snow-hare')return HARE_PARTS.map(p=>({...p,color:p.color===0x302d29?p.color:p.color===0xc19583?0xd4b6ad:0xe3e0d5}));
  const parts:HarePart[]=[],camel=species==='dromedary',muffalo=species==='muffalo',gazelle=species==='gazelle';
  const width=muffalo?.78:camel?.62:gazelle?.30:.46,length=muffalo?1.34:camel?1.32:gazelle?.78:1.02;
  const leg=muffalo?.48:camel?.84:gazelle?.59:.68,height=muffalo?.75:camel?.52:gazelle?.30:.43;
  const color=muffalo?0x95a3bd:camel?0xc4a478:gazelle?0xc29358:0x97714e;
  const add=(size:HarePart['size'],center:HarePart['center'],bone=0,pivot:HarePart['pivot']=[0,0,0],tint=color,taper?:HarePart['taper'],core=false)=>parts.push({size,center,bone,pivot,color:tint,taper,core});
  add([width,height,length],[0,leg+height/2,0],0,[0,0,0],color,[.90,.99,.94,.99],true);
  for(const side of [-1,1])for(const front of [-1,1]){
    const x=side*width*.36,z=front*length*.34,pivot:[number,number,number]=[x,leg,z];
    // Upper legs extend into the belly, so a gait rotation does not open a
    // visible slit between the independently articulated surfaces.
    add([width*.22,leg+.12,.15],[x,(leg+.12)*.5,z],side===front?1:2,pivot,muffalo?0x6e7b96:color,[1.08,.78,1.03,.9]);
    add([width*.22,.10,.17],[x,.055,z+.015],side===front?1:2,pivot,0x49433d);
  }
  const neck=camel?.65:muffalo?.25:.32,headY=leg+height+neck*.55,headZ=length*.50;
  const headPivot:[number,number,number]=[0,leg+height*.6,length*.35];
  add([width*.55,neck+.2,.31],[0,leg+height*.8+neck*.3,length*.40],3,headPivot,color,[.78,1.06,.90,1.06],true);
  add([width*.55,.25,.37],[0,headY,headZ+.1],3,headPivot,color,[.95,1.02,.97,1],true);
  add([width*.38,.16,.19],[0,headY-.05,headZ+.33],3,headPivot,muffalo?0x747f96:0xbba185,undefined,true);
  for(const side of [-1,1]){
    add([.13,.08,.17],[side*width*.36,headY+.12,headZ+.02],3,headPivot);
    add([.028,.035,.04],[side*width*.285,headY+.035,headZ+.21],3,headPivot,0x22262a);
    if(muffalo||gazelle)add([.055,muffalo?.22:.29,.06],[side*width*.29,headY+.24,headZ-.025],3,headPivot,0xd6c8a5);
  }
  add([.07,.27,.065],[0,leg+height*.35,-length*.55],0,[0,0,0],0x655347);
  if(camel){add([.48,.40,.55],[0,leg+height+.12,-.1],0,[0,0,0],color,undefined,true);add([.30,.18,.33],[0,leg+height+.40,-.12],0,[0,0,0],color,undefined,true);}
  if(muffalo){add([width*1.08,.40,.83],[0,leg+height+.07,.18],0,[0,0,0],color,undefined,true);add([width*.75,.32,.35],[0,headY-.23,headZ],3,headPivot,0x8795b0,undefined,true);}
  return parts;
}
