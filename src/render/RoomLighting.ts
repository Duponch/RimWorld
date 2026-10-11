import { Color, Frustum, HemisphereLight, Matrix4, PointLight, SpotLight, Vector3, type Camera, type Scene } from 'three/webgpu';
import { shadow } from 'three/tsl';
import { clippedMapPlane } from './DayNightLayer';
import type { DaylightSample } from './daylight';
import { WORLD_SCALE } from '../world/scale';
import { DEFAULT_LIGHTING_SETTINGS, parseLightingSettings } from './lighting-settings';
import type { LightingSettings } from './lighting-settings';

const SUN = new Color(0xffedd3), DUSK = new Color(0xffc79b), MOON = new Color(0xc5d5f5);
const DAY_SKY = new Color(0xfff2dd), NIGHT_SKY = new Color(0xbdcfe7);
const DAY_GROUND = new Color(0xd4d1be), NIGHT_GROUND = new Color(0x889bab);
const CASTER_HEIGHT = WORLD_SCALE.treeMaxHeight + 2;
const PADDING = CASTER_HEIGHT + 2;
const MAX_ANGLE = Math.PI / 2 - 1e-4;
const SIGNS = [-1, 1] as const;
type ShadowWithNode = PointLight['shadow'] & { shadowNode: ReturnType<typeof shadow> };

/** Two physical emitters and a soft shared hemisphere in the room and game. The off-scene spot
 * supplies only their common shadow projection, never additional irradiance.
 * Local gameplay lamps remain in EnvironmentLighting's derived texture. */
export class RoomLighting {
  readonly sun = new PointLight(0xffe1b2, 0, 0, 2);
  readonly moon = new PointLight(0xb8ceff, 0, 0, 2);
  readonly roomSun = new PointLight(0xffe1b2, 0, 0, 2);
  readonly roomMoon = new PointLight(0xb8ceff, 0, 0, 2);
  readonly ambient = new HemisphereLight(0xfff2dd, 0xd4d1be, 0);
  readonly roomAmbient = new HemisphereLight(0xfff2dd, 0xd4d1be, 0);
  readonly roomLights = [this.roomSun, this.roomMoon, this.roomAmbient] as const;
  readonly shadowLight = new SpotLight(0xffffff, 0, 0, Math.PI / 4, 0, 2);
  readonly shadowNode = shadow(this.shadowLight);
  version = 0;
  private scene?: Scene;
  private roomScene?: Scene;
  private disposed = false;
  private fitValid = false;
  private fitCovered = true;
  private width = 0;
  private height = 0;
  private readonly lastView = new Matrix4();
  private readonly lastProjection = new Matrix4();
  private readonly lastLight = new Vector3();
  private readonly lastTarget = new Vector3();
  private lastCoordinates = -1;
  private lastReversedDepth = false;
  private readonly viewProjection = new Matrix4();
  private readonly frustum = new Frustum();
  private readonly projected = new Vector3();
  private readonly direction = new Vector3();
  private readonly offset = new Vector3();
  private readonly sunColor = new Color();
  private readonly skyColor = new Color();
  private readonly groundColor = new Color();
  private readonly plateauCenter = new Vector3();
  private settings: LightingSettings = { ...DEFAULT_LIGHTING_SETTINGS };
  private sunPower = 0;
  private moonPower = 0;
  private ambientPower = 0;
  private readonly lastSample: DaylightSample = { x: 0, y: 0, z: 0, daylight: 0, warmth: 0, sunlight: 0, moonlight: 0 };
  private lastSpan = 0;
  private hasSample = false;

