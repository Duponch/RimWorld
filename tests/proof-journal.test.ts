import { afterEach, expect, test } from 'vitest';
import { createHash } from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createProofJournal, encodeProofJson, inspectProofJournal, type Entry, type JournalOptions, type Json, type Limits } from './integration/proof-journal';

const SHA = 'a'.repeat(64), directories: string[] = [];
const limits: Limits = { maxRecordBytes: 64 * 1024, maxEntries: 100, maxJournalBytes: 512 * 1024, maxArtifactBytes: 128 * 1024 };
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
async function fresh(overrides: Partial<Limits> = {}) {
  const base = resolve('tmp'); await mkdir(base, { recursive: true });
  const dir = await mkdtemp(join(base, 'proof-journal-proposed-test-')); directories.push(dir);
  const options: JournalOptions = {
    runId: 'proposed-run', input: { path: 'private-input.json', sha256: SHA },
    ancestors: [{ path: 'separate-full-ledger.json', sha256: SHA }], limits: { ...limits, ...overrides },
  };
  return { dir, options, journal: await createProofJournal(dir, options) };
}
afterEach(async () => {
  for (const dir of directories.splice(0)) {
    // Only test-owned mkdtemp paths are recursively removed.
    expect(dir.startsWith(join(resolve('tmp'), 'proof-journal-proposed-test-'))).toBe(true);
    await rm(dir, { recursive: true, force: true });
  }
});
async function checkpoint(journal: Awaited<ReturnType<typeof createProofJournal>>, dir: string, tick = 10) {
  const path = join(dir, 'export.json'); await writeFile(path, '{"tick":10,"rng":123}');
  const exported = await journal.receiptExport(tick, { checkpointId: 'final', path });
  const reloaded = await journal.receiptReload(tick, { checkpointId: 'final', exportSeq: exported.seq, sha256: sha('{"tick":10,"rng":123}'), exact: true });
  return { path, exported, reloaded };
}
async function artifact(dir: string, name = 'ledger.json') {
  const path = join(dir, name), text = '{"resumeAllowed":false,"paid":[{"job":1,"materials":[{"id":2,"amount":5}]}]}';
  await writeFile(path, text); return { path, sha256: sha(text) };
}

test('exclusive ownership and immutable false meta do not grant implicit continuation', async () => {
  const { dir, options, journal } = await fresh();
  const meta = JSON.parse(await readFile(join(dir, 'run.meta.json'), 'utf8'));
  expect(meta).toMatchObject({ schema: 1, complete: false, resumeAllowed: false });
  await expect(createProofJournal(dir, options)).rejects.toThrow();
  await journal.close();
  const report = await inspectProofJournal(dir);
  expect(report).toMatchObject({ valid: true, complete: false, resumeAllowed: false, entries: 0 });
});

test('append copies complete nested payload synchronously before the first await', async () => {
  const { dir, journal } = await fresh();
  const payload = { job: 7, recipe: { wood: 5 }, piles: [{ id: 8, amount: 5 }], flags: [true, null] };
  const pending = journal.append(12, 'upsert', payload);
  payload.recipe.wood = 999; payload.piles[0]!.amount = 0; payload.piles.push({ id: 10, amount: 42 });
  expect(await pending).toMatchObject({ written: true, durable: false, seq: 1 });
  await journal.close();
  const records: Entry[] = [];
  const report = await inspectProofJournal(dir, { onRecord: record => { records.push(record); } });
  expect(report.valid).toBe(true);
  expect(records[0]!.payload).toEqual({ job: 7, recipe: { wood: 5 }, piles: [{ id: 8, amount: 5 }], flags: [true, null] });
});

test('completed write and explicit file sync are different acknowledgements', async () => {
  const { dir, journal } = await fresh();
  const first = await journal.append(2, 'snapshot', { paid: [], finished: [] });
  expect(first.durable).toBe(false);
  expect(await journal.sync()).toEqual({ seq: first.seq, hash: first.hash, durable: true });
  await journal.close();
  expect((await inspectProofJournal(dir)).complete).toBe(false);
});

