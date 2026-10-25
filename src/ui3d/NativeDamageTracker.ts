import * as THREE from 'three/webgpu';
import type {NativeOverlayDamage} from './NativeOverlayCache';

type Value = object | string | number | boolean | null | undefined;

/** Reusable value journal; avoids JSON/string hashes and compares exact values. */
class Signature {
  private readonly values: Value[] = [];
  private cursor = 0;
  changed = false;
  begin(): void {this.cursor = 0; this.changed = false;}
  add(value: Value): void {
    if (!Object.is(this.values[this.cursor], value) || this.cursor >= this.values.length) this.changed = true;
    this.values[this.cursor++] = value;
  }
  matrix(matrix: THREE.Matrix4 | THREE.Matrix3): void {for (const value of matrix.elements) this.add(value);}
  finish(): boolean {if (this.values.length !== this.cursor) this.changed = true; this.values.length = this.cursor; return this.changed;}
}

interface ResourceState {
  signature: Signature; epoch: number; generation: number; revision: number; supported: boolean;
  positionSignature?: Signature; sphereSignature?: Signature; unsafeBounds?: boolean;
}
interface ObjectState {signature: Signature; bounds: THREE.Box2; epoch: number}

/** Conservative retained-mesh damage. Unknown deformation/shading falls back to
 * a full image; this tracker never changes geometry, materials or visibility. */
export class NativeDamageTracker {
  private objects = new Map<THREE.Object3D, ObjectState>();
  private resources = new WeakMap<object, ResourceState>();
  private readonly global = new Signature();
  private readonly projection = new THREE.Matrix4();
  private readonly clip = new THREE.Vector4();
  private readonly projected = new THREE.Box2();
  private readonly dirty = new THREE.Box2();
  private readonly point = new THREE.Vector2();
  private readonly clippingAncestors: THREE.ClippingGroup[] = [];
  private epoch = 0;
  private resourceGeneration = 0;
  private ownedResources = false;
  private ownedResourceRevision: number | undefined;
  private initialized = false;
  private unsupported = false;

  reset(): void {
    this.objects.clear(); this.resources = new WeakMap(); this.initialized = false;
    this.resourceGeneration = 0; this.ownedResources = false; this.ownedResourceRevision = undefined;
  }

  /** A finite ownedResourceRevision opts into the owner's guarantee that every
   * geometry/material/texture mutation advances this token. Transforms, scene
   * hierarchy, visibility, clipping groups, lighting and cameras are always
   * checked. Omit it for arbitrary scenes; their resource values remain live. */
  collect(scene: THREE.Scene, camera: THREE.Camera, width: number, height: number, ownedResourceRevision?: number): NativeOverlayDamage | null {
    this.epoch++;
    const owned = ownedResourceRevision !== undefined && Number.isFinite(ownedResourceRevision);
    if (!owned || !this.ownedResources || !Object.is(this.ownedResourceRevision, ownedResourceRevision)) this.resourceGeneration++;
    this.ownedResources = owned;
    this.ownedResourceRevision = owned ? ownedResourceRevision : undefined;
    this.unsupported = false;
    this.dirty.makeEmpty();
    scene.updateMatrixWorld(true);
    // A detached camera is not included in the scene's matrix update.
    if (camera.parent === null) camera.updateMatrixWorld(true);
    this.projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.global.begin();
    this.global.add(scene); this.global.add(camera); this.global.add(width); this.global.add(height);
    this.global.matrix(camera.projectionMatrix); this.global.matrix(camera.matrixWorld); this.global.matrix(camera.matrixWorldInverse);
    this.global.add(camera.layers.mask); this.global.add(camera.coordinateSystem); this.global.add(camera.reversedDepth);
    this.value(this.global, scene.background); this.value(this.global, scene.environment);
    this.value(this.global, scene.backgroundRotation); this.value(this.global, scene.environmentRotation);
    this.global.add(scene.backgroundIntensity); this.global.add(scene.backgroundBlurriness); this.global.add(scene.environmentIntensity);
    this.global.add(scene.overrideMaterial); this.global.add(scene.fog);
    if (scene.overrideMaterial || scene.fog || scene.backgroundNode || scene.environmentNode) this.unsupported = true;

    const visit = (object: THREE.Object3D, groupOrder: number): void => {
      if (!object.visible) return;
      const tagged = object as THREE.Object3D & {isGroup?: boolean; isLight?: boolean; isClippingGroup?: boolean; isMesh?: boolean; isLine?: boolean; isPoints?: boolean; isSprite?: boolean};
      const layerVisible = object.layers.test(camera.layers);
      if (tagged.isGroup && layerVisible) groupOrder = object.renderOrder;
      let clipping = false;
      if (tagged.isClippingGroup) {
        const group = object as THREE.ClippingGroup;
        this.global.add(group); this.global.add(group.layers.mask); this.global.add(group.enabled); this.global.add(group.clipIntersection); this.global.add(group.clipShadows);
        this.planes(this.global, group.clippingPlanes);
        if (layerVisible && group.enabled) {this.clippingAncestors.push(group); clipping = true;}
      }
      if (tagged.isLight && layerVisible) this.light(object as THREE.Light);
      if ((tagged.isMesh || tagged.isLine || tagged.isPoints || tagged.isSprite) && layerVisible) {
        this.renderable(object, groupOrder, width, height);
      }
      // Three tests layers per object; an unmatched parent's layers do not hide
      // its children. Ancestor visibility, in contrast, stops traversal.
      for (const child of object.children) visit(child, groupOrder);
      if (clipping) this.clippingAncestors.pop();
    };
    visit(scene, 0);
    for (const [object, state] of this.objects) {
      if (state.epoch === this.epoch) continue;
      this.dirty.union(state.bounds); this.objects.delete(object);
    }
    const globalChanged = this.global.finish();
    const full = !this.initialized || globalChanged || this.unsupported || !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1;
    this.initialized = true;
    if (full) return {full: true, rect: {x: 0, y: 0, width, height}, objects: new Set(this.objects.keys())};
    if (this.dirty.isEmpty()) return null;

    // Four physical pixels cover raster/MSAA edges. Quantized storage sizes
    // limit patch reallocations; clamping keeps every copy inside its texture.
    const x = Math.max(0, Math.floor((this.dirty.min.x - 4) / 32) * 32);
    const y = Math.max(0, Math.floor((this.dirty.min.y - 4) / 32) * 32);
    const right = Math.min(width, Math.ceil((this.dirty.max.x + 4) / 32) * 32);
    const bottom = Math.min(height, Math.ceil((this.dirty.max.y + 4) / 32) * 32);
    if (right <= x || bottom <= y) return null;
    const objects = new Set<THREE.Object3D>();
    this.projected.min.set(x - 4, y - 4); this.projected.max.set(right + 4, bottom + 4);
    for (const [object, state] of this.objects) if (state.bounds.intersectsBox(this.projected)) objects.add(object);
    return {rect: {x, y, width: right - x, height: bottom - y}, objects};
  }

