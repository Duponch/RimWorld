import { stoneColor } from './stone-palette';
import * as THREE from 'three/webgpu';
import type { World, Terrain } from '../sim/types';
import { WORLD_SCALE } from '../world/scale';
import { clearGroup, type Placement } from './primitives';
import { mergedInstances, noise } from './StaticGeometry';
const scratchColor=new THREE.Color();
export const TERRAIN_COLORS: Record<Terrain, number> = { 'rich-soil':0x665642,gravel:0x999783,'rough-stone':0x899182, grass: 0x81946c, soil: 0xa39b75, rock: 0x899182, water: 0x78a7a4 };
export const ARID_GRASS_COLOR = 0xa69772;

/** The visual map is sampled by the existing terrain quads. A texel can borrow
 * colour from the next logical cell, but neither geometry nor game tiles move.
 * The 8-pixel cell budget keeps a 250² world near 16 MiB before mipmaps. */
export const TERRAIN_PAINT_PIXELS_PER_CELL = 8;
const PAINT_MAX_SIDE = 2048;
const smooth = (t:number):number => {const v=Math.max(0,Math.min(1,t));return v*v*(3-2*v);};

export function terrainPaintPixelsPerCell(world:Pick<World,'width'|'height'>):number {
  return Math.max(1,Math.min(TERRAIN_PAINT_PIXELS_PER_CELL,Math.floor(PAINT_MAX_SIDE/Math.max(world.width,world.height))));
}

/** Shared edge displacement: both sides of a cell boundary use precisely the
 * same function, including across render chunks and after a camera move. */
export function terrainPaintEdge(axis:0|1,boundary:number,along:number,seed:number):number {
  const segment=Math.floor(along*2),blend=smooth(along*2-segment);
  const fineSegment=Math.floor(along*4),fineBlend=smooth(along*4-fineSegment);
  const salt=seed+axis*173+409;
  const first=noise(boundary*19+axis,segment,salt);
  const second=noise(boundary*19+axis,segment+1,salt);
  const fineFirst=noise(boundary*37+axis,fineSegment,salt+41);
  const fineSecond=noise(boundary*37+axis,fineSegment+1,salt+41);
  // The broad push makes cells visibly paint across their neighbours; the
  // smaller irregularity prevents a row of long, straight tile edges.
  return ((first*(1-blend)+second*blend)-.5)*.52
    +((fineFirst*(1-fineBlend)+fineSecond*fineBlend)-.5)*.13;
}

function paintTileColor(world:World,palette:Uint8Array,index:number):void {
  const x=index%world.width,z=Math.floor(index/world.width);
  const tile=world.tiles[index]!,terrain=tile.terrain==='rock'?'rough-stone':tile.terrain;
  const color=terrain==='rough-stone'?stoneColor(tile.stone):terrain==='grass'&&world.site?.biome==='arid-shrubland'?ARID_GRASS_COLOR:TERRAIN_COLORS[terrain];
  // Keep per-cell tint subtle. A hard tint step on every identical tile would
  // reveal the square grid even after its painted edge was displaced.
  scratchColor.setHex(color).multiplyScalar(.98+noise(x,z,world.seed)*.04);
  const hex=scratchColor.getHex(),offset=index*3;
  palette[offset]=(hex>>>16)&255;palette[offset+1]=(hex>>>8)&255;palette[offset+2]=hex&255;
}

