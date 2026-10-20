import {expect,test} from 'vitest';
import {medicalCamp,controlledInjury} from './scenarios/health';
import {fixtureBuilding} from './scenarios/deconstruction';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {addMaterial,refreshStock} from '../src/sim/materials';
import {initialDrugPolicies265} from '../src/sim/alcohol-policy-265';
import {hasAlcoholConsumeMarker265,validAlcoholConsumePawnShape265,validAlcoholConsumeTransport265} from '../src/sim/alcohol-consume-save-265';
import {startAlcoholBinge265} from '../src/sim/mental-break';
import {pawnBody} from '../src/sim/health-rules';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization';
import {registeredMapPresentation} from '../src/sim/world-map-presentation';
import {SnapshotEncoder,SnapshotDecoder,type SnapshotMessage} from '../src/bridge/snapshots';
import type {MaterialPile,NeedTask,Pawn,World} from '../src/sim/types';

// Prepared small physical scenes. All admissions, movements, splits, injuries
// and doses below use the real simulation; Root alone executes this file.
type Eat=Extract<NeedTask,{kind:'eat'}>;
function scene(inventory=false){
 const w=medicalCamp(2),p=w.pawns[0]!;w.piles=[];w.drugPolicies=initialDrugPolicies265();w.nextDrugPolicyId=5;
 Object.assign(p,{x:3,z:5,hunger:80,rest:80,needCooldown:0,drugPolicyId:1});p.schedule.fill('recreation');p.recreation.level=0;
 Object.assign(w.pawns[1]!,{x:3,z:20,hunger:80,rest:80,drugPolicyId:2});
 if(inventory)Object.assign(w.drugPolicies[0]!.beer,{allowedForJoy:false,takeToInventory:3});
 fixtureBuilding(w,'stool',15,5);addMaterial(w,'beer',5,{type:'ground',x:12,z:5},'beer');refreshStock(w);
 return {w,p,source:w.piles.find(q=>q.item==='beer')!};
}
function until(w:World,done:()=>boolean,max=450){for(let n=0;n<max&&!done();n++)stepWorld(w);expect(done()).toBe(true);}
function task(p:Pawn):Eat {if(p.need?.kind!=='eat')throw Error('Prepared scene has no ingestion task');return p.need;}
function held(w:World,p=w.pawns[0]!):MaterialPile {const pile=w.piles.find(q=>q.owner.type==='pawn'&&q.owner.pawnId===p.id);if(!pile)throw Error('Prepared scene has no actual held beer');return pile;}
const record=(v:object)=>v as unknown as Record<string,unknown>;
const expected=(w:World)=>structuredClone(w.worldMaps?registeredMapPresentation(w)!:w);
function saveExactly(w:World){expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);}
function adoptExactly(w:World,encoder:SnapshotEncoder,decoder:SnapshotDecoder,checkpoint:boolean){
 const target=expected(w),result=decoder.adopt(structuredClone(encoder.encode(w,0,1,checkpoint)));
 expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world).toEqual(target);
}

