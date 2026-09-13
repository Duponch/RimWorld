import type { Command, World } from '../sim/types';
import type { Request, Response } from './protocol';
import { DEFAULT_MAP_SIZE } from '../sim/map-config';
import { SnapshotDecoder } from './snapshots';

type Payload = Request extends infer R ? R extends { id: number } ? Omit<R, 'id'> : never : never;

export class SimulationClient {
  private readonly worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' });
  private nextId = 1;
  private readonly snapshots = new SnapshotDecoder();
  private resyncing = false;
  private readonly pending = new Map<number, { resolve: (value: string | undefined) => void; reject: (reason: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  onSnapshot: (world: World, stepMs: number, speed: number, replaced: boolean) => void = () => {};
  onError: (message: string) => void = () => {};

  constructor() {
    this.worker.onmessage = ({ data }: MessageEvent<Response>) => {
      if (data.type === 'snapshot') {
        const result = this.snapshots.adopt(data);
        if (result.status === 'applied') this.onSnapshot(result.world, data.stepMs, data.speed, result.replaced);
        else if (result.status === 'resync' && !this.resyncing) {
          this.resyncing = true;
          void this.request({ type: 'resync' }).catch(error => this.onError(String(error)))
            .finally(() => { this.resyncing = false; });
        }
        return;
      }
      const pending = this.pending.get(data.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pending.delete(data.id);
      if (data.ok) pending.resolve(data.data);
      else pending.reject(new Error(data.reason));
    };
    this.worker.onerror = (event) => {
      const reason = new Error(`Simulation interrompue : ${event.message}`);
      this.rejectPending(reason);
      this.onError(reason.message);
    };
  }

  private request(payload: Payload): Promise<string | undefined> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('La simulation a mis trop de temps à répondre.'));
      }, 15_000);
      this.pending.set(id, { resolve, reject, timer });
      this.worker.postMessage({ ...payload, id } satisfies Request);
    });
  }

  init(seed: number, size = DEFAULT_MAP_SIZE) { return this.request({ type: 'init', seed, size }); }
  command(command: Command) { return this.request({ type: 'command', command }); }
  setSpeed(speed: number) { return this.request({ type: 'speed', speed }); }
  save() { return this.request({ type: 'save' }); }
  load(data: string) { return this.request({ type: 'load', data }); }

  private rejectPending(reason: Error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(reason);
    }
    this.pending.clear();
  }

  dispose() {
    this.worker.terminate();
    this.rejectPending(new Error('Simulation fermée.'));
  }
}