function paintPixels(world:World,scale:number,pixels:Uint8Array,palette:Uint8Array,x0:number,z0:number,x1:number,z1:number):void {
  const width=world.width*scale;
  const channel=(x:number,z:number,c:number)=>palette[((Math.max(0,Math.min(world.height-1,z))*world.width+Math.max(0,Math.min(world.width-1,x)))*3)+c]!;
  const waterAt=(x:number,z:number)=>x>=0&&z>=0&&x<world.width&&z<world.height&&world.tiles[z*world.width+x]!.terrain==='water';
  // The horizontal boundary varies with each row but is shared by the ~8
  // texels across a cell. The vertical boundary varies with each column but
  // is shared by the ~8 rows. Cache those exact samples within this bake (or
  // local patch) instead of repeating four hash evaluations per texel.
  const zEdges=new Float32Array(x1-x0);
  let cachedZBoundary=Number.NaN;
  for(let py=z0;py<z1;py++){
    const gz=(py+.5)/scale,bz=Math.round(gz);
    if(bz!==cachedZBoundary){
      cachedZBoundary=bz;
      for(let px=x0;px<x1;px++)zEdges[px-x0]=terrainPaintEdge(1,bz,(px+.5)/scale,world.seed);
    }
    let cachedXBoundary=Number.NaN,xEdge=0;
    for(let px=x0;px<x1;px++){
    const gx=(px+.5)/scale;
    const bx=Math.round(gx);
    if(bx!==cachedXBoundary){cachedXBoundary=bx;xEdge=terrainPaintEdge(0,bx,gz,world.seed);}
    const dx=gx-bx-xEdge;
    const dz=gz-bz-zEdges[px-x0]!;
    // The pigment follows a shared displaced boundary. A narrow soft brush
    // covers that boundary; its centre can now protrude over a quarter tile.
    const brush=.115;
    const crossingX=Math.abs(dx)<brush,crossingZ=Math.abs(dz)<brush;
    const left=crossingX?bx-1:Math.floor(gx),right=crossingX?bx:left;
    const top=crossingZ?bz-1:Math.floor(gz),bottom=crossingZ?bz:top;
    const blendX=crossingX?smooth((dx+brush)/(2*brush)):0,blendZ=crossingZ?smooth((dz+brush)/(2*brush)):0;
    const dust=(noise(px,py,world.seed+701)-.5)*24;
    const stroke=noise(Math.floor((px+py*.24)/3),Math.floor(py/2),world.seed+907)>.77?13:0;
    const broad=(noise(Math.floor(px/17),Math.floor(py/19),world.seed+113)-.5)*20;
    const i=(py*width+px)*4;
    for(let c=0;c<3;c++){
      const a=channel(left,top,c)*(1-blendX)+channel(right,top,c)*blendX;
      const b=channel(left,bottom,c)*(1-blendX)+channel(right,bottom,c)*blendX;
      pixels[i+c]=Math.max(0,Math.min(255,Math.round((a*(1-blendZ)+b*blendZ)*(.97+(dust+stroke+broad)/255))));
    }
    // Alpha is a *pigment channel*, not transparency: water's material reads
    // it as a shore-foam mask. Land stays opaque under its standard material.
    const cellX=Math.floor(gx),cellZ=Math.floor(gz);
    let foam=0;
    if(waterAt(cellX,cellZ)){
      const xLocal=gx-cellX,zLocal=gz-cellZ;
      const leftBank=!waterAt(cellX-1,cellZ)
        ?xLocal-terrainPaintEdge(0,cellX,gz,world.seed):1;
      const rightBank=!waterAt(cellX+1,cellZ)
        ?1+terrainPaintEdge(0,cellX+1,gz,world.seed)-xLocal:1;
      const topBank=!waterAt(cellX,cellZ-1)
        ?zLocal-terrainPaintEdge(1,cellZ,gx,world.seed):1;
      const bottomBank=!waterAt(cellX,cellZ+1)
        ?1+terrainPaintEdge(1,cellZ+1,gx,world.seed)-zLocal:1;
      const distance=Math.min(leftBank,rightBank,topBank,bottomBank);
      const ragged=(noise(Math.floor(px/2),Math.floor(py/3),world.seed+1217)-.5)*.09;
      foam=1-smooth((distance+ragged)/.39);
    }
    pixels[i+3]=Math.round(255*Math.max(0,foam));
    }
  }
}

export function createTerrainPaintTexture(world:World):THREE.DataTexture {
  const scale=terrainPaintPixelsPerCell(world),width=world.width*scale,height=world.height*scale;
  const pixels=new Uint8Array(width*height*4);
  const palette=new Uint8Array(world.width*world.height*3);
  for(let i=0;i<world.tiles.length;i++)paintTileColor(world,palette,i);
  paintPixels(world,scale,pixels,palette,0,0,width,height);
  const texture=new THREE.DataTexture(pixels,width,height,THREE.RGBAFormat,THREE.UnsignedByteType);
  texture.userData.terrainPalette=palette;
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.magFilter=THREE.LinearFilter;
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps=true;
  texture.wrapS=THREE.ClampToEdgeWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;
  texture.needsUpdate=true;
  return texture;
}

/** Repaint the changed cell and the one-cell bleed margin. All pigment hashes
 * still use world coordinates, so patched bytes equal a complete fresh bake.
 * Three 0.186 WebGPU ignores DataTexture update ranges; GPU upload and mipmap
 * generation still cover the resident image. */
