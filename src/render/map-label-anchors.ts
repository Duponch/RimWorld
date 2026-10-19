import {ITEM_DEFINITIONS,type ItemId} from '../sim/items';
import type {MaterialPile,World} from '../sim/types';
import {packedBedrollParts} from './bedroll-parts';
import {chunkContourPoints,isSmallChunk} from './chunk-shape';
import {createItemGeometry,type ItemShape} from './item-geometry';
import {itemGeometry} from './item-presentation';
import type {PileSurface} from './pile-surfaces';
import type {Placement} from './primitives';
import {createSandbagGeometry} from './sandbag-parts';

const CLEARANCE=.02;
// Finite authored shape/item domains only. No pile IDs, coordinates or free
// quantity strings survive an adoption in these caches.
const shapeTops=new Map<ItemShape|'sandbag',number>();
const itemTops=new Map<ItemId,number>();

function partTop(part:Placement):number {
  let top=.5;
  if(part.shape==='rounded-rock'){
    top=-Infinity;
    for(const point of chunkContourPoints(part.key??0,isSmallChunk(part.key,part.sx)))top=Math.max(top,point[1]);
  }else if(part.shape){
    const shape=part.shape;
    let cached=shapeTops.get(shape);
    if(cached===undefined){
      const geometry=shape==='sandbag'?createSandbagGeometry():createItemGeometry(shape);
      try{geometry.computeBoundingBox();cached=geometry.boundingBox?.max.y??.5;shapeTops.set(shape,cached);}
      finally{geometry.dispose();}
    }
    top=cached;
  }
  return part.y+top*(part.sy??1);
}
function partsTop(parts:readonly Placement[]):number {
  let top=0;for(const part of parts)top=Math.max(top,partTop(part));return top;
}
function pileTop(pile:MaterialPile):number {
  const item=pile.item,definition=ITEM_DEFINITIONS[item];
  // These assemblies depend on coordinate noise or the wrapped tree itself.
  // They normally have no caption; preserve their actual authoring if they do.
  if(definition.kind==='chunk'||item==='minified-tree')return partsTop(itemGeometry(item,pile.quantity,
    pile.owner.type==='ground'?pile.owner:undefined,pile.innerResource));
  // The finite full-stack ceiling also covers several ground identities
  // merged into one physical pile. Small authored shapes keep the old floor.
  const cached=itemTops.get(item);if(cached!==undefined)return cached;
  const top=partsTop(itemGeometry(item,definition.stackLimit));itemTops.set(item,top);return top;
}

export function pileLabelAnchor(pile:MaterialPile,surface?:PileSurface):{x:number;y:number;z:number} {
  if(pile.owner.type!=='ground')throw Error('A pile label requires a ground owner');
  const base=surface?.y??0,heightScale=surface?.scaleHeight?surface.scale:1;
  return {x:pile.owner.x+(surface?.x??0),z:pile.owner.z+(surface?.z??0),
    y:base+Math.max(surface ? .18 : .32,pileTop(pile)*heightScale+CLEARANCE)};
}

export function packedLabelAnchor(packed:World['packed'][number],surface?:PileSurface):{x:number;y:number;z:number} {
  if(packed.owner.type!=='ground')throw Error('A packed label requires a ground owner');
  const x=packed.owner.x+(surface?.x??0),z=packed.owner.z+(surface?.z??0),base=surface?.y??0,scale=surface?.scale??1;
  // FurnitureLayer uses these exact bedroll parts; the ordinary parcel's upper
  // strap is centred at .49 with thickness .03, both scaled with its support.
  const top=packed.building.kind==='bedroll'?partsTop(packedBedrollParts(packed.building,x,z,base,scale)):base+.505*scale;
  return {x,z,y:Math.max(base+(surface ? .18 : .32),top+CLEARANCE)};
}
