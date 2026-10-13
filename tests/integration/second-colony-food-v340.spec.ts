import { test,expect,type Page } from '@playwright/test';
import { readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { world,pause,panel,expectWorld,observeErrors } from './helpers';
import { perform } from './player-actions';
import { deserializeWorld,validateWorld } from '../../src/sim/serialization';
import type { Cell,MaterialPile,Pawn,WorldEvent } from '../../src/sim/types';

// Opt-in only. A real V33839073 export + SHA-bound sidecar, or a V340 continuation.
// No factory, alterWorld, simulated time or imported old ingestion credit.
const IDS=[18530,18532,18534],SEED=3398550437,ZONE=18770,STOVE=18884,BILL=18886;
const V338_SHA='e6eea52468ce91196a2a3b816b1df488e09acf47a498bfddb6891bb810a21925';
const sha=(raw:string)=>createHash('sha256').update(raw).digest('hex');
type Crop=Cell&{id:number;bornAt:number;previousId:number};
type Legacy={version:1;seed:number;people:number[];snapshotSha256:string;snapshotTick:number;origin:{tick:number;sha256:string;path:string};
  zoneId:number;stationId:number;billId:number;reseeded:Crop[];harvested:(Cell&{id:number;harvestTick:number})[];products:{id:number;consumedRice:number}[];eaten:unknown[]};
type Attempt={actorId:number;patientId:number;name:string;actorName:string;sourceId:number;carryId:number;quantity:number;hunger:number;
  tick:number;lastTick:number;progress:number;kind:'self'|'assisted';closed?:number;reason?:string};
type Ledger={version:340;seed:number;people:number[];snapshotSha256?:string;snapshotTick?:number;origin:{path:string;sha256:string;tick:number};
  base:{origin:Legacy['origin'];productIds:number[];initialNextId:number;downed:number[]};crop:Crop;initial:unknown;
  growth:{tick:number;value:number}[];harvest?:{tick:number;growth:number;jobId:number;pawnId:number;sourceId:number;quantity:number;beforeQuantity:number;event:WorldEvent};
  cargo?:{tick:number;pawnId:number;sourceId:number;carryId:number;quantity:number;beforeQuantity:number;basis?:'harvest-deliver'};
  products:{id:number;tick:number;pawnId:number;consumedRice:10;event:WorldEvent;invalid?:string}[];attempts:Attempt[];
  eaten:(Attempt&{completedTick:number;hungerAfter:number;event:WorldEvent})[];events:WorldEvent[];
  checkpoints:{name:string;path:string;tick:number;sha256:string;reloaded:boolean;bilan:unknown}[];notes:unknown[]};

async function observe(page:Page,crop:Crop){
  return page.evaluate(async({ids,crop,stationId})=>{
    // Pure source reader on the actual confirmed World, not lazy raw growth or
    // a reconstructed model. Private observer only, under the native Vite host.
    const source='/src/sim/plants.ts';const api:typeof import('../../src/sim/plants')=await import(source);
    const w=window.__lisiere.world,c=w.resources.find(r=>r.id===crop.id);
    return {tick:w.tick,nextId:w.nextId,seed:w.seed,incident:window.__lisiere.incident,backend:window.__lisiere.backend,
      crop:c?{id:c.id,x:c.x,z:c.z,bornAt:c.plantLife?.bornAt,growth:api.plantGrowth(w,c)}:null,
      people:w.pawns.filter(p=>ids.includes(p.id)).map(p=>({id:p.id,name:p.name,x:p.x,z:p.z,state:p.state,hunger:p.hunger,
        health:p.health,medicalSleep:p.medicalSleep,mental:p.mental,prisoner:!!p.prisoner,need:p.need,feed:p.feed,cooking:p.cooking,haul:p.haul,jobId:p.jobId})),
      piles:w.piles.filter(p=>['rice','simple-meal','survival-meal','wood','medicine'].includes(p.item)),
      jobs:w.jobs.filter(j=>j.kind==='harvest'&&j.x===crop.x&&j.z===crop.z),station:w.structures.find(s=>s.id===stationId),events:w.events,
      foreign:JSON.stringify({ids:w.pawns.filter(p=>!ids.includes(p.id)).map(p=>p.id),visitors:w.visitors?.serial,trade:w.trade?.count,small:w.smallIncidents}),
      danger:[...w.pawns.filter(p=>p.faction==='outlaws'&&!p.prisoner&&!p.health?.death&&!['dead','downed'].includes(p.state)&&!p.raid?.exiting).map(p=>p.id),
        ...(w.wildlife?.animals??[]).filter(a=>a.manhunter&&!a.manhunter.exhausted&&!a.health?.death&&!['dead','downed'].includes(a.state)).map(a=>a.id),
        ...(w.mechanoids??[]).filter(m=>!['dead','downed'].includes(m.state)).map(m=>m.id)]};
  },{ids:IDS,crop,stationId:STOVE});
}
type Observation=Awaited<ReturnType<typeof observe>>;
type Work={tick:number;chefId:number;name:string;nextId:number;piles:MaterialPile[];meals:MaterialPile[];foreign:string};
type HarvestWindow={tick:number;growth:number;jobId:number;pawnId:number;name:string;piles:MaterialPile[]};
type Pickup={tick:number;pawnId:number;sourceId:number;beforeQuantity:number;quantity:number};
const ground=(p:MaterialPile,c:Cell)=>p.owner.type==='ground'&&p.owner.x===c.x&&p.owner.z===c.z;
const countFood=(s:Observation)=>Object.fromEntries(['rice','simple-meal','survival-meal','wood','medicine'].map(item=>[item,
  s.piles.filter(p=>p.item===item).map(p=>({id:p.id,quantity:p.quantity,owner:p.owner}))]));
const consumed=(work:Work,s:Observation)=>work.piles.reduce((n,p)=>n+p.quantity-(s.piles.find(q=>q.id===p.id)?.quantity??0),0);

/** Current held custody, not an invented pickup observation. The SHA-bound
 * harvest gives the source total; the real deliver task keeps its source/cell. */
function heldHarvestCargo(tick:number,pawns:readonly Pick<Pawn,'id'|'haul'>[],piles:readonly MaterialPile[],e:Ledger):Ledger['cargo'] {
  const h=e.harvest;if(!h||tick<h.tick)return;
  const total=h.beforeQuantity+h.quantity,source=piles.find(p=>p.id===h.sourceId);
  if(source&&(source.item!=='rice'||!ground(source,e.crop)))return;
  const matches=pawns.filter(p=>IDS.includes(p.id)).flatMap(p=>{
    const task=p.haul,carry=piles.find(i=>i.id===task?.carryPileId);
    if(task?.phase!=='deliver'||task.sourcePileId!==h.sourceId||!task.pickupCell||task.pickupCell.x!==e.crop.x||task.pickupCell.z!==e.crop.z
      ||!carry||carry.id===h.sourceId||carry.item!=='rice'||carry.owner.type!=='pawn'||carry.owner.pawnId!==p.id
      ||task.quantity!==carry.quantity||task.quantity<=0||total-(source?.quantity??0)!==carry.quantity)return [];
    return [{tick,pawnId:p.id,sourceId:h.sourceId,carryId:carry.id,quantity:carry.quantity,beforeQuantity:total,basis:'harvest-deliver' as const}];
  });
  return matches.length===1?matches[0]:undefined;
}

test('V340 natural second rice harvest, new cooking and new ingestion',async({page},info)=>{
  test.skip(!process.env.V340_INPUT,'V340_INPUT requires a real acquired export and SHA-bound evidence.');test.setTimeout(1_200_000);
  const started=Date.now(),deadline=started+1_080_000,errors=observeErrors(page),input=resolve(process.env.V340_INPUT!);
  let e!:Ledger,loaded=false,failure:unknown,raw='',last:Observation|undefined,harvestWindow:HarvestWindow|undefined,pickup:Pickup|undefined;
  const works=new Map<number,Work>(),ring:Observation[]=[],rotation={value:0};let lastLogTick=-600,lastLogAt=0,desiredSpeed=0;
  const front=()=>page.locator('.front-menu');
  const speed=async(value:1|6)=>{if(desiredSpeed===value)return;await page.keyboard.press('Escape');await page.locator(`[data-speed="${value}"]`).click();desiredSpeed=value;};
  const capture=async(name:string,reload=true)=>{
    await pause(page);desiredSpeed=0;const before=await world(page);expect(validateWorld(before)).toEqual([]);
    expect(before.pawns.filter(p=>IDS.includes(p.id)).map(p=>p.id).sort((a,b)=>a-b)).toEqual(IDS);
    if(name==='second-rice-cargo'){const pile=before.piles.find(p=>p.id===e.cargo!.carryId);
      expect(pile,'Cargo checkpoint requires the actually held portion').toMatchObject({quantity:e.cargo!.quantity,owner:{type:'pawn',pawnId:e.cargo!.pawnId}});}
    await page.keyboard.press('Escape');await page.screenshot({path:info.outputPath(name+'-map.png')});await panel(page,'menu');
    const manager=page.locator('[data-save-manager]'),label='V340 '+name;await manager.locator('[data-save-manager-name]').fill(label);
    await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
    const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
    const path=info.outputPath(name+'.json');await (await download).saveAs(path);const data=await readFile(path,'utf8');expect(deserializeWorld(data)).toEqual(before);
    const at=await observe(page,e.crop);last=at;
    const record={name,path,tick:before.tick,sha256:sha(data),reloaded:false,bilan:{foods:countFood(at),fuel:at.station?.fuel,people:at.people}};e.checkpoints.push(record);
    if(reload){await page.locator('#browse-saves').click();const row=front().locator('label').filter({has:page.locator('strong').filter({hasText:label})});
      await row.locator('input[name="front-save"]').check();await front().getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,before);record.reloaded=true;}
    e.snapshotSha256=record.sha256;e.snapshotTick=before.tick;await writeFile(path+'.evidence.json',JSON.stringify(e,null,2));
    await info.attach(name,{contentType:'application/json',path});await page.keyboard.press('Escape');return before;
  };
  try{
    raw=await readFile(input,'utf8');const initial=deserializeWorld(raw);expect(validateWorld(initial)).toEqual([]);
    const side=JSON.parse(await readFile(resolve(process.env.V340_EVIDENCE??input+'.evidence.json'),'utf8')) as Legacy|Ledger;
    expect(side.seed).toBe(SEED);expect(side.people).toEqual(IDS);expect(side.snapshotSha256).toBe(sha(raw));expect(side.snapshotTick).toBe(initial.tick);
    expect(initial.seed).toBe(SEED);expect([initial.width,initial.height]).toEqual([250,250]);
    expect(initial.growingZones.find(z=>z.id===ZONE)?.plant).toBe('rice');
    const station=initial.structures.find(s=>s.id===STOVE);expect(station?.kind).toBe('fueled-stove');expect(station?.bills?.find(b=>b.id===BILL)?.recipe).toBe('simple-meal');
    if(side.version===1){
      expect(initial.tick).toBe(39073);expect(sha(raw),'The literal acquired V338 export').toBe(V338_SHA);
      expect([side.zoneId,side.stationId,side.billId]).toEqual([ZONE,STOVE,BILL]);expect(side.origin.tick).toBe(6145);
      expect(side.products.map(p=>p.id)).toEqual([19223,19301,19355,19385]);expect(side.products.every(p=>p.consumedRice===10)).toBe(true);expect(side.eaten.length).toBeGreaterThan(0);
      const crop=side.reseeded.filter(c=>initial.resources.some(r=>r.id===c.id&&r.kind==='rice'&&r.x===c.x&&r.z===c.z&&r.plantLife?.bornAt===c.bornAt)
        &&!side.harvested.some(h=>h.id===c.id)&&side.harvested.some(h=>h.id===c.previousId&&h.x===c.x&&h.z===c.z&&h.harvestTick<c.bornAt)).sort((a,b)=>a.bornAt-b.bornAt||a.id-b.id)[0];
      expect(crop,'An original witnessed reseed must still be present').toBeTruthy();
      e={version:340,seed:SEED,people:IDS,origin:{path:input,sha256:sha(raw),tick:initial.tick},crop:crop!,initial:null,
        base:{origin:side.origin,productIds:side.products.map(p=>p.id),initialNextId:initial.nextId,downed:initial.pawns.filter(p=>IDS.includes(p.id)&&p.state==='downed').map(p=>p.id)},
        growth:[],products:[],attempts:[],eaten:[],events:[],checkpoints:[],notes:[]};
    }else {expect(side.version).toBe(340);expect(side.origin.tick).toBe(39073);expect(side.origin.sha256).toBe(V338_SHA);e=side;
      for(const a of e.attempts)if(a.closed===undefined&&!e.eaten.some(done=>done.carryId===a.carryId)){a.closed=initial.tick;a.reason='New observation window after reload';}}
    await info.attach('input-provenance',{contentType:'application/json',body:JSON.stringify({path:input,sha256:sha(raw),tick:initial.tick,origin:e.origin,crop:e.crop})});
    await page.goto('/?e2e');await front().getByRole('button',{name:'Charger une partie',exact:true}).click();await front().locator('input[type=file]').setInputFiles(input);
    await expectWorld(page,initial);await pause(page);expect(await world(page)).toEqual(initial);loaded=true;
    const initialObservation=await observe(page,e.crop);e.initial??={tick:initialObservation.tick,foods:countFood(initialObservation),fuel:initialObservation.station?.fuel,people:initialObservation.people};
    if(e.harvest&&!e.cargo)e.cargo=heldHarvestCargo(initial.tick,initial.pawns,initial.piles,e);
    for(const [name,completed] of [['second-harvest',!!e.harvest],['second-rice-cargo',!!e.cargo],['second-cycle',!!e.eaten.length]] as const)
      if(completed&&!e.checkpoints.some(c=>c.name===name&&c.reloaded))await capture(name);
    if(e.harvest&&e.cargo&&e.products.length&&e.eaten.length){
      for(const name of ['second-harvest','second-rice-cargo','second-cycle'])expect(e.checkpoints.some(c=>c.name===name&&c.reloaded),`${name}: actual exact reload required`).toBe(true);
      expect(errors).toEqual([]);return;
    }
    if(process.env.V340_SINGLE_BATCH==='1'){
      const current=await world(page),bill=current.structures.find(s=>s.id===STOVE)!.bills!.find(b=>b.id===BILL)!;
      expect(bill.mode).toBe('until');
      if(bill.target!==1){const {id,recipe,...settings}=bill;
        await perform(page,{reason:'Ordinary UI: isolate one fresh meal while the camp recovers; no food/need injection',
          command:{type:'bill-update',structureId:STOVE,billId:BILL,settings:{...settings,target:1}}},rotation);
        e.notes.push({tick:(await world(page)).tick,singleBatch:{previousTarget:bill.target,target:1,settings},qualification:'Guided reserve setting, not food autonomy'});
        await page.keyboard.press('Escape');}
      const ready=await page.evaluate(async()=>{
        const source='/src/sim/plants.ts',api:typeof import('../../src/sim/plants')=await import(source),w=window.__lisiere.world;
        if(w.piles.filter(p=>p.item==='rice'&&p.owner.type==='ground').reduce((n,p)=>n+p.quantity,0)>=10)return null;
        const crops=w.resources.filter(r=>r.kind==='rice'&&!r.blight&&r.x>=110&&r.x<=119&&r.z>=116&&r.z<=123)
          .map(r=>({id:r.id,x:r.x,z:r.z,bornAt:r.plantLife?.bornAt,growth:api.plantGrowth(w,r)}))
          .filter(r=>r.growth>.65&&!w.jobs.some(j=>j.kind==='harvest'&&j.x===r.x&&j.z===r.z)).sort((a,b)=>(a.bornAt??0)-(b.bornAt??0)||a.id-b.id);
        return crops[0]??null;
      });
      if(ready){e.notes.push({tick:(await world(page)).tick,guidedRipeHarvest:ready,qualification:'Actually ripe existing crop, no forced growth'});
        await perform(page,{reason:'Harvest genuinely ripe field rice for the one-meal reserve',command:{type:'designate',kind:'harvest',x:ready.x,z:ready.z}},rotation);
        await page.keyboard.press('Escape');}
    }
    await speed(6);
    while(Date.now()<deadline){
      const s=await observe(page,e.crop);ring.push(s);if(ring.length>30)ring.shift();expect(s.seed).toBe(SEED);expect(s.backend).toBe('WebGPU');let checkpointed=false;
      if(s.incident.simulationStopped||s.incident.graphicsFault)throw Error('Real technical incident; preserve the confirmed state.');
      const unavailable=s.people.filter(p=>p.health?.death||p.state==='dead'||p.state==='downed'&&!e.base.downed.includes(p.id));
      if(s.danger.length||unavailable.length||s.people.length!==3||s.people.every(p=>p.mental?.crisis||p.prisoner||p.state==='downed')){
        await pause(page);desiredSpeed=0;e.notes.push({tick:s.tick,danger:s.danger,unavailable,people:s.people});throw Error('New danger or original-person incapacity: paused for ROOT intervention.');}
      for(const event of s.events)if(event.tick>initial.tick&&!e.events.some(v=>v.tick===event.tick&&v.type===event.type&&v.message===event.message))e.events.push(event);
      if(s.crop){expect([s.crop.x,s.crop.z,s.crop.bornAt]).toEqual([e.crop.x,e.crop.z,e.crop.bornAt]);
        if(!e.growth.length||s.tick-e.growth.at(-1)!.tick>=600)e.growth.push({tick:s.tick,value:s.crop.growth});
        const job=s.jobs.find(j=>j.reservedBy!==null),actor=s.people.find(p=>p.jobId===job?.id);
        if(job&&actor?.state==='working'&&job.reservedBy===actor.id&&job.progress>0&&Math.abs(actor.x-e.crop.x)+Math.abs(actor.z-e.crop.z)<=1&&s.crop.growth>.65)
          harvestWindow={tick:s.tick,growth:s.crop.growth,jobId:job.id,pawnId:actor.id,name:actor.name,piles:s.piles.filter(p=>p.item==='rice'&&ground(p,e.crop))};
        if(!e.harvest&&s.crop.growth>.65&&!s.jobs.length){await pause(page);desiredSpeed=0;
          await perform(page,{reason:'Harvest the genuinely reseeded rice above65%; no forced maturity',command:{type:'designate',kind:'harvest',x:e.crop.x,z:e.crop.z}},rotation);await page.keyboard.press('Escape');}
      }else if(!e.harvest){
        if(!harvestWindow)throw Error('Reseed disappeared without observed physical harvest work; no credit.');
        const outputs=s.piles.filter(p=>p.item==='rice'&&ground(p,e.crop)).map(p=>({pile:p,before:harvestWindow!.piles.find(q=>q.id===p.id)?.quantity??0})).filter(v=>v.pile.quantity>v.before);
        const output=outputs.length===1?outputs[0]:undefined,quantity=output?output.pile.quantity-output.before:0;
        const event=s.events.find(v=>v.tick>harvestWindow!.tick&&v.tick<=s.tick&&v.type==='job'&&v.message===`${harvestWindow!.name} a récolté ${quantity} riz.`);
        if(output&&event){e.harvest={tick:event.tick,growth:harvestWindow.growth,jobId:harvestWindow.jobId,pawnId:harvestWindow.pawnId,sourceId:output.pile.id,quantity,beforeQuantity:output.before,event};
          const confirmed=await capture('second-harvest');e.cargo=heldHarvestCargo(confirmed.tick,confirmed.pawns,confirmed.piles,e);
          if(e.cargo)await capture('second-rice-cargo');harvestWindow=undefined;pickup=undefined;works.clear();continue;}
        else throw Error('Reseed vanished without unambiguous harvest output/event; preserve partial evidence.');
      }
      if(e.harvest&&!e.cargo){
        const held=heldHarvestCargo(s.tick,s.people,s.piles,e);
        if(held){e.cargo=held;await capture('second-rice-cargo');works.clear();continue;}
        for(const p of s.people){const c=p.cooking,source=s.piles.find(i=>i.id===e.harvest!.sourceId);
          const ingredient=c?.ingredients.find(i=>i.pileId===e.harvest!.sourceId&&i.stage==='source');
          if(source?.item==='rice'&&source.owner.type==='ground'&&(p.haul?.phase==='pickup'&&p.haul.sourcePileId===source.id||ingredient))
            pickup={tick:s.tick,pawnId:p.id,sourceId:source.id,beforeQuantity:source.quantity,quantity:ingredient?.quantity??p.haul!.quantity};
          if(pickup?.pawnId!==p.id)continue;
          const carryId=p.haul?.sourcePileId===pickup.sourceId?p.haul.carryPileId:c?.ingredients.find(i=>i.stage==='held')?.pileId;
          const carry=s.piles.find(i=>i.id===carryId),left=s.piles.find(i=>i.id===pickup!.sourceId);
          if(carry?.item==='rice'&&carry.owner.type==='pawn'&&carry.owner.pawnId===p.id&&carry.quantity===pickup.quantity
            &&(carry.id===pickup.sourceId?pickup.beforeQuantity===carry.quantity:pickup.beforeQuantity-(left?.quantity??0)===carry.quantity)){
            e.cargo={...pickup,carryId:carry.id,tick:s.tick};await capture('second-rice-cargo');pickup=undefined;checkpointed=true;break;}
        }
        const source=s.piles.find(p=>p.id===e.harvest!.sourceId);
        if(!e.cargo&&(!source||source.item!=='rice'||!ground(source,e.crop)||source.quantity!==e.harvest.beforeQuantity+e.harvest.quantity))
          throw Error('Harvest source was removed, delivered or mixed before cargo qualification; resume an acquired held-cargo checkpoint, not an impossible source wait.');
      }
      if(checkpointed){works.clear();continue;} // Reload must begin a fresh observed window.
      if(e.cargo)for(const p of s.people){
        const c=p.cooking,work=works.get(p.id),event=work?s.events.find(v=>v.tick>work.tick&&v.tick<=s.tick&&v.type==='job'&&v.message===`${work.name} a cuisiné 1 repas simple (0 baies, 10 riz).`):undefined;
        if(work&&event&&consumed(work,s)===10){
          const compatible=(i:MaterialPile)=>i.owner.type==='pawn'&&i.owner.pawnId===p.id||i.owner.type==='ground'&&Math.abs(i.owner.x-p.x)+Math.abs(i.owner.z-p.z)<=1
            ||s.people.some(a=>i.owner.type==='pawn'&&i.owner.pawnId===a.id&&(a.need?.kind==='eat'&&a.need.sourcePileId===i.id&&a.need.carryPileId===i.id||a.feed?.sourcePileId===i.id&&a.feed.carryPileId===i.id));
          const unchangedMeals=work.meals.every(m=>s.piles.find(i=>i.id===m.id)?.quantity===m.quantity);
          const candidates=s.piles.filter(i=>i.item==='simple-meal'&&i.quantity===1&&i.id>=work.nextId&&!work.meals.some(m=>m.id===i.id)&&!e.base.productIds.includes(i.id)
            &&(c?.phase==='output'&&c.stationId===STOVE&&c.billId===BILL&&c.productId===i.id||s.tick-work.tick<=3&&unchangedMeals&&work.foreign===s.foreign&&i.rot?.atTick===event.tick&&compatible(i)));
          if(candidates.length===1&&!e.products.some(v=>v.id===candidates[0]!.id))e.products.push({id:candidates[0]!.id,tick:event.tick,pawnId:p.id,consumedRice:10,event});
          else if(!candidates.length)e.notes.push({tick:s.tick,unqualifiedCooking:event,reason:'No unique new physical product; no retrospective inference'});
          works.delete(p.id);
        }
        if(c?.phase==='work'&&c.stationId===STOVE&&c.billId===BILL&&c.recipe===undefined&&c.ingredients.every(i=>i.item==='rice'&&i.stage==='placed')&&c.ingredients.reduce((n,i)=>n+i.quantity,0)===10){
          const piles=[...new Set(c.ingredients.map(i=>i.pileId))].map(id=>s.piles.find(i=>i.id===id)!);
          if(piles.every(i=>i?.item==='rice')&&c.ingredients.every(i=>{const pile=s.piles.find(p=>p.id===i.pileId);return !!pile&&ground(pile,i.cell)&&pile.quantity>=i.quantity;}))
            works.set(p.id,{tick:s.tick,chefId:p.id,name:p.name,nextId:s.nextId,piles,meals:s.piles.filter(i=>i.item==='simple-meal'),foreign:s.foreign});
        }else if(!event)works.delete(p.id);
      }
      for(const product of e.products){const pile=s.piles.find(i=>i.id===product.id);if(pile&&pile.quantity!==1)product.invalid='Observed meal fusion; no unit attribution';}
      for(const actor of s.people){
        const self=actor.need?.kind==='eat'&&actor.need.phase==='ingest'?actor.need:undefined,feed=actor.feed?.phase==='feed'?actor.feed:undefined;
        const task=self??feed,patient=feed?s.people.find(p=>p.id===feed.patientId):actor,kind=feed?'assisted':'self';
        const sourceId=task&&(self?self.sourcePileId:feed!.sourcePileId),carryId=task?.carryPileId,portion=s.piles.find(i=>i.id===carryId);
        if(task&&patient&&sourceId!==null&&portion?.item==='simple-meal'&&portion.owner.type==='pawn'&&portion.owner.pawnId===actor.id&&portion.quantity===task.quantity
          &&sourceId===portion.id&&task.quantity===1&&e.products.some(p=>p.id===sourceId&&!p.invalid)
          &&!e.eaten.some(a=>a.carryId===portion.id)&&!e.attempts.some(a=>a.closed===undefined&&a.carryId===portion.id))
          e.attempts.push({actorId:actor.id,patientId:patient.id,name:patient.name,actorName:actor.name,sourceId:sourceId!,carryId:portion.id,quantity:portion.quantity,hunger:patient.hunger,tick:s.tick,lastTick:s.tick,progress:task.progress,kind});
      }
      for(const a of e.attempts.filter(v=>v.closed===undefined&&!e.eaten.some(done=>done.carryId===v.carryId))){
        const actor=s.people.find(p=>p.id===a.actorId),patient=s.people.find(p=>p.id===a.patientId),task=a.kind==='self'?actor?.need?.kind==='eat'?actor.need:undefined:actor?.feed;
        const portion=s.piles.find(p=>p.id===a.carryId),continuing=task?.phase===(a.kind==='self'?'ingest':'feed')&&task.sourcePileId===a.sourceId&&task.carryPileId===a.carryId
          &&(a.kind==='self'||actor?.feed?.patientId===a.patientId)&&task.quantity===a.quantity&&portion?.item==='simple-meal'&&portion.quantity===a.quantity
          &&portion.owner.type==='pawn'&&portion.owner.pawnId===a.actorId&&task.progress>=a.progress;
        if(continuing){a.lastTick=s.tick;a.progress=task!.progress;continue;}
        const message=a.kind==='assisted'?`${a.name} a mangé une portion (${a.quantity} × Repas simple) au lit, avec l’aide de ${a.actorName}.`:undefined;
        const event=s.events.find(v=>v.tick>a.lastTick&&v.tick<=s.tick&&v.type==='need'&&(message?v.message===message:[`${a.name} a mangé une portion (${a.quantity} × Repas simple) sans table.`,`${a.name} a mangé une portion (${a.quantity} × Repas simple) à table.`].includes(v.message))
          &&!e.eaten.some(done=>done.event.tick===v.tick&&done.event.message===v.message));
        a.closed=s.tick;if(!portion&&event&&patient&&patient.hunger>a.hunger&&e.products.some(p=>p.id===a.sourceId&&!p.invalid))e.eaten.push({...a,completedTick:event.tick,hungerAfter:patient.hunger,event});else a.reason='Interrupted or no continuous physical completion proof';
      }
      if(e.harvest&&e.cargo&&e.products.length&&e.eaten.length){await capture('second-cycle');
        for(const name of ['second-harvest','second-rice-cargo','second-cycle'])expect(e.checkpoints.some(c=>c.name===name&&c.reloaded),`${name}: actual exact reload required`).toBe(true);
        expect(errors).toEqual([]);return;}
      const cooking=e.cargo&&s.people.some(p=>p.cooking?.stationId===STOVE&&p.cooking.billId===BILL);
      const meal=s.people.some(p=>{const need=p.need,feed=p.feed;return need?.kind==='eat'&&e.products.some(i=>i.id===need.sourcePileId&&!i.invalid)||!!feed&&e.products.some(i=>i.id===feed.sourcePileId&&!i.invalid);});
      const harvestActive=s.jobs.some(j=>j.reservedBy!==null&&s.people.some(p=>p.jobId===j.id));
      const cargoActive=e.harvest&&!e.cargo&&s.people.some(p=>p.haul?.sourcePileId===e.harvest!.sourceId||p.cooking?.ingredients.some(i=>i.pileId===e.harvest!.sourceId));
      await speed(!e.harvest&&(harvestActive||!!harvestWindow)||cargoActive||cooking||meal?1:6);
      if(s.tick-lastLogTick>=600||Date.now()-lastLogAt>=30000){lastLogTick=s.tick;lastLogAt=Date.now();
        console.log('V340 progress '+JSON.stringify({tick:s.tick,crop:s.crop,fuel:s.station?.fuel,foods:countFood(s),people:s.people.map(p=>({id:p.id,state:p.state,hunger:p.hunger})),
          witnesses:{harvest:!!e.harvest,cargo:!!e.cargo,products:e.products.length,eaten:e.eaten.length}}));}
      last=s;await page.waitForTimeout(200);
    }
    throw Error('Natural second-cycle wall budget reached; resume this export, never force progress.');
  }catch(error){failure=error;throw error;}
  finally{
    let exportFailure:unknown;if(loaded)try{await capture(failure?'failure-continuation':'final-continuation',false);}catch(error){exportFailure=error;e.notes.push({exportFailure:String(error)});}
    const path=info.outputPath('second-food-summary.json');await writeFile(path,JSON.stringify({input,sha256:raw?sha(raw):null,elapsedMs:Date.now()-started,result:failure||exportFailure?'partial-failure':'second-cycle',
      failure:String(failure??exportFailure??''),qualification:'Second witnessed reseed harvest and subsequent production/ingestion; mixed rice has no unit genealogy, no food autonomy or complete recovery certified.',
      evidence:e??null,last: last??ring.at(-1),errors,observations:ring},null,2));await info.attach('second-food-summary',{contentType:'application/json',path});
    if(!failure){if(exportFailure)throw exportFailure;expect(errors).toEqual([]);}
  }
});
