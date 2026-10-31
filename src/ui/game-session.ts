import type { StartingParty } from '../sim/starting-candidates';
import type { StartingWorld } from '../sim/starting-world';
import { SCENARIOS, isScenarioId, type ScenarioId } from '../sim/scenario-definitions';
import { TICKS_PER_DAY } from '../sim/types';
import { type SiteOptions } from '../sim/site';
import { decodeStoredSave,encodeStoredSave,storedSaveMetadata } from './save-storage-codec';
import { LocalSaveRepository, SAVE_KEY, PREVIOUS_KEY, type SaveRepository, type SessionStorage } from './save-repository';
import { AUTO_SAVE_KEYS,MANAGED_SAVE_KEYS,NAMED_SAVE_KEYS,encodeSaveSlot,isManagedSaveKey,isNamedSaveKey,nextAutosaveKey,nextAutosaveSequence,parseSaveSlot,saveLabel } from './save-slots';
export { SAVE_KEY, PREVIOUS_KEY } from './save-repository';

interface SessionClient {
  init(seed: number, size: number, scenario: ScenarioId, paused?: boolean,site?:SiteOptions,startingParty?:StartingParty,startingWorld?:StartingWorld,surface?:'snow-phased-v1'): Promise<unknown>;
  load(data: string): Promise<unknown>;
  save(): Promise<string | undefined>;
}
export interface SavedColony { key: string; label: string; detail: string;kind:'manual'|'recovery'|'named'|'auto';savedAt?:number;revision?:string }

/** One operation at a time. An accepted world and its recovery copy survive a
 * later graphics error. A refused world restores the previous recovery slot. */
export class GameSession {
  busy = false;
  hasWorld = false;
  generation = 0;
  private simulationStopped = false;
  private readonly listed=new Map<string,{stored:string;entry:SavedColony}>();
  readonly repository: SaveRepository;
  constructor(private readonly client: SessionClient,
    storage: SaveRepository | (() => SessionStorage),
    private readonly prepare: () => Promise<void>,
    private readonly onReplacementAccepted: () => void = () => {},
    private readonly onOperationSettled: () => void = () => {}) {
    this.repository = typeof storage === 'function' ? new LocalSaveRepository(storage) : storage;
  }

  initializeStorage(): Promise<void> { return this.repository.initialize(); }

  /** After a fatal stop the current World may be partial. Keep the existing
   * recovery and permit only a fresh validated replacement, never saving it. */
  markSimulationStopped(): void { this.simulationStopped = true; }

  saves(): SavedColony[] {
    const result: SavedColony[] = [];
    for (const key of [SAVE_KEY,PREVIOUS_KEY,...MANAGED_SAVE_KEYS]) {
      const stored = this.repository.peekItem(key);
      if (stored === null){this.listed.delete(key);continue;}
      const cached=this.listed.get(key);
      if(cached?.stored===stored){result.push({...cached.entry});continue;}
      const kind:SavedColony['kind']=key===SAVE_KEY?'manual':key===PREVIOUS_KEY?'recovery':isNamedSaveKey(key)?'named':'auto';
      let label=kind==='manual'?'Sauvegarde manuelle':kind==='recovery'?'Colonie précédente':kind==='auto'?'Autosauvegarde':'Sauvegarde nommée';
      let data=stored,savedAt:number|undefined,valid=true;
      if(isManagedSaveKey(key)){
        try{const slot=parseSaveSlot(stored);label=slot.label;data=slot.data;savedAt=slot.savedAt;}
        catch{valid=false;label+=' · illisible';}
      }
      let detail = 'Données illisibles — le chargement vérifiera ce fichier.';
      const value = valid?storedSaveMetadata(data):null;
      if (value) {
        const scenario = isScenarioId(value.scenario) ? SCENARIOS[value.scenario].label : 'Partie historique';
        const civilTick = value.tick + (value.profile ? TICKS_PER_DAY / 4 : 0);
        detail = value.campaignOnly?`Campagne sans carte locale · format ${value.schemaVersion}`:`${scenario} · jour ${1 + Math.floor(civilTick / TICKS_PER_DAY)} · ${value.width} × ${value.height} · format ${value.schemaVersion ?? "ancien"}`;
      }
      const entry:SavedColony={key,label,detail,kind,...(savedAt===undefined?{}:{savedAt}),...(isManagedSaveKey(key)?{revision:stored}:{})};
      this.listed.set(key,{stored,entry});result.push({...entry});
    }
    return result.sort((a,b)=>{
      const rank={manual:0,recovery:1,named:2,auto:3};
      return rank[a.kind]-rank[b.kind]||(b.savedAt??0)-(a.savedAt??0)||a.key.localeCompare(b.key);
    });
  }
  async refreshSaves():Promise<void> {
    await Promise.all([SAVE_KEY,PREVIOUS_KEY,...MANAGED_SAVE_KEYS].map(key=>this.repository.getItem(key)));
  }

