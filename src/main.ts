import { updateResearchPanel } from './ui/research-panel';
import { updateUnfinishedInspection } from './ui/unfinished-inspection';
import { createSocialInspection,updateSocialInspection } from './ui/social-inspection';
import { createRaidUI } from './ui/raids';
import { barrierHp,barrierMaxHp,isBarrier } from './sim/barriers';
import { createArrivalUI } from './ui/arrivals';
import { createMoodInspection,updateMoodInspection } from './ui/mood-inspection';
import { isColonist,activeThreat } from './sim/affiliation';
import { ShootingControls } from './ui/shooting-controls';
const shootingControls=new ShootingControls();
import { createDraftControls,updateDraftControls,toggleDraft,draftLabel } from './ui/drafting-controls';
import { apparelProjection,apparelAppearance } from './render/character-apparel';
import { createEquipmentInspection,updateEquipmentInspection } from './ui/equipment-inspection';
import { equipmentProjection,equipmentDescription } from './render/character-equipment';
import { bedControls,updateBedControls } from './ui/bed-controls.ts';
import { carrierOf } from './sim/rescue-state.ts';
import { medicalBleed } from './sim/injury-state';
import { createHealthInspection,updateHealthInspection } from './ui/health-inspection';
import { createSkillsInspection, updateSkillsInspection, updateWorkSkills } from './ui/skills-inspection';
import { powerInspection } from './ui/power-inspection';
import { outdoorTemperature } from './sim/temperature';
import { SnapshotHud } from './ui/snapshot-hud';
import { isRoofArea } from './sim/roof-rules';
import { stationRecipe } from './sim/production-recipes';
import { RoomInspection } from './ui/room-inspection';
import { constructionControls, constructionDeliveryLabel, structureFootprintLabel } from './ui/construction-controls';
import { constructionRecipe } from './sim/construction-materials';
import { rockInspection } from './ui/geology-inspection';
import { doorControls, updateDoorControls } from './ui/door-controls';
import { furnitureControls, updateFurnitureControls } from './ui/furniture-controls';
import { furnitureObject, furnitureIntentAt, packedAt } from './sim/furniture-rules';
import { fireControls, updateFireControls } from './ui/fire-controls';
import { PawnSelection } from './ui/pawn-selection';
import { OrderMenu } from './ui/order-menu';
import type { SelectionGesture } from './render/PawnSelectionInput';
import { createScheduleControls } from './ui/schedule-controls';
import { createFoodPolicyControls } from './ui/food-policy-controls';
import { billControls, updateBillControls } from './ui/bill-controls';
import { growingControls } from './ui/growing-controls';
import { growingZoneAt } from './sim/farming';
import { plantInspection, growingTemperatureInspection } from './ui/plant-inspection';
import { isPlant } from './sim/plants';
import './style.css';
import { ITEM_DEFINITIONS, availableNutrition } from './sim/items';
import { foodFreshnessLabel } from './ui/food-freshness';
import { updateFoodStocks } from './ui/food-stocks';
import { SimulationClient } from './bridge/SimulationClient';
import { ColonyRenderer } from './render/ColonyRenderer';
import type { JobKind, Pawn, World, WorkType, Orientation, AreaAction, Cell, Command } from './sim/types';
import { TICKS_PER_DAY } from './sim/types';
import { DEFAULT_MAP_SIZE, MAP_SIZE_PRESETS } from './sim/map-config';
import { footprintCells, queryJobStatus, queryPawnStatus, MAX_STACK } from './sim/index';
import { gameLayout, storageSettings, toolDefinitions } from './ui/layout';
import type { ArchitectCategory, Panel, Tool } from './ui/layout';

import { recreationInspection, updateRecreationInspection } from './ui/recreation-inspection';
const jobLabels: Record<JobKind, string> = { 'research-bench':'Bureau de recherche','tailor-bench':'Établi de tailleur', 'crafting-spot':'Emplacement d’artisanat', repair:'Réparation', 'wood-generator':'Construction du générateur à bois', 'standing-lamp':'Construction de la lampe', 'passive-cooler':'Construction du refroidisseur passif', 'build-roof':'Pose de toit', 'remove-roof':'Retrait de toit', door:'Construction de la porte', stonecutter:'Construction de la table de taille', mine:'Minage', uninstall:'Désinstallation',install:'Réinstallation', deconstruct: 'Déconstruction', chop: 'Abattage', harvest: 'Récolte', cut: 'Coupe de plante', sow: 'Semis', wall: 'Construction du mur', bed: 'Construction du lit', table: 'Construction de la table', stool: 'Construction du tabouret', horseshoes: 'Construction du piquet de fers à cheval', campfire: 'Construction du feu de camp' };
const stateLabels: Record<Pawn['state'], string> = { resting:'Au lit pour soins', downed:'À terre', dead:'Décédé', idle: 'Disponible', moving: 'En chemin', working: 'Au travail', sleeping: 'Se repose', hungry: 'Cherche à manger', eating: 'Mange', recreating: 'Se divertit' };
const terrainLabels = { 'rough-stone':'Sol rocheux brut', grass: 'Prairie', soil: 'Terre fertile', water: 'Eau infranchissable', rock: 'Massif rocheux infranchissable' };
const resourceLabels = { tree: 'Arbre', berries: 'Buisson de baies', rock: 'Pierre au sol', rice: 'Plant de riz', cotton: 'Cotonnier' };
const SAVE_KEY = 'lisiere.save.v1';
const PREVIOUS_KEY = 'lisiere.previous.v1';
document.querySelector<HTMLDivElement>('#app')!.innerHTML = gameLayout();
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const client = new SimulationClient();
let snapshot: World | undefined;
let selectedPawn: number | undefined;
let selectedCell: { x: number; z: number } | undefined;
let installationId:number|undefined;
let currentTool: Tool = 'select';
let currentPanel: Panel = null;
let currentCategory: ArchitectCategory = 'orders';
let placementOrientation: Orientation = 0;
let currentSpeed = 1, lastSpeed = 1, stepMs = 0;
let wallCutaway = false, foliageVisible = true, replacingWorld = false;
let renderer: ColonyRenderer | undefined;
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
let pawnSignature = '';
const selection=new PawnSelection();
const roomInspection = new RoomInspection();
const orderMenu=new OrderMenu(client,notify);
const snapshotHud=new SnapshotHud(()=>renderState());

