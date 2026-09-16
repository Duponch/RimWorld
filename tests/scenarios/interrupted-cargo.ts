import { applyCommand,createWorld } from '../../src/sim/engine.ts';
import { addMaterial,refreshStock } from '../../src/sim/materials.ts';
import type { World } from '../../src/sim/types.ts';

/** Crowded camp, valid reserved steel delivery, queued harvest. No free ground slot. */
export function exhaustedCarrier():World {
  const w=createWorld(42,16,16);w.tick=3000;w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.structures=[];w.piles=[];w.pawns=w.pawns.slice(0,1);w.stockpiles=[];
  const p=w.pawns[0]!;p.x=2;p.z=2;p.hunger=80;p.rest=50;p.recreation.level=100;p.schedule.fill('work');
  const zone={id:w.nextId++,x:10,z:2,filters:{wood:false,food:false,steel:true},priority:2,capacity:75};w.stockpiles.push(zone);
  addMaterial(w,'steel',10,{type:'pawn',pawnId:p.id},'steel');const held=w.piles.at(-1)!;
  p.haul={sourcePileId:held.id,quantity:10,phase:'deliver',carryPileId:held.id,destination:{type:'stockpile',stockpileId:zone.id},pickupCell:{x:2,z:2}};
  p.state='moving';p.orders.active='haul';
  w.resources.push({id:w.nextId++,kind:'tree',x:3,z:2,amount:12});
  if(!applyCommand(w,{type:'designate',kind:'chop',x:3,z:2}).ok)throw new Error('Cannot prepare queued tree');
  if(!applyCommand(w,{type:'order-job',pawnId:p.id,jobId:w.jobs[0]!.id,queue:true}).ok)throw new Error('Cannot queue tree');
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++) {
    const destination=x===zone.x&&z===zone.z;
    addMaterial(w,destination?'steel':'wood',destination?65:75,{type:'ground',x,z},destination?'steel':'wood');
  }
  p.rest=0;p.restZeroTicks=200;p.collapsePending=true;p.needCooldown=0;refreshStock(w);
  return w;
}

/** Recovery needs another actor to clear a nearby slot. The far storage cell
 * is initially empty, outside the exhausted actor's local drop radius. */
export function carrierWithHelper():World {
  const w=exhaustedCarrier(),helper=createWorld(42,16,16).pawns[1]!;
  Object.assign(helper,{x:2,z:3,hunger:100,rest:100});helper.schedule.fill('work');helper.recreation.level=100;
  for(const work of Object.keys(helper.priorities) as (keyof typeof helper.priorities)[])helper.priorities[work]=0;
  w.pawns.push(helper);
  w.piles.find(q=>q.owner.type==='ground'&&q.owner.x===2&&q.owner.z===3)!.quantity=10;
  w.piles=w.piles.filter(q=>!(q.owner.type==='ground'&&q.owner.x===15&&q.owner.z===15));
  w.stockpiles.push({id:w.nextId++,x:15,z:15,filters:{wood:true,food:false},priority:2,capacity:75});
  refreshStock(w);return w;
}
