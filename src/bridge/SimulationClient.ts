import {validGeographicCreationSize262,validGeographicCreationSeason262} from '../sim/geographic-creation-options-262';
import {worldGenerationKey,validWorldGenerationSettings} from '../sim/world-generation-settings';
import {WORLD_FACTION_DEFINITIONS_256,isWorldFactionDef256} from '../sim/world-faction-catalog';
import type {DraftGeographyPreview256} from '../sim/world-geography-owner-256';
import type {WorldCreationRequest256,WorldCreationPreview256,WorldCreationProgress256,WorldCreationSiteRequest256,WorldCreationTicket256} from '../ui/world-creation-contract';
import {validStartingOriginalRequest256,type StartingOriginalRequest256} from '../sim/starting-original-request-256';
import {planetTileCount} from '../sim/planet-geography-256';
import type {CampaignSummary,SettlementLimit} from '../sim/world-map-state';
import {validSettlementLimit} from '../sim/world-map-options';
import { UrgentThreatDelivery, validThreatPauseMode, type ThreatPauseMode, type ThreatPauseToken, type ThreatSpeedOptions, type UrgentThreatReceipt } from './urgent-threats';
import type { Command, World } from '../sim/types';
import { SimulationRequestError, type Request, type Response, type SimulationFault, type SimulationRequestStatus } from './protocol';
import { DEFAULT_MAP_SIZE } from '../sim/map-config';
import { SnapshotDecoder } from './snapshots';
import type { AudioCue } from './audio-cues';
import type {BillWorkerOption283,BillWorkerOptions283} from '../sim/bill-worker-state-283';

/** Transport readers are selected by a fixed client implementation, never by a packet flag. */
export type SnapshotReader=Pick<SnapshotDecoder,'adopt'|'adoptCampaignOnly'|'prepareDraftPreview'|'authorizeDraftPreview'|'discardDraftPreview'>&{readMotion?(packet:import('./snapshots').SnapshotMessage<true>):import('./motion-tracks').PawnTrack[]|undefined};

type Payload = Request extends infer R ? R extends { id: number } ? Omit<R, 'id'> : never : never;
interface PendingWorldDraft256 {
 generation:number;aborted?:boolean;request:WorldCreationRequest256;onProgress:(progress:WorldCreationProgress256)=>void;
 preview?:WorldCreationPreview256;geography?:DraftGeographyPreview256;
}
interface PendingWorldStart256 {generation:number;operationId?:number;cancelRequested?:boolean;onProgress:(progress:WorldCreationProgress256)=>void}
interface PendingRequest {
  draft?:PendingWorldDraft256;
  draftStart?:PendingWorldStart256;
  campGroupId?:number;
  type: Request['type'];
  resolve: (value: string | undefined) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  reply?: Extract<Response, { type: 'reply' }>;
  replacementEpoch?: number;
  waiting?: boolean;
}

export class SimulationClient {
  private worker!: Worker;
  private readonly urgentThreats = new UrgentThreatDelivery();
  private confirmedCampaign?:CampaignSummary;
  private activeMap=false;
  private settlementMaximum:SettlementLimit=1;
  get hasActiveMap():boolean{return this.activeMap;}
  get campaignSummary():CampaignSummary|undefined{return this.confirmedCampaign;}
  get maxSettlements():SettlementLimit{return this.settlementMaximum;}
  protected deliverCampaignOnly(_summary:CampaignSummary,_stepMs:number,_speed:number,_replaced:boolean):void {}
  private threatPauseMode: ThreatPauseMode = 'major';
  private nextId = 1;
  private draftGeneration=0;
  private draftAbortCleanup?:()=>void;
  private worldDraft?:{preview:WorldCreationPreview256;geography:DraftGeographyPreview256;ticket?:WorldCreationTicket256;starting?:boolean};
  private snapshots: SnapshotReader;
  private adopted?: { epoch: number; revision: number };
  private stopped = false;
  private fault?: SimulationFault;
  private resyncing = false;
  private readonly pending = new Map<number, PendingRequest>();
  private tradeArrivals261:import('./protocol').CaravanTradeArrivalMessage261[]=[];
  onCaravanTradeArrival:(message:import('./protocol').CaravanTradeArrivalMessage261)=>void=()=>{};
  onCaravanEncounterProgress:(message:import('./protocol').CaravanEncounterProgressMessage261)=>void=()=>{};
  onCampProgress: (message:import('./protocol').CampEntryProgressMessage256|undefined)=>void = ()=>{};
  get hasWorldCreationPreparation():boolean{return [...this.pending.values()].some(p=>p.type==='world-draft-generate'||p.type==='world-draft-start');}
  get hasCampPreparation():boolean{return [...this.pending.values()].some(p=>p.campGroupId!==undefined);}
  onSnapshot: (world: World, stepMs: number, speed: number, replaced: boolean, motion?: import('./motion-tracks').PawnTrack[]) => void = () => {};
  onAudioCues: (cues: readonly AudioCue[], world: World, replaced: boolean) => void = () => {};
  onUrgentThreats: (receipt: UrgentThreatReceipt) => void = () => {};
  onError: (message: string) => void = () => {};
  onFault: (fault: SimulationFault) => void = () => {};
  onRequestStatus: (status: SimulationRequestStatus) => void = () => {};

