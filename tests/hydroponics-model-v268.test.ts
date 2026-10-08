import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { hydroponicsParts,HYDROPONIC_SUPPORT_HEIGHT } from '../src/render/hydroponics-parts';
import { CropLayer } from '../src/render/CropLayer';
import { ResourceLayer } from '../src/render/ResourceLayer';
import { appendFlora,floraIdentity,type FloraParts } from '../src/render/flora-presentation';
import { footprintCells } from '../src/sim/definitions';
import { createWorld } from '../src/sim';
import type { Resource,Structure,World } from '../src/sim/types';

const basin=(orientation:Structure['orientation']=0):Structure=>({id:9001,kind:'hydroponics-basin',x:8,z:8,orientation,footprint:'standard',material:'steel',power:{on:true,parentId:1}});
function link(world:World,b:Structure):void {
  world.structures=[b];
  world.growingZones=[{id:9002,basinId:b.id,cells:footprintCells(b).map(c=>c.z*world.width+c.x),plant:'rice',allowSow:true,allowCut:true}];
}
const emptyFlora=():FloraParts=>({trunks:[],crowns:[],cones:[],bushes:[],blades:[],cacti:[],fruit:[]});

test('four planting wells and the complete low basin fit every real oriented footprint',()=>{
  const world=createWorld(268,20,20);
  for(const orientation of [0,1,2,3] as const) {
    const b=basin(orientation);world.structures=[b];
    const before=JSON.stringify(world),parts=hydroponicsParts(world),cells=footprintCells(b);
    expect(JSON.stringify(world)).toBe(before);
    const xs=cells.map(c=>c.x),zs=cells.map(c=>c.z);
    for(const p of parts) {
      expect(p.key).toBe(b.id);
      const hx=(Math.abs(Math.cos(p.ry!))*p.sx!+Math.abs(Math.sin(p.ry!))*p.sz!)/2;
      const hz=(Math.abs(Math.sin(p.ry!))*p.sx!+Math.abs(Math.cos(p.ry!))*p.sz!)/2;
      expect(p.x-hx).toBeGreaterThanOrEqual(Math.min(...xs)-.5);expect(p.x+hx).toBeLessThanOrEqual(Math.max(...xs)+.5);
      expect(p.z-hz).toBeGreaterThanOrEqual(Math.min(...zs)-.5);expect(p.z+hz).toBeLessThanOrEqual(Math.max(...zs)+.5);
      expect(p.y-p.sy!/2).toBeGreaterThanOrEqual(0);expect(p.y+p.sy!/2).toBeLessThanOrEqual(HYDROPONIC_SUPPORT_HEIGHT+1e-12);
    }
    const wells=parts.filter(p=>p.color===0x4e7977);expect(wells).toHaveLength(4);
    for(const cell of cells)expect(wells.some(p=>Math.abs(p.x-cell.x)<1e-10&&Math.abs(p.z-cell.z)<1e-10)).toBe(true);
  }
});

test('the ordinary crop instances gain only the support height and return to ground after removal',()=>{
  const world=createWorld(268,20,20),b=basin();link(world,b);
  world.resources=[{id:9003,kind:'rice',x:8,z:9,amount:6,growth:1}];
  const material=new THREE.MeshBasicNodeMaterial(),layer=new CropLayer(material),pose=new THREE.Matrix4();
  try {
    layer.update(world,true);
    const rice=layer.group.children[0] as THREE.InstancedMesh;
    expect(rice.count).toBe(1);rice.getMatrixAt(0,pose);
    expect(pose.elements[12]).toBe(8);expect(pose.elements[14]).toBe(9);expect(pose.elements[13]).toBeCloseTo(.025+HYDROPONIC_SUPPORT_HEIGHT,6);
    const raised=pose.clone();world.structures=[];world.growingZones=[];layer.update(world,false);rice.getMatrixAt(0,pose);
    expect(pose.elements[13]).toBeCloseTo(.025,6);
    for(const i of [0,1,2,4,5,6,8,9,10,12,14])expect(pose.elements[i]).toBe(raised.elements[i]);
    world.resources=[];layer.update(world,false);expect(rice.count).toBe(0);
  } finally {layer.dispose();material.dispose();}
});

