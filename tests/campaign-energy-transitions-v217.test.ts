import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {newPowerState,isPowerActive} from '../src/sim/power-rules.ts';
import {reconcilePower} from '../src/sim/power.ts';
import {queryOrderOptions} from '../src/sim/player-orders.ts';
import {AIR_CONDITIONING_COST} from '../src/sim/research.ts';
import {miningSkill,miningWorkSpeed,miningYield} from '../src/sim/mining-skills.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {fixturePower} from './scenarios/power.ts';
import {energyDecisionDue,energyDecisions,energyPlan,energyTransitionDecisions,metalAccount,observeEnergy,type EnergyPlayerState} from './scenarios/energy-player.ts';
import type {Command,Structure,World} from '../src/sim/types.ts';

const valid=(w:World)=>expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);
const apply=(w:World,command:Command)=>{expect(applyCommand(w,command),JSON.stringify(command)).toMatchObject({ok:true});valid(w);};

/** Prepared supply and downstream network, without a flick, removal, cargo,
 * reconstruction job or outcome. The auxiliary generator is intentionally
 * outside the notebook's generator site: this case isolates the three bridge
 * operations; it proves neither initial battery charging nor the long night.
 * Available steel comes from a prepared exposed ore cell mined through actual
 * commands/engine, before this isolated electrical episode starts. */
function transitionCamp() {
  const w=deconstructionCamp(3,40),origin={x:5,z:5};
  const s:EnergyPlayerState={startTick:w.tick,origin,stage:'open',stageTick:w.tick,
    initialSteel:0,initialComponents:0,milestones:{},nightDrainTicks:0,previousBattery:0,electricMeals:0};
  const p=energyPlan(s);
  w.research={project:null,points:0,airConditioning:{points:AIR_CONDITIONING_COST,completedAt:w.tick}};
  for(const actor of w.pawns){actor.schedule.fill('work');actor.priorities.basic=1;actor.priorities.haul=2;}
  const part=(kind:Structure['kind'],x:number,z:number):Structure=>{
    const structure:Structure={id:w.nextId++,kind,x,z,orientation:0,footprint:'standard',material:'steel',power:newPowerState(kind)};
    w.structures.push(structure);return structure;
  };
  for(let x=5;x<14;x++)if(x!==10)part('power-conduit',origin.x+x,origin.z+5);
  const sw=part('power-switch',p.switch.x,p.switch.z),stove=part('electric-stove',p.stove.x,p.stove.z),cooler=part('cooler',p.cooler.x,p.cooler.z);
  stove.bills=[];
  cooler.cooler={target:-5,high:false};
  const generator=fixturePower(w,'wood-generator',23,9);
  // Transmitters form cardinal components, unlike consumers' six-cell wire
  // connection. Continue the downstream cable to the actual 2x2 generator.
  for(let x=origin.x+14;x<generator.x;x++)part('power-conduit',x,origin.z+5);
  const ore={x:19,z:14};w.tiles[ore.z*w.width+ore.x]={terrain:'rock',stone:'sandstone',ore:'steel'};
  refreshStock(w);reconcilePower(w);const miner=w.pawns[0]!;
  expect(miningSkill(miner).level).toBe(8);expect(miningWorkSpeed(miner)).toBe(1);expect(miningYield(miner)).toBe(1);
  apply(w,{type:'priority',pawnId:miner.id,work:'mine',value:1});
  apply(w,{type:'designate',kind:'mine',...ore});const mining=w.jobs.find(j=>j.kind==='mine')!;
  apply(w,{type:'order-job',pawnId:miner.id,jobId:mining.id,queue:false});
  // Steel has 1500 HP: nineteen 80 HP strokes. At level 8 the dark-light factor
  // .8 makes each captured stroke 125 Core (12.5 local), before the real approach.
  // This preparation allowance is separate from 1800 transition/600 stable ticks.
  let worked=false,damaged=false;
  for(let n=0;n<400&&(!isPowerActive(stove)||!isPowerActive(cooler)||w.jobs.some(j=>j.id===mining.id));n++){
    stepWorld(w);valid(w);
    worked ||= miner.jobId===mining.id&&miner.state==='working'&&(mining.pickTicks??0)>0;
    damaged ||= (w.tiles[ore.z*w.width+ore.x]!.miningDamage??0)>0;
  }
  const diagnostic=()=>JSON.stringify({tick:w.tick,miner:{x:miner.x,z:miner.z,state:miner.state,jobId:miner.jobId,
    order:miner.orders.active,need:miner.need?.kind,path:miner.path.length,mining:miningSkill(miner),speed:miningWorkSpeed(miner)},
    job:w.jobs.find(j=>j.id===mining.id),tile:w.tiles[ore.z*w.width+ore.x],worked,damaged});
  expect(isPowerActive(stove)&&isPowerActive(cooler)).toBe(true);
  expect(worked&&damaged,diagnostic()).toBe(true);
  expect(w.jobs.some(j=>j.id===mining.id),diagnostic()).toBe(false);
  expect(w.piles.filter(pile=>pile.item==='steel').reduce((sum,pile)=>sum+pile.quantity,0)).toBe(40);
  // The notebook starts at an explicitly prepared phase boundary after actual
  // startup. No earlier phase or milestone is attributed to this fixture.
  s.startTick=w.tick;s.stageTick=w.tick;s.initialSteel=metalAccount(w,'steel');
  const cut=w.structures.find(q=>q.kind==='power-conduit'&&q.x===p.cut.x&&q.z===p.cut.z)!;
  valid(w);return {w,s,sw,stove,cooler,generator,cut};
}

