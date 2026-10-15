import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { link, mkdir, open, readFile, stat, unlink, type FileHandle } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type FileRef = { path: string; sha256: string };
export type Limits = { maxRecordBytes: number; maxEntries: number; maxJournalBytes: number; maxArtifactBytes: number };
export type JournalOptions = { runId: string; input: FileRef; ancestors: FileRef[]; limits: Limits };
export type Entry = { seq: number; prevHash: string; tick: number; kind: string; payload: Json; hash: string };
export type WriteReceipt = { seq: number; hash: string; tick: number; written: true; durable: boolean };
type ExportReceipt = { checkpointId: string; path: string; sha256: string; bytes: number; tick: number; exportSeq: number };
type ReloadReceipt = ExportReceipt & { reloadSeq: number };
type Artifact = FileRef & { bytes: number };
type Meta = JournalOptions & { schema: 1; complete: false; resumeAllowed: false };
type Validation = { passed: true; checks: Json };
type SealRequest = { finalReloadSeq: number; validation: Validation; artifacts: FileRef[] };
type Validated = { finalReloadSeq: number; validation: Validation; artifacts: Artifact[] };
export type Seal = {
  schema: 1; complete: true; resumeAllowed: false; runId: string; metaSha256: string;
  journal: { entries: number; headHash: string; bytes: number; lastTick: number };
  finalCheckpoint: { checkpointId: string; exportSeq: number; reloadSeq: number; path: string; bytes: number; sha256: string; tick: number };
  validationSeq: number; artifacts: Artifact[];
};
export type Inspection = {
  valid: boolean; complete: boolean; resumeAllowed: false; entries: number; headHash: string;
  bytes: number; lastTick: number; metaSha256?: string; seal?: Seal; problem?: string;
};

const META = 'run.meta.json', LOG = 'journal.ndjson', SEAL = 'run.seal.json', PENDING = 'run.seal.pending.json';
const RESERVED = new Set(['receipt-export', 'receipt-reload', 'validated-final']);
const HASH = /^[a-f0-9]{64}$/, LABEL = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const digest = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
function insist(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message); }

/** Canonical JSON copy with explicit byte/depth/node limits, never JSON coercion. */
export function encodeProofJson(value: unknown, maxBytes: number): Buffer {
  insist(Number.isSafeInteger(maxBytes) && maxBytes > 0, 'invalid JSON byte limit');
  const pieces: string[] = [], parents = new Set<object>();
  let bytes = 0, nodes = 0;
  const put = (piece: string) => {
    bytes += Buffer.byteLength(piece);
    insist(bytes <= maxBytes, 'record byte limit exceeded');
    pieces.push(piece);
  };
  const visit = (item: unknown, depth: number): void => {
    insist(++nodes <= maxBytes && depth <= 64, 'JSON complexity limit exceeded');
    if (item === null) { put('null'); return; }
    if (typeof item === 'string') {
      insist(Buffer.byteLength(item) <= maxBytes - bytes, 'record byte limit exceeded');
      put(JSON.stringify(item)); return;
    }
    if (typeof item === 'number') { insist(Number.isFinite(item), 'nonfinite JSON number'); put(JSON.stringify(item)); return; }
    if (typeof item === 'boolean') { put(String(item)); return; }
    insist(typeof item === 'object', 'non-JSON payload value');
    insist(!parents.has(item), 'cyclic JSON payload');
    const proto = Object.getPrototypeOf(item);
    insist(Array.isArray(item) || proto === Object.prototype || proto === null, 'nonplain JSON payload');
    parents.add(item);
    if (Array.isArray(item)) {
      insist(item.length <= maxBytes && Reflect.ownKeys(item).length === item.length + 1, 'sparse or decorated JSON array');
      put('[');
      for (let index = 0; index < item.length; index++) {
        const descriptor = Object.getOwnPropertyDescriptor(item, String(index));
        insist(descriptor && 'value' in descriptor && descriptor.enumerable, 'accessor or missing JSON array item');
        if (index) put(',');
        visit(descriptor.value, depth + 1);
      }
      put(']');
    } else {
      const keys = Reflect.ownKeys(item);
      insist(keys.length <= maxBytes && keys.every(key => typeof key === 'string'), 'non-JSON object keys');
      put('{');
      let index = 0;
      for (const key of (keys as string[]).sort()) {
        const descriptor = Object.getOwnPropertyDescriptor(item, key);
        insist(descriptor && 'value' in descriptor && descriptor.enumerable, 'accessor or nonenumerable JSON property');
        if (index++) put(',');
        put(JSON.stringify(key)); put(':'); visit(descriptor.value, depth + 1);
      }
      put('}');
    }
    parents.delete(item);
  };
  visit(value, 0);
  return Buffer.from(pieces.join(''));
}