test('sequence and full-payload hash chain are streamed in order with awaited callbacks', async () => {
  const { dir, journal } = await fresh();
  const metaHash = journal.metaSha256;
  const one = await journal.append(3, 'snapshot', { paid: [] });
  const two = await journal.append(4, 'upsert', { key: 'paid', previousHash: SHA, present: true, value: [{ job: 7, material: { id: 8, amount: 5 } }] });
  await journal.close();
  const records: Entry[] = [], order: number[] = [];
  const report = await inspectProofJournal(dir, { expectedMetaSha256: metaHash, onRecord: async entry => {
    await Promise.resolve(); order.push(entry.seq); records.push(entry);
  } });
  expect(report).toMatchObject({ valid: true, complete: false, entries: 2, headHash: two.hash, resumeAllowed: false });
  expect(order).toEqual([1, 2]); expect(records[0]!.prevHash).toBe(metaHash); expect(records[1]!.prevHash).toBe(one.hash);
});

test('tampering with a nested material quantity fails the chain rather than replaying it', async () => {
  const { dir, journal } = await fresh();
  await journal.append(1, 'upsert', { material: { id: 2, amount: 5 } }); await journal.close();
  const path = join(dir, 'journal.ndjson'), entry = JSON.parse(await readFile(path, 'utf8'));
  entry.payload.material.amount = 6; await writeFile(path, Buffer.concat([encodeProofJson(entry, limits.maxRecordBytes), Buffer.from('\n')]));
  let callbacks = 0;
  const report = await inspectProofJournal(dir, { onRecord: () => { callbacks++; } });
  expect(report).toMatchObject({ valid: false, complete: false, resumeAllowed: false, entries: 0 });
  expect(report.problem).toContain('hash mismatch'); expect(callbacks).toBe(0);
});

test('an incomplete tail keeps the complete prefix forensic and never grants resume permission', async () => {
  const { dir, journal } = await fresh();
  await journal.append(1, 'upsert', { key: 'paid', value: [1] }); await journal.close();
  await appendFile(join(dir, 'journal.ndjson'), '{"seq":2,"payload":{"paid":');
  const callbacks: number[] = [];
  const report = await inspectProofJournal(dir, { onRecord: entry => { callbacks.push(entry.seq); } });
  expect(callbacks).toEqual([1]);
  expect(report).toMatchObject({ valid: false, complete: false, resumeAllowed: false, entries: 1 });
  expect(report.problem).toContain('incomplete trailing');
});

test('close before seal retains complete records with false default', async () => {
  const { dir, journal } = await fresh();
  await journal.append(1, 'snapshot', { value: 5 }); await journal.sync(); await journal.close();
  expect(await inspectProofJournal(dir)).toMatchObject({ valid: true, complete: false, resumeAllowed: false, entries: 1 });
  await expect(readFile(join(dir, 'run.seal.json'))).rejects.toMatchObject({ code: 'ENOENT' });
});

test('reload receipt without the same earlier exported checkpoint is rejected and cannot seal', async () => {
  const { dir, journal } = await fresh();
  await expect(journal.receiptReload(10, { checkpointId: 'missing', exportSeq: 7, sha256: SHA, exact: true })).rejects.toThrow('matching exact export');
  await journal.close();
  expect(await inspectProofJournal(dir)).toMatchObject({ complete: false, resumeAllowed: false, entries: 0 });
});

