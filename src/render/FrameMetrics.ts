/** Bounded presentation telemetry, independent of simulation time/speed.
 * One duration per completed frame; sorting occurs only at publication (~1 Hz).
 */
export class FrameMetrics {
  fps = 0;
  meanMs = 0;
  p95Ms = 0;
  private readonly samples = new Float64Array(512);
  private count = 0;
  private elapsed = 0;
  private previous: number | null = null;

  reset(): void {
    this.previous = null; this.count = 0; this.elapsed = 0;
    this.fps = 0; this.meanMs = 0; this.p95Ms = 0;
  }

  record(now: number, hidden = false): void {
    if (hidden || !Number.isFinite(now)) { this.reset(); return; }
    const previous = this.previous;
    this.previous = now;
    if (previous === null) return;
    const duration = now - previous;
    if (duration <= 0) return;
    // Visibility changes call reset separately. Long visible stalls remain measured.
    this.samples[this.count++] = duration; this.elapsed += duration;
    if (this.elapsed < 750 && this.count < this.samples.length) return;
    this.meanMs = this.elapsed / this.count;
    this.fps = 1000 / this.meanMs;
    const sorted = this.samples.slice(0, this.count).sort();
    this.p95Ms = sorted[Math.ceil(this.count * 0.95) - 1]!;
    this.count = 0; this.elapsed = 0;
  }
}
