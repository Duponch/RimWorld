import {expect,test} from 'vitest';
import {medicalCamp,controlledInjury} from './scenarios/health.ts';
import {reorganizationCamp256} from './helpers/group-reorganization-v256.ts';
import {newApparelState,type ApparelItem} from '../src/sim/apparel-rules.ts';
import {validApparelShape} from '../src/sim/apparel-save.ts';
import {validatePileRecordShape} from '../src/sim/material-record-save.ts';
import {markCorpseWornApparel284,validApparelProvenance284,validApparelProvenanceHistoricalTransport284} from '../src/sim/apparel-provenance-284.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {createMedicalRecord,addResolvedInjury,medicalStatus} from '../src/sim/injury-state.ts';
import {BLOOD_UNIT} from '../src/sim/injury-rules.ts';
import {reconcilePawnHealth} from '../src/sim/health.ts';
import {advanceGroupPersonalFrontier} from '../src/sim/group-driver.ts';
import {withWorldGroup} from '../src/sim/world-map-context.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import type {MaterialPile,Pawn,World} from '../src/sim/types.ts';

/** Real small clinical fixture; garments below are prepared by the existing
 * material producer, not a claim of played tailoring or wearing commands. */
function camp(){const w=medicalCamp(2);w.piles=[];w.resources=[];return w;}
function garment(w:World,p:Pawn,item:ApparelItem,owner:MaterialPile['owner']={type:'apparel',pawnId:p.id}){
 const id=w.nextId;addMaterial(w,'apparel',1,owner,item);const pile=w.piles.find(q=>q.id===id);if(!pile?.apparel)throw Error('Missing original new garment');return pile;
}
const record=(v:unknown)=>v as Record<string,unknown>;

test('only a documented284 birth has a clean proof, including the existing actual material producer',()=>{
 expect(newApparelState('cloth-shirt').corpseWear284).toBe(false);
 for(const version of [63,90,256,279,283,285])expect(Object.hasOwn(newApparelState('cloth-shirt',undefined,version),'corpseWear284'),`version ${version}`).toBe(false);
 const w=camp(),p=w.pawns[0]!,id=w.nextId,rng=w.rng;
 const born=garment(w,p,'cloth-shirt');expect(born.id).toBe(id);expect(born.apparel!.corpseWear284).toBe(false);expect(w.rng).toBe(rng);expect(w.nextId).toBe(id+1);
 // Prepared historical World version, never a serializer writing an old save.
 const old=structuredClone(w);Object.defineProperty(old,'schemaVersion',{value:283,enumerable:true,writable:true,configurable:true});old.piles=[];
 const oldBorn=garment(old,old.pawns[0]!,'cloth-shirt');expect(Object.hasOwn(oldBorn.apparel!,'corpseWear284')).toBe(false);
});

test('the field guard rejects old/future, own undefined, accessors, inherited and nonenumerable proofs without reading a getter',()=>{
 const w=camp(),piece=garment(w,w.pawns[0]!,'cloth-shirt'),apparel=piece.apparel!;
 expect(validApparelProvenance284(apparel,284)).toBe(true);expect(validApparelShape(record(piece),284)).toBe(true);
 for(const version of [283,285]){expect(validApparelProvenance284(apparel,version)).toBe(false);expect(validApparelShape(record(piece),version)).toBe(false);}
 for(const value of [undefined,null,0,'false']){const a={...apparel,corpseWear284:value};expect(validApparelProvenance284(a,284)).toBe(false);expect(validApparelShape({...record(piece),apparel:a},284)).toBe(false);}
 let reads=0;const accessor={...apparel};Object.defineProperty(accessor,'corpseWear284',{enumerable:true,get(){reads++;return false;}});
 expect(validApparelProvenance284(accessor,284)).toBe(false);expect(validApparelShape({...record(piece),apparel:accessor},284)).toBe(false);expect(reads).toBe(0);
 const hidden={...apparel};Object.defineProperty(hidden,'corpseWear284',{value:false,enumerable:false});expect(validApparelProvenance284(hidden,284)).toBe(false);
 const inherited=Object.assign(Object.create({corpseWear284:false}),{quality:'normal',hitPoints:100,material:'cloth'});expect(validApparelProvenance284(inherited,284)).toBe(false);
 const unknown={...apparel};delete unknown.corpseWear284;expect(validApparelProvenance284(unknown,284)).toBe(true);expect(validApparelProvenance284(unknown,283)).toBe(true);expect(validApparelProvenance284(unknown,285)).toBe(false);
});

