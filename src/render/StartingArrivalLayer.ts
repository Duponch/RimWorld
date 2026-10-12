import * as THREE from 'three/webgpu';
import { Fn,attribute,cos,float,instanceIndex,mat4,normalLocal,positionLocal,sin,smoothstep,texture,transformNormal,uint,uniform,vec3,vec4 } from 'three/tsl';
import type { World } from '../sim/types';
import { BoxMesh } from './BoxMesh';
import { material } from './primitives';
import { createStylizedSurfaceTexture } from './stylized-surfaces';
import { instancedBoxPatternUv } from './texture-variation';
import type { AnimationDetail } from './AnimationDetail';
import { RetainedAnimation } from './RetainedAnimation';

export const STARTING_ARRIVAL_CAPSULES=3;
export const STARTING_ARRIVAL_PARTS=8;
export const STARTING_ARRIVAL_HEIGHT=24;
export const STARTING_ARRIVAL_OPENING_TICKS=3;
// Original painted shell, reinforced ends, hinged lids and their dark windows.
// Every capsule uses these same eight resident pieces; no held actor is drawn.
const PARTS=[
  [0,.40,0,1.02,.68,1.76,0xa9beb1,0],
  [0,.08,0,1.18,.16,1.88,0x526c70,0],
  [0,.40,-.66,1.12,.74,.13,0xcfaa7f,0],
  [0,.40,.66,1.12,.74,.13,0xcfaa7f,0],
  [-.28,.81,0,.56,.17,1.82,0xeee0bd,-1],
  [.28,.81,0,.56,.17,1.82,0xeee0bd,1],
  [-.28,.91,0,.34,.025,.60,0x567078,-1],
  [.28,.91,0,.34,.025,.60,0x567078,1],
] as const;
type Phase='none'|'incoming'|'landed'|'opening'|'retired';

/** Read-only projection of the durable arrival owner and its visual receipt.
 * Neither the deadline nor this shader can release a person or possession. */
export class StartingArrivalLayer {
  readonly group=new THREE.Group();
  readonly mesh:BoxMesh;
  readonly tick=uniform(0);
  readonly opening=uniform(new THREE.Vector2());
  private readonly times=uniform(new THREE.Vector2(0,15));
  private readonly landed=uniform(0);
  private readonly base=new THREE.BoxGeometry(1,1,1);
  private readonly paint=createStylizedSurfaceTexture();
  private readonly plain=material(0xffffff,{transparent:true,depthWrite:false,forceSinglePass:true});
  private readonly painted=material(0xffffff,{transparent:true,depthWrite:false,forceSinglePass:true});
  private readonly animation:RetainedAnimation;
  private key='';
  private revision=0;
  private phase:Phase='none';
  private confirmedTick=0;
  private fadeUntil:number|undefined;
  private texturesEnabled=true;
  private cellsKey='';

