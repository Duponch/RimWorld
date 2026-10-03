import { HARE_PARTS,type HarePart } from './hare-shape';

export interface AnimalCoreRing {
  z:number; halfWidth:number; bottom:number; top:number;
  /** Fraction of the confirmed head pose, blended across the continuous neck. */
  headWeight:number; color:number;
}

/** A single faceted outer profile for the living body's back, neck and head.
 * The old parts still describe the compact box proxy used for carried bodies. */
export function animalCoreProfile(species:string):{rings:readonly AnimalCoreRing[];headPivot:readonly [number,number,number]} {
  if(species==='red-fox')return {headPivot:[0,.52,.29],rings:[
    {z:-.46,halfWidth:.10,bottom:.34,top:.62,headWeight:0,color:0xc48757},
    {z:-.30,halfWidth:.18,bottom:.31,top:.68,headWeight:0,color:0xc48757},
    {z:.03,halfWidth:.18,bottom:.30,top:.68,headWeight:0,color:0xc48757},
    {z:.28,halfWidth:.15,bottom:.36,top:.72,headWeight:0,color:0xc48757},
    {z:.39,halfWidth:.135,bottom:.49,top:.79,headWeight:.45,color:0xc99061},
    {z:.48,halfWidth:.13,bottom:.52,top:.79,headWeight:1,color:0xc99061},
    {z:.61,halfWidth:.08,bottom:.54,top:.69,headWeight:1,color:0xe1ceb0},
    {z:.75,halfWidth:.038,bottom:.555,top:.615,headWeight:1,color:0xe1ceb0},
  ]};
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
  if(species==='red-fox')return FOX_PARTS;
  if(species==='hare')return HARE_PARTS;
  if(species==='snow-hare')return HARE_PARTS.map(p=>({...p,color:p.color===0x302d29?p.color:p.color===0xc19583?0xd4b6ad:0xe3e0d5}));
  const parts:HarePart[]=[],camel=species==='dromedary',muffalo=species==='muffalo',gazelle=species==='gazelle';
  const width=muffalo?.78:camel?.62:gazelle?.30:.46,length=muffalo?1.34:camel?1.32:gazelle?.78:1.02;
  const leg=muffalo?.48:camel?.84:gazelle?.59:.68,height=muffalo?.75:camel?.52:gazelle?.30:.43;
  const color=muffalo?0x95a3bd:camel?0xc4a478:gazelle?0xc29358:0x97714e;
  const add=(size:HarePart['size'],center:HarePart['center'],bone=0,pivot:HarePart['pivot']=[0,0,0],tint=color,taper?:HarePart['taper'],core=false,bodyPart:HarePart['bodyPart']='torso')=>parts.push({size,center,bone,pivot,color:tint,taper,core,bodyPart});
  add([width,height,length],[0,leg+height/2,0],0,[0,0,0],color,[.90,.99,.94,.99],true);
  for(const side of [-1,1])for(const front of [-1,1]){
    const x=side*width*.36,z=front*length*.34,pivot:[number,number,number]=[x,leg,z];
    const anatomicalSide=side<0?'left':'right',end=front>0?'front':'rear';
    // Upper legs extend into the belly, so a gait rotation does not open a
    // visible slit between the independently articulated surfaces.
    add([width*.22,leg+.12,.15],[x,(leg+.12)*.5,z],side===front?1:2,pivot,muffalo?0x6e7b96:color,[1.08,.78,1.03,.9],false,`${anatomicalSide}-${end}-leg`);
    add([width*.22,.10,.17],[x,.055,z+.015],side===front?1:2,pivot,0x49433d,undefined,false,`${anatomicalSide}-${end}-hoof`);
  }
  const neck=camel?.65:muffalo?.25:.32,headY=leg+height+neck*.55,headZ=length*.50;
  const headPivot:[number,number,number]=[0,leg+height*.6,length*.35];
  add([width*.55,neck+.2,.31],[0,leg+height*.8+neck*.3,length*.40],3,headPivot,color,[.78,1.06,.90,1.06],true,'neck');
  add([width*.55,.25,.37],[0,headY,headZ+.1],3,headPivot,color,[.95,1.02,.97,1],true,'head');
  add([width*.38,.16,.19],[0,headY-.05,headZ+.33],3,headPivot,muffalo?0x747f96:0xbba185,undefined,true,'jaw');
  for(const side of [-1,1]){
    const anatomicalSide=side<0?'left':'right';
    add([.13,.08,.17],[side*width*.36,headY+.12,headZ+.02],3,headPivot,color,undefined,false,`${anatomicalSide}-ear`);
    add([.028,.035,.04],[side*width*.285,headY+.035,headZ+.21],3,headPivot,0x22262a,undefined,false,`${anatomicalSide}-eye`);
    if(muffalo||gazelle)add([.055,muffalo?.22:.29,.06],[side*width*.29,headY+.24,headZ-.025],3,headPivot,0xd6c8a5,undefined,false,'head');
  }
  add([.07,.27,.065],[0,leg+height*.35,-length*.55],0,[0,0,0],0x655347);
  if(camel){add([.48,.40,.55],[0,leg+height+.12,-.1],0,[0,0,0],color,undefined,true,'hump');add([.30,.18,.33],[0,leg+height+.40,-.12],0,[0,0,0],color,undefined,true,'hump');}
  if(muffalo){add([width*1.08,.40,.83],[0,leg+height+.07,.18],0,[0,0,0],color,undefined,true);add([width*.75,.32,.35],[0,headY-.23,headZ],3,headPivot,0x8795b0,undefined,true,'head');}
  return parts;
}

