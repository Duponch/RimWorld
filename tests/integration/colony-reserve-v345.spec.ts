import {test,expect,type Page} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {world,pause,panel,expectWorld,observeErrors,tool,cell} from './helpers';
import {perform,revealCells} from './player-actions';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {footprintContains} from '../../src/sim/definitions';
import {planHaulOrder} from '../../src/sim/player-hauling';
import type {World,Pawn,MaterialPile,Cell,WorldEvent} from '../../src/sim/types';

// Distinct pre-incident branch. V34466636 and inherited food credit remain untouched.
const IDS=[18530,18532,18534],SOURCES=[18694,18727],SEED=3398550437;
const INPUT_SHA='a1e16b606dbe31783601bc320c5cf4e944ee7879a8501e15118b324975042747';
const ORIGIN_SHA='e6eea52468ce91196a2a3b816b1df488e09acf47a498bfddb6891bb810a21925';
const area=(c:Cell)=>(c.x===121||c.x===122)&&c.z===114;
const inShelter=(c:Cell)=>c.x>120&&c.x<125&&c.z>110&&c.z<115;
const stationary=(p:Pawn,tick:number)=>p.moveCooldown===0&&(p.motion?.end??0)<=tick;
const sha=(raw:string)=>createHash('sha256').update(raw).digest('hex');
const ground=(p:MaterialPile,c:Cell)=>p.owner.type==='ground'&&p.owner.x===c.x&&p.owner.z===c.z;
const total=(piles:MaterialPile[])=>piles.reduce((n,p)=>n+p.quantity,0);
type Pickup={tick:number;pawnId:number;sourceId:number;sourceCell:Cell;beforeQuantity:number;quantity:number;destinationId:number;cell:Cell};
type EatPickup={tick:number;pawnId:number;name:string;sourceId:number;sourceCell:Cell;beforeQuantity:number;quantity:number;hunger:number};
type Ingestion={tick:number;lastTick:number;pawnId:number;name:string;sourceId:number;carryId:number;quantity:number;progress:number;hunger:number;cell:Cell};
type Ledger={version:345;seed:number;people:number[];origin:{path:string;sha256:string;tick:number};inheritedV340:unknown;
  snapshotTick?:number;snapshotSha256?:string;zoneCells:(Cell&{id:number})[];initialEnds:Record<number,number>;notes:unknown[];responses:unknown[];events:WorldEvent[];
  cargo?:Pickup&{carryId:number;heldTick:number;beforeDestination:MaterialPile[]};delivery?:{tick:number;quantity:number;cell:Cell;outputs:{id:number;beforeQuantity:number;quantity:number;delta:number}[]};
  mealCargo?:EatPickup&{carryId:number;heldTick:number};ingestion?:Ingestion;eaten?:Ingestion&{completedTick:number;hungerAfter:number;event:WorldEvent};
  checkpoints:{name:string;path:string;tick:number;sha256:string;reloaded:boolean;proof:unknown}[]};
