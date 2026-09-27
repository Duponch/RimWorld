import * as THREE from 'three/webgpu';
import { Fn, attribute, atan, cameraPosition, cos, dot, float, mix, sin, smoothstep, uniform, uv, varying, vec2, vec3, vec4 } from 'three/tsl';
import type { Pawn, World } from '../sim/types';
import { TICKS_PER_SECOND } from '../sim/types';
import { footprintCells } from '../sim/definitions';
import type { PawnLayer } from './PawnLayer';
import { pawnPresentationPose } from './pawn-presentation';

/** These are presentation codes, never saved in the world or consumed by AI. */
export const ACTION_FX = {
  none: 0, brawl: 1, sleep: 2, chop: 3, mine: 4, build: 5,
  cook: 6, craft: 7, research: 8, extinguish: 9,
  smith: 10, tailor: 11, stonecraft: 12, art: 13,
  butcher: 14, tailorGround: 15, butcherGround: 16,
} as const;

export type ActionFx = { kind: number; x: number; z: number; impactCore?:number };
const NONE: ActionFx = { kind: ACTION_FX.none, x: 0, z: 0 };

function confirmedHit(attacker:Pawn,target:Pawn):number|undefined {
  const strike=attacker.melee?.strike;
  return strike&&!strike.structure&&strike.targetId===target.id&&strike.outcome==='hit'?strike.atCore:undefined;
}
function pairHit(a:Pawn,b:Pawn):number|undefined {
  const first=confirmedHit(a,b),second=confirmedHit(b,a);
  return first===undefined?second:second===undefined?first:Math.max(first,second);
}

function nearestStationCell(pawn: Pawn, station: World['structures'][number] | undefined): { x: number; z: number } | undefined {
  if (!station) return undefined;
  const cells = footprintCells(station);
  let closest = cells[0];
  let best = Infinity;
  for (const cell of cells) {
    const distance = (cell.x - pawn.x) ** 2 + (cell.z - pawn.z) ** 2;
    if (distance < best) { best = distance; closest = cell; }
  }
  return closest;
}

function nearFace(pawn: Pawn, target: { x: number; z: number }, reach: number): { x: number; z: number } {
  const dx = pawn.x - target.x, dz = pawn.z - target.z, distance = Math.hypot(dx, dz);
  return distance > .001 ? { x: target.x + dx / distance * reach, z: target.z + dz / distance * reach } : target;
}

/** Selection is evaluated only for confirmed snapshots. No random numbers or
 * presentation objects enter the authoritative world. */
