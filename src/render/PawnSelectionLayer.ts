import { pawnPresentationPose } from './pawn-presentation';
import * as THREE from 'three/webgpu';
import { attribute, Fn, positionLocal, vec3 } from 'three/tsl';
import type { PawnLayer } from './PawnLayer';

/** One resident batch shares the body's exact GPU trajectory. No matrix or
 * skeleton update per selected pawn/frame; flags change only on selection. */
export function pawnSelectionMesh(source:THREE.InstancedBufferGeometry,clock:Pick<PawnLayer,'blend'|'travelTime'>):THREE.Mesh {
  const ring=new THREE.RingGeometry(.38,.45,24).rotateX(-Math.PI/2);
  const geometry=new THREE.InstancedBufferGeometry();
  geometry.index=ring.index;geometry.setAttribute('position',ring.getAttribute('position'));
  for(const name of ['aFrom','aTo','aTravel'])geometry.setAttribute(name,source.getAttribute(name));
  geometry.setAttribute('aSelected',new THREE.InstancedBufferAttribute(new Float32Array(source.getAttribute('aFrom').count),1).setUsage(THREE.DynamicDrawUsage));
  const material=new THREE.MeshBasicNodeMaterial({color:0xffe5a0,side:THREE.DoubleSide,depthWrite:false});
  material.positionNode=Fn(()=>{
    const pose=pawnPresentationPose(clock);
    return positionLocal.mul(attribute('aSelected','float')).add(vec3(pose.x,pose.y.add(.08),pose.z));
  })();
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
  mesh.name='Selected colonists — shared GPU trajectories';mesh.renderOrder=5;
  ring.dispose();return mesh;
}
