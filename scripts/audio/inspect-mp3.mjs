#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rates = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
const bitrates = {
  3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  0: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};

function headerAt(bytes, offset) {
  if (offset + 4 > bytes.length) return null;
  const bits = bytes.readUInt32BE(offset);
  if (((bits >>> 21) & 0x7ff) !== 0x7ff) return null;
  const version = (bits >>> 19) & 3;
  const layer = (bits >>> 17) & 3;
  const bitrateIndex = (bits >>> 12) & 15;
  const rateIndex = (bits >>> 10) & 3;
  if (version === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) return null;
  const sampleRate = rates[version][rateIndex];
  const bitrateKbps = bitrates[version][bitrateIndex];
  const samples = version === 3 ? 1152 : 576;
  const padding = (bits >>> 9) & 1;
  const length = Math.floor((version === 3 ? 144000 : 72000) * bitrateKbps / sampleRate + padding);
  if (length < 24 || offset + length > bytes.length) return null;
  return { sampleRate, bitrateKbps, samples, length };
}

export function inspectMp3(bytes) {
  let start = 0;
  if (bytes.subarray(0, 3).toString('ascii') === 'ID3') {
    start = 10 + ((bytes[6] & 0x7f) << 21) + ((bytes[7] & 0x7f) << 14) + ((bytes[8] & 0x7f) << 7) + (bytes[9] & 0x7f);
    if (bytes[5] & 0x10) start += 10;
  }
  let first = -1;
  for (let offset = start; offset < Math.min(start + 4096, bytes.length - 4); offset++) {
    const a = headerAt(bytes, offset);
    const b = a && headerAt(bytes, offset + a.length);
    if (a && b && a.sampleRate === b.sampleRate) { first = offset; break; }
  }
  if (first < 0) throw new Error('No consecutive MPEG Layer III frames found');
  let offset = first;
  let frames = 0;
  let samples = 0;
  const foundRates = new Set();
  const foundBitrates = new Set();
  while (offset < bytes.length) {
    const frame = headerAt(bytes, offset);
    if (!frame) break;
    foundRates.add(frame.sampleRate);
    foundBitrates.add(frame.bitrateKbps);
    samples += frame.samples;
    frames++;
    offset += frame.length;
  }
  if (frames < 4 || foundRates.size !== 1) throw new Error('Invalid or inconsistent MP3 frame sequence');
  const trailingBytes = bytes.length - offset;
  if (trailingBytes > 2048) throw new Error(`Unexpected MP3 trailing data: ${trailingBytes} bytes`);
  return {
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    sampleRate: [...foundRates][0],
    bitrateKbps: [...foundBitrates],
    durationSeconds: Number((samples / [...foundRates][0]).toFixed(3)),
    frames,
    trailingBytes,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = process.argv.slice(2);
  if (!files.length) throw new Error('Usage: node scripts/audio/inspect-mp3.mjs <file.mp3> [...]');
  for (const path of files) {
    const result = inspectMp3(await readFile(path));
    console.log(`${path}: ${JSON.stringify(result)}`);
  }
}
