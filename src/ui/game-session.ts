import { SCENARIOS, isScenarioId, type ScenarioId } from '../sim/scenario-definitions';
import { calendarTick } from '../sim/calendar';
import { TICKS_PER_DAY } from '../sim/types';

export const SAVE_KEY = 'lisiere.save.v1';
export const PREVIOUS_KEY = 'lisiere.previous.v1';
interface SessionClient {
  init(seed: number, size: number, scenario: ScenarioId, paused?: boolean): Promise<unknown>;
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
      try {
        const value = JSON.parse(data);
        if (value && Number.isSafeInteger(value.tick) && value.tick >= 0 && Number.isInteger(value.width) && Number.isInteger(value.height)) {
          const id: unknown = value.scenario?.id;
          const scenario = isScenarioId(id) ? SCENARIOS[id].label : 'Partie historique';
          detail = `${scenario} · jour ${1 + Math.floor(calendarTick(value) / TICKS_PER_DAY)} · ${value.width} × ${value.height} · format ${Number.isInteger(value.schemaVersion) ? value.schemaVersion : "ancien"}`;
        }
      } catch { /* Keep the slot visible; only the simulation validates it. */ }
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
      this.storage().setItem(SAVE_KEY, data);
    });
  }

  private async replace(replaceWorld: () => Promise<unknown>): Promise<void> {
    const storage = this.storage();
    let preserved = false;
    const olderBackup = storage.getItem(PREVIOUS_KEY);
    if (this.hasWorld) {
      const previous = await this.client.save();
      if (!previous) throw new Error('Impossible de préserver la colonie actuelle.');
      storage.setItem(PREVIOUS_KEY, previous);
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

  create(seed: number, size: number, scenario: ScenarioId): Promise<void> {
    return this.exclusive(() => this.replace(() => this.client.init(seed, size, scenario, true)));
  }

  load(key: string): Promise<void> {
    return this.exclusive(async () => {
      if (key !== SAVE_KEY && key !== PREVIOUS_KEY) throw new Error('Emplacement de sauvegarde inconnu.');
      // Read before preserving the active colony: loading the recovery slot may
      // itself replace that slot, but must restore the originally selected data.
      const data = this.storage().getItem(key);
      if (data === null) throw new Error('Cette sauvegarde n’est plus disponible.');
      await this.replace(() => this.client.load(data));
    });
  }
}
