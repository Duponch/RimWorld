import { expect,test } from 'vitest';
import { orbitalCamp } from './helpers/orbital-v281.ts';
import { adoptOrbital,advanceOrbital,applyOrbitalTrade,createOrbitalShip,orderOrbitalTrade,processOrbitalTrade,reconcileOrbitalTrade } from '../src/sim/orbital.ts';
import { orbitalAtContact,orbitalConsoleSpot,orbitalCoverage,orbitalTradeGoods,quoteOrbitalTrade } from '../src/sim/orbital-rules.ts';
import { ORBITAL_STOCK } from '../src/sim/orbital-stock.ts';
import { blockedCells,reachableCells,routeToCell } from '../src/sim/pathfinding.ts';
import { releaseWork } from '../src/sim/work-release.ts';
import { addGroundMaterial,reservedSource } from '../src/sim/materials.ts';
import { rotAge } from '../src/sim/food-preservation.ts';
import { ITEM_DEFINITIONS } from '../src/sim/items.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import type { TradeLine } from '../src/sim/trade-state.ts';
import type { NeedContext } from '../src/sim/needs.ts';
import type { Pawn,World } from '../src/sim/types.ts';

function camp(){const f=orbitalCamp(),w=f.world,p=w.pawns.find(p=>p.id===f.negotiatorId)!,ship=w.orbital!.ships.find(s=>s.id===f.shipId)!,console=w.structures.find(s=>s.id===f.consoleId)!,beacon=w.structures.find(s=>s.id===f.beaconId)!;return {...f,w,p,ship,console,beacon};}
function context(w:World,p:Pawn):NeedContext {const reach=()=>reachableCells(w,p,blockedCells(w),new Set());return {search:reach,move:c=>{p.path=routeToCell(w,c,reach())??[];p.state='moving';},release:()=>releaseWork(w,p),event:message=>w.events.push({tick:w.tick,type:'need',message})};}
function ready(f:ReturnType<typeof camp>){expect(orderOrbitalTrade(f.w,f.p.id,f.ship.id,f.console.id).ok).toBe(true);const spot=orbitalConsoleSpot(f.console);Object.assign(f.p,{x:spot.x,z:spot.z,path:[],motion:null,moveCooldown:0});processOrbitalTrade(f.w,f.p,context(f.w,f.p));expect(orbitalAtContact(f.w,f.p,f.ship)).toBe(true);}
function line(f:ReturnType<typeof camp>,item='component',quantity=1):TradeLine {const g=orbitalTradeGoods(f.w,f.p,f.ship).goods.find(g=>g.pile.item===item&&g.side===(quantity>0?'buy':'sell')&&!g.refusal);if(!g)throw Error(`No ${item}`);return {pileId:g.pile.id,quantity};}
function execute(f:ReturnType<typeof camp>,lines:TradeLine[],acceptShortfall=false){const q=quoteOrbitalTrade(f.w,f.p.id,f.ship.id,lines);expect(q.ok).toBe(true);if(!q.ok)throw Error(q.reason);return applyOrbitalTrade(f.w,{type:'orbital-trade-execute',pawnId:f.p.id,shipId:f.ship.id,lines,quote:q.signature,acceptShortfall});}
const checkpoint=(w:World)=>new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));

test('adoption is prospective, private and idempotent with exactly420 uniform phase slots',()=>{
  const {w}=camp();delete w.orbital;const rng=w.rng;w.schemaVersion=215 as World['schemaVersion'];adoptOrbital(w);expect(w.orbital).toBeUndefined();w.schemaVersion=216 as World['schemaVersion'];adoptOrbital(w);
  const s=structuredClone(w.orbital!);expect(s.adoptedAt).toBe(w.tick);expect(s.cycleStart).toBeGreaterThan(w.tick);expect((s.scheduledAt-s.cycleStart)/100).toBeGreaterThanOrEqual(0);expect((s.scheduledAt-s.cycleStart)/100).toBeLessThan(420);
  expect((s.scheduledAt-s.cycleStart)%100).toBe(0);expect(w.rng).toBe(rng);adoptOrbital(w);expect(w.orbital).toEqual(s);expect(s.ships).toEqual([]);
});

