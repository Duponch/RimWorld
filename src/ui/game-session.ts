import { SCENARIOS, isScenarioId, type ScenarioId } from '../sim/scenario-definitions';
import { TICKS_PER_DAY } from '../sim/types';
import { type SiteOptions } from '../sim/site';
import { decodeStoredSave,encodeStoredSave,storedSaveMetadata } from './save-storage-codec';
import { LocalSaveRepository, SAVE_KEY, PREVIOUS_KEY, type SaveRepository, type SessionStorage } from './save-repository';
export { SAVE_KEY, PREVIOUS_KEY } from './save-repository';

interface SessionClient {
  init(seed: number, size: number, scenario: ScenarioId, paused?: boolean,site?:SiteOptions): Promise<unknown>;
  load(data: string): Promise<unknown>;
  save(): Promise<string | undefined>;
}
export interface SavedColony { key: string; label: string; detail: string }

/** One operation at a time. An accepted world and its recovery copy survive a
 * later graphics error. A refused world restores the previous recovery slot. */
export class GameSession {
  busy = false;
  hasWorld = false;
  private simulationStopped = false;
  readonly repository: SaveRepository;
  constructor(private readonly client: SessionClient,
    storage: SaveRepository | (() => SessionStorage),
    private readonly prepare: () => Promise<void>,
    private readonly onReplacementAccepted: () => void = () => {}) {
    this.repository = typeof storage === 'function' ? new LocalSaveRepository(storage) : storage;
  }

  initializeStorage(): Promise<void> { return this.repository.initialize(); }

  /** After a fatal stop the current World may be partial. Keep the existing
   * recovery and permit only a fresh validated replacement, never saving it. */
  markSimulationStopped(): void { this.simulationStopped = true; }

  saves(): SavedColony[] {
    const result: SavedColony[] = [];
    for (const [key, label] of [[SAVE_KEY, 'Sauvegarde manuelle'], [PREVIOUS_KEY, 'Colonie précédente']]) {
      const data = this.repository.peekItem(key!);
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
    let undecided = false;
    try { await action(); }
    catch (error) {
      const status = error as { outcome?: unknown; stopped?: unknown };
      undecided = status?.outcome === 'unknown' && status.stopped !== true;
      throw error;
    } finally { if (!undecided) this.busy = false; }
  }

  async save(): Promise<void> {
    return this.exclusive(async () => {
      if (!this.hasWorld) throw new Error('Aucune colonie à sauvegarder.');
      if (this.simulationStopped) throw new Error('Le dernier tick peut être incomplet. Chargez une colonie validée pour reprendre.');
      const data = await this.client.save();
      if (!data) throw new Error('La simulation a retourné une sauvegarde vide.');
      const stored = await encodeStoredSave(data);
      await this.repository.setItem(SAVE_KEY, stored);
    });
  }

  private async replace(replaceWorld: () => Promise<unknown>): Promise<void> {
    const storage = this.repository;
    let preserved = false;
    const olderBackup = await storage.getItem(PREVIOUS_KEY);
    if (this.hasWorld && !this.simulationStopped) {
      const previous = await this.client.save();
      if (!previous) throw new Error('Impossible de préserver la colonie actuelle.');
      const stored = await encodeStoredSave(previous);
      await storage.setItem(PREVIOUS_KEY, stored);
      preserved = true;
    }
    try { await replaceWorld(); }
    catch (error) {
      if ((error as { outcome?: unknown })?.outcome === 'unknown') throw error;
      if (preserved) {
        try {
          if (olderBackup === null) await storage.removeItem(PREVIOUS_KEY);
          else await storage.setItem(PREVIOUS_KEY, olderBackup);
        } catch {
          throw new Error('Opération refusée. La colonie active est conservée ; sa copie de récupération remplace la précédente.');
        }
      }
      throw error;
    }
    this.hasWorld = true;
    this.simulationStopped = false;
    // The validated checkpoint and acknowledgement establish the new World.
    // Graphics preparation may still fail without undoing that acceptance.
    this.onReplacementAccepted();
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
      const data = await this.repository.getItem(key);
      if (data === null) throw new Error('Cette sauvegarde n’est plus disponible.');
      const decoded = await decodeStoredSave(data);
      await this.replace(() => this.client.load(decoded));
    });
  }
}
