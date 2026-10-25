import * as THREE from 'three/webgpu';
import {PrototypeCardboardArt,MANAGEMENT_BUTTONS,PALETTE,drawHandRect,drawMarkerLine,type CardboardPiece,type CardboardDraw,type CardboardPieceOptions} from './prototype-art';
import type {NativeControl,NativePage,NativeRow} from './native-contract';
import {NativeGlobe} from './NativeGlobe';
import {NativeOverlayCache} from './NativeOverlayCache';

const HUD_DISTANCE=7.5;
const PANEL_IDS=['architect','work','schedule','assign','animals','wildlife','research','quests','world','history','factions','menu'] as const;
type NativePanelId=typeof PANEL_IDS[number];
type Hit={piece:CardboardPiece;control?:NativeControl;input?:NonNullable<NativeRow['input']>};
type PagePiece={piece:CardboardPiece;hit:Hit;geometry:string;paint:string};
export interface NativeStageOptions {
  onPanel:(panel:NativePanelId)=>void;
  onEscape:()=>void;
  onError:(message:string)=>void;
  onGesture?:()=>void;
  onActivate?:(id:string)=>void;
  onCancelWorldInteraction?:()=>void;
}

/** Camera-fixed native scene. Browser DOM is only the graphics surface and the
 * optional OS text-composition endpoint; it supplies no UI layout or hit areas. */