export function actionFxForPawn(
  world: World,
  pawn: Pawn,
  pawnsById: ReadonlyMap<number, Pawn>,
  jobsById: ReadonlyMap<number, World['jobs'][number]>,
  structuresById: ReadonlyMap<number, World['structures'][number]>,
  firesById?: ReadonlyMap<number, NonNullable<World['fires']>['items'][number]>,
  includeBrawl = true,
): ActionFx {
  if (pawn.state === 'dead' || pawn.body?.pileId !== undefined || pawn.body?.lostAt !== undefined) return NONE;
  if (includeBrawl) {
    const opponentId = pawn.social?.fight?.opponentId;
    const opponent = opponentId === undefined ? undefined : pawnsById.get(opponentId);
    if (opponent && pawn.id < opponent.id && opponent.social?.fight?.opponentId === pawn.id && opponent.state !== 'dead') {
      const distance = Math.hypot(opponent.x - pawn.x, opponent.z - pawn.z);
      if (distance <= 1.6) {const impactCore=pairHit(pawn,opponent);return { kind: ACTION_FX.brawl, x: opponent.x, z: opponent.z,...(impactCore===undefined?{}:{impactCore}) };}
    }
    const strike = pawn.melee?.strike;
    const meleeTarget = strike && !strike.structure ? pawnsById.get(strike.targetId) : undefined;
    if (meleeTarget && meleeTarget.state !== 'dead' &&
      (meleeTarget.melee?.strike?.targetId !== pawn.id || pawn.id < meleeTarget.id) &&
      Math.hypot(meleeTarget.x - pawn.x, meleeTarget.z - pawn.z) <= 1.6){
      const impactCore=confirmedHit(pawn,meleeTarget);
      return { kind: ACTION_FX.brawl, x: meleeTarget.x, z: meleeTarget.z,
        ...(impactCore===undefined?{}:{impactCore}) };
    }
  }
  if (pawn.state === 'sleeping') return { kind: ACTION_FX.sleep, x: pawn.x, z: pawn.z };
  if (pawn.state !== 'working' || pawn.stun) return NONE;

  if (pawn.firefighting?.phase === 'beat') {
    const fire = firesById?.get(pawn.firefighting.fireId) ??
      (!firesById ? world.fires?.items.find(item => item.id === pawn.firefighting!.fireId) : undefined);
    if (fire) return { kind: ACTION_FX.extinguish, x: fire.x, z: fire.z };
  }
  if (pawn.cooking?.phase === 'work') {
    const station = structuresById.get(pawn.cooking.stationId);
    const contact = nearestStationCell(pawn, station) ?? pawn.cooking.actionCell;
    const kind=station?.kind==='machining-table'||station?.kind==='fabrication-bench'?ACTION_FX.smith
      :station?.kind==='tailor-bench'||station?.kind==='electric-tailor-bench'?ACTION_FX.tailor
      :station?.kind==='crafting-spot'?ACTION_FX.tailorGround
      :station?.kind==='butcher-table'?ACTION_FX.butcher
      :station?.kind==='butcher-spot'?ACTION_FX.butcherGround
      :station?.kind==='stonecutter'?ACTION_FX.stonecraft
      :station?.kind==='art-bench'?ACTION_FX.art
      :pawn.cooking.recipe==='butcher-creature'?ACTION_FX.butcher
      :!pawn.cooking.recipe?ACTION_FX.cook:ACTION_FX.craft;
    return { kind, ...nearFace(pawn, contact, .48) };
  }
  if (pawn.research) {
    const station = structuresById.get(pawn.research.stationId);
    const contact = nearestStationCell(pawn, station) ?? pawn;
    return { kind: ACTION_FX.research, ...nearFace(pawn, contact, .55) };
  }
  if (pawn.jobId !== null) {
    const job = jobsById.get(pawn.jobId);
    if (job?.status === 'active' && job.reservedBy === pawn.id) {
      const kind = job.kind === 'chop' || job.kind === 'cut' || job.clearance ? ACTION_FX.chop
        : job.kind === 'mine' ? ACTION_FX.mine : ACTION_FX.build;
      // Rock and tree marks are distributed around this physical target by
      // the vertex shader: some at the hands, some on its camera-facing side.
      return { kind, x: job.x, z: job.z };
    }
  }
  return NONE;
}

/** One draw for every active sleeping/working actor. At 100 actors eight
 * resident quads amount to 3,200 vertices and 4,800 indices. Brawls use the
 * dedicated instanced volumetric layer, never a duplicate sprite cloud. */
export const SPRITES_PER_PAWN = 8;
const sourceNames = ['aFrom', 'aTo', 'aTravel'] as const;

function spriteGeometry(): THREE.InstancedBufferGeometry {
  const geometry = new THREE.InstancedBufferGeometry();
  const positions: number[] = [], uvs: number[] = [], parts: number[] = [], indices: number[] = [];
  for (let part = 0; part < SPRITES_PER_PAWN; part++) {
    const base = positions.length / 3;
    positions.push(-.5, -.5, 0, .5, -.5, 0, -.5, .5, 0, .5, .5, 0);
    uvs.push(0, 0, 1, 0, 0, 1, 1, 1);
    parts.push(part, part, part, part);
    indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('actionPart', new THREE.Float32BufferAttribute(parts, 1));
  geometry.setIndex(indices);
  for (const name of sourceNames)
    geometry.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(4), 4));
  geometry.setAttribute('actionFx', new THREE.InstancedBufferAttribute(new Float32Array(4), 4).setUsage(THREE.StaticDrawUsage));
  geometry.instanceCount = 0;
  return geometry;
}

