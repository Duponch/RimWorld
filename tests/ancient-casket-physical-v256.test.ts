import {expect,test} from 'vitest';
import {medicalCamp} from './scenarios/health.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ancientCasketCells256,ANCIENT_CASKET_PHYSICS_256,validAncientCasketBuilding256,validateAncientCasketPhysical256} from '../src/sim/ancient-casket-physical-256.ts';
import {ancientCasketInteraction256,type AncientCasket256} from '../src/sim/ancient-casket-state-256.ts';
import {validAncientCasketOpenCommand256} from '../src/sim/ancient-casket-command-256.ts';
import {validateAncientOpeningOwners256} from '../src/sim/ancient-casket-opening-256.ts';
import {footprintCells,footprintContains} from '../src/sim/definitions.ts';
import {buildingSupportNeed256} from '../src/sim/bridge-rules.ts';
import {FURNITURE_TRAVEL,canStandAt} from '../src/sim/furniture-travel.ts';
import {structureMaxHp} from '../src/sim/thing-damage-rules.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import {reservedServiceCells} from '../src/sim/service-reservations.ts';
import {releaseWork} from '../src/sim/work-release.ts';
import {validFilthFeet,validateFilth} from '../src/sim/filth-save.ts';
import {addFilth,FILTH_DEFINITIONS} from '../src/sim/filth.ts';
import {filthBeauty} from '../src/sim/room-beauty.ts';
import {refreshStock} from '../src/sim/materials.ts';
import type {World} from '../src/sim/types.ts';

/** Declared prepared fixture on a real existing gameplay map. No Ancient
 * producer, Planet, factory, illness or chronicle is invented. Optional held
 * human is the second ORIGINAL colonist, removed once from the actual map. */