test('historical RAW and projection fences refuse future provenance before migration without mutating the actual World',()=>{
 const w=camp(),piece=garment(w,w.pawns[0]!,'cloth-shirt');delete piece.apparel!.corpseWear284;
 const before=JSON.stringify(w),rng=w.rng;expect(validApparelProvenanceHistoricalTransport284(w,283)).toBe(true);
 for(const value of [false,true,undefined]){
  const bad=structuredClone(w);Object.defineProperty(bad.piles[0]!.apparel!,'corpseWear284',{value,enumerable:true});
  expect(validApparelProvenanceHistoricalTransport284(bad,283)).toBe(false);
  expect(validApparelProvenanceHistoricalTransport284({world:w,piles:bad.piles},283)).toBe(false);
 }
 expect(validApparelProvenanceHistoricalTransport284(w,285)).toBe(false);expect(validApparelProvenanceHistoricalTransport284(w,284)).toBe(true);
 expect(JSON.stringify(w)).toBe(before);expect(w.rng).toBe(rng);expect(Object.hasOwn(piece.apparel!,'corpseWear284')).toBe(false);
});

test('the real map death event marks original textiles, helmet and plate armor but leaves inventory, floor and another wearer alone',()=>{
 const w=camp(),p=w.pawns[0]!,other=w.pawns[1]!;
 const worn=[garment(w,p,'cloth-shirt'),garment(w,p,'steel-plate-armor'),garment(w,p,'steel-simple-helmet')];
 delete worn[0]!.apparel!.corpseWear284; // Unknown can become known tainted at a new actual death.
 const cargo=garment(w,p,'cloth-parka',{type:'inventory',pawnId:p.id}),floor=garment(w,p,'cloth-pants',{type:'ground',x:p.x,z:p.z}),otherShirt=garment(w,other,'cloth-shirt');
 const conditions=worn.map(q=>({id:q.id,quality:q.apparel!.quality,hp:q.apparel!.hitPoints}));
 controlledInjury(w,p,'heart',15000);expect(p.state).toBe('dead');expect(p.health?.death).toBeDefined();
 for(const q of worn){expect(w.piles.find(i=>i.id===q.id)).toBe(q);expect(q.apparel!.corpseWear284).toBe(true);}
 expect(worn.map(q=>({id:q.id,quality:q.apparel!.quality,hp:q.apparel!.hitPoints}))).toEqual(conditions);
 for(const q of [cargo,floor,otherShirt])expect(q.apparel!.corpseWear284).toBe(false);
 const rng=w.rng,next=w.nextId,once=JSON.stringify(w);reconcilePawnHealth(w,p);markCorpseWornApparel284(w.piles,p,284);
 expect(w.rng).toBe(rng);expect(w.nextId).toBe(next);expect(JSON.stringify(w)).toBe(once);
});

test('downing, existing historical deaths and normal ownership transfers never mint or clear a provenance proof',()=>{
 const w=camp(),p=w.pawns[0]!,piece=garment(w,p,'cloth-shirt');delete piece.apparel!.corpseWear284;
 controlledInjury(w,p,'left-leg',30000);controlledInjury(w,p,'right-leg',30000);expect(p.state).toBe('downed');expect(Object.hasOwn(piece.apparel!,'corpseWear284')).toBe(false);
 controlledInjury(w,p,'heart',15000);expect(piece.apparel!.corpseWear284).toBe(true);
 for(const owner of [{type:'ground',x:p.x,z:p.z},{type:'inventory',pawnId:w.pawns[1]!.id},{type:'apparel',pawnId:w.pawns[1]!.id}] as const){piece.owner=owner;expect(piece.apparel!.corpseWear284).toBe(true);}
 const legacy=structuredClone(piece);legacy.owner={type:'apparel',pawnId:p.id};delete legacy.apparel!.corpseWear284;const before=JSON.stringify(legacy);markCorpseWornApparel284([legacy],p,283);expect(JSON.stringify(legacy)).toBe(before);
});

test('unknown, clean and corpse-worn physical items retain their distinct states through a whole current save and reload',()=>{
 const w=camp(),p=w.pawns[0]!,a=garment(w,p,'cloth-shirt',{type:'ground',x:p.x,z:p.z}),b=garment(w,p,'cloth-pants',{type:'ground',x:p.x+1,z:p.z}),c=garment(w,p,'cloth-parka',{type:'ground',x:p.x,z:p.z+1});
 delete a.apparel!.corpseWear284;c.apparel!.corpseWear284=true;
 const before=JSON.stringify(w),rng=w.rng;expect(validateWorld(w)).toEqual([]);const loaded=deserializeWorld(serializeWorld(w));expect(loaded).toEqual(w);
 expect(Object.hasOwn(loaded.piles.find(q=>q.id===a.id)!.apparel!,'corpseWear284')).toBe(false);expect(loaded.piles.find(q=>q.id===b.id)!.apparel!.corpseWear284).toBe(false);expect(loaded.piles.find(q=>q.id===c.id)!.apparel!.corpseWear284).toBe(true);
 expect(JSON.stringify(w)).toBe(before);expect(w.rng).toBe(rng);
});

