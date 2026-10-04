import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization';
import { constructionRecipe,constructionSupplied,deliveredMaterial } from '../src/sim/construction-materials';
import { MINING_SKILLS_CELLS,prepareMiningSkillsDemo } from '../scripts/create-mining-skills-v204-test-save';
import type { Command,World } from '../src/sim/types';

/** This is the public prepared scene, not a natural campaign. Every stroke,
 * pickup, delivery and frame finish below goes through the real engine. */
test('V204 : minerai intact → acier rangé → mur en acier, conservation et reprises pendant livraison/finition',()=>{
  const w=prepareMiningSkillsDemo(),expert=w.pawns[2]!,target=MINING_SKILLS_CELLS.expertSteel;
  const index=target.z*w.width+target.x,store=MINING_SKILLS_CELLS.steelStore,wallCell={x:24,z:18};
  const steelTotal=(world:World)=>world.piles.reduce((sum,p)=>sum+(p.item==='steel'?p.quantity:0),0);
  const command=(c:Command)=>{const result=applyCommand(w,c);expect(result.ok,result.reason).toBe(true);};
  let observedMiningGains=0;
  const step=()=>{
    const beforeXp=expert.skills.mining!.xp;stepWorld(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);
    const gain=expert.skills.mining!.xp-beforeXp;
    if(gain>0){observedMiningGains+=gain;expect(Math.max(Math.abs(expert.x-target.x),Math.abs(expert.z-target.z))).toBe(1);}
  };
  const until=(done:()=>boolean,limit=900)=>{
    for(let n=0;n<limit&&!done();n++)step();
    expect(done(),JSON.stringify({tick:w.tick,pawns:w.pawns,jobs:w.jobs,piles:w.piles})).toBe(true);
  };
  const others=()=>w.pawns.filter(p=>p.id!==expert.id);
  const untouched=structuredClone(others().map(p=>p.skills.mining));
  expect(w.jobs).toHaveLength(0);expect(w.structures).toHaveLength(0);expect(steelTotal(w)).toBe(0);
  expect(w.tiles[index]).toEqual({terrain:'rock',stone:'granite',ore:'steel'});
  expect(w.pawns.every(p=>p.schedule.every(slot=>slot==='work'))).toBe(true);
  expect(w.piles.some(p=>p.item==='survival-meal'&&p.quantity===9&&p.owner.type==='ground')).toBe(true);

  command({type:'priority',pawnId:expert.id,work:'mine',value:1});
  command({type:'designate',kind:'mine',...target});
  expect(expert.skills.mining!.xp).toBe(0);expect(w.tiles[index]!.miningDamage).toBeUndefined();
  until(()=>!!w.tiles[index]!.miningDamage);
  expect(expert.state).toBe('working');expect(Math.max(Math.abs(expert.x-target.x),Math.abs(expert.z-target.z))).toBe(1);
  expect(w.tiles[index]!.miningYield).toBeGreaterThan(0);expect(steelTotal(w)).toBe(0);
  until(()=>w.tiles[index]!.terrain==='rough-stone');
  expect(w.tiles[index]).toEqual({terrain:'rough-stone',stone:'granite'});
  const output=w.piles.filter(p=>p.item==='steel');expect(output).toHaveLength(1);
  const extracted=output[0]!.quantity;expect([45,46]).toContain(extracted);
  expect(output[0]!.owner).toEqual({type:'ground',...target});
  expect(others().map(p=>p.skills.mining)).toEqual(untouched);
  expect(observedMiningGains).toBeGreaterThan(0);
  command({type:'priority',pawnId:expert.id,work:'mine',value:0});

  until(()=>w.piles.some(p=>p.item==='steel'&&p.owner.type==='pawn'));
  const oreCarrier=w.piles.find(p=>p.item==='steel'&&p.owner.type==='pawn')!;
  const hauler=w.pawns.find(p=>oreCarrier.owner.type==='pawn'&&p.id===oreCarrier.owner.pawnId)!;
  expect(hauler.haul).toMatchObject({phase:'deliver',carryPileId:oreCarrier.id,destination:{type:'stockpile'}});
  expect(Math.max(Math.abs(hauler.x-target.x),Math.abs(hauler.z-target.z))).toBeLessThanOrEqual(1);
  expect(steelTotal(w)).toBe(extracted);
  until(()=>w.piles.filter(p=>p.item==='steel').every(p=>p.owner.type==='ground'&&p.owner.x===store.x&&p.owner.z===store.z));
  expect(w.piles.filter(p=>p.item==='steel')).toMatchObject([{quantity:extracted,owner:{type:'ground',...store}}]);
  const miningAtStore=structuredClone(expert.skills.mining!),storedTick=w.tick,earnedAtStore=observedMiningGains;

  const recipe=constructionRecipe({kind:'wall',material:'steel'});
  expect(recipe.ingredients).toEqual([{item:'steel',quantity:5}]);
  const cost=recipe.ingredients[0]!.quantity;
  command({type:'priority',pawnId:expert.id,work:'build',value:1});
  command({type:'designate',kind:'wall',material:'steel',...wallCell});
  const wallJob=w.jobs.find(j=>j.kind==='wall'&&j.x===wallCell.x&&j.z===wallCell.z)!;
  expect(wallJob).toMatchObject({construction:'blueprint',material:'steel',progress:0,escrow:{wood:0,food:0}});
  expect(deliveredMaterial(w,wallJob,'steel')).toBe(0);expect(constructionSupplied(w,wallJob)).toBe(false);

  const deliveryPawn=()=>w.pawns.find(p=>p.haul?.phase==='deliver'&&p.haul.destination.type==='job'&&p.haul.destination.jobId===wallJob.id);
  until(()=>!!deliveryPawn());
  const builderCarrier=deliveryPawn()!,carried=w.piles.find(p=>p.id===builderCarrier.haul!.carryPileId)!;
  expect(carried).toMatchObject({item:'steel',quantity:cost,owner:{type:'pawn',pawnId:builderCarrier.id}});
  expect(Math.max(Math.abs(builderCarrier.x-store.x),Math.abs(builderCarrier.z-store.z))).toBeLessThanOrEqual(1);
  expect(w.piles.find(p=>p.item==='steel'&&p.owner.type==='ground')!.quantity).toBe(extracted-cost);
  expect(steelTotal(w)).toBe(extracted);expect(w.structures).toHaveLength(0);
  expect(wallJob.escrow).toEqual({wood:0,food:0});
  const deliveryResume=deserializeWorld(serializeWorld(w));expect(deliveryResume).toEqual(w);

  const pairedStep=(copy:World)=>{
    step();stepWorld(copy);expect(validateWorld(copy)).toEqual([]);expect(copy).toEqual(w);
  };
  for(let n=0;n<900&&!(wallJob.construction==='frame'&&wallJob.progress>0);n++){
    pairedStep(deliveryResume);expect(steelTotal(w)).toBe(extracted);
  }
  expect(wallJob.construction).toBe('frame');expect(wallJob.progress).toBeGreaterThan(0);
  expect(constructionSupplied(w,wallJob)).toBe(true);expect(deliveredMaterial(w,wallJob,'steel')).toBe(cost);
  expect(w.piles.find(p=>p.item==='steel'&&p.owner.type==='job')).toMatchObject({quantity:cost,owner:{type:'job',jobId:wallJob.id}});
  expect(wallJob.escrow).toEqual({wood:0,food:0});
  const finishing=w.pawns.find(p=>p.jobId===wallJob.id)!;
  expect(finishing.state).toBe('working');expect(Math.max(Math.abs(finishing.x-wallCell.x),Math.abs(finishing.z-wallCell.z))).toBeLessThanOrEqual(1);
  const finishResume=deserializeWorld(serializeWorld(w));expect(finishResume).toEqual(w);

  const wallBuilt=()=>w.structures.some(s=>s.kind==='wall'&&s.material==='steel'&&s.x===wallCell.x&&s.z===wallCell.z);
  for(let n=0;n<300&&!wallBuilt();n++){
    pairedStep(finishResume);stepWorld(deliveryResume);expect(deliveryResume).toEqual(w);
    expect(steelTotal(w)+(wallBuilt()?cost:0)).toBe(extracted);
  }
  expect(wallBuilt()).toBe(true);expect(w.structures).toHaveLength(1);expect(w.jobs).toHaveLength(0);
  expect(steelTotal(w)).toBe(extracted-cost);
  expect(w.piles.filter(p=>p.item==='steel')).toMatchObject([{quantity:extracted-cost,owner:{type:'ground',...store}}]);
  expect(w.piles.every(p=>p.owner.type!=='job')).toBe(true);
  expect(others().map(p=>p.skills.mining)).toEqual(untouched);
  // Construction gives no mining XP. Preserve its earned practice while
  // allowing the ordinary level20 forgetting cadence to continue.
  expect(expert.skills.mining!.level).toBe(miningAtStore.level);
  expect(expert.skills.mining!.passion).toBe(miningAtStore.passion);
  expect(expert.skills.mining!.xp).toBeLessThanOrEqual(miningAtStore.xp);
  expect(expert.skills.mining!.dailyXp).toBeLessThanOrEqual(miningAtStore.dailyXp);
  expect(expert.skills.mining!.xp-expert.skills.mining!.dailyXp).toBe(miningAtStore.xp-miningAtStore.dailyXp);
  expect(observedMiningGains).toBe(earnedAtStore);
  // Common skill forgetting at level20: 12XP on its staggered twenty-tick
  // cadence. No day boundary is crossed in this bounded midday scene.
  let forgotten=0;
  for(let t=storedTick+1;t<=w.tick;t++)if((t%20+expert.id%20)%20===0)forgotten+=12_000;
  expect(expert.skills.mining).toEqual({...miningAtStore,xp:miningAtStore.xp-forgotten,dailyXp:miningAtStore.dailyXp-forgotten});
  expect(expert.skills.construction.xp).toBeGreaterThan(0);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});
