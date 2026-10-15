import {expect,test} from 'vitest';
import {loadAulnesV284,prepareAulnesV381,AULNES_V381_PARENT_SHA,AULNES_V381_START} from '../scripts/aulnes-workshop-v381.ts';
import {aulnesV381Entry} from '../scripts/update-aulnes-v381.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {storageAt} from '../src/sim/shelf-storage.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';

test('V381 fixed RAW284 derivative conserves residents/property, declares only the bounded workshop inheritance and decodes exactly',async()=>{
  const {world:source}=await loadAulnesV284(),original=serializeWorld(source),{world,preparation:p}=prepareAulnesV381(source);
  expect(p.sourceRawSha256).toBe(AULNES_V381_PARENT_SHA);expect(world.schemaVersion).toBe(SCHEMA_VERSION);expect(world.tick).toBe(AULNES_V381_START);
  expect(serializeWorld(source)).toBe(original);expect(world.pawns.map(p=>p.id)).toEqual(source.pawns.map(p=>p.id));
  expect(world.pawns).toHaveLength(15);expect(world.structures.length).toBe(source.structures.length+2);expect(world.stockpiles).toEqual(source.stockpiles);
  expect(world.wildlife!.animals.map(a=>a.id)).toEqual(source.wildlife!.animals.map(a=>a.id));expect(world.secondarySite).toBeUndefined();
  expect(world.rng).toBe(source.rng);expect(p.declared).toEqual({woodShelves:2,uranium:40,normalReconArmor:1,finishedReconResearch:true});
  expect(p.research.previousPoints).toBe(1720816217);expect(p.research.releasedResearchers).toContain(20322);
  expect(source.pawns.find(p=>p.id===20322)!.research).toBeDefined();expect(world.pawns.find(p=>p.id===20322)!.research).toBeUndefined();
  expect(world.research!.reconArmor).toEqual({points:6000000000,completedAt:AULNES_V381_START});expect(world.research!.project).toBeNull();
  expect(world.piles.filter(item=>p.uraniumPileIds.includes(item.id)).reduce((sum,item)=>sum+item.quantity,0)).toBe(40);
  expect(world.piles.find(item=>item.id===p.armorId)).toMatchObject({item:'recon-armor',quantity:1,owner:{type:'ground'},apparel:{quality:'normal'}});
  expect(world.pawns.find(item=>item.id===p.taoId)!.apparelPolicyId).toBe(p.policyId);expect(world.pawns.find(item=>item.id===p.taoId)!.apparelAutomation).toBe(false);
  expect(world.piles.filter(item=>item.owner.type==='apparel'&&item.owner.pawnId===p.taoId).map(item=>item.id)).toEqual(source.piles.filter(item=>item.owner.type==='apparel'&&item.owner.pawnId===p.taoId).map(item=>item.id));
  const beforeBills=source.structures.find(s=>s.id===p.benchId)!.bills!,afterBills=world.structures.find(s=>s.id===p.benchId)!.bills!;
  expect(afterBills[0]).toMatchObject({id:p.billId,recipe:'make-recon-armor',mode:'times',target:1,destination:'stockpile'});
  expect(afterBills.slice(1)).toEqual(beforeBills);expect(world.piles.filter(p=>p.item==='unfinished-component')).toEqual(source.piles.filter(p=>p.item==='unfinished-component'));
  expect(p.colonialAvailableBefore.plasteel).toBeLessThanOrEqual(180);expect(p.colonialAvailableBefore['advanced-component']).toBeLessThanOrEqual(4);
  for(const id of p.addedShelfIds){const shelf=world.structures.find(s=>s.id===id)!;expect(shelf.shelf!.cells).toHaveLength(2);expect(shelf.shelf!.settings.capacity).toBe(500);expect(storageAt(world,shelf)?.shelfId).toBe(id);}
  expect(validateWorld(world)).toEqual([]);const raw=serializeWorld(world);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
  const adopted=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(world,0,0,true)));
  expect(adopted.status,adopted.status==='resync'?adopted.reason:'').toBe('applied');if(adopted.status==='applied')expect(serializeWorld(adopted.world)).toBe(raw);
  expect(()=>prepareAulnesV381(world)).toThrow(/single-use/);
  const entry=aulnesV381Entry(world,'0'.repeat(64));expect(entry.id).toBe('aulnes-current');expect(entry.release).toBe('v381');expect(entry.provenance).toContain('explicitement préparés');
},120000);
