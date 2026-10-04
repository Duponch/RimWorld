import { expect, test } from 'vitest';
import { BrowserSaveRepository, SAVE_KEY, PREVIOUS_KEY } from '../src/ui/save-repository';

/** A transactional IDB double: only a completed draft replaces durable data.
 * This proves repository order/failure handling, not native browser quotas. */
function databaseFixture() {
  let values = new Map<string, unknown>();
  let failKey = '';
  const database = {
    objectStoreNames: { contains: () => true }, close() {}, onversionchange: undefined,
    transaction() {
      const draft = new Map(values);
      let pending = 0, aborted = false;
      const transaction = {
        oncomplete: undefined as undefined | (() => void), onabort: undefined as undefined | (() => void), onerror: undefined,
        error: null,
        abort() { if (aborted) return; aborted = true; queueMicrotask(() => transaction.onabort?.()); },
        objectStore() { return store; },
      };
      const schedule = (action: () => unknown) => {
        pending++;
        const request = { result: undefined as unknown, onsuccess: undefined as undefined | (() => void) };
        queueMicrotask(() => {
          if (!aborted) {
            try { request.result = action(); request.onsuccess?.(); }
            catch { transaction.abort(); }
          }
          pending--;
          queueMicrotask(() => { if (!pending && !aborted) { aborted = true; values = draft; transaction.oncomplete?.(); } });
        });
        return request;
      };
      const store = {
        transaction,
        get(key: string) { return schedule(() => draft.get(key)); },
        put(value: unknown, key: string) { return schedule(() => { if (key === failKey) throw Error('quota'); draft.set(key, value); }); },
        delete(key: string) { return schedule(() => draft.delete(key)); },
      };
      return transaction;
    },
  };
  const factory = {
    open() {
      const request = { result: database, onupgradeneeded: undefined, onerror: undefined, onblocked: undefined,
        onsuccess: undefined as undefined | (() => void) };
      queueMicrotask(() => request.onsuccess?.()); return request;
    },
  } as unknown as IDBFactory;
  const historical = new Map([[SAVE_KEY, 'manual-D'], [PREVIOUS_KEY, 'older-B']]);
  const storage = { getItem: (key: string) => historical.get(key) ?? null, setItem: (key: string, value: string) => { historical.set(key, value); }, removeItem: (key: string) => { historical.delete(key); } };
  return { factory, historical, storage, durable: () => values, fail: (key: string) => { failKey = key; } };
}

test('both historical slots migrate atomically, exact originals survive and later writes have no localStorage mirror', async () => {
  const f = databaseFixture(), repository = new BrowserSaveRepository(() => f.storage, () => f.factory);
  await repository.initialize();
  expect(repository.status.backend).toBe('indexeddb'); expect(await repository.getItem(SAVE_KEY)).toBe('manual-D');
  expect(await repository.getItem(PREVIOUS_KEY)).toBe('older-B'); expect(f.historical.size).toBe(2);
  await repository.setItem(PREVIOUS_KEY, 'active-A'); expect(repository.peekItem(PREVIOUS_KEY)).toBe('active-A');
  expect(f.historical.get(PREVIOUS_KEY)).toBe('older-B');
  await repository.removeItem(SAVE_KEY);
  const next = new BrowserSaveRepository(() => f.storage, () => f.factory); await next.initialize();
  expect(await next.getItem(SAVE_KEY)).toBeNull(); expect(await next.getItem(PREVIOUS_KEY)).toBe('active-A');
  expect(f.historical.get(SAVE_KEY)).toBe('manual-D');
});

test('a migration abort leaves neither partial new slot nor marker and never modifies originals', async () => {
  const f = databaseFixture(); f.fail(PREVIOUS_KEY);
  const repository = new BrowserSaveRepository(() => f.storage, () => f.factory);
  await expect(repository.initialize()).rejects.toThrow('deux copies historiques');
  expect(f.durable().size).toBe(0); expect([...f.historical.values()]).toEqual(['manual-D', 'older-B']);
  f.fail(''); const retry = new BrowserSaveRepository(() => f.storage, () => f.factory); await retry.initialize();
  expect(await retry.getItem(SAVE_KEY)).toBe('manual-D'); expect(await retry.getItem(PREVIOUS_KEY)).toBe('older-B');
});

test('a quota failure keeps cached and durable recovery plus manual slot; no fallback to stale originals', async () => {
  const f = databaseFixture(), repository = new BrowserSaveRepository(() => f.storage, () => f.factory); await repository.initialize();
  await repository.setItem(PREVIOUS_KEY, 'active-A'); f.fail(PREVIOUS_KEY);
  await expect(repository.setItem(PREVIOUS_KEY, 'new-C')).rejects.toThrow('Sauvegarde non écrite');
  expect(repository.peekItem(PREVIOUS_KEY)).toBe('active-A'); expect(await repository.getItem(PREVIOUS_KEY)).toBe('active-A');
  expect(await repository.getItem(SAVE_KEY)).toBe('manual-D'); expect(repository.status.backend).toBe('indexeddb');
});

test('unavailable IndexedDB selects an explicit limited fallback and quota does not delete the other slot', async () => {
  const f = databaseFixture(), reports: unknown[] = [];
  const repository = new BrowserSaveRepository(() => f.storage, () => undefined, status => reports.push(status));
  await repository.initialize(); expect(repository.status.backend).toBe('local-storage'); expect(reports).toHaveLength(1);
  f.storage.setItem = () => { throw Error('Quota exceeded'); };
  await expect(repository.setItem(SAVE_KEY, 'new')).rejects.toThrow('Quota');
  expect(await repository.getItem(SAVE_KEY)).toBe('manual-D'); expect(await repository.getItem(PREVIOUS_KEY)).toBe('older-B');
});

test('an open error cannot replace potentially newer IndexedDB saves with retained historical originals', async () => {
  const f = databaseFixture();
  const factory = { open() { throw Error('blocked'); } } as unknown as IDBFactory;
  const repository = new BrowserSaveRepository(() => f.storage, () => factory);
  await expect(repository.initialize()).rejects.toThrow('Ses données et les copies historiques sont conservées');
  expect(repository.status.backend).toBe('indexeddb'); expect([...f.historical.values()]).toEqual(['manual-D', 'older-B']);
});
