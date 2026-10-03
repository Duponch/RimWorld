import './tooltip.css';

export interface TooltipContent {
  title?: string;
  body: string;
  rows?: ReadonlyArray<{ label: string; value: string }>;
}
const contents = new WeakMap<HTMLElement, TooltipContent>();
let refreshActive: ((element: HTMLElement) => void) | undefined;
let dismissActive: (() => void) | undefined;

/** Presentation data is prepared at snapshot cadence, never on pointer moves. */
export function setTooltip(element: HTMLElement, content: TooltipContent): void {
  const previous=contents.get(element);
  const unchanged=previous?.title===content.title&&previous?.body===content.body&&JSON.stringify(previous?.rows)===JSON.stringify(content.rows);
  contents.set(element, content);
  if (!element.hasAttribute('data-tooltip')) element.setAttribute('data-tooltip', '');
  element.removeAttribute('title');
  if(!unchanged)refreshActive?.(element);
}
export function dismissTooltip(): void { dismissActive?.(); }

/** One delegated tooltip and one transient timer for the entire interface.
 * Native titles from older controls share the same presentation. No HTML from
 * snapshots is interpreted; pointer tracking does not query the world or DOM. */
export function installTooltips(host: HTMLElement): () => void {
  const tip = document.createElement('aside'); tip.id = 'game-tooltip';
  tip.className = 'game-tooltip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
  document.body.append(tip);
  let owner: HTMLElement | undefined, nativeTitle: string | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let frame = 0, x = 0, y = 0, width = 0, height = 0, keyboard = false;
  const position = () => {
    frame = 0;
    let left = x + 18, top = y + 18;
    if (left + width > window.innerWidth - 8) left = x - width - 14;
    if (top + height > window.innerHeight - 8) top = y - height - 14;
    tip.style.left = `${Math.max(8, Math.min(left, window.innerWidth - width - 8))}px`;
    tip.style.top = `${Math.max(8, Math.min(top, window.innerHeight - height - 8))}px`;
  };
  const hide = () => {
    clearTimeout(timer); timer = undefined;
    cancelAnimationFrame(frame); frame = 0;
    tip.hidden = true;
    if(tip.parentElement!==document.body)document.body.append(tip);
    if (owner) {
      const ids = (owner.getAttribute('aria-describedby') ?? '').split(' ').filter(id => id && id !== tip.id);
      if (ids.length) owner.setAttribute('aria-describedby', ids.join(' ')); else owner.removeAttribute('aria-describedby');
      if (nativeTitle !== undefined && !owner.hasAttribute('title')) owner.title = nativeTitle;
    }
    owner = undefined; nativeTitle = undefined;
  };
  const paint = () => {
    if (!owner?.isConnected || owner.closest('[hidden],[inert]')) { hide(); return; }
    const content = contents.get(owner) ?? { body: owner.title || nativeTitle || '' };
    if(owner.hasAttribute('title')){nativeTitle=owner.title;owner.removeAttribute('title');}
    if (!content.body && !content.title && !content.rows?.length) { hide(); return; }
    const children: HTMLElement[] = [];
    if (content.title) { const heading = document.createElement('strong'); heading.textContent = content.title; children.push(heading); }
    if (content.body) { const body = document.createElement('p'); body.textContent = content.body; children.push(body); }
    if (content.rows?.length) {
      const rows = document.createElement('dl');
      for (const row of content.rows) {
        const label = document.createElement('dt'), value = document.createElement('dd');
        label.textContent = row.label; value.textContent = row.value; rows.append(label, value);
      }
      children.push(rows);
    }
    const modal=owner.closest<HTMLDialogElement>('dialog[open]');
    if(tip.parentElement!==(modal??document.body))(modal??document.body).append(tip);
    tip.replaceChildren(...children); tip.hidden = false;
    const ids = new Set((owner.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean)); ids.add(tip.id);
    owner.setAttribute('aria-describedby', [...ids].join(' '));
    if (keyboard) { const rect = owner.getBoundingClientRect(); x = rect.left; y = rect.bottom; }
    width = tip.offsetWidth; height = tip.offsetHeight; position();
  };
  const enter = (target: EventTarget | null, focused: boolean) => {
    const next = target instanceof Element ? target.closest<HTMLElement>('[data-tooltip],[title]') : null;
    if (!next || !host.contains(next)) { hide(); return; }
    if (next === owner) return;
    hide(); owner = next; keyboard = focused;
    if (next.hasAttribute('title')) { nativeTitle = next.title; next.removeAttribute('title'); }
    timer = setTimeout(paint, focused ? 0 : 450);
  };
  const over = (event: PointerEvent) => { x = event.clientX; y = event.clientY; enter(event.target, false); };
  const move = (event: PointerEvent) => {
    x = event.clientX; y = event.clientY;
    if (!tip.hidden && !keyboard && !frame) frame = requestAnimationFrame(position);
  };
  const out = (event: PointerEvent) => {
    if (owner && (!(event.relatedTarget instanceof Node) || !owner.contains(event.relatedTarget))) hide();
  };
  const focus = (event: FocusEvent) => enter(event.target, true);
  const key = (event: KeyboardEvent) => { if (event.key === 'Escape'&&!tip.hidden) { event.preventDefault();event.stopPropagation();hide(); } };
  host.addEventListener('pointerover', over); host.addEventListener('pointermove', move);
  host.addEventListener('pointerout', out); host.addEventListener('focusin', focus);
  host.addEventListener('focusout', hide); host.addEventListener('pointerdown', hide);
  document.addEventListener('scroll', hide, true); document.addEventListener('keydown', key);
  window.addEventListener('resize', hide);
  refreshActive = element => { if (element === owner && !tip.hidden) paint(); };
  dismissActive = hide;
  return () => {
    hide(); tip.remove(); refreshActive = undefined; dismissActive = undefined;
    host.removeEventListener('pointerover', over); host.removeEventListener('pointermove', move);
    host.removeEventListener('pointerout', out); host.removeEventListener('focusin', focus);
    host.removeEventListener('focusout', hide); host.removeEventListener('pointerdown', hide);
    document.removeEventListener('scroll', hide, true); document.removeEventListener('keydown', key);
    window.removeEventListener('resize', hide);
  };
}
