import { afterEach, describe, expect, it, vi } from 'vitest';
import { chooseMusicTrack, MusicDirector, MUSIC_TRACKS, type MusicTrack } from '../src/audio/MusicDirector';

class FakeAudio {
  src = '';
  preload = '';
  loop = false;
  volume = 1;
  paused = true;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  deferred: { resolve: () => void; reject: () => void } | null = null;
  play = vi.fn(() => {
    this.paused = false;
    if (!this.deferred) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      this.deferred = { resolve, reject };
    });
  });
  pause = vi.fn(() => { this.paused = true; });
  removeAttribute = vi.fn((name: string) => { if (name === 'src') this.src = ''; });
  load = vi.fn();
}

function fixture(deferred = false, tracks: readonly MusicTrack[] = MUSIC_TRACKS) {
  const players: FakeAudio[] = [];
  const music = new MusicDirector(tracks, () => {
    const player = new FakeAudio();
    if (deferred) player.deferred = { resolve: () => undefined, reject: () => undefined };
    players.push(player);
    return player as unknown as HTMLAudioElement;
  });
  return { music, players, live: () => players.filter(player => player.src !== '').length };
}

afterEach(() => vi.useRealTimers());

describe('playlist V175', () => {
  it('catalogue les dix titres réellement disponibles', () => {
    expect(MUSIC_TRACKS.map(track => track.id)).toEqual([
      'aube', 'clairiere', 'atelier', 'sentier',
      'veille', 'lucioles', 'brume', 'constellations',
      'alerte', 'veilleurs',
    ]);
    for (const [mood, count] of [['day', 4], ['night', 4], ['tension', 2]] as const) {
      expect(MUSIC_TRACKS.filter(track => track.mood === mood)).toHaveLength(count);
    }
    expect(new Set(MUSIC_TRACKS.map(track => track.src)).size).toBe(10);
  });

  it('écarte les trois derniers titres de jour et de nuit', () => {
    for (const mood of ['day', 'night'] as const) {
      const family = MUSIC_TRACKS.filter(track => track.mood === mood);
      const recent = family.slice(0, 3).map(track => track.id);
      for (let rotation = 0; rotation < 8; rotation++) {
        const selected = chooseMusicTrack(mood, recent.at(-1)!, MUSIC_TRACKS, recent, rotation);
        expect(selected?.mood).toBe(mood);
        expect(recent).not.toContain(selected?.id);
      }
    }
    expect(chooseMusicTrack('night', 'veille', MUSIC_TRACKS, ['veille'], 1)?.mood).toBe('night');
    expect(chooseMusicTrack('day', null, MUSIC_TRACKS, [], 0)?.id).toBe('aube');
  });

  it('alterne les deux titres de tension sans répétition consécutive', () => {
    expect(chooseMusicTrack('tension', null)?.id).toBe('alerte');
    expect(chooseMusicTrack('tension', 'alerte', MUSIC_TRACKS, ['alerte'])?.id).toBe('veilleurs');
    expect(chooseMusicTrack('tension', 'veilleurs', MUSIC_TRACKS,
      ['alerte', 'veilleurs'])?.id).toBe('alerte');
  });

  it('parcourt les quatre titres du jour avant de les répéter', async () => {
    vi.useFakeTimers();
    const { music, players } = fixture();
    music.unlock();
    await Promise.resolve();
    const heard = [music.diagnostics.track];
    for (let i = 0; i < 3; i++) {
      players.at(-1)?.onended?.();
      vi.advanceTimersByTime(37000);
      await Promise.resolve();
      heard.push(music.diagnostics.track);
    }
    expect(new Set(heard).size).toBe(4);
    expect(heard.every(id => MUSIC_TRACKS.find(track => track.id === id)?.mood === 'day')).toBe(true);
    music.dispose();
  });

  it('un geste pendant le silence normal ne lance pas la piste suivante avant le délai', async () => {
    vi.useFakeTimers();
    const { music, players } = fixture();
    music.unlock();
    await Promise.resolve();
    players[0]?.onended?.();
    vi.advanceTimersByTime(10000);
    music.unlock();
    expect(players).toHaveLength(1);
    vi.advanceTimersByTime(26999);
    expect(players).toHaveLength(1);
    vi.advanceTimersByTime(1);
    await Promise.resolve();
    expect(players).toHaveLength(2);
    music.dispose();
  });

  it('laisse terminer un titre calme après un changement de jour/nuit malgré de nouveaux gestes', async () => {
    vi.useFakeTimers();
    const { music, players } = fixture();
    music.unlock();
    await Promise.resolve();
    music.setMood('night');
    music.unlock();
    expect(players).toHaveLength(1);
    expect(players[0]?.src).toContain('aube');
    expect(players[0]?.paused).toBe(false);
    players[0]?.onended?.();
    vi.advanceTimersByTime(37000);
    await Promise.resolve();
    expect(players[1]?.src).toContain('veille');
    music.dispose();
  });

  it('temporise la sortie de menace, annule ce retour si la menace reprend et borne les lecteurs', async () => {
    vi.useFakeTimers();
    const { music, players, live } = fixture();
    music.unlock();
    await Promise.resolve();
    music.setMood('tension');
    await Promise.resolve();
    expect(music.diagnostics.track).toBe('alerte');
    expect(live()).toBe(2);
    music.setMood('day');
    vi.advanceTimersByTime(4000);
    music.setMood('tension');
    vi.advanceTimersByTime(5000);
    expect(music.diagnostics.track).toBe('alerte');
    music.setMood('day');
    vi.advanceTimersByTime(8000);
    await Promise.resolve();
    expect(MUSIC_TRACKS.find(track => track.id === music.diagnostics.track)?.mood).toBe('day');
    expect(live()).toBeLessThanOrEqual(2);
    vi.advanceTimersByTime(3600);
    expect(live()).toBe(1);
    expect(players.at(-1)?.volume).toBeGreaterThan(0);
    music.dispose();
  });

  it('met à jour la destination jour/nuit pendant le délai de sortie de menace', async () => {
    vi.useFakeTimers();
    const { music, players } = fixture();
    music.unlock();
    await Promise.resolve();
    music.setMood('tension');
    await Promise.resolve();
    music.setMood('day');
    vi.advanceTimersByTime(4000);
    music.setMood('night');
    vi.advanceTimersByTime(7999);
    expect(music.diagnostics.track).toBe('alerte');
    vi.advanceTimersByTime(1);
    await Promise.resolve();
    expect(music.diagnostics.track).toBe('veille');
    expect(players.at(-1)?.src).toContain('veille');
    music.dispose();
  });

  it('conserve le côté le plus audible quand une transition inverse le fondu', async () => {
    vi.useFakeTimers();
    const { music, players, live } = fixture();
    music.unlock();
    await Promise.resolve();
    vi.advanceTimersByTime(3600);
    music.setMood('tension');
    await Promise.resolve();
    music.setMood('day');
    vi.advanceTimersByTime(8000);
    await Promise.resolve();
    expect(MUSIC_TRACKS.find(track => track.id === music.diagnostics.track)?.mood).toBe('day');
    vi.advanceTimersByTime(400);
    const oldLevel = players[1]!.volume;
    expect(oldLevel).toBeGreaterThan(players[2]!.volume);
    music.setMood('tension');
    expect(live()).toBe(2);
    expect(players[1]!.volume).toBeCloseTo(oldLevel, 5);
    expect(players[2]!.src).toBe('');
    await Promise.resolve();
    expect(MUSIC_TRACKS.find(track => track.id === music.diagnostics.track)?.mood).toBe('tension');
    expect(live()).toBe(2);
    music.dispose();
  });

  it('annule un chargement ancien lorsque le contexte change ou l’onglet est caché', async () => {
    vi.useFakeTimers();
    const { music, players, live } = fixture(true);
    music.unlock();
    expect(players).toHaveLength(1);
    music.setMood('tension');
    expect(players[0]?.src).toBe('');
    expect(players[1]?.src).toContain('alerte');
    expect(live()).toBe(1);
    players[0]?.deferred?.resolve();
    await Promise.resolve();
    expect(music.diagnostics.track).toBeNull();
    music.setHidden(true);
    expect(live()).toBe(0);
    players[1]?.deferred?.resolve();
    await Promise.resolve();
    music.setHidden(false);
    expect(players[2]?.src).toContain('alerte');
    players[2]?.deferred?.resolve();
    await Promise.resolve();
    expect(music.diagnostics.track).toBe('alerte');
    expect(live()).toBe(1);
    music.dispose();
  });

  it('essaie le titre suivant sur erreur puis attend avant une nouvelle série complète', async () => {
    vi.useFakeTimers();
    const tracks = MUSIC_TRACKS.filter(track => track.mood === 'tension').slice(0, 2);
    const { music, players, live } = fixture(true, tracks);
    music.setMood('tension');
    music.unlock();
    players[0]?.deferred?.reject();
    await Promise.resolve();
    expect(players).toHaveLength(2);
    expect(players[1]?.src).toContain('veilleurs');
    players[1]?.deferred?.reject();
    await Promise.resolve();
    expect(live()).toBe(0);
    expect(players).toHaveLength(2);
    vi.advanceTimersByTime(14999);
    expect(players).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(players).toHaveLength(3);
    music.dispose();
  });

  it('un nouveau geste peut relancer une famille après échec complet', async () => {
    vi.useFakeTimers();
    const tracks = MUSIC_TRACKS.filter(track => track.mood === 'tension');
    const { music, players } = fixture(true, tracks);
    music.setMood('tension');
    music.unlock();
    players[0]?.deferred?.reject();
    await Promise.resolve();
    players[1]?.deferred?.reject();
    await Promise.resolve();
    expect(players).toHaveLength(2);
    music.unlock();
    expect(players).toHaveLength(3);
    expect(players[2]?.src).toContain('alerte');
    vi.advanceTimersByTime(14999);
    expect(players).toHaveLength(3);
    music.dispose();
  });

  it('passe au titre suivant si le démarrage reste suspendu trop longtemps', () => {
    vi.useFakeTimers();
    const { music, players, live } = fixture(true);
    music.unlock();
    expect(players[0]?.src).toContain('aube');
    vi.advanceTimersByTime(20000);
    expect(players[0]?.src).toBe('');
    expect(players).toHaveLength(2);
    expect(players[1]?.src).toContain('clairiere');
    expect(live()).toBe(1);
    music.dispose();
  });

  it('reprend sur une autre prise si le média devient illisible après démarrage', async () => {
    vi.useFakeTimers();
    const { music, players, live } = fixture();
    music.unlock();
    await Promise.resolve();
    players[0]?.onerror?.();
    expect(players[0]?.src).toBe('');
    expect(players[1]?.src).toContain('atelier');
    await Promise.resolve();
    expect(music.diagnostics.track).toBe('atelier');
    expect(live()).toBe(1);
    music.dispose();
  });

  it('borne aussi les reprises si tous les titres échouent après play()', async () => {
    vi.useFakeTimers();
    const tracks = MUSIC_TRACKS.filter(track => track.mood === 'tension').slice(0, 2);
    const { music, players, live } = fixture(false, tracks);
    music.setMood('tension');
    music.unlock();
    await Promise.resolve();
    players[0]?.onerror?.();
    await Promise.resolve();
    expect(players).toHaveLength(2);
    players[1]?.onerror?.();
    await Promise.resolve();
    expect(players).toHaveLength(2);
    expect(live()).toBe(0);
    vi.advanceTimersByTime(15000);
    expect(players).toHaveLength(3);
    music.dispose();
  });

  it('recalcule les deux gains pendant le fondu quand le curseur change', async () => {
    vi.useFakeTimers();
    const { music, players } = fixture();
    music.unlock();
    await Promise.resolve();
    vi.advanceTimersByTime(3600);
    music.setMood('tension');
    await Promise.resolve();
    vi.advanceTimersByTime(1600);
    const before = players[1]!.volume;
    music.setVolume(0.25);
    expect(players[1]!.volume).toBeCloseTo(before / 2, 5);
    expect(players[0]!.volume).toBeGreaterThan(0);
    music.dispose();
  });
});
