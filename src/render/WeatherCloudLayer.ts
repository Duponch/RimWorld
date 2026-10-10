import * as THREE from 'three/webgpu';
import { Fn, If, attribute, materialColor, positionLocal, smoothstep as shaderSmoothstep, texture, uniform, viewportSize, viewportUV } from 'three/tsl';
import type { WeatherState } from '../sim/weather';
import { visualCloudAppearance } from './visual-weather';
import { createCloudPaint } from './cloud-surface-paint';
import { DEFAULT_CLOUD_MASK_RADIUS, cloudMaskRadius } from './cloud-mask';

const CLOUD_COUNT = 64;
const REFERENCE_MAP_SIDE = 250;
const MIN_MAP_CLOUDS = 8;
const DRIFT_PER_TICK = .008;
const EDGE_FADE_FRACTION = .28;
// A two-centimetre world step is below one projected pixel for these high
// clouds and avoids resending all 64 matrices at every fractional RAF tick.
const MATRIX_STEP = .02;
const MAX_CONTIGUOUS_TICK_GAP = 600;
// Radii are fractions of the viewport's shorter dimension, in physical pixels.
export const CLOUD_CLEAR_RADIUS = DEFAULT_CLOUD_MASK_RADIUS;
export const CLOUD_CLEAR_SOFT_EDGE = .08;
// Maximum local scale and full signed shift ranges, including optional lobes.
export const CLOUD_SHAPE = { stretch: [1.60, 1.42, 1.60], shift: [.36, .384, .66] } as const;
const CLOUD_BASE_HEIGHT = 34;
const CLOUD_BAND_SPACING = 7.5;
const CLOUD_BAND_JITTER = 5;
const MAX_CLOUD_SIZE = 1.23 * 5.9;
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

/** High views remove the world-space clouds over the working map. Close
 * orthographic inspection fades them completely before they cover actors. */
export function cloudViewOpacity(camera: THREE.OrthographicCamera | THREE.PerspectiveCamera, target: THREE.Vector3): number {
  const horizontal = Math.hypot(camera.position.x - target.x, camera.position.z - target.z);
  const elevation = Math.atan2(camera.position.y - target.y, horizontal) * 180 / Math.PI;
  const lowAngle = 1 - smoothstep(34, 65, elevation);
  // The same continuous elevation fade applies to both camera projections.
  // A close orthographic zoom adds a separate fade before clouds cover actors.
  const closeIsoFade = camera instanceof THREE.OrthographicCamera
    ? 1 - smoothstep(2.5, 4.5, camera.zoom)
    : 1;
  return lowAngle * closeIsoFade;
}

/** Reference for the viewport-space shader mask, used by the focused tests. */
export function cloudScreenMask(x: number, y: number, width: number, height: number, clearRadius = CLOUD_CLEAR_RADIUS): number {
  const cutoff = cloudMaskRadius(clearRadius);
  if (cutoff === 0) return 1;
  const shorter = Math.max(1, Math.min(width, height));
  const radius = Math.hypot(x - width * .5, y - height * .5) / shorter;
  return smoothstep(cutoff, cutoff + CLOUD_CLEAR_SOFT_EDGE, radius);
}

/** Four available paper-cut masses. Their imperfect rims and translucent paint
 * washes are baked into one geometry with vertex colours, not extra meshes. */