  constructor() {
    this.snapshots = this.createDecoder();
    this.startWorker();
  }

  protected createDecoder(): SnapshotReader { return new SnapshotDecoder(); }

  protected createWorker():Worker {return new Worker(new URL('./simulation.worker.ts',import.meta.url),{type:'module'});}
  protected readWorkerMessage(value:unknown):Response {return value as Response;}

  /** The default client and readWorkerMessage instrumentation remain strict. */
  protected withWorkerMessage(_source:Worker,_event:MessageEvent<unknown>,dispatch:()=>void):void {dispatch();}
  protected workerStopped(_source:Worker):void {}

  protected deliverSnapshot(world: World, stepMs: number, speed: number, replaced: boolean, motion?: import('./motion-tracks').PawnTrack[]): void {
    this.onSnapshot(world, stepMs, speed, replaced, motion);
  }

  protected deliverAudioCues(cues: readonly AudioCue[], world: World, replaced: boolean): void {
    this.onAudioCues(cues, world, replaced);
  }

  protected deliverUrgentThreats(receipt: UrgentThreatReceipt): void { this.onUrgentThreats(receipt); }

  private deliverTradeArrivals261():void {const adopted=this.adopted;if(!adopted)return;const rows=this.tradeArrivals261;this.tradeArrivals261=[];for(const row of rows){if(row.checkpoint.epoch<adopted.epoch)continue;if(row.checkpoint.epoch===adopted.epoch&&row.checkpoint.revision<=adopted.revision){try{this.onCaravanTradeArrival(row);}catch(error){this.onError(String(error));}}else this.tradeArrivals261.push(row);}}
  private startWorker() {
    this.worker = this.createWorker();
    this.stopped = false;
    const source=this.worker;
    this.worker.onmessage = (event:MessageEvent<unknown>) => {
      if(source!==this.worker||this.stopped)return;
      this.withWorkerMessage(source,event,()=>{
      const raw=event.data;
      let data:Response;
      try{data=this.readWorkerMessage(raw);}catch{this.stop('La projection reçue ne correspond pas au Worker courant.');return;}
      if(data.type==='world-draft-progress'){
        const pending=this.pending.get(data.id),d=pending?.draft,s=pending?.draftStart,p=data.progress;
        const receiver=d&&!d.aborted?d:s&&!s.cancelRequested?s:undefined;
        if(receiver&&receiver.generation===data.generation&&this.draftGeneration===receiver.generation&&p&&typeof p.phase==='string'&&p.phase.length<=80&&Number.isSafeInteger(p.completed)&&Number.isSafeInteger(p.total)&&p.completed>=0&&p.total>=p.completed){try{receiver.onProgress({...p});}catch(error){this.onError(String(error));}}return;
      }
      if(data.type==='world-draft-preview'){
        const pending=this.pending.get(data.id),d=pending?.draft;if(!pending||!d||d.aborted)return;
        try{
          if(d.generation!==data.generation||this.draftGeneration!==d.generation||data.key!==worldGenerationKey(d.request.seed,d.request.settings)||!data.request||worldGenerationKey(data.request.seed,data.request.settings)!==data.key||!sameDraftPlayer256(data.request.player,d.request.player))throw Error('Le monde reçu ne correspond pas à cette préparation.');
          if(!Array.isArray(data.factions)||data.factions.length!==d.request.settings.factions.length+1||!Array.isArray(data.settlements))throw Error('Résumés du monde invalides.');
          const expected=[...d.request.settings.factions,d.request.player.playerDef],factions=new Map<number,string>(),settlements=new Set<number>(),tiles=new Set<number>();
          for(let i=0;i<data.factions.length;i++){const f=data.factions[i]!,def:unknown=f.def;if(!Number.isSafeInteger(f.id)||f.id<1||factions.has(f.id)||!isWorldFactionDef256(def)||def!==expected[i]||f.hidden!==WORLD_FACTION_DEFINITIONS_256[def].hidden||typeof f.name!=='string'||!f.name.length||f.name.length>80||WORLD_FACTION_DEFINITIONS_256[def].player&&f.name!==d.request.player.playerName)throw Error('Résumé des factions invalide.');factions.set(f.id,def);}
          const geography=this.snapshots.prepareDraftPreview(data.geography),owner=geography.owner;
          if(worldGenerationKey(owner.surface.seedText,{...owner.surface.settings,factions:[...owner.definition.factions]})!==data.key||data.settlements.length>owner.surface.tiles.length)throw Error('Géographie de préparation différente.');
          for(const s of data.settlements){const def=factions.get(s.factionId);if(!Number.isSafeInteger(s.id)||s.id<1||settlements.has(s.id)||!def||!isWorldFactionDef256(def)||WORLD_FACTION_DEFINITIONS_256[def].player||WORLD_FACTION_DEFINITIONS_256[def].hidden||!Number.isSafeInteger(s.tile)||!owner.surface.tiles[s.tile]||tiles.has(s.tile)||typeof s.name!=='string'||!s.name.length||s.name.length>80)throw Error('Résumé des implantations invalide.');settlements.add(s.id);tiles.add(s.tile);}
          const request=copyDraftRequest256(d.request);Object.freeze(request.player);Object.freeze(request.settings.factions);Object.freeze(request.settings);Object.freeze(request);
          const preview={generation:d.generation,key:data.key,request,geography:owner,factions:data.factions.map(f=>Object.freeze({...f})),settlements:data.settlements.map(s=>Object.freeze({...s}))};Object.freeze(preview.factions);Object.freeze(preview.settlements);Object.freeze(preview);d.preview=preview;d.geography=geography;
        }catch(error){pending.reply={type:'reply',id:data.id,ok:false,outcome:'refused',reason:error instanceof Error?error.message:String(error)};this.finishReply(data.id,pending);}
        return;
      }
      if (data.type === 'fault') {
        this.fault = data;
        // The worker has stopped authoritatively. Keep recovery copies, even
        // when publication failed after a replacement or a partial tick.
        this.rejectPending(new SimulationRequestError(data.reason, 'unknown', true));
        this.onFault(data);
        this.onError(data.reason);
        return;
      }
      if(data.type==='caravan-trade-arrival'){if([data.groupId,data.settlementId,data.factionId,data.postId,data.checkpoint?.epoch,data.checkpoint?.revision].every(n=>Number.isSafeInteger(n)&&n>=1)&&this.tradeArrivals261.length<32){this.tradeArrivals261.push(data);this.deliverTradeArrivals261();}return;}
      if(data.type==='caravan-encounter-progress'){if(Number.isSafeInteger(data.groupId)&&data.groupId>=1&&typeof data.phase==='string'&&data.phase.length<=80&&(data.reason===undefined||typeof data.reason==='string'&&data.reason.length<=2048)){try{this.onCaravanEncounterProgress({...data});}catch(error){this.onError(String(error));}}return;}
      if(data.type==='camp-entry-progress'){
        const pending=this.pending.get(data.id),p=data.progress;
        if(pending?.campGroupId===data.groupId&&Number.isSafeInteger(data.groupId)&&data.groupId>0&&p&&typeof p.phase==='string'&&p.phase.length<=80&&(p.completed===undefined&&p.total===undefined||Number.isSafeInteger(p.completed)&&Number.isSafeInteger(p.total)&&p.completed!>=0&&p.total!>=p.completed!)){
          try{this.onCampProgress({...data,progress:{...p}});}catch(error){this.onError(String(error));}
        }return;
      }
      if(data.type==='campaign-only'){
        let result;try{if(!this.urgentThreats.accepts(data.urgentThreats,data.summary.tick,data.speed,data.summary.planet?planetTileCount(data.summary.planet):undefined))result={status:'resync' as const,reason:'Métadonnées de menace illisibles.'};else result=this.snapshots.adoptCampaignOnly(data,view=>this.urgentThreats.accepts(data.urgentThreats,view.tick,data.speed,view.planet?planetTileCount(view.planet):undefined));}catch{result={status:'resync' as const,reason:'Campagne sans carte illisible.'};}
        if(result.status==='applied'){const urgent=this.urgentThreats.commit(data.urgentThreats,data.summary.tick);this.adopted={epoch:data.epoch,revision:data.revision};this.activeMap=false;this.confirmedCampaign=result.summary;for(const pending of this.pending.values())if((pending.type==='init'||pending.type==='load'||pending.type==='world-draft-start')&&result.replaced)pending.replacementEpoch=data.epoch;try{this.deliverCampaignOnly(result.summary,data.stepMs,data.speed,result.replaced);this.deliverTradeArrivals261();if(urgent)this.deliverUrgentThreats(urgent);}catch(error){this.onError(String(error));}for(const [id,pending]of this.pending)this.finishReply(id,pending);}else if(result.status==='resync'&&!this.resyncing){this.resyncing=true;void this.request({type:'resync'}).catch(error=>this.onError(String(error))).finally(()=>{this.resyncing=false;});}return;
      }
      if (data.type === 'snapshot') {
        let result;
        try {
          const tick = Object.getOwnPropertyDescriptor(data.world, 'tick');
          if (!tick || !('value' in tick) || !this.urgentThreats.accepts(data.urgentThreats, tick.value, data.speed,data.world.planet?planetTileCount(data.world.planet):undefined)) {
            result = { status: 'resync' as const, reason: 'Métadonnées de menace illisibles.' };
          } else result = this.snapshots.adopt(data,view=>this.urgentThreats.accepts(data.urgentThreats,view.tick,data.speed,view.planet?planetTileCount(view.planet):undefined));
        }
        catch { result = { status: 'resync' as const, reason: 'Snapshot illisible.' }; }
        if (result.status === 'applied') {
          this.activeMap=true;this.confirmedCampaign=undefined;
          const urgentReceipt = this.urgentThreats.commit(data.urgentThreats!, result.world.tick);
          this.adopted = { epoch: data.epoch, revision: data.revision };
          for (const pending of this.pending.values()) if (pending.type === 'init' || pending.type === 'load' || pending.type === 'world-draft-start') {
            if (result.replaced) pending.replacementEpoch = data.epoch;
          }
          try { this.deliverSnapshot(result.world, data.stepMs, data.speed, result.replaced, this.snapshots.readMotion?this.snapshots.readMotion(data):data.motion);this.deliverTradeArrivals261(); }
          catch (error) { this.onError(`Présentation interrompue : ${error instanceof Error ? error.message : String(error)}`); }
          try { if (result.replaced || data.audioCues?.length) this.deliverAudioCues(data.audioCues ?? [], result.world, result.replaced); }
          catch (error) { this.onError(`Audio interrompu : ${error instanceof Error ? error.message : String(error)}`); }
          try { if (urgentReceipt) this.deliverUrgentThreats(urgentReceipt); }
          catch (error) { this.onError(`Avertissement interrompu : ${error instanceof Error ? error.message : String(error)}`); }
          for (const [id, pending] of this.pending) this.finishReply(id, pending);
        }
        else if (result.status === 'resync' && !this.resyncing) {
          this.resyncing = true;
          void this.request({ type: 'resync' }).catch(error => this.onError(String(error)))
            .finally(() => { this.resyncing = false; });
        }
        return;
      }
      const pending = this.pending.get(data.id);
      if (!pending) return;
      pending.reply = data;
      this.finishReply(data.id, pending);
      });
    };
    this.worker.onerror = (event) => {
      this.stop(`Simulation interrompue : ${event.message}`);
    };
    this.worker.onmessageerror = () => this.stop('La communication avec la simulation est interrompue.');
  }

