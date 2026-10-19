/** Private, read-only observations of authoritative gameplay. No task is created
 * here. Call once BEFORE stepping to establish inventory/research baselines,
 * then once after each ordinary tick. Presence includes travel and waiting;
 * geometric contact below is not an inferred successful interaction. */
import {isColonist} from '../src/sim/affiliation.ts';
import {isPowerActive} from '../src/sim/power-rules.ts';
import type {Cell, Pawn, World} from '../src/sim/types.ts';

type Counts = Record<string, number>;
const MAX_PEOPLE = 256, MAX_PRODUCTS = 8192, MAX_EXAMPLES = 256, MAX_EVENTS = 256;
const count = (out: Counts, key: string, amount = 1): void => { out[key] = (out[key] ?? 0) + amount; };
const colonists = (w: World) => w.pawns.filter(p => isColonist(p) && !p.prisoner && !p.visitor && p.state !== 'dead');
const at = (a: Cell, b: Cell): boolean => a.x === b.x && a.z === b.z;
const nearby = (a: Cell, b: Cell): boolean => Math.abs(a.x - b.x) + Math.abs(a.z - b.z) <= 1;
function researchPoints(w: World): Counts {
  const result: Counts = {};
  if (!w.research) return result;
  result['complex-clothing'] = w.research.points;
  for (const [key, value] of Object.entries(w.research))
    if (value && typeof value === 'object' && 'points' in value && typeof value.points === 'number') result[key] = value.points;
  return result;
}

export function stressSummary432(w: World) {
  const structureKinds: Counts = {}, resourceKinds: Counts = {}, quantities: Counts = {}, pileOwners: Counts = {};
  const animalSpecies: Counts = {}, domesticSpecies: Counts = {}, wildSpecies: Counts = {};
  const jobsByKind: Counts = {}, jobsByStatus: Counts = {}, billsByRecipe: Counts = {}, billsByMode: Counts = {}, fieldCellsByPlant: Counts = {};
  for (const s of w.structures) {
    count(structureKinds, s.kind);
    for (const b of s.bills ?? []) { count(billsByRecipe, b.recipe); count(billsByMode, b.mode); }
  }
  for (const r of w.resources) count(resourceKinds, r.kind);
  for (const p of w.piles) { count(quantities, p.item, p.quantity); count(pileOwners, p.owner.type); }
  for (const a of w.wildlife?.animals ?? []) { count(animalSpecies, a.species); count(a.domestic ? domesticSpecies : wildSpecies, a.species); }
  for (const j of w.jobs) { count(jobsByKind, j.kind); count(jobsByStatus, j.status); }
  for (const z of w.growingZones) count(fieldCellsByPlant, z.plant, z.cells.length);
  const lights = w.structures.filter(s => s.kind === 'standing-lamp' || s.kind === 'sun-lamp');
  const people = colonists(w), animals = w.wildlife?.animals ?? [], bills = w.structures.flatMap(s => s.bills ?? []);
  return {
    tick: w.tick, schemaVersion: w.schemaVersion, width: w.width, height: w.height, rng: w.rng,
    pawns: w.pawns.length, livingColonists: people.length, livingColonistIds: people.slice(0, MAX_PEOPLE).map(p => p.id),
    omittedLivingColonistIds: Math.max(0, people.length - MAX_PEOPLE),
    prisoners: w.pawns.filter(p => p.prisoner).length, visitors: w.pawns.filter(p => p.visitor).length,
    pawnStates: w.pawns.reduce<Counts>((out, p) => { count(out, p.state); return out; }, {}),
    structures: w.structures.length, structureKinds, jobs: w.jobs.length, jobsByKind, jobsByStatus,
    animals: animals.length, domesticAnimals: animals.filter(a => a.domestic).length,
    wildAnimals: animals.filter(a => !a.domestic).length, animalSpecies, domesticSpecies, wildSpecies,
    growingZones: w.growingZones.length, growingCells: w.growingZones.reduce((n, z) => n + z.cells.length, 0), fieldCellsByPlant, resourceKinds,
    piles: w.piles.length, quantities, pileOwners, stock: {...w.stock}, stockpileCells: w.stockpiles.length,
    shelfCells: w.structures.reduce((n, s) => n + (s.shelf?.cells.length ?? 0), 0),
    electricalStructures: w.structures.filter(s => s.power).length, poweredStructures: w.structures.filter(isPowerActive).length,
    lights: lights.length, poweredLights: lights.filter(isPowerActive).length,
    torchLamps: w.structures.filter(s => s.kind === 'torch-lamp').length,
    bills: bills.length, suspendedBills: bills.filter(b => b.suspended).length, billsByRecipe, billsByMode,
    roofedCells: w.roofing?.constructed.length ?? 0, researchPoints: researchPoints(w), researchProject: w.research?.project ?? null,
    note: 'Inventory quantities are balances, not proof of production. Powered lights count actual power state, not emitted light or solar schedule.',
  };
}

