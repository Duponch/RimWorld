import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { campaignFiles, diagnosticFiles } from './test-campaign-manifest.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const run = process.env.LISIERE_TEST_RUN ?? `campaign-${new Date().toISOString().replaceAll(':', '-')}-${process.pid}`;
if (!/^[A-Za-z0-9._-]+$/.test(run) || run === '.' || run === '..') throw new Error('Invalid LISIERE_TEST_RUN directory name');
const output = path.join(root, 'tmp', 'test-runs', run);
mkdirSync(output, { recursive: true });
const files = process.argv.includes('--diagnostic') ? diagnosticFiles : campaignFiles;
let failures = 0;
for (const file of files) {
  const name = path.basename(file, '.test.ts');
  process.stdout.write(`${name}: START\n`);
  const env = { ...process.env, LISIERE_TEST_RUN: run };
  if (file === 'tests/environment-journey.test.ts') env.ENVIRONMENT_JOURNEY = '1';
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', file], {
    cwd: root,
    env,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  const log = path.join(output, `${name}.log`);
  writeFileSync(log, `${result.stdout ?? ''}${result.stderr ?? ''}`);
  const code = result.status ?? 1;
  if (code !== 0) failures++;
  process.stdout.write(`${name}: ${code === 0 ? 'PASS' : `FAIL (${code})`} — ${path.relative(root, log)}\n`);
  if (result.error) process.stderr.write(`${name}: ${result.error.message}\n`);
}
process.exitCode = failures ? 1 : 0;