test('Énergie publie, réalise et reprend les transitions physiques avec deux coupures120 et600ticks finaux',()=>{
  const {w,s,sw,stove,cooler,generator,cut}=transitionCamp(),initialSteel=metalAccount(w,'steel'),originals=[...w.pawns];
  const started=w.tick,journal:{tick:number;command:Command}[]=[],phases=[s.stage];
  let replayed=false,carriedSteel=false,travelling=false,sawUnpowered=false;
  for(let n=0;n<1800&&(s.stage!=='done'||w.tick-s.stageTick<600);n++){
    if(energyDecisionDue(w,s)){
      const before=serializeWorld(w),rng=w.rng,nextId=w.nextId,decisions=energyTransitionDecisions(w,s);
      expect(decisions.length).toBeLessThanOrEqual(1);expect(serializeWorld(w)).toBe(before);expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);
      for(const d of decisions){apply(w,d.command);journal.push({tick:w.tick,command:d.command});}
    }
    travelling ||= w.pawns.some(actor=>!!actor.motion&&(!!actor.haul||actor.jobId!==null||!!actor.orders.active));
    carriedSteel ||= w.piles.some(pile=>pile.item==='steel'&&pile.owner.type==='pawn');
    if(!replayed&&carriedSteel){
      const saved=serializeWorld(w),copy=deserializeWorld(saved),observer=structuredClone(s);
      stepWorld(w);stepWorld(copy);observeEnergy(w,s);observeEnergy(copy,observer);
      expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(observer).toEqual(s);replayed=true;
    } else {stepWorld(w);observeEnergy(w,s);}
    if(phases.at(-1)!==s.stage)phases.push(s.stage);
    sawUnpowered ||= !isPowerActive(stove)&&!isPowerActive(cooler);
    valid(w);expect(metalAccount(w,'steel')).toBe(initialSteel);
    expect(w.pawns.every(actor=>actor.state!=='dead'&&actor.state!=='downed'&&actor.hunger>0&&actor.rest>0)).toBe(true);
  }
  expect(phases).toEqual(['open','close','remove','rebuild','done']);
  expect(s.milestones.switchRestored!-s.milestones.switchCut!).toBeGreaterThanOrEqual(120);
  expect(s.milestones.cableRestored!-s.milestones.cableCut!).toBeGreaterThanOrEqual(120);
  expect(s.stage).toBe('done');expect(w.tick-s.stageTick).toBeGreaterThanOrEqual(600);
  // Local fixture budget only: it supplies no promise for the campaign's J48.
  expect(w.tick-started).toBeLessThan(1800);
  expect({travelling,carriedSteel,replayed,sawUnpowered}).toEqual({travelling:true,carriedSteel:true,replayed:true,sawUnpowered:true});
  expect(sw.power!.switchOn).toBe(true);expect(isPowerActive(stove)&&isPowerActive(cooler)).toBe(true);
  expect(w.structures.some(q=>q.id===cut.id)).toBe(false);
  const rebuilt=w.structures.find(q=>q.kind==='power-conduit'&&q.x===cut.x&&q.z===cut.z)!;
  expect(rebuilt.id).not.toBe(cut.id);expect(generator.fuel!.burned).toBeGreaterThan(0);
  for(const actor of originals)expect(w.pawns.find(q=>q.id===actor.id)).toBe(actor);
  expect(w.piles.filter(pile=>pile.item==='steel').reduce((sum,pile)=>sum+pile.quantity,0)).toBe(39);
  expect(journal.some(j=>j.command.type==='power-flick'&&j.command.on===false)).toBe(true);
  expect(journal.some(j=>j.command.type==='power-flick'&&j.command.on===true)).toBe(true);
  expect(journal.some(j=>j.command.type==='designate'&&j.command.kind==='deconstruct')).toBe(true);
  expect(journal.some(j=>j.command.type==='designate'&&j.command.kind==='power-conduit')).toBe(true);
});

