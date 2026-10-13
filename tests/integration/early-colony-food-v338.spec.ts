import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {world,pause,panel,expectWorld,observeErrors,tool,cell,settledCells} from './helpers';
import {perform,revealCells,inspectPerson} from './player-actions';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {PRODUCTION_RECIPES,type ProductionIngredient} from '../../src/sim/production-recipes';
import {plantGrowth} from '../../src/sim/plants';
import {shotPlan,shootingQueries} from '../../src/sim/shooting';
import {readColonistAvailability} from '../../src/ui/colonist-availability';
import type {BillSettings} from '../../src/sim/cooking-types';
import type {Cell,Command,World,WorldEvent} from '../../src/sim/types';

/** Opt-in native continuation, never a fixture factory. Example ROOT inputs:
 * V338_INPUT=<real dawn export> V338_STAGE=setup
 * V338_INPUT=<acquired setup/failure export> V338_STAGE=campaign
 * Each export has an adjacent .evidence.json tied to its exact file SHA256.
 * V338_EVIDENCE overrides that sidecar path. Later inputs require the sidecar;
 * no previous harvest, ingestion or incident outcome is inferred from a save.
 */
const ORIGINAL=[18530,18532,18534] as const;
const IRIS=18530,GAEL=18532,LEONIE=18534,RIFLE=18558,SEED=3398550437;
const FIELD={from:{x:110,z:116},to:{x:119,z:123}},STOVE={x:126,z:116};
const fieldCell=(c:Cell)=>c.x>=110&&c.x<=119&&c.z>=116&&c.z<=123;
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
const front=(page:Page)=>page.locator('.front-menu');
const frontButton=(page:Page,name:string)=>front(page).getByRole('button',{name,exact:true});
const riceSettings:BillSettings={mode:'until',target:6,suspended:false,radius:30,destination:'stockpile',
  filters:Object.fromEntries(PRODUCTION_RECIPES['simple-meal'].inputs.map(item=>[item,item==='rice'])) as Partial<Record<ProductionIngredient,boolean>>};

interface PlantWitness extends Cell {id:number;bornAt:number;tick:number}
interface HarvestWitness extends PlantWitness {harvestTick:number;pileIds:number[]}
interface IngestWitness {pawnId:number;name:string;pileId:number;sourcePileId:number;quantity:number;hunger:number;tick:number;
  lastProgress?:number;lastObservedTick?:number;interruptedTick?:number;interruptionReason?:string}
interface Evidence {
  version:1;seed:number;people:number[];origin:{path:string;sha256:string;tick:number};
  snapshotSha256?:string;snapshotTick?:number;zoneId?:number;stationId?:number;billId?:number;
  initialRations:number;initialSteel:number;setupComplete:boolean;
  sown:PlantWitness[];harvestable:{id:number;tick:number;growth:number;jobId?:number}[];
  harvested:HarvestWitness[];reseeded:(PlantWitness&{previousId:number})[];
  riceTransport:{tick:number;pawnId:number;pileId:number;quantity:number;purpose:string}[];
  recipeWork:{tick:number;pawnId:number;stationId:number;billId:number;ingredients:{pileId:number;quantity:number;stage:string;pileQuantity:number}[]}[];
  products:{id:number;tick:number;quantity:number;consumedRice:number;pawnId:number}[];
  ingestStarted:IngestWitness[];eaten:(IngestWitness&{completedTick:number;hungerAfter:number;event:WorldEvent})[];
  events:WorldEvent[];responses:{tick:number;kind:string;ids:number[];action:string}[];
  checkpoints:{name:string;path:string;tick:number;sha256:string;reloaded:boolean}[];
}

/** Return only current people/tasks, field crops, relevant piles and incidents.
 * No tile array, full possessions capture, command, timer or renderer hook. */
async function observe(page:Page,zoneId?:number){
  return page.evaluate(({ids,zoneId})=>{
    const w=window.__lisiere.world;
    const inField=(c:{x:number;z:number})=>c.x>=110&&c.x<=119&&c.z>=116&&c.z<=123;
    return {tick:w.tick,seed:w.seed,nextId:w.nextId,backend:window.__lisiere.backend,incident:window.__lisiere.incident,
      speed:document.querySelector('[data-speed][aria-pressed="true"]')?.getAttribute('data-speed'),
      people:w.pawns.filter(p=>ids.includes(p.id)).map(p=>({id:p.id,name:p.name,x:p.x,z:p.z,state:p.state,
        hunger:p.hunger,rest:p.rest,mood:p.mood,recreation:p.recreation,jobId:p.jobId,haul:p.haul,cooking:p.cooking,need:p.need,draft:p.draft,
        shooting:p.shooting,rescue:p.rescue,tend:p.tend,mental:p.mental,health:p.health,motion:p.motion,
        equipmentTask:p.equipmentTask,prisoner:!!p.prisoner})),
      crops:w.resources.filter(r=>r.kind==='rice'&&inField(r)).map(r=>({id:r.id,x:r.x,z:r.z,growth:r.growth,
        growthTick:r.growthTick,plantLife:r.plantLife,blight:r.blight})),
      jobs:w.jobs.filter(j=>j.growingZoneId===zoneId||j.kind==='fueled-stove').map(j=>({id:j.id,kind:j.kind,
        x:j.x,z:j.z,zoneId:j.growingZoneId,progress:j.progress,status:j.status,reservedBy:j.reservedBy})),
      zone:w.growingZones.find(z=>z.id===zoneId),
      station:w.structures.find(s=>s.kind==='fueled-stove'&&s.x===126&&s.z===116),
      horseshoes:w.structures.find(s=>s.kind==='horseshoes'&&s.x===118&&s.z===108),
      piles:w.piles.filter(p=>['rice','simple-meal','survival-meal','steel','wood','medicine'].includes(p.item)||p.id===18558)
        .map(p=>({id:p.id,item:p.item,quantity:p.quantity,owner:p.owner,rot:p.rot,weapon:p.weapon})),
      raiders:w.pawns.filter(p=>p.raid).map(p=>({id:p.id,name:p.name,x:p.x,z:p.z,state:p.state,raid:p.raid,death:p.health?.death})),
      animals:(w.wildlife?.animals??[]).filter(a=>a.manhunter).map(a=>({id:a.id,species:a.species,x:a.x,z:a.z,
        state:a.state,manhunter:a.manhunter,death:a.health?.death})),
      raids:w.raids?{profile:w.raids.profile,serial:w.raids.serial,nextCheck:w.raids.nextCheck,active:w.raids.active,last:w.raids.last}:undefined,
      smallIncidents:w.smallIncidents,fires:(w.fires?.items??[]).filter(f=>f.x>=105&&f.x<=135&&f.z>=105&&f.z<=128),
      events:w.events,
    };
  },{ids:[...ORIGINAL] as number[],zoneId});
}
type Observation=Awaited<ReturnType<typeof observe>>;