export const hashProofJson = (value: unknown, maxBytes: number): string => digest(encodeProofJson(value, maxBytes));
const copy = <T>(value: T, maxBytes: number): T => JSON.parse(encodeProofJson(value, maxBytes).toString('utf8')) as T;
const tickOk = (tick: number) => insist(Number.isSafeInteger(tick) && tick >= 0, 'invalid tick');
const fileRefOk = (ref: FileRef) => {
  insist(ref && typeof ref.path === 'string' && ref.path.length > 0 && ref.path.length <= 4096 && HASH.test(ref.sha256), 'invalid file reference');
};
function optionsOk(options: JournalOptions): void {
  insist(LABEL.test(options.runId), 'invalid run id'); fileRefOk(options.input);
  insist(Array.isArray(options.ancestors) && options.ancestors.length <= 64, 'ancestor reference limit exceeded');
  options.ancestors.forEach(fileRefOk);
  const { limits } = options;
  for (const key of ['maxRecordBytes', 'maxEntries', 'maxJournalBytes', 'maxArtifactBytes'] as const)
    insist(Number.isSafeInteger(limits[key]) && limits[key] > 0, 'invalid journal limit');
  insist(limits.maxRecordBytes >= 512 && limits.maxRecordBytes <= 64 * 1024 * 1024, 'record limit outside supported bounds');
  insist(limits.maxEntries <= 1_000_000 && limits.maxJournalBytes <= 4 * 1024 ** 3 && limits.maxArtifactBytes <= 1024 ** 3, 'journal limit outside supported bounds');
}
async function writeAll(file: FileHandle, bytes: Buffer): Promise<void> {
  let offset = 0;
  while (offset < bytes.length) {
    const written = await file.write(bytes, offset, bytes.length - offset, null);
    insist(written.bytesWritten > 0, 'zero-byte journal write');
    offset += written.bytesWritten;
  }
}
async function smallJson(path: string, maxBytes: number): Promise<{ value: unknown; bytes: Buffer }> {
  const before = await stat(path);
  insist(before.isFile() && before.size <= maxBytes, 'small proof file limit exceeded');
  const bytes = await readFile(path);
  insist(bytes.length === before.size, 'proof file changed while reading');
  return { value: JSON.parse(bytes.toString('utf8')) as unknown, bytes };
}
/** Reads bytes only; never parses a world or ancestor. Export receipts additionally fsync the source file. */
async function artifact(path: string, maxBytes: number, sync = false): Promise<Artifact> {
  const absolute = resolve(path), file = await open(absolute, sync ? 'r+' : 'r');
  try {
    const before = await file.stat();
    insist(before.isFile() && before.size <= maxBytes, 'artifact byte limit exceeded');
    const hash = createHash('sha256'), chunk = Buffer.alloc(64 * 1024);
    let bytes = 0;
    for (;;) {
      const read = await file.read(chunk, 0, chunk.length, bytes);
      if (!read.bytesRead) break;
      bytes += read.bytesRead; insist(bytes <= maxBytes, 'artifact grew past limit');
      hash.update(chunk.subarray(0, read.bytesRead));
    }
    const after = await file.stat();
    insist(bytes === before.size && after.size === before.size && after.mtimeMs === before.mtimeMs, 'artifact changed while hashing');
    if (sync) await file.sync();
    return { path: absolute, sha256: hash.digest('hex'), bytes };
  } finally { await file.close(); }
}
function finalSeal(meta: Meta, metaSha256: string, entries: number, headHash: string, bytes: number,
  lastTick: number, reload: ReloadReceipt, validationSeq: number, artifacts: Artifact[]): Seal {
  return {
    schema: 1, complete: true, resumeAllowed: false, runId: meta.runId, metaSha256,
    journal: { entries, headHash, bytes, lastTick },
    finalCheckpoint: { checkpointId: reload.checkpointId, exportSeq: reload.exportSeq, reloadSeq: reload.reloadSeq, path: reload.path, bytes: reload.bytes, sha256: reload.sha256, tick: reload.tick },
    validationSeq, artifacts,
  };
}

export class ProofJournal {
  private seq = 0;
  private head: string;
  private bytes = 0;
  private tick = 0;
  private closed = false;
  private sealed = false;
  private busy = false;
  private failure: unknown;
  private readonly exports = new Map<number, ExportReceipt>();
  private readonly checkpointIds = new Set<string>();
  private lastReload?: ReloadReceipt;
  private readonly dir: string;
  private readonly meta: Meta;
  readonly metaSha256: string;
  private readonly file: FileHandle;
  private constructor(dir: string, meta: Meta, metaSha256: string, file: FileHandle) {
    this.dir = dir; this.meta = meta; this.metaSha256 = metaSha256; this.file = file; this.head = metaSha256;
  }