function cloudGeometry(): THREE.BufferGeometry {
  // The dome and left shoulder always join; the right and forward masses are
  // optional parts of the seeded assembly, all in the same resident geometry.
  const lobes = [
    [0, .19, -.21, 1.37, 1.20, 1.02],
    [-1.39, -.18, .06, 1.03, .78, .91],
    [1.38, -.18, .04, 1.02, .77, .88],
    [.12, -.42, .79, .87, .58, .76],
  ] as const;
  const SIDES = 7;
  const rings = [
    [-.46, .72], [-.18, 1], [.31, .88], [.73, .49],
  ] as const;
  const points: number[] = [], colors: number[] = [], pivots: number[] = [];
  const washPoints: number[] = [], washColors: number[] = [], washPivots: number[] = [];
  const normal = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
  const pushTriangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, tone: number, lobe: number, wash = false) => {
    const vertices = wash ? washPoints : points, pigment = wash ? washColors : colors;
    const shapes = wash ? washPivots : pivots;
    vertices.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    const [x, y, z] = lobes[lobe]!;
    for (let vertex = 0; vertex < 3; vertex++) shapes.push(x, y, z, lobe);
    for (let vertex = 0; vertex < 3; vertex++) pigment.push(tone, tone * .975, tone * .85);
  };
  let faceIndex = 0;
  const addFace = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, lobe: number) => {
    normal.copy(ab.subVectors(b, a)).cross(ac.subVectors(c, a)).normalize();
    const grain = hash01(Math.imul(lobe + 3, 19013) ^ Math.imul(++faceIndex, 8171));
    const tone = THREE.MathUtils.clamp(.69 + normal.y * .27 + grain * .10, .52, 1.07);
    pushTriangle(a, b, c, tone, lobe);
    // Broad low-contrast washes lie within individual cardboard facets. A
    // slight normal offset prevents z-fighting without adding a paint layer.
    if (normal.y > -.18 && grain > .52) {
      const mix = (wa: number, wb: number, wc: number) => a.clone().multiplyScalar(wa)
        .addScaledVector(b, wb).addScaledVector(c, wc).addScaledVector(normal, .012);
      const p = mix(.69, .23, .08), q = mix(.13, .68, .19), r = mix(.18, .16, .66);
      const washTone = tone * (grain > .79 ? 1.055 : .955);
      if (ab.subVectors(q, p).cross(ac.subVectors(r, p)).dot(normal) < 0)
        pushTriangle(p, r, q, washTone, lobe, true);
      else pushTriangle(p, q, r, washTone, lobe, true);
    }
  };
  for (let lobe = 0; lobe < lobes.length; lobe++) {
    const [x, y, z, sx, sy, sz] = lobes[lobe]!;
    const rim = Array.from({ length: SIDES }, (_, side) =>
      .93 + hash01(Math.imul(lobe + 11, 11939) ^ Math.imul(side + 1, 32909)) * .14);
    const angleOffset = hash01(lobe * 19871 + 3) * .22;
    const levels = rings.map(([height, radius], level) =>
      Array.from({ length: SIDES }, (_, side) => {
        const angle = side * Math.PI * 2 / SIDES + angleOffset;
        const cut = radius * rim[side]! * (1 + (hash01(lobe * 1129 + level * 73 + side) - .5) * .035);
        return new THREE.Vector3(x + Math.cos(angle) * sx * cut,
          y + height * sy, z + Math.sin(angle) * sz * cut);
      }));
    for (let level = 0; level < levels.length - 1; level++) {
      const lower = levels[level]!, upper = levels[level + 1]!;
      for (let side = 0; side < SIDES; side++) {
        const next = (side + 1) % SIDES;
        addFace(lower[side]!, upper[side]!, upper[next]!, lobe);
        addFace(lower[side]!, upper[next]!, lower[next]!, lobe);
      }
    }
    const top = new THREE.Vector3(x, y + .81 * sy, z);
    const bottom = new THREE.Vector3(x, y - .56 * sy, z);
    for (let side = 0; side < SIDES; side++) {
      const next = (side + 1) % SIDES;
      addFace(levels[3]![side]!, top, levels[3]![next]!, lobe);
      addFace(levels[0]![side]!, levels[0]![next]!, bottom, lobe);
    }
  }
  points.push(...washPoints);
  colors.push(...washColors);
  pivots.push(...washPivots);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  // These angular/ring basis terms are baked once, including the washes.
  // Seeded instance coefficients change actual local rims, not just a lobe's
  // affine transform; neither hashes nor trigonometry run in the vertex shader.
  const contour: number[] = [];
  for (let index = 0; index < points.length / 3; index++) {
    const x = points[index * 3]! - pivots[index * 4]!;
    const y = points[index * 3 + 1]! - pivots[index * 4 + 1]!;
    const z = points[index * 3 + 2]! - pivots[index * 4 + 2]!;
    const angle = Math.atan2(z, x);
    const ring = THREE.MathUtils.clamp(.78 + y * .20, .55, 1);
    contour.push(Math.cos(angle) * .60 * ring, Math.sin(angle) * .60 * ring,
      Math.cos(angle * 2 + y) * .40 * ring, Math.sin(angle * 3 - y) * .35 * ring);
  }
  const shapeData = new Float32Array(points.length / 3 * 10);
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  const tangent=new THREE.Vector3(),bitangent=new THREE.Vector3(),axis=new THREE.Vector3();
  for (let index = 0; index < points.length / 3; index++) {
    if(index%3===0){
      a.fromArray(points,index*3);b.fromArray(points,(index+1)*3);c.fromArray(points,(index+2)*3);
      normal.copy(ab.subVectors(b,a)).cross(ac.subVectors(c,a)).normalize();
      axis.set(Math.abs(normal.z)>.9?1:0,0,Math.abs(normal.z)>.9?0:1);
      tangent.copy(axis).addScaledVector(normal,-axis.dot(normal)).normalize();
      bitangent.crossVectors(normal,tangent).normalize();
    }
    for (let component = 0; component < 4; component++) {
      shapeData[index * 10 + component] = pivots[index * 4 + component]!;
      shapeData[index * 10 + 4 + component] = contour[index * 4 + component]!;
    }
    a.fromArray(points,index*3);
    shapeData[index*10+8]=a.dot(tangent)/2.1+pivots[index*4+3]!*.23;
    shapeData[index*10+9]=a.dot(bitangent)/2.1;
  }
  const shapeBuffer = new THREE.InterleavedBuffer(shapeData, 10);
  geometry.setAttribute('aCloudLobe', new THREE.InterleavedBufferAttribute(shapeBuffer, 4, 0));
  geometry.setAttribute('aCloudContour', new THREE.InterleavedBufferAttribute(shapeBuffer, 4, 4));
  geometry.setAttribute('aCloudPaintUv', new THREE.InterleavedBufferAttribute(shapeBuffer, 2, 8));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Bound every possible seeded lobe, including its paint-offset vertices. */
