export interface ScreenPawn { id:number; x:number; y:number; radius:number; depth:number }
export type SelectionGesture = { ids:number[]; additive:boolean; toggle:boolean };
interface Callbacks {
  enabled():boolean;
  pawns():ScreenPawn[];
  selected():ReadonlySet<number>;
  canInspect(event:PointerEvent):boolean;
  select(gesture:SelectionGesture):void;
  inspect(event:PointerEvent):void;
  lock(locked:boolean):void;
}
/** Screen-space rectangle remains meaningful after rotating either 3D camera.
 * Simulation cells and GPU rig geometry are never used as selection authority. */
export class PawnSelectionInput {
  private drag:{id:number;x:number;y:number;shift:boolean}|null=null;
  private readonly box=document.createElement('div');
  constructor(private readonly canvas:HTMLCanvasElement,private readonly callbacks:Callbacks) {
    this.box.className='selection-rectangle';this.box.hidden=true;document.body.append(this.box);
    canvas.addEventListener('dblclick',this.doubleClick);
  }
  get active():boolean{return this.drag!==null;}
  down(event:PointerEvent):boolean {
    if(this.drag){this.cancel();event.preventDefault();event.stopImmediatePropagation();return true;}
    if(!this.callbacks.enabled()||event.button!==0||!event.isPrimary)return false;
    this.drag={id:event.pointerId,x:event.clientX,y:event.clientY,shift:event.shiftKey};
    this.canvas.setPointerCapture(event.pointerId);this.callbacks.lock(true);
    event.preventDefault();event.stopImmediatePropagation();return true;
  }
  move(event:PointerEvent):boolean {
    const drag=this.drag;if(!drag||drag.id!==event.pointerId)return false;
    if(event.buttons&2){this.cancel();return true;}
    this.box.hidden=Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<=6;
    Object.assign(this.box.style,{left:`${Math.min(event.clientX,drag.x)}px`,top:`${Math.min(event.clientY,drag.y)}px`,width:`${Math.abs(event.clientX-drag.x)}px`,height:`${Math.abs(event.clientY-drag.y)}px`});
    return true;
  }
  up(event:PointerEvent):boolean {
    const drag=this.drag;if(!drag||drag.id!==event.pointerId||event.button!==0)return false;
    const inside=document.elementFromPoint(event.clientX,event.clientY)===this.canvas;
    this.cancel();if(!inside)return true;
    if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>6) {
      const ids=this.callbacks.pawns().filter(p=>p.x>=Math.min(drag.x,event.clientX)&&p.x<=Math.max(drag.x,event.clientX)&&p.y>=Math.min(drag.y,event.clientY)&&p.y<=Math.max(drag.y,event.clientY)).map(p=>p.id);
      this.callbacks.select({ids,additive:drag.shift,toggle:false});
    } else {
      const hits=this.hits(event.clientX,event.clientY),selected=this.callbacks.selected();
      // Cycle overlapping pawns and the floor object on ordinary clicks. Shift
      // still toggles a pawn; double-click still selects the visible group.
      const current=drag.shift?-1:hits.findIndex(p=>selected.has(p.id));
      const next=current+1,inspect=next===hits.length&&this.callbacks.canInspect(event);
      const pawn=inspect?undefined:hits[next%hits.length];
      if(pawn)this.callbacks.select({ids:[pawn.id],additive:drag.shift,toggle:drag.shift});
      else if(!drag.shift)this.callbacks.inspect(event);
    }
    return true;
  }
  private hits(x:number,y:number):ScreenPawn[] {
    return this.callbacks.pawns().filter(p=>Math.hypot(x-p.x,y-p.y)<=p.radius).sort((a,b)=>a.depth-b.depth||a.id-b.id);
  }
  private doubleClick=(event:MouseEvent):void=>{
    if(!this.callbacks.enabled()||event.button!==0||!this.hits(event.clientX,event.clientY).length)return;
    this.callbacks.select({ids:this.callbacks.pawns().map(p=>p.id),additive:event.shiftKey,toggle:false});
    event.preventDefault();
  };
  cancel():boolean {
    const drag=this.drag;this.drag=null;this.box.hidden=true;
    if(drag){this.callbacks.lock(false);if(this.canvas.hasPointerCapture(drag.id))this.canvas.releasePointerCapture(drag.id);}
    return !!drag;
  }
  dispose():void {this.cancel();this.canvas.removeEventListener('dblclick',this.doubleClick);this.box.remove();}
}
