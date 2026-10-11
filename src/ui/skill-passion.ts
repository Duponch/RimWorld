import { pictogramDataUrl } from './pictograms';

export type SkillPassion = 0 | 1 | 2;

export const SKILL_PASSION_LABELS: readonly string[] = ['Sans passion', 'Passion', 'Passion brûlante'];

function passionIcon(): HTMLSpanElement {
  const icon = document.createElement('span');
  icon.className = 'skill-passion';
  icon.setAttribute('aria-hidden', 'true');
  icon.style.display = 'inline-block';
  icon.style.width = '1.15em';
  icon.style.height = '1.15em';
  icon.style.verticalAlign = '-0.2em';
  icon.style.backgroundImage = `url('${pictogramDataUrl('passion')}')`;
  icon.style.backgroundSize = 'contain';
  icon.style.backgroundPosition = 'center';
  icon.style.backgroundRepeat = 'no-repeat';
  return icon;
}

function appendIcons(element: HTMLElement, passion: SkillPassion): void {
  for (let index = 0; index < passion; index++) iconAppend(element, passionIcon());
}

function iconAppend(element: HTMLElement, icon: HTMLElement): void {
  element.append(document.createTextNode(' '), icon);
}

/** Full skill row: readable label plus paper flames, with one clean accessible name. */
export function setSkillPassion(element: HTMLElement, leading: string, passion: SkillPassion, trailing = ''): void {
  const passionLabel = SKILL_PASSION_LABELS[passion]!;
  const accessible = `${leading} · ${passionLabel}${trailing}`;
  if (element.getAttribute('aria-label') === accessible) return;
  const match=/^(.*?) (\d+)\/20$/.exec(leading);
  if(match){
    const name=document.createElement('span');name.className='skill-caption';name.textContent=match[1]!;
    const value=document.createElement('span');value.className='skill-rating';value.textContent=` ${match[2]}/20`;
    const flames=document.createElement('span');flames.className='skill-flames';appendIcons(flames,passion);
    element.replaceChildren(name,value,flames);
  }else element.replaceChildren(document.createTextNode(leading));
  if(!match)appendIcons(element, passion);
  if (trailing) element.append(document.createTextNode(trailing));
  element.title = accessible;
  element.setAttribute('aria-label', accessible);
}

/** Compact work-table value: number and paper flames; passion stays explicit to assistive tech and hover. */
export function setCompactSkillPassion(element: HTMLElement, level: number, passion: SkillPassion, skill: string): void {
  const accessible = `${skill} ${level}/20 · ${SKILL_PASSION_LABELS[passion]}`;
  if (element.getAttribute('aria-label') === accessible) return;
  element.replaceChildren(document.createTextNode(String(level)));
  appendIcons(element, passion);
  element.title = accessible;
  element.setAttribute('aria-label', accessible);
}