function remember(e:Evidence,s:Observation){
  for(const event of s.events)if(!e.events.some(old=>old.tick===event.tick&&old.type===event.type&&old.message===event.message))e.events.push(event);
  for(const crop of s.crops){
    if(crop.plantLife?.bornAt===undefined)continue;
    const witness={id:crop.id,x:crop.x,z:crop.z,bornAt:crop.plantLife.bornAt,tick:s.tick};
    if(!e.sown.some(p=>p.id===crop.id))e.sown.push(witness);
    const old=e.harvested.find(p=>p.x===crop.x&&p.z===crop.z&&p.id!==crop.id&&crop.plantLife!.bornAt!>p.bornAt);
    if(old&&!e.reseeded.some(p=>p.id===crop.id))e.reseeded.push({...witness,previousId:old.id});
  }
  for(const old of e.sown){
    if(s.crops.some(p=>p.id===old.id)||e.harvested.some(p=>p.id===old.id)||!e.harvestable.some(p=>p.id===old.id))continue;
    const output=s.piles.filter(p=>p.item==='rice'&&p.owner.type==='ground'&&p.owner.x===old.x&&p.owner.z===old.z);
    // A vanished plant alone might be a loss. Require harvestable plant plus its
    // physical ground output; failed yield/destruction cannot certify harvest.
    if(output.length)e.harvested.push({...old,harvestTick:s.tick,pileIds:output.map(p=>p.id)});
  }
  for(const p of s.people){
    const held=s.piles.filter(i=>i.item==='rice'&&i.owner.type==='pawn'&&i.owner.pawnId===p.id);
    for(const pile of held)if(!e.riceTransport.some(t=>t.pileId===pile.id&&t.pawnId===p.id))e.riceTransport.push({tick:s.tick,pawnId:p.id,pileId:pile.id,
      quantity:pile.quantity,purpose:p.cooking?'cooking':p.haul?'haul':'held'});
    const c=p.cooking;
    if(c?.phase==='work'&&c.stationId===e.stationId&&c.billId===e.billId&&c.recipe===undefined&&
      c.ingredients.length&&c.ingredients.every(i=>i.item==='rice'&&i.stage==='placed')&&c.ingredients.reduce((n,i)=>n+i.quantity,0)===10){
      const witness={tick:s.tick,pawnId:p.id,stationId:c.stationId,billId:c.billId,
        ingredients:c.ingredients.map(i=>({pileId:i.pileId,quantity:i.quantity,stage:i.stage,pileQuantity:s.piles.find(p=>p.id===i.pileId)!.quantity}))};
      const index=e.recipeWork.findIndex(t=>t.pawnId===p.id&&t.ingredients.map(i=>i.pileId).join(',')===c.ingredients.map(i=>i.pileId).join(','));
      if(index<0)e.recipeWork.push(witness);else e.recipeWork[index]=witness;
    }
    if(c?.phase==='output'&&c.productId!==null&&c.stationId===e.stationId&&c.billId===e.billId&&c.recipe===undefined){
      const product=s.piles.find(i=>i.id===c.productId&&i.item==='simple-meal');
      const work=e.recipeWork.filter(t=>t.pawnId===p.id&&t.stationId===c.stationId&&t.billId===c.billId&&t.tick<=s.tick).at(-1);
      // Several recipe allocations may share one merged physical pile. Count
      // its actual before/after quantity once, including resumed v1 sidecars.
      const physicalIngredients=new Map<number,number>();
      for(const ingredient of work?.ingredients??[]){
        const previous=physicalIngredients.get(ingredient.pileId);
        if(previous!==undefined)expect(ingredient.pileQuantity,'Même pile physique, même quantité avant cuisson').toBe(previous);
        physicalIngredients.set(ingredient.pileId,ingredient.pileQuantity);
      }
      const consumedRice=work?[...physicalIngredients].reduce((n,[id,before])=>n+before-(s.piles.find(p=>p.id===id)?.quantity??0),0):undefined;
      if(product&&consumedRice===10&&!e.products.some(i=>i.id===product.id))
        e.products.push({id:product.id,tick:s.tick,quantity:product.quantity,consumedRice,pawnId:p.id});
    }
    const need=p.need;
    if(need?.kind==='eat'&&need.phase==='ingest'&&need.carryPileId!==null){
      const portion=s.piles.find(i=>i.id===need.carryPileId&&i.item==='simple-meal'&&i.owner.type==='pawn'&&i.owner.pawnId===p.id);
      if(portion&&need.sourcePileId!==null&&e.products.some(i=>i.id===need.sourcePileId)
        &&!e.ingestStarted.some(i=>i.pileId===portion.id&&i.interruptedTick===undefined)&&!e.eaten.some(i=>i.pileId===portion.id)){
        expect(portion.quantity).toBe(need.quantity);
        e.ingestStarted.push({pawnId:p.id,name:p.name,pileId:portion.id,sourcePileId:need.sourcePileId,quantity:portion.quantity,hunger:p.hunger,tick:s.tick,
          lastProgress:need.progress,lastObservedTick:s.tick});
      }
    }
    for(const start of e.ingestStarted.filter(i=>i.pawnId===p.id&&i.interruptedTick===undefined&&!e.eaten.some(done=>done.pileId===i.pileId))){
      const portion=s.piles.find(i=>i.id===start.pileId);
      const continuing=need?.kind==='eat'&&need.phase==='ingest'&&need.carryPileId===start.pileId&&need.sourcePileId===start.sourcePileId
        &&need.quantity===start.quantity&&portion?.item==='simple-meal'&&portion.quantity===start.quantity
        &&portion.owner.type==='pawn'&&portion.owner.pawnId===start.pawnId;
      if(continuing&&(start.lastProgress===undefined||need.progress>=start.lastProgress)){
        start.lastProgress=need.progress;start.lastObservedTick=s.tick;continue;
      }
      // A completion event may discharge only one uninterrupted, physically
      // identified attempt. A later meal cannot revive an interrupted attempt.
      const event=e.events.find(v=>v.tick>(start.lastObservedTick??start.tick)&&v.tick<=s.tick&&v.type==='need'
        &&v.message===`${start.name} a mangé une portion (${start.quantity} × Repas simple) sans table.`
        &&!e.eaten.some(done=>done.event.tick===v.tick&&done.event.type===v.type&&done.event.message===v.message));
      if(!continuing&&event&&!portion&&p.hunger>start.hunger&&e.products.some(product=>product.id===start.sourcePileId&&product.consumedRice===10))
        e.eaten.push({...start,completedTick:event.tick,hungerAfter:p.hunger,event});
      else {start.interruptedTick=s.tick;start.interruptionReason=continuing?'ingestion progress reset':'identified ingestion no longer active without completion proof';}
    }
  }
}

