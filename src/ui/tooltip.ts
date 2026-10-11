import './tooltip.css';

export interface TooltipContent {
  title?: string;
  body: string;
  rows?: ReadonlyArray<{ label: string; value: string }>;
}
const contents = new WeakMap<Element, TooltipContent>();
const legacyTitles = new WeakMap<Element, string>();
const svgLabels = new WeakMap<Element, string>();
export const TOOLTIP_POINTER_DELAY_MS = 450;
export const RESOURCE_TOOLTIP_POINTER_DELAY_MS = 1700;
export function tooltipPointerDelay(element: Element): number {
  return element.closest('.resource-list') ? RESOURCE_TOOLTIP_POINTER_DELAY_MS : TOOLTIP_POINTER_DELAY_MS;
}
let refreshActive: ((element: Element) => void) | undefined;
let dismissActive: (() => void) | undefined;

/** Presentation data is prepared at snapshot cadence, never on pointer moves. */
export function setTooltip(element: Element, content: TooltipContent): void {
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
 * snapshots is interpreted. Legacy titles are consumed once, including on
 * ancestors and dynamically inserted controls; they are never restored. */
export function installTooltips(host: HTMLElement): () => void {
  const tip = document.createElement('aside'); tip.id = 'game-tooltip';
  tip.className = 'game-tooltip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
  document.body.append(tip);
  let owner: Element | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let frame = 0, x = 0, y = 0, width = 0, height = 0, keyboard = false;
  let pointerFocus: Node | undefined;
  const position = () => {
    frame = 0;
    if (keyboard && owner) { const rect = owner.getBoundingClientRect(); x = rect.left; y = rect.bottom; }
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
    }
    owner = undefined;
  };
  const paint = () => {
    if (!owner?.isConnected || owner.closest('[hidden],[inert]')) { hide(); return; }
    const content = contents.get(owner) ?? { body: legacyTitles.get(owner) ?? '' };
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
    width = tip.offsetWidth; height = tip.offsetHeight; position();
  };
  const ownsFocus = () => !!owner && (document.activeElement === owner || !!document.activeElement && owner.contains(document.activeElement));
  const remember = (element: Element, title: string) => {
    if (contents.has(element)) return;
    if (legacyTitles.get(element) === title) return;
    if (title) {
      legacyTitles.set(element, title); element.setAttribute('data-tooltip', '');
    } else {
      legacyTitles.delete(element); element.removeAttribute('data-tooltip');
    }
    if (element === owner && !tip.hidden) paint();
  };
  const consumeTitle = (element: Element) => {
    if (!element.hasAttribute('title')) return;
    const title = element.getAttribute('title') ?? '';
    element.removeAttribute('title'); remember(element, title);
  };
  const consumeSvgTitle = (element: Element) => {
    if (element.localName !== 'title' || element.namespaceURI !== 'http://www.w3.org/2000/svg') return;
    const parent = element.parentElement, title = element.textContent ?? '';
    if (!parent || !title) return;
    // Keep the title node: the globe caches it and updates its text later.
    // Its accessible name moves to the owning shape, without a native popup.
    const previous = svgLabels.get(parent);
    if (!parent.hasAttribute('aria-label') || parent.getAttribute('aria-label') === previous) {
      parent.setAttribute('aria-label', title); svgLabels.set(parent, title);
    }
    element.textContent = ''; remember(parent, title);
  };
  const consumeTree = (element: Element) => {
    if (element === tip || tip.contains(element)) return;
    consumeTitle(element); consumeSvgTitle(element);
    for (const child of element.querySelectorAll('[title],svg title')) {
      consumeTitle(child); consumeSvgTitle(child);
    }
  };
  // Observe only title writes and inserted subtrees. Quantity/text updates do
  // not cause whole-document scans; no observer or DOM search runs per frame.
  const observer = new MutationObserver(records => {
    const roots = new Set<Element>(), titles = new Set<Element>();
    for (const record of records) {
      if (tip.contains(record.target)) continue;
      if (record.type === 'attributes' && record.target instanceof Element) titles.add(record.target);
      else if (record.type === 'characterData') {
        if (record.target.parentElement) consumeSvgTitle(record.target.parentElement);
      } else {
        if (record.target instanceof Element) consumeSvgTitle(record.target);
        for (const node of record.addedNodes) if (node instanceof Element) roots.add(node);
      }
    }
    for (const element of titles) if (host.contains(element)) consumeTitle(element);
    for (const element of roots) {
      if (!host.contains(element)) continue;
      let ancestor = element.parentElement;
      while (ancestor && !roots.has(ancestor)) ancestor = ancestor.parentElement;
      if (!ancestor) consumeTree(element);
    }
    if (owner && !owner.isConnected) hide();
  });
  consumeTree(host);
  observer.observe(host, { subtree: true, childList: true, attributes: true, attributeFilter: ['title'], characterData: true });
  const enter = (target: EventTarget | null, focused: boolean) => {
    // Also consume synchronously when a producer changes title and dispatches
    // pointerover in the same task, before the observer microtask can run.
    if (target instanceof Element && host.contains(target)) {
      for (let element: Element | null = target; element; element = element.parentElement) {
        consumeTitle(element); if (element === host) break;
      }
    }
    const next = target instanceof Element ? target.closest('[data-tooltip]') : null;
    if (!next || !host.contains(next)) { hide(); return; }
    if (next === owner) {
      if (focused && !keyboard) { keyboard = true; clearTimeout(timer); timer = setTimeout(paint, 0); }
      return;
    }
    hide(); owner = next; keyboard = focused;
    timer = setTimeout(paint, focused ? 0 : tooltipPointerDelay(next));
  };
  const over = (event: PointerEvent) => {
    // Focus owns a keyboard explanation until blur, Escape or pointerdown.
    // Scrolling/reparenting a modal tooltip can move the pointer's hit target.
    if (keyboard && ownsFocus()) return;
    x = event.clientX; y = event.clientY; enter(event.target, false);
  };
  const move = (event: PointerEvent) => {
    x = event.clientX; y = event.clientY;
    if (!tip.hidden && !keyboard && !frame) frame = requestAnimationFrame(position);
  };
  const out = (event: PointerEvent) => {
    if (keyboard && ownsFocus()) return;
    if (owner && (!(event.relatedTarget instanceof Node) || !owner.contains(event.relatedTarget))) hide();
  };
  const scroll = () => {
    // Native focus may scroll a dialog after focusin and the first paint.
    // Keep the explanation attached to that focused target at its new place.
    if (keyboard && ownsFocus()) {
      if (!tip.hidden && !frame) frame = requestAnimationFrame(position);
      return;
    }
    hide();
  };
  const focus = (event: FocusEvent) => {
    // A clicked summary gains focus too; only keyboard/programmatic focus
    // should bypass the hover delay or own subsequent pointer explanations.
    const clicked = event.target instanceof Node && pointerFocus && event.target.contains(pointerFocus);
    enter(event.target, !clicked);
  };
  const down = (event: PointerEvent) => { pointerFocus = event.target instanceof Node ? event.target : undefined; hide(); };
  const release = () => { pointerFocus = undefined; };
  const key = (event: KeyboardEvent) => { if (event.key === 'Escape'&&!tip.hidden) { event.preventDefault();event.stopPropagation();hide(); } };
  host.addEventListener('pointerover', over); host.addEventListener('pointermove', move);
  host.addEventListener('pointerout', out); host.addEventListener('focusin', focus);
  host.addEventListener('focusout', hide); host.addEventListener('pointerdown', down);
  document.addEventListener('pointerup', release, true); document.addEventListener('pointercancel', release, true);
  document.addEventListener('scroll', scroll, true); document.addEventListener('keydown', key);
  window.addEventListener('resize', hide);
  refreshActive = element => { if (element === owner && !tip.hidden) paint(); };
  dismissActive = hide;
  return () => {
    observer.disconnect();
    hide(); tip.remove(); refreshActive = undefined; dismissActive = undefined;
    host.removeEventListener('pointerover', over); host.removeEventListener('pointermove', move);
    host.removeEventListener('pointerout', out); host.removeEventListener('focusin', focus);
    host.removeEventListener('focusout', hide); host.removeEventListener('pointerdown', down);
    document.removeEventListener('pointerup', release, true); document.removeEventListener('pointercancel', release, true);
    document.removeEventListener('scroll', scroll, true); document.removeEventListener('keydown', key);
    window.removeEventListener('resize', hide);
  };
}
