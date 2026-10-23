import {beforeAll,expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {registeredMap,registeredMapId,flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {newCryptosleepHolder271,type PlayerCasket271} from '../src/sim/cryptosleep-state-271.ts';
import {newShipCasketHolder277,type ShipCasket277} from '../src/sim/ship-casket-state-277.ts';
import {planCryptosleepRemoval271} from '../src/sim/cryptosleep-removal-271.ts';
import {planShipCasketRemoval277} from '../src/sim/ship-casket-removal-277.ts';
import {captureLinkedStorageOwners286} from '../src/sim/linked-storage-owners-286.ts';
import {cloneLinkedShelfPolicy286} from '../src/sim/linked-storage-policy-286.ts';
import {newShelfStorage} from '../src/sim/shelf-storage.ts';
import {releaseWork} from '../src/sim/work-release.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {constructionRecipe} from '../src/sim/construction-materials.ts';
import {canStandAt} from '../src/sim/furniture-travel.ts';
import {terrainSupportsAffordance256} from '../src/sim/natural-terrain-runtime-256.ts';
import type {PackedFurniture} from '../src/sim/furniture-rules.ts';
import type {CampaignState} from '../src/sim/world-map-state.ts';
import type {Cell,Pawn,Structure,World} from '../src/sim/types.ts';

const source='tmp/test-runs/caravan-owners-v414-departure-expiry01-2026-10-17T19-08-08.417Z-26072/artifacts/caravan-owners-v259/actual259-paused2905-before-abandon-refusal.json';
let baseline:string;
beforeAll(()=>{
 const raw=readFileSync(source,'utf8');expect(createHash('sha256').update(raw).digest('hex')).toBe('5ff387667bb3933d4b3957c65dd9516c4c3470e13d3c888b2a917878f9778525');
 // Acquire the old campaign once through its real strict migration, then use
 // exact current reloads for fixtures. structuredClone loses geography brands.
 baseline=serializeCampaign(deserializeCampaign(raw));
},120_000);
type Kind='player'|'ship';
type Held={kind:Kind;map:World;pawn:Pawn;casket:PlayerCasket271|ShipCasket277;packed:PackedFurniture[];shelf:Structure};

function supportedPlace(map:World,kind:Kind):Cell {
 const occupied=new Set([...map.structures.flatMap(footprintCells),...map.jobs.flatMap(footprintCells),...map.resources,...map.piles.flatMap(p=>p.owner.type==='ground'?[p.owner]:[]),...map.packed.flatMap(p=>p.owner.type==='ground'?[p.owner]:[]),...map.stockpiles].map(c=>c.z*map.width+c.x));
 for(let z=1;z<map.height-4;z++)for(let x=1;x<map.width-4;x++){
  const cells=Array.from({length:16},(_,i)=>({x:x+i%4,z:z+Math.floor(i/4)}));
  if(cells.every(c=>!occupied.has(c.z*map.width+c.x)&&canStandAt(map,c)&&terrainSupportsAffordance256(map.tiles[c.z*map.width+c.x]!,kind==='ship'?'Heavy':'Medium',map)))return {x:x+1,z:z+2};
 }
 throw Error('No actual supported casket fixture floor');
}
/** Recovered caskets and original occupants/goods explicitly prepared at the
 * owner boundary on the acquired two maps. No paid construction, travel or
 * closing service is claimed. The Vanish transaction under test is real. */
function hold(map:World,pawnId:number,kind:Kind,priority:number):Held {
 const pawn=map.pawns.find(p=>p.id===pawnId);if(!pawn)throw Error('Acquired original human missing');
 const cell=supportedPlace(map,kind);if(!releaseWork(map,pawn))throw Error('Original work cargo cannot release');delete pawn.motion;pawn.path=[];pawn.moveCooldown=0;
 const items=map.piles.filter(p=>'pawnId'in p.owner&&p.owner.pawnId===pawn.id&&['inventory','equipment','apparel'].includes(p.owner.type));
 const packed=map.packed.filter(p=>p.owner.type==='inventory'&&p.owner.pawnId===pawn.id);
 const shelf:Structure={id:map.nextId++,kind:'small-shelf',...cell,orientation:0,footprint:'standard',material:'wood',shelf:newShelfStorage([map.nextId++])};shelf.shelf!.settings.priority=priority;
 packed.push({building:shelf,owner:{type:'inventory',pawnId:pawn.id}});
 let casket:PlayerCasket271|ShipCasket277;
 if(kind==='player'){
  pawn.cryptosleepHeldAt271=map.tick;
  casket={id:map.nextId++,kind:'cryptosleep-casket',...cell,orientation:0,footprint:'standard',material:'steel',cryptosleep:{...newCryptosleepHolder271(map.tick),human:pawn,items,packed}};
 }else{
  pawn.shipCryptosleepHeldAt277=map.tick;
  casket={id:map.nextId++,kind:'ship-cryptosleep-casket',...cell,orientation:2,footprint:'standard',material:'steel',power:{on:false,parentId:null},shipCryptosleep277:{...newShipCasketHolder277(map.tick),occupant:{kind:'human',pawn},items,packed}};
 }
 map.pawns=map.pawns.filter(p=>p!==pawn);map.piles=map.piles.filter(p=>!items.includes(p));map.packed=map.packed.filter(p=>!packed.includes(p));map.structures.push(casket);refreshStock(map);flushRegisteredMap(map);
 return {kind,map,pawn,casket,packed,shelf};
}
function fixture(kind:Kind='player'){
 const root=deserializeCampaign(baseline),home=registeredMap(root,0)!,camp=registeredMap(root,1)!;
 if(!home||!camp)throw Error('Acquired original maps missing');
 const a=hold(home,8,kind,3),b=hold(camp,9,kind==='player'?'ship':'player',5),policy=cloneLinkedShelfPolicy286(a.shelf.shelf!.settings);
 root.linkedStorage286={revision:1,nextId:2,groups:[{id:1,originMapId:registeredMapId(home)!,name:'Meubles conservés',settings:policy,memberIds:[a.shelf.id,b.shelf.id]}]};
 for(const held of [a,b]){const independent=cloneLinkedShelfPolicy286(held.shelf.shelf!.settings);held.shelf.shelf!.settings=cloneLinkedShelfPolicy286(policy);held.shelf.shelf!.linked286={revision:1,groupId:1,independent};}
 expect(validateWorld(root)).toEqual([]);return {root,a,b};
}
function plan(held:Held){const result=held.kind==='player'?planCryptosleepRemoval271(held.map,held.casket,'vanish'):planShipCasketRemoval277(held.map,held.casket,'vanish');expect(result.ok,result.ok?'':result.reason).toBe(true);if(!result.ok)throw Error(result.reason);return result;}
function exact(root:CampaignState){expect(validateWorld(root)).toEqual([]);const text=serializeCampaign(root);expect(serializeCampaign(deserializeCampaign(text))).toBe(text);}
function expectedPackedLoss(held:Held){return {count:(held.map.destroyed?.count??0)+held.packed.length,wood:(held.map.destroyed?.lost.wood??0)+held.packed.reduce((sum,pack)=>sum+constructionRecipe(pack.building).ingredients.filter(c=>c.item==='wood').reduce((n,c)=>n+c.quantity,0),0)};}
function checkPackedLoss(held:Held,expected:ReturnType<typeof expectedPackedLoss>){expect(held.map.destroyed?.count).toBe(expected.count);expect(held.map.destroyed?.lost.wood).toBe(expected.wood);if(held.map.destroyed?.items)expect(Object.keys(held.map.destroyed.items).length).toBeGreaterThan(0);}

test.each(['player','ship'] as const)('%s Vanish dissolves the pair in a second real casket without restoring its hidden policy or invalidating suspension',kind=>{
 const {root,a,b}=fixture(kind),otherPawn=JSON.stringify(b.pawn),otherCellIds=[...b.shelf.shelf!.cells],otherPacks=b.packed,clock=[root.tick,root.rng,root.nextId],loss=expectedPackedLoss(a);
 expect(b.shelf.shelf!.linked286!.independent.priority).toBe(5);expect(b.shelf.shelf!.settings.priority).toBe(3);
 const removal=plan(a);expect(removal.commit()).toBe(true);checkPackedLoss(a,loss);flushRegisteredMap(a.map);
 const row=root.worldPawns!.owners.find(r=>r.actor.id===a.pawn.id)!;expect(row.actor).toBe(a.pawn);expect(row.destroyed).toBe(true);expect(row.actor.health?.death).toBeUndefined();expect(row.packed).toEqual([]);
 expect(a.map.structures.includes(a.casket)).toBe(false);expect(b.map.structures.includes(b.casket)).toBe(true);expect(b.packed).toBe(otherPacks);expect(b.packed.find(p=>p.building===b.shelf)).toBeDefined();
 expect(root.linkedStorage286).toEqual({revision:1,nextId:2,groups:[]});expect(Object.hasOwn(b.shelf.shelf!,'linked286')).toBe(false);expect(b.shelf.shelf!.settings.priority).toBe(3);expect(b.shelf.shelf!.cells).toEqual(otherCellIds);
 expect(JSON.stringify(b.pawn)).toBe(otherPawn);expect([root.tick,root.rng,root.nextId]).toEqual(clock);expect(captureLinkedStorageOwners286(root).byId.has(a.shelf.id)).toBe(false);
 const after=serializeCampaign(root);expect(removal.commit()).toBe(false);expect(serializeCampaign(root)).toBe(after);exact(root);
},120_000);

test('two linked shelves destroyed in the same actual holder retire together without a false singleton in an abandoned object',()=>{
 const {root,a,b}=fixture();
 const moved=b.packed.find(p=>p.building===b.shelf)!;b.packed.splice(b.packed.indexOf(moved),1);moved.owner={type:'inventory',pawnId:a.pawn.id};a.packed.push(moved);
 expect(validateWorld(root)).toEqual([]);const clocks=[root.tick,root.rng,root.nextId],loss=expectedPackedLoss(a);expect(plan(a).commit()).toBe(true);checkPackedLoss(a,loss);flushRegisteredMap(a.map);
 expect(root.linkedStorage286).toEqual({revision:1,nextId:2,groups:[]});const owners=captureLinkedStorageOwners286(root);expect(owners.byId.has(a.shelf.id)).toBe(false);expect(owners.byId.has(b.shelf.id)).toBe(false);expect([root.tick,root.rng,root.nextId]).toEqual(clocks);exact(root);
},120_000);

test('an immutable last-member shelf in another casket refuses the entire Vanish before any physical or clinical write',()=>{
 const {root,a,b}=fixture('ship');Object.freeze(b.shelf.shelf);const before=serializeCampaign(root),actor=a.pawn,holder=a.casket;
 const result=planShipCasketRemoval277(a.map,a.casket,'vanish');expect(result.ok).toBe(false);expect(serializeCampaign(root)).toBe(before);expect(a.map.structures.includes(holder)).toBe(true);expect(root.worldPawns!.owners.some(r=>r.actor===actor)).toBe(false);expect(b.shelf.shelf!.linked286).toBeDefined();
},120_000);

test('same-value replacement of a remote original after planning invalidates custody before the first casket write',()=>{
 const {root,a,b}=fixture(),removal=plan(a),pack=b.packed.find(p=>p.building===b.shelf)!;pack.building=structuredClone(pack.building);const before=serializeCampaign(root);
 expect(removal.commit()).toBe(false);expect(serializeCampaign(root)).toBe(before);expect(a.map.structures.includes(a.casket)).toBe(true);expect(root.worldPawns!.owners.some(r=>r.actor===a.pawn)).toBe(false);expect(pack.building).not.toBe(b.shelf);
},120_000);

test('a late readonly casket reset field refuses before policy, WorldPawn and suspended ownership change',()=>{
 const {root,a,b}=fixture('ship'),removal=plan(a);Object.defineProperty(a.casket,'shipCryptosleep277',{writable:false});const before=serializeCampaign(root);
 expect(removal.commit()).toBe(false);expect(serializeCampaign(root)).toBe(before);expect(a.map.structures.includes(a.casket)).toBe(true);expect(b.shelf.shelf!.linked286).toBeDefined();expect(root.worldPawns!.owners.some(r=>r.actor===a.pawn)).toBe(false);
},120_000);
