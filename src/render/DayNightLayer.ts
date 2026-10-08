import { Color, DirectionalLight, Frustum, HemisphereLight, Matrix4, Vector3, type Camera, type Scene } from 'three/webgpu';
import { dot, mix, normalWorldGeometry, smoothstep, uniform } from 'three/tsl';
import { sampleDaylight, sampleSeasonalDaylight, type DaylightSample } from './daylight';
import { calendarTick } from '../sim/calendar';
import { eclipseLightFactor } from '../sim/eclipse';
import type { World } from '../sim/types';
import { WORLD_SCALE } from '../world/scale';

const nightTop = new Color(0x111e3a), dayTop = new Color(0x7cb6d3);
const nightHorizon = new Color(0x465674), dayHorizon = new Color(0xd4dfd2), duskHorizon = new Color(0xeaa377);
const nightAmbient = new Color(0xb1c4e8), dayAmbient = new Color(0xfff3d9), duskAmbient = new Color(0xffc7a0);
const nightGround = new Color(0x75849a), dayGround = new Color(0x748474);
const moonColor = new Color(0xa3beff), sunColor = new Color(0xffe1b2), sunsetColor = new Color(0xff9960);
const SHADOW_CASTER_HEIGHT = WORLD_SCALE.treeMaxHeight + 2;
const SHADOW_PADDING = SHADOW_CASTER_HEIGHT + 2;
const SHADOW_DEPTH_PADDING = 2;

type DaylightWorld = Pick<World, 'climate' | 'gameProfile' | 'miscIncidents'>;
/** Presentation receives civil time; incident intervals use elapsed ticks.
 * The absent-condition branch leaves every historical sample value intact. */
export function applyEclipseDaylight(civilTick: number, world: DaylightWorld | undefined, sample: DaylightSample): number {
  const elapsedTick = world ? civilTick - calendarTick({ ...world, tick: 0 }) : civilTick;
  const factor = world ? eclipseLightFactor({ tick: elapsedTick, miscIncidents: world.miscIncidents }) : 1;
  if (factor !== 1) { sample.daylight *= factor; sample.warmth *= factor; sample.sunlight *= factor; }
  return factor;
}

/** Intersect a horizontal map rectangle with one camera frustum plane. The
 * resulting polygon also works when a perspective view looks past the map. */
