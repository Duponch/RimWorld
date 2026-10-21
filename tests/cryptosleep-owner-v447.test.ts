import {expect,test} from 'vitest';
import {medicalCamp} from './scenarios/health';
import {legacyHumanAge} from '../src/sim/human-age';
import {createMedicalRecord} from '../src/sim/injury-state';
import {newWeaponState} from '../src/sim/equipment-rules';
import {newApparelState} from '../src/sim/apparel-rules';
import {newCryptosleepHolder271,type PlayerCasket271} from '../src/sim/cryptosleep-state-271';
import {validateCryptosleepOwners271,registerCryptosleepThingIds271,validCryptosleepBuilding271} from '../src/sim/cryptosleep-owner-save-271';

/** Owner-boundary fixture: original adult, bed, gear and inventory are prepared.
 * This does not claim paid construction, research or completion of entry. */
function contained(){
 const w=medicalCamp(2);Object.assign(w,{schemaVersion:271});
 const p=w.pawns.shift()!;
 Object.assign(p,{x:11,z:10,state:'idle',jobId:null,haul:null,cooking:null,need:null,path:[],moveCooldown:0,age:legacyHumanAge(),health:createMedicalRecord(w.tick),cryptosleepHeldAt271:w.tick,restZeroTicks:0,collapsePending:false});
 delete p.motion;delete p.background;delete p.traits;
 p.orders.active=null;p.orders.queue=[];p.recreation.task=null;
 const bed={id:w.nextId++,kind:'double-bed' as const,x:5,z:5,orientation:0 as const,footprint:'standard' as const,material:'wood' as const,quality:'normal' as const};
 w.structures.push(bed);p.bedId=bed.id;p.bedSlot=0;
 const c:PlayerCasket271={id:w.nextId++,kind:'cryptosleep-casket',x:10,z:10,orientation:0,footprint:'standard',material:'steel',cryptosleep:newCryptosleepHolder271(w.tick)};
 c.cryptosleep.human=p;
 c.cryptosleep.items=[
  {id:w.nextId++,kind:'wood',item:'wood',quantity:5,owner:{type:'inventory',pawnId:p.id}},
  {id:w.nextId++,kind:'weapon',item:'steel-longsword',quantity:1,owner:{type:'equipment',pawnId:p.id},weapon:newWeaponState('steel-longsword')},
  {id:w.nextId++,kind:'apparel',item:'cloth-shirt',quantity:1,owner:{type:'apparel',pawnId:p.id},apparel:newApparelState('cloth-shirt')},
 ];
 c.cryptosleep.packed=[{building:{id:w.nextId++,kind:'bed',x:7,z:8,orientation:0,footprint:'standard',material:'wood',quality:'normal'},owner:{type:'inventory',pawnId:p.id}}];
 w.structures.push(c);return {w,p,c,bed};
}

test('held owner keeps the original bed, personal gear and packed inventory; registration preserves every identity',()=>{
 const {w,p,c,bed}=contained(),before=structuredClone(w),originals=[p,...c.cryptosleep.items,c.cryptosleep.packed[0]!.building];
 expect(validateCryptosleepOwners271(w)).toEqual([]);
 const ids=new Set(w.structures.map(s=>s.id));expect(registerCryptosleepThingIds271(w,ids)).toEqual([]);
 for(const original of originals)expect(ids.has(original.id)).toBe(true);
 expect(p.bedId).toBe(bed.id);expect(p.bedSlot).toBe(0);expect(c.cryptosleep.human).toBe(p);expect(w).toEqual(before);
 expect(registerCryptosleepThingIds271(w,ids)).not.toEqual([]);
});

test('closed owner rejects active cargo, duplicate originals, wrong clinical marker and malformed possessions without repairs',()=>{
 const mutations=[
  ({p}:ReturnType<typeof contained>)=>{p.cryptosleepHeldAt271!--;},
  ({p}:ReturnType<typeof contained>)=>{p.health!.tick--;},
  ({p}:ReturnType<typeof contained>)=>{p.path=[{x:p.x+1,z:p.z}];},
  ({w,p}:ReturnType<typeof contained>)=>{w.pawns.push(p);},
  ({c}:ReturnType<typeof contained>)=>{c.cryptosleep.items.push(c.cryptosleep.items[0]!);},
  ({c}:ReturnType<typeof contained>)=>{c.cryptosleep.items[0]!.owner={type:'pawn',pawnId:c.cryptosleep.human!.id};},
  ({c}:ReturnType<typeof contained>)=>{c.cryptosleep.items[1]!.weapon!.hitPoints=100000;},
  ({c}:ReturnType<typeof contained>)=>{c.cryptosleep.packed[0]!.owner={type:'ground',x:1,z:1};},
  ({c}:ReturnType<typeof contained>)=>{c.cryptosleep.packed[0]!.building.id=c.cryptosleep.items[0]!.id;},
 ];
 for(const mutate of mutations){const fixture=contained();mutate(fixture);const before=structuredClone(fixture.w);expect(validateCryptosleepOwners271(fixture.w).length).toBeGreaterThan(0);expect(fixture.w).toEqual(before);}
 const {w,c}=contained();let reads=0;Object.defineProperty(c.cryptosleep.human!,'name',{enumerable:true,get(){reads++;return 'Hidden';}});
 expect(validateCryptosleepOwners271(w).length).toBeGreaterThan(0);expect(reads).toBe(0);
});

test('building header admits only the paid fixed definition and rejects future fields before reading accessors',()=>{
 const {w,c}=contained();expect(validCryptosleepBuilding271(c,271,w,w.tick)).toBe(true);expect(validCryptosleepBuilding271(c,272,w,w.tick)).toBe(true);expect(validCryptosleepBuilding271(c,277,w,w.tick)).toBe(false);
 expect(validCryptosleepBuilding271(c,270,w,w.tick)).toBe(false);
 for(const extra of [{power:{}},{fuel:{}},{quality:'normal'},{material:'wood'},{footprint:'legacy-single'},{damage:250},{factionId:undefined}])expect(validCryptosleepBuilding271({...c,...extra},271,w,w.tick)).toBe(false);
 let reads=0;const raw={...c};Object.defineProperty(raw,'material',{enumerable:true,get(){reads++;return 'steel';}});
 expect(validCryptosleepBuilding271(raw,271,w,w.tick)).toBe(false);expect(reads).toBe(0);
});

test('registrar reuses the actual captured namespace without reading geographic resources and still refuses their identity collisions',()=>{
 const {w,c}=contained(),resource={id:w.nextId++,kind:'rock' as const,x:1,z:1,amount:30,stone:'granite' as const};
 w.resources.push(resource);
 const ids=new Set([...w.pawns,...w.piles,...w.packed.map(p=>p.building),...w.structures,...w.resources,...w.jobs,...w.stockpiles].map(p=>p.id));
 const resources=w.resources;let reads=0;Object.defineProperty(w,'resources',{enumerable:true,configurable:true,get(){reads++;return resources;}});
 expect(validateCryptosleepOwners271(w,w.schemaVersion,ids)).toEqual([]);expect(reads).toBe(0);
 const originalId=c.cryptosleep.items[0]!.id;c.cryptosleep.items[0]!.id=resource.id;
 expect(registerCryptosleepThingIds271(w,new Set(ids)).length).toBeGreaterThan(0);expect(reads).toBe(0);
 c.cryptosleep.items[0]!.id=originalId;const registered=new Set(ids);expect(registerCryptosleepThingIds271(w,registered)).toEqual([]);expect(reads).toBe(0);
 expect(registered.has(resource.id)).toBe(true);expect(registered.has(originalId)).toBe(true);
});
