import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/index';
import type { Resource,World } from '../src/sim/types';
import { appendFlora,floraTreeHeight,type FloraParts } from '../src/render/flora-presentation';
import { ResourceLayer } from '../src/render/ResourceLayer';
import { noise,type ResourceRangeData } from '../src/render/StaticGeometry';
import { clearGroup } from '../src/render/primitives';

const parts=():FloraParts=>({trunks:[],crowns:[],cones:[],bushes:[],blades:[],cacti:[],fruit:[]});
const bounds=(y:number,height:number)=>({bottom:y-height/2,top:y+height/2});

test('pine upper cone enters the lower canopy by more than half its height at every growth step',()=>{
  const world=createWorld(),pine:Resource={id:900,x:8,z:8,kind:'tree',species:'pine',amount:30,growth:1};
  for(const growth of [1,.825,.65,.475]){
    pine.growth=growth;const shape=parts();appendFlora(shape,world,pine,.37);
    expect(shape.cones).toHaveLength(2);
    const [lower,upper]=shape.cones,lo=bounds(lower!.y,lower!.sy!),hi=bounds(upper!.y,upper!.sy!);
    expect(lo.top-hi.bottom).toBeGreaterThan(lower!.sy!*.5);
    expect(hi.bottom).toBeGreaterThan(lo.bottom);
    expect(hi.top).toBeGreaterThan(lo.top);
    expect(shape.trunks).toHaveLength(1);
  }
});

test('legacy conifers overlap while broadleaf and cactus centres retain their previous placement',()=>{
  const world=createWorld(42,32,32);world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.resources=[{id:901,x:8,z:8,kind:'tree',amount:30}];
  delete world.site;
  const group=new THREE.Group(),material=new THREE.MeshStandardNodeMaterial(),layer=new ResourceLayer(group,material);
  const canopy=()=>group.children.flatMap(chunk=>chunk.children).find(mesh=>mesh.name==='tree-canopy') as THREE.Mesh;
  const centers=()=>{
    const mesh=canopy(),positions=mesh.geometry.getAttribute('position'),ranges=(mesh.userData.resourceRanges as ResourceRangeData).ranges;
    return ranges.map(range=>{
      let sum=0,min=Infinity,max=-Infinity;
      for(let v=range.vertexStart;v<range.vertexStart+range.vertexCount;v++){
        const y=positions.getY(v);sum+=y;min=Math.min(min,y);max=Math.max(max,y);
      }
      return {center:sum/range.vertexCount,bottom:min,top:max};
    });
  };
  layer.update(world,true);
  const conifer=centers();expect(conifer).toHaveLength(2);
  expect(conifer[0]!.top-conifer[1]!.bottom).toBeGreaterThan((conifer[0]!.top-conifer[0]!.bottom)*.35);
  world.site={} as World['site'];layer.update(world,true);
  const broadleaf=centers(),height=5+noise(8,8,77)*2;
  expect(broadleaf).toHaveLength(2);
  expect(broadleaf[0]!.center).toBeCloseTo(height*.62,5);
  expect(broadleaf[1]!.center).toBeCloseTo(height*.83,5);
  layer.clear();clearGroup(group);material.dispose();

  const cactus:Resource={id:902,x:8,z:8,kind:'tree',species:'saguaro',amount:30,growth:1};
  const original=parts();appendFlora(original,world,cactus,.37);
  expect(original.cones).toHaveLength(0);
  expect(original.cacti.map(piece=>piece.y)).toEqual([floraTreeHeight(cactus)/2,1,1.4,1,1.4]);
});
