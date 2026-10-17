import {validMineableOwner256} from '../sim/local-mineable-save-256.ts';
import type { Terrain, Tile } from '../sim/types.ts';

export type TileDelta = [number, Terrain, Tile['stone']?, Tile['miningDamage']?, Tile['ore']?, Tile['floor']?, Tile['miningYield']?, Tile['snowDepth']?, Tile['bridge']?,Tile['collapsedRock']?,Tile['fogged']?,Tile['mineable']?];
type TileValue = Terrain | Tile['stone'] | Tile['miningDamage'] | Tile['ore'] | Tile['floor'];

function fogPresence(tile:Tile):0|1 {
 const d=Object.getOwnPropertyDescriptor(tile,'fogged');
 if(!d){if('fogged' in tile)throw Error('Inherited fog field');return 0;}
 if(!Object.hasOwn(d,'value')||d.enumerable!==true||d.value!==true)throw Error('Invalid actual fog field');
 return 1;
}

/** Copied primitives only: every field is compared even at the same tick.
 * Keep the five common fields packed; sparse ore contributions do not add a
 * sixth slot to every ground cell. Both stores own immutable primitives. */
export class TileSnapshotCache {
  private values: TileValue[] = [];
  // Copied presence stamp, never a mutable Tile witness.
  private fogged=new Uint8Array(0);
  private miningYields = new Map<number,number>();
  private snowDepths = new Map<number,number>();
  private bridges = new Map<number,Tile['bridge']>();
  private mineables=new Map<number,readonly [number,NonNullable<Tile['mineable']>['def'],NonNullable<Tile['mineable']>['terrain']]>();
  private collapsedRocks = new Map<number,readonly [number,Terrain]>();

  reset(tiles: readonly Tile[]): void {
    const values = this.values;
    this.fogged=new Uint8Array(tiles.length);
    this.miningYields.clear();this.snowDepths.clear();this.bridges.clear();this.collapsedRocks.clear();this.mineables.clear();
    let offset = 0;
    for (let index=0;index<tiles.length;index++) {
      const tile=tiles[index]!;
      this.fogged[index]=fogPresence(tile);
      const owner=mineableValue(tile);if(owner)this.mineables.set(index,[owner.id,owner.def,owner.terrain]);
      values[offset++] = tile.terrain; values[offset++] = tile.stone;
      values[offset++] = tile.miningDamage; values[offset++] = tile.ore; values[offset++] = tile.floor;
      if(tile.miningYield!==undefined)this.miningYields.set(index,tile.miningYield);
      if(tile.snowDepth!==undefined)this.snowDepths.set(index,tile.snowDepth);
      if(Object.hasOwn(tile,'bridge'))this.bridges.set(index,tile.bridge);
      if(tile.collapsedRock)this.collapsedRocks.set(index,[tile.collapsedRock.id,tile.collapsedRock.terrain]);
    }
    values.length = offset;
  }

  diff(tiles: readonly Tile[]): TileDelta[] {
    const changes: TileDelta[] = [], previous = this.values;
    for (let index = 0, offset = 0; index < tiles.length; index++, offset += 5) {
      const fogStamp=fogPresence(tiles[index]!);
      const { terrain, stone, miningDamage: damage, ore, floor, miningYield, snowDepth, bridge, collapsedRock,fogged } = tiles[index]!;
      const mineable=mineableValue(tiles[index]!),previousMineable=this.mineables.get(index);
      const previousRock=this.collapsedRocks.get(index);
      const previousYield=ore!==undefined&&damage!==undefined?this.miningYields.get(index):undefined;
      if (previous[offset] !== terrain || previous[offset + 1] !== stone || previous[offset + 2] !== damage
        || previous[offset + 3] !== ore || previous[offset + 4] !== floor || previousYield !== miningYield || this.snowDepths.get(index)!==snowDepth || this.bridges.get(index)!==bridge||previousRock?.[0]!==collapsedRock?.id||previousRock?.[1]!==collapsedRock?.terrain||this.fogged[index]!==fogStamp||previousMineable?.[0]!==mineable?.id||previousMineable?.[1]!==mineable?.def||previousMineable?.[2]!==mineable?.terrain) {
        changes.push(mineable?[index,terrain,stone,damage,ore,floor,miningYield,snowDepth,bridge,collapsedRock?{id:collapsedRock.id,terrain:collapsedRock.terrain}:undefined,fogged,{id:mineable.id,def:mineable.def,terrain:mineable.terrain}]:fogStamp?[index,terrain,stone,damage,ore,floor,miningYield,snowDepth,bridge,collapsedRock?{id:collapsedRock.id,terrain:collapsedRock.terrain}:undefined,fogged]:collapsedRock!==undefined?[index,terrain,stone,damage,ore,floor,miningYield,snowDepth,bridge,{id:collapsedRock.id,terrain:collapsedRock.terrain}]:bridge!==undefined?[index,terrain,stone,damage,ore,floor,miningYield,snowDepth,bridge]:snowDepth!==undefined?[index,terrain,stone,damage,ore,floor,miningYield,snowDepth]:miningYield !== undefined ? [index, terrain, stone, damage, ore, floor, miningYield]
          : floor !== undefined ? [index, terrain, stone, damage, ore, floor]
          : ore !== undefined ? [index, terrain, stone, damage, ore]
          : damage !== undefined ? [index, terrain, stone, damage]
          : stone === undefined ? [index, terrain] : [index, terrain, stone]);
        this.fogged[index]=fogStamp;
        if(mineable)this.mineables.set(index,[mineable.id,mineable.def,mineable.terrain]);else this.mineables.delete(index);
        previous[offset] = terrain; previous[offset + 1] = stone; previous[offset + 2] = damage;
        previous[offset + 3] = ore; previous[offset + 4] = floor;
        if(collapsedRock===undefined)this.collapsedRocks.delete(index);else this.collapsedRocks.set(index,[collapsedRock.id,collapsedRock.terrain]);
        if(bridge===undefined)this.bridges.delete(index);else this.bridges.set(index,bridge);
        if(snowDepth===undefined)this.snowDepths.delete(index);else this.snowDepths.set(index,snowDepth);
        if(miningYield===undefined)this.miningYields.delete(index);else this.miningYields.set(index,miningYield);
      }
    }
    return changes;
  }
}

function mineableValue(tile:Tile):Tile['mineable'] {
 const d=Object.getOwnPropertyDescriptor(tile,'mineable');if(!d){if('mineable'in tile)throw Error('Inherited Mineable owner');return;}
 if(!Object.hasOwn(d,'value')||d.enumerable!==true||!validMineableOwner256(d.value,Number.MAX_SAFE_INTEGER))throw Error('Invalid actual Mineable owner');return d.value;
}