test('Énergie rapproche seulement ses manœuvres et respecte refus réel, transport et travail déjà acceptés',()=>{
  const {w,s,sw}=transitionCamp();
  while(w.tick%250===0||w.tick%20===0){stepWorld(w);valid(w);}
  s.stageTick=w.tick;
  expect(energyDecisionDue(w)).toBe(false);expect(energyDecisionDue(w,s)).toBe(true);
  const ordinary={...s,stage:'construct' as const};expect(energyDecisionDue(w,ordinary)).toBe(false);
  const before=serializeWorld(w),request=energyDecisions(w,s);
  expect(request).toEqual(energyTransitionDecisions(w,s));expect(request).toHaveLength(1);
  expect(request[0]!.command.type).toBe('power-flick');expect(serializeWorld(w)).toBe(before);
  apply(w,request[0]!.command);const job=w.jobs.find(j=>j.flick?.structureId===sw.id)!;
  for(const actor of w.pawns)apply(w,{type:'priority',pawnId:actor.id,work:'basic',value:0});
  expect(queryOrderOptions(w,w.pawns[0]!.id,job).find(o=>o.jobId===job.id)?.enabled).toBe(false);
  const refused=serializeWorld(w);expect(energyTransitionDecisions(w,s)).toEqual([]);expect(serializeWorld(w)).toBe(refused);
  const actor=w.pawns[0]!;apply(w,{type:'priority',pawnId:actor.id,work:'basic',value:1});
  const accepted=energyTransitionDecisions(w,s);expect(accepted).toHaveLength(1);
  expect(accepted[0]!.command).toEqual({type:'order-job',pawnId:actor.id,jobId:job.id,queue:false});apply(w,accepted[0]!.command);
  const path=actor.path,motion=actor.motion,progress=job.progress,reservation=job.reservedBy,confirmed=serializeWorld(w);
  expect(energyTransitionDecisions(w,s)).toEqual([]);expect(serializeWorld(w)).toBe(confirmed);
  expect(actor.path).toBe(path);expect(actor.motion).toBe(motion);expect(job.progress).toBe(progress);expect(job.reservedBy).toBe(reservation);
  // Finish the accepted real service, close through the same physical API,
  // then request the actual conduit removal rather than injecting its result.
  for(let n=0;n<180&&sw.power!.switchOn!==false;n++){stepWorld(w);observeEnergy(w,s);valid(w);}
  expect(sw.power!.switchOn).toBe(false);
  for(let n=0;n<140&&s.stage==='open';n++){stepWorld(w);observeEnergy(w,s);valid(w);}
  expect(s.stage).toBe('close');
  apply(w,energyTransitionDecisions(w,s)[0]!.command);
  for(let n=0;n<180&&s.stage!=='remove';n++){
    for(const d of energyTransitionDecisions(w,s))apply(w,d.command);
    stepWorld(w);observeEnergy(w,s);valid(w);
  }
  expect(s.stage).toBe('remove');
  for(let n=0;n<300&&s.stage!=='rebuild';n++){
    for(const d of energyTransitionDecisions(w,s))apply(w,d.command);
    stepWorld(w);observeEnergy(w,s);valid(w);
  }
  expect(s.stage).toBe('rebuild');apply(w,energyTransitionDecisions(w,s)[0]!.command);
  const build=w.jobs.find(j=>j.kind==='power-conduit')!,delivery=energyTransitionDecisions(w,s);
  expect(delivery).toHaveLength(1);expect(delivery[0]!.command.type).toBe('order-haul');apply(w,delivery[0]!.command);
  const carrier=w.pawns.find(q=>q.haul?.destination.type==='job'&&q.haul.destination.jobId===build.id)!;
  const haul=carrier.haul,pathToSteel=carrier.path,transport=serializeWorld(w);
  expect(energyTransitionDecisions(w,s)).toEqual([]);expect(serializeWorld(w)).toBe(transport);
  expect(carrier.haul).toBe(haul);expect(carrier.path).toBe(pathToSteel);
  const clock=w.tick;stepWorld(w);expect(energyDecisionDue(w,s)).toBe(w.tick%20===0||w.tick%250===0);
  expect(w.tick).toBe(clock+1);valid(w);
});