test('reward-holder apparel is admitted only by the284 shape, independently of real custody authority',()=>{
 const w=camp(),piece=garment(w,w.pawns[0]!,'cloth-shirt'),held={...piece,owner:{type:'trade-request284',requestId:1,optionId:1}};
 expect(validApparelShape(record(held),284)).toBe(true);expect(validApparelShape(record(held),283)).toBe(false);expect(validApparelShape(record(held),285)).toBe(false);
 // This shape test does not install a fake quest holder or assert owner validity.
});

test.each(['flak-vest','flak-helmet','recon-helmet'] as const)('%s has current284 RAW inventory custody without opening historical283 or future285',item=>{
 const w=camp(),piece=garment(w,w.pawns[0]!,item,{type:'inventory',pawnId:w.pawns[0]!.id});
 expect(validApparelShape(record(piece),284)).toBe(true);
 expect(validatePileRecordShape(record(piece),w,284)).toEqual([]);
 const raw=JSON.parse(JSON.stringify(piece)) as Record<string,unknown>;
 expect(validApparelShape(raw,284)).toBe(true);expect(validatePileRecordShape(raw,w,284)).toEqual([]);
 // Remove the new provenance field so283 is refused for inventory custody,
 // independently of the historical future-field fence.
 const historical={...raw,apparel:{...piece.apparel!}};delete historical.apparel.corpseWear284;
 expect(validApparelShape(historical,283)).toBe(false);expect(validatePileRecordShape(historical,w,283)).toContain('Invalid apparel state for schema.');
 expect(validApparelShape(raw,285)).toBe(false);expect(validApparelShape(historical,285)).toBe(false);
 const ground={...historical,owner:{type:'ground',x:w.pawns[0]!.x,z:w.pawns[0]!.z}};
 expect(validApparelShape(ground,283)).toBe(true);
});

/** Prepared actual registered away owners from the existing shared fixture.
 * Only their clinical frontier advances; this is not a played geographic trip. */
function bleeding(p:Pawn,tick:number){p.health=createMedicalRecord(tick);addResolvedInjury(p.health,'right-hand','cut',6000,()=>.999999);p.health.bloodLoss=BLOOD_UNIT-1;p.medicalCare='none';const status=medicalStatus(p.health);p.state=status==='mobile'?'idle':status;}
test('caravan death taints before the real strip redistributes that same garment to a surviving inventory',()=>{
 const {w,g,members}=reorganizationCamp256(),victim=members[0]!,survivor=members[1]!;
 const shirt=g.items.find(q=>q.owner.type==='apparel'&&q.owner.pawnId===victim.id);if(!shirt?.apparel)throw Error('Actual original worn shirt missing');
 expect(shirt.apparel.corpseWear284).toBe(false);const id=shirt.id;bleeding(victim,w.tick);
 for(let i=0;i<6&&!victim.health!.death;i++){w.tick++;withWorldGroup(w,g.id,view=>advanceGroupPersonalFrontier(view));}
 expect(victim.health!.death).toBeDefined();const transferred=g.items.find(q=>q.id===id);expect(transferred?.owner).toEqual({type:'inventory',pawnId:survivor.id});expect(transferred?.apparel?.corpseWear284).toBe(true);
 expect(w.worldGroups!.losses.find(l=>l.pawn.id===victim.id)?.items.some(q=>q.id===id)).toBe(false);
});

test('after the last caravan death, all terminal owners together retain each original tainted garment exactly once',()=>{
 const {w,g,members}=reorganizationCamp256(),ids=members.map(p=>{const piece=g.items.find(q=>q.owner.type==='apparel'&&q.owner.pawnId===p.id);if(!piece?.apparel)throw Error('Actual original worn shirt missing');bleeding(p,w.tick);return {pawnId:p.id,id:piece.id};});
 for(let i=0;i<6&&members.some(p=>!p.health!.death);i++){w.tick++;withWorldGroup(w,g.id,view=>advanceGroupPersonalFrontier(view));}
 const losses=w.worldGroups!.losses.filter(l=>ids.some(row=>row.pawnId===l.pawn.id));
 expect(losses).toHaveLength(members.length);for(const loss of losses)expect(loss.pawn.health?.death).toBeDefined();
 // Clinical frontiers can kill one person first. The real strip may move
 // that already-tainted shirt to the later victim's inventory before death.
 const originals=new Set(ids.map(row=>row.id)),held=losses.flatMap(loss=>loss.items.map(piece=>({loss,piece}))).filter(row=>originals.has(row.piece.id));
 expect(held).toHaveLength(ids.length);expect(new Set(held.map(row=>row.piece.id))).toEqual(originals);
 for(const row of ids){const matches=held.filter(entry=>entry.piece.id===row.id);expect(matches).toHaveLength(1);const {loss,piece}=matches[0]!;expect(piece.apparel?.corpseWear284).toBe(true);expect(piece.owner.type==='apparel'||piece.owner.type==='inventory').toBe(true);expect('pawnId'in piece.owner&&piece.owner.pawnId).toBe(loss.pawn.id);}
});
