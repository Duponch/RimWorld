import { expect, test } from '@playwright/test';
import { observeErrors, panel, startPaused } from './helpers';
import { applyCommand, serializeWorld, validateWorld } from '../../src/sim/index';
import { miningCamp } from '../scenarios/mining';
import { expectWorld, saveKey } from './helpers';

test('V149 : l’essai sonore récupère mining.hit après un premier manifeste incomplet', async ({ page }) => {
    const errors = observeErrors(page);
    const manifestResponse = await page.request.get('/assets/audio/manifest.json');
    expect(manifestResponse.ok()).toBe(true);
    const published = await manifestResponse.json() as { version: number; events: Record<string, unknown> };
    expect(published.version).toBe(1);
    expect(published.events['mining.hit']).toBeDefined();
    expect(published.events['construction.hit']).toBeDefined();
    for (const kind of ['door.open', 'door.close', 'weather.wind'])
      expect(published.events[kind]).toBeDefined();
    for (const kind of ['crafting.work', 'tailoring.work', 'butchering.work', 'research.work'])
      expect(published.events[kind]).toBeDefined();
    for (const kind of ['ui.click', 'ui.reject', 'ui.panel', 'haul.pickup', 'haul.drop',
      'farming.sow', 'farming.harvest', 'eating.work'])
      expect(published.events[kind]).toBeDefined();
    const incompleteEvents = { ...published.events };
    delete incompleteEvents['mining.hit'];
    expect(Object.keys(incompleteEvents).length).toBeGreaterThan(0);

    let manifestRequests = 0;
    await page.route('**/assets/audio/manifest.json', async route => {
      manifestRequests++;
      const response = await route.fetch();
      if (manifestRequests === 1) {
        await route.fulfill({ response, json: { ...published, events: incompleteEvents } });
      } else {
        await route.fulfill({ response });
      }
    });
    await page.addInitScript(() => {
      (window as any).__previewStarts = 0;
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...args) {
        if (this.buffer && !this.loop && this.buffer.duration > 0.7 && this.buffer.duration < 0.8)
          (window as any).__previewStarts++;
        return start.apply(this, args);
      };
    });

    await page.goto('/?e2e');
    await page.getByRole('button', { name: 'Options' }).click();
    await expect.poll(() => page.evaluate(() => window.__lisiere.audio.availableSounds))
      .toBe(Object.keys(incompleteEvents).length);
    expect(manifestRequests).toBe(1);
    await page.locator('#front-test-sound').click();
    await expect(page.locator('.front-card.front-options [role=status]')).toContainText('Son d’essai lancé');
    expect(manifestRequests).toBe(2);
    expect(await page.evaluate(() => (window as any).__previewStarts)).toBe(1);
    await expect.poll(() => page.evaluate(() => window.__lisiere.audio.availableSounds))
      .toBe(Object.keys(published.events).length);
    expect(errors).toEqual([]);
});

test('V149 : sons locaux décodés, réglages conservés et présentation Chromium', async ({ page }) => {
    const errors = observeErrors(page);
    await page.addInitScript(() => {
      (window as any).__previewStarts = 0;
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...args) {
        if (this.buffer && !this.loop && this.buffer.duration > 0.7 && this.buffer.duration < 0.8)
          (window as any).__previewStarts++;
        return start.apply(this, args);
      };
    });
    await startPaused(page);
    await expect(page.locator('#fps-counter')).toBeVisible();
    const backend = await page.evaluate(() => window.__lisiere.backend);
    expect(['WebGL 2', 'WebGPU']).toContain(backend);
    test.info().annotations.push({ type: 'renderer-backend', description: backend });
    await expect.poll(() => page.evaluate(() => window.__lisiere.audio.availableSounds)).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => window.__lisiere.audio.loadedCount)).toBeGreaterThan(0);
    await panel(page, 'menu');
    const enabled = page.locator('#sound-enabled');
    const volume = page.locator('#sound-volume');
    await expect(enabled).toBeChecked();
    await page.locator('#test-sound').click();
    await expect(page.locator('#test-sound-status')).toContainText('Son d’essai lancé');
    expect(await page.evaluate(() => (window as any).__previewStarts)).toBe(1);
    await enabled.uncheck();
    await page.locator('#test-sound').click();
    await expect(page.locator('#test-sound-status')).toContainText('Activez les effets sonores');
    expect(await page.evaluate(() => (window as any).__previewStarts)).toBe(1);
    await volume.evaluate((input: HTMLInputElement) => {
      input.value = '42';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect.poll(() => page.evaluate(() => ({
      enabled: localStorage.getItem('lisiere.audio.effects.enabled.v1'),
      volume: localStorage.getItem('lisiere.audio.effects.volume.v1'),
    }))).toEqual({ enabled: 'false', volume: '0.42' });
    await page.goto('/');
    await page.getByRole('button', { name: 'Options' }).click();
    const frontEnabled = page.locator('.front-menu .front-texture-setting').filter({ hasText: 'Effets sonores' }).locator('input[type=checkbox]');
    await expect(frontEnabled).not.toBeChecked();
    await expect(page.locator('.front-volume-setting').filter({ hasText: 'Volume des effets' })
      .locator('input[type=range]')).toHaveValue('42');
    await page.locator('#front-test-sound').click();
    await expect(page.locator('.front-error')).toContainText('Activez les effets sonores');
    await frontEnabled.check();
    await page.locator('#front-test-sound').click();
    await expect(page.locator('.front-card.front-options [role=status]')).toContainText('Son d’essai lancé');
    expect(errors).toEqual([]);
});

