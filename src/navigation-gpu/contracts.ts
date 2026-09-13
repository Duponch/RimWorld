/** Isolated navigation experiment. These types are not part of the save schema. */
export interface NavigationGrid {
  width: number;
  height: number;
  /** Row-major entry costs: 0 is blocked, 1..255 are positive integer costs. */
  costs: Uint32Array;
  /** Strictly increasing when terrain, doors, or traversal rules change. */
  revision: number;
}

export interface NavigationRequest { id: number; start: number; goal: number }
export interface NavigationOptions { maxIterations?: number; maxPathLength?: number }
export type NavigationStatus = 'found' | 'unreachable' | 'inconclusive' | 'capacity-exceeded';
export interface NavigationPath {
  id: number;
  status: NavigationStatus;
  /** Both endpoints are included. Empty for every unsuccessful result. */
  cells: Uint32Array;
  totalCost: number | null;
}
export interface NavigationBatch {
  revision: number;
  /** Never apply a stale result to authoritative simulation. */
  stale: boolean;
  paths: NavigationPath[];
  metrics: {
    /** Wall time for allocation, upload, encoding, execution, readback and decode; NOT GPU timing. */
    endToEndMs: number;
    iterations: number;
    allocatedBytes: number;
    readbackBytes: number;
    cells: number;
    requests: number;
  };
}

export const NAVIGATION_LIMITS = Object.freeze({
  maxCells: 512 * 512,
  maxRequests: 32,
  maxIterations: 4096,
  maxPathLength: 4096,
  maxAllocatedBytes: 128 * 1024 * 1024,
});

function integer(value: number, minimum: number, maximum: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label}: expected integer ${minimum}..${maximum}, received ${value}`);
  }
}

export function validateGrid(grid: NavigationGrid): void {
  integer(grid.width, 1, NAVIGATION_LIMITS.maxCells, 'width');
  integer(grid.height, 1, NAVIGATION_LIMITS.maxCells, 'height');
  integer(grid.width * grid.height, 1, NAVIGATION_LIMITS.maxCells, 'cell count');
  integer(grid.revision, 0, 0xffff_ffff, 'revision');
  if (!(grid.costs instanceof Uint32Array) || grid.costs.length !== grid.width * grid.height) {
    throw new RangeError('costs must be a Uint32Array with exactly width × height entries');
  }
  for (const value of grid.costs) if (value > 255) throw new RangeError('entry costs must be 0..255');
}

export function validateBatch(grid: NavigationGrid, requests: readonly NavigationRequest[], options: NavigationOptions = {}) {
  integer(requests.length, 1, NAVIGATION_LIMITS.maxRequests, 'request count');
  const count = grid.width * grid.height;
  const ids = new Set<number>();
  for (const request of requests) {
    integer(request.id, 0, 0xffff_ffff, 'request id');
    integer(request.start, 0, count - 1, 'start');
    integer(request.goal, 0, count - 1, 'goal');
    if (ids.has(request.id)) throw new RangeError('request ids must be unique');
    ids.add(request.id);
  }
  const maxIterations = options.maxIterations ?? Math.min(Math.max(1, count - 1), 512);
  const maxPathLength = options.maxPathLength ?? Math.min(count, NAVIGATION_LIMITS.maxPathLength);
  integer(maxIterations, 0, NAVIGATION_LIMITS.maxIterations, 'maxIterations');
  integer(maxPathLength, 1, NAVIGATION_LIMITS.maxPathLength, 'maxPathLength');
  const fieldBytes = count * requests.length * 4;
  const outputBytes = requests.length * (maxPathLength + 3) * 4;
  const allocatedBytes = count * 4 + requests.length * 8 + fieldBytes * 2 + requests.length * 4 + outputBytes * 2 + 16;
  if (allocatedBytes > NAVIGATION_LIMITS.maxAllocatedBytes) throw new RangeError('navigation memory budget exceeded');
  return { maxIterations, maxPathLength, fieldBytes, outputBytes, allocatedBytes };
}

/** Deterministic cardinal topology. No diagonal steps and no wrap across row edges. */
export function adjacentCells(cell: number, width: number, height: number): number[] {
  const result: number[] = [];
  const x = cell % width;
  if (cell >= width) result.push(cell - width);
  if (x > 0) result.push(cell - 1);
  if (x + 1 < width) result.push(cell + 1);
  if (cell + width < width * height) result.push(cell + width);
  return result;
}
