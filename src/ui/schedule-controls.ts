import { calendarTick } from '../sim/calendar';
import { isColonist } from '../sim/affiliation';
import { hourOfDay, type ScheduleAssignment, type ScheduleCommand } from '../sim/schedule';
import type { World } from '../sim/types';
import './management-panels.css';

const labels: Record<ScheduleAssignment, string> = {anything: 'Libre', work: 'Travail', sleep: 'Sommeil', recreation: 'Loisirs'};
const symbols: Record<ScheduleAssignment, string> = {anything: '·', work: 'T', sleep: 'Z', recreation: 'L'};

export function scheduleLayout(): string {
  return `<section id="schedule-panel" class="management-panel schedule-panel panel" aria-label="Horaires" hidden>
    <div class="panel-heading"><h2>Horaires</h2><button data-close-panel aria-label="Fermer Horaires">×</button></div>
    <div class="schedule-brushes" aria-label="Activité à peindre">${Object.entries(labels).map(([id, label]) => `<button data-schedule-brush="${id}" aria-pressed="${id === 'anything'}">${label}</button>`).join('')}
    </div>
    <p>Choisir une activité puis cliquer ou glisser sur les heures. Libre : le colon gère ses besoins et son travail. Le sommeil exige un couchage accessible ; le travail permet toujours de manger.</p>
    <div class="schedule-table-wrap"><table class="schedule-table"><thead><tr><th scope="col">Colon</th>${Array.from({length: 24}, (_, h) => `<th scope="col" data-clock-hour="${h}">${h}</th>`).join('')}<th scope="col">Copie</th></tr></thead><tbody id="schedule-rows"></tbody></table></div>
    <p class="muted" id="schedule-profile"></p><p class="muted">La plage indique une priorité, pas un ordre instantané. Tab parcourt les cases, Entrée ou Espace peint ; Échap annule le tracé. Loisirs favorise les activités accessibles sous 95 % de satisfaction ; Libre sous 35 %. Répéter la même famille crée de la lassitude.</p>
  </section>`;
}

