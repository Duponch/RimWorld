import { expect, test } from 'vitest';
import { SnapshotDecoder, SnapshotEncoder, type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { applyCommand, createWorld, deserializeWorld, serializeWorld, stepWorld } from '../src/sim/index.ts';
import type { World } from '../src/sim/types.ts';

test('snapshots preserve exact state and previous frames through harvest, patches, replacement and recovery', () => {
  const encoder = new SnapshotEncoder(); const decoder = new SnapshotDecoder();
  let source = createWorld(42, 32, 32);
  const transfer = (checkpoint = false): SnapshotMessage => structuredClone(encoder.encode(source, 0.2, 1, checkpoint));
  const apply = (message: SnapshotMessage, replaced = false): World => {
    const result = decoder.adopt(message);
    if (result.status !== 'applied') throw new Error(`Snapshot refused: ${JSON.stringify(result)}`);
    expect(result.replaced).toBe(replaced);
    expect(result.world).toEqual(source);
    expect(JSON.stringify(result.world)).toBe(JSON.stringify(source));
    return result.world;
  };
  const initialPacket = transfer(); const initial = apply(initialPacket, true);
  const initialValue = structuredClone(initial);
  expect(initialPacket.kind).toBe('checkpoint');
  expect(applyCommand(source, { type: 'designate', kind: 'chop', x: 14, z: 14 }).ok).toBe(true);
  let last = initial; let gathered = false;
  for (let tick = 0; tick < 250; tick += 5) {
    const previousValue = structuredClone(last);
    stepWorld(source, 5);
    const packet = transfer(); const next = apply(packet);
    expect(packet.kind).toBe('delta');
    expect(next.tiles).toBe(last.tiles);
    if (next.resources.length === last.resources.length) expect(next.resources).toBe(last.resources);
    else {
      gathered = true;
      expect(packet.kind === 'delta' && packet.resources?.removed).toHaveLength(1);
      expect(packet.kind === 'delta' && packet.resources?.order).toBeUndefined();
      expect(next.resources).not.toBe(last.resources);
    }
    expect(last).toEqual(previousValue);
    last = next;
  }
  expect(gathered).toBe(true);
  expect(initial).toEqual(initialValue);
  expect(initial.tiles).not.toBe(source.tiles);
  expect(initial.resources[0]).not.toBe(source.resources[0]);

  // Future terrain edits and resource additions/changes/reordering retain exact array order.
  const beforePatch = structuredClone(last);
  source.tiles[0] = { terrain: source.tiles[0]!.terrain === 'soil' ? 'grass' : 'soil' };
  source.resources[0]!.amount += 1;
  source.resources.unshift({ id: source.nextId++, x: 15, z: 15, kind: 'berries', amount: 7 });
  source.resources.reverse();
  const patch = transfer();
  if (patch.kind !== 'delta') throw new Error('Expected a delta.');
  expect(patch.tiles).toHaveLength(1); expect(patch.resources?.upserted).toHaveLength(2);
  expect(patch.resources?.order).toHaveLength(source.resources.length);
  const wrongSize = structuredClone(patch); wrongSize.world.width++;
  expect(decoder.adopt(wrongSize).status).toBe('resync');
  const outsideTerrain = structuredClone(patch); outsideTerrain.tiles![0]![0] = source.tiles.length;
  expect(decoder.adopt(outsideTerrain).status).toBe('resync');
  const invalid = structuredClone(patch);
  invalid.resources!.order![0] = -1;
  expect(decoder.adopt(invalid).status).toBe('resync');
  // Reusing the same revision after refusal proves rejection was atomic.
  const changed = apply(patch);
  expect(last).toEqual(beforePatch);
  expect(changed.tiles).not.toBe(last.tiles); expect(changed.tiles[1]).toBe(last.tiles[1]);
  expect(decoder.adopt(patch).status).toBe('stale');

  // A missing delta cannot quietly corrupt the baseline. A same-epoch checkpoint repairs it.
  source.tick++; const missed = transfer();
  source.tick++; const ahead = transfer();
  expect(decoder.adopt(ahead).status).toBe('resync');
  const recovery = transfer(true); const recovered = apply(recovery);
  expect(recovery.epoch).toBe(patch.epoch);
  expect(decoder.adopt(missed).status).toBe('stale');
  expect(recovered.tiles).not.toBe(changed.tiles);

  // Same-size/same-seed saves commonly reuse all IDs; a new epoch must replace their contents.
  source = deserializeWorld(serializeWorld(initialValue));
  source.tiles[0] = { terrain: 'soil' }; source.resources[0]!.amount += 3;
  const loadedPacket = transfer(); const loaded = apply(loadedPacket, true);
  expect(loadedPacket.kind).toBe('checkpoint'); expect(loadedPacket.epoch).toBe(recovery.epoch + 1);
  expect(loaded.resources[0]!.id).toBe(initial.resources[0]!.id);
  expect(loaded.resources[0]!.amount).toBe(initial.resources[0]!.amount + 3);
  expect(decoder.adopt(recovery).status).toBe('stale');
  const beforeInvalidCommand = serializeWorld(source);
  expect(applyCommand(source, { type: 'designate', kind: 'wall', x: -1, z: 0 }).ok).toBe(false);
  expect(serializeWorld(source)).toBe(beforeInvalidCommand);
  expect(apply(transfer()).resources).toBe(loaded.resources);

  // A newly connected consumer requests a checkpoint instead of interpreting a partial world.
  const fresh = new SnapshotDecoder();
  expect(fresh.adopt(transfer()).status).toBe('resync');
  const restored = fresh.adopt(transfer(true));
  expect(restored.status).toBe('applied');
  if (restored.status === 'applied') {
    expect(restored.world).toEqual(source);
    expect(restored.replaced).toBe(true);
  }
});