test('both profiles draw inclusive Core direct stock once as globally identified stack-limited owners',()=>{
  for(const kind of ['bulk','exotic'] as const){const a=orbitalCamp(kind),b=orbitalCamp(kind),w=a.world,ship=w.orbital!.ships[0]!;expect(w).toEqual(b.world);
    expect(ship.departAt-ship.arrivedAt).toBe(4000);
    const stock=w.piles.filter(p=>p.owner.type==='orbital-ship'&&p.owner.shipId===ship.id);
    for(const [item,min,max] of ORBITAL_STOCK[kind]){const n=stock.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);expect(n).toBeGreaterThanOrEqual(min);expect(n).toBeLessThanOrEqual(max);}
    expect(stock.every(p=>p.quantity<=ITEM_DEFINITIONS[p.item].stackLimit)).toBe(true);expect(new Set([ship.id,...w.piles.map(p=>p.id)]).size).toBe(w.piles.length+1);
    const stockBefore=structuredClone(stock);advanceOrbital(w);expect(w.piles.filter(p=>p.owner.type==='orbital-ship')).toEqual(stockBefore);
    while(w.orbital!.ships.length<5)expect(createOrbitalShip(w,kind)).toBeDefined();const before=structuredClone(w);expect(createOrbitalShip(w,kind)).toBeUndefined();expect(w).toEqual(before);
  }
});

test('coverage respects7.9 Euclidean radius, roof independence, union and doors even when open',()=>{
  const {w,beacon}=camp();w.structures=w.structures.filter(s=>s===beacon);beacon.x=10;beacon.z=10;
  expect(orbitalCoverage(w).has(10*w.width+17)).toBe(true);expect(orbitalCoverage(w).has(10*w.width+18)).toBe(false);
  expect(orbitalCoverage(w).has(15*w.width+16)).toBe(true);expect(orbitalCoverage(w).has(16*w.width+16)).toBe(false);
  w.roofing={constructed:[10*w.width+17],build:[],remove:[],cursor:0};expect(orbitalCoverage(w).has(10*w.width+17)).toBe(true);
  for(let z=0;z<w.height;z++)w.structures.push({id:w.nextId++,kind:z===10?'door':'wall',x:12,z,orientation:0,footprint:'standard',...z===10?{door:{open:true,holdOpen:true,forbidden:false,changedAt:0,from:1,closeAt:null,lastTouch:0}}:{}});
  expect(orbitalCoverage(w).has(10*w.width+13)).toBe(false);
  const second={...beacon,id:w.nextId++,x:14};w.structures.push(second);expect(orbitalCoverage(w).has(10*w.width+13)).toBe(true);
  expect(orbitalCoverage(w).size).toBe(new Set(orbitalCoverage(w)).size);second.power={on:false,parentId:null};expect(orbitalCoverage(w).has(10*w.width+13)).toBe(false);
});

test('contact walks to exact rotated console interaction cell and grants no trade XP',()=>{
  const f=camp(),xp=f.p.skills.social!.xp;
  expect(orderOrbitalTrade(f.w,f.p.id,f.ship.id,f.console.id).ok).toBe(true);expect(f.p.path.length).toBeGreaterThan(0);expect(f.p.orbitalTrade!.phase).toBe('approach');expect(orbitalAtContact(f.w,f.p,f.ship)).toBe(false);
  processOrbitalTrade(f.w,f.p,context(f.w,f.p));expect(f.p.orbitalTrade!.phase).toBe('approach');ready(f);expect(f.p.state).toBe('idle');expect(f.p.skills.social!.xp).toBe(xp);
  for(const orientation of [0,1,2,3] as const){f.console.orientation=orientation;const spot=orbitalConsoleSpot(f.console);expect(Math.abs(spot.x-f.console.x)+Math.abs(spot.z-f.console.z)).toBe(2);}
  expect(reconcileOrbitalTrade(f.w,f.p)).toBe(false);
});

