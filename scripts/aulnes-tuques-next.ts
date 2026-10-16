/** Preparation only, derived from the immutable played V381 checkpoint. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aulnesCommand,aulnesHash} from './aulnes-workshop-v381.ts';
import {decodeStoredSave} from '../src/ui/save-storage-codec.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {reservedSource} from '../src/sim/materials.ts';
import {storageCells,storageCellAccepts} from '../src/sim/shelf-storage.ts';
import {groundCapacity} from '../src/sim/ground-placement.ts';
import {clothingUnlocked} from '../src/sim/research.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';

export const AULNES_NEXT_SOURCE='public/test-saves/v381/les-aulnes-integrees.json';
export const AULNES_NEXT_PARENT_SHA='c95c7b6e99a21f521f8fe533a8b4664e758e6dd20fcdeeebf2da3f88531cced8';
export const AULNES_NEXT_START=8794;
export const AULNES_NEXT_RECIPIENTS=[19871,20337] as const;
export async function loadAulnesV381(){
  const stored=readFileSync(AULNES_NEXT_SOURCE,'utf8'),raw=await decodeStoredSave(stored);
  assert.equal(aulnesHash(raw),AULNES_NEXT_PARENT_SHA,'Immutable V381 parent changed.');
  const header=JSON.parse(raw);assert.equal(header.schemaVersion,242);assert.equal(header.tick,AULNES_NEXT_START);
  // The existing strict migration chain validates242 before any neutral bump.
  const world=deserializeWorld(raw);assert.equal(world.schemaVersion,246);
  return {world,storedHash:aulnesHash(stored)};
}
export function aulnesNextWool(world:World){
  const bench=world.structures.find(s=>s.id===20988)!;
  return world.piles.flatMap(p=>{
    if(p.item!=='muffalo-wool'||p.owner.type!=='ground'||(p.owner.x-bench.x)**2+(p.owner.z-bench.z)**2>32**2)return [];
    const reserved=reservedSource(world,p.id);
    return [{id:p.id,quantity:p.quantity,reserved,free:Math.max(0,p.quantity-reserved)}];
  });
}
const plannerNeutral=(world:World)=>world.pawns.map(p=>{const copy=structuredClone(p);delete (copy as Partial<typeof copy>).planCooldown;return copy;});
export function prepareAulnesTuquesNext(source:World){
  assert.equal(SCHEMA_VERSION,246);assert.equal(source.schemaVersion,246);
  assert.deepEqual([source.width,source.height,source.tick],[250,250,AULNES_NEXT_START]);
  assert.deepEqual(validateWorld(source),[]);assert.ok(clothingUnlocked(source));
  const original=serializeWorld(source),manual=source.structures.find(s=>s.id===20988&&s.kind==='tailor-bench');
  assert.ok(manual?.bills&&manual.bills.length===0,'This manual workshop preparation is single-use.');
  assert.equal(source.pawns.find(p=>p.id===19869&&p.name==='Ada')?.cooking?.recipe,'shirt');
  assert.ok(!source.piles.some(p=>p.item==='cloth-tuque'||p.item==='muffalo-wool-tuque'||p.item==='unfinished-tuque'));
  for(const id of AULNES_NEXT_RECIPIENTS){const p=source.pawns.find(p=>p.id===id);assert.ok(p&&p.state!=='dead'&&!p.prisoner);
    assert.ok(!source.piles.some(a=>a.owner.type==='apparel'&&a.owner.pawnId===id&&(/helmet|tuque/.test(a.item))));}
  const wool=aulnesNextWool(source),freeWool=wool.reduce((n,p)=>n+p.free,0);
  assert.ok(freeWool>=40,`Two tuques require40 free colonial ground wool in radius32; found${freeWool}. No inherited reservation may be cancelled.`);
  const storage=storageCells(source).filter(s=>storageCellAccepts(source,s,'muffalo-wool-tuque')&&groundCapacity(source,s,'muffalo-wool-tuque')>=1);
  assert.ok(storage.length>=2,'Two compatible existing free storage cells are required without changing inherited permissions.');
  const world=structuredClone(source);
  aulnesCommand(world,{type:'bill-add',structureId:manual.id,recipe:'tuque'});
  const bench=world.structures.find(s=>s.id===manual.id)!,bill=bench.bills!.at(-1)!;
  aulnesCommand(world,{type:'bill-update',structureId:bench.id,billId:bill.id,settings:{mode:'times',target:2,suspended:false,filters:{cloth:false,'muffalo-wool':true},radius:32,destination:'stockpile'}});
  assert.equal(world.tick,source.tick);assert.equal(world.rng,source.rng);
  assert.equal(world.nextId,source.nextId+1);assert.deepEqual(plannerNeutral(world),plannerNeutral(source));
  for(const key of ['piles','jobs','resources','stockpiles','apparelPolicies','research','wildlife','roofing','secondarySite'] as const)assert.deepEqual(world[key],source[key]);
  for(const s of source.structures)if(s.id!==manual.id)assert.deepEqual(world.structures.find(t=>t.id===s.id),s);
  assert.equal(serializeWorld(source),original);assert.deepEqual(validateWorld(world),[]);
  return {world,preparation:{preparedAt:world.tick,parentRawSha256:AULNES_NEXT_PARENT_SHA,benchId:bench.id,billId:bill.id,
    wool,freeWool,storageCandidateIds:storage.slice(0,2).map(s=>s.id),intendedManualRecipients:[...AULNES_NEXT_RECIPIENTS],
    declared:'Only a finite two-tuque wool bill is added by ordinary commands. No material, research, work, garment, permission or wearing is granted.'}};
}
