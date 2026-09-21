import { isAnimalMeat } from '../sim/biome-items';
import { blockParts } from './block-presentation';
import { chunkParts } from './chunk-presentation';
import { foldedApparel } from './character-apparel';
import type { ApparelItem } from '../sim/apparel-rules';
import { weaponVisual } from './weapon-shape';
import type { PileSurface } from './pile-surfaces';
import { ITEM_DEFINITIONS,type ItemId } from '../sim/items';
import type { MaterialKind } from '../sim/types';
import { WORLD_SCALE } from '../world/scale';
import type { Placement } from './primitives';
import { corpseParts,type CorpseStage } from './corpse-presentation';

export interface PileBundle {x:number;z:number;kind:MaterialKind;item:ItemId;quantity:number;supplied:boolean;surface?:PileSurface;corpseStage?:CorpseStage;facing?:number}

/** Static content rebuilt only when a chunk's pile signature changes. Every
 * item shares that chunk's already resident mesh and material. */
export function pileParts(bundles:readonly PileBundle[]):Placement[] {
  const logs: Placement[] = [], ends: Placement[] = [], crates: Placement[] = [], food: Placement[] = [];
  for (const bundle of bundles) {
    const starts=[logs.length,ends.length,crates.length,food.length];
    const x = bundle.x + (bundle.kind === 'wood' ? -0.12 : 0.2), z = bundle.z + (bundle.supplied ? 0.16 : bundle.item === 'berries' ? -0.24 : bundle.item === 'survival-meal' ? 0.24 : 0);
    const height = 0.12 + Math.min(1, bundle.quantity / ITEM_DEFINITIONS[bundle.item].stackLimit) * (WORLD_SCALE.pileMaxHeight - 0.12);
    if (bundle.kind === 'wood') {
      const rows = Math.max(1, Math.min(3, Math.ceil(bundle.quantity / 25)));
      for (let row = 0; row < rows; row++) for (let col = 0; col < 2; col++) {
        const y = 0.065 + row * 0.13, lz = z + (col - 0.5) * 0.145;
        logs.push({ x, z: lz, y, sx: WORLD_SCALE.pileWidth, sy: 0.12, sz: 0.12, color: row % 2 ? 0x9d794d : 0x896841 });
        ends.push({ x: x + WORLD_SCALE.pileWidth / 2 + 0.003, z: lz, y, sx: 0.012, sy: 0.095, sz: 0.095 });
      }
    } else if(bundle.kind==='corpse'){
      food.push(...corpseParts(bundle.x,z,bundle.corpseStage??'fresh',bundle.facing??0,bundle.item.replace('-corpse','')));
    } else if(bundle.kind==='unfinished'){
      food.push({x,z,y:.08,sx:.48,sy:.12,sz:.50,color:0xd8c8a2},{x:x+.15,z:z-.13,y:.17,sx:.12,sy:.08,sz:.12,color:0x5d716e});
    } else if(bundle.kind==='textile'){
      food.push({x:bundle.x,z,y:height/2,sx:.55,sy:height,sz:.4,color:ITEM_DEFINITIONS[bundle.item].color});
      food.push({x:bundle.x,z,y:height+.012,sx:.08,sy:.025,sz:.42,color:0x8a846a});
    } else if(isAnimalMeat(bundle.item)){
      const slabs=Math.max(1,Math.min(3,Math.ceil(bundle.quantity/25)));
      for(let row=0;row<slabs;row++){
        food.push({x:bundle.x,z,y:.055+row*.075,sx:.48,sy:.075,sz:.36,color:ITEM_DEFINITIONS[bundle.item].color},
          {x:bundle.x-.08,z,y:.095+row*.075,sx:.055,sy:.007,sz:.3,color:0xe1c5ab});
      }
    } else if(bundle.kind==='apparel'){
      for(const p of foldedApparel(bundle.item as ApparelItem))food.push({x:x+p.center[0]!,y:.07+p.center[1]!,z:z+p.center[2]!,sx:p.size[0]!,sy:p.size[1]!,sz:p.size[2]!,color:p.color});
    } else if(bundle.kind==='weapon'){
      for(const p of weaponVisual(bundle.item)?.parts??[])food.push({x:x+p.center[0],y:.07+p.center[2],z:z+p.center[1],sx:p.size[0],sy:p.size[2],sz:p.size[1],color:p.color});
    } else if(bundle.kind==='silver'){
      const rows=Math.max(1,Math.min(3,Math.ceil(bundle.quantity/170)));
      for(let row=0;row<rows;row++)for(const dx of [-.11,.11])food.push({x:bundle.x+dx,z,y:.045+row*.08,sx:.18,sy:.075,sz:.30,color:row%2?0xa5adb5:ITEM_DEFINITIONS.silver.color});
    } else if(bundle.kind==='medicine') {
      food.push({x:bundle.x,z,y:.14,sx:.42,sy:.26,sz:.36,color:ITEM_DEFINITIONS[bundle.item].color});
      food.push({x:bundle.x,z,y:.285,sx:.23,sy:.03,sz:.07,color:0xf0eee0},{x:bundle.x,z,y:.285,sx:.07,sy:.03,sz:.23,color:0xf0eee0});
    } else if(bundle.kind==='component') {
      food.push({x:bundle.x,z,y:.14,sx:.48,sy:.26,sz:.4,color:ITEM_DEFINITIONS.component.color});
      food.push({x:bundle.x,z,y:.29,sx:.2,sy:.07,sz:.26,color:0x637d77});
    } else if(bundle.kind==='steel') {
      for(let row=0;row<Math.ceil(bundle.quantity/25);row++)food.push({x:bundle.x,z,y:.07+row*.13,sx:.62,sy:.12,sz:.36,color:row%2?0x6b7a80:ITEM_DEFINITIONS.steel.color});
    } else if(bundle.kind==='blocks') {
      food.push(...blockParts(bundle.x,z,bundle.item,bundle.quantity));
    } else if(bundle.kind==='chunk') {
      food.push(...chunkParts(bundle.x,z,bundle.item));
    } else {
      crates.push({ x, z, y: height / 2, sx: 0.5, sy: height, sz: 0.45 });
      for (const dx of [-0.12, 0.12]) for (const dz of [-0.11, 0.11]) food.push({ x: x + dx, z: z + dz, y: height + 0.025, sx: 0.18, sy: 0.1, sz: 0.16, color: ITEM_DEFINITIONS[bundle.item].color });
    }
    if(bundle.surface)for(const [index,parts] of [logs,ends,crates,food].entries())for(let i=starts[index]!;i<parts.length;i++) {
      const p=parts[i]!,surface=bundle.surface;
      p.x=bundle.x+(p.x-bundle.x)*surface.scale+surface.x;p.z=bundle.z+(p.z-bundle.z)*surface.scale+surface.z;
      p.y+=surface.y;p.sx=(p.sx??1)*surface.scale;p.sz=(p.sz??1)*surface.scale;
    }
  }
  return [...logs,...ends.map(p=>({...p,color:0xc9ad77})),...crates.map(p=>({...p,color:0x987e51})),...food];
}
