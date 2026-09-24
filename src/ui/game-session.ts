import { SCENARIOS, isScenarioId, type ScenarioId } from '../sim/scenario-definitions';
import { TICKS_PER_DAY } from '../sim/types';
import { type SiteOptions } from '../sim/site';
import { decodeStoredSave,encodeStoredSave,storedSaveMetadata } from './save-storage-codec';

export const SAVE_KEY = 'lisiere.save.v1';
export const PREVIOUS_KEY = 'lisiere.previous.v1';
interface SessionClient {
  init(seed: number, size: number, scenario: ScenarioId, paused?: boolean,site?:SiteOptions): Promise<unknown>;
  load(data: string): Promise<unknown>;
  save(): Promise<string | undefined>;
}
type SessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export interface SavedColony { key: string; label: string; detail: string }

/** One operation at a time. An accepted world and its recovery copy survive a
 * later graphics error. A refused world restores the previous recovery slot. */
export class GameSession {
  busy = false;
  hasWorld = false;
  constructor(private readonly client: SessionClient,
    private readonly storage: () => SessionStorage,
    private readonly prepare: () => Promise<void>) {}

  saves(): SavedColony[] {
    const storage = this.storage();
    const result: SavedColony[] = [];
    for (const [key, label] of [[SAVE_KEY, 'Sauvegarde manuelle'], [PREVIOUS_KEY, 'Colonie précédente']]) {
      const data = storage.getItem(key!);
      if (data === null) continue;
      let detail = 'Données illisibles — le chargement vérifiera ce fichier.';
      const value = storedSaveMetadata(data);
      if (value) {
        const scenario = isScenarioId(value.scenario) ? SCENARIOS[value.scenario].label : 'Partie historique';
        const civilTick = value.tick + (value.profile ? TICKS_PER_DAY / 4 : 0);
        detail = `${scenario} · jour ${1 + Math.floor(civilTick / TICKS_PER_DAY)} · ${value.width} × ${value.height} · format ${value.schemaVersion ?? "ancien"}`;
      }
      result.push({ key: key!, label: label!, detail });
    }
    return result;
  }

  private async exclusive(action: () => Promise<void>): Promise<void> {
    if (this.busy) throw new Error('Une opération de partie est déjà en cours.');
    this.busy = true;
    try { await action(); } finally { this.busy = false; }
  }

  async save(): Promise<void> {
    return this.exclusive(async () => {
      if (!this.hasWorld) throw new Error('Aucune colonie à sauvegarder.');
      const data = await this.client.save();
      if (!data) throw new Error('La simulation a retourné une sauvegarde vide.');
      const stored = await encodeStoredSave(data);
      this.storage().setItem(SAVE_KEY, stored);
    });
  }

  private async replace(replaceWorld: () => Promise<unknown>): Promise<void> {
    const storage = this.storage();
    let preserved = false;
    const olderBackup = storage.getItem(PREVIOUS_KEY);
    if (this.hasWorld) {
      const previous = await this.client.save();
      if (!previous) throw new Error('Impossible de préserver la colonie actuelle.');
      const stored = await encodeStoredSave(previous);
      storage.setItem(PREVIOUS_KEY, stored);
      preserved = true;
    }
    try { await replaceWorld(); }
    catch (error) {
      if (preserved) {
        try {
          if (olderBackup === null) storage.removeItem(PREVIOUS_KEY);
          else storage.setItem(PREVIOUS_KEY, olderBackup);
        } catch {
          throw new Error('Opération refusée. La colonie active est conservée ; sa copie de récupération remplace la précédente.');
        }
      }
      throw error;
    }
    this.hasWorld = true;
    await this.prepare();
  }

  create(seed: number, size: number, scenario: ScenarioId,site?:SiteOptions): Promise<void> {
    return this.exclusive(() => this.replace(() => this.client.init(seed, size, scenario, true,site)));
  }

  /** External copies never occupy the manual slot. Read/decode/check the file
   * before preserving the active world; the worker performs strict validation. */
  loadExternal(read: () => Promise<string>): Promise<void> {
    return this.exclusive(async () => {
      const data = await read();
      await this.replace(() => this.client.load(data));
    });
  }

  load(key: string): Promise<void> {
    return this.exclusive(async () => {
      if (key !== SAVE_KEY && key !== PREVIOUS_KEY) throw new Error('Emplacement de sauvegarde inconnu.');
      // Read before preserving the active colony: loading the recovery slot may
      // itself replace that slot, but must restore the originally selected data.
      const data = this.storage().getItem(key);
      if (data === null) throw new Error('Cette sauvegarde n’est plus disponible.');
      const decoded = await decodeStoredSave(data);
      await this.replace(() => this.client.load(decoded));
    });
  }
}
