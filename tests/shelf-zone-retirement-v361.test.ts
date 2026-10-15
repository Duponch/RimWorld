import {expect,test} from 'vitest';
import {applyCommand,canDesignate,stepWorld} from '../src/sim/engine.ts';
import {addGroundMaterial,reservedSource} from '../src/sim/materials.ts';
import {serializeWorld,deserializeWorld} from '../src/sim/serialization.ts';
import {storageAt,storageCellById} from '../src/sim/shelf-storage.ts';
import {stockpileZoneId} from '../src/sim/stockpile-zones.ts';
import {damagePile,pileMaxHp} from '../src/sim/thing-damage.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {shelfZoneCamp,shelfZone,acceptShelfZone,validShelfZone,untilShelfZone,exactShelfZone,paidSmallShelfScene} from './scenarios/shelf-zone-v361.ts';
import type {Command,Cell,MaterialPile,World} from '../src/sim/types.ts';

// Prepared physical regressions. They do not certify a campaign or a repaired
// human checkpoint. The only finished shelf helper performs its real payment.
const target={x:17,z:18};
const small={type:'designate',kind:'small-shelf',...target,orientation:0,material:'wood'} as const;
const geometry=[
 {kind:'small-shelf',orientation:0,cells:[[17,18]]},
 {kind:'shelf',orientation:0,cells:[[17,18],[18,18]]},
 {kind:'shelf',orientation:1,cells:[[17,18],[17,17]]},
 {kind:'shelf',orientation:2,cells:[[17,18],[16,18]]},
 {kind:'shelf',orientation:3,cells:[[17,18],[17,19]]},
] as const;
function reject(w:World,c:Command):void {const before=serializeWorld(w);expect(applyCommand(w,c).ok).toBe(false);expect(serializeWorld(w)).toBe(before);}
function custody(p:MaterialPile){return {id:p.id,item:p.item,quantity:p.quantity,owner:structuredClone(p.owner)};}
function replay(w:World,n=3):void {exactShelfZone(w);const copy=deserializeWorld(serializeWorld(w));stepWorld(w,n);stepWorld(copy,n);expect(copy).toEqual(w);validShelfZone(w);}
function haulScene(size=32,destination:Cell=target){
 const w=shelfZoneCamp(1,size),p=w.pawns[0]!;p.priorities.build=0;p.priorities.haul=1;
 Object.assign(p,{x:2,z:2});shelfZone(w,destination);
 const sourceId=w.nextId;addGroundMaterial(w,'food',6,{x:3,z:2},'rice');
 acceptShelfZone(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:sourceId},queue:false});
 return {w,p,sourceId,destination,zoneId:w.stockpiles[0]!.id};
}
function pickup(s:ReturnType<typeof haulScene>){
 untilShelfZone(s.w,()=>s.p.haul?.phase==='deliver'&&s.p.moveCooldown===0,30);
 const carry=s.w.piles.find(p=>p.id===s.p.haul!.carryPileId)!;expect(carry).toMatchObject({quantity:6,owner:{type:'pawn',pawnId:s.p.id}});return carry;
}
function chopJob(w:World,cell:Cell){w.resources.push({id:w.nextId++,kind:'tree',amount:20,...cell});acceptShelfZone(w,{type:'designate',kind:'chop',...cell});return w.jobs.at(-1)!;}

