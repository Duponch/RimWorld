/* PRIVATE preparation, not executed by its author. ROOT owns the frozen run.
 * After import: real pointer/buttons and read-only observations only.
 * No command API, world mutation, artificial stepping or GPU sampling. */
import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {world,pause,panel,expectWorld,observeErrors,settledCells} from './helpers';
import {revealCells} from './player-actions';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {footprintCells} from '../../src/sim/definitions';
import {FUEL_UNIT_TICKS,REFUEL_WORK_TICKS} from '../../src/sim/fuel';
import type {World} from '../../src/sim/types';
import {CASES,preparedRefuel,type RefuelKind} from '../scenarios/refuel-generator';

test.skip(process.env.REFUEL_NATIVE!=='1','ROOT-only prepared refuel scenes; no default browser allocation.');

const BASE='http://127.0.0.1:5412',GAP=8,MAX_TICKS=180;
const sha=(text:string)=>createHash('sha256').update(text).digest('hex');
const near=(a:{x:number;z:number},b:{x:number;z:number})=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)<=1;
const put=async(path:string,value:unknown)=>writeFile(path,typeof value==='string'?value:JSON.stringify(value,null,2),{flag:'wx'});

test.beforeEach(async({context})=>{
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    return url.origin===BASE?route.continue():route.abort('blockedbyclient');
  });
  await context.routeWebSocket('**/*',socket=>{
    if(new URL(socket.url()).origin==='ws://127.0.0.1:5412')socket.connectToServer();
    else socket.close({code:1008,reason:'Prepared native control is local only.'});
  });
});

for(const kind of CASES)test(kind+': menu réel et cinq unités entières physiquement livrées',async({page},info)=>{
  test.skip(process.env.REFUEL_NATIVE!=='1','ROOT-only prepared scene; use the strict wrapper.');
  expect(process.env.REFUEL_WRAPPER).toBe('1');expect(process.env.REFUEL_SOURCE_READY).toBe('1');
  await runCase(page,info,kind);
});