test.each([true,false])('automatic joy publishes real pickup, held, travel and chair-without-table ingestion; checkpoint=%s',checkpoint=>{
 const {w,p,source}=scene(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();adoptExactly(w,encoder,decoder,true);
 for(const phase of ['pickup','choose-spot','travel','ingest'] as const){
  until(w,()=>p.need?.kind==='eat'&&p.need.phase===phase);
  expect(task(p)).toMatchObject({alcoholReason:'joy',quantity:1,phase});expect(Object.hasOwn(task(p),'forced')).toBe(false);
  expect(validAlcoholConsumeTransport265(w)).toBe(true);expect(p.health?.alcohol).toBeUndefined();
  if(phase==='pickup'){expect(source.quantity).toBe(5);expect(source.owner.type).toBe('ground');expect(Math.abs(p.x-12)+Math.abs(p.z-5)).toBeGreaterThan(1);}
  else {expect(held(w).quantity).toBe(1);expect(source.quantity).toBe(4);}
  if(phase==='travel'||phase==='ingest')expect(task(p).dining).toMatchObject({seatId:w.structures.find(q=>q.kind==='stool')!.id,tableId:null});
  if(phase==='ingest')expect({x:p.x,z:p.z}).toEqual(task(p).dining!.target);
  saveExactly(w);adoptExactly(w,encoder,decoder,checkpoint);
 }
 until(w,()=>!!p.health?.alcohol);expect(w.piles.filter(q=>q.item==='beer').reduce((n,q)=>n+q.quantity,0)).toBe(4);
 expect(p.recreation.tolerance.chemical).toBeGreaterThan(0);saveExactly(w);adoptExactly(w,encoder,decoder,checkpoint);
});

interface MutationSurface {world:Pick<World,'schemaVersion'|'pawns'>;pile:(id:number)=>MaterialPile}
const mutators:{name:string;change:(s:MutationSurface)=>void}[]=[
 {name:'ground unit claimed as ingested',change:s=>{s.pile(task(s.world.pawns[0]!).carryPileId!).owner={type:'ground',x:8,z:8};}},
 {name:'another actual carrier',change:s=>{s.pile(task(s.world.pawns[0]!).carryPileId!).owner={type:'pawn',pawnId:s.world.pawns[1]!.id};}},
 {name:'distant drinking destination',change:s=>{task(s.world.pawns[0]!).dining={target:{x:20,z:20},seatId:null,tableId:null};}},
 {name:'invented phase',change:s=>{record(task(s.world.pawns[0]!)).phase='remote-ingest';}},
 {name:'completed progress before debit',change:s=>{task(s.world.pawns[0]!).progress=50;}},
 {name:'fractional progress',change:s=>{task(s.world.pawns[0]!).progress=.5;}},
 {name:'invalid work remainder',change:s=>{task(s.world.pawns[0]!).workRemainder=10000;}},
 {name:'extra task field',change:s=>{record(task(s.world.pawns[0]!)).remote=true;}},
 {name:'missing dining contact',change:s=>{task(s.world.pawns[0]!).dining=null;}},
 {name:'false forced marker',change:s=>{record(task(s.world.pawns[0]!)).forced=false;}},
 {name:'inventory reason used to drink',change:s=>{task(s.world.pawns[0]!).alcoholReason='inventory';}},
 {name:'future actor in264',change:s=>{Object.assign(s.world,{schemaVersion:264});}},
];
function packetSurface(packet:SnapshotMessage):MutationSurface {
 return {world:packet.world,pile:id=>{const pile=(packet.kind==='checkpoint'?packet.world.piles:packet.piles?.upserted)?.find(q=>q.id===id);if(!pile)throw Error('Mutant requires an actual changed carried unit');return pile;}};
}
test.each([true,false])('all automatic alcohol forgeries are refused atomically by full saves and checkpoint=%s',checkpoint=>{
 const {w,p}=scene(),encoder=new SnapshotEncoder(),first=structuredClone(encoder.encode(w,0,0,true));
 until(w,()=>p.need?.kind==='eat'&&p.need.phase==='ingest');
 const good=structuredClone(encoder.encode(w,0,1,checkpoint));expect(good.kind).toBe(checkpoint?'checkpoint':'delta');
 for(const mutation of mutators){
  const decoder=new SnapshotDecoder(),prior=decoder.adopt(structuredClone(first));expect(prior.status,mutation.name).toBe('applied');
  if(prior.status!=='applied')throw Error('Invalid prepared predecessor');const previous=structuredClone(prior.world);
  const bad=structuredClone(good);mutation.change(packetSurface(bad));expect(decoder.adopt(bad).status,mutation.name).toBe('resync');expect(prior.world).toEqual(previous);
  const raw=structuredClone(w);mutation.change({world:raw,pile:id=>raw.piles.find(q=>q.id===id)!});expect(()=>deserializeWorld(JSON.stringify(raw)),mutation.name).toThrow();
  const retry=decoder.adopt(structuredClone(good));expect(retry.status,mutation.name).toBe('applied');if(retry.status==='applied')expect(retry.world).toEqual(expected(w));
 }
});

test.each([true,false])('inventory policy physically collects three without a dose, cancels conservatively; checkpoint=%s',checkpoint=>{
 const {w,p,source}=scene(true),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();adoptExactly(w,encoder,decoder,true);until(w,()=>p.need?.kind==='eat'&&p.need.alcoholReason==='inventory');
 expect(task(p)).toMatchObject({phase:'pickup',quantity:3,carryPileId:null,dining:null,progress:0});expect(source.quantity).toBe(5);expect(validAlcoholConsumeTransport265(w)).toBe(true);saveExactly(w);adoptExactly(w,encoder,decoder,checkpoint);
 // Clear-orders only clears manual mandates; mobilisation interrupts this
 // automatic need. Demobilisation then permits the unchanged policy to resume.
 expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(true);expect(p.need).toBeNull();expect(source.quantity).toBe(5);expect(source.owner.type).toBe('ground');expect(p.health?.alcohol).toBeUndefined();
 expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:false}).ok).toBe(true);
 until(w,()=>w.piles.some(q=>q.item==='beer'&&q.owner.type==='inventory'&&q.owner.pawnId===p.id));
 expect(w.piles.filter(q=>q.owner.type==='inventory'&&q.owner.pawnId===p.id&&q.item==='beer').reduce((n,q)=>n+q.quantity,0)).toBe(3);
 expect(source.quantity).toBe(2);expect(p.health?.alcohol).toBeUndefined();saveExactly(w);adoptExactly(w,encoder,decoder,checkpoint);
});

