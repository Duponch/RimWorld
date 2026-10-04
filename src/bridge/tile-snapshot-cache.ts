import type { Terrain, Tile } from '../sim/types.ts';

export type TileDelta = [number, Terrain, Tile['stone']?, Tile['miningDamage']?, Tile['ore']?, Tile['floor']?, Tile['miningYield']?];
type TileValue = Terrain | Tile['stone'] | Tile['miningDamage'] | Tile['ore'] | Tile['floor'];

/** Copied primitives only: every field is compared even at the same tick.
 * Keep the five common fields packed; sparse ore contributions do not add a
 * sixth slot to every ground cell. Both stores own immutable primitives. */
export class TileSnapshotCache {
  private values: TileValue[] = [];
  private miningYields = new Map<number,number>();

  reset(tiles: readonly Tile[]): void {
    const values = this.values;
    this.miningYields.clear();
    let offset = 0;
    for (let index=0;index<tiles.length;index++) {
      const tile=tiles[index]!;
      values[offset++] = tile.terrain; values[offset++] = tile.stone;
      values[offset++] = tile.miningDamage; values[offset++] = tile.ore; values[offset++] = tile.floor;
      if(tile.miningYield!==undefined)this.miningYields.set(index,tile.miningYield);
    }
    values.length = offset;
  }

  diff(tiles: readonly Tile[]): TileDelta[] {
    const changes: TileDelta[] = [], previous = this.values;
    for (let index = 0, offset = 0; index < tiles.length; index++, offset += 5) {
      const { terrain, stone, miningDamage: damage, ore, floor, miningYield } = tiles[index]!;
      const previousYield=ore!==undefined&&damage!==undefined?this.miningYields.get(index):undefined;
      if (previous[offset] !== terrain || previous[offset + 1] !== stone || previous[offset + 2] !== damage
        || previous[offset + 3] !== ore || previous[offset + 4] !== floor || previousYield !== miningYield) {
        changes.push(miningYield !== undefined ? [index, terrain, stone, damage, ore, floor, miningYield]
          : floor !== undefined ? [index, terrain, stone, damage, ore, floor]
          : ore !== undefined ? [index, terrain, stone, damage, ore]
          : damage !== undefined ? [index, terrain, stone, damage]
          : stone === undefined ? [index, terrain] : [index, terrain, stone]);
        previous[offset] = terrain; previous[offset + 1] = stone; previous[offset + 2] = damage;
        previous[offset + 3] = ore; previous[offset + 4] = floor;
        if(miningYield===undefined)this.miningYields.delete(index);else this.miningYields.set(index,miningYield);
      }
    }
    return changes;
  }
}
