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
  focus?: (target:NotificationTarget,tab?:StatusAlert['tab'])=>void;
  domain?: (alert:NativeDomainAlert)=>void;
  campaign?: (target:NonNullable<StatusAlert['campaign']>)=>void;
  context?: (target:NonNullable<StatusAlert['context']>)=>void;
}
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
  private readonly speedButtons: CardboardPiece[] = [];
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
  private rosterSignature = '';
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
    anchors.topRight.add(this.alertsGroup,this.fpsGroup);this.alertsGroup.position.y=-.12;
    anchors.bottomRight.add(this.timeGroup);

    this.rail = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.035, 0.025), new THREE.MeshStandardMaterial({color: 0x7c5c3e, roughness: 0.98}));
    this.rail.position.set(0, -0.08, -0.01);
    this.colonistsGroup.add(this.rail);

    this.previousButton = this.smallButton('‹', 810, () => this.changePage(-1));
    this.previousButton.setBaseTransform(-2.68, -0.44, 0, -0.045);
    this.nextButton = this.smallButton('›', 833, () => this.changePage(1));
    this.nextButton.setBaseTransform(2.68, -0.44, 0, 0.04);
    this.rosterButton = this.makePiece({w: 1.65, h: 0.2, depth: 0.036, seed: 853, bgColor: PALETTE.creamPaper, interactive: true,
      drawFn: (ctx, w, h) => this.drawCaption(ctx, w, h, this.rosterCaption()), onClick: () => this.showRoster()});
    this.rosterButton.setBaseTransform(0, -0.96, 0, 0.012);
    this.colonistsGroup.add(this.previousButton, this.nextButton, this.rosterButton);

    for (let idx = 0; idx < 6; idx++) {
      const record = {label: '', value: '', color: PALETTE.ochre, signature: ''} as ResourceTag;
      record.piece = this.makePiece({w: 1.06 + (idx % 3) * 0.04, h: 0.22, depth: 0.036, bgColor: PALETTE.kraftBase, bevel: 0.032, seed: idx * 17 + 11,
        hasBorder: false, interactive: true, drawFn: (ctx, w, h, rng) => this.drawResource(record, ctx, w, h, rng), onClick: () => this.showResources()});
      const rotJitter = (idx % 2 === 0 ? 0.028 : -0.024) + (idx - 2.5) * 0.005;
      record.piece.setBaseTransform(0.58 + (idx % 2) * 0.02, -0.18 - idx * 0.255, 0, rotJitter);
      this.resourcesGroup.add(record.piece);
      this.tags.push(record);
    }

    this.weatherPiece = this.makePiece({w: 1.50, h: 0.47, depth: 0.046, bgColor: PALETTE.creamPaper, bevel: 0.038, seed: 209, interactive: true,
      drawFn: (ctx, w, h, rng) => this.drawWeather(ctx, w, h, rng), onClick: () => this.showWeather()});
    // Time belongs at bottom right in Elsewhere; its artwork stays literal.
    this.weatherPiece.setBaseTransform(-0.82, 1.25, 0, 0.025);
    this.timeGroup.add(this.weatherPiece);
    const miniSun = this.miniSun = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.03, 7), new THREE.MeshStandardMaterial({color: 0xe8ab3a, roughness: 0.98, flatShading: true}));
    miniSun.rotation.x = Math.PI / 2;
    miniSun.position.set(-0.52, 0.04, 0.055);
    this.weatherPiece.add(miniSun);
    const miniCloud = this.miniCloud = new THREE.Mesh(new THREE.ExtrudeGeometry(createCutoutRectShape(0.22, 0.10, 0.025, 88), {depth: 0.032, bevelEnabled: false}), art.cardboardEdgeMat);
    miniCloud.position.set(-0.46, -0.05, 0.055);
    this.weatherPiece.add(miniCloud);
    const weatherTape = createMaskingTape(0.18, 0.05, -0.35);
    weatherTape.position.set(0.64, 0.20, 0.048);
    this.weatherPiece.add(weatherTape);

    speeds.forEach((cfg, idx) => {
      const piece = this.makePiece({w: 0.34, h: 0.29, depth: 0.044, bgColor: PALETTE.kraftBase, bevel: 0.036, seed: 310 + idx * 23, interactive: true, tooltip: cfg.title,
        drawFn: (ctx, w, h, rng) => {
          const isAct = this.speedValue === cfg.speed;
          if (isAct) drawHandBlob(ctx, w / 2, h / 2, Math.min(w, h) * 0.36, 'rgba(255,248,230,0.28)', '#261e18', 2.5, rng);
          ctx.save(); ctx.translate(w / 2, h / 2 + 12); ctx.rotate(idx % 2 === 0 ? -0.06 : 0.06);
          ctx.fillStyle = isAct ? '#fff9eb' : '#261e18'; ctx.font = `bold 34px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(cfg.label, 0, 0); ctx.restore();
        }, onClick: () => { if (this.world) this.actions.speed(cfg.speed); }});
      piece.setBaseTransform(-1.36 + idx * 0.365, 0.81 + (idx % 2) * 0.015, 0, idx % 2 === 0 ? -0.045 : 0.04);
      this.timeGroup.add(piece); this.speedButtons.push(piece);
    });

    const view=this.makePiece({w:.61,h:.25,depth:.035,bgColor:PALETTE.sageMountain,seed:9297,interactive:true,tooltip:'Réglages de vue et diagnostics',
      drawFn:(ctx,w,h,rng)=>{
        ctx.save();ctx.translate(w*.24,h*.5);ctx.beginPath();ctx.ellipse(0,0,19,12,-.06,0,Math.PI*2);ctx.fillStyle=PALETTE.creamPaper;ctx.fill();ctx.strokeStyle=PALETTE.inkDark;ctx.lineWidth=3;ctx.stroke();
        drawHandBlob(ctx,0,0,5,PALETTE.inkDark,null,0,rng);ctx.restore();ctx.font=`bold 25px ${FONT}`;ctx.fillStyle=PALETTE.inkDark;ctx.textAlign='center';ctx.fillText('Vue',w*.66,h*.59);
      },onClick:()=>this.actions.showViewControls?.()});
    view.setBaseTransform(-.35,1.71,0,.025);this.timeGroup.add(view);
    this.fpsPiece = this.makePiece({w: 0.72, h: 0.17, depth: 0.03, bgColor: PALETTE.creamPaper, seed: 929, hasBorder: false,
      drawFn: (ctx, w, h) => this.drawCaption(ctx, w, h, `${this.fpsValue < 0 ? '—' : this.fpsValue} FPS`)});
    this.fpsPiece.setBaseTransform(-0.42, -0.08, .08, -0.02);
    this.fpsGroup.add(this.fpsPiece);
    this.allAlertsButton = this.makePiece({w: 1.34, h: 0.22, depth: 0.036, bgColor: PALETTE.creamPaper, seed: 973, interactive: true,
      drawFn: (ctx, w, h) => this.drawCaption(ctx, w, h, `${this.alerts.length} alertes · tout voir`), onClick: () => this.showAlerts()});
    this.allAlertsButton.setBaseTransform(-0.72, -1.99, 0, 0.02);
    this.alertsGroup.add(this.allAlertsButton);
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
    this.page = Math.max(0, Math.min(this.page, Math.ceil(this.colonists.length / PORTRAITS_PER_PAGE) - 1));
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

  setVisible(visible: boolean): void {
    this.shown = visible;
    this.colonistsGroup.visible = visible && !!this.world;
    this.resourcesGroup.visible = visible && !!this.world;
    this.alertsGroup.visible = visible && !!this.world;
    this.timeGroup.visible = visible && !!this.world;
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
    return {portraits: this.portraits.length, colonists: this.colonists.length, resourceTypes: this.resources.length, alerts: this.alerts.length, page: this.page + 1, pages: Math.max(1, Math.ceil(this.colonists.length / PORTRAITS_PER_PAGE))};
  }

  private makePiece(options: CardboardPieceOptions): CardboardPiece {
    const piece = this.art.createPiece(options); this.ownedPieces.add(piece); return piece;
  }
  private dropPiece(piece: CardboardPiece): void { this.ownedPieces.delete(piece); this.art.disposePiece(piece); }
  private drawCaption(ctx: CanvasRenderingContext2D, w: number, h: number, label: string): void {
    ctx.font = `bold 20px ${FONT}`; ctx.fillStyle = PALETTE.inkDark; ctx.textAlign = 'center'; fitText(ctx, label, w / 2, h / 2 + 7, w - 24);
  }
  private smallButton(label: string, seed: number, onClick: () => void): CardboardPiece {
    return this.makePiece({w: 0.34, h: 0.29, depth: 0.044, bgColor: PALETTE.kraftBase, bevel: 0.036, seed, interactive: true,
      drawFn: (ctx, w, h) => { ctx.font = `bold 38px ${FONT}`; ctx.fillStyle = PALETTE.inkDark; ctx.textAlign = 'center'; ctx.fillText(label, w / 2, h / 2 + 12); }, onClick});
  }
  private rosterCaption(): string {
    const pages = Math.max(1, Math.ceil(this.colonists.length / PORTRAITS_PER_PAGE));
    return `${this.colonists.length} colons · ${this.page + 1}/${pages} · liste`;
  }
  private changePage(delta: number): void {
    const pages = Math.max(1, Math.ceil(this.colonists.length / PORTRAITS_PER_PAGE));
    this.page = (this.page + delta + pages) % pages;
    if (this.world) this.refreshPortraits(this.world);
  }

  private refreshPortraits(world: World): void {
    const start = this.page * PORTRAITS_PER_PAGE, shown = this.colonists.slice(start, start + PORTRAITS_PER_PAGE);
    const ids = `${this.page}:${shown.map(p => p.id).join(',')}`, changed = ids !== this.portraitIds;
    if (changed) {
      for (const entry of this.portraits) { if (entry.image) { entry.image.onload = null; entry.image.onerror = null; } this.dropPiece(entry.piece); }
      this.portraits = []; this.portraitIds = ids;
      shown.forEach((pawn, localIdx) => {
        const idx = start + localIdx;
        const entry = {pawnId: pawn.id, index: idx, name: pawn.name, mood: rounded(pawn.mood), skin: '#f2cfb1', shirt: PALETTE.sageMountain, sleeping: false, selected: this.selectedIds.has(pawn.id), loaded: false, appearanceKey: '', signature: ''} as PortraitCard;
        entry.piece = this.makePiece({w: 0.69, h: 0.73, depth: 0.042, bgColor: entry.selected ? PALETTE.ochre : PALETTE.kraftBase, bevel: 0.035, seed: idx * 41 + 105, interactive: true,
          drawFn: (ctx, w, h, rng) => this.drawColonist(entry, ctx, w, h, rng),
          onClick: () => { if (!this.world?.pawns.some(p => p.id === entry.pawnId && isColonist(p))) return; this.setSelection([entry.pawnId]); this.actions.selectPawn(entry.pawnId); }});
        const peg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), new THREE.MeshStandardMaterial({color: 0x9e7448, roughness: 0.96}));
        peg.position.set(0, 0.36, 0.03); peg.rotation.z = idx % 2 === 0 ? 0.08 : -0.08; entry.piece.add(peg);
        entry.piece.setBaseTransform((localIdx - (shown.length - 1) / 2) * 0.79, -0.44, 0, idx % 2 === 0 ? -0.04 : 0.038);
        this.colonistsGroup.add(entry.piece); this.portraits.push(entry);
      });
      this.rail.scale.x = Math.max(0.4, (shown.length - 1) * 0.79 + 0.4) / 3.4;
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
    this.previousButton.visible = this.nextButton.visible = this.colonists.length > PORTRAITS_PER_PAGE;
    const rosterCaption = this.rosterCaption();
    if (rosterCaption !== this.rosterSignature) { this.rosterSignature = rosterCaption; this.rosterButton.redraw(); }
    this.setVisible(this.shown);
  }

  private drawColonist(col: PortraitCard, ctx: CanvasRenderingContext2D, wPx: number, _hPx: number, rng: () => number): void {
    const isSel = col.selected, idx = col.index;
    drawHandRect(ctx, 18, 18, wPx - 36, 96, isSel ? '#d8e4c4' : '#b2c4ab', '#261e18', 3, rng);
    const cx = wPx / 2 + (rng() - 0.5) * 4;
    ctx.save();
    // Keep the prototype's random stroke sequence when its demonstration
    // person is replaced by the actual pawn's authored identity portrait.
    if (col.loaded) ctx.globalAlpha = 0;
    drawHandBlob(ctx, cx, 104, 32, col.shirt, '#261e18', 3, rng);
    drawHandBlob(ctx, cx, 62, 22, col.skin, '#261e18', 3, rng);
    drawHandBlob(ctx, cx - 7, 60, 2.8, '#261e18', null, 0, rng);
    drawHandBlob(ctx, cx + 7, 60, 2.8, '#261e18', null, 0, rng);
    drawMarkerLine(ctx, cx - 6, 70, cx + 6, 71, '#261e18', 2.2, rng);
    ctx.restore();
    if (col.loaded && col.image) ctx.drawImage(col.image, 18, 13, wPx - 36, 116);
    ctx.save(); ctx.translate(cx, 135); ctx.rotate(idx % 2 === 0 ? -0.03 : 0.035);
    drawHandRect(ctx, -wPx * 0.42, -15, wPx * 0.84, 30, '#efe4c6', 'rgba(38,30,24,0.35)', 2, rng);
    ctx.fillStyle = '#261e18'; ctx.font = `bold 20px ${FONT}`; ctx.textAlign = 'center'; fitText(ctx, col.name, 0, 7, wPx * 0.78); ctx.restore();
    const barX = 20, barY = 160, barW = wPx - 40, barH = 19;
    drawHandRect(ctx, barX, barY, barW, barH, '#423328', null, 0, rng);
    ctx.save();
    if (col.mood === 0) ctx.globalAlpha = 0;
    drawHandRect(ctx, barX + 3, barY + 3, (barW - 6) * col.mood / 100, barH - 6, col.mood > 70 ? '#639452' : '#d16b3b', null, 0, rng);
    ctx.restore();
    drawHandRect(ctx, barX, barY, barW, barH, null, '#261e18', 3, rng);
    ctx.fillStyle = '#261e18'; ctx.font = 'bold 13px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText(`Moral ${col.mood}%`, wPx / 2, 195);
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

  private refreshResources(): void {
    const priority: readonly string[] = ['wood', 'steel', 'component', 'silver'];
    const ranked = [...this.resources.filter(row => row.stock > 0)].sort((a, b) => {
      const ai = priority.indexOf(a.item), bi = priority.indexOf(b.item);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || ITEM_DEFINITIONS[a.item].label.localeCompare(ITEM_DEFINITIONS[b.item].label, 'fr');
    });
    this.tags.forEach((tag, index) => {
      if (index < 4) {
        const resource = ranked[index];
        tag.label = resource ? ITEM_DEFINITIONS[resource.item].label : index === 0 ? 'Stocks connus' : '—'; tag.value = resource ? amount(resource.stock) : '0'; tag.color = resource ? hex(ITEM_DEFINITIONS[resource.item].color) : PALETTE.kraftDark;
      } else if (index === 4) { tag.label = 'Nutrition fraîche'; tag.value = amount(this.food?.freshNutrition ?? 0); tag.color = PALETTE.ochre; }
      else { tag.label = 'Tous les stocks'; tag.value = `${this.resources.length} types`; tag.color = PALETTE.slateBlue; }
      const signature = `${tag.label}|${tag.value}|${tag.color}`;
      if (tag.signature !== signature) { tag.signature = signature; tag.piece.userData.tooltip = 'Voir toutes les piles connues, leur propriétaire et la nutrition'; tag.piece.redraw(); }
    });
  }
  private drawResource(res: ResourceTag, ctx: CanvasRenderingContext2D, wPx: number, hPx: number, rng: () => number): void {
    drawHandBlob(ctx, 32, hPx / 2, 15, res.color, '#261e18', 2.5, rng);
    drawHandBlob(ctx, wPx - 42, hPx / 2, 24, 'rgba(244, 236, 218, 0.45)', null, 0, rng);
    ctx.save(); ctx.translate(56, hPx / 2 + 7); ctx.rotate((rng() - 0.5) * 0.04); ctx.fillStyle = '#261e18'; ctx.font = `bold 20px ${FONT}`; ctx.textAlign = 'left'; fitText(ctx, res.label, 0, 0, wPx - 144); ctx.restore();
    ctx.save(); ctx.translate(wPx - 16, hPx / 2 + 9); ctx.rotate((rng() - 0.5) * 0.06); ctx.font = 'bold 26px Georgia, serif'; ctx.textAlign = 'right'; ctx.strokeStyle = '#261e18'; ctx.lineWidth = 5; ctx.strokeText(res.value, 0, 0, 82); ctx.fillStyle = '#fff9eb'; ctx.fillText(res.value, 0, 0, 82); ctx.restore();
  }

  private refreshAlerts(): void {
    const signature = JSON.stringify([this.alerts.length, this.alerts.slice(0, 4).map(row => [row.key, row.text])]);
    if (signature === this.alertSignature) return;
    this.alertSignature = signature;
    const previous = this.alertPieces;
    this.alertPieces = [];
    this.alerts.slice(0, 4).forEach((alert, idx) => {
      const cardSignature = `${alert.key}:${alert.text}`;
      if (previous[idx]?.userData.nativeAlertSignature === cardSignature) { this.alertPieces.push(previous[idx]!); return; }
      if (previous[idx]) this.dropPiece(previous[idx]!);
      const danger = /critical|downed|bleeding|threat|manhunter|death|fire|infection|malnutrition/.test(alert.key), color = danger ? PALETTE.terracotta : PALETTE.ochre;
      const card = this.makePiece({w: 1.34, h: 0.35, depth: 0.04, bgColor: PALETTE.creamPaper, bevel: 0.036, seed: idx * 29 + 53, interactive: true, tooltip: alert.text,
        drawFn: (ctx, w, h, rng) => {
          drawHandRect(ctx, 12, 12, 24, h - 24, color, '#261e18', 2.5, rng);
          ctx.save(); ctx.translate(48, 38); ctx.rotate((rng() - 0.5) * 0.03); ctx.fillStyle = '#261e18'; ctx.font = `bold 18px ${FONT}`; ctx.textAlign = 'left';
          const lines = inkLines(ctx, alert.text, w - 67); fitText(ctx, lines[0] ?? '', 0, 0, w - 67); fitText(ctx, lines[1] ?? '', 0, 23, w - 67); ctx.restore();
          ctx.fillStyle = '#524132'; ctx.font = 'italic 14px Georgia, serif'; ctx.textAlign = 'right'; ctx.fillText('Voir', w - 17, h - 9);
        }, onClick: () => this.showAlert(alert.key)});
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.032, 0.032, 7), new THREE.MeshStandardMaterial({color: danger ? 0xc94a38 : 0x3f6a8a, roughness: 0.65, flatShading: true}));
      card.userData.nativeAlertSignature = cardSignature;
      pin.rotation.x = Math.PI / 2; pin.position.set(-0.52, 0.11, 0.062); card.add(pin);
      card.setBaseTransform(-0.72 - (idx % 2) * 0.03, -0.30 - idx * 0.41, 0.02, idx % 2 === 0 ? -0.038 : 0.032);
      this.alertsGroup.add(card); this.alertPieces.push(card);
    });
    for (let index = this.alertPieces.length; index < previous.length; index++) this.dropPiece(previous[index]!);
    this.allAlertsButton.redraw();
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
  private drawWeather(ctx: CanvasRenderingContext2D, wPx: number, hPx: number, rng: () => number): void {
    drawHandRect(ctx, 18, 18, 122, hPx - 36, '#7ba1b5', '#261e18', 3.2, rng);
    ctx.fillStyle = '#261e18'; ctx.font = `bold 34px ${FONT}`; ctx.textAlign = 'left'; fitText(ctx, this.weatherReadout.clock, 154, 52, wPx - 165);
    ctx.font = 'bold 18px Georgia, serif'; ctx.fillStyle = '#4a3a2c'; fitText(ctx, this.weatherReadout.date, 154, 80, wPx - 165);
    ctx.font = 'italic 17px Georgia, serif'; ctx.fillStyle = '#36573e'; fitText(ctx, `${this.weatherReadout.weather} · ${this.weatherReadout.temperature}`, 154, 106, wPx - 165);
  }

  private showRoster(): void {
    this.actions.showPage({id: 'hud-colonists', title: `${this.colonists.length} colons sur cette carte`, color: PALETTE.sageMountain,
      subtitle: 'Liste complète · les flèches de la barre parcourent les mêmes personnes par six.',
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
    for (const piece of this.ownedPieces) this.art.disposePiece(piece);
    this.ownedPieces.clear();
    this.rail.geometry.dispose();
    (this.rail.material as THREE.Material).dispose();
    for (const group of [this.colonistsGroup, this.resourcesGroup, this.alertsGroup, this.timeGroup, this.fpsGroup]) { group.removeFromParent(); group.clear(); }
    this.world = undefined; this.colonists = []; this.resources = []; this.alerts = []; this.portraits = [];
  }
}
