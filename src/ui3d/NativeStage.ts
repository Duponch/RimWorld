import * as THREE from 'three/webgpu';
import {PrototypeCardboardArt,MANAGEMENT_BUTTONS,PALETTE,drawHandRect,drawMarkerLine,drawHandPaintedIcon,type CardboardPiece,type CardboardDraw,type CardboardPieceOptions} from './prototype-art';
import type {NativeControl,NativePage,NativeRow} from './native-contract';
import {NativeGlobe} from './NativeGlobe';
import {NativeOverlayCache} from './NativeOverlayCache';
import {NativeDamageTracker} from './NativeDamageTracker';
import {NativeRendererStandby} from './NativeRendererStandby';
import {NATIVE_UI,layoutNativePage,wrapNativeText,type NativePageBox,type NativeRowBox} from './native-layout';

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
  onTools?:(kind:'orders'|'zones')=>void;
  onViewport?:(width:number,height:number,unitsPerPixel:number)=>void;
  onPointer?:(x:number,y:number)=>void;
  onAnimate?:(dtSeconds:number)=>boolean;
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
  private readonly standby=new NativeRendererStandby(this.ownRenderer);
  private readonly raycaster=new THREE.Raycaster();
  private readonly pointer=new THREE.Vector2();
  private readonly management:CardboardPiece[]=[];
  private readonly pageGroup=new THREE.Group();
  private readonly pageContent=new THREE.ClippingGroup();
  private pageBox:NativePageBox|undefined;
  private readonly measureContext=document.createElement('canvas').getContext('2d')!;
  private readonly toolsDock=new THREE.Group();
  private autoHideBottom=false;
  private bottomOpen=true;
  private bottomOffset=0;
  private extraAnimating=false;
  private lastPointer={x:-1,y:-1};
  private scrollbarDrag:{pointerId:number;startY:number;scroll:number;travel:number;max:number}|undefined;
  private paintDrag:{pointerId:number;group:string;indices:Set<number>;onPaint:NonNullable<NativeControl['paint']>['onPaint']}|undefined;
  private dropdown:{controlId:string;pageId:string;box:{x:number;y:number;width:number;height:number};offset:number;index:number;pieces:CardboardPiece[]}|undefined;
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
  private hintScroll=0;
  private hintMaxScroll=0;
  private worldReadout:CardboardPiece|undefined;
  private worldReadoutLines:readonly string[]=[];
  private worldReadoutGeometry='';
  private worldReadoutInk='';
  private pointerOverUi=true;
  private readonly overlayCache=new NativeOverlayCache();
  private readonly damageTracker=new NativeDamageTracker();
  private readonly overlaySize=new THREE.Vector2();
  private readonly reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  private sceneRevision=0;
  private cacheRevision=0;
  private lastArtRevision=-1;
  private lastSceneRevision=-1;
  private readonly cacheEnabled=!(import.meta.env.DEV&&new URLSearchParams(location.search).get('ui-cache')==='off');
  private readonly stats={renders:0,overlayRenders:0,rebuilds:0,raycasts:0,activeAnimations:0,uiObjects:0,drawCalls:0,renderMs:0,backend:'',error:null as string|null};
  constructor(private readonly options:NativeStageOptions){
    this.raycaster.layers.enable(31);
    this.hudRoot.position.set(0,0,-HUD_DISTANCE);this.camera.add(this.hudRoot);this.scene.add(this.camera);
    Object.values(this.anchors).forEach(group=>this.hudRoot.add(group));
    this.selectionBox.add(this.selectionFill,this.selectionOutline);this.selectionBox.visible=false;this.selectionBox.position.z=.5;this.hudRoot.add(this.selectionBox);
    this.hudRoot.add(this.pageGroup);this.pageGroup.add(this.pageContent);
    this.anchors.bottomLeft.add(this.toolsDock);this.toolsDock.visible=false;
    for(const [index,kind]of (['orders','zones'] as const).entries()){
      const control:NativeControl={id:'map-dock:'+kind,label:kind==='orders'?'Ordres':'Zones',hint:kind==='orders'?'Ordres sur la carte':'Zones sur la carte',onActivate:()=>this.options.onTools?.(kind)};
      const piece=this.art.createPiece({w:.68,h:.26,depth:.024,seed:381+index*5,bgColor:PALETTE.sageMountain,interactive:true,tooltip:control.hint,drawFn:(ctx,w,h)=>{ctx.fillStyle=PALETTE.inkDark;ctx.textAlign='center';ctx.font=this.font(w/68*13,true);ctx.fillText(control.label,w/2,h/2+w/68*4);}});
      piece.userData.nativeId=control.id;piece.setBaseTransform(.46+index*.73,1.03,.08);this.toolsDock.add(piece);this.register(piece,control);
    }
    // The reference's three lights, with the world key expressed in HUD-camera
    // space. They light actual cream edges and matte painted mesh fronts.
    this.scene.add(new THREE.AmbientLight(0xfff5e4,1.45));
    const sun=new THREE.DirectionalLight(0xfff2d6,1.9);sun.position.set(18,28,22);this.scene.add(sun);
    const key=new THREE.DirectionalLight(0xfffaf0,.85);key.position.set(-3,5,4);this.camera.add(key);
    this.anchors.bottomCenter.add(this.art.createBottomShelf());
    this.anchors.bottomCenter.visible=false;
    MANAGEMENT_BUTTONS.forEach((config,index)=>{
      const piece=this.art.createManagementButton(index,config,()=>this.options.onPanel(PANEL_IDS[index]!),26);
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
      if(this.closed)return;this.initialized=true;this.standby.setActive(this.frontVisible||this.standalone);this.stats.backend=this.ownRenderer.getContext() instanceof WebGL2RenderingContext?'WebGL 2':'WebGPU';this.invalidate();
    }).catch(error=>{this.stats.error=String(error);this.options.onError(String(error));});
  }
  private listen(target:EventTarget,name:string,listener:EventListener,options?:boolean|AddEventListenerOptions):void{
    target.addEventListener(name,listener,options);this.disposers.push(()=>target.removeEventListener(name,listener,options));
  }
  diagnostics(){
    this.scene.updateMatrixWorld(true);
    return {...this.stats,cache:this.overlayCache.stats,standby:this.standby.stats,activeAnimations:this.moving.size,uiObjects:this.art.interactiveMeshes.length,
      mode:'native-meshes',page:this.page?.id??null,scroll:this.scroll,maxScroll:this.maxScroll,pageBounds:this.pageBox?{x:this.pageBox.x,y:this.pageBox.y,width:this.pageBox.width,height:this.pageBox.height}:null,dropdown:this.dropdown?{owner:this.dropdown.controlId,...this.dropdown.box}:null,bottomDock:{autoHide:this.autoHideBottom,open:this.bottomOpen,offset:this.bottomOffset},front:this.frontVisible,globe:this.globeDiagnostics(),
      readout:this.worldReadout?{visible:this.worldReadout.visible,paper:this.worldReadout.userData.paper,width:this.worldReadout.userData.w*100,height:this.worldReadout.userData.h*100,lines:this.worldReadoutLines}:null,
      tooltip:this.hintPiece?{width:this.hintPiece.userData.w*100,height:this.hintPiece.userData.h*100}:null,
      rows:this.pageBox?.rows.map(row=>({id:row.row.id,column:row.row.column,meter:!!row.row.meter,x:row.x,top:row.top-this.scroll,width:row.width,height:row.height,visible:row.top+row.height>this.scroll&&row.top<this.scroll+this.pageBox!.body.height}))??[],
      management:this.management.map((piece,index)=>{
        const center=piece.getWorldPosition(new THREE.Vector3()).project(this.camera);
        return {id:PANEL_IDS[index],x:(center.x+1)*this.width/2,y:(1-center.y)*this.height/2,
          width:piece.userData.w,height:piece.userData.h,seed:piece.userData.seed,
          position:piece.position.toArray(),rotation:piece.rotation.toArray(),active:piece.userData.active};
      }),controls:[...this.pageControls,...(this.dropdown?.pieces.flatMap(piece=>{const hit=this.hits.get(piece.userData.mesh);return hit?.control?[hit]:[];})??[])].map(hit=>{
        const point=hit.piece.getWorldPosition(new THREE.Vector3()).project(this.camera);
        return {id:hit.control?.id??hit.piece.userData.nativeId,label:hit.control?.label,disabled:!!hit.control?.disabled,active:!!hit.control?.active,
          x:(point.x+1)*this.width/2,y:(1-point.y)*this.height/2};
      }),targets:this.art.interactiveMeshes.filter(mesh=>{for(let node:THREE.Object3D|null=mesh;node;node=node.parent)if(!node.visible)return false;return true;}).map(mesh=>{
        const piece=mesh.userData.widgetGroup as CardboardPiece|undefined,point=mesh.getWorldPosition(new THREE.Vector3()).project(this.camera);
        return {seed:piece?.userData.seed,nativeId:piece?.userData.nativeId??null,tooltip:piece?.userData.tooltip??'',paper:piece?.userData.paper,width:piece?.userData.w,height:piece?.userData.h,x:(point.x+1)*this.width/2,y:(1-point.y)*this.height/2};
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
    this.updateOwnSurface();
    this.anchors.bottomCenter.visible=!this.frontVisible;this.toolsDock.visible=visible&&!this.frontVisible;this.updateWorldReadoutVisibility();this.invalidate();
  }
  setFrontVisible(visible:boolean):void{
    if(this.frontVisible===visible)return;this.sceneRevision++;
    this.frontVisible=visible;this.updateOwnSurface();
    this.anchors.bottomCenter.visible=!visible;this.toolsDock.visible=this.worldVisible&&!visible;this.resize();this.rebuildPage(true);this.updateWorldReadoutVisibility();this.invalidate();
  }
  private updateOwnSurface():void{
    const active=this.frontVisible||this.standalone;
    if(active){this.standby.setActive(true);this.ownRenderer.domElement.style.display='block';}
    else{this.ownRenderer.domElement.style.display='none';if(this.frameId){cancelAnimationFrame(this.frameId);this.frameId=0;}this.standby.setActive(false);}
  }
  setPanel(id:string|null):void{
    this.management.forEach((piece,index)=>{const active=PANEL_IDS[index]===id;if(piece.userData.active!==active){piece.setActive(active);this.moving.add(piece);}});this.invalidate();
  }
  getViewportMetrics(){return {width:this.width,height:this.height,unitsPerPixel:.01};}
  setAutoHideBottom(enabled:boolean):void{this.autoHideBottom=enabled;this.bottomOpen=!enabled||this.lastPointer.y>=this.height-14;this.extraAnimating=true;this.invalidate();}
  showPage(page:NativePage|null):void{
    if(this.closed)return;
    const same=page?.id===this.page?.id,ownerChanged=page?.visual?.surface!==this.page?.visual?.surface||page?.visual?.roads!==this.page?.visual?.roads;
    this.page=page;if(!same){this.cancelPress();this.scroll=0;this.closeDropdown();}
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
    const lines=this.worldReadoutLines.flatMap(line=>wrapNativeText(line,Math.min(640,this.width-32),this.measure,13));
    const width=Math.min(this.width-24,Math.max(...lines.map(line=>this.measure(line,13)))+8),height=lines.length*17+4;
    const w=width*.01,h=height*.01,geometry=width+'|'+height,ink=JSON.stringify([lines,this.textFontRevision]);
    const draw:CardboardDraw=(ctx,wp,hp)=>{ctx.save();ctx.scale(wp/width,hp/height);ctx.textAlign='left';ctx.font=this.font(13);ctx.lineJoin='round';ctx.strokeStyle='rgba(15,22,17,.95)';ctx.lineWidth=3;ctx.fillStyle='#fff9eb';lines.forEach((line,i)=>{ctx.strokeText(line,3,15+i*17);ctx.fillText(line,3,15+i*17);});ctx.restore();};
    if(!this.worldReadout||this.worldReadoutGeometry!==geometry){
      if(this.worldReadout)this.art.disposePiece(this.worldReadout);
      this.worldReadout=this.art.createPiece({w,h,paper:false,textureWidth:Math.ceil(width*2),textureHeight:Math.ceil(height*2),drawFn:draw,seed:3751});
      this.worldReadout.userData.nativeId='world-readout';this.worldReadout.userData.nativeStatic=true;this.anchors.bottomLeft.add(this.worldReadout);
    }else if(this.worldReadoutInk!==ink)this.worldReadout.redraw(draw);
    const left=this.pageBox&&this.pageBox.x+this.pageBox.width+width+24<this.width?this.pageBox.x+this.pageBox.width+12:12;
    this.worldReadout.setBaseTransform((left+width/2)*.01,(126+height/2)*.01,.08);
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
    const width=Math.min(this.width-32,460,Math.max(120,this.measure(message,13)+24)),lines=wrapNativeText(message,width-24,this.measure,13),height=lines.length*17+20;
    const w=width*.01,h=height*.01;
    const piece=this.art.createPiece({w,h,seed:1881,uvPadding:1,textureWidth:Math.ceil(width*2),textureHeight:Math.ceil(height*2),bgColor:error?'#e2b59a':PALETTE.creamPaper,depth:.025,
      drawFn:(ctx,wp,hp)=>{ctx.save();ctx.scale(wp/width,hp/height);ctx.fillStyle=PALETTE.inkDark;ctx.font=this.font(13);ctx.textAlign='left';lines.forEach((line,index)=>ctx.fillText(line,12,23+index*17,width-24));ctx.restore();}});
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
    this.standby.resize(this.width,this.height,Math.min(devicePixelRatio||1,2));
    this.visH=2*Math.tan(THREE.MathUtils.degToRad(this.camera.fov)/2)*HUD_DISTANCE;this.visW=this.visH*this.camera.aspect;
    this.uiScale=this.visH/this.height*100;
    const halfW=this.visW/2,halfH=this.visH/2,s=this.uiScale;
    Object.values(this.anchors).forEach(group=>group.scale.setScalar(s));
    const dockScale=Math.min(1.18,(this.width-32)/860);this.anchors.bottomCenter.scale.setScalar(s*dockScale);
    this.anchors.topLeft.position.set(-halfW+.08*s,halfH-.08*s,0);
    this.anchors.topCenter.position.set(0,halfH-.04*s,0);
    this.anchors.topRight.position.set(halfW-.08*s,halfH-.08*s,0);
    this.anchors.bottomLeft.position.set(-halfW+.08*s,-halfH+.08*s,0);
    this.anchors.bottomCenter.position.set(0,-halfH+.04*s,0);
    this.anchors.bottomRight.position.set(halfW-.08*s,-halfH+.08*s,0);
    this.anchors.drawerAnchor.position.set(0,-halfH,0);
    this.refreshWorldReadout();
    this.options.onViewport?.(this.width,this.height,.01);
  }
  /** Called by the existing game renderer, using its device and frame loop. */
  renderOverlay(renderer:THREE.WebGPURenderer,now=performance.now()):void{
    if(this.closed||this.frontVisible||!this.worldVisible)return;
    const animated=this.moving.size>0||this.extraAnimating;
    this.animate(now);
    if(this.cacheEnabled){
      const start=performance.now();
      let damage;
      if(animated||this.lastArtRevision!==this.art.revision||this.lastSceneRevision!==this.sceneRevision){
        renderer.getDrawingBufferSize(this.overlaySize);
        damage=this.damageTracker.collect(this.scene,this.camera,Math.floor(this.overlaySize.x),Math.floor(this.overlaySize.y),this.globe?.visible?undefined:this.art.resourceRevision);
        this.lastArtRevision=this.art.revision;this.lastSceneRevision=this.sceneRevision;
        if(damage)this.cacheRevision++;
      }
      this.overlayCache.draw(renderer,this.scene,this.camera,this.cacheRevision,false,damage??undefined);
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
      if(this.moving.size||this.extraAnimating)this.invalidate();});
  }
  private animate(now:number):void{
    const dt=this.lastTime?Math.min(.05,(now-this.lastTime)/1000):1/60;this.lastTime=now;
    const reduced=this.reducedMotion.matches;
    const wanted=this.autoHideBottom&&this.worldVisible&&!this.frontVisible&&!this.page?.modal&&!this.bottomOpen?-.72:0;
    const next=reduced?wanted:this.bottomOffset+(wanted-this.bottomOffset)*Math.min(1,dt*15);
    if(next!==this.bottomOffset){this.bottomOffset=Math.abs(wanted-next)<.001?wanted:next;this.anchors.bottomCenter.position.y=-this.visH/2+.04*this.uiScale+this.bottomOffset*this.uiScale;this.sceneRevision++;}
    const external=this.options.onAnimate?.(dt)??false;if(external)this.sceneRevision++;
    this.extraAnimating=Math.abs(wanted-this.bottomOffset)>.001||external;
    for(const piece of this.moving){
      const ud=piece.userData;ud.hoverVal=reduced?ud.hoverTarget:ud.hoverVal+(ud.hoverTarget-ud.hoverVal)*14*dt;
      ud.pressVal=reduced?0:Math.max(0,ud.pressVal-5.5*dt);
      if(Math.abs(ud.hoverTarget-ud.hoverVal)<.001)ud.hoverVal=ud.hoverTarget;
      this.setPose(piece,ud.hoverVal);
      if(ud.hoverVal===ud.hoverTarget&&ud.pressVal===0)this.moving.delete(piece);
    }
  }
  private setPose(piece:CardboardPiece,hover:number):void{
    const ud=piece.userData,toolbar=String(ud.nativeId??'').startsWith('tab:'),activeLift=ud.active?(toolbar?.065:.02):0,hoverLift=hover*(toolbar?.085:.025),pressPush=ud.pressVal*(toolbar?.05:Math.min(.02,ud.depth*.5));
    const x=ud.basePos.x,y=ud.basePos.y+(ud.active&&toolbar?.045:0)+hover*(toolbar?.03:.005),z=ud.basePos.z+activeLift+hoverLift-pressPush;
    const rx=-hover*(toolbar?.14:.045)+(ud.active&&toolbar?-.1:0),ry=hover*(toolbar?.12:.035),rz=ud.baseRot.z+hover*(toolbar?.035:.012);
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
      let content:THREE.Object3D|null=found.piece;while(content&&content!==this.pageContent)content=content.parent;
      if(content&&this.pageContent.clippingPlanes.some(plane=>plane.distanceToPoint(intersection.point)<0))continue;
      if(this.page?.modal){
        // Parent membership is tested explicitly below, independent of DOM.
        let parent:THREE.Object3D|null=found.piece;while(parent&&parent!==this.pageGroup)parent=parent.parent;
        if(!parent&&!this.dropdown?.pieces.includes(found.piece))continue;
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
    this.lastPointer={x:event.clientX,y:event.clientY};this.options.onPointer?.(event.clientX,event.clientY);
    const bottomOpen=event.clientY>=this.height-Math.max(14,100+this.bottomOffset*100);
    if(bottomOpen!==this.bottomOpen){this.bottomOpen=bottomOpen;this.extraAnimating=true;this.invalidate();}
    if(this.editor&&event.target===this.editor)return;
    if(this.scrollbarDrag){const drag=this.scrollbarDrag;if(drag.pointerId!==event.pointerId)return;this.scroll=THREE.MathUtils.clamp(drag.scroll+(event.clientY-drag.startY)/Math.max(1,drag.travel)*drag.max,0,drag.max);this.rebuildPage(true);this.swallow(event);this.invalidate();return;}
    if(this.paintDrag){const hit=this.hit(event.clientX,event.clientY),paint=hit?.control?.paint;if(paint?.group===this.paintDrag.group){this.paintDrag.indices.add(paint.index);hit!.piece.userData.pressVal=.7;this.moving.add(hit!.piece);this.invalidate();}this.swallow(event);return;}
    if(this.dropdown){const hit=this.hit(event.clientX,event.clientY);this.setPointerOverUi(true);this.updateHint(hit,event.clientX,event.clientY);this.hover(this.dropdown.pieces.includes(hit?.piece!)?hit!.piece:null);this.swallow(event);return;}
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
    if(this.dropdown&&!this.dropdown.pieces.includes(hit?.piece!)){this.closeDropdown();this.swallow(event);return;}
    if(event.button===0&&(hit?.piece.userData.nativeId==='native-scrollbar'||hit?.piece.userData.nativeId==='native-scroll-thumb')&&this.pageBox){
      const box=this.pageBox,travel=box.body.height-Math.max(28,box.body.height*box.body.height/box.contentHeight);
      if(hit.piece.userData.nativeId==='native-scrollbar'){this.scroll=THREE.MathUtils.clamp((event.clientY-box.y-box.body.y)/box.body.height*this.maxScroll,0,this.maxScroll);this.rebuildPage(true);}
      this.scrollbarDrag={pointerId:event.pointerId,startY:event.clientY,scroll:this.scroll,travel,max:this.maxScroll};this.swallow(event);this.invalidate();return;
    }
    this.setPointerOverUi(!!hit||this.frontVisible||!!this.page?.modal);
    if(hit||this.frontVisible||this.page?.modal)this.gesture();
    if(!hit){if(this.frontVisible||this.page?.modal)this.swallow(event);else this.worldPress={pointerId:event.pointerId,button:event.button};return;}
    this.swallow(event);if(event.button!==0)return;
    if(hit.piece.userData.nativeStatic)return;
    if(hit.control?.disabled)return;
    if(hit.control?.paint){const paint=hit.control.paint;this.paintDrag={pointerId:event.pointerId,group:paint.group,indices:new Set([paint.index]),onPaint:paint.onPaint};hit.piece.userData.pressVal=.7;this.moving.add(hit.piece);this.invalidate();return;}
    this.down={piece:hit.piece,pointerId:event.pointerId,x:event.clientX,y:event.clientY};
    hit.piece.userData.pressVal=1;this.moving.add(hit.piece);this.invalidate();
  }
  private pointerUp(event:PointerEvent):void{
    if(this.scrollbarDrag){this.scrollbarDrag=undefined;this.swallow(event);return;}
    if(this.paintDrag){const drag=this.paintDrag;this.paintDrag=undefined;this.swallow(event);if(drag.pointerId===event.pointerId){const values=[...drag.indices],from=Math.min(...values),to=Math.max(...values);void Promise.resolve(drag.onPaint(Array.from({length:to-from+1},(_,i)=>from+i))).catch(error=>this.options.onError(String(error)));}return;}
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
  private cancelPress():void{this.down=null;this.globeDrag=undefined;this.scrollbarDrag=undefined;this.paintDrag=undefined;if(this.worldPress)this.options.onCancelWorldInteraction?.();this.worldPress=undefined;}
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
      if(live.control?.select){this.openDropdown(live);return;}
      const action=live.control?.onActivate??live.piece.userData.onClick;
      if(action){if(id)this.options.onActivate?.(id);void Promise.resolve(action()).catch(error=>{if(!this.closed)this.options.onError(error instanceof Error?error.message:String(error));});}
    })().catch(error=>{if(!this.closed)this.options.onError(error instanceof Error?error.message:String(error));});
  }
  private closeDropdown():void{
    if(!this.dropdown)return;const pieces=this.dropdown.pieces;this.dropdown=undefined;for(const piece of pieces)this.unregister(piece);this.sceneRevision++;this.invalidate();
  }
  private openDropdown(hit:Hit):void{
    const select=hit.control?.select;if(!select||!this.page)return;
    this.closeDropdown();const center=hit.piece.getWorldPosition(new THREE.Vector3()).project(this.camera),scale=hit.piece.getWorldScale(new THREE.Vector3());
    const x=(center.x+1)*this.width/2,y=(1-center.y)*this.height/2;
    const width=Math.min(this.width-24,360,Math.max(100,hit.piece.userData.w*scale.x/this.visW*this.width,...select.options.map(option=>this.measure(option.label,13)+34)));
    const height=Math.min(this.height-24,392,select.options.length*25+10),top=y+hit.piece.userData.h*scale.y/this.visH*this.height/2+4;
    this.dropdown={controlId:hit.control!.id,pageId:this.page.id,box:{x:THREE.MathUtils.clamp(x-width/2,12,this.width-width-12),y:top+height<=this.height-12?top:Math.max(12,y-height-16),width,height},offset:0,index:Math.max(0,select.options.findIndex(option=>option.value===select.value)),pieces:[]};
    this.rebuildDropdown();
  }
  private rebuildDropdown():void{
    const state=this.dropdown;if(!state)return;
    const control=this.pageControls.find(hit=>hit.control?.id===state.controlId)?.control,select=control?.select;
    if(!select||this.page?.id!==state.pageId||control.disabled){this.closeDropdown();return;}
    for(const piece of state.pieces)this.unregister(piece);state.pieces=[];
    const {box}=state,count=Math.max(1,Math.floor((box.height-10)/25));state.offset=THREE.MathUtils.clamp(state.offset,0,Math.max(0,select.options.length-count));
    const place=(piece:CardboardPiece,x:number,y:number,z:number)=>{const factor=1-z/HUD_DISTANCE;piece.scale.setScalar(this.uiScale*factor);piece.setBaseTransform((x-this.width/2)*this.visH/this.height*factor,(this.height/2-y)*this.visH/this.height*factor,z);this.hudRoot.add(piece);state.pieces.push(piece);};
    const background=this.art.createPiece({w:box.width*.01,h:box.height*.01,uvPadding:1,bgColor:PALETTE.creamPaper,seed:938,interactive:true,drawFn:()=>{}});
    background.userData.nativeId='select-popup';background.userData.nativeStatic=true;this.register(background);place(background,box.x+box.width/2,box.y+box.height/2,1.6);
    select.options.slice(state.offset,state.offset+count).forEach((option,index)=>{
      const actual=index+state.offset,selected=actual===state.index,piece=this.art.createPiece({w:(box.width-10)*.01,h:.235,uvPadding:1,paper:selected,textureWidth:Math.ceil((box.width-10)*2),textureHeight:47,bgColor:PALETTE.ochre,seed:949+actual,interactive:true,tooltip:option.hint??option.label,drawFn:(ctx,wp,hp)=>{ctx.save();ctx.scale(wp/(box.width-10),hp/23.5);ctx.textAlign='left';ctx.fillStyle=option.disabled?'#92816a':PALETTE.inkDark;ctx.font=this.font(13);ctx.fillText((option.value===select.value?'✓ ':'')+option.label,7,16,box.width-28);ctx.restore();}});
      const optionControl:NativeControl={id:'select-option:'+state.controlId+':'+option.value,label:option.label,disabled:option.disabled,hint:option.hint??option.label,onActivate:()=>this.selectDropdown(option.value)};
      piece.userData.nativeId=optionControl.id;this.register(piece,optionControl);place(piece,box.x+box.width/2,box.y+5+index*25+11.75,1.64);
    });
    if(select.options.length>count){const piece=this.art.createPiece({w:.035,h:(box.height-12)*count/select.options.length*.01,paper:false,drawFn:(ctx,w,h)=>{ctx.fillStyle='#5f7651';ctx.fillRect(0,0,w,h);}});place(piece,box.x+box.width-4,box.y+6+(box.height-12-count/select.options.length*(box.height-12))*state.offset/(select.options.length-count)+(box.height-12)*count/select.options.length/2,1.67);}
    this.sceneRevision++;this.invalidate();
  }
  private selectDropdown(value:string):void{
    const state=this.dropdown;if(!state)return;const control=this.pageControls.find(hit=>hit.control?.id===state.controlId)?.control;
    if(this.page?.id!==state.pageId||control?.disabled||!control?.select?.options.some(option=>option.value===value&&!option.disabled)){this.closeDropdown();return;}
    const change=control.select.onChange;this.closeDropdown();void Promise.resolve(change(value)).catch(error=>this.options.onError(String(error)));
  }
  private dropdownKey(key:string):void{
    const state=this.dropdown;if(!state)return;const select=this.pageControls.find(hit=>hit.control?.id===state.controlId)?.control?.select;if(!select){this.closeDropdown();return;}
    if(key==='Enter'||key===' '){const option=select.options[state.index];if(option&&!option.disabled)this.selectDropdown(option.value);return;}
    if(key==='Home')state.index=0;else if(key==='End')state.index=select.options.length-1;else{const step=key==='ArrowUp'?-1:1;for(let i=0;i<select.options.length;i++){state.index=(state.index+step+select.options.length)%select.options.length;if(!select.options[state.index]?.disabled)break;}}
    const count=Math.floor((state.box.height-10)/25);if(state.index<state.offset)state.offset=state.index;else if(state.index>=state.offset+count)state.offset=state.index-count+1;this.rebuildDropdown();
  }
  private keyDown(event:KeyboardEvent):void{
    if(this.editor&&event.target===this.editor)return;
    if(this.dropdown){if(event.key==='Escape'||event.key==='Tab'){this.swallow(event);this.closeDropdown();return;}if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(event.key)){this.swallow(event);this.dropdownKey(event.key);return;}}
    if(event.key==='Escape'){
      this.activationSerial++;if(this.paintDrag||this.scrollbarDrag){this.cancelPress();this.swallow(event);return;}
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
    if(this.hintPiece&&this.hintMaxScroll>0&&this.hit(event.clientX,event.clientY)?.piece===this.hintOwner){this.swallow(event);this.hintScroll=THREE.MathUtils.clamp(this.hintScroll+Math.sign(event.deltaY)*3,0,this.hintMaxScroll);this.hintPiece.redraw();this.invalidate();return;}
    this.clearHint();
    if(this.dropdown){this.swallow(event);this.dropdown.offset=Math.max(0,this.dropdown.offset+Math.sign(event.deltaY)*3);this.rebuildDropdown();return;}
    if(this.globeHit(event.clientX,event.clientY)!==null){this.swallow(event);this.globe?.zoom(-event.deltaY*.001);this.sceneRevision++;this.invalidate();return;}
    const hit=this.hit(event.clientX,event.clientY);
    if(hit||this.frontVisible||this.page?.modal){
      this.swallow(event);if(hit&&!this.pagePieces.includes(hit.piece))return;if(this.maxScroll<=0)return;
      const delta=event.deltaMode===1?event.deltaY*16:event.deltaMode===2?event.deltaY*this.height:event.deltaY;
      const next=THREE.MathUtils.clamp(this.scroll+delta,0,this.maxScroll);
      if(next!==this.scroll){this.scroll=next;this.rebuildPage(true);this.invalidate();}
    }
  }
  private measure=(text:string,size:number,bold=false):number=>{this.measureContext.font=this.font(size,bold);return this.measureContext.measureText(text).width;};
  private rowHint(row:NativeRow):string{return row.hint??[row.label,row.value,row.detail,row.meter?.label,row.meter?.secondary?.label].filter(Boolean).join('\n');}
  private controlInk(control:NativeControl):unknown{
    const {hint:_hint,select,...ink}=control;
    return {...ink,select:select?{...select,options:select.options.map(({hint:_optionHint,...option})=>option)}:undefined};
  }
  private rowInk(row:NativeRow):unknown{
    const {hint:_hint,controls,columns,...ink}=row;
    // Empty hints have no input plane. Preserve that structural distinction
    // while excluding the text that only appears in a native tooltip.
    return [{...ink,controls:controls?.map(control=>this.controlInk(control)),columns:columns?.map(({hint:_columnHint,...column})=>column)},!!this.rowHint(row)];
  }
  private pageInkSignature(page:NativePage|null):string{
    return page?JSON.stringify([page.id,page.title,page.subtitle,page.width,page.height,page.layout,page.columnRatio,page.portrait?.url,page.visual?.selected,page.visual?.markers,page.rows.map(row=>this.rowInk(row)),page.actions?.map(control=>this.controlInk(control)),page.closable,this.textFontRevision,this.frontVisible,this.width,this.height,this.scroll]):'';
  }
  private rebuildPage(force=false):void{
    const page=this.page;
    const signature=this.pageInkSignature(page);
    if(!force&&signature===this.pageSignature){this.rebindPage(page);return;}
    const focused=this.pageControls.filter(hit=>!hit.control?.disabled)[this.focusIndex],focusedId=focused?String(focused.piece.userData.nativeId):undefined;
    this.pageSignature=signature;this.pagePieceIds=new Set();this.pagePieces.length=0;this.pageControls=[];this.pageBackdrop=undefined;
    if(this.globe&&this.globe.visible!==!!page?.visual){this.globe.visible=!!page?.visual;this.sceneRevision++;}
    if(!page){this.pageBox=undefined;this.retirePagePieces();this.focusIndex=-1;return;}
    this.stats.rebuilds++;
    const box=layoutNativePage(page,{width:this.width,height:this.height},this.frontVisible,this.measure);this.pageBox=box;
    const k=.01,w=box.width*k,h=box.height*k,margin=12;
    const z=.18,factor=1-z/HUD_DISTANCE;
    this.pageGroup.scale.setScalar(this.uiScale*factor);
    this.pageGroup.position.set((box.x+box.width/2-this.width/2)*this.visH/this.height*factor,(this.height/2-box.y-box.height/2)*this.visH/this.height*factor,z);
    this.maxScroll=Math.max(0,box.contentHeight-box.body.height);this.scroll=THREE.MathUtils.clamp(this.scroll,0,this.maxScroll);
    const visible=box.rows.filter(r=>r.top+r.height>this.scroll&&r.top<this.scroll+box.body.height);
    const background=this.pagePiece('page:'+page.id,{w,h,cacheBackground:true,uvPadding:1,textureWidth:Math.ceil(box.width*2),textureHeight:Math.ceil(box.height*2),bgColor:PALETTE.creamPaper,seed:2003,depth:.035,interactive:true,
      drawFn:(ctx,wp,hp,rng)=>{
        ctx.save();ctx.scale(wp/box.width,hp/box.height);ctx.textAlign='left';ctx.fillStyle=PALETTE.inkDark;ctx.font=this.font(17,true);
        ctx.fillText(page.title,margin,25,box.width-margin*2-(page.portrait?74:28));
        if(page.subtitle){ctx.font=this.font(12);ctx.fillStyle='#66583f';ctx.fillText(page.subtitle,margin,44,box.width-margin*2-(page.portrait?62:0));}
        ctx.save();ctx.beginPath();ctx.rect(box.body.x,box.body.y,box.body.width,box.body.height);ctx.clip();
        for(const r of visible)this.drawPageRow(ctx,r,box.body.y+r.top-this.scroll,rng,box);
        ctx.restore();ctx.restore();
      }},signature,0,0,0);
    background.userData.nativeStatic=true;this.pageBackdrop=background;this.pageGroup.add(background);
    if(page.closable!==false)this.control(this.closeControl(),w/2-.23,h/2-.21,.24,.24,.07);
    this.pageGroup.updateMatrixWorld(true);
    const local=(x:number,y:number)=>new THREE.Vector3((x-box.width/2)*k,(box.height/2-y)*k,0).applyMatrix4(this.pageGroup.matrixWorld);
    const tl=local(box.body.x,box.body.y),br=local(box.body.x+box.body.width,box.body.y+box.body.height);
    this.pageContent.clippingPlanes=[new THREE.Plane(new THREE.Vector3(1,0,0),-tl.x),new THREE.Plane(new THREE.Vector3(-1,0,0),br.x),new THREE.Plane(new THREE.Vector3(0,-1,0),tl.y),new THREE.Plane(new THREE.Vector3(0,1,0),-br.y)];
    for(const r of visible){
      const row=r.row,top=box.body.y+r.top-this.scroll,cy=top+r.height/2;
      const hint=this.rowHint(row);
      if(hint){
        const piece=this.pagePiece('row-hint:'+row.id,{w:r.width*k,h:r.height*k,paper:false,hitOnly:true,interactive:true,drawFn:()=>{}},hint,(r.x+r.width/2-box.width/2)*k,(box.height/2-cy)*k,.025);
        piece.userData.tooltip=hint;piece.userData.nativeStatic=true;this.pageContent.add(piece);
      }
      if(row.columns){
        const tail=row.value?142:0,left=r.x+104,cw=(r.width-104-tail)/row.columns.length;
        row.columns.forEach((column,index)=>{const hintPiece=this.pagePiece('column:'+row.id+':'+index,{w:cw*k,h:r.height*k,paper:false,hitOnly:true,interactive:true,drawFn:()=>{}},column.hint??column.label,(left+cw*(index+.5)-box.width/2)*k,(box.height/2-cy)*k,.04);hintPiece.userData.nativeStatic=true;hintPiece.userData.tooltip=column.hint??column.label;this.pageContent.add(hintPiece);});
      }
      const controls=row.controls??[];
      if(controls.length){
        const isTabs=row.id==='pawn-tabs'||row.id==='health-tabs',matrix=r.matrix;
        const inline=r.controlTop===2&&(!!row.compact||controls.length<=2&&!row.detail);
        let left=r.x,space=r.width;
        if(matrix){left+=104;space-=104+(row.value?142:0);}
        else if(inline&&!isTabs&&row.label){left+=r.labelWidth;space-=r.labelWidth+4;}
        if(row.input){space=controls.length*28;left=r.x+r.width-space;}
        const columns=r.controlColumns||controls.length,gap=matrix?4:5,cw=(space-gap*(columns-1))/columns;
        const ch=matrix?r.controlHeight:r.controlHeight;
        const y=matrix?top+2+ch/2:top+r.controlTop+ch/2;
        controls.forEach((control,index)=>{const piece=this.control(this.rowControl(row,control),(left+(index%columns)*(cw+gap)+cw/2-box.width/2)*k,(box.height/2-y-Math.floor(index/columns)*(ch+5))*k,cw*k,ch*k,.075);this.pageContent.add(piece);});
      }
      if(row.input){
        const rightControls=controls.length?controls.length*28+6:0,inputW=Math.max(70,r.width-r.labelWidth-rightControls-8);
        const piece=this.pagePiece(row.id,{w:inputW*k,h:.25,uvPadding:1,textureWidth:Math.ceil(inputW*2),textureHeight:50,bgColor:'#fff9eb',seed:3007,depth:.018,interactive:true,
          drawFn:(ctx,wp,hp)=>{ctx.save();ctx.scale(wp/inputW,hp/25);ctx.fillStyle=PALETTE.inkDark;ctx.textAlign='left';ctx.font=this.font(13);ctx.fillText(row.input!.value||row.input!.placeholder||'',7,17,inputW-14);ctx.restore();}},JSON.stringify([row.input.value,row.input.placeholder,this.textFontRevision]),(r.x+r.labelWidth+8+inputW/2-box.width/2)*k,(box.height/2-top-15)*k,.08,undefined,row.input);
        this.pageContent.add(piece);
      }
    }
    if(this.maxScroll>0){
      const trackHeight=box.body.height,thumbHeight=Math.max(28,trackHeight*trackHeight/box.contentHeight),thumbY=box.body.y+(trackHeight-thumbHeight)*this.scroll/this.maxScroll;
      const x=box.width-10;
      const track=this.pagePiece('native-scrollbar',{w:.08,h:trackHeight*k,paper:false,interactive:true,drawFn:(ctx,wp,hp)=>{ctx.fillStyle='rgba(68,50,29,.15)';ctx.fillRect(wp*.22,0,wp*.56,hp);}},String(trackHeight),(x-box.width/2)*k,(box.height/2-box.body.y-trackHeight/2)*k,.1);
      track.userData.nativeStatic=true;track.userData.tooltip='Faire défiler : molette, cliquer ou glisser la barre';this.pageGroup.add(track);
      const thumb=this.pagePiece('native-scroll-thumb',{w:.07,h:thumbHeight*k,uvPadding:1,bgColor:PALETTE.sageMountain,seed:411,interactive:true,depth:.012,drawFn:()=>{}},String(thumbHeight),(x-box.width/2)*k,(box.height/2-thumbY-thumbHeight/2)*k,.12);
      thumb.userData.nativeStatic=true;thumb.userData.tooltip=track.userData.tooltip;this.pageGroup.add(thumb);
    }
    if(page.actions?.length){
      const columns=Math.min(page.actions.length,Math.max(1,Math.floor((box.width-24)/110))),cellWidth=(box.width-24)/columns;
      page.actions.forEach((control,index)=>{const row=Math.floor(index/columns),x=12+(index%columns+.5)*cellWidth,y=box.height-box.footer+6+row*32+13;this.control(control,(x-box.width/2)*k,(box.height/2-y)*k,(cellWidth-6)*k,.26,.09);});
    }
    if(page.visual){
      this.globe??=new NativeGlobe(tile=>{try{this.options.onActivate?.('world:select-tile');this.page?.visual?.onSelect(tile);}catch(error){this.options.onError(String(error));}});
      this.pageGroup.add(this.globe);this.globe.visible=true;const visualWidth=Math.min(330,box.width*.42);
      this.globe.position.set((-box.width/2+12+visualWidth/2)*k,(box.height/2-box.header-box.body.height/2)*k,.35);
      this.globe.scale.setScalar(Math.min(visualWidth*.44,box.body.height*.43)*k);
      this.globe.setSurface(page.visual.surface,page.visual.roads);this.globe.setSelected(page.visual.selected);this.globe.setMarkers((page.visual.markers??[]).map(marker=>({...marker,label:marker.label??('Case '+marker.tile)})));this.sceneRevision++;
    }
    if(page.portrait){
      const source=page.portrait.url;let image=this.portraitImages.get(source);
      if(!image){image=new Image();this.portraitImages.set(source,image);image.onload=()=>{if(!this.closed&&this.page?.portrait?.url===source){this.rebuildPage(true);this.invalidate();}};image.src=source;}
      if(image.complete&&image.naturalWidth){const portrait=image;this.pagePiece('page:portrait',{w:.43,h:.47,depth:.018,bgColor:PALETTE.kraftBase,seed:2081,drawFn:(ctx,wp,hp)=>ctx.drawImage(portrait,0,0,wp,hp)},source,w/2-.7,h/2-.32,.07);}
      if(this.portraitImages.size>24)for(const [url,old]of this.portraitImages){if(url===source)continue;old.onload=null;old.onerror=null;this.portraitImages.delete(url);if(this.portraitImages.size<=16)break;}
    }
    this.retirePagePieces();this.focusIndex=focusedId===undefined?-1:this.pageControls.filter(hit=>!hit.control?.disabled).findIndex(hit=>String(hit.piece.userData.nativeId)===focusedId);
    if(this.editingPaintDirty){this.editingPaintDirty=false;this.editRepaint?.();}
    this.rebindPage(page);
    this.scene.updateMatrixWorld(true);
  }
  private drawPageRow(ctx:CanvasRenderingContext2D,r:NativeRowBox,top:number,rng:()=>number,box:NativePageBox):void{
    const row=r.row,ink='#151b13';ctx.fillStyle=ink;ctx.textAlign='left';ctx.font=this.font(13,row.emphasis==='heading');
    if(row.emphasis==='muted')ctx.fillStyle='#706450';
    if(row.columns){
      ctx.fillStyle='#4d5c46';ctx.font=this.font(12,true);ctx.fillText(row.label,r.x,top+24);
      const tail=row.value?142:0,left=r.x+104,cw=(r.width-104-tail)/row.columns.length;
      row.columns.forEach((column,index)=>{const lines=wrapNativeText(column.label,cw-5,this.measure,11.5);ctx.textAlign='center';ctx.font=this.font(11.5,true);lines.slice(0,2).forEach((line,lineIndex)=>ctx.fillText(line,left+cw*(index+.5),top+14+lineIndex*14,cw-4));});
      if(row.value){ctx.textAlign='left';ctx.fillText(row.value,r.x+r.width-tail+6,top+24,tail-10);}return;
    }
    if(r.matrix){ctx.font=this.font(13,true);ctx.fillText(row.label,r.x,top+r.height/2+4,98);if(row.value){ctx.font=this.font(12);ctx.fillStyle='#685c48';const lines=wrapNativeText(row.value,132,this.measure,12);lines.slice(0,2).forEach((line,i)=>ctx.fillText(line,r.x+r.width-138,top+15+i*14,132));}return;}
    if(row.id==='pawn-tabs'||row.id==='health-tabs')return;
    if(row.meter){
      const meter=row.meter,labelWidth=Math.min(r.width*.45,138),barX=r.x+labelWidth,barW=Math.max(40,r.width-labelWidth-8),fraction=THREE.MathUtils.clamp(meter.value/(meter.max??1),0,1);
      ctx.font=this.font(12.5);ctx.fillText(row.label,r.x,top+15,labelWidth-5);
      if(meter.passion){ctx.fillStyle='#b45c29';ctx.font=this.font(10,true);ctx.fillText('♥'.repeat(meter.passion),r.x+labelWidth-24,top+24);}
      drawHandRect(ctx,barX,top+5,barW,12,'rgba(70,58,38,.20)',ink,.7,rng);
      if(fraction>0)drawHandRect(ctx,barX+.8,top+5.8,Math.max(.5,(barW-1.6)*fraction),10.4,meter.color??'#78975c',null,.5,rng);
      ctx.fillStyle=ink;ctx.font=this.font(11,true);ctx.textAlign='center';ctx.fillText(meter.label??row.value??'',barX+barW/2,top+15,barW-4);ctx.textAlign='left';
      if(meter.secondary){const secondary=meter.secondary;ctx.fillStyle='rgba(70,58,38,.15)';ctx.fillRect(barX,top+20,barW,3);ctx.fillStyle=secondary.color??'#bd994b';ctx.fillRect(barX,top+20,barW*THREE.MathUtils.clamp(secondary.value/(secondary.max??1),0,1),3);}
      return;
    }
    if(row.label){ctx.font=this.font(row.emphasis==='heading'?13.5:13,row.emphasis==='heading');r.labelLines.forEach((line,i)=>ctx.fillText(line,r.x,top+15+i*17,row.value||row.input?r.labelWidth-5:r.width));}
    if(row.value&&!(row.controls?.length&&r.controlTop===2)){ctx.font=this.font(13);ctx.fillStyle='#364c38';r.valueLines.forEach((line,i)=>ctx.fillText(line,r.x+r.labelWidth+6,top+15+i*17,r.width-r.labelWidth-6));}
    if(r.detailLines.length){ctx.font=this.font(12);ctx.fillStyle='#6b5b45';const y=top+Math.max(r.labelLines.length,r.valueLines.length,1)*17+15;r.detailLines.forEach((line,i)=>ctx.fillText(line,r.x,y+i*16,r.width));}
    if(row.emphasis==='heading'){ctx.strokeStyle='rgba(67,50,28,.2)';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(r.x,top+r.height-2);ctx.lineTo(r.x+r.width,top+r.height-2);ctx.stroke();}
  }
  private wrap(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,width:number,lineHeight:number,maxLines=20):number{
    const words=text.split(/\s+/);let line='',lines=0;
    for(const word of words){const next=line?`${line} ${word}`:word;
      if(ctx.measureText(next).width>width&&line){ctx.fillText(line,x,y,width);y+=lineHeight;line=word;if(++lines>=maxLines)return lines;}else line=next;}
    if(line&&lines<maxLines){ctx.fillText(line,x,y,width);lines++;}return lines;
  }
  private control(control:NativeControl,x:number,y:number,w:number,h:number,z:number):CardboardPiece{
    const cssW=w*100,cssH=h*100;
    const draw:CardboardDraw=(ctx,wp,hp,rng)=>{
      ctx.save();ctx.scale(wp/cssW,hp/cssH);ctx.fillStyle=control.disabled?'#8b7b60':PALETTE.inkDark;ctx.textAlign='center';
      const icon=control.icon&&cssH>=40;
      if(icon)drawHandPaintedIcon(ctx,control.icon!,cssW/2,14,9,PALETTE.inkDark,PALETTE.creamPaper);
      const font=13,available=cssW-(control.select?18:10);
      ctx.font=this.font(font,true);
      let label=control.label;
      while(label.length>1&&this.measure(label,font,true)>available)label=label.slice(0,-1);
      if(label!==control.label)label=label.trimEnd()+'…';
      ctx.fillText(label,cssW/2-(control.select?4:0),icon?cssH-7:control.caption?14:cssH/2+4,available);
      if(control.caption){ctx.font=this.font(11);ctx.fillStyle='#5b5b42';ctx.fillText(control.caption,cssW/2,cssH-5,cssW-6);}
      if(control.select){ctx.fillStyle=PALETTE.inkDark;ctx.beginPath();ctx.moveTo(cssW-12,cssH/2-2);ctx.lineTo(cssW-5,cssH/2-2);ctx.lineTo(cssW-8.5,cssH/2+3);ctx.closePath();ctx.fill();}
      if(control.active)drawMarkerLine(ctx,5,cssH-3,cssW-5,cssH-3,PALETTE.inkDark,1,rng);
      ctx.restore();
    };
    const piece=this.pagePiece(control.id,{w,h,depth:.018,bevel:.012,uvPadding:1,textureWidth:Math.max(32,Math.ceil(cssW*2)),textureHeight:Math.max(32,Math.ceil(cssH*2)),bgColor:control.disabled?PALETTE.kraftLight:control.active?PALETTE.ochre:control.color??PALETTE.sageMountain,seed:this.seed(control.id),interactive:true,drawFn:draw},
      JSON.stringify([control.label,control.caption,control.icon,!!control.active,!!control.disabled,!!control.select,this.textFontRevision]),x,y,z,control);
    this.pageGroup.add(piece);return piece;
  }
  private closeControl():NativeControl{return {id:'page:close',label:'×',onActivate:()=>{if(this.page?.onClose)this.page.onClose();else this.options.onEscape();}};}
  private rowControl(row:NativeRow,control:NativeControl):NativeControl{
    return row.compact&&row.value?{...control,hint:[row.value,control.hint??control.label].filter(Boolean).join(' · ')}:control;
  }
  private rebindPage(page:NativePage|null):void{
    if(!page)return;
    const controls=new Map<string,NativeControl>(),inputs=new Map<string,NonNullable<NativeRow['input']>>(),hints=new Map<string,string>();
    for(const row of page.rows){
      for(const control of row.controls??[])controls.set(control.id,this.rowControl(row,control));if(row.input)inputs.set(row.id,row.input);
      hints.set('row-hint:'+row.id,this.rowHint(row));
      row.columns?.forEach((column,index)=>hints.set('column:'+row.id+':'+index,column.hint??column.label));
    }
    for(const control of page.actions??[])controls.set(control.id,control);
    controls.set('page:close',this.closeControl());
    for(const record of this.retainedPagePieces.values()){
      const id=String(record.piece.userData.nativeId);
      const control=controls.get(id),input=inputs.get(id);
      record.hit.control=control;record.hit.input=input;
      const hint=control?.hint??control?.label??hints.get(id)??record.piece.userData.tooltip??'';
      if(this.hintOwner===record.piece&&record.piece.userData.tooltip!==hint)this.clearHint();
      record.piece.userData.tooltip=hint;record.piece.userData.nativeDisabled=!!control?.disabled;
      if(this.editing===record.hit&&input&&this.editor)this.editor.maxLength=input.maxLength??2048;
    }
    const dropdown=this.dropdown;
    if(dropdown){
      const owner=controls.get(dropdown.controlId),select=owner?.select;
      if(page.id!==dropdown.pageId||owner?.disabled||!select){this.closeDropdown();return;}
      const options=new Map(select.options.map(option=>['select-option:'+dropdown.controlId+':'+option.value,option]));
      for(const piece of dropdown.pieces){
        const option=options.get(String(piece.userData.nativeId));if(!option)continue;
        const hint=option.hint??option.label,hit=this.hits.get(piece.userData.mesh);
        if(this.hintOwner===piece&&piece.userData.tooltip!==hint)this.clearHint();
        piece.userData.tooltip=hint;
        if(hit?.control)hit.control.hint=hint;
      }
    }
  }
  private pagePiece(id:string,options:CardboardPieceOptions,ink:string,x:number,y:number,z:number,control?:NativeControl,input?:NativeRow['input']):CardboardPiece{
    this.pagePieceIds.add(id);
    const geometry=JSON.stringify([options.w,options.h,options.depth??.044,options.bevel??.026,options.seed??1,!!options.interactive,options.paper,options.hitOnly,options.cacheBackground,options.textureWidth,options.textureHeight,options.uvPadding]);
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
    this.hintScroll=0;this.hintMaxScroll=0;
    if(this.hintPiece){this.unregister(this.hintPiece);this.hintPiece=undefined;this.invalidate();}
  }
  private updateHint(hit:Hit|undefined,x:number,y:number):void{
    const text=hit?.control?.hint??hit?.piece.userData.tooltip??'';
    if(!hit||!text){this.clearHint();return;}
    if(this.hintOwner===hit.piece)return;this.clearHint();this.hintOwner=hit.piece;
    this.hintTimer=setTimeout(()=>{
      if(this.closed||this.hintOwner!==hit.piece)return;
      const maxWidth=Math.min(420,this.width-24),raw=text.split('\n'),requested=Math.min(maxWidth,Math.max(70,...raw.map(line=>this.measure(line,13)))+20);
      const lines=wrapNativeText(text,requested-20,this.measure,13),width=Math.min(maxWidth,Math.max(70,...lines.map(line=>this.measure(line,13)))+20),height=Math.min(this.height-20,lines.length*17+16);
      const count=lines.length*17+16>height?Math.max(1,Math.floor((height-30)/17)):lines.length;this.hintMaxScroll=Math.max(0,lines.length-count);this.hintScroll=0;
      const z=2,factor=1-z/HUD_DISTANCE,piece=this.art.createPiece({w:width*.01,h:height*.01,depth:.02,uvPadding:1,textureWidth:Math.ceil(width*2),textureHeight:Math.ceil(height*2),seed:347,bgColor:PALETTE.creamPaper,
        drawFn:(ctx,wp,hp)=>{ctx.save();ctx.scale(wp/width,hp/height);ctx.fillStyle=PALETTE.inkDark;ctx.textAlign='left';ctx.font=this.font(13);const scrolling=this.hintMaxScroll>0;lines.slice(scrolling?this.hintScroll:0,scrolling?this.hintScroll+count:lines.length).forEach((line,i)=>ctx.fillText(line,10,20+i*17,width-20));if(scrolling){ctx.font=this.font(11);ctx.fillStyle='#6b5b45';ctx.fillText('Molette : suite',10,height-7);ctx.fillStyle='#78975c';ctx.fillRect(width-6,6+(height-12)*this.hintScroll/lines.length,3,Math.max(8,(height-12)*count/lines.length));}ctx.restore();}});
      const left=THREE.MathUtils.clamp(x+16+width>this.width?x-width-12:x+16,8,this.width-width-8),top=THREE.MathUtils.clamp(y+18+height>this.height?y-height-8:y+18,8,this.height-height-8);
      piece.userData.nativeId='native-tooltip';piece.scale.setScalar(this.uiScale*factor);piece.setBaseTransform((left+width/2-this.width/2)*this.visH/this.height*factor,(this.height/2-top-height/2)*this.visH/this.height*factor,z);this.setPose(piece,0);this.hudRoot.add(piece);this.hintPiece=piece;this.invalidate();
    },350);
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
      target.redraw((ctx,wp,hp)=>{const q=wp/(target.userData.w*100);ctx.font=this.font(13*q);ctx.textAlign='left';ctx.fillStyle=PALETTE.inkDark;
        const start=input.selectionStart,end=input.selectionEnd,offset=wp*.07,text=this.editingValue;
        const before=ctx.measureText(text.slice(0,start)).width,selected=ctx.measureText(text.slice(start,end)).width;
        const shift=Math.max(0,before-wp*.86);ctx.save();ctx.beginPath();ctx.rect(wp*.06,hp*.06,wp*.88,hp*.88);ctx.clip();
        if(end>start){ctx.fillStyle='#d9ae68';ctx.fillRect(offset+before-shift,hp/2-8*q,selected,17*q);ctx.fillStyle=PALETTE.inkDark;}
        ctx.fillText(text,offset-shift,hp/2+4*q);ctx.fillRect(offset+before-shift,hp/2-8*q,Math.max(1,q),17*q);ctx.restore();});this.invalidate();};
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
