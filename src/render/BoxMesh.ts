import * as THREE from 'three/webgpu';
import { Fn, attribute, mat4, normalLocal, positionLocal, transformNormal } from 'three/tsl';

const matrix = new THREE.Matrix4(), sphere = new THREE.Sphere();
const unitSphere = new THREE.Sphere(new THREE.Vector3(), Math.sqrt(3) / 2);

/** Attribute layouts are independent of allocation size and node IDs. Keep
 * transforms explicit so buffer growth reuses both solid and shadow shaders. */
export function configureBoxMaterial(material: THREE.NodeMaterial): void {
  material.positionNode = Fn(() => {
    const transform = mat4(attribute('boxMatrix0', 'vec4'), attribute('boxMatrix1', 'vec4'),
      attribute('boxMatrix2', 'vec4'), attribute('boxMatrix3', 'vec4')).toVar();
    normalLocal.assign(transformNormal(normalLocal, transform));
    return transform.mul(positionLocal).xyz;
  })();
  material.colorNode = attribute('boxColor', 'vec3');
}

export class BoxMesh extends THREE.Mesh<THREE.InstancedBufferGeometry> {
  instanceMatrix!: THREE.InstancedInterleavedBuffer;
  colorBuffer!: THREE.InstancedBufferAttribute;

  constructor(base: THREE.BoxGeometry, material: THREE.Material, capacity: number) {
    super(new THREE.InstancedBufferGeometry(), material);
    this.allocate(base, capacity);
  }

  allocate(base: THREE.BoxGeometry, capacity: number): void {
    this.geometry.dispose();
    const geometry = new THREE.InstancedBufferGeometry();
    // Tiny authored box data is owned by each geometry. Disposing a grown batch
    // must never release another live batch's attributes or index.
    geometry.setAttribute('position', base.getAttribute('position').clone());
    geometry.setAttribute('normal', base.getAttribute('normal').clone());
    geometry.setIndex(base.index!.clone());
    this.instanceMatrix = new THREE.InstancedInterleavedBuffer(new Float32Array(capacity * 16), 16).setUsage(THREE.DynamicDrawUsage);
    for(let column=0;column<4;column++)geometry.setAttribute(`boxMatrix${column}`, new THREE.InterleavedBufferAttribute(this.instanceMatrix,4,column*4));
    this.colorBuffer = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('boxColor', this.colorBuffer);
    geometry.instanceCount=0;geometry.boundingSphere=new THREE.Sphere();
    this.geometry=geometry;
  }

  get activeCount():number { return this.geometry.instanceCount; }
  set activeCount(value:number) { this.geometry.instanceCount=value; }
  get boundingSphere():THREE.Sphere { return this.geometry.boundingSphere!; }
  setMatrixAt(index:number,value:THREE.Matrix4):void { value.toArray(this.instanceMatrix.array,index*16); }
  getMatrixAt(index:number,target:THREE.Matrix4):void { target.fromArray(this.instanceMatrix.array,index*16); }
  setColorAt(index:number,value:THREE.Color):void { value.toArray(this.colorBuffer.array,index*3); }
  computeBoundingSphere():void {
    this.boundingSphere.makeEmpty();
    for(let i=0;i<this.activeCount;i++) {
      this.getMatrixAt(i,matrix);sphere.copy(unitSphere).applyMatrix4(matrix);this.boundingSphere.union(sphere);
    }
  }
  dispose():void { this.geometry.dispose(); }
}
