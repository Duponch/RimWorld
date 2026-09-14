import { installCommand } from '../../src/sim/furniture-commands.ts';
import { queryOrderOptions } from '../../src/sim/player-orders.ts';
import { planCookingOrder } from '../../src/sim/player-cooking.ts';
import { plantGrowth } from '../../src/sim/plants.ts';
import { availableNutrition } from '../../src/sim/items.ts';
import { spoiledUnits } from '../../src/sim/food-preservation.ts';
import { canDesignate } from '../../src/sim/engine.ts';
import { planHaulOrder } from '../../src/sim/player-hauling.ts';
import { JOB_WOOD_COST, footprintCells } from '../../src/sim/definitions.ts';
import type { Command, DesignateCommand, World } from '../../src/sim/types.ts';

export interface Decision { reason: string; command: Command }

/** First observation, after designations are acknowledged: an ordinary player
 * asks one well-rested worker to get the first two nearby lots of building wood. */
export function playerFocusDecisions(world:World):Decision[] {
  if(world.tick>=250)return [];
  const pawn=world.pawns.find(p=>p.priorities.gather>0&&p.hunger>50&&p.rest>50&&!p.need&&p.orders.active===null&&!p.orders.queue.length&&!p.priorityWork);
  if(!pawn)return [];
  const orders:Decision[]=world.jobs.filter(j=>j.kind==='chop'&&j.reservedBy===null)
    .sort((a,b)=>Math.hypot(a.x-pawn.x,a.z-pawn.z)-Math.hypot(b.x-pawn.x,b.z-pawn.z)||a.id-b.id).slice(0,2)
    .map((job,index)=>({reason:'Prioriser les premiers lots de bois pour installer le camp.',command:{type:'order-job',pawnId:pawn.id,jobId:job.id,queue:index>0}}));
  const carrier=world.pawns.find(p=>p!==pawn&&p.priorities.haul>0&&p.hunger>50&&p.rest>50);
  if(carrier) {
    const blockedBed=world.jobs.find(j=>j.kind==='bed'&&queryOrderOptions(world,carrier.id,j).some(o=>o.enabled&&(o.label.startsWith('Couper la plante')||o.haulTarget?.type==='clear')));
    if(blockedBed) {
      const option=queryOrderOptions(world,carrier.id,blockedBed).find(o=>o.enabled&&(o.label.startsWith('Couper la plante')||o.haulTarget?.type==='clear'))!;
      orders.push({reason:'Dégager le couchage prioritaire.',command:option.haulTarget?{type:'order-haul',pawnId:carrier.id,target:option.haulTarget,queue:false}:{type:'order-job',pawnId:carrier.id,jobId:blockedBed.id,queue:false}});
    }
    const job=!blockedBed?world.jobs.find(j=>j.kind==='bed'&&planHaulOrder(world,carrier,{type:'job',jobId:j.id}).task):undefined;
    if(job)orders.push({reason:'Livrer en priorité le premier couchage.',command:{type:'order-haul',pawnId:carrier.id,target:{type:'job',jobId:job.id},queue:false}});
    const pile=world.piles.find(p=>p.kind==='food'&&p.owner.type==='ground'&&planHaulOrder(world,carrier,{type:'pile',pileId:p.id}).task);
    if(pile)orders.push({reason:'Ranger les rations après la livraison.',command:{type:'order-haul',pawnId:carrier.id,target:{type:'pile',pileId:pile.id},queue:!!job||!!blockedBed}});
  }
  return orders;
}

/** Deliberately ordinary, bounded player policy, not a perfect-play optimizer.
 * Reads visible colony state, never writes it or injects inventory/needs.
 * Both the fast simulation and the real UI journey execute these intentions.
 */
