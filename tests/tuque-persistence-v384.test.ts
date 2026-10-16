import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {SCHEMA_VERSION,type MaterialPile,type World} from '../src/sim/types.ts';
import {comfortableTemperature} from '../src/sim/heat-rules.ts';
import {APPAREL,apparelDuration,apparelInsulation,newApparelState} from '../src/sim/apparel-rules.ts';
import {validApparelShape} from '../src/sim/apparel-save.ts';
import {validTuqueCatalogueTransport,validTuqueCatalogueDomains} from '../src/sim/tuque-catalogue-save.ts';
import {commercialItemMassGrams} from '../src/sim/commercial-mass.ts';
import {newCookingBill,validBillSettings} from '../src/sim/cooking-bills.ts';
import {productionResearchUnlocked} from '../src/sim/machining.ts';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {preparedCassandraExpedition} from './scenarios/secondary-incidents-v379.ts';
import {tuqueWorkshopV384} from './scenarios/tuque-v384.ts';
const until=(w:World,done:()=>boolean)=>{for(let i=0;i<700&&!done();i++)stepWorld(w);expect(done()).toBe(true);};
const historical=(w:World)=>{w.apparelPolicies=w.apparelPolicies!.map(p=>({...p,allowedItems:p.allowedItems.filter(i=>!i.endsWith('-tuque'))}));(w as {schemaVersion:number}).schemaVersion=244;return w;};

test('new permissions and20-unit bill are prospective, research gated and versioned without touching old durations',()=>{
  const {world:w}=tuqueWorkshopV384();
  expect(w.apparelPolicies!.every(p=>p.allowedItems.includes('cloth-tuque')&&p.allowedItems.includes('muffalo-wool-tuque'))).toBe(true);
  expect(productionResearchUnlocked(w,'tuque')).toBe(true);delete w.research!.completedAt;expect(productionResearchUnlocked(w,'tuque')).toBe(false);
  const bill=newCookingBill(w.nextId++,'tuque');expect(bill.filters).toEqual({cloth:true,'muffalo-wool':true});expect(validBillSettings(bill,'tuque',244)).toBe(false);expect(validBillSettings(bill,'tuque',245)).toBe(true);
  expect(APPAREL['cloth-shirt'].equipTicks).toBe(9);expect(APPAREL['flak-helmet'].equipTicks).toBe(9);expect(APPAREL['recon-helmet'].equipTicks).toBe(12);
  for(const item of ['cloth-tuque','muffalo-wool-tuque'] as const){expect(commercialItemMassGrams(item,245)).toBe(70);expect(commercialItemMassGrams(item,244)).toBeUndefined();}
});

test('physical helmet replacement and removal keep captured14/5 ticks, ground identity, checkpoint and same-tick delta',()=>{
  const {world:w,pawnId}=tuqueWorkshopV384(),pawn=w.pawns.find(p=>p.id===pawnId)!;
  const tuque:MaterialPile={id:w.nextId++,kind:'apparel',item:'muffalo-wool-tuque',quantity:1,owner:{type:'apparel',pawnId},apparel:newApparelState('muffalo-wool-tuque')};w.piles.push(tuque);
  addGroundMaterial(w,'apparel',1,{x:12,z:10},'flak-helmet');const helmet=w.piles.at(-1)!;
  expect(apparelInsulation(tuque)).toEqual({cold:14,heat:0});expect(comfortableTemperature(w,pawn)).toEqual({min:2,max:26});expect(apparelDuration(w,pawn,helmet,'wear')).toBe(14);
  expect(applyCommand(w,{type:'order-equipment',pawnId,itemId:helmet.id,action:'wear',queue:false}).ok).toBe(true);expect(pawn.equipmentTask!.duration).toBe(14);
  until(w,()=>!!pawn.equipmentTask?.progress);expect(helmet.owner.type).toBe('ground');expect(tuque.owner.type).toBe('apparel');
  const resumed=deserializeWorld(serializeWorld(w)),start=w.tick;until(w,()=>helmet.owner.type==='apparel');stepWorld(resumed,w.tick-start);expect(serializeWorld(resumed)).toBe(serializeWorld(w));expect(tuque.owner.type).toBe('ground');
  expect(applyCommand(w,{type:'order-equipment',pawnId,itemId:tuque.id,action:'wear',queue:false}).ok).toBe(true);expect(pawn.equipmentTask!.duration).toBe(14);until(w,()=>tuque.owner.type==='apparel');expect(helmet.owner.type).toBe('ground');
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();expect(decoder.adopt(structuredClone(encoder.encode(w,0,0))).status).toBe('applied');
  expect(applyCommand(w,{type:'order-equipment',pawnId,itemId:tuque.id,action:'remove',queue:false}).ok).toBe(true);expect(pawn.equipmentTask!.duration).toBe(5);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);const adopted=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(adopted.status).toBe('applied');if(adopted.status!=='applied')throw Error('Expected dressing delta');expect(adopted.world.pawns.find(p=>p.id===pawnId)!.equipmentTask).toEqual(pawn.equipmentTask);
  until(w,()=>tuque.owner.type==='ground');expect(tuque.id).toBe(w.piles.find(p=>p.id===tuque.id)!.id);expect(tuque.apparel!.material).toBe('muffalo-wool');expect(validateWorld(w)).toEqual([]);
});

