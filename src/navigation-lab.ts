import './navigation-lab.css';
import { createWorld } from './sim/index';
import { GpuNavigator, type NavigationGrid, type NavigationPath } from './navigation-gpu';
import { assertPathValid, solveCpuOracle } from './navigation-gpu/oracle';

const root = document.querySelector<HTMLDivElement>('#navigation-lab')!;
root.innerHTML = `<main><header><a href="/">← Retour à la colonie</a><h1>Navigation GPU</h1><p>Laboratoire de validation · terrain, coûts et itinéraires</p></header><div class="lab-layout"><aside><label>Terrain<select id="fixture"><option value="generated">Paysage de la colonie</option><option value="fence">Obstacle avec deux passages</option></select></label><label>Taille<select id="size"><option value="32">32 × 32</option><option value="64" selected>64 × 64</option><option value="128">128 × 128</option><option value="250">250 × 250 · fixture d'échelle</option></select></label><label>Graine<input id="seed" type="number" min="0" max="4294967295" value="42"></label><button id="generate">Générer</button><hr><label>Outil<select id="edit-tool"><option value="goal">Placer l'arrivée</option><option value="start">Placer le départ</option><option value="block">Ajouter un obstacle</option><option value="clear">Rendre franchissable</option><option value="slow">Terrain lent (coût 4)</option></select></label><label>Budget de propagation<select id="iterations"><option>128</option><option selected>512</option><option>1024</option><option>4096</option></select></label><button id="solve" class="primary" disabled>Calculer et vérifier</button><p id="adapter">Initialisation WebGPU…</p><p class="small">Recherche, contrôle de convergence et extraction du chemin sur GPU. Une seule lecture finale vers le CPU. Le Dijkstra de référence vérifie séparément le résultat.</p></aside><section><canvas id="grid" width="900" height="900" aria-label="Grille de navigation interactive"></canvas><div class="legend"><span>● Départ</span><span>● Arrivée</span><span>■ Obstacle</span><span>■ Coût 4</span><span>━ Chemin GPU</span></div><div id="result" role="status">Choisissez une arrivée sur la carte.</div></section></div><footer>Expérience isolée : ces calculs ne pilotent pas encore les colons. Les collisions mobiles, la priorité des travaux et les réservations restent à intégrer au protocole de navigation. Le temps affiché inclut allocation, envoi, GPU et lecture : ce n'est pas un temps GPU pur.</footer></main>`;
const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = byId<HTMLCanvasElement>('grid');
const context = canvas.getContext('2d')!;
let gpu: GpuNavigator | undefined;
let revision = 0;
let grid: NavigationGrid;
let start = 0;
let goal = 1;
let route: NavigationPath | undefined;
let busy = false;
let dragging = false;
let generationMode = '';

