/** Integer reverse shortest-path fields. Every relaxation is a separate dispatch:
 * no cross-workgroup spinlocks, in-place races, floating-point costs or CPU search.
 */
export const navigationShader = /* wgsl */ `
const INF: u32 = 0x3fffffffu;
struct Params { width: u32, height: u32, requests: u32, maxLength: u32 }
struct Request { start: u32, goal: u32 }
@group(0) @binding(0) var<storage, read> costs: array<u32>;
@group(0) @binding(1) var<storage, read> requests: array<Request>;
@group(0) @binding(2) var<storage, read> previous: array<u32>;
@group(0) @binding(3) var<storage, read_write> next: array<u32>;
@group(0) @binding(4) var<storage, read_write> changed: array<atomic<u32>>;
@group(0) @binding(5) var<storage, read_write> results: array<u32>;
@group(0) @binding(6) var<uniform> p: Params;

fn neighbor(cell: u32, direction: u32) -> u32 {
  let count = p.width * p.height;
  let x = cell % p.width;
  if (direction == 0u && cell >= p.width) { return cell - p.width; }
  if (direction == 1u && x > 0u) { return cell - 1u; }
  if (direction == 2u && x + 1u < p.width) { return cell + 1u; }
  if (direction == 3u && cell + p.width < count) { return cell + p.width; }
  return INF;
}

fn bestDistance(cell: u32, batch: u32) -> u32 {
  let offset = batch * p.width * p.height;
  if (costs[cell] == 0u) { return INF; }
  var best = previous[offset + cell];
  for (var direction = 0u; direction < 4u; direction++) {
    let n = neighbor(cell, direction);
    if (n != INF) {
      if (costs[n] != 0u) { best = min(best, min(INF, previous[offset + n] + costs[n])); }
    }
  }
  return best;
}

@compute @workgroup_size(64)
fn initialize(@builtin(global_invocation_id) gid: vec3<u32>) {
  let count = p.width * p.height;
  if (gid.x >= count || gid.y >= p.requests) { return; }
  let offset = gid.y * count;
  var value = INF;
  if (gid.x == requests[gid.y].goal && costs[gid.x] != 0u) { value = 0u; }
  next[offset + gid.x] = value;
}

@compute @workgroup_size(64)
fn relax(@builtin(global_invocation_id) gid: vec3<u32>) {
  let count = p.width * p.height;
  if (gid.x >= count || gid.y >= p.requests) { return; }
  next[gid.y * count + gid.x] = bestDistance(gid.x, gid.y);
}

// A field is authoritative only at a fixed point. A budget-limited partial field
// cannot establish unreachability or optimality, even when the start was reached.
@compute @workgroup_size(64)
fn checkConvergence(@builtin(global_invocation_id) gid: vec3<u32>) {
  let count = p.width * p.height;
  if (gid.x >= count || gid.y >= p.requests) { return; }
  if (bestDistance(gid.x, gid.y) != previous[gid.y * count + gid.x]) {
    atomicOr(&changed[gid.y], 1u);
  }
}

// Extraction is sequential per route AFTER the parallel search, still on GPU.
// status: 1 found, 2 unreachable, 3 inconclusive, 4 capacity exceeded.
@compute @workgroup_size(64)
fn extract(@builtin(global_invocation_id) gid: vec3<u32>) {
  let batch = gid.x;
  if (batch >= p.requests) { return; }
  let stride = p.maxLength + 3u;
  let out = batch * stride;
  let offset = batch * p.width * p.height;
  let request = requests[batch];
  results[out] = 2u;
  results[out + 1u] = 0u;
  results[out + 2u] = INF;
  if (costs[request.start] == 0u || costs[request.goal] == 0u) { return; }
  if (request.start == request.goal) {
    results[out] = 1u; results[out + 1u] = 1u; results[out + 2u] = 0u;
    results[out + 3u] = request.start;
    return;
  }
  if (atomicLoad(&changed[batch]) != 0u) { results[out] = 3u; return; }
  if (previous[offset + request.start] == INF) { return; }
  var cell = request.start;
  for (var step = 0u; step < p.maxLength; step++) {
    results[out + 3u + step] = cell;
    if (cell == request.goal) {
      results[out] = 1u;
      results[out + 1u] = step + 1u;
      results[out + 2u] = previous[offset + request.start];
      return;
    }
    var chosen = INF;
    let distance = previous[offset + cell];
    for (var direction = 0u; direction < 4u; direction++) {
      let n = neighbor(cell, direction);
      if (n != INF) {
        if (costs[n] != 0u && previous[offset + n] + costs[n] == distance) {
          chosen = min(chosen, n);
        }
      }
    }
    if (chosen == INF) { results[out] = 3u; return; }
    cell = chosen;
  }
  results[out] = 4u;
}
`;
