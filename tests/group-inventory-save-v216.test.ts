import { expect,test } from 'vitest';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { validateTrade } from '../src/sim/trade-save.ts';
import { tryGroupDeparture } from '../src/sim/group-driver.ts';
import { captureHumanOwners } from '../src/sim/human-owners.ts';
import { addMaterial,refreshStock } from '../src/sim/materials.ts';
import { nearbyGround,groundCapacity,groundPile } from '../src/sim/ground-placement.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import type { Pawn,World,MaterialPile } from '../src/sim/types.ts';

function checkpoint(w:World):World {
  expect(validateWorld(w)).toEqual([]);
  const twin=deserializeWorld(serializeWorld(w));expect(twin).toEqual(w);
  const adoption=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));
  expect(adoption.status).toBe('applied');if(adoption.status==='applied')expect(adoption.world).toEqual(w);
  return twin;
}
function camp() {
  const w=createScenarioWorld(216,32,'survivors');
  for(const p of w.pawns){
    delete p.health;delete p.background;delete p.traits;p.hunger=95;p.rest=95;p.recreation.level=100;
    p.schedule.fill('work');p.apparelAutomation=false;
    for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
  }
  checkpoint(w);return w;
}
/** Source is prepared on real available ground. Movement, contact, inventory
 * identity and the leaving phase are all produced by ordinary engine ticks. */
function loaded() {
  const w=camp(),members=w.pawns.slice(0,2),cell=nearbyGround(w,members[0]!).find(c=>!groundPile(w,c)&&groundCapacity(w,c,'survival-meal')>=6);
  if(!cell)throw Error('No actual ration floor cell');
  addMaterial(w,'food',6,{type:'ground',...cell},'survival-meal');
  const food=w.piles.find(i=>i.item==='survival-meal'&&i.owner.type==='ground'&&i.owner.x===cell.x&&i.owner.z===cell.z)!;
  expect(applyCommand(w,{type:'planet-adopt'}).ok).toBe(true);
  expect(applyCommand(w,{type:'group-start',memberIds:members.map(p=>p.id),destination:w.planet!.civilianTile,sources:[{pileId:food.id,quantity:6}]}).ok).toBe(true);
  for(let i=0;i<700&&!(w.group&&'cursor' in w.group&&w.group.cursor===1);i++)stepWorld(w);
  const g=w.group;if(!g||!('cursor' in g)||g.cursor!==1)throw Error('Physical pickup missing');
  expect(g.phase).toBe('leaving');expect(g.ledger.foodLoaded).toBe(6);
  expect(food.owner.type).toBe('inventory');expect(food.quantity).toBe(6);expect(w.piles).toContain(food);
  checkpoint(w);return {w,members,food,g};
}

test('a true six-ration pickup remains a valid local inventory at leaving and after cancellation without a group intent',()=>{
  const {w,food}=loaded(),id=food.id,owner=structuredClone(food.owner),rng=w.rng,nextId=w.nextId;
  expect(applyCommand(w,{type:'group-cancel'}).ok).toBe(true);expect(w.group).toBeUndefined();
  expect(food.owner).toEqual(owner);expect(food.id).toBe(id);expect(food.quantity).toBe(6);
  expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);
  const carrierId=food.owner.type==='inventory'?food.owner.pawnId:undefined,carrier=w.pawns.find(p=>p.id===carrierId);
  expect(carrier).toBeDefined();expect(captureHumanOwners(w).byId.get(carrier!.id)?.items).toContain(food);
  const twin=checkpoint(w);stepWorld(w,6);stepWorld(twin,6);expect(w).toEqual(twin);checkpoint(w);
  expect(w.piles.find(i=>i.id===id)).toMatchObject({quantity:6,owner});
  // Versioned guard only: no historical save/archive has been rewritten.
  expect(validateTrade(w,195)).toContain('Invalid inventory ownership.');
});