  constructor() {
    this.sun.name = 'room-sun-light'; this.moon.name = 'room-moon-light';
    this.roomSun.name = 'room-sun-background-light'; this.roomMoon.name = 'room-moon-background-light';
    this.ambient.name = 'room-ambient-light'; this.roomAmbient.name = 'room-ambient-background-light';
    this.shadowLight.name = 'room-globe-shadow-projection';
    this.shadowLight.castShadow = true;
    const projection = this.shadowLight.shadow;
    projection.mapSize.set(2048, 2048);
    projection.normalBias = .055; projection.bias = -.0002;
    projection.camera.near = .1;
    // AnalyticLightNode reads this override before choosing PointShadowNode.
    // Both emitters therefore sample one perspective map, not six cube faces.
    for (const light of [this.sun, this.moon]) {
      light.castShadow = true;
      (light.shadow as ShadowWithNode).shadowNode = this.shadowNode;
    }
  }

  /** Called before the first lighting sample, including rectangular maps. */
  configure(width: number, height: number): void {
    if (this.disposed) return;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new RangeError('Invalid lighting map dimensions.');
    if (this.width === width && this.height === height) return;
    this.width = width; this.height = height;
    this.plateauCenter.set((width - 1) / 2, 0, (height - 1) / 2);
    this.fitValid = false;
    if (this.hasSample) this.sync(this.sun.position, this.moon.position, this.lastSample, this.lastSpan);
  }

  /** Copy normalized controls, and apply them immediately even during pause.
   * Unscaled powers retain the current time sample when a source is restored. */
  setSettings(settings: LightingSettings): void {
    if (this.disposed) return;
    const next = parseLightingSettings(settings);
    if (next.sun === this.settings.sun && next.moon === this.settings.moon && next.ambient === this.settings.ambient) return;
    this.settings = next;
    this.sun.intensity = this.roomSun.intensity = this.sunPower * next.sun;
    this.moon.intensity = this.roomMoon.intensity = this.moonPower * next.moon;
    this.ambient.intensity = this.roomAmbient.intensity = this.ambientPower * next.ambient;
    this.selectShadowSource(this.sun.position, this.moon.position);
    this.version++;
  }

  private selectShadowSource(sunPos: Readonly<Vector3>, moonPos: Readonly<Vector3>): boolean {
    if (this.sun.intensity === 0 && this.moon.intensity === 0) return false;
    const source = this.sun.intensity >= this.moon.intensity ? sunPos : moonPos;
    const moved = !this.shadowLight.position.equals(source);
    if (moved) {
      this.shadowLight.position.copy(source); this.shadowLight.updateMatrixWorld(true);
      this.fitValid = false; this.shadowLight.shadow.needsUpdate = true;
    }
    return moved;
  }

  attach(gameScene: Scene, roomScene?: Scene): void {
    if (this.disposed || (this.scene === gameScene && this.roomScene === roomScene)) return;
    if (this.scene) this.detach(this.scene, this.roomScene);
    this.scene = gameScene; this.roomScene = roomScene;
    gameScene.add(this.sun, this.moon, this.ambient);
    roomScene?.add(this.roomSun, this.roomMoon, this.roomAmbient);
    this.shadowLight.shadow.needsUpdate = true;
  }

  detach(gameScene: Scene, roomScene: Scene | undefined = this.roomScene): void {
    gameScene.remove(this.sun, this.moon, this.ambient);
    roomScene?.remove(this.roomSun, this.roomMoon, this.roomAmbient);
    if (this.scene === gameScene) this.scene = undefined;
    if (this.roomScene === roomScene) this.roomScene = undefined;
  }

