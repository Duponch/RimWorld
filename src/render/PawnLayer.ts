import { doorAt } from '../sim/door-rules';
import { BLOCK_ITEMS, blockCargoKind } from './block-presentation';
import { furnitureSurfaces } from './furniture-motion';
import { pawnPresentationPose } from './pawn-presentation';
import { constructionWorkTarget } from '../sim/construction-rules';
import { pawnSelectionMesh } from './PawnSelectionLayer';
import type { MotionTimeline } from './MotionTimeline';
import * as THREE from 'three/webgpu';
import { Fn, If, attribute, cos, float, mix, positionLocal, sin, uniform, vec3 } from 'three/tsl';
import type { World } from '../sim/types';
import { CHUNK_ITEMS, chunkCargoKind } from './chunk-presentation';
import { ITEM_DEFINITIONS } from '../sim/items';
import { adjacentTable } from '../sim/dining';
import { CARRY_CAPACITY, footprintCells } from '../sim/definitions';
import { PAWN_MODEL_SCALE, WORLD_SCALE } from '../world/scale';
import { clearGroup, material } from './primitives';
type VisualPawn = { from: THREE.Vector4; to: THREE.Vector4 };
const PAWN_COLORS = [0xeab969, 0x639eac, 0xc57c65, 0x809864, 0xaa8db2];
const scratchColor = new THREE.Color();

/** Eight rigid bones, authored entirely in code. Each vertex has one bone influence.
 * The bind position/pivot and animation state are evaluated in the vertex shader.
 * There is no per-pawn AnimationMixer, bone Object3D tree or CPU bone update.
 * This deliberately small prototype rig is not yet the future glTF atlas importer.
 */
function pawnGeometry(): THREE.InstancedBufferGeometry {
  const positions: number[] = [], normals: number[] = [], colors: number[] = [];
  const bones: number[] = [], pivots: number[] = [], dyes: number[] = [];
  const addPart = (size: number[], center: number[], bone: number, pivot: number[], color: number, dye = 0) => {
    const box = new THREE.BoxGeometry(size[0], size[1], size[2]).toNonIndexed();
    const pos = box.getAttribute('position'), normal = box.getAttribute('normal');
    const col = new THREE.Color(color);
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i) + center[0], pos.getY(i) + center[1], pos.getZ(i) + center[2]);
      normals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
      colors.push(col.r, col.g, col.b);
      bones.push(bone); pivots.push(...pivot); dyes.push(dye);
    }
    box.dispose();
  };
  addPart([0.35, 0.43, 0.22], [0, 0.82, 0], 0, [0, 0.61, 0], 0xffffff, 1);
  addPart([0.3, 0.3, 0.28], [0, 1.19, 0.01], 1, [0, 1.04, 0], 0xe2b899);
  addPart([0.32, 0.11, 0.3], [0, 1.35, -0.02], 1, [0, 1.04, 0], 0x554741);
  addPart([0.27, 0.15, 0.08], [0, 1.23, -0.13], 1, [0, 1.04, 0], 0x554741);
  for (const side of [-1, 1]) {
    const arm = side < 0 ? 2 : 3, leg = side < 0 ? 4 : 5, calf = side < 0 ? 6 : 7;
    addPart([0.12, 0.28, 0.15], [side * 0.23, 0.85, 0], arm, [side * 0.23, 1.01, 0], 0xffffff, 1);
    addPart([0.115, 0.12, 0.14], [side * 0.23, 0.65, 0], arm, [side * 0.23, 1.01, 0], 0xe2b899);
    addPart([0.135, 0.21, 0.17], [side * 0.105, 0.505, 0], leg, [side * 0.105, 0.61, 0], 0x495052);
    addPart([0.13, 0.235, 0.16], [side * 0.105, 0.2825, 0], calf, [side * 0.105, 0.61, 0], 0x495052);
    addPart([0.145, 0.12, 0.23], [side * 0.105, 0.11, 0.03], calf, [side * 0.105, 0.61, 0], 0x443e37);
    addPart([0.035, 0.035, 0.014], [side * 0.07, 1.2, 0.157], 1, [0, 1.04, 0], 0x433e39);
  }
  const geometry = new THREE.InstancedBufferGeometry();
  // WebGPU guarantees only eight vertex-buffer slots. Keeping authored attributes
  // interleaved leaves room for the five independent per-instance attributes.
  const vertexData = new Float32Array(bones.length * 14);
  for (let i = 0; i < bones.length; i++) {
    vertexData.set(positions.slice(i * 3, i * 3 + 3), i * 14);
    vertexData.set(normals.slice(i * 3, i * 3 + 3), i * 14 + 3);
    vertexData.set(colors.slice(i * 3, i * 3 + 3), i * 14 + 6);
    vertexData[i * 14 + 9] = bones[i];
    vertexData.set(pivots.slice(i * 3, i * 3 + 3), i * 14 + 10);
    vertexData[i * 14 + 13] = dyes[i];
  }
  const vertices = new THREE.InterleavedBuffer(vertexData, 14);
  geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(vertices, 3, 0));
  geometry.setAttribute('normal', new THREE.InterleavedBufferAttribute(vertices, 3, 3));
  geometry.setAttribute('color', new THREE.InterleavedBufferAttribute(vertices, 3, 6));
  geometry.setAttribute('boneId', new THREE.InterleavedBufferAttribute(vertices, 1, 9));
  geometry.setAttribute('bindPivot', new THREE.InterleavedBufferAttribute(vertices, 3, 10));
  geometry.setAttribute('dye', new THREE.InterleavedBufferAttribute(vertices, 1, 13));
  geometry.instanceCount = 0;
  return geometry;
}