  private renderable(object: THREE.Object3D, groupOrder: number, width: number, height: number): void {
    const mesh = object as THREE.Mesh;
    const flags = object as THREE.Object3D & {isSkinnedMesh?: boolean; isInstancedMesh?: boolean; isBatchedMesh?: boolean; isLineSegments?: boolean; isMesh?: boolean};
    if ((!flags.isMesh && !flags.isLineSegments) || flags.isSkinnedMesh || flags.isInstancedMesh || flags.isBatchedMesh
      || object.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender || object.onAfterRender !== THREE.Object3D.prototype.onAfterRender
      || !mesh.geometry || !(mesh.geometry instanceof THREE.BufferGeometry) || (mesh.geometry as THREE.InstancedBufferGeometry).isInstancedBufferGeometry
      || Object.keys(mesh.geometry.morphAttributes).length) {this.unsupported = true; return;}
    let state = this.objects.get(object);
    const fresh = !state;
    if (!state) {state = {signature: new Signature(), bounds: new THREE.Box2(), epoch: this.epoch}; this.objects.set(object, state);}
    state.epoch = this.epoch;
    state.signature.begin(); state.signature.matrix(object.matrixWorld);
    state.signature.add(this.clippingAncestors.length);
    for (const ancestor of this.clippingAncestors) state.signature.add(ancestor);
    state.signature.add(object.renderOrder); state.signature.add(groupOrder); state.signature.add(object.frustumCulled);
    state.signature.add(object.castShadow); state.signature.add(object.receiveShadow); state.signature.add(mesh.geometry);
    state.signature.add(this.geometry(mesh.geometry));
    const materials = mesh.material;
    if (Array.isArray(materials)) {
      state.signature.add(materials.length);
      for (const material of materials) {state.signature.add(material); state.signature.add(this.material(material));}
    } else {state.signature.add(materials); state.signature.add(this.material(materials));}
    const changed = state.signature.finish();
    if (!fresh && !changed) return;
    this.dirty.union(state.bounds);
    if (!this.bounds(mesh.geometry, object.matrixWorld, width, height, state.bounds)) this.unsupported = true;
    this.dirty.union(state.bounds);
  }

  private resource(object: object): ResourceState {
    let state = this.resources.get(object);
    if (!state) {state = {signature: new Signature(), epoch: -1, generation: -1, revision: 0, supported: true}; this.resources.set(object, state);}
    return state;
  }

