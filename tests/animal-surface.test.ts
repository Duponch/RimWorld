import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { animalCoreProfile,animalParts } from '../src/render/animal-shape';
import { hareGeometry } from '../src/render/hare-geometry';
import { WildlifeLayer } from '../src/render/WildlifeLayer';
import { adultAgeTicks } from '../src/sim/animal-life';
import type { AnimalSpeciesId } from '../src/sim/animal-species';
import { animalCombatCamp } from './scenarios/animal-combat';

const species:AnimalSpeciesId[]=['hare','snow-hare','deer','muffalo','gazelle','dromedary'];
const key=(x:number,y:number,z:number):string=>[x,y,z].map(value=>value.toFixed(5)).join(':');

test.each(species)('%s has one closed exterior shell without internal section caps',kind=>{
  const geometry=hareGeometry(2,kind),position=geometry.getAttribute('position'),bone=geometry.getAttribute('boneId');
  let shellVertices=0;
  while(shellVertices<bone.count&&bone.getX(shellVertices)>=4)shellVertices++;
  expect(shellVertices).toBeGreaterThan(100);
  expect(shellVertices%6).toBe(0);
  const parts=animalParts(kind);
  expect(position.count-shellVertices).toBe(parts.filter(part=>!part.core).length*36);
  expect(position.count-parts.length*36).toBeGreaterThanOrEqual(12);
  expect(position.count-parts.length*36).toBeLessThanOrEqual(84);
  const profile=animalCoreProfile(kind);
  expect(profile.rings.every((ring,index)=>index===0||ring.z>profile.rings[index-1]!.z)).toBe(true);
  expect(profile.rings.every(ring=>ring.halfWidth>0&&ring.top>ring.bottom)).toBe(true);
  const edges=new Map<string,number>();
  for(let i=0;i<shellVertices;i+=3){
    const vertices=[0,1,2].map(offset=>key(position.getX(i+offset),position.getY(i+offset),position.getZ(i+offset)));
    for(const [a,b] of [[0,1],[1,2],[2,0]]){
      const pair=[vertices[a]!,vertices[b]!].sort().join('|');
      edges.set(pair,(edges.get(pair)??0)+1);
    }
    expect([0,1,2].every(offset=>bone.getX(i+offset)>=4&&bone.getX(i+offset)<=5)).toBe(true);
  }
  expect([...edges.values()].every(count=>count===2)).toBe(true);
  // Only the front and rear close a section. Every side face spans two rings.
  let flatSections=0;
  for(let i=0;i<shellVertices;i+=6){
    const z=new Set(Array.from({length:6},(_,offset)=>position.getZ(i+offset).toFixed(5)));
    if(z.size===1)flatSections++;
  }
  expect(flatSections).toBe(2);
  const weights=new Set(Array.from({length:shellVertices},(_,i)=>bone.getX(i).toFixed(2)));
  expect(weights.has('4.00')).toBe(true);
  expect(weights.has('5.00')).toBe(true);
  expect([...weights].some(weight=>Number(weight)>4&&Number(weight)<5)).toBe(true);
  expect(Object.keys(geometry.attributes).sort()).toEqual(['aAnimal','aFrom','aScale','aTo','aTravel','bindPivot','boneId','color','normal','position'].sort());
  expect(geometry.instanceCount).toBe(0);
  geometry.dispose();
});

