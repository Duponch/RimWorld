import {activeVitalsMonitor,linkedVitalsMonitor} from '../sim/vitals-monitor';
import {isPowerActive} from '../sim/power-rules';
import type {Structure,World} from '../sim/types';

export function vitalsMonitorInspection(world:World,structure:Structure):string {
  if(structure.kind==='hospital-bed'){
    const monitor=linkedVitalsMonitor(world,structure);
    return monitor?` · Moniteur vital lié : ${activeVitalsMonitor(world,structure)?'actif (+7 points de soins, +2 points d’immunité, +0,05 en chirurgie)':'hors service (aucun bonus)'}`:' · Aucun moniteur vital lié';
  }
  if(structure.kind!=='vitals-monitor')return '';
  const beds=world.structures.filter(s=>s.kind==='hospital-bed'&&linkedVitalsMonitor(world,s)?.id===structure.id).length;
  return ` · ${beds} lit(s) d’hôpital lié(s) · ${isPowerActive(structure)?'Actif':'Hors service'} · Bonus pendant l’utilisation réelle du lit : soins +7 points, immunité +2 points, chirurgie +0,05 · Plusieurs moniteurs ne cumulent pas leurs bonus`;
}
