import { activeColdSnap, coldSnapOffset } from '../sim/cold-snap';
import { activeEclipse } from '../sim/eclipse';
import { TICKS_PER_DAY, type World } from '../sim/types';

type WeatherWorld = Pick<World, 'tick' | 'miscIncidents'>;
export interface WeatherConditionInspection {
  kind: 'cold-snap' | 'eclipse';
  title: string;
  summary: string;
  body: string;
}
function remainingTime(ticks: number): string {
  const minutes = Math.ceil(Math.max(0, ticks) * 1440 / TICKS_PER_DAY);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
}

/** Conditions and remaining duration come only from the confirmed snapshot. */
export function weatherConditionInspection(world: WeatherWorld): WeatherConditionInspection[] {
  const conditions: WeatherConditionInspection[] = [];
  const cold = activeColdSnap(world);
  if (cold) {
    const offset = coldSnapOffset(world).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    conditions.push({
      kind: 'cold-snap', title: 'Vague de froid',
      summary: `Vague de froid · ${offset} °C · reste ${remainingTime(cold.end - world.tick)}`,
      body: `La vague de froid modifie actuellement la température extérieure de ${offset} °C. Les pièces se refroidissent progressivement. Préparez un refuge fermé et chauffé, du combustible ou une alimentation électrique, et des vêtements adaptés. Un toit seul ne chauffe pas une pièce. Portez les personnes à terre vers un lit au chaud et surveillez l’hypothermie : les pansements ne remplacent pas le réchauffement. Protégez les cultures par une température et une lumière suffisantes ; une lampe horticole ne garantit pas à elle seule leur survie. La fin de la vague ne guérit pas les personnes et ne rend pas les plantes perdues.`,
    });
  }
  const eclipse = activeEclipse(world);
  if (eclipse) conditions.push({
    kind: 'eclipse', title: 'Éclipse',
    summary: `Éclipse · reste ${remainingTime(eclipse.end - world.tick)}`,
    body: 'La lumière naturelle diminue et la production des panneaux solaires est réduite. Vérifiez les réserves des batteries, le combustible des générateurs et l’alimentation réelle des chauffages, du froid et des ateliers. Les appareils électriques ne sont pas directement neutralisés par une éclipse. Les plantes ont toujours besoin de lumière et d’une température favorable ; les lampes horticoles peuvent les éclairer si elles sont alimentées et dans leur horaire de fonctionnement. L’éclipse ne change pas l’heure et ne protège ni du froid ni des blessures. Une reprise du soleil ne répare pas les pertes déjà subies.',
  });
  return conditions;
}

export function weatherConditionLabel(world: WeatherWorld): string {
  return [activeColdSnap(world) ? 'Vague de froid' : '', activeEclipse(world) ? 'Éclipse' : ''].filter(Boolean).join(' · ');
}

/** Informational letters reuse the existing alerts; they issue no commands. */
export function createWeatherConditionUI(): { update: (world: World) => void } {
  const letters = new Map<WeatherConditionInspection['kind'], { button: HTMLButtonElement; dialog: HTMLDialogElement; title: HTMLElement; body: HTMLElement }>();
  for (const kind of ['cold-snap', 'eclipse'] as const) {
    const button = document.createElement('button'); button.type = 'button'; button.id = `${kind}-letter`; button.className = 'arrival-letter';
    const dialog = document.createElement('dialog'); dialog.id = `${kind}-dialog`; dialog.className = 'help-dialog';
    const title = document.createElement('h2'), body = document.createElement('p'), close = document.createElement('button');
    title.id = `${kind}-title`; dialog.setAttribute('aria-labelledby', title.id);
    close.type = 'button'; close.textContent = 'Fermer'; close.onclick = () => dialog.close();
    dialog.append(title, body, close); document.body.append(dialog); button.onclick = () => dialog.showModal();
    letters.set(kind, { button, dialog, title, body });
  }
  return { update(world) {
    const conditions = weatherConditionInspection(world);
    for (const [kind, letter] of letters) {
      const condition = conditions.find(row => row.kind === kind);
      if (!condition) { letter.button.remove(); if (letter.dialog.open) letter.dialog.close(); continue; }
      letter.button.textContent = condition.summary; letter.title.textContent = condition.title; letter.body.textContent = condition.body;
      const alerts = document.getElementById('alerts');
      if (alerts && letter.button.parentElement !== alerts) alerts.append(letter.button);
    }
  } };
}
