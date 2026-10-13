import {expect,test} from 'vitest';
import {medicalCamp,controlledInjury} from './scenarios/health';
import {applyMeleeStun} from '../src/sim/stun';
import {reconcilePawnHealth} from '../src/sim/health';
import {pawnBody} from '../src/sim/health-rules';
import {BLOOD_UNIT} from '../src/sim/injury-rules';
import {fixtureBuilding} from './scenarios/deconstruction';
import {exhaustedCarrier} from './scenarios/interrupted-cargo';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {addMaterial,refreshStock} from '../src/sim/materials';
import {newShelfStorage} from '../src/sim/shelf-storage';
import {consumeReason,consumeProposal,consumeWarnings,isForcedConsuming} from '../src/sim/consuming';
import {rotAge} from '../src/sim/food-preservation';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import type {Command,World} from '../src/sim/types';

// Declared feature fixtures, never evidence of natural-colony food production.
function scene(drafted=false,shelf=false){
  const w=medicalCamp(2),p=w.pawns[0]!;Object.assign(p,{x:3,z:5,hunger:30,foodPolicyId:4,background:{childhood:'quiet-child',adulthood:'medic'}});
  Object.assign(w.pawns[1]!,{x:3,z:12,foodPolicyId:4});
  if(shelf){const s=fixtureBuilding(w,'small-shelf',12,5);const shelf=w.structures.find(v=>v.id===s.id)!;shelf.shelf=newShelfStorage([w.nextId++]);shelf.material='wood';delete shelf.quality;}
  else w.stockpiles.push({id:w.nextId++,x:12,z:5,filters:{wood:false,food:true},priority:3,capacity:75});
  addMaterial(w,'food',30,{type:'ground',x:12,z:5},'rice');refreshStock(w);
  if(drafted)expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(true);valid(w);return w;
}
const eat=(w:World):Command=>({type:'order-consume',pawnId:w.pawns[0]!.id,pileId:w.piles[0]!.id,queue:false});
function valid(w:World){expect(validateWorld(w)).toEqual([]);}
function accept(w:World){expect(applyCommand(w,eat(w)).ok).toBe(true);valid(w);}
function until(w:World,done:()=>boolean,max=450){for(let i=0;i<max&&!done();i++)stepWorld(w);expect(done()).toBe(true);valid(w);}
function replay(w:World,ticks=3){const r=deserializeWorld(serializeWorld(w));expect(r).toEqual(w);stepWorld(w,ticks);stepWorld(r,ticks);expect(r).toEqual(w);valid(w);}
const held=(w:World)=>w.piles.find(v=>v.owner.type==='pawn'&&v.owner.pawnId===w.pawns[0]!.id);
const record=(v:object)=>v as unknown as Record<string,unknown>;

test('V346 civil and drafted pacifists bypass Rien with a warning, without early nutrition, RNG or policy mutation',()=>{
  for(const drafted of [false,true]){const w=scene(drafted),p=w.pawns[0]!,pile=w.piles[0]!,before=serializeWorld(w),rng=w.rng;
    expect(consumeReason(w,p,pile)).toBeUndefined();expect(consumeWarnings(w,p,pile).length).toBeGreaterThan(0);
    expect(consumeProposal(w,p,pile)?.task).toMatchObject({forced:true,quantity:14,phase:'pickup'});expect(serializeWorld(w)).toBe(before);
    accept(w);expect(p.hunger).toBe(30);expect(w.rng).toBe(rng);expect(p.foodPolicyId).toBe(4);expect(p.orders).toEqual({active:'consume',queue:[]});
    expect(isForcedConsuming(p)).toBe(true);expect(p.draft?.target??null).toBeNull();expect(held(w)).toBeUndefined();
  }
});

