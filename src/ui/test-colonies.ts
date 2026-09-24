import { decodeStoredSave, MAX_DECOMPRESSED_SAVE_BYTES } from './save-storage-codec';

export interface TestColony {
  id: string;
  label: string;
  description: string;
  filename: string;
  pawns: number;
  colonists: number;
  width: number;
  height: number;
  tick: number;
  focus: string[];
  steps: string[];
  prepared: boolean;
  provenance: string;
  sha256: string;
}

const DIRECTORY = '/test-saves/v98/';
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length < 8000;
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 32 && value.every(text);

export function parseTestColonies(value: unknown): TestColony[] {
  if (!object(value) || value.version !== 1 || value.release !== 'v98' || !Array.isArray(value.saves) || !value.saves.length || value.saves.length > 32) throw Error('Catalogue de colonies de test invalide.');
  const ids = new Set<string>();
  for (const save of value.saves) {
    if (!object(save) || !text(save.id) || !/^[a-z0-9-]+$/.test(save.id) || ids.has(save.id)
      || !text(save.filename) || !/^[a-z0-9-]+\.json$/.test(save.filename)
      || !text(save.label) || !text(save.description) || !text(save.provenance)
      || !strings(save.focus) || !strings(save.steps) || !save.steps.length || typeof save.prepared !== 'boolean'
      || !text(save.sha256) || !/^[a-f0-9]{64}$/.test(save.sha256)
      || !['pawns','colonists','width','height','tick'].every(key => Number.isSafeInteger(save[key]) && Number(save[key]) >= 0)
      || !save.width || !save.height || !save.colonists || Number(save.colonists) > Number(save.pawns)) throw Error('Fiche de colonie de test invalide.');
    ids.add(save.id);
  }
  return value.saves as TestColony[];
}

/** Stream limits apply before allocation/JSON decoding, including chunked HTTP. */
async function readResponse(response: Response, limit: number): Promise<string> {
  if (!response.ok) throw Error(`Le fichier n’a pas pu être chargé (HTTP ${response.status}). Réessayez.`);
  if (!response.body) throw Error('Le fichier de sauvegarde est vide.');
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const {done,value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw Error('Le fichier de sauvegarde est trop volumineux.');
      chunks.push(value);
    }
  } catch (cause) { await reader.cancel().catch(() => {}); throw cause; }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.byteLength; }
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}

export async function fetchTestColonies(): Promise<TestColony[]> {
  return parseTestColonies(JSON.parse(await readResponse(await fetch(DIRECTORY+'manifest.json'),128*1024)));
}

export function testColonyUrl(save: TestColony): string {
  if (!/^[a-z0-9-]+\.json$/.test(save.filename)) throw Error('Fichier de colonie inconnu.');
  return DIRECTORY+save.filename;
}

export async function readTestColony(save: TestColony): Promise<string> {
  const stored = await readResponse(await fetch(testColonyUrl(save)),MAX_DECOMPRESSED_SAVE_BYTES);
  const raw = await decodeStoredSave(stored);
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
  const hash = [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
  if (hash !== save.sha256) throw Error('Cette colonie de test ne correspond pas au catalogue. Rechargez la page puis réessayez.');
  return raw; // The worker still validates the complete world before replacement.
}

export async function readSaveFile(file: File): Promise<string> {
  if (!file.size || file.size > MAX_DECOMPRESSED_SAVE_BYTES) throw Error('Choisissez une sauvegarde JSON non vide de 32 Mio maximum.');
  return decodeStoredSave(await file.text());
}
