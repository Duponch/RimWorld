import * as THREE from 'three/webgpu';
import {
  Fn, attribute, cos, cross, dot, float, mix, normalLocal, positionLocal,
  sin, smoothstep, sqrt, uniform, vec3, vec4, uint, int, varying,
} from 'three/tsl';
import type { Pawn, World } from '../sim/types';
import { TICKS_PER_SECOND } from '../sim/types';
import type { PawnLayer } from './PawnLayer';
import type { AnimationDetail } from './AnimationDetail';
import type { PresentationClock } from './pawn-presentation';
import { FxAnimationCache,fxActorCache,fxActorPose,fxFract,fxClamp } from './FxAnimationCache';

/** The reference's 24/6/16/12 pieces are instanced, rather than 58 meshes per
 * fight. The sole adaptation is a uniform scale from its diorama to our cells. */
export const BRAWL_PARTS = Object.freeze({ puff: 24, star: 6, spike: 16, voxel: 12, shadow: 1 });
const SCALE = .51, INTENSITY = 1.2, SPEED = 1.4;
const BOUND_PADDING = 3.8;
type Kind = keyof typeof BRAWL_PARTS;
type PoseName = 'aFrom' | 'aTo' | 'aTravel';
type Pair = { a: number; b: number; key: string; hitAt: number; seed: number };
type Batch = { geometry: THREE.InstancedBufferGeometry; count: number; kind: Kind; cache:FxAnimationCache;drawn:number[] };
const poseNames: readonly PoseName[] = ['aFrom', 'aTo', 'aTravel'];
const pairNames = ['aAFrom', 'aATo', 'aATravel', 'aBFrom', 'aBTo', 'aBTravel', 'aHit'] as const;
const partNames = ['aPartOne','aPartTwo','aPartThree'] as const;
type Float4Attribute = THREE.InstancedBufferAttribute | THREE.InterleavedBufferAttribute;
const versionOf=(attr:Float4Attribute)=>attr instanceof THREE.InterleavedBufferAttribute?attr.data.version:attr.version;

function generator(seed: number): () => number {
  return () => { seed = (seed + 0x6d2b79f5) | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed);
    x ^= x + Math.imul(x ^ x >>> 7, 61 | x); return ((x ^ x >>> 14) >>> 0) / 4294967296; };
}
const kindSeed: Record<Kind,number> = {puff:0x481728,star:0x792387,spike:0x14f6d2,voxel:0x823aa5,shadow:0x971ffe};

function starGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? .38 : .17, angle = i * Math.PI / 5 - Math.PI / 2;
    if (i === 0) shape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    else shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .08, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .03, bevelThickness: .03 });
  geometry.center();
  return geometry;
}