  private finishReply(id: number, pending: PendingRequest) {
    const reply = pending.reply;
    if (!reply) return;
    if(reply.ok&&pending.campGroupId!==undefined&&reply.checkpoint&&(!this.adopted||this.adopted.epoch!==reply.checkpoint.epoch||this.adopted.revision<reply.checkpoint.revision))return;
    if (reply.ok && (pending.type === 'init' || pending.type === 'load' || pending.type === 'world-draft-start' || pending.type === 'resync')) {
      const expected = reply.checkpoint;
      if (expected && (!this.adopted || this.adopted.epoch !== expected.epoch || this.adopted.revision < expected.revision)) return;
      // Old transports may omit correlation; still require a replacement
      // snapshot for init/load instead of trusting an isolated success reply.
      if (!expected && pending.type !== 'resync' && pending.replacementEpoch === undefined) return;
    }
    if(reply.ok&&pending.type==='world-draft-generate'&&(!pending.draft?.preview||!pending.draft.geography)){pending.reply={type:'reply',id,ok:false,outcome:'refused',reason:'La préparation du monde n’a pas été reçue.'};this.finishReply(id,pending);return;}
    clearTimeout(pending.timer);
    this.pending.delete(id);
    if(pending.campGroupId!==undefined){try{this.onCampProgress(undefined);}catch(error){this.onError(String(error));}}
    this.onRequestStatus({ id, type: pending.type, state: 'settled' });
    if (reply.ok) {
      if (pending.type === 'init' || pending.type === 'load' || pending.type === 'world-draft-start') this.fault = undefined;
      pending.resolve(reply.data);
    } else pending.reject(new SimulationRequestError(reply.reason ?? 'Opération refusée.', reply.outcome ?? 'refused', this.stopped || this.fault !== undefined));
  }