async function observe(page:Page){return page.evaluate(ids=>{
  const w=window.__lisiere.world,live=(p:{state:string;health?:{death?:unknown}})=>!p.health?.death&&!['dead','downed'].includes(p.state);
  return {tick:w.tick,seed:w.seed,backend:window.__lisiere.backend,incident:window.__lisiere.incident,people:w.pawns.filter(p=>ids.includes(p.id)),
    piles:w.piles.filter(p=>['survival-meal','simple-meal','rice'].includes(p.item)),stockpiles:w.stockpiles,events:w.events,
    danger:[...w.pawns.filter(p=>live(p)&&p.faction==='outlaws'&&!p.prisoner&&!p.raid?.exiting).map(p=>p.id),
      ...(w.wildlife?.animals??[]).filter(a=>live(a)&&a.manhunter&&!a.manhunter.exhausted).map(a=>a.id),
      ...(w.mechanoids??[]).filter(live).map(m=>m.id)]};
},IDS);}
type Observation=Awaited<ReturnType<typeof observe>>;
const pawn=(w:World,id:number)=>w.pawns.find(p=>p.id===id)!;
const indoorFood=(s:Observation,c?:Cell)=>s.piles.filter(p=>p.item==='survival-meal'&&p.owner.type==='ground'&&(c?ground(p,c):area(p.owner)));
const free=(p:Pawn,tick:number)=>!p.draft&&!p.need&&!p.cooking&&!p.haul&&!p.rescue&&!p.tend&&!p.feed&&!p.ward&&!p.equipmentTask&&!p.research&&!p.hunting
  &&!p.recreation.task&&!p.cleaning&&!p.firefighting&&!p.burial&&!p.trade&&!p.orbitalTrade&&!p.deepWork&&!p.animalCare&&!p.animalFeed&&!p.animalHandling&&!p.animalRescue
  &&!p.surgery&&!p.heatRefuge&&!p.bombRefuge&&!p.flee&&!p.burning&&!p.priorityWork&&!p.shooting&&!p.melee&&!p.interruptedCargo&&!p.equipmentDropPending
  &&p.jobId===null&&p.orders.active===null&&!p.orders.queue.length&&p.state==='idle'&&p.moveCooldown===0&&(p.motion?.end??0)<=tick;

