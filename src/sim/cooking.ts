import { foodStationUsable } from './food-workstations.ts';
import { consumeCookingFuel } from './fuel.ts';
import { applyCookingHeat } from './thermal-sources.ts';
import { corpseFresh } from './corpses.ts';
import { finishButchery } from './butchery.ts';
import { foodPoisonFromRecipe } from './food-poisoning.ts';
import { roomCleanliness } from './filth.ts';
import { cookingSpeed,butcherySpeed,completedCookingSkill } from './cooking-statistics.ts';
import { beginUnfinished, unfinishedMaterial } from './unfinished.ts';
import { craftingQuality,craftingSkill } from './crafting-quality.ts';
import { learnSkill } from './skills.ts';
import { healthRandom } from './health.ts';
import { newApparelState, type ApparelItem } from './apparel-rules.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import { isTailoring, PRODUCTION_RECIPES, PRODUCTION_WORK_SCALE, productionStationUsable, productionWorkTotal, recipeProduct, taskRecipe, taskWork } from './production-recipes.ts';
import { processProductionOutput, type ProductionContext } from './production-output.ts';
import { copyPileCondition } from './pile-condition.ts';
import { freshRot } from './food-preservation.ts';
import { groundPile } from './ground-placement.ts';
import { transferPile, reservedSource } from './materials.ts';
import type { MaterialPile, Pawn, World } from './types.ts';

