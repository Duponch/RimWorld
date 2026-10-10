import * as THREE from 'three/webgpu';
import type {ItemId} from '../sim/items';
import {createItemGeometry} from './item-geometry';
import {createChunkGeometry,chunkContour,isSmallChunk} from './chunk-shape';
import {itemGeometry} from './item-presentation';
import type {Placement} from './primitives';

export interface GeometryPortraitEntry {geometry:THREE.BufferGeometry;placement:Placement&{rx?:number;rz?:number}}
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const dataUrl=(svg:string)=>`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const shapeMeshes=new Map<string,THREE.BufferGeometry>();
const portraits=new Map<ItemId,string>(),urls=new Map<ItemId,string>();

/** Offline orthographic projection of actual triangles; accepts building mesh
 * entries too. No renderer, Canvas, DOM or mutation of the source geometry. */
export function geometryPortraitSvg(entries:readonly GeometryPortraitEntry[],source=''):string {
  const eye=new THREE.Vector3(.58,.76,.43).normalize(),right=new THREE.Vector3(eye.z,0,-eye.x).normalize(),up=new THREE.Vector3().crossVectors(eye,right).normalize();
  const light=new THREE.Vector3(-.4,.85,.55).normalize();
  const faces:{points:[number,number][];depth:number;color:string}[]=[];
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  const point=new THREE.Vector3(),normal=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion();
  for(const {geometry,placement:p} of entries){
    const positions=geometry.getAttribute('position'),colors=geometry.getAttribute('color'),index=geometry.getIndex();if(!positions)continue;
    rotation.setFromEuler(new THREE.Euler(p.rx??0,p.ry??0,p.rz??0));matrix.compose(new THREE.Vector3(p.x,p.y,p.z),rotation,new THREE.Vector3(p.sx??1,p.sy??1,p.sz??1));
    const read=(i:number,target:THREE.Vector3)=>target.fromBufferAttribute(positions,i).applyMatrix4(matrix);
    for(let i=0;i<(index?.count??positions.count);i+=3){
      if(i+2>=(index?.count??positions.count))break;
      const ids=[index?index.getX(i):i,index?index.getX(i+1):i+1,index?index.getX(i+2):i+2];
      read(ids[0]!,a);read(ids[1]!,b);read(ids[2]!,c);
      normal.subVectors(b,a).cross(point.subVectors(c,a)).normalize();if(normal.dot(eye)<=1e-7)continue;
      const points=[a,b,c].map(v=>[v.dot(right),v.dot(up)] as [number,number]);
      for(const [x,y] of points){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
      const shade=.62+.38*Math.max(0,normal.dot(light)),tint=new THREE.Color(colors?0xffffff:p.color??0xb8ac96);
      if(colors){tint.setRGB(ids.reduce((sum,id)=>sum+colors.getX(id),0)/3,ids.reduce((sum,id)=>sum+colors.getY(id),0)/3,ids.reduce((sum,id)=>sum+colors.getZ(id),0)/3);if(p.color!==undefined)tint.multiply(new THREE.Color(p.color));}
      tint.multiplyScalar(shade);
      faces.push({points,depth:(a.dot(eye)+b.dot(eye)+c.dot(eye))/3,color:`#${tint.getHexString()}`});
    }
  }
  if(!faces.length)return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><title>${escape(source)}</title></svg>`;
  const scale=82/Math.max(maxX-minX,maxY-minY,1e-8),cx=(minX+maxX)/2,cy=(minY+maxY)/2;
  faces.sort((a,b)=>a.depth-b.depth);
  const polygons=faces.map(face=>`<path d="${face.points.map(([x,y],i)=>`${i?'L':'M'}${(48+(x-cx)*scale).toFixed(2)},${(48-(y-cy)*scale).toFixed(2)}`).join('')}Z" fill="${face.color}" stroke="${face.color}" stroke-width=".35" stroke-linejoin="round"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img"><title>${escape(source)}</title>${polygons}</svg>`;
}

/** Rounded rocks include the exact four-float vertex deformation used by TSL. */
export function placementGeometry(p:Placement):THREE.BufferGeometry {
  if(p.shape==='rounded-rock'){
    const key=`rock:${isSmallChunk(p.key,p.sx)}:${p.key??0}`;let geometry=shapeMeshes.get(key);
    if(!geometry){geometry=createChunkGeometry(isSmallChunk(p.key,p.sx));const position=geometry.getAttribute('position'),[a,b,c,d]=chunkContour(p.key);
      for(let i=0;i<position.count;i++){const x=position.getX(i),y=position.getY(i),z=position.getZ(i),r=Math.max(.88,Math.min(1,.945+x*a+y*b+z*c+x*z*d));position.setXYZ(i,x*r,y*r,z*r);}
      geometry.computeVertexNormals();if(shapeMeshes.size>=128){const oldest=[...shapeMeshes.keys()].find(k=>k.startsWith('rock:'));if(oldest){shapeMeshes.get(oldest)!.dispose();shapeMeshes.delete(oldest);}}shapeMeshes.set(key,geometry);}
    return geometry;
  }
  const key=p.shape??'box';let geometry=shapeMeshes.get(key);
  if(!geometry){geometry=p.shape?createItemGeometry(p.shape):new THREE.BoxGeometry(1,1,1);shapeMeshes.set(key,geometry);}return geometry;
}
export const placementsPortraitSvg=(parts:readonly Placement[],source=''):string=>geometryPortraitSvg(parts.map(placement=>({geometry:placementGeometry(placement),placement})),source);
export const placementsPortraitDataUrl=(parts:readonly Placement[],source=''):string=>dataUrl(placementsPortraitSvg(parts,source));
export function itemPortraitSvg(item:ItemId):string {let svg=portraits.get(item);if(svg===undefined){svg=placementsPortraitSvg(itemGeometry(item),item);portraits.set(item,svg);}return svg;}
export function itemPortraitDataUrl(item:ItemId):string {let url=urls.get(item);if(url===undefined){url=dataUrl(itemPortraitSvg(item));urls.set(item,url);}return url;}