test('medicinal plants keep their actual rosette and support changes invalidate its flora identity',()=>{
  const world=createWorld(268,20,20),plant:Resource={id:9003,kind:'healroot',x:8,z:8,amount:1,growth:1};
  world.structures=[];world.growingZones=[];world.resources=[plant];
  const ground=emptyFlora(),raised=emptyFlora(),identity=floraIdentity(world,plant);appendFlora(ground,world,plant,0);
  link(world,basin());world.growingZones[0]!.plant='healroot';
  appendFlora(raised,world,plant,0);expect(floraIdentity(world,plant)).not.toBe(identity);
  expect(raised.bushes).toHaveLength(ground.bushes.length);
  for(let i=0;i<ground.bushes.length;i++) {
    const old=ground.bushes[i]!,now=raised.bushes[i]!;
    expect(now.y-old.y).toBeCloseTo(HYDROPONIC_SUPPORT_HEIGHT,12);
    expect({...now,y:old.y}).toEqual(old);
  }
  world.structures=[];world.growingZones=[];expect(floraIdentity(world,plant)).toBe(identity);
});

test('empty basins do not create decorative plants and ordinary structures contribute no basin mesh',()=>{
  expect(hydroponicsParts({structures:[]})).toEqual([]);
  expect(hydroponicsParts({structures:[{...basin(),kind:'sun-lamp'}]})).toEqual([]);
  const parts=hydroponicsParts({structures:[basin()]});
  expect(parts.every(p=>p.y+p.sy!/2<=HYDROPONIC_SUPPORT_HEIGHT+1e-12)).toBe(true);
});

test('resident medicinal growth scales around the basin surface and matches a fresh rebuild',()=>{
  const world=createWorld(268,20,20);link(world,basin());world.growingZones[0]!.plant='healroot';
  const plant:Resource={id:9003,kind:'healroot',x:8,z:8,amount:1,growth:.1,growthTick:world.tick};world.resources=[plant];
  const material=new THREE.MeshStandardNodeMaterial({vertexColors:true});material.userData.rendererOwned=true;
  const group=new THREE.Group(),fullGroup=new THREE.Group(),layer=new ResourceLayer(group,material),full=new ResourceLayer(fullGroup,material);
  const positions=(root:THREE.Group):number[][]=>{
    const result:number[][]=[];root.traverse(object=>{if(object instanceof THREE.Mesh)result.push(Array.from(object.geometry.getAttribute('position').array));});return result;
  };
  try {
    layer.update(world,true);
    const meshes:THREE.Mesh[]=[];group.traverse(object=>{if(object instanceof THREE.Mesh)meshes.push(object);});
    const geometries=meshes.map(mesh=>mesh.geometry);
    for(const growth of [.6,1,.3]) {
      plant.growth=growth;layer.update(world,false);full.update(world,true);
      const live:THREE.Mesh[]=[];group.traverse(object=>{if(object instanceof THREE.Mesh)live.push(object);});
      expect(live).toEqual(meshes);expect(live.map(mesh=>mesh.geometry)).toEqual(geometries);
      const actual=positions(group),expected=positions(fullGroup);expect(actual.map(p=>p.length)).toEqual(expected.map(p=>p.length));
      for(let mesh=0;mesh<actual.length;mesh++)for(let i=0;i<actual[mesh]!.length;i++)expect(actual[mesh]![i]).toBeCloseTo(expected[mesh]![i]!,5);
      for(const p of actual)for(let y=1;y<p.length;y+=3)expect(p[y]).toBeGreaterThanOrEqual(HYDROPONIC_SUPPORT_HEIGHT-1e-6);
    }
  } finally {layer.dispose();full.dispose();material.dispose();}
});
