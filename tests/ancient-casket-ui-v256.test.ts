import {expect,test} from 'vitest';
import {medicalCamp} from './scenarios/health.ts';
import {applyCommand} from '../src/sim/engine.ts';
import {serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {queryOrderOptions} from '../src/sim/player-orders.ts';
import {ancientCasketInteraction256,type AncientCasket256} from '../src/sim/ancient-casket-state-256.ts';
import {validAncientCasketOpenCommand256} from '../src/sim/ancient-casket-command-256.ts';
import {ancientCasketParts256} from '../src/render/ancient-casket-parts-256.ts';

// Fixture body below is byte-identical after LF normalization to the existing
// physical casket oracle. It prepares one real map and preserves its original
// actors; it is no Ancient producer, World bootstrap or clinical witness.
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
test('both true occupied cells expose the same cold read-only worker option',()=>{
 const {w,c,opener,gold}=prepared();expect(validateWorld(w)).toEqual([]);const raw=serializeWorld(w),rng=w.rng,nextId=w.nextId;
 for(const cell of footprintCells(c)){
  const option=queryOrderOptions(w,opener.id,cell).find(o=>o.openCasketId===c.id);
  expect(option).toMatchObject({openCasketId:c.id,label:'Ouvrir la capsule ancienne',enabled:true});
  expect(serializeWorld(w)).toBe(raw);expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);expect(w.pawns[0]).toBe(opener);expect(c.casket.items[0]).toBe(gold);
 }
 expect(queryOrderOptions(w,opener.id,{x:3,z:3}).some(o=>o.openCasketId!==undefined)).toBe(false);
});

test('selected menu target dispatches the existing actual task and clear-orders retires it without opening',()=>{
 const {w,c,opener,gold}=prepared(),jobs=[...w.jobs];const option=queryOrderOptions(w,opener.id,c).find(o=>o.openCasketId===c.id);
 expect(option?.enabled).toBe(true);if(option?.openCasketId===undefined)throw Error('Real opening option absent');
 expect(applyCommand(w,{type:'order-open-casket',pawnId:opener.id,casketId:option.openCasketId}).ok).toBe(true);
 expect(opener.openCasket).toEqual({casketId:c.id,phase:'approach',progressCore:0,lastWorkedAt:w.tick});expect(opener.orders.active).toBeNull();expect(w.jobs).toEqual(jobs);
 expect(applyCommand(w,{type:'clear-orders',pawnId:opener.id}).ok).toBe(true);expect(opener.openCasket).toBeUndefined();expect(c.casket.items[0]).toBe(gold);expect(w.piles.some(p=>p.id===gold.id)).toBe(false);expect(validateWorld(w)).toEqual([]);
});

test('queue, mobilized opener and truly empty casket never expose an enabled opening',()=>{
 const {w,c,opener}=prepared(),raw=serializeWorld(w);
 expect(queryOrderOptions(w,opener.id,c,true).find(o=>o.openCasketId===c.id)).toMatchObject({enabled:false,reason:expect.stringContaining('sans mise en file')});expect(serializeWorld(w)).toBe(raw);
 expect(applyCommand(w,{type:'draft',pawnIds:[opener.id],enabled:true}).ok).toBe(true);expect(queryOrderOptions(w,opener.id,c).find(o=>o.openCasketId===c.id)?.enabled).toBe(false);expect(applyCommand(w,{type:'draft',pawnIds:[opener.id],enabled:false}).ok).toBe(true);
 // The only original item is removed from this declared fixture, never copied
 // into a map owner. This is an empty-target admission check, no reward.
 c.casket.items=[];expect(queryOrderOptions(w,opener.id,c).find(o=>o.openCasketId===c.id)?.enabled).toBe(false);
 expect(validAncientCasketOpenCommand256({type:'order-open-casket',pawnId:opener.id,casketId:c.id},255,w.nextId)).toBe(false);
});

test('actual competing opener claim grays the worker option and cancel restores admission',()=>{
 const {w,c,opener}=prepared(true),other=c.casket.humans.pop()!;w.pawns.push(other);Object.assign(other,{x:12,z:10});
 expect(applyCommand(w,{type:'order-open-casket',pawnId:opener.id,casketId:c.id}).ok).toBe(true);const raw=serializeWorld(w);
 expect(queryOrderOptions(w,other.id,c).find(o=>o.openCasketId===c.id)).toMatchObject({enabled:false,reason:expect.stringContaining('réservée')});expect(serializeWorld(w)).toBe(raw);
 expect(applyCommand(w,{type:'clear-orders',pawnId:opener.id}).ok).toBe(true);expect(queryOrderOptions(w,other.id,c).find(o=>o.openCasketId===c.id)?.enabled).toBe(true);
});

test('blocked true interaction cell refuses menu and command with identical source/RNG',()=>{
 const {w,c,opener}=prepared(),cell=ancientCasketInteraction256(c);opener.x=12;w.tiles[cell.z*w.width+cell.x]={terrain:'rock'};const raw=serializeWorld(w);
 expect(queryOrderOptions(w,opener.id,c).find(o=>o.openCasketId===c.id)).toMatchObject({enabled:false,reason:expect.stringContaining('inaccessible')});expect(serializeWorld(w)).toBe(raw);
 expect(applyCommand(w,{type:'order-open-casket',pawnId:opener.id,casketId:c.id}).ok).toBe(false);expect(serializeWorld(w)).toBe(raw);
});

test('an unsupported actual held physical activity is gray, never sanitized or moved by query',()=>{
 // Deliberately invalid held activity: compare data bytes, not a valid RAW
 // export (the true serializer must refuse this unsupported holder).
 const {w,c,opener,held}=prepared(true);held!.path.push({x:held!.x+1,z:held!.z});const raw=JSON.stringify(w),path=held!.path;
 expect(queryOrderOptions(w,opener.id,c).find(o=>o.openCasketId===c.id)).toMatchObject({enabled:false,reason:'Le contenu de cette capsule ne peut pas encore être libéré.'});
 expect(JSON.stringify(w)).toBe(raw);expect(c.casket.humans[0]).toBe(held);expect(held!.path).toBe(path);expect(w.pawns.includes(held!)).toBe(false);
});

test.each([0,1,2,3] as const)('original resident silhouette uses real footprint/id at orientation %i, without revealing contents',orientation=>{
 const {w,c,opener}=prepared();c.orientation=orientation;Object.assign(opener,ancientCasketInteraction256(c));const raw=serializeWorld(w),parts=ancientCasketParts256(w),cells=footprintCells(c);
 expect(parts).toHaveLength(6);expect(parts.every(p=>p.targetId===c.id&&p.key===c.id&&p.ry===orientation*Math.PI/2)).toBe(true);
 expect(parts[0]!.x).toBe((cells[0]!.x+cells[1]!.x)/2);expect(parts[0]!.z).toBe((cells[0]!.z+cells[1]!.z)/2);expect(serializeWorld(w)).toBe(raw);
 c.casket.contentsKnown=false;c.casket.items=[];expect(ancientCasketParts256(w)).toEqual(parts);
});