test('shared reservations exclude a second negotiator and release on outages or other work',()=>{
  const f=camp();ready(f);const other=f.w.pawns[1]!;expect(orderOrbitalTrade(f.w,other.id,f.ship.id,f.console.id).ok).toBe(false);
  f.beacon.power!.on=false;expect(reconcileOrbitalTrade(f.w,f.p)).toBe(false);expect(f.p.orbitalTrade).toBeUndefined();f.beacon.power!.on=true;ready(f);
  f.p.cleaning={targets:[5*f.w.width+5],forced:false,phase:'approach',progress:0};expect(orbitalAtContact(f.w,f.p,f.ship)).toBe(false);expect(reconcileOrbitalTrade(f.w,f.p)).toBe(false);expect(f.p.orbitalTrade).toBeUndefined();
});

test('only actual covered and unreserved silver pays, while inventory and outside money remain excluded',()=>{
  const f=camp();ready(f);const covered=orbitalCoverage(f.w);for(const s of f.w.piles)if(s.owner.type==='ground'&&s.item==='silver')s.owner={type:'ground',x:1,z:1};
  expect(covered.has(f.w.width+1)).toBe(false);const lines=[line(f)];expect(quoteOrbitalTrade(f.w,f.p.id,f.ship.id,lines).ok).toBe(false);
  f.w.piles.push({id:f.w.nextId++,kind:'silver',item:'silver',quantity:500,owner:{type:'inventory',pawnId:f.p.id}});expect(quoteOrbitalTrade(f.w,f.p.id,f.ship.id,lines).ok).toBe(false);
  addGroundMaterial(f.w,'silver',100,{x:11,z:15},'silver');expect(quoteOrbitalTrade(f.w,f.p.id,f.ship.id,lines).ok).toBe(true);
});

test('quote is stable over unrelated ticks and stale after participant condition, money, outage or departure',()=>{
  const f=camp();ready(f);const lines=[line(f)],q=quoteOrbitalTrade(f.w,f.p.id,f.ship.id,lines);if(!q.ok)throw Error(q.reason);f.w.tick++;
  const next=quoteOrbitalTrade(f.w,f.p.id,f.ship.id,lines);expect(next.ok&&next.signature).toBe(q.signature);
  f.w.piles.find(p=>p.id===lines[0]!.pileId)!.damage=1;
  expect(applyOrbitalTrade(f.w,{type:'orbital-trade-execute',pawnId:f.p.id,shipId:f.ship.id,lines,quote:q.signature,acceptShortfall:false}).ok).toBe(false);
  f.console.power!.on=false;expect(quoteOrbitalTrade(f.w,f.p.id,f.ship.id,lines).ok).toBe(false);f.console.power!.on=true;f.w.tick=f.ship.departAt;expect(quoteOrbitalTrade(f.w,f.p.id,f.ship.id,lines).ok).toBe(false);
});

test('packed furniture and unsupported categories are refused without broadening historical visitor trade',()=>{
  const f=camp();ready(f);expect(quoteOrbitalTrade(f.w,f.p.id,f.ship.id,[{packedId:99,quantity:-1}]).ok).toBe(false);
  addGroundMaterial(f.w,'blocks',10,{x:11,z:16},'granite-blocks');addGroundMaterial(f.w,'food',1,{x:10,z:16},'simple-meal');
  const goods=orbitalTradeGoods(f.w,f.p,f.ship).goods;expect(goods.filter(g=>['granite-blocks','simple-meal'].includes(g.pile.item)).every(g=>!!g.refusal)).toBe(true);
  const e=orbitalCamp('exotic'),ew=e.world,ep=ew.pawns[0]!,es=ew.orbital!.ships[0]!;expect(orbitalTradeGoods(ew,ep,es).goods.find(g=>g.side==='sell'&&g.pile.item==='steel')?.refusal).toBeDefined();
});