  /** Hard termination is an explicit authoritative stop, never a cancellation
   * acknowledgement or an assertion that pending commands were not applied. */
  stop(reason = 'Simulation arrêtée. Un remplacement validé est nécessaire pour reprendre.') {
    if (this.stopped) return;
    this.stopped = true;
    this.clearWorldDraft256();
    this.workerStopped(this.worker);this.worker.terminate();
    const fault: SimulationFault = { type: 'fault', reason, speed: 0, transport: true };
    this.fault = fault;
    this.rejectPending(new SimulationRequestError(reason, 'unknown', true));
    this.onFault(fault);
    this.onError(reason);
  }

  /** After a hard transport stop, only a subsequent init/load may restore play. */
  restartForReplacement() {
    if (!this.stopped) return;
    this.snapshots = this.createDecoder();
    this.urgentThreats.reset();
    this.adopted = undefined;
    this.resyncing = false;
    this.startWorker();
  }

  private request(payload: Payload,draft?:PendingWorldDraft256,draftStart?:PendingWorldStart256): Promise<string | undefined> {
    if (this.stopped) return Promise.reject(new SimulationRequestError('Simulation arrêtée. Rechargez une colonie validée pour reprendre.', 'unknown', true));
    if (this.fault && payload.type !== 'load' && payload.type !== 'init') return Promise.reject(new SimulationRequestError(this.fault.reason, 'unknown', true));
    if (['command', 'speed', 'load', 'init','world-draft-start'].includes(payload.type) && [...this.pending.values()].some(p => p.waiting && ['command', 'speed', 'load', 'init','world-draft-start'].includes(p.type))) {
      return Promise.reject(new SimulationRequestError('Une opération attend encore une décision de la simulation. Son résultat reste inconnu.', 'refused'));
    }
    if ((payload.type === 'init' || payload.type === 'load' || payload.type === 'world-draft-start') && [...this.pending.values()].some(p => p.type === 'init' || p.type === 'load' || p.type === 'world-draft-start')) {
      return Promise.reject(new SimulationRequestError('Un remplacement de colonie attend encore sa décision.', 'refused'));
    }
    if(this.hasCampPreparation&&payload.type!=='camp-entry-cancel'&&payload.type!=='resync')return Promise.reject(new SimulationRequestError('La préparation de la carte locale attend encore sa décision.', 'refused'));
    if([...this.pending.values()].some(p=>p.type==='world-draft-start')&&payload.type!=='world-draft-cancel'&&payload.type!=='resync')return Promise.reject(new SimulationRequestError('La création de la colonie attend encore sa décision.','refused'));
    if([...this.pending.values()].some(p=>p.type==='world-draft-generate')&&!['world-draft-generate','world-draft-cancel','resync'].includes(payload.type))return Promise.reject(new SimulationRequestError('La préparation du monde attend encore sa décision.','refused'));
    const id = this.nextId++;
    if(draftStart)draftStart.operationId=id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const pending = this.pending.get(id);
        if (!pending) return;
        pending.waiting = true;
        const message = 'La simulation tarde à répondre. Le résultat reste inconnu ; l’opération et sa récupération sont conservées.';
        this.onRequestStatus({ id, type: payload.type, state: 'waiting', message });
        this.onError(message);
      }, 15_000);
      this.pending.set(id, { type: payload.type, resolve, reject, timer,...draft?{draft}:{},...draftStart?{draftStart}:{},...payload.type==='command'&&payload.command.type==='group-enter'&&['camp','settle'].includes(payload.command.mode)?{campGroupId:payload.command.groupId}:{} });
      try { this.worker.postMessage({ ...payload, id } satisfies Request); }
      catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(new SimulationRequestError(error instanceof Error ? error.message : String(error), 'refused'));
      }
    });
  }

  private clearWorldDraft256():void {const held=!!this.draftAbortCleanup||!!this.worldDraft;this.draftAbortCleanup?.();this.draftAbortCleanup=undefined;this.worldDraft=undefined;if(held)this.snapshots.discardDraftPreview();}
  async generateWorldDraft256(input:WorldCreationRequest256,context:{signal:AbortSignal;onProgress:(progress:WorldCreationProgress256)=>void}):Promise<WorldCreationPreview256> {
    if(context.signal.aborted)throw new DOMException('Préparation annulée.','AbortError');
    if(this.hasCampPreparation)throw new SimulationRequestError('La préparation de la carte locale attend encore sa décision.','refused');
    if(!input||!validWorldGenerationSettings(input.settings)||typeof input.seed!=='string'||!sameDraftPlayer256(input.player,input.player)||input.player.scenario!=='crashlanded'||input.player.playerDef!=='PlayerColony')throw Error('Paramètres de création invalides.');
    if([...this.pending.values()].some(p=>p.type==='init'||p.type==='load'||p.type==='world-draft-start'))throw Error('Un remplacement attend encore sa décision.');
    // A previous fatal worker may be retired before a NEW generation only.
    // Its already-delivered fault is not emitted again into this menu flow.
    if(this.fault&&!this.stopped){this.workerStopped(this.worker);this.worker.terminate();this.stopped=true;this.rejectPending(new SimulationRequestError(this.fault.reason,'unknown',true));}
    if(this.stopped){this.restartForReplacement();this.fault=undefined;}
    this.clearWorldDraft256();if(!Number.isSafeInteger(this.draftGeneration+1))throw Error('Identité de préparation épuisée.');const generation=++this.draftGeneration,request=copyDraftRequest256(input),draft:PendingWorldDraft256={generation,request,onProgress:context.onProgress};
    const cancel=()=>{draft.aborted=true;if(this.draftGeneration===generation)this.clearWorldDraft256();void this.request({type:'world-draft-cancel',generation}).catch(()=>{});};
    context.signal.addEventListener('abort',cancel,{once:true});this.draftAbortCleanup=()=>context.signal.removeEventListener('abort',cancel);
    try{await this.request({type:'world-draft-generate',generation,request},draft);if(context.signal.aborted||generation!==this.draftGeneration)throw new DOMException('Préparation annulée.','AbortError');if(!draft.preview||!draft.geography)throw Error('La préparation est perdue. Générez le monde à nouveau.');this.worldDraft={preview:draft.preview,geography:draft.geography};return draft.preview;}
    catch(error){if(generation===this.draftGeneration){this.clearWorldDraft256();void this.request({type:'world-draft-cancel',generation}).catch(()=>{});}throw error;}
  }
  async confirmWorldDraftSite256(request:WorldCreationSiteRequest256):Promise<WorldCreationTicket256> {
    const before=this.worldDraft;if(!before||before.starting||before.preview.generation!==request.generation||before.preview.key!==request.key||!validGeographicCreationSize262(request.size)||!validGeographicCreationSeason262(request.season))throw Error('La préparation est perdue. Générez le monde à nouveau.');
    const raw=await this.request({type:'world-draft-confirm',request:{...request},geographyId:before.geography.id}),ticket:unknown=JSON.parse(raw??'null');
    if(this.worldDraft!==before||!validDraftTicket256(ticket)||ticket.generation!==request.generation||ticket.key!==request.key||ticket.tile!==request.tile||ticket.size!==request.size||ticket.season!==request.season||!sameDraftPlayer256(ticket.player,before.preview.request.player))throw Error('Confirmation de lieu périmée. Générez le monde à nouveau.');
    const confirmed={...ticket,player:{...ticket.player}};Object.freeze(confirmed.player);Object.freeze(confirmed);before.ticket=confirmed;return {...confirmed,player:{...confirmed.player}};
  }
  hasConfirmedWorldDraft256(ticket:WorldCreationTicket256):boolean {const d=this.worldDraft,t=d?.ticket;return !this.stopped&&!this.fault&&!d?.starting&&!!t&&validDraftTicket256(ticket)&&t.ticket===ticket.ticket&&t.generation===ticket.generation&&t.key===ticket.key&&t.tile===ticket.tile&&t.size===ticket.size&&t.season===ticket.season&&sameDraftPlayer256(t.player,ticket.player);}
  async startWorldDraft256(ticket:WorldCreationTicket256,startingParty:StartingOriginalRequest256,context:{signal:AbortSignal;onProgress:(progress:WorldCreationProgress256)=>void}):Promise<void> {
    if(context.signal.aborted)throw new DOMException('Préparation annulée.','AbortError');
    if(this.hasCampPreparation||!this.hasConfirmedWorldDraft256(ticket))throw Error('La préparation est perdue. Générez le monde à nouveau.');
    if(!validStartingOriginalRequest256(startingParty))throw Error('Les huit personnages confirmés sont requis.');
    const before=this.worldDraft!,start:PendingWorldStart256={generation:ticket.generation,onProgress:context.onProgress};before.starting=true;
    // Start keeps preview authorization until the worker decision, even when
    // cancel arrives too late. An AbortSignal does not roll back a checkpoint.
    this.draftAbortCleanup?.();this.draftAbortCleanup=undefined;
    const cancel=()=>{if(start.cancelRequested)return;start.cancelRequested=true;if(start.operationId!==undefined)void this.request({type:'world-draft-cancel',generation:start.generation,operationId:start.operationId}).catch(error=>this.onError(error instanceof Error?error.message:String(error)));};
    try{
      this.snapshots.authorizeDraftPreview(before.geography);
      const pending=this.request({type:'world-draft-start',ticket:{...ticket,player:{...ticket.player}},startingParty,maxSettlements:this.settlementMaximum,threatPauseMode:this.threatPauseMode},undefined,start);
      context.signal.addEventListener('abort',cancel,{once:true});if(context.signal.aborted)cancel();
      await pending;
    }finally{context.signal.removeEventListener('abort',cancel);if(this.worldDraft===before)this.clearWorldDraft256();}
  }

  init(seed: number, size = DEFAULT_MAP_SIZE,scenario:import('../sim/scenario-definitions').ScenarioId='survivors',paused=false,site?:import('../sim/site').SiteOptions,startingParty?:import('../sim/starting-candidates').StartingParty,startingWorld?:import('../sim/starting-world').StartingWorld,surface?:'snow-phased-v1') { if(this.hasCampPreparation||this.hasWorldCreationPreparation)return Promise.reject(new SimulationRequestError('Une préparation attend encore sa décision.','refused'));this.clearWorldDraft256();return this.request({ type: 'init', maxSettlements:this.settlementMaximum,threatPauseMode: this.threatPauseMode, seed, size,scenario,paused,...site?{site}:{},...startingParty?{startingParty}:{},...startingWorld?{startingWorld}:{},...surface?{surface}:{} }); }
  cancelCampEntry256(operationId:number,groupId:number){return this.request({type:'camp-entry-cancel',operationId,groupId});}
  command(command: Command) { return this.request({ type: 'command', command }); }
  async orderOptions(pawnId:number,x:number,z:number,queue=false):Promise<import('../sim/player-orders').OrderOption[]> {
    return JSON.parse((await this.request({type:'order-options',pawnId,x,z,queue}))!);
  }
  async billWorkerOptions(structureId:number,billId:number):Promise<BillWorkerOptions283> {
    if(!positiveId283(structureId)||!positiveId283(billId))throw new SimulationRequestError('Poste ou facture invalide.','refused');
    const raw=await this.request({type:'bill-worker-options',structureId,billId});
    let options:unknown;try{options=JSON.parse(raw??'null');}catch{throw new SimulationRequestError('La liste des personnes pour cette facture est illisible.','refused');}
    if(!validBillWorkerOptions283(options,structureId,billId))throw new SimulationRequestError('La liste des personnes pour cette facture est illisible ou périmée.','refused');
    return options;
  }
  getThreatPauseToken(): ThreatPauseToken { return this.urgentThreats.token(); }
  setSpeed(speed: number, options?: ThreatSpeedOptions) {
    // Copy at invocation: a caller cannot mutate a queued gesture's authority.
    return this.request({ type: 'speed', speed, ...options ? { options: { explicit: options.explicit, token: { ...options.token } } } : {} });
  }
  async setThreatPauseMode(mode: ThreatPauseMode): Promise<string | undefined> {
    if (!validThreatPauseMode(mode)) throw new Error('Mode de pause invalide.');
    const result = await this.request({ type: 'threat-pause-mode', mode });
    this.threatPauseMode = mode;
    return result;
  }
  async setMaxSettlements(value:SettlementLimit):Promise<void> {if(!validSettlementLimit(value))throw Error('Plafond de colonies invalide.');await this.request({type:'settlement-limit',maxSettlements:value});this.settlementMaximum=value;}
  save() { return this.request({ type: 'save' }); }
  load(data: string) { if(this.hasCampPreparation||this.hasWorldCreationPreparation)return Promise.reject(new SimulationRequestError('Une préparation attend encore sa décision.','refused'));this.clearWorldDraft256();return this.request({ type: 'load', data,maxSettlements:this.settlementMaximum,threatPauseMode: this.threatPauseMode }); }

  private rejectPending(reason: Error) {
    const camp=this.hasCampPreparation;
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      this.onRequestStatus({ id, type: pending.type, state: 'settled' });
      pending.reject(reason);
    }
    this.pending.clear();
    if(camp){try{this.onCampProgress(undefined);}catch(error){this.onError(String(error));}}
  }

  dispose() {
    this.workerStopped(this.worker);this.worker.terminate();
    this.clearWorldDraft256();
    this.stopped = true;
    this.rejectPending(new SimulationRequestError('Simulation fermée.', 'unknown', true));
  }
}

