import * as THREE from 'three/webgpu';

const PARTICLE_COUNT = 256;
const FIELD_WIDTH = 30;
const FIELD_HEIGHT = 8;
const scratch = new THREE.Object3D();

function hash01(value: number): number {
  let x = value | 0;
  x = Math.imul(x ^ x >>> 16, 0x7feb352d);
  x = Math.imul(x ^ x >>> 15, 0x846ca68b);
  return ((x ^ x >>> 16) >>> 0) / 4294967296;
}

function wrap(value: number, period: number): number {
  return ((value % period) + period) % period;
}

/** Core's rain rate includes snowfall for fire extinction. For presentation,
 * snow replaces the corresponding rain strokes as the weather blends. */
export function precipitationShares(rainRate: number, snowRate: number): { rain: number; snow: number } {
  const snow = THREE.MathUtils.clamp(snowRate / .8, 0, 1);
  return { rain: THREE.MathUtils.clamp(rainRate - snow, 0, 1), snow };
}

export interface PrecipitationPresentation {
  seed: number;
  /** Same confirmed (possibly fractional) tick as pawn and sky presentation. */
  tick: number;
  rainRate: number;
  snowRate: number;
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera;
  target: THREE.Vector3;
  strength: number;
  directionX: number;
  directionZ: number;
  daylight: number;
}

/** One camera-local field, one resident quad geometry/material/instance buffer.
 * Its deterministic visual hashes never touch World or a simulation RNG. */
export class WeatherPrecipitationLayer {
  readonly mesh: THREE.InstancedMesh<THREE.PlaneGeometry, THREE.MeshBasicNodeMaterial>;
  private readonly geometry = new THREE.PlaneGeometry(1, 1);
  private readonly material = new THREE.MeshBasicNodeMaterial({
    color: 0xffffff, transparent: true, opacity: .7, depthWrite: false,
    side: THREE.DoubleSide, forceSinglePass: true,
  });
  private lastPose = '';
  private lastRainCount = -1;
  private lastColorCount = -1;

  constructor() {
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, PARTICLE_COUNT);
    this.mesh.name = 'weather-precipitation';
    this.mesh.castShadow = this.mesh.receiveShadow = false;
    this.mesh.frustumCulled = true;
    this.mesh.renderOrder = 4;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let index = 0; index < PARTICLE_COUNT; index++) {
      scratch.scale.setScalar(.001);
      scratch.updateMatrix();
      this.mesh.setMatrixAt(index, scratch.matrix);
      this.mesh.setColorAt(index, new THREE.Color(index % 3 === 0 ? 0xc7d6e2 : 0xe6edf3));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.mesh.count = 0;
    this.mesh.visible = false;
  }

  reset(): void {
    this.lastPose = '';
    this.lastRainCount = -1;
    this.lastColorCount = -1;
    this.mesh.count = 0;
    this.mesh.visible = false;
  }

  present({ seed, tick, rainRate, snowRate, camera, target, strength, directionX, directionZ, daylight }: PrecipitationPresentation): void {
    const shares = precipitationShares(rainRate, snowRate);
    const rainCount = Math.round(PARTICLE_COUNT * .82 * shares.rain);
    const snowCount = Math.round(PARTICLE_COUNT * .82 * shares.snow);
    const count = Math.min(PARTICLE_COUNT, rainCount + snowCount);
    if (count === 0) { this.mesh.count = 0; this.mesh.visible = false; this.lastPose = ''; return; }
    this.mesh.visible = true;
    this.mesh.count = count;
    this.material.opacity = (.50 + .22 * THREE.MathUtils.clamp(daylight, 0, 1));

    // The field follows the viewed area, without painting the whole 250² map.
    // A low camera sees some particles between its position and the target.
    const centerX = (camera.position.x + target.x) * .5;
    const centerZ = (camera.position.z + target.z) * .5;
    const yaw = Math.atan2(camera.position.x - target.x, camera.position.z - target.z);
    const phase = Math.round(tick * 4) / 4;
    const pose = `${seed}:${phase}:${rainCount}:${snowCount}:${centerX.toFixed(2)}:${centerZ.toFixed(2)}:${yaw.toFixed(3)}:${strength.toFixed(2)}:${directionX.toFixed(3)}:${directionZ.toFixed(3)}`;
    if (pose === this.lastPose) return;
    this.lastPose = pose;
    const wind = THREE.MathUtils.clamp(strength, 0, 2) * .18;
    const colorsChanged = rainCount !== this.lastRainCount || count !== this.lastColorCount;
    for (let index = 0; index < count; index++) {
      const snow = index >= rainCount;
      const ordinal = snow ? index - rainCount : index;
      const a = hash01(seed ^ Math.imul(ordinal + 1, snow ? 0x6d2b79f5 : 0x9e3779b1));
      const b = hash01(seed ^ Math.imul(ordinal + 1, snow ? 0x45d9f3b : 0x27d4eb2d));
      const c = hash01(seed ^ Math.imul(ordinal + 1, snow ? 0x17a49d83 : 0x53b9a0d7));
      const fall = snow ? .12 : .75;
      const y = .25 + wrap(c * FIELD_HEIGHT - phase * fall, FIELD_HEIGHT);
      const x = centerX + (a - .5) * FIELD_WIDTH + directionX * wind * (FIELD_HEIGHT - y);
      const z = centerZ + (b - .5) * FIELD_WIDTH + directionZ * wind * (FIELD_HEIGHT - y);
      // A world-sized streak very close to a low perspective camera would
      // fill hundreds of pixels. Thin it before it reaches the near plane.
      const horizontalDistance = Math.hypot(x - camera.position.x, z - camera.position.z);
      const nearScale = camera instanceof THREE.PerspectiveCamera
        ? THREE.MathUtils.clamp((horizontalDistance - 2) / 6, .001, 1) : 1;
      scratch.position.set(x, y, z);
      scratch.rotation.set(0, yaw, snow ? c * Math.PI : -directionX * wind * .28);
      scratch.scale.set((snow ? .11 + c * .065 : .019 + c * .012) * nearScale,
        (snow ? .11 + c * .065 : .34 + c * .20) * nearScale, 1);
      scratch.updateMatrix();
      this.mesh.setMatrixAt(index, scratch.matrix);
      // Stable tint within a single material; no per-particle material/pipeline.
      if (colorsChanged)
        this.mesh.setColorAt(index, new THREE.Color(snow ? 0xf3f5f7 : 0xb8cddd));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (colorsChanged && this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.lastRainCount = rainCount;
    this.lastColorCount = count;
    this.mesh.boundingSphere ??= new THREE.Sphere();
    this.mesh.boundingSphere.center.set(centerX, FIELD_HEIGHT * .5, centerZ);
    this.mesh.boundingSphere.radius = Math.hypot(FIELD_WIDTH * .5 + wind * FIELD_HEIGHT, FIELD_WIDTH * .5 + wind * FIELD_HEIGHT, FIELD_HEIGHT);
  }

  prepareForCompile(): () => void {
    const visible = this.mesh.visible, count = this.mesh.count;
    this.mesh.visible = true;
    this.mesh.count = 1;
    return () => { this.mesh.visible = visible; this.mesh.count = count; };
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}
