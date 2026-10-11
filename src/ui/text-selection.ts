import './text-selection.css';

/** Only editable text controls own selection. Buttons, gauges and scene/HUD
 * labels keep their normal clicks, focus, pointer gestures and keyboard use. */
export function allowsTextSelection(target: EventTarget | null): boolean {
  const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  const editable = element?.closest('input,textarea,[contenteditable]');
  if (editable instanceof HTMLInputElement) {
    return !editable.disabled && !editable.readOnly && ['text', 'search', 'email', 'password', 'tel', 'url', 'number'].includes(editable.type);
  }
  if (editable instanceof HTMLTextAreaElement) return !editable.disabled && !editable.readOnly;
  return editable instanceof HTMLElement && editable.isContentEditable;
}

export function installTextSelectionGuard(host: HTMLElement): () => void {
  const previous = host.classList.contains('game-text-selection-guard');
  host.classList.add('game-text-selection-guard');
  const start = (event: Event) => { if (!allowsTextSelection(event.target)) event.preventDefault(); };
  const key = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a' && !allowsTextSelection(event.target)) event.preventDefault();
  };
  host.addEventListener('selectstart', start, true);
  host.addEventListener('keydown', key, true);
  return () => {
    host.removeEventListener('selectstart', start, true); host.removeEventListener('keydown', key, true);
    if (!previous) host.classList.remove('game-text-selection-guard');
  };
}