const positiveId283=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>0;
const plainFields283=(v:unknown,required:readonly string[],optional:readonly string[]=[]):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));
function validBillWorkerOption283(v:unknown):v is BillWorkerOption283 {
 return plainFields283(v,['pawnId','name','level','description','enabled'])&&positiveId283(v.pawnId)&&typeof v.name==='string'&&v.name.length>0&&typeof v.description==='string'&&typeof v.enabled==='boolean'
  &&(v.level===null||Number.isSafeInteger(v.level)&&Number(v.level)>=0&&Number(v.level)<=20);
}
/** This JSON is metadata only; validation never adopts or edits a World. */
function validBillWorkerOptions283(v:unknown,structureId:number,billId:number):v is BillWorkerOptions283 {
 if(!plainFields283(v,['structureId','billId','skill','candidates'],['selected'])||v.structureId!==structureId||v.billId!==billId
  ||v.skill!==null&&(typeof v.skill!=='string'||!['cooking','crafting','artistic','intellectual'].includes(v.skill))||!Array.isArray(v.candidates))return false;
 const ids=new Set<number>();for(const option of v.candidates){if(!validBillWorkerOption283(option)||ids.has(option.pawnId))return false;ids.add(option.pawnId);}
 return !Object.hasOwn(v,'selected')||validBillWorkerOption283(v.selected);
}

