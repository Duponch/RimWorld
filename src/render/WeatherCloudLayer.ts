import * as THREE from 'three/webgpu';
import { attribute, uniform } from 'three/tsl';
import type { WeatherState } from '../sim/weather';
import { visualCloudAppearance } from './visual-weather';

const CLOUD_COUNT = 64;
const REFERENCE_MAP_SIDE = 250;
const MIN_MAP_CLOUDS = 8;
const DRIFT_PER_TICK = .008;
const EDGE_FADE_FRACTION = .28;
// A two-centimetre world step is below one projected pixel for these high
// clouds and avoids resending all 64 matrices at every fractional RAF tick.
const MATRIX_STEP = .02;
const MAX_CONTIGUOUS_TICK_GAP = 600;
// High views look through the cloud field onto the working map. Keep the
// weather legible there without laying an opaque blanket over the colony.
const HIGH_VIEW_OPACITY = .25;
const scratch = new THREE.Object3D();

export interface CloudPresentation {
  seed: number;
  /** Confirmed presentation tick, including its fractional interpolation. */
  tick: number;
  weather?: Pick<WeatherState, 'current' | 'previous' | 'ageCore'>;
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera;
  target: THREE.Vector3;
  /** windIntensity(world), supplied by the renderer for all visual wind layers. */
  strength: number;
  directionX: number;
  directionZ: number;
  /** Optional daylight fraction from the existing sky sample (0 night, 1 day). */
  daylight?: number;
}

function hash01(value: number): number {
  let x = value | 0;
  x = Math.imul(x ^ x >>> 16, 0x7feb352d);
  x = Math.imul(x ^ x >>> 15, 0x846ca68b);
  return ((x ^ x >>> 16) >>> 0) / 4294967296;
}

function wrap(value: number, period: number): number {
  return ((value % period) + period) % period;
}

