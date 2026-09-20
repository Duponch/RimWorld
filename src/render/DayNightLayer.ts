import { Color, DirectionalLight, HemisphereLight, Vector3, type Scene } from 'three/webgpu';
import { dot, mix, normalWorldGeometry, smoothstep, uniform } from 'three/tsl';
import { sampleDaylight, sampleSeasonalDaylight, type DaylightSample } from './daylight';
import type { World } from '../sim/types';

const nightTop = new Color(0x111e3a), dayTop = new Color(0x7cb6d3);
const nightHorizon = new Color(0x465674), dayHorizon = new Color(0xd4dfd2), duskHorizon = new Color(0xeaa377);
const nightAmbient = new Color(0xb1c4e8), dayAmbient = new Color(0xfff3d9), duskAmbient = new Color(0xffc7a0);
const nightGround = new Color(0x75849a), dayGround = new Color(0x748474);
const moonColor = new Color(0xa3beff), sunColor = new Color(0xffe1b2), sunsetColor = new Color(0xff9960);

/** One background shader and one reused shadow-casting light, at every hour.
 * Uniform changes never rebuild meshes, materials, pipelines or environment maps. */
export class DayNightLayer {
  readonly light = new DirectionalLight(0xffe1b2, 3.2);
  readonly ambient = new HemisphereLight(0xfff3d9, 0x748474, 2.1);
  readonly sample: DaylightSample = { x: 0, y: 0, z: 0, daylight: 0, warmth: 0, sunlight: 0, moonlight: 0 };
  private readonly zenith = uniform(new Color());
  private readonly horizon = uniform(new Color());
  private readonly sunDirection = uniform(new Vector3());
  private readonly discColor = uniform(new Color());
  private readonly moonStrength = uniform(0);
  // World normals of Three's background sphere are independent of camera
  // translation. The sun follows world east/west even when the player orbits.
  private readonly ray = normalWorldGeometry.normalize();
  private readonly sky = mix(this.horizon, this.zenith, smoothstep(-0.05, 0.75, this.ray.y))
    .add(this.discColor.mul(smoothstep(0.99945, 0.99965, dot(this.ray, this.sunDirection))))
    .add(uniform(new Color(0xd1deed)).mul(this.moonStrength)
      .mul(smoothstep(0.99955, 0.9997, dot(this.ray, this.sunDirection.negate()))));

  constructor(private readonly scene: Scene) {
    scene.backgroundNode = this.sky;
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(2048, 2048);
    this.light.shadow.normalBias = 0.055;
    this.light.shadow.bias = -0.0002;
    this.light.shadow.camera.near = 0.1;
    this.light.shadow.camera.far = 140;
    scene.add(this.light, this.light.target, this.ambient);
  }

  configureShadow(extent: number): void {
    Object.assign(this.light.shadow.camera, { left: -extent * 0.65, right: extent * 0.65, top: extent * 0.65, bottom: -extent * 0.65 });
    this.light.shadow.camera.updateProjectionMatrix();
  }

  update(tick: number, target: Vector3, world?:Pick<World,'climate'>): void {
    const s = world?.climate?sampleSeasonalDaylight(tick,this.sample):sampleDaylight(tick, this.sample);
    this.sunDirection.value.set(s.x, s.y, s.z);
    this.zenith.value.copy(nightTop).lerp(dayTop, s.daylight);
    this.horizon.value.copy(nightHorizon).lerp(dayHorizon, s.daylight).lerp(duskHorizon, s.warmth * 0.7);
    this.discColor.value.copy(sunColor).lerp(sunsetColor, s.warmth).multiplyScalar(3 * Math.max(0, Math.min(1, (s.y + 0.025) / 0.025)));
    this.moonStrength.value = 1 - s.daylight;
    this.ambient.color.copy(nightAmbient).lerp(dayAmbient, s.daylight).lerp(duskAmbient, s.warmth * 0.25);
    this.ambient.groundColor.copy(nightGround).lerp(dayGround, s.daylight);
    this.ambient.intensity = 1.05 + 1.05 * s.daylight;
    const isSun = s.y >= 0;
    this.light.color.copy(isSun ? sunColor : moonColor);
    if (isSun) this.light.color.lerp(sunsetColor, s.warmth);
    this.light.intensity = isSun ? 3.2 * s.sunlight : s.moonlight;
    // The light reaches zero before changing hemispheres; it never shines
    // through the ground. Both paths use the same bounded shadow atlas.
    const direction = isSun ? 1 : -1;
    this.light.target.position.set(target.x, 0, target.z);
    this.light.position.set(target.x + s.x * 60 * direction, Math.max(0.1, Math.abs(s.y) * 60), target.z + s.z * 60 * direction);
  }

  dispose(): void {
    this.scene.remove(this.light, this.light.target, this.ambient);
    if (this.scene.backgroundNode === this.sky) this.scene.backgroundNode = null;
    this.sky.dispose(); this.light.shadow.dispose();
  }
}