/** One resident instanced sprite draw for actor action symbols. Positions and
 * cycles run in the vertex shader, shapes in the fragment shader. The only
 * CPU work is choosing an effect when a confirmed world snapshot arrives. */
export class ActionVfxLayer {
  readonly group = new THREE.Group();
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.SpriteNodeMaterial>;
  private readonly time = uniform(0);
  private capacity = 1;
  private active = false;
  private detailVisible = true;
  private readonly bounds = new THREE.Sphere();

  constructor(private readonly clock: Pick<PawnLayer, 'travelTime' | 'blend'>) {
    const geometry = spriteGeometry();
    // The contact marks are placed just outside physical surfaces so normal
    // scene depth still hides them behind walls, roofs and furniture.
    const material = new THREE.SpriteNodeMaterial({ transparent: true, depthTest: true, depthWrite: false, alphaTest: .08 });
    material.positionNode = Fn(() => {
      const fx = attribute('actionFx', 'vec4'), part = attribute('actionPart', 'float');
      const pose = pawnPresentationPose(this.clock);
      const sleeping = fx.x.equal(ACTION_FX.sleep);
      const angle = part.mul(2.39996323).add(fx.w.mul(.03));
      const workCycle = this.time.mul(1.65).add(part.mul(.173)).add(fx.w.mul(.017)).fract();
      const sleepCycle = this.time.mul(.15).add(part.mul(.21)).add(fx.w.mul(.003)).fract();
      const target = vec3(fx.y, 0, fx.z);
      const rockOrTree=fx.x.equal(ACTION_FX.mine).or(fx.x.equal(ACTION_FX.chop));
      const workerVector=pose.xyz.xz.sub(target.xz);
      const workerSide=workerVector.div(workerVector.length().max(.001));
      const cameraVector=cameraPosition.xz.sub(target.xz);
      const cameraSide=cameraVector.div(cameraVector.length().max(.001));
      // First four pieces stay at the actual strike; the remaining pieces
      // emerge on the visible side of the same target. This is all vertex
      // work in the existing batch and still obeys the scene depth buffer.
      const contactSide=part.lessThan(4).select(workerSide.mul(fx.x.equal(ACTION_FX.mine).select(.61,.58)),
        cameraSide.mul(fx.x.equal(ACTION_FX.mine).select(.73,.84)));
      const workTarget=rockOrTree.select(target.add(vec3(contactSide.x,0,contactSide.y)),target);
      const sleepOffset = vec3(sin(pose.w).mul(-1.05).add(sin(sleepCycle.mul(2*Math.PI)).mul(.11)).add(part.mul(.035)),
        float(1.20).add(sleepCycle.mul(.73)),
        cos(pose.w).mul(-1.05).add(part.mul(.05)));
      const groundWork=fx.x.equal(ACTION_FX.tailorGround).or(fx.x.equal(ACTION_FX.butcherGround));
      const bench = fx.x.greaterThanEqual(ACTION_FX.cook).and(fx.x.notEqual(ACTION_FX.extinguish)).and(groundWork.not());
      // Draw above the work surface and on its near side. At the old height
      // almost every fragment failed the scene depth test inside the desk,
      // rock or conifer cone, despite being present in the GPU batch.
      const contactY = groundWork.select(.55,bench.select(float(1.25),
        fx.x.equal(ACTION_FX.mine).select(1.65,fx.x.equal(ACTION_FX.chop).select(1.50,1.18))));
      const workSpread = fx.x.equal(ACTION_FX.research).select(float(.22).add(workCycle.mul(.34)),
        float(.13).add(workCycle.mul(.24)));
      const workOffset = vec3(cos(angle).mul(workSpread),
        contactY.add(workCycle.mul(fx.x.equal(ACTION_FX.cook).select(.48,
          fx.x.equal(ACTION_FX.chop).select(.22,.38)))),
        sin(angle).mul(workSpread));
      return sleeping.select(pose.xyz.add(sleepOffset), workTarget.add(workOffset));
    })();
    material.scaleNode = Fn(() => {
      const kind = attribute('actionFx', 'vec4').x, part = attribute('actionPart', 'float');
      const sleeping = kind.equal(ACTION_FX.sleep);
      const visible = sleeping.and(part.lessThan(5))
        .or(kind.equal(ACTION_FX.research).and(part.lessThan(6)))
        .or(kind.greaterThanEqual(ACTION_FX.chop).and(kind.notEqual(ACTION_FX.research)));
      const sleepCycle = this.time.mul(.15).add(part.mul(.21)).add(attribute('actionFx','vec4').w.mul(.003)).fract();
      const sleepSize = float(.19).add(sleepCycle.mul(.17))
        .mul(smoothstep(0,.10,sleepCycle)).mul(float(1).sub(smoothstep(.82,1,sleepCycle)));
      // Keep each burst smaller than a head, beside the hand contact point.
      // Several quads overlap into one readable mark without hiding actors.
      const workSize = kind.equal(ACTION_FX.cook).or(kind.equal(ACTION_FX.butcher)).or(kind.equal(ACTION_FX.butcherGround)).select(vec2(.42),
        kind.equal(ACTION_FX.research).select(vec2(.43),vec2(.39,.36)));
      return sleeping.select(vec2(sleepSize),workSize).mul(visible.select(1,0));
    })();
    material.rotationNode = Fn(() => {
      const fx=attribute('actionFx','vec4'),part=attribute('actionPart','float');
      const angle=part.mul(2.39996323).add(fx.w.mul(.03));
      return fx.x.equal(ACTION_FX.sleep).select(
        sin(this.time.mul(2*Math.PI*.15).add(part)).mul(.13),
        fx.x.greaterThanEqual(ACTION_FX.chop).select(angle.add(.3),float(0)));
    })();
    material.colorNode = Fn(() => {
      const fx=attribute('actionFx','vec4'), rawPart=attribute('actionPart','float');
      // SpriteNodeMaterial on an instanced Mesh needs explicit interpolation:
      // direct fragment reads yielded constant UV=(1,1) and cycle=0 on WebGPU.
      const part=varying(rawPart), pixel=varying(uv()).sub(vec2(.5));
      const radius=pixel.length(), ink=vec3(.20,.13,.075);
      const cycle=varying(this.time.mul(1.65).add(rawPart.mul(.173)).add(fx.w.mul(.017)).fract());
      const workLife=smoothstep(0,.09,cycle).mul(float(1).sub(smoothstep(.66,.98,cycle)));
      const sleepCycle=varying(this.time.mul(.15).add(rawPart.mul(.21)).add(fx.w.mul(.003)).fract());
      const stroke=(ax:number,ay:number,bx:number,by:number,width:number)=>{
        const a=vec2(ax,ay),direction=vec2(bx-ax,by-ay);
        const t=dot(pixel.sub(a),direction).div(dot(direction,direction)).clamp(0,1);
        return float(1).sub(smoothstep(width,width+.024,pixel.sub(a.add(direction.mul(t))).length()));
      };
      const circle=(x:number,y:number,r:number)=>float(1).sub(smoothstep(r-.012,r+.022,pixel.sub(vec2(x,y)).length()));
      const top=vec2(pixel.x.abs().sub(.27).max(0),pixel.y.sub(.28)).length();
      const bottom=vec2(pixel.x.abs().sub(.27).max(0),pixel.y.add(.28)).length();
      const diagonalDirection=vec2(-.50,-.56),fromTop=pixel.sub(vec2(.25,.28));
      const projection=dot(fromTop,diagonalDirection).div(dot(diagonalDirection,diagonalDirection)).clamp(0,1);
      const distance=top.min(bottom).min(fromTop.sub(diagonalDirection.mul(projection)).length());
      const sleepAlpha=float(1).sub(smoothstep(.095,.11,distance))
        .mul(smoothstep(0,.10,sleepCycle)).mul(float(1).sub(smoothstep(.53,1,sleepCycle))).mul(.74);
      // A flat parchment fill matches the UI; both silhouette and opacity
      // disappear gradually instead of an opaque gradient-coloured Z popping.
      const sleepColor=mix(ink,vec3(.95,.86,.67),float(1).sub(smoothstep(.055,.071,distance)));
      const chipDistance=pixel.x.abs().mul(.68).add(pixel.y.abs().mul(1.22))
        .add(sin(pixel.y.mul(21).add(part.mul(2.9))).mul(.028));
      const chip=float(1).sub(smoothstep(.32,.37,chipDistance));
      const chipInner=float(1).sub(smoothstep(.23,.28,chipDistance));
      const pebbleDistance=pixel.x.abs().mul(.9).add(pixel.y.abs().mul(.8))
        .add(sin(pixel.x.mul(17).add(part)).mul(.035)).add(sin(pixel.y.mul(19)).mul(.017));
      const pebble=float(1).sub(smoothstep(.33,.38,pebbleDistance));
      const pebbleInner=float(1).sub(smoothstep(.23,.28,pebbleDistance));
      const puffEdge=float(.37).add(sin(atan(pixel.y,pixel.x).mul(5).add(part)).mul(.033));
      const puff=float(1).sub(smoothstep(puffEdge.sub(.025),puffEdge.add(.02),radius));
      const puffInner=float(1).sub(smoothstep(puffEdge.sub(.095),puffEdge.sub(.045),radius));
      const smallSpark=stroke(-.27,-.23,.25,.26,.028).max(stroke(-.25,.15,.15,-.18,.018));
      const dusty=part.greaterThanEqual(6),firstThree=part.lessThan(3);
      const chipColor=mix(ink,part.lessThan(4).select(vec3(.48,.22,.075),vec3(.65,.35,.12)),chipInner);
      const stoneColor=mix(vec3(.20,.15,.10),vec3(.43,.31,.20),pebbleInner);
      const chopAlpha=dusty.select(puff.mul(.68),chip),chopColor=dusty.select(mix(ink,vec3(.45,.28,.14),puffInner),chipColor);
      const mineAlpha=part.greaterThanEqual(6).select(smallSpark,part.lessThan(4).select(pebble,puff.mul(.62)));
      const mineColor=part.greaterThanEqual(6).select(part.equal(6).select(vec3(1,.67,.15),vec3(1,.40,.12)),
        part.lessThan(4).select(stoneColor,mix(ink,vec3(.45,.31,.18),puffInner)));
      const buildAlpha=firstThree.select(pebble,chip),buildColor=firstThree.select(stoneColor,chipColor);
      // Food is drawn as small produce: tomato, carrot, and leafy herbs.
      const tomato=circle(0,0,.27),tomatoHeart=circle(-.045,.02,.18);
      const tomatoLeaf=stroke(-.18,.22,.16,.31,.045).max(stroke(0,.18,0,.37,.038));
      const tomatoAlpha=tomato.max(tomatoLeaf);
      const tomatoColor=tomatoLeaf.greaterThan(.1).select(vec3(.34,.56,.30),
        mix(ink,mix(vec3(.81,.25,.18),vec3(1,.52,.30),tomatoHeart),tomato));
      const carrotWidth=float(.24).sub(pixel.y.add(.26).mul(.30)).max(.03);
      const carrotBody=float(1).sub(smoothstep(.86,1.05,pixel.x.abs().div(carrotWidth)))
        .mul(smoothstep(-.34,-.29,pixel.y)).mul(float(1).sub(smoothstep(.25,.30,pixel.y)));
      const carrotLeaf=stroke(-.02,.25,-.17,.40,.035).max(stroke(.01,.25,.15,.41,.036));
      const carrotAlpha=carrotBody.max(carrotLeaf);
      const carrotColor=carrotLeaf.greaterThan(.1).select(vec3(.34,.55,.30),mix(ink,vec3(.96,.55,.20),carrotBody));
      const herb=circle(-.13,-.06,.13).max(circle(.12,.06,.14)).max(circle(-.01,.19,.13))
        .max(stroke(-.03,-.31,.02,.12,.028));
      const herbColor=mix(ink,vec3(.44,.66,.34),herb);
      const cookAlpha=part.lessThan(3).select(tomatoAlpha,part.lessThan(6).select(carrotAlpha,herb));
      const cookColor=part.lessThan(3).select(tomatoColor,part.lessThan(6).select(carrotColor,herbColor));
      const square=pixel.x.abs().max(pixel.y.abs().mul(.82));
      const pageAlpha=float(1).sub(smoothstep(.34,.37,square)),pageInner=float(1).sub(smoothstep(.26,.30,square));
      const ruled=smoothstep(.79,.95,sin(pixel.y.mul(34)).abs())
        .mul(float(1).sub(smoothstep(.13,.24,pixel.x.abs()))).mul(pageInner);
      const page=part.lessThan(2);
      const magnifierRing=float(1).sub(smoothstep(.038,.061,pixel.sub(vec2(-.09,.08)).length().sub(.22).abs()));
      const magnifierHandle=stroke(.07,-.08,.34,-.35,.055);
      const magnifier=magnifierRing.max(magnifierHandle);
      const magnifierLens=circle(-.09,.08,.17).mul(.35);
      const flaskBody=float(1).sub(smoothstep(.21,.25,pixel.x.abs().add(pixel.y.mul(.34))))
        .mul(smoothstep(-.34,-.29,pixel.y)).mul(float(1).sub(smoothstep(.12,.17,pixel.y)));
      const flaskNeck=float(1).sub(smoothstep(.07,.095,pixel.x.abs()))
        .mul(smoothstep(.08,.12,pixel.y)).mul(float(1).sub(smoothstep(.34,.38,pixel.y)));
      const flaskLiquid=flaskBody.mul(float(1).sub(smoothstep(-.05,.02,pixel.y)));
      const flask=flaskBody.max(flaskNeck);
      const researchAlpha=page.select(pageAlpha,part.lessThan(4).select(magnifier.max(magnifierLens),flask));
      const researchColor=page.select(mix(mix(ink,vec3(.96,.90,.72),pageInner),vec3(.24,.43,.38),ruled),
        part.lessThan(4).select(mix(ink,vec3(.74,.89,.85),magnifierLens),mix(ink,vec3(.51,.81,.75),flaskLiquid)));
      const smithAlpha=part.lessThan(6).select(smallSpark,chip);
      const smithColor=part.lessThan(6).select(vec3(1,.56,.12),mix(ink,vec3(.95,.35,.10),chipInner));
      const thread=pixel.y.sub(sin(pixel.x.mul(10).add(part)).mul(.11)).abs();
      const strand=float(1).sub(smoothstep(.025,.055,thread)).mul(float(1).sub(smoothstep(.30,.40,pixel.x.abs())));
      const scissorRings=float(1).sub(smoothstep(.035,.058,pixel.sub(vec2(-.18,-.23)).length().sub(.105).abs()))
        .max(float(1).sub(smoothstep(.035,.058,pixel.sub(vec2(.18,-.23)).length().sub(.105).abs())));
      const scissors=scissorRings.max(stroke(-.11,-.17,.28,.33,.035)).max(stroke(.11,-.17,-.28,.33,.035));
      const wool=circle(-.20,-.04,.17).max(circle(.06,-.18,.17)).max(circle(.18,.06,.16)).max(circle(-.03,.17,.18));
      const woolInner=circle(-.17,-.03,.115).max(circle(.06,-.14,.12)).max(circle(.16,.06,.11)).max(circle(-.03,.15,.13));
      const tailorAlpha=part.lessThan(3).select(scissors,part.lessThan(6).select(wool,strand));
      const tailorColor=part.lessThan(3).select(vec3(.33,.41,.43),part.lessThan(6).select(mix(ink,vec3(.94,.85,.67),woolInner),vec3(.47,.59,.57)));
      const bloodDrop=circle(0,-.09,.23).max(stroke(0,.12,0,.34,.11));
      const skinFold=puff.mul(float(1).sub(stroke(-.18,-.18,.17,.16,.018).mul(.85)));
      const butcherAlpha=part.lessThan(4).select(bloodDrop,skinFold);
      const butcherColor=part.lessThan(4).select(mix(vec3(.43,.13,.10),vec3(.78,.25,.19),circle(-.05,-.10,.13)),
        mix(ink,vec3(.88,.71,.52),puffInner));
      const artAlpha=firstThree.select(strand,part.lessThan(6).select(puff,chip));
      const artColor=firstThree.select(vec3(.52,.65,.53),part.lessThan(6).select(vec3(.75,.57,.63),chipColor));
      const kind=fx.x;
      const isMine=kind.equal(ACTION_FX.mine).or(kind.equal(ACTION_FX.stonecraft));
      const isBuild=kind.equal(ACTION_FX.build).or(kind.equal(ACTION_FX.craft));
      const isTailor=kind.equal(ACTION_FX.tailor).or(kind.equal(ACTION_FX.tailorGround));
      const isButcher=kind.equal(ACTION_FX.butcher).or(kind.equal(ACTION_FX.butcherGround));
      let workAlpha=kind.equal(ACTION_FX.art).select(artAlpha,puff.mul(.65));
      workAlpha=isTailor.select(tailorAlpha,workAlpha);
      workAlpha=isButcher.select(butcherAlpha,workAlpha);
      workAlpha=kind.equal(ACTION_FX.smith).select(smithAlpha,workAlpha);
      workAlpha=kind.equal(ACTION_FX.research).select(researchAlpha,workAlpha);
      workAlpha=kind.equal(ACTION_FX.cook).select(cookAlpha,workAlpha);
      workAlpha=isBuild.select(buildAlpha,workAlpha);
      workAlpha=isMine.select(mineAlpha,workAlpha);
      workAlpha=kind.equal(ACTION_FX.chop).select(chopAlpha,workAlpha);
      let workColor=kind.equal(ACTION_FX.art).select(artColor,vec3(.64,.84,.94));
      workColor=isTailor.select(tailorColor,workColor);
      workColor=isButcher.select(butcherColor,workColor);
      workColor=kind.equal(ACTION_FX.smith).select(smithColor,workColor);
      workColor=kind.equal(ACTION_FX.research).select(researchColor,workColor);
      workColor=kind.equal(ACTION_FX.cook).select(cookColor,workColor);
      workColor=isBuild.select(buildColor,workColor);
      workColor=isMine.select(mineColor,workColor);
      workColor=kind.equal(ACTION_FX.chop).select(chopColor,workColor);
      return kind.equal(ACTION_FX.sleep).select(vec4(sleepColor,sleepAlpha),vec4(workColor,workAlpha.mul(workLife)));
    })();
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'Action VFX — shared comic GPU sprites';
    this.mesh.renderOrder = 4;
    // One conservative bound for all active actors. Camera motion itself is
    // handled by renderer culling, without waiting for another world snapshot.
    geometry.boundingSphere = this.bounds;
    this.mesh.frustumCulled = true;
    this.mesh.visible = false;
    this.group.add(this.mesh);
  }