  private geometry(geometry: THREE.BufferGeometry): number {
    const state = this.resource(geometry);
    if (state.epoch === this.epoch || (this.ownedResources && state.generation === this.resourceGeneration)) {
      state.epoch = this.epoch;
      if (!state.supported || state.unsafeBounds) this.unsupported = true;
      return state.revision;
    }
    state.epoch = this.epoch;
    state.generation = this.resourceGeneration;
    const existing = state.revision > 0;
    const signature = state.signature; signature.begin();
    const positionSignature = state.positionSignature ??= new Signature(); positionSignature.begin();
    const sphereSignature = state.sphereSignature ??= new Signature(); sphereSignature.begin();
    const sphere = geometry.boundingSphere;
    sphereSignature.add(sphere);
    if (sphere) {sphereSignature.add(sphere.center.x); sphereSignature.add(sphere.center.y); sphereSignature.add(sphere.center.z); sphereSignature.add(sphere.radius);}
    const sphereChanged = sphereSignature.finish();
    signature.add(geometry.drawRange.start); signature.add(geometry.drawRange.count);
    const attribute = (value: THREE.BufferAttribute | THREE.InterleavedBufferAttribute | null, journal = signature): void => {
      journal.add(value);
      if (!value) return;
      journal.add(value.count); journal.add(value.itemSize); journal.add(value.normalized);
      if ('data' in value) {journal.add(value.data); journal.add(value.data.version); journal.add(value.offset); journal.add(value.data.stride);}
      else {journal.add(value.version); journal.add(value.array);}
    };
    attribute(geometry.index);
    attribute(geometry.attributes.position ?? null, positionSignature);
    const positionChanged = positionSignature.finish();
    if (existing && positionChanged) state.unsafeBounds = sphere !== null;
    else if (sphere === null || sphereChanged) state.unsafeBounds = false;
    for (const key of Object.keys(geometry.attributes)) {signature.add(key); attribute(geometry.attributes[key]!);}
    for (const group of geometry.groups) {signature.add(group.start); signature.add(group.count); signature.add(group.materialIndex);}
    if (signature.finish()) {
      if (existing) this.unsupported = true;
      state.revision++;
      if (!geometry.attributes.position) state.supported = false;
      else {geometry.computeBoundingBox(); state.supported = !!geometry.boundingBox && !geometry.boundingBox.isEmpty();}
    }
    // Bounding spheres participate in both culling and transparent sorting.
    // Never rewrite the owner's sphere. A versioned position change with an
    // existing sphere stays full-only until that sphere is cleared/recomputed.
    if (existing && sphereChanged) this.unsupported = true;
    if (!state.supported || state.unsafeBounds) this.unsupported = true;
    return state.revision;
  }

  private material(material: THREE.Material): number {
    const state = this.resource(material);
    if (state.epoch === this.epoch || (this.ownedResources && state.generation === this.resourceGeneration)) {
      state.epoch = this.epoch;
      if (!state.supported) this.unsupported = true;
      return state.revision;
    }
    state.epoch = this.epoch;
    state.generation = this.resourceGeneration;
    const materialType: Function = material.constructor;
    const known = materialType === THREE.MeshBasicMaterial || materialType === THREE.MeshStandardMaterial || materialType === THREE.LineBasicMaterial;
    const fields = material as unknown as Record<string, unknown>;
    state.supported = known && !fields.isNodeMaterial && !fields.displacementMap
      && material.onBeforeCompile === THREE.Material.prototype.onBeforeCompile
      && material.onBeforeRender === THREE.Material.prototype.onBeforeRender
      && (!(material instanceof THREE.LineBasicMaterial) || material.linewidth <= 1);
    const signature = state.signature; signature.begin();
    // Material fields include all scalar switches, colors, map slots, versions
    // and clipping planes. Unknown object-valued state disables partial capture.
    for (const key of Object.keys(material)) {
      if (key === 'userData' || key === '_listeners') continue;
      signature.add(key);
      if (!this.value(signature, fields[key])) state.supported = false;
    }
    if (signature.finish()) state.revision++;
    if (!state.supported) this.unsupported = true;
    return state.revision;
  }

