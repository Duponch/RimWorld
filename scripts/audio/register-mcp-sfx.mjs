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
  if (!['--id', '--generation-id', '--billed-credits'].includes(args[i]) || !args[i + 1]) {
    throw new Error('Usage: node scripts/audio/register-mcp-sfx.mjs --id <cue> --generation-id <ID> --billed-credits <number>');
  }
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
const path = resolve(repo, 'public/assets/audio/sfx', item.filename);
const bytes = await readFile(path);
const technical = inspectMp3(bytes);
if (technical.sampleRate !== 44100 || technical.bitrateKbps.length !== 1 || technical.bitrateKbps[0] !== 128) {
  throw new Error(`Unexpected MP3 encoding for ${id}`);
}
const logPath = resolve(here, 'generation-log.json');
const log = JSON.parse(await readFile(logPath, 'utf8'));
if (log.version !== 1 || !Array.isArray(log.generations)) throw new Error('Unsupported generation log');
const sha256 = createHash('sha256').update(bytes).digest('hex');
if (log.generations.some((entry) => entry.id === id || entry.generationId === generationId)) {
  throw new Error(`${id} or ${generationId} is already registered`);
}
const record = {
  id,
  filename: item.filename,
  registeredAt: new Date().toISOString(),
  provider: 'ElevenLabs',
  providerRoute: 'MCP creative sfx node',
  generationId,
  modelId: plan.modelId,
  outputFormat: plan.outputFormat,
  prompt: item.prompt,
  durationSeconds: item.durationSeconds,
  promptInfluence: item.promptInfluence,
  loop: item.loop,
  sha256,
  billedCredits,
  decodedSampleRateHz: technical.sampleRate,
  encodedBitrateKbps: technical.bitrateKbps[0],
};
const temp = `${logPath}.tmp-${process.pid}`;
await writeFile(temp, `${JSON.stringify({ ...log, generations: [...log.generations, record] }, null, 2)}\n`, { flag: 'wx' });
await rename(temp, logPath);
console.log(`Registered ${id}: ${generationId}; SHA-256 ${sha256}`);