export class NativeStage {
  readonly art=new PrototypeCardboardArt();
  readonly scene=new THREE.Scene();
  readonly camera=new THREE.PerspectiveCamera(34,innerWidth/innerHeight,.1,220);
  readonly hudRoot=new THREE.Group();
  readonly anchors={topLeft:new THREE.Group(),topCenter:new THREE.Group(),topRight:new THREE.Group(),
    bottomLeft:new THREE.Group(),bottomCenter:new THREE.Group(),bottomRight:new THREE.Group(),drawerAnchor:new THREE.Group()};
  readonly ready:Promise<void>;
  private readonly ownRenderer=new THREE.WebGPURenderer({alpha:false,antialias:true,powerPreference:'high-performance'});
  private readonly raycaster=new THREE.Raycaster();
  private readonly pointer=new THREE.Vector2();
  private readonly management:CardboardPiece[]=[];
  private readonly pageGroup=new THREE.Group();
  private readonly pagePieces:CardboardPiece[]=[];
  private readonly retainedPagePieces=new Map<string,PagePiece>();
  private pagePieceIds=new Set<string>();
  private readonly hits=new Map<THREE.Mesh,Hit>();
  private readonly moving=new Set<CardboardPiece>();
  private readonly disposers:Array<()=>void>=[];
  private page:NativePage|null=null;
  private pageBackdrop:CardboardPiece|undefined;
  private hovered:CardboardPiece|null=null;
  private down:{piece:CardboardPiece;pointerId:number;x:number;y:number}|null=null;
  private worldPress:{pointerId:number;button:number}|undefined;
  private focusIndex=-1;
  private pageControls:Hit[]=[];
  private scroll=0;
  private maxScroll=0;
  private pageSignature='';
  private lastTime=0;
  private frameId=0;
  private closed=false;
  private initialized=false;
  private worldVisible=false;
  private standalone=true;
  private frontVisible=true;
  private width=0;
  private height=0;
  private visW=1;
  private visH=1;
  private uiScale=1;
  private editor:HTMLTextAreaElement|undefined;
  private editing:Hit|undefined;
  private editingValue='';
  private editRepaint:(()=>void)|undefined;
  private editingPaintDirty=false;
  private editorCommit:Promise<boolean>|undefined;
  private editorCommitPageId:string|undefined;
  private activationSerial=0;
  private textFontFamily='"Comic Sans MS", Georgia, serif';
  private textFontRevision=0;
  private fontRequest=0;
  private notice:CardboardPiece|undefined;
  private noticeTimer:ReturnType<typeof setTimeout>|undefined;
  private globe:NativeGlobe|undefined;
  private globeDrag:{pointerId:number;x:number;y:number;startX:number;startY:number}|undefined;
  private readonly selectionBox=new THREE.Group();
  private readonly selectionFill=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:0xf8e5ad,transparent:true,opacity:.09,depthTest:false,depthWrite:false}));
  private readonly selectionOutline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1,1)),new THREE.LineBasicMaterial({color:0xf8e5ad,transparent:true,opacity:.9,depthTest:false,depthWrite:false}));
  private readonly portraitImages=new Map<string,HTMLImageElement>();
  private hintOwner:CardboardPiece|null=null;
  private hintTimer:ReturnType<typeof setTimeout>|undefined;
  private hintPiece:CardboardPiece|undefined;
  private worldReadout:CardboardPiece|undefined;
  private worldReadoutLines:readonly string[]=[];
  private worldReadoutGeometry='';
  private worldReadoutInk='';
  private pointerOverUi=true;
  private readonly overlayCache=new NativeOverlayCache();
  private readonly reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  private sceneRevision=0;
  private cacheRevision=0;
  private lastArtRevision=-1;
  private lastSceneRevision=-1;
  private readonly cacheEnabled=!(import.meta.env.DEV&&new URLSearchParams(location.search).get('ui-cache')==='off');
  private readonly stats={renders:0,overlayRenders:0,rebuilds:0,raycasts:0,activeAnimations:0,uiObjects:0,drawCalls:0,renderMs:0,backend:'',error:null as string|null};
  constructor(private readonly options:NativeStageOptions){
    this.hudRoot.position.set(0,0,-HUD_DISTANCE);this.camera.add(this.hudRoot);this.scene.add(this.camera);
    Object.values(this.anchors).forEach(group=>this.hudRoot.add(group));
    this.selectionBox.add(this.selectionFill,this.selectionOutline);this.selectionBox.visible=false;this.selectionBox.position.z=.5;this.hudRoot.add(this.selectionBox);
    this.anchors.drawerAnchor.add(this.pageGroup);
    // The reference's three lights, with the world key expressed in HUD-camera
    // space. They light actual cream edges and matte painted mesh fronts.
    this.scene.add(new THREE.AmbientLight(0xfff5e4,1.45));
    const sun=new THREE.DirectionalLight(0xfff2d6,1.9);sun.position.set(18,28,22);this.scene.add(sun);
    const key=new THREE.DirectionalLight(0xfffaf0,.85);key.position.set(-3,5,4);this.camera.add(key);
    this.anchors.bottomCenter.add(this.art.createBottomShelf());
    this.anchors.bottomCenter.visible=false;
    MANAGEMENT_BUTTONS.forEach((config,index)=>{
      const piece=this.art.createManagementButton(index,config,()=>this.options.onPanel(PANEL_IDS[index]!));
      piece.userData.nativeId=`tab:${PANEL_IDS[index]}`;
      this.management.push(piece);this.anchors.bottomCenter.add(piece);this.register(piece);
      this.setPose(piece,0);
    });
    const canvas=this.ownRenderer.domElement;
    canvas.dataset.ui3d='native';canvas.dataset.testid='native-ui-canvas';canvas.tabIndex=0;
    canvas.setAttribute('aria-label','Interface 3D Elsewhere');
    canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;display:block;z-index:40;outline:none;touch-action:none';
    this.ownRenderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
    this.ownRenderer.setClearColor(0xd8cbb8,1);document.body.append(canvas);
    this.listen(window,'resize',()=>{this.resize();this.rebuildPage(true);this.invalidate();});
    this.listen(document,'pointermove',event=>this.pointerMove(event as PointerEvent),true);
    this.listen(document,'pointerdown',event=>this.pointerDown(event as PointerEvent),true);
    this.listen(document,'pointerup',event=>this.pointerUp(event as PointerEvent),true);
    this.listen(document,'pointercancel',()=>this.cancelPress(),true);
    this.listen(window,'blur',()=>{this.cancelPress();this.hover(null);});
    this.listen(document,'keydown',event=>this.keyDown(event as KeyboardEvent),true);
    this.listen(document,'wheel',event=>this.wheel(event as WheelEvent),{capture:true,passive:false});
    this.listen(document,'contextmenu',event=>{const mouse=event as MouseEvent;if(this.frontVisible||this.page?.modal||this.hit(mouse.clientX,mouse.clientY))this.swallow(event);},true);
    this.listen(document,'visibilitychange',()=>{if(document.hidden){this.cancelPress();this.hover(null);}else this.invalidate();});
    this.resize();this.ready=this.ownRenderer.init().then(()=>{
      if(this.closed)return;this.initialized=true;this.stats.backend=this.ownRenderer.getContext() instanceof WebGL2RenderingContext?'WebGL 2':'WebGPU';this.invalidate();
    }).catch(error=>{this.stats.error=String(error);this.options.onError(String(error));});
  }
  private listen(target:EventTarget,name:string,listener:EventListener,options?:boolean|AddEventListenerOptions):void{
    target.addEventListener(name,listener,options);this.disposers.push(()=>target.removeEventListener(name,listener,options));
  }
  diagnostics(){
    this.scene.updateMatrixWorld(true);
    return {...this.stats,cache:this.overlayCache.stats,activeAnimations:this.moving.size,uiObjects:this.art.interactiveMeshes.length,
      mode:'native-meshes',page:this.page?.id??null,scroll:this.scroll,front:this.frontVisible,globe:this.globeDiagnostics(),
      management:this.management.map((piece,index)=>{
        const center=piece.getWorldPosition(new THREE.Vector3()).project(this.camera);
        return {id:PANEL_IDS[index],x:(center.x+1)*this.width/2,y:(1-center.y)*this.height/2,
          width:piece.userData.w,height:piece.userData.h,seed:piece.userData.seed,
          position:piece.position.toArray(),rotation:piece.rotation.toArray(),active:piece.userData.active};
      }),controls:this.pageControls.map(hit=>{
        const point=hit.piece.getWorldPosition(new THREE.Vector3()).project(this.camera);
        return {id:hit.control?.id??hit.piece.userData.nativeId,label:hit.control?.label,disabled:!!hit.control?.disabled,active:!!hit.control?.active,
          x:(point.x+1)*this.width/2,y:(1-point.y)*this.height/2};
      }),targets:this.art.interactiveMeshes.filter(mesh=>{for(let node:THREE.Object3D|null=mesh;node;node=node.parent)if(!node.visible)return false;return true;}).map(mesh=>{
        const piece=mesh.userData.widgetGroup as CardboardPiece|undefined,point=mesh.getWorldPosition(new THREE.Vector3()).project(this.camera);
        return {seed:piece?.userData.seed,nativeId:piece?.userData.nativeId??null,tooltip:piece?.userData.tooltip??'',x:(point.x+1)*this.width/2,y:(1-point.y)*this.height/2};
      })};
  }
  private globeDiagnostics(){
    if(!this.globe)return undefined;
    const body=this.globe.getObjectByName('Native globe surface frame')??this.globe;
    const worldCenter=body.getWorldPosition(new THREE.Vector3()),worldScale=body.getWorldScale(new THREE.Vector3());
    const radius=Math.max(Math.abs(worldScale.x),Math.abs(worldScale.y),Math.abs(worldScale.z));
    const right=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0).normalize();
    const edge=worldCenter.clone().addScaledVector(right,radius).project(this.camera),center=worldCenter.project(this.camera);
    let visible=true;for(let object:THREE.Object3D|null=body;object;object=object.parent)if(!object.visible){visible=false;break;}
    return {visible,center:{x:(center.x+1)*this.width/2,y:(1-center.y)*this.height/2},radiusPixels:Math.hypot((edge.x-center.x)*this.width/2,(edge.y-center.y)*this.height/2),
      rotation:[body.rotation.x,body.rotation.y,body.rotation.z],scale:worldScale.toArray(),selected:this.page?.visual?.selected??null};
  }
  setWorldVisible(visible:boolean):void{
    if(this.worldVisible===visible)return;this.sceneRevision++;
    this.worldVisible=visible;this.standalone=!visible;
    this.ownRenderer.domElement.style.display=this.frontVisible||this.standalone?'block':'none';
    this.anchors.bottomCenter.visible=!this.frontVisible;this.updateWorldReadoutVisibility();this.invalidate();
  }
  setFrontVisible(visible:boolean):void{
    if(this.frontVisible===visible)return;this.sceneRevision++;
    this.frontVisible=visible;this.ownRenderer.domElement.style.display=visible||this.standalone?'block':'none';
    this.anchors.bottomCenter.visible=!visible;this.resize();this.rebuildPage(true);this.updateWorldReadoutVisibility();this.invalidate();
  }
  setPanel(id:string|null):void{
    this.management.forEach((piece,index)=>{const active=PANEL_IDS[index]===id;if(piece.userData.active!==active){piece.setActive(active);this.moving.add(piece);}});this.invalidate();
  }
  showPage(page:NativePage|null):void{
    if(this.closed)return;
    const same=page?.id===this.page?.id,ownerChanged=page?.visual?.surface!==this.page?.visual?.surface||page?.visual?.roads!==this.page?.visual?.roads;
    this.page=page;if(!same)this.scroll=0;
    this.rebuildPage(ownerChanged);this.updateWorldReadoutVisibility();this.invalidate();
  }
  /** The font service supplies glyphs only; mesh sizes and input remain native. */
  setTextFont(family:string):void{
    const name=family.trim();if(!name||/[\r\n\0]/.test(name))return;
    const chosen=`${JSON.stringify(name)}, "Segoe UI", sans-serif`;
    if(chosen===this.textFontFamily)return;
    this.textFontFamily=chosen;const request=++this.fontRequest;
    const repaint=()=>{if(this.closed||request!==this.fontRequest)return;this.textFontRevision++;this.rebuildPage(true);this.notice?.redraw();this.hintPiece?.redraw();this.refreshWorldReadout();this.editRepaint?.();this.invalidate();};
    repaint();
    const fonts=document.fonts;if(!fonts)return;
    const regular=`400 20px ${JSON.stringify(name)}`,bold=`700 20px ${JSON.stringify(name)}`;
    if(!fonts.check(regular)||!fonts.check(bold))void Promise.all([fonts.load(regular,'Éléonore, cœur, œuf, ça, où, Noël.'),fonts.load(bold,'Éléonore, cœur, œuf, ça, où, Noël.')]).then(repaint).catch(()=>{});
  }
  private font(size:number,bold=false):string{return `${bold?'bold ':''}${size}px ${this.textFontFamily}`;}
  setWorldReadout(lines:readonly string[]|null):void{
    const next=lines?.filter(line=>line.trim().length)??[];
    if(JSON.stringify(next)!==JSON.stringify(this.worldReadoutLines)){this.worldReadoutLines=[...next];this.refreshWorldReadout();}
    this.updateWorldReadoutVisibility();
  }
  private refreshWorldReadout():void{
    if(!this.worldReadoutLines.length)return;
    const availableW=this.visW/this.uiScale,availableH=this.visH/this.uiScale;
    const w=Math.max(.5,Math.min(3.4,availableW-.3)),h=Math.max(.45,Math.min(2.6,availableH-1.1));
    const geometry=`${w}|${h}`,ink=JSON.stringify([this.worldReadoutLines,this.textFontRevision]);
    if(this.worldReadout&&this.worldReadoutGeometry===geometry&&this.worldReadoutInk===ink)return;
    const lines=[...this.worldReadoutLines];
    const draw:CardboardDraw=(ctx,wp,hp)=>{
      ctx.fillStyle=PALETTE.inkDark;ctx.textAlign='left';ctx.font=this.font(20);
      ctx.save();ctx.beginPath();ctx.rect(wp*.065,hp*.065,wp*.87,hp*.87);ctx.clip();
      let y=hp*.065+21,remaining=Math.max(1,Math.floor((hp*.87-21)/24));
      for(const line of lines){const used=this.wrap(ctx,line,wp*.065,y,wp*.87,24,remaining);y+=used*24;remaining-=used;if(remaining<=0)break;}
      ctx.restore();
    };
    if(!this.worldReadout||this.worldReadoutGeometry!==geometry){
      if(this.worldReadout)this.art.disposePiece(this.worldReadout);
      this.worldReadout=this.art.createPiece({w,h,depth:.035,bgColor:PALETTE.creamPaper,seed:3751,drawFn:draw});
      this.worldReadout.userData.nativeId='world-readout';this.worldReadout.userData.nativeStatic=true;
      this.worldReadout.setBaseTransform(w/2+.08,.88+h/2,.10);this.anchors.bottomLeft.add(this.worldReadout);
    }else this.worldReadout.redraw(draw);
    this.worldReadoutGeometry=geometry;this.worldReadoutInk=ink;this.updateWorldReadoutVisibility();this.invalidate();
  }
  private updateWorldReadoutVisibility():void{
    if(!this.worldReadout)return;
    const visible=this.worldVisible&&!this.frontVisible&&!this.pointerOverUi&&!this.page?.modal&&this.worldReadoutLines.length>0;
    if(this.worldReadout.visible!==visible){this.worldReadout.visible=visible;this.sceneRevision++;this.invalidate();}
  }
  private setPointerOverUi(over:boolean):void{if(this.pointerOverUi!==over){this.pointerOverUi=over;this.updateWorldReadoutVisibility();}}
  showNotice(message:string,error=false):void{
    clearTimeout(this.noticeTimer);if(this.notice)this.unregister(this.notice);
    const w=Math.min(4.6,this.visW/this.uiScale-.4),h=Math.min(1.0,.24+Math.ceil(message.length/(w*28))*.075);
    const piece=this.art.createPiece({w,h,seed:1881,bgColor:error?'#e2b59a':PALETTE.creamPaper,depth:.035,
      drawFn:(ctx,wp,hp)=>{ctx.fillStyle=PALETTE.inkDark;ctx.font=this.font(17);ctx.textAlign='left';this.wrap(ctx,message,wp*.065,hp*.06+18,wp*.87,21,Math.floor((hp*.88-18)/21));}});
    piece.setBaseTransform(0,-1.0,.35);this.anchors.topCenter.add(piece);this.notice=piece;this.invalidate();
    this.noticeTimer=setTimeout(()=>{if(this.notice===piece){this.unregister(piece);this.notice=undefined;this.invalidate();}},error?8000:4000);
  }
  setSelectionRectangle(bounds:{left:number;top:number;width:number;height:number}|null):void{
    this.sceneRevision++;
    this.selectionBox.visible=!!bounds;
    if(bounds){const factor=1-this.selectionBox.position.z/HUD_DISTANCE;
      this.selectionBox.position.x=((bounds.left+bounds.width/2)/this.width-.5)*this.visW*factor;
      this.selectionBox.position.y=(.5-(bounds.top+bounds.height/2)/this.height)*this.visH*factor;
      this.selectionBox.scale.set(bounds.width/this.width*this.visW*factor,bounds.height/this.height*this.visH*factor,1);}
    this.invalidate();
  }
  private resize():void{
    this.sceneRevision++;
    this.width=innerWidth;this.height=innerHeight;
    this.camera.aspect=this.width/this.height;this.camera.updateProjectionMatrix();
    this.ownRenderer.setSize(this.width,this.height,false);
    this.visH=2*Math.tan(THREE.MathUtils.degToRad(this.camera.fov)/2)*HUD_DISTANCE;this.visW=this.visH*this.camera.aspect;
    this.uiScale=THREE.MathUtils.clamp(this.visW/9.2,.52,1.05);
    const halfW=this.visW/2,halfH=this.visH/2,s=this.uiScale;
    Object.values(this.anchors).forEach(group=>group.scale.setScalar(s));
    this.anchors.topLeft.position.set(-halfW+.08*s,halfH-.08*s,0);
    this.anchors.topCenter.position.set(0,halfH-.04*s,0);
    this.anchors.topRight.position.set(halfW-.08*s,halfH-.08*s,0);
    this.anchors.bottomLeft.position.set(-halfW+.08*s,-halfH+.08*s,0);
    this.anchors.bottomCenter.position.set(0,-halfH+.04*s,0);
    this.anchors.bottomRight.position.set(halfW-.08*s,-halfH+.08*s,0);
    this.anchors.drawerAnchor.position.set(0,-halfH,0);
    this.refreshWorldReadout();
  }
  /** Called by the existing game renderer, using its device and frame loop. */
  renderOverlay(renderer:THREE.WebGPURenderer,now=performance.now()):void{
    if(this.closed||this.frontVisible||!this.worldVisible)return;
    const animated=this.moving.size>0;
    this.animate(now);
    if(this.cacheEnabled){
      if(this.lastArtRevision!==this.art.revision||this.lastSceneRevision!==this.sceneRevision){
        this.lastArtRevision=this.art.revision;this.lastSceneRevision=this.sceneRevision;this.cacheRevision++;
      }
      const start=performance.now();this.overlayCache.draw(renderer,this.scene,this.camera,this.cacheRevision,animated);
      this.stats.renderMs=performance.now()-start;this.stats.overlayRenders++;return;
    }
    const auto=renderer.autoClear,target=renderer.getRenderTarget();renderer.autoClear=false;
    try{renderer.clearDepth();const start=performance.now();renderer.render(this.scene,this.camera);this.stats.renderMs=performance.now()-start;this.stats.overlayRenders++;}
    finally{renderer.autoClear=auto;renderer.setRenderTarget(target);}
  }
  invalidate():void{
    if(this.closed||!this.initialized||!this.frontVisible&&!this.standalone||this.frameId||document.hidden)return;
    this.frameId=requestAnimationFrame(now=>{this.frameId=0;if(this.closed)return;this.animate(now);
      const start=performance.now();this.ownRenderer.render(this.scene,this.camera);this.stats.renderMs=performance.now()-start;
      this.stats.renders++;this.stats.drawCalls=this.ownRenderer.info.render.calls;
      if(this.moving.size)this.invalidate();});
  }
  private animate(now:number):void{
    const dt=this.lastTime?Math.min(.05,(now-this.lastTime)/1000):1/60;this.lastTime=now;
    const reduced=this.reducedMotion.matches;
    for(const piece of this.moving){
      const ud=piece.userData;ud.hoverVal=reduced?ud.hoverTarget:ud.hoverVal+(ud.hoverTarget-ud.hoverVal)*14*dt;
      ud.pressVal=reduced?0:Math.max(0,ud.pressVal-5.5*dt);
      if(Math.abs(ud.hoverTarget-ud.hoverVal)<.001)ud.hoverVal=ud.hoverTarget;
      this.setPose(piece,ud.hoverVal);
      if(ud.hoverVal===ud.hoverTarget&&ud.pressVal===0)this.moving.delete(piece);
    }
  }
  private setPose(piece:CardboardPiece,hover:number):void{
    const ud=piece.userData,activeLift=ud.active?.065:0,hoverLift=hover*.085,toolbar=String(ud.nativeId??'').startsWith('tab:'),pressPush=ud.pressVal*(toolbar?.05:Math.min(.05,ud.depth*.5));
    const x=ud.basePos.x,y=ud.basePos.y+(ud.active?.045:0)+hover*.03,z=ud.basePos.z+activeLift+hoverLift-pressPush;
    const rx=-hover*.14+(ud.active?-.1:0),ry=hover*.12,rz=ud.baseRot.z+hover*.035;
    const offset=.022+(activeLift+hoverLift)*.35,sy=-offset*1.15,sz=-.012-(activeLift+hoverLift)*.6;
    if(piece.position.x===x&&piece.position.y===y&&piece.position.z===z&&piece.rotation.x===rx&&piece.rotation.y===ry&&piece.rotation.z===rz&&ud.shadowMesh.position.x===offset&&ud.shadowMesh.position.y===sy&&ud.shadowMesh.position.z===sz)return;
    piece.position.set(x,y,z);piece.rotation.set(rx,ry,rz);ud.shadowMesh.position.set(offset,sy,sz);this.sceneRevision++;
  }
  private register(piece:CardboardPiece,control?:NativeControl,input?:NativeRow['input']):Hit{
    const hit:Hit={piece,control,input};
    for(const mesh of piece.userData.interactiveMeshes??[])this.hits.set(mesh,hit);
    return hit;
  }
  private unregister(piece:CardboardPiece):void{
    if(this.hintOwner===piece)this.clearHint();
    this.moving.delete(piece);if(this.hovered===piece)this.hovered=null;
    for(const mesh of piece.userData.interactiveMeshes??[])this.hits.delete(mesh);
    this.art.disposePiece(piece);
  }
  private hit(x:number,y:number):Hit|undefined{
    if(this.closed||(!this.worldVisible&&!this.frontVisible&&!this.standalone))return;
    this.pointer.set(x/this.width*2-1,1-y/this.height*2);this.scene.updateMatrixWorld(true);this.raycaster.setFromCamera(this.pointer,this.camera);this.stats.raycasts++;
    const objects=this.art.interactiveMeshes.filter(mesh=>{let object:THREE.Object3D|null=mesh;while(object){if(!object.visible)return false;object=object.parent;}return true;});
    for(const intersection of this.raycaster.intersectObjects(objects,false)){
      const mesh=intersection.object as THREE.Mesh;
      const found=this.hits.get(mesh)??(mesh.userData.widgetGroup?{piece:mesh.userData.widgetGroup as CardboardPiece}:undefined);if(!found)continue;
      if(this.page?.modal){
        // Parent membership is tested explicitly below, independent of DOM.
        let parent:THREE.Object3D|null=found.piece;while(parent&&parent!==this.pageGroup)parent=parent.parent;
        if(!parent)continue;
      }
      return found;
    }
    return;
  }
  private swallow(event:Event):void{event.preventDefault();event.stopImmediatePropagation();}
  private gesture():void{try{this.options.onGesture?.();}catch(error){this.options.onError(String(error));}}
  private hover(piece:CardboardPiece|null):void{
    if(piece?.userData.nativeStatic||piece?.userData.nativeDisabled)piece=null;
    if(piece===this.hovered)return;
    if(this.hovered){this.hovered.userData.hoverTarget=0;this.moving.add(this.hovered);}
    this.hovered=piece;if(piece){piece.userData.hoverTarget=1;this.moving.add(piece);}this.invalidate();
  }
  private pointerMove(event:PointerEvent):void{
    if(this.editor&&event.target===this.editor)return;
    if(this.worldPress?.pointerId===event.pointerId&&event.buttons!==0){this.setPointerOverUi(false);this.clearHint();this.hover(null);return;}
    if(this.globeDrag){const drag=this.globeDrag;if(drag.pointerId!==event.pointerId)return;
      this.globe?.rotate((event.clientX-drag.x)*.008,(event.clientY-drag.y)*.008);this.sceneRevision++;drag.x=event.clientX;drag.y=event.clientY;this.swallow(event);this.invalidate();return;}
    if(this.globeHit(event.clientX,event.clientY)!==null){this.setPointerOverUi(true);this.clearHint();this.hover(null);this.swallow(event);return;}
    const hit=this.hit(event.clientX,event.clientY);this.setPointerOverUi(!!hit||this.frontVisible||!!this.page?.modal);this.updateHint(hit,event.clientX,event.clientY);this.hover(hit?.piece??null);
    if(hit||this.frontVisible||this.page?.modal)this.swallow(event);
  }
  private pointerDown(event:PointerEvent):void{
    if(this.editor&&event.target===this.editor)return;
    this.clearHint();
    if(event.button===0&&this.globeHit(event.clientX,event.clientY)!==null){
      this.gesture();this.setPointerOverUi(true);this.globeDrag={pointerId:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY};this.swallow(event);return;
    }
    const hit=this.hit(event.clientX,event.clientY);
    this.setPointerOverUi(!!hit||this.frontVisible||!!this.page?.modal);
    if(hit||this.frontVisible||this.page?.modal)this.gesture();
    if(!hit){if(this.frontVisible||this.page?.modal)this.swallow(event);else this.worldPress={pointerId:event.pointerId,button:event.button};return;}
    this.swallow(event);if(event.button!==0)return;
    if(hit.piece.userData.nativeStatic)return;
    if(hit.control?.disabled)return;
    this.down={piece:hit.piece,pointerId:event.pointerId,x:event.clientX,y:event.clientY};
    hit.piece.userData.pressVal=1;this.moving.add(hit.piece);this.invalidate();
  }
  private pointerUp(event:PointerEvent):void{
    if(this.worldPress?.pointerId===event.pointerId){
      const world=this.worldPress;this.worldPress=undefined;
      if(world.button===0&&(this.hit(event.clientX,event.clientY)||this.globeHit(event.clientX,event.clientY)!==null||this.frontVisible||this.page?.modal)){
        this.options.onCancelWorldInteraction?.();this.swallow(event);
      }
      return;
    }
    if(this.globeDrag){const drag=this.globeDrag;this.globeDrag=undefined;this.swallow(event);
      if(drag.pointerId===event.pointerId&&Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<6){
        this.globeHit(event.clientX,event.clientY);this.globe?.pick(this.raycaster);this.invalidate();}return;
    }
    const down=this.down;if(!down){if(this.frontVisible||this.page?.modal)this.swallow(event);return;}
    this.down=null;this.swallow(event);const hit=this.hit(event.clientX,event.clientY);
    if(down.pointerId!==event.pointerId||hit?.piece!==down.piece||Math.hypot(event.clientX-down.x,event.clientY-down.y)>12)return;
    this.activate(hit);
  }
  private cancelPress():void{this.down=null;this.globeDrag=undefined;if(this.worldPress)this.options.onCancelWorldInteraction?.();this.worldPress=undefined;}
  private globeHit(x:number,y:number):number|null{
    if(!this.globe?.visible||!this.page?.visual)return null;
    this.pointer.set(x/this.width*2-1,1-y/this.height*2);this.scene.updateMatrixWorld(true);this.raycaster.setFromCamera(this.pointer,this.camera);
    return this.globe.hitTest(this.raycaster);
  }
  private activate(hit:Hit):void{
    if(hit.control?.disabled)return;
    if(hit.input&&this.editing===hit&&this.editor){this.editor.focus({preventScroll:true});return;}
    const serial=++this.activationSerial,id=hit.control?.id??String(hit.piece.userData.nativeId??''),pageId=this.page?.id;
    const pageBound=this.pagePieces.includes(hit.piece);
    void(async()=>{
      const pending=this.editor?this.finishEdit(true):this.editorCommitPageId===pageId?this.editorCommit:undefined;
      if(pending&&!await pending)return;
      if(this.closed||serial!==this.activationSerial||pageBound&&this.page?.id!==pageId)return;
      const live=pageBound?this.pageControls.find(current=>(current.control?.id??String(current.piece.userData.nativeId??''))===id)
        :[...this.hits.values()].find(current=>current.piece===hit.piece)??(hit.piece.parent?hit:undefined);
      if(!live||live.control?.disabled)return;
      if(live.input){this.beginEdit(live);return;}
      const action=live.control?.onActivate??live.piece.userData.onClick;
      if(action){if(id)this.options.onActivate?.(id);void Promise.resolve(action()).catch(error=>{if(!this.closed)this.options.onError(error instanceof Error?error.message:String(error));});}
    })().catch(error=>{if(!this.closed)this.options.onError(error instanceof Error?error.message:String(error));});
  }
  private keyDown(event:KeyboardEvent):void{
    if(this.editor&&event.target===this.editor)return;
    if(event.key==='Escape'){
      this.activationSerial++;
      this.swallow(event);if(this.page?.closable===false)return;
      if(!event.repeat){this.gesture();this.options.onActivate?.('page:close');}
      if(this.page?.onClose)this.page.onClose();else this.options.onEscape();return;
    }
    if(event.key==='Tab'&&(this.page||this.frontVisible)){
      if(!event.repeat)this.gesture();
      this.swallow(event);const list=this.pageControls.filter(hit=>!hit.control?.disabled);if(!list.length)return;
      if(this.focusIndex>=0&&list[this.focusIndex])this.hover(null);
      this.focusIndex=(this.focusIndex+(event.shiftKey?-1:1)+list.length)%list.length;this.hover(list[this.focusIndex]!.piece);return;
    }
    if((event.key==='Enter'||event.key===' ')&&this.focusIndex>=0&&this.page){
      const hit=this.pageControls.filter(item=>!item.control?.disabled)[this.focusIndex];if(hit){this.swallow(event);if(!event.repeat){this.gesture();this.activate(hit);}}return;
    }
    if(this.frontVisible||this.page?.modal){if(!event.repeat)this.gesture();this.swallow(event);}
  }
  private wheel(event:WheelEvent):void{
    this.clearHint();
    if(this.globeHit(event.clientX,event.clientY)!==null){this.swallow(event);this.globe?.zoom(-event.deltaY*.001);this.sceneRevision++;this.invalidate();return;}
    const hit=this.hit(event.clientX,event.clientY);
    if(hit||this.frontVisible||this.page?.modal){
      this.swallow(event);if(hit&&!this.pagePieces.includes(hit.piece))return;if(this.maxScroll<=0)return;
      const delta=event.deltaMode===1?event.deltaY*16:event.deltaMode===2?event.deltaY*this.height:event.deltaY;
      const next=THREE.MathUtils.clamp(this.scroll+delta/this.height*this.visH/this.uiScale,0,this.maxScroll);
      if(next!==this.scroll){this.scroll=next;this.rebuildPage(true);this.invalidate();}
    }
  }
  private rebuildPage(force=false):void{
    const page=this.page;
    const signature=page?JSON.stringify([page.id,page.title,page.subtitle,page.width,page.closable,page.portrait?.url,page.visual?.selected,page.visual?.markers,page.rows.map(row=>[row.id,row.label,row.value,row.detail,row.compact,row.input?.value,row.input?.placeholder,row.controls?.map(c=>[c.id,c.label,c.active,c.disabled,c.color])]),page.actions?.map(c=>[c.id,c.label,c.active,c.disabled,c.color]),this.textFontRevision,this.frontVisible,this.width,this.height,this.scroll]):'';
    if(!force&&signature===this.pageSignature){
      this.rebindPage(page);
      return;
    }
    const focused=this.pageControls.filter(hit=>!hit.control?.disabled)[this.focusIndex];
    const focusedId=focused?String(focused.piece.userData.nativeId):undefined;
    this.pageSignature=signature;this.pagePieceIds=new Set();this.pagePieces.length=0;this.pageControls=[];this.pageBackdrop=undefined;
    if(this.globe&&this.globe.visible!==!!page?.visual){this.globe.visible=!!page?.visual;this.sceneRevision++;}
    if(!page){this.retirePagePieces();this.focusIndex=-1;return;}this.stats.rebuilds++;
    const availableW=this.visW/this.uiScale-.35,availableH=this.visH/this.uiScale;
    const requestedW=page.width&&page.width>20?page.width/180:page.width??7.8;
    const w=Math.min(requestedW,availableW),h=Math.min(this.frontVisible?4.1:3.0,availableH-(this.frontVisible?.4:1.55));
    const centerY=this.frontVisible?availableH/2:.83+h/2;
    if(this.pageGroup.position.x!==0||this.pageGroup.position.y!==centerY||this.pageGroup.position.z!==.18){this.pageGroup.position.set(0,centerY,.18);this.sceneRevision++;}
    const visualW=page.visual?Math.min(3.1,w*.42):0;
    // The original UV print samples only about .037..963 of the canvas.
    // Place all generic ink and controls inside a larger printable margin.
    const margin=w*.065,topInset=h*.065;
    const rowLeft=-w/2+margin+visualW,contentW=w-2*margin-visualW,labelW=Math.min(2.1,contentW*.29);
    const heights=page.rows.map(row=>this.rowHeight(row,contentW));
    const headerH=topInset+(page.portrait?.72:.48),footerH=topInset+(page.actions?.length?.42:.10);
    const bodyH=Math.max(.3,h-headerH-footerH);
    this.maxScroll=Math.max(0,heights.reduce((sum,height)=>sum+height,0)-bodyH);this.scroll=Math.min(this.scroll,this.maxScroll);
    const visible:Array<{row:NativeRow;y:number;height:number}>=[];let offset=0;
    page.rows.forEach((row,index)=>{const height=heights[index]!,top=offset-this.scroll;
      if(top>=-.001&&top+height<=bodyH+.001)visible.push({row,y:h/2-headerH-top-height/2,height});offset+=height;});
    const inkSignature=JSON.stringify([page.title,page.subtitle,!!page.portrait,this.textFontRevision,rowLeft,contentW,labelW,headerH,footerH,visible.map(({row,y,height})=>[row.label,row.compact?undefined:row.value,row.detail,row.compact,!!row.controls?.length,!!row.input,y,height]),this.maxScroll>0?Math.round(this.scroll/this.maxScroll*100):null]);
    const background=this.pagePiece(`page:${page.id}`,{w,h,bgColor:PALETTE.creamPaper,seed:2003,depth:.044,interactive:true,drawFn:(ctx,wp,hp)=>{
      const px=wp/w,py=hp/h,inkLeft=margin*px,titleY=topInset*py+34;
      ctx.fillStyle=PALETTE.inkDark;ctx.textAlign='left';ctx.font=this.font(34,true);
      ctx.fillText(page.title,inkLeft,titleY,(w-2*margin-(page.portrait?.8:0))*px);
      ctx.font=this.font(20);if(page.subtitle)this.wrap(ctx,page.subtitle,inkLeft,titleY+30,(w-2*margin)*px,24,2);
      for(const {row,y,height}of visible){const cy=(h/2-y)*py,top=cy-height*py/2;
        ctx.fillStyle=PALETTE.inkDark;ctx.textAlign='left';ctx.font=this.font(22,true);
        const rowInkLeft=(rowLeft+w/2)*px,baseline=row.compact?cy+7:top+23;
        ctx.fillText(row.label,rowInkLeft,baseline,(row.controls?.length||row.input||row.value?labelW:contentW)*px);
        // Matrix cells own their entire ink area; status belongs to their
        // native tooltip rather than text underneath the physical buttons.
        if(row.value&&!row.compact){ctx.font=this.font(20);ctx.fillText(row.value,rowInkLeft+labelW*px,baseline,(contentW-labelW)*px);}
        if(row.detail){ctx.font=this.font(19);ctx.fillStyle='#665440';this.wrap(ctx,row.detail,rowInkLeft,top+49,contentW*px,23,Math.max(1,Math.floor((height*py-32)/23)));}
      }
      if(this.maxScroll>0){ctx.font=this.font(13);ctx.textAlign='right';ctx.fillStyle='#665440';ctx.fillText(`${Math.round(this.scroll/this.maxScroll*100)} % · Molette pour défiler`,wp-margin*px,hp-topInset*py);}
    }},inkSignature,0,0,0);
    background.userData.nativeStatic=true;this.pageBackdrop=background;
    if(page.closable!==false)this.control(this.closeControl(),w/2-margin-.14,h/2-topInset-.15,.27,.25,.07);
    for(const {row,y,height}of visible){
      const controls=row.controls??[];
      if(controls.length){
        const compact=row.compact??false,left=compact?rowLeft+labelW:rowLeft;
        const cw=compact?(contentW-labelW-.05)/controls.length:Math.min((contentW-.1)/controls.length,1.6);
        controls.forEach((control,index)=>this.control(this.rowControl(row,control),left+cw*(index+.5),y-(compact?0:height/2-.19),Math.max(.15,cw-.035),compact?.23:.29,.07));
      }
      if(row.input){const input=row.input;
        const inputW=contentW-labelW-.2;
        this.pagePiece(row.id,{w:inputW,h:.29,bgColor:'#fff9eb',seed:3007,depth:.025,interactive:true,
          drawFn:(ctx,wp,hp)=>{ctx.fillStyle=PALETTE.inkDark;ctx.textAlign='left';ctx.font=this.font(18);ctx.fillText(input.value||input.placeholder||'',wp*.07,hp/2+6,wp*.86);}},JSON.stringify([input.value,input.placeholder,this.textFontRevision]),rowLeft+labelW+inputW/2,y,.075,undefined,input);
      }
    }
    page.actions?.forEach((control,index,list)=>{
      const cw=Math.min(1.65,(w-2*margin)/list.length);this.control(control,(index-(list.length-1)/2)*cw,-h/2+topInset+.20,cw-.06,.32,.09);
    });
    if(page.visual){
      this.globe??=new NativeGlobe(tile=>{try{this.options.onActivate?.('world:select-tile');this.page?.visual?.onSelect(tile);}catch(error){this.options.onError(String(error));}});
      this.pageGroup.add(this.globe);this.globe.visible=true;this.globe.position.set(-w/2+visualW/2+.15,-.1,.45);
      this.globe.scale.setScalar(Math.min(visualW*.42,bodyH*.46));
      this.globe.setSurface(page.visual.surface,page.visual.roads);this.globe.setSelected(page.visual.selected);this.globe.setMarkers((page.visual.markers??[]).map(marker=>({...marker,label:marker.label??`Case ${marker.tile}`})));
      this.sceneRevision++;
    }
    if(page.portrait){
      const source=page.portrait.url;let image=this.portraitImages.get(source);
      if(!image){image=new Image();this.portraitImages.set(source,image);image.onload=()=>{if(!this.closed&&this.page?.portrait?.url===source){this.rebuildPage(true);this.invalidate();}};image.src=source;}
      if(image.complete&&image.naturalWidth){
        const portrait=image;
        this.pagePiece('page:portrait',{w:.6,h:.65,depth:.025,bgColor:PALETTE.kraftBase,seed:2081,
          drawFn:(ctx,wp,hp)=>ctx.drawImage(portrait,wp*.08,hp*.03,wp*.84,hp*.94)},source,w/2-margin-.3,h/2-topInset-.325,.07);
      }
      if(this.portraitImages.size>24)for(const [url,old]of this.portraitImages){if(url===source)continue;old.onload=null;old.onerror=null;this.portraitImages.delete(url);if(this.portraitImages.size<=16)break;}
    }
    this.retirePagePieces();
    this.focusIndex=focusedId===undefined?-1:this.pageControls.filter(hit=>!hit.control?.disabled).findIndex(hit=>String(hit.piece.userData.nativeId)===focusedId);
    if(this.editingPaintDirty){this.editingPaintDirty=false;this.editRepaint?.();}
    this.scene.updateMatrixWorld(true);
  }
  private rowHeight(row:NativeRow,width:number):number{
    if(row.compact)return .31;
    const lines=row.detail?Math.min(12,Math.max(1,Math.ceil(row.detail.length/(Math.max(1,width)*30)))):0;
    return Math.max(.31,.21+lines*.075+(row.controls?.length?.34:0)+(row.input?.3:0));
  }
  private wrap(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,width:number,lineHeight:number,maxLines=20):number{
    const words=text.split(/\s+/);let line='',lines=0;
    for(const word of words){const next=line?`${line} ${word}`:word;
      if(ctx.measureText(next).width>width&&line){ctx.fillText(line,x,y,width);y+=lineHeight;line=word;if(++lines>=maxLines)return lines;}else line=next;}
    if(line&&lines<maxLines){ctx.fillText(line,x,y,width);lines++;}return lines;
  }
  private control(control:NativeControl,x:number,y:number,w:number,h:number,z:number):void{
    const draw:CardboardDraw=(ctx,wp,hp,rng)=>{
      ctx.fillStyle=control.disabled?'#78664f':PALETTE.inkDark;ctx.textAlign='center';ctx.font=this.font(22,true);
      const words=control.label.split(/\s+/);let line='',lines:string[]=[];
      for(const word of words){const candidate=line?`${line} ${word}`:word;if(line&&ctx.measureText(candidate).width>wp*.9){lines.push(line);line=word;}else line=candidate;}
      if(line)lines.push(line);if(lines.length>2)lines=[lines[0]!,lines.slice(1).join(' ')];
      lines.forEach((text,index)=>ctx.fillText(text,wp/2,hp/2+7+(index-(lines.length-1)/2)*23,wp*.9));
      if(control.active)drawMarkerLine(ctx,wp*.14,hp*.8,wp*.86,hp*.8,PALETTE.inkDark,2,rng);
    };
    this.pagePiece(control.id,{w,h,depth:.025,bgColor:control.disabled?PALETTE.kraftLight:control.active?PALETTE.ochre:control.color??PALETTE.sageMountain,
      seed:this.seed(control.id),interactive:true,drawFn:draw},JSON.stringify([control.label,!!control.active,!!control.disabled,this.textFontRevision]),x,y,z,control);
  }
  private closeControl():NativeControl{return {id:'page:close',label:'×',onActivate:()=>{if(this.page?.onClose)this.page.onClose();else this.options.onEscape();}};}
  private rowControl(row:NativeRow,control:NativeControl):NativeControl{
    return row.compact&&row.value?{...control,hint:[row.value,control.hint??control.label].filter(Boolean).join(' · ')}:control;
  }
  private rebindPage(page:NativePage|null):void{
    if(!page)return;
    const controls=new Map<string,NativeControl>(),inputs=new Map<string,NonNullable<NativeRow['input']>>();
    for(const row of page.rows){for(const control of row.controls??[])controls.set(control.id,this.rowControl(row,control));if(row.input)inputs.set(row.id,row.input);}
    for(const control of page.actions??[])controls.set(control.id,control);
    controls.set('page:close',this.closeControl());
    for(const record of this.retainedPagePieces.values()){
      const id=String(record.piece.userData.nativeId);
      const control=controls.get(id),input=inputs.get(id);
      record.hit.control=control;record.hit.input=input;
      const hint=control?.hint??control?.label??'';
      if(this.hintOwner===record.piece&&record.piece.userData.tooltip!==hint)this.clearHint();
      record.piece.userData.tooltip=hint;record.piece.userData.nativeDisabled=!!control?.disabled;
      if(this.editing===record.hit&&input&&this.editor)this.editor.maxLength=input.maxLength??2048;
    }
  }
  private pagePiece(id:string,options:CardboardPieceOptions,ink:string,x:number,y:number,z:number,control?:NativeControl,input?:NativeRow['input']):CardboardPiece{
    this.pagePieceIds.add(id);
    const geometry=JSON.stringify([options.w,options.h,options.depth??.044,options.bevel??.026,options.seed??1,!!options.interactive]);
    const paint=JSON.stringify([options.bgColor??PALETTE.kraftBase,ink]);
    let record=this.retainedPagePieces.get(id),created=false;
    const old=record,wasEditing=!!record&&this.editing===record.hit;
    const interaction=record?{hoverTarget:record.piece.userData.hoverTarget,hoverVal:record.piece.userData.hoverVal,pressVal:record.piece.userData.pressVal,hovered:this.hovered===record.piece,moving:this.moving.has(record.piece),pressed:this.down?.piece===record.piece}:undefined;
    if(record&&record.geometry!==geometry){this.unregister(record.piece);this.retainedPagePieces.delete(id);record=undefined;}
    if(!record){
      const piece=this.art.createPiece(options);piece.userData.nativeId=id;
      record={piece,hit:this.register(piece,control,input),geometry,paint};created=true;
      this.retainedPagePieces.set(id,record);this.pageGroup.add(piece);
      if(interaction){piece.userData.hoverTarget=interaction.hoverTarget;piece.userData.hoverVal=interaction.hoverVal;piece.userData.pressVal=interaction.pressVal;if(interaction.hovered)this.hovered=piece;if(interaction.moving)this.moving.add(piece);if(interaction.pressed&&this.down)this.down.piece=piece;}
      if(wasEditing&&old){this.editing=record.hit;this.editingPaintDirty=true;}
    }
    const {piece,hit}=record;
    hit.control=control;hit.input=input;
    const hint=control?.hint??control?.label??'';
    if(this.hintOwner===piece&&piece.userData.tooltip!==hint)this.clearHint();
    piece.userData.tooltip=hint;piece.userData.nativeDisabled=!!control?.disabled;
    const editing=this.editing===hit;
    if(!created&&record.paint!==paint&&!editing)piece.redraw(options.drawFn,options.bgColor);
    if(!editing)piece.userData.drawFn=options.drawFn;
    record.paint=editing?'':paint;
    if(created||piece.userData.basePos.x!==x||piece.userData.basePos.y!==y||piece.userData.basePos.z!==z){piece.setBaseTransform(x,y,z);this.setPose(piece,piece.userData.hoverVal);}
    this.pagePieces.push(piece);if(control||input)this.pageControls.push(hit);
    return piece;
  }
  private retirePagePieces():void{
    for(const [id,record]of this.retainedPagePieces)if(!this.pagePieceIds.has(id)){
      if(this.editing===record.hit)this.finishEdit(false,false);
      this.unregister(record.piece);this.retainedPagePieces.delete(id);
    }
  }
  private seed(text:string):number{let value=17;for(const c of text)value=(Math.imul(value,31)+c.charCodeAt(0))>>>0;return value;}
  private clearHint():void{
    clearTimeout(this.hintTimer);this.hintTimer=undefined;this.hintOwner=null;
    if(this.hintPiece){this.unregister(this.hintPiece);this.hintPiece=undefined;this.invalidate();}
  }
  private updateHint(hit:Hit|undefined,x:number,y:number):void{
    const text=hit?.control?.hint??hit?.piece.userData.tooltip??'';
    if(!hit||hit.piece.userData.nativeStatic||!text){this.clearHint();return;}
    if(this.hintOwner===hit.piece)return;this.clearHint();this.hintOwner=hit.piece;
    this.hintTimer=setTimeout(()=>{
      if(this.closed||this.hintOwner!==hit.piece)return;
      const w=Math.min(3.6,this.visW/this.uiScale-.5),h=Math.min(2.6,.16+Math.ceil(text.length/(w*24))*.09),z=2,factor=1-z/HUD_DISTANCE;
      const piece=this.art.createPiece({w,h,depth:.025,seed:347,bgColor:PALETTE.creamPaper,
        drawFn:(ctx,wp,hp)=>{ctx.fillStyle=PALETTE.inkDark;ctx.textAlign='left';ctx.font=this.font(21);this.wrap(ctx,text,wp*.065,hp*.065+22,wp*.87,25,Math.floor((hp*.87-22)/25));}});
      piece.scale.setScalar(this.uiScale*factor);
      const halfW=this.visW/this.uiScale/2,halfH=this.visH/this.uiScale/2;
      const cx=THREE.MathUtils.clamp((x/this.width-.5)*this.visW/this.uiScale+w/2+.08,-halfW+w/2+.08,halfW-w/2-.08);
      const cy=THREE.MathUtils.clamp((.5-y/this.height)*this.visH/this.uiScale-h/2-.08,-halfH+h/2+.08,halfH-h/2-.08);
      piece.setBaseTransform(cx*this.uiScale*factor,cy*this.uiScale*factor,z);this.setPose(piece,0);this.hudRoot.add(piece);this.hintPiece=piece;this.invalidate();
    },450);
  }
  private beginEdit(hit:Hit):void{
    if(!hit.input)return;if(this.editing===hit&&this.editor){this.editor.focus({preventScroll:true});return;}this.finishEdit(false);this.editing=hit;this.editingValue=hit.input.value;
    // OS composition service only. Its position/size never determines a mesh,
    // visible text or pointer hit. Includes IME, Unicode selection and clipboard.
    const input=document.createElement('textarea');this.editor=input;input.value=this.editingValue;input.maxLength=hit.input.maxLength??2048;
    input.setAttribute('aria-label',hit.piece.userData.nativeId as string??'Texte');
    input.style.cssText='position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
    document.body.append(input);input.focus({preventScroll:true});input.setSelectionRange(input.value.length,input.value.length);
    const repaint=()=>{if(this.editor!==input)return;this.editingValue=input.value;const target=this.editing?.piece;if(!target)return;
      target.redraw((ctx,wp,hp)=>{ctx.font=this.font(18);ctx.textAlign='left';ctx.fillStyle=PALETTE.inkDark;
        const start=input.selectionStart,end=input.selectionEnd,offset=wp*.07,text=this.editingValue;
        const before=ctx.measureText(text.slice(0,start)).width,selected=ctx.measureText(text.slice(start,end)).width;
        const shift=Math.max(0,before-wp*.86);ctx.save();ctx.beginPath();ctx.rect(wp*.06,hp*.06,wp*.88,hp*.88);ctx.clip();
        if(end>start){ctx.fillStyle='#d9ae68';ctx.fillRect(offset+before-shift,hp/2-13,selected,25);ctx.fillStyle=PALETTE.inkDark;}
        ctx.fillText(text,offset-shift,hp/2+6);ctx.fillRect(offset+before-shift,hp/2-13,1.5,25);ctx.restore();});this.invalidate();};
    this.editRepaint=repaint;input.addEventListener('input',repaint);input.addEventListener('select',repaint);input.addEventListener('keyup',repaint);
    input.addEventListener('keydown',event=>{
      event.stopPropagation();
      if(event.key==='Tab'){
        event.preventDefault();event.stopImmediatePropagation();
        if(!event.repeat&&!event.isComposing)void this.advanceEditor(event.shiftKey?-1:1).catch(error=>{if(!this.closed)this.options.onError(String(error));});
      }else if(event.key==='Escape'){event.preventDefault();this.finishEdit(false);}
      else if(event.key==='Enter'&&!event.isComposing){event.preventDefault();this.finishEdit(true);}
    });
    input.addEventListener('blur',()=>this.finishEdit(true),{once:true});repaint();
  }
  private async advanceEditor(direction:1|-1):Promise<void>{
    const editor=this.editor,editing=this.editing;if(!editor||!editing)return;
    const fieldId=String(editing.piece.userData.nativeId??''),pageId=this.page?.id,value=editor.value;
    const selectionStart=editor.selectionStart,selectionEnd=editor.selectionEnd,serial=++this.activationSerial;
    const prior=this.pageControls.filter(hit=>!hit.control?.disabled).map(hit=>String(hit.piece.userData.nativeId??'')),priorIndex=prior.indexOf(fieldId);
    const accepted=await this.finishEdit(true);
    if(this.closed||serial!==this.activationSerial||this.page?.id!==pageId)return;
    const available=this.pageControls.filter(hit=>!hit.control?.disabled);if(!available.length)return;
    const currentIndex=available.findIndex(hit=>String(hit.piece.userData.nativeId??'')===fieldId);
    if(!accepted){
      const same=available[currentIndex];if(!same?.input)return;
      this.focusIndex=currentIndex;this.hover(same.piece);this.beginEdit(same);
      const restored=this.editor;if(restored){restored.value=value;restored.setSelectionRange(selectionStart,selectionEnd);this.editRepaint?.();}
      return;
    }
    let nextIndex=currentIndex>=0?(currentIndex+direction+available.length)%available.length:-1;
    if(nextIndex<0)for(let step=1;step<=prior.length;step++){
      const candidate=prior[(Math.max(0,priorIndex)+direction*step+prior.length*2)%prior.length];
      nextIndex=available.findIndex(hit=>String(hit.piece.userData.nativeId??'')===candidate);if(nextIndex>=0)break;
    }
    if(nextIndex<0)nextIndex=direction>0?0:available.length-1;
    const next=available[nextIndex]!;this.focusIndex=nextIndex;this.hover(next.piece);
    if(next.input)this.beginEdit(next);
  }
  private finishEdit(commit:boolean,rebuild=true):Promise<boolean>{
    const editor=this.editor,hit=this.editing;if(!editor)return this.editorCommit??Promise.resolve(true);
    const binding=hit?.input,pageId=this.page?.id,fieldId=String(hit?.piece.userData.nativeId??''),value=editor.value;
    this.editor=undefined;this.editing=undefined;this.editRepaint=undefined;this.editingPaintDirty=false;editor.remove();
    const task=(async()=>{
      let accepted=true;
      if(commit&&binding)try{
        if(binding.kind==='number'&&(!value.trim()||!Number.isFinite(Number(value))))throw Error('Saisissez un nombre valide.');
        accepted=(await binding.onCommit(value))!==false;
        // Mutable presentation drafts remain literal after Enter/blur even when
        // their controller only updates a local draft rather than rebuilding.
        if(accepted&&this.retainedPagePieces.get(fieldId)?.hit.input===binding)binding.value=value;
      }catch(error){accepted=false;if(!this.closed)this.options.onError(String(error));}
      if(rebuild&&!this.closed)try{this.rebuildPage(true);this.invalidate();}catch(error){accepted=false;this.options.onError(String(error));}
      return accepted;
    })();
    this.editorCommit=task;this.editorCommitPageId=pageId;
    const release=()=>{if(this.editorCommit===task){this.editorCommit=undefined;this.editorCommitPageId=undefined;}};
    void task.then(release,release);
    return task;
  }
  dispose():void{
    if(this.closed)return;this.closed=true;this.fontRequest++;this.clearHint();clearTimeout(this.noticeTimer);this.finishEdit(false,false);cancelAnimationFrame(this.frameId);
    for(const dispose of this.disposers)dispose();this.disposers.length=0;this.overlayCache.dispose();for(const image of this.portraitImages.values()){image.onload=null;image.onerror=null;}this.portraitImages.clear();this.globe?.dispose();this.selectionFill.geometry.dispose();this.selectionFill.material.dispose();this.selectionOutline.geometry.dispose();this.selectionOutline.material.dispose();this.art.dispose();this.ownRenderer.domElement.remove();void this.ownRenderer.dispose();this.hits.clear();this.moving.clear();this.retainedPagePieces.clear();
  }
}
