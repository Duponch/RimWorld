/** One resident DATA mask; pigments and BoxMesh layouts remain unchanged. */
import * as THREE from 'three/webgpu';
import {attribute,convert,float,positionWorld,texture,uniform,varying} from 'three/tsl';
import {ExplorationField256} from './ExplorationField256';
import type {World} from '../sim/types';
export function actorExplorationMaterial256<T extends THREE.NodeMaterial>(material:T):T {material.userData.explorationActor=true;return material;}
// Only continuous natural rock uses this explicit opaque cover. Shared props
// and actors retain their fragment/shadow visibility masks.
export function opaqueRockExplorationMaterial256<T extends THREE.NodeMaterial>(material:T):T {material.userData.explorationOpaqueRock=true;return material;}
export class ExplorationMask256 {
 readonly field=new ExplorationField256();
 readonly map=new THREE.DataTexture(this.field.data,1,1,THREE.RGBAFormat,THREE.UnsignedByteType);
 private readonly size=uniform(new THREE.Vector2(1,1));
 private readonly enabled=uniform(false);
 private readonly sample=texture(this.map);
 private readonly cell=positionWorld.xz.add(.5).floor();
 private readonly inside=this.cell.x.greaterThanEqual(0).and(this.cell.y.greaterThanEqual(0)).and(this.cell.x.lessThan(this.size.x)).and(this.cell.y.lessThan(this.size.y));
 private readonly seen=this.sample.sample(this.cell.add(.5).div(this.size)).level(float(0)).r.greaterThan(.5);
 private readonly visible=this.enabled.not().or(this.inside.not()).or(this.seen);
 private readonly configured=new WeakSet<THREE.NodeMaterial>();
 readonly surface:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicNodeMaterial>;
 constructor(){
  this.map.minFilter=this.map.magFilter=THREE.NearestFilter;this.map.generateMipmaps=false;this.map.flipY=false;this.map.onUpdate=()=>this.map.clearUpdateRanges();this.map.needsUpdate=true;
  const material=new THREE.MeshBasicNodeMaterial({color:0x31383f,side:THREE.DoubleSide});
  material.maskNode=this.enabled.and(this.inside).and(this.seen.not());material.userData.explorationSurface=true;
  this.surface=new THREE.Mesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),material);this.surface.name='Unexplored local cells';this.surface.position.y=.035;this.surface.frustumCulled=false;this.surface.renderOrder=2;this.surface.visible=false;
 }
 /** Existing shader masks are composed, including alpha/selection cutouts.
  * Renderer r186 forwards maskShadowNode (or maskNode) to its shadow pass. */
 readonly configure=(material:THREE.NodeMaterial):void=>{
  if(this.configured.has(material)||material.userData.explorationSurface||material.userData.explorationIntent)return;
  if(material.userData.explorationOpaqueRock){this.configured.add(material);return;}
  const mask=material.maskNode,shadow=material.maskShadowNode??mask;
  let visible=this.visible;
  if(material.userData.explorationActor){
   const anchor=varying(attribute('aTo','vec4').xz,'v_explorationOwner').add(.5).floor();
   const inside=anchor.x.greaterThanEqual(0).and(anchor.y.greaterThanEqual(0)).and(anchor.x.lessThan(this.size.x)).and(anchor.y.lessThan(this.size.y));
   const known=this.sample.sample(anchor.add(.5).div(this.size)).level(float(0)).r.greaterThan(.5);
   visible=visible.and(this.enabled.not().or(inside.not()).or(known));
  }
  material.maskNode=mask?new THREE.OperatorNode('&&',convert(mask,'bool'),visible):visible;
  material.maskShadowNode=shadow?new THREE.OperatorNode('&&',convert(shadow,'bool'),visible):visible;
  this.configured.add(material);material.needsUpdate=true;
 };
 /** Rare adoption/settings/preparation traversal covers unlit VFX and sprites.
  * Standard-material variants register at creation via EnvironmentLighting. */
 bind(root:THREE.Object3D):void {root.traverse(object=>{if(object instanceof THREE.Mesh)for(const m of Array.isArray(object.material)?object.material:[object.material])if(m instanceof THREE.NodeMaterial){if(object.geometry.getAttribute('aTo'))actorExplorationMaterial256(m);this.configure(m);}});}
 adopt(world:World,reset:boolean,changed:readonly number[]|null):boolean {
  const resized=this.field.width!==world.width||this.field.height!==world.height,dirty=this.field.adopt(world,reset,changed);
  this.enabled.value=this.field.enabled;this.surface.visible=this.field.enabled;
  if(!dirty)return false;
  if(resized){this.map.dispose();this.map.clearUpdateRanges();}this.map.image={data:this.field.data,width:this.field.width,height:this.field.height};this.size.value.set(this.field.width,this.field.height);
  for(const r of this.field.ranges)this.map.addUpdateRange(r.start,r.count);this.map.needsUpdate=true;
  this.surface.scale.set(world.width,1,world.height);this.surface.position.set((world.width-1)/2,.035,(world.height-1)/2);return true;
 }
 dispose():void {this.map.dispose();this.surface.geometry.dispose();this.surface.material.dispose();this.surface.removeFromParent();}
}
