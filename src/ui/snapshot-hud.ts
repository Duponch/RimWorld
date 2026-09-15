/** Worker phase snapshots may arrive at every tick. Refresh the management UI
 * at most five times per second, while controls/replacements remain immediate.
 * The callback reads the latest world; no simulation message is dropped. */
export class SnapshotHud {
  private next = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor(private readonly refresh: () => void) {}

  request(immediate = false): void {
    const now = performance.now();
    if (immediate || now >= this.next) {
      clearTimeout(this.timer); this.timer = undefined;
      this.next = now + 200;
      this.refresh();
    } else if (this.timer === undefined) {
      this.timer = setTimeout(() => this.request(true), this.next - now);
    }
  }
}