function redraw() {
  const scale = canvas.width / grid.width;
  context.fillStyle = '#19271f'; context.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < grid.costs.length; i++) {
    const cost = grid.costs[i];
    context.fillStyle = cost === 0 ? '#314034' : cost > 1 ? '#b3945d' : '#8ea979';
    context.fillRect((i % grid.width) * scale, Math.floor(i / grid.width) * scale, Math.ceil(scale), Math.ceil(scale));
  }
  if (route?.status === 'found') {
    context.strokeStyle = '#fff3ba'; context.lineWidth = Math.max(2, scale * 0.36); context.beginPath();
    route.cells.forEach((cell, index) => {
      const x = (cell % grid.width + 0.5) * scale, y = (Math.floor(cell / grid.width) + 0.5) * scale;
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }); context.stroke();
  }
  for (const [cell, color] of [[start, '#e5b66e'], [goal, '#7adde5']] as const) {
    context.fillStyle = color; context.strokeStyle = '#19271f'; context.lineWidth = 2; context.beginPath();
    context.arc((cell % grid.width + 0.5) * scale, (Math.floor(cell / grid.width) + 0.5) * scale, Math.max(4, scale * 0.45), 0, 2 * Math.PI); context.fill(); context.stroke();
  }
}
function nearestOpen(x: number, z: number) {
  let best = -1, distance = Infinity;
  for (let i = 0; i < grid.costs.length; i++) if (grid.costs[i] > 0) {
    const d = Math.abs(i % grid.width - x) + Math.abs(Math.floor(i / grid.width) - z);
    if (d < distance) { best = i; distance = d; }
  }
  return best;
}
function synchronize() {
  route = undefined; grid.revision = ++revision;
  gpu?.setGrid(grid);
  byId('result').textContent = `Révision ${revision} · ${generationMode}. Chemin à recalculer.`;
  redraw();
}
function regenerate() {
  const size = Number(byId<HTMLSelectElement>('size').value);
  const seed = Number(byId<HTMLInputElement>('seed').value);
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) { byId('result').textContent = 'La graine doit être un entier de 0 à 4 294 967 295.'; return; }
  const generated = byId<HTMLSelectElement>('fixture').value === 'generated' && size <= 128;
  const costs = new Uint32Array(size * size).fill(1);
  if (generated) {
    const world = createWorld(seed, size, size);
    for (let i = 0; i < costs.length; i++) costs[i] = ['water', 'rock'].includes(world.tiles[i].terrain) ? 0 : 1;
    generationMode = `paysage réel, graine ${seed}`;
  } else {
    for (let z = 0; z < size; z++) if (z !== Math.floor(size / 3) && z !== Math.floor(size * 2 / 3)) costs[z * size + Math.floor(size / 2)] = 0;
    for (let x = 0; x < size; x++) if (costs[Math.floor(size / 4) * size + x]) costs[Math.floor(size / 4) * size + x] = 4;
    generationMode = 'fixture de comparaison avec passages et terrain lent';
  }
  grid = { width: size, height: size, costs, revision: 0 };
  start = nearestOpen(Math.floor(size / 2) - 1, Math.floor(size / 2));
  goal = nearestOpen(Math.floor(size / 2) + Math.min(10, Math.floor(size / 3)), Math.floor(size / 2));
  synchronize();
}
function edit(event: PointerEvent) {
  const bounds = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - bounds.left) / bounds.width * grid.width);
  const z = Math.floor((event.clientY - bounds.top) / bounds.height * grid.height);
  if (x < 0 || z < 0 || x >= grid.width || z >= grid.height) return;
  const cell = z * grid.width + x; const tool = byId<HTMLSelectElement>('edit-tool').value;
  if (tool === 'start') start = cell;
  else if (tool === 'goal') goal = cell;
  else grid.costs[cell] = tool === 'block' ? 0 : tool === 'slow' ? 4 : 1;
  synchronize();
}
canvas.onpointerdown = event => { dragging = true; canvas.setPointerCapture(event.pointerId); edit(event); };
canvas.onpointermove = event => { if (dragging) edit(event); };
canvas.onpointerup = () => { dragging = false; }; canvas.onpointercancel = () => { dragging = false; };
byId('generate').onclick = regenerate;
byId('solve').onclick = () => { void calculate(); };
async function calculate() {
  if (!gpu || busy) return;
  busy = true; byId<HTMLButtonElement>('solve').disabled = true;
  const capturedGrid = { ...grid, costs: new Uint32Array(grid.costs) };
  const request = { id: 0, start, goal };
  byId('result').textContent = `Calcul de la révision ${capturedGrid.revision}…`;
  try {
    const result = await gpu.solve([request], { maxIterations: Number(byId<HTMLSelectElement>('iterations').value) });
    if (result.stale) { byId('result').textContent = 'Le terrain a changé pendant le calcul. Résultat périmé écarté : relancez.'; return; }
    const actual = result.paths[0];
    const cpuStarted = performance.now(); const oracle = solveCpuOracle(capturedGrid, request); const cpuMs = performance.now() - cpuStarted;
    assertPathValid(capturedGrid, request, actual);
    if (actual.status === 'found' || actual.status === 'unreachable') {
      if (actual.status !== oracle.status || actual.totalCost !== oracle.totalCost) throw new Error('Divergence entre GPU et référence CPU.');
    }
    route = actual; redraw();
    const statuses = { found: 'Chemin trouvé et vérifié', unreachable: 'Destination inaccessible, vérifiée', inconclusive: 'Budget insuffisant : accessibilité indéterminée', 'capacity-exceeded': 'Chemin supérieur à la capacité de sortie' };
    byId('result').textContent = `${statuses[actual.status]}. ${actual.status === 'found' ? `${actual.cells.length - 1} déplacements · coût ${actual.totalCost}. ` : ''}GPU bout en bout ${result.metrics.endToEndMs.toFixed(2)} ms · Dijkstra CPU ${cpuMs.toFixed(2)} ms · buffers ${(result.metrics.allocatedBytes / 1048576).toFixed(2)} Mio · ${result.metrics.iterations} passes.`;
  } catch (error) {
    byId('result').textContent = error instanceof Error ? error.message : String(error);
  } finally { busy = false; byId<HTMLButtonElement>('solve').disabled = false; }
}
regenerate();
void GpuNavigator.create().then(instance => {
  gpu = instance; gpu.setGrid(grid);
  byId('adapter').textContent = `WebGPU · ${gpu.adapter.vendor || 'fabricant non communiqué'} · ${gpu.adapter.architecture || 'architecture non communiquée'}`;
  byId<HTMLButtonElement>('solve').disabled = false;
}).catch(error => { byId('adapter').textContent = `WebGPU indisponible : ${error instanceof Error ? error.message : error}`; });
window.addEventListener('pagehide', event => { if (!event.persisted) gpu?.dispose(); });