interface PersonObservation432 {
  id: number; name: string; samples: number; states: Counts; tasks: Counts; phases: Counts;
  pathSamples: number; movingSamples: number; changedCellSamples: number; contactSamples: Counts;
  last: {tick: number; x: number; z: number; state: Pawn['state']; pathLength: number; jobId: number | null; jobKind: string | null; jobStatus: string | null};
}
interface PhysicalOutput432 {
  tick: number; pawnId: number; stationId: number; recipe: string; productId: number;
  item: string; quantity: number; owner: {type: 'pawn'; pawnId: number}; kind: 'pile' | 'packed-art';
}
export function createStressObservation432() {
  return {
    samples: 0, firstTick: null as number | null, lastTick: null as number | null, observedTickIncrements: 0, skippedTicks: 0,
    people: [] as PersonObservation432[], taskSamples: {} as Counts, phaseSamples: {} as Counts,
    poweredStructureSamples: {} as Counts, poweredLightSamples: 0, lowestNeeds: {hunger: 100, rest: 100, mood: 100},
    researchBaseline: {} as Counts, researchLast: {} as Counts, researchPointsGained: {} as Counts, researchPointsDecreased: {} as Counts,
    initialProductIds: [] as number[], observedOutputIds: [] as number[], physicalOutputs: [] as PhysicalOutput432[], outputUnits: {} as Counts,
    taskExamples: [] as {tick: number; pawnId: number; task: string; phase: string | null; targetId: number | null; x: number; z: number}[],
    events: [] as {tick: number; type: string; message: string}[], omittedExamples: 0, omittedEvents: 0,
    limits: {people: MAX_PEOPLE, outputs: MAX_PRODUCTS, taskExamples: MAX_EXAMPLES, events: MAX_EVENTS},
    interpretation: 'Task/phase samples can include travel or waiting. Contact samples mean matching service cell or cardinal adjacency only. Physical outputs require the real output phase and a unique new product ID owned by that pawn. No history is inferred from final stocks.',
  };
}
export type StressObservation432 = ReturnType<typeof createStressObservation432>;

