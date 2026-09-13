import { adjacentCells, validateBatch, validateGrid, type NavigationGrid, type NavigationPath, type NavigationRequest } from './contracts';

/** Independent CPU Dijkstra oracle for diagnostics. Never called by GPU solve. */
export function solveCpuOracle(grid: NavigationGrid, request: NavigationRequest): NavigationPath {
  validateGrid(grid);
  validateBatch(grid, [request]);
  const empty = (): NavigationPath => ({ id: request.id, status: 'unreachable', cells: new Uint32Array(), totalCost: null });
  if (!grid.costs[request.start] || !grid.costs[request.goal]) return empty();
  const distances = new Float64Array(grid.costs.length).fill(Infinity);
  const parents = new Int32Array(grid.costs.length).fill(-1);
  const heap: { cell: number; distance: number }[] = [];
  const before = (a: typeof heap[number], b: typeof heap[number]) => a.distance < b.distance || (a.distance === b.distance && a.cell < b.cell);
  const push = (cell: number, distance: number) => {
    const item = { cell, distance }; let index = heap.length; heap.push(item);
    while (index > 0) {
      const parent = (index - 1) >>> 1;
      if (!before(item, heap[parent])) break;
      heap[index] = heap[parent]; index = parent;
    }
    heap[index] = item;
  };
  const pop = () => {
    const first = heap[0]; const last = heap.pop()!;
    if (heap.length) {
      let index = 0;
      while (index * 2 + 1 < heap.length) {
        let child = index * 2 + 1;
        if (child + 1 < heap.length && before(heap[child + 1], heap[child])) child++;
        if (!before(heap[child], last)) break;
        heap[index] = heap[child]; index = child;
      }
      heap[index] = last;
    }
    return first;
  };
  distances[request.start] = 0; push(request.start, 0);
  while (heap.length) {
    const item = pop();
    if (item.distance !== distances[item.cell]) continue;
    if (item.cell === request.goal) {
      const cells: number[] = [];
      for (let current = request.goal; current !== -1; current = parents[current]) cells.push(current);
      return { id: request.id, status: 'found', cells: new Uint32Array(cells.reverse()), totalCost: item.distance };
    }
    for (const next of adjacentCells(item.cell, grid.width, grid.height)) {
      if (!grid.costs[next]) continue;
      const candidate = item.distance + grid.costs[next];
      if (candidate < distances[next]) {
        distances[next] = candidate; parents[next] = item.cell; push(next, candidate);
      }
    }
  }
  return empty();
}

/** Independently checks every traversed edge and the accumulated cost. */
export function assertPathValid(grid: NavigationGrid, request: NavigationRequest, path: NavigationPath): void {
  if (path.status !== 'found') {
    if (path.cells.length !== 0 || path.totalCost !== null) throw new Error('unsuccessful route leaked partial result');
    return;
  }
  if (path.cells[0] !== request.start || path.cells.at(-1) !== request.goal) throw new Error('wrong route endpoints');
  const visited = new Set<number>(); let cost = 0;
  for (let index = 0; index < path.cells.length; index++) {
    const cell = path.cells[index];
    if (cell >= grid.costs.length || !grid.costs[cell] || visited.has(cell)) throw new Error(`blocked, invalid or repeated cell ${cell}`);
    visited.add(cell);
    if (index > 0) {
      if (!adjacentCells(path.cells[index - 1], grid.width, grid.height).includes(cell)) throw new Error('non-cardinal edge or row wrap');
      cost += grid.costs[cell];
    }
  }
  if (cost !== path.totalCost) throw new Error(`reported cost ${path.totalCost} differs from traversed cost ${cost}`);
}