async function act(page:Page,command:Command,reason:string,rotation:{value:number}){
  if(command.type==='schedule-paint'){
    await panel(page,'schedule');await page.locator(`[data-schedule-brush="${command.assignment}"]`).click();
    for(const hour of command.hours){
      const target=page.locator(`[data-schedule-pawn="${command.pawnId}"][data-schedule-hour="${hour}"]`);
      await target.focus();await target.press('Enter');
    }
    await expect.poll(()=>page.evaluate(c=>{
      const pawn=window.__lisiere.world.pawns.find(p=>p.id===c.pawnId);
      return !!pawn&&c.hours.every(h=>pawn.schedule[h]===c.assignment);
    },command)).toBe(true);
    await page.keyboard.press('Escape');return;
  }
  await perform(page,{reason,command},rotation);await page.keyboard.press('Escape');
}
async function speed(page:Page,value:1|6){await page.keyboard.press('Escape');await page.locator(`[data-speed="${value}"]`).click();}

async function checkpoint(page:Page,info:TestInfo,e:Evidence,name:string,reload=true):Promise<World>{
  await pause(page);const before=await world(page);expect(validateWorld(before),'Checkpoint moteur réel et propriétaires uniques').toEqual([]);
  expect(before.seed).toBe(SEED);expect(before.pawns.filter(p=>ORIGINAL.includes(p.id as typeof ORIGINAL[number])).map(p=>p.id).sort((a,b)=>a-b)).toEqual([...ORIGINAL]);
  remember(e,await observe(page,e.zoneId));await page.keyboard.press('Escape');
  await page.screenshot({path:info.outputPath(name+'-map.png')});
  await panel(page,'menu');const manager=page.locator('[data-save-manager]');
  await manager.locator('[data-save-manager-name]').fill('V338 '+name);
  await manager.locator('[data-save-manager-action="create"]').click();
  await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const downloaded=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
  const path=info.outputPath(name+'.json');await (await downloaded).saveAs(path);
  const raw=await readFile(path,'utf8');expect(deserializeWorld(raw),'Export exact, including cargo and RNG').toEqual(before);
  const record={name,path,tick:before.tick,sha256:hash(raw),reloaded:false};e.checkpoints.push(record);
  if(reload){
    await page.locator('#browse-saves').click();
    const row=front(page).locator('label').filter({has:page.locator('strong').filter({hasText:'V338 '+name})});
    await row.locator('input[name="front-save"]').check();await frontButton(page,'Charger').click();await expectWorld(page,before);
    record.reloaded=true;
  }
  e.snapshotSha256=record.sha256;e.snapshotTick=before.tick;
  await writeFile(path+'.evidence.json',JSON.stringify(e,null,2));
  await info.attach(name+'-checkpoint',{contentType:'application/json',body:JSON.stringify(record)});return before;
}

