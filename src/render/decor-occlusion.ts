// Fragment mask for decor between the main camera and the nominal map floor.
import {Matrix4,Vector3,Vector4,type Camera} from 'three/webgpu';
import {Fn,cameraWorldMatrix,positionView,renderGroup,uniform,vec4} from 'three/tsl';

export interface DecorPoint {readonly x:number;readonly y:number;readonly z:number}
export interface DecorView {readonly perspective:boolean;readonly eye:DecorPoint;readonly forward:DecorPoint}
export interface DecorMap {readonly width:number;readonly height:number}
export const DECOR_OCCLUSION_EPSILON=1e-6;
const finitePoint=(p:DecorPoint)=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z);
const validMap=(m:DecorMap)=>Number.isSafeInteger(m.width)&&m.width>0&&Number.isSafeInteger(m.height)&&m.height>0;

/** CPU reference for the same nominal floor protected by the existing V322 box.
 * No ray normalization, viewport circle, terrain scan or stateful visibility. */
export function decorOccludesMap(p:DecorPoint,view:DecorView,map:DecorMap):boolean {
  if(!validMap(map)||!finitePoint(p)||!finitePoint(view.eye)||!finitePoint(view.forward)||p.y<=DECOR_OCCLUSION_EPSILON)return false;
  const dx=view.perspective?p.x-view.eye.x:view.forward.x;
  const dy=view.perspective?p.y-view.eye.y:view.forward.y;
  const dz=view.perspective?p.z-view.eye.z:view.forward.z;
  if(dy>=-DECOR_OCCLUSION_EPSILON)return false;
  const t=-p.y/dy;if(!Number.isFinite(t)||t<0)return false;
  const x=p.x+t*dx,z=p.z+t*dz;
  return Number.isFinite(x)&&Number.isFinite(z)&&x>=-.5&&x<=map.width-.5&&z>=-.5&&z<=map.height-.5;
}

/** One constant-size main-camera publication shared by room and old clouds.
 * Material masks remain stable nodes when an option, map or camera changes. */
export class DecorOcclusion {
  private readonly enabled=uniform(1).setGroup(renderGroup);
  private readonly ready=uniform(0).setGroup(renderGroup);
  private readonly eye=uniform(new Vector3()).setGroup(renderGroup);
  private readonly forward=uniform(new Vector3(0,-1,0)).setGroup(renderGroup);
  private readonly perspective=uniform(0).setGroup(renderGroup);
  private readonly bounds=uniform(new Vector4(-.5,-.5,-.5,-.5)).setGroup(renderGroup);
  private readonly lastWorld=new Matrix4();
  private lastCamera:Camera|undefined;
  private viewReady=false;
  private width=0;
  private height=0;

  readonly visibleNode=Fn(()=>{
    // Reuse the final view position needed by Standard lighting, rather than
    // allocating another world-position varying on the 16-slot WebGPU limit.
    // The current render camera converts that interpolated, deformed point
    // back to world space; instance/batch/custom positionNode stay included.
    const p=cameraWorldMatrix.mul(vec4(positionView,1)).xyz.toConst();
    const d=this.perspective.greaterThan(.5).select(p.sub(this.eye),this.forward).toConst();
    // Safe denominator even if a backend evaluates both select operands.
    const t=p.y.negate().div(d.y.min(-DECOR_OCCLUSION_EPSILON)).toConst();
    const q=p.add(d.mul(t)).toConst();
    const occludes=p.y.greaterThan(DECOR_OCCLUSION_EPSILON).and(d.y.lessThan(-DECOR_OCCLUSION_EPSILON))
      .and(t.greaterThanEqual(0)).and(q.x.greaterThanEqual(this.bounds.x)).and(q.x.lessThanEqual(this.bounds.y))
      .and(q.z.greaterThanEqual(this.bounds.z)).and(q.z.lessThanEqual(this.bounds.w));
    return this.enabled.lessThan(.5).or(this.ready.lessThan(.5)).or(occludes.not());
  })();

  setEnabled(enabled:boolean):boolean {
    const next=enabled?1:0;if(this.enabled.value===next)return false;this.enabled.value=next;return true;
  }
  configure(width:number,height:number):boolean {
    if(!validMap({width,height}))throw new RangeError('Decor mask requires positive integer map dimensions.');
    if(this.width===width&&this.height===height)return false;
    this.width=width;this.height=height;this.bounds.value.set(-.5,width-.5,-.5,height-.5);this.ready.value=this.viewReady?1:0;return true;
  }
  /** The projection matrix is intentionally not a uniform dependency: zoom/FOV
   * changes visible fragments, while their world rays remain the same. The
   * RoomBackdrop and native bundle already compare projection independently. */
  present(camera:Camera):boolean {
    camera.updateMatrixWorld();const perspective=(camera as Camera&{isPerspectiveCamera?:boolean}).isPerspectiveCamera===true?1:0;
    if(this.viewReady&&this.lastCamera===camera&&this.perspective.value===perspective&&this.lastWorld.equals(camera.matrixWorld))return false;
    this.eye.value.setFromMatrixPosition(camera.matrixWorld);camera.getWorldDirection(this.forward.value);this.perspective.value=perspective;
    this.lastWorld.copy(camera.matrixWorld);this.lastCamera=camera;this.viewReady=true;this.ready.value=this.width>0&&this.height>0?1:0;return true;
  }
  invalidateView():void {this.viewReady=false;this.lastCamera=undefined;this.ready.value=0;}
}