import {BufferAttribute,type BufferGeometry} from 'three/webgpu';

const CHANNELS=[['position',3],['normal',3],['color',3],['uv',2]] as const;

/** Run once on a new authored Timber base, before any resident GPU binding.
 * A vertex is shared only when all eleven Float32 bit patterns match. Index
 * slot n still denotes corner n of the original triangle stream; no triangle,
 * face order, winding, normal/colour seam or UV seam is changed. */
export function indexTimberGeometry(geometry:BufferGeometry):void {
 if(geometry.index||Object.keys(geometry.attributes).length!==CHANNELS.length||Object.keys(geometry.morphAttributes).length)
  throw Error('Timber indexing requires its original four unindexed attributes');
 const channels=CHANNELS.map(([name,size])=>{
  const attribute=geometry.getAttribute(name);
  if(!(attribute instanceof BufferAttribute)||!(attribute.array instanceof Float32Array)||attribute.itemSize!==size)
   throw Error(`Invalid Float32 Timber attribute: ${name}`);
  return {name,size,attribute,bits:new Uint32Array(attribute.array.buffer,attribute.array.byteOffset,attribute.array.length)};
 });
 const count=channels[0]!.attribute.count;
 if(!Number.isSafeInteger(count)||count%3||channels.some(c=>c.attribute.count!==count))throw Error('Invalid Timber triangle stream');
 const index=count<=65535?new Uint16Array(count):new Uint32Array(count),representatives:number[]=[],vertices=new Map<string,number>();
 for(let corner=0;corner<count;corner++){
  let key='';
  for(const channel of channels)for(let component=0;component<channel.size;component++)key+=`${channel.bits[corner*channel.size+component]!}:`;
  let vertex=vertices.get(key);
  if(vertex===undefined){vertex=representatives.length;vertices.set(key,vertex);representatives.push(corner);}
  index[corner]=vertex;
 }
 for(const channel of channels){
  const array=new Float32Array(representatives.length*channel.size),bits=new Uint32Array(array.buffer);
  for(let vertex=0;vertex<representatives.length;vertex++)for(let component=0;component<channel.size;component++)
   bits[vertex*channel.size+component]=channel.bits[representatives[vertex]!*channel.size+component]!;
  // Copy words rather than round-tripping through JS Number. Signed zero and
  // even distinct NaN payloads remain exact; the authored bases are finite.
  const attribute=new BufferAttribute(array,channel.size,channel.attribute.normalized);
  attribute.name=channel.attribute.name;attribute.gpuType=channel.attribute.gpuType;attribute.setUsage(channel.attribute.usage);
  geometry.setAttribute(channel.name,attribute);
 }
 geometry.setIndex(new BufferAttribute(index,1));
}
