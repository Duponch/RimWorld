import {visitorTradeFixture} from './visitors';
import {refreshStock} from '../../src/sim/index';
import {miningYield} from '../../src/sim/mining-skills';
import {negotiatorRefusal} from '../../src/sim/trade-negotiator';
import {validateWorld} from '../../src/sim/serialization';

/** Named prepared boundary, not an acquired colony or naturally discovered vein.
 * Reuse the visitor producer and its finite stock, calendar, actors and IDs. */
export function silverNativeV382(){
  const {world:initial,pawnId,traderId}=visitorTradeFixture();
  if(initial.schemaVersion!==243)throw Error('Adopt schema243 before this native fixture.');
  const pawn=initial.pawns.find(p=>p.id===pawnId)!;
  pawn.name='Mineur négociateur préparé';pawn.hunger=100;pawn.rest=100;pawn.recreation.level=100;
  pawn.schedule.fill('work');pawn.skills.mining={level:8,xp:0,dailyXp:0,passion:0};
  pawn.priorities.mine=1;pawn.priorities.haul=0;pawn.priorities.build=0;pawn.priorities.craft=0;
  const ore={x:16,z:14},store={x:21,z:16};
  initial.tiles[ore.z*initial.width+ore.x]={terrain:'rock',stone:'granite',ore:'silver'};
  const medicine=initial.piles.find(p=>p.item==='medicine'&&p.owner.type==='inventory'&&p.owner.pawnId===traderId);
  if(!medicine)throw Error('The unchanged visitor fixture must offer its ordinary medicine.');
  if(initial.piles.some(p=>p.item==='silver'&&p.owner.type!=='inventory'))throw Error('No colonial currency may be prepared.');
  if(miningYield(pawn)!==1||negotiatorRefusal(pawn))throw Error('Prepared miner must have neutral yield and be a valid negotiator.');
  refreshStock(initial);const errors=validateWorld(initial);if(errors.length)throw Error(errors.join('\n'));
  return {initial,pawnId,traderId,medicineId:medicine.id,ore,store,
    notice:'Prepared32² from visitorTradeFixture: cleared grass camp; one healthy needs100 miner8, neutral yield; one intact1500HP silver wall16,14. Existing real visitor producer, merchant inventory/medicine/money unchanged. No colonial money, job, reserve or purchase prepared. The UI must designate, mine, interrupt/resume, carry/store and buy one medicine with its extracted silver.'};
}
