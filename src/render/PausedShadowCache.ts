import { Matrix4,Vector2,Vector3,type Camera,type DirectionalLight } from 'three/webgpu';

/** Only a completed shadow pass may seed this cache. The caller still owns the
 * per-light autoUpdate/needsUpdate flags and invalidates on caster setters. */
export class PausedShadowCache {
  private ready=false;
  private view=new Matrix4();
  private projection=new Matrix4();
  private shadowView=new Matrix4();
  private shadowProjection=new Matrix4();
  private lightPosition=new Vector3();
  private targetPosition=new Vector3();
  private mapSize=new Vector2();
  private tick=NaN;
  private blend=NaN;
  private distant=false;
  private width=0;
  private height=0;
  private intensity=NaN;
  private bias=NaN;
  private normalBias=NaN;

  invalidate():void {this.ready=false;}

  canReuse(paused:boolean,camera:Camera,light:DirectionalLight,tick:number,blend:number,distant:boolean,width:number,height:number):boolean {
    const shadow=light.shadow;
    return paused&&this.ready&&!shadow.needsUpdate&&Number.isFinite(tick)&&Number.isFinite(blend)&&
      this.tick===tick&&this.blend===blend&&this.distant===distant&&this.width===width&&this.height===height&&
      this.intensity===light.intensity&&this.bias===shadow.bias&&this.normalBias===shadow.normalBias&&
      this.view.equals(camera.matrixWorld)&&this.projection.equals(camera.projectionMatrix)&&
      this.shadowView.equals(shadow.camera.matrixWorld)&&this.shadowProjection.equals(shadow.camera.projectionMatrix)&&
      this.lightPosition.equals(light.position)&&this.targetPosition.equals(light.target.position)&&this.mapSize.equals(shadow.mapSize);
  }

  capture(completed:boolean,camera:Camera,light:DirectionalLight,tick:number,blend:number,distant:boolean,width:number,height:number):void {
    if(!completed||!Number.isFinite(tick)||!Number.isFinite(blend)){this.invalidate();return;}
    const shadow=light.shadow;
    this.view.copy(camera.matrixWorld);this.projection.copy(camera.projectionMatrix);
    this.shadowView.copy(shadow.camera.matrixWorld);this.shadowProjection.copy(shadow.camera.projectionMatrix);
    this.lightPosition.copy(light.position);this.targetPosition.copy(light.target.position);this.mapSize.copy(shadow.mapSize);
    this.tick=tick;this.blend=blend;this.distant=distant;this.width=width;this.height=height;
    this.intensity=light.intensity;this.bias=shadow.bias;this.normalBias=shadow.normalBias;
    this.ready=true;
  }
}