/** Cargo is a second instanced batch sharing the pawn pose attributes. Its
 * attachment and interpolation stay on the GPU, including during camera motion.
 * These bundles indicate kind/load; individual logs are not individual items.
 */
function cargoGeometry(): THREE.InstancedBufferGeometry {
  const data: number[] = [];
  const part = (size: number[], center: number[], kind: number, color: number) => {
    const box = new THREE.BoxGeometry(size[0], size[1], size[2]).toNonIndexed();
    const positions = box.getAttribute('position'), normals = box.getAttribute('normal');
    const tint = new THREE.Color(color);
    for (let i = 0; i < positions.count; i++) data.push(
      positions.getX(i) + center[0], positions.getY(i) + center[1], positions.getZ(i) + center[2],
      normals.getX(i), normals.getY(i), normals.getZ(i), tint.r, tint.g, tint.b, kind,
    );
    box.dispose();
  };
  part([0.56, 0.105, 0.12], [0, -0.025, -0.08], 1, 0xa37b4d);
  part([0.56, 0.105, 0.12], [0, -0.025, 0.08], 1, 0xb08c5d);
  part([0.54, 0.105, 0.12], [0, 0.07, 0], 1, 0xc6a477);
  part([0.07, 0.22, 0.3], [0.14, 0.015, 0], 1, 0x66584b);
  part([0.44, 0.2, 0.32], [0, -0.035, 0], 2, 0x947653);
  for (const x of [-0.1, 0.1]) for (const z of [-0.075, 0.075]) {
    part([0.15, 0.1, 0.12], [x, 0.09, z], 2, x * z > 0 ? 0xba7e65 : 0xb9705c);
  }
  part([0.60,0.44,0.46],[0,0,0],4,0xb6996c);
  part([0.12,0.46,0.48],[0,0,0],4,0x6f634e);
  part([0.38, 0.16, 0.26], [0, 0, 0], 3, 0xc7b96b);
  part([0.09, 0.17, 0.27], [0, 0, 0], 3, 0x86804e);
  part([.55,.2,.3],[0,0,0],11,ITEM_DEFINITIONS.steel.color);
  part([.48,.26,.4],[0,0,0],17,ITEM_DEFINITIONS.component.color);
  part([.2,.07,.26],[0,.16,0],17,0x637d77);
  (['herbal-medicine','medicine','glitterworld-medicine'] as const).forEach((item,i)=>{part([.38,.25,.3],[0,0,0],18+i,ITEM_DEFINITIONS[item].color);part([.2,.03,.065],[0,.14,0],18+i,0xf0eee0);part([.065,.03,.2],[0,.14,0],18+i,0xf0eee0);});
  BLOCK_ITEMS.forEach((item,i)=>{part([.27,.17,.36],[-.145,0,0],12+i,ITEM_DEFINITIONS[item].color);part([.27,.17,.36],[.145,0,0],12+i,ITEM_DEFINITIONS[item].color);});
  CHUNK_ITEMS.forEach((item,i)=>{part([.52,.34,.42],[0,0,0],5+i,ITEM_DEFINITIONS[item].color);part([.22,.2,.27],[.18,-.05,-.12],5+i,ITEM_DEFINITIONS[item].color);});
  const vertices = new THREE.InterleavedBuffer(new Float32Array(data), 10);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(vertices, 3, 0));
  geometry.setAttribute('normal', new THREE.InterleavedBufferAttribute(vertices, 3, 3));
  geometry.setAttribute('color', new THREE.InterleavedBufferAttribute(vertices, 3, 6));
  geometry.setAttribute('cargoKind', new THREE.InterleavedBufferAttribute(vertices, 1, 9));
  geometry.instanceCount = 0;
  return geometry;
}

