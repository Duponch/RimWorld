import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../../src/sim/serialization';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {productionWorkerQualified} from '../../src/sim/machining';
import {commercialItemMassGrams} from '../../src/sim/commercial-mass';
import {footprintCells} from '../../src/sim/definitions';
import type {Command,MaterialPile,Cell} from '../../src/sim/types';
import type {BillSettings} from '../../src/sim/cooking-types';
import {harness414,sha414} from './owners-v414-native-helper';
import {perform,revealCells,inspectPerson} from './player-actions';

const NOTICE='One ROOT-only native usage of the actual future approved inheritance (helper03 lineage, declared vegetation-only clearing in sibling04 if approved): finite prepared structures/research/stocks and preparation receipt, unearned and declared. Ordinary UI priorities/filters/refuel/cook/wear only; no World mutation, factory, added fuel, ingredient, hunger/health edits, remote pickup or previous creation replay. Three hundred seconds maximum active UI/play budget, then preserve the last actual state and report unfinished usages rather than replaying the input.';
interface Receipt263 {notice:string;input:{path:string;sha256:string};outputSHA256:string;tick:number;people:number[];stocks:{item:string;quantity:number;ids:number[]}[];buildingsPreparedWithoutEarnedConstruction:{id:number;kind:string}[];rooms:unknown[];woodGeneratorInitialFuel:number;stoveInitialFuel:number;batteriesInitialEnergy:number}
const near=(a:Cell,b:Cell)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)<=1;
const contactFinished=(p:{x:number;z:number;moveCooldown:number;motion?:{end:number}|null},tick:number)=>p.moveCooldown===0&&(p.motion?.end??0)<=tick;
const weighed=(p:MaterialPile)=>({id:p.id,item:p.item,quantity:p.quantity,owner:p.owner,unitMassGrams:commercialItemMassGrams(p.item,263)??null,totalMassGrams:commercialItemMassGrams(p.item,263)===undefined?null:commercialItemMassGrams(p.item,263)!*p.quantity});

