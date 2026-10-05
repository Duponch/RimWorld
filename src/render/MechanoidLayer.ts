import * as THREE from 'three/webgpu';
import { attribute,cos,float,Fn,If,mix,normalLocal,positionLocal,sin,uniform,vec3 } from 'three/tsl';
import { coreTimeSeconds,localTimeSeconds } from '../bridge/clock-rate';
import type { Mechanoid } from '../sim/mechanoid-state';
import { mechanoidVisualMask,mechanoidPartIndex } from '../sim/mechanoid-presentation';
import type { MechanoidKind } from '../sim/mechanoid-definition';
import type { MaterialPile,World } from '../sim/types';
import { TICKS_PER_SECOND } from '../sim/types';
import { WORLD_SCALE } from '../world/scale';
import { furnitureSurfaces,travelHeight } from './furniture-motion';
import { GaitPhaseTracker } from './gait-presentation';
import { growPawnBuffers } from './pawn-buffers';
import { pawnPresentationPose } from './pawn-presentation';
import { pawnSelectionMesh } from './PawnSelectionLayer';
import type { PawnLayer } from './PawnLayer';
import type { MotionTimeline } from './MotionTimeline';
import { pileSurfaces,type PileSurface } from './pile-surfaces';
import { material } from './primitives';
import { scytherGeometry } from './scyther-geometry';
import { rangedMechGeometry } from './ranged-mech-geometry';
import { headingAt,turnToward,TURN_TICKS,type TurnHeading } from './turn-presentation';

type VisualMech=Mechanoid&{pile?:MaterialPile;carrierId?:number};
const GAIT_RATE=2*Math.PI/1.12;

/** Original mechanical body and carcasses share one conditional resident rig.
 * A second mesh supplies selection only; no texture, flame, light or skeleton
 * is allocated per actor. Stable frames update clocks, not joint matrices. */
class MechanicalRaceBatch {
  readonly travelTime=uniform(0);readonly blend=uniform(1);
  private body?:THREE.Mesh;private selection?:THREE.Mesh;
  private selected:ReadonlySet<number>=new Set();private source?:World;
  private records:VisualMech[]=[];private readonly keys=new Map<number,string>();
  private readonly headings=new Map<number,TurnHeading>();private readonly gait=new GaitPhaseTracker();
  private surfaces:ReadonlyMap<number,number>=new Map();private pileSurface:ReadonlyMap<number,PileSurface>=new Map();
  constructor(private readonly kind:MechanoidKind,readonly group:THREE.Group,private readonly configure?:(material:THREE.MeshStandardNodeMaterial)=>void){}

