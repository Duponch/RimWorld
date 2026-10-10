import {ITEM_DEFINITIONS,type ItemId} from '../sim/items';
import {blockParts} from './block-presentation';
import {chunkParts} from './chunk-presentation';
import {weaponVisual} from './weapon-shape';
import type {Placement} from './primitives';

/** Explicit visual order, independent of save IDs and insertion order. */
export const ITEM_VISUAL_IDS:readonly ItemId[]=Object.freeze((Object.keys(ITEM_DEFINITIONS) as ItemId[]).filter(id=>!id.endsWith('-corpse')).sort());
const cargoKinds=new Map(ITEM_VISUAL_IDS.map((item,ordinal)=>[item,200+ordinal] as const));
export const itemCargoKind=(item:ItemId):number=>cargoKinds.get(item)??0;

/** Local ground assembly, centred on X/Z; never owns mutable gameplay state. */
export function itemGeometry(item:ItemId,quantity:number=ITEM_DEFINITIONS[item].stackLimit,anchor?:{x:number;z:number}):Placement[] {
  const definition=ITEM_DEFINITIONS[item],color=definition.color,parts:Placement[]=[];
  if(item.endsWith('-corpse'))return parts;
  const add=(shape:Placement['shape'],x:number,y:number,z:number,sx:number,sy:number,sz:number,tint:number=color,ry=0)=>parts.push({shape,x,y,z,sx,sy,sz,color:tint,ry});
  const box=(x:number,y:number,z:number,sx:number,sy:number,sz:number,tint:number=color,ry=0)=>add(undefined,x,y,z,sx,sy,sz,tint,ry);
  const round=(x:number,y:number,z:number,sx:number,sy:number,sz:number,tint:number=color)=>add('item-round',x,y,z,sx,sy,sz,tint);
  const amount=Math.max(.65,Math.min(1,quantity/Math.max(1,definition.stackLimit)));
  if(item==='wood'){
    for(const [x,y,z,turn] of [[0,.075,-.09,-.035],[.01,.075,.09,.05],[-.015,.205,0,-.08]]){
      add('item-log',x!,y!,z!, .65*amount,.14,.14,color,turn);
      for(const side of [-1,1])add('item-log',x!+side*.324*amount*Math.cos(turn!),y!,z!-side*.324*amount*Math.sin(turn!),.008,.114,.114,0xc9ad77,turn);
    }
  }else if(definition.kind==='chunk')return centreItemParts(chunkParts(anchor?.x??0,anchor?.z??0,item));
  else if(definition.kind==='blocks')return centreItemParts(blockParts(anchor?.x??0,anchor?.z??0,item,Math.min(75,quantity)));
  else if(item==='steel'){
    add('item-nugget',-.12,.10,-.06,.39,.20,.31,color,.22);add('item-nugget',.16,.08,.07,.31,.16,.25,0x687c85,-.42);add('item-nugget',.02,.23,.01,.26,.20,.22,0x9cabb1,.35);
  }else if(item==='gold'||item==='plasteel'){
    for(const side of [-1,1])add('item-ingot',side*.15,.075,0,.25,.14,.44,color);
    add('item-ingot',0,.19,0,.27,.10,.40,color);
    if(item==='plasteel')for(const x of [-.075,.075])box(x,.245,0,.025,.018,.35,0xc3dedc);
  }else if(item==='silver'){
    for(const [x,z,h] of [[-.18,-.06,.06],[.06,-.1,.1],[.15,.13,.045],[-.10,.16,.035]])add('item-disc',x!,h!/2,z!, .20,h!, .20,color);
  }else if(definition.kind==='weapon'||item==='unfinished-gun'){
    const weapon=weaponVisual(item==='unfinished-gun'?'bolt-action-rifle':item);
    for(const p of weapon?.parts??[])box(p.center[0]!, .07+p.center[2]!,p.center[1]!,p.size[0]!,p.size[2]!,p.size[1]!,item==='unfinished-gun'?color:p.color);
  }else if(definition.kind==='apparel'||/^unfinished-(shirt|pants|tribalwear|duster|parka|flak|recon)/.test(item)){
    const pants=item.endsWith('pants'),helmet=item.endsWith('helmet'),coat=item.endsWith('duster')||item.endsWith('parka'),vest=item.endsWith('vest')||item.endsWith('tribalwear');
    add(helmet?'item-helmet':pants?'item-pants':coat?'item-coat':vest?'item-vest':'item-shirt',0,helmet?.15:.055,0,helmet?.38:.65,helmet?.30:.085,helmet?.38:coat?.78:.66,color);
    if(item.endsWith('parka'))add('item-helmet',0,.12,-.28,.22,.17,.20,0xc7ba9d);
    if(item.endsWith('duster'))for(const side of [-1,1])add('item-leaf',side*.08,.11,-.24,.13,.025,.20,0x9b825f,side*.35);
    if(item.endsWith('vest')&&!item.endsWith('tribalwear'))for(const side of [-1,1])add('item-ingot',side*.09,.12,0,.16,.04,.34,0x48594f);
    if(item.endsWith('recon-helmet')){box(0,.16,.18,.30,.065,.05,0x344a57);for(const side of [-1,1])box(side*.17,.08,.10,.06,.15,.16,0x657d84);}
    else if(helmet)add('item-disc',0,.04,.01,.45,.025,.39,0x424e51);
  }else if(definition.kind==='textile'){
    if(item==='cloth'){box(0,.045,.04,.48,.065,.36);add('item-log',0,.13,-.12,.49,.19,.19);}
    else if(item.includes('wool')){round(-.13,.1,0,.25,.20,.25);round(.13,.1,0,.25,.20,.25);round(0,.22,0,.25,.20,.25);}
    else {add('item-leaf',0,.04,0,.58,.065,.65);add('item-leaf',.04,.095,.02,.50,.045,.56,color,.24);}
  }else if(item==='herbal-medicine'){
    for(const [x,z,turn] of [[-.15,0,-.4],[.12,0,.4],[0,-.12,0],[0,.12,Math.PI]])add('item-leaf',x!,.07,z!, .22,.06,.40,color,turn);
    box(0,.095,.04,.29,.025,.055,0xc5ab79);
  }else if(item==='medicine'||item==='glitterworld-medicine'||item==='neutroamine'||item==='milk'){
    if(item==='glitterworld-medicine'){
      box(0,.055,0,.48,.08,.28,0xe1e3d6);add('item-disc',-.04,.16,0,.12,.15,.12,color);box(.13,.105,0,.16,.04,.055,0x748c91);box(.24,.105,0,.07,.012,.015,0xc4d5d6);
    }else for(const x of [-.12,.12]){
      add('item-disc',x,.13,0,item==='milk'?.18:.13,.23,item==='milk'?.18:.13,color);
      add('item-disc',x,.265,0,.09,.07,.09,0xd8ddcf);add('item-disc',x,.308,0,.10,.022,.10,item==='milk'?0x7798b1:0x647f88);
    }
  }else if(item==='chemfuel'){
    box(0,.16,0,.30,.30,.28);box(.07,.33,-.07,.08,.07,.09,0x687c60);
    for(const x of [-.10,.02])box(x,.35,.03,.035,.08,.045,0x596e5b);box(-.04,.40,.03,.15,.025,.045,0x596e5b);
  }else if(item.includes('component')){
    if(item==='advanced-component'){
      box(0,.055,0,.38,.075,.31,0x52696a);box(0,.13,0,.22,.09,.20);for(const x of [-.07,0,.07])box(x,.19,0,.025,.06,.20,0xd2dbd5);
      for(const side of [-1,1])for(const z of [-.10,0,.10])box(side*.22,.06,z,.09,.025,.035,0xc3ac65);
    }else{
      add('item-disc',-.08,.075,0,.31,.09,.31);for(let i=0;i<6;i++){const a=i*Math.PI/3;box(-.08+Math.cos(a)*.17,.075,Math.sin(a)*.17,.08,.065,.07,color,a);}
      add('item-disc',-.08,.13,0,.09,.025,.09,0x52686c);box(.18,.07,.07,.15,.10,.20,0x71928b);
    }
  }else if(item==='unfinished-sculpture'){
    add('item-nugget',0,.19,0,.40,.38,.34);add('item-ingot',0,.055,0,.46,.11,.42);
  }else if(item.endsWith('-meat')){
    const species=['hare','snow-hare','deer','muffalo','gazelle','dromedary','red-fox'].indexOf(item.replace('-meat',''));
    add('item-nugget',-.05,.10,0,.42,.18,.29,color,.15+species*.13);
    if(species<2||species===6){add('item-log',.19,.09,.04,.29,.09,.09,0xe2d4b5,-.3);round(.32,.09,.08,.08,.09,.10,0xe2d4b5);}
    else {add('item-disc',.07,.20,.02,.19,.035,.17,0xe2c9b6);add('item-disc',.07,.221,.02,.09,.009,.075,0x9d5149);}
    if(species===3||species===5)add('item-nugget',-.14,.22,-.02,.25,.15,.23,color,-.4);
  }else if(item==='berries'){
    for(const [x,y,z] of [[-.15,.07,-.08],[.05,.08,-.13],[.17,.08,.04],[-.09,.08,.12],[.03,.20,.01]])round(x!,y!,z!,.16,.15,.16);
    add('item-leaf',0,.25,-.04,.16,.025,.20,0x61834d,.4);
  }else if(item==='potato'){
    for(const [x,y,z,a] of [[-.14,.09,-.06,.3],[.13,.09,.01,-.3],[0,.22,.06,.8]])add('item-nugget',x!,y!,z!,.27,.18,.22,color,a);
  }else if(item==='rice'){
    for(let i=0;i<7;i++){const a=i*2.4,r=i<5?.17:.06;add('item-round',Math.cos(a)*r,.055+(i>4?.075:0),Math.sin(a)*r,.15,.075,.085,color,a);}
  }else if(item==='corn'){
    for(const z of [-.10,.10]){add('item-log',0,.09,z,.44,.14,.14,color,.13);add('item-leaf',-.04,.04,z,.50,.045,.14,0x78914c,.13);}
    for(const x of [-.14,0,.14])round(x,.17,-.10,.045,.035,.08,0xf0cf62);
  }else if(item==='agave-fruit'){
    round(0,.15,0,.37,.29,.34);for(let i=0;i<4;i++)add('item-leaf',Math.sin(i*Math.PI/2)*.09,.31,Math.cos(i*Math.PI/2)*.09,.11,.035,.30,0x5e8252,i*Math.PI/2);
  }else if(item==='survival-meal'){
    for(const x of [-.12,.12]){add('item-ingot',x,.06,0,.22,.09,.35);box(x,.115,-.15,.23,.025,.035,0x7f8657);}
  }else {
    // Plates carry separate physical portions. Richness and vegetarian/meat
    // recipes change the assembly itself, not a pattern painted on a cube.
    const lavish=item.includes('lavish'),paste=item==='nutrient-paste-meal',carnivore=item.startsWith('carnivore'),vegetarian=item.startsWith('vegetarian');
    add('item-disc',0,.035,0,lavish?.61:.53,.055,lavish?.53:.45,0xd8d4bd);
    if(paste){for(const x of [-.11,.11])round(x,.09,0,.20,.075,.28,color);}
    else{
      if(!carnivore)for(const [x,z] of [[-.12,-.04],[-.03,.12]])round(x!,.10,z!,.20,.10,.17,0xd9c695);
      if(!vegetarian)add('item-nugget',.12,.10,.02,.22,.12,.24,0xad6651);
      if(item!=='simple-meal'&&item!=='legacy-portion')for(const z of [-.10,.09])add('item-leaf',vegetarian?.11:-.11,.14,z,.16,.045,.15,0x6d914d,.3);
      if(lavish){round(.05,.19,-.13,.11,.11,.10,0xc48448);round(-.16,.17,.05,.10,.10,.10,0xb36759);}
    }
  }
  return centreItemParts(parts);
}

/** Bounds include the legacy rock radius (1), while new meshes use unit width. */
export function centreItemParts(parts:Placement[],centreY=false):Placement[] {
  let loX=Infinity,hiX=-Infinity,loY=Infinity,hiY=-Infinity,loZ=Infinity,hiZ=-Infinity;
  for(const p of parts){const c=Math.abs(Math.cos(p.ry??0)),s=Math.abs(Math.sin(p.ry??0)),r=p.shape==='rounded-rock'?1:.5;
    const x=r*(c*(p.sx??1)+s*(p.sz??1)),z=r*(s*(p.sx??1)+c*(p.sz??1));
    loX=Math.min(loX,p.x-x);hiX=Math.max(hiX,p.x+x);loZ=Math.min(loZ,p.z-z);hiZ=Math.max(hiZ,p.z+z);loY=Math.min(loY,p.y-r*(p.sy??1));hiY=Math.max(hiY,p.y+r*(p.sy??1));}
  if(Number.isFinite(loX))for(const p of parts){p.x-=(loX+hiX)/2;p.z-=(loZ+hiZ)/2;if(centreY)p.y-=(loY+hiY)/2;}
  return parts;
}