// A supplied opt-in without real path/SHA/receipt is a hard failure, never a factory fallback.
test.skip(process.env.FINAL_DEMO263_USAGES_NATIVE!=='1','ROOT supplies the actual approved patrimony output and receipt only AFTER its real creation.');
test('actual final263 inheritance: paid fuel, first cooking/stone/shirt/wear/sowing, exact paused reload',async({page},info)=>{
 const input=process.env.FINAL_DEMO263_USAGES_INPUT,inputSHA=process.env.FINAL_DEMO263_USAGES_INPUT_SHA256,receiptPath=process.env.FINAL_DEMO263_USAGES_RECEIPT,receiptSHA=process.env.FINAL_DEMO263_USAGES_RECEIPT_SHA256;
 if(!input||!isAbsolute(input)||!inputSHA||!/^[a-f0-9]{64}$/.test(inputSHA)||!receiptPath||!isAbsolute(receiptPath)||!receiptSHA||!/^[a-f0-9]{64}$/.test(receiptSHA))throw Error('ROOT real prepared263 input path/SHA and approved patrimony receipt path/SHA required; no fallback');
 const bytes=await readFile(input,'utf8'),receiptBytes=await readFile(receiptPath,'utf8');expect(sha414(bytes)).toBe(inputSHA);expect(sha414(receiptBytes)).toBe(receiptSHA);
 expect(inputSHA).toBe('f1b9d013ea626e5c24bfa423d189e1618c1f39bcdf7659d30afe1e9ad7cf7bc0');
 const receipt=JSON.parse(receiptBytes) as Receipt263;
 const h=await harness414(page,info,NOTICE,{exactAdoptionOnce415:true}),rotation={value:0};
 h.proof.input={path:input,sha256:inputSHA,receiptPath,receiptSHA256:receiptSHA};h.proof.preparedNotice=receipt.notice;
 const captures:{name:string;path:string}[]=[],events:object[]=[];let lastTick:number|undefined,deadline=0,loaded=false;
 const capture=async(name:string,cells:Cell[])=>{await page.keyboard.press('Escape');await revealCells(page,cells);const path=info.outputPath(name+'.png');await page.screenshot({path,fullPage:true});await info.attach(name,{path,contentType:'image/png'});captures.push({name,path});};
 const act=async(command:Command,reason:string)=>{await h.stop();await page.keyboard.press('Escape');await perform(page,{command,reason},rotation);await page.keyboard.press('Escape');};
 try{
  const baseline=await(async()=>{
   const root=deserializeCampaign(await decodeStoredSave(bytes));if(!('tiles'in root)||root.schemaVersion!==263||root.width!==250||root.height!==250)throw Error('Actual approved patrimony complete home250 required');expect(validateWorld(root)).toEqual([]);expect(receipt.outputSHA256).toBe('20fecd5c6949cbd04304b868f66b2d54b9739cc0aa0ba0c49b33e8eeb176e32d');expect(root.tick).toBe(35);expect(receipt.notice).toContain('Explicitly prepared finite');expect(receipt.tick).toBe(root.tick);
   expect(root.worldMaps!.sites.map(s=>({id:s.id,kind:s.kind}))).toEqual([{id:0,kind:'settlement'}]);expect(root.worldGroups!.groups).toHaveLength(0);expect(root.startingArrival?.phase).toBe('opened');expect(root.jobs).toHaveLength(0);
   expect(root.pawns.map(p=>p.id)).toEqual(receipt.people);expect(receipt.people).toHaveLength(3);expect(receipt.stocks).toHaveLength(13);expect(receipt.woodGeneratorInitialFuel).toBe(0);expect(receipt.stoveInitialFuel).toBe(0);expect(receipt.batteriesInitialEnergy).toBe(0);expect(root.piles.some(p=>p.unfinished)).toBe(false);
   const prepared=new Set(receipt.buildingsPreparedWithoutEarnedConstruction.map(s=>s.id));
   const station=(kind:string)=>{const a=root.structures.filter(s=>prepared.has(s.id)&&s.kind===kind);expect(a).toHaveLength(1);return a[0]!;};
   const generator=station('wood-generator'),stove=station('fueled-stove'),stone=station('stonecutter'),tailor=station('tailor-bench'),battery=station('battery');
   expect(generator.fuel!.ticks).toBe(0);expect(stove.fuel!.ticks).toBe(0);expect(battery.battery!.stored).toBe(0);
   const stations=[stove,stone,tailor],recipes=['simple-meal','stone-blocks','shirt']as const,targets=[6,3,1];
   const bills=stations.map((s,i)=>{expect(s.bills).toHaveLength(1);const b=s.bills![0]!;expect(b.recipe).toBe(recipes[i]);expect(b.target).toBe(targets[i]);return {stationId:s.id,billId:b.id,recipe:b.recipe,settings:structuredClone(b) as BillSettings};});
   const qualified=(recipe:'simple-meal'|'stone-blocks'|'shirt')=>{const p=root.pawns.find(p=>productionWorkerQualified(p,recipe));if(!p)throw Error('No true qualified original for '+recipe);return p.id;};
   const roles={cook:qualified('simple-meal'),stone:qualified('stone-blocks'),tailor:qualified('shirt'),grow:root.pawns.at(-1)!.id};
   const zones=root.growingZones.filter(z=>z.id>=receipt.buildingsPreparedWithoutEarnedConstruction.reduce((n,s)=>Math.min(n,s.id),Infinity));expect(zones.map(z=>({plant:z.plant,cells:z.cells.length}))).toEqual([{plant:'potato',cells:16},{plant:'cotton',cells:16}]);
   const sowCells=new Set(zones.flatMap(z=>z.cells));expect(root.resources.some(r=>sowCells.has(r.z*root.width+r.x))).toBe(false);
   const source={tick:root.tick,nextId:root.nextId,people:root.pawns.map(p=>({id:p.id,name:p.name})),roles,bills,generator:generator.id,stove:stove.id,stone:stone.id,tailor:tailor.id,battery:battery.id,stationCells:[generator,stove,stone,tailor].map(s=>({id:s.id,cells:footprintCells(s)})),view:[{x:stove.x,z:stove.z},{x:tailor.x,z:tailor.z}],zones:zones.map(z=>({id:z.id,plant:z.plant,cells:z.cells})),initialItems:root.piles.map(p=>p.id),initialStocks:root.piles.filter(p=>['wood','rice','granite-chunk','cloth'].includes(p.item)).map(weighed)};
   await h.load(input,root);loaded=true;const saved=await h.exported('00-real-prepared-before-player-orders');expect(saved.canonical).toBe(serializeCampaign(root));h.proof.baseline={...source,path:saved.path,sha256:saved.fileSHA256};return source;
  })();
  deadline=Date.now()+300_000;const budget=()=>{if(Date.now()>=deadline)throw Error('Declared300s active usage budget reached; continue ONLY from the latest actual export, never replay the prepared input');};
  // Native01 already confirmed these player choices at tick35. Continue its
  // exact exported World; do not repeat its commands or replay the patrimony.
  h.proof.continuation={source:'usages-native01 actual refusal before first bill update',tick:35,sha256:inputSHA,prioritiesAlreadyConfirmed:true};
  for(const p of baseline.people)for(const [work,value]of [['cook',p.id===baseline.roles.cook?1:0],['craft',p.id===baseline.roles.stone||p.id===baseline.roles.tailor?1:0],['grow',p.id===baseline.roles.grow?1:0],['haul',2],['build',0],['research',0],['mine',0],['gather',0]]as const)expect(await page.evaluate(({id,work})=>window.__lisiere.world.pawns.find(p=>p.id===id)!.priorities[work],{id:p.id,work})).toBe(value);
  for(const [i,b]of baseline.bills.entries()){
   budget();const selected=['rice','granite-chunk','cloth'][i]!,filters=Object.fromEntries(Object.keys(b.settings.filters).map(item=>[item,item===selected]));
   await act({type:'bill-update',structureId:b.stationId,billId:b.billId,settings:{...b.settings,filters}},'Filtre explicite du vrai riz/granite/tissu préparé, sans ajouter de matière ni changer le nombre de factures.');
  }
  await act({type:'order-haul',pawnId:baseline.people[0]!.id,target:{type:'fuel',structureId:baseline.generator},queue:false},'Transporter le vrai bois au générateur vide.');
  await act({type:'order-haul',pawnId:baseline.people[1]!.id,target:{type:'fuel',structureId:baseline.stove},queue:false},'Transporter le vrai bois à la cuisinière vide.');
  await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();
  const ids={people:baseline.people.map(p=>p.id),stations:[baseline.generator,baseline.stove,baseline.stone,baseline.tailor,baseline.battery],zoneCells:baseline.zones.flatMap(z=>z.cells)};
  const sample=()=>page.evaluate(ids=>{
   const w=window.__lisiere.world,people=w.pawns.filter(p=>ids.people.includes(p.id)),targets=w.structures.filter(s=>ids.stations.includes(s.id)),zoneCells=new Set(ids.zoneCells);
   return {tick:w.tick,rng:w.rng,people:people.map(p=>({id:p.id,name:p.name,x:p.x,z:p.z,moveCooldown:p.moveCooldown,motion:p.motion?structuredClone(p.motion):null,haul:p.haul?structuredClone(p.haul):null,cooking:p.cooking?structuredClone(p.cooking):null,equipment:p.equipmentTask?structuredClone(p.equipmentTask):null,job:p.jobId===null?null:structuredClone(w.jobs.find(j=>j.id===p.jobId)??null)})),targets:targets.map(s=>({id:s.id,fuel:s.fuel?{...s.fuel}:null,power:s.power?{...s.power}:null,battery:s.battery?{...s.battery}:null,bills:s.bills?.map(b=>({id:b.id,target:b.target}))})),piles:w.piles.filter(p=>['wood','rice','granite-chunk','cloth','simple-meal','granite-blocks','cloth-shirt','unfinished-shirt'].includes(p.item)).map(p=>structuredClone(p)),crops:w.resources.filter(r=>zoneCells.has(r.z*w.width+r.x)).map(r=>({id:r.id,kind:r.kind,x:r.x,z:r.z,growth:r.growth})),incident:{...window.__lisiere.incident}};
  },ids);
  type Sample=Awaited<ReturnType<typeof sample>>;
  const services=new Map<number,{tick:number;pawnId:number;quantity:number;cargoId:number}>(),fuelPaid=new Set<number>(),works=new Map<string,{tick:number;pawnId:number;task:NonNullable<Sample['people'][number]['cooking']>;inputs:MaterialPile[]}>(),products=new Map<string,MaterialPile>(),sow=new Map<string,object>();
  let energy=false,seeded=false,worn=false,wearOrdered=false,wearContact=false,firstCapture=false,wornBy:number|undefined;const emitted=new Set<string>();
  while(true){
   budget();const a=await sample();lastTick=a.tick;expect(a.incident).toMatchObject({simulationStopped:false,graphicsFault:false,waiting:0});expect(a.people.map(p=>({id:p.id,name:p.name}))).toEqual(baseline.people);
   for(const p of a.people){
    const haul=p.haul;if(haul?.destination.type==='fuel'&&ids.stations.includes(haul.destination.structureId)&&(haul.serviceProgress??0)>0&&!services.has(haul.destination.structureId)){
     const targetId=haul.destination.structureId,target=baseline.stationCells.find(s=>s.id===targetId),cargo=a.piles.find(q=>q.id===haul.carryPileId);if(!target||!cargo)throw Error('Actual fuel cargo/footprint missing');expect(contactFinished(p,a.tick)).toBe(true);expect(target.cells.some(c=>near(p,c))).toBe(true);expect(cargo.item).toBe('wood');expect(cargo.owner).toEqual({type:'pawn',pawnId:p.id});services.set(targetId,{tick:a.tick,pawnId:p.id,quantity:cargo.quantity,cargoId:cargo.id});events.push({type:'real-fuel-contact',tick:a.tick,pawn:p,target:targetId,cargo:weighed(cargo)});
    }
    const t=p.cooking,recipe=t?.recipe??'simple-meal';
    if(t?.phase==='work'&&t.progress>0&&['simple-meal','stone-blocks','shirt'].includes(recipe)&&!products.has(recipe)){
     expect(contactFinished(p,a.tick)).toBe(true);expect({x:p.x,z:p.z}).toEqual(t.spot);expect(t.ingredients.every(i=>i.stage==='placed')).toBe(true);const inputs=t.ingredients.map(i=>{const q=a.piles.find(q=>q.id===i.pileId);if(!q)throw Error('Actual placed ingredient missing');expect(q.owner).toEqual({type:'ground',...i.cell});return q;});
     if(recipe==='shirt'){expect(inputs).toHaveLength(1);expect(inputs[0]!.unfinished).toMatchObject({recipe:'shirt',authorId:p.id,material:'cloth',units:45});}else{expect(t.ingredients.every(i=>i.item===(recipe==='simple-meal'?'rice':'granite-chunk'))).toBe(true);expect(t.ingredients.reduce((n,i)=>n+i.quantity,0)).toBe(recipe==='simple-meal'?10:1);}
     works.set(recipe,{tick:a.tick,pawnId:p.id,task:t,inputs});if(!emitted.has(recipe)){emitted.add(recipe);events.push({type:'real-placed-paid-work',tick:a.tick,pawnId:p.id,recipe,task:t,inputs:inputs.map(weighed)});}
    }
    if(t?.phase==='output'&&t.productId!==null&&!products.has(recipe)&&['simple-meal','stone-blocks','shirt'].includes(recipe)){
     const prior=works.get(recipe),q=a.piles.find(q=>q.id===t.productId);if(!prior||prior.pawnId!==p.id||!q)throw Error('Product lacks its real earlier contact/payment witness');expect(q.id).toBeGreaterThanOrEqual(baseline.nextId);expect(q.owner).toEqual({type:'pawn',pawnId:p.id});expect(q.item).toBe(recipe==='simple-meal'?'simple-meal':recipe==='stone-blocks'?'granite-blocks':'cloth-shirt');expect(q.quantity).toBe(recipe==='stone-blocks'?20:1);
     for(const i of prior.task.ingredients){const before=prior.inputs.find(q=>q.id===i.pileId)!;expect(a.piles.find(q=>q.id===i.pileId)?.quantity??0).toBe(before.quantity-i.quantity);}
     products.set(recipe,q);events.push({type:'real-paid-product',tick:a.tick,pawnId:p.id,recipe,product:weighed(q),consumed:prior.task.ingredients});
    }
    if(p.job?.kind==='sow'&&p.job.progress>0&&contactFinished(p,a.tick)&&near(p,p.job)){const key=p.job.x+','+p.job.z;if(!sow.has(key)){const row={tick:a.tick,pawnId:p.id,cell:{x:p.x,z:p.z},job:p.job};sow.set(key,row);events.push({type:'real-sow-contact',...row});}}
    const madeShirt=products.get('shirt');if(madeShirt&&p.equipment?.action==='wear'&&p.equipment.itemId===madeShirt.id&&p.equipment.progress>0){const floor=a.piles.find(q=>q.id===madeShirt.id);if(floor?.owner.type!=='ground')throw Error('Wear contact must retain the real shirt ground owner before exchange');expect(contactFinished(p,a.tick)).toBe(true);expect(near(p,floor.owner)).toBe(true);if(!wearContact){events.push({type:'real-shirt-wear-contact',tick:a.tick,pawnId:p.id,task:p.equipment,pile:weighed(floor)});wearContact=true;}}
   }
   for(const id of [baseline.generator,baseline.stove]){const t=a.targets.find(s=>s.id===id)!;if(!fuelPaid.has(id)&&(t.fuel?.ticks??0)+(t.fuel?.burned??0)>0){const service=services.get(id);if(!service)throw Error('Fuel increase lacks earlier actual owned wood/contact witness');expect(t.fuel!.ticks+t.fuel!.burned).toBe(service.quantity*600);fuelPaid.add(id);events.push({type:'real-fuel-paid',tick:a.tick,structureId:id,service,fuel:t.fuel,cargoStillPresent:a.piles.some(q=>q.id===service.cargoId)});}}
   const gen=a.targets.find(s=>s.id===baseline.generator)!,bat=a.targets.find(s=>s.id===baseline.battery)!;if(!energy&&gen.power?.on===true&&(gen.fuel?.ticks??0)>0&&(bat.battery?.stored??0)>0){energy=true;events.push({type:'real-network-operation-and-charge',tick:a.tick,generator:gen,battery:bat,notice:'Solar may share this real network; charge is not attributed exclusively to wood.'});}
   for(const crop of a.crops)if(crop.id>=baseline.nextId&&sow.has(crop.x+','+crop.z)){seeded=true;if(!emitted.has('sown')){emitted.add('sown');events.push({type:'real-first-sown-resource',tick:a.tick,crop,prior:sow.get(crop.x+','+crop.z)});}}
   const shirt=products.get('shirt');if(shirt&&!wearOrdered){const ground=a.piles.find(q=>q.id===shirt.id&&q.owner.type==='ground');if(ground){budget();await h.stop();if(!firstCapture){await capture('01-real-fuel-products-and-workshops',baseline.view);firstCapture=true;}await act({type:'order-equipment',pawnId:baseline.roles.tailor,itemId:shirt.id,action:'wear',queue:false},'Enfiler la même chemise réellement fabriquée; aucun équipement initial effacé.');wearOrdered=true;events.push({type:'ordinary-player-wear-order',tick:a.tick,pawnId:baseline.roles.tailor,itemId:shirt.id});await page.locator('[data-speed="1"]').click();}}
   if(shirt&&!worn){const q=a.piles.find(q=>q.id===shirt.id);if(q?.owner.type==='apparel'){expect(baseline.people.map(p=>p.id)).toContain(q.owner.pawnId);expect(wearContact).toBe(true);expect(q.apparel?.material).toBe(shirt.apparel?.material);expect(q.apparel?.quality).toBe(shirt.apparel?.quality);expect(q.apparel!.hitPoints).toBeGreaterThan(0);expect(q.apparel!.hitPoints).toBeLessThanOrEqual(shirt.apparel!.hitPoints);worn=true;wornBy=q.owner.pawnId;events.push({type:'same-real-shirt-worn',tick:a.tick,pawnId:q.owner.pawnId,pile:weighed(q),apparel:q.apparel,notice:'Ordinary explicit/automatic wear may set forced; genuine condition is retained, never restored.'});}}
   if(fuelPaid.size===2&&energy&&products.size===3&&seeded&&worn)break;
   await page.waitForTimeout(100);
  }
  await h.stop();const final=await h.exported('02-real-usages-before-exact-reload');h.proof.actualUsages={lastTick,events,firstSowingOnly:true,allPreparedBillsNotNecessarilyFinished:true};h.proof.latestContinuation={path:final.path,sha256:final.fileSHA256,tick:final.root.tick,notice:'Same actual played lineage; any further work resumes here only.'};
  if(!firstCapture)await capture('01-real-fuel-products-and-workshops',baseline.view);if(wornBy===undefined)throw Error('Actual shirt wearer missing');await page.keyboard.press('Escape');await inspectPerson(page,wornBy,'gear');await page.screenshot({path:info.outputPath('03-real-shirt-worn-and-colony.png'),fullPage:true});captures.push({name:'03-real-shirt-worn-and-colony',path:info.outputPath('03-real-shirt-worn-and-colony.png')});h.actualGPU();await h.load(final.path,final.root);const reloaded=await h.exported('04-real-usages-reloaded-exact');expect(reloaded.canonical).toBe(final.canonical);expect(reloaded.root.tick).toBe(final.root.tick);h.proof.exactCompleteReload=true;
  expect(sha414(await readFile(input,'utf8'))).toBe(inputSHA);expect(sha414(await readFile(receiptPath,'utf8'))).toBe(receiptSHA);await h.finish();
 }catch(error){h.proof.complete=false;h.proof.partial={lastTick,events,notice:'No replay. The failure-current-no-replay export is the only continuation if import succeeded; completed subloops are not silently rerun.'};if(loaded)await h.failure(error);else h.proof.error=String(error);throw error;}finally{h.proof.captures=captures;await writeFile(info.outputPath('actual-usage-events.json'),JSON.stringify({notice:NOTICE,lastTick,events},null,2));await h.save();}
});
