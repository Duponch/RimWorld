import { appendFlora,floraSize,isGpuGrassSpecies } from './flora-presentation';
import { plantLeafless } from '../sim/plant-life';
import { isCrop } from '../sim/plants';
import { stoneColor } from './stone-palette';
import { harvestable } from '../sim/plants';
import * as THREE from 'three/webgpu';
import type { World } from '../sim/types';
import { WORLD_SCALE } from '../world/scale';
import { clearGroup } from './primitives';
import type { Placement } from './primitives';
import { mergedInstances,noise,type ResourceRangeData } from './StaticGeometry';

const resourceIdentity=(resource:World['resources'][number]):string=>
  `${resource.kind}:${resource.x}:${resource.z}:${resource.stone??''}:${resource.species??''}`;
const rangeResourceId=(id:number):number=>id<0?Math.floor(-id/2):id;

/** Removal compacts only the existing index buffer; vertices, mesh and material
 * stay resident. Original ranges also permit checkpoint restoration of an ID.
 * Addition/movement of a resource rebuilds only that spatial chunk.
 */
function retainResources(group: THREE.Group, alive: Set<number>): void {
  for (const object of group.children) {
    const mesh = object as THREE.Mesh;
    const data=mesh.userData.resourceRanges as ResourceRangeData|undefined;
    if (!data) continue;
    const index = mesh.geometry.index!; let count = 0;
    for (const range of data.ranges) if (alive.has(range.id)) {
      (index.array as Uint16Array | Uint32Array).set(data.original.subarray(range.start, range.start + range.count), count); count += range.count;
    }
    index.needsUpdate = true; mesh.geometry.setDrawRange(0, count);
    // The original sphere remains a conservative bound after removal.
  }
}

/** Reapply a resource's visible size from the immutable merged positions.
 * This avoids cumulative float drift and keeps index-mask ranges stable. */
function resizeResources(group:THREE.Group,resources:Map<number,World['resources'][number]>,originalSizes:Map<number,number>,currentSizes:Map<number,number>,nextSizes:Map<number,number>):void {
  const changed=new Set<number>();
  for(const [id,size] of nextSizes)if(currentSizes.get(id)!==size&&originalSizes.has(id))changed.add(id);
  if(!changed.size)return;
  for(const object of group.children) {
    const mesh=object as THREE.Mesh,data=mesh.userData.resourceRanges as ResourceRangeData|undefined;
    if(!data)continue;
    const position=mesh.geometry.getAttribute('position') as THREE.BufferAttribute;let touched=false;
    for(const range of data.ranges) {
      const id=rangeResourceId(range.id);if(!changed.has(id))continue;
      const resource=resources.get(id),initial=originalSizes.get(id),target=nextSizes.get(id);if(!resource||initial===undefined||target===undefined)continue;
      const ratio=target/initial;
      for(let vertex=range.vertexStart;vertex<range.vertexStart+range.vertexCount;vertex++){
        const offset=vertex*3;
        position.array[offset]=resource.x+(data.originalPositions[offset]!-resource.x)*ratio;
        position.array[offset+1]=data.originalPositions[offset+1]!*ratio;
        position.array[offset+2]=resource.z+(data.originalPositions[offset+2]!-resource.z)*ratio;
      }
      touched=true;
    }
    if(touched){position.needsUpdate=true;mesh.geometry.computeBoundingSphere();}
  }
  for(const id of changed)currentSizes.set(id,nextSizes.get(id)!);
}

function visibleResourceKeys(world:World,r:World['resources'][number]):number[]{
  if(r.kind!=='berries'&&!r.species)return [r.id];
  return [r.id,...(plantLeafless(world,r)?[]:[-r.id*2]),...(harvestable(world,r)?[-r.id*2-1]:[])];
}

