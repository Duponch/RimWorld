import { TICKS_PER_DAY, type World } from '../sim/types';

function timeLeft(ticks: number): string {
  const minutes = Math.ceil(Math.max(0, ticks) * 1440 / TICKS_PER_DAY);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
}

/** The storm letter observes confirmed snapshots and never changes the world. */
export function createFlashstormUI(): { update: (world: World) => void } {
  const letter = document.createElement('button');
  letter.id = 'flashstorm-letter';
  letter.className = 'arrival-letter';
  letter.type = 'button';
  const dialog = document.createElement('dialog');
  dialog.id = 'flashstorm-dialog';
  dialog.className = 'help-dialog';
  const title = document.createElement('h2');
  const body = document.createElement('p');
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Fermer';
  close.onclick = () => dialog.close();
  dialog.append(title, body, close);
  document.body.append(dialog);
  letter.onclick = () => dialog.showModal();

  return { update(world) {
    const state = world.flashstorm;
    const active = state?.active;
    const recentlyEnded = !active && state?.lastEnd !== undefined && world.tick - state.lastEnd < 600;
    if (!active && !recentlyEnded) { letter.remove(); if (dialog.open) dialog.close(); return; }
    if (active) {
      title.textContent = 'Orage sec localisé';
      letter.textContent = `Orage sec localisé · ${timeLeft(Math.floor(active.endCore / 10) + 1 - world.tick)}`;
      body.textContent = `Des éclairs peuvent frapper autour de (${active.center.x}, ${active.center.z}). Protégez le foyer avec les zones et la priorité Incendie dans Travail. L’Extinction demande aux colons de rejoindre les feux au contact. Éloignez les personnes exposées et soignez les blessés. Une frappe ne garantit pas un incendie. La pluie déjà en transition peut encore tomber et éteindre un feu ; l’orage ne la supprime pas instantanément. ${active.strikes} frappe(s) confirmée(s).`;
    } else {
      title.textContent = 'Fin de l’orage sec localisé';
      letter.textContent = 'Orage sec localisé terminé';
      body.textContent = `La condition est terminée depuis ${timeLeft(world.tick - state!.lastEnd!)}. Les incendies et les blessés éventuels restent à traiter par les zones, l’Extinction au contact et les soins. La fin de l’orage ne termine pas les incendies.`;
    }
    const alerts = document.getElementById('alerts');
    if (alerts && letter.parentElement !== alerts) alerts.append(letter);
  } };
}
