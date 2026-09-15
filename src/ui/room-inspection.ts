import { RoomTopologyCache } from '../sim/room-topology';
import { isRoofed, roofIndex } from '../sim/roof-rules';
import type { Cell, World } from '../sim/types';

/** One cache per inspector owner, refreshed on snapshots/selection, never RAF. */
export class RoomInspection {
  private readonly topology = new RoomTopologyCache();

  update(panel: HTMLElement, world: World, cell: Cell): void {
    if (panel.hidden) return;
    let line = panel.querySelector<HTMLElement>('#room-description');
    if (!line) {
      line = document.createElement('p'); line.id = 'room-description'; line.className = 'muted';
      // Keep habitat information near the selected object's description.
      (panel.querySelector('#cell-description, #selected-action') ?? panel.lastElementChild)?.after(line);
    }
    const topology=this.topology.read(world),room = topology.at(cell.x, cell.z);
    const covered=room?.kind==='space'?(world.roofing?.constructed??[]).reduce((n,i)=>n+(topology.at(i%world.width,Math.floor(i/world.width))===room?1:0),0):0;
    let text = !room ? '' : room.kind === 'solid' ? 'Paroi · délimite les pièces.'
      : room.kind === 'doorway' ? 'Seuil · sépare les pièces, même porte ouverte.'
      : room.touchesMapEdge ? 'Extérieur · espace ouvert vers le bord de la carte.'
      : covered?`Pièce ${covered===room.cellCount?'couverte':'partiellement couverte'} · ${covered} / ${room.cellCount} cases.`
      : `Pièce non couverte · ${room.cellCount} case${room.cellCount > 1 ? 's' : ''}.`;
    const i=roofIndex(world,cell);
    if(isRoofed(world,i))text+=' Toit construit sur cette case.';
    if(world.roofing?.remove.includes(i))text+=' Zone : retirer le toit.';
    else if(world.roofing?.build.includes(i))text+=' Zone : construire un toit.';
    if (line.textContent !== text) line.textContent = text;
    line.hidden = !text;
  }
}
