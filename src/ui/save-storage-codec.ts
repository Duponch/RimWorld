export const SAVE_COMPRESSION_THRESHOLD = 1024 * 1024;
export const MAX_DECOMPRESSED_SAVE_BYTES = 32 * 1024 * 1024;

const MAX_COMPRESSED_SAVE_BYTES = 16 * 1024 * 1024;
const STORAGE_FORMAT = 'lisiere-save';
const STORAGE_VERSION = 1;
const STORAGE_CODEC = 'gzip-base64';

export interface StoredSaveMetadata {
  readonly tick: number;
  readonly width: number;
  readonly height: number;
  readonly schemaVersion?: number;
  readonly scenario?: string;
  readonly profile?: true;
}

interface StoredSaveEnvelope {
  readonly format: typeof STORAGE_FORMAT;
  readonly version: typeof STORAGE_VERSION;
  readonly codec: typeof STORAGE_CODEC;
  readonly uncompressedBytes: number;
  readonly compressedBytes: number;
  readonly metadata: StoredSaveMetadata;
  readonly payload: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const nonNegativeSafeInteger = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const positiveInteger = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0;
const onlyKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every(key => keys.includes(key));
};

function metadataFromValue(value: unknown): StoredSaveMetadata | null {
  if (!object(value) || !nonNegativeSafeInteger(value.tick) || !positiveInteger(value.width) || !positiveInteger(value.height)) return null;
  if (value.schemaVersion !== undefined && !nonNegativeSafeInteger(value.schemaVersion)) return null;
  const scenarioValue = object(value.scenario) ? value.scenario.id : undefined;
  if (scenarioValue !== undefined && (typeof scenarioValue !== 'string' || !scenarioValue.length || scenarioValue.length > 64)) return null;
  const metadata: StoredSaveMetadata = {
    tick: value.tick,
    width: value.width,
    height: value.height,
    ...(value.schemaVersion === undefined ? {} : { schemaVersion: value.schemaVersion }),
    ...(scenarioValue === undefined ? {} : { scenario: scenarioValue }),
    ...(value.gameProfile === undefined ? {} : { profile: true as const }),
  };
  return metadata;
}

function validMetadata(value: unknown): value is StoredSaveMetadata {
  if (!object(value)) return false;
  const keys = ['tick', 'width', 'height', ...(value.schemaVersion === undefined ? [] : ['schemaVersion']),
    ...(value.scenario === undefined ? [] : ['scenario']), ...(value.profile === undefined ? [] : ['profile'])];
  return onlyKeys(value, keys)
    && nonNegativeSafeInteger(value.tick) && positiveInteger(value.width) && positiveInteger(value.height)
    && (value.schemaVersion === undefined || nonNegativeSafeInteger(value.schemaVersion))
    && (value.scenario === undefined || typeof value.scenario === 'string' && value.scenario.length > 0 && value.scenario.length <= 64)
    && (value.profile === undefined || value.profile === true);
}

function parseStoredValue(stored: string): unknown {
  try { return JSON.parse(stored); }
  catch { return undefined; }
}

function parseEnvelope(stored: string): StoredSaveEnvelope | null {
  const value = parseStoredValue(stored);
  if (!object(value) || value.format !== STORAGE_FORMAT) return null;
  if (!onlyKeys(value, ['format', 'version', 'codec', 'uncompressedBytes', 'compressedBytes', 'metadata', 'payload'])
    || value.version !== STORAGE_VERSION || value.codec !== STORAGE_CODEC
    || !positiveInteger(value.uncompressedBytes) || value.uncompressedBytes > MAX_DECOMPRESSED_SAVE_BYTES
    || !positiveInteger(value.compressedBytes) || value.compressedBytes > MAX_COMPRESSED_SAVE_BYTES
    || !validMetadata(value.metadata) || typeof value.payload !== 'string' || !value.payload.length) {
    throw new Error('Enveloppe de sauvegarde compressée invalide.');
  }
  return value as unknown as StoredSaveEnvelope;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  }
  return btoa(binary);
}

