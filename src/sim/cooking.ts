import { COOK_TICKS } from './cooking-bills.ts';
import { groundPile, planGroundPlacement, storageCapacity } from './ground-placement.ts';
import { transferPile, reservedSource } from './materials.ts';
import { interactionGoals, routeToJob } from './pathfinding.ts';
import type { NeedContext } from './needs.ts';
import type { MaterialPile, Pawn, World } from './types.ts';

const near=(a:{x:number;z:number},b:{x:number;z:number})=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)<=1;
function take(world:World,pawn:Pawn,pile:MaterialPile,quantity:number):MaterialPile|null {
  if(pile.quantity<quantity||pile.owner.type!=='ground'||world.piles.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id))return null;
  if(pile.quantity===quantity){pile.owner={type:'pawn',pawnId:pawn.id};return pile;}
  if(world.piles.length>=32768||!Number.isSafeInteger(world.nextId+1))return null;
  pile.quantity-=quantity;
  const carried:MaterialPile={id:world.nextId++,item:pile.item,kind:pile.kind,quantity,owner:{type:'pawn',pawnId:pawn.id}};
  world.piles.push(carried);return carried;
}
export function processCooking(world:World,pawn:Pawn,context:NeedContext):void {
  const task=pawn.cooking!;
  const station=world.structures.find(s=>s.id===task.stationId),bill=station?.bills?.find(b=>b.id===task.billId);
  if(!station||!bill||bill.suspended||pawn.priorities.cook===0||(task.phase!=='output'&&!station.fuel?.ticks)) {context.release();return;}
  if(task.phase==='output') {
    const product=world.piles.find(p=>p.id===task.productId);if(!product){context.release();return;}
    if(bill.destination==='drop'){dropProduct(world,pawn,product);return;}
    const target=world.stockpiles.find(s=>s.id===task.storageId);
    if(target&&storageCapacity(world,target,product.item,pawn.id)>=product.quantity) {
      if(!near(pawn,target)){context.move(target,false);return;}
      if(transferPile(world,product,{type:'ground',x:target.x,z:target.z}))finish(pawn);
      return;
    }
    task.storageId=null;
    if(pawn.planCooldown>0)return;
    const targets=world.stockpiles.filter(s=>storageCapacity(world,s,product.item,pawn.id)>=product.quantity)
      .sort((a,b)=>b.priority-a.priority||(pawn.x-a.x)**2+(pawn.z-a.z)**2-((pawn.x-b.x)**2+(pawn.z-b.z)**2)||a.id-b.id);
    if(!targets.length){dropProduct(world,pawn,product);return;}
    const reach=context.search(false,interactionGoals(world,targets.filter(t=>t.priority===targets[0]!.priority)));
    if(!reach)return;
    for(const zone of targets) {
      const path=routeToJob(world,zone,reach,true);if(!path)continue;
      task.storageId=zone.id;pawn.path=path;pawn.state='moving';pawn.planCooldown=0;return;
    }
    dropProduct(world,pawn,product);return;
  }
  for(const entry of task.ingredients) {
    const pile=world.piles.find(p=>p.id===entry.pileId);
    if(!pile||pile.item!==entry.item||pile.quantity<entry.quantity||entry.stage!=='held'&&reservedSource(world,pile.id)>pile.quantity){context.release();return;}
  }
  const held=task.ingredients.find(i=>i.stage==='held');
  if(held) {
    if(pawn.x!==task.spot.x||pawn.z!==task.spot.z){context.move(task.spot,true);return;}
    const pile=world.piles.find(p=>p.id===held.pileId)!;
    task.actionCell={...held.cell};
    if(!transferPile(world,pile,{type:'ground',...held.cell})){context.release();return;}
    held.pileId=groundPile(world,held.cell)!.id;held.stage='placed';pawn.path=[];pawn.planCooldown=0;pawn.state='working';return;
  }
  const source=task.ingredients.find(i=>i.stage==='source');
  if(source) {
    const pile=world.piles.find(p=>p.id===source.pileId)!;
    if(pile.owner.type!=='ground'){context.release();return;}
    if(!near(pawn,pile.owner)){context.move(pile.owner,false);return;}
    task.actionCell={x:pile.owner.x,z:pile.owner.z};
    const carried=take(world,pawn,pile,source.quantity);if(!carried){context.release();return;}
    source.pileId=carried.id;source.stage='held';pawn.path=[];pawn.planCooldown=0;pawn.state='working';return;
  }
  if(pawn.x!==task.spot.x||pawn.z!==task.spot.z){context.move(task.spot,true);return;}
  task.actionCell={x:station.x,z:station.z};
  task.phase='work';pawn.state='working';pawn.path=[];task.progress=Math.min(COOK_TICKS,task.progress+1);
  if(task.progress<COOK_TICKS)return;
  const used=new Map<number,number>();for(const i of task.ingredients)used.set(i.pileId,(used.get(i.pileId)??0)+i.quantity);
  const freed=[...used].filter(([id,n])=>world.piles.find(p=>p.id===id)?.quantity===n).length;
  if(world.piles.length-freed+1>32768||!Number.isSafeInteger(world.nextId+1))return;
  const rice=task.ingredients.filter(i=>i.item==='rice').reduce((n,i)=>n+i.quantity,0);
  // All preconditions succeeded. Consume once, create once, then store physically.
  for(const [id,quantity] of used)world.piles.find(p=>p.id===id)!.quantity-=quantity;
  world.piles=world.piles.filter(p=>p.quantity>0);
  const id=world.nextId++;world.piles.push({id,item:'simple-meal',kind:'food',quantity:1,owner:{type:'pawn',pawnId:pawn.id}});
  task.ingredients=[];task.productId=id;task.phase='output';task.progress=0;pawn.planCooldown=0;
  if(bill.mode==='times')bill.target=Math.max(0,bill.target-1);
  context.event(`${pawn.name} a cuisiné 1 repas simple (${10-rice} baies, ${rice} riz).`);
}
function finish(pawn:Pawn):void {pawn.cooking=null;pawn.path=[];pawn.state='idle';pawn.planCooldown=0;}
function dropProduct(world:World,pawn:Pawn,product:MaterialPile):void {
  if(pawn.planCooldown>0)return;
  const plan=planGroundPlacement(world,product.quantity,pawn,product.item);
  if(plan?.length===1&&transferPile(world,product,{type:'ground',...plan[0]!.cell}))finish(pawn);
  else {pawn.state='working';pawn.planCooldown=20;}
}