  /** Positions are the authored globe centres after the existing clock motion.
   * Power follows distance squared to the plateau centre, without compensating
   * grazing incidence (which would produce bright pools below edge lanterns).
   * Solar altitude continues to vary after sunlight's existing early plateau.
   * No wall clock, World or field upload. */
  sync(sunPos: Readonly<Vector3>, moonPos: Readonly<Vector3>, sample: DaylightSample, span: number): number {
    if (this.disposed) return this.version;
    if (!this.width || !this.height) this.plateauCenter.set((span - 1) / 2, 0, (span - 1) / 2);
    const daylight = Math.max(0, Math.min(1, sample.daylight));
    const altitude = Math.max(0, Math.min(1, sample.y * Math.SQRT2));
    const minimumDistanceSq = Math.max(1, span) ** 2 * .045;
    const sunDistanceSq = Math.max(minimumDistanceSq, sunPos.distanceToSquared(this.plateauCenter));
    const moonDistanceSq = Math.max(minimumDistanceSq, moonPos.distanceToSquared(this.plateauCenter));
    // Existing eclipse multipliers remain linear in both solar contributions.
    // At default controls central solar power spans .65..2 before incidence;
    // the shared hemisphere supplies legibility rather than overdriving bulbs.
    this.sunPower = (.65 + altitude * 1.35) * Math.max(sample.sunlight, .12 * daylight) * sunDistanceSq;
    this.moonPower = .43 * Math.max(Math.min(1, sample.moonlight / .22), .10 * (1 - daylight)) * moonDistanceSq;
    this.ambientPower = .82 + .83 * daylight;
    const sunIntensity = this.sunPower * this.settings.sun, moonIntensity = this.moonPower * this.settings.moon;
    const ambientIntensity = this.ambientPower * this.settings.ambient;
    this.sunColor.copy(SUN).lerp(DUSK, sample.warmth * .65);
    this.skyColor.copy(NIGHT_SKY).lerp(DAY_SKY, daylight);
    this.groundColor.copy(NIGHT_GROUND).lerp(DAY_GROUND, daylight);
    Object.assign(this.lastSample, sample); this.lastSpan = span; this.hasSample = true;
    const changed = !this.sun.position.equals(sunPos) || !this.moon.position.equals(moonPos)
      || this.sun.intensity !== sunIntensity || this.moon.intensity !== moonIntensity || !this.sun.color.equals(this.sunColor)
      || this.ambient.intensity !== ambientIntensity || !this.ambient.color.equals(this.skyColor)
      || !this.ambient.groundColor.equals(this.groundColor);
    if (!changed) return this.version;
    this.sun.position.copy(sunPos); this.moon.position.copy(moonPos);
    this.roomSun.position.copy(sunPos); this.roomMoon.position.copy(moonPos);
    this.sun.intensity = this.roomSun.intensity = sunIntensity;
    this.moon.intensity = this.roomMoon.intensity = moonIntensity;
    this.ambient.intensity = this.roomAmbient.intensity = ambientIntensity;
    this.sun.color.copy(this.sunColor); this.roomSun.color.copy(this.sunColor);
    this.moon.color.copy(MOON); this.roomMoon.color.copy(MOON);
    this.ambient.color.copy(this.skyColor); this.roomAmbient.color.copy(this.skyColor);
    this.ambient.groundColor.copy(this.groundColor); this.roomAmbient.groundColor.copy(this.groundColor);
    this.selectShadowSource(sunPos, moonPos);
    return ++this.version;
  }

