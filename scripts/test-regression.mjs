import { spawnSync } from 'node:child_process';
import { campaignFiles } from './test-campaign-manifest.mjs';

const run = process.env.LISIERE_TEST_RUN ?? `regression-${new Date().toISOString().replaceAll(':', '-')}-${process.pid}`;
const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run',
  ...campaignFiles.flatMap(file => ['--exclude', file]), ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, LISIERE_TEST_RUN: run },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
