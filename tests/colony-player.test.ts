import { enableArrivals } from '../src/sim/arrivals';
import { expect, test } from 'vitest';
import { createWorld, applyCommand, stepWorld, validateWorld, serializeWorld, deserializeWorld } from '../src/sim/index';
import { playerArrivalDecisions,playerArrivalComplete,playerDecisions, playerFocusDecisions, colonySummary, woodAccount, foodAccount } from './scenarios/colony-player';

test('joueur ordinaire : cinq à huit jours, trois cartes naturelles, camp construit, stocks entretenus et reprise exacte', () => {
  for (const seed of [42, 93, 2048]) {
    let world = createWorld(seed, 250, 250);
    if(seed===42)enableArrivals(world);
    const population=seed===42?4:3;
    for(const decision of playerArrivalDecisions(world))expect(applyCommand(world,decision.command)).toMatchObject({ok:true});
    for(let i=0;i<120&&!playerArrivalComplete(world);i++)stepWorld(world);
    expect(playerArrivalComplete(world)).toBe(true);expect(validateWorld(world)).toEqual([]);
    expect(applyCommand(world,{type:'draft',pawnIds:[world.pawns[0]!.id],enabled:false})).toMatchObject({ok:true});
    const initialWeapon=structuredClone(world.piles.find(p=>p.kind==='weapon')!);
    const initialWood = woodAccount(world), initialFood = foodAccount(world);
    let consumed = 0, produced = 0, cooked = 0, rationAssignments = 0;
    const recreationKinds=new Set<string>(), recreationPawns=new Set<number>();
    const meals = new Map(world.pawns.map(p=>[p.id,0])), sleep = new Map(world.pawns.map(p=>[p.id,0]));
    const report: ReturnType<typeof colonySummary>[] = [];
    for (let t = 0; t < (seed === 42 ? 48000 : 30000); t++) {
      // Seed 42 also exercises the browser player's four-hour observation cadence.
      if (t % (seed===42?1000:250) === 0) for (const decision of playerDecisions(world)) {
        expect(applyCommand(world, decision.command), JSON.stringify({seed,t,decision})).toMatchObject({ok:true});
        if(decision.command.type==='food-policy-assign'&&decision.command.policyId===3)rationAssignments++;
      }
      if(t===0)for(const decision of playerFocusDecisions(world))expect(applyCommand(world,decision.command)).toMatchObject({ok:true});
      const ingesting = world.pawns.filter(p=>p.need?.kind==='eat' && p.need.phase==='ingest' && p.need.progress===49).map(p=>({id:p.id,quantity:p.need?.kind==='eat'?p.need.quantity:0}));

      const moods=world.pawns.map(p=>p.mood);
      stepWorld(world);
      for(const [i,p] of world.pawns.entries())if(p.mood-moods[i]!>.04800001||p.mood-moods[i]!<-.03200001)throw new Error(`Mood discontinuity: seed ${seed}, tick ${world.tick}, pawn ${p.id}`);
      for (const event of world.events) if (event.tick === world.tick) { const match = event.message.match(/a récolté (\d+) (?:baies|riz)/); if (match) produced += Number(match[1]);if(event.message.includes('a cuisiné 1 repas simple'))cooked++; }
      for (const {id,quantity} of ingesting) if(world.events.some(e=>e.tick===world.tick&&e.message.startsWith(`${world.pawns.find(p=>p.id===id)!.name} a mangé`))) { meals.set(id, (meals.get(id)??0)+1); consumed += quantity; }
      for (const pawn of world.pawns) if (pawn.state==='sleeping' && pawn.need?.kind==='sleep' && pawn.need.bedId!==null) sleep.set(pawn.id,(sleep.get(pawn.id)??0)+1);
      for(const pawn of world.pawns)if(pawn.state==='recreating'&&pawn.recreation.task){recreationKinds.add(pawn.recreation.task.activity);recreationPawns.add(pawn.id);}
      if (t % 50 === 0) {
        const context=JSON.stringify({seed,...colonySummary(world)});
        expect(world.piles.filter(p=>p.kind==='weapon')).toHaveLength(1);expect(world.piles.find(p=>p.id===initialWeapon.id)?.weapon).toEqual(initialWeapon.weapon);
        if(t>=250)expect(world.piles.find(p=>p.id===initialWeapon.id)?.owner.type).toBe('equipment');
        expect(validateWorld(world),context).toEqual([]);expect(woodAccount(world),context).toBe(initialWood);
        expect(foodAccount(world)+consumed+9*cooked,context).toBe(initialFood+produced);
        expect(world.pawns.every(p=>p.hunger>0 && p.rest>0),context).toBe(true);
        expect(world.pawns.every(p=>p.state!=='dead'&&p.state!=='downed'&&!p.health?.injuries.length&&!p.health?.missing.length),context).toBe(true);
        // An ordinary player does not attack its own settlers to manufacture a
        // combat milestone. The companion UI scenario explicitly tests that order.
        expect(colonySummary(world).combat,context).toEqual({shooters:0,flights:0,impacts:0});
      }
      if (world.tick % 6000 === 0) {
        if(process.env.COLONY_PROGRESS==='1')console.info(`Colony ${seed}: day ${world.tick/6000}, ${world.jobs.length} pending jobs`);
        report.push(colonySummary(world));
        for(const workplace of report.at(-1)!.workplaces) {
          expect(workplace.total).toBeGreaterThanOrEqual(.32);expect(workplace.total).toBeLessThanOrEqual(1);
          const fire=world.structures.find(s=>s.id===workplace.id);
          if(fire?.kind==='campfire'&&fire.fuel!.ticks>0)expect(workplace.lighting).toBe(1);
        }
        const saved=serializeWorld(world), resumed=deserializeWorld(saved);
        stepWorld(world,250);stepWorld(resumed,250);
        expect(serializeWorld(resumed)).toBe(serializeWorld(world));
        // Continue from the original checkpoint so the player still observes each hour.
        world=deserializeWorld(saved);
      }
    }
    const context=JSON.stringify({seed,report,meals:[...meals],sleep:[...sleep]});
    expect(report[0]!.structures,context).toMatchObject({bed:3,table:1,stool:3});
    expect(report[4]!.structures,context).toEqual({'wood-generator':1,'standing-lamp':1,'passive-cooler':0,bed:population,table:1,stool:3,wall:7,campfire:1,horseshoes:1,stonecutter:1,door:1});
    expect(report[4]!.roofing,context).toEqual({constructed:28,planned:28,removal:0});
    expect([...recreationKinds].sort(),context).toEqual(['horseshoes','skygaze']);expect(recreationPawns.size,context).toBe(population);
    expect(cooked,context).toBeGreaterThanOrEqual(12);
    expect(rationAssignments,context).toBeGreaterThanOrEqual(3);
    expect(world.tiles.filter(t=>t.terrain==='rough-stone').length,context).toBeGreaterThanOrEqual(6);
    expect(colonySummary(world).mining.blocks,context).toBe(35);expect(colonySummary(world).mining.blocksStored,context).toBe(35);
    expect(colonySummary(world).mining.components,context).toBe(4);expect(colonySummary(world).mining.componentsStored,context).toBe(4);
    expect(colonySummary(world).mining.steel,context).toBe(50);expect(colonySummary(world).mining.steelStored,context).toBe(50);expect(colonySummary(world).mining.steelInBuildings,context).toBe(150);expect(colonySummary(world).structures.stonecutter,context).toBe(1);
    expect(colonySummary(world).mining.componentsInBuildings,context).toBe(2);
    expect(colonySummary(world).power.filter(s=>s.on),context).toHaveLength(2);
    expect(colonySummary(world).medicines,context).toEqual({total:30,stored:30,policies:Array(population).fill('industrial')});
    expect(colonySummary(world).mining.stored,context).toBe(colonySummary(world).mining.chunks);
    expect(world.deconstructed.count,context).toBe(1);
    expect(world.structures.find(s=>s.kind==='horseshoes')?.x,context).toBe(Math.floor(world.width/2)+4);expect(world.packed,context).toEqual([]);
    const maintenance=world.jobs.filter(j=>j.growingZoneId===undefined);
    expect(maintenance.filter(j=>j.kind!=='chop'),context).toEqual([]);
    // Midnight is not a drained queue: prove the specific remaining fuel jobs
    // finish after normal sleep, without adding orders or changing needs.
    if(maintenance.length) {
      const followup=deserializeWorld(serializeWorld(world)),ids=new Set(maintenance.map(j=>j.id));
      for(let t=0;t<6000&&followup.jobs.some(j=>ids.has(j.id));t++)stepWorld(followup);
      expect(followup.jobs.filter(j=>ids.has(j.id)),context).toEqual([]);
      expect(validateWorld(followup),context).toEqual([]);
    }
    expect(world.pawns.some(p=>p.skills.construction.xp>1000000),context).toBe(true);
    expect(world.growingZones,context).toHaveLength(1); expect(world.resources.filter(r=>r.kind==='rice').length,context).toBeGreaterThan(5); expect(world.stock.food,context).toBeGreaterThan(0);
    expect([...meals.values()].every(n=>n>=10),context).toBe(true);
    expect([...sleep.values()].every(n=>n>4000),context).toBe(true);
    expect(colonySummary(world).plantClimate,context).toEqual({slowed:0,thermalAnchors:0});
    expect(colonySummary(world).apparel.filter(i=>i.owner.type==='apparel'),context).toHaveLength(population+1);
    expect(world.restRules).toBe('adult');expect(world.pawns.map(p=>p.schedule.filter(s=>s==='sleep').length)).toEqual(Array(population).fill(8));
    expect(world.pawns).toHaveLength(population);expect(meals.size).toBe(population);expect(sleep.size).toBe(population);
    if(seed===42)expect(world.arrivals?.accepted).toBe(1);
    expect(world.pawns[2]!.schedule[5]).toBe('anything');expect(world.pawns[2]!.schedule[21]).toBe('sleep');
  }
// This is a correctness journey with deep checkpoints, not a tick-time budget.
// Keep a wall-clock ceiling while separate profiling measures simulation costs.
}, 300000);
