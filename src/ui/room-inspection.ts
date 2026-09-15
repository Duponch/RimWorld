import { WorkEnvironmentCache, ROOM_ROLE_LABEL } from '../sim/work-environment';
import { cookingSpot } from '../sim/cooking-bills';
import { footprintCells } from '../sim/definitions';
import { isRoofed, roofIndex } from '../sim/roof-rules';
import type { Cell, World } from '../sim/types';

/** One cache per inspector owner, refreshed on snapshots/selection, never RAF. */
export class RoomInspection {
  private readonly environment = new WorkEnvironmentCache();

  update(panel: HTMLElement, world: World, cell: Cell): void {
    if (panel.hidden) return;
    let line = panel.querySelector<HTMLElement>('#room-description');
    if (!line) {
      line = document.createElement('p'); line.id = 'room-description'; line.className = 'muted';
      // Keep habitat information near the selected object's description.
      (panel.querySelector('#cell-description, #selected-action') ?? panel.lastElementChild)?.after(line);
    }
    const environment=this.environment.read(world),room = environment.topology.at(cell.x, cell.z);
    const properties=environment.room(cell),covered=properties?.covered??0;
    let text = !room ? '' : room.kind === 'solid' ? 'Paroi · délimite les pièces.'
      : room.kind === 'doorway' ? 'Seuil · sépare les pièces, même porte ouverte.'
      : room.touchesMapEdge ? 'Extérieur · espace ouvert vers le bord de la carte.'
      : covered?`Pièce ${covered===room.cellCount?'couverte':'partiellement couverte'} · ${covered} / ${room.cellCount} cases.`
      : `Pièce non couverte · ${room.cellCount} case${room.cellCount > 1 ? 's' : ''}.`;
    const i=roofIndex(world,cell);
    if(isRoofed(world,i))text+=' Toit construit sur cette case.';
    if(world.roofing?.remove.includes(i))text+=' Zone : retirer le toit.';
    else if(world.roofing?.build.includes(i))text+=' Zone : construire un toit.';
    if(properties&&properties.role!=='none')text+=` ${ROOM_ROLE_LABEL[properties.role]}.`;
    text+=` Lumière : ${Math.round(environment.lightAt(cell)*100)} %.`;
    text+=` Vitesse de travail et de marche : ${Math.round(environment.speedAt(cell)*100)} % (effet de la lumière sur cette case).`;
    const station=world.structures.find(s=>(s.kind==='stonecutter'||s.kind==='campfire')&&footprintCells(s).some(c=>c.x===cell.x&&c.z===cell.z));
    if(station){const f=environment.production(station,cookingSpot(station));
      text+=` Production : ${Math.round(f.total*100)} % · lumière à la place ${Math.round(f.light*100)} %`;
      if(f.outdoors<1)text+=' · extérieur ×80 %';
      if(f.roomRole<1)text+=' · hors atelier ×80 %';
      if(f.station<1)text+=' · feu ×50 %';
      if(f.lighting<1)text+=` · obscurité ×${Math.round(f.lighting*100)} %`;
      text+='.';
    }
    if (line.textContent !== text) line.textContent = text;
    line.hidden = !text;
  }
}