function base64ToBytes(value: string, expectedBytes: number): Uint8Array {
  if (value.length !== 4 * Math.ceil(expectedBytes / 3)
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) throw new Error('Charge compressée invalide.');
  let binary: string;
  try { binary = atob(value); }
  catch { throw new Error('Charge compressée invalide.'); }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  if (bytesToBase64(bytes) !== value) throw new Error('Charge compressée non canonique.');
  return bytes;
}

function sameMetadata(left: StoredSaveMetadata, right: StoredSaveMetadata): boolean {
  return left.tick === right.tick && left.width === right.width && left.height === right.height
    && left.schemaVersion === right.schemaVersion && left.scenario === right.scenario && left.profile === right.profile;
}

function ownedBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy: Uint8Array<ArrayBuffer> = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function compress(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([ownedBuffer(bytes)]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decompress(bytes: Uint8Array, expectedBytes: number): Promise<Uint8Array> {
  const stream = new Blob([ownedBuffer(bytes)]).stream().pipeThrough(new DecompressionStream('gzip'));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > expectedBytes || total > MAX_DECOMPRESSED_SAVE_BYTES) {
        await reader.cancel();
        throw new Error('Sauvegarde décompressée trop volumineuse.');
      }
      chunks.push(value);
    }
  } catch (error) {
    try { await reader.cancel(); } catch { /* The corrupt stream may already be closed. */ }
    throw error;
  }
  if (total !== expectedBytes) throw new Error('Taille décompressée inattendue.');
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

/** Synchronous metadata path used to list saves without inflating their worlds. */
export function storedSaveMetadata(stored: string): StoredSaveMetadata | null {
  try {
    const envelope = parseEnvelope(stored);
    return envelope ? envelope.metadata : metadataFromValue(parseStoredValue(stored));
  } catch { return null; }
}

/** Small and historical strings remain byte-for-byte raw. Large worlds use gzip. */
export async function encodeStoredSave(raw: string): Promise<string> {
  const bytes = encoder.encode(raw);
  if (bytes.byteLength <= SAVE_COMPRESSION_THRESHOLD) return raw;
  const parsed = parseStoredValue(raw);
  const metadata = metadataFromValue(parsed);
  if (!metadata || metadata.schemaVersion === undefined) throw new Error('Métadonnées de la sauvegarde volumineuse invalides.');
  if (bytes.byteLength > MAX_DECOMPRESSED_SAVE_BYTES) throw new Error('Sauvegarde trop volumineuse pour le stockage local.');
  const compressed = await compress(bytes);
  if (!compressed.byteLength || compressed.byteLength > MAX_COMPRESSED_SAVE_BYTES) throw new Error('Sauvegarde compressée trop volumineuse pour le stockage local.');
  const envelope: StoredSaveEnvelope = {
    format: STORAGE_FORMAT,
    version: STORAGE_VERSION,
    codec: STORAGE_CODEC,
    uncompressedBytes: bytes.byteLength,
    compressedBytes: compressed.byteLength,
    metadata,
    payload: bytesToBase64(compressed),
  };
  return JSON.stringify(envelope);
}

/** Returns raw JSON for the simulation; legacy unwrapped values pass through. */
export async function decodeStoredSave(stored: string): Promise<string> {
  const envelope = parseEnvelope(stored);
  if (!envelope) return stored;
  const compressed = base64ToBytes(envelope.payload, envelope.compressedBytes);
  if (compressed.byteLength !== envelope.compressedBytes) throw new Error('Taille compressée inattendue.');
  const raw = decoder.decode(await decompress(compressed, envelope.uncompressedBytes));
  const metadata = metadataFromValue(parseStoredValue(raw));
  if (!metadata || !sameMetadata(metadata, envelope.metadata)) throw new Error('Métadonnées compressées incohérentes.');
  return raw;
}