/** Retain buttons across snapshots so focus/drag survive worker updates. */
export function createScheduleControls(root: HTMLElement, send: (command: ScheduleCommand) => Promise<unknown>) {
  let world: World | undefined, identity = '', brush: ScheduleAssignment = 'anything', hour = -1, pending = false;
  let clipboard: ScheduleAssignment[] | null = null;
  let drag: {pawnId: number; from: number; to: number; pointerId: number; assignment: ScheduleAssignment} | null = null;
  const rows = new Map<number, {element: HTMLTableRowElement; cells: HTMLButtonElement[]; signature: string}>();
  const tbody = root.querySelector('tbody')!;
  const cellAt = (target: EventTarget | null): HTMLButtonElement | null => target instanceof Element ? target.closest<HTMLButtonElement>('[data-schedule-hour]') : null;

  function cancel() { drag = null; root.querySelectorAll('.paint-preview').forEach(c => c.classList.remove('paint-preview')); }
  function preview() {
    root.querySelectorAll('.paint-preview').forEach(c => c.classList.remove('paint-preview'));
    if (drag) rows.get(drag.pawnId)?.cells.forEach((c, h) => c.classList.toggle('paint-preview', h >= Math.min(drag!.from, drag!.to) && h <= Math.max(drag!.from, drag!.to)));
  }
  async function commit(command: ScheduleCommand) {
    if (pending) return;
    pending = true; root.setAttribute('aria-busy', 'true');
    try { await send(command); } finally { pending = false; root.removeAttribute('aria-busy'); }
  }
  function paintCell(cell: HTMLButtonElement) {
    void commit({type: 'schedule-paint', pawnId: Number(cell.dataset.schedulePawn), hours: [Number(cell.dataset.scheduleHour)], assignment: brush});
  }
  root.addEventListener('pointerdown', event => {
    const cell = cellAt(event.target);
    if (!cell || pending || event.button !== 0) return;
    event.preventDefault(); cell.focus(); cell.setPointerCapture(event.pointerId);
    drag = {pawnId: Number(cell.dataset.schedulePawn), from: Number(cell.dataset.scheduleHour), to: Number(cell.dataset.scheduleHour), pointerId: event.pointerId, assignment: brush}; preview();
  });
  root.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const cell = cellAt(document.elementFromPoint(event.clientX, event.clientY));
    if (cell && Number(cell.dataset.schedulePawn) === drag.pawnId) { drag.to = Number(cell.dataset.scheduleHour); preview(); }
  });
  root.addEventListener('pointerup', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const selected = drag; cancel();
    const first = Math.min(selected.from, selected.to), last = Math.max(selected.from, selected.to);
    void commit({type: 'schedule-paint', pawnId: selected.pawnId, hours: Array.from({length: last - first + 1}, (_, i) => first + i), assignment: selected.assignment});
  });
  root.addEventListener('pointercancel', cancel); window.addEventListener('blur', cancel);
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && drag) { event.preventDefault(); event.stopPropagation(); cancel(); return; }
    // Keep normal button keyboard activation and Tab traversal inside this table.
    if (event.key === 'Tab' || event.code === 'Space' || event.key === 'Enter') event.stopPropagation();
  });
  root.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
    if (!target) return;
    if (target.dataset.scheduleBrush) {
      brush = target.dataset.scheduleBrush as ScheduleAssignment;
      root.querySelectorAll<HTMLButtonElement>('[data-schedule-brush]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.scheduleBrush === brush)));
    } else if (target.dataset.scheduleCopy) {
      const pawn = world?.pawns.find(p => p.id === Number(target.dataset.scheduleCopy));
      if (pawn) { clipboard = [...pawn.schedule]; root.querySelectorAll<HTMLButtonElement>('[data-schedule-paste]').forEach(b => b.disabled = false); }
    } else if (target.dataset.schedulePaste && clipboard) {
      void commit({type: 'schedule-replace', pawnId: Number(target.dataset.schedulePaste), assignments: [...clipboard]});
    } else if (target.dataset.scheduleHour !== undefined && event.detail === 0) paintCell(target);
  });
  function update(next: World) {
    world = next;
    if (root.hidden) return;
    const signature = JSON.stringify(next.pawns.filter(isColonist).map(p => [p.id, p.name]));
    if (signature !== identity) {
      cancel(); identity = signature; rows.clear(); hour = -1;
      tbody.replaceChildren(...next.pawns.filter(isColonist).map(pawn => {
        const element = document.createElement('tr'), name = document.createElement('th'); name.scope = 'row'; name.textContent = pawn.name; element.append(name);
        const cells = Array.from({length: 24}, (_, h) => {
          const td = document.createElement('td'), button = document.createElement('button');
          button.dataset.schedulePawn = String(pawn.id); button.dataset.scheduleHour = String(h);
          td.append(button); element.append(td); return button;
        });
        const td = document.createElement('td'); td.className = 'schedule-copy'; td.setAttribute('aria-label', `Copie des horaires de ${pawn.name}`);
        for (const action of ['copy', 'paste'] as const) {
          const b = document.createElement('button'); b.dataset[action === 'copy' ? 'scheduleCopy' : 'schedulePaste'] = String(pawn.id);
          b.className = `schedule-${action}`;
          b.textContent = action === 'copy' ? 'Copier' : 'Coller'; b.setAttribute('aria-label', `${b.textContent} les horaires de ${pawn.name}`);
          b.disabled = action === 'paste' && !clipboard; td.append(b);
        }
        element.append(td); rows.set(pawn.id, {element, cells, signature: ''}); return element;
      }));
    }
    for (const pawn of next.pawns.filter(isColonist)) {
      const row = rows.get(pawn.id)!, signature = pawn.schedule.join(',');
      if (row.signature === signature) continue;
      row.signature = signature;
      pawn.schedule.forEach((assignment, h) => {
        const button = row.cells[h]!;
        button.dataset.assignment = assignment; button.textContent = symbols[assignment];
        button.setAttribute('aria-label', `${pawn.name}, ${h} h : ${labels[assignment]}`); button.title = `${h} h – ${h + 1} h : ${labels[assignment]}`;
      });
    }
    const nextHour = hourOfDay(calendarTick(next));
    if (hour !== nextHour) {
      root.querySelectorAll('.current-hour').forEach(c => c.classList.remove('current-hour'));
      root.querySelectorAll(`[data-clock-hour="${nextHour}"], [data-schedule-hour="${nextHour}"]`).forEach(c => c.classList.add('current-hour')); hour = nextHour;
    }
    root.querySelector('#schedule-profile')!.textContent = next.restRules === 'legacy'
      ? 'Sauvegarde historique : ancienne vitesse de fatigue conservée. Les horaires sont modifiables.'
      : 'Profil adulte : repos nocturne de 22 h à 6 h par défaut. Le sommeil peut continuer en plage libre jusqu’à récupération complète.';
  }
  return {update, cancel};
}