function copyDraftRequest256(r:WorldCreationRequest256):WorldCreationRequest256 {return {seed:r.seed,settings:{...r.settings,factions:[...r.settings.factions]},player:{...r.player}};}
function sameDraftPlayer256(a:WorldCreationRequest256['player']|undefined,b:WorldCreationRequest256['player']|undefined):boolean {return !!a&&!!b&&typeof a.scenario==='string'&&(a.playerDef==='PlayerColony'||a.playerDef==='PlayerTribe')&&typeof a.playerName==='string'&&a.playerName.trim().length>0&&a.playerName.length<=80&&!/[\u0000-\u001f\u007f-\u009f]/.test(a.playerName)&&a.scenario===b.scenario&&a.playerDef===b.playerDef&&a.playerName===b.playerName;}
function validDraftTicket256(v:unknown):v is WorldCreationTicket256 {if(!v||typeof v!=='object'||Array.isArray(v))return false;const t=v as WorldCreationTicket256;return Object.keys(t).length===7&&['generation','key','tile','size','season','ticket','player'].every(k=>Object.hasOwn(t,k))&&Number.isSafeInteger(t.generation)&&t.generation>0&&typeof t.key==='string'&&Number.isSafeInteger(t.tile)&&t.tile>=0&&validGeographicCreationSize262(t.size)&&validGeographicCreationSeason262(t.season)&&typeof t.ticket==='string'&&t.ticket.length>0&&sameDraftPlayer256(t.player,t.player);}