function cloudShapeBounds(geometry: THREE.BufferGeometry): { radius: number; minY: number; maxY: number } {
  const positions = geometry.getAttribute('position'), lobes = geometry.getAttribute('aCloudLobe');
  let radius = 0, minY = Infinity, maxY = -Infinity;
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index), y = positions.getY(index), z = positions.getZ(index);
    const px = lobes.getX(index), py = lobes.getY(index), pz = lobes.getZ(index);
    const extentX = Math.abs(px) * 1.24 + Math.abs(x - px) * CLOUD_SHAPE.stretch[0] + CLOUD_SHAPE.shift[0] * .5;
    const extentZ = Math.abs(pz) * 1.24 + Math.abs(z - pz) * CLOUD_SHAPE.stretch[2] + CLOUD_SHAPE.shift[2] * .5;
    radius = Math.max(radius, Math.hypot(extentX, extentZ));
    minY = Math.min(minY, py + Math.min(0, y - py) * CLOUD_SHAPE.stretch[1] - CLOUD_SHAPE.shift[1] * .5);
    maxY = Math.max(maxY, py + Math.max(0, y - py) * CLOUD_SHAPE.stretch[1] + CLOUD_SHAPE.shift[1] * .5);
  }
  return { radius, minY, maxY };
}

/** World-space decoration. It never casts or receives a shadow,
 * changes World, or creates meshes when weather or camera state changes. */