const near=(a:{x:number;z:number},b:{x:number;z:number})=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)<=1;
function take(world:World,pawn:Pawn,pile:MaterialPile,quantity:number):MaterialPile|null {
  if(pile.quantity<quantity||pile.owner.type!=='ground'||world.piles.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id))return null;
  if(pile.quantity===quantity){pile.owner={type:'pawn',pawnId:pawn.id};return pile;}
  if(world.piles.length>=32768||!Number.isSafeInteger(world.nextId+1))return null;
  pile.quantity-=quantity;
  const carried:MaterialPile={id:world.nextId++,item:pile.item,kind:pile.kind,quantity,owner:{type:'pawn',pawnId:pawn.id},...copyPileCondition(pile)};
  world.piles.push(carried);return carried;
}
export function processCooking(world:World,pawn:Pawn,context:ProductionContext):void {
  const task=pawn.cooking!;
  if(task.phase==='interrupted'){context.release();return;}
  const station=world.structures.find(s=>s.id===task.stationId),bill=station?.bills?.find(b=>b.id===task.billId);
  if(!station||!bill||bill.suspended||pawn.priorities[taskWork(task)]===0&&pawn.orders.active!=='cook'||(task.phase!=='output'&&(!foodStationUsable(station)||!productionStationUsable(station)))) {context.release();return;}
  if(task.phase==='output'){processProductionOutput(world,pawn,context,bill.destination);return;}
  const recipe=PRODUCTION_RECIPES[taskRecipe(task)];
  for(const entry of task.ingredients) {
    const pile=world.piles.find(p=>p.id===entry.pileId);
    if(!pile||pile.item==='hare-corpse'&&!corpseFresh(pile,world.tick)||pile.item!==entry.item||pile.quantity<entry.quantity||entry.stage!=='held'&&reservedSource(world,pile.id)>pile.quantity){context.release();return;}
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
  const total=productionWorkTotal(taskRecipe(task));
  task.phase='work';pawn.state='working';pawn.path=[];
  const unfinished=isTailoring(task.recipe)?beginUnfinished(world,pawn):null;
  if(isTailoring(task.recipe)&&!unfinished){context.release();return;}
  if(unfinished){pawn.skills.crafting??={...craftingSkill(pawn)};if(unfinished.unfinished!.progress<total)learnSkill(pawn.skills.crafting,1000,pawn);task.progress=unfinished.unfinished!.progress;}
  const culinary=taskWork(task)==='cook';
  if(task.progress<total){
    if(culinary){if(!Number.isSafeInteger((task.workTicks??0)+1)||((task.workTicks??0)+1)>Math.floor(Number.MAX_SAFE_INTEGER/1000))return;task.workTicks=(task.workTicks??0)+1;}
    const speed=task.recipe==='butcher-creature'?butcherySpeed(pawn):culinary?cookingSpeed(pawn):1;
    const fraction=consumeCookingFuel(station);applyCookingHeat(world,station,fraction);
    task.progress=Math.min(total,task.progress+Math.round(context.workRate(station,pawn)*speed*PRODUCTION_WORK_SCALE*fraction));
  }
  if(unfinished)unfinished.unfinished!.progress=task.progress;
  if(task.progress<total)return;
  if(task.recipe==='butcher-creature'){finishButchery(world,pawn,bill,context);return;}
  const used=new Map<number,number>();for(const i of task.ingredients)used.set(i.pileId,(used.get(i.pileId)??0)+i.quantity);
  const freed=[...used].filter(([id,n])=>world.piles.find(p=>p.id===id)?.quantity===n).length;
  if(world.piles.length-freed+1>32768||!Number.isSafeInteger(world.nextId+1))return;
  const meat=task.ingredients.filter(i=>i.item==='hare-meat').reduce((n,i)=>n+i.quantity,0);
  const material=unfinished?unfinishedMaterial(unfinished.unfinished!):undefined;
  const rice=task.ingredients.filter(i=>i.item==='rice').reduce((n,i)=>n+i.quantity,0),item=recipeProduct(taskRecipe(task),task.ingredients,material);
  const potato=task.ingredients.filter(i=>i.item==='potato').reduce((n,i)=>n+i.quantity,0),corn=task.ingredients.filter(i=>i.item==='corn').reduce((n,i)=>n+i.quantity,0);
  if(isTailoring(task.recipe)&&!Number.isSafeInteger((world.tailoring?.completed??0)+1))return;
  const random={rng:world.rng},apparel=isTailoring(task.recipe)?{...newApparelState(item as ApparelItem,material),quality:craftingQuality(craftingSkill(pawn).level,()=>healthRandom(random))}:undefined;
  const foodPoison=world.schemaVersion>=89&&culinary?foodPoisonFromRecipe(roomCleanliness(world,pawn),(pawn.skills.cooking?.level??0),()=>healthRandom(random)):undefined;
  // All preconditions succeeded. Consume once, create once, then store physically.
  for(const [id,quantity] of used)world.piles.find(p=>p.id===id)!.quantity-=quantity;
  world.piles=world.piles.filter(p=>p.quantity>0);
  const id=world.nextId++;world.piles.push({id,item,kind:ITEM_DEFINITIONS[item].kind,quantity:recipe.outputUnits,owner:{type:'pawn',pawnId:pawn.id},...freshRot(item,world.tick),...(foodPoison?{foodPoison}:{}),...apparel?{apparel}:{}});
  world.rng=random.rng;
  if(apparel){(world.tailoring??={completed:0,cancelled:0,lostCloth:0}).completed++;}
  task.ingredients=[];task.productId=id;task.phase='output';task.progress=0;if(culinary)pawn.skills.cooking=completedCookingSkill(pawn,task.workTicks??0);delete task.workTicks;pawn.planCooldown=0;
  if(bill.mode==='times')bill.target=Math.max(0,bill.target-1);
  context.event(isTailoring(task.recipe)?`${pawn.name} a fabriqué : ${ITEM_DEFINITIONS[item].label.toLowerCase()}.`:task.recipe==='stone-blocks'?`${pawn.name} a taillé 20 ${ITEM_DEFINITIONS[item].label.toLowerCase()}.`:`${pawn.name} a cuisiné 1 repas simple (${10-rice-meat-potato-corn} baies, ${rice} riz${meat?`, ${meat} viande`:''}${potato?`, ${potato} pommes de terre`:''}${corn?`, ${corn} maïs`:''}).`);
}
