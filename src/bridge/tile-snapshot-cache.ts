import type { Terrain, Tile } from '../sim/types.ts';

export type TileDelta = [number, Terrain, Tile['stone']?, Tile['miningDamage']?, Tile['ore']?, Tile['floor']?];
type TileValue = Terrain | Tile['stone'] | Tile['miningDamage'] | Tile['ore'] | Tile['floor'];

/** Copied primitives only: every field is compared even at the same tick.
 * Adjacent cache slots keep the five values of a cell in one packed array. */
export class TileSnapshotCache {
  private values: TileValue[] = [];

  reset(tiles: readonly Tile[]): void {
    const values = this.values;
    let offset = 0;
    for (const tile of tiles) {
      values[offset++] = tile.terrain; values[offset++] = tile.stone;
      values[offset++] = tile.miningDamage; values[offset++] = tile.ore; values[offset++] = tile.floor;
    }
    values.length = offset;
  }

  diff(tiles: readonly Tile[]): TileDelta[] {
    const changes: TileDelta[] = [], previous = this.values;
    for (let index = 0, offset = 0; index < tiles.length; index++, offset += 5) {
      const { terrain, stone, miningDamage: damage, ore, floor } = tiles[index]!;
      if (previous[offset] !== terrain || previous[offset + 1] !== stone || previous[offset + 2] !== damage
        || previous[offset + 3] !== ore || previous[offset + 4] !== floor) {
        changes.push(floor !== undefined ? [index, terrain, stone, damage, ore, floor]
          : ore !== undefined ? [index, terrain, stone, damage, ore]
          : damage !== undefined ? [index, terrain, stone, damage]
          : stone === undefined ? [index, terrain] : [index, terrain, stone]);
        previous[offset] = terrain; previous[offset + 1] = stone; previous[offset + 2] = damage;
        previous[offset + 3] = ore; previous[offset + 4] = floor;
      }
    }
    return changes;
  }
}
