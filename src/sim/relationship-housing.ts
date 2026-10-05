import { isColonist } from './affiliation.ts';
import { isBedKind } from './bed-kinds.ts';
import { captureRoomQuality } from './room-quality.ts';
import { relationshipIndex } from './relationship-runtime.ts';
import type { RoomTopology } from './room-topology.ts';
import type { MoodThought } from './mood.ts';
import type { Pawn,World } from './types.ts';

export type RelationshipTopology=RoomTopology|(()=>RoomTopology);
/** Owned rooms, not current positions or a fabricated shared night. The engine
 * lends its phase topology; standalone inspections use the existing cache. */
export function relationshipHousingThought(world:World,pawn:Pawn,topology?:RelationshipTopology):MoodThought|undefined {
  if(world.schemaVersion<195||!world.relationships?.links.length||!isColonist(pawn)||pawn.prisoner||pawn.visitor||pawn.state==='dead')return;
  const index=relationshipIndex(world),partner=world.pawns.find(other=>other!==pawn&&isColonist(other)&&!other.prisoner&&!other.visitor&&other.state!=='dead'
    &&index.kinds(pawn.id,other.id).some(kind=>kind==='lover'||kind==='spouse'));
  if(!partner)return;
  const ownedBed=(p:Pawn)=>world.structures.find(s=>s.id===p.bedId&&isBedKind(s.kind)&&!s.medical&&!s.prisoner);
  const a=ownedBed(pawn),b=ownedBed(partner);
  if(a&&b){
    const rooms=typeof topology==='function'?topology():topology??captureRoomQuality(world).topology;
    const one=rooms.at(a.x,a.z),two=rooms.at(b.x,b.z);
    if(one?.kind==='space'&&two?.kind==='space'&&!one.touchesMapEdge&&!two.touchesMapEdge&&one.id===two.id)return;
  }
  return {id:'want-shared-room',label:`Dormir près de ${partner.name}`,offset:-4,kind:'situation',
    description:'Partenaire vivant présent ; attribuez deux lits civils dans la même pièce intérieure. Les positions actuelles ne valent pas une chambre commune.'};
}