/** Only the actual target/order is selected. The read-only shot planner uses a
 * paused, confirmed snapshot to avoid manufacturing a range/LOS permission. */
async function shootVisible(page:Page,targetId:number){
  await page.keyboard.press('Escape');await page.locator(`[data-pawn="${GAEL}"]`).click();
  const target=await page.evaluate(id=>window.__lisiere.world.pawns.find(p=>p.id===id)??window.__lisiere.world.wildlife?.animals.find(p=>p.id===id),targetId);
  if(!target)throw Error('La menace choisie a quitté la carte.');await revealCells(page,[target]);
  await expect(page.locator('#target-shot')).toBeVisible();await page.locator('#target-shot').click();
  // revealCells checks the ground projection. The actor's higher body proxy
  // can still be covered by the Bio inspector after arming the shot. Reframe
  // that exact body through ordinary middle-button pans, then reproject it.
  let point:{x:number;y:number}|undefined;
  for(let attempt=0;attempt<12;attempt++){
    await settledCells(page,[target]);
    const frame=await page.evaluate(({id,target})=>{
      const canvas=document.querySelector<HTMLCanvasElement>('#viewport canvas')!,b=canvas.getBoundingClientRect();
      const body=window.__lisiere.projectPawn(id),ground=window.__lisiere.projectCell(target.x,target.z);
      const center=body??{x:b.x+ground.x,y:b.y+ground.y};
      const clear=!!body&&[[0,0],[-10,0],[10,0],[0,-10],[0,10]].every(([dx,dy])=>document.elementFromPoint(body.x+dx,body.y+dy)===canvas);
      if(clear)return {body,clear,anchor:center,center};
      const preferred={x:b.x+b.width*.72,y:b.y+b.height*.30};let anchor:{x:number;y:number;score:number}|undefined;
      for(let y=b.top+18;y<b.bottom-18;y+=24)for(let x=b.left+18;x<b.right-18;x+=24){
        if(![[0,0],[-10,0],[10,0],[0,-10],[0,10]].every(([dx,dy])=>document.elementFromPoint(x+dx,y+dy)===canvas))continue;
        const score=Math.hypot(x-preferred.x,y-preferred.y);if(!anchor||score<anchor.score)anchor={x,y,score};
      }
      if(!anchor)throw Error('Aucune surface de carte libre pour cadrer le tir.');
      return {body,clear,anchor,center};
    },{id:targetId,target:{x:target.x,z:target.z}});
    if(frame.clear&&frame.body){point=frame.body;break;}
    const center=frame.center;
    await page.mouse.move(frame.anchor.x,frame.anchor.y);await page.mouse.down({button:'middle'});
    await page.mouse.move(frame.anchor.x+Math.max(-250,Math.min(250,frame.anchor.x-center.x)),
      frame.anchor.y+Math.max(-180,Math.min(180,frame.anchor.y-center.y)),{steps:8});
    await page.mouse.up({button:'middle'});
  }
  if(!point)throw Error('Le cadrage utilisateur n’a pas dégagé la projection corporelle de la menace.');
  expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,point)).toBe('CANVAS');
  await page.mouse.click(point.x,point.y);
  await expect.poll(()=>page.evaluate(id=>window.__lisiere.world.pawns.find(p=>p.id===18532)?.shooting?.order?.targetId,targetId)).toBe(targetId);
  await page.keyboard.press('Escape');
}

function threats(s:Observation){
  return [...s.animals.filter(a=>!a.death&&!a.manhunter?.exhausted&&!['dead','downed'].includes(a.state)).map(a=>({id:a.id,x:a.x,z:a.z,kind:'animal'})),
    ...s.raiders.filter(p=>!p.death&&!p.raid?.exiting&&!['dead','downed'].includes(p.state)).map(p=>({id:p.id,x:p.x,z:p.z,kind:'raid'}))];
}
const capable=(p:Observation['people'][number])=>!p.health?.death&&!['dead','downed'].includes(p.state)&&!p.mental?.crisis&&!p.prisoner;

