import { ORE_DEFINITIONS } from '../sim/ore';
import { ITEM_DEFINITIONS } from '../sim/items';
import { rockMaxHP } from '../sim/mining-rules';
import { STONE_LABELS } from '../sim/geology';
import type { Resource, Tile } from '../sim/types';

export function rockInspection(tile: Tile, resource?: Resource): { title: string; description: string } | null {
  if (resource?.kind === 'rock') return {
    title: resource.stone ? `Rochers · ${STONE_LABELS[resource.stone]}` : 'Rochers · type historique non défini',
    description: 'Pierres au sol encore non transportables. La quantité de matériau exploitable n’est pas encore définie.',
  };
  if (resource || tile.terrain !== 'rock' && tile.terrain !== 'rough-stone') return null;
  if(tile.terrain==='rough-stone')return {title:`Sol rocheux brut${tile.stone?' · '+STONE_LABELS[tile.stone]:''}`,description:'Sol non fertile. Peut être construit ; le lissage reste à venir.'};
  if(tile.ore){const ore=ORE_DEFINITIONS[tile.ore];return {title:ore.label,description:`${rockMaxHP(tile)-(tile.miningDamage??0)} / ${rockMaxHP(tile)} PV. Extraction : ${ore.yield} ${ITEM_DEFINITIONS[ore.item].label.toLowerCase()} à rendement neutre, déposés sur le sol découvert.`};}
  return {
    title: tile.stone ? `Massif · ${STONE_LABELS[tile.stone]}` : 'Massif rocheux · type historique non défini',
    description: `Roche : ${rockMaxHP(tile)-(tile.miningDamage??0)} / ${rockMaxHP(tile)} PV. Miner révèle le sol rocheux ; 25 % de chance de laisser un fragment.`,
  };
}