test('whole draft transfers finite stock and real currency, keeps a ship receipt and opens cargo only at6+4',()=>{
  const f=camp();ready(f);const lines=[line(f,'component',2),line(f,'gold',-5)],before=f.w.piles.reduce((n,p)=>n+p.quantity,0),xp=f.p.skills.social!.xp;
  expect(execute(f,lines).ok).toBe(true);expect(f.w.trade!.recent.at(-1)!.traderId).toBe(f.ship.id);expect(f.w.pawns.some(p=>p.id===f.ship.id)).toBe(false);expect(f.p.skills.social!.xp).toBe(xp);
  const delivery=f.w.orbital!.pending[0]!;expect(delivery.landAt-delivery.createdAt).toBe(6);expect(delivery.openAt-delivery.landAt).toBe(4);
  expect(f.w.piles.some(p=>p.owner.type==='orbital-cargo'&&p.owner.deliveryId===delivery.id)).toBe(true);expect(f.w.piles.reduce((n,p)=>n+p.quantity,0)).toBe(before);
  f.w.tick=delivery.openAt-1;advanceOrbital(f.w);expect(f.w.orbital!.pending).toHaveLength(1);f.w.tick=delivery.openAt;advanceOrbital(f.w);expect(f.w.orbital!.pending).toHaveLength(0);
  expect(f.w.piles.some(p=>p.item==='component'&&p.owner.type==='ground'&&p.quantity===2)).toBe(true);expect(f.w.piles.reduce((n,p)=>n+p.quantity,0)).toBe(before);
});

test('partially sold haul-marked stack preserves ground request and condition but releases foreign request',()=>{
  const f=camp();ready(f);const l=line(f,'gold',-4),pile=f.w.piles.find(p=>p.id===l.pileId)!;pile.haulRequested=true;pile.damage=2;expect(reservedSource(f.w,pile.id)).toBe(0);const count=pile.quantity;
  expect(execute(f,[l]).ok).toBe(true);const remainder=f.w.piles.find(p=>p.id===pile.id)!;expect(remainder.quantity).toBe(count-4);expect(remainder.haulRequested).toBe(true);
  const sold=f.w.piles.find(p=>p.item==='gold'&&p.quantity===4&&p.owner.type==='orbital-ship'&&p.owner.shipId===f.ship.id)!;expect(sold.damage).toBe(2);expect(Object.hasOwn(sold,'haulRequested')).toBe(false);
});

test('a blocked opening preserves all cargo and retries without duplicating a delivery or payment',()=>{
  const f=camp();ready(f);expect(execute(f,[line(f,'component',2)]).ok).toBe(true);const delivery=f.w.orbital!.pending[0]!,cargo=structuredClone(f.w.piles.filter(p=>p.owner.type==='orbital-cargo')),ledger=structuredClone(f.w.trade);
  f.w.structures.push({id:f.w.nextId++,kind:'wall',...delivery.cell,orientation:0,footprint:'standard'});f.w.tick=delivery.openAt;advanceOrbital(f.w);expect(f.w.orbital!.pending).toHaveLength(1);expect(f.w.piles.filter(p=>p.owner.type==='orbital-cargo')).toEqual(cargo);expect(f.w.trade).toEqual(ledger);
  f.w.structures=f.w.structures.filter(s=>s.kind!=='wall');f.w.tick++;advanceOrbital(f.w);expect(f.w.orbital!.pending).toHaveLength(0);expect(f.w.trade).toEqual(ledger);
});

