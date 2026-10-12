import { afterEach, describe, expect, it, vi } from 'vitest';
import { SCHEMA_VERSION } from '../src/sim/types';
import { GameSession, PREVIOUS_KEY, SAVE_KEY } from '../src/ui/game-session';
import {
  AUTO_SAVE_KEYS, NAMED_SAVE_KEYS, encodeSaveSlot, nextAutosaveKey,
  nextAutosaveSequence, parseSaveSlot, saveLabel,
} from '../src/ui/save-slots';
import { AUTOSAVE_MINUTES, AutosaveScheduler, DEFAULT_AUTOSAVE_MINUTES, autosaveMinutes, type AutosaveState } from '../src/ui/autosave';

afterEach(() => vi.restoreAllMocks());

// These fixtures exercise application storage metadata, not World admission.
// The fake worker acknowledges captures and loads; strict World admission has
// its own simulation tests and remains the worker's responsibility.
const raw = (tick = 100): string => JSON.stringify({
  schemaVersion: SCHEMA_VERSION, tick, width: 32, height: 32,
  scenario: { id: 'crashlanded' }, gameProfile: { revision: 1 },
});
const record = (sequence: number, savedAt = sequence * 1000): string =>
  encodeSaveSlot(raw(sequence), 'Autosauvegarde', savedAt, sequence);
function fixture(active = true) {
  const data = new Map<string, string>([[SAVE_KEY, raw(10)], [PREVIOUS_KEY, raw(20)]]);
  const storage = {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { data.set(key, value); }),
    removeItem: vi.fn((key: string) => { data.delete(key); }),
  };
  const client = {
    init: vi.fn(async () => {}),
    load: vi.fn(async (_data: string) => {}),
    save: vi.fn(async (): Promise<string | undefined> => raw()),
  };
  const prepare = vi.fn(async () => {});
  const accepted = vi.fn();
  const session = new GameSession(client, () => storage, prepare, accepted);
  session.hasWorld = active;
  return { data, storage, client, prepare, accepted, session };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe('V332 bounded save slot records', () => {
  it('retains exact checkpoint data and trims only the outer name whitespace', () => {
    const label = '<b>Aulnes & forêt</b>';
    const stored = encodeSaveSlot(raw(), `  ${label}  `, 1234, 7);
    expect(parseSaveSlot(stored)).toEqual({
      format: 'elsewhere-save-slot', version: 1, label, savedAt: 1234, sequence: 7, data: raw(),
    });
    expect(saveLabel('é'.repeat(64))).toHaveLength(64);
  });

  it.each(['', '   ', 'a'.repeat(65), 'nom\nligne', 'nom\u0000', 'nom\u007f'])('rejects an invalid label %j', label => {
    expect(() => saveLabel(label)).toThrow();
  });

  it.each([
    { version: 2 }, { extra: true }, { label: ' non normalisé ' },
    { savedAt: -1 }, { savedAt: 1.5 }, { sequence: -1 }, { sequence: Number.MAX_SAFE_INTEGER + 1 },
    { data: '' }, { data: '{corrupt' }, { data: JSON.stringify({ tick: -1, width: 32, height: 32 }) },
  ])('rejects malformed slot fields without accepting partial records: %j', patch => {
    const valid = parseSaveSlot(record(1));
    expect(() => parseSaveSlot(JSON.stringify({ ...valid, ...patch }))).toThrow();
  });

  it('fills an empty automatic slot before replacing a valid older copy', () => {
    const slots = new Map<string, string | null>([
      [AUTO_SAVE_KEYS[0]!, record(1)], [AUTO_SAVE_KEYS[1]!, '{corrupt'], [AUTO_SAVE_KEYS[2]!, null],
    ]);
    expect(nextAutosaveKey(slots)).toBe(AUTO_SAVE_KEYS[2]);
    slots.set(AUTO_SAVE_KEYS[2]!, record(2));
    expect(nextAutosaveKey(slots)).toBe(AUTO_SAVE_KEYS[0]);
    expect(nextAutosaveSequence(slots)).toBe(3);
    expect(slots.get(AUTO_SAVE_KEYS[1]!)).toBe('{corrupt');
  });

  it('refuses to evict three malformed automatic copies or wrap an exhausted sequence', () => {
    const broken = new Map(AUTO_SAVE_KEYS.map(key => [key, '{corrupt']));
    expect(() => nextAutosaveKey(broken)).toThrow('illisibles');
    expect([...broken.values()]).toEqual(['{corrupt', '{corrupt', '{corrupt']);
    expect(() => nextAutosaveSequence(new Map([[AUTO_SAVE_KEYS[0]!, record(Number.MAX_SAFE_INTEGER, 1)]]))).toThrow('épuisé');
  });

  it('uses only supported autosave intervals, with five minutes as the fallback', () => {
    for (const minutes of AUTOSAVE_MINUTES) {
      expect(autosaveMinutes(minutes)).toBe(minutes);
      expect(autosaveMinutes(String(minutes))).toBe(minutes);
    }
    for (const value of [undefined, null, '', ' ', 'bogus', -1, 2, Infinity, NaN]) {
      expect(autosaveMinutes(value)).toBe(DEFAULT_AUTOSAVE_MINUTES);
    }
  });
});

