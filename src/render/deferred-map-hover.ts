type PointerPosition=Pick<PointerEvent,'pointerId'|'clientX'|'clientY'>;
type PointerMove=PointerPosition&Pick<PointerEvent,'buttons'>;
export interface DeferredHoverPoint {readonly x:number;readonly y:number}

/** Latest screen position only. Clicks, selection and command commits remain
 * synchronous owners; no DOM, camera, World or retained PointerEvent here. */
export class DeferredMapHover {
  private point:DeferredHoverPoint|undefined;
  private pending=false;
  private cameraPointer:number|undefined;
  beginCamera(event:PointerPosition):void {
    this.point={x:event.clientX,y:event.clientY};this.pending=true;this.cameraPointer=event.pointerId;
  }
  move(event:PointerMove):void {
    if(this.cameraPointer!==undefined&&this.cameraPointer!==event.pointerId)return;
    this.point={x:event.clientX,y:event.clientY};this.pending=true;
    this.cameraPointer=event.buttons&6?event.pointerId:undefined;
  }
  release(event:PointerMove):void {this.move(event);}
  cancel(pointerId:number):void {
    if(this.cameraPointer!==pointerId)return;
    this.cameraPointer=undefined;this.pending=this.point!==undefined;
  }
  resume():void {this.cameraPointer=undefined;this.pending=this.point!==undefined;}
  leave():void {this.point=undefined;this.pending=false;}
  clear():void {this.leave();this.cameraPointer=undefined;}
  take():DeferredHoverPoint|undefined {
    if(!this.pending||this.cameraPointer!==undefined)return;
    this.pending=false;return this.point;
  }
}