test('living rest keeps the complete animal volume on the ground for every species',()=>{
  const world=animalCombatCamp(),base=world.wildlife!.animals[0]!;
  world.wildlife!.animals=species.map((kind,index)=>({
    ...structuredClone(base),id:900+index,species:kind,ageTicks:adultAgeTicks(kind),
    x:5+index*3,z:8,state:'idle',motion:undefined,path:[],
  }));
  const layer=new WildlifeLayer();
  try{
    const meshes=new Map(species.map(kind=>[kind,layer.mesh.children.find(child=>child.name===`Wild ${kind} — GPU rig`) as THREE.Mesh]));
    const geometryBySpecies=new Map(species.map(kind=>[kind,meshes.get(kind)!.geometry]));
    const surfaces=new Map(species.map(kind=>{
      const geometry=meshes.get(kind)!.geometry;
      const uv=geometry.getAttribute('animalPaintUv'),normal=geometry.getAttribute('normal');
      expect(uv.count).toBe(geometry.getAttribute('position').count);
      expect(Array.from(uv.array).every(Number.isFinite)).toBe(true);
      return [kind,{uv,normal,coordinates:Array.from(uv.array),normals:Array.from(normal.array)}] as const;
    }));
    for(const posture of ['idle','moving','sleeping','downed','dead'] as const){
      for(const animal of world.wildlife!.animals){
        animal.state=posture;
        animal.motion=posture==='moving'?{from:{x:animal.x,z:animal.z},to:{x:animal.x+1,z:animal.z},start:world.tick-1,end:world.tick+1}:undefined;
      }
      const before=structuredClone(world);layer.update(world,undefined,true);expect(world).toEqual(before);
      const shown=new Map<number,{height:number;radius:number}>();
      layer.forEachPose((id,_kind,_x,_y,_z,height,radius)=>shown.set(id,{height,radius}));
      for(const animal of world.wildlife!.animals){
        const geometry=meshes.get(animal.species)!.geometry;
        const encoded=geometry.getAttribute('aAnimal'),scale=geometry.getAttribute('aScale').getX(0);
        const bounds=geometry.boundingBox!;
        const result=shown.get(animal.id)!;
        expect(geometry).toBe(geometryBySpecies.get(animal.species));
        const surface=surfaces.get(animal.species)!;
        expect(geometry.getAttribute('animalPaintUv')).toBe(surface.uv);
        expect(geometry.getAttribute('normal')).toBe(surface.normal);
        expect(Array.from(surface.uv.array)).toEqual(surface.coordinates);
        expect(Array.from(surface.normal.array)).toEqual(surface.normals);
        expect(encoded.getZ(0)).toBe(posture==='dead'?2:posture==='sleeping'||posture==='downed'?1:0);
        expect(encoded.getX(0)).toBe(posture==='moving'?1:0);
        if(posture==='sleeping'||posture==='downed'){
          // A quarter turn transfers the full bind-space width to height and
          // the full upright height to horizontal reach, without squeezing.
          expect(result.height).toBeCloseTo((bounds.max.x-bounds.min.x+.025)*scale,4);
          const bodyCenter=animalParts(animal.species)[0]!.center[1];
          expect(result.radius).toBeCloseTo((Math.max(Math.abs(bodyCenter-bounds.min.y),Math.abs(bodyCenter-bounds.max.y),Math.abs(bounds.min.z),Math.abs(bounds.max.z))+.1)*scale,4);
        }else if(posture==='dead')expect(result.height).toBeCloseTo(bounds.max.y*.5*scale,4);
        else expect(result.height).toBeCloseTo(bounds.max.y*scale,4);
      }
    }
    const painted=species.map(kind=>meshes.get(kind)!.material);
    const coatMaps=new Set<THREE.Texture>();
    for(const material of painted){
      let samples=0;
      (material as THREE.MeshStandardNodeMaterial).colorNode!.traverse(node=>{
        if('isTextureNode' in node && node.isTextureNode){samples++;coatMaps.add((node as unknown as {value:THREE.Texture}).value);}
      });
      expect(samples).toBe(1);
    }
    expect(coatMaps.size).toBe(3);
    layer.setTexturesEnabled(false);
    for(const mesh of meshes.values()){
      const material=mesh.material as THREE.MeshStandardNodeMaterial;
      expect(material.map).toBeNull();
      let samples=0;material.colorNode!.traverse(node=>{if('isTextureNode' in node && node.isTextureNode)samples++;});
      expect(samples).toBe(0);
    }
    layer.setTexturesEnabled(true);
    species.forEach((kind,i)=>expect(meshes.get(kind)!.material).toBe(painted[i]));
  }finally{layer.dispose();}
});