export function playerDecisions(world: World): Decision[] {
  const cx = Math.floor(world.width / 2), cz = Math.floor(world.height / 2);
  const out: Decision[] = [];
  // Ordinary player choice: the cook's night is shifted one hour earlier.
  // Keep eight intended sleep hours; actual rest still depends on bed and needs.
  if (world.structures.filter(s => s.kind === 'bed').length >= 3) {
    const cook = world.pawns[2];
    if (cook) for (const [hour, assignment] of [[5, 'anything'], [21, 'sleep']] as const) if (cook.schedule[hour] !== assignment)
      out.push({reason: 'Décaler le sommeil de la cuisinière pour préparer le matin.', command: {type: 'schedule-paint', pawnId: cook.id, hours: [hour], assignment}});
  }
  const priorities = [{ gather: 1, build: 3, haul: 2, grow: 2, cook:3 }, { gather: 3, build: 1, haul: 2, grow: 3, cook:3 }, { gather: 2, build: 3, haul: 2, grow: 2, cook:1 }] as const;
  world.pawns.forEach((pawn, i) => {
    for (const work of ['gather', 'build', 'haul', 'grow','cook'] as const) if (pawn.priorities[work] !== priorities[i % 3]![work]) {
      out.push({ reason: 'Répartir collecte, construction, cuisine et transport entre les trois colons.', command: { type: 'priority', pawnId: pawn.id, work, value: priorities[i % 3]![work] } });
    }
  });
  const plans: DesignateCommand[] = [
    ...[[-3, 2], [0, 2], [3, 2]].map(([x, z]) => ({ type: 'designate' as const, kind: 'bed' as const, x: cx + x!, z: cz + z!, orientation: 0 as const })),
    { type: 'designate', kind: 'table', x: cx, z: cz - 2, orientation: 1 },
    { type:'designate',kind:'horseshoes',x:cx+2,z:cz-3 },
    { type:'designate',kind:'campfire',x:cx-1,z:cz-1,orientation:0 },
    ...[[0, -3], [1, -3], [0, -1]].map(([x, z]) => ({ type: 'designate' as const, kind: 'stool' as const, x: cx + x!, z: cz + z! })),
    ...[-3, 3].flatMap(x => [-3, -2, -1].map(z => ({ type: 'designate' as const, kind: 'wall' as const, x: cx + x, z: cz + z }))),
  ];
  if(world.deconstructed.count===0) {
    const temporary={type:'designate' as const,kind:'wall' as const,x:cx+4,z:cz-1};
    if(world.structures.some(s=>s.x===temporary.x&&s.z===temporary.z)&&world.tick>=6000) {
      if(canDesignate(world,{...temporary,kind:'deconstruct'}).ok)out.push({reason:'Ouvrir le passage du camp après la première journée.',command:{...temporary,kind:'deconstruct'}});
    } else plans.push(temporary);
  }
  const pin=world.structures.find(s=>s.kind==='horseshoes'&&s.x===cx+2&&s.z===cz-3);
  if(world.tick>=6000) {
    const storage={x:cx+4,z:cz};
    if(!world.stockpiles.some(s=>s.x===storage.x&&s.z===storage.z))out.push({reason:'Préparer une réserve pour les meubles retirés.',command:{type:'stockpile',...storage,enabled:true,filters:{wood:false,food:false,furniture:true},priority:2,capacity:1}});
    if(pin){const c={type:'designate' as const,kind:'uninstall' as const,x:pin.x,z:pin.z};if(canDesignate(world,c).ok)out.push({reason:'Retirer le jeu pour réorganiser le camp.',command:c});}
    const stored=world.packed.find(p=>p.building.kind==='horseshoes'&&p.owner.type==='ground'&&p.owner.x===storage.x&&p.owner.z===storage.z);
    if(stored){const c={type:'install' as const,structureId:stored.building.id,x:cx+4,z:cz-3,orientation:0 as const};if(installCommand(world,c,true).ok)out.push({reason:'Réinstaller le piquet après son rangement en réserve.',command:c});}
  }
  for (const plan of plans) {
    if(plan.kind==='horseshoes'&&(world.structures.some(s=>s.kind==='horseshoes')||world.packed.some(p=>p.building.kind==='horseshoes')))continue;
    // Beds first, dining next, then an open windbreak. No claim of a roofed room.
    if (plan.kind !== 'bed' && world.structures.filter(s => s.kind === 'bed').length < 3) continue;
    if (plan.kind === 'wall' && world.structures.filter(s => s.kind === 'stool').length < 3) continue;
    if (canDesignate(world, plan).ok) out.push({ reason: 'Aménager progressivement le camp sans fermer son passage central.', command: plan });
  }
  for (const [dx, dz, food] of [[-2, 0, false], [-2, 1, false], [2, 1, true], [2, 0, true], [2, -1, true],[-1,1,true],[0,1,true],[1,1,true]] as const) {
    const x = cx + dx, z = cz + dz;
    if (!world.stockpiles.some(s => s.x === x && s.z === z)) out.push({ reason: 'Séparer le bois et les aliments près du camp.', command: { type: 'stockpile', x, z, enabled: true, filters: { wood: !food, food }, priority: 2, capacity: 75 } });
  }
  const ingredientSeat=world.structures.find(s=>s.kind==='stool'&&s.x===cx&&s.z===cz-1);
  if(ingredientSeat&&!world.stockpiles.some(z=>z.x===ingredientSeat.x&&z.z===ingredientSeat.z))out.push({reason:'Garder une petite réserve alimentaire sur le tabouret près du feu.',command:{type:'stockpile',x:ingredientSeat.x,z:ingredientSeat.z,enabled:true,filters:{wood:false,food:true},priority:2,capacity:75}});
  for(const fire of world.structures.filter(s=>s.kind==='campfire')) {
    const bill=fire.bills?.[0];
    if(!bill)out.push({reason:'Installer une première recette de repas simple au feu de camp.',command:{type:'bill-add',structureId:fire.id}});
    else if(bill.mode!=='until'||bill.target!==world.pawns.length*2)out.push({reason:'Maintenir environ deux repas préparés par colon en réserve.',command:{type:'bill-update',structureId:fire.id,billId:bill.id,settings:{...bill,mode:'until',target:world.pawns.length*2}}});
    else if(!world.piles.some(p=>p.item==='simple-meal')) {
      const cook=world.pawns.find(p=>p.priorities.cook>0&&p.hunger>35&&p.rest>35&&!p.cooking&&!p.haul&&!p.need&&p.jobId===null&&p.orders.active===null&&!p.orders.queue.length&&!p.priorityWork&&planCookingOrder(world,p,fire.id).order);
      if(cook)out.push({reason:'Prioriser un repas quand la réserve de repas préparés est vide.',command:{type:'order-cook',pawnId:cook.id,structureId:fire.id,queue:false}});
    }
  }
  if (!world.growingZones.length && world.structures.filter(s => s.kind === 'bed').length === 3) out.push({reason:'Semer un premier potager près du camp, tout en continuant à cueillir pendant sa croissance.',command:{type:'area',action:'growing',from:{x:cx-2,z:cz+5},to:{x:cx+2,z:cz+7}}});
  for(const pawn of world.pawns)if(pawn.schedule[19]!=='recreation'||pawn.schedule[20]!=='recreation')out.push({reason:'Réserver une plage de loisirs du soir, sans remplacer le repos nocturne.',command:{type:'schedule-paint',pawnId:pawn.id,hours:[19,20],assignment:'recreation'}});
  const outstandingWood = [...world.jobs, ...out.flatMap(d => d.command.type === 'designate' ? [d.command] : [])].reduce((n,j) => n + JOB_WOOD_COST[j.kind], 0);
  // New plans can overlap trees: their builder will clear the footprint. Do not
  // queue a second gathering order there in the same batch of player commands.
  const newlyPlanned=new Set(out.flatMap(d=>d.command.type==='designate'?footprintCells(d.command).map(c=>c.z*world.width+c.x):[]));
  const nearby = [...world.resources].filter(r => Math.abs(r.x-cx) + Math.abs(r.z-cz) <= 28).sort((a,b) => Math.abs(a.x-cx)+Math.abs(a.z-cz)-(Math.abs(b.x-cx)+Math.abs(b.z-cz)) || a.id-b.id);
  const prepared=world.piles.filter(p=>p.item==='simple-meal').reduce((n,p)=>n+p.quantity,0);
  const ingredients=world.piles.filter(p=>p.item==='rice'||p.item==='berries').reduce((n,p)=>n+p.quantity,0);
  // Preserve travel rations once cooking provides a buffer; lift the restriction
  // if that buffer runs out. This is a player decision, never a hunger override.
  const nutritionWithoutRations=world.piles.reduce((n,p)=>n+(p.item==='simple-meal' ? p.quantity*.9 : p.item==='berries'||p.item==='rice' ? p.quantity*.05 : 0),0);
  const reserveRations=prepared>=world.pawns.length*2;
  for(const pawn of world.pawns) {
    const policyId=reserveRations?3:nutritionWithoutRations<world.pawns.length*.8?1:pawn.foodPolicyId;
    if(pawn.foodPolicyId!==policyId)out.push({reason:policyId===3?'Conserver les rations de voyage tant que la cuisine assure les repas.':'Autoriser les rations de secours lorsque la réserve fraîche baisse.',command:{type:'food-policy-assign',pawnId:pawn.id,policyId}});
  }
  const cookingDemand=world.structures.some(s=>s.kind==='campfire')?Math.max(0,(world.pawns.length*2-prepared)*10-ingredients):0;
  for (const [kind, required] of [['tree', Math.max(40, outstandingWood + 20) - world.stock.wood], ['berries', Math.max(cookingDemand,(world.pawns.length * 1.6 - availableNutrition(world)) * (world.foodRules === 'legacy' ? 100 / 35 : 20))]] as const) {
    const action = kind === 'tree' ? 'chop' : 'harvest';
    let planned = nearby.filter(r => r.kind === kind && world.jobs.some(j => j.x === r.x && j.z === r.z)).reduce((n,r) => n+r.amount,0);
    for (const resource of nearby) {
      if (resource.kind !== kind || newlyPlanned.has(resource.z*world.width+resource.x) || (kind === 'berries' && plantGrowth(world,resource) < 1) || planned >= required) continue;
      const command: DesignateCommand = { type: 'designate', kind: action, x: resource.x, z: resource.z };
      if (canDesignate(world, command).ok) { out.push({ reason: kind === 'tree' ? 'Prévoir le bois des chantiers et une petite marge.' : 'Renouveler la réserve alimentaire avant la pénurie.', command }); planned += resource.amount; }
    }
  }
  return out;
}

