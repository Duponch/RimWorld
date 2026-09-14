import { STONE_LABELS } from '../sim/geology';
import type { Resource, Tile } from '../sim/types';

export function rockInspection(tile: Tile, resource?: Resource): { title: string; description: string } | null {
  if (resource?.kind === 'rock') return {
    title: resource.stone ? `Rochers · ${STONE_LABELS[resource.stone]}` : 'Rochers · type historique non défini',
    description: 'Pierres au sol encore non transportables. La quantité de matériau exploitable n’est pas encore définie.',
  };
  if (resource || tile.terrain !== 'rock') return null;
  return {
    title: tile.stone ? `Massif · ${STONE_LABELS[tile.stone]}` : 'Massif rocheux · type historique non défini',
    description: 'Obstacle plein de 1 × 1 case. Minage, fragments et sol rocheux découvert restent à implémenter.',
  };
}
