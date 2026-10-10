type ScrollExtent = Pick<HTMLElement, 'clientWidth' | 'clientHeight' | 'scrollWidth' | 'scrollHeight'>;
type ScrollOverflow = Pick<CSSStyleDeclaration, 'overflowX' | 'overflowY'>;

/** Keep the wheel in a real scroll region, including at either end of its
 * contents. An overflow:auto wrapper whose contents fit is ordinary UI. */
export function isWheelScrollRegion(element: ScrollExtent, style: ScrollOverflow): boolean {
  const scrolls = (overflow: string): boolean => /^(auto|scroll|overlay)$/.test(overflow);
  return (scrolls(style.overflowY) && element.scrollHeight > element.clientHeight)
    || (scrolls(style.overflowX) && element.scrollWidth > element.clientWidth);
}

function hasScrollableAncestor(target: Element, root: HTMLElement): boolean {
  for (let element: Element | null = target; element; element = element.parentElement) {
    if (isWheelScrollRegion(element, getComputedStyle(element))) return true;
    if (element === root) break;
  }
  return false;
}

/** UI sits above the canvas, but it must not introduce a second zoom policy.
 * Forward only UI wheel gestures through the same OrbitControls listener as
 * the map. A non-bubbling event targeted at the canvas cannot be forwarded a
 * second time; the original is consumed only when the controls accept it. */
export function installMapWheelZoom(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  canZoom: () => boolean,
): () => void {
  const wheel = (event: WheelEvent): void => {
    if (event.target === canvas || event.defaultPrevented || !canZoom()) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target || !root.contains(target) || hasScrollableAncestor(target, root)) return;
    const forwarded = new WheelEvent('wheel', {
      bubbles: false, cancelable: true,
      deltaX: event.deltaX, deltaY: event.deltaY, deltaZ: event.deltaZ, deltaMode: event.deltaMode,
      clientX: event.clientX, clientY: event.clientY,
      screenX: event.screenX, screenY: event.screenY,
      ctrlKey: event.ctrlKey, shiftKey: event.shiftKey, altKey: event.altKey, metaKey: event.metaKey,
    });
    if (!canvas.dispatchEvent(forwarded)) event.preventDefault();
  };
  root.addEventListener('wheel', wheel, { capture: true, passive: false });
  return () => root.removeEventListener('wheel', wheel, true);
}
