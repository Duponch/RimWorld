import type {CampaignSummary,SettlementLimit} from '../sim/world-map-state';
import {validSettlementLimit} from '../sim/world-map-options';
import { UrgentThreatDelivery, validThreatPauseMode, type ThreatPauseMode, type ThreatPauseToken, type ThreatSpeedOptions, type UrgentThreatReceipt } from './urgent-threats';
import type { Command, World } from '../sim/types';
import { SimulationRequestError, type Request, type Response, type SimulationFault, type SimulationRequestStatus } from './protocol';
import { DEFAULT_MAP_SIZE } from '../sim/map-config';
import { SnapshotDecoder } from './snapshots';
import type { AudioCue } from './audio-cues';

type Payload = Request extends infer R ? R extends { id: number } ? Omit<R, 'id'> : never : never;
interface PendingRequest {
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
  private snapshots: SnapshotDecoder;
  private adopted?: { epoch: number; revision: number };
  private stopped = false;
  private fault?: SimulationFault;
  private resyncing = false;
  private readonly pending = new Map<number, PendingRequest>();
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

  protected createDecoder(): SnapshotDecoder { return new SnapshotDecoder(); }

  protected deliverSnapshot(world: World, stepMs: number, speed: number, replaced: boolean, motion?: import('./motion-tracks').PawnTrack[]): void {
    this.onSnapshot(world, stepMs, speed, replaced, motion);
  }

  protected deliverAudioCues(cues: readonly AudioCue[], world: World, replaced: boolean): void {
    this.onAudioCues(cues, world, replaced);
  }

  protected deliverUrgentThreats(receipt: UrgentThreatReceipt): void { this.onUrgentThreats(receipt); }

