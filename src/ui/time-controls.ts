import './time-controls.css';

export const TIME_CONTROL_ASSETS = Object.freeze({
  0: '/assets/ui/elsewhere/v307/pause.png',
  1: '/assets/ui/elsewhere/v307/play.png',
  3: '/assets/ui/elsewhere/v307/speed-double.png',
  6: '/assets/ui/elsewhere/v307/speed-triple.png',
});

/** Static decoration, shared by the controls and the pause readout. The
 * banner follows the actual portrait row in flow, including font changes. */
export function installTimeControls(root: HTMLElement): void {
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-speed]')) {
    const source = TIME_CONTROL_ASSETS[Number(button.dataset.speed) as keyof typeof TIME_CONTROL_ASSETS];
    if (!source) continue;
    const icon = document.createElement('img');
    icon.src = source; icon.alt = ''; icon.draggable = false; icon.className = 'time-control-icon';
    icon.setAttribute('aria-hidden', 'true'); button.replaceChildren(icon);
  }
  const banner = root.querySelector<HTMLElement>('#pause-banner');
  const bar = root.querySelector<HTMLElement>('.colonist-bar');
  if (banner && bar) {
    const icon = document.createElement('img');
    icon.src = TIME_CONTROL_ASSETS[0]; icon.alt = ''; icon.draggable = false;
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span'); text.textContent = 'En pause';
    banner.replaceChildren(icon, text); bar.append(banner);
  }
}
