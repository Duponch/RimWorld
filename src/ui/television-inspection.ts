import { televisionWatchCells,tvActive,TELEVISION_MAX_PARTICIPANTS } from '../sim/television-recreation';
import type { Structure,World } from '../sim/types';

/** Read confirmed tasks and the shared simulation rules only at inspection. */
export function televisionInspection(world:World,tv:Structure):string {
  if(tv.kind!=='tube-television')return '';
  const viewers=world.pawns.filter(p=>p.recreation.task?.activity==='watch-television'&&p.recreation.task.buildingId===tv.id);
  const active=viewers.filter(p=>p.recreation.task!.phase==='active').length;
  const geometry=televisionWatchCells(tv).length;
  return ` · Télévision · ${active} spectateur(s) sur place, ${viewers.length}/${TELEVISION_MAX_PARTICIPANTS} places réservées · ${tvActive(tv)?'Écran allumé':'Écran éteint : aucun plaisir'} · ${geometry} cases géométriques à 2–4 cases devant l’écran ; siège réel libre dans la même pièce et vue dégagée requis · aucun plaisir pendant le trajet`;
}
