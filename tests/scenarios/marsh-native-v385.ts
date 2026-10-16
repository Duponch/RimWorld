import {marshWorkshopV385} from './marsh-v385';
import {serializeWorld,validateWorld} from '../../src/sim/serialization';
/** Pause-friendly wrapper only. All subsequent transitions belong to the UI. */
export function marshNativeV385(){
  const f=marshWorkshopV385();f.world.pawns.find(p=>p.id===f.pawnId)!.priorities.haul=0;
  const errors=validateWorld(f.world);if(errors.length)throw Error(errors.join('\n'));
  return {...f,initial:serializeWorld(f.world),emptyWet:{x:14,z:14},
    notice:f.notice+' Transport0 initial pour inspecter/refuser les poses sans déplacement préalable. Aller mobilisé puis retour civil avec10bois préparés ; Transport1 est choisi par UI.'};
}
