import { expect,test } from 'vitest';
import { deepDrillingCamp } from './helpers/deep-drilling-v280.ts';
import { DEEP_RADIAL,DEEP_RESOURCES,adoptDeepResources,addDeepDeposit,deepResourceAt,nextDeepResource,discoverDeepDeposit,deepScannerOverlayPowered } from '../src/sim/deep-resources.ts';
import { deepWorkReason,deepWorkSpot } from '../src/sim/deep-drilling-rules.ts';
import { deepWorkProposal,startDeepWork,processDeepWork,reconcileDeepWork } from '../src/sim/deep-drilling.ts';
import { blockedCells,reachableCells,routeToCell } from '../src/sim/pathfinding.ts';
import { groundCapacity,groundPile,nearbyGround } from '../src/sim/ground-placement.ts';
import { releaseWork } from '../src/sim/work-release.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import type { NeedContext } from '../src/sim/needs.ts';
import type { Pawn,Structure,World } from '../src/sim/types.ts';

function camp(){const f=deepDrillingCamp(),w=f.world,p=w.pawns.find(p=>p.id===f.minerId)!,r=w.pawns.find(p=>p.id===f.researcherId)!,d=w.structures.find(s=>s.id===f.drillId)!,s=w.structures.find(s=>s.id===f.scannerId)!;return {...f,w,p,r,d,s};}
const reach=(w:World,p:Pawn)=>reachableCells(w,p,blockedCells(w),new Set());
function context(w:World,p:Pawn):NeedContext {return {search:()=>reach(w,p),move:c=>{p.path=routeToCell(w,c,reach(w,p))??[];},release:()=>releaseWork(w,p),event:message=>w.events.push({tick:w.tick,type:'need',message})};}
function begin(w:World,p:Pawn,s:Structure,contact=true){const proposal=deepWorkProposal(w,p,s,reach(w,p));expect(proposal).toBeDefined();if(!proposal)throw Error('No deep-work proposal');startDeepWork(p,proposal);if(contact){p.x=proposal.task.spot.x;p.z=proposal.task.spot.z;p.path=[];p.motion=null;p.moveCooldown=0;}return proposal;}
const quantity=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);

test('adoption is prospective and deposits are finite, sorted, unique and selected within exactly21 cells',()=>{
  const {w,d}=camp(),rng=w.rng;delete w.deepResources;w.schemaVersion=214 as World['schemaVersion'];adoptDeepResources(w);expect(w.deepResources).toBeUndefined();
  w.schemaVersion=215;adoptDeepResources(w);expect(w.deepResources!.cells).toEqual([]);expect(w.rng).toBe(rng);
  const cells=[{x:d.x+2,z:d.z+1},{x:d.x-2,z:d.z},{x:d.x,z:d.z}];
  expect(addDeepDeposit(w,'gold',[...cells,cells[0]!])).toBe(3);expect(addDeepDeposit(w,'steel',[d])).toBe(0);
  expect(w.deepResources!.cells.map(c=>c.index)).toEqual(w.deepResources!.cells.map(c=>c.index).sort((a,b)=>a-b));
  expect(DEEP_RADIAL.slice(0,21).every(c=>c.x*c.x+c.z*c.z<=5)).toBe(true);expect(nextDeepResource(w,d)!.cell).toEqual({x:d.x,z:d.z});
  w.deepResources!.cells=[];addDeepDeposit(w,'silver',[{x:d.x+2,z:d.z+2}]);expect(nextDeepResource(w,d)).toBeUndefined();
});

test('strict10000 work threshold, physical output, raw reserve debit and Mining XP share one executable contact',()=>{
  const {w,p,d}=camp(),rng=w.rng;begin(w,p,d);d.deepDrill={progress:9990,yieldPct:.999,rng:123};
  processDeepWork(w,p,context(w,p));expect(d.deepDrill.progress).toBe(10000);expect(quantity(w,'steel')).toBe(0);expect(deepResourceAt(w,d)!.count).toBe(300);
  processDeepWork(w,p,context(w,p));expect(d.deepDrill.progress).toBe(9);expect(quantity(w,'steel')).toBe(45);expect(deepResourceAt(w,d)!.count).toBe(255);
  expect(p.skills.mining!.xp).toBe(1300);expect(w.rng).toBe(rng);
  const spot=deepWorkSpot(d);expect(w.piles.every(i=>i.owner.type!=='ground'||(i.owner.x!==d.x||i.owner.z!==d.z)&&(i.owner.x!==spot.x||i.owner.z!==spot.z))).toBe(true);
});

test('every delivered ore portion debits finite raw stock and a depleted drill produces one local-stone chunk',()=>{
  for(const item of ['steel','gold','silver','plasteel'] as const){
    const {w,p,d}=camp();w.deepResources!.cells=[];addDeepDeposit(w,item,[d],7);begin(w,p,d);
    d.deepDrill={progress:10000,yieldPct:1,rng:123};processDeepWork(w,p,context(w,p));expect(deepResourceAt(w,d)).toBeUndefined();expect(quantity(w,item)).toBe(7);
    d.deepDrill={progress:10000,yieldPct:1,rng:1};processDeepWork(w,p,context(w,p));expect(w.piles.filter(i=>i.kind==='chunk').reduce((n,i)=>n+i.quantity,0)).toBe(1);
    expect(DEEP_RESOURCES[item].portion).toBeGreaterThanOrEqual(7);
  }
});

