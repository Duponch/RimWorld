import { RoomTopologyCache } from '../sim/room-topology';
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
    const room = this.topology.read(world).at(cell.x, cell.z);
    const text = !room ? '' : room.kind === 'solid' ? 'Paroi · délimite les pièces.'
      : room.kind === 'doorway' ? 'Seuil · sépare les pièces, même porte ouverte.'
      : room.touchesMapEdge ? 'Extérieur · espace ouvert vers le bord de la carte.'
      : `Pièce non couverte · ${room.cellCount} case${room.cellCount > 1 ? 's' : ''}.`;
    if (line.textContent !== text) line.textContent = text;
    line.hidden = !text;
  }
}