test.each([{hunger:30,stock:30,quantity:14},{hunger:0,stock:30,quantity:20},{hunger:100,stock:1,quantity:1}])('V346 rice hunger $hunger physically takes $quantity units, including portions above hauling capacity',({hunger,stock,quantity})=>{
  const w=scene(true),p=w.pawns[0]!,source=w.piles[0]!;p.hunger=hunger;source.quantity=stock;refreshStock(w);accept(w);
  expect(p.need).toMatchObject({quantity,progress:0});replay(w,1);until(w,()=>!!held(w));const cargo=held(w)!;
  expect(cargo.quantity).toBe(quantity);expect(w.piles.filter(v=>v.item==='rice').reduce((n,v)=>n+v.quantity,0)).toBe(stock);
  if(stock===quantity)expect(cargo.id).toBe(source.id);else{expect(cargo.id).not.toBe(source.id);expect(source.quantity).toBe(stock-quantity);}
  until(w,()=>p.need?.kind==='eat'&&p.need.phase==='ingest');const cell={x:p.x,z:p.z};expect(p.moveCooldown).toBe(0);expect(p.motion?.end??0).toBeLessThanOrEqual(w.tick);
  expect(p.hunger).toBeLessThanOrEqual(hunger);const before=p.hunger;stepWorld(w);expect(p.need).toMatchObject({phase:'ingest'});expect(held(w)?.id).toBe(cargo.id);expect(p.hunger).toBeLessThanOrEqual(before);
  replay(w);until(w,()=>!isForcedConsuming(p));expect(w.piles.some(v=>v.id===cargo.id)).toBe(false);expect(p.hunger).toBeGreaterThan(95);
  expect(p.orders.active).toBeNull();expect(p.draft).toBeTruthy();expect({x:p.x,z:p.z}).toEqual(cell);expect(w.piles.filter(v=>v.item==='rice').reduce((n,v)=>n+v.quantity,0)).toBe(stock-quantity);
});

test('V346 shelf split preserves age, damage and contamination while identifying the actual portion, not its former source',()=>{
  const w=scene(true,true),p=w.pawns[0]!,source=w.piles[0]!;source.item='simple-meal';source.quantity=4;source.rot={progress:600,atTick:w.tick};source.damage=2;source.foodPoison={fraction:.25,cause:'unknown'};refreshStock(w);valid(w);
  accept(w);until(w,()=>!!held(w));const cargo=held(w)!;expect(cargo.id).not.toBe(source.id);expect(cargo.quantity).toBe(1);expect(source.quantity).toBe(3);
  expect(rotAge(cargo,w.tick)).toBe(rotAge(source,w.tick));expect(cargo.damage).toBe(source.damage);expect(cargo.foodPoison).toEqual(source.foodPoison);
  expect(p.need).toMatchObject({sourcePileId:source.id,carryPileId:cargo.id,quantity:1});replay(w);expect(p.draft).toBeTruthy();
});

const refusals:{name:string;change:(w:World)=>Command|void}[]=[
  {name:'queued meal',change:w=>({...eat(w),queue:true} as Command)},
  {name:'missing pile',change:w=>({...eat(w),pileId:w.nextId+5} as Command)},
  {name:'unknown local actor',change:w=>({...eat(w),pawnId:w.nextId+5} as Command)},
  {name:'already held food',change:w=>{const other=w.pawns[1]!;expect(applyCommand(w,{type:'order-consume',pawnId:other.id,pileId:w.piles[0]!.id,queue:false}).ok).toBe(true);until(w,()=>w.piles.some(v=>v.owner.type==='pawn'&&v.owner.pawnId===other.id));return {...eat(w),pileId:w.piles.find(v=>v.owner.type==='pawn'&&v.owner.pawnId===other.id)!.id} as Command;}},
  {name:'stunned actor',change:w=>{applyMeleeStun(w,w.pawns[0]!,w.tick*10);valid(w);}},
  {name:'fractional actor',change:w=>({...eat(w),pawnId:w.pawns[0]!.id+.5} as Command)},
  {name:'nonfood wood',change:w=>{Object.assign(w.piles[0]!,{kind:'wood',item:'wood'});delete w.piles[0]!.rot;refreshStock(w);valid(w);}},
  {name:'hay outside the human catalogue',change:w=>{w.piles[0]!.item='hay';refreshStock(w);}},
  {name:'inaccessible source',change:w=>{for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(dx||dz)w.tiles[(5+dz)*w.width+12+dx]={terrain:'rock',stone:'granite'};valid(w);}},
];
test.each(refusals)('V346 refuses $name atomically',({change})=>{const w=scene(),c=change(w)??eat(w),before=serializeWorld(w),result=applyCommand(w,c);
  expect(result.ok).toBe(false);if(!result.ok)expect(result.reason?.length??0).toBeGreaterThan(0);expect(serializeWorld(w)).toBe(before);
});