function clippedMapPlane(frustum: Frustum, width: number, height: number, y: number): Vector3[] {
  let polygon = [new Vector3(-.5,y,-.5),new Vector3(width-.5,y,-.5),new Vector3(width-.5,y,height-.5),new Vector3(-.5,y,height-.5)];
  for (const plane of frustum.planes) {
    const next: Vector3[] = [];
    for(let i=0;i<polygon.length;i++) {
      const a=polygon[i]!,b=polygon[(i+1)%polygon.length]!;
      const da=plane.distanceToPoint(a),db=plane.distanceToPoint(b);
      if(da>=0)next.push(a);
      if((da<0&&db>0)||(da>0&&db<0))next.push(a.clone().lerp(b,da/(da-db)));
    }
    polygon=next;
    if(!polygon.length)break;
  }
  return polygon;
}

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
  private readonly viewFrustum = new Frustum();
  private readonly viewProjection = new Matrix4();
  private readonly lastViewMatrix = new Matrix4();
  private readonly lastProjection = new Matrix4();
  private readonly lastLightPosition = new Vector3();
  private readonly projected = new Vector3();
  private mapWidth = 32;
  private mapHeight = 32;
  private shadowFitValid = false;
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

  configureShadow(width: number, height: number): void {
    this.mapWidth=width;this.mapHeight=height;this.shadowFitValid=false;
  }

  /** Fit the existing 2048² map to what this camera can see. The close view
   * keeps its texel density; zooming out grows the coverage instead of
   * exposing the old square boundary. No extra light or shadow pass is added. */
  fitShadow(viewCamera: Camera): void {
    viewCamera.updateMatrixWorld();
    if(this.shadowFitValid&&this.lastViewMatrix.equals(viewCamera.matrixWorld)&&
      this.lastProjection.equals(viewCamera.projectionMatrix)&&this.lastLightPosition.equals(this.light.position))return;
    this.lastViewMatrix.copy(viewCamera.matrixWorld);
    this.lastProjection.copy(viewCamera.projectionMatrix);
    this.lastLightPosition.copy(this.light.position);
    this.shadowFitValid=true;

    this.viewProjection.multiplyMatrices(viewCamera.projectionMatrix,viewCamera.matrixWorldInverse);
    this.viewFrustum.setFromProjectionMatrix(this.viewProjection,viewCamera.coordinateSystem,viewCamera.reversedDepth);
    const visible=[...clippedMapPlane(this.viewFrustum,this.mapWidth,this.mapHeight,WORLD_SCALE.waterSurface),
      ...clippedMapPlane(this.viewFrustum,this.mapWidth,this.mapHeight,SHADOW_CASTER_HEIGHT)];
    if(!visible.length)return;

    this.light.updateMatrixWorld(true);this.light.target.updateMatrixWorld(true);
    const shadow=this.light.shadow,camera=shadow.camera;
    shadow.updateMatrices(this.light);
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const point of visible) {
      this.projected.copy(point).applyMatrix4(camera.matrixWorldInverse);
      minX=Math.min(minX,this.projected.x);maxX=Math.max(maxX,this.projected.x);
      minY=Math.min(minY,this.projected.y);maxY=Math.max(maxY,this.projected.y);
    }
    const spanX=Math.ceil(maxX-minX+2*SHADOW_PADDING),spanY=Math.ceil(maxY-minY+2*SHADOW_PADDING);
    const texelX=spanX/shadow.mapSize.x,texelY=spanY/shadow.mapSize.y;
    const centerX=Math.round((minX+maxX)/(2*texelX))*texelX;
    const centerY=Math.round((minY+maxY)/(2*texelY))*texelY;
    // One extra texel on either side protects the visible edge after snapping.
    Object.assign(camera,{left:centerX-spanX/2-texelX,right:centerX+spanX/2+texelX,
      bottom:centerY-spanY/2-texelY,top:centerY+spanY/2+texelY});

    // Casters outside the screen can still project onto it. Depth covers the
    // map, while the orthographic X/Y bounds continue to cull its other parts.
    let nearest=Infinity,farthest=-Infinity;
    for(const y of [WORLD_SCALE.waterSurface,SHADOW_CASTER_HEIGHT])for(const x of [-.5,this.mapWidth-.5])for(const z of [-.5,this.mapHeight-.5]) {
      this.projected.set(x,y,z).applyMatrix4(camera.matrixWorldInverse);
      const distance=-this.projected.z;
      nearest=Math.min(nearest,distance);farthest=Math.max(farthest,distance);
    }
    camera.near=Math.max(.1,nearest-SHADOW_DEPTH_PADDING);
    camera.far=farthest+SHADOW_DEPTH_PADDING;
    // Shadow.bias is normalized depth. Keep approximately the previous world
    // space offset when the camera's depth range changes with the map size.
    shadow.bias=-.028/(camera.far-camera.near);
    camera.updateProjectionMatrix();
  }

  update(tick: number, target: Vector3, world?:DaylightWorld): void {
    const s = world?.climate?sampleSeasonalDaylight(tick,this.sample):sampleDaylight(tick, this.sample);
    const moonStrength = 1 - s.daylight;
    const eclipse = applyEclipseDaylight(tick, world, s);
    this.sunDirection.value.set(s.x, s.y, s.z);
    this.zenith.value.copy(nightTop).lerp(dayTop, s.daylight);
    this.horizon.value.copy(nightHorizon).lerp(dayHorizon, s.daylight).lerp(duskHorizon, s.warmth * 0.7);
    this.discColor.value.copy(sunColor).lerp(sunsetColor, s.warmth).multiplyScalar(3 * Math.max(0, Math.min(1, (s.y + 0.025) / 0.025)) * eclipse);
    this.moonStrength.value = moonStrength;
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
    const distance=Math.hypot(this.mapWidth,this.mapHeight)+SHADOW_CASTER_HEIGHT+16;
    this.light.position.set(target.x + s.x * distance * direction, Math.max(0.1, Math.abs(s.y) * distance), target.z + s.z * distance * direction);
  }

  dispose(): void {
    this.scene.remove(this.light, this.light.target, this.ambient);
    if (this.scene.backgroundNode === this.sky) this.scene.backgroundNode = null;
    this.sky.dispose(); this.light.shadow.dispose();
  }
}