  update(world: World, source: THREE.InstancedBufferGeometry): void {
    const geometry = this.mesh.geometry;
    for (const name of sourceNames) {
      const borrowed = source.getAttribute(name);
      if (geometry.getAttribute(name) !== borrowed) geometry.setAttribute(name, borrowed);
    }
    if (world.pawns.length > this.capacity) {
      this.capacity = 2 ** Math.ceil(Math.log2(world.pawns.length));
      geometry.setAttribute('actionFx', new THREE.InstancedBufferAttribute(new Float32Array(this.capacity * 4), 4).setUsage(THREE.StaticDrawUsage));
    }
    let working = false, hasJob = false, hasStation = false, hasFirefight = false, sleeping = false;
    for (const pawn of world.pawns) {
      sleeping ||= pawn.state === 'sleeping';
      if (pawn.state === 'working') {
        working = true;
        hasJob ||= pawn.jobId !== null;
        hasStation ||= pawn.cooking?.phase === 'work' || pawn.research !== undefined;
        hasFirefight ||= pawn.firefighting?.phase === 'beat';
      }
    }
    if (!working && !sleeping) {
      this.active = false;
      geometry.instanceCount = 0;
      this.mesh.visible = false;
      return;
    }
    const pawnsById = new Map<number, Pawn>();
    const jobsById = hasJob ? new Map(world.jobs.filter(j => j.status === 'active').map(j => [j.id, j])) : new Map<number, World['jobs'][number]>();
    const structuresById = hasStation ? new Map(world.structures.map(s => [s.id, s])) : new Map<number, World['structures'][number]>();
    const firesById = hasFirefight ? new Map((world.fires?.items ?? []).map(fire => [fire.id, fire])) : undefined;
    const values = geometry.getAttribute('actionFx') as THREE.InstancedBufferAttribute;
    let dirty = false, lastActive = -1;
    let minX=Infinity,minZ=Infinity,maxX=-Infinity,maxZ=-Infinity;
    world.pawns.forEach((pawn, index) => {
      const effect = actionFxForPawn(world, pawn, pawnsById, jobsById, structuresById, firesById, false);
      if (effect.kind) {
        lastActive = index;
        minX=Math.min(minX,pawn.x,effect.x);maxX=Math.max(maxX,pawn.x,effect.x);
        minZ=Math.min(minZ,pawn.z,effect.z);maxZ=Math.max(maxZ,pawn.z,effect.z);
      }
      // The resident buffer is Float32; compare the encoded values so a
      // stable confirmed snapshot does not upload every frame/tick merely
      // because an irrational seed or fractional contact was rounded.
      const x = Math.fround(effect.x), z = Math.fround(effect.z), seed = Math.fround(pawn.id * .61803398875);
      if (values.getX(index) !== effect.kind || values.getY(index) !== x || values.getZ(index) !== z || values.getW(index) !== seed) {
        values.setXYZW(index, effect.kind, x, z, seed);
        dirty = true;
      }
    });
    if (dirty) values.needsUpdate = true;
    this.active = lastActive >= 0;
    geometry.instanceCount = this.active ? lastActive + 1 : 0;
    if(this.active){
      this.bounds.center.set((minX+maxX)/2,1.2,(minZ+maxZ)/2);
      // Room for the ring, Z ascent and one interpolated movement edge.
      this.bounds.radius=Math.hypot(maxX-minX,maxZ-minZ)/2+3;
    }
    this.mesh.visible = this.active && this.detailVisible;
  }

  present(tick: number): void {
    // 1.65 cycles/s for sprite drift and .15 cycles/s for Z drift complete
    // 330 and 30 cycles over 1200 ticks.
    // The bounded clock therefore
    // preserves phase at the wrap even in very old colonies.
    this.time.value = (tick % 1200) / TICKS_PER_SECOND;
  }
  setDetailVisible(visible: boolean): void { this.detailVisible = visible; this.mesh.visible = visible && this.active; }
  prepareForCompile(): () => void {
    const count = this.mesh.geometry.instanceCount, visible = this.mesh.visible, culled=this.mesh.frustumCulled;
    this.mesh.geometry.instanceCount = Math.max(1, count);
    this.mesh.visible = true;
    this.mesh.frustumCulled=false;
    return () => { this.mesh.geometry.instanceCount = count; this.mesh.visible = visible; this.mesh.frustumCulled=culled; };
  }
  dispose(): void { this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}
