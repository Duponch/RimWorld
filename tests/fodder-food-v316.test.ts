import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {foodScore} from '../src/sim/food-selection.ts';
import {ingestionFoodPoison} from '../src/sim/food-poisoning.ts';
import {moodThoughts} from '../src/sim/mood.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {TICKS_PER_DAY,type Command,type World} from '../src/sim/types.ts';
import {foodWorkstationCamp} from './scenarios/food-workstations.ts';
import {feedingCamp} from './scenarios/feeding.ts';

function camp():World {
  const w=foodWorkstationCamp(),p=w.pawns[0]!;delete p.background;delete p.traits;p.hunger=20;return w;
}
const command=(w:World,c:Command)=>expect(applyCommand(w,c)).toMatchObject({ok:true});
const units=(w:World,item:'hay'|'kibble')=>w.piles.reduce((n,p)=>n+(p.item===item?p.quantity:0),0);
function until(w:World,done:()=>boolean,limit=1000):void {
  for(let i=0;i<limit&&!done();i++)stepWorld(w);
  expect(done(),`transition missing at tick ${w.tick}`).toBe(true);expect(validateWorld(w)).toEqual([]);
}
function selected(w:World):string|null|undefined {
  const task=w.pawns[0]!.need;
  return task?.kind==='eat'?w.piles.find(p=>p.id===(task.carryPileId??task.sourcePileId))?.item:null;
}

test('new human diets admit kibble but hay remains inedible even at zero hunger and rejected policy updates are atomic',()=>{
  const w=camp(),p=w.pawns[0]!;expect(w.foodPolicies.find(q=>q.id===1)!.allowed).toContain('kibble');
  p.hunger=0;addGroundMaterial(w,'food',200,{x:5,z:4},'hay');const before=serializeWorld(w);
  expect(applyCommand(w,{type:'food-policy-update',policyId:1,name:'Foin',allowed:['hay']} as unknown as Command).ok).toBe(false);
  expect(serializeWorld(w)).toBe(before);stepWorld(w,40);
  expect(p.need?.kind).not.toBe('eat');expect(p.hunger).toBe(0);expect(units(w,'hay')).toBe(200);
  addGroundMaterial(w,'food',75,{x:5,z:5},'kibble');p.needCooldown=0;
  until(w,()=>selected(w)==='kibble');expect(units(w,'hay')).toBe(200);expect(units(w,'kibble')).toBe(75);
});

test('human food search compares the exact kibble penalty with distance and applies diet before preference',()=>{
  const w=camp(),p=w.pawns[0]!;addGroundMaterial(w,'food',75,{x:5,z:4},'kibble');
  addGroundMaterial(w,'food',20,{x:25,z:4},'rice');
  expect(foodScore('kibble',1)).toBeCloseTo(-1270/9-1,12);
  expect(foodScore('rice',21)).toBeGreaterThan(foodScore('kibble',1));
  stepWorld(w);expect(selected(w)).toBe('rice');
  const restricted=camp(),q=restricted.pawns[0]!;addGroundMaterial(restricted,'food',75,{x:5,z:4},'kibble');
  addGroundMaterial(restricted,'food',20,{x:25,z:4},'rice');
  command(restricted,{type:'food-policy-update',policyId:4,name:'Croquettes',allowed:['kibble']});
  command(restricted,{type:'food-policy-assign',pawnId:q.id,policyId:4});
  stepWorld(restricted);expect(selected(restricted)).toBe('kibble');expect(p.hunger).toBeLessThan(20);
});

test('kibble is physically split and ingested before nutrition and its one-day minus-twelve memory survive reload',()=>{
  const w=camp(),p=w.pawns[0]!;addGroundMaterial(w,'food',75,{x:5,z:4},'kibble');
  until(w,()=>p.need?.kind==='eat'&&p.need.phase==='ingest'&&p.need.progress===1);
  const held=w.piles.find(q=>q.item==='kibble'&&q.owner.type==='pawn')!;
  expect(held.quantity).toBe(16);expect(units(w,'kibble')).toBe(75);expect(p.hunger).toBeLessThan(20);
  expect(p.memories.some(m=>m.kind==='ate-kibble')).toBe(false);
  const resumed=deserializeWorld(serializeWorld(w));until(w,()=>p.memories.some(m=>m.kind==='ate-kibble'));
  stepWorld(resumed,w.tick-resumed.tick);expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  expect(units(w,'kibble')).toBe(59);expect(p.hunger).toBeGreaterThan(90);
  const memory=p.memories.find(m=>m.kind==='ate-kibble')!;
  expect(memory.expiresAt).toBe(w.tick+TICKS_PER_DAY);
  expect(moodThoughts(w,p).find(t=>t.id==='ate-kibble')?.offset).toBe(-12);
  expect(p.memories.some(m=>m.kind==='ate-raw-food')).toBe(false);
  w.tick=memory.expiresAt-1;expect(moodThoughts(w,p).some(t=>t.id==='ate-kibble')).toBe(true);
  w.tick++;expect(moodThoughts(w,p).some(t=>t.id==='ate-kibble')).toBe(false);
});

