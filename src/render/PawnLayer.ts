import { appearanceOf } from '../sim/pawn-appearance';
import { corpseStage,CORPSE_ROT_TICKS,CORPSE_DESSICATION_TICKS } from '../sim/corpses';
import { corpseVisualMask } from './corpse-presentation';
import { humanCorpseAge } from '../sim/human-corpses';
import { HUMAN_LIMB_VISUALS,humanLimbVisualMask,packHumanShape } from './human-anatomy-presentation';
import { anestheticStage } from '../sim/anesthetic';
import { appearanceShape,pawnBaseColor } from './pawn-appearance-shape';
import { pawnMorph,hiddenAppearancePart } from './pawn-appearance-nodes';
import { BIOME_CARGO } from './biome-cargo';
import { isAnimalMeat } from '../sim/biome-items';
import type { ApparelItem } from '../sim/apparel-rules';
import { firePosition } from '../sim/fire-rules';
import { attachedFireMesh, setFireTexturesEnabled } from './FireLayer';
import { apparelProjection,apparelAppearance,APPAREL_CARGO } from './character-apparel';
import { coreTimeSeconds,localTimeSeconds } from '../bridge/clock-rate';
import { growPawnBuffers } from './pawn-buffers';
import { isColonist } from '../sim/affiliation';
import { pawnGeometry,cargoGeometry,PARKA_HOOD_DYE,FLAK_HELMET_DYE,RECON_HELMET_DYE,PAWN_EYE_OPEN,PAWN_EYE_CLOSED,PAWN_EYE_CROSS } from './pawn-geometry';
import { equipmentProjection } from './character-equipment';
import { WEAPON_VISUALS,weaponVisual } from './weapon-shape';
import { doorAt } from '../sim/door-rules';
import { blockCargoKind } from './block-presentation';
import { furnitureSurfaces } from './furniture-motion';
import { pawnPresentationPose } from './pawn-presentation';
import { headingAt,turnToward,TURN_TICKS,type TurnHeading } from './turn-presentation';
import { pawnWorkPose,workApproach,meleeApproach,WORK_POSE } from './work-presentation';
import { GaitPhaseTracker,HUMAN_GAIT_RADIANS_PER_UNIT } from './gait-presentation';
import { constructionWorkTarget } from '../sim/construction-rules';
import { pawnSelectionMesh } from './PawnSelectionLayer';
import type { MotionTimeline } from './MotionTimeline';
import * as THREE from 'three/webgpu';
import { Fn, If, attribute, cos, float, mix, positionLocal, sin, uniform, vec3 } from 'three/tsl';
import { TICKS_PER_SECOND,type MaterialPile,type Pawn,type World } from '../sim/types';
import { chunkCargoKind } from './chunk-presentation';
import { adjacentTable } from '../sim/dining';
import { CARRY_CAPACITY, footprintCells } from '../sim/definitions';
import { PAWN_MODEL_SCALE, WORLD_SCALE } from '../world/scale';
import { clearGroup, material } from './primitives';
import { createStylizedSurfaceTexture } from './stylized-surfaces';
import { pawnSurfaceShade } from './actor-surface';
import { CargoHandoffs,type CargoAnchor } from './cargo-handoff';
import { bodyBloodPigment,bodyBloodWord } from './body-blood';
import type { AnimalCorpseCarrier } from './animal-corpse-carrier';
type VisualPawn = { from: THREE.Vector4; to: THREE.Vector4 };
type ApproachTransition = { fromX:number; fromZ:number; toX:number; toZ:number; start:number; baseX:number; baseZ:number };
type CrouchTransition = { start:number; from:number; to:number };
const APPROACH_TICKS=.24*TICKS_PER_SECOND;
const CROUCH_TICKS=.28*TICKS_PER_SECOND;
// aMotion.x normally stores 0/1 locomotion. A negative value also carries a
// short pose transition: quarter-tick start, initial crouch fraction, and the
// locomotion bit. Work subtype (y), pose (z), and strike clock (w) stay intact.
const CROUCH_QUANTA=4,CROUCH_PADDING=16,CROUCH_WALK_MARK=8192;
const POSE_SLEEP=18,POSE_DEAD=19,POSE_FIGHT_READY=22;
const crouched=(pose:number|undefined):boolean=>pose===WORK_POSE.ground||pose===WORK_POSE.groundMelee;
function seatedOnFurniture(pawn:Pawn):boolean {
  if(pawn.state==='eating')return pawn.need?.kind==='eat'&&typeof pawn.need.dining?.seatId==='number';
  if(pawn.state!=='recreating')return false;
  const task=pawn.recreation.task;
  return !!task&&(task.activity==='watch-television'||task.activity==='chess'||task.activity==='social-relax'||task.activity==='visit-sick')&&typeof task.seatId==='number';
}
function crouchAt(transition:CrouchTransition,tick:number):number {
  const fraction=THREE.MathUtils.clamp((tick-transition.start)/CROUCH_TICKS,0,1);
  const smooth=fraction*fraction*(3-2*fraction);
  return THREE.MathUtils.lerp(transition.from,transition.to,smooth);
}
function motionX(walking:boolean,transition:CrouchTransition|undefined,origin:number):number {
  if(!transition)return walking?1:0;
  const quarterTick=Math.round(transition.start*CROUCH_QUANTA)-origin*CROUCH_QUANTA+CROUCH_PADDING;
  return -1-quarterTick-Math.min(.999,Math.max(0,transition.from))-(walking?CROUCH_WALK_MARK:0);
}
function workActivity(pawn:Pawn):number {
  if(pawn.state!=='working'||pawn.stun)return 0;
  return pawn.cooking?2:pawn.research?3:1;
}
function animationPose(pawn:Pawn,workPose:number,smallMelee:boolean,seated:boolean):number {
  if(pawn.state==='dead')return POSE_DEAD;
  if(pawn.state==='sleeping'||pawn.medicalSleep||anestheticStage(pawn.health?.anesthetic?.severity??0)==='sedated')return POSE_SLEEP;
  if(pawn.health?.foodPoisoning?.vomit)return 10;
  if(pawn.stun&&!medicallyStopped(pawn))return 9;
  if(pawn.melee?.strike)return smallMelee?WORK_POSE.groundMelee:8;
  if(pawn.shooting?.stance?.phase==='cooldown')return 15;
  if(pawn.shooting?.stance)return 7;
  if(pawn.social?.fight&&!medicallyStopped(pawn))return POSE_FIGHT_READY;
  if(pawn.state==='recreating'){
    const activity=pawn.recreation.task?.activity;
    if(activity==='horseshoes')return 4;
    if(activity==='skygaze')return 5;
    if(activity==='watch-television'||activity==='chess'||activity==='social-relax'||activity==='visit-sick')return seated?3:0;
  }
  if(pawn.state==='resting'||medicallyStopped(pawn))return 1;
  if(pawn.state==='eating')return seated?3:2;
  return workPose;
}
function approachAt(transition:ApproachTransition,tick:number):{x:number;z:number} {
  const alpha=THREE.MathUtils.clamp((tick-transition.start)/APPROACH_TICKS,0,1);
  return {x:THREE.MathUtils.lerp(transition.fromX,transition.toX,alpha),z:THREE.MathUtils.lerp(transition.fromZ,transition.toZ,alpha)};
}
const scratchColor = new THREE.Color();
function cargoAppearance(load:MaterialPile|undefined):readonly [number,number] {
  if(!load)return [0,0];
  const kind=BIOME_CARGO[load.item]??(load.kind==='silver'?30:load.kind==='corpse'?27:load.item==='light-leather'?28:isAnimalMeat(load.item)?29:load.kind==='unfinished'?25:load.kind==='textile'?24:load.kind==='apparel'?APPAREL_CARGO[load.item as ApparelItem]:load.kind==='weapon'?(weaponVisual(load.item)?.cargo??0):load.kind==='medicine' ? (load.item==='herbal-medicine'?18:load.item==='medicine'?19:20) : load.kind === 'component' ? 17 : load.kind === 'blocks' ? blockCargoKind(load.item) : load.kind === 'steel' ? 11 : load.kind === 'chunk' ? chunkCargoKind(load.item) : load.kind === 'wood' ? 1 : load.item === 'survival-meal' ? 3 : 2);
  // Corpse loads are indivisible. Negative y encodes their exact anatomical
  // mask in the existing actor stream; no extra per-actor GPU attribute.
  const size=load.corpse?-1-corpseVisualMask(load.corpse):load.kind==='corpse'||load.kind==='unfinished'||load.kind==='weapon'||load.kind==='apparel'?1:Math.min(1,load.quantity/CARRY_CAPACITY);
  return [kind,size];
}
/** Packed into the existing appearance stream; no extra vertex buffer. */
export function humanCorpseVisualStage(world:World,pawn:Pawn,body?:MaterialPile):0|1|2 {
  if(pawn.state!=='dead')return 0;
  const pile=body??(pawn.body?.pileId!==undefined?world.piles.find(p=>p.id===pawn.body?.pileId):undefined);
  if(pile){const stage=corpseStage(pile,world.tick);return stage==='desiccated'?2:stage==='rotting'?1:0;}
  const age=humanCorpseAge(world,pawn);
  return age>=CORPSE_DESSICATION_TICKS?2:age>=CORPSE_ROT_TICKS?1:0;
}
/** Bodies awaiting a free pile cell remain logically where they fell. Fan only
 * coincident presentations within that cell so their surfaces do not fight. */
