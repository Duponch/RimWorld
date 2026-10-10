import * as THREE from 'three/webgpu';
import {SceneRenderCore} from './SceneRenderCore';
import {createDomPort} from './DomScenePort';
import type {RendererLifetime} from './scene-render-ports';
import {ReentrantRenderer} from './ReentrantRenderer';
import {MapLabelsOverlay} from './MapLabelsOverlay';
import {PawnSelectionInput,hitActors} from './PawnSelectionInput';
import {isAreaAction} from '../sim/designation';
import {isLineBuildKind} from '../sim/construction-line';
import {STRUCTURE_DEFINITIONS} from '../sim/definitions';
import {mapObjectsAt,sameMapObject} from '../ui/map-object-selection';
import type {AreaAction,Cell} from '../sim/types';
export class ColonyRenderer extends SceneRenderCore {
  private readonly selectionInput:PawnSelectionInput;
  private areaPointer: { x:number; y:number } | undefined;
  private readonly resizeObserver:ResizeObserver;
  protected readonly mapLabels:MapLabelsOverlay;
  static async create(host: HTMLElement, onPick: (x: number, z: number) => void, groundGrassEnabled = true): Promise<ColonyRenderer> {
    const renderer = new ReentrantRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    const lifetime: RendererLifetime = { closed: false };
    let view: ColonyRenderer | undefined;
    try {
      await renderer.init();
      view = new this(host, onPick, renderer, groundGrassEnabled, lifetime);
      if (view.fatalError) throw new Error(view.fatalError);
      const ready = view;
      renderer.setAnimationLoop((time) => {
        try { ready.frame(time); } catch (error) { ready.reportFailure(error instanceof Error ? error.message : String(error)); }
      });
      return view;
    } catch (error) {
      try { if (view) view.dispose(); else if (!lifetime.closed) { renderer.setAnimationLoop(null); lifetime.closed = true; await renderer.dispose(); renderer.domElement.remove(); } }
      catch { /* Preserve the initialization failure even if teardown fails. */ }
      throw error;
    }
  }

