import { expect,test } from 'vitest';
import { animalCoreProfile,animalParts } from '../src/render/animal-shape';
import { hareGeometry } from '../src/render/hare-geometry';

const species=['hare','snow-hare','deer','muffalo','gazelle','dromedary'];
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
