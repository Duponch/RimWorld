import * as THREE from 'three/webgpu';
import type {MaterialPile, Pawn, World} from '../sim/types';
import {TICKS_PER_DAY} from '../sim/types';
import {isColonist} from '../sim/affiliation';
import {calendarTick} from '../sim/calendar';
import {climateDate} from '../sim/site-climate';
import {outdoorTemperature} from '../sim/temperature';
import {perceivedWeather} from '../sim/weather';
import {WEATHER} from '../sim/weather-definitions';
import {windIntensity} from '../sim/wind-rules';
import {activeColdSnap} from '../sim/cold-snap';
import {activeEclipse} from '../sim/eclipse';
import {ITEM_DEFINITIONS, type ItemId} from '../sim/items';
import {colonyPile} from '../sim/materials';
import {captureFoodReadability, type FoodReadability} from '../sim/food-readability';
import {appearanceOf} from '../sim/pawn-appearance';
import {apparelAppearance} from '../render/character-apparel';
import {humanLimbVisualMask} from '../render/human-anatomy-presentation';
import {portraitDataUrl, portraitExpressionOf} from '../ui/pawn-portrait';
import {knownBuilding256, knownNutrition256, knownPile256, knownPosition256, knownStockCounts256} from '../ui/exploration-readers-256';
import {readStatusAlerts, type StatusAlert} from '../ui/status-alerts';
import type {NativePage, NativeRow} from './native-contract';
import {NotificationFocusCycle,type NotificationTarget} from '../ui/notification-focus';
import {readNativeDomainAlerts,type NativeDomainAlert} from './native-domain-alerts';
import {STORAGE_FILTER_TREE,type StorageFilterNode} from '../ui/storage-filter-tree';
import {modelIconUrl} from '../ui/pictograms';
type HudAlert=StatusAlert&{domain?:NativeDomainAlert};
import {PrototypeCardboardArt, PALETTE, createCutoutRectShape, createMaskingTape, drawHandBlob, drawHandRect, drawMarkerLine, type CardboardPiece, type CardboardPieceOptions} from './prototype-art';

export interface NativeHudAnchors {
  topCenter: THREE.Group;
  topLeft: THREE.Group;
  topRight: THREE.Group;
  bottomRight: THREE.Group;
}
export interface NativeHudActions {
  selectPawn(id: number): void;
  speed(value: number): void;
  showPage(page: NativePage): void;
  showViewControls?:()=>void;
  view?: (action: NativeHudViewAction)=>void;
  focus?: (target:NotificationTarget,tab?:StatusAlert['tab'])=>void;
  domain?: (alert:NativeDomainAlert)=>void;
  campaign?: (target:NonNullable<StatusAlert['campaign']>)=>void;
  context?: (target:NonNullable<StatusAlert['context']>)=>void;
}
export type NativeHudViewAction='walls'|'roofs'|'foliage'|'zones'|'home'|'camera';
export interface NativeHudViewState {walls:string;roofs:boolean;foliage:boolean;zones:boolean;camera:string}
interface ResourceRecord {
  item: ItemId;
  stock: number;
  ground: number;
  carried: number;
  inventory: number;
  equipped: number;
  delivered: number;
}
interface ResourceTag {
  piece: CardboardPiece;
  label: string;
  value: string;
  color: string;
  item?: ItemId;
  level?: number;
  branch?: {id:string;open:boolean};
  screenWidth?: number;
  signature: string;
}
interface PortraitCard {
  piece: CardboardPiece;
  pawnId: number;
  index: number;
  name: string;
  mood: number;
  skin: string;
  shirt: string;
  sleeping: boolean;
  selected: boolean;
  image?: HTMLImageElement;
  loaded: boolean;
  appearanceKey: string;
  signature: string;
}
const PORTRAITS_PER_PAGE = 6;
const FONT = '"Comic Sans MS", "Chalkboard SE", Georgia, serif';
const quadrums = ['avrimai', 'juillêt', 'septobre', 'décembary'] as const;
const speeds = [
  {label: '❚❚', speed: 0, title: 'Pause'},
  {label: '▶', speed: 1, title: 'Lecture ×1'},
  {label: 'x3', speed: 3, title: 'Vitesse ×3'},
  {label: 'x6', speed: 6, title: 'Vitesse ×6'}
] as const;
const hex = (value: number) => `#${value.toString(16).padStart(6, '0')}`;
const rounded = (value: number) => Math.round(Math.max(0, Math.min(100, value)));
const amount = (value: number) => value.toLocaleString('fr-FR', {maximumFractionDigits: 2});

function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number): void {
  ctx.fillText(text, x, y, Math.max(1, width));
}
/** Wrap ink by measured glyph width, never by browser layout. The full source
 * remains on the native details page when a compact card has fewer lines. */