  constructor(configure?:(surface:THREE.MeshStandardNodeMaterial)=>void,detail?:AnimationDetail){
    this.animation=new RetainedAnimation(detail);
    // Reserve the tiny three-owner palette before compilation; no later growth.
    this.animation.reconcile([0,1,2].map(id=>({id,x:0,y:1,z:0})));this.animation.reset();
    const open=smoothstep(this.opening.x,this.opening.x.add(STARTING_ARRIVAL_OPENING_TICKS),this.tick).mul(this.opening.y);
    const fall=float(1).sub(smoothstep(this.times.x,this.times.y,this.tick)).mul(STARTING_ARRIVAL_HEIGHT).mul(float(1).sub(this.landed));
    const basis=this.animation.choose(()=>{const angle=open.mul(-Math.PI*.56);return vec4(open,fall,cos(angle),sin(angle));},uint(instanceIndex.div(STARTING_ARRIVAL_PARTS)));
    const position=Fn(()=>{
      const transform=mat4(attribute('boxMatrix0','vec4'),attribute('boxMatrix1','vec4'),attribute('boxMatrix2','vec4'),attribute('boxMatrix3','vec4')).toVar();
      const side=attribute('arrivalLidSide','float'),c=float(1).add(basis.z.sub(1).mul(side.mul(side))),s=basis.w.mul(side);
      const hinge=vec3(side.mul(.56),.80,0),local=transform.mul(positionLocal).xyz.sub(hinge);
      const point=vec3(local.x.mul(c).sub(local.y.mul(s)),local.x.mul(s).add(local.y.mul(c)),local.z).add(hinge);
      const normal=transformNormal(normalLocal,transform);
      normalLocal.assign(vec3(normal.x.mul(c).sub(normal.y.mul(s)),normal.x.mul(s).add(normal.y.mul(c)),normal.z));
      return point.add(vec3(0,basis.y,0)).add(attribute('arrivalCenter','vec3'));
    })();
    for(const surface of [this.plain,this.painted]){
      configure?.(surface);surface.userData.rendererOwned=true;surface.positionNode=position;
      surface.colorNode=attribute('boxColor','vec3');surface.opacityNode=float(1).sub(basis.x);
    }
    this.painted.colorNode=attribute('boxColor','vec3').mul(texture(this.paint,instancedBoxPatternUv()).rgb);
    const capacity=STARTING_ARRIVAL_CAPSULES*STARTING_ARRIVAL_PARTS;
    this.mesh=new BoxMesh(this.base,this.painted,capacity);this.mesh.name='starting-arrival-capsules';
    this.mesh.castShadow=true;this.mesh.receiveShadow=true;
    const centers=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3),3);
    const sides=new THREE.InstancedBufferAttribute(new Float32Array(capacity),1);
    this.mesh.geometry.setAttribute('arrivalCenter',centers);this.mesh.geometry.setAttribute('arrivalLidSide',sides);
    const object=new THREE.Object3D(),color=new THREE.Color();
    for(let capsule=0;capsule<STARTING_ARRIVAL_CAPSULES;capsule++)PARTS.forEach(([x,y,z,sx,sy,sz,tint,side],part)=>{
      const index=capsule*STARTING_ARRIVAL_PARTS+part;
      object.position.set(x,y,z);object.scale.set(sx,sy,sz);object.updateMatrix();
      this.mesh.setMatrixAt(index,object.matrix);this.mesh.setColorAt(index,color.setHex(tint));sides.setX(index,side);
    });
    this.mesh.instanceMatrix.needsUpdate=this.mesh.colorBuffer.needsUpdate=sides.needsUpdate=true;
    this.mesh.activeCount=0;this.group.add(this.mesh);
  }

  get presentation():Readonly<{phase:Phase;capsules:number;visible:boolean}> {
    return {phase:this.phase,capsules:this.mesh.activeCount/STARTING_ARRIVAL_PARTS,visible:this.mesh.visible};
  }

  adopt(world:World,reset=false):boolean {
    const arrival=world.startingArrival;this.confirmedTick=world.tick;
    if(reset){this.key='';this.cellsKey='';this.animation.reset();}
    if(!arrival){
      const changed=this.mesh.activeCount>0;this.key='';this.cellsKey='';this.phase='none';this.fadeUntil=undefined;
      if(changed||reset){this.mesh.activeCount=0;this.animation.reset();this.revision++;}return changed;
    }
    // The durable receipt remains in saves. Once its short animation is over,
    // ordinary snapshots do not build keys, arrays or retained-pose work.
    if(arrival.phase==='opened'&&world.tick>=arrival.openedAt+STARTING_ARRIVAL_OPENING_TICKS){
      const changed=this.mesh.activeCount>0;
      if(changed||reset||this.phase!=='retired'){
        this.key='retired';this.mesh.activeCount=0;this.phase='retired';this.fadeUntil=undefined;this.animation.reset();this.revision++;
      }return changed;
    }
    const cells=arrival.phase==='opened'?arrival.cells:arrival.pods.map(pod=>pod.cell);
    const cellsKey=cells.map(cell=>`${cell.x}:${cell.z}`).join('|');
    const key=`${arrival.phase}:${arrival.start}:${arrival.landAt}:${arrival.openAt}:${arrival.phase==='opened'?arrival.openedAt:''}:${cellsKey}`;
    if(key===this.key)return false;
    this.key=key;this.revision++;this.tick.value=world.tick;
    // Impact/opening are confirmed ownership boundaries, even when a distant
    // pose was retained. Revoke its sample before reconciling the same anchors.
    this.animation.reset();
    this.times.value.set(arrival.start,arrival.landAt);this.landed.value=arrival.phase==='incoming'?0:1;
    this.opening.value.set(arrival.phase==='opened'?arrival.openedAt:0,arrival.phase==='opened'?1:0);
    this.fadeUntil=arrival.phase==='opened'?arrival.openedAt+STARTING_ARRIVAL_OPENING_TICKS:undefined;
    this.phase=arrival.phase==='opened'?'opening':arrival.phase;
    if(cellsKey!==this.cellsKey){
      this.cellsKey=cellsKey;const centers=this.mesh.geometry.getAttribute('arrivalCenter') as THREE.InstancedBufferAttribute;
      this.mesh.boundingSphere.makeEmpty();
      cells.forEach((cell,capsule)=>{
        for(let part=0;part<STARTING_ARRIVAL_PARTS;part++)centers.setXYZ(capsule*STARTING_ARRIVAL_PARTS+part,cell.x,0,cell.z);
        this.mesh.boundingSphere.union(new THREE.Sphere(new THREE.Vector3(cell.x,12.5,cell.z),13.5));
      });centers.needsUpdate=true;
    }
    this.mesh.activeCount=cells.length*STARTING_ARRIVAL_PARTS;
    this.animation.reconcile(cells.map((cell,id)=>({id,x:cell.x,y:1,z:cell.z})));
    return true;
  }

  present(tick:number):boolean {
    if(!this.mesh.activeCount)return false;
    // Never predict beyond the most recent adopted simulation snapshot.
    this.tick.value=Math.min(tick,this.confirmedTick);
    if(this.fadeUntil!==undefined&&this.tick.value>=this.fadeUntil){
      this.mesh.activeCount=0;this.phase='retired';this.fadeUntil=undefined;this.animation.reset();this.revision++;return true;
    }
    const smooth=(a:number,b:number,t:number)=>{const f=Math.max(0,Math.min(1,(t-a)/(b-a)));return f*f*(3-2*f);};
    this.animation.present(owner=>{
      const open=smooth(this.opening.value.x,this.opening.value.x+STARTING_ARRIVAL_OPENING_TICKS,this.tick.value)*this.opening.value.y,angle=open*(-Math.PI*.56);
      owner.values[0]=open;owner.values[1]=(1-smooth(this.times.value.x,this.times.value.y,this.tick.value))*STARTING_ARRIVAL_HEIGHT*(1-this.landed.value);
      owner.values[2]=Math.cos(angle);owner.values[3]=Math.sin(angle);
    });return false;
  }

  setTexturesEnabled(enabled:boolean):void {if(enabled!==this.texturesEnabled){this.texturesEnabled=enabled;this.mesh.material=enabled?this.painted:this.plain;}}

  prepareForCompile():()=>void {
    const mesh=this.mesh,visible=mesh.visible,culled=mesh.frustumCulled,count=mesh.activeCount,revision=this.revision;
    const buffer=mesh.instanceMatrix,first=count===0?buffer.array.slice(0,16):undefined;
    if(first){buffer.array.fill(0,0,16);buffer.array[15]=1;buffer.needsUpdate=true;mesh.activeCount=1;}
    const version=buffer.version;mesh.visible=true;mesh.frustumCulled=false;
    return()=>{
      mesh.frustumCulled=culled;if(mesh.instanceMatrix!==buffer||buffer.version!==version)return;
      if(first){buffer.array.set(first,0);buffer.needsUpdate=true;}
      if(this.revision===revision){mesh.activeCount=count;mesh.visible=visible;}
    };
  }

  dispose():void {this.animation.dispose();this.mesh.removeFromParent();this.mesh.dispose();this.base.dispose();this.plain.dispose();this.painted.dispose();this.paint.dispose();this.group.clear();}
}