function notify(message: string, error = false) {
  el('notice').textContent = message;
  el('notice').classList.toggle('error', error);
  el('notice').hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { el('notice').hidden = true; }, error ? 8000 : 4000);
}
async function attempt(action: () => Promise<unknown>) {
  try { await action(); } catch (error) { notify(error instanceof Error ? error.message : String(error), true); }
}
const scheduleUI = createScheduleControls(el('schedule-panel'), command => attempt(async () => {
  await client.command(command); renderState();
}));
const foodPolicyUI = createFoodPolicyControls(el('assign-panel'), async command => {
  try { await client.command(command); renderState(); return null; }
  catch(error) {return error instanceof Error ? error.message : String(error);}
});
const constructionUI = constructionControls(() => applyTool(currentTool));
function setCategory(category: ArchitectCategory) {
  currentCategory = category;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-category]')) button.classList.toggle('active', button.dataset.category === category);
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-tool-category]')) button.hidden = button.dataset.toolCategory !== category;
}
function setPanel(panel: Panel) {
  orderMenu.close();
  currentPanel = panel;
  scheduleUI.cancel();
  for (const name of ['architect', 'work', 'schedule', 'assign', 'history', 'menu', 'research'] as const) el(`${name}-panel`).hidden = panel !== name;
  if (panel === 'schedule' && snapshot) scheduleUI.update(snapshot);
  if (panel === 'assign' && snapshot) foodPolicyUI.update(snapshot);
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-panel]:not(:disabled)')) {
    const active = button.dataset.panel === panel;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  el('inspector').hidden = panel !== null || (!selection.ids.size && !selectedCell);
  if (panel !== 'architect') applyTool('select');
  if (panel === null && snapshot) {
    const cell = selectedCell ?? snapshot.pawns.find(p => p.id === selectedPawn);
    if (cell) roomInspection.update(el('inspector'), snapshot, cell);
  }
}
function applyTool(tool: Tool) {
  shootingControls.cancel();
  if(tool!=='install'){installationId=undefined;renderer?.setFurniturePlacement(undefined);}
  currentTool = tool;
  renderer?.setTool(tool);
  renderer?.setRoofAreasVisible(isRoofArea(tool));
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-tool]')) {
    const active = button.dataset.tool === tool;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  el('tool-instruction').textContent = constructionUI.update(tool, toolDefinitions.find(item => item.id === tool)?.hint??'Choisissez le nouvel emplacement du meuble. Q/E : rotation. Échap : annuler.');
  el('placement-controls').hidden = tool !== 'install' && tool !== 'bed' && tool !== 'table' && tool !== 'campfire' && tool !== 'stonecutter' && tool !== 'crafting-spot' && tool !== 'research-bench' && tool !== 'tailor-bench';
  el('storage-options').hidden = tool !== 'stockpile';
}
function setTool(tool: Tool) {
  const definition = toolDefinitions.find(item => item.id === tool)!;
  setCategory(definition.category);
  setPanel('architect');
  applyTool(tool);
}
function selectPawn(id: number) {
  selectPawns({ids:[id],additive:false,toggle:false},true);
}
function selectPawns(gesture:SelectionGesture,focus=false) {
  if(!snapshot||replacingWorld)return;
  shootingControls.cancel();
  const singleEnemy=gesture.ids.length===1&&!gesture.additive&&snapshot.pawns.some(p=>p.id===gesture.ids[0]&&!isColonist(p));
  selection.apply(gesture,new Set(snapshot.pawns.filter(p=>singleEnemy||isColonist(p)).map(p=>p.id)));
  selectedPawn=selection.single;selectedCell=undefined;
  renderer?.setSelectedPawns(selection.ids);
  setPanel(null);
  if(focus&&selectedPawn!==undefined)renderer?.focusPawn(selectedPawn);
  rebuildInspector(); renderState();
}
function pickCell(x: number, z: number) {
  if (!snapshot || replacingWorld) return;
  if(shootingControls.active){
    const target=shootingControls.mode==='melee'?snapshot.structures.find(s=>(s.kind==='wall'||s.kind==='door')&&s.x===x&&s.z===z):undefined;
    shootingControls.cancel();if(target)void attempt(async()=>{await client.command({type:'melee',pawnIds:[...selection.ids],targetId:target.id,structure:true});renderState();});else renderState();return;
  }
  if (currentTool !== 'select') {
    const tool = currentTool;
    void attempt(() => {
      if(tool==='install'){if(installationId===undefined)throw new Error('Sélectionnez un meuble à installer.');return client.command({type:'install',structureId:installationId,x,z,orientation:furnitureObject(snapshot!,installationId)?.kind==='standing-lamp'?0:placementOrientation}).then(()=>{applyTool('select');setPanel(null);});}
      if (tool==='home'||tool==='remove-home'||isRoofArea(tool) || tool === 'haul-chunks' || tool === 'growing' || tool === 'remove-growing') return client.command({type:'area',action:tool,from:{x,z},to:{x,z}});
      if (tool === 'stockpile') return client.command({ type: 'stockpile', x, z, enabled: true, ...readStorageSettings('stockpile') });
      if (tool === 'remove-stockpile') return client.command({ type: 'stockpile', x, z, enabled: false });
      return client.command(tool === 'cancel' ? { type: 'cancel', x, z } : { type: 'designate', kind: tool as JobKind, orientation: tool==='wood-generator'||tool==='standing-lamp'||tool==='door'||tool==='passive-cooler'?0:placementOrientation, x, z, ...(constructionUI.material(tool) ? {material:constructionUI.material(tool)} : {}) });
    });
    return;
  }
  selection.clear();renderer?.setSelectedPawns(selection.ids);
  selectedPawn = undefined; selectedCell = { x, z };
  setPanel(null); rebuildInspector(); renderState();
}
function designateArea(action: AreaAction, from: Cell, to: Cell) {
  if (!snapshot || replacingWorld) return;
  void attempt(async () => {
    const response = await client.command({ type: 'area', action, from, to, ...(action === 'stockpile' ? readStorageSettings('stockpile') : {}) });
    const result = JSON.parse(response!) as { affected: number; skipped: number };
    const label = action==='home'||action==='remove-home'?'case(s) de foyer modifiée(s)':isRoofArea(action) ? 'case(s) de zone de toiture modifiée(s)' : action === 'growing' ? 'case(s) de culture créée(s)' : action === 'remove-growing' ? 'case(s) de culture retirée(s)' : action === 'cancel' ? 'ordre(s) annulé(s)' : action === 'remove-stockpile' ? 'case(s) de réserve retirée(s)' : action === 'stockpile' ? 'case(s) de réserve créée(s)' : 'ordre(s) de collecte créé(s)';
    notify(`${result.affected} ${label}${result.skipped ? ` · ${result.skipped} case(s) ignorée(s)` : ''}.`);
  });
}
function clearSelection() {
  selection.clear();renderer?.setSelectedPawns(selection.ids);orderMenu.close();
  selectedPawn = undefined; selectedCell = undefined;
  rebuildInspector();renderState();
}
function readStorageSettings(prefix: string) {
  const capacity = Number(el<HTMLInputElement>(`${prefix}-capacity`).value);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > MAX_STACK) throw new Error(`La capacité doit être un entier entre 1 et ${MAX_STACK}.`);
  return {
    filters: { unfinished:el<HTMLInputElement>(`${prefix}-unfinished`).checked, textile:el<HTMLInputElement>(`${prefix}-textile`).checked, apparel:el<HTMLInputElement>(`${prefix}-apparel`).checked, weapon:el<HTMLInputElement>(`${prefix}-weapon`).checked, medicine:el<HTMLInputElement>(`${prefix}-medicine`).checked, component: el<HTMLInputElement>(`${prefix}-component`).checked, blocks: el<HTMLInputElement>(`${prefix}-blocks`).checked, steel: el<HTMLInputElement>(`${prefix}-steel`).checked, chunk: el<HTMLInputElement>(`${prefix}-chunk`).checked, wood: el<HTMLInputElement>(`${prefix}-wood`).checked, food: el<HTMLInputElement>(`${prefix}-food`).checked, furniture: el<HTMLInputElement>(`${prefix}-furniture`).checked },
    priority: Number(el<HTMLSelectElement>(`${prefix}-priority`).value), capacity,
  };
}
function rotatePlacement(direction = 1) {
  placementOrientation = ((placementOrientation + direction + 4) % 4) as Orientation;
  renderer?.setPlacementRotation(placementOrientation);
  el('placement-orientation').textContent = `${placementOrientation * 90}°`;
}
function rebuildInspector() {
  const panel = el('inspector');
  panel.hidden = currentPanel !== null || (!selection.ids.size && !selectedCell);
  if(selection.ids.size>1) {
    panel.innerHTML='<div class="panel-heading"><h2 id="group-title"></h2><button id="inspect-close" aria-label="Fermer l’inspection">×</button></div><div id="group-members"></div><p class="muted">Sélectionnez un colon pour lui donner un ordre de travail.</p>';
    for(const id of selection.ids) {
      const button=document.createElement('button');button.dataset.groupPawn=String(id);button.onclick=()=>selectPawn(id);el('group-members').append(button);
    }
  } else if(selectedPawn!==undefined&&snapshot?.pawns.some(p=>p.id===selectedPawn&&!isColonist(p))) {
    panel.innerHTML='<div class="panel-heading"><h2 id="selected-name"></h2><button id="inspect-close" aria-label="Fermer l’inspection">×</button></div><p id="selected-action"></p><p>Hors-la-loi · hostile à la colonie. Tir et mêlée.</p><p id="enemy-mandate"></p>';
    createEquipmentInspection(panel,()=>{const pawn=snapshot?.pawns.find(p=>p.id===selectedPawn);return snapshot&&pawn?{world:snapshot,pawn}:undefined;},()=>{});
    el('enemy-mandate').textContent=snapshot.pawns.find(p=>p.id===selectedPawn)?.tactics?'Mandat : approche autonome des cibles visibles.':'Mandat historique : sentinelle fixe.';
    createHealthInspection(panel);
  } else if (selectedPawn !== undefined) {
    panel.innerHTML = `<div class="panel-heading"><h2 id="selected-name"></h2><button id="inspect-close" aria-label="Fermer l’inspection">×</button></div><p id="selected-action"></p><div class="needs">${(['hunger', 'rest', 'comfort', 'mood'] as const).map((need, index) => `<label>${['Nourriture', 'Repos', 'Confort', 'Humeur'][index]} <span id="selected-${need}"></span></label><meter id="${need}-meter" min="0" max="100" low="25" optimum="100"></meter>`).join('')}</div>${recreationInspection()}<button class="secondary-action" id="manage-work">Gérer le travail</button>`;
    createMoodInspection(panel);
    createSocialInspection(panel,renderState);
    el('manage-work').onclick = () => setPanel('work');
    const orders=document.createElement('p');orders.id='selected-orders';panel.append(orders);
    const cancel=document.createElement('button');cancel.id='clear-orders';cancel.textContent='Annuler les ordres directs';
    createEquipmentInspection(panel,()=>{const pawn=snapshot?.pawns.find(p=>p.id===selectedPawn);return snapshot&&pawn?{world:snapshot,pawn}:undefined;},c=>void attempt(()=>client.command(c)));
    createSkillsInspection(panel);createHealthInspection(panel,()=>snapshot?.pawns.find(p=>p.id===selectedPawn),c=>void attempt(()=>client.command(c)));
    cancel.onclick=()=>{if(selectedPawn!==undefined)void attempt(()=>client.command({type:'clear-orders',pawnId:selectedPawn!}));};panel.append(cancel);
  } else if (selectedCell) {
    panel.innerHTML = `<div class="panel-heading"><h2 id="cell-title"></h2><button id="inspect-close" aria-label="Fermer l’inspection">×</button></div><p id="cell-description"></p><p id="cell-materials"></p><button id="weapon-permission" class="secondary-action" hidden></button><p id="cell-job"></p><button id="cell-deconstruct" class="secondary-action" hidden>Déconstruire</button><button id="cell-cancel" class="secondary-action" hidden>Annuler cet ordre</button><div id="cell-storage" hidden><p id="cell-storage-quantity"></p>${storageSettings('selected-stockpile')}<button id="update-stockpile" class="secondary-action">Appliquer les réglages</button><button id="delete-stockpile" class="secondary-action">Retirer cette réserve</button></div>`;
    const storage = snapshot?.stockpiles.find(item => item.x === selectedCell!.x && item.z === selectedCell!.z);
    if (storage) {
      el<HTMLInputElement>('selected-stockpile-unfinished').checked=storage.filters.unfinished??false;
      el<HTMLInputElement>('selected-stockpile-textile').checked = storage.filters.textile??false;
      el<HTMLInputElement>('selected-stockpile-wood').checked = storage.filters.wood;
      el<HTMLInputElement>('selected-stockpile-food').checked = storage.filters.food;
      el<HTMLInputElement>('selected-stockpile-furniture').checked = storage.filters.furniture??false;
      el<HTMLInputElement>('selected-stockpile-blocks').checked = storage.filters.blocks??false;
      el<HTMLInputElement>('selected-stockpile-apparel').checked=storage.filters.apparel??false;
      el<HTMLInputElement>('selected-stockpile-weapon').checked=storage.filters.weapon??false;
      el<HTMLInputElement>('selected-stockpile-medicine').checked=storage.filters.medicine??false;
      el<HTMLInputElement>('selected-stockpile-component').checked = storage.filters.component??false;
      el<HTMLInputElement>('selected-stockpile-steel').checked = storage.filters.steel??false;
      el<HTMLInputElement>('selected-stockpile-chunk').checked = storage.filters.chunk??false;
      el<HTMLSelectElement>('selected-stockpile-priority').value = String(storage.priority);
      el<HTMLInputElement>('selected-stockpile-capacity').value = String(storage.capacity);
    }
    el('update-stockpile').onclick = () => { if (selectedCell) { const cell = { ...selectedCell }; void attempt(async () => { await client.command({ type: 'stockpile', ...cell, enabled: true, ...readStorageSettings('selected-stockpile') }); notify('Réserve mise à jour.'); }); } };
    el('delete-stockpile').onclick = () => { if (selectedCell) { const cell = { ...selectedCell }; void attempt(async () => { await client.command({ type: 'stockpile', ...cell, enabled: false }); rebuildInspector(); renderState(); }); } };
    el('cell-deconstruct').onclick=()=>{if(selectedCell)void attempt(()=>client.command({type:'designate',kind:'deconstruct',...selectedCell!}));};
    el('cell-cancel').onclick=()=>{if(selectedCell)void attempt(()=>client.command({type:'cancel',...selectedCell!}));};
    doorControls(panel,()=>snapshot,()=>selectedCell,c=>void attempt(()=>client.command(c)));
    furnitureControls(panel,()=>snapshot,()=>selectedCell,c=>void attempt(()=>client.command(c)),id=>{const object=furnitureObject(snapshot!,id);if(!object)return;setPanel('architect');applyTool('install');installationId=id;placementOrientation=object.orientation;renderer?.setPlacementRotation(placementOrientation);renderer?.setFurniturePlacement(object);});
    bedControls(panel,()=>snapshot,()=>selectedCell,c=>void attempt(()=>client.command(c)));
    const fire=snapshot?.structures.find(s=>(stationRecipe(s)!==null||s.kind==='passive-cooler'||s.kind==='wood-generator')&&footprintCells(s).some(c=>c.x===selectedCell!.x&&c.z===selectedCell!.z));
    if(fire) {
      const send=(command:Command)=>void attempt(async()=>{await client.command(command);rebuildInspector();renderState();});
      if(fire.fuel)panel.append(fireControls(fire,send));if(stationRecipe(fire))panel.append(billControls(fire,send));
    }
    const zone = snapshot && growingZoneAt(snapshot, selectedCell.z * snapshot.width + selectedCell.x);
    if (zone) panel.append(growingControls(zone, command => void attempt(async () => { await client.command(command); rebuildInspector(); renderState(); })));
  } else panel.replaceChildren();
  if(selection.ids.size&&snapshot?.pawns.some(p=>selection.ids.has(p.id)&&isColonist(p))){createDraftControls(panel,()=>snapshot?.pawns.filter(p=>selection.ids.has(p.id))??[],c=>void attempt(async()=>{await client.command(c);renderState();}));shootingControls.create(panel,()=>snapshot?.pawns.filter(p=>selection.ids.has(p.id))??[],()=>renderState());}
  const close = document.getElementById('inspect-close');
  if (close) close.onclick = clearSelection;
}
function actionLabel(pawn: Pawn) {
  if(pawn.mental?.crisis)return queryPawnStatus(snapshot!,pawn).reason;
  if(pawn.flee)return pawn.path.length||pawn.moveCooldown>0?'Fuit une menace':'Reste à couvert après la fuite';
  if(pawn.stun)return 'Étourdi';
  if(pawn.melee)return pawn.melee.strike?'Mêlée · récupération':pawn.path.length?'Mêlée · approche':'Mêlée · au contact';
  if(pawn.tactics&&activeThreat(pawn)&&pawn.state==='moving')return 'Hors-la-loi · rejoint sa position de combat';
  if(!isColonist(pawn)&&activeThreat(pawn))return pawn.shooting?.stance?.phase==='aim'?'Hors-la-loi · vise':pawn.shooting?'Hors-la-loi · récupération après tir':'Hors-la-loi · surveille les alentours';
  if(pawn.draft)return draftLabel(pawn);
  if(pawn.shooting)return pawn.shooting.stance?.phase==='cooldown'?'Récupération après tir':pawn.shooting.stance?.phase==='aim'?'Riposte · vise':'Riposte · rejoint sa position';
  if(pawn.equipmentTask)return ({equip:'Va équiper son arme',drop:'Dépose son arme',wear:pawn.state==='working'?'Enfile un vêtement':'Va chercher un vêtement',remove:'Retire un vêtement'})[pawn.equipmentTask.action];
  if(pawn.feed||pawn.tend||pawn.state==='resting'||pawn.rescue||carrierOf(snapshot!,pawn.id))return queryPawnStatus(snapshot!,pawn).reason;
  if(pawn.state==='downed'||pawn.state==='dead')return stateLabels[pawn.state];
  if(pawn.interruptedCargo)return pawn.state==='sleeping'?'Se repose · cargaison à déposer':'Cargaison à déposer · sol proche encombré';
  if(pawn.cooking)return queryPawnStatus(snapshot!,pawn).reason;
  if (pawn.need) return queryPawnStatus(snapshot!, pawn).reason;
  if(pawn.haul?.destination.type==='fuel')return queryPawnStatus(snapshot!,pawn).reason;
  if (pawn.haul) {
    const destination = pawn.haul.destination.type === 'job' ? 'chantier' : pawn.haul.destination.type === 'aside' ? 'bord du champ' : 'réserve';
    const carried = snapshot?.piles.find(pile => pile.id === pawn.haul!.carryPileId);
    return pawn.haul.phase === 'pickup' ? `Prélèvement · ${pawn.haul.quantity} unités pour ${destination}`
      : `Livraison · ${carried?.quantity ?? pawn.haul.quantity} ${carried ? ITEM_DEFINITIONS[carried.item].label : 'unités'} → ${destination}`;
  }
  const job = snapshot?.jobs.find(item => item.id === pawn.jobId);
  return job ? `${stateLabels[pawn.state]} · ${jobLabels[job.kind].toLocaleLowerCase('fr')}` : stateLabels[pawn.state];
}
function rebuildPawns(world: World) {
  el('colonists').replaceChildren(...world.pawns.filter(isColonist).map((pawn, index) => {
    const button = document.createElement('button');
    button.className = 'colonist'; button.dataset.pawn = String(pawn.id);
    button.innerHTML = `<span class="portrait portrait-${index % 3}"><span class="portrait-head"></span><span class="portrait-body"></span><span class="portrait-vest"></span><span class="pawn-symbol"></span></span><strong></strong><span class="pawn-mood"><i></i></span>`;
    button.onclick = event => selectPawns({ids:[pawn.id],additive:event.shiftKey,toggle:event.shiftKey},!event.shiftKey);
    return button;
  }));
  el('work-rows').replaceChildren(...world.pawns.filter(isColonist).map(pawn => {
    const row = document.createElement('tr'); row.dataset.worker = String(pawn.id);
    const name = document.createElement('th'); name.scope = 'row'; name.textContent = pawn.name; row.append(name);
    for (const work of ['patient','doctor','bedrest', 'gather', 'build', 'haul', 'grow', 'cook', 'craft', 'mine', 'research'] as WorkType[]) {
      const cell = document.createElement('td'), select = document.createElement('select');
      select.dataset.work = work; select.dataset.owner = String(pawn.id);
      select.setAttribute('aria-label', `Priorité ${{ research:'recherche',patient:'patient',bedrest:'repos au lit',doctor:'médecin', mine:'minage', gather: 'collecte', build: 'construction', haul: 'transport', grow: 'culture', cook: 'cuisine', craft:'artisanat' }[work]} ${pawn.name}`);
      for (let value = 0; value <= 4; value++) { const option = document.createElement('option'); option.value = String(value); option.textContent = String(value); select.append(option); }
      select.onchange = () => { void attempt(async () => { try { await client.command({ type: 'priority', pawnId: pawn.id, work, value: Number(select.value) }); } finally { renderState(); } }); };
      cell.append(select); row.append(cell);
    }
    const activity = document.createElement('td'); activity.className = 'work-activity'; row.append(activity); return row;
  }));
}
function renderState() {
  if (!snapshot) return;
  const world = snapshot;
  updateResearchPanel(el('research-content'),world,c=>void attempt(()=>client.command(c)));
  scheduleUI.update(world);
  foodPolicyUI.update(world);
  el('blocks').textContent=String(world.piles.reduce((n,p)=>n+(p.kind==='blocks'&&p.owner.type!=='job'?p.quantity:0),0));
  el('medicine').textContent=String(world.piles.reduce((n,p)=>n+(p.kind==='medicine'&&p.owner.type!=='job'?p.quantity:0),0));
  el('component').textContent = String(world.piles.reduce((n,p)=>n+(p.item==='component'&&p.owner.type!=='job'?p.quantity:0),0));
  const cloth=world.piles.reduce((n,p)=>n+(p.item==='cloth'&&p.owner.type!=='job'?p.quantity:0),0);el('cloth').textContent=String(cloth);el('cloth-stock').hidden=cloth===0;
  el('steel').textContent = String(world.piles.reduce((n,p)=>n+(p.item==='steel'&&p.owner.type!=='job'?p.quantity:0),0));
  el('wood').textContent = String(world.stock.wood); el('food').textContent = availableNutrition(world).toFixed(1); updateFoodStocks(el('food-items'), world);
  const carried = world.piles.filter(pile => pile.owner.type === 'pawn').reduce((sum, pile) => sum + pile.quantity, 0);
  const delivered = world.piles.filter(pile => pile.owner.type === 'job').reduce((sum, pile) => sum + pile.quantity, 0);
  el('material-status').textContent = `${carried} portées · ${delivered} au chantier`;
  el('population').textContent = String(world.pawns.filter(p=>isColonist(p)&&p.state!=='dead').length); el('map-size').textContent = `${world.width} × ${world.height}`;
  el('outdoor-temperature').textContent = `Extérieur : ${outdoorTemperature(world.tick).toFixed(1)} °C`;
  el('day').textContent = `Jour ${1 + Math.floor(world.tick / TICKS_PER_DAY)}`;
  const hour = 24 * (world.tick % TICKS_PER_DAY) / TICKS_PER_DAY;
  el('clock').textContent = `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.floor((hour % 1) * 60)).padStart(2, '0')}`;
  el('pause-banner').hidden = currentSpeed !== 0;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-speed]')) {
    const active = Number(button.dataset.speed) === currentSpeed;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  }
  const signature = JSON.stringify(world.pawns.filter(isColonist).map(pawn => [pawn.id, pawn.name]));
  if (signature !== pawnSignature) { pawnSignature = signature; rebuildPawns(world); }
  const equipment=equipmentProjection(world),apparel=apparelProjection(world);
  for (const pawn of world.pawns.filter(isColonist)) {
    const button = document.querySelector<HTMLButtonElement>(`[data-pawn="${pawn.id}"]`)!;
    button.classList.toggle('selected', selection.ids.has(pawn.id));button.dataset.drafted=String(!!pawn.draft);
    button.setAttribute('aria-pressed', String(selection.ids.has(pawn.id)));
    button.querySelector('strong')!.textContent = pawn.name; button.title = `${pawn.name} · ${actionLabel(pawn)} · ${equipmentDescription(equipment.get(pawn.id),pawn)}`;button.dataset.equipment=equipment.get(pawn.id)?.item??'';
    const look=apparelAppearance(apparel.get(pawn.id));button.dataset.apparel=look.signature;button.title+=` · ${look.description}`;
    (button.querySelector('.portrait-body') as HTMLElement).style.background=look.color!==undefined?`#${look.color.toString(16)}`:'';
    (button.querySelector('.portrait-vest') as HTMLElement).hidden=!look.vest;
    button.querySelector('.pawn-symbol')!.textContent = pawn.state==='dead'?'†':pawn.state==='downed'?'!':pawn.mental?.crisis?'↝':pawn.state === 'sleeping' ? 'Z' : pawn.state === 'hungry' ? '!' : '';
    (button.querySelector('i') as HTMLElement).style.width = `${pawn.state==='dead'?0:pawn.mood}%`;
    const row = document.querySelector<HTMLElement>(`[data-worker="${pawn.id}"]`)!;
    updateWorkSkills(row,pawn);
    row.querySelector('.work-activity')!.textContent = actionLabel(pawn);
    for (const select of row.querySelectorAll<HTMLSelectElement>('select')) select.value = String(pawn.priorities[select.dataset.work as WorkType]);
  }
  updateDraftControls(el('inspector'),world.pawns.filter(p=>selection.ids.has(p.id)));
  shootingControls.update(el('inspector'),world.pawns.filter(p=>selection.ids.has(p.id)));
  if(selection.ids.size>1) {
    el('group-title').textContent=`${selection.ids.size} colons sélectionnés`;
    for(const button of el('group-members').querySelectorAll<HTMLButtonElement>('button')) {
      const pawn=world.pawns.find(p=>p.id===Number(button.dataset.groupPawn));
      button.textContent=pawn?`${pawn.name} · ${actionLabel(pawn)}`:'Colon absent';
    }
  } else if (selectedPawn !== undefined) {
    const pawn = world.pawns.find(item => item.id === selectedPawn);
    if (!pawn) clearSelection();
    else if(!isColonist(pawn)){el('selected-name').textContent=pawn.name;el('selected-action').textContent=actionLabel(pawn);updateEquipmentInspection(el('inspector'),world,pawn);updateHealthInspection(el('inspector'),pawn);}
    else {
      el('selected-name').textContent = pawn.name; el('selected-action').textContent = pawn.draft||pawn.equipmentTask||pawn.need||pawn.feed||pawn.tend||pawn.rescue||pawn.state==='dead'||pawn.state==='downed' ? actionLabel(pawn) : `${actionLabel(pawn)} · ${queryPawnStatus(world, pawn).reason}`;
      updateEquipmentInspection(el('inspector'),world,pawn);updateSkillsInspection(el('inspector'),pawn);updateHealthInspection(el('inspector'),pawn);
      updateRecreationInspection(el('inspector'),pawn);
      roomInspection.update(el('inspector'), world, pawn);
      el('selected-orders').textContent=`${pawn.orders.active!==null?'Travail imposé · ':''}${pawn.orders.queue.length} ordre(s) en file${pawn.priorityWork?` · Priorité case ${pawn.priorityWork.cell.x}, ${pawn.priorityWork.cell.z}`:''}`;
      el<HTMLButtonElement>('clear-orders').disabled=pawn.orders.active===null&&!pawn.orders.queue.length&&!pawn.priorityWork;
      updateMoodInspection(el('inspector'),world,pawn);
      updateSocialInspection(el('inspector'),world,pawn);
      for (const need of ['hunger', 'rest', 'comfort', 'mood'] as const) { el(`selected-${need}`).textContent = pawn.state==='dead'?'—':`${Math.round(pawn[need])} %`; el<HTMLMeterElement>(`${need}-meter`).value = pawn.state==='dead'?0:pawn[need]; }
    }
  } else if (selectedCell) {
    const { x, z } = selectedCell;
    if (x >= world.width || z >= world.height) clearSelection();
    else {
      const resource = world.resources.find(item => item.x === x && item.z === z);
      const structure = world.structures.find(item => footprintCells(item).some(cell => cell.x === x && cell.z === z));
      const job = world.jobs.find(item => footprintCells(item).some(cell => cell.x === x && cell.z === z))??furnitureIntentAt(world,selectedCell);
      const storage = world.stockpiles.find(item => item.x === x && item.z === z);
      const piles = world.piles.filter(item => item.owner.type === 'ground' && item.owner.x === x && item.owner.z === z);
      updateFurnitureControls(el('inspector'),world,selectedCell);
      updateDoorControls(el('inspector'),world,selectedCell);
      roomInspection.update(el('inspector'), world, selectedCell);
      const packed=packedAt(world,selectedCell);
      el('cell-title').textContent = packed?'Meuble emballé · '+({'research-bench':'bureau de recherche','tailor-bench':'établi de tailleur','crafting-spot':'artisanat','wood-generator':'générateur à bois','standing-lamp':'lampe sur pied','passive-cooler':'refroidisseur passif',door:'porte',bed:'lit',table:'table',stool:'tabouret',horseshoes:'piquet',wall:'mur',campfire:'feu',stonecutter:'table de taille'})[packed.building.kind]:structure ? ({ 'research-bench':'Bureau de recherche','tailor-bench':'Établi de tailleur', 'crafting-spot':'Emplacement d’artisanat','wood-generator':'Générateur à bois','standing-lamp':'Lampe sur pied','passive-cooler':'Refroidisseur passif',door:'Porte', stonecutter:'Table de taille de pierre', wall: 'Mur', bed: 'Lit', table: 'Table', stool: 'Tabouret', horseshoes: 'Piquet de fers à cheval', campfire: 'Feu de camp' })[structure.kind] : resource ? resourceLabels[resource.kind] : terrainLabels[world.tiles[z * world.width + x].terrain];
      el('cell-description').textContent = `Case ${x}, ${z}${resource ? isPlant(resource) ? plantInspection(world,resource) : ` · ${resource.amount} unités à récolter` : ''}${structure ? ` · ${structureFootprintLabel(structure)} cases` : ''}`;
      if(growingZoneAt(world,z*world.width+x))el('cell-description').textContent+=growingTemperatureInspection(world,selectedCell);
      if(structure&&isBarrier(structure))el('cell-description').textContent+=` · Résistance : ${barrierHp(structure)}/${barrierMaxHp(structure)} PV · ${world.home?.includes(z*world.width+x)?'Zone de foyer':'Hors zone de foyer (réparation désactivée)'}`;
      const building = packed?.building ?? structure;
      if (building && building.kind !== 'crafting-spot' && building.kind !== 'campfire' && building.kind !== 'passive-cooler') el('cell-title').textContent += ` · ${ITEM_DEFINITIONS[building.material ?? 'wood'].label}${building.material === undefined ? ' (ancien)' : ''}`;
      const rock = rockInspection(world.tiles[z * world.width + x]!, resource);
      if (!packed && !structure && rock) { el('cell-title').textContent = rock.title; el('cell-description').textContent = `Case ${x}, ${z} · ${rock.description}`; }
      const weapon=piles.find(p=>p.kind==='weapon'||p.kind==='apparel'),permission=el<HTMLButtonElement>('weapon-permission');permission.hidden=!weapon;
      if(weapon){const forbidden=!!(weapon.weapon??weapon.apparel)?.forbidden;permission.textContent=forbidden?'Autoriser cet objet':'Interdire cet objet';permission.onclick=()=>void attempt(()=>client.command({type:weapon.kind==='apparel'?'apparel-permission':'weapon-permission',itemId:weapon.id,allowed:forbidden}));}
      el('cell-materials').textContent = piles.length ? `Au sol : ${piles.map(pile => `${pile.quantity} ${ITEM_DEFINITIONS[pile.item].label}${pile.kind==='food'?` · ${foodFreshnessLabel(pile,world.tick)}`:''}`).join(' · ')}` : '';
      updateUnfinishedInspection(el('inspector'),world,piles.find(p=>p.unfinished),c=>void attempt(()=>client.command(c)));
      el('cell-job').textContent = job ? `${job.construction==='blueprint'?'Plan · ':job.construction==='frame'?'Cadre · ':''}${jobLabels[job.kind]} · ${queryJobStatus(world, job).reason ?? 'En cours'}${constructionDeliveryLabel(world,job) ? ` · Livré : ${constructionDeliveryLabel(world,job)}` : ''}` : 'Aucun ordre sur cette case.';
      if(structure?.kind==='bed')el('cell-description').textContent += ` · Efficacité du repos : ${structure.material?.endsWith('-blocks')?90:100} %`;
      if(structure?.power)el('cell-description').textContent+=powerInspection(world,structure);
      if(structure?.kind==='crafting-spot')el('cell-description').textContent+=' · Gratuit · 60 tissus → tenue tribale · vitesse de poste 50 % · Artisanat.';
      if(structure?.kind==='stonecutter')el('cell-description').textContent += ' · 1 fragment → 20 blocs · Artisanat.';
      if(structure?.kind==='horseshoes')el('cell-description').textContent += ` · Dextérité · ${world.pawns.filter(p=>p.recreation.task?.buildingId===structure.id).length}/3 joueurs · places à 5 cases, ligne de vue dégagée.`;
      if(structure?.fuel)updateFireControls(el('inspector'),structure);
      if(structure&&stationRecipe(structure))updateBillControls(el('inspector'),structure,world);
      el('cell-deconstruct').hidden=!structure||!!job&&job.kind!=='repair';
      el('cell-cancel').hidden=!job||job.kind==='repair';
      el('cell-storage').hidden = !storage;
      updateBedControls(el('inspector'),world,structure);
      if (storage) el('cell-storage-quantity').textContent = `Réserve · ${packed?1:piles.reduce((sum, pile) => sum + pile.quantity, 0)} / ${storage.capacity} unités`;
    }
  }
  const pending = world.jobs.filter(job => job.status === 'pending').length;
  el('job-count').textContent = world.jobs.length ? `${world.jobs.length} ordre(s) · ${pending} en attente` : 'Aucun ordre en cours';
  const entries = world.events.slice(-30).reverse();
  el('journal-items').replaceChildren(...entries.map(entry => {
    const item = document.createElement('p'), time = document.createElement('span'); time.className = 'event-time';
    time.textContent = `J${1 + Math.floor(entry.tick / TICKS_PER_DAY)} · `;
    item.append(time, document.createTextNode(entry.message)); return item;
  }));
  if (!entries.length) el('journal-items').textContent = 'Trois survivants. Une nouvelle histoire.';
  const living=world.pawns.filter(p=>isColonist(p)&&p.state!=='dead');
  const alerts: string[] = [];
  const crises=living.filter(p=>p.mental?.crisis).length;if(crises)alerts.push(`${crises} colon(s) en errance triste`);
  const enemy=world.pawns.find(p=>!isColonist(p)&&activeThreat(p));
  const threatButton=el<HTMLButtonElement>('inspect-threat');threatButton.hidden=!enemy;if(enemy){threatButton.textContent='Menace armée · voir';threatButton.onclick=()=>selectPawn(enemy.id);}
  const downed=living.filter(p=>p.state==='downed').length,bleeding=living.filter(p=>p.health&&medicalBleed(p.health)>=.1).length,deaths=world.pawns.filter(isColonist).length-living.length;
  if(downed)alerts.push(`${downed} colon(s) à terre`);
  if(bleeding)alerts.push(`${bleeding} colon(s) saignent`);
  if(deaths)alerts.push(`${deaths} colon(s) décédé(s)`);
  if (availableNutrition(world) < living.length * 1.6) alerts.push('Réserves de nourriture faibles');
  const hungry = living.filter(pawn => pawn.hunger < 25).length;
  if (hungry) alerts.push(`${hungry} colon(s) affamé(s)`);
  if (pending) alerts.push(`${pending} ordre(s) en attente`);
  if (!world.stockpiles.length) alerts.push('Aucune réserve de stockage');
  if (world.jobs.some(job => constructionRecipe(job).ingredients.length > 0) && world.pawns.every(pawn => pawn.priorities.haul === 0&&pawn.priorities.build === 0)) alerts.push('Construction/transport désactivés : chantiers non approvisionnés');
  const interrupted=world.pawns.filter(pawn=>pawn.interruptedCargo).length;
  if(interrupted)alerts.push(`${interrupted} cargaison(s) conservée(s) : fin de déplacement ou sol proche à libérer`);
  const idle = world.pawns.filter(pawn => isColonist(pawn)&&pawn.state === 'idle'&&!pawn.draft&&!pawn.flee&&!pawn.mental?.crisis&&!pawn.interruptedCargo).length;
  if (idle) alerts.push(`${idle} colon(s) disponible(s)`);
  el('status-alerts').replaceChildren(...alerts.map(text => { const item = document.createElement('p'); item.textContent = text; return item; }));
  const beds = world.structures.filter(structure => structure.kind === 'bed'&&!structure.medical).length;
  if (beds < living.length) { const item = document.createElement('p'); item.dataset.alert = 'beds'; item.textContent = `${living.length - beds} couchage(s) manquant(s)`; el('status-alerts').append(item); }
  arrivalUI.update(world);raidUI.update(world);
}
const raidUI=createRaidUI(command=>client.command(command),id=>renderer?.focusPawn(id));
const arrivalUI=createArrivalUI(command=>client.command(command));
function syncStorageButtons() {
  document.querySelector<HTMLElement>('.game-shell')!.inert=replacingWorld;
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-speed]'))button.disabled=replacingWorld;
  for (const [id, key] of [['load', SAVE_KEY], ['restore-previous', PREVIOUS_KEY]]) {
    try { el<HTMLButtonElement>(id).disabled = replacingWorld || savingWorld || !localStorage.getItem(key); } catch { el<HTMLButtonElement>(id).disabled = true; }
  }
  el<HTMLButtonElement>('save').disabled=replacingWorld||savingWorld;
}
let savingWorld=false;
async function save() {
  if(replacingWorld||savingWorld)return;
  savingWorld=true;syncStorageButtons();notify('Sauvegarde en cours…');
  try {
    const data = await client.save(); if (!data) throw new Error('Sauvegarde vide.');
    localStorage.setItem(SAVE_KEY, data);notify('Colonie sauvegardée dans ce navigateur.');
  } finally {savingWorld=false;syncStorageButtons();}
}
async function load(key = SAVE_KEY) {
  if (replacingWorld||savingWorld) return;
  const data = localStorage.getItem(key); if (!data) throw new Error('Aucune sauvegarde locale.');
  replacingWorld = true; syncStorageButtons(); notify('Chargement et préparation de la colonie…');
  try { await client.load(data); await renderer?.preparePresentation(); clearSelection(); setPanel(null); notify(key === PREVIOUS_KEY ? 'Colonie précédente restaurée.' : 'Dernière sauvegarde rechargée.'); }
  finally { replacingWorld = false; syncStorageButtons(); }
}
async function createWorld() {
  if (replacingWorld) return;
  el('new-world-error').hidden = true;
  const seed = Number(el<HTMLInputElement>('world-seed').value), size = Number(el<HTMLSelectElement>('world-size').value);
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295 || ![32, ...MAP_SIZE_PRESETS].includes(size)) throw new Error('Graine ou taille de carte invalide.');
  replacingWorld = true; syncStorageButtons();
  const submit = el('new-world-form').querySelector<HTMLButtonElement>('[type="submit"]')!; submit.disabled = true;
  try {
    const previous = await client.save(); if (!previous) throw new Error('Impossible de préserver la colonie actuelle.');
    localStorage.setItem(PREVIOUS_KEY, previous);
    await client.init(seed, size,el<HTMLSelectElement>('world-scenario').value as 'camp'|'sentry');
    await renderer?.preparePresentation();
    clearSelection(); setPanel(null); el<HTMLDialogElement>('new-world-dialog').close(); notify(`Nouvelle colonie · ${size} × ${size} · graine ${seed}`);
  } catch (error) {
    el('new-world-error').textContent = error instanceof Error ? error.message : String(error);
    el('new-world-error').hidden = false;
    throw error;
  } finally { replacingWorld = false; submit.disabled = false; syncStorageButtons(); }
}
async function changeSpeed(speed: number) { if (speed > 0) lastSpeed = speed; await client.setSpeed(speed); }
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-tool]')) button.onclick = () => setTool(button.dataset.tool as Tool);
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-category]')) button.onclick = () => { setCategory(button.dataset.category as ArchitectCategory); applyTool('select'); };
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-panel]:not(:disabled)')) button.onclick = () => { const panel = button.dataset.panel as Panel; setPanel(currentPanel === panel ? null : panel); };
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-close-panel]')) button.onclick = () => setPanel(null);
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-speed]')) button.onclick = () => { void attempt(() => changeSpeed(Number(button.dataset.speed))); };
el('save').onclick = () => { void attempt(save); }; el('load').onclick = () => { void attempt(() => load()); };
el('restore-previous').onclick = () => { void attempt(() => load(PREVIOUS_KEY)); };
el('help-open').onclick = () => { renderer?.cancelDesignation(); el<HTMLDialogElement>('help').showModal(); };
el('new-colony').onclick = () => { renderer?.cancelDesignation(); el<HTMLDialogElement>('new-world-dialog').showModal(); };
el('new-world-close').onclick = () => el<HTMLDialogElement>('new-world-dialog').close();
el('new-world-form').onsubmit = event => { event.preventDefault(); void attempt(createWorld); };
el('show-diagnostics').onclick = () => { const hidden = !el('metrics').hidden; el('metrics').hidden = hidden; el('show-diagnostics').textContent = hidden ? 'Afficher les diagnostics' : 'Masquer les diagnostics'; };
el('wall-cutaway').onclick = () => { wallCutaway = !wallCutaway; renderer?.setWallCutaway(wallCutaway); el('wall-cutaway').textContent = wallCutaway ? 'Murs : coupés' : 'Murs : hauts'; el('wall-cutaway').setAttribute('aria-pressed', String(wallCutaway)); };
el('roof-toggle').onclick=()=>{const button=el('roof-toggle'),visible=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(visible));button.textContent=visible?'Toits : visibles':'Toits : masqués';renderer?.setRoofsVisible(visible);};
el('foliage-toggle').onclick = () => { foliageVisible = !foliageVisible; renderer?.setFoliageVisible(foliageVisible); el('foliage-toggle').textContent = foliageVisible ? 'Feuillage' : 'Troncs'; el('foliage-toggle').setAttribute('aria-pressed', String(!foliageVisible)); };
el('view-home').onclick = () => { const pawn = snapshot?.pawns[0]; if (pawn) renderer?.focusPawn(pawn.id); };
el('camera-mode').onclick = () => {
  const perspective = renderer?.toggleCameraMode() === 'perspective';
  el('camera-mode').textContent = perspective ? 'Vue : perspective' : 'Vue : iso';
  el('camera-mode').setAttribute('aria-pressed', String(perspective));
  el('camera-mode').title = `Basculer en ${perspective ? 'vue isométrique' : 'perspective'} ; glisser avec le bouton droit pour tourner`;
};
el('rotate-building').onclick = () => rotatePlacement();
syncStorageButtons(); setCategory(currentCategory); applyTool('select');
document.addEventListener('keydown', event => {
  if(event.defaultPrevented)return;
  if (document.querySelector('dialog[open]')) return;
  if (event.target instanceof HTMLElement && (event.target.matches('input, select, textarea') || event.target.isContentEditable)) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void attempt(save); return; }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'Space') { event.preventDefault(); void attempt(() => changeSpeed(currentSpeed === 0 ? lastSpeed : 0)); return; }
  if (event.key === 'Escape') { event.preventDefault(); if(shootingControls.active){shootingControls.cancel();renderState();return;} if (orderMenu.close() || renderer?.cancelDesignation()) return; setPanel(null); clearSelection(); return; }
  if (event.key === 'Tab' || event.key === 'F1' || event.key === 'F2' || event.key === 'F3') { event.preventDefault(); const panel = event.key === 'Tab' ? 'architect' : event.key === 'F1' ? 'work' : event.key === 'F2' ? 'schedule' : 'assign'; setPanel(currentPanel === panel ? null : panel); return; }
  const speeds: Record<string, number> = { '1': 1, '2': 3, '3': 6 };
  if (event.key in speeds) { void attempt(() => changeSpeed(speeds[event.key])); return; }
  if(event.key.toLowerCase()==='r'&&selection.ids.size){event.preventDefault();if(!event.repeat)toggleDraft(snapshot?.pawns.filter(p=>selection.ids.has(p.id))??[],c=>void attempt(async()=>{await client.command(c);renderState();}));return;}
  const shortcuts: Record<string, Tool> = { m:'mine', c: 'chop', r: 'harvest', b: 'wall', l: 'bed', x: 'cancel' };
  const key = event.key.toLowerCase(); if (key in shortcuts) setTool(shortcuts[key]);
  else if ((currentTool === 'install' || currentTool === 'bed' || currentTool === 'table' || currentTool === 'campfire' || currentTool === 'stonecutter' || currentTool === 'crafting-spot' || currentTool === 'research-bench' || currentTool === 'tailor-bench') && (key === 'q' || key === 'e')) { event.preventDefault(); rotatePlacement(key === 'q' ? -1 : 1); }
  else if (key === 's') { event.preventDefault(); setTool('stockpile'); }
});
client.onError = message => notify(message, true);
client.onSnapshot = (world, cost, speed, replaced, motion) => {
  const speedChanged=currentSpeed!==speed;
  snapshot=world;stepMs=cost;currentSpeed=speed;
  const changed=replaced||[...selection.ids].some(id=>!world.pawns.some(p=>p.id===id));
  if(changed){selection.clear();selectedPawn=undefined;selectedCell=undefined;orderMenu.close();rebuildInspector();}
  renderer?.setWorld(world,replaced,speed,motion);
  if(changed)renderer?.setSelectedPawns(selection.ids);
  snapshotHud.request(changed||speedChanged);
};
async function start() {
  try {
    const params = new URLSearchParams(location.search), seedText = params.get('seed'), requestedSize = Number(params.get('size'));
    const seed = seedText && /^\d{1,10}$/.test(seedText) ? Number(seedText) >>> 0 : 42;
    await client.init(seed, [32, ...MAP_SIZE_PRESETS].includes(requestedSize) ? requestedSize : DEFAULT_MAP_SIZE);
    renderer = await ColonyRenderer.create(el('viewport'), pickCell);
    renderer.onSelection=gesture=>{if(shootingControls.active){const targetId=gesture.ids[0];if(targetId!==undefined){const type=shootingControls.mode!;shootingControls.cancel();void attempt(async()=>{await client.command({type,pawnIds:[...selection.ids],targetId});renderState();});}return;}selectPawns(gesture);};
    renderer.onInteractionCancel=()=>orderMenu.close();
    renderer.onContext=(cell,x,y,queue)=>{if(shootingControls.active){shootingControls.cancel();renderState();return;}if(!snapshot||replacingWorld)return;const selected=snapshot.pawns.filter(p=>selection.ids.has(p.id));if(selected.some(p=>p.draft)){orderMenu.close();void attempt(()=>client.command({type:'draft-move',pawnIds:selected.map(p=>p.id),target:cell,queue}));}else void orderMenu.open(snapshot,selection.ids,cell,x,y,queue);};
    renderer.onArea = designateArea;
    renderer.onAreaPreview = info => {
      el('area-feedback').hidden = !info;
      if (info) el('area-feedback').textContent = `${info.width} × ${info.height} · ${info.eligible} case(s) retenue(s) · ${info.skipped} ignorée(s) — Relâcher pour appliquer · Échap pour annuler`;
    };
    if (snapshot) renderer.setWorld(snapshot);
    await renderer.preparePresentation();
    el('loading').remove();
    if (import.meta.env.DEV && params.has('e2e')) Object.defineProperty(window, '__lisiere', { value: {
      get world() { return structuredClone(snapshot); }, get tick() { return snapshot?.tick ?? 0; }, get backend() { return renderer?.backend; },
      projectCell: (x: number, z: number) => renderer!.projectCell(x, z),
    } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const heading = document.createElement('h2'), paragraph = document.createElement('p');
    heading.textContent = 'Le démarrage a rencontré un problème.';
    paragraph.textContent = `${message} Essayez un navigateur récent avec l’accélération graphique activée.`;
    el('loading').replaceChildren(heading, paragraph); console.error(error);
  }
}
const metricsInterval = setInterval(() => {
  if (!renderer) return;
  el('fps-counter').textContent = renderer.stats.fps > 0 ? `${Math.round(renderer.stats.fps)} FPS` : '— FPS';
  if (!el('metrics').hidden) el('metrics').textContent = `${renderer.backend} · ${renderer.stats.frameMs.toFixed(1)} ms/image · p95 ${renderer.stats.frameP95.toFixed(1)} ms · simulation ${stepMs.toFixed(2)} ms/tick`;
}, 1000);
window.addEventListener('pagehide', event => { if (event.persisted) return; clearInterval(metricsInterval); client.dispose(); renderer?.dispose(); });
void start();
