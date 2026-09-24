import { iconPosition, type UiIcon } from './visual-identity';

/** Presentation only. Keep every supplied fact and rebuild only changed copy. */
export function presentCellDescription(panel: HTMLElement, text: string, icon: UiIcon): void {
  const art = panel.querySelector<HTMLElement>('.cell-illustration');
  if (art && art.dataset.icon !== icon) {
    art.dataset.icon = icon;
    const [x, y] = iconPosition(icon);
    art.style.backgroundPosition = `${x}% ${y}%`;
  }
  const description = panel.querySelector<HTMLElement>('#cell-description');
  if (!description || description.dataset.copy === text) return;
  description.dataset.copy = text;
  const parts = text.split(' · ').filter(Boolean);
  const location = document.createElement('p');
  location.className = 'cell-location'; location.textContent = parts.shift() ?? '';
  const facts = document.createElement('div'); facts.className = 'cell-facts';
  for (const part of parts) {
    const line = document.createElement('p');
    const separator = part.indexOf(' : ');
    if (separator > 0) {
      const label = document.createElement('span'); label.textContent = part.slice(0, separator + 3);
      const value = document.createElement('strong'); value.textContent = part.slice(separator + 3);
      line.append(label, value);
    } else { line.textContent = part; line.className = 'cell-note'; }
    facts.append(line);
  }
  description.replaceChildren(location, facts);
}