test.each([true,false])('owned inventory is a valid real pickup, another person inventory is rejected; checkpoint=%s',checkpoint=>{
 const {w,p}=scene(true);until(w,()=>w.piles.some(q=>q.item==='beer'&&q.owner.type==='inventory'&&q.owner.pawnId===p.id));
 w.piles=w.piles.filter(q=>q.owner.type!=='ground');addMaterial(w,'beer',1,{type:'inventory',pawnId:w.pawns[1]!.id},'beer');
 const own=w.piles.find(q=>q.owner.type==='inventory'&&q.owner.pawnId===p.id)!,other=w.piles.find(q=>q.owner.type==='inventory'&&q.owner.pawnId!==p.id)!;
 Object.assign(w.drugPolicies![0]!.beer,{takeToInventory:0,allowedForJoy:true});p.needCooldown=0;p.recreation.level=0;
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();adoptExactly(w,encoder,decoder,true);
 until(w,()=>p.need?.kind==='eat'&&p.need.phase==='pickup');expect(task(p)).toMatchObject({sourcePileId:own.id,quantity:1,alcoholReason:'joy'});expect(validAlcoholConsumeTransport265(w)).toBe(true);saveExactly(w);
 const good=structuredClone(encoder.encode(w,0,1,checkpoint)),bad=structuredClone(good);task(bad.world.pawns[0]!).sourcePileId=other.id;
 expect(decoder.adopt(bad).status).toBe('resync');const retry=decoder.adopt(good);expect(retry.status).toBe('applied');if(retry.status==='applied')expect(retry.world).toEqual(expected(w));
 until(w,()=>!!p.health?.alcohol);expect(own.quantity).toBe(2);expect(other.quantity).toBe(1);saveExactly(w);adoptExactly(w,encoder,decoder,checkpoint);
});

test.each(['pickup','choose-spot','ingest','inventory'] as const)('actual loss of both hands cancels automatic %s without a dose',phase=>{
 const {w,p}=scene(phase==='inventory');until(w,()=>p.need?.kind==='eat'&&(phase==='inventory'?p.need.alcoholReason==='inventory':p.need.phase===phase));
 const original=phase==='choose-spot'||phase==='ingest'?held(w):undefined,quantity=w.piles.filter(q=>q.item==='beer').reduce((n,q)=>n+q.quantity,0);
 controlledInjury(w,p,'left-hand',30000,'bruise');controlledInjury(w,p,'right-hand',30000,'bruise');
 expect(pawnBody(p).capacities.manipulation).toBe(0);expect(p.state).not.toBe('downed');expect(p.need).toBeNull();
 if(original){expect(w.piles.find(q=>q.id===original.id)).toBe(original);expect(original.owner.type).toBe('ground');}
 stepWorld(w,2);expect(p.health?.alcohol).toBeUndefined();expect(w.piles.filter(q=>q.item==='beer').reduce((n,q)=>n+q.quantity,0)).toBe(quantity);saveExactly(w);
});

