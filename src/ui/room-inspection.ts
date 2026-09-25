import { WorkEnvironmentCache, ROOM_ROLE_LABEL } from '../sim/work-environment';
import { cookingSpot } from '../sim/cooking-bills';
import { footprintCells } from '../sim/definitions';
import { isRoofed, roofIndex } from '../sim/roof-rules';
import type { Cell, World } from '../sim/types';
import { TemperatureView } from '../sim/temperature';
import { roomCleanliness } from '../sim/filth';

/** One cache per inspector owner, refreshed on snapshots/selection, never RAF. */
export class RoomInspection {
  private readonly environment = new WorkEnvironmentCache();

  update(panel: HTMLElement, world: World, cell: Cell): void {
    if (panel.hidden) return;
    let line = panel.querySelector<HTMLElement>('#room-description');
    if (!line) {
      line = document.createElement('p'); line.id = 'room-description'; line.className = 'muted';
      // Keep habitat information near the selected object's description.
      if(panel.classList.contains('cell-inspector-host')){
        const details=document.createElement('details');details.className='cell-environment';
        const summary=document.createElement('summary');summary.textContent='Environnement';details.append(summary,line);
        panel.querySelector('#cell-description')?.after(details);
      }else (panel.querySelector('#selected-action') ?? panel.lastElementChild)?.after(line);
    }
    const environment=this.environment.read(world),room = environment.topology.at(cell.x, cell.z);
    const properties=environment.room(cell),covered=properties?.covered??0;
    let text = !room ? '' : room.kind === 'solid' ? 'Paroi · délimite les pièces.'
      : room.kind === 'doorway' ? 'Seuil · sépare les pièces, même porte ouverte.'
      : room.touchesMapEdge ? 'Extérieur · espace ouvert vers le bord de la carte.'
      : covered?`Pièce ${covered===room.cellCount?'couverte':'partiellement couverte'} · ${covered} / ${room.cellCount} cases.`
      : `Pièce non couverte · ${room.cellCount} case${room.cellCount > 1 ? 's' : ''}.`;
    const i=roofIndex(world,cell);
    if(room&&room.kind!=='solid')text+=` Température : ${new TemperatureView(world).at(world,cell).toFixed(1)} °C.`;
    if(isRoofed(world,i))text+=' Toit construit sur cette case.';
    if(world.roofing?.remove.includes(i))text+=' Zone : retirer le toit.';
    else if(world.roofing?.build.includes(i))text+=' Zone : construire un toit.';
    if(properties&&properties.role!=='none')text+=` ${ROOM_ROLE_LABEL[properties.role]}.`;
    const cleanliness=roomCleanliness(world,cell);
    text+=cleanliness===null?' Propreté : pas de score de pièce.':` Propreté : ${cleanliness.toFixed(2)}.`;
    text+=` Lumière : ${Math.round(environment.lightAt(cell)*100)} %.`;
    text+=` Vitesse de travail et de marche : ${Math.round(environment.speedAt(cell)*100)} % (effet de la lumière sur cette case).`;
    const station=world.structures.find(s=>(s.kind==='machining-table'||s.kind==='stonecutter'||s.kind==='campfire'||s.kind==='fueled-stove'||s.kind==='electric-stove'||s.kind==='butcher-table')&&footprintCells(s).some(c=>c.x===cell.x&&c.z===cell.z));
    if(station){const f=environment.production(station,cookingSpot(station));
      text+=` Production : ${Math.round(f.total*100)} % · lumière à la place ${Math.round(f.light*100)} %`;
      if(f.outdoors<1)text+=' · extérieur ×80 %';
      if(f.roomRole<1)text+=station.kind==='fueled-stove'||station.kind==='electric-stove'?' · hors cuisine ×80 %':' · hors atelier ×80 %';
      if(f.station<1)text+=' · feu ×50 %';
      if(f.lighting<1)text+=` · obscurité ×${Math.round(f.lighting*100)} %`;
      text+='.';
    }
    if (line.dataset.copy !== text) {
      line.dataset.copy=text;
      line.replaceChildren(...text.split(/ (?=Température :|Propreté :|Lumière :|Vitesse de travail|Production :|Toit construit|Zone :)/).map(part=>{
        const item=document.createElement('span');item.className='room-fact';
        const separator=part.indexOf(' : ');
        if(separator>0){const label=document.createElement('span');label.textContent=part.slice(0,separator+3);const value=document.createElement('strong');value.textContent=part.slice(separator+3);item.append(label,value);}
        else item.textContent=part;
        return item;
      }));
    }
    line.hidden = !text;
  }
}
