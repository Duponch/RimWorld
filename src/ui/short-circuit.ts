import { TICKS_PER_DAY, type World } from '../sim/types';

type ShortCircuitWorld = Pick<World, 'tick' | 'miscIncidents'>;
export interface ShortCircuitInspection { title: string; summary: string; body: string }
function elapsedTime(ticks: number): string {
  if (ticks === 0) return 'à l’instant';
  const minutes = Math.ceil(ticks * 1440 / TICKS_PER_DAY);
  return minutes < 60 ? `il y a ${minutes} min` : `il y a ${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
}
const numberLabel = (value: number): string => value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

/** Historical contact only: no prediction of ongoing fire, damage or supply. */
export function shortCircuitInspection(world: ShortCircuitWorld): ShortCircuitInspection | undefined {
  const last = world.miscIncidents?.shortCircuits?.last;
  if (!last || last.at > world.tick) return;
  const location = `(${last.center.x}, ${last.center.z})`, age = elapsedTime(world.tick - last.at);
  const consequences = last.outcome === 'discharge'
    ? `${numberLabel(last.energyWd)} W·j ont été retirés des batteries du réseau touché. Les batteries isolées sur un autre réseau n’ont pas été vidées par cette décharge. Une explosion incendiaire de rayon ${numberLabel(last.flameRadius)} a été déclenchée${last.bombRadius !== undefined && last.bombRadius > 0 ? `, suivie d’une explosion de souffle de rayon ${numberLabel(last.bombRadius)}` : ''}.`
    : `Aucune décharge des batteries n’a été imposée. ${last.ignited ? 'Un petit feu s’est allumé près du conduit.' : 'L’allumage local n’a pas créé de feu.'} Vérifiez les lieux plutôt que de supposer le réseau vidé.`;
  return {
    title: 'Zzztt… Court-circuit',
    summary: `Court-circuit · ${last.outcome === 'discharge' ? 'Décharge du réseau' : last.ignited ? 'Départ de feu' : 'Sans départ de feu'} · ${age}`,
    body: `Dernier court-circuit confirmé ${location}, ${age}. ${consequences} Les incendies, blessures et dégâts éventuels restent à traiter après le passage des ondes. Éloignez les personnes exposées, éteignez les feux au contact, refroidissez les pièces surchauffées, soignez les blessés et réparez ou reconstruisez les appareils endommagés. Vérifiez le combustible, la production et la recharge des batteries. Il n’y a pas de durée fixe de coupure : l’alimentation dépend du réseau et de ses réserves réelles. Pour protéger une réserve, isolez son réseau avec un interrupteur réellement ouvert par un colon ; une demande d’arrêt seule ne coupe pas la liaison. Fermer cette information ne supprime aucune conséquence.`,
  };
}

/** One informational letter for the latest incident, using the ordinary HUD. */
export function createShortCircuitUI(): { update: (world: World) => void } {
  const letter = document.createElement('button'); letter.type = 'button'; letter.id = 'short-circuit-letter'; letter.className = 'arrival-letter';
  const dialog = document.createElement('dialog'); dialog.id = 'short-circuit-dialog'; dialog.className = 'help-dialog';
  const title = document.createElement('h2'), body = document.createElement('p'), close = document.createElement('button');
  title.id = 'short-circuit-title'; dialog.setAttribute('aria-labelledby', title.id);
  close.type = 'button'; close.textContent = 'Fermer'; close.onclick = () => dialog.close();
  dialog.append(title, body, close); document.body.append(dialog); letter.onclick = () => dialog.showModal();
  return { update(world) {
    const inspection = shortCircuitInspection(world);
    if (!inspection) { letter.remove(); if (dialog.open) dialog.close(); return; }
    title.textContent = inspection.title; body.textContent = inspection.body; letter.textContent = inspection.summary;
    const alerts = document.getElementById('alerts');
    if (alerts && letter.parentElement !== alerts) alerts.append(letter);
  } };
}
