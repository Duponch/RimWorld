import type { World } from '../sim/types';
import type { SecondaryMap } from '../sim/secondary-site-state';
import { alertManhunter } from '../sim/status-alert-rules';

export type ThreatPauseMode = 'never' | 'major' | 'any-threat';
export interface ThreatPauseToken { generation: number; pauseRevision: number }
export interface ThreatSpeedOptions { explicit: true; token: ThreatPauseToken }
export type ThreatSite = 'home' | 'secondary';
export type ThreatKind = 'raid' | 'mechanoid' | 'manhunter';
export interface UrgentThreatRow {
  site: ThreatSite; kind: ThreatKind; totalArrivals: number; lastTick: number;
  lastCount: number; actorId?: number;
}
export interface UrgentThreatSnapshot extends ThreatPauseToken {
  serial: number; urgentHeld: boolean; rows: UrgentThreatRow[];
}
export interface UrgentThreatArrival extends UrgentThreatRow { delta: number }
export interface UrgentThreatReceipt extends ThreatPauseToken {
  serial: number; paused: boolean; tick: number; rows: UrgentThreatArrival[];
}
export const validThreatPauseMode = (v: unknown): v is ThreatPauseMode => v === 'never' || v === 'major' || v === 'any-threat';
const slot = (r: Pick<UrgentThreatRow, 'site' | 'kind'>) => r.site + ':' + r.kind;
const integer = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
function record(v: unknown): v is Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return (proto === Object.prototype || proto === null) && Reflect.ownKeys(v).every(k => typeof k === 'string' && 'value' in Object.getOwnPropertyDescriptor(v, k)!);
}
function keys(v: Record<string, unknown>, required: string[], optional: string[] = []): boolean {
  return required.every(k => Object.hasOwn(v, k)) && Object.keys(v).every(k => required.includes(k) || optional.includes(k));
}
/** A small transport guard; never reads a World or commits a Decoder. */
export function validUrgentThreatSnapshot(v: unknown, tick: unknown, speed: unknown): v is UrgentThreatSnapshot {
  if (!integer(tick) || ![0, 1, 3, 6].includes(speed as number) || !record(v)
    || !keys(v, ['generation','pauseRevision','serial','urgentHeld','rows'])
    || !integer(v.generation) || v.generation < 1 || !integer(v.pauseRevision) || !integer(v.serial)
    || v.pauseRevision > v.serial || typeof v.urgentHeld !== 'boolean'
    || (v.urgentHeld && (v.pauseRevision === 0 || speed !== 0)) || !Array.isArray(v.rows) || v.rows.length > 6 || Reflect.ownKeys(v.rows).length !== v.rows.length + 1) return false;
  const seen = new Set<string>(); let total = 0;
  for (let i = 0; i < v.rows.length; i++) {
    const d = Object.getOwnPropertyDescriptor(v.rows, String(i));
    if (!d || !('value' in d)) return false;
    const r = d.value;
    if (!record(r) || !keys(r, ['site','kind','totalArrivals','lastTick','lastCount'], ['actorId'])
      || !['home','secondary'].includes(r.site as string) || !['raid','mechanoid','manhunter'].includes(r.kind as string)
      || !integer(r.totalArrivals) || r.totalArrivals < 1 || !integer(r.lastTick) || r.lastTick > tick
      || !integer(r.lastCount) || r.lastCount < 1 || (Object.hasOwn(r, 'actorId') && (!integer(r.actorId) || r.actorId < 1))) return false;
    const key = slot(r as unknown as UrgentThreatRow); if (seen.has(key)) return false;
    seen.add(key); total += r.totalArrivals;
  }
  return Number.isSafeInteger(total) && total === v.serial;
}