  /** A global eight-corner fit establishes the spotlight's perspective. Crop
   * that projection to the visible ground/caster planes so close views retain
   * the existing shadow density. Bounded geometry work, cached between moves. */
  fitShadow(viewCamera: Camera, width: number, height: number): boolean {
    if (this.disposed || width <= 0 || height <= 0) return false;
    this.configure(width, height);
    viewCamera.updateMatrixWorld();
    const light = this.shadowLight, projection = light.shadow, camera = projection.camera;
    light.target.position.set((width - 1) / 2, (WORLD_SCALE.waterSurface + CASTER_HEIGHT) / 2, (height - 1) / 2);
    if (this.fitValid && this.width === width && this.height === height
      && this.lastView.equals(viewCamera.matrixWorld) && this.lastProjection.equals(viewCamera.projectionMatrix)
      && this.lastCoordinates === viewCamera.coordinateSystem && this.lastReversedDepth === viewCamera.reversedDepth
      && this.lastLight.equals(light.position) && this.lastTarget.equals(light.target.position)) return this.fitCovered;
    this.fitValid = true; this.width = width; this.height = height;
    this.lastView.copy(viewCamera.matrixWorld); this.lastProjection.copy(viewCamera.projectionMatrix);
    this.lastCoordinates = viewCamera.coordinateSystem; this.lastReversedDepth = viewCamera.reversedDepth;
    this.lastLight.copy(light.position); this.lastTarget.copy(light.target.position);
    light.updateMatrixWorld(true); light.target.updateMatrixWorld(true);
    this.direction.copy(light.target.position).sub(light.position).normalize();
    let angle = 0, near = Infinity, far = 0, covered = this.direction.lengthSq() > 0;
    for (const y of [WORLD_SCALE.waterSurface, CASTER_HEIGHT]) for (const x of [-.5, width - .5]) for (const z of [-.5, height - .5]) {
      this.offset.set(x, y, z).sub(light.position);
      const forward = this.offset.dot(this.direction), distance = this.offset.length();
      if (forward <= .1) covered = false;
      near = Math.min(near, forward); far = Math.max(far, distance);
      angle = Math.max(angle, Math.acos(Math.max(-1, Math.min(1, forward / Math.max(distance, .001)))));
    }
    this.fitCovered = covered && angle < MAX_ANGLE;
    // A one-face projection cannot represent a source inside the caster box.
    // In that exceptional pose, unshadowed physical light avoids false masks.
    projection.intensity = this.fitCovered ? 1 : 0;
    light.angle = Math.min(MAX_ANGLE, Math.max(.01, angle + .005));
    camera.clearViewOffset();
    camera.near = Math.max(.1, near - 2); camera.far = Math.max(camera.near + 1, far + 2);
    camera.updateProjectionMatrix();
    projection.updateMatrices(light);

    if (this.fitCovered) {
      this.viewProjection.multiplyMatrices(viewCamera.projectionMatrix, viewCamera.matrixWorldInverse);
      this.frustum.setFromProjectionMatrix(this.viewProjection, viewCamera.coordinateSystem, viewCamera.reversedDepth);
      const visible = [...clippedMapPlane(this.frustum, width, height, WORLD_SCALE.waterSurface),
        ...clippedMapPlane(this.frustum, width, height, CASTER_HEIGHT)];
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const point of visible) for (const dx of SIGNS) for (const dy of SIGNS) for (const dz of SIGNS) {
        this.projected.set(Math.max(-.5, Math.min(width - .5, point.x + dx * PADDING)),
          Math.max(WORLD_SCALE.waterSurface, Math.min(CASTER_HEIGHT, point.y + dy * PADDING)),
          Math.max(-.5, Math.min(height - .5, point.z + dz * PADDING))).project(camera);
        minX = Math.min(minX, this.projected.x); maxX = Math.max(maxX, this.projected.x);
        minY = Math.min(minY, this.projected.y); maxY = Math.max(maxY, this.projected.y);
      }
      if (visible.length) {
        const margin = 2 / projection.mapSize.x;
        minX = Math.max(-1, minX - margin); maxX = Math.min(1, maxX + margin);
        minY = Math.max(-1, minY - margin); maxY = Math.min(1, maxY + margin);
        if (maxX > minX && maxY > minY) camera.setViewOffset(2, 2, minX + 1, 1 - maxY, maxX - minX, maxY - minY);
      }
    }
    projection.bias = -.028 / (camera.far - camera.near);
    projection.updateMatrices(light); projection.needsUpdate = true;
    return this.fitCovered;
  }

  dispose(): void {
    if (this.disposed) return;
    if (this.scene) this.detach(this.scene, this.roomScene);
    this.disposed = true;
    for (const light of this.roomLights) light.removeFromParent();
    this.shadowNode.dispose();
    // Hemisphere lights own no shadow maps or buffers to dispose.
    for (const light of [this.sun, this.moon, this.roomSun, this.roomMoon, this.shadowLight]) light.shadow.dispose();
  }
}
