import * as THREE from 'three/webgpu';
export type Placement = { x: number; y: number; z: number; sx?: number; sy?: number; sz?: number; ry?: number; color?: number; key?: number };
const scratchObject = new THREE.Object3D();
const scratchColor = new THREE.Color();

export function material(color: number, extra: THREE.MeshStandardNodeMaterialParameters = {}): THREE.MeshStandardNodeMaterial {
  return new THREE.MeshStandardNodeMaterial({ color, roughness: 0.93, metalness: 0, flatShading: true, ...extra });
}

export function instances(group: THREE.Group, geometry: THREE.BufferGeometry, mat: THREE.Material, items: Placement[], shadows = true): THREE.InstancedMesh | undefined {
  if (!items.length) { geometry.dispose(); mat.dispose(); return; }
  const mesh = new THREE.InstancedMesh(geometry, mat, items.length);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    scratchObject.position.set(item.x, item.y, item.z);
    scratchObject.rotation.set(0, item.ry ?? 0, 0);
    scratchObject.scale.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1);
    scratchObject.updateMatrix();
    mesh.setMatrixAt(i, scratchObject.matrix);
    if (item.color !== undefined) mesh.setColorAt(i, scratchColor.setHex(item.color));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  group.add(mesh);
  return mesh;
}

export function clearGroup(group: THREE.Group): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const mat of Array.isArray(object.material) ? object.material : [object.material]) materials.add(mat);
    if (object instanceof THREE.InstancedMesh) object.dispose();
  });
  group.clear();
  for (const geometry of geometries) if (!geometry.userData.rendererOwned) geometry.dispose();
  for (const mat of materials) if (!mat.userData.rendererOwned) mat.dispose();
}
