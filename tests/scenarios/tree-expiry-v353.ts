import {preparedTreeWrapper} from './tree-transfer-v349';
import {applyCommand,stepWorld} from '../../src/sim/engine';
import {newBreakdownCalendar} from '../../src/sim/breakdowns';
import {createApparelWearCalendar} from '../../src/sim/apparel-renewal';
import {refreshStock} from '../../src/sim/materials';
import {validateWorld} from '../../src/sim/serialization';

/** Declared late-epoch legacy TreeBase checkpoint. No45k ticks or played
 * extraction are claimed. Pickup, approach and the held edge below are real.
 * The contained original has implicit growth1 and intact HP, yielding23wood. */
export function preparedTreeExpiryCarrier(){
 const {w,pile,source}=preparedTreeWrapper(null,1),p=w.pawns[0]!,builder=w.pawns[1]!;
 w.tick=44950;source.amount=46;delete source.damage;
 w.breakdown=newBreakdownCalendar(w.seed,w.tick);w.apparelWear=createApparelWearCalendar(w.tick,(w.seed^w.tick^0x0a77e1)>>>0);
 builder.priorities.build=1;p.skills.plants={level:8,xp:0,dailyXp:0,passion:0};refreshStock(w);
 const errors=validateWorld(w);if(errors.length)throw Error('Invalid declared expiry scene: '+errors.join(' '));
 const order=applyCommand(w,{type:'replant-tree',pileId:pile.id,x:30,z:30});if(!order.ok)throw Error(order.reason);
 for(let n=0;n<42&&(w.tick<44980||pile.owner.type!=='pawn'||!p.motion||p.motion.end<=w.tick);n++)stepWorld(w);
 if(w.tick>=pile.plantPack.expiresAt||pile.owner.type!=='pawn'||pile.owner.pawnId!==p.id||!p.motion||p.motion.end<=w.tick)throw Error('No actual held edge before the declared deadline');
 // This saturation is UNIT preparation after the real pickup, not production.
 for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)w.piles.push({id:w.nextId++,kind:'wood',item:'wood',quantity:75,owner:{type:'ground',x,z}});
 refreshStock(w);const finalErrors=validateWorld(w);if(finalErrors.length)throw Error('Invalid saturated expiry scene: '+finalErrors.join(' '));
 return {w,pile,source};
}