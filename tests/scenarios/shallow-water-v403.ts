import {bridgeWorkshopV387} from './bridge-v387';
import {serializeWorld,validateWorld} from '../../src/sim/serialization';
/** Authored32² surface workshop. No natural pond, journey, work or hauling is
 * credited. All wet terrain is fixed before import; subsequent UI uses engine. */
export function shallowWaterWorkshopV403(){
 const f=bridgeWorkshopV387(32),world=f.world;
 if(Number(world.schemaVersion)!==254)throw Error('Adopt/freeze schema254 before this prepared workshop.');
 for(let i=0;i<world.tiles.length;i++)if(world.tiles[i]!.terrain==='marsh')world.tiles[i]={terrain:'water-shallow'};
 const deepCell={x:f.bridgeCell.x+5,z:f.bridgeCell.z+4};world.tiles[deepCell.z*world.width+deepCell.x]={terrain:'water'};
 const issues=validateWorld(world);if(issues.length)throw Error('Invalid prepared shallow input: '+issues.join('; '));
 return {...f,world,initial:serializeWorld(world),deepCell,
  notice:'PRÉPARÉ32² : helper de chantier V387 existant, bande statique d’eau peu profonde, une case ancienne eau infranchissable, adulte et besoins préparés,12bois de chantier et10bois de cargaison séparés, réserve sèche. Ni étang naturel boréal ni acquisition des stocks revendiqués. Traversée nue, contact, pont payé/fini, transport, retrait et reprises exactes restent à jouer ; aucun champ écrit après import.'};
}
