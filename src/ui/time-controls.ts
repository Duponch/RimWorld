import './time-controls.css';
import { paperPictogramUrl } from './pictograms';

export const TIME_CONTROL_ASSETS = Object.freeze({
  0: '/assets/ui/elsewhere/v308/pause.png',
  1: '/assets/ui/elsewhere/v308/play.png',
  3: '/assets/ui/elsewhere/v308/speed-double.png',
  6: '/assets/ui/elsewhere/v308/speed-triple.png',
});

/** Two pixels of padding around measured alpha bounds. SVG frames center
 * the generated PNGs without stretching, coloring or redrawing their shapes. */
export const TIME_CONTROL_FRAMES = Object.freeze({
  0: [35, 29, 58, 70],
  1: [32, 26, 65, 76],
  3: [24, 39, 81, 50],
  6: [14, 43, 99, 43],
} as const);

/** The V308 PNG manifest remains available for historical delivery evidence. */
export const PAPER_TIME_CONTROL_ASSETS = Object.freeze({
  0: paperPictogramUrl('pause'),
  1: paperPictogramUrl('play'),
  3: paperPictogramUrl('speed-double'),
  6: paperPictogramUrl('speed-triple'),
});

function timeIcon(speed: keyof typeof TIME_CONTROL_ASSETS): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('time-control-icon'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  image.setAttribute('href', PAPER_TIME_CONTROL_ASSETS[speed]); image.setAttribute('width', '64'); image.setAttribute('height', '64');
  svg.append(image); return svg;
}

/** Static decoration, shared by the controls and the pause readout. The
 * banner follows the actual portrait row in flow, including font changes. */
export function installTimeControls(root: HTMLElement): void {
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-speed]')) {
    const source = TIME_CONTROL_ASSETS[Number(button.dataset.speed) as keyof typeof TIME_CONTROL_ASSETS];
    if (!source) continue;
    button.replaceChildren(timeIcon(Number(button.dataset.speed) as keyof typeof TIME_CONTROL_ASSETS));
  }
  const banner = root.querySelector<HTMLElement>('#pause-banner');
  const bar = root.querySelector<HTMLElement>('.colonist-bar');
  if (banner && bar) {
    const icon = timeIcon(0);
    const text = document.createElement('span'); text.textContent = 'En pause';
    banner.replaceChildren(icon, text); bar.append(banner);
  }
}