  private allocate():void {
    if(this.body)return;
    const index=(id:string)=>mechanoidPartIndex(this.kind,id),geometry=this.kind==='scyther'?scytherGeometry(8,index):rangedMechGeometry(this.kind,8,index);
    const mat=material(0xffffff,{metalness:.24,roughness:.74});this.configure?.(mat);
    mat.colorNode=attribute('color','vec3');
    // A preparation tint belongs only to the confirmed warmup. Cooldown does
    // not imply an emitted projectile or manufacture recoil/flash.
    if(this.kind!=='scyther')mat.colorNode=mat.colorNode.mul(attribute('aGait','vec2').y.equal(10).select(float(1.13),float(1)));
    mat.positionNode=Fn(()=>{
      const pose=pawnPresentationPose(this),part=attribute('mechPart','vec4'),pivot=attribute('bindPivot','vec3');
      const rig=attribute('aRig','vec4'),gait=attribute('aGait','vec2'),mask=attribute('aMask','vec2');
      const phase=gait.x.add(pose.xz.sub(attribute('aFrom','vec4').xz).length().mul(GAIT_RATE));
      const attack=sin(this.travelTime.sub(rig.y).div(rig.z.max(.001)).clamp(0,1).mul(Math.PI));
      const angle=float(0).toVar();
      If(part.x.equal(1).or(part.x.equal(2)),()=>{
        angle.assign(sin(phase.add(part.x.equal(2).select(float(Math.PI),float(0)))).mul(.14).mul(rig.x));
        If(gait.y.equal(part.x).and(rig.z.greaterThan(0)),()=>{angle.addAssign(attack.mul(-1.1));});
      });
      If(part.x.equal(3).or(part.x.equal(4)).or(part.x.equal(6)).or(part.x.equal(7)),()=>{
        angle.assign(sin(phase.add(part.x.equal(4).or(part.x.equal(6)).select(float(Math.PI),float(0)))).mul(.48).mul(rig.x));
        If(gait.y.equal(part.x).and(rig.z.greaterThan(0)),()=>{angle.addAssign(attack.mul(-.8));});
      });
      If(part.x.equal(5).and(gait.y.equal(9)).and(rig.z.greaterThan(0)),()=>{angle.assign(attack.mul(.45));});
      const p=positionLocal.sub(pivot),c=cos(angle),s=sin(angle);
      const q=vec3(p.x,p.y.mul(c).sub(p.z.mul(s)),p.z.mul(c).add(p.y.mul(s))).add(pivot).toVar();
      const n=normalLocal.toVar(),normal=vec3(n.x,n.y.mul(c).sub(n.z.mul(s)),n.z.mul(c).add(n.y.mul(s))).toVar();
      If(rig.w.greaterThan(.5),()=>{
        const x=q.x.toVar(),nx=normal.x.toVar();q.x.assign(float(1.12).sub(q.y));q.y.assign(x.add(.70));
        normal.x.assign(normal.y.negate());normal.y.assign(nx);
      });
      const absent=part.z.greaterThan(.5).select(mask.y,mask.x).div(part.y).floor().mod(2).greaterThan(.5);
      If(absent,()=>{q.assign(vec3(0));});
      const cy=cos(pose.w),sy=sin(pose.w),result=vec3(q.x.mul(cy).add(q.z.mul(sy)),q.y,q.z.mul(cy).sub(q.x.mul(sy))).add(pose.xyz).toVar();
      normalLocal.assign(vec3(normal.x.mul(cy).add(normal.z.mul(sy)),normal.y,normal.z.mul(cy).sub(normal.x.mul(sy))).normalize());
      const carrier=attribute('aCarrier','vec4'),transfer=attribute('aCorpseHandoff','vec2'),from=attribute('aCorpseFrom','vec4'),to=attribute('aCorpseTo','vec4');
      const held=vec3(q.x,q.y.sub(.70),q.z).add(vec3(0,WORLD_SCALE.carriedHeight,WORLD_SCALE.carriedForward));
      If(carrier.x.greaterThan(.5),()=>{result.assign(vec3(held.x.mul(cy).add(held.z.mul(sy)),held.y,held.z.mul(cy).sub(held.x.mul(sy))).add(pose.xyz));});
      If(transfer.y.abs().greaterThan(.0001),()=>{
        const progress=this.travelTime.sub(transfer.x).div(transfer.y.abs().sub(transfer.x).max(.001)).clamp(0,1),smooth=progress.mul(progress).mul(float(3).sub(progress.mul(2)));
        const dc=cos(from.w),ds=sin(from.w),ec=cos(to.w),es=sin(to.w);
        const start=vec3(q.x.mul(dc).add(q.z.mul(ds)),q.y,q.z.mul(dc).sub(q.x.mul(ds))).add(from.xyz);
        const end=vec3(q.x.mul(ec).add(q.z.mul(es)),q.y,q.z.mul(ec).sub(q.x.mul(es))).add(to.xyz);
        If(transfer.y.greaterThan(0),()=>{result.assign(mix(start,result,smooth));}).Else(()=>{result.assign(mix(start,end,smooth));});
      });
      // A removed part collapses at the owner anchor in every presentation
      // branch, including cargo handoff; it must not reappear in the transfer.
      If(absent,()=>{result.assign(pose.xyz);});
      return result;
    })();
    const body=new THREE.Mesh(geometry,mat);body.name=`${this.kind} bodies and carcasses — original GPU rig`;body.frustumCulled=false;body.castShadow=true;body.receiveShadow=true;
    body.userData.mechKind=this.kind;
    const selection=pawnSelectionMesh(geometry,this);selection.name='Selected mechanical owners — shared trajectories';selection.visible=false;
    this.body=body;this.selection=selection;this.group.add(body,selection);
  }