export class ResourceLayer {
  private readonly chunks=new Map<string,{signature:string;group:THREE.Group;identities:Map<number,string>;originalSizes:Map<number,number>;currentSizes:Map<number,number>}>();
  private foliageVisible = true;
  private growing: World['resources'] = [];
  updateGrowth(world: World): void {
    if (this.growing.some(plant => harvestable(world, plant))) this.update(world, false);
  }
  constructor(readonly group: THREE.Group, private readonly staticMaterial: THREE.Material) {}
  setFoliageVisible(visible: boolean): void {
    this.foliageVisible = visible;
    this.group.traverse(object => { if (object.name === 'tree-canopy') object.visible = visible; });
  }
  clear(): void { clearGroup(this.group); this.chunks.clear(); this.growing = []; }
  update(world: World, newMap: boolean): void {
    if (newMap) { clearGroup(this.group); this.chunks.clear(); this.growing = []; }
    this.growing = world.resources.filter(plant => plant.kind === 'berries' && !harvestable(world, plant));
    const chunks = new Map<string, World['resources']>();
    for (const resource of world.resources) {
      if (isCrop(resource)||isGpuGrassSpecies(resource.species)) continue;
      const key = `${Math.floor(resource.x / WORLD_SCALE.chunkSize)}:${Math.floor(resource.z / WORLD_SCALE.chunkSize)}`;
      const chunk = chunks.get(key);
      if (chunk) chunk.push(resource); else chunks.set(key, [resource]);
    }
    for (const [key, previous] of this.chunks) if (!chunks.has(key) && previous.signature !== '') {
      retainResources(previous.group, new Set()); previous.signature = '';
    }
    for (const [key, chunk] of chunks) {
      const signature=chunk.map(resource=>`${resource.id}:${resourceIdentity(resource)}:${resource.kind==='berries'&&harvestable(world,resource)?1:0}:${plantLeafless(world,resource)}`).join('|');
      const sizes=new Map(chunk.map(resource=>[resource.id,floraSize(world,resource)]));
      const previous = this.chunks.get(key);
      const sizeChanged=previous&&chunk.some(resource=>previous.currentSizes.get(resource.id)!==sizes.get(resource.id));
      if (previous?.signature === signature&&!sizeChanged) continue;
      if (previous && chunk.every(r => previous.identities.get(r.id) === resourceIdentity(r))) {
        resizeResources(previous.group,new Map(chunk.map(resource=>[resource.id,resource])),previous.originalSizes,previous.currentSizes,sizes);
        retainResources(previous.group, new Set(chunk.flatMap(r => visibleResourceKeys(world,r)))); previous.signature = signature; continue;
      }
      const group = previous?.group ?? new THREE.Group();
      if (previous) clearGroup(group); else this.group.add(group);
      group.name = `Resources ${key}`;
      const trunks: Placement[] = [], crowns: Placement[] = [], upperCrowns: Placement[] = [];
      const rocks: Placement[] = [], bushes: Placement[] = [], berries: Placement[] = [];
      const cones:Placement[]=[],blades:Placement[]=[],cacti:Placement[]=[];
      for (const resource of chunk) {
        const { x, z } = resource;
        const parts = [trunks, crowns, upperCrowns, rocks, bushes, berries];
        const lengths = parts.map(items => items.length);
        const n = noise(x, z, 77), turn = n * Math.PI * 2;
        if(resource.species){appendFlora({trunks,crowns,cones,blades,cacti,bushes,fruit:berries},world,resource,turn);continue;}
        if (resource.kind === 'tree') {
          const height = WORLD_SCALE.treeMinHeight + n * (WORLD_SCALE.treeMaxHeight - WORLD_SCALE.treeMinHeight);
          const radius = 0.8 + n * 0.32;
          const broadleaf=world.site!==undefined;
          trunks.push({ x, y: height * 0.25, z, sx: 1.1, sy: height * 0.5, sz: 1.1, ry: turn });
          crowns.push({ x, y: height * (broadleaf?.62:.57), z, sx: radius, sy: height * (broadleaf?.21:.35), sz: radius, ry: turn, color: n > 0.65 ? 0x657d56 : 0x526e50 });
          upperCrowns.push({ x, y: height * .83, z, sx: radius * .72, sy: height * (broadleaf?.14:.34), sz: radius * .72, ry: turn + .3, color: n > .65 ? 0x81925b : 0x688557 });
        } else if (resource.kind === 'rock') {
          rocks.push({ x: x - 0.1, y: 0.3, z, sx: 0.46 + n * 0.14, sy: 0.35 + n * 0.15, sz: 0.43, ry: turn, color: resource.stone ? stoneColor(resource.stone) : 0x92998d });
          rocks.push({ x: x + 0.3, y: 0.15, z: z + 0.2, sx: 0.25, sy: 0.24, sz: 0.25, ry: -turn, color: resource.stone ? stoneColor(resource.stone) : 0xa8ad9c });
        } else {
          trunks.push({x,y:.13,z,sx:.6,sy:.28,sz:.6,ry:turn});
          bushes.push({ x, y: 0.3, z, sx: 0.44, sy: 0.39, sz: 0.4, ry: turn, color: 0x697b55 });
          for (let i = 0; i < 5; i++) {
            const angle = i * 2.4 + turn;
            berries.push({ x: x + Math.sin(angle) * 0.25, y: 0.42 + (i % 2) * 0.09, z: z + Math.cos(angle) * 0.25 });
          }
        }
        parts.forEach((items, i) => { for (let j = lengths[i]!; j < items.length; j++) items[j]!.key = i === 5 ? -resource.id*2-1 : i===4 ? -resource.id*2 : resource.id; });
      }
      for (const trunk of trunks) trunk.color ??= 0x70573e;
      for (const berry of berries) berry.color = 0xb96f63;
      mergedInstances(group, [
        { geometry: new THREE.CylinderGeometry(0.1, 0.16, 1, 5), items: trunks },
        { geometry: new THREE.DodecahedronGeometry(1, 0), items: rocks },
        { geometry: new THREE.BoxGeometry(1,1,1), items: blades },
        { geometry: new THREE.CylinderGeometry(.5,.5,1,5), items: cacti },
        { geometry: new THREE.IcosahedronGeometry(1, 0), items: bushes },
        { geometry: new THREE.IcosahedronGeometry(0.055, 0), items: berries },
      ], this.staticMaterial);
      const canopy = mergedInstances(group, [{ geometry: world.site?new THREE.IcosahedronGeometry(1,0):new THREE.ConeGeometry(1, 1, 6), items: [...crowns, ...upperCrowns] },{geometry:new THREE.ConeGeometry(1,1,6),items:cones}], this.staticMaterial);
      if (canopy) { canopy.name = 'tree-canopy'; canopy.visible = this.foliageVisible; }
      retainResources(group, new Set(chunk.flatMap(r => visibleResourceKeys(world,r))));
      this.chunks.set(key,{signature,group,identities:new Map(chunk.map(r=>[r.id,resourceIdentity(r)])),originalSizes:new Map(sizes),currentSizes:new Map(sizes)});
    }
  }

}
