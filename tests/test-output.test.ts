import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from 'vitest';
import { testOutputPath, writeTestFile, writeTestFileSync } from './test-output.ts';

test('current test evidence stays under tmp and never overwrites historical artifacts', async () => {
  const relative = 'artifacts/__test-output-probe__.txt';
  const archived = path.resolve(relative);
  expect(existsSync(archived)).toBe(false);
  const output = testOutputPath(relative);
  expect(testOutputPath(archived)).toBe(output);
  expect(testOutputPath(pathToFileURL(archived))).toBe(output);
  expect(output).toContain(path.join('tmp', 'test-runs'));
  expect(testOutputPath('artifacts-other/probe.txt')).toBe('artifacts-other/probe.txt');
  writeTestFileSync(relative, 'sync');
  expect(readFileSync(output, 'utf8')).toBe('sync');
  await writeTestFile(relative, 'async');
  expect(readFileSync(output, 'utf8')).toBe('async');
  expect(existsSync(archived)).toBe(false);
  const nested = 'tmp/test-runs/test-output-nested/probe.txt';
  writeTestFileSync(nested, 'tmp');
  expect(readFileSync(nested, 'utf8')).toBe('tmp');
});

test.each(['.', '..', '../escape', 'C:\\outside'])('invalid run name %s cannot redirect writes outside tmp', run => {
  const previous = process.env.LISIERE_TEST_RUN;
  try {
    process.env.LISIERE_TEST_RUN = run;
    expect(() => testOutputPath('artifacts/__test-output-invalid__.txt')).toThrow('Invalid LISIERE_TEST_RUN');
  } finally {
    if (previous === undefined) delete process.env.LISIERE_TEST_RUN;
    else process.env.LISIERE_TEST_RUN = previous;
  }
});
