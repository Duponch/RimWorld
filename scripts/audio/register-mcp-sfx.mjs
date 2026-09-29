#!/usr/bin/env node
// Register an already downloaded MCP candidate without storing its expiring signed URL.
import { createHash } from 'node:crypto';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectMp3 } from './inspect-mp3.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const args = process.argv.slice(2);
const values = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--id', '--filename', '--prompt', '--generation-id', '--billed-credits', '--duration-seconds', '--prompt-influence',
    '--flow-id', '--session-id', '--batch-billed-credits', '--batch-generation-ids'].includes(args[i]) || !args[i + 1]) {
    throw new Error('Usage: node scripts/audio/register-mcp-sfx.mjs --id <cue> [--filename <name.mp3> --prompt <text>] --generation-id <ID> --billed-credits <number> [--duration-seconds <number> --prompt-influence <number> --flow-id <ID> --session-id <ID> --batch-billed-credits <number> --batch-generation-ids <IDs>]');
  }
  if (values[args[i]] !== undefined) throw new Error(`Duplicate argument: ${args[i]}`);
  values[args[i]] = args[i + 1];
}
const id = values['--id'];
const generationId = values['--generation-id'];
const billedCredits = Number(values['--billed-credits']);
if (!id || !/^[A-Za-z0-9]{12,32}$/.test(generationId ?? '') || !(billedCredits > 0 && billedCredits < 1000)) {
  throw new Error('Invalid MCP generation metadata');
}
const plan = JSON.parse(await readFile(resolve(here, 'sfx-plan.json'), 'utf8'));
const item = plan.events[id];
if (!item) throw new Error(`Unknown cue ID: ${id}`);
const filename = values['--filename'] ?? item.filename;
if (!/^[a-z0-9-]+\.mp3$/.test(filename)) throw new Error('Unsafe SFX filename');
const prompt = values['--prompt'] ?? item.prompt;
if (typeof prompt !== 'string' || prompt.length < 20 || prompt.length > 450) throw new Error('Invalid SFX prompt');
const durationSeconds = values['--duration-seconds'] === undefined ? item.durationSeconds : Number(values['--duration-seconds']);
const promptInfluence = values['--prompt-influence'] === undefined ? item.promptInfluence : Number(values['--prompt-influence']);
if (!(durationSeconds >= 0.5 && durationSeconds <= 30) || !(promptInfluence >= 0 && promptInfluence <= 1)) {
  throw new Error('Invalid actual generation settings');
}
const flowId = values['--flow-id'];
const sessionId = values['--session-id'];
const batchBilledCredits = values['--batch-billed-credits'] === undefined ? undefined : Number(values['--batch-billed-credits']);
const batchGenerationIds = values['--batch-generation-ids']?.split(',');
if ([flowId, sessionId].some((value) => value !== undefined && !/^[A-Za-z0-9]{12,32}$/.test(value)) ||
    (batchBilledCredits !== undefined && !(batchBilledCredits >= billedCredits && batchBilledCredits < 1000)) ||
    (batchGenerationIds && (batchGenerationIds.length < 1 || batchGenerationIds.some((value) => !/^[A-Za-z0-9]{12,32}$/.test(value)) || !batchGenerationIds.includes(generationId)))) {
  throw new Error('Invalid MCP flow or batch metadata');
}
const path = resolve(repo, 'public/assets/audio/sfx', filename);
const bytes = await readFile(path);
const technical = inspectMp3(bytes);
if (technical.sampleRate !== 44100 || technical.bitrateKbps.length !== 1 || technical.bitrateKbps[0] !== 128) {
  throw new Error(`Unexpected MP3 encoding for ${id}`);
}
const logPath = resolve(here, 'generation-log.json');
const log = JSON.parse(await readFile(logPath, 'utf8'));
if (log.version !== 1 || !Array.isArray(log.generations)) throw new Error('Unsupported generation log');
const sha256 = createHash('sha256').update(bytes).digest('hex');
if (log.generations.some((entry) => entry.id === id && entry.filename === filename || entry.generationId === generationId)) {
  throw new Error(`${id}/${filename} or ${generationId} is already registered`);
}
const record = {
  id,
  filename,
  registeredAt: new Date().toISOString(),
  provider: 'ElevenLabs',
  providerRoute: 'MCP creative sfx node',
  generationId,
  modelId: plan.modelId,
  outputFormat: plan.outputFormat,
  prompt,
  durationSeconds,
  promptInfluence,
  loop: item.loop,
  sha256,
  billedCredits,
  decodedSampleRateHz: technical.sampleRate,
  encodedBitrateKbps: technical.bitrateKbps[0],
  ...(flowId ? { flowId } : {}),
  ...(sessionId ? { sessionId } : {}),
  ...(batchBilledCredits !== undefined ? { batchBilledCredits } : {}),
  ...(batchGenerationIds ? { batchGenerationIds } : {}),
};
const temp = `${logPath}.tmp-${process.pid}`;
await writeFile(temp, `${JSON.stringify({ ...log, generations: [...log.generations, record] }, null, 2)}\n`, { flag: 'wx' });
await rename(temp, logPath);
console.log(`Registered ${id}: ${generationId}; SHA-256 ${sha256}`);
