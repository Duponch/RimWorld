import * as THREE from 'three/webgpu';
import {
  Fn, atan, cameraPosition, cross, float, hash, instanceIndex, mix, positionLocal,
  sin, smoothstep, uint, uniform, uv, varyingProperty, vec2, vec3,
} from 'three/tsl';

const CELL_SIZE = 2;
const FIELD_HEIGHT = 24;

function wrap(value: number, period: number): number {
  return ((value % period) + period) % period;
}

/** Core rain includes snow for fire extinction; the picture replaces it. */
export function precipitationShares(rainRate: number, snowRate: number): { rain: number; snow: number } {
  const snow = THREE.MathUtils.clamp(snowRate / .8, 0, 1);
  return { rain: THREE.MathUtils.clamp(rainRate - snow, 0, 1), snow };
}

export interface PrecipitationPresentation {
  seed: number;
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

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

/** One stable slot in each 2 × 2 block. A coprime stride spreads every
 * intensity prefix across the whole map instead of filling its first rows. */
export function precipitationMapLayout(width: number, height: number): { columns: number; capacity: number; stride: number } {
  const columns = Math.ceil(width / CELL_SIZE);
  const capacity = columns * Math.ceil(height / CELL_SIZE);
  let stride = Math.max(1, Math.round(capacity * .61803398875));
  while (gcd(stride, capacity) !== 1) stride++;
  return { columns, capacity, stride };
}

function precipitationGeometry(): THREE.InstancedBufferGeometry {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -.5, -.5, 0, .5, -.5, 0, -.5, .5, 0, .5, .5, 0,
  ], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
  geometry.setIndex([0, 1, 2, 2, 1, 3]);
  geometry.instanceCount = 0;
  return geometry;
}

/** One textureless draw. The GPU places particles inside the fixed map volume
 * and animates/recycles them independently of pan, orbit and zoom. */
export class WeatherPrecipitationLayer {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.MeshBasicNodeMaterial>;
  private readonly geometry = precipitationGeometry();
  private readonly material = new THREE.MeshBasicNodeMaterial({
    color: 0xffffff, transparent: true, depthWrite: false,
    side: THREE.DoubleSide, forceSinglePass: true, toneMapped: false,
  });
  private readonly dimensions = uniform(new THREE.Vector2(32, 32));
  private readonly inverseDimensions = uniform(new THREE.Vector2(1 / 32, 1 / 32));
  private readonly columns = uniform(16);
  private readonly capacity = uniform(256);
  private readonly stride = uniform(159);
  private readonly seed = uniform(0);
  private readonly rainPhase = uniform(0);
  private readonly snowPhase = uniform(0);
  private readonly snowFraction = uniform(0);
  private readonly wind = uniform(new THREE.Vector2());
  private readonly daylight = uniform(1);
  private readonly perspective = uniform(0);
  private mapCapacity = 256;