/** Original fox silhouette, using the existing faceted shell and detail rig. */
const FOX_PARTS:readonly HarePart[]=(()=>{
  const parts:HarePart[]=[],coat=0xc48757,cream=0xe1ceb0,dark=0x484039,headPivot:HarePart['pivot']=[0,.52,.29];
  const add=(size:HarePart['size'],center:HarePart['center'],bodyPart:NonNullable<HarePart['bodyPart']>,bone=0,pivot:HarePart['pivot']=[0,0,0],color=coat,core=false,taper?:HarePart['taper'])=>parts.push({size,center,bodyPart,bone,pivot,color,core,taper});
  add([.36,.35,.88],[0,.49,-.03],'torso',0,[0,0,0],coat,true);
  add([.27,.32,.26],[0,.62,.32],'neck',3,headPivot,coat,true);
  add([.27,.27,.31],[0,.65,.46],'head',3,headPivot,coat,true);
  add([.15,.12,.27],[0,.60,.65],'jaw',3,headPivot,cream,true,[.6,1,.8,1]);
  add([.07,.06,.06],[0,.59,.765],'nose',3,headPivot,dark);
  add([.21,.21,.45],[0,.41,-.62],'tail',0,[0,0,0],coat,false,[.75,1.08,.8,1]);
  add([.16,.17,.17],[0,.36,-.87],'tail',0,[0,0,0],cream,false,[.6,1,.8,1]);
  for(const side of [-1,1]){
    const anatomicalSide=side<0?'left':'right';
    add([.105,.18,.09],[side*.10,.845,.42],`${anatomicalSide}-ear`,3,headPivot,dark,false,[.18,1,.22,1]);
    add([.065,.13,.022],[side*.10,.84,.475],`${anatomicalSide}-ear`,3,headPivot,0xcda38c,false,[.16,1,.2,1]);
    add([.018,.026,.03],[side*.135,.69,.53],`${anatomicalSide}-eye`,3,headPivot,0x292b2a);
    for(const front of [-1,1]){
      const end=front>0?'front':'rear',x=side*.13,z=front*.29,pivot:HarePart['pivot']=[x,.36,z],bone=side===front?1:2;
      add([.075,.39,.105],[x,.205,z],`${anatomicalSide}-${end}-leg`,bone,pivot,coat,false,[1.15,.8,1,.85]);
      add([.075,.13,.12],[x,.075,z+.012],`${anatomicalSide}-${end}-paw`,bone,pivot,dark);
    }
  }
  return Object.freeze(parts);
})();
