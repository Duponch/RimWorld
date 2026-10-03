/** Visible markers verified against Core 1.6.4871. These are presentation
 * positions for existing local needs, not additional simulation thresholds. */
export const NEED_THRESHOLDS = {
  hunger: [12, 24],
  rest: [14, 28],
  recreation: [15, 30, 70, 85],
  beauty: [15, 35, 65, 85],
  comfort: [10, 60, 70, 80, 90],
} as const;
export type GaugeNeed = keyof typeof NEED_THRESHOLDS;

/** Only fixed need IDs and numbers enter this markup. Saved text belongs in
 * textContent or the shared tooltip, never in this HTML. */
export function needGaugeMarkup(need: GaugeNeed): string {
  const markers = NEED_THRESHOLDS[need].map(value => `<i data-need-threshold="${value}" style="left:${value}%"></i>`).join('');
  return `<div class="need-gauge"><meter id="${need}-meter" min="0" max="100" optimum="100"></meter><div class="need-gauge-markers" aria-hidden="true">${markers}</div></div>`;
}

export function needThresholdRow(need: GaugeNeed): { label: string; value: string } {
  return { label: 'Repères de la jauge', value: NEED_THRESHOLDS[need].map(value => `${value} %`).join(' · ') };
}

export function updateNeedGauge(row: HTMLElement, value: number, dead: boolean): void {
  row.querySelector<HTMLMeterElement>('meter')!.value = dead ? 0 : value;
  for (const marker of row.querySelectorAll<HTMLElement>('[data-need-threshold]')) {
    const passed = !dead && Number(marker.dataset.needThreshold) < value;
    if (marker.classList.contains('need-threshold-passed') !== passed) marker.classList.toggle('need-threshold-passed', passed);
  }
}
