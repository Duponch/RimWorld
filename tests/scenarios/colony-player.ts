import { availableNutrition } from '../../src/sim/items.ts';
import { canDesignate } from '../../src/sim/engine.ts';
import { JOB_WOOD_COST } from '../../src/sim/definitions.ts';
import type { Command, DesignateCommand, World } from '../../src/sim/types.ts';

export interface Decision { reason: string; command: Command }

/** Deliberately ordinary, bounded player policy, not a perfect-play optimizer.
 * Reads visible colony state, never writes it or injects inventory/needs.
 * Both the fast simulation and the real UI journey execute these intentions.
 */
export function playerDecisions(world: World): Decision[] {
  const cx = Math.floor(world.width / 2), cz = Math.floor(world.height / 2);
  const out: Decision[] = [];
  const priorities = [{ gather: 1, build: 3, haul: 2 }, { gather: 3, build: 1, haul: 2 }, { gather: 2, build: 3, haul: 1 }] as const;
  world.pawns.forEach((pawn, i) => {
    for (const work of ['gather', 'build', 'haul'] as const) if (pawn.priorities[work] !== priorities[i % 3]![work]) {
      out.push({ reason: 'Répartir collecte, construction et transport entre les trois colons.', command: { type: 'priority', pawnId: pawn.id, work, value: priorities[i % 3]![work] } });
    }
  });
  const plans: DesignateCommand[] = [
    ...[[-3, 2], [0, 2], [3, 2]].map(([x, z]) => ({ type: 'designate' as const, kind: 'bed' as const, x: cx + x!, z: cz + z!, orientation: 0 as const })),
    { type: 'designate', kind: 'table', x: cx, z: cz - 2, orientation: 1 },
    ...[[0, -3], [1, -3], [0, -1]].map(([x, z]) => ({ type: 'designate' as const, kind: 'stool' as const, x: cx + x!, z: cz + z! })),
    ...[-3, 3].flatMap(x => [-3, -2, -1].map(z => ({ type: 'designate' as const, kind: 'wall' as const, x: cx + x, z: cz + z }))),
  ];
  for (const plan of plans) {
    // Beds first, dining next, then an open windbreak. No claim of a roofed room.
    if (plan.kind !== 'bed' && world.structures.filter(s => s.kind === 'bed').length < 3) continue;
    if (plan.kind === 'wall' && world.structures.filter(s => s.kind === 'stool').length < 3) continue;
    if (canDesignate(world, plan).ok) out.push({ reason: 'Aménager progressivement le camp sans fermer son passage central.', command: plan });
  }
  for (const [dx, dz, food] of [[-2, 0, false], [-2, 1, false], [2, 1, true]] as const) {
    const x = cx + dx, z = cz + dz;
    if (!world.stockpiles.some(s => s.x === x && s.z === z)) out.push({ reason: 'Séparer le bois et les aliments près du camp.', command: { type: 'stockpile', x, z, enabled: true, filters: { wood: !food, food }, priority: 2, capacity: 75 } });
  }
  const outstandingWood = [...world.jobs, ...out.flatMap(d => d.command.type === 'designate' ? [d.command] : [])].reduce((n,j) => n + JOB_WOOD_COST[j.kind], 0);
  const nearby = [...world.resources].filter(r => Math.abs(r.x-cx) + Math.abs(r.z-cz) <= 28).sort((a,b) => Math.abs(a.x-cx)+Math.abs(a.z-cz)-(Math.abs(b.x-cx)+Math.abs(b.z-cz)) || a.id-b.id);
  for (const [kind, required] of [['tree', Math.max(40, outstandingWood + 20) - world.stock.wood], ['berries', (world.pawns.length * 1.6 - availableNutrition(world)) * (world.foodRules === 'legacy' ? 100 / 35 : 20)]] as const) {
    const action = kind === 'tree' ? 'chop' : 'harvest';
    let planned = nearby.filter(r => r.kind === kind && world.jobs.some(j => j.x === r.x && j.z === r.z)).reduce((n,r) => n+r.amount,0);
    for (const resource of nearby) {
      if (resource.kind !== kind || planned >= required) continue;
      const command: DesignateCommand = { type: 'designate', kind: action, x: resource.x, z: resource.z };
      if (canDesignate(world, command).ok) { out.push({ reason: kind === 'tree' ? 'Prévoir le bois des chantiers et une petite marge.' : 'Renouveler la réserve alimentaire avant la pénurie.', command }); planned += resource.amount; }
    }
  }
  return out;
}

export function colonySummary(world: World) {
  return { tick: world.tick, structures: Object.fromEntries(['bed','table','stool','wall'].map(kind => [kind,world.structures.filter(s=>s.kind===kind).length])), stock: { ...world.stock }, pending: world.jobs.length, minimumFood: Math.min(...world.pawns.map(p=>p.hunger)), minimumRest: Math.min(...world.pawns.map(p=>p.rest)) };
}

export function woodAccount(world: World): number {
  return world.piles.filter(p=>p.kind==='wood').reduce((n,p)=>n+p.quantity,0) + world.resources.filter(r=>r.kind==='tree').reduce((n,r)=>n+r.amount,0) + world.structures.reduce((n,s)=>n+JOB_WOOD_COST[s.kind],0);
}
export function foodAccount(world: World): number {
  return world.piles.filter(p=>p.kind==='food').reduce((n,p)=>n+p.quantity,0) + world.resources.filter(r=>r.kind==='berries').reduce((n,r)=>n+r.amount,0);
}
