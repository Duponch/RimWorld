import { expect, test } from '@playwright/test';
import { audibleRange, listenerPose, SPATIAL_REF_DISTANCE, SPATIAL_ROLLOFF } from '../../src/audio/spatial.ts';

const counts = { 'human.hurt.male': 3, 'human.hurt.female': 3, 'animal.hurt.red-fox': 2 };
type Event = { variants: { src: string; gain: number }[]; gain: number; maxDistance: number; loop: boolean; spatial: boolean };

test('V196: all eight real pain takes decode with audible PCM and taper through both camera Panners', async ({ page }) => {
  const response = await page.request.get('/assets/audio/manifest.json');
  expect(response.ok()).toBe(true);
  const manifest = await response.json() as { events: Record<string, Event> };
  const entries: { kind: string; src: string; gain: number; maxDistance: number }[] = [];
  for (const [kind, count] of Object.entries(counts)) {
    const event = manifest.events[kind]!;
    expect(event.variants).toHaveLength(count); expect(event.spatial).toBe(true); expect(event.loop).toBe(false);
    for (const variant of event.variants) entries.push({ kind, src: variant.src, maxDistance: event.maxDistance,
      gain: event.gain * variant.gain * .55 * .75 * .5 });
  }
  expect(new Set(entries.map(entry => entry.src)).size).toBe(8);
  // Existing animal pain families remain published alongside the new fox voice.
  for (const species of ['hare', 'deer', 'muffalo', 'gazelle', 'dromedary'])
    expect(manifest.events[`animal.hurt.${species}`]!.variants.length).toBeGreaterThan(0);
  await page.route('**/__pain-v196-harness', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html></html>' }));
  await page.goto('/__pain-v196-harness');
  const cameras = [
    { x: 20, y: 30, z: 0, targetX: 0, targetZ: 0, span: 32, mode: 'orthographic' as const },
    { x: 0, y: 4, z: 0, targetX: 0, targetZ: 0, span: 32, mode: 'perspective' as const },
  ].map(camera => ({ pose: listenerPose(camera), range: audibleRange(18, camera) }));
  const files = await page.evaluate(async ({ entries, cameras, refDistance, rolloff }) => {
    const decoder = new OfflineAudioContext(1, 1, 44100);
    const results = [];
    for (const entry of entries) {
      const response = await fetch(entry.src); if (!response.ok) throw new Error('Missing pain MP3');
      const buffer = await decoder.decodeAudioData(await response.arrayBuffer());
      async function render(camera?: typeof cameras[number], x = 0) {
        const offline = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
        const source = offline.createBufferSource(), gain = offline.createGain();
        source.buffer = buffer; gain.gain.value = entry.gain;
        if (camera) {
          offline.listener.positionX.value = camera.pose.x; offline.listener.positionY.value = camera.pose.y;
          offline.listener.positionZ.value = camera.pose.z;
          const panner = offline.createPanner(); panner.panningModel = 'equalpower'; panner.distanceModel = 'exponential';
          panner.refDistance = refDistance; panner.rolloffFactor = rolloff; panner.maxDistance = camera.range;
          panner.positionX.value = x; panner.positionZ.value = 0;
          source.connect(panner).connect(gain);
        } else source.connect(gain);
        gain.connect(offline.destination); source.start();
        const pcm = await offline.startRendering(); let peak = 0, sum = 0, finite = true;
        for (let c = 0; c < pcm.numberOfChannels; c++) for (const value of pcm.getChannelData(c)) {
          finite &&= Number.isFinite(value); peak = Math.max(peak, Math.abs(value)); sum += value * value;
        }
        return { peak, rms: Math.sqrt(sum / (pcm.length * pcm.numberOfChannels)), finite };
      }
      const nominal = await render(); const spatial = [];
      // Sequential native graphs: no simultaneous CPU or audio benchmark.
      for (const camera of cameras) spatial.push([await render(camera, 0), await render(camera, 16), await render(camera, 40)]);
      results.push({ src: entry.src, kind: entry.kind, nominal, spatial, channels: buffer.numberOfChannels,
        duration: buffer.duration, decodedBytes: buffer.length * buffer.numberOfChannels * 4 });
    }
    return results;
  }, { entries, cameras, refDistance: SPATIAL_REF_DISTANCE, rolloff: SPATIAL_ROLLOFF });
  for (const file of files) {
    expect(file.duration, file.src).toBeGreaterThan(.5); expect(file.duration, file.src).toBeLessThan(1);
    expect(file.nominal.finite, file.src).toBe(true); expect(file.nominal.rms, file.src).toBeGreaterThan(.005);
    expect(file.nominal.peak, file.src).toBeGreaterThan(.02); expect(file.nominal.peak, file.src).toBeLessThan(.15);
    for (const [near, middle, far] of file.spatial) {
      expect(near!.rms, file.src).toBeGreaterThan(middle!.rms); expect(middle!.rms, file.src).toBeGreaterThan(far!.rms);
      expect(far!.rms, file.src).toBeGreaterThan(0); expect(far!.rms, file.src).toBeLessThan(near!.rms * .3);
    }
  }
  const bytes = files.reduce((sum, file) => sum + file.decodedBytes, 0);
  expect(bytes).toBeGreaterThan(2145024 * .95); expect(bytes).toBeLessThan(2145024 * 1.05);
  console.info(JSON.stringify({ painV196: { files: files.length, decodedBytesFloat32: bytes,
    rmsRange: [Math.min(...files.map(file => file.nominal.rms)), Math.max(...files.map(file => file.nominal.rms))],
    peakRange: [Math.min(...files.map(file => file.nominal.peak)), Math.max(...files.map(file => file.nominal.peak))] } }));
});

test('V196: native player keeps male and female takes separate, varies them, deduplicates delivery and discards paused contacts', async ({ page }) => {
  const manifest = await (await page.request.get('/assets/audio/manifest.json')).json() as { events: Record<string, Event> };
  await page.route('**/__pain-v196-manifest.json', route => route.fulfill({ json: { version: 1,
    events: Object.fromEntries(Object.keys(counts).map(kind => [kind, manifest.events[kind]])) } }));
  await page.route('**/__pain-v196-player', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><button id="unlock">Activer</button>
    <script type="module">
    import { AudioDirector } from '/src/audio/AudioDirector.ts';
    const starts = [], native = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function() {
      const source = native.call(this), start = source.start.bind(source);
      source.start = (...args) => { starts.push(source.buffer); return start(...args); }; return source;
    };
    const audio = new AudioDirector('/__pain-v196-manifest.json');
    audio.updateCamera({ x: 0, y: 4, z: 0, targetX: 0, targetZ: 0, mode: 'perspective' });
    window.painHarness = { audio, starts }; document.querySelector('#unlock').onclick = () => audio.unlock();
    </script>` }));
  await page.goto('/__pain-v196-player'); await page.locator('#unlock').click();
  await page.waitForFunction(() => (window as any).painHarness.audio.loadedCount === 8);
  for (const [index, sex] of ['male', 'female'].entries()) {
    const result = await page.evaluate(({ index, sex }) => {
      const { audio, starts } = (window as any).painHarness; const tick = 1 + index * 10;
      const cue = { id: `pain-native:${sex}:first`, tick, kind: `human.hurt.${sex}`, x: 0, z: 0 };
      audio.ingestCues([cue, cue]); audio.update({ presentedTick: tick, paused: false, hidden: false });
      audio.ingestCues([cue]); audio.update({ presentedTick: tick, paused: false, hidden: false });
      const family = audio.manifest.events[`human.hurt.${sex}`].variants.map((variant: { src: string }) => audio.buffers.get(variant.src));
      return { count: starts.length, last: audio.diagnostics.lastKind, correctFamily: family.includes(starts.at(-1)) };
    }, { index, sex });
    expect(result.count).toBe(1 + index * 2); expect(result.last).toBe(`human.hurt.${sex}`);
    expect(result.correctFamily).toBe(true);
    // Let the actual source finish, so cluster suppression cannot stand in for deduplication.
    await page.waitForTimeout(950);
    const repeated = await page.evaluate(({ index, sex }) => {
      const { audio, starts } = (window as any).painHarness; const tick = 2 + index * 10;
      audio.ingestCues([{ id: `pain-native:${sex}:second`, tick, kind: `human.hurt.${sex}`, x: 0, z: 0 }]);
      audio.update({ presentedTick: tick, paused: false, hidden: false });
      return { count: starts.length, different: starts.at(-1) !== starts.at(-2) };
    }, { index, sex });
    expect(repeated.count).toBe(2 + index * 2); expect(repeated.different).toBe(true);
    await page.waitForTimeout(950);
  }
  const result = await page.evaluate(() => {
    const { audio, starts } = (window as any).painHarness;
    audio.ingestCues([{ id: 'pain-paused', tick: 25, kind: 'human.hurt.female', x: 0, z: 0 }]);
    audio.update({ presentedTick: 25, paused: true, hidden: false });
    audio.update({ presentedTick: 25, paused: false, hidden: false });
    const count = starts.length;
    audio.reset(); audio.update({ presentedTick: 25, paused: false, hidden: false });
    audio.dispose(); return { count, afterReset: starts.length };
  });
  expect(result).toEqual({ count: 4, afterReset: 4 });
});