test.each(geometry)('V361 $kind orientation $orientation removes only the blueprint footprint and preserves residual policy and real piles',({kind,orientation,cells})=>{
 const w=shelfZoneCamp();shelfZone(w,{x:15,z:16},{x:19,z:20});
 const beforeZones=structuredClone(w.stockpiles),pileIds:number[]=[];
 for(const [x,z]of cells){pileIds.push(w.nextId);addGroundMaterial(w,'food',5,{x,z},'rice');}
 const piles=structuredClone(w.piles),before=serializeWorld(w),next=w.nextId,rng=w.rng;
 const c={type:'designate',kind,...target,orientation,material:'wood'} as const;
 expect(canDesignate(w,c).ok).toBe(true);expect(serializeWorld(w)).toBe(before);
 acceptShelfZone(w,c);expect(w.nextId).toBe(next+1);expect(w.rng).toBe(rng);expect(w.piles).toEqual(piles);
 const covered=new Set(cells.map(([x,z])=>`${x},${z}`));expect(w.stockpiles).toEqual(beforeZones.filter(z=>!covered.has(`${z.x},${z.z}`)));
 const j=w.jobs.at(-1)!;expect(j).toMatchObject({id:next,kind,construction:'blueprint',escrow:{wood:0,food:0}});expect(w.structures).toEqual([]);expect('shelf' in j).toBe(false);
 for(const id of pileIds)expect(w.piles.find(p=>p.id===id)?.owner.type).toBe('ground');exactShelfZone(w);
 acceptShelfZone(w,{type:'cancel-job',jobId:j.id});expect(w.jobs).toEqual([]);expect(w.stockpiles).toEqual(beforeZones.filter(z=>!covered.has(`${z.x},${z.z}`)));expect(w.piles).toEqual(piles);exactShelfZone(w);
});

test('V361 a shelf splitting a three-cell reserve keeps the first component, releases a real detached delivery and keeps its source/other loose pile',()=>{
 const w=shelfZoneCamp(),p=w.pawns[0]!;p.priorities.build=0;p.priorities.haul=1;shelfZone(w,{x:16,z:18},{x:18,z:18});const before=structuredClone(w.stockpiles),sourceId=w.nextId;
 addGroundMaterial(w,'food',6,{x:25,z:18},'rice');const looseId=w.nextId;addGroundMaterial(w,'food',7,{x:18,z:18},'rice');
 acceptShelfZone(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:sourceId},queue:false});expect(p.haul?.destination).toEqual({type:'stockpile',stockpileId:before[2]!.id});expect(p.haul?.phase).toBe('pickup');const piles=structuredClone(w.piles),next=w.nextId;
 acceptShelfZone(w,small);expect(w.stockpiles).toEqual([before[0]]);expect(stockpileZoneId(w.stockpiles[0]!)).toBe(stockpileZoneId(before[0]!));expect(p.haul).toBeNull();expect(p.orders.active).toBeNull();expect(reservedSource(w,sourceId)).toBe(0);expect(w.piles).toEqual(piles);expect(w.piles.find(p=>p.id===looseId)?.owner).toEqual({type:'ground',x:18,z:18});expect(w.nextId).toBe(next+1);exactShelfZone(w);
});