  static async create(dir: string, options: JournalOptions): Promise<ProofJournal> {
    const snapshot = copy(options, 1024 * 1024); optionsOk(snapshot);
    const meta: Meta = { ...snapshot, schema: 1, complete: false, resumeAllowed: false };
    const bytes = encodeProofJson(meta, snapshot.limits.maxRecordBytes);
    await mkdir(dir, { recursive: true });
    // The immutable exclusive meta owns this run, even if later creation fails.
    const metaFile = await open(join(dir, META), 'wx');
    try { await writeAll(metaFile, bytes); await metaFile.sync(); } finally { await metaFile.close(); }
    const file = await open(join(dir, LOG), 'wx');
    try { await file.sync(); return new ProofJournal(resolve(dir), meta, digest(bytes), file); }
    catch (error) { await file.close(); throw error; }
  }
  private exclusive<T>(action: () => Promise<T>): Promise<T> {
    if (this.closed || this.sealed || this.failure || this.busy) {
      const error = new Error('journal closed, sealed, failed, or concurrent operation');
      this.failure ??= error; return Promise.reject(error);
    }
    this.busy = true;
    return action().catch(error => { this.failure = error; throw error; }).finally(() => { this.busy = false; });
  }
  private async write(tick: number, kind: string, payload: Json): Promise<WriteReceipt> {
    tickOk(tick); insist(tick >= this.tick, 'tick moved backwards'); insist(LABEL.test(kind), 'invalid record kind');
    insist(this.seq < this.meta.limits.maxEntries, 'journal entry limit exceeded');
    const body = { seq: this.seq + 1, prevHash: this.head, tick, kind, payload };
    const hash = hashProofJson(body, this.meta.limits.maxRecordBytes);
    const encoded = encodeProofJson({ ...body, hash }, this.meta.limits.maxRecordBytes);
    const line = Buffer.concat([encoded, Buffer.from('\n')]);
    insist(this.bytes + line.length <= this.meta.limits.maxJournalBytes, 'journal byte limit exceeded');
    await writeAll(this.file, line);
    this.seq++; this.head = hash; this.tick = tick; this.bytes += line.length;
    return { seq: this.seq, hash, tick, written: true, durable: false };
  }
  /** Copy happens synchronously at invocation, before any awaited file operation. */
  append(tick: number, kind: string, payload: Json): Promise<WriteReceipt> {
    let snapshot: Json;
    try { insist(!RESERVED.has(kind), 'reserved record kind'); snapshot = copy(payload, this.meta.limits.maxRecordBytes); }
    catch (error) { this.failure = error; return Promise.reject(error); }
    return this.exclusive(() => this.write(tick, kind, snapshot));
  }
  sync(): Promise<{ seq: number; hash: string; durable: true }> {
    return this.exclusive(async () => { await this.file.sync(); return { seq: this.seq, hash: this.head, durable: true }; });
  }
  receiptExport(tick: number, request: { checkpointId: string; path: string }): Promise<WriteReceipt> {
    const { checkpointId, path } = request;
    return this.exclusive(async () => {
      insist(LABEL.test(checkpointId) && !this.checkpointIds.has(checkpointId), 'invalid or reused checkpoint id');
      const exported = await artifact(path, this.meta.limits.maxArtifactBytes, true);
      const written = await this.write(tick, 'receipt-export', { checkpointId, ...exported });
      this.exports.set(written.seq, { checkpointId, ...exported, tick, exportSeq: written.seq });
      this.checkpointIds.add(checkpointId); await this.file.sync();
      return { ...written, durable: true };
    });
  }
  receiptReload(tick: number, request: { checkpointId: string; exportSeq: number; sha256: string; exact: true }): Promise<WriteReceipt> {
    const { checkpointId, exportSeq, sha256, exact } = request;
    return this.exclusive(async () => {
      const exported = this.exports.get(exportSeq);
      insist(exact === true && exported && exported.checkpointId === checkpointId && exported.sha256 === sha256 && exported.tick === tick, 'reload has no matching exact export');
      const written = await this.write(tick, 'receipt-reload', { checkpointId, exportSeq, sha256, exact: true });
      this.lastReload = { ...exported, reloadSeq: written.seq };
      await this.file.sync(); return { ...written, durable: true };
    });
  }
  seal(tick: number, request: SealRequest): Promise<Seal> {
    let snapshot: SealRequest;
    try { snapshot = copy(request, this.meta.limits.maxRecordBytes); }
    catch (error) { this.failure = error; return Promise.reject(error); }
    return this.exclusive(async () => {
      const reload = this.lastReload;
      insist(reload && reload.reloadSeq === snapshot.finalReloadSeq && reload.tick === tick, 'final exact reload required at seal tick');
      insist(snapshot.validation.passed === true && 'checks' in snapshot.validation, 'passed final validation required');
      const actualExport = await artifact(reload.path, this.meta.limits.maxArtifactBytes, true);
      insist(actualExport.sha256 === reload.sha256 && actualExport.bytes === reload.bytes, 'final export changed after exact reload');
      insist(snapshot.artifacts.length > 0 && snapshot.artifacts.length <= 16, 'final artifact count limit exceeded');
      const artifacts: Artifact[] = [];
      for (const ref of snapshot.artifacts) {
        fileRefOk(ref); const actual = await artifact(ref.path, this.meta.limits.maxArtifactBytes, true);
        insist(actual.sha256 === ref.sha256, 'final artifact hash mismatch'); artifacts.push(actual);
      }
      const validated: Validated = { finalReloadSeq: reload.reloadSeq, validation: snapshot.validation, artifacts };
      const receipt = await this.write(tick, 'validated-final', validated as unknown as Json);
      await this.file.sync();
      const seal = finalSeal(this.meta, this.metaSha256, this.seq, this.head, this.bytes, tick, reload, receipt.seq, artifacts);
      const sealBytes = encodeProofJson(seal, this.meta.limits.maxRecordBytes), temp = join(this.dir, PENDING);
      const file = await open(temp, 'wx');
      try { await writeAll(file, sealBytes); await file.sync(); } finally { await file.close(); }
      // Exclusive hard-link publication is atomic and cannot overwrite a previous seal.
      // No rename fallback: an unsupported filesystem fails closed with the pending file.
      await link(temp, join(this.dir, SEAL));
      this.sealed = true; await unlink(temp).catch(() => {});
      return copy(seal, this.meta.limits.maxRecordBytes);
    });
  }
  async close(): Promise<void> {
    insist(!this.busy, 'cannot close during an outstanding journal operation');
    if (!this.closed) { this.closed = true; await this.file.close(); }
    // Closing is deliberately not validation, fsync, resume permission, or a seal.
  }
}
export const createProofJournal = (dir: string, options: JournalOptions) => ProofJournal.create(dir, options);

