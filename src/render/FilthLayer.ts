import * as THREE from 'three/webgpu';
import { Fn, attribute, cos, sin, positionLocal, texture, uv, vec2, vec3 } from 'three/tsl';
import type { FilthRecord } from '../sim/filth-rules';
import { createFilthAtlas, filthDecal, FILTH_ATLAS } from './filth-appearance';
import { material } from './primitives';

/** Flat alpha decals: one resident draw for all six species and all thicknesses.
 * No per-frame work, per-stain material, billboard or simulation randomness. */
export class FilthLayer {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.MeshStandardNodeMaterial>;
  private readonly atlas: THREE.DataTexture;
  private capacity = 16;
  private revision = 0;
  private previous: Pick<FilthRecord, 'id' | 'x' | 'z' | 'kind' | 'thickness'>[] = [];
  constructor(configure?: (m: THREE.MeshStandardNodeMaterial) => void) {
    const pixels = createFilthAtlas();
    this.atlas = new THREE.DataTexture(pixels.data, pixels.width, pixels.height, THREE.RGBAFormat);
    this.atlas.colorSpace = THREE.SRGBColorSpace;
    this.atlas.magFilter = THREE.LinearFilter; this.atlas.minFilter = THREE.LinearMipmapLinearFilter;
    this.atlas.generateMipmaps = true; this.atlas.needsUpdate = true;
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([-.5, 0, -.5, .5, 0, -.5, .5, 0, .5, -.5, 0, .5], 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    geometry.setIndex([0, 2, 1, 0, 3, 2]); geometry.instanceCount = 0;
    const mat = material(0xffffff, { transparent: true, depthWrite: false });
    mat.positionNode = Fn(() => {
      const pose = attribute('filthPose', 'vec4'), shape = attribute('filthShape', 'vec4');
      const x = positionLocal.x.mul(shape.x), z = positionLocal.z.mul(shape.y), c = cos(pose.w), s = sin(pose.w);
      return vec3(x.mul(c).sub(z.mul(s)), 0, x.mul(s).add(z.mul(c))).add(pose.xyz);
    })();
    const shape = attribute('filthShape', 'vec4'), tile = shape.z;
    const localUV = vec2(shape.w.greaterThan(0).select(uv().x.oneMinus(), uv().x), uv().y);
    const atlasUV = localUV.add(vec2(tile.mod(FILTH_ATLAS.columns), tile.div(FILTH_ATLAS.columns).floor())).div(vec2(FILTH_ATLAS.columns, FILTH_ATLAS.rows));
    const texel = texture(this.atlas, atlasUV);
    mat.colorNode = texel.rgb; mat.opacityNode = texel.a;
    configure?.(mat);
    this.mesh = new THREE.Mesh(geometry, mat); this.mesh.name = 'Filth — transparent ground layers';
    this.mesh.frustumCulled = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.allocate();
  }
  private allocate(): void {
    const g = this.mesh.geometry;
    g.dispose();
    g.setAttribute('filthPose', new THREE.InstancedBufferAttribute(new Float32Array(this.capacity * 4), 4));
    g.setAttribute('filthShape', new THREE.InstancedBufferAttribute(new Float32Array(this.capacity * 4), 4));
  }
  update(items: readonly FilthRecord[], reset = false): void {
    if (!reset && items.length === this.previous.length && items.every((f, i) => {
      const p = this.previous[i]!; return f.id === p.id && f.x === p.x && f.z === p.z && f.kind === p.kind && f.thickness === p.thickness;
    })) return;
    this.revision++;
    this.previous = items.map(({ id, x, z, kind, thickness }) => ({ id, x, z, kind, thickness }));
    const count = items.reduce((n, f) => n + f.thickness, 0);
    if (count > this.capacity) { while (count > this.capacity) this.capacity *= 2; this.allocate(); }
    const pose = this.mesh.geometry.getAttribute('filthPose') as THREE.InstancedBufferAttribute;
    const shape = this.mesh.geometry.getAttribute('filthShape') as THREE.InstancedBufferAttribute;
    let i = 0;
    for (const f of items) for (let layer = 0; layer < f.thickness; layer++) {
      const d = filthDecal(f, layer);
      pose.setXYZW(i, d.x, .071, d.z, d.rotation);
      shape.setXYZW(i, d.width, d.height, d.tile, d.flip ? 1 : 0); i++;
    }
    pose.needsUpdate = shape.needsUpdate = true;
    this.mesh.geometry.instanceCount = count; this.mesh.visible = count > 0;
  }
  prepareForCompile(): () => void {
    if (this.mesh.visible) return () => {};
    const revision = this.revision;
    // Zero size, underground: compile the same pipeline even on clean maps.
    const pose = this.mesh.geometry.getAttribute('filthPose') as THREE.InstancedBufferAttribute;
    const shape = this.mesh.geometry.getAttribute('filthShape') as THREE.InstancedBufferAttribute;
    pose.setXYZW(0, 0, -100, 0, 0); shape.setXYZW(0, 0, 0, 0, 0); pose.needsUpdate = shape.needsUpdate = true;
    this.mesh.visible = true; this.mesh.geometry.instanceCount = 1;
    return () => { if (this.revision === revision) { this.mesh.visible = false; this.mesh.geometry.instanceCount = 0; } };
  }
  dispose(): void { this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.atlas.dispose(); }
}
