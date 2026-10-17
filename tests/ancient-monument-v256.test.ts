import {validLocalRoadPropPackedBuilding256} from '../src/sim/local-road-props-save-256.ts';
import {expect,test} from 'vitest';
import {ANCIENT_MONUMENT_DEFS_256,ancientMonumentCells256,ancientMonumentMaxHp256,ancientMonumentMaterial256} from '../src/sim/ancient-monument-props-256.ts';
import {validAncientMonumentBuilding256} from '../src/sim/ancient-monument-save-256.ts';
import {damageAncientMonument256,type MonumentDamageThing256} from '../src/sim/ancient-monument-damage-256.ts';
import {resolveMonumentRuin256} from '../src/sim/ancient-monument-ruin-256.ts';
import {CORE_MONUMENT_CATALOGUE_256,monumentCells256} from '../src/sim/ancient-monument-plan-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {structureMaxHp,damageStructure} from '../src/sim/thing-damage.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {buildingSupportNeed256} from '../src/sim/bridge-rules.ts';
import {minifiable} from '../src/sim/furniture-rules.ts';
import {applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld} from '../src/sim/index.ts';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';
import {funeralFixture} from './scenarios/hygiene-ui.ts';
import type {World,Structure} from '../src/sim/types.ts';
function until(w:World,done:()=>boolean,limit=1200){for(let n=0;n<limit&&!done();n++)stepWorld(w);expect(done()).toBe(true);expect(validateWorld(w)).toEqual([]);}
test('five actual definitions retain distinct supports, stuff, HP and minification',()=>{
 expect(ancientMonumentMaxHp256('column','wood')).toBe(104);expect(ancientMonumentMaxHp256('column','granite-blocks')).toBe(270);expect(ancientMonumentMaxHp256('urn','granite-blocks')).toBe(68);expect(ancientMonumentMaxHp256('sarcophagus','wood')).toBe(162);expect(ancientMonumentMaxHp256('stele-grand','granite-blocks')).toBe(680);
 expect(ancientMonumentMaterial256('urn','wood',256)).toBe(false);expect(ancientMonumentMaterial256('stele-large','steel',256)).toBe(false);expect(ancientMonumentMaterial256('column','steel',255)).toBe(false);
 expect(Object.keys(ANCIENT_MONUMENT_DEFS_256).filter(minifiable)).toEqual(['urn']);expect(buildingSupportNeed256({kind:'column',material:'granite-blocks'})).toBe('Light');expect(buildingSupportNeed256({kind:'stele-large',material:'granite-blocks'})).toBe('Medium');expect(buildingSupportNeed256({kind:'stele-grand',material:'granite-blocks'})).toBe('Heavy');
});
test('canonical footprints include exterior repair contact and every rotated sarcophagus cell',()=>{
 expect(ancientMonumentCells256('stele-large',{x:10,z:10})).toEqual([{x:10,z:10},{x:11,z:10},{x:10,z:11},{x:11,z:11}]);expect(ancientMonumentCells256('stele-grand',{x:10,z:10})).toHaveLength(9);
 expect(ancientMonumentCells256('sarcophagus',{x:10,z:10},0)).toEqual([{x:10,z:10},{x:10,z:11}]);expect(ancientMonumentCells256('sarcophagus',{x:10,z:10},1)).toEqual([{x:10,z:10},{x:11,z:10}]);expect(ancientMonumentCells256('sarcophagus',{x:10,z:10},2)).toEqual([{x:10,z:9},{x:10,z:10}]);expect(ancientMonumentCells256('sarcophagus',{x:10,z:10},3)).toEqual([{x:9,z:10},{x:10,z:10}]);
});
test('DamageBuildings acts on drafts only and stops strictly after the destruction fraction',()=>{
 const rows:MonumentDamageThing256[]=Array.from({length:4},(_,z)=>({type:'thing',kind:'wall',x:0,z,hitPoints:100,maxHitPoints:100})),before=structuredClone(rows),calls={integer:0,value:0,float:0},random={integer:()=>{calls.integer++;return 0;},boolean:()=>false,value:()=>{calls.value++;return 0;},float:(min:number)=>{calls.float++;return min;}};
 const result=damageAncientMonument256(rows,{minX:0,maxX:0,minZ:0,maxZ:3},random);expect(result.destroyed).toBe(3);expect(result.buildables).toEqual([rows[0]]);expect(rows).toEqual(before);expect(calls).toEqual({integer:5,value:3,float:1});
});
test('actual resolver retains stream replay and no substituted kind or synthetic owner',()=>{
 const a=new WorldGenerationRandom(750),b=new WorldGenerationRandom(750),rows=resolveMonumentRuin256(14,14,CORE_MONUMENT_CATALOGUE_256,a);expect(resolveMonumentRuin256(14,14,CORE_MONUMENT_CATALOGUE_256,b)).toEqual(rows);expect(a.state).toEqual(b.state);expect(rows.length).toBeGreaterThan(0);
 for(const row of rows)if(row.type==='thing'){expect(['wall','door','table','table-square','column','urn','stele-large','stele-grand','sarcophagus']).toContain(row.kind);expect(row.hitPoints).toBeGreaterThanOrEqual(1);expect(row.hitPoints).toBeLessThanOrEqual(row.maxHitPoints);expect(monumentCells256(row).length).toBeGreaterThan(0);expect(Object.hasOwn(row,'id')).toBe(false);}
 const counter=a.state.counter;expect(()=>resolveMonumentRuin256(14,14,{...CORE_MONUMENT_CATALOGUE_256,stuff:[]},a)).toThrow();expect(a.state.counter).toBe(counter);
});
test('future shapes and descriptors refuse before giving old snapshots or packages a new kind',()=>{
 const b={id:10,kind:'urn',x:10,z:10,orientation:0,footprint:'standard',material:'steel'};expect(validAncientMonumentBuilding256(b,256)).toBe(true);expect(validAncientMonumentBuilding256(b,255)).toBe(false);expect(validAncientMonumentBuilding256({...b,quality:'normal'},256)).toBe(false);expect(validAncientMonumentBuilding256({...b,damage:undefined},256)).toBe(false);
 let reads=0;const getter=Object.defineProperty({...b},'material',{enumerable:true,get(){reads++;return 'steel';}});expect(validAncientMonumentBuilding256(getter,256)).toBe(false);expect(reads).toBe(0);
});
test('an actual urn keeps one original through uninstall, carried save and reinstallation',()=>{
 const w=deconstructionCamp(),urn=fixtureBuilding(w,'urn',14,16) as Structure;urn.material='steel';urn.damage=3;
 expect(applyCommand(w,{type:'designate',kind:'uninstall',x:14,z:16}).ok).toBe(true);until(w,()=>w.packed.length===1);expect(w.packed[0]!.building).toBe(urn);
 expect(applyCommand(w,{type:'install',structureId:urn.id,x:23,z:20,orientation:0}).ok).toBe(true);until(w,()=>w.packed[0]?.owner.type==='pawn');const copy=deserializeWorld(serializeWorld(w));until(w,()=>!w.packed.length);stepWorld(copy,w.tick-copy.tick);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(w.structures.find(s=>s.id===urn.id)).toBe(urn);expect(urn).toMatchObject({material:'steel',damage:3,x:23,z:20});
});
test('grand stele repair reaches its real outside footprint, retaining identity and material',()=>{
 const w=deconstructionCamp(),s=fixtureBuilding(w,'stele-grand',16,16) as Structure;s.material='granite-blocks';s.damage=2;w.home=[16*w.width+16];const p=w.pawns[0]!;Object.assign(p,{x:13,z:16});const stock=structuredClone(w.stock),id=s.id;
 until(w,()=>s.damage===1);expect(footprintCells(s).some(c=>c.x===p.x&&c.z===p.z)).toBe(false);expect(Math.abs(p.x-s.x)+Math.abs(p.z-s.z)).toBeGreaterThanOrEqual(2);const copy=deserializeWorld(serializeWorld(w));until(w,()=>s.damage===undefined);stepWorld(copy,w.tick-copy.tick);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(s.id).toBe(id);expect(s.material).toBe('granite-blocks');expect(w.stock).toEqual(stock);
});
test('empty prepared sarcophagus receives one real body and fatal removal releases the same original',()=>{
 const {w,actor,other,body}=funeralFixture();other.priorities.haul=0;const s=fixtureBuilding(w,'sarcophagus',25,16) as Structure;s.material='steel';s.quality='normal';s.grave={colonists:true,strangers:false};const bodyId=body.id,pileId=body.body!.pileId!;
 expect(applyCommand(w,{type:'order-bury',pawnId:actor.id,bodyPawnId:body.id,graveId:s.id}).ok).toBe(true);until(w,()=>actor.burial?.phase==='carry');const copy=deserializeWorld(serializeWorld(w));until(w,()=>s.grave!.corpseId===pileId);stepWorld(copy,w.tick-copy.tick);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(w.piles.find(p=>p.id===pileId)!.owner).toEqual({type:'grave',graveId:s.id});
 expect(damageStructure(w,s,structureMaxHp(s),'bullet')).toBe(true);expect(w.structures.includes(s)).toBe(false);expect(w.piles.find(p=>p.id===pileId)!.owner.type).toBe('ground');expect(w.pawns.filter(p=>p.id===bodyId)).toHaveLength(1);expect(w.piles.filter(p=>p.humanCorpse?.pawnId===bodyId)).toHaveLength(1);expect(validateWorld(w)).toEqual([]);
});