test('export and exact reload receipts sync immediately; a valid seal is still not authorization', async () => {
  const { dir, journal } = await fresh();
  const { exported, reloaded } = await checkpoint(journal, dir);
  expect(exported.durable).toBe(true); expect(reloaded.durable).toBe(true);
  const ledger = await artifact(dir), summary = await artifact(dir, 'summary.json');
  const seal = await journal.seal(10, { finalReloadSeq: reloaded.seq, validation: { passed: true, checks: { replayMatchesLedger: true, attachmentsDone: true } }, artifacts: [ledger, summary] });
  await journal.close();
  expect(seal).toMatchObject({ complete: true, resumeAllowed: false, finalCheckpoint: { exportSeq: exported.seq, reloadSeq: reloaded.seq, tick: 10 } });
  expect(await inspectProofJournal(dir)).toMatchObject({ valid: true, complete: true, resumeAllowed: false, entries: 3 });
  expect(JSON.parse(await readFile(join(dir, 'run.meta.json'), 'utf8')).complete).toBe(false);
});

test('a forged true marker without matching journal validation cannot act as a seal', async () => {
  const { dir, journal } = await fresh();
  await journal.append(1, 'snapshot', { paid: [] }); await journal.close();
  await writeFile(join(dir, 'run.seal.json'), '{"schema":1,"complete":true,"resumeAllowed":true}');
  const report = await inspectProofJournal(dir);
  expect(report).toMatchObject({ valid: false, complete: false, resumeAllowed: false });
  expect(report.problem).toContain('seal without final validation');
});

test('a missing final exact reload cannot be sealed', async () => {
  const { dir, journal } = await fresh(), ledger = await artifact(dir);
  await expect(journal.seal(10, { finalReloadSeq: 1, validation: { passed: true, checks: {} }, artifacts: [ledger] })).rejects.toThrow('final exact reload');
  await journal.close(); expect((await inspectProofJournal(dir)).complete).toBe(false);
});

test.each([
  { label: 'record', overrides: { maxRecordBytes: 1024 }, payload: { value: 'x'.repeat(1500) }, first: false },
  { label: 'entry', overrides: { maxEntries: 1 }, payload: { value: 2 }, first: true },
  { label: 'journal', overrides: { maxJournalBytes: 50 }, payload: { value: 2 }, first: false },
])('$label bound refuses without truncating or replacing already complete records', async ({ overrides, payload, first }) => {
  const { dir, journal } = await fresh(overrides);
  if (first) await journal.append(1, 'snapshot', { value: 1 });
  const before = await readFile(join(dir, 'journal.ndjson'));
  await expect(journal.append(2, 'upsert', payload)).rejects.toThrow('limit');
  await journal.close();
  expect(await readFile(join(dir, 'journal.ndjson'))).toEqual(before);
  expect((await inspectProofJournal(dir)).complete).toBe(false);
});

test('unhashed extra entry fields and a pre-authorized meta are rejected', async () => {
  const { dir, journal } = await fresh();
  await journal.append(1, 'snapshot', { paid: [] }); await journal.close();
  const log = join(dir, 'journal.ndjson'), entry = JSON.parse(await readFile(log, 'utf8'));
  entry.hiddenCredit = { paid: [99] }; await writeFile(log, Buffer.concat([encodeProofJson(entry, limits.maxRecordBytes), Buffer.from('\n')]));
  expect((await inspectProofJournal(dir)).valid).toBe(false);
  const metaPath = join(dir, 'run.meta.json'), meta = JSON.parse(await readFile(metaPath, 'utf8'));
  meta.complete = true; await writeFile(metaPath, encodeProofJson(meta, limits.maxRecordBytes));
  expect((await inspectProofJournal(dir)).problem).toContain('pre-authorized');
});

test('payloads with accessors or JSON coercions are refused without running a getter', async () => {
  const { dir, journal } = await fresh();
  let calls = 0;
  const payload = Object.defineProperty({}, 'value', { enumerable: true, get() { calls++; return 7; } });
  await expect(journal.append(1, 'upsert', payload as Json)).rejects.toThrow('accessor');
  await journal.close(); expect(calls).toBe(0);
  expect((await inspectProofJournal(dir)).complete).toBe(false);
});

