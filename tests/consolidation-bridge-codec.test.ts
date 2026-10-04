import { expect, test } from 'vitest';
import { decodeStoredSave, encodeStoredSave, MAX_DECOMPRESSED_SAVE_BYTES } from '../src/ui/save-storage-codec';

test('oversized historical raw imports and exports obey the same bound as compressed saves before parsing', async () => {
  const oversized = 'x'.repeat(MAX_DECOMPRESSED_SAVE_BYTES + 1);
  await expect(decodeStoredSave(oversized)).rejects.toThrow('trop volumineuse');
  await expect(encodeStoredSave(oversized)).rejects.toThrow('trop volumineuse');
});
