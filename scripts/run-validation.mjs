import { spawn } from 'node:child_process';
import { appendFileSync, createWriteStream, existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { constants } from 'node:os';
import path from 'node:path';
import { finished } from 'node:stream/promises';
import { StringDecoder } from 'node:string_decoder';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const usage = 'Usage: node scripts/run-validation.mjs --label NAME -- COMMAND [ARG ...]';
const examples = [
  'node scripts/run-validation.mjs --label targeted -- node node_modules/vitest/vitest.mjs run tests/consolidation-sim-tactics.test.ts --maxWorkers=1',
  'Build without npm: run these two commands successively:',
  'node scripts/run-validation.mjs --label typecheck -- node node_modules/typescript/bin/tsc --noEmit',
  'node scripts/run-validation.mjs --label build -- node node_modules/vite/bin/vite.js build',
];
const args = process.argv.slice(2);
const safeName = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

async function run() {
  if (args.length === 1 && args[0] === '--help') {
    console.log(usage);
    console.log(examples.join('\n'));
    return;
  }
  if (args[0] !== '--label' || !safeName.test(args[1] ?? '') || args[2] !== '--' || !args[3]) {
    console.error(usage);
    process.exitCode = 64;
    return;
  }
  const label = args[1];
  let command = /^node(?:\.exe)?$/i.test(args[3]) ? process.execPath : args[3];
  let commandArgs = args.slice(4);
  if (process.platform === 'win32' && /^npm(?:\.cmd)?$/i.test(command)) {
    let localNpmCli;
    try { localNpmCli = createRequire(import.meta.url).resolve('npm/bin/npm-cli.js'); } catch {}
    const siblingNpmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
    const npmCli = [process.env.npm_execpath, localNpmCli, siblingNpmCli].find(candidate =>
      candidate && /(?:^|[/\\])bin[/\\]npm-cli\.js$/i.test(candidate) && existsSync(candidate));
    if (!npmCli) {
      console.error('Windows npm requires npm_execpath or an installed npm CLI; use explicit node commands (see --help).');
      process.exitCode = 64;
      return;
    }
    command = process.execPath;
    commandArgs = [npmCli, ...commandArgs];
  }
  const startedAt = new Date().toISOString();
  const runId = `${label}-${startedAt.replaceAll(':', '-')}-${process.pid}`;
  const output = path.join(root, 'tmp', 'validation-runs', runId);
  await mkdir(output, { recursive: true });
  const logPath = path.join(output, 'output.log');
  const log = createWriteStream(logPath, { flags: 'wx' });
  let tail = '', bytes = 0, launchError, logError, interrupted, child, killTimer, childClosed = false;
  const started = process.hrtime.bigint();
  console.log(`${label}: START — ${path.relative(root, logPath)}`);

  const stopChild = signal => {
    if (!child?.pid || childClosed) return;
    if (process.platform === 'win32') {
      // Windows signals do not propagate to descendants. Kill the command tree
      // directly, without invoking cmd.exe or interpolating a command string.
      const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
        shell: false, stdio: 'ignore', windowsHide: true,
      });
      killer.once('error', () => child.kill('SIGKILL'));
      killer.once('close', code => { if (code !== 0) child.kill('SIGKILL'); });
    } else {
      try { process.kill(-child.pid, signal); }
      catch (error) { if (error.code !== 'ESRCH') child.kill(signal); }
    }
  };
  log.on('error', error => { logError = error.code ?? 'LOG_ERROR'; stopChild('SIGTERM'); });
  child = spawn(command, commandArgs, {
    cwd: root, shell: false, detached: process.platform !== 'win32', windowsHide: true,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, LISIERE_TEST_RUN: process.env.LISIERE_TEST_RUN ?? runId },
  });
  for (const stream of [child.stdout, child.stderr]) {
    const decoder = new StringDecoder('utf8');
    stream.on('data', chunk => {
      bytes += chunk.length;
      tail = (tail + decoder.write(chunk)).slice(-64 * 1024);
    });
    stream.on('end', () => { tail = (tail + decoder.end()).slice(-64 * 1024); });
    stream.pipe(log, { end: false });
  }
  const interrupt = signal => {
    if (interrupted) { stopChild('SIGKILL'); return; }
    interrupted = signal;
    stopChild(signal);
    killTimer = setTimeout(() => stopChild('SIGKILL'), 5000);
    killTimer.unref();
  };
  const onInt = () => interrupt('SIGINT');
  const onTerm = () => interrupt('SIGTERM');
  process.on('SIGINT', onInt);
  process.on('SIGTERM', onTerm);
  const result = await new Promise(resolve => {
    child.once('error', error => { launchError = error.code ?? 'SPAWN_ERROR'; });
    child.once('close', (code, signal) => { childClosed = true; resolve({ code, signal }); });
  });
  log.end();
  try { await finished(log); }
  catch (error) { logError = error.code ?? 'LOG_ERROR'; }

  const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
  const signal = interrupted ?? result.signal;
  let exitCode = signal ? 128 + (constants.signals[signal] ?? 1)
    : launchError ? launchError === 'ENOENT' ? 127 : 126 : result.code ?? 1;
  if (logError && exitCode === 0) exitCode = 1;
  let status = interrupted ? 'interrupted' : launchError || logError ? 'error' : exitCode === 0 ? 'pass' : 'fail';
  // Neither argv nor environment are persisted: arguments can contain secrets.
  const record = {
    version: 1, runId, label, startedAt, finishedAt: new Date().toISOString(),
    durationMs: Math.round(durationMs), status, exitCode, signal: signal ?? null,
    log: path.relative(root, logPath), outputBytes: bytes,
    ...(launchError ? { launchError } : {}), ...(logError ? { logError } : {}),
  };
  try {
    // One small synchronous append leaves no async gap between capturing the
    // final signal state and persisting its status. Log flushing remains async.
    appendFileSync(path.join(root, 'tmp', 'validation-runs', 'ledger.jsonl'), `${JSON.stringify(record)}\n`);
  } catch {
    console.error(`${label}: unable to append validation ledger`);
    status = 'error';
    if (exitCode === 0) exitCode = 1;
  }
  clearTimeout(killTimer);
  process.off('SIGINT', onInt);
  process.off('SIGTERM', onTerm);
  console.log(`${label}: ${status.toUpperCase()} (${exitCode}) — ${(durationMs / 1000).toFixed(3)}s — ${record.log}`);
  if (exitCode !== 0) {
    if (launchError || logError) console.error(`${label}: ${launchError ?? logError}`);
    const lines = tail.trimEnd().split(/\r\n|\r|\n/).slice(-80)
      .map(line => line.length > 1000 ? `[…] ${line.slice(-1000)}` : line);
    if (tail) process.stderr.write(`${lines.join('\n')}\n`);
  }
  process.exitCode = exitCode;
}

try { await run(); }
catch (error) {
  const code = typeof error?.code === 'string' && /^[A-Z_0-9]{1,32}$/.test(error.code) ? ` (${error.code})` : '';
  console.error(`Validation launcher could not initialize${code}; command arguments are omitted.`);
  process.exitCode = 1;
}