export function observeStress432(w: World, out: StressObservation432): void {
  if (out.lastTick !== null && w.tick <= out.lastTick) throw Error('Stress observation requires strictly increasing authoritative ticks');
  const first = out.firstTick === null;
  if (first) {
    const ids = [...w.piles.map(p => p.id), ...w.packed.map(p => p.building.id)];
    if (ids.length > MAX_PRODUCTS * 4) throw Error('Stress initial inventory exceeds bounded observation capacity');
    out.initialProductIds = ids; out.firstTick = w.tick; out.researchBaseline = researchPoints(w); out.researchLast = {...out.researchBaseline};
  } else {
    const delta = w.tick - out.lastTick!; out.observedTickIncrements += delta; out.skippedTicks += Math.max(0, delta - 1);
  }
  out.samples++;
  const jobs = new Map(w.jobs.map(j => [j.id, j]));
  const known = new Set([...out.initialProductIds, ...out.observedOutputIds]);
  for (const p of colonists(w)) {
    let person = out.people.find(row => row.id === p.id);
    const job = p.jobId === null ? undefined : jobs.get(p.jobId);
    if (!person) {
      if (out.people.length >= MAX_PEOPLE) throw Error('Stress people exceed bounded observation capacity');
      person = {id: p.id, name: p.name, samples: 0, states: {}, tasks: {}, phases: {}, pathSamples: 0, movingSamples: 0, changedCellSamples: 0, contactSamples: {},
        last: {tick: w.tick, x: p.x, z: p.z, state: p.state, pathLength: p.path.length, jobId: p.jobId, jobKind: job?.kind ?? null, jobStatus: job?.status ?? null}};
      out.people.push(person);
    }
    const row = person;
    const task = (name: string, phase: string | null = null, targetId: number | null = null): void => {
      const key = phase === null ? name : `${name}:${phase}`, novel = row.phases[key] === undefined;
      count(row.tasks, name); count(out.taskSamples, name); count(row.phases, key); count(out.phaseSamples, key);
      if (novel) {
        if (out.taskExamples.length < MAX_EXAMPLES) out.taskExamples.push({tick: w.tick, pawnId: p.id, task: name, phase, targetId, x: p.x, z: p.z});
        else out.omittedExamples++;
      }
    };
    const contact = (name: string, target: Cell, adjacent = false): void => { if (adjacent ? nearby(p, target) : at(p, target)) count(row.contactSamples, name); };
    row.samples++; count(row.states, p.state);
    if (p.path.length) row.pathSamples++;
    if (p.state === 'moving' || p.motion && p.motion.end > w.tick) row.movingSamples++;
    if (!at(row.last, p)) row.changedCellSamples++;
    if (p.jobId !== null) { task('job', job ? `${job.kind}/${job.status}` : 'missing-reference', p.jobId); if (job) contact(`job:${job.kind}`, job, true); }
    if (p.cooking) {
      const t = p.cooking, recipe = t.recipe ?? 'simple-meal'; task(`cooking:${recipe}`, t.phase, t.stationId); contact('cooking:service-cell', t.spot);
      if (!first && t.phase === 'output' && t.productId !== null && !known.has(t.productId)) {
        const pile = w.piles.find(product => product.id === t.productId);
        const packed = w.packed.find(product => product.building.id === t.productId);
        const physical = pile?.owner.type === 'pawn' && pile.owner.pawnId === p.id ? {item: pile.item, quantity: pile.quantity, kind: 'pile' as const}
          : packed?.owner.type === 'pawn' && packed.owner.pawnId === p.id && packed.building.art?.authorId === p.id ? {item: packed.building.kind, quantity: 1, kind: 'packed-art' as const} : null;
        if (!physical) throw Error(`Observed output ${t.productId} has no physical product owned by pawn ${p.id} at ${w.tick}`);
        if (out.observedOutputIds.length >= MAX_PRODUCTS) throw Error('Stress physical outputs exceed bounded observation capacity');
        out.observedOutputIds.push(t.productId); known.add(t.productId);
        out.physicalOutputs.push({tick: w.tick, pawnId: p.id, stationId: t.stationId, recipe, productId: t.productId, ...physical, owner: {type: 'pawn', pawnId: p.id}});
        count(out.outputUnits, physical.item, physical.quantity);
      }
    }
    if (p.research) { task('research', at(p, p.research.spot) ? 'at-service-cell' : 'travel', p.research.stationId); contact('research:service-cell', p.research.spot); }
    if (p.haul) task(`haul:${p.haul.destination.type}`, p.haul.phase, p.haul.sourcePileId);
    if (p.animalHandling) { task(`animalHandling:${p.animalHandling.kind}`, p.animalHandling.phase, p.animalHandling.animalId); const a = w.wildlife?.animals.find(a => a.id === p.animalHandling!.animalId); if (a) contact('animalHandling:adjacent', a, true); }
    if (p.animalCare) { task('animalCare', p.animalCare.phase, p.animalCare.animalId); contact('animalCare:spot', p.animalCare.spot); }
    if (p.animalFeed) task('animalFeed', p.animalFeed.phase);
    if (p.cleaning) task('cleaning', p.cleaning.phase);
    if (p.tend) { task('tend', p.tend.phase, p.tend.patientId); contact('tend:spot', p.tend.spot); }
    if (p.need) task(`need:${p.need.kind}`, p.need.phase);
    for (const name of ['ward', 'feed', 'rescue', 'surgery', 'hunting', 'burial', 'trade', 'firefighting', 'animalRescue', 'deepWork'] as const) if (p[name]) task(name);
    out.lowestNeeds.hunger = Math.min(out.lowestNeeds.hunger, p.hunger); out.lowestNeeds.rest = Math.min(out.lowestNeeds.rest, p.rest); out.lowestNeeds.mood = Math.min(out.lowestNeeds.mood, p.mood);
    row.last = {tick: w.tick, x: p.x, z: p.z, state: p.state, pathLength: p.path.length, jobId: p.jobId, jobKind: job?.kind ?? null, jobStatus: job?.status ?? null};
  }
  const points = researchPoints(w);
  for (const [key, value] of Object.entries(points)) {
    const delta = value - (out.researchLast[key] ?? 0);
    if (!first && delta > 0) count(out.researchPointsGained, key, delta);
    if (!first && delta < 0) count(out.researchPointsDecreased, key, -delta);
  }
  out.researchLast = points;
  for (const s of w.structures) if (isPowerActive(s)) { count(out.poweredStructureSamples, s.kind); if (s.kind === 'standing-lamp' || s.kind === 'sun-lamp') out.poweredLightSamples++; }
  if (!first) for (const e of w.events) if (e.tick === w.tick) {
    if (out.events.length < MAX_EVENTS) out.events.push({tick: e.tick, type: e.type, message: e.message}); else out.omittedEvents++;
  }
  out.lastTick = w.tick;
}