test('a changed diet preserves the committed carried kibble ration and forbids the next meal',()=>{
  const w=camp(),p=w.pawns[0]!;addGroundMaterial(w,'food',75,{x:12,z:12},'kibble');
  until(w,()=>p.need?.kind==='eat'&&p.need.carryPileId!==undefined&&p.need.carryPileId!==null);
  command(w,{type:'food-policy-assign',pawnId:p.id,policyId:4});
  const resumed=deserializeWorld(serializeWorld(w));until(w,()=>p.memories.some(m=>m.kind==='ate-kibble'));
  stepWorld(resumed,w.tick-resumed.tick);expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  const remaining=units(w,'kibble');expect(remaining).toBe(59);
  p.hunger=20;p.needCooldown=0;stepWorld(w,40);
  expect(p.need?.kind).not.toBe('eat');expect(units(w,'kibble')).toBe(remaining);
});

test('bedside kibble uses the patient diet, exclusive held nutrition and preserved commitment rather than the doctor diet',()=>{
  const w=feedingCamp(),doctor=w.pawns[0]!,patient=w.pawns[1]!;
  w.piles=[];refreshStock(w);doctor.foodPolicyId=2;patient.foodPolicyId=4;
  addGroundMaterial(w,'food',75,{x:5,z:3},'kibble');
  expect(applyCommand(w,{type:'order-feed',pawnId:doctor.id,patientId:patient.id,queue:false}).ok).toBe(false);
  command(w,{type:'food-policy-update',policyId:1,name:'Croquettes patient',allowed:['kibble']});
  command(w,{type:'food-policy-assign',pawnId:patient.id,policyId:1});
  command(w,{type:'order-feed',pawnId:doctor.id,patientId:patient.id,queue:false});
  until(w,()=>doctor.feed?.phase==='deliver');
  const held=w.piles.find(q=>q.item==='kibble'&&q.owner.type==='pawn')!;
  expect(held.owner).toEqual({type:'pawn',pawnId:doctor.id});expect(held.quantity).toBe(15);
  expect(patient.hunger).toBeLessThan(24);expect(units(w,'kibble')).toBe(75);
  command(w,{type:'food-policy-assign',pawnId:patient.id,policyId:4});const xp=doctor.skills.medicine.xp;
  const resumed=deserializeWorld(serializeWorld(w));until(w,()=>patient.hunger>90);
  stepWorld(resumed,w.tick-resumed.tick);expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  expect(units(w,'kibble')).toBe(60);expect(doctor.skills.medicine.xp).toBe(xp);
  expect(patient.memories.some(m=>m.kind==='ate-kibble')).toBe(true);
  expect(patient.memories.some(m=>m.kind==='ate-without-table'||m.kind==='ate-raw-food')).toBe(false);
  expect(doctor.memories.some(m=>m.kind==='ate-kibble')).toBe(false);
});

test('completed human kibble ingestion makes one difficulty-scaled risk draw and cannot retain manufactured contamination',()=>{
  let draws=0;const draw=(value:number)=>()=>{draws++;return value;};
  expect(ingestionFoodPoison({item:'kibble'},true,1,draw(.019999))).toBe('dangerous-food');expect(draws).toBe(1);
  expect(ingestionFoodPoison({item:'kibble'},true,1,draw(.02))).toBeUndefined();expect(draws).toBe(2);
  expect(ingestionFoodPoison({item:'kibble'},true,.75,draw(.014999))).toBe('dangerous-food');expect(draws).toBe(3);
  expect(ingestionFoodPoison({item:'kibble'},true,.75,draw(.015))).toBeUndefined();expect(draws).toBe(4);
  const noDraw=()=>{throw Error('An animal or hay must not draw human raw-food risk');};
  expect(ingestionFoodPoison({item:'kibble'},false,1,noDraw)).toBeUndefined();
  expect(ingestionFoodPoison({item:'hay'},true,1,noDraw)).toBeUndefined();
  for(const item of ['hay','kibble'] as const){
    const w=camp();addGroundMaterial(w,'food',1,{x:5,z:4},item);
    const bad=JSON.parse(serializeWorld(w));bad.piles[0].foodPoison={fraction:1,cause:'incompetent-cook'};
    expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
});

test('a valid schema-226 diet migrates neutrally and keeps kibble prospective after ordinary ticks and reload',()=>{
  const w=camp();for(const policy of w.foodPolicies)policy.allowed=policy.allowed.filter(item=>item!=='kibble');
  addGroundMaterial(w,'food',20,{x:5,z:4},'rice');
  const old=JSON.parse(serializeWorld(w));old.schemaVersion=226;
  const migrated=deserializeWorld(JSON.stringify(old));
  expect({...JSON.parse(serializeWorld(migrated)),schemaVersion:226}).toEqual(old);
  expect(migrated.foodPolicies).toEqual(old.foodPolicies);
  const resumed=deserializeWorld(serializeWorld(migrated));stepWorld(migrated,17);stepWorld(resumed,17);
  expect(serializeWorld(resumed)).toBe(serializeWorld(migrated));expect(selected(migrated)).toBe('rice');
  expect(migrated.foodPolicies.every(policy=>!policy.allowed.includes('kibble'))).toBe(true);
});
