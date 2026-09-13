import './style.css';
import { SimulationClient } from './bridge/SimulationClient';
import { ColonyRenderer } from './render/ColonyRenderer';
import type { JobKind, Pawn, World, WorkType, Orientation, AreaAction, Cell } from './sim/types';
import { TICKS_PER_DAY } from './sim/types';
import { DEFAULT_MAP_SIZE, MAP_SIZE_PRESETS } from './sim/map-config';
import { footprintCells, deliveredStock, queryJobStatus, queryPawnStatus, MAX_STACK } from './sim/index';
import { gameLayout, storageSettings, toolDefinitions } from './ui/layout';
import type { ArchitectCategory, Panel, Tool } from './ui/layout';

const jobLabels: Record<JobKind, string> = { chop: 'Abattage', harvest: 'Récolte', wall: 'Construction du mur', bed: 'Construction du lit' };
const stateLabels: Record<Pawn['state'], string> = { idle: 'Disponible', moving: 'En chemin', working: 'Au travail', sleeping: 'Se repose', hungry: 'Cherche à manger', eating: 'Mange' };
const terrainLabels = { grass: 'Prairie', soil: 'Terre fertile', water: 'Eau infranchissable', rock: 'Massif rocheux infranchissable' };
const resourceLabels = { tree: 'Arbre', berries: 'Buisson de baies', rock: 'Pierre au sol' };
const SAVE_KEY = 'lisiere.save.v1';
const PREVIOUS_KEY = 'lisiere.previous.v1';
document.querySelector<HTMLDivElement>('#app')!.innerHTML = gameLayout();
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const client = new SimulationClient();
let snapshot: World | undefined;
let selectedPawn: number | undefined;
let selectedCell: { x: number; z: number } | undefined;
let currentTool: Tool = 'select';
let currentPanel: Panel = null;
let currentCategory: ArchitectCategory = 'orders';
let placementOrientation: Orientation = 0;
let currentSpeed = 1, lastSpeed = 1, stepMs = 0;
let wallCutaway = false, foliageVisible = true, replacingWorld = false;
let renderer: ColonyRenderer | undefined;
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
let pawnSignature = '';

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
function setCategory(category: ArchitectCategory) {
  currentCategory = category;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-category]')) button.classList.toggle('active', button.dataset.category === category);
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-tool-category]')) button.hidden = button.dataset.toolCategory !== category;
}
function setPanel(panel: Panel) {
  currentPanel = panel;
  for (const name of ['architect', 'work', 'history', 'menu'] as const) el(`${name}-panel`).hidden = panel !== name;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-panel]:not(:disabled)')) {
    const active = button.dataset.panel === panel;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  el('inspector').hidden = panel !== null || (selectedPawn === undefined && !selectedCell);
  if (panel !== 'architect') applyTool('select');
}
function applyTool(tool: Tool) {
  currentTool = tool;
  renderer?.setTool(tool);
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-tool]')) {
    const active = button.dataset.tool === tool;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  el('tool-instruction').textContent = toolDefinitions.find(item => item.id === tool)!.hint;
  el('placement-controls').hidden = tool !== 'bed';
  el('storage-options').hidden = tool !== 'stockpile';
}
function setTool(tool: Tool) {
  const definition = toolDefinitions.find(item => item.id === tool)!;
  setCategory(definition.category);
  setPanel('architect');
  applyTool(tool);
}
function selectPawn(id: number) {
  selectedPawn = id; selectedCell = undefined;
  setPanel(null);
  renderer?.focusPawn(id);
  rebuildInspector(); renderState();
}
function pickCell(x: number, z: number) {
  if (!snapshot || replacingWorld) return;
  if (currentTool !== 'select') {
    const tool = currentTool;
    void attempt(() => {
      if (tool === 'stockpile') return client.command({ type: 'stockpile', x, z, enabled: true, ...readStorageSettings('stockpile') });
      if (tool === 'remove-stockpile') return client.command({ type: 'stockpile', x, z, enabled: false });
      return client.command(tool === 'cancel' ? { type: 'cancel', x, z } : { type: 'designate', kind: tool, orientation: placementOrientation, x, z });
    });
    return;
  }
  const pawn = snapshot.pawns.find(item => item.x === x && item.z === z);
  if (pawn) { selectPawn(pawn.id); return; }
  selectedPawn = undefined; selectedCell = { x, z };
  setPanel(null); rebuildInspector(); renderState();
}
function designateArea(action: AreaAction, from: Cell, to: Cell) {
  if (!snapshot || replacingWorld) return;
  void attempt(async () => {
    const response = await client.command({ type: 'area', action, from, to, ...(action === 'stockpile' ? readStorageSettings('stockpile') : {}) });
    const result = JSON.parse(response!) as { affected: number; skipped: number };
    const label = action === 'cancel' ? 'ordre(s) annulé(s)' : action === 'remove-stockpile' ? 'case(s) de réserve retirée(s)' : action === 'stockpile' ? 'case(s) de réserve créée(s)' : 'ordre(s) de collecte créé(s)';
    notify(`${result.affected} ${label}${result.skipped ? ` · ${result.skipped} case(s) ignorée(s)` : ''}.`);
  });
}
function clearSelection() {
  selectedPawn = undefined; selectedCell = undefined;
  rebuildInspector();
}
function readStorageSettings(prefix: string) {
  const capacity = Number(el<HTMLInputElement>(`${prefix}-capacity`).value);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > MAX_STACK) throw new Error(`La capacité doit être un entier entre 1 et ${MAX_STACK}.`);
  return {
    filters: { wood: el<HTMLInputElement>(`${prefix}-wood`).checked, food: el<HTMLInputElement>(`${prefix}-food`).checked },
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
  panel.hidden = currentPanel !== null || (selectedPawn === undefined && !selectedCell);
  if (selectedPawn !== undefined) {
    panel.innerHTML = `<div class="panel-heading"><h2 id="selected-name"></h2><button id="inspect-close" aria-label="Fermer l’inspection">×</button></div><p id="selected-action"></p><div class="needs">${(['hunger', 'rest', 'mood'] as const).map((need, index) => `<label>${['Nourriture', 'Repos', 'Humeur'][index]} <span id="selected-${need}"></span></label><meter id="${need}-meter" min="0" max="100" low="25" optimum="100"></meter>`).join('')}</div><button class="secondary-action" id="manage-work">Gérer le travail</button>`;
    el('manage-work').onclick = () => setPanel('work');
  } else if (selectedCell) {
    panel.innerHTML = `<div class="panel-heading"><h2 id="cell-title"></h2><button id="inspect-close" aria-label="Fermer l’inspection">×</button></div><p id="cell-description"></p><p id="cell-materials"></p><p id="cell-job"></p><div id="cell-storage" hidden><p id="cell-storage-quantity"></p>${storageSettings('selected-stockpile')}<button id="update-stockpile" class="secondary-action">Appliquer les réglages</button><button id="delete-stockpile" class="secondary-action">Retirer cette réserve</button></div>`;
    const storage = snapshot?.stockpiles.find(item => item.x === selectedCell!.x && item.z === selectedCell!.z);
    if (storage) {
      el<HTMLInputElement>('selected-stockpile-wood').checked = storage.filters.wood;
      el<HTMLInputElement>('selected-stockpile-food').checked = storage.filters.food;
      el<HTMLSelectElement>('selected-stockpile-priority').value = String(storage.priority);
      el<HTMLInputElement>('selected-stockpile-capacity').value = String(storage.capacity);
    }
    el('update-stockpile').onclick = () => { if (selectedCell) { const cell = { ...selectedCell }; void attempt(async () => { await client.command({ type: 'stockpile', ...cell, enabled: true, ...readStorageSettings('selected-stockpile') }); notify('Réserve mise à jour.'); }); } };
    el('delete-stockpile').onclick = () => { if (selectedCell) { const cell = { ...selectedCell }; void attempt(async () => { await client.command({ type: 'stockpile', ...cell, enabled: false }); rebuildInspector(); renderState(); }); } };
    const bedControls = document.createElement('label'); bedControls.id = 'cell-bed'; bedControls.hidden = true;
    bedControls.append('Propriétaire du lit ');
    const owner = document.createElement('select'); owner.id = 'bed-owner'; owner.setAttribute('aria-label', 'Propriétaire du lit');
    owner.append(new Option('Non attribué', ''));
    for (const pawn of snapshot?.pawns ?? []) owner.append(new Option(pawn.name, String(pawn.id)));
    owner.onchange = () => {
      const bed = snapshot?.structures.find(item => item.kind === 'bed' && footprintCells(item).some(cell => cell.x === selectedCell?.x && cell.z === selectedCell?.z));
      if (bed) void attempt(async () => { await client.command({ type: 'assign-bed', bedId: bed.id, pawnId: owner.value ? Number(owner.value) : null }); });
    };
    bedControls.append(owner); panel.append(bedControls);
  } else panel.replaceChildren();
  const close = document.getElementById('inspect-close');
  if (close) close.onclick = clearSelection;
}
function actionLabel(pawn: Pawn) {
  if (pawn.need) return queryPawnStatus(snapshot!, pawn).reason;
  if (pawn.haul) {
    const destination = pawn.haul.destination.type === 'job' ? 'chantier' : 'réserve';
    const carried = snapshot?.piles.find(pile => pile.id === pawn.haul!.carryPileId);
    return pawn.haul.phase === 'pickup' ? `Prélèvement · ${pawn.haul.quantity} unités pour ${destination}`
      : `Livraison · ${carried?.quantity ?? pawn.haul.quantity} ${carried?.kind === 'food' ? 'nourriture' : 'bois'} → ${destination}`;
  }
  const job = snapshot?.jobs.find(item => item.id === pawn.jobId);
  return job ? `${stateLabels[pawn.state]} · ${jobLabels[job.kind].toLocaleLowerCase('fr')}` : stateLabels[pawn.state];
}
function rebuildPawns(world: World) {
  el('colonists').replaceChildren(...world.pawns.map((pawn, index) => {
    const button = document.createElement('button');
    button.className = 'colonist'; button.dataset.pawn = String(pawn.id);
    button.innerHTML = `<span class="portrait portrait-${index % 3}"><span class="portrait-head"></span><span class="portrait-body"></span><span class="pawn-symbol"></span></span><strong></strong><span class="pawn-mood"><i></i></span>`;
    button.onclick = () => selectPawn(pawn.id);
    return button;
  }));
  el('work-rows').replaceChildren(...world.pawns.map(pawn => {
    const row = document.createElement('tr'); row.dataset.worker = String(pawn.id);
    const name = document.createElement('th'); name.scope = 'row'; name.textContent = pawn.name; row.append(name);
    for (const work of ['gather', 'build', 'haul'] as WorkType[]) {
      const cell = document.createElement('td'), select = document.createElement('select');
      select.dataset.work = work; select.dataset.owner = String(pawn.id);
      select.setAttribute('aria-label', `Priorité ${{ gather: 'collecte', build: 'construction', haul: 'transport' }[work]} ${pawn.name}`);
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
  el('wood').textContent = String(world.stock.wood); el('food').textContent = String(world.stock.food);
  const carried = world.piles.filter(pile => pile.owner.type === 'pawn').reduce((sum, pile) => sum + pile.quantity, 0);
  const delivered = world.piles.filter(pile => pile.owner.type === 'job').reduce((sum, pile) => sum + pile.quantity, 0);
  el('material-status').textContent = `${carried} portées · ${delivered} au chantier`;
  el('population').textContent = String(world.pawns.length); el('map-size').textContent = `${world.width} × ${world.height}`;
  el('day').textContent = `Jour ${1 + Math.floor(world.tick / TICKS_PER_DAY)}`;
  const hour = 24 * (world.tick % TICKS_PER_DAY) / TICKS_PER_DAY;
  el('clock').textContent = `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.floor((hour % 1) * 60)).padStart(2, '0')}`;
  el('pause-banner').hidden = currentSpeed !== 0;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-speed]')) {
    const active = Number(button.dataset.speed) === currentSpeed;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  }
  const signature = JSON.stringify(world.pawns.map(pawn => [pawn.id, pawn.name]));
  if (signature !== pawnSignature) { pawnSignature = signature; rebuildPawns(world); }
  for (const pawn of world.pawns) {
    const button = document.querySelector<HTMLButtonElement>(`[data-pawn="${pawn.id}"]`)!;
    button.classList.toggle('selected', selectedPawn === pawn.id);
    button.setAttribute('aria-pressed', String(selectedPawn === pawn.id));
    button.querySelector('strong')!.textContent = pawn.name; button.title = `${pawn.name} · ${actionLabel(pawn)}`;
    button.querySelector('.pawn-symbol')!.textContent = pawn.state === 'sleeping' ? 'Z' : pawn.state === 'hungry' ? '!' : '';
    (button.querySelector('i') as HTMLElement).style.width = `${pawn.mood}%`;
    const row = document.querySelector<HTMLElement>(`[data-worker="${pawn.id}"]`)!;
    row.querySelector('.work-activity')!.textContent = actionLabel(pawn);
    for (const select of row.querySelectorAll<HTMLSelectElement>('select')) select.value = String(pawn.priorities[select.dataset.work as WorkType]);
  }
  if (selectedPawn !== undefined) {
    const pawn = world.pawns.find(item => item.id === selectedPawn);
    if (!pawn) clearSelection();
    else {
      el('selected-name').textContent = pawn.name; el('selected-action').textContent = pawn.need ? actionLabel(pawn) : `${actionLabel(pawn)} · ${queryPawnStatus(world, pawn).reason}`;
      for (const need of ['hunger', 'rest', 'mood'] as const) { el(`selected-${need}`).textContent = `${Math.round(pawn[need])} %`; el<HTMLMeterElement>(`${need}-meter`).value = pawn[need]; }
    }
  } else if (selectedCell) {
    const { x, z } = selectedCell;
    if (x >= world.width || z >= world.height) clearSelection();
    else {
      const resource = world.resources.find(item => item.x === x && item.z === z);
      const structure = world.structures.find(item => footprintCells(item).some(cell => cell.x === x && cell.z === z));
      const job = world.jobs.find(item => footprintCells(item).some(cell => cell.x === x && cell.z === z));
      const storage = world.stockpiles.find(item => item.x === x && item.z === z);
      const piles = world.piles.filter(item => item.owner.type === 'ground' && item.owner.x === x && item.owner.z === z);
      el('cell-title').textContent = structure ? structure.kind === 'wall' ? 'Mur en bois' : 'Lit' : resource ? resourceLabels[resource.kind] : terrainLabels[world.tiles[z * world.width + x].terrain];
      el('cell-description').textContent = `Case ${x}, ${z}${resource ? ` · ${resource.amount} unités à récolter` : ''}${structure ? ` · ${structure.kind === 'bed' && structure.footprint !== 'legacy-single' ? '1 × 2' : '1 × 1'} cases` : ''}`;
      el('cell-materials').textContent = piles.length ? `Au sol : ${piles.map(pile => `${pile.quantity} ${pile.kind === 'wood' ? 'bois' : 'nourriture'}`).join(' · ')}` : '';
      el('cell-job').textContent = job ? `${jobLabels[job.kind]} · ${queryJobStatus(world, job).reason ?? 'En cours'}${job.kind === 'bed' || job.kind === 'wall' ? ` · ${deliveredStock(world, job.id).wood} bois livrés` : ''}` : 'Aucun ordre sur cette case.';
      el('cell-storage').hidden = !storage;
      el('cell-bed').hidden = structure?.kind !== 'bed';
      if (structure?.kind === 'bed' && document.activeElement !== el('bed-owner')) el<HTMLSelectElement>('bed-owner').value = String(world.pawns.find(pawn => pawn.bedId === structure.id)?.id ?? '');
      if (storage) el('cell-storage-quantity').textContent = `Réserve · ${piles.reduce((sum, pile) => sum + pile.quantity, 0)} / ${storage.capacity} unités`;
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
  const alerts: string[] = [];
  if (world.stock.food < 10) alerts.push('Réserves de nourriture faibles');
  const hungry = world.pawns.filter(pawn => pawn.hunger < 25).length;
  if (hungry) alerts.push(`${hungry} colon(s) affamé(s)`);
  if (pending) alerts.push(`${pending} ordre(s) en attente`);
  if (!world.stockpiles.length) alerts.push('Aucune réserve de stockage');
  if (world.jobs.some(job => job.kind === 'wall' || job.kind === 'bed') && world.pawns.every(pawn => pawn.priorities.haul === 0)) alerts.push('Transport désactivé : chantiers non approvisionnés');
  const idle = world.pawns.filter(pawn => pawn.state === 'idle').length;
  if (idle) alerts.push(`${idle} colon(s) disponible(s)`);
  el('alerts').replaceChildren(...alerts.map(text => { const item = document.createElement('p'); item.textContent = text; return item; }));
  const beds = world.structures.filter(structure => structure.kind === 'bed').length;
  if (beds < world.pawns.length) { const item = document.createElement('p'); item.dataset.alert = 'beds'; item.textContent = `${world.pawns.length - beds} couchage(s) manquant(s)`; el('alerts').append(item); }
}
function syncStorageButtons() {
  for (const [id, key] of [['load', SAVE_KEY], ['restore-previous', PREVIOUS_KEY]]) {
    try { el<HTMLButtonElement>(id).disabled = replacingWorld || !localStorage.getItem(key); } catch { el<HTMLButtonElement>(id).disabled = true; }
  }
}
async function save() {
  const data = await client.save(); if (!data) throw new Error('Sauvegarde vide.');
  localStorage.setItem(SAVE_KEY, data); syncStorageButtons(); notify('Colonie sauvegardée dans ce navigateur.');
}
async function load(key = SAVE_KEY) {
  if (replacingWorld) return;
  const data = localStorage.getItem(key); if (!data) throw new Error('Aucune sauvegarde locale.');
  replacingWorld = true; syncStorageButtons();
  try { await client.load(data); clearSelection(); setPanel(null); notify(key === PREVIOUS_KEY ? 'Colonie précédente restaurée.' : 'Dernière sauvegarde rechargée.'); }
  finally { replacingWorld = false; syncStorageButtons(); }
}
async function createWorld() {
  if (replacingWorld) return;
  el('new-world-error').hidden = true;
  const seed = Number(el<HTMLInputElement>('world-seed').value), size = Number(el<HTMLSelectElement>('world-size').value);
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295 || ![32, ...MAP_SIZE_PRESETS].includes(size)) throw new Error('Graine ou taille de carte invalide.');
  replacingWorld = true;
  const submit = el('new-world-form').querySelector<HTMLButtonElement>('[type="submit"]')!; submit.disabled = true;
  try {
    const previous = await client.save(); if (!previous) throw new Error('Impossible de préserver la colonie actuelle.');
    localStorage.setItem(PREVIOUS_KEY, previous);
    await client.init(seed, size);
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
el('foliage-toggle').onclick = () => { foliageVisible = !foliageVisible; renderer?.setFoliageVisible(foliageVisible); el('foliage-toggle').textContent = foliageVisible ? 'Feuillage' : 'Troncs'; el('foliage-toggle').setAttribute('aria-pressed', String(!foliageVisible)); };
el('view-home').onclick = () => { const pawn = snapshot?.pawns[0]; if (pawn) renderer?.focusPawn(pawn.id); };
el('rotate-building').onclick = () => rotatePlacement();
syncStorageButtons(); setCategory(currentCategory); applyTool('select');
document.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]')) return;
  if (event.target instanceof HTMLElement && (event.target.matches('input, select, textarea') || event.target.isContentEditable)) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void attempt(save); return; }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'Space') { event.preventDefault(); void attempt(() => changeSpeed(currentSpeed === 0 ? lastSpeed : 0)); return; }
  if (event.key === 'Escape') { event.preventDefault(); if (renderer?.cancelDesignation()) return; setPanel(null); clearSelection(); return; }
  if (event.key === 'Tab' || event.key === 'F1') { event.preventDefault(); const panel = event.key === 'Tab' ? 'architect' : 'work'; setPanel(currentPanel === panel ? null : panel); return; }
  const speeds: Record<string, number> = { '1': 1, '2': 3, '3': 6 };
  if (event.key in speeds) { void attempt(() => changeSpeed(speeds[event.key])); return; }
  const shortcuts: Record<string, Tool> = { c: 'chop', r: 'harvest', b: 'wall', l: 'bed', x: 'cancel' };
  const key = event.key.toLowerCase(); if (key in shortcuts) setTool(shortcuts[key]);
  else if (currentTool === 'bed' && (key === 'q' || key === 'e')) { event.preventDefault(); rotatePlacement(key === 'q' ? -1 : 1); }
  else if (key === 's') { event.preventDefault(); setTool('stockpile'); }
});
client.onError = message => notify(message, true);
client.onSnapshot = (world, cost, speed, replaced) => { snapshot = world; stepMs = cost; currentSpeed = speed; renderer?.setWorld(world, replaced); renderState(); };
async function start() {
  try {
    const params = new URLSearchParams(location.search), seedText = params.get('seed'), requestedSize = Number(params.get('size'));
    const seed = seedText && /^\d{1,10}$/.test(seedText) ? Number(seedText) >>> 0 : 42;
    await client.init(seed, [32, ...MAP_SIZE_PRESETS].includes(requestedSize) ? requestedSize : DEFAULT_MAP_SIZE);
    renderer = await ColonyRenderer.create(el('viewport'), pickCell);
    renderer.onArea = designateArea;
    renderer.onAreaPreview = info => {
      el('area-feedback').hidden = !info;
      if (info) el('area-feedback').textContent = `${info.width} × ${info.height} · ${info.eligible} case(s) retenue(s) · ${info.skipped} ignorée(s) — Relâcher pour appliquer · Échap pour annuler`;
    };
    if (snapshot) renderer.setWorld(snapshot);
    el('loading').remove();
    if (import.meta.env.DEV && params.has('e2e')) Object.defineProperty(window, '__lisiere', { value: {
      get world() { return structuredClone(snapshot); }, get backend() { return renderer?.backend; },
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
const metricsInterval = setInterval(() => { if (renderer) el('metrics').textContent = `${renderer.backend} · ${Math.round(renderer.stats.fps)} img/s · simulation ${stepMs.toFixed(2)} ms/tick`; }, 1000);
window.addEventListener('pagehide', event => { if (event.persisted) return; clearInterval(metricsInterval); client.dispose(); renderer?.dispose(); });
void start();
