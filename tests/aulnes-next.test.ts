import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeStoredSave} from '../src/ui/save-storage-codec.ts';
import {expect,test} from 'vitest';
import {loadAulnesV381,prepareAulnesTuquesNext,aulnesNextWool,AULNES_NEXT_START} from '../scripts/aulnes-tuques-next.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';

test('Aulnes V381 derivative adds only a finite wool bill, preserving Ada, inherited goods and permissions',async()=>{
  const {world:source}=await loadAulnesV381(),before=serializeWorld(source),{world,preparation:p}=prepareAulnesTuquesNext(source);
  expect(world.tick).toBe(AULNES_NEXT_START);expect(p.freeWool).toBeGreaterThanOrEqual(40);
  expect(world.nextId).toBe(source.nextId+1);expect(serializeWorld(source)).toBe(before);
  expect(world.pawns.map(p=>p.id)).toEqual(source.pawns.map(p=>p.id));
  expect(world.pawns.find(p=>p.id===19869)!.cooking).toEqual(source.pawns.find(p=>p.id===19869)!.cooking);
  expect(world.piles).toEqual(source.piles);expect(world.stockpiles).toEqual(source.stockpiles);expect(world.apparelPolicies).toEqual(source.apparelPolicies);
  const bill=world.structures.find(s=>s.id===p.benchId)!.bills![0]!;
  expect(bill).toMatchObject({id:p.billId,recipe:'tuque',mode:'times',target:2,suspended:false,filters:{cloth:false,'muffalo-wool':true},radius:32,destination:'stockpile'});
  expect(world.structures.find(s=>s.id===20987)).toEqual(source.structures.find(s=>s.id===20987));
  expect(p.storageCandidateIds).toHaveLength(2);expect(validateWorld(world)).toEqual([]);
  const raw=serializeWorld(world);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
  const decoded=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(world,0,0,true)));
  expect(decoded.status).toBe('applied');if(decoded.status==='applied')expect(serializeWorld(decoded.world)).toBe(raw);
  expect(()=>prepareAulnesTuquesNext(world)).toThrow(/single-use/);
},120000);

test('Aulnes derivative refuses insufficient unreserved wool atomically rather than taking Ada cargo or foreign stock',async()=>{
  const {world:source}=await loadAulnesV381();
  // Explicit adversarial preparation: remove only FREE ground units; preserve
  // Ada's placed/held/source reservations and every foreign inventory.
  for(const free of aulnesNextWool(source)){
    const pile=source.piles.find(p=>p.id===free.id)!;
    if(free.reserved)pile.quantity=free.reserved;else source.piles=source.piles.filter(p=>p.id!==free.id);
  }
  refreshStock(source);expect(validateWorld(source)).toEqual([]);const before=serializeWorld(source);
  expect(()=>prepareAulnesTuquesNext(source)).toThrow(/40 free colonial ground wool/);expect(serializeWorld(source)).toBe(before);
},120000);

// The played artifact, not a second simulation or a regenerated estate.
test('V386 published Aulnes preserves its literal played state and both historical archives',async()=>{
  const raw=await decodeStoredSave(readFileSync('public/test-saves/v386/les-aulnes-integrees.json','utf8'));
  const sha=createHash('sha256').update(raw).digest('hex');
  expect(sha).toBe('dfd9302647b4d1cabaa8760a150209c6804a788f48a0b0596660318b4d1707ee');
  const world=deserializeWorld(raw);expect(world.tick).toBe(10373);expect(validateWorld(world)).toEqual([]);
  expect(world.pawns).toHaveLength(15);expect(world.wildlife!.animals.filter(a=>a.domestic)).toHaveLength(9);
  expect(world.piles.find(p=>p.id===28063)).toMatchObject({item:'muffalo-wool-tuque',quantity:1,owner:{type:'ground',x:139,z:149},apparel:{quality:'normal'}});
  expect(world.structures.find(s=>s.id===20988)!.bills!.find(b=>b.id===26682)).toMatchObject({recipe:'tuque',target:1,filters:{cloth:false,'muffalo-wool':true}});
  expect(world.pawns.find(p=>p.id===20352)!.cooking).toMatchObject({recipe:'tuque',phase:'gather'});
  const manifest=JSON.parse(readFileSync('public/test-saves/manifest.json','utf8'));
  expect(manifest.saves.find((e:{release:string})=>e.release==='v386')).toMatchObject({tick:10373,sha256:sha});
  expect(manifest.saves.find((e:{id:string})=>e.id==='aulnes-integrated-v381')).toMatchObject({release:'v381',sha256:'c95c7b6e99a21f521f8fe533a8b4664e758e6dd20fcdeeebf2da3f88531cced8'});
  expect(manifest.saves.find((e:{id:string})=>e.id==='aulnes-integrated-v284')).toMatchObject({release:'v284'});
  expect(serializeWorld(deserializeWorld(serializeWorld(world)))).toBe(serializeWorld(world));
},120000);