  constructor() {
    const kind = varyingProperty('float', 'weatherParticleKind');
    const ink = varyingProperty('float', 'weatherParticleInk');
    const visible = varyingProperty('float', 'weatherParticleVisible');
    const worldXZ = varyingProperty('vec2', 'weatherParticleWorldXZ');
    this.material.positionNode = Fn(() => {
      const slot = uint(instanceIndex).mul(uint(this.stride)).mod(uint(this.capacity));
      const cellX = float(slot.mod(uint(this.columns)));
      const cellZ = float(slot.div(uint(this.columns)));
      const key = uint(cellX).mul(uint(73856093))
        .bitXor(uint(cellZ).mul(uint(19349663)))
        .bitXor(uint(this.seed).mul(uint(83492791)));
      const rootX = cellX.mul(CELL_SIZE).add(hash(key.add(uint(11)))
        .mul(this.dimensions.x.sub(cellX.mul(CELL_SIZE)).min(CELL_SIZE)));
      const rootZ = cellZ.mul(CELL_SIZE).add(hash(key.add(uint(23)))
        .mul(this.dimensions.y.sub(cellZ.mul(CELL_SIZE)).min(CELL_SIZE)));
      const snow = hash(key.add(uint(37))).lessThan(this.snowFraction);
      kind.assign(snow.select(1, 0));
      ink.assign(hash(key.add(uint(53))));
      // Eighth-step speeds make a 192-unit phase wrap seamless for every cell.
      const speed = hash(key.add(uint(89))).mul(4).floor().mul(.125).add(.875);
      const phase = snow.select(this.snowPhase, this.rainPhase);
      // fract(x) = x - floor(x), so one normalized wrap also handles negative
      // phase and wind offsets on both WebGPU and WebGL without a second mod.
      const height = hash(key.add(uint(97)))
        .sub(phase.mul(speed).mul(1 / FIELD_HEIGHT)).fract().mul(FIELD_HEIGHT);
      const y = height.add(1.7);
      const drift = this.wind.mul(float(FIELD_HEIGHT).sub(height)).mul(snow.select(.27, .13));
      const wrappedX = rootX.add(drift.x).mul(this.inverseDimensions.x)
        .fract().mul(this.dimensions.x);
      const wrappedZ = rootZ.add(drift.y).mul(this.inverseDimensions.y)
        .fract().mul(this.dimensions.y);
      const center = vec3(wrappedX.sub(.5), y, wrappedZ.sub(.5));
      const edge = wrappedX.min(this.dimensions.x.sub(wrappedX))
        .min(wrappedZ).min(this.dimensions.y.sub(wrappedZ));
      visible.assign(smoothstep(0, .8, height)
        .mul(float(1).sub(smoothstep(FIELD_HEIGHT - .8, FIELD_HEIGHT, height)))
        .mul(smoothstep(0, .6, edge)));
      const toward = cameraPosition.sub(center);
      const horizontalDistance = toward.xz.length();
      const distance = horizontalDistance.max(.001);
      const right = horizontalDistance.greaterThan(.001).select(
        vec3(toward.z.negate().div(distance), 0, toward.x.div(distance)), vec3(1, 0, 0));
      const facing = toward.length().greaterThan(.001).select(
        toward.div(toward.length().max(.001)), vec3(0, 1, 0));
      const snowUp = cross(right, facing).normalize();
      const up = snow.select(snowUp, vec3(0, 1, 0));
      const nearScale = mix(float(1), smoothstep(2, 8, distance).max(.001), this.perspective);
      const projectionScale = snow.select(mix(float(1), float(.58), this.perspective), float(1));
      const width = snow.select(float(.30).add(ink.mul(.12)),
        float(.11).add(ink.mul(.045))).mul(nearScale).mul(projectionScale);
      const length = snow.select(float(.30).add(ink.mul(.12)),
        float(.68).add(ink.mul(.32))).mul(nearScale).mul(projectionScale);
      const lean = snow.select(float(0), positionLocal.y.mul(.12));
      const point = center.add(right.mul(positionLocal.x.mul(width)))
        .add(up.mul(positionLocal.y.mul(length)))
        .add(vec3(this.wind.x.mul(lean), 0, this.wind.y.mul(lean)));
      worldXZ.assign(point.xz);
      return point;
    })();
    const pigmentPixel = uv().sub(vec2(.5));
    const paperGrain = sin(pigmentPixel.x.mul(93).add(ink.mul(29)))
      .mul(sin(pigmentPixel.y.mul(117).sub(ink.mul(17))));
    this.material.colorNode = mix(vec3(.64, .75, .84), vec3(.965, .947, .907), kind)
      .mul(float(.80).add(this.daylight.mul(.20)))
      .mul(paperGrain.mul(.11).add(.89));
    this.material.opacityNode = Fn(() => {
      const pixel = uv().sub(vec2(.5));
      // Uneven, tapered ink stroke rather than a rectangular rain quad.
      const wobble = sin(pixel.y.mul(17).add(ink.mul(11))).mul(.055);
      const strokeDistance = pixel.x.sub(wobble).abs();
      const strokeWidth = float(.16).add(sin(pixel.y.mul(13).add(ink.mul(7))).mul(.035))
        .add(sin(pixel.y.mul(59).sub(ink.mul(31))).mul(.025));
      const rain = float(1).sub(smoothstep(strokeWidth, strokeWidth.add(.10), strokeDistance))
        .mul(smoothstep(-.49, -.34, pixel.y))
        .mul(float(1).sub(smoothstep(.32, .50, pixel.y))).mul(.78);
      // Ragged paper/pastel disc with a translucent edge and pale centre.
      const angle = atan(pixel.y, pixel.x);
      const radius = pixel.length();
      const edge = float(.43).add(sin(angle.mul(7).add(ink.mul(13))).mul(.027))
        .add(sin(angle.mul(11).sub(ink.mul(9))).mul(.016));
      const snow = float(1).sub(smoothstep(edge.sub(.07), edge.add(.025), radius))
        .mul(float(.70).add(float(1).sub(smoothstep(.16, .38, radius)).mul(.23)));
      const chalk = paperGrain.mul(.16).add(.84);
      const inside = worldXZ.x.greaterThanEqual(-.5).and(worldXZ.x.lessThan(this.dimensions.x.sub(.5)))
        .and(worldXZ.y.greaterThanEqual(-.5)).and(worldXZ.y.lessThan(this.dimensions.y.sub(.5)));
      return mix(rain, snow, kind).mul(chalk).mul(visible).mul(inside.select(1, 0))
        .mul(float(.52).add(this.daylight.mul(.32)));
    })();
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = 'weather-precipitation';
    this.mesh.castShadow = this.mesh.receiveShadow = false;
    // Shader-driven vertices lie outside the static quad's CPU bounds.
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
    this.mesh.visible = false;
    this.configureMap(32, 32);
  }

  configureMap(width: number, height: number): void {
    const layout = precipitationMapLayout(width, height);
    this.dimensions.value.set(width, height);
    this.inverseDimensions.value.set(1 / width, 1 / height);
    this.columns.value = layout.columns;
    this.capacity.value = layout.capacity;
    this.stride.value = layout.stride;
    this.mapCapacity = layout.capacity;
    this.reset();
  }

  reset(): void {
    this.geometry.instanceCount = 0;
    this.mesh.visible = false;
  }

  present({ seed, tick, rainRate, snowRate, camera, strength, directionX, directionZ, daylight }: PrecipitationPresentation): void {
    const shares = precipitationShares(rainRate, snowRate);
    const amount = Math.min(1, shares.rain + shares.snow);
    if (amount <= 0) { this.geometry.instanceCount = 0; this.mesh.visible = false; return; }
    this.seed.value = seed;
    this.rainPhase.value = wrap(tick * .75, 192);
    this.snowPhase.value = wrap(tick * .12, 192);
    this.snowFraction.value = shares.snow / amount;
    this.wind.value.set(directionX, directionZ).multiplyScalar(THREE.MathUtils.clamp(strength, 0, 2));
    this.daylight.value = THREE.MathUtils.clamp(daylight, 0, 1);
    this.perspective.value = camera instanceof THREE.PerspectiveCamera ? 1 : 0;
    this.geometry.instanceCount = Math.max(1, Math.round(this.mapCapacity * amount * .82));
    this.mesh.visible = true;
  }

  prepareForCompile(): () => void {
    const visible = this.mesh.visible, count = this.geometry.instanceCount;
    this.mesh.visible = true;
    this.geometry.instanceCount = 1;
    return () => { this.mesh.visible = visible; this.geometry.instanceCount = count; };
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}