export function retainedHumanCorpseOffsets(world:World):ReadonlyMap<number,{x:number;z:number;y:number}> {
  const occupied=new Set<string>();
  for(const pile of world.piles)if(pile.humanCorpse&&pile.owner.type==='ground')occupied.add(`${pile.owner.x}:${pile.owner.z}`);
  const groups=new Map<string,number[]>();
  for(const pawn of world.pawns)if(pawn.state==='dead'&&pawn.body?.pileId===undefined&&pawn.body?.lostAt===undefined){
    const key=`${pawn.x}:${pawn.z}`,ids=groups.get(key)??[];ids.push(pawn.id);groups.set(key,ids);
  }
  const offsets=new Map<number,{x:number;z:number;y:number}>();
  for(const [key,ids] of groups){
    if(ids.length+(occupied.has(key)?1:0)<2)continue;
    ids.sort((a,b)=>a-b);
    ids.forEach((id,index)=>{
      const slot=index+(occupied.has(key)?1:0),angle=slot*Math.PI*2/Math.max(2,ids.length+(occupied.has(key)?1:0));
      offsets.set(id,{x:.20*Math.cos(angle),z:.16*Math.sin(angle),y:Math.min(.06,.012*(index+1))});
    });
  }
  return offsets;
}

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
  private partialCargoMesh: THREE.Mesh | null = null;
  private fireMesh: THREE.Mesh | null = null;
  private readonly targetPoses = new Map<number,THREE.Vector4>();
  private readonly pawnIndices = new Map<number,number>();
  private readonly headings = new Map<number,TurnHeading>();
  private readonly workPoses = new Map<number,number>();
  private readonly workOffsets = new Map<number,{x:number;z:number}>();
  private readonly approachTransitions = new Map<number,ApproachTransition>();
  private readonly departureOffsets = new Map<number,{start:number;x:number;z:number;arrivalX:number;arrivalZ:number}>();
  private readonly crouchTransitions = new Map<number,CrouchTransition>();
  private readonly shownPoses = new Map<number,number>();
  private readonly gait = new GaitPhaseTracker();
  private readonly handoffs = new CargoHandoffs();
  /** Wildlife's resident species batch reads these already encoded primitives
   * at edge/snapshot boundaries; there is no World search or CPU rig pose. */
  animalCorpseCarrier(id:number):AnimalCorpseCarrier|undefined {
    const index=this.pawnIndices.get(id),geometry=this.pawnMesh?.geometry;
    if(index===undefined||!geometry)return;
    return {index,geometry,handoff:this.handoffs.active.get(id),blend:this.blend.value};
  }
  animalCorpseTransferCarrier(pileId:number):number|undefined {
    for(const item of this.handoffs.active.values())if(item.pile.id===pileId||item.targetPileId===pileId)return item.pawnId;
  }
  private carryOrigin=0;
  private travelOrigin=0;
  readonly cargoTime=uniform(0);
  hiddenPileQuantity(pileId:number):number {return this.handoffs.hiddenQuantity(pileId);}
  hiddenPileQuantities():ReadonlyMap<number,number> {return this.handoffs.hiddenQuantities();}
  private travelSurfaces:ReadonlyMap<number,number>=new Map();
  private rescuePairs:readonly (readonly [number,number])[]=[];
  constructor(private readonly configure?: (material: THREE.MeshStandardNodeMaterial) => void) {}
  /** Warm the resident fire graph before the first burning actor appears. */
  prepareFiresForCompile():()=>void {
    if(!this.fireMesh)return ()=>{};
    const geometry=this.fireMesh.geometry as THREE.InstancedBufferGeometry,count=geometry.instanceCount;
    geometry.instanceCount=Math.max(1,count);
    return ()=>{geometry.instanceCount=count;};
  }
  private showPose(id:number,pose:number,tick:number):void {
    const previous=this.shownPoses.get(id);
    if(previous===pose)return;
    if(previous!==undefined&&crouched(previous)!==crouched(pose)){
      // The presentation playhead, not the latest worker snapshot, starts the
      // bend. A rapid interruption resumes from the fraction already shown.
      const earlier=this.crouchTransitions.get(id);
      const from=earlier?crouchAt(earlier,tick):crouched(previous)?1:0;
      const to=crouched(pose)?1:0;
      if(pose===POSE_SLEEP||pose===POSE_DEAD||pose===1||pose===5||pose===6||Math.abs(from-to)<.001)
        this.crouchTransitions.delete(id);
      else this.crouchTransitions.set(id,{start:Math.ceil(tick*CROUCH_QUANTA)/CROUCH_QUANTA,from,to});
    }
    this.shownPoses.set(id,pose);
  }
  setTexturesEnabled(enabled: boolean): void {
    if (this.texturesEnabled === enabled) return;
    this.texturesEnabled = enabled;
    if (this.pawnMesh) this.pawnMesh.material = enabled ? this.texturedMaterial! : this.plainMaterial!;
    if (this.fireMesh) setFireTexturesEnabled(this.fireMesh,enabled);
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
    const appearance=new THREE.InstancedInterleavedBuffer(new Float32Array(count*18),18).setUsage(THREE.StaticDrawUsage);
    for(const [name,size,offset] of [['aTint',3,0],['aEquipment',4,3],['aSkin',3,7],['aHair',3,10],['aHairBlood',4,10],['aShape',4,14],['aBodyBlood',1,13]] as const)
      geometry.setAttribute(name,new THREE.InterleavedBufferAttribute(appearance,size,offset));
    // Z/W carry a short, presentation-only handoff interval. X/Y retain the
    // existing kind and load for HUD probes and the pawn's own geometry.
    geometry.setAttribute('aCargo', new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4));
    for (const name of ['aFrom', 'aTo', 'aMotion', 'aCargo', 'aTravel']) (geometry.getAttribute(name) as THREE.InstancedBufferAttribute).setUsage(THREE.StaticDrawUsage);
    const mat = material(0xffffff);
    this.configure?.(mat);
    mat.positionNode = Fn(() => {
      const bone = attribute('boneId', 'float');
      const pivot = pawnMorph(attribute('bindPivot', 'vec3'));
      const motion = attribute('aMotion', 'vec4');
      const pose = pawnPresentationPose(this);
      const transitioning=motion.x.lessThan(-.5);
      const packed=motion.x.negate().sub(1);
      const transitionWalk=packed.greaterThan(CROUCH_WALK_MARK);
      const walking=transitioning.select(transitionWalk.select(float(1),float(0)),motion.x);
      // Motion.w carries the phase at the beginning of an active edge. The
      // distance is computed from the same interpolated XZ pose as the body,
      // so a slowed/stunned edge cannot keep cycling the limbs in place.
      const gaitPhase=motion.w.add(pose.xz.sub(attribute('aFrom','vec4').xz).length().mul(HUMAN_GAIT_RADIANS_PER_UNIT));
      const ground=motion.z.equal(WORK_POSE.ground),low=ground.or(motion.z.equal(WORK_POSE.groundMelee));
      const crouch=low.select(float(1),float(0)).toVar();
      If(transitioning,()=>{
        const payload=transitionWalk.select(packed.sub(CROUCH_WALK_MARK),packed);
        const start=payload.floor().sub(CROUCH_PADDING).div(CROUCH_QUANTA*TICKS_PER_SECOND);
        const elapsed=this.travelTime.sub(start).div(CROUCH_TICKS/TICKS_PER_SECOND).clamp(0,1);
        const smooth=elapsed.mul(elapsed).mul(float(3).sub(elapsed.mul(2)));
        crouch.assign(mix(payload.fract(),crouch,smooth));
      });
      const angle = float(0).toVar();
      const sign = float(1).toVar();
      const idle=motion.z.equal(0).and(walking.lessThan(.5)).and(motion.y.equal(0));
      // Quiet breathing and weight shifts share the presentation clock. They
      // stop on pause and cannot change a logical position or decision.
      const breath=sin(this.time.add(motion.w));
      If(bone.equal(3).or(bone.equal(4)).or(bone.equal(6)), () => { sign.assign(-1); });
      If(bone.greaterThan(1.5), () => {
        angle.assign(sin(gaitPhase).mul(walking).mul(sign).mul(0.65));
        If(bone.lessThan(3.5), () => {
          If(motion.y.greaterThan(0).and(motion.z.lessThan(10.5)),()=>{
            angle.addAssign(sin(this.time.mul(12).add(motion.w)).mul(0.35).sub(0.8));
          });
          If(attribute('aCargo', 'vec4').x.abs().greaterThan(0.5), () => {
            angle.assign(float(-0.9).add(sin(gaitPhase).mul(walking).mul(0.06)));
            If(motion.z.greaterThan(1.5), () => { angle.assign(float(-1.3).add(sin(this.time.mul(4).add(motion.w)).mul(0.22))); });
          });
        });
      });
      // Every working silhouette has a small continuous gesture in the
      // resident rig. Cooking stirs; research taps; fabrication alternates
      // hands. The torso and head participate without CPU bone updates.
      const stroke=sin(this.time.mul(11).add(motion.w));
      const busy=motion.z.equal(WORK_POSE.mine).or(motion.z.equal(WORK_POSE.chop)).or(motion.z.equal(WORK_POSE.build))
        .or(motion.z.equal(WORK_POSE.craft)).or(motion.z.equal(WORK_POSE.ground));
      const swing=sin(this.time.mul(11).add(motion.w));
      If(busy.and(bone.equal(0)),()=>{
        angle.assign(swing.mul(motion.z.equal(WORK_POSE.mine).or(motion.z.equal(WORK_POSE.chop)).select(float(.13),float(.065))));
      });
      If(busy.and(bone.equal(1)),()=>{
        angle.assign(sin(this.time.mul(7).add(motion.w).add(.7)).mul(.075));
      });
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
        const cadence=motion.y.equal(2).select(float(8),motion.y.equal(3).select(float(5),float(11)));
        const breadth=motion.y.equal(2).select(float(.62),motion.y.equal(3).select(float(.33),float(.54)));
        angle.assign(sin(this.time.mul(cadence).add(motion.w).add(bone.equal(3).select(float(1.25),float(0))))
          .mul(breadth).sub(motion.y.equal(3).select(float(.99),float(.87))));
      });
      If(bone.equal(1).and(walking.greaterThan(.5)),()=>{
        angle.assign(sin(gaitPhase).mul(.045));
      });
      If(idle.and(bone.equal(0)),()=>angle.assign(breath.mul(.018)));
      If(idle.and(bone.equal(1)),()=>angle.assign(breath.mul(.026)));
      If(idle.and(bone.greaterThan(1.5)).and(bone.lessThan(3.5)),()=>{
        angle.assign(breath.mul(bone.equal(3).select(float(-.025),float(.025))).add(.035));
      });
      If(motion.z.greaterThan(2.5).and(motion.z.lessThan(3.5)).and(bone.greaterThan(3.5)), () => {
        angle.assign(bone.lessThan(5.5).select(float(-Math.PI / 2), float(0)));
      });
      If(motion.z.equal(WORK_POSE.groundMelee).and(bone.greaterThan(1.5)).and(bone.lessThan(3.5)),()=>{
        angle.assign(sin(this.travelTime.sub(motion.w).mul(4).clamp(0,1).mul(Math.PI)).mul(-.9).sub(.2));
      });
      // A stable appearance-based phase survives the ready -> strike clock
      // switch in aMotion.w. Confirmed strikes add a short accent to the same
      // continuous arm/torso/leg rhythm instead of replacing the whole pose.
      const brawl=motion.z.equal(POSE_FIGHT_READY).or(motion.z.equal(8));
      const fightPhase=this.time.mul(8).add(attribute('aShape','vec4').x.mod(10).mul(3.7)).add(attribute('aHairBlood','vec4').x.mul(7));
      const strike=motion.z.equal(8).select(
        sin(this.travelTime.sub(motion.w).mul(4).clamp(0,1).mul(Math.PI)),float(0));
      If(brawl.and(bone.greaterThan(1.5)).and(bone.lessThan(3.5)),()=>{
        angle.assign(sin(fightPhase.add(bone.equal(3).select(float(Math.PI),float(0))))
          .mul(.29).sub(.95).sub(strike.mul(bone.equal(3).select(float(.85),float(.3)))));
      });
      If(brawl.and(bone.equal(0).or(bone.equal(1))),()=>{
        angle.assign(sin(fightPhase).mul(bone.equal(0).select(float(.105),float(.06))).sub(strike.mul(.11)));
      });
      If(brawl.and(bone.greaterThan(3.5)),()=>{
        angle.assign(sin(fightPhase.add(bone.equal(4).or(bone.equal(6)).select(float(0),float(Math.PI))))
          .mul(bone.lessThan(5.5).select(float(.12),float(.055))));
      });
      const shooting=motion.z.equal(7).or(motion.z.equal(15));
      If(shooting.and(bone.greaterThan(1.5)).and(bone.lessThan(3.5)),()=>{
        angle.assign(bone.equal(3).select(float(-1.54),float(-1.12)));
      });
      If(motion.z.equal(4).and(bone.equal(3)), () => { angle.assign(sin(this.time.mul(2).add(motion.w)).mul(1.1).sub(.35)); });
      If(crouch.greaterThan(0).and(brawl.not()).and(bone.lessThan(3.5)),()=>{
        const lowAngle=bone.equal(0)
          .select(sin(this.time.mul(8).add(motion.w)).mul(.085).sub(.09),
            bone.equal(1).select(sin(this.time.mul(8).add(motion.w).add(.7)).mul(.055).add(.055),
              sin(this.time.mul(8).add(motion.w).add(bone.equal(3).select(float(2.1),float(0)))).mul(.39).sub(.65)));
        // Keep the active strike of a low melee target, but transition ordinary
        // ground-work hands with the same bend as the body.
        If(motion.z.notEqual(WORK_POSE.groundMelee),()=>{angle.assign(mix(angle,lowAngle,crouch));});
      });
      If(crouch.greaterThan(0).and(bone.greaterThan(3.5)),()=>{
        const lowLeg=sin(this.time.mul(8).add(motion.w).add(bone.equal(4).or(bone.equal(6)).select(float(0),float(Math.PI))))
          .mul(bone.lessThan(5.5).select(float(.045),float(.025)));
        angle.assign(mix(angle,lowLeg,crouch));
      });
      const local = pawnMorph(positionLocal).sub(pivot);
      const c = cos(angle), s = sin(angle);
      const animated = vec3(local.x, local.y.mul(c).sub(local.z.mul(s)), local.y.mul(s).add(local.z.mul(c))).add(pivot).toVar();
      If(busy.and(bone.lessThan(3.5)),()=>{
        animated.y.addAssign(sin(this.time.mul(11).add(motion.w)).mul(.012));
      });
      If(idle.and(bone.lessThan(3.5)),()=>{
        animated.y.addAssign(breath.mul(.007));
        animated.z.addAssign(breath.mul(.004));
      });
      If(crouch.greaterThan(0),()=>{
        // Blend the entire low silhouette, not just its vertical offset. Feet
        // stay anchored while the hands, head and torso continue to move.
        const upright=animated.toVar();
        If(bone.greaterThan(3.5),()=>{animated.y.assign(animated.y.sub(.11).mul(.72).add(.11));});
        If(bone.lessThan(3.5),()=>{
          const y=animated.y.sub(.61).toVar(),z=animated.z.toVar();
          animated.y.assign(y.mul(.91).sub(z.mul(.42)).add(.49));
          animated.z.assign(y.mul(.42).add(z.mul(.91)).add(.075));
        });
        animated.assign(mix(upright,animated,crouch));
      });
      If(brawl.and(bone.lessThan(3.5)),()=>{
        animated.y.addAssign(sin(fightPhase.mul(2)).mul(.014));
        animated.z.addAssign(sin(fightPhase).mul(.025));
      });
      If(motion.z.greaterThan(2.5).and(motion.z.lessThan(3.5)), () => {
        // Thigh rotates around the hip; the lower leg keeps its vertical pose
        // at the translated knee. Two extra rigid bones, no CPU skeleton update.
        If(bone.greaterThan(5.5), () => { animated.y.addAssign(0.21); animated.z.addAssign(0.21); });
        animated.y.addAssign(WORLD_SCALE.stoolHeight / PAWN_MODEL_SCALE - 0.605);
      });
      If(motion.z.equal(10).and(bone.lessThan(3.5)),()=>{
        const y=animated.y.sub(.48).toVar(),z=animated.z.toVar();
        animated.y.assign(y.mul(.82).sub(z.mul(.57)).add(.48));animated.z.assign(y.mul(.57).add(z.mul(.82)));
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
          If(isWeapon,()=>animated.assign(vec3(across.add(.27),along.mul(.82).add(.65),depth.add(.13))));
          If(shooting.and(isWeapon),()=>animated.assign(vec3(across.add(.19),depth.add(.99).add(recoil.mul(.035)),along.add(.44).sub(recoil.mul(.09)))));
          if(weapon.item==='plasteel-knife')If(motion.z.equal(8).or(motion.z.equal(WORK_POSE.groundMelee)).and(isWeapon),()=>{
            const reach=sin(this.travelTime.sub(motion.w).mul(4).clamp(0,1).mul(Math.PI));
            animated.assign(vec3(across.add(.23),depth.add(.83),along.add(.38).add(reach.mul(.2))));
          });
        }
        If(isWeapon.and(attribute('aEquipment','vec4').x.notEqual(weapon.equipment)),()=>{animated.assign(vec3(0));});
      }
      // Holstered equipment follows the same full-body transformation as the
      // torso when reclining, dying or being carried. Previously it was reset
      // to the standing hip after these poses and floated above the sleeper.
      If(motion.z.equal(1).or(motion.z.equal(5)).or(motion.z.equal(POSE_SLEEP)).or(motion.z.equal(POSE_DEAD)), () => {
        const y = animated.y.toVar();
        animated.y.assign(animated.z.add(.19));
        animated.z.assign(float(.65).sub(y));
      });
      If(motion.z.equal(POSE_DEAD),()=>animated.z.assign(animated.z.mul(.78)));
      If(motion.z.equal(6),()=>{
        const x=animated.x.toVar(),y=animated.y.toVar(),z=animated.z.toVar();
        animated.assign(vec3(float(.65).sub(y),z.add(.19+.95/PAWN_MODEL_SCALE),x.add(.3)));
      });
      If(attribute('dye','float').equal(-3).and(attribute('aEquipment','vec4').y.notEqual(2).and(attribute('aEquipment','vec4').y.notEqual(3))),()=>{animated.assign(vec3(0));});
      // The existing apparel slot packs vest (bit 0), flak (bit 1) and
      // recon (bit 2); the two headgear kinds are mutually exclusive.
      const wornFlags=attribute('aEquipment','vec4').z,helmet=wornFlags.greaterThan(1.5),recon=wornFlags.greaterThan(3.5);
      If(attribute('dye','float').equal(-2).and(wornFlags.mod(2).lessThan(.5)),()=>{animated.assign(vec3(0));});
      If(attribute('dye','float').equal(FLAK_HELMET_DYE).and(helmet.not().or(recon)),()=>{animated.assign(vec3(0));});
      If(attribute('dye','float').equal(RECON_HELMET_DYE).and(recon.not()),()=>{animated.assign(vec3(0));});
      If(attribute('dye','float').equal(PARKA_HOOD_DYE).and(attribute('aEquipment','vec4').y.notEqual(4).or(helmet)),()=>{animated.assign(vec3(0));});
      // One face variant is visible at a time. The pause-controlled scene
      // clock also freezes blinks and sleep poses when the game is paused.
      const dye=attribute('dye','float'),asleep=motion.z.equal(POSE_SLEEP),dead=motion.z.equal(POSE_DEAD);
      // The presentation clock wraps at 2π during tracked play, so the
      // frequency is integral and cannot jump at that wrap boundary.
      const blink=sin(this.time.add(motion.w.mul(1.97))).greaterThan(.994);
      const face=dead.select(float(PAWN_EYE_CROSS),asleep.or(blink).select(float(PAWN_EYE_CLOSED),float(PAWN_EYE_OPEN)));
      If(dye.greaterThanEqual(PAWN_EYE_OPEN).and(dye.lessThanEqual(PAWN_EYE_CROSS)).and(dye.notEqual(face)),()=>animated.assign(vec3(0)));
      If(recon.and(dye.greaterThanEqual(PAWN_EYE_OPEN)).and(dye.lessThanEqual(PAWN_EYE_CROSS)),()=>animated.assign(vec3(0)));
      If(hiddenAppearancePart(),()=>animated.assign(vec3(0)));
      // Four anatomical bits share aShape.x. Degenerate each absent limb at
      // the common body origin after pose/portage transforms; colour and shadow
      // passes use this same node, without another mesh or actor attribute.
      const limbMask=attribute('aShape','vec4').x.div(100).floor();
      for(const limb of HUMAN_LIMB_VISUALS){
        const limbBone=limb.bones.reduce((matches,id)=>matches.or(bone.equal(id)),bone.equal(-1));
        If(limbBone.and(limbMask.div(limb.bit).floor().mod(2).greaterThan(.5)),()=>animated.assign(vec3(0)));
      }
      If(helmet.and(dye.greaterThanEqual(100)).and(dye.lessThan(200)),()=>animated.assign(vec3(0)));
      If(recon.and(dye.greaterThanEqual(200)),()=>animated.assign(vec3(0)));
      const rotStage=attribute('aShape','vec4').x.div(10).floor().mod(10);
      // A dried body loses the garment/hair silhouette and narrows in the
      // same resident rig. The palette below reveals a pale skeletal form.
      If(rotStage.greaterThan(1.5),()=>{
        If(dye.lessThan(0).or(dye.greaterThanEqual(100)),()=>animated.assign(vec3(0)));
        animated.x.assign(animated.x.mul(.78));
      });
      const cy = cos(pose.w), sy = sin(pose.w);
      return vec3(animated.x.mul(cy).add(animated.z.mul(sy)), animated.y, animated.z.mul(cy).sub(animated.x.mul(sy))).mul(PAWN_MODEL_SCALE).add(pose.xyz);
    })();
    const baseColor = Fn(()=>{const tint=mix(attribute('color','vec3'),attribute('aTint','vec3'),attribute('dye','float').equal(1).select(float(1),float(0))).toVar();
      If(attribute('dye','float').equal(-3).or(attribute('dye','float').equal(PARKA_HOOD_DYE)),()=>tint.assign(attribute('aTint','vec3')));
      If(attribute('aEquipment','vec4').y.equal(2).and(attribute('boneId','float').greaterThanEqual(2)).and(attribute('boneId','float').lessThanEqual(3)),()=>tint.assign(attribute('aSkin','vec3')));
      If(attribute('dye','float').equal(2),()=>tint.assign(attribute('aSkin','vec3')));
      If(attribute('dye','float').greaterThanEqual(100),()=>tint.assign(attribute('aHairBlood','vec4').xyz));
      const legs=attribute('boneId','float').greaterThanEqual(4).and(attribute('dye','float').equal(0));
      const cloth=new THREE.Color(0xd8c8a2),leather=new THREE.Color(0xad8a61);
      If(legs.and(attribute('aEquipment','vec4').w.equal(1)),()=>tint.assign(vec3(cloth.r,cloth.g,cloth.b)));
      If(legs.and(attribute('aEquipment','vec4').w.equal(2)),()=>tint.assign(vec3(leather.r,leather.g,leather.b)));
      {const color=new THREE.Color(0xa88b63);If(legs.and(attribute('aEquipment','vec4').w.equal(3)),()=>tint.assign(vec3(color.r,color.g,color.b)));}
      {const color=new THREE.Color(0x839ac5);If(legs.and(attribute('aEquipment','vec4').w.equal(4)),()=>tint.assign(vec3(color.r,color.g,color.b)));}
      {const color=new THREE.Color(0xc3a375);If(legs.and(attribute('aEquipment','vec4').w.equal(5)),()=>tint.assign(vec3(color.r,color.g,color.b)));}
      {const color=new THREE.Color(0xb3c0ba);If(legs.and(attribute('aEquipment','vec4').w.equal(6)),()=>tint.assign(vec3(color.r,color.g,color.b)));}
      {const color=new THREE.Color(0xb26422);If(legs.and(attribute('aEquipment','vec4').w.equal(7)),()=>tint.assign(vec3(color.r,color.g,color.b)));}
      const stage=attribute('aShape','vec4').x.div(10).floor().mod(10);
      {const red=new THREE.Color(0x965f58);If(stage.equal(1),()=>tint.assign(mix(tint,vec3(red.r,red.g,red.b),.7)));}
      {const bone=new THREE.Color(0xc9bd9b),dark=new THREE.Color(0x554e43);
        const eyes=attribute('dye','float').greaterThanEqual(PAWN_EYE_OPEN).and(attribute('dye','float').lessThanEqual(PAWN_EYE_CROSS));
        If(stage.greaterThan(1.5),()=>{
          tint.assign(eyes.select(vec3(dark.r,dark.g,dark.b),vec3(bone.r,bone.g,bone.b)));
          // Sparse dark gaps read as ribs in the existing torso geometry.
          const ribs=sin(positionLocal.y.mul(43)).greaterThan(.25);
          If(attribute('boneId','float').equal(0).and(attribute('dye','float').equal(1)),()=>tint.assign(ribs.select(vec3(bone.r,bone.g,bone.b),vec3(dark.r,dark.g,dark.b))));
        });}
      // Blood is drawn only on body/clothes, never weapon, hair or eye marks.
      const dye=attribute('dye','float'),bone=attribute('boneId','float');
      const region=bone.greaterThanEqual(6).select(bone.sub(2),bone);
      return bodyBloodPigment(tint,region,1,dye.equal(-3).or(dye.equal(-2)).or(dye.greaterThanEqual(0).and(dye.lessThan(3))).select(float(1),float(0)),attribute('aHairBlood','vec4').w);})();
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
    cargo.setAttribute('aHandoffFrom',new THREE.InstancedBufferAttribute(new Float32Array(count*4),4).setUsage(THREE.DynamicDrawUsage));
    cargo.setAttribute('aHandoffTo',new THREE.InstancedBufferAttribute(new Float32Array(count*4),4).setUsage(THREE.DynamicDrawUsage));
    const cargoMat = material(0xffffff);
    this.configure?.(cargoMat);
    cargoMat.colorNode = attribute('color', 'vec3');
    cargoMat.positionNode = Fn(() => {
      const pose = pawnPresentationPose(this);
      const load = attribute('aCargo', 'vec4');
      const scale = float(0).toVar();
      If(attribute('cargoKind', 'float').equal(load.x), () => {
        scale.assign(load.y.lessThan(0).select(float(1),load.y).mul(0.25).add(0.75));
        const bit=attribute('corpsePartMask','float');
        If(bit.greaterThan(0).and(load.y.lessThan(0)).and(load.y.negate().sub(1).div(bit.max(1)).floor().mod(2).greaterThan(.5)),()=>scale.assign(0));
      });
      const height = float(WORLD_SCALE.carriedHeight).toVar();
      If(attribute('aMotion','vec4').z.equal(1).or(attribute('aMotion','vec4').z.equal(POSE_SLEEP)).or(attribute('aMotion','vec4').z.equal(POSE_DEAD)),()=>{height.assign(.28);});
      If(attribute('aMotion', 'vec4').z.greaterThan(1.5).and(attribute('aMotion','vec4').z.lessThan(3.5)), () => { height.assign(sin(this.time.mul(4).add(attribute('aMotion', 'vec4').w)).mul(0.08).add(1.32)); });
      If(attribute('aMotion', 'vec4').z.equal(3), () => { height.addAssign(WORLD_SCALE.stoolHeight - 0.605 * PAWN_MODEL_SCALE); });
      If(attribute('aMotion','vec4').z.equal(6),()=>{height.assign(1.3);});
      const local = positionLocal.mul(scale).add(vec3(0, height, WORLD_SCALE.carriedForward));
      const cy = cos(pose.w), sy = sin(pose.w);
      const carried=vec3(local.x.mul(cy).add(local.z.mul(sy)), local.y, local.z.mul(cy).sub(local.x.mul(sy))).add(pose.xyz);
      const result=carried.toVar();
      const start=attribute('aHandoffFrom','vec4'),end=attribute('aHandoffTo','vec4');
      If(load.w.abs().greaterThan(.0001),()=>{
        const progress=this.cargoTime.sub(load.z).div(load.w.abs().sub(load.z).max(.001)).clamp(0,1);
        const smooth=progress.mul(progress).mul(float(3).sub(progress.mul(2)));
        const grounded=positionLocal.mul(scale.greaterThan(0).select(end.w,float(0)));
        If(load.w.greaterThan(0),()=>{
          result.assign(mix(start.xyz.add(grounded),carried,smooth));
        }).Else(()=>{
          const cx=cos(start.w),sx=sin(start.w),part=positionLocal.mul(scale);
          const released=vec3(part.x.mul(cx).add(part.z.mul(sx)),part.y,part.z.mul(cx).sub(part.x.mul(sx))).add(start.xyz);
          result.assign(mix(released,end.xyz.add(grounded),smooth));
        });
      });
      return result;
    })();
    this.cargoMesh = new THREE.Mesh(cargo, cargoMat);
    this.cargoMesh.name = 'Carried materials — shared GPU pawn poses';
    this.cargoMesh.frustumCulled = false;
    this.cargoMesh.castShadow = true;
    this.cargoMesh.receiveShadow = true;
    this.group.add(this.cargoMesh);
    this.fireMesh=attachedFireMesh(geometry,this);setFireTexturesEnabled(this.fireMesh,this.texturesEnabled);this.group.add(this.fireMesh);
    this.selectionMesh=pawnSelectionMesh(geometry,this);this.group.add(this.selectionMesh);
    const partial=cargoGeometry();
    partial.setAttribute('aTransferFrom',new THREE.InstancedBufferAttribute(new Float32Array(count*4),4).setUsage(THREE.DynamicDrawUsage));
    partial.setAttribute('aTransferTo',new THREE.InstancedBufferAttribute(new Float32Array(count*4),4).setUsage(THREE.DynamicDrawUsage));
    partial.setAttribute('aTransferCargo',new THREE.InstancedBufferAttribute(new Float32Array(count*4),4).setUsage(THREE.DynamicDrawUsage));
    const partialMat=material(0xffffff);this.configure?.(partialMat);
    partialMat.colorNode=attribute('color','vec3');
    partialMat.positionNode=Fn(()=>{
      const from=attribute('aTransferFrom','vec4'),to=attribute('aTransferTo','vec4'),load=attribute('aTransferCargo','vec4');
      const bit=attribute('corpsePartMask','float');
      const absent=bit.greaterThan(0).and(load.y.lessThan(0)).and(load.y.negate().sub(1).div(bit.max(1)).floor().mod(2).greaterThan(.5));
      const visible=attribute('cargoKind','float').equal(load.x).and(absent.not());
      const scale=visible.select(load.y.lessThan(0).select(float(1),load.y).mul(.25).add(.75),float(0));
      const part=positionLocal.mul(scale),c=cos(from.w),s=sin(from.w);
      const carried=vec3(part.x.mul(c).add(part.z.mul(s)),part.y,part.z.mul(c).sub(part.x.mul(s))).add(from.xyz);
      const landed=positionLocal.mul(visible.select(to.w,float(0))).add(to.xyz);
      const t=this.cargoTime.sub(load.z).div(load.w.sub(load.z).max(.001)).clamp(0,1);
      const smooth=t.mul(t).mul(float(3).sub(t.mul(2)));
      return mix(carried,landed,smooth);
    })();
    this.partialCargoMesh=new THREE.Mesh(partial,partialMat);
    this.partialCargoMesh.name='Partial material releases — resident transfer batch';
    this.partialCargoMesh.frustumCulled=false;this.partialCargoMesh.castShadow=true;this.partialCargoMesh.receiveShadow=true;
    this.group.add(this.partialCargoMesh);
  }

  private syncPartialCargo():void {
    if(!this.partialCargoMesh)return;
    const geometry=this.partialCargoMesh.geometry as THREE.InstancedBufferGeometry;
    const from=geometry.getAttribute('aTransferFrom') as THREE.InstancedBufferAttribute;
    const to=geometry.getAttribute('aTransferTo') as THREE.InstancedBufferAttribute;
    const cargo=geometry.getAttribute('aTransferCargo') as THREE.InstancedBufferAttribute;
    let index=0;
    for(const item of this.handoffs.active.values())if(item.partial){
      const [kind,size]=cargoAppearance(item.pile);
      from.setXYZW(index,item.from.x,item.from.y,item.from.z,item.from.yaw);
      to.setXYZW(index,item.to.x,item.to.y,item.to.z,item.groundScale);
      cargo.setXYZW(index,kind,size,localTimeSeconds(item.start,this.carryOrigin),localTimeSeconds(item.end,this.carryOrigin));
      index++;
    }
    geometry.instanceCount=index;
    if(index){from.needsUpdate=true;to.needsUpdate=true;cargo.needsUpdate=true;}
  }

  /** Read the already presented pose once at an ownership change. The release
   * then has a fixed hand origin even if the pawn starts its next route. */
  private presentedCargoAnchor(id:number,tick:number):CargoAnchor|undefined {
    const index=this.pawnIndices.get(id),geometry=this.pawnMesh?.geometry;
    if(index===undefined||!geometry)return;
    const from=geometry.getAttribute('aFrom') as THREE.InstancedBufferAttribute;
    const to=geometry.getAttribute('aTo') as THREE.InstancedBufferAttribute;
    const travel=geometry.getAttribute('aTravel') as THREE.InstancedBufferAttribute;
    const motion=geometry.getAttribute('aMotion') as THREE.InstancedBufferAttribute;
    const clock=localTimeSeconds(tick,this.travelOrigin),start=travel.getX(index),end=travel.getY(index);
    const alpha=end>start?THREE.MathUtils.clamp((clock-start)/(end-start),0,1):this.blend.value;
    const turnStart=travel.getW(index)>1?travel.getZ(index):start;
    const turnAlpha=end>start||travel.getW(index)>1?THREE.MathUtils.clamp((clock-turnStart)/(TURN_TICKS/TICKS_PER_SECOND),0,1):this.blend.value;
    const yaw=THREE.MathUtils.lerp(from.getW(index),to.getW(index),turnAlpha);
    const fraction=THREE.MathUtils.lerp(travel.getZ(index),travel.getW(index),alpha);
    const vertical=from.getY(index)<to.getY(index)?THREE.MathUtils.clamp(fraction*3,0,1)
      :from.getY(index)>to.getY(index)?THREE.MathUtils.clamp(fraction*3-2,0,1):fraction;
    const pose=motion.getZ(index);
    const height=pose===1||pose===POSE_SLEEP||pose===POSE_DEAD ? .28 : pose===6 ? 1.3 : WORLD_SCALE.carriedHeight;
    return {x:THREE.MathUtils.lerp(from.getX(index),to.getX(index),alpha)+Math.sin(yaw)*WORLD_SCALE.carriedForward,
      y:THREE.MathUtils.lerp(from.getY(index),to.getY(index),vertical)+height,
      z:THREE.MathUtils.lerp(from.getZ(index),to.getZ(index),alpha)+Math.cos(yaw)*WORLD_SCALE.carriedForward,yaw};
  }

  adoptCargo(previous:World|undefined,world:World,tick:number,animate:boolean):void {
    this.carryOrigin=Math.floor(tick/1024)*1024;
    this.handoffs.adopt(previous,world,tick,animate,id=>this.presentedCargoAnchor(id,tick));
  }

  /** Only the clock uniform changes on ordinary frames. Instance attributes and
   * static pile chunks change when the short transfer starts or completes. */
  presentCargo(tick:number,world:World):boolean {
    if(!this.cargoMesh||!this.pawnMesh)return false;
    const cargo=this.pawnMesh.geometry.getAttribute('aCargo') as THREE.InstancedBufferAttribute;
    const nextOrigin=Math.floor(tick/1024)*1024;
    if(nextOrigin!==this.carryOrigin){
      this.carryOrigin=nextOrigin;
      for(const [id,transition] of this.handoffs.active){
        const index=this.pawnIndices.get(id);if(index===undefined)continue;
        cargo.setZ(index,localTimeSeconds(transition.start,nextOrigin));
        cargo.setW(index,(transition.direction==='pickup'?1:-1)*localTimeSeconds(transition.end,nextOrigin));
      }
      cargo.needsUpdate=true;
      this.syncPartialCargo();
    }
    this.cargoTime.value=localTimeSeconds(tick,this.carryOrigin);
    if(this.handoffs.active.size===0)return false;
    const expired=[...this.handoffs.active.values()].filter(item=>tick>=item.end);
    const refresh=this.handoffs.complete(tick);
    if(expired.length){
      const carried=new Map<number,MaterialPile>();
      for(const pile of world.piles)if(pile.owner.type==='pawn'&&!pile.humanCorpse)carried.set(pile.owner.pawnId,pile);
      for(const item of expired){
        const index=this.pawnIndices.get(item.pawnId);if(index===undefined)continue;
        const [kind,size]=cargoAppearance(carried.get(item.pawnId));
        cargo.setXYZW(index,kind,size,0,0);
      }
      cargo.needsUpdate=true;
      this.syncPartialCargo();
    }
    return refresh;
  }

  update(world: World, oldBlend: number, newMap: boolean): void {
    this.travelKeys.clear();this.travelSurfaces=furnitureSurfaces(world);
    if(newMap){this.headings.clear();this.approachTransitions.clear();this.departureOffsets.clear();this.workOffsets.clear();this.crouchTransitions.clear();this.shownPoses.clear();this.gait.clear();this.handoffs.clear();}
    const indices=new Map<number,number>(),pawnsById=new Map<number,Pawn>();
    world.pawns.forEach((p,i)=>{indices.set(p.id,i);pawnsById.set(p.id,p);});
    this.rescuePairs=world.pawns.flatMap((p,i)=>p.rescue?.phase==='carry'&&indices.has(p.rescue.patientId)?[[i,indices.get(p.rescue.patientId)!] as const]:[]);
    this.rescuePairs=[...this.rescuePairs,...world.piles.flatMap(p=>p.humanCorpse&&p.owner.type==='pawn'&&indices.has(p.owner.pawnId)&&indices.has(p.humanCorpse.pawnId)?[[indices.get(p.owner.pawnId)!,indices.get(p.humanCorpse.pawnId)!] as const]:[])];
    const bodies=new Map(world.piles.filter(p=>p.humanCorpse).map(p=>[p.humanCorpse!.pawnId,p]));
    const retainedOffsets=retainedHumanCorpseOffsets(world);
    if (!this.pawnMesh) this.createPawnMesh(Math.max(1,world.pawns.length));
    else if(this.pawnMesh.geometry.getAttribute('aFrom').count<world.pawns.length)growPawnBuffers([this.pawnMesh,this.cargoMesh!,this.selectionMesh!,this.fireMesh!,this.partialCargoMesh!],world.pawns.length);
    const geometry = this.pawnMesh!.geometry as THREE.InstancedBufferGeometry;
    const flames=geometry.getAttribute('aFire') as THREE.InstancedBufferAttribute;
    const burning=new Map((world.fires?.items??[]).filter(f=>f.attachedPawnId!==undefined).map(f=>[f.attachedPawnId!,f.size]));
    let fireCount=0;
    world.pawns.forEach((p,i)=>{
      const size=burning.has(p.id)?Math.max(.5,burning.get(p.id)!):0;
      flames.setX(i,size);if(size>0)fireCount=i+1;
    });
    if(!world.pawns.length)flames.setX(0,0);flames.needsUpdate=true;
    // Keep actor indices and shared attributes; omit only the unused tail.
    (this.fireMesh!.geometry as THREE.InstancedBufferGeometry).instanceCount=fireCount;
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
    const skin=geometry.getAttribute('aSkin'),hair=geometry.getAttribute('aHair'),shape=geometry.getAttribute('aShape'),blood=geometry.getAttribute('aBodyBlood');
    const cargo = geometry.getAttribute('aCargo') as THREE.InstancedBufferAttribute;
    const handoffFrom=this.cargoMesh!.geometry.getAttribute('aHandoffFrom') as THREE.InstancedBufferAttribute;
    const handoffTo=this.cargoMesh!.geometry.getAttribute('aHandoffTo') as THREE.InstancedBufferAttribute;
    const equipment=geometry.getAttribute('aEquipment') as THREE.InterleavedBufferAttribute,gears=equipmentProjection(world),apparel=apparelProjection(world);
    const carried = new Map<number, World['piles'][number]>();
    for (const pile of world.piles) if (pile.owner.type === 'pawn') carried.set(pile.owner.pawnId, pile);
    let jobsById:Map<number,World['jobs'][number]>|undefined;
    const present = new Set<number>();
    world.pawns.forEach((pawn, index) => {
      present.add(pawn.id);
      const previous = newMap ? undefined : this.visuals.get(pawn.id);
      // A stationary actor retains its last travel heading after a save reload.
      // Work with an external target and bed posture override it below.
      const initialYaw=pawn.motion?Math.atan2(pawn.motion.to.x-pawn.motion.from.x,pawn.motion.to.z-pawn.motion.from.z):Math.PI*.2+(pawn.state==='dead'?(pawn.id%5-2)*.14:0);
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
      if(pawn.state==='dead'&&!pawn.motion)yaw=initialYaw;
      const bedId = pawn.need?.kind === 'sleep' ? pawn.need.bedId : null;
      if(pawn.feed?.phase==='feed'){const p=pawnsById.get(pawn.feed.patientId);if(p)yaw=Math.atan2(p.x-pawn.x,p.z-pawn.z);}
      if(pawn.tend?.phase==='tend'&&pawn.tend.patientId!==pawn.id){const p=pawnsById.get(pawn.tend.patientId);if(p)yaw=Math.atan2(p.x-pawn.x,p.z-pawn.z);}
      if(pawn.surgery?.phase==='work'){const p=pawnsById.get(pawn.surgery.patientId);if(p)yaw=Math.atan2(p.x-pawn.x,p.z-pawn.z);}
      const bed = (pawn.state === 'sleeping'||pawn.state==='resting'||pawn.state==='downed') && bedId !== null ? world.structures.find(item => item.id === bedId) : undefined;
      const seated=seatedOnFurniture(pawn);
      let px = pawn.x, pz = pawn.z, py = seated||pawn.state==='eating'||pawn.state==='sleeping'||pawn.state==='resting'||medicallyStopped(pawn)?0:this.travelSurfaces.get(pawn.z*world.width+pawn.x)??0;
      const body=bodies.get(pawn.id);
      const hiddenBody=pawn.body?.lostAt!==undefined||pawn.body?.pileId!==undefined&&(!body||body.owner.type==='grave');
      if(body?.owner.type==='ground'){px=body.owner.x;pz=body.owner.z;py=0;}
      const retainedOffset=retainedOffsets.get(pawn.id);
      if(retainedOffset){px+=retainedOffset.x;pz+=retainedOffset.z;py+=retainedOffset.y;}
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
      // A task already owns the final travel edge before the worker changes to
      // `working`. Resolve that target early so the edge ends at its visual
      // contact pose instead of arriving at the cell centre and sliding later.
      const arriving=pawn.state==='moving'&&pawn.moveCooldown>0&&pawn.path.length===0&&!!pawn.motion&&pawn.motion.to.x===pawn.x&&pawn.motion.to.z===pawn.z;
      const job=pawn.jobId===null?undefined:(jobsById??=new Map(world.jobs.map(j=>[j.id,j]))).get(pawn.jobId);
      const garment=pawn.equipmentTask?.action==='wear'?world.piles.find(p=>p.id===pawn.equipmentTask!.itemId):undefined;
      const dressing=garment?.owner.type==='ground'?garment.owner:undefined;
      const fighting=pawn.firefighting?world.fires?.items.find(f=>f.id===pawn.firefighting!.fireId):undefined;
      const fireTarget=fighting?firePosition(world,fighting):undefined;
      const fuelDestination=pawn.haul?.destination.type==='fuel'?pawn.haul.destination:undefined;
      const station=pawn.state==='working'||arriving ? pawn.research ? world.structures.find(s=>s.id===pawn.research!.stationId) : pawn.cooking?.phase==='work' ? world.structures.find(s=>s.id===pawn.cooking!.stationId) : pawn.haul?.serviceProgress!==undefined&&fuelDestination ? world.structures.find(s=>s.id===fuelDestination.structureId) : undefined : undefined;
      const workPose=pawnWorkPose(pawn,job,station?.kind);
      const stationCell=station ? footprintCells(station).reduce((best,cell)=>Math.hypot(cell.x-pawn.x,cell.z-pawn.z)<Math.hypot(best.x-pawn.x,best.z-pawn.z)?cell:best) : undefined;
      const patient=pawn.feed?.phase==='feed'?pawnsById.get(pawn.feed.patientId):pawn.tend?.phase==='tend'?pawnsById.get(pawn.tend.patientId):pawn.surgery?.phase==='work'?pawnsById.get(pawn.surgery.patientId):undefined;
      const handledAnimal=pawn.animalCare?.phase==='treat'?world.wildlife?.animals.find(a=>a.id===pawn.animalCare!.animalId)
        :pawn.animalHandling?.phase==='interact'?world.wildlife?.animals.find(a=>a.id===pawn.animalHandling!.animalId):undefined;
      const work = pawn.state==='working'||arriving ? fireTarget ?? (job?constructionWorkTarget(world,job):dressing) ?? (pawn.hunting?.phase==='finish' ? world.wildlife?.animals.find(a=>a.id===pawn.hunting!.animalId) : patient ?? handledAnimal ?? stationCell ?? pawn.cooking?.actionCell ?? pawn.haul?.pickupCell) : undefined;
      if(work&&pawn.state==='working') yaw=Math.atan2(work.x-pawn.x,work.z-pawn.z);
      const contactPose=arriving?pawnWorkPose({...pawn,state:'working'},job,station?.kind):workPose;
      const atBench=station?.kind==='research-bench'||station?.kind==='hi-tech-research-bench'||station?.kind==='fabrication-bench'||station?.kind==='butcher-table'||station?.kind==='machining-table'||station?.kind==='stonecutter'||station?.kind==='art-bench'||station?.kind==='tailor-bench'||station?.kind==='electric-tailor-bench'||station?.kind==='electric-stove'||station?.kind==='fueled-stove';
      const clearance=job?.kind==='mine' ? .9 : atBench ? .88 : .82;
      const pair=pawn.social?.fight?pawnsById.get(pawn.social.fight.opponentId):undefined;
      const socialOpponent=pair?.social?.fight?.opponentId===pawn.id&&!medicallyStopped(pair)?pair:undefined;
      const humanOpponent=pawn.melee?.order&&!pawn.melee.order.structure?pawnsById.get(pawn.melee.order.targetId):socialOpponent;
      const fightContact=humanOpponent&&humanOpponent.state!=='dead'&&!medicallyStopped(pawn)&&(pawn.state!=='moving'||arriving)
        ? meleeApproach(pawn,humanOpponent):undefined;
      const reach=fightContact&&(fightContact.x!==0||fightContact.z!==0)?fightContact
        :contactPose!==WORK_POSE.ground&&contactPose!==0&&!station?.kind.includes('spot') ? workApproach(pawn,work,clearance) : {x:0,z:0};
      this.workOffsets.set(pawn.id,reach);
      if(newMap)this.approachTransitions.set(pawn.id,{fromX:reach.x,fromZ:reach.z,toX:reach.x,toZ:reach.z,start:world.tick,baseX:pawn.x,baseZ:pawn.z});
      px+=reach.x;pz+=reach.z;
      const recreation=pawn.state==='recreating'?pawn.recreation.task:null;
      const leisureSite=recreation&&recreation.buildingId!==null&&recreation.activity!=='skygaze'?world.structures.find(s=>s.id===recreation.buildingId):undefined;
      const leisureTarget=recreation?.activity==='visit-sick'?pawnsById.get(recreation.patientId!):leisureSite
        ?footprintCells(leisureSite).reduce((nearest,cell)=>(cell.x-pawn.x)**2+(cell.z-pawn.z)**2<(nearest.x-pawn.x)**2+(nearest.z-pawn.z)**2?cell:nearest)
        :undefined;
      if(leisureTarget)yaw=Math.atan2(leisureTarget.x-pawn.x,leisureTarget.z-pawn.z);
      const melee=pawn.melee?.strike;
      const shotTarget=pawn.shooting?.stance?pawn.shooting.order?.targetId??(pawn.shooting.stance.phase==='cooldown'?pawn.lastAttack?.targetId:undefined):undefined;
      const aim=melee?(melee.structure??pawnsById.get(melee.targetId)??world.wildlife?.animals.find(a=>a.id===melee.targetId)??world.raids?.departed.find(d=>d.pawnId===melee.targetId)?.cell):humanOpponent??(shotTarget?(pawnsById.get(shotTarget)??world.wildlife?.animals.find(a=>a.id===shotTarget)):undefined);
      if(aim)yaw=Math.atan2(aim.x-pawn.x,aim.z-pawn.z);
      const to = new THREE.Vector4(px, py, pz, yaw);
      if (!previous||hiddenBody||previous.to.y< -100) from.copy(to);
      this.targetPoses.set(pawn.id,to.clone());
      this.visuals.set(pawn.id, { from, to });
      fromAttribute.setXYZW(index, from.x, from.y, from.z, from.w);
      toAttribute.setXYZW(index, to.x, to.y, to.z, to.w);
      this.workPoses.set(pawn.id,workPose);
      const smallMelee=!!pawn.melee?.strike&&(world.wildlife?.animals.some(animal=>animal.id===pawn.melee!.strike!.targetId&&animal.species==='hare')??false);
      motion.setXYZW(index, pawn.state === 'moving'&&!pawn.stun ? 1 : 0,workActivity(pawn),animationPose(pawn,workPose,smallMelee,seated),pawn.melee?.strike ? coreTimeSeconds(pawn.melee.strike.atCore,Math.floor(world.tick/1024)*1024) : pawn.shooting?.stance?.phase==='cooldown'?coreTimeSeconds(pawn.shooting.stance.startedAtCore,Math.floor(world.tick/1024)*1024):pawn.id * 1.7);
      const identity=appearanceOf(pawn,world.seed),variant=appearanceShape(identity);
      blood.setX(index,bodyBloodWord(pawn.health));
      scratchColor.setHex(identity.skinColor);skin.setXYZ(index,scratchColor.r,scratchColor.g,scratchColor.b);
      scratchColor.setHex(identity.hairColor);hair.setXYZ(index,scratchColor.r,scratchColor.g,scratchColor.b);
      shape.setXYZW(index,packHumanShape(variant[0],humanCorpseVisualStage(world,pawn,body),humanLimbVisualMask(pawn)),variant[1],variant[2],variant[3]);
      const look=apparelAppearance(apparel.get(pawn.id));
      scratchColor.setHex(look.color??(isColonist(pawn)?pawnBaseColor(pawn.id):pawn.visitor&&!world.visitors?.groups.find(g=>g.id===pawn.visitor!.group)?.hostile?0x77958f:0xb74736));
      if(pawn.state==='dead')scratchColor.setHex(0x73756c);
      tint.setXYZ(index, scratchColor.r, scratchColor.g, scratchColor.b);
      equipment.setXYZW(index,weaponVisual(gears.get(pawn.id)?.item)?.equipment??0,look.silhouette,(look.vest?1:0)+(look.reconHelmet?4:look.helmet?2:0),look.pants);
      const load = carried.get(pawn.id);
      const packed=world.packed?.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id);
      const handoff=this.handoffs.active.get(pawn.id);
      const mainHandoff=handoff?.partial?undefined:handoff;
      const [kind,size]=cargoAppearance(mainHandoff?.direction==='drop'?mainHandoff.pile:load);
      cargo.setXYZW(index,pawn.rescue?.phase==='carry'||load?.humanCorpse?-1:packed?4:kind,packed?1:size,
        mainHandoff?localTimeSeconds(mainHandoff.start,this.carryOrigin):0,
        mainHandoff?(mainHandoff.direction==='pickup'?1:-1)*localTimeSeconds(mainHandoff.end,this.carryOrigin):0);
      if(mainHandoff){
        handoffFrom.setXYZW(index,mainHandoff.from.x,mainHandoff.from.y,mainHandoff.from.z,mainHandoff.from.yaw);
        handoffTo.setXYZW(index,mainHandoff.to.x,mainHandoff.to.y,mainHandoff.to.z,mainHandoff.groundScale);
      }else{
        handoffFrom.setXYZW(index,0,0,0,0);handoffTo.setXYZW(index,0,0,0,0);
      }
    });
    for (const id of this.visuals.keys()) if (!present.has(id)){this.visuals.delete(id);this.targetPoses.delete(id);this.headings.delete(id);this.workPoses.delete(id);this.workOffsets.delete(id);this.approachTransitions.delete(id);this.departureOffsets.delete(id);this.crouchTransitions.delete(id);this.shownPoses.delete(id);this.gait.delete(id);}
    this.pawnIndices.clear();for(const [id,index] of indices)this.pawnIndices.set(id,index);
    for (const attr of [fromAttribute, toAttribute, motion, tint, cargo,handoffFrom,handoffTo]) attr.needsUpdate = true;
    geometry.instanceCount = world.pawns.length;
    (this.cargoMesh!.geometry as THREE.InstancedBufferGeometry).instanceCount = world.pawns.length;
    this.syncPartialCargo();
    (this.selectionMesh!.geometry as THREE.InstancedBufferGeometry).instanceCount=world.pawns.length;
    this.pawnIds=world.pawns.map(p=>p.id);this.setSelected(this.selected);
  }

  /** CPU chooses a confirmed edge; translation, orientation and rig evaluation stay on GPU. */
  updateTravel(world:World,timeline:MotionTimeline):void {
    if(!this.pawnMesh)return;
    const geometry=this.pawnMesh.geometry;
    const from=geometry.getAttribute('aFrom') as THREE.InstancedBufferAttribute,to=geometry.getAttribute('aTo') as THREE.InstancedBufferAttribute,times=geometry.getAttribute('aTravel') as THREE.InstancedBufferAttribute,motion=geometry.getAttribute('aMotion') as THREE.InstancedBufferAttribute;
    const origin=Math.floor(timeline.tick/1024)*1024;
    this.travelOrigin=origin;
    this.travelTime.value=localTimeSeconds(timeline.tick,origin);
    let dirty=false;
    world.pawns.forEach((pawn,i)=>{
      const segment=pawn.body?.pileId!==undefined||pawn.body?.lostAt!==undefined?undefined:timeline.segment(pawn.id);
      const active=!!segment && timeline.tick<segment.end;
      const onEdge=!!segment&&(active||pawn.state==='moving'||world.tick<segment.end);
      const stepping=onEdge&&!!segment&&active&&!medicallyStopped(pawn)&&(segment.fromFraction??0)!==(segment.toFraction??1)&&timeline.tick>=segment.start;
      const smallMelee=!!pawn.melee?.strike&&(world.wildlife?.animals.some(animal=>animal.id===pawn.melee!.strike!.targetId&&animal.species==='hare')??false);
      const shownPose=onEdge?(medicallyStopped(pawn)?1:0)
        :animationPose(pawn,this.workPoses.get(pawn.id)??0,smallMelee,seatedOnFurniture(pawn));
      this.showPose(pawn.id,shownPose,timeline.tick);
      const key=`${origin}:${segment?.start}:${segment?.end}:${segment?.edgeStart}:${segment?.fromFraction}:${segment?.toFraction}:${active}:${!!segment&&timeline.tick>=segment.start}:${pawn.state}:${shownPose}:${pawn.path[0]?.x}:${pawn.path[0]?.z}`;
      if(this.travelKeys.get(pawn.id)===key)return;
      this.travelKeys.set(pawn.id,key);dirty=true;
      const visual=this.visuals.get(pawn.id)!;
      if(onEdge&&segment) {
        const yaw=Math.atan2(segment.to.x-segment.from.x,segment.to.z-segment.from.z);
        const previous=this.headings.get(pawn.id);
        let heading=turnToward(previous,yaw,segment.start);
        if(previous&&heading===previous&&previous.startTick!==segment.start)heading={from:headingAt(previous,segment.start),to:previous.to,startTick:segment.start};
        this.headings.set(pawn.id,heading);
        const a=segment.fromFraction??0,b=segment.toFraction??1,lerp=THREE.MathUtils.lerp;
        const y0=this.travelSurfaces.get(segment.from.z*world.width+segment.from.x)??0,y1=this.travelSurfaces.get(segment.to.z*world.width+segment.to.x)??0;
        // Preserve the original confirmed edge fractions through a change of
        // pace; the ground movement helper supplies its height primitives.
        visual.from.set(lerp(segment.from.x,segment.to.x,a),y0,lerp(segment.from.z,segment.to.z,a),heading.from);
        visual.to.set(lerp(segment.from.x,segment.to.x,b),y1,lerp(segment.from.z,segment.to.z,b),heading.to);
        const edgeStart=segment.edgeStart??segment.start;
        let departure=this.departureOffsets.get(pawn.id);
        if(!departure||departure.start!==edgeStart){
          const previous=this.approachTransitions.get(pawn.id);
          const offset=previous&&previous.baseX===segment.from.x&&previous.baseZ===segment.from.z?approachAt(previous,edgeStart):{x:0,z:0};
          const planned=this.workOffsets.get(pawn.id);
          const finalCell=segment.to.x===pawn.x&&segment.to.z===pawn.z&&pawn.path.length===0;
          departure={start:edgeStart,x:offset.x,z:offset.z,arrivalX:finalCell?planned?.x??0:0,arrivalZ:finalCell?planned?.z??0:0};
          this.departureOffsets.set(pawn.id,departure);
        }
        // The first part of a confirmed edge departs from the reached work
        // pose, then converges on the same authoritative destination.
        visual.from.x+=departure.x*(1-a);visual.from.z+=departure.z*(1-a);
        visual.to.x+=departure.x*(1-b);visual.to.z+=departure.z*(1-b);
        visual.from.x+=departure.arrivalX*a;visual.from.z+=departure.arrivalZ*a;
        visual.to.x+=departure.arrivalX*b;visual.to.z+=departure.arrivalZ*b;
        this.approachTransitions.delete(pawn.id);
        times.setXYZW(i,localTimeSeconds(segment.start,origin),localTimeSeconds(segment.end,origin),a,b);
        motion.setX(i,motionX(!medicallyStopped(pawn)&&active&&a!==b&&timeline.tick>=segment.start,this.crouchTransitions.get(pawn.id),origin));
        if(stepping)motion.setW(i,this.gait.begin(pawn.id,{
          start:segment.start,end:segment.end,
          fromX:visual.from.x,fromZ:visual.from.z,toX:visual.to.x,toZ:visual.to.z,
        },timeline.tick,HUMAN_GAIT_RADIANS_PER_UNIT));
        else this.gait.halt(pawn.id,timeline.tick,HUMAN_GAIT_RADIANS_PER_UNIT);
        motion.setY(i,0);
        motion.setZ(i,shownPose);
      } else {
        this.gait.halt(pawn.id,timeline.tick,HUMAN_GAIT_RADIANS_PER_UNIT);
        const desired=this.workOffsets.get(pawn.id)??{x:0,z:0};
        const target=this.targetPoses.get(pawn.id)!;
        const baseX=target.x-desired.x,baseZ=target.z-desired.z;
        let approach=this.approachTransitions.get(pawn.id);
        if(!approach||approach.baseX!==baseX||approach.baseZ!==baseZ||Math.abs(approach.toX-desired.x)>1e-5||Math.abs(approach.toZ-desired.z)>1e-5){
          // An edge or a changed work cell can leave no approach record even
          // though the last rendered pose is still off centre. Begin from that
          // shared pose rather than teleporting back to the logical cell.
          const edgeStart=segment?.edgeStart??segment?.start;
          const edgeArrival=segment&&timeline.tick>=segment.end&&(segment.toFraction??1)>=1&&segment.to.x===baseX&&segment.to.z===baseZ&&this.departureOffsets.get(pawn.id)?.start===edgeStart?this.departureOffsets.get(pawn.id):undefined;
          const visualX=edgeArrival?.arrivalX??visual.from.x-baseX,visualZ=edgeArrival?.arrivalZ??visual.from.z-baseZ;
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
        // Unexpected target changes still get a short, visibly stepping
        // adjustment. Normal task arrivals already reach contact on the edge.
        motion.setX(i,motionX(shifting,this.crouchTransitions.get(pawn.id),origin));motion.setY(i,workActivity(pawn));
        motion.setZ(i,shownPose);
      }
      if(!stepping){
        if(pawn.melee?.strike)motion.setW(i,coreTimeSeconds(pawn.melee.strike.atCore,origin));
        else if(pawn.shooting?.stance?.phase==='cooldown')motion.setW(i,coreTimeSeconds(pawn.shooting.stance.startedAtCore,origin));
        else motion.setW(i,pawn.id*1.7);
      }
      from.setXYZW(i,visual.from.x,visual.from.y,visual.from.z,visual.from.w);to.setXYZW(i,visual.to.x,visual.to.y,visual.to.z,visual.to.w);
    });
    let crouchFinished=false;
    for(const [id,transition] of this.crouchTransitions){
      if(timeline.tick<transition.start+CROUCH_TICKS)continue;
      this.crouchTransitions.delete(id);
      const index=this.pawnIndices.get(id);
      if(index===undefined)continue;
      const value=motion.getX(index);
      if(value>=-.5)continue;
      motion.setX(index,-value-1>=CROUCH_WALK_MARK?1:0);
      crouchFinished=true;
    }
    if(dirty){
      // Both actors, their loads and selection rings use exactly the same edge
      // and yaw. The carried rig is an extra pose in the existing GPU batch.
      for(const [carrier,patient] of this.rescuePairs){
        from.setXYZW(patient,from.getX(carrier),from.getY(carrier),from.getZ(carrier),from.getW(carrier));
        to.setXYZW(patient,to.getX(carrier),to.getY(carrier),to.getZ(carrier),to.getW(carrier));
        times.setXYZW(patient,times.getX(carrier),times.getY(carrier),times.getZ(carrier),times.getW(carrier));motion.setXYZ(patient,0,0,6);
        this.crouchTransitions.delete(world.pawns[patient]!.id);this.shownPoses.set(world.pawns[patient]!.id,6);
        const source=this.visuals.get(world.pawns[carrier]!.id)!,target=this.visuals.get(world.pawns[patient]!.id)!;
        target.from.copy(source.from);target.to.copy(source.to);
        const heading=this.headings.get(world.pawns[carrier]!.id);if(heading)this.headings.set(world.pawns[patient]!.id,{...heading});
      }
      for(const attribute of [from,to,times,motion])attribute.needsUpdate=true;
    }else if(crouchFinished)motion.needsUpdate=true;
  }

  dispose(): void {
    clearGroup(this.group);
    this.plainMaterial?.dispose();
    this.texturedMaterial?.dispose();
    this.surfaceTexture.dispose();
    this.pawnMesh = this.cargoMesh = this.partialCargoMesh = this.fireMesh = this.selectionMesh = null;
  }

}
import { medicallyStopped } from '../sim/health-rules';
