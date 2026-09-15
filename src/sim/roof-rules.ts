import type { Job, World } from './types.ts';

/** Constructed roofs only. Natural thin/thick roofs are distinct future data. */
export interface RoofingState { constructed: number[]; build: number[]; remove: number[]; cursor: number }
export const ROOF_WORK_TICKS = 4; // ceil(65 Core ticks / 1.7 / 10), neutral construction.
export const isRoofJob = (j: Pick<Job, 'kind'>): boolean => j.kind === 'build-roof' || j.kind === 'remove-roof';
export const isRoofArea = (action: string): action is 'build-roof'|'remove-roof'|'ignore-roof' => ['build-roof', 'remove-roof', 'ignore-roof'].includes(action);
export const roofIndex = (w: Pick<World, 'width'>, c: {x:number;z:number}): number => c.z * w.width + c.x;
export function isRoofed(world: World, index: number): boolean {
  const cells=world.roofing?.constructed;if(!cells)return false;
  let low=0,high=cells.length-1;
  while(low<=high){const mid=(low+high)>>>1,value=cells[mid]!;if(value===index)return true;if(value<index)low=mid+1;else high=mid-1;}
  return false;
}

/** One synchronous decision only; recreate after changing roofs or supports. */
export class RoofContext {
  readonly roof: Set<number>;
  readonly build: Set<number>;
  readonly remove: Set<number>;
  readonly holders: Uint8Array;
  private readonly seen: Uint32Array;
  private readonly queue = new Int32Array(225);
  private stamp = 0;
  private readonly width: number;
  private readonly height: number;
  constructor(world: World) {
    this.width = world.width; this.height = world.height;
    this.roof = new Set(world.roofing?.constructed); this.build = new Set(world.roofing?.build); this.remove = new Set(world.roofing?.remove);
    this.holders = new Uint8Array(world.tiles.length); this.seen = new Uint32Array(world.tiles.length);
    for (let i = 0; i < world.tiles.length; i++) if (world.tiles[i]!.terrain === 'rock') this.holders[i] = 1;
    for (const s of world.structures) if (s.kind === 'wall' || s.kind === 'door') this.holders[roofIndex(world, s)] = 1;
  }
  /** Core's 6.9-radius flood through roof cells, with the root assumed roofed.
   * A nearby support behind an unroofed gap is not sufficient. */
  supported(root: number, assumeRoof = false): boolean {
    const width = this.width, height = this.height, rx = root % width, rz = Math.floor(root / width);
    const stamp = ++this.stamp; let head = 0, tail = 1;
    this.queue[0] = root; this.seen[root] = stamp;
    while (head < tail) {
      const at = this.queue[head++]!, x = at % width, z = Math.floor(at / width);
      if (this.holders[at]) return true;
      for (let direction = 0; direction < 4; direction++) {
        const nx = x + (direction === 0 ? -1 : direction === 1 ? 1 : 0), nz = z + (direction === 2 ? -1 : direction === 3 ? 1 : 0);
        if (nx < 0 || nz < 0 || nx >= width || nz >= height || (nx-rx)**2 + (nz-rz)**2 > 6.9**2) continue;
        const index = nz * width + nx;
        if (this.holders[index]) return true;
        if (this.seen[index] !== stamp && (this.roof.has(index) || assumeRoof && !this.remove.has(index))) {
          this.seen[index] = stamp; this.queue[tail++] = index;
        }
      }
    }
    return false;
  }
  /** Removal only discards floating components. A connected detour may leave
   * the construction radius; that does not make voluntary removal a collapse. */
  connectedRoofs(): Set<number> {
    const connected=new Set<number>(), queue:number[]=[];
    const neighbors=(at:number):number[]=>{
      const x=at%this.width,z=Math.floor(at/this.width),out:number[]=[];
      if(x>0)out.push(at-1);if(x+1<this.width)out.push(at+1);
      if(z>0)out.push(at-this.width);if(z+1<this.height)out.push(at+this.width);
      return out;
    };
    for(const at of this.roof)if(this.holders[at]||neighbors(at).some(i=>this.holders[i])){connected.add(at);queue.push(at);}
    for(let head=0;head<queue.length;head++)for(const next of neighbors(queue[head]!)) {
      if(this.roof.has(next)&&!connected.has(next)){connected.add(next);queue.push(next);}
    }
    return connected;
  }
}

export function roofJobWanted(world: World, job: Job, context: RoofContext): boolean {
  const index = roofIndex(world, job);
  return job.kind === 'remove-roof' ? context.remove.has(index) && context.roof.has(index)
    : context.build.has(index) && !context.roof.has(index) && context.supported(index);
}
