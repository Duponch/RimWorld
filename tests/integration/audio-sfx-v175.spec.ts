import { expect, test } from '@playwright/test';

const newKinds = [
  'weapon.impact-ground', 'weapon.impact-barrier', 'weapon.impact-flesh',
  'firefighting.beat', 'power.switch-on', 'power.switch-off',
  'deconstruction.work', 'building.deconstructed',
] as const;

interface ManifestVariant { src: string; gain: number }
interface ManifestEvent {
  variants: ManifestVariant[];
  gain: number;
  maxDistance: number;
  loop: boolean;
  spatial: boolean;
}

test('V175 : les 32 nouvelles prises spatiales se décodent et gardent une marge PCM au mix nominal', async ({ page }) => {
  test.setTimeout(120_000);
  const response = await page.request.get('/assets/audio/manifest.json');
  expect(response.ok()).toBe(true);
  const manifest = await response.json() as { version: number; events: Record<string, ManifestEvent> };
  expect(manifest.version).toBe(1);
  const samples: { kind: string; src: string; gain: number }[] = [];
  for (const kind of newKinds) {
    const event = manifest.events[kind];
    expect(event, `Événement manquant : ${kind}`).toBeDefined();
    expect(event.variants).toHaveLength(4);
    expect(event.loop, kind).toBe(false);
    expect(event.spatial, kind).toBe(true);
    expect(event.maxDistance, kind).toBeGreaterThan(0);
    expect(event.gain, kind).toBeGreaterThan(0);
    const stem = kind.replaceAll('.', '-');
    expect(event.variants.map(variant => variant.src)).toEqual(
      [1, 2, 3, 4].map(take => `/assets/audio/sfx/${stem}-v175-take-${take}.mp3`));
    for (const variant of event.variants) {
      expect(variant.gain, variant.src).toBeGreaterThan(0);
      samples.push({ kind, src: variant.src, gain: event.gain * variant.gain * 0.55 * 0.75 * 0.5 });
    }
  }
  expect(samples).toHaveLength(32);
  expect(new Set(samples.map(sample => sample.src)).size).toBe(32);

  await page.route('**/__sfx-v175-harness', route => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>',
  }));
  await page.goto('/__sfx-v175-harness');
  // The browser decodes one real MP3 at a time, then applies exactly the
  // manifest/event/bus/slider gain through a native offline Web Audio graph.
  const measured = await page.evaluate(async entries => {
    const decoder = new OfflineAudioContext(1, 1, 44_100);
    const files: { kind: string; src: string; channels: number; frames: number;
      duration: number; decodedBytes: number; peak: number; rms: number; finite: boolean }[] = [];
    for (const entry of entries) {
      const response = await fetch(entry.src);
      if (!response.ok) throw new Error(`${entry.src}: HTTP ${response.status}`);
      let decoded: AudioBuffer;
      try { decoded = await decoder.decodeAudioData(await response.arrayBuffer()); }
      catch { throw new Error(`${entry.src}: décodage MP3 impossible`); }
      const offline = new OfflineAudioContext(decoded.numberOfChannels, decoded.length, decoded.sampleRate);
      const source = offline.createBufferSource();
      const gain = offline.createGain();
      source.buffer = decoded;
      gain.gain.value = entry.gain;
      source.connect(gain).connect(offline.destination);
      source.start();
      const rendered = await offline.startRendering();
      let peak = 0, squares = 0, finite = true;
      for (let channel = 0; channel < rendered.numberOfChannels; channel++) {
        const pcm = rendered.getChannelData(channel);
        for (const sample of pcm) {
          if (!Number.isFinite(sample)) finite = false;
          peak = Math.max(peak, Math.abs(sample));
          squares += sample * sample;
        }
      }
      const frames = rendered.length;
      files.push({ kind: entry.kind, src: entry.src, channels: rendered.numberOfChannels,
        frames, duration: rendered.duration,
        decodedBytes: decoded.length * decoded.numberOfChannels * Float32Array.BYTES_PER_ELEMENT,
        peak, rms: Math.sqrt(squares / (frames * rendered.numberOfChannels)), finite });
    }
    return files;
  }, samples);
  expect(measured).toHaveLength(32);
  for (const file of measured) {
    expect(file.channels, file.src).toBeGreaterThan(0);
    expect(file.duration, file.src).toBeGreaterThan(0.2);
    expect(file.duration, file.src).toBeLessThan(2);
    expect(file.finite, file.src).toBe(true);
    expect(file.rms, `${file.src} ne doit pas être silencieux au mix nominal`).toBeGreaterThan(0.001);
    expect(file.peak, `${file.src} ne doit pas être silencieux au mix nominal`).toBeGreaterThan(0.01);
    expect(file.peak, `${file.src} ne doit pas saturer au mix nominal`).toBeLessThan(0.9);
  }
  const decodedBytes = measured.reduce((sum, file) => sum + file.decodedBytes, 0);
  // Browser MP3 decoders may trim encoder padding differently from SoundFile.
  expect(decodedBytes).toBeGreaterThan(7_056_000 * 0.95);
  expect(decodedBytes).toBeLessThan(7_056_000 * 1.05);
  console.info(JSON.stringify({ sfxV175: { files: measured.length, decodedPcmBytes: decodedBytes,
    peakRange: [Math.min(...measured.map(file => file.peak)), Math.max(...measured.map(file => file.peak))],
    rmsRange: [Math.min(...measured.map(file => file.rms)), Math.max(...measured.map(file => file.rms))] } }));
});