test('V346 source reservations belong to exact portions: another actor cannot overbook, but replacing ones own meal releases it',()=>{
  const w=scene(true),p=w.pawns[0]!,other=w.pawns[1]!;w.piles[0]!.quantity=14;refreshStock(w);accept(w);
  const before=serializeWorld(w);expect(applyCommand(w,{type:'order-consume',pawnId:other.id,pileId:w.piles[0]!.id,queue:false}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  expect(applyCommand(w,eat(w)).ok).toBe(true);expect(p.need).toMatchObject({quantity:14});valid(w);
  expect(applyCommand(w,{type:'clear-orders',pawnId:p.id}).ok).toBe(true);expect(applyCommand(w,{type:'order-consume',pawnId:other.id,pileId:w.piles[0]!.id,queue:false}).ok).toBe(true);valid(w);
});

test('V346 an empty-handed captured edge survives replacement and no pickup occurs before its physical end',()=>{
  const w=scene(true),p=w.pawns[0]!;w.piles[0]!.owner={type:'ground',x:5,z:5};refreshStock(w);expect(applyCommand(w,{type:'draft-move',pawnIds:[p.id],target:{x:4,z:5},queue:false}).ok).toBe(true);
  until(w,()=>!!p.motion&&p.motion.end>w.tick);const edge=structuredClone(p.motion)!;accept(w);expect(p.motion).toEqual(edge);
  while(w.tick<edge.end){expect(held(w)).toBeUndefined();expect(p.need).toMatchObject({phase:'pickup',progress:0});stepWorld(w);}
  until(w,()=>!!held(w));replay(w);
});

test('V346 a cargo on a captured haul edge refuses replacement without dropping it at the future logical cell',()=>{
  const w=exhaustedCarrier(),p=w.pawns[0]!;p.rest=50;p.restZeroTicks=0;p.collapsePending=false;p.foodPolicyId=4;
  Object.assign(w.piles.find(v=>v.owner.type==='ground'&&v.owner.x===10&&v.owner.z===3)!,{kind:'food',item:'survival-meal',quantity:1});refreshStock(w);valid(w);until(w,()=>!!p.motion&&p.motion.end>w.tick);
  const before=serializeWorld(w),food=w.piles.find(v=>v.item==='survival-meal')!;
  expect(applyCommand(w,{type:'order-consume',pawnId:p.id,pileId:food.id,queue:false}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
});

test.each(['stop','move','undraft','clear'] as const)('V346 %s interrupts ingestion, drops the same cargo and awards no meal',cause=>{
  const w=scene(true),p=w.pawns[0]!;accept(w);until(w,()=>p.need?.kind==='eat'&&p.need.phase==='ingest');stepWorld(w,2);const cargo=held(w)!,hunger=p.hunger,memories=structuredClone(p.memories);
  const c:Command=cause==='stop'?{type:'draft-stop',pawnIds:[p.id]}:cause==='move'?{type:'draft-move',pawnIds:[p.id],target:{x:4,z:9},queue:false}:cause==='undraft'?{type:'draft',pawnIds:[p.id],enabled:false}:{type:'clear-orders',pawnId:p.id};
  expect(applyCommand(w,c).ok).toBe(true);expect(isForcedConsuming(p)).toBe(false);expect(w.piles.find(v=>v.id===cargo.id)).toMatchObject({quantity:14,owner:{type:'ground'}});
  stepWorld(w,3);expect(p.hunger).toBeLessThanOrEqual(hunger);expect(p.memories).toEqual(memories);replay(w);
});

test('V346 the civil command retains ordinary dining; a distant chair is reached with the held portion before ingestion',()=>{
  const w=scene(),p=w.pawns[0]!,table=fixtureBuilding(w,'table-square',14,8),seat=fixtureBuilding(w,'stool',13,8);valid(w);accept(w);
  until(w,()=>p.need?.kind==='eat'&&p.need.phase==='travel');expect(held(w)).toBeTruthy();expect(p.need).toMatchObject({dining:{seatId:seat.id,tableId:table.id}});replay(w);
  until(w,()=>p.need?.kind==='eat'&&p.need.phase==='ingest');expect({x:p.x,z:p.z}).toEqual({x:seat.x,z:seat.z});until(w,()=>!isForcedConsuming(p));expect(p.memories.some(m=>m.kind==='ate-without-table')).toBe(false);
});

test('V346 schema233 migration preserves every ordinary value and rejects future forced markers before migration',()=>{
  const w=scene();w.pawns[0]!.hunger=20;w.pawns[0]!.foodPolicyId=1;until(w,()=>w.pawns[0]!.need?.kind==='eat'&&w.pawns[0]!.need.phase==='ingest');expect(record(w.pawns[0]!.need!)).not.toHaveProperty('forced');w.schemaVersion=233 as World['schemaVersion'];expect(deserializeWorld(JSON.stringify(w))).toEqual({...w,schemaVersion:234});
  const forced=scene(true);accept(forced);forced.schemaVersion=233 as World['schemaVersion'];expect(()=>deserializeWorld(JSON.stringify(forced))).toThrow();
});
const malformed:{name:string;change:(w:World)=>void}[]=[
  {name:'false marker',change:w=>{record(w.pawns[0]!.need!).forced=false;}},
  {name:'absent marker',change:w=>{delete record(w.pawns[0]!.need!).forced;}},
  {name:'extra task field',change:w=>{record(w.pawns[0]!.need!).future=1;}},
  {name:'missing mandate',change:w=>{w.pawns[0]!.orders.active=null;}},
  {name:'unknown source',change:w=>{if(w.pawns[0]!.need?.kind==='eat')w.pawns[0]!.need.sourcePileId=w.nextId+1;}},
  {name:'pickup progress',change:w=>{if(w.pawns[0]!.need?.kind==='eat')w.pawns[0]!.need.progress=1;}},
  {name:'pickup work remainder',change:w=>{record(w.pawns[0]!.need!).workRemainder=1;}},
  {name:'fractional portion',change:w=>{if(w.pawns[0]!.need?.kind==='eat')w.pawns[0]!.need.quantity=14.5;}},
  {name:'active draft movement',change:w=>{w.pawns[0]!.draft!.target={x:4,z:9};}},
  {name:'overbooked portions',change:w=>{const b=w.pawns[1]!;b.hunger=30;expect(applyCommand(w,{type:'order-consume',pawnId:b.id,pileId:w.piles[0]!.id,queue:false}).ok).toBe(true);expect(b.need).toMatchObject({kind:'eat',forced:true,quantity:14});valid(w);w.piles[0]!.quantity=14;refreshStock(w);}},
];
test.each(malformed)('V346 save rejects $name without repair',({change})=>{const w=scene(true);accept(w);change(w);expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();});


test.each(['pickup','held'] as const)('V346 save refuses a packed bed carried simultaneously with the %s consumption task',phase=>{
  const w=scene(true),p=w.pawns[0]!,bed=fixtureBuilding(w,'bed',4,14);accept(w);
  if(phase==='held')until(w,()=>!!held(w));valid(w);
  w.structures=w.structures.filter(s=>s.id!==bed.id);w.packed.push({building:bed,owner:{type:'pawn',pawnId:p.id}});
  expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();
});

test.each([true,false])('V346 Decoder checkpoint=%s rejects a forged missing marker atomically and retries the exact valid revision',checkpoint=>{
  const w=scene(true),bed=fixtureBuilding(w,'bed',4,14),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();const first=decoder.adopt(structuredClone(encoder.encode(w,0,0,true)));
  expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Invalid prepared baseline');const frozen=structuredClone(first.world);
  accept(w);const good=structuredClone(encoder.encode(w,0,1,checkpoint)),bad=structuredClone(good);delete record(bad.world.pawns[0]!.need!).forced;
  expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(frozen);
  const packedPickup=structuredClone(good);packedPickup.world.structures=packedPickup.world.structures.filter(s=>s.id!==bed.id);packedPickup.world.packed.push({building:structuredClone(bed),owner:{type:'pawn',pawnId:w.pawns[0]!.id}});
  expect(decoder.adopt(packedPickup).status).toBe('resync');expect(first.world).toEqual(frozen);const retry=decoder.adopt(good);expect(retry.status).toBe('applied');if(retry.status==='applied')expect(retry.world).toEqual(w);
  const retained=retry.status==='applied'?structuredClone(retry.world):undefined;until(w,()=>w.pawns[0]!.need?.kind==='eat'&&w.pawns[0]!.need.phase==='ingest');const ingestPacket=structuredClone(encoder.encode(w,0,1,checkpoint)),wrongCargo=structuredClone(ingestPacket);
  const task=wrongCargo.world.pawns[0]!.need;if(task?.kind!=='eat')throw Error('Missing physical eating task');task.quantity++;
  expect(decoder.adopt(wrongCargo).status).toBe('resync');if(retry.status==='applied')expect(retry.world).toEqual(retained);
  const packedHeld=structuredClone(ingestPacket);packedHeld.world.structures=packedHeld.world.structures.filter(s=>s.id!==bed.id);packedHeld.world.packed.push({building:structuredClone(bed),owner:{type:'pawn',pawnId:w.pawns[0]!.id}});
  expect(decoder.adopt(packedHeld).status).toBe('resync');if(retry.status==='applied')expect(retry.world).toEqual(retained);
  const next=decoder.adopt(ingestPacket);expect(next.status).toBe('applied');if(next.status==='applied')expect(next.world).toEqual(w);
});
function civilHeldEdge(){
  const w=scene(),p=w.pawns[0]!;p.priorities.haul=1;fixtureBuilding(w,'table-square',14,8);fixtureBuilding(w,'stool',13,8);
  w.stockpiles.push({id:w.nextId++,x:7,z:10,filters:{wood:true,food:false},priority:3,capacity:75});addMaterial(w,'wood',10,{type:'ground',x:5,z:10},'wood');refreshStock(w);
  accept(w);until(w,()=>p.need?.kind==='eat'&&p.need.phase==='travel'&&!!held(w)&&!!p.motion&&p.motion.end>w.tick);return w;
}
test('V346 clearing a civil held meal on an edge retains physical custody until arrival, then drops without eating',()=>{
  const w=civilHeldEdge(),p=w.pawns[0]!,cargo=held(w)!,cargoId=cargo.id,edge=structuredClone(p.motion)!,hunger=p.hunger,memories=structuredClone(p.memories);
  const route=[edge.from,edge.to,...p.path];expect(route.some((c,i)=>i>0&&Math.abs(c.x-route[i-1]!.x)===1&&Math.abs(c.z-route[i-1]!.z)===1)).toBe(true);
  // A real diagonal from the route is legal in save and RAW transport.
  replay(w,0);const decoder=new SnapshotDecoder(),encoder=new SnapshotEncoder(),snapshot=decoder.adopt(structuredClone(encoder.encode(w,0,1,true)));
  expect(snapshot.status).toBe('applied');if(snapshot.status==='applied')expect(snapshot.world).toEqual(w);
  expect(applyCommand(w,{type:'clear-orders',pawnId:p.id}).ok).toBe(true);expect(p.need).toBeNull();expect(p.orders).toEqual({active:null,queue:[]});
  expect(p.motion).toEqual(edge);expect(p.interruptedCargo).toBe(true);expect(cargo.owner).toEqual({type:'pawn',pawnId:p.id});valid(w);replay(w,0);
  const delta=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(delta.status).toBe('applied');if(delta.status==='applied')expect(delta.world).toEqual(w);
  while(w.tick<edge.end){expect(cargo.owner).toEqual({type:'pawn',pawnId:p.id});stepWorld(w);if(w.tick<edge.end)expect(p.motion).toEqual(edge);}
  until(w,()=>cargo.owner.type==='ground');expect(cargo.quantity).toBe(14);expect(w.piles.find(v=>v.id===cargoId)).toBe(cargo);
  expect(cargo.owner).toEqual({type:'ground',x:edge.to.x,z:edge.to.z});expect(p.interruptedCargo).toBeUndefined();expect(p.hunger).toBeLessThanOrEqual(hunger);expect(p.memories).toEqual(memories);replay(w);
});
test('V346 replacing civil consumption during its held edge refuses atomically; the same haul is admitted once stationary',()=>{
  const w=civilHeldEdge(),p=w.pawns[0]!,wood=w.piles.find(v=>v.item==='wood')!,command:Command={type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:wood.id},queue:false},before=serializeWorld(w);
  const result=applyCommand(w,command);expect(result.ok).toBe(false);if(!result.ok)expect(result.reason?.length??0).toBeGreaterThan(0);expect(serializeWorld(w)).toBe(before);
  until(w,()=>p.need?.kind==='eat'&&p.need.phase==='ingest');expect(p.moveCooldown).toBe(0);expect(applyCommand(w,command).ok).toBe(true);expect(isForcedConsuming(p)).toBe(false);expect(p.haul?.sourcePileId).toBe(wood.id);valid(w);replay(w,1);
});
const draftForgeries=['future upkeep','absent upkeep','false hold fire'] as const;
test.each(draftForgeries)('V346 forced draft %s is rejected by save and RAW/delta before exact retry',cause=>{
  for(const checkpoint of [true,false]){
    const w=scene(true),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),baseline=decoder.adopt(structuredClone(encoder.encode(w,0,0,true)));
    expect(baseline.status).toBe('applied');if(baseline.status!=='applied')throw Error('Invalid prepared baseline');const previous=structuredClone(baseline.world);accept(w);
    const good=structuredClone(encoder.encode(w,0,1,checkpoint)),bad=structuredClone(good),badSave=structuredClone(w);
    for(const draft of [bad.world.pawns[0]!.draft!,badSave.pawns[0]!.draft!]){
      if(cause==='future upkeep')draft.lastActiveTick=w.tick+1;
      if(cause==='absent upkeep')delete record(draft).lastActiveTick;
      if(cause==='false hold fire')record(draft).holdFire=false;
    }
    expect(()=>deserializeWorld(JSON.stringify(badSave))).toThrow();expect(decoder.adopt(bad).status).toBe('resync');expect(baseline.world).toEqual(previous);
    const retry=decoder.adopt(good);expect(retry.status).toBe('applied');if(retry.status==='applied')expect(retry.world).toEqual(w);
  }
});
test.each(['missing hands','blood-loss downing'] as const)('V346 physiology %s interrupts the civil held edge without dropping ahead of the body',cause=>{
  const w=civilHeldEdge(),p=w.pawns[0]!,cargo=held(w)!,cargoId=cargo.id,edge=structuredClone(p.motion)!,hunger=p.hunger,memories=structuredClone(p.memories);
  if(cause==='missing hands'){
    controlledInjury(w,p,'left-hand',30000,'bruise');controlledInjury(w,p,'right-hand',30000,'bruise');
    expect(pawnBody(p).capacities.manipulation).toBe(0);expect(p.state).not.toBe('downed');
  }else{
    controlledInjury(w,p,'left-arm',1000,'bruise');p.health!.bloodLoss=BLOOD_UNIT*.61;reconcilePawnHealth(w,p);expect(p.state).toBe('downed');
  }
  expect(p.motion).toEqual(edge);expect(p.need).toBeNull();expect(p.orders.active).toBeNull();expect(p.interruptedCargo).toBe(true);expect(cargo.owner).toEqual({type:'pawn',pawnId:p.id});valid(w);replay(w,0);
  while(w.tick<edge.end){expect(cargo.owner).toEqual({type:'pawn',pawnId:p.id});stepWorld(w);if(w.tick<edge.end)expect(p.motion).toEqual(edge);}
  until(w,()=>cargo.owner.type==='ground');expect(w.piles.find(v=>v.id===cargoId)).toBe(cargo);expect(cargo.quantity).toBe(14);expect(cargo.owner).toEqual({type:'ground',x:edge.to.x,z:edge.to.z});
  expect(p.interruptedCargo).toBeUndefined();expect(p.hunger).toBeLessThanOrEqual(hunger);expect(p.memories).toEqual(memories);replay(w,2);
});