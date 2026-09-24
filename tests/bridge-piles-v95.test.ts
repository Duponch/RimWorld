import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { expect, test } from 'vitest';
import { SnapshotDecoder, SnapshotEncoder, type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { createWorld, deserializeWorld, serializeWorld } from '../src/sim/index.ts';
import type { World } from '../src/sim/types.ts';

const fixture = () => deserializeWorld(gunzipSync(readFileSync(new URL('./fixtures/colony-v90.json.gz', import.meta.url))).toString());
const delta = (message: SnapshotMessage) => { expect(message.kind).toBe('delta'); if (message.kind !== 'delta') throw Error('Expected pile delta.'); return message; };

test('large real colony sends only changed piles and preserves exact saves and older frames', () => {
  const source = fixture(), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  expect(source.piles.length).toBeGreaterThan(1700);
  const send = () => {
    const message = structuredClone(encoder.encode(source, .2, 6));
    const adopted = decoder.adopt(message);
    expect(adopted.status).toBe('applied');
    if (adopted.status !== 'applied') throw Error('Snapshot refused.');
    expect(adopted.world).toEqual(source);
    expect(serializeWorld(adopted.world)).toBe(serializeWorld(source));
    return { message, world: adopted.world };
  };
  const first = send(), initialValue = structuredClone(first.world);
  expect(first.message.kind).toBe('checkpoint');
  const noChange = send();
  expect(delta(noChange.message).piles).toBeUndefined();
  expect(noChange.world.piles).toBe(first.world.piles);

  const groundApparel = source.piles.find(p => p.kind === 'apparel' && p.owner.type === 'ground')!;
  groundApparel.apparel!.forbidden = true;
  const forbidden = send();
  expect(delta(forbidden.message).piles?.upserted.map(p => p.id)).toEqual([groundApparel.id]);
  expect(forbidden.world.piles).not.toBe(noChange.world.piles);
  expect(forbidden.world.piles.find(p => p.id === groundApparel.id)).not.toBe(noChange.world.piles.find(p => p.id === groundApparel.id));
  delete groundApparel.apparel!.forbidden;
  const restored = send();
  expect(delta(restored.message).piles?.upserted.map(p => p.id)).toEqual([groundApparel.id]);
  const apparelIndex=source.piles.findIndex(p=>p.id===groundApparel.id);
  const {id,...sameValues}=source.piles[apparelIndex]!;
  source.piles[apparelIndex]={...sameValues,id} as typeof groundApparel;
  const reorderedKeys=send();
  expect(delta(reorderedKeys.message).piles?.upserted.map(p=>p.id)).toEqual([id]);
  const chunk = source.piles.find(p => p.kind === 'chunk' && !Object.hasOwn(p, 'haulRequested'))!;
  chunk.haulRequested = undefined;
  const ownUndefined = send();
  expect(delta(ownUndefined.message).piles?.upserted.map(p => p.id)).toEqual([chunk.id]);
  expect(Object.hasOwn(ownUndefined.world.piles.find(p => p.id === chunk.id)!, 'haulRequested')).toBe(true);
  delete chunk.haulRequested;
  const absentAgain = send();
  expect(delta(absentAgain.message).piles?.upserted.map(p => p.id)).toEqual([chunk.id]);
  expect(Object.hasOwn(absentAgain.world.piles.find(p => p.id === chunk.id)!, 'haulRequested')).toBe(false);
  source.piles.reverse();
  const reordered = send();
  expect(delta(reordered.message).piles?.order).toEqual(source.piles.map(p => p.id));
  expect(delta(send().message).piles).toBeUndefined();
  expect(first.world).toEqual(initialValue);
  expect(noChange.world.piles.find(p => p.id === groundApparel.id)?.apparel?.forbidden).toBeUndefined();
  expect(restored.world.piles.find(p => p.id === groundApparel.id)?.apparel?.forbidden).toBeUndefined();
});

test('pile membership and invalid packets preserve order, prior snapshots and decoder revision', () => {
  const source = createWorld(914, 32, 32), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  expect(source.piles.length).toBeGreaterThan(1);
  const transfer = () => structuredClone(encoder.encode(source, .2, 1));
  const initial = decoder.adopt(transfer());
  expect(initial.status).toBe('applied'); if (initial.status !== 'applied') throw Error('Checkpoint refused.');
  const oldValue = structuredClone(initial.world);

  const removed = source.piles.shift()!;
  const added = { ...structuredClone(source.piles[0]!), id: source.nextId++ };
  source.piles.push(added);
  source.resources[0]!.amount++;
  const packet = delta(transfer());
  expect(packet.piles?.removed).toEqual([removed.id]);
  expect(packet.piles?.upserted.map(p => p.id)).toEqual([added.id]);

  const reject = (edit: (message: typeof packet) => void) => {
    const malformed = structuredClone(packet); edit(malformed);
    expect(decoder.adopt(malformed).status).toBe('resync');
    expect(initial.world).toEqual(oldValue);
  };
  reject(m => { m.piles!.removed = [removed.id, removed.id]; });
  reject(m => { m.piles!.removed = [source.nextId + 1]; });
  reject(m => { m.piles!.upserted.push(structuredClone(m.piles!.upserted[0]!)); });
  reject(m => { m.piles!.upserted[0]!.id = 0; });
  reject(m => { const ids=source.piles.map(p=>p.id);m.piles!.order = [ids[0]!,ids[0]!,...ids.slice(2)]; });
  reject(m => { m.piles!.order = source.piles.slice(1).map(p=>p.id); });
  // Resources were decoded before piles; refusal must roll back both collections.
  expect(packet.resources).toBeDefined();
  const accepted = decoder.adopt(packet);
  expect(accepted.status).toBe('applied'); if (accepted.status !== 'applied') throw Error('Valid delta refused.');
  expect(accepted.world).toEqual(source);
  expect(JSON.stringify(accepted.world)).toBe(JSON.stringify(source));
  expect(initial.world).toEqual(oldValue);
  expect(decoder.adopt(packet).status).toBe('stale');

  source.piles.splice(0, 1);
  const next = delta(transfer());
  expect(next.piles?.removed).toHaveLength(1);
  const last = decoder.adopt(next);
  expect(last.status).toBe('applied'); if (last.status === 'applied') expect(last.world).toEqual(source);
});
