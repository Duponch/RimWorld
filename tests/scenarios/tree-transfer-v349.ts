import {medicalCamp} from './health';
import {prepareConstructionFlora} from './construction-flora-v348';
import {FLORA_DEFINITIONS,type PlantSpecies} from '../../src/sim/biome-flora';
import {plantGrowth} from '../../src/sim/plants';
import {refreshStock} from '../../src/sim/materials';
import {TREE_PACK_LIFETIME,type MinifiedTreePile} from '../../src/sim/tree-transfer-state';
import type {Resource,World} from '../../src/sim/types';

/** Declared feature scene, not the player's save or a natural campaign. The
 * environment and typed flora use the qualified V348 creation adapters. */
export function treeTransferScene(species:PlantSpecies|null='oak',growth=.1):World {
  const w=medicalCamp(2),worker=w.pawns[0]!,other=w.pawns[1]!;
  Object.assign(worker,{x:8,z:10,name:'Salomé'});Object.assign(other,{x:6,z:18,name:'Iris'});
  worker.priorities.gather=1;worker.priorities.grow=1;
  const def=species?FLORA_DEFINITIONS[species]:undefined;
  const resource:Resource={id:w.nextId++,kind:def?.kind??'tree',x:12,z:10,amount:def?.yield??46,...species?{species,growth,growthTick:w.tick}:{},damage:30};
  // Non-tree helper cases must stay below their own HP; grassy flora has zero
  // yield but remains a living physical resource.
  if(def&&def.hitPoints<=30)delete resource.damage;
  w.resources=[resource];if(species)prepareConstructionFlora(w);refreshStock(w);return w;
}
/** Prepared boxed state for strict save/RAW guards. It deliberately does not
 * attest a played extraction. Runtime tests produce the wrapper themselves. */
export function preparedTreeWrapper(species:PlantSpecies|null='oak',growth=.8):{w:World;pile:MinifiedTreePile;source:Resource} {
  const w=treeTransferScene(species,growth),source=w.resources[0]!;
  if(source.species){source.growth=plantGrowth(w,source);source.growthTick=w.tick;}
  const pile:MinifiedTreePile={id:w.nextId++,kind:'plant',item:'minified-tree',quantity:1,owner:{type:'ground',x:12,z:10},innerResource:source,plantPack:{packedAt:w.tick,expiresAt:w.tick+TREE_PACK_LIFETIME}};
  w.resources=[];w.piles=[pile];refreshStock(w);return {w,pile,source};
}