test('ship departure destroys only its own items; colonial cargo and a historical receipt survive',()=>{
  const f=camp();f.w.tick=f.ship.departAt-5;ready(f);expect(execute(f,[line(f,'component',2)]).ok).toBe(true);const delivery=f.w.orbital!.pending[0]!,cargo=structuredClone(f.w.piles.filter(p=>p.owner.type==='orbital-cargo'));
  f.w.tick=f.ship.departAt;advanceOrbital(f.w);expect(f.w.orbital!.ships.some(s=>s.id===f.ship.id)).toBe(false);expect(f.w.piles.some(p=>p.owner.type==='orbital-ship'&&p.owner.shipId===f.ship.id)).toBe(false);expect(f.w.piles.filter(p=>p.owner.type==='orbital-cargo')).toEqual(cargo);
  expect(f.w.trade!.recent.at(-1)!.traderId).toBe(f.ship.id);expect(checkpoint(f.w).status).toBe('applied');expect(deserializeWorld(serializeWorld(f.w))).toEqual(f.w);
  f.w.tick=delivery.openAt;advanceOrbital(f.w);expect(f.w.orbital!.pending).toHaveLength(0);
});

test('merchant shortfall requires explicit consent and sends only physically available silver in cargo',()=>{
  const f=camp();ready(f);f.w.piles=f.w.piles.filter(p=>p.owner.type!=='orbital-ship'||p.item!=='silver');const lines=[line(f,'gold',-5)],before=structuredClone(f.w);
  expect(execute(f,lines).ok).toBe(false);expect(f.w).toEqual(before);expect(execute(f,lines,true).ok).toBe(true);expect(f.w.trade!.forgone).toBeGreaterThan(0);expect(f.w.trade!.silverReceived).toBe(0);expect(f.w.orbital!.pending).toEqual([]);
});

test('basket preflight rejects a saturated reception before payment, IDs, ledger or goods change',()=>{
  const f=camp();ready(f);const lines=[line(f,'component',2)];
  for(const pile of f.w.piles)if(pile.owner.type==='ground')pile.quantity=ITEM_DEFINITIONS[pile.item].stackLimit;
  for(let z=0;z<f.w.height;z++)for(let x=0;x<f.w.width;x++)if(!f.w.piles.some(p=>p.owner.type==='ground'&&p.owner.x===x&&p.owner.z===z))f.w.piles.push({id:f.w.nextId++,kind:'wood',item:'wood',quantity:75,owner:{type:'ground',x,z}});
  const before=structuredClone(f.w);expect(execute(f,lines).ok).toBe(false);expect(f.w).toEqual(before);
});

test('selling perishable food checkpoints its actual age and freezes unspawned ship stock',()=>{
  const f=camp();addGroundMaterial(f.w,'food',10,{x:10,z:16},'rice');ready(f);const l=line(f,'rice',-5),pile=f.w.piles.find(p=>p.id===l.pileId)!;pile.rot={progress:20,atTick:f.w.tick-10,rate:1};const age=rotAge(pile,f.w.tick);
  expect(execute(f,[l]).ok).toBe(true);const sold=f.w.piles.find(p=>p.item==='rice'&&p.owner.type==='orbital-ship')!;expect(rotAge(sold,f.w.tick)).toBe(age);expect(rotAge(sold,f.w.tick+100)).toBe(age);expect(sold.rot!.rate).toBe(0);
});

test('ready contact, committed flight and opening roundtrip through strict files and real SnapshotDecoder',()=>{
  const f=camp();ready(f);expect(validateWorld(f.w)).toEqual([]);expect(checkpoint(f.w).status).toBe('applied');expect(deserializeWorld(serializeWorld(f.w))).toEqual(f.w);
  expect(execute(f,[line(f,'component',2),line(f,'neutroamine',3)]).ok).toBe(true);expect(validateWorld(f.w)).toEqual([]);expect(checkpoint(f.w).status).toBe('applied');const saved=deserializeWorld(serializeWorld(f.w));expect(saved).toEqual(f.w);
  f.w.tick=f.w.orbital!.pending[0]!.openAt;saved.tick=f.w.tick;advanceOrbital(f.w);advanceOrbital(saved);expect(saved).toEqual(f.w);expect(checkpoint(saved).status).toBe('applied');
});
