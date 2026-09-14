import { expect, test } from 'vitest';
import { createWorld, applyCommand, stepWorld, validateWorld, serializeWorld, deserializeWorld } from '../src/sim/index';
import { playerDecisions, colonySummary, woodAccount, foodAccount } from './scenarios/colony-player';

test('joueur ordinaire : cinq à huit jours, trois cartes naturelles, camp construit, stocks entretenus et reprise exacte', () => {
  for (const seed of [42, 93, 2048]) {
    let world = createWorld(seed, 250, 250);
    const initialWood = woodAccount(world), initialFood = foodAccount(world);
    let consumed = 0, produced = 0, cooked = 0;
    const meals = new Map(world.pawns.map(p=>[p.id,0])), sleep = new Map(world.pawns.map(p=>[p.id,0]));
    const report: ReturnType<typeof colonySummary>[] = [];
    for (let t = 0; t < (seed === 42 ? 48000 : 30000); t++) {
      // Seed 42 also exercises the browser player's four-hour observation cadence.
      if (t % (seed===42?1000:250) === 0) for (const decision of playerDecisions(world)) {
        expect(applyCommand(world, decision.command), JSON.stringify({seed,t,decision})).toMatchObject({ok:true});
      }
      const ingesting = world.pawns.filter(p=>p.need?.kind==='eat' && p.need.phase==='ingest' && p.need.progress===49).map(p=>({id:p.id,quantity:p.need?.kind==='eat'?p.need.quantity:0}));

      stepWorld(world);
      for (const event of world.events) if (event.tick === world.tick) { const match = event.message.match(/a récolté (\d+) (?:baies|riz)/); if (match) produced += Number(match[1]);if(event.message.includes('a cuisiné 1 repas simple'))cooked++; }
      for (const {id,quantity} of ingesting) if(world.events.some(e=>e.tick===world.tick&&e.message.startsWith(`${world.pawns.find(p=>p.id===id)!.name} a mangé`))) { meals.set(id, meals.get(id)!+1); consumed += quantity; }
      for (const pawn of world.pawns) if (pawn.state==='sleeping' && pawn.need?.kind==='sleep' && pawn.need.bedId!==null) sleep.set(pawn.id,sleep.get(pawn.id)!+1);
      if (t % 50 === 0) {
        const context=JSON.stringify({seed,...colonySummary(world)});
        expect(validateWorld(world),context).toEqual([]);expect(woodAccount(world),context).toBe(initialWood);
        expect(foodAccount(world)+consumed+9*cooked,context).toBe(initialFood+produced);
        expect(world.pawns.every(p=>p.hunger>0 && p.rest>0),context).toBe(true);
      }
      if (world.tick % 6000 === 0) {
        report.push(colonySummary(world));
        const saved=serializeWorld(world), resumed=deserializeWorld(saved);
        stepWorld(world,250);stepWorld(resumed,250);
        expect(serializeWorld(resumed)).toBe(serializeWorld(world));
        // Continue from the original checkpoint so the player still observes each hour.
        world=deserializeWorld(saved);
      }
    }
    const context=JSON.stringify({seed,report,meals:[...meals],sleep:[...sleep]});
    expect(report[0]!.structures,context).toMatchObject({bed:3,table:1,stool:3});
    expect(report[4]!.structures,context).toEqual({bed:3,table:1,stool:3,wall:6,campfire:1});
    expect(cooked,context).toBeGreaterThanOrEqual(12);
    expect(world.jobs.filter(j=>j.growingZoneId===undefined),context).toEqual([]);
    expect(world.growingZones,context).toHaveLength(1); expect(world.resources.filter(r=>r.kind==='rice').length,context).toBeGreaterThan(5); expect(world.stock.food,context).toBeGreaterThan(0);
    expect([...meals.values()].every(n=>n>=10),context).toBe(true);
    expect([...sleep.values()].every(n=>n>4000),context).toBe(true);
  }
}, 180000);