  private async exclusive<T>(action: () => Promise<T>): Promise<T> {
    if (this.busy) throw new Error('Une opération de partie est déjà en cours.');
    this.busy = true;
    let undecided = false;
    try { return await action(); }
    catch (error) {
      const status = error as { outcome?: unknown; stopped?: unknown };
      undecided = status?.outcome === 'unknown' && status.stopped !== true;
      throw error;
    } finally { if (!undecided) { this.busy = false; this.onOperationSettled(); } }
  }

  async save(): Promise<void> {
    return this.exclusive(async () => {
      const data = await this.capture();
      const stored = await encodeStoredSave(data);
      await this.repository.setItem(SAVE_KEY, stored);
    });
  }
  private async capture():Promise<string> {
    if(!this.hasWorld)throw new Error('Aucune colonie à sauvegarder.');
    if(this.simulationStopped)throw new Error('Le dernier tick peut être incomplet. Chargez une colonie validée pour reprendre.');
    const data=await this.client.save();
    if(!data)throw new Error('La simulation a retourné une sauvegarde vide.');
    return data;
  }
  async saveNamed(label:string,key?:string,expectedRecord?:string):Promise<void> {
    const name=saveLabel(label);
    if(key!==undefined&&!isNamedSaveKey(key))throw new Error('Cet emplacement ne peut pas être remplacé par une sauvegarde nommée.');
    return this.exclusive(async()=>{
      const data=await encodeStoredSave(await this.capture()),value=encodeSaveSlot(data,name,Date.now());
      await this.repository.selectAndSet(key?[key]:NAMED_SAVE_KEYS,values=>{
        const target=key??NAMED_SAVE_KEYS.find(candidate=>values.get(candidate)===null);
        if(!target)throw new Error('Les douze emplacements nommés sont occupés. Remplacez une sauvegarde choisie ou supprimez-en une.');
        if(key&&values.get(key)===null)throw new Error('Cette sauvegarde n’existe plus. Créez une nouvelle copie.');
        if(key&&expectedRecord!==undefined&&values.get(key)!==expectedRecord)throw new Error('Cette sauvegarde a changé dans un autre onglet. Rouvrez le menu avant de la remplacer.');
        return {key:target,value};
      });
    });
  }
  async autosave():Promise<void> {
    return this.exclusive(async()=>{
      const data=await encodeStoredSave(await this.capture()),savedAt=Date.now();
      await this.repository.selectAndSet(AUTO_SAVE_KEYS,values=>({key:nextAutosaveKey(values),
        value:encodeSaveSlot(data,'Autosauvegarde',savedAt,nextAutosaveSequence(values))}));
    });
  }
  deleteSave(key:string,expectedRecord?:string):Promise<void> {
    if(!isManagedSaveKey(key))return Promise.reject(new Error('Les deux sauvegardes historiques ne peuvent pas être supprimées ici.'));
    return this.exclusive(async()=>{
      await this.repository.selectAndSet([key],values=>{
        if(expectedRecord!==undefined&&values.get(key)!==expectedRecord)throw new Error('Cette sauvegarde a changé dans un autre onglet. Rouvrez le menu avant de la supprimer.');
        return {key,value:null};
      });
    });
  }
  /** An acknowledged capture can be exported even if local storage is full. */
  exportSave():Promise<string> { return this.exclusive(()=>this.capture()); }

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
    this.generation++;
    // The validated checkpoint and acknowledgement establish the new World.
    // Graphics preparation may still fail without undoing that acceptance.
    this.onReplacementAccepted();
    await this.prepare();
  }

  /** Same recovery/rollback/accepted-checkpoint path, with an already confirmed worker draft. */
  createConfirmedDraft(operation:()=>Promise<unknown>):Promise<void> {return this.exclusive(()=>this.replace(operation));}

  create(seed: number, size: number, scenario: ScenarioId,site?:SiteOptions,startingParty?:StartingParty,startingWorld?:StartingWorld): Promise<void> {
    return this.exclusive(() => this.replace(() => this.client.init(seed, size, scenario, true,site,startingParty,startingWorld,'snow-phased-v1')));
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
      if (key !== SAVE_KEY && key !== PREVIOUS_KEY&&!isManagedSaveKey(key)) throw new Error('Emplacement de sauvegarde inconnu.');
      // Read before preserving the active colony: loading the recovery slot may
      // itself replace that slot, but must restore the originally selected data.
      const data = await this.repository.getItem(key);
      if (data === null) throw new Error('Cette sauvegarde n’est plus disponible.');
      const decoded = await decodeStoredSave(isManagedSaveKey(key)?parseSaveSlot(data).data:data);
      await this.replace(() => this.client.load(decoded));
    });
  }
}
