import { closeSync, openSync, readSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { MUSIC_TRACKS } from '../../src/audio/MusicDirector';
import { observeErrors } from './helpers';

const expectedFamilies = {
  day: ['aube', 'clairiere', 'atelier', 'sentier'],
  night: ['veille', 'lucioles', 'brume', 'constellations'],
  tension: ['alerte', 'veilleurs'],
} as const;
const originalIds = new Set(['aube', 'veille', 'alerte']);

async function openMusicHarness(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/__music-v175-harness', route => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><html><head><meta charset="utf-8"></head><body><button id="start-music">Start music</button></body></html>',
  }));
  await page.goto('/__music-v175-harness');
}

test('V175 : dix MP3 publiés (4/4/2) et durées de pistes longues', async ({ page }) => {
  test.setTimeout(120_000);
  expect(MUSIC_TRACKS).toHaveLength(10);
  expect(new Set(MUSIC_TRACKS.map(track => track.id)).size).toBe(10);
  expect(new Set(MUSIC_TRACKS.map(track => track.src)).size).toBe(10);
  for (const [mood, ids] of Object.entries(expectedFamilies)) {
    expect(MUSIC_TRACKS.filter(track => track.mood === mood).map(track => track.id)).toEqual(ids);
  }
  for (const track of MUSIC_TRACKS) {
    expect(track.src).toBe(`/assets/audio/music/lisiere-${track.id}-${originalIds.has(track.id) ? 'v1' : 'v175'}.mp3`);
    const path = resolve('public', track.src.slice(1));
    expect(statSync(path).size, `${track.id} doit être un vrai fichier audio long`).toBeGreaterThan(1_000_000);
    const header = Buffer.alloc(3);
    const handle = openSync(path, 'r');
    try { expect(readSync(handle, header, 0, header.length, 0)).toBe(header.length); }
    finally { closeSync(handle); }
    expect(header.toString() === 'ID3' || (header[0] === 0xff && (header[1]! & 0xe0) === 0xe0),
      `${track.id} doit commencer par un en-tête MP3`).toBe(true);
  }

  await openMusicHarness(page);
  // Probe metadata one title at a time. This is an asset check, separate from
  // the application-startup check below; it does not preload the playlist.
  const durations = await page.evaluate(async tracks => {
    const result: Record<string, number> = {};
    for (const track of tracks) {
      const audio = new Audio();
      audio.preload = 'metadata';
      try {
        result[track.id] = await new Promise<number>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error(`Metadata timeout: ${track.id}`)), 15_000);
          audio.onloadedmetadata = () => { window.clearTimeout(timeout); resolve(audio.duration); };
          audio.onerror = () => { window.clearTimeout(timeout); reject(new Error(`MP3 illisible: ${track.id}`)); };
          audio.src = track.src;
        });
      } finally {
        audio.removeAttribute('src');
        audio.load();
      }
    }
    return result;
  }, MUSIC_TRACKS.map(({ id, src }) => ({ id, src })));
  for (const track of MUSIC_TRACKS) {
    expect(Number.isFinite(durations[track.id])).toBe(true);
    expect(durations[track.id], `${track.id} doit être une piste longue`).toBeGreaterThan(originalIds.has(track.id) ? 180 : 240);
  }
});

