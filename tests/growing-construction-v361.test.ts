import {expect,test} from 'vitest';
import {applyCommand,buildConstructionCellIndex,canDesignate,stepWorld} from '../src/sim/engine.ts';
import {addGroundMaterial,reservedSource} from '../src/sim/materials.ts';
import {serializeWorld,deserializeWorld} from '../src/sim/serialization.ts';
import {damagePile,pileMaxHp} from '../src/sim/thing-damage.ts';
import {shelfZoneCamp,shelfZone,acceptShelfZone,validShelfZone,untilShelfZone,exactShelfZone} from './scenarios/shelf-zone-v361.ts';
import type {Cell,Command,MaterialPile,World} from '../src/sim/types.ts';

// Prepared empty camps. Intentions are discovered by ordinary ticks, and every
// carried item below comes from the actual clear-sow/haul order and pickup.
const small=(cell:Cell)=>({type:'designate',kind:'small-shelf',...cell,orientation:0,material:'wood'} as const);
function reject(w:World,c:Command):void {
 const before=serializeWorld(w);expect(applyCommand(w,c).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
}
function field(w:World,from:Cell,to:Cell=from){
 acceptShelfZone(w,{type:'area',action:'growing',from,to});
 untilShelfZone(w,()=>w.jobs.some(j=>j.kind==='sow'&&j.x===from.x&&j.z===from.z),30);
 return w.growingZones.find(z=>z.cells.includes(from.z*w.width+from.x))!;
}
function replay(w:World,n=2):void {
 exactShelfZone(w);const copy=deserializeWorld(serializeWorld(w));stepWorld(w,n);stepWorld(copy,n);expect(copy).toEqual(w);validShelfZone(w);
}
function clearSowScene(){
 const w=shelfZoneCamp(1,16),p=w.pawns[0]!,source={x:3,z:2};p.priorities.build=0;Object.assign(p,{x:2,z:2});
 const sourceId=w.nextId;addGroundMaterial(w,'food',6,source,'rice');const zone=field(w,source),job=w.jobs.find(j=>j.kind==='sow'&&j.x===source.x&&j.z===source.z)!;
 acceptShelfZone(w,{type:'priority',pawnId:p.id,work:'grow',value:1});
 acceptShelfZone(w,{type:'order-haul',pawnId:p.id,target:{type:'clear-sow',jobId:job.id},queue:false});
 expect(p.haul?.destination).toMatchObject({type:'aside',growingZoneId:zone.id,sowCell:source});
 untilShelfZone(w,()=>p.haul?.phase==='deliver'&&p.moveCooldown===0,30);
 const cargo=w.piles.find(q=>q.id===p.haul!.carryPileId)!;expect(cargo).toMatchObject({item:'rice',quantity:6,owner:{type:'pawn',pawnId:p.id}});
 expect(w.piles.some(q=>q.id===sourceId)).toBe(false);expect(p.motion?.end??0).toBeLessThanOrEqual(w.tick);
 const destination=p.haul!.destination;if(destination.type!=='aside')throw new Error('Expected physical sow clearance');
 return {w,p,source,sourceId,zoneId:zone.id,jobId:job.id,cargo,destination:{x:destination.x,z:destination.z}};
}
function custody(p:MaterialPile){return {id:p.id,item:p.item,quantity:p.quantity,owner:structuredClone(p.owner)};}

test('V361 no-zone construction retires actual active and queued sowing claims while preserving uncovered zone policy and objects',()=>{
 const w=shelfZoneCamp(),p=w.pawns[0]!;p.priorities.build=0;const target={x:9,z:10},zone=field(w,target,{x:10,z:10}),policy=structuredClone(zone);
 const active=w.jobs.find(j=>j.kind==='sow'&&j.x===9&&j.z===10)!,queued=w.jobs.find(j=>j.kind==='sow'&&j.x===10&&j.z===10)!;
 acceptShelfZone(w,{type:'priority',pawnId:p.id,work:'grow',value:1});
 acceptShelfZone(w,{type:'order-job',pawnId:p.id,jobId:active.id,queue:false});
 acceptShelfZone(w,{type:'order-job',pawnId:p.id,jobId:queued.id,queue:true});
 untilShelfZone(w,()=>p.jobId===active.id&&active.progress>0,100);expect(p.orders.active).toBe(active.id);expect(p.orders.queue).toContain(queued.id);
 expect(active.reservedBy).toBe(p.id);expect(queued.reservedBy).toBe(p.id);exactShelfZone(w);
 const beforePiles=structuredClone(w.piles),next=w.nextId,rng=w.rng;acceptShelfZone(w,small(target));
 expect(w.growingZones).toEqual([{...policy,cells:policy.cells.filter(c=>c!==target.z*w.width+target.x)}]);
 expect(w.jobs.some(j=>j.id===active.id||j.id===queued.id)).toBe(false);expect(p.jobId).toBeNull();expect(p.orders).toEqual({active:null,queue:[]});
 expect(w.jobs.find(j=>j.kind==='small-shelf')).toMatchObject({construction:'blueprint',escrow:{wood:0,food:0}});
 expect(w.piles).toEqual(beforePiles);expect(w.nextId).toBe(next+1);expect(w.rng).toBe(rng);replay(w);
});

test('V361 direct and indexed wall previews agree for actual sow/plant intents; conduit preserves the zone and genuine blueprints still block',()=>{
 const w=shelfZoneCamp(),p=w.pawns[0]!;p.priorities.build=0;const target={x:3,z:4},zone=field(w,target),job=structuredClone(w.jobs.find(j=>j.kind==='sow')!);
 const wall={type:'designate',kind:'wall',...target,orientation:0,material:'wood'} as const;
 const before=serializeWorld(w);expect(canDesignate(w,wall)).toEqual({ok:true});expect(canDesignate(w,wall,false,buildConstructionCellIndex(w,'wall'))).toEqual({ok:true});expect(serializeWorld(w)).toBe(before);
 const conduit={type:'designate',kind:'power-conduit',...target,orientation:0,material:'steel'} as const;
 expect(canDesignate(w,conduit,false,buildConstructionCellIndex(w,'power-conduit'))).toEqual(canDesignate(w,conduit));
 const beforeZone=structuredClone(zone);acceptShelfZone(w,conduit);expect(w.growingZones).toEqual([beforeZone]);expect(w.jobs.find(j=>j.id===job.id)).toEqual(job);exactShelfZone(w);
 const plants=shelfZoneCamp();plants.pawns[0]!.priorities.build=0;plants.resources.push({id:plants.nextId++,kind:'tree',amount:20,x:6,z:6});
 acceptShelfZone(plants,{type:'designate',kind:'chop',x:6,z:6});const plantWall={...wall,x:6,z:6};
 expect(canDesignate(plants,plantWall)).toEqual({ok:true});expect(canDesignate(plants,plantWall,false,buildConstructionCellIndex(plants,'wall'))).toEqual({ok:true});exactShelfZone(plants);
 const blocked=shelfZoneCamp();blocked.pawns[0]!.priorities.build=0;field(blocked,target);acceptShelfZone(blocked,wall);
 const manual=structuredClone(blocked.jobs.find(j=>j.kind==='wall')!);expect(canDesignate(blocked,wall,false,buildConstructionCellIndex(blocked,'wall'))).toEqual(canDesignate(blocked,wall));
 reject(blocked,small(target));expect(blocked.jobs.find(j=>j.id===manual.id)).toEqual(manual);exactShelfZone(blocked);
});

test('V361 true stationary clear-sow cargo refuses zone retirement without any drop cell, then a physically destroyed wood blocker permits the same cargo',()=>{
 const {w,p,source,zoneId,jobId,cargo,destination}=clearSowScene(),beforeCargo=custody(cargo);
 addGroundMaterial(w,'food',69,destination,'rice');
 for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)if(x!==destination.x||z!==destination.z)addGroundMaterial(w,'wood',75,{x,z},'wood');
 validShelfZone(w);expect(canDesignate(w,small(source))).toEqual({ok:true});reject(w,small(source));expect(custody(cargo)).toEqual(beforeCargo);expect(w.growingZones.some(z=>z.id===zoneId)).toBe(true);expect(w.jobs.some(j=>j.id===jobId)).toBe(true);exactShelfZone(w);
 const blocker=w.piles.find(q=>q.owner.type==='ground'&&q.owner.x===p.x&&q.owner.z===p.z)!;expect(blocker.item).toBe('wood');expect(damagePile(w,blocker,pileMaxHp(blocker),'bomb')).toBe(true);validShelfZone(w);
 const next=w.nextId,rng=w.rng;acceptShelfZone(w,small(source));expect(w.piles.find(q=>q.id===cargo.id)).toMatchObject({id:cargo.id,item:'rice',quantity:6,owner:{type:'ground',x:p.x,z:p.z}});
 expect(p.haul).toBeNull();expect(p.orders.active).toBeNull();expect(w.growingZones.some(z=>z.id===zoneId)).toBe(false);expect(w.jobs.some(j=>j.id===jobId)).toBe(false);expect(w.nextId).toBe(next+1);expect(w.rng).toBe(rng);exactShelfZone(w);
});