test('six returned rations retain original owners through unloading cancellation and a later physical deposit',()=>{
  const {w,members,food,g}=loaded(),id=food.id;
  // Prepare only the final exit frontier; the real departure transfers every
  // original and captures its baseline, without playing the geographic route.
  for(const exit of g.exits){
    const p=w.pawns.find(p=>p.id===exit.pawnId)!;if(!exit.cell)throw Error('No legal exit');
    p.x=exit.cell.x;p.z=exit.cell.z;p.path=[];p.moveCooldown=0;p.planCooldown=0;p.state='idle';delete p.motion;
  }
  tryGroupDeparture(w);
  const away=w.group;if(!away||!('members' in away))throw Error('Actual departure missing');
  expect(away.members.every((p,i)=>p===members[i])).toBe(true);expect(away.items).toContain(food);expect(away.baseline.food).toBe(6);
  away.phase='awaiting-entry';away.tile=w.planet!.homeTile;away.destination=away.tile;away.route=[away.tile];away.segment=null;away.stop={kind:'awaiting-entry'};
  const twin=checkpoint(w);stepWorld(w);stepWorld(twin);expect(w).toEqual(twin);
  expect(w.group?.phase).toBe('unloading');expect(w.piles).toContain(food);
  for(const p of members)expect(w.pawns.find(q=>q.id===p.id)).toBe(p);
  expect(applyCommand(w,{type:'group-cancel'}).ok).toBe(true);expect(w.group).toBeUndefined();checkpoint(w);
  expect(food.owner.type).toBe('inventory');expect(food.quantity).toBe(6);
  const groundBefore=w.piles.filter(i=>i.item==='survival-meal'&&i.owner.type==='ground').reduce((n,i)=>n+i.quantity,0);
  expect(applyCommand(w,{type:'group-unload',memberIds:members.map(p=>p.id)}).ok).toBe(true);
  for(let i=0;i<700&&w.group;i++)stepWorld(w);
  expect(w.group).toBeUndefined();expect(w.piles.some(i=>i.id===id&&i.owner.type==='inventory')).toBe(false);
  expect(w.piles.filter(i=>i.item==='survival-meal'&&i.owner.type==='ground').reduce((n,i)=>n+i.quantity,0)).toBe(groundBefore+6);
  const retained=w.piles.find(i=>i.id===id);if(retained){expect(retained).toBe(food);expect(retained.owner.type).toBe('ground');}
  checkpoint(w);
});

test('the 196 inventory catalogue is limited to six goods and real local humans, independently of affiliation or group intent',()=>{
  const w=camp(),p=w.pawns[0]!;
  const goods:readonly [MaterialPile['kind'],MaterialPile['item'],number][]=[
    ['food','survival-meal',6],['silver','silver',20],['medicine','medicine',1],['component','component',1],
    ['textile','cloth',2],['textile','muffalo-wool',2],
  ];
  for(const [kind,item,quantity] of goods)addMaterial(w,kind,quantity,{type:'inventory',pawnId:p.id},item);
  expect(w.group).toBeUndefined();expect(validateTrade(w,196)).toEqual([]);checkpoint(w);
  const food=w.piles.find(i=>i.item==='survival-meal'&&i.owner.type==='inventory')!;
  const changed=structuredClone(w),person=changed.pawns.find(q=>q.id===p.id)!;
  person.faction='outlaws';expect(validateTrade(changed,196)).toEqual([]);
  person.state='dead';expect(validateTrade(changed,196)).toEqual([]);
  // Context/medical guards still own whether such a state is a legitimate death.
  expect(validateWorld(changed).length).toBeGreaterThan(0);
  for(const item of ['human-corpse','scyther-corpse','unfinished-shirt','rice'] as const){
    const bad=structuredClone(w),pile=bad.piles.find(i=>i.id===food.id)!;
    pile.item=item;pile.kind=item==='human-corpse'?'corpse':item==='scyther-corpse'?'mech-corpse':item==='unfinished-shirt'?'unfinished':'food';
    expect(validateTrade(bad,196)).toContain('Invalid inventory ownership.');
  }
  for(const nonHuman of ['hare','scyther'] as const){
    const bad=structuredClone(w),person=bad.pawns.find(q=>q.id===p.id)!;person.health=createMedicalRecord(bad.tick);person.health.body=nonHuman;
    expect(validateTrade(bad,196)).toContain('Invalid inventory ownership.');
  }
  const missing=structuredClone(w);missing.pawns=missing.pawns.filter(q=>q.id!==p.id);refreshStock(missing);
  expect(validateTrade(missing,196)).toContain('Invalid inventory ownership.');
  expect(validateTrade(w,195)).toContain('Invalid inventory ownership.');
});