export function colonySummary(world: World) {
  const fields=new Set(world.growingZones.flatMap(z=>z.cells));
  const occupied=new Map<number,number>();
  for(const p of world.pawns){const cell=p.z*world.width+p.x;occupied.set(cell,(occupied.get(cell)??0)+1);}
  return { tick: world.tick, foodPolicies: world.pawns.map(p=>p.foodPolicyId), restRules: world.restRules, scheduledSleepHours: world.pawns.map(p=>p.schedule.filter(s=>s==='sleep').length), spoiled: { ...world.spoiled }, crops: world.resources.filter(r=>r.kind==='rice').length, growingCells:fields.size,
    recreation:world.pawns.map(p=>({level:p.recreation.level,tolerance:{...p.recreation.tolerance},bored:{...p.recreation.bored}})),
    furnitureTransit:world.pawns.filter(p=>p.motion&&p.motion.end>world.tick&&(p.motion.terrainDelay??0)>0).length,
    furnitureExits:world.pawns.filter(p=>p.transitExit).length,
    sharedPawnCells:[...occupied.values()].filter(count=>count>1).length,
    playerOrders:world.pawns.map(p=>({active:p.orders.active,queued:p.orders.queue.length,priority:p.priorityWork??null})),
    obstructedGrowingCells:world.piles.filter(p=>p.owner.type==='ground'&&fields.has(p.owner.z*world.width+p.owner.x)).length,
    clearing:world.pawns.filter(p=>p.haul?.destination.type==='aside').length,
    construction: {blueprints:world.jobs.filter(j=>j.construction==='blueprint').length,frames:world.jobs.filter(j=>j.construction==='frame').length,clearingPlants:world.jobs.filter(j=>j.clearance).length,clearingPiles:world.pawns.filter(p=>p.haul?.destination.type==='aside'&&p.haul.destination.constructionId!==undefined).length},
    structures: Object.fromEntries(['bed','table','stool','wall','campfire','horseshoes'].map(kind => [kind,world.structures.filter(s=>s.kind===kind).length])), preparedMeals:world.piles.filter(p=>p.item==='simple-meal').reduce((n,p)=>n+p.quantity,0), stock: { ...world.stock }, pending: world.jobs.length, minimumFood: Math.min(...world.pawns.map(p=>p.hunger)), minimumRest: Math.min(...world.pawns.map(p=>p.rest)) };
}

export function woodAccount(world: World): number {
  return (world.packed??[]).reduce((n,p)=>n+JOB_WOOD_COST[p.building.kind],0) + world.deconstructed.lostWood + world.deconstructed.fuelTicks/600 + world.piles.filter(p=>p.kind==='wood').reduce((n,p)=>n+p.quantity,0) + world.resources.filter(r=>r.kind==='tree').reduce((n,r)=>n+r.amount,0) + world.structures.reduce((n,s)=>n+(s.kind==='campfire' ? ((s.fuel?.ticks??0)+(s.fuel?.burned??0))/600 : JOB_WOOD_COST[s.kind]),0);
}
export function foodAccount(world: World): number {
  // Produced units remain accounted for even after spoilage; this is a ledger,
  // not the edible stock used by the player's decisions.
  return world.piles.filter(p=>p.kind==='food').reduce((n,p)=>n+p.quantity,0) + spoiledUnits(world);
}