function inkLines(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Real confirmed HUD values painted on the original prototype's physical
 * cards. No hidden element, HTML layout or synthetic click is involved. */
export class NativeHudCards {
  private readonly alertFocus=new NotificationFocusCycle();
  private readonly colonistsGroup = new THREE.Group();
  private readonly resourcesGroup = new THREE.Group();
  private readonly alertsGroup = new THREE.Group();
  private readonly timeGroup = new THREE.Group();
  private readonly fpsGroup = new THREE.Group();
  private readonly ownedPieces = new Set<CardboardPiece>();
  private readonly rail: THREE.Mesh;
  private readonly tags: ResourceTag[] = [];
  private readonly resourceImages=new Map<ItemId,HTMLImageElement>();
  private readonly resourceExpanded=new Set(['foods','manufactured','raw-resources']);
  private resourceSignature='';
  private resourcePage=0;
  private readonly speedButtons: CardboardPiece[] = [];
  private readonly viewButtons=new Map<NativeHudViewAction,CardboardPiece>();
  private readonly alertHandle: CardboardPiece;
  private readonly alertHandleGroup=new THREE.Group();
  private portraitCapacity=PORTRAITS_PER_PAGE;
  private viewportWidth=1440;
  private viewportHeight=1000;
  private rightDockOpen=false;
  private notificationsAutoHide=false;
  private rightDockOffset=3.16;
  private viewState:NativeHudViewState={walls:'hauts',roofs:false,foliage:true,zones:true,camera:'iso'};
  private readonly weatherPiece: CardboardPiece;
  private readonly miniSun: THREE.Mesh;
  private readonly miniCloud: THREE.Mesh;
  private readonly fpsPiece: CardboardPiece;
  private readonly previousButton: CardboardPiece;
  private readonly nextButton: CardboardPiece;
  private readonly rosterButton: CardboardPiece;
  private readonly allAlertsButton: CardboardPiece;
  private portraits: PortraitCard[] = [];
  private alertPieces: CardboardPiece[] = [];
  private world?: World;
  private colonists: Pawn[] = [];
  private resources: ResourceRecord[] = [];
  private alerts: HudAlert[] = [];
  private food?: FoodReadability;
  private physicalNutrition = 0;
  private selectedIds = new Set<number>();
  private page = 0;
  private portraitIds = '';
  private alertSignature = '';
  private weatherSignature = '';
  private weatherReadout = {clock: '—', date: '—', weather: '—', temperature: '—', condition: '', wind: '—'};
  private speedValue = -1;
  private fpsValue = -1;
  private shown = true;
  private disposed = false;

  constructor(private readonly art: PrototypeCardboardArt, anchors: NativeHudAnchors, private readonly actions: NativeHudActions) {
    anchors.topCenter.add(this.colonistsGroup);
    anchors.topLeft.add(this.resourcesGroup);
    anchors.topRight.add(this.alertsGroup,this.fpsGroup,this.alertHandleGroup);
    anchors.bottomRight.add(this.timeGroup);

    this.rail = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.035, 0.025), new THREE.MeshStandardMaterial({color: 0x7c5c3e, roughness: 0.98}));
    this.rail.position.set(0, -0.08, -0.01);
    this.colonistsGroup.add(this.rail);

    this.previousButton=this.smallButton('‹',810,()=>this.changePage(-1));
    this.previousButton.userData.tooltip='Colons précédents';
    this.previousButton.userData.nativeId='hud:colonists:previous';
    this.nextButton=this.smallButton('›',833,()=>this.changePage(1));
    this.nextButton.userData.tooltip='Colons suivants';
    this.nextButton.userData.nativeId='hud:colonists:next';
    this.rosterButton=this.smallButton('≡',853,()=>this.showRoster());
    this.rosterButton.userData.tooltip='Liste complète des colons';
    this.rosterButton.userData.nativeId='hud:colonists:list';
    this.colonistsGroup.add(this.previousButton,this.nextButton,this.rosterButton);
    this.alertHandle=this.smallButton('‹',9281,()=>this.setRightDockOpen(!this.rightDockOpen));
    this.alertHandle.userData.nativeId='hud:alerts:handle';
    this.alertHandle.userData.tooltip='Afficher les notifications';
    this.alertHandleGroup.add(this.alertHandle);
    this.alertHandle.setBaseTransform(-.14,-.56,.1);

    this.weatherPiece = this.makePiece({w: 2.76, h: .96, depth: 0.046, bgColor: PALETTE.creamPaper, bevel: 0.038, seed: 209, interactive: true,
      drawFn: (ctx, w, h, rng) => this.drawWeather(ctx, w, h, rng), onClick: () => this.showWeather()});
    // Time belongs at bottom right in Elsewhere; its artwork stays literal.
    this.weatherPiece.setBaseTransform(-1.38, 2.04, 0, .006);
    this.timeGroup.add(this.weatherPiece);
    const miniSun = this.miniSun = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.03, 7), new THREE.MeshStandardMaterial({color: 0xe8ab3a, roughness: 0.98, flatShading: true}));
    miniSun.rotation.x = Math.PI / 2;
    miniSun.position.set(-1.05, .12, .055);
    this.weatherPiece.add(miniSun);
    const miniCloud = this.miniCloud = new THREE.Mesh(new THREE.ExtrudeGeometry(createCutoutRectShape(0.22, 0.10, 0.025, 88), {depth: 0.032, bevelEnabled: false}), art.cardboardEdgeMat);
    miniCloud.position.set(-1.02, .03, .055);
    this.weatherPiece.add(miniCloud);
    const weatherTape = createMaskingTape(0.18, 0.05, -0.35);
    weatherTape.position.set(1.12, .43, .048);
    this.weatherPiece.add(weatherTape);

    speeds.forEach((cfg, idx) => {
      const piece = this.makePiece({w: .48, h: .37, depth: .034, bgColor: PALETTE.kraftBase, bevel: .025, seed: 310 + idx * 23, interactive: true, tooltip: cfg.title,
        drawFn: (ctx, w, h, rng) => {
          const isAct = this.speedValue === cfg.speed;
          if (isAct) drawHandBlob(ctx, w / 2, h / 2, Math.min(w, h) * 0.36, 'rgba(255,248,230,0.28)', '#261e18', 2.5, rng);
          ctx.save(); ctx.translate(w / 2, h / 2 + 12); ctx.rotate(idx % 2 === 0 ? -0.06 : 0.06);
          ctx.fillStyle = isAct ? '#fff9eb' : '#261e18'; ctx.font = `bold 40px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(cfg.label, 0, 0); ctx.restore();
        }, onClick: () => { if (this.world) this.actions.speed(cfg.speed); }});
      piece.userData.nativeId=`hud:speed:${cfg.speed}`;
      piece.setBaseTransform(-1.98+idx*.54,1.31,0,idx%2===0?-.012:.012);
      this.timeGroup.add(piece); this.speedButtons.push(piece);
    });

    (['walls','roofs','foliage','zones','home','camera'] as const).forEach((action,index)=>{
      const button=this.makePiece({w:.32,h:.32,depth:.028,bgColor:PALETTE.creamPaper,seed:9297+index*17,interactive:true,
        drawFn:(ctx,w,h,rng)=>this.drawViewControl(action,ctx,w,h,rng),onClick:()=>this.actions.view?.(action)});
      button.userData.nativeId=`hud:view:${action}`;
      button.setBaseTransform(-1.98+index*.36,.87,0,index%2===0?-.012:.012);
      this.timeGroup.add(button);this.viewButtons.set(action,button);
    });
    this.setViewState(this.viewState);
    this.fpsPiece = this.makePiece({w: .72, h: .22, depth: 0.03, bgColor: PALETTE.creamPaper, seed: 929, hasBorder: false,
      drawFn: (ctx, w, h) => this.drawCaption(ctx, w, h, `${this.fpsValue < 0 ? '—' : this.fpsValue} FPS`,72,22)});
    this.fpsPiece.setBaseTransform(-.40,-.12,.08);
    this.fpsGroup.add(this.fpsPiece);
    this.allAlertsButton = this.makePiece({w: 1.46, h: .25, depth: 0.036, bgColor: PALETTE.creamPaper, seed: 973, interactive: true,
      drawFn: (ctx, w, h) => this.drawCaption(ctx, w, h, `${this.alerts.length} alertes · tout voir`,146,25), onClick: () => this.showAlerts()});
    this.allAlertsButton.userData.nativeId='hud:alerts:all';
    this.allAlertsButton.setBaseTransform(-.73,-.25,0);
    this.alertsGroup.add(this.allAlertsButton);
    this.setViewport(1440,1000,.01);
    this.setVisible(false);
  }

  /** Snapshot reading may be called at 200 ms cadence. Uploads require changed
   * visible primitives; unchanged snapshots and ticks never repaint a card. */
  update(world: World | undefined, speed: number, fps: number): void {
    if (this.disposed) return;
    const nextFps = Number.isFinite(fps) ? Math.max(0, Math.round(fps)) : -1;
    if (this.fpsValue !== nextFps) { this.fpsValue = nextFps; this.fpsPiece.redraw(); }
    if (speed !== this.speedValue) {
      this.speedValue = speed;
      this.speedButtons.forEach((piece, idx) => { piece.userData.active = speeds[idx]!.speed === speed; piece.redraw(undefined, piece.userData.active ? PALETTE.terracotta : PALETTE.kraftBase); });
    }
    if (this.world === world) return;
    this.world = world;
    if (!world) { this.setVisible(false); return; }
    this.colonists = world.pawns.filter(p => isColonist(p) && !p.prisoner && p.state !== 'dead').sort((a, b) => a.id - b.id);
    this.page = Math.max(0, Math.min(this.page, Math.ceil(this.colonists.length / this.portraitCapacity) - 1));
    this.food = captureFoodReadability(world, {pileVisible: pile => knownPile256(world, pile), structureVisible: structure => knownBuilding256(world, structure)});
    this.physicalNutrition = knownNutrition256(world);
    this.readResources(world);
    const rank=(alert:HudAlert)=>alert.domain?.severity==='danger'||/critical|downed|bleeding|threat|manhunter|death|fire|infection|malnutrition/.test(alert.key)?0:alert.domain?.severity==='warning'?1:2;
    this.alerts = [...readStatusAlerts(world, this.food),...readNativeDomainAlerts(world,speed).map(domain=>({...domain,domain}))].sort((a,b)=>rank(a)-rank(b));
    this.refreshPortraits(world);
    this.refreshResources();
    this.refreshAlerts();
    this.refreshWeather(world);
  }

  setSelection(ids: readonly number[]): void {
    if (ids.length === this.selectedIds.size && ids.every(id => this.selectedIds.has(id))) return;
    this.selectedIds = new Set(ids);
    if (this.world) this.refreshPortraits(this.world);
  }

  /** Layout is expressed in screen pixels, converted only by the native stage's
   * projection. Canvas measurements decide ink wrapping, never hit regions. */
  setViewport(width:number,height:number,unitsPerPixel:number):void {
    this.viewportWidth=width;this.viewportHeight=height;
    const scale=100*unitsPerPixel;
    for(const group of [this.colonistsGroup,this.resourcesGroup,this.alertsGroup,this.timeGroup,this.fpsGroup,this.alertHandleGroup])group.scale.setScalar(scale);
    this.alertsGroup.position.x=this.rightDockOffset*scale;
    const capacity=Math.max(1,Math.min(12,Math.floor((width-560)/78)));
    if(capacity!==this.portraitCapacity){
      this.portraitCapacity=capacity;this.page=0;this.portraitIds='';
      if(this.world)this.refreshPortraits(this.world);
    }
    // The bottom shelf remains below the legacy-sized time and view controls.
    this.timeGroup.position.y=.4*scale;
    this.refreshAlerts();
    if(this.world)this.refreshResources();
  }

  setViewState(state:Partial<NativeHudViewState>):void {
    this.viewState={...this.viewState,...state};
    const labels:Record<NativeHudViewAction,string>={walls:`Murs : ${this.viewState.walls}`,roofs:`Toits : ${this.viewState.roofs?'visibles':'masqués'}`,
      foliage:`Feuillage : ${this.viewState.foliage?'visible':'masqué'}`,zones:`Zones : ${this.viewState.zones?'visibles':'masquées'}`,home:'Recentrer sur la colonie',camera:`Vue : ${this.viewState.camera}`};
    for(const [action,button] of this.viewButtons){
      const active=action==='roofs'?this.viewState.roofs:action==='foliage'?!this.viewState.foliage:action==='zones'?this.viewState.zones:action==='walls'?this.viewState.walls!=='hauts':action==='camera'?this.viewState.camera!=='iso':false;
      if(button.userData.tooltip!==labels[action]||button.userData.active!==active){button.userData.tooltip=labels[action];button.userData.active=active;button.redraw(undefined,active?PALETTE.sageMountain:PALETTE.creamPaper);}
    }
  }

  setRightDockOpen(open:boolean):void {
    if(this.rightDockOpen===open)return;
    this.rightDockOpen=open;
    this.alertHandle.userData.tooltip=open?'Replier les notifications':'Afficher les notifications';
    this.alertHandle.redraw((ctx,w,h)=>{ctx.font=`bold 38px ${FONT}`;ctx.fillStyle=PALETTE.inkDark;ctx.textAlign='center';ctx.fillText(open?'›':'‹',w/2,h/2+12);});
  }
  getRightDockOpen():boolean{return this.rightDockOpen;}
  setNotificationsAutoHide(enabled:boolean):void {
    this.notificationsAutoHide=enabled;
    this.alertHandleGroup.visible=enabled&&this.shown&&!!this.world&&this.alerts.length>0;
    if(!enabled)this.setRightDockOpen(true);
  }

  /** Returns true through the last changed frame, so the stage invalidates its
   * composed scene even when the drawer has just reached its resting pose. */
  animate(deltaSeconds:number):boolean {
    const target=this.rightDockOpen?0:3.16;
    const before=this.rightDockOffset;
    if(Math.abs(before-target)<.001){this.rightDockOffset=target;return false;}
    this.rightDockOffset=THREE.MathUtils.lerp(before,target,1-Math.exp(-Math.max(0,deltaSeconds)*15));
    if(Math.abs(this.rightDockOffset-target)<.001)this.rightDockOffset=target;
    this.alertsGroup.position.x=this.rightDockOffset*this.alertsGroup.scale.x;
    this.alertHandle.setBaseTransform(-.14-(3.16-this.rightDockOffset),-.56,.1);
    this.alertsGroup.visible=this.shown&&!!this.world&&(this.rightDockOpen||this.rightDockOffset<3.16);
    return true;
  }

  getRightDockBounds():{left:number;top:number;right:number;bottom:number} {
    return {left:this.viewportWidth-324+this.rightDockOffset*100,top:30,right:this.viewportWidth,bottom:Math.max(100,this.viewportHeight-370)};
  }

  private drawViewControl(action:NativeHudViewAction,ctx:CanvasRenderingContext2D,w:number,h:number,rng:()=>number):void {
    ctx.save();ctx.scale(w/32,h/32);ctx.strokeStyle=PALETTE.inkDark;ctx.fillStyle=PALETTE.inkDark;ctx.lineWidth=1.6;ctx.lineCap='round';ctx.lineJoin='round';
    if(action==='walls'){
      drawHandRect(ctx,7,8,18,16,PALETTE.creamPaper,PALETTE.inkDark,1.3,rng);
      for(const y of [13,19])drawMarkerLine(ctx,7,y,25,y,PALETTE.inkDark,1.2,rng);
      for(const [x,y] of [[13,8],[19,13],[13,19]])drawMarkerLine(ctx,x,y,x,y+5,PALETTE.inkDark,1.2,rng);
    }else if(action==='roofs'){
      ctx.beginPath();ctx.moveTo(5,15);ctx.lineTo(16,6);ctx.lineTo(27,15);ctx.lineTo(23,15);ctx.lineTo(23,25);ctx.lineTo(9,25);ctx.lineTo(9,15);ctx.closePath();ctx.fillStyle=PALETTE.terracotta;ctx.fill();ctx.stroke();
    }else if(action==='foliage'){
      drawMarkerLine(ctx,16,18,16,27,PALETTE.inkDark,2,rng);drawHandBlob(ctx,16,14,9,PALETTE.sageMountain,PALETTE.inkDark,1.3,rng);
    }else if(action==='zones'){
      ctx.setLineDash([3,2]);ctx.strokeRect(6,6,20,20);ctx.setLineDash([]);ctx.fillStyle=PALETTE.sageMountain;ctx.globalAlpha=.7;ctx.fillRect(8,8,16,16);
    }else if(action==='home'){
      ctx.beginPath();ctx.moveTo(6,15);ctx.lineTo(16,6);ctx.lineTo(26,15);ctx.moveTo(10,13);ctx.lineTo(10,25);ctx.lineTo(22,25);ctx.lineTo(22,13);ctx.stroke();
      ctx.strokeRect(14,19,4,6);
    }else{
      ctx.beginPath();ctx.moveTo(5,11);ctx.lineTo(18,11);ctx.lineTo(18,8);ctx.lineTo(25,8);ctx.lineTo(25,24);ctx.lineTo(5,24);ctx.closePath();ctx.stroke();
      ctx.beginPath();ctx.arc(15,17,5,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
  }

  setVisible(visible: boolean): void {
    this.shown = visible;
    this.colonistsGroup.visible = visible && !!this.world;
    this.resourcesGroup.visible = visible && !!this.world;
    this.alertsGroup.visible = visible && !!this.world && (this.rightDockOpen||this.rightDockOffset<3.16);
    this.timeGroup.visible = visible && !!this.world;
    this.alertHandleGroup.visible=this.notificationsAutoHide&&visible&&!!this.world&&this.alerts.length>0;
    // The discreet actual frame rate remains visible through pages/front screens.
    this.fpsGroup.visible = true;
  }

  get blocks(): readonly CardboardPiece[] {
    return [...this.ownedPieces].filter(piece => {
      for (let node: THREE.Object3D | null = piece; node; node = node.parent) if (!node.visible) return false;
      return true;
    });
  }
  get stats(): {portraits: number; colonists: number; resourceTypes: number; alerts: number; page: number; pages: number} {
    return {portraits: this.portraits.length, colonists: this.colonists.length, resourceTypes: this.resources.length, alerts: this.alerts.length, page: this.page + 1, pages: Math.max(1, Math.ceil(this.colonists.length / this.portraitCapacity))};
  }

  private makePiece(options: CardboardPieceOptions): CardboardPiece {
    const piece = this.art.createPiece(options); this.ownedPieces.add(piece); return piece;
  }
  private dropPiece(piece: CardboardPiece): void { this.ownedPieces.delete(piece); this.art.disposePiece(piece); }
  private drawCaption(ctx: CanvasRenderingContext2D, w: number, h: number, label: string,width=w/2.8,height=h/2.8): void {
    ctx.save();ctx.scale(w/width,h/height);ctx.font=`bold 13px ${FONT}`;ctx.fillStyle=PALETTE.inkDark;ctx.textAlign='center';fitText(ctx,label,width/2,height/2+4,width-12);ctx.restore();
  }
  private smallButton(label: string, seed: number, onClick: () => void): CardboardPiece {
    return this.makePiece({w: 0.34, h: 0.29, depth: 0.044, bgColor: PALETTE.kraftBase, bevel: 0.036, seed, interactive: true,
      drawFn: (ctx, w, h) => { ctx.font = `bold 38px ${FONT}`; ctx.fillStyle = PALETTE.inkDark; ctx.textAlign = 'center'; ctx.fillText(label, w / 2, h / 2 + 12); }, onClick});
  }
  private changePage(delta: number): void {
    const pages = Math.max(1, Math.ceil(this.colonists.length / this.portraitCapacity));
    this.page = (this.page + delta + pages) % pages;
    if (this.world) this.refreshPortraits(this.world);
  }

  private refreshPortraits(world: World): void {
    const start = this.page * this.portraitCapacity, shown = this.colonists.slice(start, start + this.portraitCapacity);
    const ids = `${this.page}:${shown.map(p => p.id).join(',')}`, changed = ids !== this.portraitIds;
    if (changed) {
      for (const entry of this.portraits) { if (entry.image) { entry.image.onload = null; entry.image.onerror = null; } this.dropPiece(entry.piece); }
      this.portraits = []; this.portraitIds = ids;
      shown.forEach((pawn, localIdx) => {
        const idx = start + localIdx;
        const entry = {pawnId: pawn.id, index: idx, name: pawn.name, mood: rounded(pawn.mood), skin: '#f2cfb1', shirt: PALETTE.sageMountain, sleeping: false, selected: this.selectedIds.has(pawn.id), loaded: false, appearanceKey: '', signature: ''} as PortraitCard;
        entry.piece = this.makePiece({w: .70, h: .96, depth: 0.042, bgColor: entry.selected ? PALETTE.ochre : PALETTE.kraftBase, bevel: 0.035, seed: idx * 41 + 105, interactive: true,
          drawFn: (ctx, w, h, rng) => this.drawColonist(entry, ctx, w, h, rng),
          onClick: () => { if (!this.world?.pawns.some(p => p.id === entry.pawnId && isColonist(p))) return; this.setSelection([entry.pawnId]); this.actions.selectPawn(entry.pawnId); }});
        const peg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), new THREE.MeshStandardMaterial({color: 0x9e7448, roughness: 0.96}));
        peg.position.set(0,.47,.03); peg.rotation.z = idx % 2 === 0 ? 0.08 : -0.08; entry.piece.add(peg);
        entry.piece.userData.nativeId=`hud:pawn:${pawn.id}`;
        entry.piece.setBaseTransform((localIdx-(shown.length-1)/2)*.78,-.52,0,idx%2===0?-.012:.012);
        this.colonistsGroup.add(entry.piece); this.portraits.push(entry);
      });
      this.rail.scale.x = Math.max(0.4, (shown.length-1)*.78+.4) / 3.4;
    }
    const apparel = new Map<number, MaterialPile[]>(), weapons = new Map<number, string>();
    const idsOnPage = new Set(shown.map(p => p.id));
    for (const pile of world.piles) {
      if (pile.owner.type === 'apparel' && idsOnPage.has(pile.owner.pawnId)) { const list = apparel.get(pile.owner.pawnId) ?? []; list.push(pile); apparel.set(pile.owner.pawnId, list); }
      else if (pile.owner.type === 'equipment' && idsOnPage.has(pile.owner.pawnId)) weapons.set(pile.owner.pawnId, pile.item);
    }
    this.portraits.forEach((entry, idx) => {
      const pawn = shown[idx]!, appearance = appearanceOf(pawn, world.seed), look = apparelAppearance(apparel.get(pawn.id)), expression = portraitExpressionOf(pawn), limbMask = humanLimbVisualMask(pawn);
      entry.name = pawn.name; entry.mood = rounded(pawn.mood); entry.selected = this.selectedIds.has(pawn.id); entry.sleeping = expression !== 'awake'; entry.skin = hex(appearance.skinColor); entry.shirt = look.color === undefined ? PALETTE.sageMountain : hex(look.color);
      const appearanceKey = JSON.stringify([appearance, look.signature, expression, limbMask, weapons.get(pawn.id)]);
      if (entry.appearanceKey !== appearanceKey) {
        entry.appearanceKey = appearanceKey; entry.loaded = false;
        if (entry.image) { entry.image.onload = null; entry.image.onerror = null; }
        const image = new Image(); entry.image = image;
        image.onload = () => { if (!this.disposed && entry.image === image && this.ownedPieces.has(entry.piece)) { entry.loaded = true; entry.piece.redraw(); } };
        image.onerror = () => { if (entry.image === image) entry.loaded = false; };
        image.src = portraitDataUrl(appearance, look, weapons.get(pawn.id), expression, limbMask);
      }
      entry.piece.userData.tooltip = `${pawn.name} · ${pawn.state} · Moral ${entry.mood}% · Nourriture ${rounded(pawn.hunger)}% · Repos ${rounded(pawn.rest)}%`;
      const signature = JSON.stringify([entry.name, entry.mood, entry.selected, appearanceKey]);
      if (entry.signature !== signature) { entry.signature = signature; entry.piece.userData.active = entry.selected; entry.piece.redraw(undefined, entry.selected ? PALETTE.ochre : PALETTE.kraftBase); }
    });
    this.previousButton.visible = this.nextButton.visible = this.colonists.length > this.portraitCapacity;
    this.rosterButton.visible=this.colonists.length>this.portraitCapacity;
    const edge=shown.length*.78/2+.15;
    this.previousButton.setBaseTransform(-edge,-.48,.02);
    this.nextButton.setBaseTransform(edge,-.48,.02);
    this.rosterButton.setBaseTransform(edge,-.82,.02);
    this.nextButton.userData.tooltip=`Colons suivants · page ${this.page+1}/${Math.max(1,Math.ceil(this.colonists.length/this.portraitCapacity))}`;
    this.setVisible(this.shown);
  }

  private drawColonist(col:PortraitCard,ctx:CanvasRenderingContext2D,w:number,h:number,rng:()=>number):void {
    ctx.save();ctx.scale(w/70,h/96);
    drawHandRect(ctx,6,6,58,54,col.selected?'#d8e4c4':'#b2c4ab','#261e18',1.2,rng);
    if(col.loaded&&col.image)ctx.drawImage(col.image,6,6,58,54);
    else {drawHandBlob(ctx,35,48,15,col.shirt,'#261e18',1,rng);drawHandBlob(ctx,35,26,11,col.skin,'#261e18',1,rng);}
    ctx.fillStyle=PALETTE.inkDark;ctx.font=`bold 12px ${FONT}`;ctx.textAlign='center';fitText(ctx,col.name,35,75,61);
    drawHandRect(ctx,10,81,50,5,'#423328',null,0,rng);
    if(col.mood>0)drawHandRect(ctx,10,81,50*col.mood/100,5,col.mood>70?'#639452':'#d16b3b',null,0,rng);
    ctx.restore();
  }

  private readResources(world: World): void {
    const counts = knownStockCounts256(world), records = new Map<ItemId, ResourceRecord>();
    const ownedPawns = new Set(world.pawns.filter(isColonist).map(p => p.id));
    for (const pile of world.piles) {
      if (pile.quantity <= 0 || !knownPile256(world, pile)) continue;
      const owner = pile.owner;
      if (owner.type !== 'ground' && owner.type !== 'job' && (!('pawnId' in owner) || !ownedPawns.has(owner.pawnId) && !colonyPile(world, pile))) continue;
      const entry = records.get(pile.item) ?? {item: pile.item, stock: counts.get(pile.item) ?? 0, ground: 0, carried: 0, inventory: 0, equipped: 0, delivered: 0};
      if (owner.type === 'ground') entry.ground += pile.quantity;
      else if (owner.type === 'job') entry.delivered += pile.quantity;
      else if (owner.type === 'pawn') entry.carried += pile.quantity;
      else if (owner.type === 'inventory') entry.inventory += pile.quantity;
      else if (owner.type === 'equipment' || owner.type === 'apparel') entry.equipped += pile.quantity;
      records.set(pile.item, entry);
    }
    this.resources = [...records.values()].sort((a, b) => ITEM_DEFINITIONS[a.item].label.localeCompare(ITEM_DEFINITIONS[b.item].label, 'fr'));
  }

  private refreshResources():void {
    const counts=new Map(this.resources.map(row=>[row.item,row.stock]));
    const quantity=(node:StorageFilterNode):number=>node.item?(node.item==='furniture'?0:counts.get(node.item)??0):(node.children??[]).reduce((sum,child)=>sum+quantity(child),0);
    type Row={id:string;label:string;value:string;color:string;item?:ItemId;level:number;branch?:{id:string;open:boolean};activate:()=>void};
    const rows:Row[]=[];
    const visit=(node:StorageFilterNode,level:number):void=>{
      const count=quantity(node);if(count<=0)return;
      const isBranch=!node.item,open=this.resourceExpanded.has(node.id),item=node.item&&node.item!=='furniture'?node.item:undefined;
      rows.push({id:node.id,label:node.label,value:amount(count),color:item?hex(ITEM_DEFINITIONS[item].color):PALETTE.creamPaper,item,level,
        branch:isBranch?{id:node.id,open}:undefined,activate:isBranch?()=>{if(this.resourceExpanded.has(node.id))this.resourceExpanded.delete(node.id);else this.resourceExpanded.add(node.id);this.resourcePage=0;this.refreshResources();}:()=>this.showResources()});
      if(isBranch&&open){
        if(node.id==='foods')rows.push({id:'fresh-nutrition',label:'Nutrition fraîche',value:amount(this.food?.freshNutrition??0),color:PALETTE.ochre,level:level+1,activate:()=>this.showResources()});
        for(const child of node.children??[])visit(child,level+1);
      }
    };
    for(const node of STORAGE_FILTER_TREE)visit(node,0);
    if(!rows.length)rows.push({id:'empty',label:'Stocks connus',value:'0',color:PALETTE.creamPaper,level:0,activate:()=>this.showResources()});
    const capacity=Math.max(3,Math.floor((this.viewportHeight-144)/28)),pages=Math.max(1,Math.ceil(rows.length/capacity));
    this.resourcePage=Math.min(this.resourcePage,pages-1);
    const signature=JSON.stringify([capacity,this.resourcePage,rows.map(row=>[row.id,row.label,row.value,row.branch?.open])]);
    if(signature===this.resourceSignature)return;this.resourceSignature=signature;
    for(const tag of this.tags)this.dropPiece(tag.piece);this.tags.length=0;
    const visible=rows.slice(this.resourcePage*capacity,(this.resourcePage+1)*capacity);
    const add=(row:Row,index:number,x=1.12,width=2.24):void=>{
      const ink:Omit<ResourceTag,'piece'>={...row,screenWidth:width*100,signature:''};
      const piece=this.makePiece({w:width,h:.28,depth:.001,paper:false,seed:1100+index*17,hasBorder:false,interactive:true,
        drawFn:(ctx,w,h,rng)=>this.drawResource(ink,ctx,w,h,rng),onClick:row.activate});
      const tag:ResourceTag={...ink,piece};
      tag.piece.userData.nativeId=`hud:resource:${row.id}`;
      tag.piece.userData.tooltip=row.branch?`${row.branch.open?'Replier':'Déplier'} ${row.label}`:`${row.label} · ${row.value} comptabilisé(s) · détails des propriétaires`;
      tag.piece.setBaseTransform(x,-.14-index*.28,.02);this.resourcesGroup.add(tag.piece);this.tags.push(tag);
      if(row.item&&!this.resourceImages.has(row.item)){
        const image=new Image();this.resourceImages.set(row.item,image);
        image.onload=()=>{if(!this.disposed)for(const current of this.tags)if(current.item===row.item)current.piece.redraw();};
        image.src=modelIconUrl(`item-${row.item}`);
      }
    };
    visible.forEach((row,index)=>add(row,index));
    if(pages>1){
      const footer=(id:string,label:string,delta:number):Row=>({id,label,value:'',color:PALETTE.creamPaper,level:0,activate:()=>{this.resourcePage=(this.resourcePage+delta+pages)%pages;this.refreshResources();}});
      add(footer('previous',`‹ ${this.resourcePage+1}/${pages}`,-1),visible.length,.42,.84);
      add(footer('next','Suite ›',1),visible.length,1.64,1.2);
    }
  }
  private drawResource(res:Omit<ResourceTag,'piece'>,ctx:CanvasRenderingContext2D,w:number,h:number,rng:()=>number):void {
    const screenWidth=res.screenWidth??224;
    ctx.save();ctx.scale(w/screenWidth,h/28);ctx.strokeStyle='#19242b';ctx.lineWidth=3;ctx.lineJoin='round';
    const indent=Math.min(30,(res.level??0)*9),iconX=12+indent;
    if(res.branch){
      ctx.font=`bold 15px ${FONT}`;ctx.fillStyle='#fff8e9';ctx.textAlign='center';const glyph=res.branch.open?'⌄':'›';ctx.strokeText(glyph,iconX,19);ctx.fillText(glyph,iconX,19);
    }else{
      const image=res.item?this.resourceImages.get(res.item):undefined;
      if(image?.complete&&image.naturalWidth>0)ctx.drawImage(image,indent,2,24,24);
      else {drawHandBlob(ctx,iconX,14,7,res.color,'#19242b',1.5,rng);}
    }
    ctx.font=`${res.branch?'bold ':''}13px ${FONT}`;ctx.textAlign='left';ctx.fillStyle='#fff8e9';
    const textX=29+indent,valueWidth=res.value?Math.min(68,ctx.measureText(res.value).width+7):0,labelWidth=Math.max(35,screenWidth-textX-valueWidth-8);
    ctx.strokeText(res.label,textX,19,labelWidth);ctx.fillText(res.label,textX,19,labelWidth);
    if(res.value){ctx.textAlign='right';ctx.strokeText(res.value,screenWidth-2,19,68);ctx.fillText(res.value,screenWidth-2,19,68);}
    ctx.restore();
  }

  private refreshAlerts():void {
    const maxWidth=Math.min(300,Math.max(170,this.viewportWidth*.36));
    const availableHeight=Math.max(110,this.viewportHeight-370);
    const signature=JSON.stringify([maxWidth,availableHeight,this.alerts.map(row=>[row.key,row.text])]);
    if(signature===this.alertSignature)return;
    this.alertSignature=signature;
    for(const piece of this.alertPieces)this.dropPiece(piece);
    this.alertPieces=[];
    const ctx=this.allAlertsButton.userData.ctx;ctx.font=`bold 13px ${FONT}`;
    let y=.32;
    this.alerts.slice(0,4).forEach((alert,idx)=>{
      const room=availableHeight-y*100-40;
      if(room<28)return;
      const originalLines=inkLines(ctx,alert.text,maxWidth-28),maxLines=Math.max(1,Math.floor((room-12)/17));
      const lines=originalLines.slice(0,maxLines);
      if(lines.length<originalLines.length)lines[lines.length-1]=`${lines.at(-1)??''}…`;
      const width=Math.min(maxWidth,Math.max(82,...lines.map(line=>ctx.measureText(line).width+28)));
      const height=Math.max(28,lines.length*17+12);
      const danger=alert.domain?.severity==='danger'||/critical|downed|bleeding|threat|manhunter|death|fire|infection|malnutrition/.test(alert.key);
      const color=danger?PALETTE.terracotta:PALETTE.ochre;
      const card=this.makePiece({w:width/100,h:height/100,depth:.028,bgColor:PALETTE.creamPaper,bevel:.02,seed:idx*29+53,interactive:true,tooltip:alert.text,
        drawFn:(ctx,w,h,rng)=>{
          ctx.save();ctx.scale(w/width,h/height);drawHandRect(ctx,4,5,4,height-10,color,null,0,rng);
          ctx.fillStyle=PALETTE.inkDark;ctx.font=`bold 13px ${FONT}`;ctx.textAlign='left';
          lines.forEach((line,index)=>ctx.fillText(line,14,19+index*17,width-24));ctx.restore();
        },onClick:()=>this.showAlert(alert.key)});
      card.userData.nativeId=`hud:alert:${alert.key}`;
      card.setBaseTransform(-width/200,-y-height/200,.02,idx%2===0?-.005:.005);
      this.alertsGroup.add(card);this.alertPieces.push(card);y+=(height+6)/100;
    });
    this.allAlertsButton.visible=this.alerts.length>this.alertPieces.length;
    this.allAlertsButton.setBaseTransform(-.73,-y-.125,0);this.allAlertsButton.redraw();
    this.alertHandleGroup.visible=this.notificationsAutoHide&&this.shown&&!!this.world&&this.alerts.length>0;
  }

  private refreshWeather(world: World): void {
    const civil = calendarTick(world), minute = Math.floor(((civil % TICKS_PER_DAY + TICKS_PER_DAY) % TICKS_PER_DAY) * 1440 / TICKS_PER_DAY);
    const kind = world.weather ? perceivedWeather(world) : 'clear', temperature = outdoorTemperature(world);
    const date = world.climate ? climateDate(world) : undefined;
    this.miniSun.visible = kind === 'clear' && minute >= 360 && minute < 1080 && !activeEclipse(world);
    this.miniCloud.visible = kind !== 'clear';
    const readout = {
      clock: `${String(Math.floor(minute / 60)).padStart(2, '0')}h${String(minute % 60).padStart(2, '0')}`,
      date: date ? `${date.day} ${quadrums[date.quadrum]} ${date.year}` : `Jour ${1 + Math.floor(civil / TICKS_PER_DAY)} · historique`,
      weather: kind === 'clear' && (minute < 360 || minute >= 1080) ? 'Ciel dégagé' : WEATHER[kind].label,
      temperature: `${temperature.toFixed(1)} °C`,
      condition: [activeColdSnap(world) ? 'Vague de froid' : '', activeEclipse(world) ? 'Éclipse' : ''].filter(Boolean).join(' · '),
      wind: world.wind ? windIntensity(world).toFixed(2) : '—'
    };
    const signature = [readout.clock, readout.date, readout.weather, readout.temperature, readout.condition].join('|');
    this.weatherReadout = readout;
    if (signature !== this.weatherSignature) { this.weatherSignature = signature; this.weatherPiece.userData.tooltip = `${readout.date} · ${readout.weather} · ${readout.temperature}${readout.condition ? ` · ${readout.condition}` : ''}`; this.weatherPiece.redraw(); }
  }
  private drawWeather(ctx:CanvasRenderingContext2D,w:number,h:number,rng:()=>number):void {
    ctx.save();ctx.scale(w/276,h/96);drawHandRect(ctx,8,10,54,70,'#7ba1b5','#261e18',1.2,rng);
    ctx.fillStyle=PALETTE.inkDark;ctx.textAlign='left';ctx.font=`bold 25px ${FONT}`;fitText(ctx,this.weatherReadout.clock,75,34,190);
    ctx.font=`bold 13px ${FONT}`;fitText(ctx,this.weatherReadout.date,75,56,190);
    ctx.font=`13px ${FONT}`;fitText(ctx,`${this.weatherReadout.weather} · ${this.weatherReadout.temperature}`,75,77,190);ctx.restore();
  }

  private showRoster(): void {
    this.actions.showPage({id: 'hud-colonists', title: `${this.colonists.length} colons sur cette carte`, color: PALETTE.sageMountain,
      subtitle: 'Liste complète · les flèches de la barre parcourent les mêmes personnes par pages compactes.',
      rows: this.colonists.map(pawn => ({id: `pawn-${pawn.id}`, label: pawn.name, value: `Moral ${rounded(pawn.mood)}%`, detail: `${pawn.state} · Nourriture ${rounded(pawn.hunger)}% · Repos ${rounded(pawn.rest)}%`,
        controls: [{id: `select-${pawn.id}`, label: 'Sélectionner', onActivate: () => { this.setSelection([pawn.id]); this.actions.selectPawn(pawn.id); }}]}))});
  }
  private showResources(): void {
    const rows: NativeRow[] = [
      {id: 'nutrition-fresh', label: 'Nutrition fraîche connue', value: amount(this.food?.freshNutrition ?? 0), detail: 'Sol et portions portées par les civils vivants ; accès, réservations et régime non garantis.'},
      {id: 'nutrition-physical', label: 'Nutrition physique (lecture historique)', value: amount(this.physicalNutrition), detail: 'Hors foin, stocks de chantier et inventaires ; la fraîcheur n’est pas garantie.'},
      ...this.resources.map(row => ({id: `item-${row.item}`, label: ITEM_DEFINITIONS[row.item].label, value: `${amount(row.stock)} comptabilisé(s)`,
        detail: `Sol ${amount(row.ground)} · porté ${amount(row.carried)} · inventaire ${amount(row.inventory)} · équipé ${amount(row.equipped)} · livré aux chantiers ${amount(row.delivered)}${ITEM_DEFINITIONS[row.item].nutrition ? ` · ${amount(ITEM_DEFINITIONS[row.item].nutrition / 100)} nutrition/unité` : ''}`}))
    ];
    this.actions.showPage({id: 'hud-resources', title: 'Stocks connus de la carte', subtitle: 'Chaque type présent est conservé dans cette liste. Les matières livrées et les inventaires sont distingués du stock comptabilisé.', color: PALETTE.kraftBase, rows});
  }
  private showAlerts(): void {
    this.actions.showPage({id: 'hud-alerts', title: 'Alertes actuelles', color: PALETTE.terracotta,
      rows: this.alerts.length ? this.alerts.map(alert => ({id: alert.key, label: alert.text, controls: [{id: `details-${alert.key}`, label: 'Détails', onActivate: () => this.showAlert(alert.key)}]})) : [{id: 'none', label: 'Aucune alerte actuelle'}]});
  }
  private showAlert(key: string): void {
    const alert = this.alerts.find(row => row.key === key);
    if (!alert) { this.showAlerts(); return; }
    const rows: NativeRow[] = [{id: 'text', label: alert.text}];
    if (alert.tooltip) {
      if (alert.tooltip.title) rows.push({id: 'title', label: alert.tooltip.title});
      rows.push({id: 'body', label: alert.tooltip.body});
      alert.tooltip.rows?.forEach((row, index) => rows.push({id: `detail-${index}`, label: row.label, value: row.value}));
    }
    for (const target of alert.targets) {
      if (target.kind === 'actor') {
        const pawn = this.world?.pawns.find(person => person.id === target.id);
        if (pawn && this.world && knownPosition256(this.world, pawn)) rows.push({id: target.key, label: pawn.name, controls: [{id: `select-${pawn.id}`, label: 'Voir la personne', onActivate: () => this.actions.focus?this.actions.focus(target,alert.tab):this.actions.selectPawn(pawn.id)}]});
      } else {
        const cell = target.cell;
        rows.push({id: target.key, label: target.kind === 'object' ? `${target.object.kind} #${target.object.id}` : 'Lieu', value: `(${cell.x}, ${cell.z})`,controls:this.actions.focus?[{id:`focus-${target.key}`,label:'Repérer',onActivate:()=>{const current=this.alerts.find(row=>row.key===key)?.targets.find(item=>item.key===target.key);if(current)this.actions.focus?.(current);}}]:undefined});
      }
    }
    const actions:NonNullable<NativePage['actions']>=[];
    const domain=alert.domain;
    if(domain&&['arrivals','quests','trade','orbital'].includes(domain.action.kind)&&this.actions.domain)actions.push({id:`open-domain-${key}`,label:'Ouvrir le dossier',onActivate:()=>{const current=this.alerts.find(row=>row.key===key)?.domain;if(current)this.actions.domain?.(current);}});
    if(alert.campaign&&this.actions.campaign)actions.push({id:`open-map-${key}`,label:'Voir la carte',onActivate:()=>{const current=this.alerts.find(row=>row.key===key)?.campaign;if(current)this.actions.campaign?.(current);}});
    if(alert.context&&this.actions.context)actions.push({id:`open-context-${key}`,label:'Ouvrir les réglages',onActivate:()=>{const current=this.alerts.find(row=>row.key===key)?.context;if(current)this.actions.context?.(current);}});
    if(this.actions.focus&&alert.targets.length)actions.push({id:`focus-next-${key}`,label:'Repérer la cible suivante',onActivate:()=>{const current=this.alerts.find(row=>row.key===key);if(current){const target=this.alertFocus.next(key,current.targets);if(target)this.actions.focus?.(target,current.tab);}}});
    this.actions.showPage({id: `hud-alert-${alert.key}`, title: domain?.title??'Alerte actuelle', subtitle: alert.text, color: PALETTE.terracotta, rows,actions});
  }
  private showWeather(): void {
    const readout = this.weatherReadout;
    this.actions.showPage({id: 'hud-site', title: 'Heure et conditions du site', color: PALETTE.slateBlue, rows: [
      {id: 'clock', label: 'Heure civile locale', value: readout.clock}, {id: 'date', label: 'Date', value: readout.date},
      {id: 'weather', label: 'Météo perçue', value: readout.weather}, {id: 'temperature', label: 'Température extérieure', value: readout.temperature},
      {id: 'wind', label: 'Intensité du vent', value: readout.wind}, ...(readout.condition ? [{id: 'condition', label: 'Condition active', value: readout.condition}] : [])
    ]});
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const entry of this.portraits) if (entry.image) { entry.image.onload = null; entry.image.onerror = null; }
    for(const image of this.resourceImages.values()){image.onload=null;image.onerror=null;}this.resourceImages.clear();
    for (const piece of this.ownedPieces) this.art.disposePiece(piece);
    this.ownedPieces.clear();
    this.rail.geometry.dispose();
    (this.rail.material as THREE.Material).dispose();
    for (const group of [this.colonistsGroup, this.resourcesGroup, this.alertsGroup, this.timeGroup, this.fpsGroup, this.alertHandleGroup]) { group.removeFromParent(); group.clear(); }
    this.world = undefined; this.colonists = []; this.resources = []; this.alerts = []; this.portraits = [];
  }
}