test('V361 captured clear-sow travel refuses retirement atomically; after genuine delivery the same source admits a shelf',()=>{
 const {w,p,source,zoneId,cargo,destination}=clearSowScene();untilShelfZone(w,()=>p.haul?.phase==='deliver'&&(p.motion?.end??0)>w.tick,30);
 const edge=structuredClone(p.motion),before=custody(cargo);reject(w,small(source));expect(p.motion).toEqual(edge);expect(custody(cargo)).toEqual(before);exactShelfZone(w);
 untilShelfZone(w,()=>p.haul===null,100);expect(w.piles.find(q=>q.id===cargo.id)).toMatchObject({item:'rice',quantity:6,owner:{type:'ground',...destination}});
 const delivered=custody(w.piles.find(q=>q.id===cargo.id)!);acceptShelfZone(w,small(source));expect(w.growingZones.some(z=>z.id===zoneId)).toBe(false);expect(custody(w.piles.find(q=>q.id===cargo.id)!)).toEqual(delivered);replay(w);
});

test('V361 retirement of another growing zone leaves a real independent captured haul and its custody untouched',()=>{
 const w=shelfZoneCamp(2),p=w.pawns[1]!,target={x:17,z:18};for(const actor of w.pawns)actor.priorities.build=0;
 Object.assign(p,{x:2,z:2});field(w,target);shelfZone(w,{x:24,z:24});const sourceId=w.nextId;addGroundMaterial(w,'food',6,{x:3,z:2},'rice');
 acceptShelfZone(w,{type:'priority',pawnId:p.id,work:'haul',value:1});acceptShelfZone(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:sourceId},queue:false});
 untilShelfZone(w,()=>p.haul?.phase==='deliver'&&(p.motion?.end??0)>w.tick,60);const haul=structuredClone(p.haul),edge=structuredClone(p.motion),cargo=w.piles.find(q=>q.id===p.haul!.carryPileId)!,owned=custody(cargo),reserved=reservedSource(w,sourceId);
 acceptShelfZone(w,small(target));expect(p.haul).toEqual(haul);expect(p.motion).toEqual(edge);expect(custody(cargo)).toEqual(owned);expect(reservedSource(w,sourceId)).toBe(reserved);expect(w.stockpiles).toHaveLength(1);exactShelfZone(w);
 untilShelfZone(w,()=>p.haul===null,400);expect(w.piles.find(q=>q.id===cargo.id)).toMatchObject({item:'rice',quantity:6,owner:{type:'ground',x:24,z:24}});exactShelfZone(w);
});