test('changed exported bytes or sealed ledger bytes invalidate final evidence', async () => {
  const first = await fresh(), cp = await checkpoint(first.journal, first.dir), ledger = await artifact(first.dir);
  await writeFile(cp.path, '{"tick":10,"rng":999}');
  await expect(first.journal.seal(10, { finalReloadSeq: cp.reloaded.seq, validation: { passed: true, checks: {} }, artifacts: [ledger] })).rejects.toThrow('final export changed');
  await first.journal.close();
  expect((await inspectProofJournal(first.dir)).complete).toBe(false);
  const second = await fresh(), cp2 = await checkpoint(second.journal, second.dir), ledger2 = await artifact(second.dir);
  await second.journal.seal(10, { finalReloadSeq: cp2.reloaded.seq, validation: { passed: true, checks: {} }, artifacts: [ledger2] });
  await second.journal.close(); await appendFile(ledger2.path, '\n');
  expect(await inspectProofJournal(second.dir)).toMatchObject({ valid: false, complete: false, resumeAllowed: false });
});

test('a seal with the wrong head is rejected even if all records remain intact', async () => {
  const { dir, journal } = await fresh(), cp = await checkpoint(journal, dir), ledger = await artifact(dir);
  await journal.seal(10, { finalReloadSeq: cp.reloaded.seq, validation: { passed: true, checks: {} }, artifacts: [ledger] }); await journal.close();
  const path = join(dir, 'run.seal.json'), seal = JSON.parse(await readFile(path, 'utf8'));
  seal.journal.headHash = SHA; await writeFile(path, encodeProofJson(seal, limits.maxRecordBytes));
  expect((await inspectProofJournal(dir)).problem).toContain('seal does not match');
});

test('a failed final validation cannot publish a true seal after an exact reload', async () => {
  const { dir, journal } = await fresh(), cp = await checkpoint(journal, dir), ledger = await artifact(dir);
  const invalid = { finalReloadSeq: cp.reloaded.seq, validation: { passed: false, checks: { replayMatchesLedger: false } }, artifacts: [ledger] };
  await expect(journal.seal(10, invalid as unknown as Parameters<typeof journal.seal>[1])).rejects.toThrow('passed final validation');
  await journal.close();
  expect(await inspectProofJournal(dir)).toMatchObject({ valid: true, complete: false, resumeAllowed: false, entries: 2 });
});


test('a real worker exit after durable append preserves evidence but no qualification',async()=>{
 const base=resolve('tmp');await mkdir(base,{recursive:true});const outer=await mkdtemp(join(base,'proof-journal-proposed-test-'));directories.push(outer);const dir=join(outer,'abrupt-worker');
 const moduleUrl=pathToFileURL(resolve('tests/integration/proof-journal.ts')).href;
 const options:JournalOptions={runId:'abrupt',input:{path:'literal-world.json',sha256:SHA},ancestors:[],limits};
 const code=`import {createProofJournal} from ${JSON.stringify(moduleUrl)};const j=await createProofJournal(${JSON.stringify(dir)},${JSON.stringify(options)});await j.append(7,'payment',{recipe:{steel:100},piles:[{id:3,quantity:100}]});await j.sync();process.exit(23);`;
 await expect(promisify(execFile)(process.execPath,['--experimental-strip-types','--input-type=module','-e',code],{windowsHide:true})).rejects.toMatchObject({code:23});
 const entries:Entry[]=[];const result=await inspectProofJournal(dir,{onRecord:r=>{entries.push(r);}});expect(result).toMatchObject({valid:true,complete:false,resumeAllowed:false,entries:1});expect(entries[0]!.payload).toEqual({recipe:{steel:100},piles:[{id:3,quantity:100}]});await expect(readFile(join(dir,'run.seal.json'))).rejects.toMatchObject({code:'ENOENT'});
});