test('V361 real construction pays ten wood, saves blueprint/frame/final and exposes only new shelf storage identities',()=>{
 const w=shelfZoneCamp();shelfZone(w,target,{x:18,z:18});const oldId=w.stockpiles[0]!.id,residual=structuredClone(w.stockpiles[1]!);
 const riceId=w.nextId;addGroundMaterial(w,'food',5,target,'rice');const woodId=w.nextId;addGroundMaterial(w,'wood',10,{x:12,z:16},'wood');acceptShelfZone(w,small);const jobId=w.jobs.at(-1)!.id;
 expect(storageCellById(w,oldId)).toBeUndefined();expect(storageAt(w,target)).toBeUndefined();exactShelfZone(w);
 untilShelfZone(w,()=>w.pawns[0]!.haul?.destination.type==='job'&&w.pawns[0]!.haul?.phase==='deliver',200);const woodCargo=w.piles.find(p=>p.id===w.pawns[0]!.haul!.carryPileId)!;expect(woodCargo).toMatchObject({item:'wood',quantity:10,owner:{type:'pawn'}});expect(w.piles.some(p=>p.id===woodId)).toBe(false);replay(w,2);
 untilShelfZone(w,()=>w.jobs.find(j=>j.id===jobId)?.construction==='frame',300);expect(w.piles.filter(p=>p.owner.type==='job'&&p.owner.jobId===jobId).reduce((n,p)=>n+p.quantity,0)).toBe(10);expect(storageAt(w,target)).toBeUndefined();exactShelfZone(w);
 untilShelfZone(w,()=>w.structures.some(s=>s.kind==='small-shelf'),300);expect(w.jobs.some(j=>j.id===jobId)).toBe(false);const s=w.structures.find(s=>s.kind==='small-shelf')!;expect(s.shelf!.cells).toHaveLength(1);expect(s.shelf!.cells[0]).not.toBe(oldId);expect(s.shelf!.cells[0]).not.toBe(s.id);expect(storageAt(w,target)?.id).toBe(s.shelf!.cells[0]);expect(w.stockpiles).toEqual([residual]);expect(w.piles.filter(p=>p.item==='wood')).toEqual([]);expect(w.piles.find(p=>p.id===riceId)).toMatchObject({quantity:5,owner:{type:'ground',...target}});expect(s.quality).toBeUndefined();replay(w);
 const p=w.pawns[0]!;acceptShelfZone(w,{type:'priority',pawnId:p.id,work:'build',value:0});acceptShelfZone(w,{type:'priority',pawnId:p.id,work:'haul',value:1});acceptShelfZone(w,{type:'shelf-policy',structureId:s.id,settings:{priority:4}});
 const incomingId=w.nextId;addGroundMaterial(w,'steel',9,{x:12,z:16},'steel');acceptShelfZone(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:incomingId},queue:false});expect(p.haul?.destination).toEqual({type:'stockpile',stockpileId:s.shelf!.cells[0]});untilShelfZone(w,()=>p.haul===null,250);expect(w.piles.find(p=>p.item==='steel')).toMatchObject({quantity:9,owner:{type:'ground',...target}});exactShelfZone(w);
});

test('V361 a queue-only haul loses only the retired destination while executable foreign jobs and sources remain',()=>{
 const w=shelfZoneCamp(),p=w.pawns[0]!;p.priorities.build=0;p.priorities.haul=1;p.priorities.gather=1;shelfZone(w,target);
 const a=chopJob(w,{x:4,z:4}),b=chopJob(w,{x:6,z:4}),sourceId=w.nextId;addGroundMaterial(w,'food',6,{x:24,z:18},'rice');
 acceptShelfZone(w,{type:'order-job',pawnId:p.id,jobId:a.id,queue:false});acceptShelfZone(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:sourceId},queue:true});acceptShelfZone(w,{type:'order-job',pawnId:p.id,jobId:b.id,queue:true});expect(p.orders.queue).toHaveLength(2);expect(reservedSource(w,sourceId)).toBe(6);const source=structuredClone(w.piles.find(p=>p.id===sourceId));
 acceptShelfZone(w,small);expect(p.jobId).toBe(a.id);expect(p.orders.queue).toEqual([b.id]);expect(w.piles.find(p=>p.id===sourceId)).toEqual(source);expect(reservedSource(w,sourceId)).toBe(0);expect(w.jobs.some(j=>j.id===b.id)).toBe(true);exactShelfZone(w);
});

test('V361 stationary real cargo is deposited with its own ID/condition before the destination cell is removed',()=>{
 const s=haulScene(),{w,p}=s,carry=pickup(s),before=custody(carry),next=w.nextId,rng=w.rng;
 expect(p.motion?.end??0).toBeLessThanOrEqual(w.tick);acceptShelfZone(w,small);expect(p.haul).toBeNull();expect(p.orders.active).toBeNull();expect(w.stockpiles).toEqual([]);expect(w.piles.find(q=>q.id===before.id)).toMatchObject({id:before.id,item:before.item,quantity:before.quantity,owner:{type:'ground'}});expect(w.nextId).toBe(next+1);expect(w.rng).toBe(rng);exactShelfZone(w);
});