describe('V332 GameSession named and automatic library', () => {
  it('fills twelve named slots, refuses a thirteenth and replaces only an explicitly selected slot', async () => {
    const f = fixture();
    for (let index = 0; index < 12; index++) await f.session.saveNamed(`Colonie ${index + 1}`);
    expect(NAMED_SAVE_KEYS.map(key => parseSaveSlot(f.data.get(key)!).label)).toEqual(
      Array.from({ length: 12 }, (_, index) => `Colonie ${index + 1}`),
    );
    const full = new Map(f.data);
    await expect(f.session.saveNamed('Treizième')).rejects.toThrow('douze');
    expect(f.data).toEqual(full);
    expect(f.storage.removeItem).not.toHaveBeenCalled();
    expect(f.session.busy).toBe(false);
    const target = NAMED_SAVE_KEYS[5]!;
    f.client.save.mockResolvedValue(raw(300));
    await f.session.saveNamed('Nouvelle version', target, full.get(target));
    expect(parseSaveSlot(f.data.get(target)!)).toMatchObject({ label: 'Nouvelle version', data: raw(300) });
    for (const [key, value] of full) if (key !== target) expect(f.data.get(key)).toBe(value);
    await f.session.deleteSave(target);
    expect(f.data.has(target)).toBe(false);
    await f.session.saveNamed('Créneau réutilisé');
    expect(parseSaveSlot(f.data.get(target)!).label).toBe('Créneau réutilisé');
    for (const [key, value] of full) if (key !== target) expect(f.data.get(key)).toBe(value);
  });

  it.each([SAVE_KEY, PREVIOUS_KEY, AUTO_SAVE_KEYS[0]!, 'foreign-key'])('refuses named replacement outside named slots: %s', async key => {
    const f = fixture(), before = new Map(f.data);
    await expect(f.session.saveNamed('Aulnes', key)).rejects.toThrow('remplacé');
    expect(f.client.save).not.toHaveBeenCalled();
    expect(f.storage.setItem).not.toHaveBeenCalled();
    expect(f.data).toEqual(before);
  });

  it('does not turn a missing overwrite target into a new save', async () => {
    const f = fixture(), before = new Map(f.data);
    await expect(f.session.saveNamed('Aulnes', NAMED_SAVE_KEYS[2]!)).rejects.toThrow('n’existe plus');
    expect(f.data).toEqual(before);
    expect(f.storage.setItem).not.toHaveBeenCalled();
  });

  it('refuses overwrite and deletion if another tab changed the exact confirmed record', async () => {
    const f = fixture(), key = NAMED_SAVE_KEYS[0]!;
    const shown = encodeSaveSlot(raw(200), 'Aulnes', 100);
    const concurrent = encodeSaveSlot(raw(201), 'Aulnes', 100);
    f.data.set(key, concurrent);
    const before = new Map(f.data);
    await expect(f.session.saveNamed('Aulnes', key, shown)).rejects.toThrow();
    await expect(f.session.deleteSave(key, shown)).rejects.toThrow();
    expect(f.data).toEqual(before);
    expect(f.storage.setItem).not.toHaveBeenCalled();
    expect(f.storage.removeItem).not.toHaveBeenCalled();
    await f.session.deleteSave(key, concurrent);
    expect(f.data.has(key)).toBe(false);
  });

  it('protects a rotated automatic copy from deletion using an obsolete confirmation record', async () => {
    const f = fixture(), key = AUTO_SAVE_KEYS[0]!;
    const shown = record(1), rotated = record(4);
    f.data.set(key, rotated);
    await expect(f.session.deleteSave(key, shown)).rejects.toThrow();
    expect(f.data.get(key)).toBe(rotated);
    expect(f.storage.removeItem).not.toHaveBeenCalled();
    await f.session.deleteSave(key, rotated);
    expect(f.data.has(key)).toBe(false);
  });

  it('rotates exactly three automatic slots in capture order even when wall time retreats', async () => {
    const f = fixture();
    const wall = vi.spyOn(Date, 'now');
    for (const [index, timestamp] of [4000, 5000, 6000, 1000].entries()) {
      wall.mockReturnValue(timestamp);
      f.client.save.mockResolvedValue(raw(100 + index));
      await f.session.autosave();
    }
    const slots = AUTO_SAVE_KEYS.map(key => parseSaveSlot(f.data.get(key)!));
    expect(slots.map(slot => slot.sequence)).toEqual([4, 2, 3]);
    expect(slots.map(slot => slot.savedAt)).toEqual([1000, 5000, 6000]);
    expect(slots.map(slot => slot.data)).toEqual([raw(103), raw(101), raw(102)]);
    expect(f.storage.setItem.mock.calls.map(([key]) => key)).toEqual([...AUTO_SAVE_KEYS, AUTO_SAVE_KEYS[0]]);
    expect(f.storage.removeItem).not.toHaveBeenCalled();
    expect(f.data.get(SAVE_KEY)).toBe(raw(10));
    expect(f.data.get(PREVIOUS_KEY)).toBe(raw(20));
  });

  it('preserves corrupt automatic records until explicit deletion releases a slot', async () => {
    const f = fixture();
    for (const key of AUTO_SAVE_KEYS) f.data.set(key, '{corrupt');
    const before = new Map(f.data);
    await expect(f.session.autosave()).rejects.toThrow('illisibles');
    expect(f.data).toEqual(before);
    expect(f.storage.setItem).not.toHaveBeenCalled();
    expect(f.storage.removeItem).not.toHaveBeenCalled();
    await f.session.deleteSave(AUTO_SAVE_KEYS[1]!);
    await f.session.autosave();
    expect(parseSaveSlot(f.data.get(AUTO_SAVE_KEYS[1]!)!).sequence).toBe(1);
    expect(f.data.get(AUTO_SAVE_KEYS[0]!)).toBe('{corrupt');
    expect(f.data.get(AUTO_SAVE_KEYS[2]!)).toBe('{corrupt');
  });

  it.each([SAVE_KEY, PREVIOUS_KEY, 'foreign-key'])('protects historical and unrelated keys from deletion: %s', async key => {
    const f = fixture(), before = new Map(f.data);
    await expect(f.session.deleteSave(key)).rejects.toThrow('historiques');
    expect(f.data).toEqual(before);
    expect(f.storage.removeItem).not.toHaveBeenCalled();
  });

  it('never evicts another copy when a named or automatic write exceeds quota', async () => {
    const f = fixture();
    f.data.set(AUTO_SAVE_KEYS[0]!, record(1));
    f.data.set(NAMED_SAVE_KEYS[0]!, encodeSaveSlot(raw(200), 'Originale', 123));
    const before = new Map(f.data);
    f.storage.setItem.mockImplementation(() => { throw new Error('Quota exceeded'); });
    await expect(f.session.saveNamed('Nouvelle')).rejects.toThrow('Quota');
    await expect(f.session.autosave()).rejects.toThrow('Quota');
    expect(f.data).toEqual(before);
    expect(f.storage.removeItem).not.toHaveBeenCalled();
    expect(f.session.busy).toBe(false);
  });

  it('exports the acknowledged current checkpoint without reading or writing any storage', async () => {
    const f = fixture(), before = new Map(f.data);
    f.storage.getItem.mockImplementation(() => { throw new Error('Storage unavailable'); });
    f.storage.setItem.mockImplementation(() => { throw new Error('Quota exceeded'); });
    expect(await f.session.exportSave()).toBe(raw());
    expect(f.storage.getItem).not.toHaveBeenCalled();
    expect(f.storage.setItem).not.toHaveBeenCalled();
    expect(f.storage.removeItem).not.toHaveBeenCalled();
    expect(f.data).toEqual(before);
  });

  it('unwraps the chosen named copy before preserving the active colony, then loads exact original data', async () => {
    const f = fixture(), key = NAMED_SAVE_KEYS[0]!;
    const chosen = encodeSaveSlot(raw(800), 'Autre colonie', 500);
    f.data.set(key, chosen);
    const order: string[] = [];
    f.storage.getItem.mockImplementation(key => { order.push(`read:${key}`); return f.data.get(key) ?? null; });
    f.client.save.mockImplementation(async () => { order.push('capture'); return raw(); });
    f.storage.setItem.mockImplementation((key, value) => { order.push(`write:${key}`); f.data.set(key, value); });
    f.client.load.mockImplementation(async data => { order.push('load'); expect(data).toBe(raw(800)); });
    await f.session.load(key);
    expect(order).toEqual([`read:${key}`, `read:${PREVIOUS_KEY}`, 'capture', `write:${PREVIOUS_KEY}`, 'load']);
    expect(f.data.get(key)).toBe(chosen);
    expect(f.data.get(SAVE_KEY)).toBe(raw(10));
    expect(f.data.get(PREVIOUS_KEY)).toBe(raw());
    expect(f.session.generation).toBe(1);
    expect(f.accepted).toHaveBeenCalledOnce();
    expect(f.prepare).toHaveBeenCalledOnce();
  });

  it.each(['broken-slot', 'broken-envelope'])('refuses an unreadable managed load before preserving anything: %s', async kind => {
    const f = fixture(), key = NAMED_SAVE_KEYS[0]!;
    const slot = parseSaveSlot(encodeSaveSlot(raw(), 'Cassée', 1));
    f.data.set(key, kind === 'broken-slot' ? '{corrupt' : JSON.stringify({ ...slot, data: JSON.stringify({ format: 'lisiere-save', version: 1 }) }));
    const before = new Map(f.data);
    await expect(f.session.load(key)).rejects.toThrow();
    expect(f.client.save).not.toHaveBeenCalled();
    expect(f.client.load).not.toHaveBeenCalled();
    expect(f.storage.setItem).not.toHaveBeenCalled();
    expect(f.data).toEqual(before);
    expect(f.session.generation).toBe(0);
  });

  it('restores recovery after worker refusal, but retains an accepted named load after graphics failure', async () => {
    const f = fixture(), key = NAMED_SAVE_KEYS[0]!;
    f.data.set(key, encodeSaveSlot(raw(800), 'Autre colonie', 1));
    const before = new Map(f.data);
    f.client.load.mockRejectedValueOnce(new Error('invalid colony'));
    await expect(f.session.load(key)).rejects.toThrow('invalid colony');
    expect(f.data).toEqual(before);
    expect(f.session.generation).toBe(0);
    expect(f.accepted).not.toHaveBeenCalled();
    f.prepare.mockRejectedValueOnce(new Error('GPU unavailable'));
    await expect(f.session.load(key)).rejects.toThrow('GPU unavailable');
    expect(f.data.get(PREVIOUS_KEY)).toBe(raw());
    expect(f.data.get(key)).toBe(before.get(key));
    expect(f.data.get(SAVE_KEY)).toBe(before.get(SAVE_KEY));
    expect(f.session.generation).toBe(1);
    expect(f.accepted).toHaveBeenCalledOnce();
    expect(f.session.busy).toBe(false);
  });

  it('reserves the session for a pending capture and rejects competing save, delete and export operations', async () => {
    const f = fixture(), gate = deferred<string>();
    f.client.save.mockImplementationOnce(() => gate.promise);
    const first = f.session.saveNamed('En cours');
    expect(f.session.busy).toBe(true);
    await expect(f.session.autosave()).rejects.toThrow('en cours');
    await expect(f.session.deleteSave(AUTO_SAVE_KEYS[0]!)).rejects.toThrow('en cours');
    await expect(f.session.exportSave()).rejects.toThrow('en cours');
    expect(f.client.save).toHaveBeenCalledOnce();
    gate.resolve(raw());
    await first;
    expect(f.session.busy).toBe(false);
    expect(f.storage.setItem).toHaveBeenCalledOnce();
  });

  it('lists all corrupt copies visibly and does not expose mutable cached entry objects', () => {
    const f = fixture(false);
    f.data.set(NAMED_SAVE_KEYS[0]!, encodeSaveSlot(raw(500), '<b>Aulnes</b>', 100));
    f.data.set(AUTO_SAVE_KEYS[0]!, '{corrupt');
    const saves = f.session.saves();
    expect(saves.map(save => save.kind)).toEqual(['manual', 'recovery', 'named', 'auto']);
    expect(saves[2]).toMatchObject({ label: '<b>Aulnes</b>', savedAt: 100 });
    expect(saves[2]!.detail).toContain(`format ${SCHEMA_VERSION}`);
    expect(saves[3]!.label).toContain('illisible');
    saves[2]!.label = 'changed by caller';
    expect(f.session.saves()[2]!.label).toBe('<b>Aulnes</b>');
    expect(f.client.save).not.toHaveBeenCalled();
    expect(f.client.load).not.toHaveBeenCalled();
  });

  it('refuses to capture a missing world or a stopped simulation without touching storage', async () => {
    const f = fixture(false), before = new Map(f.data);
    await expect(f.session.saveNamed('Absente')).rejects.toThrow('Aucune colonie');
    f.session.hasWorld = true;
    f.session.markSimulationStopped();
    await expect(f.session.autosave()).rejects.toThrow('incomplet');
    await expect(f.session.exportSave()).rejects.toThrow('incomplet');
    expect(f.client.save).not.toHaveBeenCalled();
    expect(f.storage.setItem).not.toHaveBeenCalled();
    expect(f.data).toEqual(before);
  });
});

