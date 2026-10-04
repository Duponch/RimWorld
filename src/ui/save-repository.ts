/** Storage format and world schemas are independent of this backend. Values
 * remain the exact historical raw JSON or existing gzip envelope. */
export const SAVE_KEY = 'lisiere.save.v1';
export const PREVIOUS_KEY = 'lisiere.previous.v1';
export type SessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface SaveRepository {
  initialize(): Promise<void>;
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  peekItem(key: string): string | null;
}

/** Kept for tests and browsers without IndexedDB. No quota eviction/retry that
 * might erase the other slot is performed. */
export class LocalSaveRepository implements SaveRepository {
  constructor(private readonly storage: () => SessionStorage) {}
  async initialize(): Promise<void> {}
  peekItem(key: string): string | null { return this.storage().getItem(key); }
  async getItem(key: string): Promise<string | null> { return this.peekItem(key); }
  async setItem(key: string, value: string): Promise<void> { this.storage().setItem(key, value); }
  async removeItem(key: string): Promise<void> { this.storage().removeItem(key); }
}

const DATABASE = 'lisiere-saves';
const STORE = 'slots';
const MIGRATED = 'legacy-migrated-v1';
const KEYS = [SAVE_KEY, PREVIOUS_KEY] as const;

export interface SaveBackendStatus {
  backend: 'indexeddb' | 'local-storage';
  message?: string;
}

/** Two slots, one IndexedDB transaction for migration. Historical localStorage
 * copies are retained as emergency originals, never mirrored after migration.
 * Database errors after initialization are surfaced rather than switching to
 * stale originals and losing the authoritative slots. */
export class BrowserSaveRepository implements SaveRepository {
  private db?: IDBDatabase;
  private fallback?: LocalSaveRepository;
  private readonly cache = new Map<string, string>();
  private initializing?: Promise<void>;
  private initialized = false;
  readonly status: SaveBackendStatus = { backend: 'indexeddb' };

  constructor(private readonly storage: () => SessionStorage = () => localStorage,
    private readonly factory: () => IDBFactory | undefined = () => globalThis.indexedDB,
    private readonly onStatus: (status: SaveBackendStatus) => void = () => {}) {}

  initialize(): Promise<void> {
    return this.initializing ??= this.openAndMigrate();
  }

  private async openAndMigrate(): Promise<void> {
    const factory = this.factory();
    if (!factory) {
      this.fallback = new LocalSaveRepository(this.storage);
      await this.fallback.initialize();
      this.status.backend = 'local-storage';
      this.status.message = 'IndexedDB indisponible ; sauvegardes conservées dans le stockage historique à capacité limitée.';
      this.initialized = true;
      this.onStatus({ ...this.status });
      return;
    }
    let db: IDBDatabase;
    try {
      db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = factory.open(DATABASE, 1);
        let settled = false;
        const fail = (reason: unknown) => {
          if (settled) return;
          settled = true; clearTimeout(timer); reject(reason);
        };
        const timer = setTimeout(() => fail(new Error('Ouverture IndexedDB bloquée.')), 5_000);
        request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
        request.onerror = () => fail(request.error ?? new Error('Ouverture IndexedDB refusée.'));
        request.onblocked = () => fail(new Error('La base de sauvegardes est bloquée par un autre onglet.'));
        request.onsuccess = () => {
          if (settled) { request.result.close(); return; }
          settled = true; clearTimeout(timer); resolve(request.result);
        };
      });
    } catch (error) {
      // The database may contain newer saves. Never silently substitute the
      // retained migration originals after an open error or blocked upgrade.
      throw new Error(`La base de sauvegardes ne répond pas. Ses données et les copies historiques sont conservées. ${error instanceof Error ? error.message : String(error)}`);
    }
    this.db = db;
    db.onversionchange = () => db.close();
    // A migration error keeps both historical slots and prevents replacement.
    // A fallback here would hide a database containing newer authoritative data.
    try {
      const originals = new Map<string, string | null>();
      // Access to localStorage can itself be forbidden while IndexedDB works.
      // Read it only if migration has not already committed, inside the callback.
      const migrated = new Map<string, string>();
      await this.transaction('readwrite', store => {
        const marker = store.get(MIGRATED);
        marker.onsuccess = () => {
          try {
            if (marker.result !== true) for (const key of KEYS) originals.set(key, this.storage().getItem(key));
            let remaining = KEYS.length;
            for (const key of KEYS) {
              const request = store.get(key);
              request.onsuccess = () => {
                try {
                const existing: unknown = request.result;
                if (existing !== undefined && typeof existing !== 'string') { store.transaction.abort(); return; }
                const value = existing === undefined ? originals.get(key) : existing;
                if (typeof value === 'string') {
                  if (existing === undefined) store.put(value, key);
                  migrated.set(key, value);
                }
                if (--remaining === 0 && marker.result !== true) store.put(true, MIGRATED);
                } catch { store.transaction.abort(); }
              };
            }
          } catch { store.transaction.abort(); }
        };
      });
      for (const [key, value] of migrated) this.cache.set(key, value);
      this.initialized = true;
      this.onStatus({ ...this.status });
    } catch (error) {
      db.close();
      throw new Error(`Impossible de migrer les sauvegardes ; les deux copies historiques sont conservées. ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private transaction(mode: IDBTransactionMode, action: (store: IDBObjectStore) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE, mode);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error ?? new Error('Transaction de sauvegarde annulée.'));
      transaction.onerror = () => { /* onabort is the authoritative outcome. */ };
      try { action(transaction.objectStore(STORE)); }
      catch (error) { transaction.abort(); reject(error); }
    });
  }

  peekItem(key: string): string | null {
    if (!this.initialized) throw new Error('Le stockage des sauvegardes n’est pas encore prêt.');
    return this.fallback ? this.fallback.peekItem(key) : this.cache.get(key) ?? null;
  }
  async getItem(key: string): Promise<string | null> {
    await this.initialize();
    if (this.fallback) return this.fallback.getItem(key);
    let value: unknown;
    await this.transaction('readonly', store => {
      const request = store.get(key);
      request.onsuccess = () => { value = request.result; };
    });
    if (value !== undefined && typeof value !== 'string') throw new Error('Emplacement de sauvegarde illisible.');
    if (typeof value === 'string') this.cache.set(key, value); else this.cache.delete(key);
    return typeof value === 'string' ? value : null;
  }
  async setItem(key: string, value: string): Promise<void> {
    await this.initialize();
    if (this.fallback) return this.fallback.setItem(key, value);
    try { await this.transaction('readwrite', store => { store.put(value, key); }); }
    catch (error) {
      throw new Error(`Sauvegarde non écrite. Les autres copies sont conservées ; vérifiez l’espace disponible ou exportez la partie. ${error instanceof Error ? error.message : String(error)}`);
    }
    this.cache.set(key, value);
  }
  async removeItem(key: string): Promise<void> {
    await this.initialize();
    if (this.fallback) return this.fallback.removeItem(key);
    await this.transaction('readwrite', store => { store.delete(key); });
    this.cache.delete(key);
  }
  close(): void { this.db?.close(); }
}