/** Callback records are provisional until the whole report is valid; never execute UI actions from it. */
export async function inspectProofJournal(dir: string, options: {
  expectedMetaSha256?: string; onRecord?: (record: Entry) => void | Promise<void>;
} = {}): Promise<Inspection> {
  const report: Inspection = { valid: false, complete: false, resumeAllowed: false, entries: 0, headHash: '', bytes: 0, lastTick: 0 };
  try {
    const loaded = await smallJson(join(dir, META), 1024 * 1024), meta = loaded.value as Meta;
    optionsOk(meta);
    insist(meta.schema === 1 && meta.complete === false && meta.resumeAllowed === false, 'invalid or pre-authorized run meta');
    report.metaSha256 = digest(loaded.bytes); report.headHash = report.metaSha256;
    insist(!options.expectedMetaSha256 || options.expectedMetaSha256 === report.metaSha256, 'meta SHA mismatch');
    insist(loaded.bytes.equals(encodeProofJson(meta, meta.limits.maxRecordBytes)), 'noncanonical meta');
    const before = await stat(join(dir, LOG));
    insist(before.isFile() && before.size <= meta.limits.maxJournalBytes, 'journal byte limit exceeded');
    const exports = new Map<number, ExportReceipt>(), ids = new Set<string>();
    const state: { reload?: ReloadReceipt; validation?: { seq: number; tick: number; payload: Validated } } = {};
    const consume = async (line: Buffer): Promise<void> => {
      insist(line.length > 0 && line.length <= meta.limits.maxRecordBytes, 'invalid record byte length');
      insist(report.entries < meta.limits.maxEntries && !state.validation, 'entry limit or data after final validation');
      const entry = JSON.parse(line.toString('utf8')) as Entry;
      tickOk(entry.tick);
      insist(entry.seq === report.entries + 1 && entry.prevHash === report.headHash && entry.tick >= report.lastTick && LABEL.test(entry.kind), 'broken sequence, chain, tick, or kind');
      const { seq, prevHash, tick, kind, payload } = entry;
      insist(HASH.test(entry.hash) && entry.hash === hashProofJson({ seq, prevHash, tick, kind, payload }, meta.limits.maxRecordBytes), 'record hash mismatch');
      insist(line.equals(encodeProofJson({ seq, prevHash, tick, kind, payload, hash: entry.hash }, meta.limits.maxRecordBytes)), 'noncanonical or extra record fields');
      const data = payload as unknown as Record<string, unknown>;
      if (kind === 'receipt-export') {
        const item = data as unknown as Artifact & { checkpointId: string }; fileRefOk(item);
        insist(LABEL.test(item.checkpointId) && !ids.has(item.checkpointId) && Number.isSafeInteger(item.bytes) && item.bytes >= 0 && item.bytes <= meta.limits.maxArtifactBytes, 'invalid export receipt');
        exports.set(seq, { ...item, tick, exportSeq: seq }); ids.add(item.checkpointId);
      } else if (kind === 'receipt-reload') {
        const item = data as unknown as { checkpointId: string; exportSeq: number; sha256: string; exact: boolean };
        const exported = exports.get(item.exportSeq);
        insist(item.exact === true && exported && exported.checkpointId === item.checkpointId && exported.sha256 === item.sha256 && exported.tick === tick, 'reload without matching exact export');
        state.reload = { ...exported, reloadSeq: seq };
      } else if (kind === 'validated-final') {
        const item = data as unknown as Validated;
        insist(state.reload && state.reload.reloadSeq === item.finalReloadSeq && state.reload.tick === tick && item.validation.passed === true && 'checks' in item.validation, 'invalid final validation receipt');
        insist(Array.isArray(item.artifacts) && item.artifacts.length > 0 && item.artifacts.length <= 16, 'invalid final artifacts');
        for (const ref of item.artifacts) {
          fileRefOk(ref); insist(Number.isSafeInteger(ref.bytes) && ref.bytes >= 0 && ref.bytes <= meta.limits.maxArtifactBytes, 'invalid final artifact size');
        }
        state.validation = { seq, tick, payload: item };
      }
      report.entries = seq; report.headHash = entry.hash; report.lastTick = tick;
      await options.onRecord?.(copy(entry, meta.limits.maxRecordBytes));
    };
    let pieces: Buffer[] = [], pending = 0, readBytes = 0;
    for await (const chunk of createReadStream(join(dir, LOG), { highWaterMark: 64 * 1024 })) {
      const buffer = chunk as Buffer; readBytes += buffer.length;
      insist(readBytes <= meta.limits.maxJournalBytes, 'journal grew past limit');
      let start = 0;
      for (;;) {
        const newline = buffer.indexOf(10, start), end = newline < 0 ? buffer.length : newline;
        if (end > start) { pieces.push(buffer.subarray(start, end)); pending += end - start; }
        insist(pending <= meta.limits.maxRecordBytes, 'record byte limit exceeded');
        if (newline < 0) break;
        await consume(Buffer.concat(pieces, pending));
        report.bytes += pending + 1; pieces = []; pending = 0; start = newline + 1;
      }
    }
    insist(pending === 0, 'incomplete trailing record; verified prefix is forensic only');
    const after = await stat(join(dir, LOG));
    insist(readBytes === before.size && after.size === before.size && after.mtimeMs === before.mtimeMs, 'journal changed while inspecting');
    let sealed: unknown;
    try { sealed = (await smallJson(join(dir, SEAL), meta.limits.maxRecordBytes)).value; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (sealed !== undefined) {
      const { validation, reload } = state;
      insist(validation && reload, 'seal without final validation and exact reload');
      const expected = finalSeal(meta, report.metaSha256, report.entries, report.headHash, report.bytes, report.lastTick, reload, validation.seq, validation.payload.artifacts);
      insist(encodeProofJson(sealed, meta.limits.maxRecordBytes).equals(encodeProofJson(expected, meta.limits.maxRecordBytes)), 'seal does not match complete journal');
      const finalExport = await artifact(reload.path, meta.limits.maxArtifactBytes);
      insist(finalExport.sha256 === reload.sha256 && finalExport.bytes === reload.bytes, 'sealed checkpoint export changed');
      for (const ref of expected.artifacts) {
        const actual = await artifact(ref.path, meta.limits.maxArtifactBytes);
        insist(actual.sha256 === ref.sha256 && actual.bytes === ref.bytes, 'sealed artifact changed');
      }
      report.seal = expected; report.complete = true;
    }
    report.valid = true;
  } catch (error) {
    report.valid = false; report.complete = false;
    report.problem = error instanceof Error ? error.message : String(error);
  }
  return report;
}