export function patchTerrainPaintTexture(texture:THREE.DataTexture,world:World,changed:readonly number[]):number {
  if(!changed.length)return 0;
  const scale=terrainPaintPixelsPerCell(world),width=world.width*scale,height=world.height*scale;
  if(texture.image.width!==width||texture.image.height!==height)throw new Error('Terrain paint texture dimensions changed.');
  const pixels=texture.image.data as Uint8Array,palette=texture.userData.terrainPalette as Uint8Array;
  if(!palette||palette.length!==world.tiles.length*3)throw new Error('Terrain paint palette is missing.');
  for(const index of changed)paintTileColor(world,palette,index);
  texture.clearUpdateRanges();
  if(changed.length>16){paintPixels(world,scale,pixels,palette,0,0,width,height);texture.needsUpdate=true;return width*height;}
  let painted=0;
  for(const index of changed){
    const x=index%world.width,z=Math.floor(index/world.width);
    const x0=Math.max(0,(x-1)*scale),z0=Math.max(0,(z-1)*scale);
    const x1=Math.min(width,(x+2)*scale),z1=Math.min(height,(z+2)*scale);
    paintPixels(world,scale,pixels,palette,x0,z0,x1,z1);
    painted+=(x1-x0)*(z1-z0);
  }
  texture.needsUpdate=true;
  return painted;
}

export function syncTerrainPaintUvs(world:Pick<World,'width'|'height'>,group:THREE.Group,surface:THREE.Material,enabled:boolean,water?:THREE.Material):void {
  for(const child of group.children){
    if(!(child instanceof THREE.Mesh)||(child.material!==surface&&child.material!==water))continue;
    const geometry=child.geometry;
    if(!enabled){if(geometry.getAttribute('uv'))geometry.deleteAttribute('uv');continue;}
    if(geometry.getAttribute('uv'))continue;
    const position=geometry.getAttribute('position'),uv=new Float32Array(position.count*2);
    for(let i=0;i<position.count;i++){uv[2*i]=(position.getX(i)+.5)/world.width;uv[2*i+1]=(position.getZ(i)+.5)/world.height;}
    geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  }
}

export function buildTerrain(world: World, group: THREE.Group, surface: THREE.Material, water: THREE.Material, painted=false): void {
    clearGroup(group);
    // Small spatial chunks keep each instance batch independently cullable.
    const chunkSize = WORLD_SCALE.chunkSize;
    for (let cz = 0; cz < world.height; cz += chunkSize) for (let cx = 0; cx < world.width; cx += chunkSize) {
      const tileGroups: Record<Terrain, Placement[]> = { grass: [], soil: [], water: [], rock: [], 'rough-stone':[],'rich-soil':[],gravel:[] };
      const banks: Placement[] = [];
      for (let z = cz; z < Math.min(cz + chunkSize, world.height); z++) for (let x = cx; x < Math.min(cx + chunkSize, world.width); x++) {
        const type = world.tiles[z * world.width + x].terrain;
        // The typed rough floor is already rendered beneath a massif; excavation changes no ground buffers.
        const terrain = type==='rock'?'rough-stone':type;
        const n = noise(x, z, world.seed);
        scratchColor.setHex(terrain==='rough-stone'?stoneColor(world.tiles[z*world.width+x].stone):terrain==='grass'&&world.site?.biome==='arid-shrubland'?ARID_GRASS_COLOR:TERRAIN_COLORS[terrain]).multiplyScalar(0.94 + n * 0.12);
        const color = scratchColor.getHex(), level = terrain === 'water' ? WORLD_SCALE.waterSurface : 0;
        tileGroups[terrain].push({ x, z, y: level, color });
        // Top quads replace six-sided ground cubes; exposed bank and perimeter
        // faces retain the original water drop and the slab join without holes.
        for (const [dx, dz, rotation] of [[1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2], [0, 1, 0], [0, -1, Math.PI]] as const) {
          const nx = x + dx, nz = z + dz;
          const neighbor = nx < 0 || nz < 0 || nx >= world.width || nz >= world.height ? -0.16
            : world.tiles[nz * world.width + nx].terrain === 'water' ? WORLD_SCALE.waterSurface : 0;
          if (neighbor < level) banks.push({ x: x + dx * 0.5, z: z + dz * 0.5, y: (level + neighbor) / 2, sy: level - neighbor, ry: rotation, color });
        }
      }
      mergedInstances(group, [
        { geometry: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), items: [...tileGroups.grass, ...tileGroups.soil, ...tileGroups.rock,...tileGroups['rough-stone'],...tileGroups['rich-soil'],...tileGroups.gravel] },
        { geometry: new THREE.PlaneGeometry(1, 1), items: banks },
      ], surface, false);
      mergedInstances(group, [{ geometry: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), items: tileGroups.water }], water, false);
    }
    // Identical world-space UVs meet at cell and chunk edges. Plain terrain
    // retains its original vertex layout and does not upload a UV buffer.
    if(painted)syncTerrainPaintUvs(world,group,surface,true,water);
  }
