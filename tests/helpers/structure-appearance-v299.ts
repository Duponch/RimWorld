import {BufferAttribute,InterleavedBufferAttribute,type InstancedBufferGeometry} from 'three/webgpu';
import type {BoxMesh} from '../../src/render/BoxMesh';
import type {DoorLayer} from '../../src/render/DoorLayer';
import type {StructureVfxLayer} from '../../src/render/StructureVfxLayer';

const bytes=(array:ArrayBufferView)=>new Uint8Array(array.buffer,array.byteOffset,array.byteLength).slice();
const sphere=(value:BoxMesh['boundingSphere'])=>({center:value.center.toArray(),radius:value.radius});
function attributes(geometry:InstancedBufferGeometry){
  return Object.fromEntries(Object.entries(geometry.attributes).map(([name,value])=>{
    const data=value instanceof InterleavedBufferAttribute?value.data:value as BufferAttribute;
    return [name,{bytes:bytes(data.array),version:data.version,count:value.count,itemSize:value.itemSize}];
  }));
}
const box=(mesh:BoxMesh)=>({count:mesh.activeCount,visible:mesh.visible,bounds:sphere(mesh.boundingSphere),attributes:attributes(mesh.geometry)});
export const doorAppearance=(layer:DoorLayer)=>({mesh:box(layer.mesh),key:layer['key'],history:structuredClone([...layer['history']]),groupVisible:layer.group.visible});
export const vfxAppearance=(layer:StructureVfxLayer)=>({
  key:layer['key'],glow:box(layer.glow),smoke:{count:layer.smoke.geometry.instanceCount,visible:layer.smoke.visible,attributes:attributes(layer.smoke.geometry)},
  structuralSmoke:structuredClone(layer['structuralSmoke']),fireChunks:structuredClone(layer['fireChunks']),viewVersion:layer['viewVersion'],selectedVersion:layer['selectedVersion'],groupVisible:layer.group.visible,
});