test('244 migration validates BOTH maps, preserves literal permissions and rejects every future tuque container',()=>{
  const {w}=preparedCassandraExpedition(),old=historical(w),before=JSON.parse(JSON.stringify(old));
  expect(deserializeWorld(JSON.stringify(old))).toEqual({...before,schemaVersion:SCHEMA_VERSION});
  for(const side of ['home','secondary'] as const){
    for(const payload of [{piles:[{item:'cloth-tuque'}]},{piles:[{item:'muffalo-wool-tuque'}]},{piles:[{item:'unfinished-tuque'}]},{packed:[{building:{bills:[{recipe:'tuque'}]}}]},{stockpiles:[{filters:{'cloth-tuque':false}}]}]){
      const bad=structuredClone(old),local=side==='home'?bad:bad.secondarySite!.map;Object.assign(local,payload);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/Future tuque catalogue/);
    }
    const malformed=structuredClone(old),local=side==='home'?malformed:malformed.secondarySite!.map;local.tiles=[];expect(()=>deserializeWorld(JSON.stringify(malformed))).toThrow(/version244/);
  }
  for(const hidden of [{apparelPolicies:[{allowedItems:['cloth-tuque']}]},{group:{items:[{item:'muffalo-wool-tuque'}]}},{visitors:{departed:[{items:[{item:'unfinished-tuque'}]}]}},{trade:{bought:{'cloth-tuque':0}}}]){expect(validTuqueCatalogueTransport(hidden,244)).toBe(false);expect(validTuqueCatalogueDomains(hidden,244)).toBe(false);}
  const bad=structuredClone(old);bad.apparelPolicies=bad.apparelPolicies!.map((p,i)=>i===0?{...p,allowedItems:[...p.allowedItems,'cloth-tuque']}:p);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/Future tuque catalogue/);
});

test('an old helmet action cannot inherit a tuque replacement duration and future snapshots resync without adoption',()=>{
  const {world:w,pawnId}=tuqueWorkshopV384();addGroundMaterial(w,'apparel',1,{x:12,z:10},'flak-helmet');const helmet=w.piles.at(-1)!;
  expect(applyCommand(w,{type:'order-equipment',pawnId,itemId:helmet.id,action:'wear',queue:false}).ok).toBe(true);historical(w);w.pawns[0]!.equipmentTask!.duration=14;
  expect(()=>deserializeWorld(JSON.stringify(w))).toThrow(/captured apparel duration/);
  const current=tuqueWorkshopV384().world;addGroundMaterial(current,'apparel',1,{x:12,z:12},'cloth-tuque');const garment=current.piles.at(-1)!;
  expect(validApparelShape(garment as unknown as Record<string,unknown>,244)).toBe(false);expect(validApparelShape(garment as unknown as Record<string,unknown>,245)).toBe(true);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),packet=structuredClone(encoder.encode(current,0,0));(packet.world as {schemaVersion:number}).schemaVersion=244;expect(decoder.adopt(packet).status).toBe('resync');
});

test('historical domain guard reads item/recipe/permission domains without walking terrain arrays',()=>{
  let terrainReads=0;const old={piles:[],apparelPolicies:[],get tiles(){terrainReads++;throw Error('terrain traversal');},get resources(){terrainReads++;throw Error('resource traversal');}};
  expect(validTuqueCatalogueDomains(old,244)).toBe(true);expect(terrainReads).toBe(0);
  expect(validTuqueCatalogueDomains(old,245)).toBe(true);
});
