import { afterEach, describe, expect, it, vi } from 'vitest';
import { chooseMusicTrack, MusicDirector, MUSIC_TRACKS } from '../src/audio/MusicDirector';

class FakeAudio {
  src = '';
  preload = '';
  loop = false;
  volume = 1;
  paused = true;
  onended: (() => void) | null = null;
  play = vi.fn(() => { this.paused = false; return Promise.resolve(); });
  pause = vi.fn(() => { this.paused = true; });
  removeAttribute = vi.fn((name: string) => { if (name === 'src') this.src = ''; });
  load = vi.fn();
}

afterEach(() => { vi.useRealTimers(); });

describe('musique V165', () => {
  it('alterne les longues pistes calmes et réserve la tension à la menace', () => {
    expect(chooseMusicTrack('day', null)?.id).toBe('aube');
    expect(chooseMusicTrack('night', null)?.id).toBe('veille');
    expect(chooseMusicTrack('day', 'aube')?.id).toBe('veille');
    expect(chooseMusicTrack('night', 'veille')?.id).toBe('aube');
    expect(chooseMusicTrack('tension', 'aube')?.id).toBe('alerte');
    expect(chooseMusicTrack('day', 'alerte')?.id).toBe('aube');
    expect(MUSIC_TRACKS.every(track => track.src.startsWith('/assets/audio/music/'))).toBe(true);
  });

  it('démarre sur geste, change sur menace et suspend la lecture sans boucle courte', async () => {
    vi.useFakeTimers();
    const players: FakeAudio[] = [];
    const music = new MusicDirector(MUSIC_TRACKS, () => {
      const player = new FakeAudio();
      players.push(player);
      return player as unknown as HTMLAudioElement;
    });
    music.setMood('night');
    expect(players).toHaveLength(0);
    music.unlock();
    await Promise.resolve();
    expect(players[0]?.src).toContain('veille');
    expect(players[0]?.loop).toBe(false);
    music.setMood('tension');
    await Promise.resolve();
    expect(players[1]?.src).toContain('alerte');
    music.setEnabled(false);
    expect(players[1]?.paused).toBe(true);
    music.setVolume(0.25);
    music.setEnabled(true);
    expect(players[1]?.play).toHaveBeenCalledTimes(2);
    music.dispose();
    expect(players[1]?.paused).toBe(true);
  });

  it('attend entre deux pistes terminées et ne relit pas immédiatement la même piste calme', async () => {
    vi.useFakeTimers();
    const players: FakeAudio[] = [];
    const music = new MusicDirector(MUSIC_TRACKS, () => {
      const player = new FakeAudio();
      players.push(player);
      return player as unknown as HTMLAudioElement;
    });
    music.unlock();
    await Promise.resolve();
    expect(players[0]?.src).toContain('aube');
    players[0]?.onended?.();
    expect(players).toHaveLength(1);
    vi.advanceTimersByTime(37000);
    await Promise.resolve();
    expect(players[1]?.src).toContain('veille');
    music.dispose();
  });

  it('reprend avec la musique de menace si le monde change pendant une suspension', async () => {
    vi.useFakeTimers();
    const players: FakeAudio[] = [];
    const music = new MusicDirector(MUSIC_TRACKS, () => {
      const player = new FakeAudio();
      players.push(player);
      return player as unknown as HTMLAudioElement;
    });
    music.unlock();
    await Promise.resolve();
    expect(players[0]?.src).toContain('aube');
    music.setHidden(true);
    music.setMood('tension');
    expect(players[0]?.paused).toBe(true);
    music.setHidden(false);
    await Promise.resolve();
    expect(players[0]?.src).toBe('');
    expect(players[1]?.src).toContain('alerte');
    expect(players[1]?.paused).toBe(false);
    music.dispose();
  });
});