test('loss of hands during the actual held edge cancels now and retains the same beer until physical arrival',()=>{
 const {w,p,source}=scene();until(w,()=>p.need?.kind==='eat'&&p.need.phase==='travel'&&p.moveCooldown>0);
 const cargo=held(w),edge=structuredClone(p.motion)!,id=cargo.id,quantity=w.piles.filter(q=>q.item==='beer').reduce((n,q)=>n+q.quantity,0);
 // The arrival cell contains the original remainder. Identity-preserving
 // interruption uses its first free neighbour instead of merging that stock.
 expect(source.owner).toEqual({type:'ground',x:edge.to.x,z:edge.to.z});expect(source.quantity).toBe(4);
 const deposit={x:edge.to.x,z:edge.to.z-1};expect(w.piles.some(q=>q.owner.type==='ground'&&q.owner.x===deposit.x&&q.owner.z===deposit.z)).toBe(false);
 controlledInjury(w,p,'left-hand',30000,'bruise');controlledInjury(w,p,'right-hand',30000,'bruise');
 expect(pawnBody(p).capacities.manipulation).toBe(0);expect(p.need).toBeNull();expect(p.interruptedCargo).toBe(true);expect(p.motion).toEqual(edge);expect(cargo.owner).toEqual({type:'pawn',pawnId:p.id});saveExactly(w);
 while(w.tick<edge.end){expect(cargo.owner).toEqual({type:'pawn',pawnId:p.id});stepWorld(w);}
 until(w,()=>cargo.owner.type==='ground');expect(w.piles.find(q=>q.id===id)).toBe(cargo);expect(cargo.quantity).toBe(1);expect(cargo.owner).toEqual({type:'ground',...deposit});
 expect({x:p.x,z:p.z}).toEqual(edge.to);expect(source.owner).toEqual({type:'ground',x:edge.to.x,z:edge.to.z});expect(source.quantity).toBe(4);
 expect(p.health?.alcohol).toBeUndefined();expect(w.piles.filter(q=>q.item==='beer').reduce((n,q)=>n+q.quantity,0)).toBe(quantity);saveExactly(w);
});

test('a real alcohol binge keeps its unforced task and permitted chair through ingestion',()=>{
 const {w,p,source}=scene();p.drugPolicyId=2;source.forbidden=true;expect(startAlcoholBinge265(w,p)).toBe(true);
 until(w,()=>p.need?.kind==='eat'&&p.need.phase==='ingest');expect(task(p).alcoholReason).toBe('binge');expect(Object.hasOwn(task(p),'forced')).toBe(false);expect(validAlcoholConsumeTransport265(w)).toBe(true);
 saveExactly(w);adoptExactly(w,new SnapshotEncoder(),new SnapshotDecoder(),true);until(w,()=>!!p.health?.alcohol);saveExactly(w);
});

test('new task shape is closed, while old unmarked meal tasks stay outside the alcohol domain',()=>{
 const {w,p}=scene();expect(hasAlcoholConsumeMarker265(p)).toBe(false);
 p.need={kind:'eat',phase:'pickup',sourcePileId:1,carryPileId:null,quantity:10,progress:0,dining:null};
 expect(validAlcoholConsumePawnShape265(p,264,w)).toBe(true);expect(validAlcoholConsumeTransport265(w)).toBe(true);
 p.need.alcoholReason='inventory';p.need.quantity=3;expect(validAlcoholConsumePawnShape265(p,264,w)).toBe(false);expect(validAlcoholConsumePawnShape265(p,265,w)).toBe(true);
 p.need.quantity=4;expect(validAlcoholConsumePawnShape265(p,265,w)).toBe(false);p.need.quantity=3;p.need.progress=1;expect(validAlcoholConsumePawnShape265(p,265,w)).toBe(false);
});