test('V361 a real held travel edge refuses retirement atomically; ordinary completed delivery then permits the shelf',()=>{
 const s=haulScene(),{w,p}=s,carry=pickup(s);untilShelfZone(w,()=>p.haul?.phase==='deliver'&&(p.motion?.end??0)>w.tick,30);
 const edge=structuredClone(p.motion),owner=structuredClone(carry.owner);reject(w,small);expect(p.motion).toEqual(edge);expect(carry.owner).toEqual(owner);expect(p.haul?.destination).toEqual({type:'stockpile',stockpileId:s.zoneId});exactShelfZone(w);
 untilShelfZone(w,()=>p.haul===null,300);expect(w.piles.find(q=>q.id===carry.id)).toMatchObject({quantity:6,owner:{type:'ground',...target}});const delivered=structuredClone(w.piles.find(q=>q.id===carry.id));acceptShelfZone(w,small);expect(w.piles.find(q=>q.id===carry.id)).toEqual(delivered);exactShelfZone(w);
});

test('V361 no actual drop cell refuses without losing cargo, queue, zone, RNG or IDs; a physically destroyed blocker permits retry',()=>{
 const destination={x:12,z:10},s=haulScene(16,destination),{w,p}=s,carry=pickup(s);addGroundMaterial(w,'food',69,destination,'rice');
 for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)if(x!==destination.x||z!==destination.z)addGroundMaterial(w,'wood',75,{x,z},'wood');validShelfZone(w);
 const c={...small,...destination},id=carry.id;reject(w,c);expect(carry.owner).toEqual({type:'pawn',pawnId:p.id});expect(p.haul?.phase).toBe('deliver');
 const blocker=w.piles.find(q=>q.owner.type==='ground'&&q.owner.x===p.x&&q.owner.z===p.z)!;expect(damagePile(w,blocker,pileMaxHp(blocker),'bomb')).toBe(true);validShelfZone(w);acceptShelfZone(w,c);expect(w.piles.find(q=>q.id===id)).toMatchObject({quantity:6,owner:{type:'ground',x:p.x,z:p.z}});expect(w.stockpiles).toEqual([]);exactShelfZone(w);
});

test('V361 paid shelf uninstall and reinstallation retire only the target reserve and retain the same building/storage policy/cell IDs',()=>{
 const {w,s,originalRiceId}=paidSmallShelfScene();acceptShelfZone(w,{type:'shelf-policy',structureId:s.id,settings:{priority:2,items:{rice:true},allowRotten:false}});const shelf=structuredClone(s.shelf),originalId=s.id;
 acceptShelfZone(w,{type:'designate',kind:'uninstall',targetId:s.id,x:s.x,z:s.z});untilShelfZone(w,()=>w.packed.some(p=>p.building.id===originalId),300);const pack=w.packed.find(p=>p.building.id===originalId)!;expect(pack.building).toBe(s);expect(pack.owner.type).toBe('ground');expect(w.piles.find(p=>p.id===originalRiceId)?.owner).toEqual({type:'ground',...target});exactShelfZone(w);
 shelfZone(w,{x:24,z:18},{x:25,z:18});const residual=structuredClone(w.stockpiles.find(z=>z.x===25&&z.z===18)!);const steelId=w.nextId;addGroundMaterial(w,'steel',7,{x:24,z:18},'steel');const steel=structuredClone(w.piles.find(p=>p.id===steelId));
 acceptShelfZone(w,{type:'install',structureId:originalId,x:24,z:18,orientation:3});expect(w.jobs.at(-1)).toMatchObject({kind:'install',construction:'blueprint',furniture:{structureId:originalId,kind:'small-shelf'}});expect(w.stockpiles.some(z=>z.x===24&&z.z===18)).toBe(false);expect(w.stockpiles.find(z=>z.id===residual.id)).toEqual(residual);expect(w.piles.find(p=>p.id===steelId)).toEqual(steel);exactShelfZone(w);
 untilShelfZone(w,()=>w.packed.find(p=>p.building.id===originalId)?.owner.type==='pawn',300);expect(w.packed.find(p=>p.building.id===originalId)?.building.shelf).toEqual(shelf);replay(w,2);untilShelfZone(w,()=>w.structures.some(s=>s.id===originalId),300);
 const installed=w.structures.find(s=>s.id===originalId)!;expect(installed).toBe(s);expect(installed).toMatchObject({x:24,z:18,orientation:3});expect(installed.shelf).toEqual(shelf);expect(w.piles.find(p=>p.id===steelId)).toMatchObject({id:steelId,item:'steel',quantity:7,owner:{type:'ground',x:24,z:18}});exactShelfZone(w);
});