test('V338 native dawn continuation: real rice, custody, cooking, eating and reseeding',async({page},info)=>{
  test.skip(!process.env.V338_INPUT,'V338_INPUT doit désigner un vrai checkpoint natif acquis.');
  test.setTimeout(1_200_000);const started=Date.now(),deadline=started+1_080_000,errors=observeErrors(page),rotation={value:0};
  const input=resolve(process.env.V338_INPUT!),raw=await readFile(input,'utf8'),inputWorld=deserializeWorld(raw);
  const stage=process.env.V338_STAGE??'setup';expect(['setup','campaign']).toContain(stage);
  expect(validateWorld(inputWorld)).toEqual([]);expect(inputWorld.seed).toBe(SEED);expect(inputWorld.site?.biome).toBe('temperate-forest');
  expect(inputWorld.width).toBe(250);expect(inputWorld.height).toBe(250);
  expect(inputWorld.pawns.filter(p=>ORIGINAL.includes(p.id as typeof ORIGINAL[number])).map(p=>p.id).sort((a,b)=>a-b)).toEqual([...ORIGINAL]);
  let e:Evidence;
  if(inputWorld.tick===6145&&!inputWorld.growingZones.length){
    expect(inputWorld.piles.filter(p=>p.item==='survival-meal').reduce((n,p)=>n+p.quantity,0)).toBe(44);
    expect(inputWorld.piles.filter(p=>p.item==='rice'||p.item==='simple-meal')).toEqual([]);
    e={version:1,seed:SEED,people:[...ORIGINAL],origin:{path:input,sha256:hash(raw),tick:inputWorld.tick},
      initialRations:44,initialSteel:inputWorld.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0),setupComplete:false,
      sown:[],harvestable:[],harvested:[],reseeded:[],riceTransport:[],recipeWork:[],products:[],ingestStarted:[],eaten:[],events:[],responses:[],checkpoints:[]};
  }else{
    e=JSON.parse(await readFile(resolve(process.env.V338_EVIDENCE??input+'.evidence.json'),'utf8')) as Evidence;
    expect(e.version).toBe(1);expect(e.seed).toBe(SEED);expect(e.people).toEqual([...ORIGINAL]);
    expect(e.origin.tick).toBe(6145);expect(e.snapshotSha256,'Reprise des preuves liée au fichier acquis').toBe(hash(raw));expect(e.snapshotTick).toBe(inputWorld.tick);
    // Optional attempt fields keep old v1 evidence readable. Resume only the
    // exact portion still being ingested in the acquired export; never infer
    // an old completion from a later event or overwrite the input sidecar.
    for(const start of e.ingestStarted.filter(i=>i.interruptedTick===undefined&&!e.eaten.some(done=>done.pileId===i.pileId))){
      const pawn=inputWorld.pawns.find(p=>p.id===start.pawnId),need=pawn?.need,portion=inputWorld.piles.find(p=>p.id===start.pileId);
      if(!(need?.kind==='eat'&&need.phase==='ingest'&&need.carryPileId===start.pileId&&need.sourcePileId===start.sourcePileId
        &&need.quantity===start.quantity&&portion?.item==='simple-meal'&&portion.quantity===start.quantity
        &&portion.owner.type==='pawn'&&portion.owner.pawnId===start.pawnId)){
        start.interruptedTick=inputWorld.tick;start.interruptionReason='attempt not active in acquired continuation';
      }
    }
  }
  const observations:Observation[]=[],notes:unknown[]=[],checkpoints=new Set(e.checkpoints.map(c=>c.name));let failure:unknown,loaded=false;
  let defending=false,lastTactical=0,lastMedical=0,slow=!!e.harvested.length||!!e.recipeWork.length;
  let lastGrowthTick=-1200,lastProgressTick=-600,lastProgressAt=0;
  const growthReadings:{tick:number;maxGrowth:number;harvestable:number}[]=[];
  const take=async()=>{const s=await observe(page,e.zoneId);remember(e,s);observations.push(s);
    if(observations.length>240)observations.shift();
    if(s.tick-lastProgressTick>=600||Date.now()-lastProgressAt>=30000){
      lastProgressTick=s.tick;lastProgressAt=Date.now();const foods={rice:0,'simple-meal':0,'survival-meal':0};
      for(const pile of s.piles)if(pile.item in foods)foods[pile.item as keyof typeof foods]+=pile.quantity;
      console.log('V338 progress '+JSON.stringify({tick:s.tick,stage,plants:s.crops.length,growth:growthReadings.at(-1),foods,
        stove:s.station?.id,fuel:s.station?.fuel,alive:s.people.filter(capable).map(p=>p.id),threats:threats(s),
        witnesses:{harvests:e.harvested.length,cargos:e.riceTransport.length,products:e.products.length,eaten:e.eaten.length,reseeded:e.reseeded.length}}));
    }
    return s;
  };
  try{
    await info.attach('input-provenance',{contentType:'application/json',body:JSON.stringify({path:input,sha256:hash(raw),tick:inputWorld.tick,stage,origin:e.origin})});
    await page.goto('/?e2e');await frontButton(page,'Charger une partie').click();await front(page).locator('input[type=file]').setInputFiles(input);
    await expectWorld(page,inputWorld);await pause(page);expect(await world(page)).toEqual(inputWorld);loaded=true;
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    const guide=page.locator('.learning-readout');if(await guide.count()&&await guide.isVisible()){
      if(await guide.evaluate(n=>(n as HTMLDetailsElement).open))await guide.locator(':scope > summary').click();
    }
    await take();
    if(!e.setupComplete){
      if(e.zoneId===undefined){
        await act(page,{type:'area',action:'growing',...FIELD},'Champ libre de quatre-vingts cases observé dans le dawn natif',rotation);
        const w=await world(page),zone=w.growingZones.find(z=>z.cells.includes(116*w.width+110));expect(zone).toBeTruthy();e.zoneId=zone!.id;
      }
      await act(page,{type:'growing-policy',zoneId:e.zoneId!,plant:'rice',allowSow:true,allowCut:true},'Semis et récolte automatique de riz',rotation);
      for(const [pawnId,work,value] of [[IRIS,'grow',1],[LEONIE,'cook',1],[GAEL,'build',1],[GAEL,'haul',2]] as const)
        await act(page,{type:'priority',pawnId,work,value},'Travail par les personnes et compétences réelles',rotation);
      for(const pawnId of ORIGINAL)await act(page,{type:'schedule-paint',pawnId,hours:[18,19],assignment:'recreation'},'Deux heures de loisirs, sommeil initial conservé',rotation);
      const w=await world(page);
      if(!w.structures.some(s=>s.kind==='fueled-stove'&&s.x===STOVE.x&&s.z===STOVE.z)&&!w.jobs.some(j=>j.kind==='fueled-stove'&&j.x===STOVE.x&&j.z===STOVE.z))
        await act(page,{type:'designate',kind:'fueled-stove',...STOVE,orientation:0,material:'steel'},'Cuisinière extérieure construite avec quatre-vingts aciers existants',rotation);
      if(!w.structures.some(s=>s.kind==='horseshoes'&&s.x===118&&s.z===108)&&!w.jobs.some(j=>j.kind==='horseshoes'&&j.x===118&&j.z===108))
        await act(page,{type:'designate',kind:'horseshoes',x:118,z:108,material:'wood'},'Fers à cheval : dix bois existants, cellule libre observée',rotation);
      const rifle=w.piles.find(p=>p.id===RIFLE);expect(rifle?.item).toBe('bolt-action-rifle');
      if(rifle?.owner.type!=='equipment'||rifle.owner.pawnId!==GAEL)
        await act(page,{type:'order-equipment',pawnId:GAEL,itemId:RIFLE,action:'equip',queue:false},'Gaël prend le fusil original',rotation);
      await speed(page,6);
      await expect.poll(async()=>{
        const s=await take();if(s.tick>18000||Date.now()>Math.min(deadline,started+240000))throw Error('Préparation naturelle hors budget court ; reprendre son export réel.');
        return s.crops.length>=8&&!!s.station&&!!s.horseshoes&&s.piles.some(p=>p.id===RIFLE&&p.owner.type==='equipment'&&p.owner.pawnId===GAEL);
      },{timeout:240000,intervals:[500]}).toBe(true);
      await pause(page);const built=await world(page),station=built.structures.find(s=>s.kind==='fueled-stove'&&s.x===STOVE.x&&s.z===STOVE.z)!;
      expect(station.material).toBe('steel');expect(station.orientation).toBe(0);e.stationId=station.id;
      expect(built.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0)).toBe(e.initialSteel-80);
      expect(built.growingZones.find(z=>z.id===e.zoneId)?.cells).toHaveLength(80);
      if(!station.bills?.length)await act(page,{type:'bill-add',structureId:station.id,recipe:'simple-meal'},'Une seule recette de repas simple',rotation);
      e.billId=(await world(page)).structures.find(s=>s.id===station.id)!.bills!.find(b=>b.recipe==='simple-meal')!.id;
      await act(page,{type:'bill-update',structureId:station.id,billId:e.billId,settings:riceSettings},'Jusqu’à six repas, uniquement le riz, dépôt en stock',rotation);
      const bill=(await world(page)).structures.find(s=>s.id===e.stationId)!.bills!.find(b=>b.id===e.billId)!;
      expect({...bill,id:undefined,recipe:undefined}).toEqual({...riceSettings,id:undefined,recipe:undefined});
      e.setupComplete=true;await checkpoint(page,info,e,'setup');checkpoints.add('setup');
    }
    expect(e.setupComplete).toBe(true);expect(e.zoneId).toBeDefined();expect(e.stationId).toBeDefined();expect(e.billId).toBeDefined();
    const configured=await world(page),station=configured.structures.find(s=>s.id===e.stationId),bill=station?.bills?.find(b=>b.id===e.billId);
    expect(station?.kind).toBe('fueled-stove');expect(station?.x).toBe(STOVE.x);expect(station?.z).toBe(STOVE.z);
    expect(bill?.recipe).toBe('simple-meal');expect({...bill,id:undefined,recipe:undefined}).toEqual({...riceSettings,id:undefined,recipe:undefined});
    expect(configured.growingZones.find(z=>z.id===e.zoneId)).toMatchObject({plant:'rice',allowSow:true,allowCut:true});
    expect(configured.growingZones.find(z=>z.id===e.zoneId)?.cells).toEqual(Array.from({length:80},(_,i)=>(116+Math.floor(i/10))*configured.width+110+i%10));
    for(const p of configured.pawns.filter(p=>ORIGINAL.includes(p.id as typeof ORIGINAL[number]))){
      expect(p.schedule[18]).toBe('recreation');expect(p.schedule[19]).toBe('recreation');
    }
    if(stage==='setup'){expect(errors).toEqual([]);return;}
    await speed(page,slow?1:6);
    while(Date.now()<deadline){
      let s=await take();expect(s.seed).toBe(SEED);expect(s.backend).toBe('WebGPU');
      if(s.incident.simulationStopped||s.incident.graphicsFault)throw Error('Incident technique réel : sauvegarder sans continuer une simulation arrêtée.');
      const dead=s.people.filter(p=>p.state==='dead'||p.health?.death);
      if(dead.length){notes.push({tick:s.tick,deaths:dead,availability:readColonistAvailability(await world(page))});throw Error('Décès réel d’une personne initiale : progression partielle conservée, aucune réussite alimentaire forcée.');}
      if(!s.people.some(capable)){notes.push({tick:s.tick,availability:readColonistAvailability(await world(page))});throw Error('Aucun colon local contrôlable : campagne laissée ouverte, checkpoint conservé.');}
      if(s.tick>100000)throw Error('Budget de ticks naturels dépassé ; poursuivre depuis le checkpoint acquis sans saut de temps.');
      // Sparse, read-only growth query on a literal snapshot, never a rebuilt
      // model. Serialized growth is only an anchor. Manual harvest accepts
      // >65%; actual growth and the lower yield are recorded without claiming
      // 100% maturity. All work and crop removal still use the ordinary UI.
      if(!threats(s).length&&(s.tick-lastGrowthTick>=1200||s.jobs.some(j=>j.kind==='harvest'&&s.crops.some(c=>c.x===j.x&&c.z===j.z&&!e.harvestable.some(m=>m.id===c.id))))){
        lastGrowthTick=s.tick;const w=await world(page),crops=w.resources.filter(r=>r.kind==='rice'&&fieldCell(r));
        const readable=crops.map(crop=>({crop,growth:plantGrowth(w,crop)}));
        growthReadings.push({tick:w.tick,maxGrowth:Math.max(0,...readable.map(r=>r.growth)),harvestable:readable.filter(r=>r.growth>.65).length});
        const harvest=readable.filter(r=>r.growth>.65&&!e.harvestable.some(m=>m.id===r.crop.id)).slice(0,12);
        if(harvest.length&&!e.eaten.length){
          await pause(page);
          for(const {crop,growth} of harvest){
            e.harvestable.push({id:crop.id,tick:w.tick,growth});
            if(!w.jobs.some(j=>j.kind==='harvest'&&j.x===crop.x&&j.z===crop.z))
              await act(page,{type:'designate',kind:'harvest',x:crop.x,z:crop.z},'Récolter le riz réellement récoltable, croissance exacte consignée',rotation);
          }
          slow=true;if(!checkpoints.has('harvestable-rice')){await checkpoint(page,info,e,'harvestable-rice');checkpoints.add('harvestable-rice');}
          await speed(page,1);s=await take();
        }
      }
      const danger=threats(s);
      if(danger.length){
        if(!defending){
          await pause(page);defending=true;e.responses.push({tick:s.tick,kind:'threat',ids:danger.map(t=>t.id),action:'pause, inspect, refuge'});
          if(danger.some(t=>t.kind==='raid')&&await page.locator('#raid-letter').isVisible()){
            await page.locator('#raid-letter').click();await page.locator('#raid-details').click();
            if(await page.locator('#locate-raid').isVisible())await page.locator('#locate-raid').click();await page.keyboard.press('Escape');
          }
          for(const [pawnId,target] of [[IRIS,{x:121,z:111}],[LEONIE,{x:123,z:111}],[GAEL,{x:126,z:114}]] as const){
            if(!s.people.some(p=>p.id===pawnId&&capable(p)))continue;
            await act(page,{type:'draft',pawnIds:[pawnId],enabled:true},'Mobiliser pour un déplacement réel face à la menace',rotation);
            await act(page,{type:'draft-move',pawnIds:[pawnId],target,queue:false},'Refuge existant et poste de défense extérieur',rotation);
          }
          await checkpoint(page,info,e,'threat-'+s.tick);await speed(page,1);
        }
        if(Date.now()-lastTactical>2000){
          lastTactical=Date.now();await pause(page);const w=await world(page),shooter=w.pawns.find(p=>p.id===GAEL);
          if(shooter&&!shooter.health?.death&&shooter.draft&&shooter.state!=='downed'){
            // The earlier observation may predate a knockdown or departure.
            // Choose targets exclusively from this paused authoritative World.
            const currentThreats=[...(w.wildlife?.animals??[]).filter(a=>a.manhunter&&!a.manhunter.exhausted&&!a.health?.death&&!['dead','downed'].includes(a.state))
              .map(a=>({id:a.id,x:a.x,z:a.z,kind:'animal'})),
              ...w.pawns.filter(p=>p.raid&&!p.raid.exiting&&!p.health?.death&&!['dead','downed'].includes(p.state))
                .map(p=>({id:p.id,x:p.x,z:p.z,kind:'raid'}))];
            const queries=shootingQueries(w),target=currentThreats.sort((a,b)=>Math.hypot(a.x-shooter.x,a.z-shooter.z)-Math.hypot(b.x-shooter.x,b.z-shooter.z)).find(t=>!('reason' in shotPlan(w,shooter,t.id,queries)));
            if(target&&shooter.shooting?.order?.targetId!==target.id){await shootVisible(page,target.id);e.responses.push({tick:w.tick,kind:target.kind,ids:[GAEL,target.id],action:'accepted real rifle target'});}
          }
          await speed(page,1);
        }
      }else if(defending){
        await pause(page);for(const p of s.people.filter(p=>p.draft&&capable(p)))await act(page,{type:'draft',pawnIds:[p.id],enabled:false},'Reprise civile après disparition de la menace active',rotation);
        e.responses.push({tick:s.tick,kind:'recovery',ids:[...ORIGINAL],action:'undraft; actual raid result is recorded separately'});defending=false;
        await checkpoint(page,info,e,'recovery-'+s.tick);await speed(page,slow?1:6);
      }
      if(!defending&&Date.now()-lastMedical>5000&&s.people.some(p=>p.health?.injuries.some(i=>i.severity>0&&i.tended===undefined)||p.state==='downed')){
        lastMedical=Date.now();await pause(page);const w=await world(page),doctor=w.pawns.find(p=>p.id===IRIS);
        for(const patient of w.pawns.filter(p=>ORIGINAL.includes(p.id as typeof ORIGINAL[number])&&p.id!==IRIS&&!p.health?.death&&(p.state==='downed'||p.health?.injuries.some(i=>i.severity>0&&i.tended===undefined)))){
          if(!doctor||doctor.health?.death||doctor.state==='downed'||doctor.mental?.crisis)continue;
          await inspectPerson(page,patient.id,'health');await page.keyboard.press('Escape');
          // Use a genuinely placed free medical sleeping spot, separate from
          // the original three sleeping assignments. No clinical mutation.
          let bed=w.structures.find(b=>b.kind==='sleeping-spot'&&b.x===124&&b.z===112);
          if(!bed){await tool(page,'sleeping-spot');await revealCells(page,[{x:124,z:112}]);await cell(page,124,112);await page.keyboard.press('Escape');bed=(await world(page)).structures.find(b=>b.kind==='sleeping-spot'&&b.x===124&&b.z===112);}
          expect(bed).toBeTruthy();await act(page,{type:'medical-bed',bedId:bed!.id,enabled:true},'Vrai couchage médical pour les blessures observées',rotation);
          await act(page,{type:'priority',pawnId:patient.id,work:'bedrest',value:1},'Repos au lit pour le patient réellement blessé',rotation);
          if(patient.state==='downed'&&!doctor.rescue)await act(page,{type:'order-rescue',pawnId:IRIS,patientId:patient.id,queue:false},'Secours physique de la personne à terre',rotation);
          e.responses.push({tick:w.tick,kind:'medical',ids:[IRIS,patient.id,bed!.id],action:'health inspection, medical spot, patient rest / real rescue'});break;
        }
        await speed(page,slow?1:6);
      }
      if(!defending&&s.fires.length&&!s.people.some(p=>p.id===LEONIE&&p.draft)&&Date.now()-lastTactical>5000){
        lastTactical=Date.now();await pause(page);const fire=s.fires[0]!;
        await act(page,{type:'order-extinguish',pawnId:LEONIE,fireId:fire.id},'Léonie est la seule pompière capable dans les profils initiaux',rotation);
        e.responses.push({tick:s.tick,kind:'fire',ids:[LEONIE,fire.id],action:'physical extinguishing order'});await speed(page,slow?1:6);
      }
      if(e.riceTransport.length&&!checkpoints.has('rice-cargo')){await checkpoint(page,info,e,'rice-cargo');checkpoints.add('rice-cargo');await speed(page,1);slow=true;}
      if(e.products.length&&!checkpoints.has('first-meal')){await checkpoint(page,info,e,'first-meal');checkpoints.add('first-meal');await speed(page,1);slow=true;}
      if(e.ingestStarted.length&&!checkpoints.has('ingesting-meal')){await checkpoint(page,info,e,'ingesting-meal');checkpoints.add('ingesting-meal');await speed(page,1);slow=true;}
      if(e.harvested.length&&e.riceTransport.length&&e.recipeWork.length&&e.products.length&&e.eaten.length&&e.reseeded.length){
        const final=await checkpoint(page,info,e,'first-chain');
        expect(final.structures.find(b=>b.id===e.stationId)?.fuel?.ticks).toBeGreaterThan(0);
        expect(e.harvestable.every(m=>m.growth>.65)).toBe(true);expect(e.products.every(p=>p.consumedRice===10)).toBe(true);
        expect(e.eaten.every(m=>m.hungerAfter>m.hunger)).toBe(true);
        expect(new Set(e.eaten.map(m=>JSON.stringify([m.event.tick,m.event.type,m.event.message]))).size).toBe(e.eaten.length);
        expect(new Set(e.eaten.map(m=>m.pileId)).size).toBe(e.eaten.length);
        expect(errors).toEqual([]);return;
      }
      await page.waitForTimeout(200);
    }
    throw Error('Budget mural de continuation atteint : exporter l’état naturel puis reprendre, sans prétendre une première chaîne acquise.');
  }catch(error){failure=error;throw error;}
  finally{
    let finalExportFailure:unknown;
    if(loaded){try{await checkpoint(page,info,e,failure?'failure-continuation':'final-continuation',false);}catch(error){finalExportFailure=error;notes.push({finalExportError:String(error)});}}
    if(loaded)await page.screenshot({path:info.outputPath('food-campaign-final.png')}).catch(error=>notes.push({screenshotError:String(error)}));
    const reportedFailure=failure??finalExportFailure;
    const summary={stage,input:{path:input,sha256:hash(raw),tick:inputWorld.tick},elapsedMs:Date.now()-started,
      result:reportedFailure?'partial-failure':stage==='setup'?'setup-only':'first-chain',failure:reportedFailure?String(reportedFailure):null,
      qualification:'One initial chain and same-cell reseeding only; no second harvest, food autonomy or complete campaign certified.',
      evidence:e,growthReadings,notes,errors,observations};
    const path=info.outputPath('food-campaign-summary.json');await writeFile(path,JSON.stringify(summary,null,2));
    await info.attach('food-campaign-summary',{contentType:'application/json',path});
    if(!failure){if(finalExportFailure)throw finalExportFailure;expect(errors).toEqual([]);}
  }
});
