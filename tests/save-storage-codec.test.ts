import { existsSync,readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';
import {
  decodeStoredSave,
  encodeStoredSave,
  MAX_DECOMPRESSED_SAVE_BYTES,
  SAVE_COMPRESSION_THRESHOLD,
  storedSaveMetadata,
} from '../src/ui/save-storage-codec';

const checkpointUrl = new URL('../tmp/interface-v93-checkpoint.json', import.meta.url);
const largeWorld = () => JSON.stringify({
  schemaVersion: 91,
  tick: 291,
  width: 250,
  height: 250,
  scenario: { id: 'crashlanded', revision: 6 },
  gameProfile: { revision: 1 },
  cells: '0123456789abcdef'.repeat(Math.ceil((SAVE_COMPRESSION_THRESHOLD + 1) / 16)),
});

describe('local save storage codec', () => {
  it('leaves historical and small values byte-for-byte raw', async () => {
    for (const raw of ['manual', 'active', JSON.stringify({ tick: 1, width: 32, height: 32 })]) {
      expect(await encodeStoredSave(raw)).toBe(raw);
      expect(await decodeStoredSave(raw)).toBe(raw);
    }
  });

  it('round-trips one large world and exposes only synchronous listing metadata', async () => {
    const raw = largeWorld();
    const stored = await encodeStoredSave(raw);
    expect(stored.length).toBeLessThan(raw.length);
    expect(JSON.parse(stored)).toMatchObject({ format: 'lisiere-save', version: 1, codec: 'gzip-base64' });
    expect(storedSaveMetadata(stored)).toEqual({ tick: 291, width: 250, height: 250, schemaVersion: 91, scenario: 'crashlanded', profile: true });
    expect(await decodeStoredSave(stored)).toBe(raw);
  });

  it('strictly rejects altered envelopes before returning simulation data', async () => {
    const valid = JSON.parse(await encodeStoredSave(largeWorld())) as Record<string, unknown>;
    await expect(decodeStoredSave(JSON.stringify({ ...valid, version: 2 }))).rejects.toThrow('invalide');
    await expect(decodeStoredSave(JSON.stringify({ ...valid, extra: true }))).rejects.toThrow('invalide');
    await expect(decodeStoredSave(JSON.stringify({ ...valid, uncompressedBytes: MAX_DECOMPRESSED_SAVE_BYTES + 1 }))).rejects.toThrow('invalide');
    await expect(decodeStoredSave(JSON.stringify({ ...valid, uncompressedBytes: Number(valid.uncompressedBytes) - 1 }))).rejects.toThrow('trop volumineuse');
    await expect(decodeStoredSave(JSON.stringify({ ...valid, payload: '!!!!' }))).rejects.toThrow('invalide');
    const metadata = valid.metadata as Record<string, unknown>;
    await expect(decodeStoredSave(JSON.stringify({ ...valid, metadata: { ...metadata, tick: 292 } }))).rejects.toThrow('incohérentes');
  });

  it.skipIf(!existsSync(checkpointUrl))('round-trips both slots from the captured 250² native checkpoint under the 5 MB quota', async () => {
    const raw = readFileSync(checkpointUrl, 'utf8');
    const world = JSON.parse(raw) as {tick:number;width:number;height:number;schemaVersion:number;scenario?:{id?:string};gameProfile?:unknown};
    const manual = await encodeStoredSave(raw);
    const recovery = await encodeStoredSave(raw);
    expect(manual.length + recovery.length).toBeLessThan(5_000_000);
    expect(await decodeStoredSave(manual)).toBe(raw);
    expect(await decodeStoredSave(recovery)).toBe(raw);
    expect(storedSaveMetadata(manual)).toEqual({
      tick: world.tick,
      width: world.width,
      height: world.height,
      schemaVersion: world.schemaVersion,
      ...(world.scenario?.id === undefined ? {} : {scenario: world.scenario.id}),
      ...(world.gameProfile === undefined ? {} : {profile: true}),
    });
  });
});