test('V345 distinct literal branch, physical interior provisions and actual reserve ingestion',async({page},info)=>{
  test.skip(!process.env.V345_INPUT,'Requires actual V34056911 cargo export and its SHA-bound version340 sidecar.');test.setTimeout(300000);page.setDefaultTimeout(10000);
  const started=Date.now(),deadline=started+240000,input=resolve(process.env.V345_INPUT!),errors=observeErrors(page),rotation={value:0},ring:Observation[]=[];
  let e!:Ledger,raw='',loaded=false,failure:unknown,last:Observation|undefined,completed=false,lastOrderAt=0;
  const pickups=new Map<number,Pickup>(),mealPickups=new Map<number,EatPickup>(),front=()=>page.locator('.front-menu');
  const has=(name:string)=>e.checkpoints.some(c=>c.name===name&&c.reloaded),run=async()=>{await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();};
  const guard=(s:Observation)=>{if(s.incident.simulationStopped||s.incident.graphicsFault)throw Error('Actual technical incident; preserve this branch.');
    if(s.danger.length)throw Error('New natural threat; preserve an early partial export.');
    if(s.people.length!==3||s.people.some(p=>p.health?.death||['dead','downed'].includes(p.state)||p.prisoner||p.mental?.crisis))throw Error('Original person unavailable; no forced reserve success.');};
  const capture=async(name:string,qualify?:(w:World,s:Observation)=>void,reload=true)=>{
    await pause(page);const before=await world(page);expect(validateWorld(before)).toEqual([]);last=await observe(page);if(name!=='failure-outcome')guard(last);qualify?.(before,last);
    expect(before.pawns.filter(p=>IDS.includes(p.id)).map(p=>p.id).sort((a,b)=>a-b)).toEqual(IDS);
    await page.keyboard.press('Escape');await page.screenshot({path:info.outputPath(name+'-map.png')});await panel(page,'menu');
    const manager=page.locator('[data-save-manager]'),label='V345 '+name;await manager.locator('[data-save-manager-name]').fill(label);
    await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
    const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
    const path=info.outputPath(name+'.json');await(await download).saveAs(path);const data=await readFile(path,'utf8');expect(deserializeWorld(data)).toEqual(before);
    const record={name,path,tick:before.tick,sha256:sha(data),reloaded:false,proof:last};e.checkpoints.push(record);e.snapshotTick=before.tick;e.snapshotSha256=record.sha256;
    if(reload){await page.locator('#browse-saves').click();const row=front().locator('label').filter({has:page.locator('strong').filter({hasText:label})});
      await row.locator('input[name="front-save"]').check();await front().getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,before);record.reloaded=true;}
    await writeFile(path+'.evidence.json',JSON.stringify(e,null,2));await info.attach(name,{contentType:'application/json',path});await page.keyboard.press('Escape');return before;
  };
  try{
    raw=await readFile(input,'utf8');expect(sha(raw)).toBe(INPUT_SHA);const literal=JSON.parse(raw) as World,initial=deserializeWorld(raw);
    expect([literal.schemaVersion,literal.tick]).toEqual([232,56911]);expect(initial).toEqual({...literal,schemaVersion:233});expect(validateWorld(initial)).toEqual([]);
    const side=JSON.parse(await readFile(resolve(process.env.V345_EVIDENCE??input+'.evidence.json'),'utf8'));
    expect([side.version,side.seed,side.snapshotTick,side.snapshotSha256]).toEqual([340,SEED,56911,INPUT_SHA]);expect(side.people).toEqual(IDS);
    expect([side.origin.tick,side.origin.sha256]).toEqual([39073,ORIGIN_SHA]);expect([initial.seed,initial.width,initial.height]).toEqual([SEED,250,250]);
    expect(pawn(initial,18530).need).toMatchObject({kind:'eat',phase:'ingest',sourcePileId:19615,carryPileId:19649});
    expect(pawn(initial,18532).haul).toMatchObject({sourcePileId:19650,carryPileId:19651,quantity:3,phase:'deliver'});
    expect(pawn(initial,18534).cooking?.ingredients.reduce((n,i)=>n+i.quantity,0)).toBe(10);expect(pawn(initial,18534).cooking?.ingredients.every(i=>i.pileId===19554&&i.stage==='placed')).toBe(true);
    expect(SOURCES.map(id=>initial.piles.find(p=>p.id===id)?.quantity)).toEqual([6,10]);
    for(const c of [{x:121,z:114},{x:122,z:114}]){expect(initial.stockpiles.some(z=>z.x===c.x&&z.z===c.z)).toBe(false);
      expect(initial.structures.some(s=>footprintContains(s,c))||initial.jobs.some(j=>footprintContains(j,c))).toBe(false);expect(['rock','water'].includes(initial.tiles[c.z*initial.width+c.x]!.terrain)).toBe(false);}
    e={version:345,seed:SEED,people:IDS,origin:{path:input,sha256:sha(raw),tick:initial.tick},inheritedV340:side,zoneCells:[],initialEnds:{},notes:[],responses:[],events:[],checkpoints:[]};
    e.notes.push({branch:'Distinct pre-incident56911 copy; V34466636 is preserved, never replaced.',initialEngagements:IDS.map(id=>({id,need:pawn(initial,id).need,haul:pawn(initial,id).haul,cooking:pawn(initial,id).cooking})),qualification:'Inherited ingestion19649 and inherited crop/cooking witnesses earn no reserve credit.'});
    await page.goto('/?e2e');await front().getByRole('button',{name:'Charger une partie',exact:true}).click();await front().locator('input[type=file]').setInputFiles(input);
    await expectWorld(page,initial);await pause(page);expect(await world(page)).toEqual(initial);loaded=true;guard(await observe(page));
    await perform(page,{reason:'Créer via UI les deux cellules libres de réserve intérieure',command:{type:'area',action:'stockpile',from:{x:121,z:114},to:{x:122,z:114}}},rotation);
    await page.keyboard.press('Escape');await tool(page,'select');
    for(let attempt=0;attempt<6;attempt++){await revealCells(page,[{x:121,z:114}]);await cell(page,121,114);if(await page.locator('#cell-storage').isVisible())break;}
    await expect(page.locator('#cell-title')).toContainText('Zone de stockage');await expect(page.locator('#selected-stockpile-items')).toBeVisible();
    const storage=page.locator('#selected-stockpile-items');await storage.locator('[data-storage-all="false"]').click();
    await storage.locator('[data-storage-search]').fill('survival-meal');await storage.locator('[data-storage-item="survival-meal"]').setChecked(true);
    await storage.locator('[data-storage-search]').fill('');await storage.locator('[data-storage-priority]').selectOption('3');await page.keyboard.press('Escape');
    await capture('configured',w=>{
      expect(w.tick).toBe(initial.tick);e.zoneCells=w.stockpiles.filter(area).map(c=>({id:c.id,x:c.x,z:c.z}));expect(e.zoneCells.map(c=>[c.x,c.z]).sort()).toEqual([[121,114],[122,114]]);
      for(const c of w.stockpiles.filter(area)){expect(c.priority).toBe(3);expect(Object.entries(c.filters).filter(([,v])=>v===true).map(([k])=>k)).toEqual(['food']);
        expect(Object.entries(c.items??{}).filter(([,v])=>v===true).map(([k])=>k)).toEqual(['survival-meal']);}
      expect(initial.stockpiles.every(c=>c.priority===2)).toBe(true);
      for(const id of IDS){expect(pawn(w,id).need).toEqual(pawn(initial,id).need);expect(pawn(w,id).haul).toEqual(pawn(initial,id).haul);expect(pawn(w,id).cooking).toEqual(pawn(initial,id).cooking);}
      for(const id of [19649,19651,19554])expect(w.piles.find(p=>p.id===id)).toEqual(initial.piles.find(p=>p.id===id));
    });await run();
    while(Date.now()<deadline){
      const s=await observe(page);last=s;ring.push(s);if(ring.length>20)ring.shift();expect(s.seed).toBe(SEED);expect(s.backend).toBe('WebGPU');guard(s);
      for(const event of s.events)if(event.tick>initial.tick&&!e.events.some(v=>v.tick===event.tick&&v.type===event.type&&v.message===event.message))e.events.push(event);
      for(const p of s.people){
        const original=p.id===18530?p.need?.kind==='eat'&&p.need.carryPileId===19649:p.id===18532?p.haul?.carryPileId===19651:p.cooking?.ingredients.some(i=>i.pileId===19554);
        if(!original&&e.initialEnds[p.id]===undefined)e.initialEnds[p.id]=s.tick;
        const h=p.haul,source=s.piles.find(i=>i.id===h?.sourcePileId),destinationId=h?.destination.type==='stockpile'?h.destination.stockpileId:undefined,
          destination=e.zoneCells.find(c=>c.id===destinationId);
        if(!e.cargo&&h?.phase==='pickup'&&source?.item==='survival-meal'&&source.owner.type==='ground'&&SOURCES.includes(source.id)&&destination)
          pickups.set(p.id,{tick:s.tick,pawnId:p.id,sourceId:source.id,sourceCell:{x:source.owner.x,z:source.owner.z},beforeQuantity:source.quantity,quantity:h.quantity,destinationId:destination.id,cell:{x:destination.x,z:destination.z}});
        const pickup=pickups.get(p.id),carry=s.piles.find(i=>i.id===h?.carryPileId),left=pickup&&s.piles.find(i=>i.id===pickup.sourceId);
        if(!e.cargo&&pickup&&h?.phase==='deliver'&&h.sourcePileId===pickup.sourceId&&h.quantity===pickup.quantity&&carry?.item==='survival-meal'
          &&carry.owner.type==='pawn'&&carry.owner.pawnId===p.id&&carry.quantity===pickup.quantity&&pickup.beforeQuantity-(left?.quantity??0)===carry.quantity){
          e.cargo={...pickup,carryId:carry.id,heldTick:s.tick,beforeDestination:indoorFood(s,pickup.cell)};
          await capture('provision-cargo',w=>expect(w.piles.find(i=>i.id===e.cargo!.carryId)).toMatchObject({item:'survival-meal',quantity:e.cargo!.quantity,owner:{type:'pawn',pawnId:e.cargo!.pawnId}}));await run();break;
        }
      }
      if(e.cargo&&!e.delivery){
        const c=e.cargo,carry=s.piles.find(i=>i.id===c.carryId),actor=s.people.find(p=>p.id===c.pawnId)!;
        if(carry?.owner.type==='pawn'&&carry.owner.pawnId===c.pawnId){
          if(actor.haul?.sourcePileId!==c.sourceId||actor.haul.carryPileId!==c.carryId)throw Error('Provision cargo diverted before interior delivery; no destination credit.');
          c.heldTick=s.tick;c.beforeDestination=indoorFood(s,c.cell);
        }else{
          const after=indoorFood(s,c.cell),delta=total(after)-total(c.beforeDestination);
          if(delta!==c.quantity||carry&&(!ground(carry,c.cell)||carry.item!=='survival-meal'))throw Error('Cargo vanished or mixed without an unambiguous interior quantity transfer.');
          e.delivery={tick:s.tick,quantity:delta,cell:c.cell,outputs:after.map(p=>({id:p.id,beforeQuantity:c.beforeDestination.find(b=>b.id===p.id)?.quantity??0,quantity:p.quantity,
            delta:p.quantity-(c.beforeDestination.find(b=>b.id===p.id)?.quantity??0)})).filter(p=>p.delta>0)};
          await capture('interior-delivery',(_w,at)=>expect(indoorFood(at,c.cell).some(p=>e.delivery!.outputs.some(q=>q.id===p.id))).toBe(true));await run();continue;
        }
      }
      for(const p of s.people){
        const n=p.need?.kind==='eat'?p.need:undefined,source=s.piles.find(i=>i.id===n?.sourcePileId);
        if(e.delivery&&!e.mealCargo&&n?.phase==='pickup'&&source?.item==='survival-meal'&&source.owner.type==='ground'&&area(source.owner)
          &&e.delivery!.outputs.some(i=>i.id===source.id))mealPickups.set(p.id,{tick:s.tick,pawnId:p.id,name:p.name,sourceId:source.id,sourceCell:{x:source.owner.x,z:source.owner.z},beforeQuantity:source.quantity,quantity:n.quantity,hunger:p.hunger});
        const pickup=mealPickups.get(p.id),portion=s.piles.find(i=>i.id===n?.carryPileId),left=pickup&&s.piles.find(i=>i.id===pickup.sourceId);
        if(!e.mealCargo&&pickup&&n&&n.phase!=='pickup'&&n.sourcePileId===pickup.sourceId&&portion?.item==='survival-meal'&&portion.owner.type==='pawn'&&portion.owner.pawnId===p.id
          &&portion.quantity===pickup.quantity&&(portion.id===pickup.sourceId?pickup.beforeQuantity===portion.quantity:pickup.beforeQuantity-(left?.quantity??0)===portion.quantity)){
          e.mealCargo={...pickup,carryId:portion.id,heldTick:s.tick};await capture('meal-cargo',w=>expect(w.piles.find(i=>i.id===e.mealCargo!.carryId)).toMatchObject({item:'survival-meal',quantity:e.mealCargo!.quantity,owner:{type:'pawn',pawnId:p.id}}));await run();break;
        }
        if(e.mealCargo&&!e.ingestion&&n?.phase==='ingest'&&p.id===e.mealCargo.pawnId&&n.sourcePileId===e.mealCargo.sourceId&&n.carryPileId===e.mealCargo.carryId&&portion?.item==='survival-meal'){
          if(!inShelter(p)||!stationary(p,s.tick))throw Error('Food came from the indoor reserve but actual ingestion is outside or moving; preserve the narrower proof.');
          e.ingestion={tick:s.tick,lastTick:s.tick,pawnId:p.id,name:p.name,sourceId:n.sourcePileId!,carryId:n.carryPileId!,quantity:n.quantity,progress:n.progress,hunger:p.hunger,cell:{x:p.x,z:p.z}};
          await capture('reserve-ingestion',w=>{const eater=pawn(w,p.id);expect(eater.need).toMatchObject({kind:'eat',phase:'ingest',sourcePileId:e.ingestion!.sourceId,carryPileId:e.ingestion!.carryId});expect(inShelter(eater)&&stationary(eater,w.tick)).toBe(true);expect({x:eater.x,z:eater.z}).toEqual(e.ingestion!.cell);});await run();break;
        }
      }
      if(e.ingestion&&!e.eaten){
        const a=e.ingestion,p=s.people.find(p=>p.id===a.pawnId)!,n=p.need?.kind==='eat'?p.need:undefined,portion=s.piles.find(i=>i.id===a.carryId);
        if(n?.phase==='ingest'&&n.sourcePileId===a.sourceId&&n.carryPileId===a.carryId&&n.progress>=a.progress&&portion?.item==='survival-meal'
          &&portion.owner.type==='pawn'&&portion.owner.pawnId===a.pawnId&&portion.quantity===a.quantity){
          if(!inShelter(p)||!stationary(p,s.tick)||p.x!==a.cell.x||p.z!==a.cell.z)throw Error('Interior ingestion lost its actual stationary cell.');
          a.lastTick=s.tick;a.progress=n.progress;}
        else{
          const event=s.events.find(v=>v.tick>a.lastTick&&v.tick<=s.tick&&v.type==='need'&&[`${a.name} a mangé une portion (${a.quantity} × Repas de survie) sans table.`,`${a.name} a mangé une portion (${a.quantity} × Repas de survie) à table.`].includes(v.message));
          if(!portion&&event&&p.hunger>a.hunger){e.eaten={...a,completedTick:event.tick,hungerAfter:p.hunger,event};
            await capture('interior-consumed',w=>{expect(w.piles.find(i=>i.id===a.carryId)).toBeUndefined();expect(pawn(w,a.pawnId).hunger).toBeGreaterThan(a.hunger);});completed=true;break;}
          throw Error('Reserve ingestion interrupted or lacking continuous portion/event/hunger proof.');
        }
      }
      if(!e.cargo&&Date.now()-lastOrderAt>10000){
        lastOrderAt=Date.now();await pause(page);const w=await world(page);guard(await observe(page));
        const actor=w.pawns.find(p=>IDS.includes(p.id)&&e.initialEnds[p.id]!==undefined&&free(p,w.tick));
        if(actor){const candidate=SOURCES.map(id=>w.piles.find(p=>p.id===id)).find(p=>p?.item==='survival-meal'&&p.owner.type==='ground');
          if(candidate){const target={type:'pile' as const,pileId:candidate.id},proposal=planHaulOrder(w,actor,target),dest=proposal.task?.destination;
            if(proposal.task&&dest?.type==='stockpile'&&e.zoneCells.some(c=>c.id===dest.stockpileId)){
              await perform(page,{reason:'Transport civil réel après fin de son engagement initial, destination proposée par le jeu',command:{type:'order-haul',pawnId:actor.id,target,queue:false}},rotation);
              e.responses.push({tick:w.tick,pawnId:actor.id,sourceId:candidate.id,acceptedProposal:proposal});
            }else e.notes.push({tick:w.tick,pawnId:actor.id,sourceId:candidate.id,haulNotOrdered:proposal.reason??'Actual destination is not the interior reserve.'});
          }
        }
        await run();
      }
      await page.waitForTimeout(150);
    }
    if(!completed)throw Error('Four-minute interior reserve/ingestion budget reached; acquired partial stages only.');expect(errors).toEqual([]);
  }catch(error){failure=error;e?.notes.push({failure:String(error)});throw error;}
  finally{
    let exportFailure:unknown;if(loaded&&failure)try{await capture('failure-outcome',undefined,false);}catch(error){exportFailure=error;e.notes.push({exportFailure:String(error)});}
    const path=info.outputPath('colony-reserve-summary.json');await writeFile(path,JSON.stringify({input,inputSha256:raw?sha(raw):null,elapsedMs:Date.now()-started,
      result:failure||exportFailure?'partial-failure':completed?'existing-provisions-delivered-and-consumed':'not-loaded',failure:String(failure??exportFailure??''),
      qualification:'Distinct56911 branch: existing survival provisions only; observed splits/merges preserve quantities, not a fictional unit genealogy. No new food production, V344 recovery, sufficient reserve or full early access certified.',
      evidence:e??null,last,errors,observations:ring},null,2));await info.attach('colony-reserve-summary',{contentType:'application/json',path});
  }
});