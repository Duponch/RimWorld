import type { Pawn, World } from '../sim/types';
import { SOCIAL_LABELS } from '../sim/social-state';

export type JournalFilter = 'all' | 'social' | 'combat';
export interface JournalRow { tick: number; kind: 'social' | 'combat'; text: string }

const socialLabels = Object.values(SOCIAL_LABELS);

/** The existing bounded event log is the only source of journal entries. Do not
 * invent dialogue, blows or a durable history from transient opinion scores. */
export function pawnJournalRows(world: World, pawn: Pawn): JournalRow[] {
  const escapedName=pawn.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const named=new RegExp(`(?<![\\p{L}\\p{N}])${escapedName}(?![\\p{L}\\p{N}])`,'iu');
  return world.events.flatMap(event => {
    const text = event.message;
    if (!named.test(text)) return [];
    const lower = text.toLocaleLowerCase('fr-FR');
    const kind: JournalRow['kind'] | undefined = socialLabels.some(label => text.startsWith(`${label} entre `)) || ['a vexé', 'a insulté', 'bagarre'].some(word => lower.includes(word))
      ? 'social' : ['tir', 'touché', 'blessé', 'attaque', 'frappé', 'combat'].some(word => lower.includes(word)) ? 'combat' : undefined;
    return kind ? [{ tick: event.tick, kind, text }] : [];
  }).reverse();
}

export function createJournalInspection(panel: HTMLElement): void {
  const details = document.createElement('details');
  details.id = 'pawn-journal';
  const summary = document.createElement('summary');
  summary.textContent = 'Journal';
  const filters = document.createElement('div');
  filters.className = 'pawn-journal-filters';
  filters.setAttribute('role', 'group');
  filters.setAttribute('aria-label', 'Filtrer le journal');
  for (const [id, label] of [['all', 'Voir tout'], ['social', 'Voir social'], ['combat', 'Voir combat']] as const) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.journalFilter = id;
    button.textContent = label;
    button.setAttribute('aria-pressed', String(id === 'all'));
    button.addEventListener('click', () => {
      details.dataset.filter = id;
      for (const item of filters.querySelectorAll<HTMLButtonElement>('button')) {
        item.setAttribute('aria-pressed', String(item === button));
      }
      refreshJournalFilter(details);
    });
    filters.append(button);
  }
  const list = document.createElement('ol');
  list.id = 'pawn-journal-rows';
  const empty = document.createElement('p');
  empty.id = 'pawn-journal-empty';
  empty.textContent = 'Aucune entrée conservée.';
  const limit = document.createElement('p');
  limit.className = 'pawn-journal-limit';
  limit.textContent = 'Le journal affiche les échanges consignés dans cette partie ; l’historique ancien n’est pas conservé.';
  details.dataset.filter = 'all';
  details.append(summary, filters, list, empty, limit);
  panel.append(details);
}

function refreshJournalFilter(details: HTMLDetailsElement): void {
  const filter = details.dataset.filter as JournalFilter || 'all';
  let visible = 0;
  for (const row of details.querySelectorAll<HTMLElement>('#pawn-journal-rows > li')) {
    row.hidden = filter !== 'all' && row.dataset.kind !== filter;
    if (!row.hidden) visible++;
  }
  const empty = details.querySelector<HTMLElement>('#pawn-journal-empty');
  if (empty) empty.hidden = visible > 0;
}

export function updateJournalInspection(panel: HTMLElement, world: World, pawn: Pawn): void {
  const details = panel.querySelector<HTMLDetailsElement>('#pawn-journal');
  if (!details?.open) return;
  const rows = pawnJournalRows(world, pawn);
  const signature = JSON.stringify([pawn.id, rows]);
  const list = details.querySelector<HTMLOListElement>('#pawn-journal-rows');
  if (!list || list.dataset.signature === signature) return;
  list.dataset.signature = signature;
  list.replaceChildren(...rows.map(row => {
    const entry = document.createElement('li');
    entry.dataset.kind = row.kind;
    const icon = document.createElement('span');
    icon.className = `pawn-journal-icon pawn-journal-icon-${row.kind}`;
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.textContent = row.text;
    entry.append(icon, text);
    return entry;
  }));
  refreshJournalFilter(details);
}
