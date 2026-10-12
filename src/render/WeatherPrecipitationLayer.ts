import * as THREE from 'three/webgpu';
import {
  Fn, atan, cameraPosition, cross, float, hash, instanceIndex, mix, positionLocal,
  sin, smoothstep, uint, uniform, uv, varyingProperty, vec2, vec3, attribute,
} from 'three/tsl';
import type { AnimationDetail,AnimationSampleHandle } from './AnimationDetail';
import { FxAnimationCache,fxFract,fxSmoothstep } from './FxAnimationCache';

const CELL_SIZE = 2;
const FIELD_HEIGHT = 24;

function wrap(value: number, period: number): number {
  return ((value % period) + period) % period;
}
/** Same uint PCG as Three's native hash node; generated only on map/seed
 * changes. These stable particle facts never need a per-frame GPU hash in
 * the sampled branch. Complete detail keeps the original native hash graph. */
export function precipitationHash(seed:number):number {
  const state=(Math.imul(seed>>>0,747796405)+2891336453)>>>0;
  const word=Math.imul((state>>>( (state>>>28)+4 ))^state,277803737)>>>0;
  return Math.fround((((word>>>22)^word)>>>0)* (1/4294967296));
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

/** The classification anchors lie in this fixed rectangle at y=12. Depth
 * is affine, so its corner extrema bound every particle without scanning.
 * A conservative arithmetic margin leaves boundary/mixed fields to the
 * exact per-anchor classifier; behind and distant corners cannot be mixed. */
export function precipitationGlobalDetail(detail:AnimationDetail,width:number,height:number):-1|0|1|2 {
  const settings=detail.settings;if(!settings.enabled)return 0;
  if(detail.perspective.value<.5)return detail.classify(0,FIELD_HEIGHT*.5,0);
  const v=detail.viewDepth.value,x0=-.5,x1=width-.5,z0=-.5,z1=height-.5,y=FIELD_HEIGHT*.5;
  const min=v.x*(v.x<0?x1:x0)+v.y*y+v.z*(v.z<0?z1:z0)+v.w;
  const max=v.x*(v.x<0?x0:x1)+v.y*y+v.z*(v.z<0?z0:z1)+v.w;
  const margin=8*Number.EPSILON*(Math.abs(v.x)*Math.max(Math.abs(x0),Math.abs(x1))+Math.abs(v.y*y)+Math.abs(v.z)*Math.max(Math.abs(z0),Math.abs(z1))+Math.abs(v.w));
  const lower=min-margin,upper=max+margin;
  if(upper<=0)return 2;
  if(lower<=0)return -1;
  const projection=detail.projectionScale.value;
  if(settings.farPixels>0&&projection/lower<settings.farPixels)return 2;
  if(projection/upper>=settings.nearPixels)return 0;
  return -1;
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
  private readonly cache:FxAnimationCache;
  private readonly globalHandle:AnimationSampleHandle|undefined;
  private metadata=new Float32Array(0);
  private metadataSeed=NaN;
  private lastCount=-1;
  private drawn:number[]=[];
  private lastGlobalLevel=-1;
  private identitySlots=true;

  constructor(private readonly detail?:AnimationDetail) {
    this.cache=new FxAnimationCache(6,detail);this.globalHandle=detail?.createHandle();
    const kind = varyingProperty('float', 'weatherParticleKind');
    const ink = varyingProperty('float', 'weatherParticleInk');
    const visible = varyingProperty('float', 'weatherParticleVisible');
    const worldXZ = varyingProperty('vec2', 'weatherParticleWorldXZ');
    const sampledDaylight=varyingProperty('float','weatherParticleDaylight');
    this.material.positionNode = this.cache.choose(()=>Fn(() => {
      sampledDaylight.assign(this.daylight);
      const slot = uint(attribute('fxSlot','float')).mul(uint(this.stride)).mod(uint(this.capacity));
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
      const cameraRight = horizontalDistance.greaterThan(.001).select(
        vec3(toward.z.negate().div(distance), 0, toward.x.div(distance)), vec3(1, 0, 0));
      const facing = toward.length().greaterThan(.001).select(
        toward.div(toward.length().max(.001)), vec3(0, 1, 0));
      const snowUp = cross(cameraRight, facing).normalize();
      // The world-space particle drifts .13 wind units for every unit it
      // falls. Give its ink stroke exactly that trajectory in both cameras.
      const rainUp = vec3(this.wind.x.mul(-.13), 1, this.wind.y.mul(-.13)).normalize();
      const rainAcross = cross(facing, rainUp),acrossLength=rainAcross.length();
      const rainRight = acrossLength.greaterThan(.001).select(
        rainAcross.div(acrossLength.max(.001)),cameraRight);
      const right = snow.select(cameraRight,rainRight);
      const up = snow.select(snowUp,rainUp);
      const nearScale = mix(float(1), smoothstep(2, 8, distance).max(.001), this.perspective);
      const projectionScale = snow.select(mix(float(1), float(.58), this.perspective), float(1));
      const width = snow.select(float(.30).add(ink.mul(.12)),
        float(.11).add(ink.mul(.045))).mul(nearScale).mul(projectionScale);
      const length = snow.select(float(.30).add(ink.mul(.12)),
        float(.68).add(ink.mul(.32))).mul(nearScale).mul(projectionScale);
      const point = center.add(right.mul(positionLocal.x.mul(width)))
        .add(up.mul(positionLocal.y.mul(length)));
      worldXZ.assign(point.xz);
      return point;
    })(),()=>{
      const facts=this.cache.cell(5),point=this.cache.affine(positionLocal);
      kind.assign(facts.x);ink.assign(facts.y);visible.assign(facts.z);sampledDaylight.assign(facts.w);worldXZ.assign(point.xz);return point;
    });
    const pigmentPixel = uv().sub(vec2(.5));
    const paperGrain = sin(pigmentPixel.x.mul(93).add(ink.mul(29)))
      .mul(sin(pigmentPixel.y.mul(117).sub(ink.mul(17))));
    this.material.colorNode = mix(vec3(.64, .75, .84), vec3(.965, .947, .907), kind)
      .mul(float(.80).add(sampledDaylight.mul(.20)))
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
        .mul(float(.52).add(sampledDaylight.mul(.32)));
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
    this.metadata=new Float32Array(layout.capacity*6);this.metadataSeed=NaN;
    this.geometry.setAttribute('fxSlot',new THREE.InstancedBufferAttribute(new Float32Array(layout.capacity),1).setUsage(THREE.StaticDrawUsage));
    const slots=this.geometry.getAttribute('fxSlot') as THREE.InstancedBufferAttribute;for(let i=0;i<layout.capacity;i++)slots.setX(i,i);slots.needsUpdate=true;
    this.identitySlots=true;
    this.reset();
  }

  reset(): void {
    this.geometry.instanceCount = 0;
    this.mesh.visible = false;
    this.cache.reset();this.drawn=[];this.lastCount=-1;this.lastGlobalLevel=-1;if(this.globalHandle)this.detail?.invalidate(this.globalHandle);
  }

  present({ seed, tick, rainRate, snowRate, camera,target, strength, directionX, directionZ, daylight }: PrecipitationPresentation): void {
    const shares = precipitationShares(rainRate, snowRate);
    const amount = Math.min(1, shares.rain + shares.snow);
    if (amount <= 0) { if(this.mesh.visible)this.reset();this.geometry.instanceCount = 0; this.mesh.visible = false; return; }
    this.seed.value = seed;
    this.rainPhase.value = wrap(tick * 1.15, 192);
    this.snowPhase.value = wrap(tick * .12, 192);
    this.snowFraction.value = shares.snow / amount;
    this.wind.value.set(directionX, directionZ).multiplyScalar(THREE.MathUtils.clamp(strength, 0, 2));
    this.daylight.value = THREE.MathUtils.clamp(daylight, 0, 1);
    this.perspective.value = camera instanceof THREE.PerspectiveCamera ? 1 : 0;
    const count=Math.max(1,Math.round(this.mapCapacity*amount*.82));
    // Full detail is the native uniform graph. Only returning from a compact
    // stream needs an identity-slot rewrite; steady OFF has no particle work.
    if(!this.detail||!this.detail.settings.enabled){this.publishSlots(count);this.geometry.instanceCount=count;this.mesh.visible=true;this.lastCount=count;this.lastGlobalLevel=-1;return;}
    const iso=this.detail?.perspective.value===0;
    const global=precipitationGlobalDetail(this.detail,this.dimensions.value.x,this.dimensions.value.y),changedLevel=global!==this.lastGlobalLevel;
    if(changedLevel){this.cache.reset();this.lastGlobalLevel=global;}
    if(global===2){this.geometry.instanceCount=0;this.mesh.visible=false;this.lastCount=count;return;}
    if(global===0){
      // Perspective shaders read the header even for complete particles.
      // Clear it once on entry, then only for a newly admitted intensity tail.
      for(let row=changedLevel?0:Math.max(0,this.lastCount);row<count;row++)this.cache.set(row,0,0);
      this.cache.flush();this.publishSlots(count);this.geometry.instanceCount=count;this.mesh.visible=true;this.lastCount=count;return;
    }
    if(iso&&this.globalHandle){
      const due=this.detail!.shouldSample(this.globalHandle,target.x,FIELD_HEIGHT*.5,target.z);
      if(!changedLevel&&!due&&count===this.lastCount&&seed===this.metadataSeed)return;
    }
    if(seed!==this.metadataSeed){
      this.metadataSeed=seed;this.cache.reset();
      for(let row=0;row<this.mapCapacity;row++){
        const slot=(row*this.stride.value)%this.mapCapacity,cx=slot%this.columns.value,cz=Math.floor(slot/this.columns.value),key=(Math.imul(cx,73856093)^Math.imul(cz,19349663)^Math.imul(seed,83492791))>>>0,at=row*6;
        this.metadata[at]=cx*CELL_SIZE+precipitationHash(key+11)*Math.min(CELL_SIZE,this.dimensions.value.x-cx*CELL_SIZE);
        this.metadata[at+1]=cz*CELL_SIZE+precipitationHash(key+23)*Math.min(CELL_SIZE,this.dimensions.value.y-cz*CELL_SIZE);
        this.metadata[at+2]=precipitationHash(key+37);this.metadata[at+3]=precipitationHash(key+53);this.metadata[at+4]=Math.floor(precipitationHash(key+89)*4)*.125+.875;this.metadata[at+5]=precipitationHash(key+97);
      }
    }
    const slots=this.geometry.getAttribute('fxSlot') as THREE.InstancedBufferAttribute;let visibleCount=0,dirty=false;
    const cameraPoint=camera.position;
    for(let row=0;row<count;row++){
      const at=row*6,rootX=this.metadata[at]!,rootZ=this.metadata[at+1]!;
      if(this.cache.sampleDue(row,rootX-.5,FIELD_HEIGHT*.5,rootZ-.5))this.bakeParticle(row,cameraPoint);
      const level=this.cache.commitSample(row);
      if(level===2)continue;if(this.drawn[visibleCount]!==row){slots.setX(visibleCount,row);this.drawn[visibleCount]=row;dirty=true;}visibleCount++;
    }
    this.drawn.length=visibleCount;if(dirty){slots.needsUpdate=true;this.identitySlots=false;}this.geometry.instanceCount=visibleCount;this.mesh.visible=visibleCount>0;this.lastCount=count;this.cache.flush();
  }

  private bakeParticle(row:number,cameraPoint:THREE.Vector3):void {
        const at=row*6,rootX=this.metadata[at]!,rootZ=this.metadata[at+1]!;
        const snow=this.metadata[at+2]!<this.snowFraction.value,ink=this.metadata[at+3]!,height=fxFract(this.metadata[at+5]!-(snow?this.snowPhase.value:this.rainPhase.value)*this.metadata[at+4]!/FIELD_HEIGHT)*FIELD_HEIGHT;
        const drift=(FIELD_HEIGHT-height)*(snow?.27:.13),wx=fxFract((rootX+this.wind.value.x*drift)/this.dimensions.value.x)*this.dimensions.value.x,wz=fxFract((rootZ+this.wind.value.y*drift)/this.dimensions.value.y)*this.dimensions.value.y;
        const x=wx-.5,y=height+1.7,z=wz-.5,dx=cameraPoint.x-x,dy=cameraPoint.y-y,dz=cameraPoint.z-z,horizontal=Math.hypot(dx,dz),distance=Math.max(.001,horizontal),length=Math.hypot(dx,dy,dz),fx=length>.001?dx/length:0,fy=length>.001?dy/length:1,fz=length>.001?dz/length:0;
        let rx=horizontal>.001?-dz/distance:1,ry=0,rz=horizontal>.001?dx/distance:0,ux=0,uy=1,uz=0;
        if(snow){ux=ry*fz-rz*fy;uy=rz*fx-rx*fz;uz=rx*fy-ry*fx;const n=Math.hypot(ux,uy,uz)||1;ux/=n;uy/=n;uz/=n;}
        else{ux=-this.wind.value.x*.13;uz=-this.wind.value.y*.13;const n=Math.hypot(ux,1,uz);ux/=n;uy/=n;uz/=n;const ax=fy*uz-fz*uy,ay=fz*ux-fx*uz,az=fx*uy-fy*ux,l=Math.hypot(ax,ay,az);if(l>.001){rx=ax/l;ry=ay/l;rz=az/l;}}
        const near=this.perspective.value?Math.max(.001,fxSmoothstep(2,8,distance)):1,projection=snow&&this.perspective.value?.58:1,width=(snow?.30+ink*.12:.11+ink*.045)*near*projection,breadth=(snow?.30+ink*.12:.68+ink*.32)*near*projection;
        this.cache.set(row,1,rx*width,ry*width,rz*width);this.cache.set(row,2,ux*breadth,uy*breadth,uz*breadth);this.cache.set(row,3,0,0,0);this.cache.set(row,4,x,y,z);
        const edge=Math.min(wx,this.dimensions.value.x-wx,wz,this.dimensions.value.y-wz),alpha=fxSmoothstep(0,.8,height)*(1-fxSmoothstep(FIELD_HEIGHT-.8,FIELD_HEIGHT,height))*fxSmoothstep(0,.6,edge);
        this.cache.set(row,5,snow?1:0,ink,alpha,this.daylight.value);
  }

  private publishSlots(count:number):void {
    if(!this.identitySlots){const slots=this.geometry.getAttribute('fxSlot') as THREE.InstancedBufferAttribute;for(let i=0;i<this.mapCapacity;i++)slots.setX(i,i);slots.needsUpdate=true;this.identitySlots=true;this.drawn.length=0;}
    this.drawn.length=count;
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
    this.cache.dispose();this.metadata=new Float32Array(0);
  }
}