function spikeGeometry(): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(.04, .8); shape.lineTo(0, 1);
  shape.lineTo(-.04, .8); shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function shadowGeometry(): THREE.RingGeometry {
  const geometry = new THREE.RingGeometry(0, 2.3, 32);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function piece(kind: Kind, index: number): { one: number[]; two: number[]; three: number[] } {
  // Each local piece has a stable visual seed. Reallocating capacity or moving
  // a pair to another slot cannot reshuffle the existing cloud.
  const random=generator(kindSeed[kind]^Math.imul(index+1,0x9e3779b1));
  if (kind === 'puff') {
    const theta = random() * Math.PI * 2, phi = (random() - .5) * Math.PI * .7, dist = .5 + random() * .9;
    let x = random() - .5, y = random() - .5, z = random() - .5;
    const length = Math.hypot(x, y, z) || 1; x /= length; y /= length; z /= length;
    return { one: [Math.cos(theta) * Math.cos(phi) * dist * 1.5, Math.sin(phi) * dist * .9, Math.sin(theta) * Math.cos(phi) * dist * 1.5, .85 + random() * .7],
      two: [2 + random() * 4, random() * Math.PI * 2, 4 + random() * 5, x], three: [y, z, 0, 0] };
  }
  if (kind === 'star') return { one: [1.8 + random() * .8, 3.5 + random() * 2, index / 6 * Math.PI * 2, (random() - .5) * 1.2],
    two: [5 + random() * 6, random() * 10, 0, 0], three: [0, 0, 0, 0] };
  if (kind === 'spike') return { one: [index / 16 * Math.PI * 2, 1.8 + random() * .7, (random() - .5) * 1.5, random() * 10],
    two: [0, 0, 0, 0], three: [0, 0, 0, 0] };
  if (kind === 'voxel') {
    const dimensions = [
      [.85,.85,.85], [.7,.4,.3], [.85,.85,.85], [.7,.4,.3],
      [.35,.35,.7], [.42,.42,.42], [.35,.35,.7], [.42,.42,.42],
      [.35,.6,.35], [.4,.35,.65], [.35,.6,.35], [.4,.35,.65],
    ][index]!;
    const palette = [0x452313,0xf6d1a5,0x452313,0xe6bb91,0x4ba3b8,0xf6d1a5,
      0xe5a93c,0xe6bb91,0x334155,0x292524,0x1e293b,0x292524];
    const tint = new THREE.Color(palette[index]);
    return { one: [...dimensions, index], two: [tint.r,tint.g,tint.b,0], three: [0,0,0,0] };
  }
  return { one: [0,0,0,0], two: [0,0,0,0], three: [0,0,0,0] };
}

/** Same travel interpolation as pawnPresentationPose for XZ. The attributes
 * are copied only when the resident pawn buffer changes version. */
function actorPose(prefix: 'aA' | 'aB', clock: PresentationClock) {
  const from = attribute(`${prefix}From`, 'vec4'), to = attribute(`${prefix}To`, 'vec4'), travel = attribute(`${prefix}Travel`, 'vec4');
  const alpha = travel.y.sub(travel.x).greaterThan(0)
    .select(clock.travelTime.sub(travel.x).div(travel.y.sub(travel.x).max(.0001)).clamp(0,1), clock.blend);
  const original=()=>vec4(mix(from.xyz,to.xyz,alpha),0),slot=uint(attribute('aHit','vec4')[prefix==='aA'?'z':'w']);
  return clock.animationCache?clock.animationCache.poseNode(original,slot).xyz:original().xyz;
}

function pairCenter(clock: PresentationClock) {
  return actorPose('aA', clock).add(actorPose('aB', clock)).mul(.5);
}

function referenceTime(time: ReturnType<typeof uniform<'float'>>) {
  return time.mul(SPEED).add(attribute('aHit','vec4').y);
}

function rgb(hex:number) {
  const color=new THREE.Color(hex);
  return vec3(color.r,color.g,color.b);
}
function varyingFlash(cache:FxAnimationCache,original:THREE.Node<'float'>){const sampled=cache.cachedVarying(()=>cache.cell(int(attribute('aPartThree','vec4').z).mul(5).add(5)).x);return cache.choose(()=>original,()=>sampled,float(0));}

export class BrawlCloudLayer {
  readonly group = new THREE.Group();
  /** Shared confirmed presentation clock; constant while paused. */
  readonly time = uniform(0);
  private readonly batches: Batch[] = [];
  private readonly meshes: THREE.Mesh[] = [];
  private source: THREE.InstancedBufferGeometry | undefined;
  private pairs: Pair[] = [];
  private capacity = 1;
  private detailVisible = true;
  private lastVersions = [-1,-1,-1];

  constructor(private readonly clock:PresentationClock,private readonly detail?:AnimationDetail) {
    const puff = this.batch('puff', new THREE.DodecahedronGeometry(.7, 3));
    const star = this.batch('star', starGeometry());
    const spike = this.batch('spike', spikeGeometry());
    const voxel = this.batch('voxel', new THREE.BoxGeometry(1,1,1));
    const shadow = this.batch('shadow', shadowGeometry());

    const ink = rgb(0x191614);
    const bounce = sin(referenceTime(this.time).mul(12)).mul(.06 * INTENSITY);
    const centerY = bounce.add(1.45);
    const impactAge = this.time.sub(attribute('aHit','vec4').x);
    const impactOn = impactAge.greaterThanEqual(0).and(impactAge.lessThan(.25));
    const flash = float(1).sub(impactAge.mul(4)).clamp(0,1).mul(impactOn.select(1,0));

    const sampledPosition=(batch:Batch,original:()=>THREE.Node<'vec3'>,outline=0)=>batch.cache.choose(original,()=>batch.cache.affine(outline?positionLocal.add(normalLocal.mul(outline)):positionLocal,int(attribute('aPartThree','vec4').z).mul(5).add(1)));
    const puffPosition = (outline: boolean) => sampledPosition(puff,()=>Fn(() => {
      const one = attribute('aPartOne','vec4'), two = attribute('aPartTwo','vec4'), three = attribute('aPartThree','vec4');
      const t = referenceTime(this.time).mul(two.x).add(two.y);
      const jitter = vec3(sin(t.add(two.y)).mul(.28 * INTENSITY),
        cos(t.mul(1.3).add(two.z)).mul(.22 * INTENSITY),
        sin(t.mul(.8).add(two.y.mul(1.5))).mul(.28 * INTENSITY));
      const pulse = float(1).add(sin(t.mul(2)).mul(.18 * INTENSITY));
      const scale = vec3(one.w.mul(pulse), one.w.div(sqrt(pulse)), one.w.mul(pulse));
      const vertex = (outline ? positionLocal.add(normalLocal.mul(.055)) : positionLocal).mul(scale);
      const axis = vec3(two.w,three.x,three.y), angle = t.mul(1.5);
      const rotated = vertex.mul(cos(angle)).add(cross(axis,vertex).mul(sin(angle)))
        .add(axis.mul(dot(axis,vertex)).mul(float(1).sub(cos(angle))));
      const local = rotated.add(one.xyz).add(jitter).add(vec3(0,centerY,0)).mul(SCALE);
      return pairCenter(this.clock).add(local);
    })(),outline?.055:0);
    const puffFill = new THREE.MeshBasicNodeMaterial();
    puffFill.positionNode = puffPosition(false);
    puffFill.colorNode = Fn(() => {
      const brightness = smoothstep(.2,.28,dot(normalLocal,vec3(.5,.8,.3)).clamp(0,1));
      const tone = mix(rgb(0xd3c7b3),rgb(0xf6f0e4),brightness);
      const sampledFlash=varyingFlash(puff.cache,flash);
      return mix(tone,vec3(1,1,1),sampledFlash);
    })();
    const puffOutline = new THREE.MeshBasicNodeMaterial({side:THREE.BackSide});
    puffOutline.positionNode = puffPosition(true); puffOutline.colorNode = ink;
    this.addMesh(puff,puffFill);this.addMesh(puff,puffOutline);

    const starPosition = (outline: boolean) => sampledPosition(star,()=>Fn(() => {
      const orbit = attribute('aPartOne','vec4'), spin = attribute('aPartTwo','vec4');
      const starAngle = referenceTime(this.time).mul(1.8).add(orbit.z);
      const bob = sin(this.time.mul(orbit.y).add(spin.y)).mul(.45);
      const beat = float(1).add(sin(this.time.mul(8).add(spin.y)).mul(.25));
      const v = outline ? positionLocal.add(normalLocal.mul(.045)) : positionLocal;
      const spinAngle = referenceTime(this.time).mul(spin.x), cs = cos(spinAngle), ss = sin(spinAngle);
      const spun = vec3(v.x.mul(cs).sub(v.y.mul(ss)),v.x.mul(ss).add(v.y.mul(cs)),v.z);
      const facing = float(Math.PI/2).sub(starAngle), cf=cos(facing),sf=sin(facing);
      const turned = vec3(spun.x.mul(cf).add(spun.z.mul(sf)),spun.y,spun.z.mul(cf).sub(spun.x.mul(sf)));
      const local = turned.mul(beat).add(vec3(cos(starAngle).mul(orbit.x),centerY.add(orbit.w).add(bob),sin(starAngle).mul(orbit.x))).mul(SCALE);
      return pairCenter(this.clock).add(local);
    })(),outline?.045:0);
    const starFill = new THREE.MeshBasicNodeMaterial();
    // The prototype supplies linear TSL RGB directly, rather than decoding a
    // CSS/hex sRGB yellow through THREE.Color.
    starFill.positionNode = starPosition(false); starFill.colorNode = vec3(1,.81,0);
    const starOutline = new THREE.MeshBasicNodeMaterial({side:THREE.BackSide});
    starOutline.positionNode = starPosition(true);starOutline.colorNode = ink;
    this.addMesh(star,starFill);this.addMesh(star,starOutline);

    const spikeMaterial = new THREE.MeshBasicNodeMaterial({side:THREE.DoubleSide});
    spikeMaterial.positionNode = sampledPosition(spike,()=>Fn(() => {
      const part = attribute('aPartOne','vec4');
      // The visualizer's free-running ink strokes depict general agitation,
      // independent of the separately confirmed white impact flash.
      const cycle = referenceTime(this.time).mul(2.2).add(part.w).fract();
      const progress = cycle.div(.25);
      const size = float(1).sub(progress).mul(1.2).mul(cycle.lessThan(.25).select(1,0));
      const radius = part.y.add(progress.mul(.8 * INTENSITY));
      const rotation = float(-Math.PI/2).sub(part.x), c=cos(rotation),s=sin(rotation);
      const v = vec3(positionLocal.x.mul(c).sub(positionLocal.y.mul(s)),
        positionLocal.x.mul(s).add(positionLocal.y.mul(c)),positionLocal.z);
      const local = v.mul(vec3(size,size.mul(1.4),size))
        .add(vec3(cos(part.x).mul(radius),centerY.add(part.z),sin(part.x).mul(radius))).mul(SCALE);
      return pairCenter(this.clock).add(local);
    })());
    spikeMaterial.colorNode = ink;
    this.addMesh(spike,spikeMaterial);

    const voxelMaterial = new THREE.MeshBasicNodeMaterial();
    voxelMaterial.positionNode = sampledPosition(voxel,()=>Fn(() => {
      const part=attribute('aPartOne','vec4'), id=part.w;
      const t=referenceTime(this.time).mul(4);
      const head1X=float(-.45).add(sin(t.mul(.7)).mul(.2));
      const head1Y=centerY.add(id.equal(0).select(.85,.70)).add(sin(t.mul(1.2)).mul(.15));
      const head2X=float(.5).add(cos(t.mul(.8)).mul(.2));
      const head2Y=centerY.add(id.equal(2).select(.9,.75)).add(cos(t.mul(1.1)).mul(.15));
      const ext1=sin(t.mul(1.3)).max(0).mul(.8*INTENSITY);
      const ext2=sin(t.mul(1.3).add(Math.PI)).max(0).mul(.8*INTENSITY);
      const punch1=vec3(float(.1).add(ext1),centerY.add(.7).add(sin(t.mul(2)).mul(.1)),float(-.6).sub(ext1.mul(.8)).add(id.equal(5).select(.5,0)));
      const punch2=vec3(float(-.2).sub(ext2),centerY.add(.6).add(cos(t.mul(2)).mul(.1)),float(.5).add(ext2.mul(.8)).add(id.equal(7).select(.5,0)));
      const kick1=sin(t.mul(1.5)).abs(), kick2=cos(t.mul(1.5)).abs();
      const leg1=vec3(float(-1.4).sub(kick1.mul(.35*INTENSITY)),centerY.sub(.3).add(kick1.mul(.2)).sub(id.equal(9).select(.25,0)),float(-.3).add(id.equal(9).select(.15,0)));
      const leg2=vec3(float(1.4).add(kick2.mul(.35*INTENSITY)),centerY.sub(.3).add(kick2.mul(.2)).sub(id.equal(11).select(.25,0)),float(.4).add(id.equal(11).select(.15,0)));
      const offset=id.lessThan(2).select(vec3(head1X,head1Y,id.equal(0).select(-.2,.15)),
        id.lessThan(4).select(vec3(head2X,head2Y,id.equal(2).select(.1,.45)),
          id.lessThan(6).select(punch1,id.lessThan(8).select(punch2,id.lessThan(10).select(leg1,leg2)))));
      return pairCenter(this.clock).add(positionLocal.mul(part.xyz).add(offset).mul(SCALE));
    })());
    voxelMaterial.colorNode = attribute('aPartTwo','vec4').xyz;
    this.addMesh(voxel,voxelMaterial);

    // This flat ground projection has no front/back transparency ordering.
    // Keep compilation and repeated loading passes on the same side variant.
    const shadowMaterial = new THREE.MeshBasicNodeMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,forceSinglePass:true});
    shadowMaterial.positionNode = sampledPosition(shadow,()=>Fn(() => pairCenter(this.clock).add(positionLocal.mul(SCALE)).add(vec3(0,.025,0)))());
    shadowMaterial.colorNode = vec4(rgb(0x5c5344),.45);
    this.addMesh(shadow,shadowMaterial);
    this.setDetailVisible(true);
  }

  private batch(kind:Kind, base:THREE.BufferGeometry):Batch {
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setIndex(base.getIndex()?.clone()??null);
    for(const [name,attribute] of Object.entries(base.attributes))geometry.setAttribute(name,attribute.clone());
    for(const group of base.groups)geometry.addGroup(group.start,group.count,group.materialIndex);
    base.dispose();
    const batch:Batch = {geometry,count:BRAWL_PARTS[kind],kind,cache:new FxAnimationCache(1+BRAWL_PARTS[kind]*5,this.detail),drawn:[]};
    this.batches.push(batch);
    this.allocate(batch,1);
    geometry.instanceCount=0;
    return batch;
  }

  private allocate(batch:Batch, capacity:number):void {
    const total=batch.count*capacity;
    // One vertex-buffer binding for all 10 instance attributes. The WebGPU
    // device limit is eight bindings, whereas ten independent attributes plus
    // position/normal/UV failed pipeline creation even with no live fights.
    const buffer=new THREE.InstancedInterleavedBuffer(new Float32Array(total*44),44);
    buffer.setUsage(THREE.DynamicDrawUsage);
    const attrs=[...partNames,...pairNames].map((name,index)=>{
      const attr=new THREE.InterleavedBufferAttribute(buffer,4,index*4);
      batch.geometry.setAttribute(name,attr);return attr;
    });
    batch.geometry.setAttribute('fxSlot',new THREE.InterleavedBufferAttribute(buffer,1,40));
    for(let pair=0;pair<capacity;pair++)for(let i=0;i<batch.count;i++){
      const data=piece(batch.kind,i),slot=pair*batch.count+i;
      attrs[0]!.setXYZW(slot,...data.one as [number,number,number,number]);
      attrs[1]!.setXYZW(slot,...data.two as [number,number,number,number]);
      attrs[2]!.setXYZW(slot,data.three[0]!,data.three[1]!,i,0);
    }
    buffer.needsUpdate=true;
  }

  private addMesh(batch:Batch,material:THREE.MeshBasicNodeMaterial):void {
    const mesh = new THREE.Mesh(batch.geometry,material);
    mesh.frustumCulled=true;
    this.group.add(mesh);this.meshes.push(mesh);
  }

  /** Called only for confirmed world snapshots, never per visual frame. */
  update(world:World,source:THREE.InstancedBufferGeometry):void {
    this.source=source;
    let potentialFight=false;
    for(const pawn of world.pawns){
      if(pawn.state==='dead'||pawn.state==='downed'||pawn.stun)continue;
      if(pawn.social?.fight||pawn.melee?.order&&!pawn.melee.order.structure||pawn.melee?.strike&&!pawn.melee.strike.structure){potentialFight=true;break;}
    }
    if(!potentialFight){
      this.pairs.length=0;
      for(const batch of this.batches)batch.geometry.instanceCount=0;
      for(const mesh of this.meshes)mesh.visible=false;
      return;
    }
    const pawns=new Map<number,{pawn:Pawn;index:number}>();
    world.pawns.forEach((pawn,index)=>pawns.set(pawn.id,{pawn,index}));
    const pairs:Pair[]=[];
    const seen=new Set<string>();
    for(let index=0;index<world.pawns.length;index++){
      const pawn=world.pawns[index]!;
      if(pawn.state==='dead'||pawn.state==='downed'||pawn.stun||pawn.body?.pileId!==undefined)continue;
      const socialId=pawn.social?.fight?.opponentId;
      const combatId=pawn.melee?.order&&!pawn.melee.order.structure?pawn.melee.order.targetId
        :pawn.melee?.strike&&!pawn.melee.strike.structure?pawn.melee.strike.targetId:undefined;
      const targetId=socialId??combatId;
      if(targetId==null)continue;
      const target=pawns.get(targetId);
      if(!target||target.pawn.state==='dead'||target.pawn.state==='downed'||target.pawn.stun||target.pawn.body?.pileId!==undefined)continue;
      const social=socialId===targetId&&target.pawn.social?.fight?.opponentId===pawn.id;
      const combat=combatId===targetId;
      if(!social&&!combat||Math.hypot(target.pawn.x-pawn.x,target.pawn.z-pawn.z)>1.6)continue;
      const a=Math.min(index,target.index),b=Math.max(index,target.index),key=`${world.pawns[a]!.id}:${world.pawns[b]!.id}`;
      if(seen.has(key))continue;seen.add(key);
      const hitA=pawn.melee?.strike,hitB=target.pawn.melee?.strike;
      const first=hitA?.targetId===target.pawn.id&&!hitA.structure&&hitA.outcome==='hit'?hitA.atCore:-1;
      const second=hitB?.targetId===pawn.id&&!hitB.structure&&hitB.outcome==='hit'?hitB.atCore:-1;
      const hitCore=Math.max(first,second),hitAt=hitCore>=0?hitCore/60:-1000;
      const ids=world.pawns[a]!.id*73856093^world.pawns[b]!.id*19349663;
      pairs.push({a,b,key,hitAt,seed:(ids>>>0)%4096/4096*Math.PI*2});
    }
    const old=this.pairs;this.pairs=pairs;
    for(const batch of this.batches){let membership=old.length!==pairs.length;for(let i=0;i<pairs.length;i++){const a=old[i],b=pairs[i]!;if(!a||a.key!==b.key||a.a!==b.a||a.b!==b.b||a.hitAt!==b.hitAt){batch.cache.invalidate(i);membership=true;}}if(membership)batch.drawn=[];}
    if(pairs.length>this.capacity){while(this.capacity<pairs.length)this.capacity*=2;for(const batch of this.batches)this.allocate(batch,this.capacity);}
    for(const batch of this.batches)batch.geometry.instanceCount=pairs.length*batch.count;
    this.lastVersions=[-1,-1,-1];
    if(!this.detail)this.syncPose();
    if(pairs.length){
      let minX=Infinity,minZ=Infinity,maxX=-Infinity,maxZ=-Infinity;
      for(const pair of pairs){for(const index of [pair.a,pair.b]){const pawn=world.pawns[index]!;minX=Math.min(minX,pawn.x);maxX=Math.max(maxX,pawn.x);minZ=Math.min(minZ,pawn.z);maxZ=Math.max(maxZ,pawn.z);}}
      const cx=(minX+maxX)/2,cz=(minZ+maxZ)/2,radius=Math.hypot(maxX-minX,maxZ-minZ)/2+BOUND_PADDING;
      for(const batch of this.batches){const sphere=batch.geometry.boundingSphere??new THREE.Sphere();sphere.center.set(cx,1,cz);sphere.radius=radius;batch.geometry.boundingSphere=sphere;}
    }
    this.setDetailVisible(this.detailVisible);
  }

  private syncPose():void {
    if(!this.source||!this.pairs.length)return;
    const sources=poseNames.map(name=>this.source!.getAttribute(name) as Float4Attribute);
    const versions=sources.map(versionOf);
    if(versions.every((version,index)=>version===this.lastVersions[index]))return;
    this.lastVersions=versions;
    for(const batch of this.batches){
      const attrs=pairNames.map(name=>batch.geometry.getAttribute(name) as THREE.InterleavedBufferAttribute);
      for(let pairIndex=0;pairIndex<this.pairs.length;pairIndex++){
        const pair=this.pairs[pairIndex]!;
        for(let local=0;local<batch.count;local++){
          const slot=pairIndex*batch.count+local;
          for(let actor=0;actor<2;actor++)for(let field=0;field<3;field++){
            const input=sources[field]!,index=actor?pair.b:pair.a;
            attrs[actor*3+field]!.setXYZW(slot,input.getX(index),input.getY(index),input.getZ(index),input.getW(index));
          }
          attrs[6]!.setXYZW(slot,pair.hitAt,pair.seed,pair.a,pair.b);
        }
      }
      attrs[0]!.data.needsUpdate=true;
    }
  }

  present(tick:number):void {
    this.time.value=tick/TICKS_PER_SECOND;
    if(!this.detail){this.syncPose();return;}
    if(!this.source||!this.pairs.length)return;
    const sources=poseNames.map(name=>this.source!.getAttribute(name) as Float4Attribute),versions=sources.map(versionOf),changed=versions.some((v,i)=>v!==this.lastVersions[i]);this.lastVersions=versions;
    const to=sources[1]!;
    for(const batch of this.batches){
      const attrs=pairNames.map(name=>batch.geometry.getAttribute(name) as THREE.InterleavedBufferAttribute),slots=batch.geometry.getAttribute('fxSlot') as THREE.InterleavedBufferAttribute;
      let count=0,dirty=false;
      for(let row=0;row<this.pairs.length;row++){
        const pair=this.pairs[row]!,x=(to.getX(pair.a)+to.getX(pair.b))*.5,y=(to.getY(pair.a)+to.getY(pair.b))*.5,z=(to.getZ(pair.a)+to.getZ(pair.b))*.5;
        const level=batch.cache.sample(row,x,y,z,()=>this.bakePair(batch,row,pair));if(level===2)continue;
        if(batch.drawn[count]!==row||level===0&&changed){
          for(let local=0;local<batch.count;local++){
            const slot=count*batch.count+local;
            for(let actor=0;actor<2;actor++)for(let field=0;field<3;field++){const input=sources[field]!,index=actor?pair.b:pair.a;attrs[actor*3+field]!.setXYZW(slot,input.getX(index),input.getY(index),input.getZ(index),input.getW(index));}
            attrs[6]!.setXYZW(slot,pair.hitAt,pair.seed,pair.a,pair.b);slots.setX(slot,row);
          }
          batch.drawn[count]=row;dirty=true;
        }count++;
      }
      batch.drawn.length=count;batch.geometry.instanceCount=count*batch.count;if(dirty)attrs[0]!.data.needsUpdate=true;batch.cache.flush();
    }
    for(const mesh of this.meshes)mesh.visible=this.detailVisible&&(mesh.geometry as THREE.InstancedBufferGeometry).instanceCount>0;
  }

  private bakePair(batch:Batch,row:number,pair:Pair):void {
    const a=fxActorPose(this.source!,this.clock,pair.a),b=fxActorPose(this.source!,this.clock,pair.b),time=this.time.value,reference=time*SPEED+pair.seed;
    const center:[number,number,number]=[(a.x+b.x)*.5,(a.y+b.y)*.5,(a.z+b.z)*.5],centerY=Math.sin(reference*12)*.06*INTENSITY+1.45;
    const age=time-pair.hitAt,flash=age>=0&&age<.25?fxClamp(1-age*4):0;
    const parts=partNames.map(name=>batch.geometry.getAttribute(name) as THREE.InterleavedBufferAttribute);
    for(let local=0;local<batch.count;local++){
      const one=parts[0]!,two=parts[1]!,three=parts[2]!,at=1+local*5;
      let sx=1,sy=1,sz=1,px=0,py=0,pz=0,xx=1,xy=0,xz=0,yx=0,yy=1,yz=0,zx=0,zy=0,zz=1;
      if(batch.kind==='puff'){
        const t=reference*two.getX(local)+two.getY(local),pulse=1+Math.sin(t*2)*.18*INTENSITY;
        sx=sz=one.getW(local)*pulse;sy=one.getW(local)/Math.sqrt(pulse);
        px=one.getX(local)+Math.sin(t+two.getY(local))*.28*INTENSITY;py=one.getY(local)+Math.cos(t*1.3+two.getZ(local))*.22*INTENSITY+centerY;pz=one.getZ(local)+Math.sin(t*.8+two.getY(local)*1.5)*.28*INTENSITY;
        const ax=two.getW(local),ay=three.getX(local),az=three.getY(local),c=Math.cos(t*1.5),s=Math.sin(t*1.5),k=1-c;
        xx=c+ax*ax*k;xy=az*s+ay*ax*k;xz=-ay*s+az*ax*k;
        yx=-az*s+ax*ay*k;yy=c+ay*ay*k;yz=ax*s+az*ay*k;
        zx=ay*s+ax*az*k;zy=-ax*s+ay*az*k;zz=c+az*az*k;
      }else if(batch.kind==='star'){
        const angle=reference*1.8+one.getZ(local),spin=reference*two.getX(local),c=Math.cos(spin),s=Math.sin(spin),cf=Math.cos(Math.PI/2-angle),sf=Math.sin(Math.PI/2-angle);
        sx=sy=sz=1+Math.sin(time*8+two.getY(local))*.25;
        xx=c*cf;xy=s;xz=-c*sf;yx=-s*cf;yy=c;yz=s*sf;zx=sf;zy=0;zz=cf;
        px=Math.cos(angle)*one.getX(local);py=centerY+one.getW(local)+Math.sin(time*one.getY(local)+two.getY(local))*.45;pz=Math.sin(angle)*one.getX(local);
      }else if(batch.kind==='spike'){
        const cycle=fxFract(reference*2.2+one.getW(local)),progress=cycle/.25,size=(1-progress)*1.2*(cycle<.25?1:0),radius=one.getY(local)+progress*.8*INTENSITY;
        sx=sz=size;sy=size*1.4;
        // The original rotates first, then scales world X/Y (not local axes).
        const c=Math.cos(-Math.PI/2-one.getX(local)),s=Math.sin(-Math.PI/2-one.getX(local));xx=c*sx;xy=s*sy;yx=-s*sx;yy=c*sy;sx=sy=1;
        px=Math.cos(one.getX(local))*radius;py=centerY+one.getZ(local);pz=Math.sin(one.getX(local))*radius;
      }else if(batch.kind==='voxel'){
        sx=one.getX(local);sy=one.getY(local);sz=one.getZ(local);const id=one.getW(local),t=reference*4;
        if(id<2){px=-.45+Math.sin(t*.7)*.2;py=centerY+(id===0?.85:.70)+Math.sin(t*1.2)*.15;pz=id===0?-.2:.15;}
        else if(id<4){px=.5+Math.cos(t*.8)*.2;py=centerY+(id===2?.9:.75)+Math.cos(t*1.1)*.15;pz=id===2?.1:.45;}
        else if(id<6){const ext=Math.max(0,Math.sin(t*1.3))*.8*INTENSITY;px=.1+ext;py=centerY+.7+Math.sin(t*2)*.1;pz=-.6-ext*.8+(id===5?.5:0);}
        else if(id<8){const ext=Math.max(0,Math.sin(t*1.3+Math.PI))*.8*INTENSITY;px=-.2-ext;py=centerY+.6+Math.cos(t*2)*.1;pz=.5+ext*.8+(id===7?.5:0);}
        else if(id<10){const kick=Math.abs(Math.sin(t*1.5));px=-1.4-kick*.35*INTENSITY;py=centerY-.3+kick*.2-(id===9?.25:0);pz=-.3+(id===9?.15:0);}
        else{const kick=Math.abs(Math.cos(t*1.5));px=1.4+kick*.35*INTENSITY;py=centerY-.3+kick*.2-(id===11?.25:0);pz=.4+(id===11?.15:0);}
      }else{py=.025/SCALE;}
      batch.cache.set(row,at,xx*sx*SCALE,xy*sx*SCALE,xz*sx*SCALE);
      batch.cache.set(row,at+1,yx*sy*SCALE,yy*sy*SCALE,yz*sy*SCALE);
      batch.cache.set(row,at+2,zx*sz*SCALE,zy*sz*SCALE,zz*sz*SCALE);
      batch.cache.set(row,at+3,center[0]+px*SCALE,center[1]+py*SCALE,center[2]+pz*SCALE);
      batch.cache.set(row,at+4,flash);
    }
  }

  setDetailVisible(visible:boolean):void {
    this.detailVisible=visible;
    for(const mesh of this.meshes)mesh.visible=visible&&this.pairs.length>0;
  }

  prepareForCompile():()=>void {
    const states=this.meshes.map(mesh=>({mesh,visible:mesh.visible,culled:mesh.frustumCulled}));
    const counts=this.batches.map(batch=>batch.geometry.instanceCount);
    for(const batch of this.batches)batch.geometry.instanceCount=Math.max(1,batch.geometry.instanceCount);
    for(const mesh of this.meshes){mesh.visible=true;mesh.frustumCulled=false;}
    return()=>{this.batches.forEach((batch,index)=>{batch.geometry.instanceCount=counts[index]!;});
      for(const state of states){state.mesh.visible=state.visible;state.mesh.frustumCulled=state.culled;}};
  }

  dispose():void {
    for(const batch of this.batches){batch.cache.dispose();batch.geometry.dispose();}
    for(const mesh of this.meshes){if(Array.isArray(mesh.material))mesh.material.forEach(material=>material.dispose());else mesh.material.dispose();}
    this.group.clear();
  }
}