function smoothstep(a: number, b: number, value: number): number {
  const t = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/** High views soften the world-space clouds over the working map. The same
 * angle treatment in both projections avoids a visibility jump on toggle. */
export function cloudViewOpacity(camera: THREE.OrthographicCamera | THREE.PerspectiveCamera, target: THREE.Vector3): number {
  const horizontal = Math.hypot(camera.position.x - target.x, camera.position.z - target.z);
  const elevation = Math.atan2(camera.position.y - target.y, horizontal) * 180 / Math.PI;
  const lowAngle = 1 - smoothstep(16, 38, elevation);
  // Several translucent lobes can overlap. Above 38 degrees their opacity is
  // capped at the same faint level in perspective and orthographic views.
  return HIGH_VIEW_OPACITY + (1 - HIGH_VIEW_OPACITY) * lowAngle;
}

/** One resident low-poly cloud made of six faceted lobes. Every visible cloud
 * reuses this geometry through one InstancedMesh and one material. */
function cloudGeometry(): THREE.BufferGeometry {
  const source = new THREE.IcosahedronGeometry(1, 0);
  const unit = source.index ? source.toNonIndexed() : source;
  const position = unit.getAttribute('position');
  const lobes = [
    [-1.45, -.12, 0, 1.05, .60, .85],
    [-.65, .30, -.20, 1.20, .83, .85],
    [.42, .20, .10, 1.42, .78, .95],
    [1.46, -.14, .08, 1.05, .57, .80],
    [-.35, -.30, .45, 1.20, .53, .80],
    [.65, -.26, -.40, 1.15, .50, .75],
  ] as const;
  const points = new Float32Array(lobes.length * position.count * 3);
  let offset = 0;
  for (const [x, y, z, sx, sy, sz] of lobes) for (let vertex = 0; vertex < position.count; vertex++) {
    points[offset++] = x + position.getX(vertex) * sx;
    points[offset++] = y + position.getY(vertex) * sy;
    points[offset++] = z + position.getZ(vertex) * sz;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  unit.dispose();
  if (unit !== source) source.dispose();
  return geometry;
}

/** World-space decoration. It never casts or receives a shadow, samples a texture,
 * changes World, or creates meshes when weather or camera state changes. */
export class WeatherCloudLayer {
  readonly mesh: THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshBasicNodeMaterial>;
  private readonly geometry = cloudGeometry();
  private readonly footprintRadius = this.geometry.boundingSphere!.radius + this.geometry.boundingSphere!.center.length();
  private readonly material = new THREE.MeshBasicNodeMaterial({
    color: 0xffffff, transparent: true, opacity: 0, depthWrite: false,
  });
  private readonly opacityUniform = uniform(0);
  private readonly edgeOpacity = new THREE.InstancedBufferAttribute(new Float32Array(CLOUD_COUNT), 1);
  private readonly nightColor = new THREE.Color(0x263248);
  private seed: number | undefined;
  private lastTick: number | undefined;
  private lastStrength = 0;
  private lastDirectionX = 1;
  private lastDirectionZ = 0;
  private driftX = 0;
  private driftZ = 0;
  private centerX = 15.5;
  private centerZ = 15.5;
  private radiusX = 16;
  private radiusZ = 16;
  private lastPoseSeed: number | undefined;
  private lastCoverage = NaN;
  private lastPoseX = NaN;
  private lastPoseZ = NaN;

  constructor() {
    this.geometry.setAttribute('aCloudFade', this.edgeOpacity);
    this.material.opacityNode = this.opacityUniform.mul(attribute('aCloudFade'));
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, CLOUD_COUNT);
    this.mesh.name = 'weather-clouds';
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.frustumCulled = true;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let index = 0; index < CLOUD_COUNT; index++) {
      scratch.position.set(0, 0, 0);
      scratch.rotation.set(0, 0, 0);
      scratch.scale.setScalar(.001);
      scratch.updateMatrix();
      this.mesh.setMatrixAt(index, scratch.matrix);
      this.mesh.setColorAt(index, new THREE.Color().setScalar(.88 + hash01(index * 38711) * .12));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.mesh.visible = false;
    this.configureMap(32, 32);
  }

  /** The cloud centres stay inside the map's horizontal bounds. They shrink
   * and fade at its edges before wrapping to the opposite side. */
  configureMap(width: number, height: number): void {
    this.centerX = (width - 1) / 2;
    this.centerZ = (height - 1) / 2;
    this.radiusX = width / 2;
    this.radiusZ = height / 2;
    // The default 250² map uses all 64 slots. Small prepared maps keep the
    // same cloud size without stacking all 64 masses over a tiny colony.
    this.mesh.count = THREE.MathUtils.clamp(
      Math.round(CLOUD_COUNT * Math.sqrt(width * height) / REFERENCE_MAP_SIDE),
      MIN_MAP_CLOUDS, CLOUD_COUNT,
    );
    this.mesh.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(this.centerX, 24, this.centerZ),
      Math.hypot(this.radiusX + 22, this.radiusZ + 22, 24),
    );
    this.reset();
  }

  /** A new map starts its own visual cloud field, even if it reuses a seed. */
  reset(): void {
    this.seed = this.lastTick = undefined;
    this.lastStrength = 0;
    this.lastDirectionX = 1;
    this.lastDirectionZ = 0;
    this.driftX = this.driftZ = 0;
    this.lastPoseSeed = undefined;
    this.lastCoverage = this.lastPoseX = this.lastPoseZ = NaN;
    this.mesh.visible = false;
  }

  private advance(seed: number, tick: number, strength: number, directionX: number, directionZ: number): void {
    const wind = THREE.MathUtils.clamp(strength, 0, 2);
    const directionLength = Math.hypot(directionX, directionZ) || 1;
    const x = directionX / directionLength, z = directionZ / directionLength;
    if (this.seed !== seed) this.reset();
    this.seed = seed;
    if (this.lastTick !== undefined) {
      const delta = tick - this.lastTick;
      // Rewinds and large seeks rebase the confirmed clock. Keeping the visual
      // offset avoids a jump; no past wind integral is invented on reload.
      if (delta > 0 && delta <= MAX_CONTIGUOUS_TICK_GAP) {
        const averageStrength = (this.lastStrength + wind) * .5;
        const axisX = this.lastDirectionX + x, axisZ = this.lastDirectionZ + z;
        const axisLength = Math.hypot(axisX, axisZ);
        const travelX = axisLength > .0001 ? axisX / axisLength : x;
        const travelZ = axisLength > .0001 ? axisZ / axisLength : z;
        const distance = delta * DRIFT_PER_TICK * averageStrength;
        this.driftX += travelX * distance;
        this.driftZ += travelZ * distance;
      }
    }
    this.lastTick = tick;
    this.lastStrength = wind;
    this.lastDirectionX = x;
    this.lastDirectionZ = z;
  }

  present({ seed, tick, weather, camera, target, strength, directionX, directionZ, daylight = 1 }: CloudPresentation): void {
    this.advance(seed, tick, strength, directionX, directionZ);
    const angleOpacity = cloudViewOpacity(camera, target);
    const appearance = visualCloudAppearance(weather);
    const daylightFraction = THREE.MathUtils.clamp(daylight, 0, 1);
    const opacity = angleOpacity * appearance.opacity * (.64 + .36 * daylightFraction);
    if (opacity < .002) { this.mesh.visible = false; this.lastPoseSeed = undefined; return; }
    this.mesh.visible = true;
    this.material.opacity = opacity;
    this.opacityUniform.value = opacity;
    this.material.color.setHex(appearance.color).lerp(this.nightColor, (1 - daylightFraction) * .78);

    // The phase stays continuous, but a subpixel change does not trigger a
    // matrix upload. Each cloud wraps at its own faded field edge.
    const poseX = Math.round(this.driftX / MATRIX_STEP) * MATRIX_STEP;
    const poseZ = Math.round(this.driftZ / MATRIX_STEP) * MATRIX_STEP;
    const coverage = Math.round(appearance.coverage * 512) / 512;
    if (seed === this.lastPoseSeed && coverage === this.lastCoverage &&
        poseX === this.lastPoseX && poseZ === this.lastPoseZ) return;
    this.lastPoseSeed = seed;
    this.lastCoverage = coverage;
    this.lastPoseX = poseX;
    this.lastPoseZ = poseZ;

    for (let index = 0; index < this.mesh.count; index++) {
      const a = hash01(seed ^ Math.imul(index + 1, 0x9e3779b1));
      const b = hash01(seed ^ Math.imul(index + 1, 0x6d2b79f5));
      const c = hash01(seed ^ Math.imul(index + 1, 0x45d9f3b));
      const d = hash01(seed ^ Math.imul(index + 1, 0x27d4eb2d));
      const x = wrap(a * this.radiusX * 2 + poseX, this.radiusX * 2) - this.radiusX;
      const z = wrap(b * this.radiusZ * 2 + poseZ, this.radiusZ * 2) - this.radiusZ;
      const threshold = hash01(seed ^ Math.imul(index + 1, 0x7f4a7c15));
      const activation = smoothstep(threshold - .075, threshold + .075, coverage);
      // Map-space envelope: both size and alpha reach zero before recycling.
      const edge = smoothstep(0, this.radiusX * EDGE_FADE_FRACTION, this.radiusX - Math.abs(x)) *
        smoothstep(0, this.radiusZ * EDGE_FADE_FRACTION, this.radiusZ - Math.abs(z));
      const fade = activation * edge;
      // Shrinking alone is insufficient near a small map's border: constrain
      // the full rotated lobe footprint inside the map before it disappears.
      const clearance = Math.min(this.radiusX - Math.abs(x), this.radiusZ - Math.abs(z));
      const size = Math.max(.001, Math.min(fade * (3.2 + c * 2.7),
        clearance / this.footprintRadius));
      scratch.position.set(this.centerX + x, 18 + d * 11, this.centerZ + z);
      scratch.rotation.set(0, c * Math.PI * 2, 0);
      scratch.scale.set(size, size * (.75 + d * .24), size * (.70 + b * .24));
      scratch.updateMatrix();
      this.mesh.setMatrixAt(index, scratch.matrix);
      this.edgeOpacity.setX(index, fade);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.edgeOpacity.needsUpdate = true;
  }

  /** Keep the single cloud pipeline warm while the loading screen is present. */
  prepareForCompile(): () => void {
    const visible = this.mesh.visible, opacity = this.material.opacity;
    this.mesh.visible = true;
    this.material.opacity = .1;
    this.opacityUniform.value = .1;
    return () => { this.mesh.visible = visible; this.material.opacity = opacity; this.opacityUniform.value = opacity; };
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}