export class WeatherCloudLayer {
  readonly mesh: THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshBasicNodeMaterial>;
  private readonly geometry = cloudGeometry();
  private readonly shapeBounds = cloudShapeBounds(this.geometry);
  private readonly footprintRadius = this.shapeBounds.radius;
  private readonly matrixBasis: THREE.InstancedInterleavedBuffer;
  private readonly material = new THREE.MeshBasicNodeMaterial({
    // Faded volumes must not occlude later transparent/background passes.
    // opacityNode is the only alpha source; leave the material factor neutral.
    color: 0xffffff, vertexColors: true, transparent: true, opacity: 1, depthWrite: false, alphaTest: .001, fog: false,
  });
  private readonly opacityUniform = uniform(0);
  private readonly clearRadius = uniform(CLOUD_CLEAR_RADIUS);
  private readonly paintMap=createCloudPaint();
  private readonly paintEnabled=uniform(true);
  private readonly variantData = new THREE.InstancedInterleavedBuffer(new Float32Array(CLOUD_COUNT * 12), 12);
  private readonly profile = new THREE.InterleavedBufferAttribute(this.variantData, 4, 0);
  private readonly assembly = new THREE.InterleavedBufferAttribute(this.variantData, 4, 4);
  private readonly shapeOffset = new THREE.InterleavedBufferAttribute(this.variantData, 4, 8);
  private lastShapeSeed: number | undefined;
  private readonly edgeOpacity = new THREE.InstancedBufferAttribute(new Float32Array(CLOUD_COUNT), 1);
  private readonly nightColor = new THREE.Color(0x383834);
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
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, CLOUD_COUNT);
    // Alias the existing CPU matrices, without copying them. Three's internal
    // instancing uniform cannot be accessed from positionNode; these three
    // columns add one fixed 4 KiB GPU mirror, uploaded only with a changed pose.
    this.matrixBasis = new THREE.InstancedInterleavedBuffer(this.mesh.instanceMatrix.array, 16)
      .setUsage(THREE.DynamicDrawUsage);
    for (let column = 0; column < 3; column++)
      this.geometry.setAttribute(`aCloudMatrix${column}`, new THREE.InterleavedBufferAttribute(this.matrixBasis, 3, column * 4));
    this.geometry.setAttribute('aCloudFade', this.edgeOpacity);
    this.geometry.setAttribute('aCloudProfile', this.profile);
    this.geometry.setAttribute('aCloudAssembly', this.assembly);
    this.geometry.setAttribute('aCloudOffset', this.shapeOffset);
    this.material.colorNode=Fn(()=>{
      const pigment=materialColor.toVar();
      If(this.paintEnabled,()=>{
        const coords=attribute('aCloudPaintUv','vec2').add(attribute('aCloudProfile','vec4').xz.mul(.27));
        pigment.mulAssign(texture(this.paintMap,coords).rgb);
      });
      return pigment;
    })();
    // Fragment position, not the instance centre, cuts even a large cloud out
    // of the screen centre. Pixel units make the circular hole aspect-correct.
    this.material.opacityNode = Fn(() => {
      // Materialize the vec2 before reading its components: a chained .zw.x
      // swizzle fails in the native Tint compiler on the supported browser.
      const size = viewportSize.toConst();
      const pixelsFromCentre = viewportUV.sub(.5).mul(size);
      const distance = pixelsFromCentre.length().div(size.x.min(size.y));
      const clearCentre = this.clearRadius.greaterThan(0).select(
        shaderSmoothstep(this.clearRadius, this.clearRadius.add(CLOUD_CLEAR_SOFT_EDGE), distance), 1);
      return this.opacityUniform.mul(attribute('aCloudFade')).mul(clearCentre);
    })();
    this.material.positionNode = Fn(() => {
      const lobe = attribute('aCloudLobe', 'vec4').toConst();
      const profile = attribute('aCloudProfile', 'vec4').toConst();
      const assembly = attribute('aCloudAssembly', 'vec4').toConst();
      const offset = attribute('aCloudOffset', 'vec4').toConst();
      // Two joined lobes are always present. The right and forward masses
      // may collapse to a point, giving deterministic two-to-four assemblies.
      const scale = lobe.w.equal(1).select(assembly.x, lobe.w.equal(2).select(assembly.y,
        lobe.w.equal(3).select(assembly.z, 1))).toConst();
      const radial = attribute('aCloudContour', 'vec4').dot(profile).mul(.14).add(1).toConst();
      // Three has already applied the instance matrix. Transform a local
      // deformation with its existing 3x3 basis so it rotates and shrinks with
      // the cloud, including the minimum-size slots at the recycling edge.
      const point = attribute('position', 'vec3').toConst();
      const deltaX = point.x.sub(lobe.x).mul(scale).mul(radial).add(lobe.x.mul(scale))
        .add(offset.x.mul(lobe.w.sub(2)).mul(.35).mul(scale)).sub(point.x).toConst();
      const deltaY = point.y.sub(lobe.y).mul(scale).mul(profile.y.mul(.14).add(1)).add(lobe.y)
        .add(offset.y.mul(lobe.w).mul(.4)).sub(point.y).toConst();
      const deltaZ = point.z.sub(lobe.z).mul(scale).mul(radial).add(lobe.z.mul(scale))
        .add(offset.z.mul(lobe.w).mul(.3).mul(scale)).sub(point.z).toConst();
      return positionLocal.add(attribute('aCloudMatrix0', 'vec3').mul(deltaX))
        .add(attribute('aCloudMatrix1', 'vec3').mul(deltaY))
        .add(attribute('aCloudMatrix2', 'vec3').mul(deltaZ));
    })();
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
      const pigment = hash01(index * 38711);
      this.mesh.setColorAt(index, new THREE.Color().setRGB(.88 + pigment * .13,
        .90 + hash01(index * 24407 + 3) * .10, .90 + hash01(index * 19391 + 9) * .08));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.matrixBasis.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.mesh.visible = false;
    this.configureShapes(0);
    this.configureMap(32, 32);
  }

  /** Fill the same resident buffers only when a map's visual seed changes. */
  private configureShapes(seed: number): void {
    if (seed === this.lastShapeSeed) return;
    this.lastShapeSeed = seed;
    for (let index = 0; index < CLOUD_COUNT; index++) {
      const key = seed ^ Math.imul(index + 1, 0x9e3779b1);
      const draw = (salt: number) => hash01(key ^ Math.imul(salt, 0x6d2b79f5));
      this.profile.setXYZW(index, draw(1) * 2 - 1, draw(2) * 2 - 1, draw(3) * 2 - 1, draw(4) * 2 - 1);
      this.assembly.setXYZW(index, .76 + draw(5) * .48, draw(9) < .30 ? 0 : .76 + draw(6) * .48,
        draw(7) < .30 ? 0 : .72 + draw(8) * .42, 0);
      this.shapeOffset.setXYZW(index, (draw(11) - .5) * .40, (draw(12) - .5) * .24,
        (draw(13) - .5) * .44, 0);
    }
    this.variantData.needsUpdate = true;
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
    const minY = CLOUD_BASE_HEIGHT + this.shapeBounds.minY * MAX_CLOUD_SIZE;
    const maxY = CLOUD_BASE_HEIGHT + 2 * CLOUD_BAND_SPACING + CLOUD_BAND_JITTER + this.shapeBounds.maxY * MAX_CLOUD_SIZE;
    this.mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(this.centerX, (minY + maxY) * .5, this.centerZ),
      Math.hypot(this.radiusX, this.radiusZ, (maxY - minY) * .5) + .01);
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
    this.configureShapes(seed);
    const angleOpacity = cloudViewOpacity(camera, target);
    const appearance = visualCloudAppearance(weather);
    const daylightFraction = THREE.MathUtils.clamp(daylight, 0, 1);
    // Low and moderately low views keep each established lobe fully solid.
    // Night changes its pigment, while angle, the screen opening, spawn and
    // map edges supply the intentional transparency.
    const opacity = angleOpacity;
    this.opacityUniform.value = opacity;
    if (opacity < .002) { this.mesh.visible = false; this.lastPoseSeed = undefined; return; }
    this.mesh.visible = true;
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
      const weatherSize = 1 + coverage * .23;
      const size = Math.max(.001, Math.min(fade * weatherSize * (3.2 + c * 2.7),
        clearance / this.footprintRadius));
      // Three altitude bands form a cloud volume rather than a flat ceiling.
      // The positive scale floor also stays inside the map at zero clearance.
      const margin = this.footprintRadius * size;
      scratch.position.set(this.centerX + THREE.MathUtils.clamp(x, -this.radiusX + margin, this.radiusX - margin),
        CLOUD_BASE_HEIGHT + (index % 3) * CLOUD_BAND_SPACING + d * CLOUD_BAND_JITTER,
        this.centerZ + THREE.MathUtils.clamp(z, -this.radiusZ + margin, this.radiusZ - margin));
      scratch.rotation.set(0, c * Math.PI * 2, 0);
      scratch.scale.set(size, size * (.75 + d * .24), size * (.70 + b * .24));
      scratch.updateMatrix();
      this.mesh.setMatrixAt(index, scratch.matrix);
      this.edgeOpacity.setX(index, fade);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.matrixBasis.needsUpdate = true;
    this.edgeOpacity.needsUpdate = true;
  }

  /** Keep the single cloud pipeline warm while the loading screen is present. */
  prepareForCompile(): () => void {
    const visible = this.mesh.visible, opacity = this.opacityUniform.value;
    this.mesh.visible = true;
    this.opacityUniform.value = .1;
    return () => { this.mesh.visible = visible; this.opacityUniform.value = opacity; };
  }

  setTexturesEnabled(enabled:boolean):void {this.paintEnabled.value=enabled;}
  setClearRadius(radius:number):void {this.clearRadius.value=cloudMaskRadius(radius);}

  dispose(): void {
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
    this.paintMap.dispose();
  }
}