  private startWorker() {
    this.worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' });
    this.stopped = false;
    this.worker.onmessage = ({ data }: MessageEvent<Response>) => {
      if (data.type === 'fault') {
        this.fault = data;
        // The worker has stopped authoritatively. Keep recovery copies, even
        // when publication failed after a replacement or a partial tick.
        this.rejectPending(new SimulationRequestError(data.reason, 'unknown', true));
        this.onFault(data);
        this.onError(data.reason);
        return;
      }
      if(data.type==='campaign-only'){
        let result;try{if(!this.urgentThreats.accepts(data.urgentThreats,data.summary.tick,data.speed,data.summary.planet?.tiles.length))result={status:'resync' as const,reason:'Métadonnées de menace illisibles.'};else result=this.snapshots.adoptCampaignOnly(data);}catch{result={status:'resync' as const,reason:'Campagne sans carte illisible.'};}
        if(result.status==='applied'){const urgent=this.urgentThreats.commit(data.urgentThreats,data.summary.tick);this.adopted={epoch:data.epoch,revision:data.revision};this.activeMap=false;this.confirmedCampaign=data.summary;for(const pending of this.pending.values())if((pending.type==='init'||pending.type==='load')&&result.replaced)pending.replacementEpoch=data.epoch;try{this.deliverCampaignOnly(data.summary,data.stepMs,data.speed,result.replaced);if(urgent)this.deliverUrgentThreats(urgent);}catch(error){this.onError(String(error));}for(const [id,pending]of this.pending)this.finishReply(id,pending);}else if(result.status==='resync'&&!this.resyncing){this.resyncing=true;void this.request({type:'resync'}).catch(error=>this.onError(String(error))).finally(()=>{this.resyncing=false;});}return;
      }
      if (data.type === 'snapshot') {
        let result;
        try {
          const tick = Object.getOwnPropertyDescriptor(data.world, 'tick');
          if (!tick || !('value' in tick) || !this.urgentThreats.accepts(data.urgentThreats, tick.value, data.speed,data.world.planet?.tiles.length)) {
            result = { status: 'resync' as const, reason: 'Métadonnées de menace illisibles.' };
          } else result = this.snapshots.adopt(data);
        }
        catch { result = { status: 'resync' as const, reason: 'Snapshot illisible.' }; }
        if (result.status === 'applied') {
          this.activeMap=true;this.confirmedCampaign=undefined;
          const urgentReceipt = this.urgentThreats.commit(data.urgentThreats!, result.world.tick);
          this.adopted = { epoch: data.epoch, revision: data.revision };
          for (const pending of this.pending.values()) if (pending.type === 'init' || pending.type === 'load') {
            if (result.replaced) pending.replacementEpoch = data.epoch;
          }
          try { this.deliverSnapshot(result.world, data.stepMs, data.speed, result.replaced, data.motion); }
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
    };
    this.worker.onerror = (event) => {
      this.stop(`Simulation interrompue : ${event.message}`);
    };
    this.worker.onmessageerror = () => this.stop('La communication avec la simulation est interrompue.');
  }

  private finishReply(id: number, pending: PendingRequest) {
    const reply = pending.reply;
    if (!reply) return;
    if (reply.ok && (pending.type === 'init' || pending.type === 'load' || pending.type === 'resync')) {
      const expected = reply.checkpoint;
      if (expected && (!this.adopted || this.adopted.epoch !== expected.epoch || this.adopted.revision < expected.revision)) return;
      // Old transports may omit correlation; still require a replacement
      // snapshot for init/load instead of trusting an isolated success reply.
      if (!expected && pending.type !== 'resync' && pending.replacementEpoch === undefined) return;
    }
    clearTimeout(pending.timer);
    this.pending.delete(id);
    this.onRequestStatus({ id, type: pending.type, state: 'settled' });
    if (reply.ok) {
      if (pending.type === 'init' || pending.type === 'load') this.fault = undefined;
      pending.resolve(reply.data);
    } else pending.reject(new SimulationRequestError(reply.reason ?? 'Opération refusée.', reply.outcome ?? 'refused', this.stopped || this.fault !== undefined));
  }

  /** Hard termination is an explicit authoritative stop, never a cancellation
   * acknowledgement or an assertion that pending commands were not applied. */
  stop(reason = 'Simulation arrêtée. Un remplacement validé est nécessaire pour reprendre.') {
    if (this.stopped) return;
    this.stopped = true;
    this.worker.terminate();
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

  private request(payload: Payload): Promise<string | undefined> {
    if (this.stopped) return Promise.reject(new SimulationRequestError('Simulation arrêtée. Rechargez une colonie validée pour reprendre.', 'unknown', true));
    if (this.fault && payload.type !== 'load' && payload.type !== 'init') return Promise.reject(new SimulationRequestError(this.fault.reason, 'unknown', true));
    if (['command', 'speed', 'load', 'init'].includes(payload.type) && [...this.pending.values()].some(p => p.waiting && ['command', 'speed', 'load', 'init'].includes(p.type))) {
      return Promise.reject(new SimulationRequestError('Une opération attend encore une décision de la simulation. Son résultat reste inconnu.', 'refused'));
    }
    if ((payload.type === 'init' || payload.type === 'load') && [...this.pending.values()].some(p => p.type === 'init' || p.type === 'load')) {
      return Promise.reject(new SimulationRequestError('Un remplacement de colonie attend encore sa décision.', 'refused'));
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const pending = this.pending.get(id);
        if (!pending) return;
        pending.waiting = true;
        const message = 'La simulation tarde à répondre. Le résultat reste inconnu ; l’opération et sa récupération sont conservées.';
        this.onRequestStatus({ id, type: payload.type, state: 'waiting', message });
        this.onError(message);
      }, 15_000);
      this.pending.set(id, { type: payload.type, resolve, reject, timer });
      try { this.worker.postMessage({ ...payload, id } satisfies Request); }
      catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(new SimulationRequestError(error instanceof Error ? error.message : String(error), 'refused'));
      }
    });
  }

  init(seed: number, size = DEFAULT_MAP_SIZE,scenario:import('../sim/scenario-definitions').ScenarioId='survivors',paused=false,site?:import('../sim/site').SiteOptions,startingParty?:import('../sim/starting-candidates').StartingParty,startingWorld?:import('../sim/starting-world').StartingWorld,surface?:'snow-phased-v1') { return this.request({ type: 'init', maxSettlements:this.settlementMaximum,threatPauseMode: this.threatPauseMode, seed, size,scenario,paused,...site?{site}:{},...startingParty?{startingParty}:{},...startingWorld?{startingWorld}:{},...surface?{surface}:{} }); }
  command(command: Command) { return this.request({ type: 'command', command }); }
  async orderOptions(pawnId:number,x:number,z:number,queue=false):Promise<import('../sim/player-orders').OrderOption[]> {
    return JSON.parse((await this.request({type:'order-options',pawnId,x,z,queue}))!);
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
  load(data: string) { return this.request({ type: 'load', data,maxSettlements:this.settlementMaximum,threatPauseMode: this.threatPauseMode }); }

  private rejectPending(reason: Error) {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      this.onRequestStatus({ id, type: pending.type, state: 'settled' });
      pending.reject(reason);
    }
    this.pending.clear();
  }

  dispose() {
    this.worker.terminate();
    this.stopped = true;
    this.rejectPending(new SimulationRequestError('Simulation fermée.', 'unknown', true));
  }
}