type LocalMap = Pick<World, 'raids' | 'wildlife'>;
interface MapBaseline { map: LocalMap; raids: Map<ThreatKind, string>; animals: Map<number, number> }
/** Only active episodes are retained. Archives cannot become arrivals after eviction. */
export class UrgentThreatObserver {
  private maps = new Map<ThreatSite, MapBaseline>();
  private state: UrgentThreatSnapshot = { generation: 0, serial: 0, pauseRevision: 0, urgentHeld: false, rows: [] };
  bootstrap(world: World): void {
    this.state = { generation: this.state.generation + 1, serial: 0, pauseRevision: 0, urgentHeld: false, rows: [] };
    this.maps.clear(); this.prepareMaps(world);
  }
  private owners(world: World): [ThreatSite, LocalMap][] {
    return [['home', world], ...world.secondarySite ? [['secondary', world.secondarySite.map] as [ThreatSite, SecondaryMap]] : []];
  }
  /** Call BEFORE a new map's first step, including command publication. */
  prepareMaps(world: World): void {
    const owners = this.owners(world);
    for (const site of this.maps.keys()) if (!owners.some(([s]) => s === site)) this.maps.delete(site);
    for (const [site, map] of owners) if (this.maps.get(site)?.map !== map) this.maps.set(site, this.read(map));
  }
  private read(map: LocalMap): MapBaseline {
    const raids = new Map<ThreatKind, string>(), animals = new Map<number, number>();
    if (map.raids?.active) raids.set('raid', map.raids.active.id + ':' + map.raids.active.startedAt);
    if (map.raids?.mechActive) raids.set('mechanoid', map.raids.mechActive.id + ':' + map.raids.mechActive.startedAt);
    for (const a of map.wildlife?.animals ?? []) if (a.manhunter) animals.set(a.id, a.manhunter!.startedAtCore);
    return { map, raids, animals };
  }
  capture(world: World, mode: ThreatPauseMode): boolean {
    let pause = false;
    const arrive = (site: ThreatSite, kind: ThreatKind, count: number, actorId?: number) => {
      let row = this.state.rows.find(r => r.site === site && r.kind === kind);
      if (!row) { row = { site, kind, totalArrivals: 0, lastTick: world.tick, lastCount: count }; this.state.rows.push(row); }
      row.totalArrivals++; row.lastTick = world.tick; row.lastCount = count;
      if (actorId !== undefined) row.actorId = actorId; else delete row.actorId;
      this.state.serial++;
      pause ||= mode === 'any-threat' || (mode === 'major' && kind !== 'manhunter');
    };
    for (const [site, map] of this.owners(world)) {
      const before = this.maps.get(site);
      if (!before || before.map !== map) throw new Error('Threat observer map was not bootstrapped before step.');
      const after = this.read(map);
      for (const kind of ['raid', 'mechanoid'] as const) if (after.raids.has(kind) && after.raids.get(kind) !== before.raids.get(kind)) {
        const raid = kind === 'raid' ? map.raids!.active! : map.raids!.mechActive!;
        arrive(site, kind, Math.max(1, raid.members.length), raid.members[0]);
      }
      for (const a of map.wildlife?.animals ?? []) if (alertManhunter(a) && before.animals.get(a.id) !== a.manhunter!.startedAtCore) arrive(site, 'manhunter', 1, a.id);
      this.maps.set(site, after);
    }
    if (pause) { this.state.pauseRevision++; this.state.urgentHeld = true; }
    return pause;
  }
  token(): ThreatPauseToken { return { generation: this.state.generation, pauseRevision: this.state.pauseRevision }; }
  requestedSpeed(speed: number, options: ThreatSpeedOptions | undefined, beforeAdvance: ThreatPauseToken): number {
    if (speed === 0) return 0;
    if (!this.state.urgentHeld) return speed;
    const t = options?.token;
    if (options?.explicit === true && t?.generation === this.state.generation && t.pauseRevision === this.state.pauseRevision
      && beforeAdvance.generation === this.state.generation && beforeAdvance.pauseRevision === this.state.pauseRevision) {
      this.state.urgentHeld = false; return speed;
    }
    return 0;
  }
  snapshot(): UrgentThreatSnapshot { return { ...this.state, rows: this.state.rows.map(r => ({ ...r })) }; }
}

/** Two-phase receipt: validate before Decoder, commit only after applied. */
export class UrgentThreatDelivery {
  private committed?: UrgentThreatSnapshot;
  token(): ThreatPauseToken { return this.committed ? { generation: this.committed.generation, pauseRevision: this.committed.pauseRevision } : { generation: 0, pauseRevision: 0 }; }
  reset(): void { this.committed = undefined; }
  accepts(next: unknown, tick: unknown, speed: unknown): next is UrgentThreatSnapshot {
    if (!validUrgentThreatSnapshot(next, tick, speed)) return false;
    const prev = this.committed;
    if (!prev) return true;
    if (next.generation < prev.generation) return false;
    if (next.generation > prev.generation) return true;
    if (next.serial < prev.serial || next.pauseRevision < prev.pauseRevision
      || next.pauseRevision - prev.pauseRevision > next.serial - prev.serial
      || (!prev.urgentHeld && next.urgentHeld && next.pauseRevision === prev.pauseRevision)) return false;
    for (const old of prev.rows) {
      const row = next.rows.find(r => slot(r) === slot(old));
      if (!row || row.totalArrivals < old.totalArrivals || row.lastTick < old.lastTick) return false;
      if (row.totalArrivals === old.totalArrivals && (row.lastTick !== old.lastTick || row.lastCount !== old.lastCount || row.actorId !== old.actorId)) return false;
    }
    return true;
  }
  commit(next: UrgentThreatSnapshot, tick: number): UrgentThreatReceipt | undefined {
    const prev = this.committed?.generation === next.generation ? this.committed : undefined;
    const rows = next.rows.flatMap(r => { const delta = r.totalArrivals - (prev?.rows.find(old => slot(old) === slot(r))?.totalArrivals ?? 0); return delta ? [{ ...r, delta }] : []; });
    this.committed = { ...next, rows: next.rows.map(r => ({ ...r })) };
    return rows.length ? { generation: next.generation, serial: next.serial, pauseRevision: next.pauseRevision, paused: next.urgentHeld, tick, rows } : undefined;
  }
}