/** Owns GPU actor/cargo batches; receives snapshots, never simulates gameplay. */
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
  private cargoMesh: THREE.Mesh | null = null;
  private readonly targetPoses = new Map<number,THREE.Vector4>();
  private travelSurfaces:ReadonlyMap<number,number>=new Map();
  private rescuePairs:readonly (readonly [number,number])[]=[];
  constructor(private readonly configure?: (material: THREE.MeshStandardNodeMaterial) => void) {}
  private readonly travelKeys = new Map<number,string>();
  private createPawnMesh(count: number): void {
    clearGroup(this.group);
    const geometry = pawnGeometry();
    geometry.setAttribute('aTravel', new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2));
    geometry.setAttribute('aFrom', new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4));
    geometry.setAttribute('aTo', new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4));
    geometry.setAttribute('aMotion', new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4));
    geometry.setAttribute('aTint', new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('aCargo', new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2));
    for (const name of ['aFrom', 'aTo', 'aMotion', 'aTint', 'aCargo', 'aTravel']) (geometry.getAttribute(name) as THREE.InstancedBufferAttribute).setUsage(THREE.DynamicDrawUsage);
    const mat = material(0xffffff);
    this.configure?.(mat);
    mat.positionNode = Fn(() => {
      const bone = attribute('boneId', 'float');
      const pivot = attribute('bindPivot', 'vec3');
      const motion = attribute('aMotion', 'vec4');
      const pose = pawnPresentationPose(this);
      const angle = float(0).toVar();
      const sign = float(1).toVar();
      If(bone.equal(3).or(bone.equal(4)).or(bone.equal(6)), () => { sign.assign(-1); });
      If(bone.greaterThan(1.5), () => {
        angle.assign(sin(this.time.mul(9).add(motion.w)).mul(motion.x).mul(sign).mul(0.65));
        If(bone.lessThan(3.5), () => {
          angle.addAssign(sin(this.time.mul(12).add(motion.w)).mul(0.35).sub(0.8).mul(motion.y));
          If(attribute('aCargo', 'vec2').x.abs().greaterThan(0.5), () => {
            angle.assign(float(-0.9).add(sin(this.time.mul(9).add(motion.w)).mul(motion.x).mul(0.06)));
            If(motion.z.greaterThan(1.5), () => { angle.assign(float(-1.3).add(sin(this.time.mul(4).add(motion.w)).mul(0.22))); });
          });
        });
      });
      If(motion.z.greaterThan(2.5).and(motion.z.lessThan(3.5)).and(bone.greaterThan(3.5)), () => {
        angle.assign(bone.lessThan(5.5).select(float(-Math.PI / 2), float(0)));
      });
      If(motion.z.equal(4).and(bone.equal(3)), () => { angle.assign(sin(this.time.mul(2).add(motion.w)).mul(1.1).sub(.35)); });
      const local = positionLocal.sub(pivot);
      const c = cos(angle), s = sin(angle);
      const animated = vec3(local.x, local.y.mul(c).sub(local.z.mul(s)), local.y.mul(s).add(local.z.mul(c))).add(pivot).toVar();
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
      If(motion.z.equal(6),()=>{
        const x=animated.x.toVar(),y=animated.y.toVar(),z=animated.z.toVar();
        animated.assign(vec3(float(.65).sub(y),z.add(.19+.95/PAWN_MODEL_SCALE),x.add(.3)));
      });
      const cy = cos(pose.w), sy = sin(pose.w);
      return vec3(animated.x.mul(cy).add(animated.z.mul(sy)), animated.y, animated.z.mul(cy).sub(animated.x.mul(sy))).mul(PAWN_MODEL_SCALE).add(pose.xyz);
    })();
    mat.colorNode = mix(attribute('color', 'vec3'), attribute('aTint', 'vec3'), attribute('dye', 'float'));
    const mesh = new THREE.Mesh(geometry, mat);
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
    this.selectionMesh=pawnSelectionMesh(geometry,this);this.group.add(this.selectionMesh);
  }

  update(world: World, oldBlend: number, newMap: boolean): void {
    this.travelKeys.clear();this.travelSurfaces=furnitureSurfaces(world);
    const indices=new Map(world.pawns.map((p,i)=>[p.id,i]));
    this.rescuePairs=world.pawns.flatMap((p,i)=>p.rescue?.phase==='carry'&&indices.has(p.rescue.patientId)?[[i,indices.get(p.rescue.patientId)!] as const]:[]);
    if (!this.pawnMesh || (this.pawnMesh.geometry.getAttribute('aFrom')?.count ?? 0) !== world.pawns.length) this.createPawnMesh(world.pawns.length);
    const geometry = this.pawnMesh!.geometry as THREE.InstancedBufferGeometry;
    const fromAttribute = geometry.getAttribute('aFrom') as THREE.InstancedBufferAttribute;
    const toAttribute = geometry.getAttribute('aTo') as THREE.InstancedBufferAttribute;
    const motion = geometry.getAttribute('aMotion') as THREE.InstancedBufferAttribute;
    const tint = geometry.getAttribute('aTint') as THREE.InstancedBufferAttribute;
    const cargo = geometry.getAttribute('aCargo') as THREE.InstancedBufferAttribute;
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
      if (bed) {
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
      const work = pawn.state==='working' ? (job?constructionWorkTarget(world,job):undefined) ?? (pawn.cooking ? pawn.cooking.actionCell : pawn.haul?.serviceProgress ? world.structures.find(s=>pawn.haul?.destination.type==='fuel'&&s.id===pawn.haul.destination.structureId) : pawn.haul?.pickupCell) : undefined;
      if(work) {yaw=Math.atan2(work.x-pawn.x,work.z-pawn.z);from.w=yaw;}
      const game=pawn.state==='recreating'&&pawn.recreation.task?.activity==='horseshoes'?world.structures.find(s=>s.id===pawn.recreation.task!.buildingId):undefined;
      if(game){yaw=Math.atan2(game.x-pawn.x,game.z-pawn.z);from.w=yaw;}
      const to = new THREE.Vector4(px, py, pz, yaw);
      if (!previous) from.copy(to);
      this.targetPoses.set(pawn.id,to.clone());
      this.visuals.set(pawn.id, { from, to });
      fromAttribute.setXYZW(index, from.x, from.y, from.z, from.w);
      toAttribute.setXYZW(index, to.x, to.y, to.z, to.w);
      motion.setXYZW(index, pawn.state === 'moving' ? 1 : 0, pawn.state === 'working' ? 1 : 0, pawn.state === 'recreating' ? pawn.recreation.task?.activity==='horseshoes'?4:5 : pawn.state === 'sleeping'||pawn.state==='resting'||medicallyStopped(pawn) ? 1 : pawn.state === 'eating' ? dining?.seatId !== null && dining ? 3 : 2 : 0, pawn.id * 1.7);
      scratchColor.setHex(PAWN_COLORS[index % PAWN_COLORS.length]);
      if(pawn.state==='dead')scratchColor.setHex(0x73756c);
      tint.setXYZ(index, scratchColor.r, scratchColor.g, scratchColor.b);
      const load = carried.get(pawn.id);
      const packed=world.packed?.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id);
      cargo.setXY(index, pawn.rescue?.phase==='carry'?-1:packed?4:load ? load.kind==='medicine' ? (load.item==='herbal-medicine'?18:load.item==='medicine'?19:20) : load.kind === 'component' ? 17 : load.kind === 'blocks' ? blockCargoKind(load.item) : load.kind === 'steel' ? 11 : load.kind === 'chunk' ? chunkCargoKind(load.item) : load.kind === 'wood' ? 1 : load.item === 'survival-meal' ? 3 : 2 : 0, packed?1:load ? Math.min(1, load.quantity / CARRY_CAPACITY) : 0);
    });
    for (const id of this.visuals.keys()) if (!present.has(id)) this.visuals.delete(id);
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
    this.travelTime.value=(timeline.tick-origin)/10;
    let dirty=false;
    world.pawns.forEach((pawn,i)=>{
      const segment=timeline.segment(pawn.id);
      const active=!!segment && timeline.tick<segment.end;
      const key=`${origin}:${segment?.start}:${active}:${!!segment&&timeline.tick>=segment.start}:${pawn.state}:${pawn.path[0]?.x}:${pawn.path[0]?.z}`;
      if(this.travelKeys.get(pawn.id)===key)return;
      this.travelKeys.set(pawn.id,key);dirty=true;
      const visual=this.visuals.get(pawn.id)!;
      if(segment && (active || pawn.state==='moving'||world.tick<segment.end)) {
        const yaw=Math.atan2(segment.to.x-segment.from.x,segment.to.z-segment.from.z);
        visual.from.set(segment.from.x,this.travelSurfaces.get(segment.from.z*world.width+segment.from.x)??0,segment.from.z,yaw);visual.to.set(segment.to.x,this.travelSurfaces.get(segment.to.z*world.width+segment.to.x)??0,segment.to.z,yaw);
        times.setXY(i,(segment.start-origin)/10,(segment.end-origin)/10);
        motion.setX(i,!medicallyStopped(pawn)&&active && timeline.tick>=segment.start?1:0);motion.setY(i,0);motion.setZ(i,medicallyStopped(pawn)?1:0);
      } else {
        visual.to.copy(this.targetPoses.get(pawn.id)!);visual.from.copy(visual.to);times.setXY(i,0,0);
        motion.setX(i,0);motion.setY(i,pawn.state==='working'?1:0);
        const dining=pawn.need?.kind==='eat'?pawn.need.dining:null;
        motion.setZ(i,pawn.state==='recreating'?pawn.recreation.task?.activity==='horseshoes'?4:5:pawn.state==='sleeping'||pawn.state==='resting'||medicallyStopped(pawn)?1:pawn.state==='eating'?dining&&dining.seatId!==null?3:2:0);
      }
      if(!active&&pawn.state==='moving'&&pawn.path[0]&&doorAt(world,pawn.path[0])) {const target=pawn.path[0];visual.from.w=visual.to.w=Math.atan2(target.x-pawn.x,target.z-pawn.z);}
      from.setXYZW(i,visual.from.x,visual.from.y,visual.from.z,visual.from.w);to.setXYZW(i,visual.to.x,visual.to.y,visual.to.z,visual.to.w);
    });
    if(dirty){
      // Both actors, their loads and selection rings use exactly the same edge
      // and yaw. The carried rig is an extra pose in the existing GPU batch.
      for(const [carrier,patient] of this.rescuePairs){
        from.setXYZW(patient,from.getX(carrier),from.getY(carrier),from.getZ(carrier),from.getW(carrier));
        to.setXYZW(patient,to.getX(carrier),to.getY(carrier),to.getZ(carrier),to.getW(carrier));
        times.setXY(patient,times.getX(carrier),times.getY(carrier));motion.setXYZ(patient,0,0,6);
        const source=this.visuals.get(world.pawns[carrier]!.id)!,target=this.visuals.get(world.pawns[patient]!.id)!;
        target.from.copy(source.from);target.to.copy(source.to);
      }
      for(const attribute of [from,to,times,motion])attribute.needsUpdate=true;
    }
  }

}
import { medicallyStopped } from '../sim/health-rules';