async function runCase(page:Page,info:TestInfo,kind:RefuelKind){
  const fixture=preparedRefuel(kind),{initial,raw,declaration:d}=fixture;
  const segment=process.env.REFUEL_SEGMENT!,bodySeconds=Number(process.env.REFUEL_BODY_SECONDS??55);
  const errors=observeErrors(page),lifecycle:unknown[]=[],checkpoints:unknown[]=[],observations:unknown[]=[];
  const onCrash=()=>lifecycle.push({kind:'crash'}),onClose=()=>lifecycle.push({kind:'close'}),browser=page.context().browser();
  const onDisconnect=()=>lifecycle.push({kind:'disconnect'});
  page.on('crash',onCrash);page.on('close',onClose);browser?.on('disconnected',onDisconnect);
  const inputPath=info.outputPath('initial-fixture.json');await put(inputPath,raw);
  await put(info.outputPath('fixture-declaration.json'),{...d,sha256:sha(raw)});
  let last:World|undefined,cargoId:number|undefined,deadline=Infinity,loaded=false,succeeded=false,failure:unknown;
  let orderObserved=false,serviceObserved=false;
  const actor=(w:World)=>w.pawns.find(p=>p.id===d.pawnId)!;
  const generator=(w:World)=>w.structures.find(s=>s.id===d.generatorId)!;
  const total=(w:World)=>generator(w).fuel!.ticks+generator(w).fuel!.burned;
  const check=(w:World)=>{
    expect(errors,'Console/page/GPU errors').toEqual([]);expect(lifecycle).toEqual([]);
    expect(validateWorld(w)).toEqual([]);expect(w.width).toBe(32);expect(w.height).toBe(32);expect(w.seed).toBe(initial.seed);
    expect(w.tick-initial.tick).toBeLessThanOrEqual(MAX_TICKS);expect(Date.now()).toBeLessThan(deadline);
    if(last){expect(w.tick).toBeGreaterThanOrEqual(last.tick);expect(w.tick-last.tick,'No custody gap greater than eight ticks').toBeLessThanOrEqual(GAP);}
    expect(w.research).toEqual(initial.research);expect(w.jobs).toEqual([]);
    expect(w.structures.map(s=>({id:s.id,kind:s.kind,x:s.x,z:s.z,material:s.material}))).toEqual(initial.structures.map(s=>({id:s.id,kind:s.kind,x:s.x,z:s.z,material:s.material})));
    const p=actor(w),s=generator(w),h=p.haul;
    expect(p.state).not.toBe('dead');expect(p.state).not.toBe('downed');expect(p.draft).toBeUndefined();expect(p.mental?.crisis).toBeUndefined();
    if(h){
      expect(h).toMatchObject({sourcePileId:d.sourceId,quantity:d.quantity,destination:{type:'fuel',structureId:d.generatorId,forced:true}});
      expect(total(w)).toBe(0);
      if(h.phase==='pickup'){
        expect(h.carryPileId).toBeNull();expect(w.piles.find(c=>c.id===d.sourceId)).toMatchObject({item:d.item,quantity:d.quantity,owner:{type:'ground',...d.sourceCell}});
      }else{
        expect(h.phase).toBe('deliver');expect(h.pickupCell).toEqual(d.sourceCell);expect(h.carryPileId).not.toBeNull();
        if(cargoId===undefined)cargoId=h.carryPileId!;
        expect(h.carryPileId).toBe(cargoId);expect(cargoId).not.toBe(d.sourceId);expect(w.piles.some(c=>c.id===d.sourceId)).toBe(false);
        expect(w.piles.find(c=>c.id===cargoId)).toMatchObject({item:d.item,quantity:d.quantity,owner:{type:'pawn',pawnId:d.pawnId}});
        if(h.serviceProgress){
          expect(h.serviceProgress).toBeGreaterThan(0);expect(h.serviceProgress).toBeLessThan(REFUEL_WORK_TICKS);
          expect(footprintCells(s).some(cell=>near(p,cell)),'Actual contact during refuelling work').toBe(true);serviceObserved=true;
        }
      }
    }else if(orderObserved){
      expect(cargoId).toBeDefined();expect(serviceObserved,'The service phase must be directly observed').toBe(true);
      expect(w.piles.some(c=>c.id===cargoId||c.id===d.sourceId)).toBe(false);expect(w.piles.filter(c=>c.item===d.item)).toEqual([]);
      expect(total(w)).toBe(d.quantity*FUEL_UNIT_TICKS);expect(p.orders.active).toBeNull();
    }
    observations.push({tick:w.tick,pawn:{id:p.id,x:p.x,z:p.z,state:p.state,haul:structuredClone(h)},
      source:w.piles.find(c=>c.id===d.sourceId),cargo:w.piles.find(c=>c.id===cargoId),fuel:structuredClone(s.fuel)});
    if(observations.length>256)throw Error('Observation budget reached; no truncation or retrospective credit.');
    last=w;return w;
  };
  const read=async()=>check(await world(page));
  const closeMenu=async()=>{if(await page.locator('#menu-panel').isVisible())await page.locator('[data-panel="menu"]').click();};
  const checkpoint=async(name:string,assertState:(w:World)=>void)=>{
    await pause(page);const before=await read();assertState(before);
    await panel(page,'menu');const manager=page.locator('[data-save-manager]'),label='Refuel '+segment+' '+kind+' '+name;
    await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();
    await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
    const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
    const path=info.outputPath(name+'.json');await(await download).saveAs(path);const text=await readFile(path,'utf8');expect(deserializeWorld(text)).toEqual(before);
    await page.locator('#browse-saves').click();const front=page.locator('.front-menu');
    const row=front.locator('label').filter({has:page.locator('strong').filter({hasText:label})});
    await expect(row).toHaveCount(1);await row.locator('input[name="front-save"]').check();await front.getByRole('button',{name:'Charger',exact:true}).click();
    await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:30000});await expectWorld(page,before);
    const reloaded=await read();assertState(reloaded);checkpoints.push({name,path,sha256:sha(text),tick:before.tick,reloaded:true,provenance:'Real save manager export and exact UI reload'});
    await closeMenu();return reloaded;
  };
  const advance=async(condition:(w:World)=>boolean)=>{
    await page.locator('[data-speed="1"]').click();
    for(;;){const w=await read();if(condition(w))break;await page.waitForTimeout(60);}
    await pause(page);return read();
  };
  try{
    await page.goto('/?e2e');const front=page.locator('.front-menu');
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(inputPath);
    await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:45000});await expectWorld(page,initial);loaded=true;
    deadline=Date.now()+bodySeconds*1000;
    expect(await page.evaluate(()=>window.__lisiere.backend),'The observed backend must be WebGPU').toBe('WebGPU');
    await pause(page);await read();
    await page.keyboard.press('Escape');await page.locator('[data-pawn="'+d.pawnId+'"]').click();
    // A real far corner of the two-by-two generator, not only its anchor.
    const target={x:13,z:14};await revealCells(page,[target,d.sourceCell,actor(initial)]);
    const [point]=await settledCells(page,[target]),bounds=(await page.locator('#viewport canvas').boundingBox())!;
    expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,{x:bounds.x+point!.x,y:bounds.y+point!.y})).toBe('CANVAS');
    await page.mouse.click(bounds.x+point!.x,bounds.y+point!.y,{button:'right'});
    const option=page.locator('#order-menu [data-order-haul="fuel"]');await expect(option).toHaveCount(1);
    await expect(option).toBeVisible();await expect(option).toBeEnabled();await expect(option).toContainText('Ravitailler en '+(d.item==='chemfuel'?'biocarburant':'bois')+' (5 unités)');
    await page.screenshot({path:info.outputPath('menu.png')});await expectWorld(page,initial);await option.click();
    await expect.poll(async()=>actor(await world(page)).haul).toMatchObject({phase:'pickup',sourcePileId:d.sourceId,quantity:5,destination:{type:'fuel',structureId:d.generatorId,forced:true}});
    orderObserved=true;
    await checkpoint('ordered',w=>expect(actor(w).haul?.phase).toBe('pickup'));
    await advance(w=>actor(w).haul?.phase==='deliver');
    await checkpoint('cargo',w=>{expect(actor(w).haul?.phase).toBe('deliver');expect(cargoId).toBeDefined();expect(total(w)).toBe(0);});
    await advance(w=>(actor(w).haul?.serviceProgress??0)>0);
    await checkpoint('service',w=>{expect(actor(w).haul?.serviceProgress).toBeGreaterThan(0);expect(total(w)).toBe(0);});
    await page.screenshot({path:info.outputPath('service.png')});
    await advance(w=>actor(w).haul===null&&total(w)===5*FUEL_UNIT_TICKS);
    await checkpoint('final',w=>{expect(actor(w).haul).toBeNull();expect(total(w)).toBe(3000);});
    await page.screenshot({path:info.outputPath('final.png')});
    expect(checkpoints).toHaveLength(4);expect(errors).toEqual([]);expect(lifecycle).toEqual([]);succeeded=true;
  }catch(error){failure=error instanceof Error?{name:error.name,message:error.message,stack:error.stack}:String(error);throw error;}
  finally{
    // Preserve a failure as observed. No failed custody interval is repaired.
    if(loaded&&!succeeded){try{await pause(page);await put(info.outputPath('failure-observed.json'),await world(page));await page.screenshot({path:info.outputPath('failure.png')});}
      catch(error){lifecycle.push({kind:'failure-evidence-unavailable',message:String(error)});}}
    await put(info.outputPath('summary.json'),{protocol:'prepared-refuel-native-v365',prepared:true,campaign:false,kind,inputSha:sha(raw),succeeded,failure,
      backend:last?await page.evaluate(()=>window.__lisiere.backend).catch(()=>null):null,creditedResearch:false,creditedConstruction:false,
      checkpoints,cargoId,serviceObserved,errors,lifecycle,observations,
      limits:'Two prepared scenes and their real menu orders only. No productive campaign, all-consumer native claim, FPS or general performance claim.'});
    page.off('crash',onCrash);page.off('close',onClose);browser?.off('disconnected',onDisconnect);
  }
}