test('V361 a genuinely paid bulk meal retains its held product and progress when its output reserve is replaced, without recooking',()=>{
 const w=shelfZoneCamp(),p=w.pawns[0]!;p.priorities.build=0;p.priorities.cook=1;Object.assign(p,{x:8,z:10});shelfZone(w,{x:24,z:8});
 const station=Object.assign(fixtureBuilding(w,'campfire',15,8),{fuel:{ticks:6000,burned:0,autoRefuel:false}}),bill=newCookingBill(w.nextId++,'cook-simple-meal-bulk');Object.assign(station,{bills:[bill]});bill.destination='stockpile';
 addGroundMaterial(w,'food',40,{x:9,z:10},'rice');acceptShelfZone(w,{type:'order-cook',pawnId:p.id,structureId:station.id,queue:false});untilShelfZone(w,()=>p.cooking?.phase==='output'&&p.cooking.storageId!==null,1200);
 const task=p.cooking!,product=w.piles.find(q=>q.id===task.productId)!,paidProduct=custody(product),xp=p.skills.cooking!.xp,events=w.events.filter(e=>e.message.includes('a cuisiné')),next=w.nextId,rng=w.rng;
 expect(task.storageId).toBe(w.stockpiles[0]!.id);expect(task.storageQuantity).toBe(4);expect(product).toMatchObject({item:'simple-meal',quantity:4,owner:{type:'pawn',pawnId:p.id}});expect(w.piles.some(q=>q.item==='rice')).toBe(false);expect(bill.target).toBe(0);expect(events).toHaveLength(1);
 acceptShelfZone(w,{...small,x:24,z:8});expect(p.cooking).toBe(task);expect(task).toMatchObject({phase:'output',productId:product.id,storageId:null,progress:0});expect(task.storageQuantity).toBeUndefined();expect(custody(product)).toEqual(paidProduct);expect(p.skills.cooking!.xp).toBe(xp);expect(w.nextId).toBe(next+1);expect(w.rng).toBe(rng);exactShelfZone(w);
 shelfZone(w,{x:24,z:10});untilShelfZone(w,()=>p.cooking===null,300);expect(w.piles.find(q=>q.id===product.id)).toMatchObject({quantity:4,owner:{type:'ground',x:24,z:10}});expect(w.events.filter(e=>e.message.includes('a cuisiné'))).toEqual(events);expect(p.skills.cooking!.xp).toBe(xp);expect(bill.target).toBe(0);exactShelfZone(w);
});

test.each([
 {name:'locked research',change:(w:World)=>{delete w.research!.complexFurniture;},command:{...small}},
 {name:'nonbuilding material',change:(_w:World)=>{},command:{...small,material:'cloth'}},
 {name:'second footprint tile is water',change:(w:World)=>{w.tiles[18*w.width+18]={terrain:'water'};},command:{...small,kind:'shelf'}},
 {name:'second footprint tile is rock',change:(w:World)=>{w.tiles[18*w.width+18]={terrain:'rock'};},command:{...small,kind:'shelf'}},
 {name:'two-cell out of bounds',change:(_w:World)=>{},command:{...small,kind:'shelf',x:31}},
])('V361 rejected $name changes no reserve or physical stock',({change,command})=>{
 const w=shelfZoneCamp();change(w);shelfZone(w,{x:15,z:16},{x:19,z:20});reject(w,command as Command);exactShelfZone(w);
});

