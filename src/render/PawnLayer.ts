import { appearanceOf } from '../sim/pawn-appearance';
import { appearanceShape,pawnBaseColor } from './pawn-appearance-shape';
import { pawnMorph,hiddenAppearancePart } from './pawn-appearance-nodes';
import { BIOME_CARGO } from './biome-cargo';
import { isAnimalMeat } from '../sim/biome-items';
import type { ApparelItem } from '../sim/apparel-rules';
import { firePosition } from '../sim/fire-rules';
import { attachedFireMesh } from './FireLayer';
import { apparelProjection,apparelAppearance,APPAREL_CARGO } from './character-apparel';
import { coreTimeSeconds,localTimeSeconds } from '../bridge/clock-rate';
import { growPawnBuffers } from './pawn-buffers';
import { isColonist } from '../sim/affiliation';
import { pawnGeometry,cargoGeometry,PARKA_HOOD_DYE } from './pawn-geometry';
import { equipmentProjection } from './character-equipment';
import { WEAPON_VISUALS,weaponVisual } from './weapon-shape';
import { doorAt } from '../sim/door-rules';
import { blockCargoKind } from './block-presentation';
import { furnitureSurfaces } from './furniture-motion';
import { pawnPresentationPose } from './pawn-presentation';
import { headingAt,turnToward,TURN_TICKS,type TurnHeading } from './turn-presentation';
import { pawnWorkPose,workApproach,WORK_POSE } from './work-presentation';
import { constructionWorkTarget } from '../sim/construction-rules';
import { pawnSelectionMesh } from './PawnSelectionLayer';
import type { MotionTimeline } from './MotionTimeline';
import * as THREE from 'three/webgpu';
import { Fn, If, attribute, cos, float, mix, positionLocal, sin, uniform, vec3 } from 'three/tsl';
import { TICKS_PER_SECOND,type World } from '../sim/types';
import { chunkCargoKind } from './chunk-presentation';
import { adjacentTable } from '../sim/dining';
import { CARRY_CAPACITY, footprintCells } from '../sim/definitions';
import { PAWN_MODEL_SCALE, WORLD_SCALE } from '../world/scale';
import { clearGroup, material } from './primitives';
import { createStylizedSurfaceTexture } from './stylized-surfaces';
import { pawnSurfaceShade } from './actor-surface';
type VisualPawn = { from: THREE.Vector4; to: THREE.Vector4 };
type ApproachTransition = { fromX:number; fromZ:number; toX:number; toZ:number; start:number; baseX:number; baseZ:number };
const APPROACH_TICKS=.24*TICKS_PER_SECOND;
function approachAt(transition:ApproachTransition,tick:number):{x:number;z:number} {
  const alpha=THREE.MathUtils.clamp((tick-transition.start)/APPROACH_TICKS,0,1);
  return {x:THREE.MathUtils.lerp(transition.fromX,transition.toX,alpha),z:THREE.MathUtils.lerp(transition.fromZ,transition.toZ,alpha)};
}
const scratchColor = new THREE.Color();

