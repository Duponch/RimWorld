import { DataTexture, LinearFilter, RGBAFormat, UnsignedByteType, Vector2, Vector4, type MeshStandardNodeMaterial } from 'three/webgpu';
import { Fn, If, diffuseColor, float, mix, normalWorldGeometry, output, positionWorld, smoothstep, texture, uniform, vec3, vec4 } from 'three/tsl';
import type { World } from '../sim/types';
import { WORLD_SCALE } from '../world/scale';
import { EnvironmentLightField } from './EnvironmentLightField';

/** One shared spatial texture, no lights/shadows/draw calls per emitter.
 * Materials sample the final GPU pose, including animated pawns and cargo.
 * These artistic coefficients never feed back into simulation light levels. */
export class EnvironmentLighting {
  readonly field = new EnvironmentLightField();
  readonly map = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, RGBAFormat, UnsignedByteType);
  private readonly size = uniform(new Vector2(1, 1));
  private readonly bounds = uniform(new Vector4(1, 1, 0, 0));
  private readonly sample = texture(this.map);
  private readonly configured = new WeakSet<MeshStandardNodeMaterial>();
  private readonly shade = Fn(() => {
    const p = positionWorld.toVar(), n = normalWorldGeometry.toVar(), result = output.toVar();
    // Most forest fragments have no local source/roof, or lie above its height.
    // Keep this a uniform-driven branch: no new material/pipeline on ignition.
    If(p.x.greaterThanEqual(this.bounds.x).and(p.z.greaterThanEqual(this.bounds.y))
      .and(p.x.lessThanEqual(this.bounds.z)).and(p.z.lessThanEqual(this.bounds.w))
      .and(p.y.lessThan(WORLD_SCALE.wallHeight + .02)), () => {
      const centre = p.xz.add(.5).floor().add(.5).div(this.size);
      const opaque = this.sample.sample(centre).level(float(0)).b;
      // Wall/door sides read the exposed adjacent cell, not the opaque centre.
      const q = p.xz.add(n.xz.mul(mix(.025, .55, opaque))).toVar();
      const cellUV = q.add(.5).floor().add(.5).div(this.size);
      const roof = this.sample.sample(cellUV).level(float(0)).g;
      const glow = this.sample.sample(q.add(.5).div(this.size)).level(float(0)).r;
      const within = q.x.greaterThanEqual(-.5).and(q.y.greaterThanEqual(-.5))
        .and(q.x.lessThan(this.size.x.sub(.5))).and(q.y.lessThan(this.size.y.sub(.5)));
      // Roof tops and canopies above house height retain the outdoor lighting.
      const below = float(1).sub(smoothstep(WORLD_SCALE.wallHeight - .1, WORLD_SCALE.wallHeight + .02, p.y)).mul(within.select(1, 0));
      const covered = roof.mul(below), warm = glow.mul(below);
      const facets = n.y.abs().mul(.3).add(.7);
      const fill = vec3(.11, .13, .18).mul(covered).add(vec3(1.35, .76, .32).mul(warm)).mul(facets);
      result.assign(vec4(output.rgb.mul(mix(1, .12, covered)).add(diffuseColor.rgb.mul(fill)), output.a));
    });
    return result;
  })();

  constructor() {
    this.map.minFilter = this.map.magFilter = LinearFilter;
    this.map.generateMipmaps = false; this.map.needsUpdate = true;
  }
  readonly configure = (material: MeshStandardNodeMaterial): void => {
    if (this.configured.has(material)) return;
    if (material.outputNode) throw new Error('Environment lighting requires an unclaimed material output.');
    material.outputNode = this.shade; this.configured.add(material);
  };
  update(world: World): void {
    if (!this.field.update(world)) return;
    const { data, width, height } = this.field;
    // Texture identity and node graph stay stable across checkpoint dimensions.
    if (this.map.image.width !== width || this.map.image.height !== height) this.map.dispose();
    this.map.image = { data, width, height }; this.size.value.set(width, height);
    const b = this.field.bounds; this.bounds.value.set(b.minX, b.minZ, b.maxX, b.maxZ);
    this.map.needsUpdate = true;
  }
  dispose(): void { this.map.dispose(); }
}