test('automatic hauling discovers a sarcophagus when it is the only available work',()=>{
 const {w,actor,other,body}=funeralFixture();
 for(const p of [actor,other])for(const k of Object.keys(p.priorities) as (keyof typeof p.priorities)[])p.priorities[k]=0;
 actor.priorities.haul=1;w.jobs=[];w.structures=[];w.stockpiles=[];
 const s=fixtureBuilding(w,'sarcophagus',25,16) as Structure;s.material='steel';s.quality='normal';s.grave={colonists:true,strangers:false};
 expect(actor.orders.active).toBe(null);expect(actor.orders.queue).toEqual([]);expect(actor.burial).toBeUndefined();
 until(w,()=>actor.burial?.phase==='carry');expect(actor.burial!.bodyPawnId).toBe(body.id);
 until(w,()=>s.grave!.corpseId===body.body!.pileId);expect(w.piles.find(p=>p.id===body.body!.pileId)!.owner).toEqual({type:'grave',graveId:s.id});
});
test('neutral ruined tables keep faction and original through minification and strict historical guards',()=>{
 for(const kind of ['table','table-square'] as const){
  const w=deconstructionCamp(),table=fixtureBuilding(w,kind,14,16) as Structure;table.material='steel';table.factionId=null;table.damage=3;
  expect(validLocalRoadPropPackedBuilding256(table,255)).toBe(false);expect(validLocalRoadPropPackedBuilding256(table,256)).toBe(true);
  expect(applyCommand(w,{type:'designate',kind:'uninstall',x:14,z:16}).ok).toBe(true);until(w,()=>w.packed.length===1);expect(w.packed[0]!.building).toBe(table);
  const saved=serializeWorld(w),loaded=deserializeWorld(saved);expect(serializeWorld(loaded)).toBe(saved);
  expect(applyCommand(w,{type:'install',structureId:table.id,x:23,z:20,orientation:0}).ok).toBe(true);until(w,()=>!w.packed.length);expect(w.structures.find(s=>s.id===table.id)).toBe(table);expect(table.factionId).toBe(null);
 }
});
