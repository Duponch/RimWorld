import { iconPosition, type UiIcon } from './visual-identity';
import {modelIconUrl,UI_ATLAS_URL} from './pictograms';

export type CellHealth = { current: number; maximum: number; label: string; valueText?: string };

/** Presentation only. Keep engine facts in the selected object's card. */
export function presentCellDescription(panel: HTMLElement, text: string, icon: UiIcon, health?: CellHealth,model?:string): void {
  const art = panel.querySelector<HTMLElement>('.cell-illustration');
  if (art && art.dataset.icon !== (model??icon)) {
    art.dataset.icon = model??icon;
    const [x, y] = iconPosition(icon);
    art.style.backgroundImage=`url('${model?modelIconUrl(model):UI_ATLAS_URL}')`;
    art.style.backgroundSize=model?'contain':'400% 500%';art.style.backgroundPosition=model?'center':`${x}% ${y}%`;
  }
  const description = panel.querySelector<HTMLElement>('#cell-description');
  if (!description) return;
  const copy = `${text}\u0000${health ? `${health.label}:${health.current}/${health.maximum}:${health.valueText ?? ''}` : ''}`;
  if (description.dataset.copy === copy) return;
  description.dataset.copy = copy;

  const content: HTMLElement[] = [];
  if (health && health.maximum > 0) {
    const row = document.createElement('div'); row.className = 'cell-health';
    const caption = document.createElement('div'); caption.className = 'cell-health-caption';
    const label = document.createElement('span'); label.textContent = health.label;
    const value = document.createElement('strong'); value.textContent = health.valueText ?? `${health.current} / ${health.maximum} PV`;
    caption.append(label, value);
    const bar = document.createElement('progress');
    bar.max = health.maximum; bar.value = Math.max(0, Math.min(health.maximum, health.current));
    bar.setAttribute('aria-label', `${health.label} : ${value.textContent}`);
    row.append(caption, bar); content.push(row);
  }

  const facts = document.createElement('div'); facts.className = 'cell-facts';
  for (const part of text.split(' · ').map(value => value.trim()).filter(Boolean)) {
    const line = document.createElement('p');
    const separator = part.indexOf(' : ');
    const percentage = separator < 0 ? /^(Croissance)\s+(\d+(?:[,.]\d+)?\s*%)$/.exec(part) : null;
    if (separator > 0 || percentage) {
      const label = document.createElement('span'); label.textContent = percentage ? `${percentage[1]} :` : `${part.slice(0, separator)} :`;
      const value = document.createElement('strong'); value.textContent = percentage ? percentage[2]! : part.slice(separator + 3);
      line.append(label, value);
    } else { line.textContent = part; line.className = 'cell-note'; }
    facts.append(line);
  }
  if (facts.childElementCount) content.push(facts);
  description.replaceChildren(...content);
}