  setSelected(ids:ReadonlySet<number>):void {
    this.selected=ids;if(!this.selection)return;
    const geometry=this.selection.geometry as THREE.InstancedBufferGeometry,flags=geometry.getAttribute('aSelected') as THREE.InstancedBufferAttribute;
    geometry.instanceCount=this.records.length;let any=false,dirty=false;
    this.records.forEach((actor,i)=>{const value=!actor.pile&&ids.has(actor.id)?1:0;if(flags.getX(i)!==value){flags.setX(i,value);dirty=true;}any||=value!==0;});
    if(dirty)flags.needsUpdate=true;this.selection.visible=any;
  }
  update(world:World,timeline:MotionTimeline|undefined,records:VisualMech[],reset=false,pawns?:PawnLayer):void {
    const changed=this.source!==world||reset;
    if(reset){this.headings.clear();this.keys.clear();this.gait.clear();}
    if(changed){
      this.source=world;this.keys.clear();
      this.records=records;
      if(this.records.length){this.allocate();this.surfaces=furnitureSurfaces(world);this.pileSurface=pileSurfaces(world);}if(!this.body)return;
      if(this.records.length>this.body.geometry.getAttribute('aFrom').count)growPawnBuffers([this.body,this.selection!],this.records.length);
      this.setSelected(this.selected);const present=new Set(this.records.map(m=>m.id));
      for(const id of this.headings.keys())if(!present.has(id)){this.headings.delete(id);this.gait.delete(id);}
    }
    if(!this.body)return;
    const tick=timeline?.tick??world.tick,origin=Math.floor(tick/1024)*1024;
    this.travelTime.value=localTimeSeconds(tick,origin);this.blend.value=pawns?.blend.value??1;
    const g=this.body.geometry as THREE.InstancedBufferGeometry,from=g.getAttribute('aFrom'),to=g.getAttribute('aTo'),times=g.getAttribute('aTravel'),rig=g.getAttribute('aRig'),mask=g.getAttribute('aMask'),gait=g.getAttribute('aGait'),carrierState=g.getAttribute('aCarrier'),transfer=g.getAttribute('aCorpseHandoff'),transferFrom=g.getAttribute('aCorpseFrom'),transferTo=g.getAttribute('aCorpseTo');
    g.instanceCount=this.records.length;let dirty=false;
    this.records.forEach((actor,i)=>{
      if(!changed&&!reset&&actor.pile?.owner.type==='ground'&&actor.carrierId===undefined)return;
      if(actor.pile){
        const pile=actor.pile,carrier=actor.carrierId===undefined?undefined:pawns?.animalCorpseCarrier(actor.carrierId),handoff=carrier?.handoff?.pile.id===pile.id?carrier.handoff:undefined;
        const source=carrier?.geometry,index=carrier?.index??0,sourceFrom=source?.getAttribute('aFrom'),sourceTo=source?.getAttribute('aTo'),sourceTravel=source?.getAttribute('aTravel');
        const held=pile.owner.type==='pawn',key=JSON.stringify([origin,held,handoff?.start,handoff?.end,...[sourceFrom,sourceTo,sourceTravel].flatMap(a=>a?[a.getX(index),a.getY(index),a.getZ(index),a.getW(index)]:[])]);
        if(this.keys.get(actor.id)===key)return;this.keys.set(actor.id,key);dirty=true;
        rig.setXYZW(i,0,0,0,2);mask.setXY(i,...mechanoidVisualMask(actor));gait.setXY(i,0,0);carrierState.setXYZW(i,held&&carrier?1:0,0,0,0);
        if(held&&sourceFrom&&sourceTo&&sourceTravel){
          from.setXYZW(i,sourceFrom.getX(index),sourceFrom.getY(index),sourceFrom.getZ(index),sourceFrom.getW(index));to.setXYZW(i,sourceTo.getX(index),sourceTo.getY(index),sourceTo.getZ(index),sourceTo.getW(index));times.setXYZW(i,sourceTravel.getX(index),sourceTravel.getY(index),sourceTravel.getZ(index),sourceTravel.getW(index));
        }else{
          const surface=pile.owner.type==='ground'?this.pileSurface.get(pile.owner.z*world.width+pile.owner.x):undefined;
          from.setXYZW(i,actor.x+(surface?.x??0),surface?.y??0,actor.z+(surface?.z??0),actor.heading);to.setXYZW(i,from.getX(i),from.getY(i),from.getZ(i),actor.heading);times.setXYZW(i,0,0,0,1);
        }
        if(handoff){
          transfer.setXY(i,localTimeSeconds(handoff.start,origin),(handoff.direction==='pickup'?1:-1)*localTimeSeconds(handoff.end,origin));
          transferFrom.setXYZW(i,handoff.from.x,handoff.from.y-.15,handoff.from.z,handoff.direction==='pickup'?actor.heading:handoff.from.yaw);transferTo.setXYZW(i,handoff.to.x,handoff.to.y-.15,handoff.to.z,actor.heading);
        }else transfer.setXY(i,0,0);
        return;
      }
      const edge=timeline?.segment(actor.id)??actor.motion,active=!!edge&&tick>=edge.start&&tick<edge.end,fallen=actor.state==='dead'||actor.state==='downed';
      const fa=edge&&'fromFraction' in edge?Number(edge.fromFraction??0):0,fb=edge&&'toFraction' in edge?Number(edge.toFraction??1):1;
      const visualMask=mechanoidVisualMask(actor);
      const key=JSON.stringify([i,origin,edge?.start,edge?.end,fa,fb,active,actor.state,actor.heading,actor.melee?.strike,actor.melee?.order,actor.stun?.untilCore,actor.ranged?.stance?.phase,...visualMask]);
      if(this.keys.get(actor.id)===key)return;this.keys.set(actor.id,key);dirty=true;
      const traveling=!!edge&&(active||actor.state==='moving'&&world.tick<edge.end),f=traveling?edge.from:actor,t=traveling?edge.to:actor;
      const yaw=traveling?Math.atan2(edge.to.x-edge.from.x,edge.to.z-edge.from.z):actor.heading,previous=this.headings.get(actor.id);
      let heading=turnToward(previous,yaw,traveling?edge.start:tick);
      if(traveling&&previous&&heading===previous&&previous.startTick!==edge.start)heading={from:headingAt(previous,edge.start),to:previous.to,startTick:edge.start};
      this.headings.set(actor.id,heading);const turning=!traveling&&tick-heading.startTick<TURN_TICKS,lerp=THREE.MathUtils.lerp;
      from.setXYZW(i,lerp(f.x,t.x,traveling?fa:0),this.surfaces.get(f.z*world.width+f.x)??0,lerp(f.z,t.z,traveling?fa:0),traveling||turning?heading.from:heading.to);
      to.setXYZW(i,lerp(f.x,t.x,traveling?fb:1),this.surfaces.get(t.z*world.width+t.x)??0,lerp(f.z,t.z,traveling?fb:1),heading.to);
      const turnStart=localTimeSeconds(heading.startTick,origin);times.setXYZW(i,traveling?localTimeSeconds(edge.start,origin):turning?turnStart:0,traveling?localTimeSeconds(edge.end,origin):turning?turnStart+TURN_TICKS/TICKS_PER_SECOND:0,traveling?fa:turnStart,traveling?fb:turning?2:1);
      const stepping=active&&!fallen&&!actor.stun&&fa!==fb,phase=stepping&&edge?this.gait.begin(actor.id,{start:edge.start,end:edge.end,fromX:from.getX(i),fromZ:from.getZ(i),toX:to.getX(i),toZ:to.getZ(i)},tick,GAIT_RATE):undefined;
      if(!stepping)this.gait.halt(actor.id,tick,GAIT_RATE);
      const strike=!fallen&&!traveling&&!actor.stun?actor.melee?.strike:undefined,tool=strike?.tool??'';
      rig.setXYZW(i,stepping?1:0,strike?coreTimeSeconds(strike.atCore,origin):0,strike?(strike.untilCore-strike.atCore)/60:0,fallen?1:0);
      const attackBone=tool==='head'?9:tool.includes('left')?(this.kind==='pikeman'?3:1):tool.includes('right')?(this.kind==='pikeman'?4:2):0;
      gait.setXY(i,phase??0,strike?attackBone:actor.ranged?.stance?.phase==='warmup'?10:0);
      mask.setXY(i,...visualMask);carrierState.setXYZW(i,0,0,0,0);transfer.setXY(i,0,0);
    });
    if(dirty)(from as THREE.InterleavedBufferAttribute).data.needsUpdate=true;
  }
  /** Gesture-only proxy reads the same instance edges as the rig. */
  forEachPose(visit:(id:number,x:number,y:number,z:number,height:number,radius:number,dead:boolean)=>void):void {
    if(!this.body)return;const g=this.body.geometry,from=g.getAttribute('aFrom'),to=g.getAttribute('aTo'),times=g.getAttribute('aTravel'),rig=g.getAttribute('aRig');
    this.records.forEach((actor,i)=>{if(actor.pile)return;const start=times.getX(i),end=times.getY(i),alpha=end>start?THREE.MathUtils.clamp((this.travelTime.value-start)/(end-start),0,1):this.blend.value;
      const fallen=rig.getW(i)>.5;visit(actor.id,THREE.MathUtils.lerp(from.getX(i),to.getX(i),alpha),travelHeight(from.getY(i),to.getY(i),THREE.MathUtils.lerp(times.getZ(i),Math.min(1,times.getW(i)),alpha)),THREE.MathUtils.lerp(from.getZ(i),to.getZ(i),alpha),fallen?1.30:this.kind==='pikeman'?1.36:this.kind==='lancer'?1.90:1.81,fallen?1.0:this.kind==='pikeman'?.88:.69,actor.state==='dead');});
  }
  prepare():()=>void {if(!this.body)return()=>{};const g=this.body.geometry as THREE.InstancedBufferGeometry,count=g.instanceCount;g.instanceCount=Math.max(1,count);return()=>{g.instanceCount=count;};}
  reset():void {this.dispose();this.source=undefined;this.records=[];this.keys.clear();this.headings.clear();this.gait.clear();}
  dispose():void {if(this.body){this.group.remove(this.body);this.body.geometry.dispose();(this.body.material as THREE.Material).dispose();}if(this.selection){this.group.remove(this.selection);this.selection.geometry.dispose();(this.selection.material as THREE.Material).dispose();}this.body=undefined;this.selection=undefined;}
}