function schedulerFixture() {
  const scheduler = new AutosaveScheduler();
  scheduler.setMinutes(1);
  const state: AutosaveState = { generation: 1, tick: 100, playing: true, available: true };
  const save = vi.fn(async () => {}), onError = vi.fn((_error: unknown) => {});
  const clock = { now: 0 };
  const poll = (patch: Partial<AutosaveState> = {}): Promise<void> => {
    Object.assign(state, patch);
    return scheduler.poll(clock.now, state, save, onError);
  };
  const advance = async (seconds: number, patch: Partial<AutosaveState> = {}): Promise<void> => {
    for (let second = 0; second < seconds; second++) {
      clock.now += 1000;
      state.tick++;
      await poll(patch);
    }
  };
  return { scheduler, state, save, onError, clock, poll, advance };
}

describe('V332 autosave scheduler active-time and session boundaries', () => {
  it('excludes paused time and resumes the remaining active interval without catch-up', async () => {
    const f = schedulerFixture();
    await f.poll();
    await f.advance(30);
    await f.poll({ playing: false });
    await f.advance(600, { playing: false });
    expect(f.save).not.toHaveBeenCalled();
    await f.poll({ playing: true });
    await f.advance(29);
    expect(f.save).not.toHaveBeenCalled();
    await f.advance(1);
    expect(f.save).toHaveBeenCalledOnce();
  });

  it('defers a due save while the session is unavailable and performs it once availability returns', async () => {
    const f = schedulerFixture();
    await f.poll();
    await f.advance(59);
    await f.advance(1, { available: false });
    expect(f.save).not.toHaveBeenCalled();
    await f.poll({ available: true });
    expect(f.save).toHaveBeenCalledOnce();
    await f.poll();
    expect(f.save).toHaveBeenCalledOnce();
  });

  it('counts at most two seconds from a suspended timer gap instead of an entire background interval', async () => {
    const f = schedulerFixture();
    await f.poll();
    f.clock.now = 600_000;
    await f.poll();
    await f.advance(57);
    expect(f.save).not.toHaveBeenCalled();
    await f.advance(1);
    expect(f.save).toHaveBeenCalledOnce();
  });

  it('never duplicates a due operation while its asynchronous save is pending', async () => {
    const f = schedulerFixture(), gate = deferred<void>();
    f.save.mockImplementationOnce(() => gate.promise);
    await f.poll();
    await f.advance(59);
    f.clock.now += 1000;
    f.state.tick++;
    const pending = f.poll();
    expect(f.save).toHaveBeenCalledOnce();
    await f.advance(10);
    expect(f.save).toHaveBeenCalledOnce();
    gate.resolve(undefined);
    await pending;
    await f.advance(59);
    expect(f.save).toHaveBeenCalledOnce();
    await f.advance(1);
    expect(f.save).toHaveBeenCalledTimes(2);
  });

  it('resets elapsed time when a different world generation replaces the current one', async () => {
    const f = schedulerFixture();
    await f.poll();
    await f.advance(59);
    await f.poll({ generation: 2, tick: 0 });
    await f.advance(59);
    expect(f.save).not.toHaveBeenCalled();
    await f.advance(1);
    expect(f.save).toHaveBeenCalledOnce();
  });

  it('does not let a completed save from an older generation reset the new generation interval', async () => {
    const f = schedulerFixture(), gate = deferred<void>();
    f.save.mockImplementationOnce(() => gate.promise);
    await f.poll();
    await f.advance(59);
    f.clock.now += 1000;
    f.state.tick++;
    const oldSave = f.poll();
    await f.poll({ generation: 2, tick: 0 });
    await f.advance(60);
    expect(f.save).toHaveBeenCalledOnce();
    gate.resolve(undefined);
    await oldSave;
    await f.poll();
    expect(f.save).toHaveBeenCalledTimes(2);
  });

  it('reports a failure once and waits a real minute before retrying without discarding elapsed time', async () => {
    const f = schedulerFixture(), quota = new Error('Quota exceeded');
    f.save.mockRejectedValueOnce(quota);
    await f.poll();
    await f.advance(60);
    expect(f.save).toHaveBeenCalledOnce();
    expect(f.onError).toHaveBeenCalledExactlyOnceWith(quota);
    await f.advance(59);
    expect(f.save).toHaveBeenCalledOnce();
    await f.advance(1);
    expect(f.save).toHaveBeenCalledTimes(2);
    expect(f.onError).toHaveBeenCalledOnce();
  });

  it('does not save an unchanged confirmed tick even when the active interval is due again', async () => {
    const f = schedulerFixture();
    await f.poll();
    await f.advance(60);
    const savedTick = f.state.tick;
    await f.advance(60, { tick: savedTick });
    expect(f.save).toHaveBeenCalledOnce();
    await f.poll({ tick: savedTick + 1 });
    expect(f.save).toHaveBeenCalledTimes(2);
  });

  it('a manual named save resets the active interval only for its own generation', async () => {
    const f = schedulerFixture();
    await f.poll();
    await f.advance(30);
    f.scheduler.noteSaved(99, f.state.tick);
    await f.advance(29);
    expect(f.save).not.toHaveBeenCalled();
    f.scheduler.noteSaved(f.state.generation, f.state.tick);
    await f.advance(59);
    expect(f.save).not.toHaveBeenCalled();
    await f.advance(1);
    expect(f.save).toHaveBeenCalledOnce();
  });

  it('OFF disables accrual and re-enabling starts a complete fresh interval', async () => {
    const f = schedulerFixture();
    await f.poll();
    await f.advance(59);
    f.scheduler.setMinutes(0);
    await f.advance(600);
    expect(f.save).not.toHaveBeenCalled();
    f.scheduler.setMinutes(1);
    await f.poll();
    await f.advance(59);
    expect(f.save).not.toHaveBeenCalled();
    await f.advance(1);
    expect(f.save).toHaveBeenCalledOnce();
  });
});
