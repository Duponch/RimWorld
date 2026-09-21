import { ARCHITECT_ICON_ATLASES, ARCHITECT_ICON_MAPPING } from './architect-icons';

export type SkillPassion = 0 | 1 | 2;

export const SKILL_PASSION_LABELS: readonly string[] = ['Sans passion', 'Passion', 'Passion brûlante'];

function passionIcon(): HTMLSpanElement {
  const icon = document.createElement('span');
  const cell = ARCHITECT_ICON_MAPPING.campfire!;
  icon.className = 'skill-passion';
  icon.setAttribute('aria-hidden', 'true');
  icon.style.display = 'inline-block';
  icon.style.width = '1.15em';
  icon.style.height = '1.15em';
  icon.style.verticalAlign = '-0.2em';
  icon.style.backgroundImage = `url('${ARCHITECT_ICON_ATLASES[cell.atlas]}')`;
  icon.style.backgroundSize = '600% 500%';
  icon.style.backgroundPosition = `${cell.column * 20}% ${cell.row * 25}%`;
  icon.style.backgroundRepeat = 'no-repeat';
  return icon;
}

function appendIcons(element: HTMLElement, passion: SkillPassion): void {
  for (let index = 0; index < passion; index++) iconAppend(element, passionIcon());
}

function iconAppend(element: HTMLElement, icon: HTMLElement): void {
  element.append(document.createTextNode(' '), icon);
}

/** Full skill row: readable label plus atlas flames, with one clean accessible name. */
export function setSkillPassion(element: HTMLElement, leading: string, passion: SkillPassion, trailing = ''): void {
  const passionLabel = SKILL_PASSION_LABELS[passion]!;
  const accessible = `${leading} · ${passionLabel}${trailing}`;
  if (element.getAttribute('aria-label') === accessible) return;
  element.replaceChildren(document.createTextNode(`${leading} · ${passionLabel}`));
  appendIcons(element, passion);
  if (trailing) element.append(document.createTextNode(trailing));
  element.title = accessible;
  element.setAttribute('aria-label', accessible);
}

/** Compact work-table value: number and atlas flames; passion stays explicit to assistive tech and hover. */
export function setCompactSkillPassion(element: HTMLElement, level: number, passion: SkillPassion, skill: string): void {
  const accessible = `${skill} ${level}/20 · ${SKILL_PASSION_LABELS[passion]}`;
  if (element.getAttribute('aria-label') === accessible) return;
  element.replaceChildren(document.createTextNode(String(level)));
  appendIcons(element, passion);
  element.title = accessible;
  element.setAttribute('aria-label', accessible);
}