/** At most three conditional race batches, each one body and one selection
 * mesh. Empty/historical scenes allocate none of the new races. */
export class MechanoidLayer {
  readonly group=new THREE.Group();
  private readonly batches=new Map<MechanoidKind,MechanicalRaceBatch>();
  private selected:ReadonlySet<number>=new Set();
  private source?:World;private pileSource?:readonly MaterialPile[];private corpsePiles:MaterialPile[]=[];
  private records=new Map<MechanoidKind,VisualMech[]>();
  constructor(private readonly configure?:(material:THREE.MeshStandardNodeMaterial)=>void){this.group.name='Mechanical bodies — conditional race batches';}
  setSelected(ids:ReadonlySet<number>):void {this.selected=ids;for(const batch of this.batches.values())batch.setSelected(ids);}
  update(world:World,timeline:MotionTimeline|undefined,reset=false,pawns?:PawnLayer):void {
    if(this.source!==world||reset){
      this.source=world;this.records=new Map();
      const add=(actor:VisualMech)=>{let list=this.records.get(actor.mechKind);if(!list){list=[];this.records.set(actor.mechKind,list);}list.push(actor);};
      for(const actor of world.mechanoids??[])add(actor);
      if(this.pileSource!==world.piles||reset){this.pileSource=world.piles;this.corpsePiles=world.piles.filter(p=>!!p.mechCorpse&&(p.owner.type==='ground'||p.owner.type==='pawn'));}
      for(const pile of this.corpsePiles)add({id:pile.id,mechKind:pile.mechCorpse!.mechKind,state:'dead',health:pile.mechCorpse!.health,
        x:pile.owner.type==='ground'?pile.owner.x:0,z:pile.owner.type==='ground'?pile.owner.z:0,heading:pile.mechCorpse!.heading??0,path:[],moveCooldown:0,planCooldown:0,
        pile,carrierId:pile.owner.type==='pawn'?pile.owner.pawnId:pawns?.animalCorpseTransferCarrier(pile.id)});
      for(const kind of this.records.keys())if(!this.batches.has(kind))this.batches.set(kind,new MechanicalRaceBatch(kind,this.group,this.configure));
    }
    for(const [kind,batch] of this.batches){batch.update(world,timeline,this.records.get(kind)??[],reset,pawns);batch.setSelected(this.selected);}
  }
  forEachPose(visit:(id:number,x:number,y:number,z:number,height:number,radius:number,dead:boolean,kind:MechanoidKind)=>void):void {
    for(const [kind,batch] of this.batches)batch.forEachPose((id,x,y,z,height,radius,dead)=>visit(id,x,y,z,height,radius,dead,kind));
  }
  prepare():()=>void {const restores=[...this.batches.values()].map(batch=>batch.prepare());return()=>{for(const restore of restores)restore();};}
  reset():void {for(const batch of this.batches.values())batch.reset();this.batches.clear();this.source=undefined;this.pileSource=undefined;this.corpsePiles=[];this.records.clear();}
  dispose():void {this.reset();}
}