test.each([
 {kind:'stool',keepsZone:true,keepsHaul:true},
 {kind:'campfire',keepsZone:true,keepsHaul:false},
 {kind:'wall',keepsZone:false,keepsHaul:false},
] as const)('V361 existing $kind coexistence keeps its own zone/storage distinction',({kind,keepsZone,keepsHaul})=>{
 const s=haulScene(),{w,p}=s,before=structuredClone(w.stockpiles),source=structuredClone(w.piles.find(q=>q.id===s.sourceId));acceptShelfZone(w,{type:'designate',kind,...target,orientation:0,material:'wood'});
 expect(w.stockpiles).toEqual(keepsZone?before:[]);expect(p.haul!==null).toBe(keepsHaul);expect(w.piles.find(q=>q.id===s.sourceId)).toEqual(source);exactShelfZone(w);
});

 test('V361 real growing-zone admission keeps only uncovered cells and cancels the covered sowing intent before shelf payment',()=>{
 const w=shelfZoneCamp(),p=w.pawns[0]!;p.priorities.build=0;p.priorities.grow=1;
 acceptShelfZone(w,{type:'area',action:'growing',from:{x:16,z:18},to:{x:18,z:18}});untilShelfZone(w,()=>w.jobs.some(j=>j.kind==='sow'&&j.x===17&&j.z===18),30);
 const zone=w.growingZones[0]!,before=structuredClone(zone),covered=18*w.width+17;expect(w.jobs.some(j=>j.kind==='sow'&&j.x===17&&j.z===18)).toBe(true);
 acceptShelfZone(w,small);expect(w.growingZones[0]).toEqual({...before,cells:before.cells.filter(c=>c!==covered)});expect(w.growingZones[0]!.id).toBe(zone.id);expect(w.jobs.some(j=>j.kind==='sow'&&j.x===17&&j.z===18)).toBe(false);expect(w.jobs.find(j=>j.kind==='small-shelf')?.construction).toBe('blueprint');exactShelfZone(w);
 });

 test('V361 real packed installation shares the held-edge refusal and succeeds after the original haul completes',()=>{
 const {w,s,originalRiceId}=paidSmallShelfScene(),p=w.pawns[0]!,destination={x:24,z:18};
 acceptShelfZone(w,{type:'designate',kind:'uninstall',targetId:s.id,x:s.x,z:s.z});untilShelfZone(w,()=>w.packed.some(q=>q.building.id===s.id),300);
 acceptShelfZone(w,{type:'area',action:'remove-stockpile',from:{x:18,z:18},to:{x:18,z:18}});shelfZone(w,destination);
 acceptShelfZone(w,{type:'priority',pawnId:p.id,work:'build',value:0});acceptShelfZone(w,{type:'priority',pawnId:p.id,work:'haul',value:1});acceptShelfZone(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:originalRiceId},queue:false});
 untilShelfZone(w,()=>p.haul?.phase==='deliver'&&(p.motion?.end??0)>w.tick,100);const carryId=p.haul!.carryPileId,edge=structuredClone(p.motion),pack=structuredClone(w.packed.find(q=>q.building.id===s.id));
 const install={type:'install',structureId:s.id,...destination,orientation:2} as const;reject(w,install);expect(p.motion).toEqual(edge);expect(w.packed.find(q=>q.building.id===s.id)).toEqual(pack);expect(w.piles.find(q=>q.id===carryId)?.owner).toEqual({type:'pawn',pawnId:p.id});
 untilShelfZone(w,()=>p.haul===null,250);const delivered=custody(w.piles.find(q=>q.id===carryId)!);acceptShelfZone(w,install);expect(w.stockpiles).toEqual([]);expect(custody(w.piles.find(q=>q.id===carryId)!)).toEqual(delivered);exactShelfZone(w);
 acceptShelfZone(w,{type:'priority',pawnId:p.id,work:'build',value:1});untilShelfZone(w,()=>w.structures.some(q=>q.id===s.id),300);expect(w.structures.find(q=>q.id===s.id)?.shelf).toEqual(s.shelf);expect(w.piles.find(q=>q.id===carryId)).toMatchObject({quantity:5,owner:{type:'ground',...destination}});exactShelfZone(w);
 });