test('MiningYield changes physical output rather than creating or preserving raw reserve units',()=>{
  const {w,p,d}=camp();begin(w,p,d);d.deepDrill={progress:10000,yieldPct:.5,rng:1};processDeepWork(w,p,context(w,p));
  expect(deepResourceAt(w,d)!.count).toBe(255);expect(quantity(w,'steel')).toBeGreaterThanOrEqual(22);expect(quantity(w,'steel')).toBeLessThanOrEqual(23);
});

test('a saturated floor blocks the final portion atomically, preserving RNG, work, XP and reserve until space returns',()=>{
  const {w,p,d}=camp();begin(w,p,d);d.deepDrill={progress:10000,yieldPct:1,rng:123};
  for(const c of nearbyGround(w,deepWorkSpot(d)))if(!groundPile(w,c)&&groundCapacity(w,c,'wood')>0)w.piles.push({id:w.nextId++,kind:'wood',item:'wood',quantity:1,owner:{type:'ground',...c}});
  const before=structuredClone({state:d.deepDrill,reserve:w.deepResources,skill:p.skills.mining,rng:w.rng});processDeepWork(w,p,context(w,p));
  expect({state:d.deepDrill,reserve:w.deepResources,skill:p.skills.mining,rng:w.rng}).toEqual(before);expect(quantity(w,'steel')).toBe(0);
  w.piles=[];processDeepWork(w,p,context(w,p));expect(quantity(w,'steel')).toBeGreaterThan(0);expect(deepResourceAt(w,d)!.count).toBe(255);
});

test('operator claims, priority, power, roof and removal intents prevent work while preserving acquired progress',()=>{
  const {w,p,r,d,s}=camp();begin(w,p,d);r.priorities.mine=1;expect(deepWorkProposal(w,r,d,reach(w,r))).toBeUndefined();
  d.deepDrill={progress:100,yieldPct:.01,rng:1};d.power!.on=false;expect(reconcileDeepWork(w,p)).toBe(false);expect(p.deepWork).toBeUndefined();expect(d.deepDrill.progress).toBe(100);
  d.power!.on=true;begin(w,p,d);p.priorities.mine=0;expect(reconcileDeepWork(w,p)).toBe(false);p.priorities.mine=1;
  begin(w,p,d);w.jobs.push({id:w.nextId++,kind:'uninstall',x:d.x,z:d.z,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0},furniture:{structureId:d.id,kind:d.kind}});
  expect(reconcileDeepWork(w,p)).toBe(false);expect(d.deepDrill.progress).toBe(100);
  w.roofing={constructed:[s.z*w.width+s.x],build:[],remove:[],cursor:0};expect(deepWorkReason(w,r,s)).toMatch(/ciel ouvert/);
});

test('scanner discovery needs real contact and59Core hash checks; its guarantee, private stream and clipping produce finite cells',()=>{
  const {w,r,s}=camp(),rng=w.rng;begin(w,r,s,false);s.deepScanner={daysWorking:6};processDeepWork(w,r,context(w,r));expect(w.deepResources!.discoveries).toBe(0);
  const spot=deepWorkSpot(s);Object.assign(r,{x:spot.x,z:spot.z,path:[],motion:null,moveCooldown:0});
  for(let n=0;n<7&&!w.deepResources!.discoveries;n++){w.tick++;processDeepWork(w,r,context(w,r));}
  expect(w.deepResources!.discoveries).toBe(1);expect(s.deepScanner.daysWorking).toBeLessThan(.01);expect(w.rng).toBe(rng);expect(r.skills.intellectual!.xp).toBeGreaterThanOrEqual(350);
  expect(w.deepResources!.cells.every(c=>c.count===300)).toBe(true);expect(deepScannerOverlayPowered(w)).toBe(true);s.power!.on=false;expect(deepScannerOverlayPowered(w)).toBe(false);
});

test('discovery is deterministic and cannot overwrite reserves or create ore in water or at the no-build edge',()=>{
  const {w}=camp(),copy=structuredClone(w);expect(discoverDeepDeposit(w)).toBe(true);expect(discoverDeepDeposit(copy)).toBe(true);expect(w.deepResources).toEqual(copy.deepResources);
  expect(w.deepResources!.cells.every(c=>c.index%w.width>=5&&c.index%w.width<w.width-5&&Math.floor(c.index/w.width)>=5&&Math.floor(c.index/w.width)<w.height-5)).toBe(true);
  const previous=structuredClone(w.deepResources!.cells);w.tiles=w.tiles.map(()=>({terrain:'water'}));expect(discoverDeepDeposit(w)).toBe(false);expect(w.deepResources!.cells).toEqual(previous);
});

test('the real planner moves an operator, resumes a mid-portion save and exhausts the same finite reserve deterministically',()=>{
  const {w,p,d,s}=camp();s.power!.switchOn=false;s.power!.on=false;
  expect(validateWorld(w)).toEqual([]);
  for(let i=0;i<180&&!d.deepDrill;i++)stepWorld(w);expect(p.deepWork?.kind).toBe('drill');expect(d.deepDrill?.progress).toBeGreaterThan(0);
  d.deepDrill!.progress=9990;d.deepDrill!.yieldPct=.999;
  const loaded=deserializeWorld(serializeWorld(w));expect(loaded).not.toBeNull();if(!loaded)throw Error('Deep work resume failed');
  for(let i=0;i<4;i++){stepWorld(w);stepWorld(loaded);}
  expect(serializeWorld(loaded)).toBe(serializeWorld(w));expect(quantity(w,'steel')).toBeGreaterThan(0);expect(deepResourceAt(w,d)!.count).toBe(255);
});