export class PawnLayer {
  private selected:ReadonlySet<number>=new Set();
  private pawnIds:number[]=[];
  private selectionMesh:THREE.Mesh|null=null;
  setSelected(ids:ReadonlySet<number>):void {
    this.selected=ids;
    if(!this.selectionMesh)return;
    const flags=this.selectionMesh.geometry.getAttribute('aSelected') as THREE.InstancedBufferAttribute;
    this.pawnIds.forEach((id,i)=>flags.setX(i,ids.has(id)?1:0));flags.needsUpdate=true;
  }
  readonly group = new THREE.Group();
  readonly time = uniform(0);
  readonly travelTime = uniform(0);
  readonly blend = uniform(1);
  readonly visuals = new Map<number, VisualPawn>();
  private pawnMesh: THREE.Mesh | null = null;
  private readonly surfaceTexture = createStylizedSurfaceTexture();
  private plainMaterial: THREE.MeshStandardNodeMaterial | null = null;
  private texturedMaterial: THREE.MeshStandardNodeMaterial | null = null;
  private texturesEnabled = true;
  get feedbackSource():THREE.InstancedBufferGeometry|undefined {return this.pawnMesh?.geometry as THREE.InstancedBufferGeometry|undefined;}
  private cargoMesh: THREE.Mesh | null = null;
  private fireMesh: THREE.Mesh | null = null;
  private readonly targetPoses = new Map<number,THREE.Vector4>();
  private readonly pawnIndices = new Map<number,number>();
  private readonly headings = new Map<number,TurnHeading>();
  private readonly workPoses = new Map<number,number>();
  private readonly workOffsets = new Map<number,{x:number;z:number}>();
  private readonly approachTransitions = new Map<number,ApproachTransition>();
  private readonly departureOffsets = new Map<number,{start:number;x:number;z:number}>();
  private travelSurfaces:ReadonlyMap<number,number>=new Map();
  private rescuePairs:readonly (readonly [number,number])[]=[];
  constructor(private readonly configure?: (material: THREE.MeshStandardNodeMaterial) => void) {}
  setTexturesEnabled(enabled: boolean): void {
    if (this.texturesEnabled === enabled) return;
    this.texturesEnabled = enabled;
    if (this.pawnMesh) this.pawnMesh.material = enabled ? this.texturedMaterial! : this.plainMaterial!;
  }
  private readonly travelKeys = new Map<number,string>();
  private createPawnMesh(count: number): void {
    clearGroup(this.group);
    const geometry = pawnGeometry();
    const travel = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    for(let i=0;i<count;i++)travel.setW(i,1);
    geometry.setAttribute('aTravel', travel);
    geometry.setAttribute('aFrom', new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4));
    geometry.setAttribute('aTo', new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4));
    geometry.setAttribute('aMotion', new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4));
    // One resident appearance stream leaves WebGPU within its eight-buffer limit.
    const appearance=new THREE.InstancedInterleavedBuffer(new Float32Array(count*17),17).setUsage(THREE.StaticDrawUsage);
    for(const [name,size,offset] of [['aTint',3,0],['aEquipment',4,3],['aSkin',3,7],['aHair',3,10],['aShape',4,13]] as const)
      geometry.setAttribute(name,new THREE.InterleavedBufferAttribute(appearance,size,offset));
    geometry.setAttribute('aCargo', new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2));
    for (const name of ['aFrom', 'aTo', 'aMotion', 'aCargo', 'aTravel']) (geometry.getAttribute(name) as THREE.InstancedBufferAttribute).setUsage(THREE.StaticDrawUsage);
    const mat = material(0xffffff);
    this.configure?.(mat);
    mat.positionNode = Fn(() => {
      const bone = attribute('boneId', 'float');
      const pivot = pawnMorph(attribute('bindPivot', 'vec3'));
      const motion = attribute('aMotion', 'vec4');
      const pose = pawnPresentationPose(this);
      const angle = float(0).toVar();
      const sign = float(1).toVar();
      If(bone.equal(3).or(bone.equal(4)).or(bone.equal(6)), () => { sign.assign(-1); });
      If(bone.greaterThan(1.5), () => {
        angle.assign(sin(this.time.mul(9).add(motion.w)).mul(motion.x).mul(sign).mul(0.65));
        If(bone.lessThan(3.5), () => {
          If(motion.y.greaterThan(0).and(motion.z.lessThan(10.5)),()=>{
            angle.addAssign(sin(this.time.mul(12).add(motion.w)).mul(0.35).sub(0.8));
          });
          If(attribute('aCargo', 'vec2').x.abs().greaterThan(0.5), () => {
            angle.assign(float(-0.9).add(sin(this.time.mul(9).add(motion.w)).mul(motion.x).mul(0.06)));
            If(motion.z.greaterThan(1.5), () => { angle.assign(float(-1.3).add(sin(this.time.mul(4).add(motion.w)).mul(0.22))); });
          });
        });
      });
      // Four deliberately small work silhouettes, evaluated in the existing
      // rigid rig. No per-pawn skeleton or animation upload is needed.
      const stroke=sin(this.time.mul(11).add(motion.w));
      If(motion.z.equal(WORK_POSE.mine).and(bone.greaterThan(1.5)).and(bone.lessThan(3.5)),()=>{
        angle.assign(stroke.mul(.78).sub(1.44));
      });
      If(motion.z.equal(WORK_POSE.chop).and(bone.greaterThan(1.5)).and(bone.lessThan(3.5)),()=>{
        angle.assign(bone.equal(3).select(stroke.mul(.95).sub(1.25),float(-.64)));
      });
      If(motion.z.equal(WORK_POSE.build).and(bone.greaterThan(1.5)).and(bone.lessThan(3.5)),()=>{
        angle.assign(bone.equal(3).select(stroke.mul(.53).sub(.92),float(-.45)));
      });
      If(motion.z.equal(WORK_POSE.craft).and(bone.greaterThan(1.5)).and(bone.lessThan(3.5)),()=>{
        angle.assign(stroke.mul(bone.equal(3).select(float(-.42),float(.42))).sub(.92));
      });
      If(motion.z.equal(WORK_POSE.ground).or(motion.z.equal(WORK_POSE.groundMelee)).and(bone.greaterThan(1.5)).and(bone.lessThan(3.5)),()=>{
        angle.assign(stroke.mul(bone.equal(3).select(float(-.29),float(.29))).sub(.22));
      });
      If(bone.equal(1).and(motion.x.greaterThan(.5)),()=>{
        angle.assign(sin(this.time.mul(9).add(motion.w)).mul(.045));
      });
      If(motion.z.greaterThan(2.5).and(motion.z.lessThan(3.5)).and(bone.greaterThan(3.5)), () => {
        angle.assign(bone.lessThan(5.5).select(float(-Math.PI / 2), float(0)));
      });
      If(motion.z.equal(8).and(bone.greaterThan(1.5)).and(bone.lessThan(3.5)),()=>{angle.assign(sin(this.travelTime.sub(motion.w).mul(4).clamp(0,1).mul(Math.PI)).mul(-1.7));});
      If(motion.z.equal(WORK_POSE.groundMelee).and(bone.greaterThan(1.5)).and(bone.lessThan(3.5)),()=>{
        angle.assign(sin(this.travelTime.sub(motion.w).mul(4).clamp(0,1).mul(Math.PI)).mul(-.9).sub(.2));
      });
      const shooting=motion.z.equal(7).or(motion.z.equal(15));
      If(shooting.and(bone.greaterThan(1.5)).and(bone.lessThan(3.5)),()=>{
        angle.assign(bone.equal(3).select(float(-1.54),float(-1.12)));
      });
      If(motion.z.equal(4).and(bone.equal(3)), () => { angle.assign(sin(this.time.mul(2).add(motion.w)).mul(1.1).sub(.35)); });
      const local = pawnMorph(positionLocal).sub(pivot);
      const c = cos(angle), s = sin(angle);
      const animated = vec3(local.x, local.y.mul(c).sub(local.z.mul(s)), local.y.mul(s).add(local.z.mul(c))).add(pivot).toVar();
      If(motion.z.equal(WORK_POSE.ground).or(motion.z.equal(WORK_POSE.groundMelee)),()=>{
        // Compress the legs around grounded feet and tip the upper body over
        // the contact point. Every part still belongs to the resident rig.
        If(bone.greaterThan(3.5),()=>{animated.y.assign(animated.y.sub(.11).mul(.72).add(.11));});
        If(bone.lessThan(3.5),()=>{
          const y=animated.y.sub(.61).toVar(),z=animated.z.toVar();
          animated.y.assign(y.mul(.91).sub(z.mul(.42)).add(.46));
          animated.z.assign(y.mul(.42).add(z.mul(.91)).add(.10));
        });
      });
      If(motion.z.greaterThan(2.5).and(motion.z.lessThan(3.5)), () => {
        // Thigh rotates around the hip; the lower leg keeps its vertical pose
        // at the translated knee. Two extra rigid bones, no CPU skeleton update.
        If(bone.greaterThan(5.5), () => { animated.y.addAssign(0.21); animated.z.addAssign(0.21); });
        animated.y.addAssign(WORLD_SCALE.stoolHeight / PAWN_MODEL_SCALE - 0.605);
      });
      If(motion.z.equal(1).or(motion.z.equal(5)), () => {
        const y = animated.y.toVar();
        animated.y.assign(animated.z.add(0.19));
        animated.z.assign(float(0.65).sub(y));
      });
      If(motion.z.equal(10).and(bone.lessThan(3.5)),()=>{
        const y=animated.y.sub(.48).toVar(),z=animated.z.toVar();
        animated.y.assign(y.mul(.82).sub(z.mul(.57)).add(.48));animated.z.assign(y.mul(.57).add(z.mul(.82)));
      });
      If(motion.z.equal(6),()=>{
        const x=animated.x.toVar(),y=animated.y.toVar(),z=animated.z.toVar();
        animated.assign(vec3(float(.65).sub(y),z.add(.19+.95/PAWN_MODEL_SCALE),x.add(.3)));
      });
      // The first confirmed cooldown image can arrive one local tick after
      // the shot (0.134 s in the native pilot). Keep the cosmetic kick short
      // but long enough to survive that presentation boundary.
      const recoil=motion.z.equal(15).select(float(1).sub(this.travelTime.sub(motion.w).div(.30)).clamp(0,1),float(0));
      for(const weapon of WEAPON_VISUALS) {
        const isWeapon=attribute('dye','float').equal(weapon.dye);
        const along=positionLocal.y.sub(.68),across=positionLocal.x.sub(.205),depth=positionLocal.z;
        if(weapon.item==='bolt-action-rifle') {
          // High diagonal sling at rest: the long gun remains legible above
          // the torso. During aim its authored barrel (+Y) points forward.
          If(isWeapon,()=>animated.assign(vec3(along.mul(.30).add(across).add(.13),along.mul(.78).add(depth.mul(.12)).add(.84),depth.mul(.8).add(.25))));
          If(shooting.and(isWeapon),()=>animated.assign(vec3(across.add(.10),depth.add(1.02).add(recoil.mul(.035)),along.add(.45).sub(recoil.mul(.12)))));
        } else {
          If(isWeapon,()=>animated.assign(vec3(across.add(.32),along.mul(.82).add(.67),depth.add(.17))));
          If(shooting.and(isWeapon),()=>animated.assign(vec3(across.add(.19),depth.add(.99).add(recoil.mul(.035)),along.add(.44).sub(recoil.mul(.09)))));
          if(weapon.item==='plasteel-knife')If(motion.z.equal(8).or(motion.z.equal(WORK_POSE.groundMelee)).and(isWeapon),()=>{
            const reach=sin(this.travelTime.sub(motion.w).mul(4).clamp(0,1).mul(Math.PI));
            animated.assign(vec3(across.add(.23),depth.add(.83),along.add(.38).add(reach.mul(.2))));
          });
        }
        If(isWeapon.and(attribute('aEquipment','vec4').x.notEqual(weapon.equipment)),()=>{animated.assign(vec3(0));});
      }
      If(attribute('dye','float').equal(-3).and(attribute('aEquipment','vec4').y.notEqual(2).and(attribute('aEquipment','vec4').y.notEqual(3))),()=>{animated.assign(vec3(0));});
      If(attribute('dye','float').equal(-2).and(attribute('aEquipment','vec4').z.lessThan(.5)),()=>{animated.assign(vec3(0));});
      If(attribute('dye','float').equal(PARKA_HOOD_DYE).and(attribute('aEquipment','vec4').y.notEqual(4)),()=>{animated.assign(vec3(0));});
      If(hiddenAppearancePart(),()=>animated.assign(vec3(0)));
      const cy = cos(pose.w), sy = sin(pose.w);
      return vec3(animated.x.mul(cy).add(animated.z.mul(sy)), animated.y, animated.z.mul(cy).sub(animated.x.mul(sy))).mul(PAWN_MODEL_SCALE).add(pose.xyz);
    })();
    const baseColor = Fn(()=>{const tint=mix(attribute('color','vec3'),attribute('aTint','vec3'),attribute('dye','float').equal(1).select(float(1),float(0))).toVar();
      If(attribute('dye','float').equal(-3).or(attribute('dye','float').equal(PARKA_HOOD_DYE)),()=>tint.assign(attribute('aTint','vec3')));
      If(attribute('aEquipment','vec4').y.equal(2).and(attribute('boneId','float').greaterThanEqual(2)).and(attribute('boneId','float').lessThanEqual(3)),()=>tint.assign(attribute('aSkin','vec3')));
      If(attribute('dye','float').equal(2),()=>tint.assign(attribute('aSkin','vec3')));
      If(attribute('dye','float').greaterThanEqual(100),()=>tint.assign(attribute('aHair','vec3')));
      const legs=attribute('boneId','float').greaterThanEqual(4).and(attribute('dye','float').equal(0));
      const cloth=new THREE.Color(0xd8c8a2),leather=new THREE.Color(0xad8a61);
      If(legs.and(attribute('aEquipment','vec4').w.equal(1)),()=>tint.assign(vec3(cloth.r,cloth.g,cloth.b)));
      If(legs.and(attribute('aEquipment','vec4').w.equal(2)),()=>tint.assign(vec3(leather.r,leather.g,leather.b)));
      {const color=new THREE.Color(0xa88b63);If(legs.and(attribute('aEquipment','vec4').w.equal(3)),()=>tint.assign(vec3(color.r,color.g,color.b)));}
      {const color=new THREE.Color(0x839ac5);If(legs.and(attribute('aEquipment','vec4').w.equal(4)),()=>tint.assign(vec3(color.r,color.g,color.b)));}
      {const color=new THREE.Color(0xc3a375);If(legs.and(attribute('aEquipment','vec4').w.equal(5)),()=>tint.assign(vec3(color.r,color.g,color.b)));}return tint;})();
    mat.colorNode = baseColor;
    const textured = material(0xffffff);
    this.configure?.(textured);
    textured.positionNode = mat.positionNode;
    textured.colorNode = baseColor.mul(pawnSurfaceShade(this.surfaceTexture));
    // Both pipelines survive map changes; the plain node graph contains no
    // pigment sampling and the shared rig/instance geometry never changes.
    mat.userData.rendererOwned = textured.userData.rendererOwned = true;
    this.plainMaterial = mat;
    this.texturedMaterial = textured;
    const mesh = new THREE.Mesh(geometry, this.texturesEnabled ? textured : mat);
    // CPU bounds cannot follow the shader positions. Individual culling/LOD is a later measured optimization.
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'Colonists — procedural eight-bone GPU rig';
    this.pawnMesh = mesh;
    this.group.add(mesh);
    const cargo = cargoGeometry();
    for (const name of ['aFrom', 'aTo', 'aCargo', 'aMotion', 'aTravel']) cargo.setAttribute(name, geometry.getAttribute(name));
    const cargoMat = material(0xffffff);
    this.configure?.(cargoMat);
    cargoMat.colorNode = attribute('color', 'vec3');
    cargoMat.positionNode = Fn(() => {
      const pose = pawnPresentationPose(this);
      const load = attribute('aCargo', 'vec2');
      const scale = float(0).toVar();
      If(attribute('cargoKind', 'float').equal(load.x), () => { scale.assign(load.y.mul(0.25).add(0.75)); });
      const height = float(WORLD_SCALE.carriedHeight).toVar();
      If(attribute('aMotion','vec4').z.equal(1),()=>{height.assign(.28);});
      If(attribute('aMotion', 'vec4').z.greaterThan(1.5).and(attribute('aMotion','vec4').z.lessThan(3.5)), () => { height.assign(sin(this.time.mul(4).add(attribute('aMotion', 'vec4').w)).mul(0.08).add(1.32)); });
      If(attribute('aMotion', 'vec4').z.equal(3), () => { height.addAssign(WORLD_SCALE.stoolHeight - 0.605 * PAWN_MODEL_SCALE); });
      If(attribute('aMotion','vec4').z.equal(6),()=>{height.assign(1.3);});
      const local = positionLocal.mul(scale).add(vec3(0, height, WORLD_SCALE.carriedForward));
      const cy = cos(pose.w), sy = sin(pose.w);
      return vec3(local.x.mul(cy).add(local.z.mul(sy)), local.y, local.z.mul(cy).sub(local.x.mul(sy))).add(pose.xyz);
    })();
    this.cargoMesh = new THREE.Mesh(cargo, cargoMat);
    this.cargoMesh.name = 'Carried materials — shared GPU pawn poses';
    this.cargoMesh.frustumCulled = false;
    this.cargoMesh.castShadow = true;
    this.cargoMesh.receiveShadow = true;
    this.group.add(this.cargoMesh);
    this.fireMesh=attachedFireMesh(geometry,this);this.group.add(this.fireMesh);
    this.selectionMesh=pawnSelectionMesh(geometry,this);this.group.add(this.selectionMesh);
  }

  update(world: World, oldBlend: number, newMap: boolean): void {
    this.travelKeys.clear();this.travelSurfaces=furnitureSurfaces(world);
    if(newMap){this.headings.clear();this.approachTransitions.clear();this.departureOffsets.clear();this.workOffsets.clear();}
    const indices=new Map(world.pawns.map((p,i)=>[p.id,i]));
    this.rescuePairs=world.pawns.flatMap((p,i)=>p.rescue?.phase==='carry'&&indices.has(p.rescue.patientId)?[[i,indices.get(p.rescue.patientId)!] as const]:[]);
    this.rescuePairs=[...this.rescuePairs,...world.piles.flatMap(p=>p.humanCorpse&&p.owner.type==='pawn'&&indices.has(p.owner.pawnId)&&indices.has(p.humanCorpse.pawnId)?[[indices.get(p.owner.pawnId)!,indices.get(p.humanCorpse.pawnId)!] as const]:[])];
    const bodies=new Map(world.piles.filter(p=>p.humanCorpse).map(p=>[p.humanCorpse!.pawnId,p]));
    if (!this.pawnMesh) this.createPawnMesh(Math.max(1,world.pawns.length));
    else if(this.pawnMesh.geometry.getAttribute('aFrom').count<world.pawns.length)growPawnBuffers([this.pawnMesh,this.cargoMesh!,this.selectionMesh!,this.fireMesh!],world.pawns.length);
    const geometry = this.pawnMesh!.geometry as THREE.InstancedBufferGeometry;
    const flames=geometry.getAttribute('aFire') as THREE.InstancedBufferAttribute;
    const burning=new Map((world.fires?.items??[]).filter(f=>f.attachedPawnId!==undefined).map(f=>[f.attachedPawnId!,f.size]));
    world.pawns.forEach((p,i)=>flames.setX(i,burning.has(p.id)?Math.max(.5,burning.get(p.id)!):0));
    if(!world.pawns.length)flames.setX(0,0);flames.needsUpdate=true;
    (this.fireMesh!.geometry as THREE.InstancedBufferGeometry).instanceCount=world.pawns.length;
    const fromAttribute = geometry.getAttribute('aFrom') as THREE.InstancedBufferAttribute;
    const toAttribute = geometry.getAttribute('aTo') as THREE.InstancedBufferAttribute;
    const travelAttribute = geometry.getAttribute('aTravel') as THREE.InstancedBufferAttribute;
    const presented=new Map<number,{x:number;z:number}>();
    if(!newMap)for(const [id,index] of this.pawnIndices){
      const start=travelAttribute.getX(index),end=travelAttribute.getY(index);
      const alpha=end>start?THREE.MathUtils.clamp((this.travelTime.value-start)/(end-start),0,1):oldBlend;
      presented.set(id,{x:THREE.MathUtils.lerp(fromAttribute.getX(index),toAttribute.getX(index),alpha),z:THREE.MathUtils.lerp(fromAttribute.getZ(index),toAttribute.getZ(index),alpha)});
    }
    const motion = geometry.getAttribute('aMotion') as THREE.InstancedBufferAttribute;
    const tint = geometry.getAttribute('aTint') as THREE.InterleavedBufferAttribute;
    const skin=geometry.getAttribute('aSkin'),hair=geometry.getAttribute('aHair'),shape=geometry.getAttribute('aShape');
    const cargo = geometry.getAttribute('aCargo') as THREE.InstancedBufferAttribute;
    const equipment=geometry.getAttribute('aEquipment') as THREE.InterleavedBufferAttribute,gears=equipmentProjection(world),apparel=apparelProjection(world);
    const carried = new Map<number, World['piles'][number]>();
    for (const pile of world.piles) if (pile.owner.type === 'pawn') carried.set(pile.owner.pawnId, pile);
    const present = new Set<number>();
    world.pawns.forEach((pawn, index) => {
      present.add(pawn.id);
      const previous = newMap ? undefined : this.visuals.get(pawn.id);
      // A stationary actor retains its last travel heading after a save reload.
      // Work with an external target and bed posture override it below.
      const initialYaw=pawn.motion?Math.atan2(pawn.motion.to.x-pawn.motion.from.x,pawn.motion.to.z-pawn.motion.from.z):Math.PI*.2;
      const from = previous ? previous.from.clone().lerp(previous.to, oldBlend) : new THREE.Vector4(pawn.x, 0, pawn.z, initialYaw);
      const lastShown=presented.get(pawn.id);
      if(lastShown){from.x=lastShown.x;from.z=lastShown.z;}
      const priorHeading=this.headings.get(pawn.id);
      if(priorHeading)from.w=headingAt(priorHeading,world.tick);
      let yaw = from.w;
      const dx = pawn.x - from.x, dz = pawn.z - from.z;
      if (dx * dx + dz * dz > 0.01) {
        const target = Math.atan2(dx, dz);
        yaw = from.w + Math.atan2(Math.sin(target - from.w), Math.cos(target - from.w));
      }
      const bedId = pawn.need?.kind === 'sleep' ? pawn.need.bedId : null;
      if(pawn.feed?.phase==='feed'){const p=world.pawns.find(p=>p.id===pawn.feed!.patientId);if(p)yaw=Math.atan2(p.x-pawn.x,p.z-pawn.z);}
      if(pawn.tend?.phase==='tend'&&pawn.tend.patientId!==pawn.id){const p=world.pawns.find(p=>p.id===pawn.tend!.patientId);if(p)yaw=Math.atan2(p.x-pawn.x,p.z-pawn.z);}
      const bed = (pawn.state === 'sleeping'||pawn.state==='resting'||pawn.state==='downed') && bedId !== null ? world.structures.find(item => item.id === bedId) : undefined;
      let px = pawn.x, pz = pawn.z, py = pawn.state==='eating'||pawn.state==='sleeping'||pawn.state==='resting'||medicallyStopped(pawn)?0:this.travelSurfaces.get(pawn.z*world.width+pawn.x)??0;
      const body=bodies.get(pawn.id);
      const hiddenBody=pawn.body?.lostAt!==undefined||pawn.body?.pileId!==undefined&&(!body||body.owner.type==='grave');
      if(body?.owner.type==='ground'){px=body.owner.x;pz=body.owner.z;py=0;}
      if(hiddenBody)py=-1000;
      if (bed&&!body&&!hiddenBody) {
        const cells = footprintCells(bed), last = cells[cells.length - 1]!;
        px = (bed.x + last.x) / 2; pz = (bed.z + last.z) / 2; py = WORLD_SCALE.bedSurfaceHeight;
        const target = bed.orientation * Math.PI / 2;
        yaw = from.w + Math.atan2(Math.sin(target - from.w), Math.cos(target - from.w));
      }
      const dining = pawn.state === 'eating' && pawn.need?.kind === 'eat' ? pawn.need.dining : null;
      const surface = dining ? adjacentTable(world, pawn) : null;
      if (surface) {
        const target = Math.atan2(surface.cell.x - pawn.x, surface.cell.z - pawn.z);
        yaw = from.w + Math.atan2(Math.sin(target - from.w), Math.cos(target - from.w));
      }
      const job=pawn.state==='working'?world.jobs.find(j=>j.id===pawn.jobId):undefined;
      const garment=pawn.equipmentTask?.action==='wear'?world.piles.find(p=>p.id===pawn.equipmentTask!.itemId):undefined;
      const dressing=garment?.owner.type==='ground'?garment.owner:undefined;
      const fighting=pawn.firefighting?world.fires?.items.find(f=>f.id===pawn.firefighting!.fireId):undefined;
      const fireTarget=fighting?firePosition(world,fighting):undefined;
      const workPose=pawnWorkPose(pawn,job);
      const fuelDestination=pawn.haul?.destination.type==='fuel'?pawn.haul.destination:undefined;
      const station=pawn.state==='working' ? pawn.research ? world.structures.find(s=>s.id===pawn.research!.stationId) : pawn.cooking?.phase==='work' ? world.structures.find(s=>s.id===pawn.cooking!.stationId) : pawn.haul?.serviceProgress&&fuelDestination ? world.structures.find(s=>s.id===fuelDestination.structureId) : undefined : undefined;
      const stationCell=station ? footprintCells(station).reduce((best,cell)=>Math.hypot(cell.x-pawn.x,cell.z-pawn.z)<Math.hypot(best.x-pawn.x,best.z-pawn.z)?cell:best) : undefined;
      const work = pawn.state==='working' ? fireTarget ?? (job?constructionWorkTarget(world,job):dressing) ?? (pawn.hunting?.phase==='finish' ? world.wildlife?.animals.find(a=>a.id===pawn.hunting!.animalId) : stationCell ?? pawn.cooking?.actionCell ?? pawn.haul?.pickupCell) : undefined;
      if(work) yaw=Math.atan2(work.x-pawn.x,work.z-pawn.z);
      const reach=workPose!==WORK_POSE.ground&&workPose!==0&&!station?.kind.includes('spot') ? workApproach(pawn,work,station?.kind==='research-bench'||station?.kind==='butcher-table'||station?.kind==='machining-table'||station?.kind==='stonecutter'||station?.kind==='art-bench'||station?.kind==='tailor-bench'||station?.kind==='electric-tailor-bench'||station?.kind==='electric-stove'||station?.kind==='fueled-stove' ? .72 : .55) : {x:0,z:0};
      this.workOffsets.set(pawn.id,reach);
      if(newMap)this.approachTransitions.set(pawn.id,{fromX:reach.x,fromZ:reach.z,toX:reach.x,toZ:reach.z,start:world.tick,baseX:pawn.x,baseZ:pawn.z});
      px+=reach.x;pz+=reach.z;
      const game=pawn.state==='recreating'&&pawn.recreation.task?.activity==='horseshoes'?world.structures.find(s=>s.id===pawn.recreation.task!.buildingId):undefined;
      if(game)yaw=Math.atan2(game.x-pawn.x,game.z-pawn.z);
      const melee=pawn.melee?.strike;
      const shotTarget=pawn.shooting?.stance?pawn.shooting.order?.targetId??(pawn.shooting.stance.phase==='cooldown'?pawn.lastAttack?.targetId:undefined):undefined;
      const aim=melee?(melee.structure??world.pawns.find(p=>p.id===melee.targetId)??world.wildlife?.animals.find(a=>a.id===melee.targetId)??world.raids?.departed.find(d=>d.pawnId===melee.targetId)?.cell):shotTarget?(world.pawns.find(p=>p.id===shotTarget)??world.wildlife?.animals.find(a=>a.id===shotTarget)):undefined;
      if(aim)yaw=Math.atan2(aim.x-pawn.x,aim.z-pawn.z);
      const to = new THREE.Vector4(px, py, pz, yaw);
      if (!previous||hiddenBody||previous.to.y< -100) from.copy(to);
      this.targetPoses.set(pawn.id,to.clone());
      this.visuals.set(pawn.id, { from, to });
      fromAttribute.setXYZW(index, from.x, from.y, from.z, from.w);
      toAttribute.setXYZW(index, to.x, to.y, to.z, to.w);
      this.workPoses.set(pawn.id,workPose);
      const smallMelee=!!pawn.melee?.strike&&world.wildlife?.animals.some(animal=>animal.id===pawn.melee!.strike!.targetId&&animal.species==='hare');
      motion.setXYZW(index, pawn.state === 'moving'&&!pawn.stun ? 1 : 0, pawn.state === 'working'&&!pawn.stun ? 1 : 0, pawn.health?.foodPoisoning?.vomit&&pawn.state!=='dead' ? 10 : pawn.stun&&!medicallyStopped(pawn) ? 9 : pawn.melee?.strike ? smallMelee?WORK_POSE.groundMelee:8 : pawn.shooting?.stance?.phase==='cooldown'?15:pawn.shooting?.stance ? 7 : pawn.state === 'recreating' ? pawn.recreation.task?.activity==='horseshoes'?4:5 : pawn.state === 'sleeping'||pawn.state==='resting'||medicallyStopped(pawn) ? 1 : pawn.state === 'eating' ? dining?.seatId !== null && dining ? 3 : 2 : workPose, pawn.melee?.strike ? coreTimeSeconds(pawn.melee.strike.atCore,Math.floor(world.tick/1024)*1024) : pawn.shooting?.stance?.phase==='cooldown'?coreTimeSeconds(pawn.shooting.stance.startedAtCore,Math.floor(world.tick/1024)*1024):pawn.id * 1.7);
      const identity=appearanceOf(pawn,world.seed),variant=appearanceShape(identity);
      scratchColor.setHex(identity.skinColor);skin.setXYZ(index,scratchColor.r,scratchColor.g,scratchColor.b);
      scratchColor.setHex(identity.hairColor);hair.setXYZ(index,scratchColor.r,scratchColor.g,scratchColor.b);
      shape.setXYZW(index,...variant);
      const look=apparelAppearance(apparel.get(pawn.id));
      scratchColor.setHex(look.color??(isColonist(pawn)?pawnBaseColor(pawn.id):pawn.visitor&&!world.visitors?.groups.find(g=>g.id===pawn.visitor!.group)?.hostile?0x77958f:0xb74736));
      if(pawn.state==='dead')scratchColor.setHex(0x73756c);
      tint.setXYZ(index, scratchColor.r, scratchColor.g, scratchColor.b);
      equipment.setXYZW(index,weaponVisual(gears.get(pawn.id)?.item)?.equipment??0,look.silhouette,look.vest?1:0,look.pants);
      const load = carried.get(pawn.id);
      const packed=world.packed?.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id);
      cargo.setXY(index, pawn.rescue?.phase==='carry'||load?.humanCorpse?-1:packed?4:load ? BIOME_CARGO[load.item]??(load.kind==='silver'?30:load.kind==='corpse'?27:load.item==='light-leather'?28:isAnimalMeat(load.item)?29:load.kind==='unfinished'?25:load.kind==='textile'?24:load.kind==='apparel'?APPAREL_CARGO[load.item as ApparelItem]:load.kind==='weapon'?(weaponVisual(load.item)?.cargo??0):load.kind==='medicine' ? (load.item==='herbal-medicine'?18:load.item==='medicine'?19:20) : load.kind === 'component' ? 17 : load.kind === 'blocks' ? blockCargoKind(load.item) : load.kind === 'steel' ? 11 : load.kind === 'chunk' ? chunkCargoKind(load.item) : load.kind === 'wood' ? 1 : load.item === 'survival-meal' ? 3 : 2) : 0, packed||load?.kind==='corpse'||load?.kind==='unfinished'||load?.kind==='weapon'||load?.kind==='apparel'?1:load ? Math.min(1, load.quantity / CARRY_CAPACITY) : 0);
    });
    for (const id of this.visuals.keys()) if (!present.has(id)){this.visuals.delete(id);this.targetPoses.delete(id);this.headings.delete(id);this.workPoses.delete(id);this.workOffsets.delete(id);this.approachTransitions.delete(id);this.departureOffsets.delete(id);}
    this.pawnIndices.clear();for(const [id,index] of indices)this.pawnIndices.set(id,index);
    for (const attr of [fromAttribute, toAttribute, motion, tint, cargo]) attr.needsUpdate = true;
    geometry.instanceCount = world.pawns.length;
    (this.cargoMesh!.geometry as THREE.InstancedBufferGeometry).instanceCount = world.pawns.length;
    (this.selectionMesh!.geometry as THREE.InstancedBufferGeometry).instanceCount=world.pawns.length;
    this.pawnIds=world.pawns.map(p=>p.id);this.setSelected(this.selected);
  }

  /** CPU chooses a confirmed edge; translation, orientation and rig evaluation stay on GPU. */
  updateTravel(world:World,timeline:MotionTimeline):void {
    if(!this.pawnMesh)return;
    const geometry=this.pawnMesh.geometry;
    const from=geometry.getAttribute('aFrom') as THREE.InstancedBufferAttribute,to=geometry.getAttribute('aTo') as THREE.InstancedBufferAttribute,times=geometry.getAttribute('aTravel') as THREE.InstancedBufferAttribute,motion=geometry.getAttribute('aMotion') as THREE.InstancedBufferAttribute;
    const origin=Math.floor(timeline.tick/1024)*1024;
    this.travelTime.value=localTimeSeconds(timeline.tick,origin);
    let dirty=false;
    world.pawns.forEach((pawn,i)=>{
      const segment=pawn.body?.pileId!==undefined||pawn.body?.lostAt!==undefined?undefined:timeline.segment(pawn.id);
      const active=!!segment && timeline.tick<segment.end;
      const key=`${origin}:${segment?.start}:${segment?.end}:${active}:${!!segment&&timeline.tick>=segment.start}:${pawn.state}:${pawn.path[0]?.x}:${pawn.path[0]?.z}`;
      if(this.travelKeys.get(pawn.id)===key)return;
      this.travelKeys.set(pawn.id,key);dirty=true;
      const visual=this.visuals.get(pawn.id)!;
      if(segment && (active || pawn.state==='moving'||world.tick<segment.end)) {
        const yaw=Math.atan2(segment.to.x-segment.from.x,segment.to.z-segment.from.z);
        const previous=this.headings.get(pawn.id);
        let heading=turnToward(previous,yaw,segment.start);
        if(previous&&heading===previous&&previous.startTick!==segment.start)heading={from:headingAt(previous,segment.start),to:previous.to,startTick:segment.start};
        this.headings.set(pawn.id,heading);
        const a=segment.fromFraction??0,b=segment.toFraction??1,lerp=THREE.MathUtils.lerp;
        const y0=this.travelSurfaces.get(segment.from.z*world.width+segment.from.x)??0,y1=this.travelSurfaces.get(segment.to.z*world.width+segment.to.x)??0;
        // Preserve full-edge heights: climbing uses distance on the original
        // edge, not a fresh first/last third for every change of pace.
        visual.from.set(lerp(segment.from.x,segment.to.x,a),y0,lerp(segment.from.z,segment.to.z,a),heading.from);
        visual.to.set(lerp(segment.from.x,segment.to.x,b),y1,lerp(segment.from.z,segment.to.z,b),heading.to);
        const edgeStart=segment.edgeStart??segment.start;
        let departure=this.departureOffsets.get(pawn.id);
        if(!departure||departure.start!==edgeStart){
          const previous=this.approachTransitions.get(pawn.id);
          const offset=previous&&previous.baseX===segment.from.x&&previous.baseZ===segment.from.z?approachAt(previous,edgeStart):{x:0,z:0};
          departure={start:edgeStart,x:offset.x,z:offset.z};this.departureOffsets.set(pawn.id,departure);
        }
        // The first part of a confirmed edge departs from the reached work
        // pose, then converges on the same authoritative destination.
        visual.from.x+=departure.x*(1-a);visual.from.z+=departure.z*(1-a);
        visual.to.x+=departure.x*(1-b);visual.to.z+=departure.z*(1-b);
        this.approachTransitions.delete(pawn.id);
        times.setXYZW(i,localTimeSeconds(segment.start,origin),localTimeSeconds(segment.end,origin),a,b);
        motion.setX(i,!medicallyStopped(pawn)&&active && a!==b && timeline.tick>=segment.start?1:0);motion.setY(i,0);motion.setZ(i,medicallyStopped(pawn)?1:0);
      } else {
        const desired=this.workOffsets.get(pawn.id)??{x:0,z:0};
        const target=this.targetPoses.get(pawn.id)!;
        const baseX=target.x-desired.x,baseZ=target.z-desired.z;
        let approach=this.approachTransitions.get(pawn.id);
        if(!approach||approach.baseX!==baseX||approach.baseZ!==baseZ||Math.abs(approach.toX-desired.x)>1e-5||Math.abs(approach.toZ-desired.z)>1e-5){
          // An edge or a changed work cell can leave no approach record even
          // though the last rendered pose is still off centre. Begin from that
          // shared pose rather than teleporting back to the logical cell.
          const visualX=visual.from.x-baseX,visualZ=visual.from.z-baseZ;
          const visibleOffset=Math.hypot(visualX,visualZ)<=1.5?{x:visualX,z:visualZ}:{x:0,z:0};
          const current=approach&&approach.baseX===baseX&&approach.baseZ===baseZ?approachAt(approach,timeline.tick):visibleOffset;
          approach={fromX:current.x,fromZ:current.z,toX:desired.x,toZ:desired.z,start:timeline.tick,baseX,baseZ};
          this.approachTransitions.set(pawn.id,approach);
        }
        this.departureOffsets.delete(pawn.id);
        visual.from.copy(target);visual.from.x=baseX+approach.fromX;visual.from.z=baseZ+approach.fromZ;
        visual.to.copy(target);visual.to.x=baseX+approach.toX;visual.to.z=baseZ+approach.toZ;
        if(pawn.state==='moving'&&pawn.path[0]&&doorAt(world,pawn.path[0])) {
          const target=pawn.path[0];visual.to.w=Math.atan2(target.x-pawn.x,target.z-pawn.z);
        }
        const heading=turnToward(this.headings.get(pawn.id),visual.to.w,timeline.tick);
        this.headings.set(pawn.id,heading);
        const turning=timeline.tick-heading.startTick<TURN_TICKS;
        visual.from.w=turning?heading.from:heading.to;visual.to.w=heading.to;
        const shifting=timeline.tick-approach.start<APPROACH_TICKS&&(Math.abs(approach.fromX-approach.toX)>1e-5||Math.abs(approach.fromZ-approach.toZ)>1e-5);
        // Snapshot adoption resets the general blend to zero. A completed
        // approach must have equal endpoints, or every new worker snapshot
        // briefly snaps the pawn back to the centre of its logical cell.
        if(!shifting){visual.from.x=visual.to.x;visual.from.z=visual.to.z;}
        const approachStart=localTimeSeconds(approach.start,origin);
        times.setXYZW(i,shifting?approachStart:0,shifting?approachStart+APPROACH_TICKS/TICKS_PER_SECOND:0,localTimeSeconds(heading.startTick,origin),2);
        motion.setX(i,0);motion.setY(i,pawn.state==='working'&&!pawn.stun?1:0);
        const dining=pawn.need?.kind==='eat'?pawn.need.dining:null;
        const smallMelee=!!pawn.melee?.strike&&world.wildlife?.animals.some(animal=>animal.id===pawn.melee!.strike!.targetId&&animal.species==='hare');
        motion.setZ(i,pawn.health?.foodPoisoning?.vomit&&pawn.state!=='dead'?10:pawn.stun&&!medicallyStopped(pawn)?9:pawn.melee?.strike?smallMelee?WORK_POSE.groundMelee:8:pawn.shooting?.stance?.phase==='cooldown'?15:pawn.shooting?.stance?7:pawn.state==='recreating'?pawn.recreation.task?.activity==='horseshoes'?4:5:pawn.state==='sleeping'||pawn.state==='resting'||medicallyStopped(pawn)?1:pawn.state==='eating'?dining&&dining.seatId!==null?3:2:this.workPoses.get(pawn.id)??0);
      }
      if(pawn.melee?.strike)motion.setW(i,coreTimeSeconds(pawn.melee.strike.atCore,origin));
      else if(pawn.shooting?.stance?.phase==='cooldown')motion.setW(i,coreTimeSeconds(pawn.shooting.stance.startedAtCore,origin));
      from.setXYZW(i,visual.from.x,visual.from.y,visual.from.z,visual.from.w);to.setXYZW(i,visual.to.x,visual.to.y,visual.to.z,visual.to.w);
    });
    if(dirty){
      // Both actors, their loads and selection rings use exactly the same edge
      // and yaw. The carried rig is an extra pose in the existing GPU batch.
      for(const [carrier,patient] of this.rescuePairs){
        from.setXYZW(patient,from.getX(carrier),from.getY(carrier),from.getZ(carrier),from.getW(carrier));
        to.setXYZW(patient,to.getX(carrier),to.getY(carrier),to.getZ(carrier),to.getW(carrier));
        times.setXYZW(patient,times.getX(carrier),times.getY(carrier),times.getZ(carrier),times.getW(carrier));motion.setXYZ(patient,0,0,6);
        const source=this.visuals.get(world.pawns[carrier]!.id)!,target=this.visuals.get(world.pawns[patient]!.id)!;
        target.from.copy(source.from);target.to.copy(source.to);
        const heading=this.headings.get(world.pawns[carrier]!.id);if(heading)this.headings.set(world.pawns[patient]!.id,{...heading});
      }
      for(const attribute of [from,to,times,motion])attribute.needsUpdate=true;
    }
  }

  dispose(): void {
    clearGroup(this.group);
    this.plainMaterial?.dispose();
    this.texturedMaterial?.dispose();
    this.surfaceTexture.dispose();
    this.pawnMesh = this.cargoMesh = this.fireMesh = this.selectionMesh = null;
  }

}
import { medicallyStopped } from '../sim/health-rules';