test('V175 : le démarrage réel ne précharge pas les dix titres', async ({ page }) => {
  const errors = observeErrors(page);
  const musicRequests: string[] = [];
  page.on('request', request => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.startsWith('/assets/audio/music/')) musicRequests.push(pathname);
  });
  await page.addInitScript(() => {
    (window as any).__musicPlayed = [] as HTMLMediaElement[];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this.src.includes('/assets/audio/music/')) (window as any).__musicPlayed.push(this);
      return play.call(this);
    };
  });
  await page.goto('/');
  expect(musicRequests).toEqual([]);
  await page.getByRole('button', { name: 'Options' }).click();
  await expect.poll(() => page.evaluate(() => {
    const active = (window as any).__musicPlayed.at(-1) as HTMLMediaElement | undefined;
    return active?.currentTime ?? 0;
  }), { timeout: 20_000 }).toBeGreaterThan(0.2);
  const active = await page.evaluate(() => {
    const audio = (window as any).__musicPlayed.at(-1) as HTMLMediaElement;
    return { src: new URL(audio.src).pathname, duration: audio.duration, preload: audio.preload,
      tag: audio.tagName, paused: audio.paused };
  });
  expect(MUSIC_TRACKS.map(track => track.src)).toContain(active.src);
  expect(active.tag).toBe('AUDIO');
  expect(active.paused).toBe(false);
  expect(active.duration).toBeGreaterThan(180);
  expect(active.preload).toBe('auto');
  // Give any accidental catalogue-wide preload time to issue requests.
  await page.waitForTimeout(1_000);
  expect(new Set(musicRequests).size).toBe(1);
  expect(musicRequests.every(path => path === active.src)).toBe(true);
  expect(errors).toEqual([]);
});

test('V175 : le vrai lecteur borne le fondu et temporise la sortie de tension', async ({ page }) => {
  test.setTimeout(60_000);
  await openMusicHarness(page);
  const moduleUrl = '/src/audio/MusicDirector.ts';
  await page.evaluate(async url => {
    const { MusicDirector, MUSIC_TRACKS } = await import(/* @vite-ignore */ url);
    const elements: HTMLAudioElement[] = [];
    const director = new MusicDirector(MUSIC_TRACKS, () => {
      const audio = new Audio();
      elements.push(audio);
      return audio;
    });
    (window as any).__musicV175 = { director, elements };
    document.querySelector('#start-music')!.addEventListener('click', () => director.unlock());
  }, moduleUrl);
  await page.getByRole('button', { name: 'Start music' }).click();
  const state = () => page.evaluate(() => {
    const { director, elements } = (window as any).__musicV175 as {
      director: { diagnostics: { state: string; track: string | null } };
      elements: HTMLAudioElement[];
    };
    return { ...director.diagnostics,
      live: elements.filter(audio => audio.hasAttribute('src')).length,
      playing: elements.filter(audio => audio.hasAttribute('src') && !audio.paused).length,
      sources: elements.filter(audio => audio.hasAttribute('src')).map(audio => new URL(audio.src).pathname),
    };
  });
  await expect.poll(state, { timeout: 20_000 }).toMatchObject({ state: 'active', track: 'aube', live: 1 });
  await page.evaluate(() => (window as any).__musicV175.director.setMood('tension'));
  await expect.poll(state, { timeout: 20_000 }).toMatchObject({ state: 'active', track: 'alerte', live: 2 });
  expect((await state()).playing).toBeLessThanOrEqual(2);
  await expect.poll(state, { timeout: 8_000 }).toMatchObject({ track: 'alerte', live: 1 });

  const releaseStart = await page.evaluate(() => {
    (window as any).__musicV175.director.setMood('day');
    return performance.now();
  });
  await page.waitForTimeout(3_000);
  expect((await state()).track).toBe('alerte');
  await expect.poll(async () => {
    const current = await state();
    return { mood: MUSIC_TRACKS.find(track => track.id === current.track)?.mood, live: current.live };
  }, { timeout: 15_000 }).toEqual({ mood: 'day', live: 2 });
  const afterReturn = await state();
  expect(expectedFamilies.day).toContain(afterReturn.track as typeof expectedFamilies.day[number]);
  expect(afterReturn.playing).toBeLessThanOrEqual(2);
  const elapsed = await page.evaluate(start => performance.now() - start, releaseStart);
  expect(elapsed).toBeGreaterThanOrEqual(7_500);
  await expect.poll(state, { timeout: 8_000 }).toMatchObject({ live: 1 });
  await page.evaluate(() => (window as any).__musicV175.director.dispose());
  expect((await state()).live).toBe(0);
});