  protected constructor(private readonly host:HTMLElement,private readonly onPick:(x:number,z:number)=>void,
    renderer:THREE.WebGPURenderer,grassEnabled:boolean,lifetime:RendererLifetime){
    const dom=createDomPort(host,renderer);
    super(renderer,grassEnabled,lifetime,dom.port);
    dom.bind(this);this.mapLabels=dom.labels();
    try {    this.selectionInput=new PawnSelectionInput(this.renderer.domElement,{
      enabled:()=>this.tool==='select'&&!document.querySelector('dialog[open]'),
      pawns:()=>this.screenPawns(),select:gesture=>this.onSelection(gesture),
      selected:()=>this.selectedPawns,
      canInspect:event=>{
        const c=this.pick(event),w=this.world;if(!c||!w)return false;
        return mapObjectsAt(w,c).length>0;
      },
      preferObjectCycle:event=>{
        const cell=this.pick(event),world=this.world,selected=this.selectedObject;
        if(!cell||!world||!selected)return false;
        const objects=mapObjectsAt(world,cell),index=objects.findIndex(object=>sameMapObject(object,selected));
        return index>=0&&(index<objects.length-1||hitActors(this.screenPawns(),event.clientX,event.clientY).length===0);
      },
      inspect:event=>{const cell=this.pick(event);if(cell)this.onPick(cell.x,cell.z);else this.onSelection({ids:[],additive:false,toggle:false});},
      lock:locked=>{this.controls.enabled=!locked;this.keys.clear();},
    });
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown, true);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.addEventListener('pointerleave', this.onPointerLeave);
    this.renderer.domElement.addEventListener('pointercancel', this.onPointerCancel);
    this.renderer.domElement.addEventListener('lostpointercapture', this.onPointerCancel);
    this.renderer.domElement.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('keydown', this.onKeyDown);
    // Menus stop bubbling keyboard events; release keys held before opening one.
    window.addEventListener('keyup', this.onKeyUp, true);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
    this.resize();
    }catch(error){try{this.dispose();}catch{}throw error;}
  }
  private pick(event:PointerEvent,clamp=false):Cell|null{return this.pickAt(event.clientX,event.clientY,clamp);}
  private readonly onVisibility=():void=>this.visibilityChanged();
  /** DOM methods are consumed only by the owned port; no guard writer here. */
  selectionReady():boolean{return !!this.selectionInput;}
  selectionActive():boolean{return !!this.selectionInput?.active;}
  cancelSelection():boolean{return this.selectionInput?.cancel()??false;}
  disposeSelection():void{this.selectionInput?.dispose();}
  disconnectResize():void{this.resizeObserver?.disconnect();}
  removeInputListeners():void{
    const canvas=this.renderer.domElement;
    canvas.removeEventListener('pointerdown',this.onPointerDown,true);
    canvas.removeEventListener('pointerup',this.onPointerUp);
    canvas.removeEventListener('pointermove',this.onPointerMove);
    canvas.removeEventListener('pointerleave',this.onPointerLeave);
    canvas.removeEventListener('pointercancel',this.onPointerCancel);
    canvas.removeEventListener('lostpointercapture',this.onPointerCancel);
    canvas.removeEventListener('contextmenu',this.onContextMenu);
    window.removeEventListener('keydown',this.onKeyDown);
    window.removeEventListener('keyup',this.onKeyUp,true);
    window.removeEventListener('blur',this.onBlur);
    document.removeEventListener('visibilitychange',this.onVisibility);
  }
  private onPointerDown = (event: PointerEvent): void => {
    this.onInteractionCancel();
    this.renderer.domElement.focus({preventScroll:true});
    if(this.selectionInput.down(event))return;
    if (this.areaDrag) {
      if (event.button === 2) this.cancelDesignation();
      event.stopImmediatePropagation(); event.preventDefault(); return;
    }
    if (event.button === 2 && this.tool !== 'select') {
      event.stopImmediatePropagation(); event.preventDefault();
      this.cancelDesignation(); this.onExitOrder(); return;
    }
    this.pointerDown = { x: event.clientX, y: event.clientY, button: event.button, pointerId: event.pointerId };
    this.renderer.domElement.focus({ preventScroll: true });
    const from = this.pick(event);
    if (event.button === 0 && event.isPrimary && from && (isAreaAction(this.tool) || isLineBuildKind(this.tool))) {
      event.stopImmediatePropagation(); event.preventDefault();
      this.areaDrag = isLineBuildKind(this.tool)
        ? { pointerId: event.pointerId, kind: this.tool, from, material: this.constructionMaterial }
        : { pointerId: event.pointerId, action: this.tool as AreaAction, from };
      // The initial press never reaches OrbitControls. Keep its wheel handler
      // available; subsequent pointer presses are consumed by the drag branch.
      this.controls.enabled = true; this.keys.clear();
      this.areaPointer = { x:event.clientX, y:event.clientY };
      this.renderer.domElement.setPointerCapture(event.pointerId);
      this.hoverCell = from; this.areaSignature = ''; this.updateHover();
    }
  };
  private onPointerUp = (event: PointerEvent): void => {
    if(this.selectionInput.up(event))return;
    const drag = this.areaDrag;
    if (drag) {
      if (event.pointerId !== drag.pointerId || event.button !== 0) return;
      const to = this.pointerOnCanvas(event) ? this.pick(event, true) : null;
      this.cancelDesignation();
      if (to) {
        if ('action' in drag) this.onArea(drag.action, drag.from, to);
        else this.onBuildLine(drag.kind, drag.from, to, drag.material);
      }
      return;
    }
    const down = this.pointerDown; this.pointerDown = null;
    if(down&&down.button===2&&event.button===2&&down.pointerId===event.pointerId&&this.tool==='select'&&Math.hypot(down.x-event.clientX,down.y-event.clientY)<=6) {
      const cell=this.pick(event);if(cell)this.onContext(cell,event.clientX,event.clientY,event.shiftKey,hitActors(this.screenPawns(),event.clientX,event.clientY)[0]?.id);return;
    }
    if (!down || down.pointerId !== event.pointerId || down.button !== 0 || event.button !== 0 || Math.hypot(down.x - event.clientX, down.y - event.clientY) > 6) return;
    const cell = this.pick(event);
    if (!cell) return;
    this.onPick(cell.x, cell.z);
  };
  private onPointerMove = (event: PointerEvent): void => {
    if(this.selectionInput.move(event))return;
    if (this.areaDrag && event.pointerId !== this.areaDrag.pointerId) return;
    if (this.areaDrag) this.areaPointer = { x:event.clientX, y:event.clientY };
    // A second mouse button changes `buttons` through pointermove, without a new pointerdown.
    if (this.areaDrag && (event.buttons & 2)) { event.preventDefault(); this.cancelDesignation(); return; }
    const previous=this.hoverCell;
    this.hoverCell = this.pointerOnCanvas(event) ? this.pick(event, !!this.areaDrag) : null;
    if(previous?.x!==this.hoverCell?.x||previous?.z!==this.hoverCell?.z)this.onHover(this.hoverCell);
    this.updateHover();
  };
  protected refreshAreaPointer():void {
    if (!this.areaDrag || !this.areaPointer) return;
    const {x,y}=this.areaPointer;
    const next=document.elementFromPoint(x,y)===this.renderer.domElement?this.pickAt(x,y,true):null;
    if (next?.x===this.hoverCell?.x && next?.z===this.hoverCell?.z) return;
    this.hoverCell=next; this.onHover(next); this.updateHover();
  }
  private pointerOnCanvas(event: PointerEvent): boolean {
    return document.elementFromPoint(event.clientX, event.clientY) === this.renderer.domElement;
  }
  private onPointerLeave = (): void => {
    if(!this.preparing)this.recreationHints.group.visible=false;
    if(!this.preparing)this.constructionPreview.hide();
    this.hoverCell = null; if(!this.preparing)this.hover.visible = false;
    this.onHover(null);
    if (this.areaDrag) this.updateAreaPreview(); else this.pointerDown = null;
  };
  private onPointerCancel = (event: PointerEvent): void => {
    if(this.selectionInput.active){this.selectionInput.cancel();return;}
    if (this.areaDrag?.pointerId === event.pointerId) this.cancelDesignation();
    else if (this.pointerDown?.pointerId === event.pointerId) this.pointerDown = null;
  };
  private onContextMenu = (event: Event): void => { event.preventDefault(); };
  private onKeyDown = (event: KeyboardEvent): void => {
    if (this.host.closest('[inert]')) { this.keys.clear(); return; }
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]')) return;
    if (event.target instanceof HTMLElement && (event.target.matches('input, textarea, select') || event.target.isContentEditable)) return;
    const key = event.key.toLowerCase();
    // Q/E rotate a bed in Architecte. Outside placement, Q retains AZERTY pan.
    if ((this.tool === 'install' || this.tool in STRUCTURE_DEFINITIONS) && (key === 'q' || key === 'e')) return;
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'q', 'a', 'd', 'z', 'w', 's'].includes(key)) {
      this.keys.add(key); if (key.startsWith('arrow')) event.preventDefault();
    }
  };
  private onKeyUp = (event: KeyboardEvent): void => { this.keys.delete(event.key.toLowerCase()); };
  private onBlur = (): void => { this.keys.clear(); this.cancelDesignation(); };


}

export type {AudioFrameView} from './SceneRenderCore';