function prepared(holdHuman=false){
 const w=medicalCamp(holdHuman?2:1),opener=w.pawns[0]!;w.structures=[];w.jobs=[];w.piles=[];w.packed=[];delete w.fires;
 Object.assign(opener,{x:11,z:10,state:'idle',path:[],moveCooldown:0,planCooldown:0});delete opener.motion;
 const c:AncientCasket256={id:w.nextId++,kind:'ancient-cryptosleep-casket',x:10,z:10,orientation:0,footprint:'standard',factionId:null,casket:{revision:1,heldAt:w.tick,groupId:-1,contentsKnown:true,humans:[],animals:[],items:[]}};
 const gold={id:w.nextId++,kind:'gold' as const,item:'gold' as const,quantity:10,owner:{type:'ancient-casket' as const,casketId:c.id}};c.casket.items.push(gold);
 const held=holdHuman?w.pawns.pop()!:undefined;if(held){held.path=[];held.moveCooldown=0;held.state='idle';delete held.motion;delete held.health;c.casket.humans.push(held);}
 w.structures.push(c);refreshStock(w);return {w,c,opener,gold,held};
}
test('fixed actual Def has oriented two cells, Medium support,250HP and no stand/Stuff/quality/packed alias',()=>{
 const {w,c}=prepared();expect(ANCIENT_CASKET_PHYSICS_256.ingredients).toEqual([{item:'steel',quantity:180},{item:'uranium',quantity:5}]);
 for(const orientation of [0,1,2,3] as const){c.orientation=orientation;const cells=ancientCasketCells256(c,orientation);expect(footprintCells(c)).toEqual(cells);expect(cells).toHaveLength(2);expect(cells.every(x=>footprintContains(c,x))).toBe(true);expect(cells.some(x=>{const p=ancientCasketInteraction256(c);return x.x===p.x&&x.z===p.z;})).toBe(false);}
 c.orientation=0;expect(buildingSupportNeed256(c)).toBe('Medium');expect(structureMaxHp(c)).toBe(250);expect(FURNITURE_TRAVEL[c.kind]).toEqual({delay:4.2,stand:false,repeat:true});expect(canStandAt(w,c)).toBe(false);
 for(const extra of [{material:'steel'},{quality:'normal'},{damage:250},{footprint:'legacy-single'}])expect(validAncientCasketBuilding256({...c,...extra},256,w,w.tick)).toBe(false);
 w.packed.push({building:c,owner:{type:'ground',x:3,z:3}});expect(validateAncientCasketPhysical256(w).length).toBeGreaterThan(0);
});
test('Medium rejects a real bridge at either occupied cell; old255 rejects every casket',()=>{
 const {w,c}=prepared();expect(validateAncientCasketPhysical256(w)).toEqual([]);const i=(c.z+1)*w.width+c.x,old=w.tiles[i]!;w.tiles[i]={terrain:'marsh',bridge:true};expect(validateAncientCasketPhysical256(w).length).toBeGreaterThan(0);w.tiles[i]=old;
 expect(validAncientCasketBuilding256(c,255,w,w.tick)).toBe(false);expect(validAncientCasketBuilding256({...c,casket:undefined},256,w,w.tick)).toBe(false);
});
test('real command reserves target+interaction cell, refuses competing opener atomically, clear-orders releases',()=>{
 const {w,c,opener}=prepared(true),other=c.casket.humans.pop()!;w.pawns.push(other);Object.assign(other,{x:12,z:10});
 expect(applyCommand(w,{type:'order-open-casket',pawnId:opener.id,casketId:c.id}).ok).toBe(true);expect(reservedServiceCells(w,other.id).has(opener.z*w.width+opener.x)).toBe(true);
 const before=serializeWorld(w);expect(applyCommand(w,{type:'order-open-casket',pawnId:other.id,casketId:c.id}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
 expect(applyCommand(w,{type:'clear-orders',pawnId:opener.id}).ok).toBe(true);expect(opener.openCasket).toBeUndefined();expect(reservedServiceCells(w,other.id).has(opener.z*w.width+opener.x)).toBe(false);
});
test('engine pays300Core at true contact, saves halfway, same original item leaves only once',()=>{
 const {w,c,opener,gold}=prepared();expect(validateWorld(w)).toEqual([]);
 expect(applyCommand(w,{type:'order-open-casket',pawnId:opener.id,casketId:c.id}).ok).toBe(true);stepWorld(w);for(let n=0;n<15;n++)stepWorld(w);
 expect(opener.openCasket?.progressCore).toBe(150);expect(c.casket.items[0]).toBe(gold);expect(w.piles.some(p=>p.id===gold.id)).toBe(false);
 const raw=serializeWorld(w),loaded=deserializeWorld(raw);expect(serializeWorld(loaded)).toBe(raw);for(let n=0;n<15;n++){stepWorld(w);stepWorld(loaded);}
 expect(opener.openCasket).toBeUndefined();expect(c.casket.items).toEqual([]);expect(w.piles.find(p=>p.id===gold.id)).toBe(gold);expect(gold.owner.type).toBe('ground');expect(validateWorld(w)).toEqual([]);expect(serializeWorld(loaded)).toBe(serializeWorld(w));
});
test('suspended ORIGINAL colonist receives unique canonical illness and carried Slime at actual release clock',()=>{
 const {w,c,opener,held}=prepared(true);const old=held!;expect(applyCommand(w,{type:'order-open-casket',pawnId:opener.id,casketId:c.id}).ok).toBe(true);
 for(let n=0;n<31;n++)stepWorld(w);expect(w.pawns.find(p=>p.id===old.id)).toBe(old);expect(c.casket.humans).toEqual([]);expect(old.health?.cryptosleepSickness).toBeDefined();expect(old.health?.tick).toBe(w.tick);expect(old.filthFeet?.carried.find(f=>f.kind==='slime')).toEqual({kind:'slime',thickness:1});expect(validateFilth(w,256)).toEqual([]);expect(validateWorld(w)).toEqual([]);
});
test('real approach captures a movement edge and grants zero work before settled contact',()=>{
 const {w,c,opener}=prepared();opener.x=4;expect(applyCommand(w,{type:'order-open-casket',pawnId:opener.id,casketId:c.id}).ok).toBe(true);expect(opener.path.length).toBeGreaterThan(0);
 stepWorld(w);expect(opener.motion).toBeDefined();expect(opener.openCasket?.phase).toBe('approach');expect(opener.openCasket?.progressCore).toBe(0);
 let attempts=0;while(opener.openCasket?.phase==='approach'&&attempts++<120){if((opener.motion?.end??0)>w.tick)expect(opener.openCasket?.progressCore).toBe(0);stepWorld(w);}
 expect(opener.openCasket?.phase).toBe('opening');expect(opener.openCasket?.progressCore).toBe(0);expect(opener.moveCooldown).toBe(0);expect(opener).toMatchObject(ancientCasketInteraction256(c));
});
test('contact loss and ordinary task release keep all cargo and retire only the opening intent',()=>{
 const {w,c,opener,gold}=prepared();expect(applyCommand(w,{type:'order-open-casket',pawnId:opener.id,casketId:c.id}).ok).toBe(true);stepWorld(w);stepWorld(w);expect(opener.openCasket?.progressCore).toBe(10);
 opener.x++;expect(validateAncientOpeningOwners256(w).length).toBeGreaterThan(0);stepWorld(w);expect(opener.openCasket).toBeUndefined();expect(c.casket.items[0]).toBe(gold);expect(w.piles).toEqual([]);
 Object.assign(opener,{x:11,z:10});expect(applyCommand(w,{type:'order-open-casket',pawnId:opener.id,casketId:c.id}).ok).toBe(true);expect(releaseWork(w,opener)).toBe(true);expect(opener.openCasket).toBeUndefined();
});
test('Slime uses real filth owner/lifetime/cleaning stats and remains strictly future255 in map and feet',()=>{
 const {w}=prepared();expect(FILTH_DEFINITIONS.slime).toMatchObject({cleanliness:-5,work:70,minDays:35,maxDays:40,rain:true});expect(filthBeauty({kind:'slime'})).toBe(-25);expect(addFilth(w,{x:4,z:4},'slime')).toBe(true);expect(validateFilth(w,256)).toEqual([]);expect(validateFilth(w,255).length).toBeGreaterThan(0);
 const feet={carried:[{kind:'slime',thickness:1}]};expect(validFilthFeet(feet,256)).toBe(true);expect(validFilthFeet(feet,255)).toBe(false);const old={...w};Object.defineProperty(old,'schemaVersion',{value:255,enumerable:true,configurable:true,writable:true});expect(addFilth(old,{x:5,z:4},'slime')).toBe(false);
});
test('full/delta carry original holder and opening task, mutation at same tick observed; old checkpoint refuses without adoption',()=>{
 const {w,c,opener}=prepared(),enc=new SnapshotEncoder(),dec=new SnapshotDecoder();const first=dec.adopt(structuredClone(enc.encode(w,0,0)));expect(first.status,JSON.stringify(first)).toBe('applied');
 expect(applyCommand(w,{type:'order-open-casket',pawnId:opener.id,casketId:c.id}).ok).toBe(true);const delta=dec.adopt(structuredClone(enc.encode(w,0,0)));expect(delta.status,JSON.stringify(delta)).toBe('applied');if(delta.status!=='applied')throw Error('Actual delta refused');expect(delta.world.pawns.find(p=>p.id===opener.id)?.openCasket).toEqual(opener.openCasket);
 const checkpoint=structuredClone(enc.encode(w,0,0,true));if(checkpoint.kind!=='checkpoint')throw Error('Expected real checkpoint');const sourceBefore=serializeWorld(w),previous=JSON.stringify(delta.world);Object.defineProperty(checkpoint.world,'schemaVersion',{value:255,enumerable:true,configurable:true,writable:true});expect(dec.adopt(checkpoint).status).toBe('resync');expect(JSON.stringify(delta.world)).toBe(previous);expect(serializeWorld(w)).toBe(sourceBefore);
});
test('commands/accessors and unsupported destructive effects refuse before mutation/RNG/nextId',()=>{
 const {w,c,opener}=prepared();let reads=0;const bad={type:'order-open-casket',pawnId:opener.id,get casketId(){reads++;return c.id;}};expect(validAncientCasketOpenCommand256(bad,256,w.nextId)).toBe(false);expect(reads).toBe(0);expect(validAncientCasketOpenCommand256({type:'order-open-casket',pawnId:opener.id,casketId:c.id},255,w.nextId)).toBe(false);
 const before=serializeWorld(w);expect(damageStructure(w,c,300,'bullet')).toBe(false);expect(serializeWorld(w)).toBe(before);expect(applyCommand(w,{type:'designate',kind:'uninstall',x:c.x,z:c.z,targetId:c.id}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
});
