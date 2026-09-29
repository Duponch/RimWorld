import {expect,test} from 'vitest';
import {createWorld} from '../src/sim/index.ts';
import {reservedSource,reservedSourcesByPile} from '../src/sim/materials.ts';
import {animalFoods} from '../src/sim/wildlife-food.ts';
import {enableWildlife} from '../src/sim/wildlife.ts';
import {legacyAnimalFoods} from '../scripts/benchmark-wildlife-reservations-v153.ts';

test('batched pile reservations reproduce the independent source oracle for every task and excluded actor',()=>{
  // A synthetic reservation inventory intentionally combines tasks which a
  // worker would not perform simultaneously; it exercises the pure counter.
  const w=createWorld(42,16,16),p=w.pawns[0]!,other=w.pawns[1]!;
  enableWildlife(w,1);
  const a=w.wildlife!.animals[0]!,ids=Array.from({length:16},(_,i)=>9000+i);
  a.meal={kind:'pile',id:ids[0]!,quantity:3,progress:0};
  p.burial={bodyPawnId:1,graveId:2,corpseId:ids[1],phase:'pickup',progress:0};
  p.hunting={animalId:ids[2]!,startedAt:0,phase:'stalk',progress:0};
  p.equipmentTask={itemId:ids[3]!,action:'equip',progress:0};
  p.cooking={stationId:1,billId:1,spot:{x:1,z:1},actionCell:{x:1,z:1},phase:'gather',ingredients:[
    {pileId:ids[4]!,item:'rice',quantity:4,stage:'source',cell:{x:1,z:1}},
    {pileId:ids[5]!,item:'rice',quantity:5,stage:'held',cell:{x:1,z:1}}],progress:0,productId:null,storageId:null};
  p.animalHandling={animalId:1,kind:'tame',sourcePileId:ids[6]!,carryPileId:null,quantity:6,phase:'pickup',step:0,progress:0};
  p.animalCare={animalId:1,spot:{x:1,z:1},phase:'pickup',progress:0,medicine:{item:'herbal-medicine',sourcePileId:ids[7]!,carryPileId:null,quantity:7}};
  p.tend={patientId:other.id,spot:{x:1,z:1},phase:'pickup',progress:0,medicine:{item:'herbal-medicine',sourcePileId:ids[8]!,carryPileId:null,quantity:8}};
  p.feed={patientId:other.id,spot:{x:1,z:1},sourcePileId:ids[9]!,carryPileId:null,quantity:9,phase:'pickup',progress:0};
  p.ward={kind:'food',patientId:other.id,spot:{x:1,z:1},sourcePileId:ids[10]!,carryPileId:null,quantity:10,phase:'pickup'};
  p.haul={sourcePileId:ids[11]!,quantity:11,phase:'pickup',carryPileId:null,destination:{type:'aside',x:1,z:1}};
  p.need={kind:'eat',phase:'pickup',sourcePileId:ids[12]!,carryPileId:null,quantity:12,progress:0,dining:null};
  p.orders.queue.push({sourcePileId:ids[11]!,quantity:13,phase:'pickup',carryPileId:null,destination:{type:'aside',x:2,z:2}});
  p.orders.queue.push({cooking:{stationId:1,billId:1,spot:{x:1,z:1},actionCell:{x:1,z:1},phase:'gather',ingredients:[
    {pileId:ids[12]!,item:'rice',quantity:14,stage:'source',cell:{x:1,z:1}}],progress:0,productId:null,storageId:null}});
  other.orders.queue.push({sourcePileId:ids[13]!,quantity:15,phase:'pickup',carryPileId:null,destination:{type:'aside',x:2,z:2}});
  const before=JSON.stringify(w);
  for(const except of [undefined,p.id,other.id,a.id]){
    const indexed=reservedSourcesByPile(w,except);
    for(const id of [...ids,99999])expect(indexed.get(id)??0,`pile ${id}, except ${except}`).toBe(reservedSource(w,id,except));
  }
  expect(reservedSourcesByPile(w,p.id).get(ids[11]!)).toBe(13); // Own active haul excluded; own queue retained.
  expect(reservedSourcesByPile(w,p.id).get(ids[12]!)).toBe(14); // Own active eating excluded; own cooking queue retained.
  expect(reservedSourcesByPile(w,a.id).get(ids[0]!)??0).toBe(0);
  expect(JSON.stringify(w)).toBe(before);
});

test('ordered food proposals match the frozen pre-index oracle with active and queued claims',()=>{
  const w=createWorld(93,16,16),p=w.pawns[0]!;
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));
  enableWildlife(w,1);const a=w.wildlife!.animals[0]!;a.food=0;
  w.resources=[];w.piles=[];
  for(let i=0;i<12;i++)w.piles.push({id:w.nextId++,kind:'food',item:'rice',quantity:20,owner:{type:'ground',x:2+i,z:2}});
  p.orders.queue.push({sourcePileId:w.piles[0]!.id,quantity:6,phase:'pickup',carryPileId:null,destination:{type:'aside',x:1,z:1}});
  p.haul={sourcePileId:w.piles[0]!.id,quantity:5,phase:'pickup',carryPileId:null,destination:{type:'aside',x:1,z:1}};
  a.meal={kind:'pile',id:w.piles[1]!.id,quantity:7,progress:0};
  const before=JSON.stringify(w);
  expect(animalFoods(w,a)).toEqual(legacyAnimalFoods(w,a));
  expect(animalFoods(w,a).filter(f=>f.kind==='pile')).toHaveLength(12);
  expect(JSON.stringify(w)).toBe(before);
});