  private value(signature: Signature, value: unknown, depth = 0): boolean {
    if (value == null || typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {signature.add(value); return true;}
    if (typeof value === 'function') {signature.add(value); return true;}
    if (value instanceof THREE.Texture) {signature.add(value); signature.add(this.texture(value)); return this.resource(value).supported;}
    if (value instanceof THREE.Color) {signature.add(value.r); signature.add(value.g); signature.add(value.b); return true;}
    if (value instanceof THREE.Vector2) {signature.add(value.x); signature.add(value.y); return true;}
    if (value instanceof THREE.Vector3) {signature.add(value.x); signature.add(value.y); signature.add(value.z); return true;}
    if (value instanceof THREE.Vector4 || value instanceof THREE.Quaternion) {signature.add(value.x); signature.add(value.y); signature.add(value.z); signature.add(value.w); return true;}
    if (value instanceof THREE.Euler) {signature.add(value.x); signature.add(value.y); signature.add(value.z); signature.add(value.order); return true;}
    if (value instanceof THREE.Matrix3 || value instanceof THREE.Matrix4) {signature.matrix(value); return true;}
    if (value instanceof THREE.Plane) {signature.add(value.normal.x); signature.add(value.normal.y); signature.add(value.normal.z); signature.add(value.constant); return true;}
    if (Array.isArray(value)) {
      signature.add(value.length);
      if (depth > 2) return false;
      for (const entry of value) if (!this.value(signature, entry, depth + 1)) return false;
      return true;
    }
    if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype && depth < 2) {
      for (const key of Object.keys(value)) {signature.add(key); if (!this.value(signature, (value as Record<string, unknown>)[key], depth + 1)) return false;}
      return true;
    }
    signature.add(value as object); return false;
  }

  private texture(texture: THREE.Texture): number {
    const state = this.resource(texture);
    if (state.epoch === this.epoch || (this.ownedResources && state.generation === this.resourceGeneration)) {
      state.epoch = this.epoch;
      if (!state.supported) this.unsupported = true;
      return state.revision;
    }
    state.epoch = this.epoch;
    state.generation = this.resourceGeneration;
    const dynamic = texture as THREE.Texture & {isVideoTexture?: boolean};
    state.supported = !dynamic.isVideoTexture && !texture.isRenderTargetTexture;
    if (!state.supported) this.unsupported = true;
    const s = state.signature; s.begin(); s.add(texture.version); s.add(texture.source); s.add(texture.source.version); s.add(texture.source.data as Value);
    s.add(texture.channel); s.add(texture.mapping); s.add(texture.wrapS); s.add(texture.wrapT); s.add(texture.magFilter); s.add(texture.minFilter);
    s.add(texture.anisotropy); s.add(texture.format); s.add(texture.type); s.add(texture.colorSpace); s.add(texture.flipY); s.add(texture.premultiplyAlpha);
    s.add(texture.generateMipmaps); s.add(texture.matrixAutoUpdate); s.matrix(texture.matrix);
    s.add(texture.offset.x); s.add(texture.offset.y); s.add(texture.repeat.x); s.add(texture.repeat.y);
    s.add(texture.center.x); s.add(texture.center.y); s.add(texture.rotation);
    if (s.finish()) state.revision++;
    return state.revision;
  }

  private planes(signature: Signature, planes: readonly THREE.Plane[]): void {
    signature.add(planes.length); for (const plane of planes) this.value(signature, plane);
  }

  private light(light: THREE.Light): void {
    if (light.constructor !== THREE.AmbientLight && light.constructor !== THREE.DirectionalLight
      && light.constructor !== THREE.HemisphereLight && light.constructor !== THREE.PointLight) this.unsupported = true;
    this.global.add(light); this.global.matrix(light.matrixWorld); this.global.add(light.layers.mask);
    this.value(this.global, light.color); this.global.add(light.intensity); this.global.add(light.castShadow);
    const fields = light as unknown as {target?: THREE.Object3D; distance?: number; decay?: number; angle?: number; penumbra?: number; groundColor?: THREE.Color; width?: number; height?: number};
    if (fields.target) {this.global.add(fields.target); this.global.matrix(fields.target.matrixWorld);}
    this.global.add(fields.distance); this.global.add(fields.decay); this.global.add(fields.angle); this.global.add(fields.penumbra);
    this.global.add(fields.width); this.global.add(fields.height); this.value(this.global, fields.groundColor);
    if (light.castShadow) this.unsupported = true;
  }

  private bounds(geometry: THREE.BufferGeometry, world: THREE.Matrix4, width: number, height: number, target: THREE.Box2): boolean {
    const box = geometry.boundingBox;
    target.makeEmpty();
    if (!box || box.isEmpty()) return false;
    this.cropProjection.multiplyMatrices(this.projection, world);
    for (let corner = 0; corner < 8; corner++) {
      this.clip.set(corner & 1 ? box.max.x : box.min.x, corner & 2 ? box.max.y : box.min.y, corner & 4 ? box.max.z : box.min.z, 1).applyMatrix4(this.cropProjection);
      if (!(this.clip.w > 0) || !Number.isFinite(this.clip.x + this.clip.y + this.clip.z + this.clip.w)) return false;
      this.point.set((this.clip.x / this.clip.w + 1) * width / 2, (1 - this.clip.y / this.clip.w) * height / 2);
      target.expandByPoint(this.point);
    }
    return true;
  }
  private readonly cropProjection = new THREE.Matrix4();
}