test('V149 : un vrai contact de minage produit du PCM après le mix Web Audio', async ({ page }) => {
    const errors = observeErrors(page);
    const manifest = await (await page.request.get('/assets/audio/manifest.json')).json() as {
      events: Record<string, { variants: { src: string }[] }>;
    };
    const eventCount = Object.keys(manifest.events).length;
    const fileCount = new Set(Object.values(manifest.events).flatMap(event => event.variants.map(variant => variant.src))).size;
    expect(eventCount).toBeGreaterThanOrEqual(15);
    expect(manifest.events['woodcutting.hit']?.variants).toHaveLength(5);
    for (const kind of ['mining.hit', 'construction.hit', 'cooking.work', 'crafting.work',
      'tailoring.work', 'butchering.work', 'research.work'])
      expect(manifest.events[kind]?.variants.length).toBeGreaterThanOrEqual(3);
    for (const kind of ['ui.click', 'ui.reject', 'ui.panel', 'haul.pickup', 'haul.drop',
      'farming.sow', 'farming.harvest', 'eating.work'])
      expect(manifest.events[kind]?.variants.length).toBeGreaterThanOrEqual(3);
    const initial = miningCamp(1);
    const pawn = initial.pawns[0]!;
    const target = { x: pawn.x + 1, z: pawn.z };
    initial.tiles[target.z * initial.width + target.x] = { terrain: 'rock', stone: 'granite' };
    expect(applyCommand(initial, { type: 'designate', kind: 'mine', ...target }).ok).toBe(true);
    expect(validateWorld(initial)).toEqual([]);
    await page.addInitScript(({ key, saved }) => {
      localStorage.setItem(key, saved);
      const probe = (window as any).__audioProbe = {
        starts: [] as { state: string; duration: number; loop: boolean }[],
        master: null as null | { recorder: MediaRecorder; chunks: Blob[] },
      };
      const connect = GainNode.prototype.connect;
      GainNode.prototype.connect = function (this: GainNode, ...args: any[]) {
        if (args[0] === this.context.destination && !probe.master) {
          const stream = (this.context as AudioContext).createMediaStreamDestination();
          (connect as any).call(this, stream);
          const recorder = new MediaRecorder(stream.stream, { mimeType: 'audio/webm;codecs=opus' });
          const chunks: Blob[] = [];
          recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
          recorder.start();
          probe.master = { recorder, chunks };
        }
        return connect.apply(this, args as any);
      } as any;
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...args) {
        (window as any).__audioProbe.context = this.context;
        (window as any).__audioProbe.starts.push({ state: this.context.state, duration: this.buffer?.duration ?? 0, loop: this.loop });
        return start.apply(this, args);
      };
    }, { key: saveKey, saved: serializeWorld(initial) });
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();
    await panel(page, 'menu');
    await page.locator('#load').click();
    await expectWorld(page, initial);
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => window.__lisiere.audio.availableSounds)).toBe(eventCount);
    await expect.poll(() => page.evaluate(() => window.__lisiere.audio.loadedCount)).toBe(fileCount);
    await expect(page.locator('#sound-enabled')).toBeChecked();
    await expect(page.locator('#sound-volume')).toHaveValue('75');
    const beforeWorkStarts = await page.evaluate(() => (window as any).__audioProbe.starts.length as number);
    await page.locator('[data-speed="6"]').click();
    await expect.poll(() => page.evaluate((baseline) => (window as any).__audioProbe.starts
      .slice(baseline)
      .filter((source: { state: string; duration: number; loop: boolean }) => !source.loop && source.duration > 0.7 && source.duration < 0.8), beforeWorkStarts))
      .toContainEqual(expect.objectContaining({ state: 'running', loop: false }));
    await page.waitForTimeout(750); // Include the full 0.6 s impact in the PCM capture.
    const output = await page.evaluate(async () => {
      const probe = (window as any).__audioProbe;
      const capture = probe.master as { recorder: MediaRecorder; chunks: Blob[] } | null;
      if (!capture) return null;
      await new Promise<void>(resolve => {
        capture.recorder.addEventListener('stop', () => resolve(), { once: true });
        capture.recorder.stop();
      });
      const encoded = new Blob(capture.chunks, { type: 'audio/webm;codecs=opus' });
      const decoded = await probe.context.decodeAudioData(await encoded.arrayBuffer());
      let peak = 0, bestRms = 0;
      const windowSize = Math.max(1, Math.floor(decoded.sampleRate * 0.1));
      for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
        const samples = decoded.getChannelData(channel);
        for (let offset = 0; offset + windowSize <= samples.length; offset += windowSize) {
          let energy = 0;
          for (let i = offset; i < offset + windowSize; i++) {
            const value = samples[i]!;
            peak = Math.max(peak, Math.abs(value));
            energy += value * value;
          }
          bestRms = Math.max(bestRms, Math.sqrt(energy / windowSize));
        }
      }
      return { peak, bestRms, duration: decoded.duration };
    });
    expect(output).not.toBeNull();
    // V165 lowers the complete SFX bus by 25%; retain the former 0.02
    // audibility floor relative to that intentional mix adjustment.
    expect(output!.peak).toBeGreaterThan(0.02 * 0.75);
    expect(output!.bestRms).toBeGreaterThan(0.002);
    await page.evaluate(() => (window as any).__audioProbe.context.suspend());
    expect(await page.evaluate(() => (window as any).__audioProbe.context.state)).toBe('suspended');
    await page.locator('[data-speed="6"]').click();
    await expect.poll(() => page.evaluate(() => (window as any).__audioProbe.context.state)).toBe('running');
    await panel(page, 'menu');
    await page.locator('#show-diagnostics').click();
    await expect(page.locator('#metrics')).toContainText(new RegExp(`son actif, ${fileCount} MP3, [1-9]\\d* effets`));
    expect(errors).toEqual([]);
});
