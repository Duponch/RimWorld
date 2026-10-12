import { DEFAULT_SHADOW_SETTINGS, parseShadowSettings, type ShadowFrequency, type ShadowSettings } from './shadow-settings';

/** Wall-time presentation cadence, independent of World ticks and simulation.
 * Only completed native passes seed reuse. Urgent view/option changes invalidate;
 * continuous caster updates merely invalidate the separate paused cache. */
export class ShadowRefreshScheduler {
  private settings: ShadowSettings;
  private ready = false;
  private deadline = NaN;
  private lastCompleted = NaN;

  constructor(settings: ShadowSettings = DEFAULT_SHADOW_SETTINGS) {
    this.settings = parseShadowSettings(settings);
  }

  setSettings(settings: ShadowSettings): boolean {
    const next = parseShadowSettings(settings);
    if (next.frequency === this.settings.frequency && next.resolution === this.settings.resolution) return false;
    this.settings = next; this.invalidate(); return true;
  }

  setFrequency(frequency: ShadowFrequency): boolean {
    return this.setSettings({ ...this.settings, frequency });
  }

  invalidate(): void { this.ready = false; this.deadline = this.lastCompleted = NaN; }

  shouldRefresh(now: number, paused: boolean): boolean {
    if (!Number.isFinite(now) || !this.ready || now < this.lastCompleted) return true;
    if (paused) return false; // Caller still verifies the exact paused cache.
    return this.settings.frequency === 0 || now + 1e-6 >= this.deadline;
  }

  capture(now: number, completed: boolean): void {
    if (!completed || !Number.isFinite(now) || now < this.lastCompleted) { this.invalidate(); return; }
    const interval = this.settings.frequency === 0 ? 0 : 1000 / this.settings.frequency;
    if (!this.ready || interval === 0) this.deadline = now + interval;
    else {
      // Preserve phase on non-divisible RAF rates; missed slots never produce
      // catch-up passes. An urgent early refresh starts a new cadence.
      this.deadline = now + 1e-6 < this.deadline ? now + interval
        : this.deadline + (Math.floor(Math.max(0, now + 1e-6 - this.deadline) / interval) + 1) * interval;
    }
    this.lastCompleted = now; this.ready = true;
  }
}
