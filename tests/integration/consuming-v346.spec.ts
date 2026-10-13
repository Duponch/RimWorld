import {test,expect,type Page} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {medicalCamp} from '../scenarios/health';
import {fixtureBuilding} from '../scenarios/deconstruction';
import {addMaterial,refreshStock} from '../../src/sim/materials';
import {newShelfStorage} from '../../src/sim/shelf-storage';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {world,pause,panel,expectWorld,observeErrors,settledCells} from './helpers';
import {perform,revealCells} from './player-actions';
import type {World} from '../../src/sim/types';

// Prepared feature copies, not V345 reserves or a natural campaign continuation.
function prepared(mode:'civil'|'drafted'){
  const w=medicalCamp(1),p=w.pawns[0]!;Object.assign(p,{x:3,z:5,hunger:30,foodPolicyId:4,name:'Consommateur pacifiste',background:{childhood:'quiet-child',adulthood:'medic'}});
  if(mode==='drafted'){const s=fixtureBuilding(w,'small-shelf',12,5);const shelf=w.structures.find(v=>v.id===s.id)!;shelf.shelf=newShelfStorage([w.nextId++]);shelf.material='wood';delete shelf.quality;}
  else{w.stockpiles.push({id:w.nextId++,x:12,z:5,filters:{wood:false,food:true},priority:3,capacity:75});fixtureBuilding(w,'table-square',14,8);fixtureBuilding(w,'stool',13,8);}
  addMaterial(w,'food',30,{type:'ground',x:12,z:5},'rice');
  if(mode==='drafted')addMaterial(w,'food',3,{type:'ground',x:12,z:5},'survival-meal');refreshStock(w);return w;
}
const sha=(raw:string)=>createHash('sha256').update(raw).digest('hex');
const front=(page:Page)=>page.locator('.front-menu');
async function menu(page:Page,pawnId:number){
  await page.keyboard.press('Escape');await page.locator(`[data-pawn="${pawnId}"]`).click();await revealCells(page,[{x:12,z:5}]);await settledCells(page,[{x:12,z:5}]);
  const point=await page.evaluate(()=>{const b=document.querySelector('#viewport canvas')!.getBoundingClientRect(),p=window.__lisiere.projectCell(12,5);return {x:b.left+p.x,y:b.top+p.y};});
  expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,point)).toBe('CANVAS');await page.mouse.click(point.x,point.y,{button:'right'});
  await expect(page.locator('#order-menu')).toBeVisible();
}

test.describe('V346 prepared explicit consumption',()=>{
  test.skip(process.env.V346!=='1','ROOT opt-in prepared feature scenes; no campaign or food-production claim.');
  for(const mode of ['civil','drafted'] as const)test(`V346 prepared ${mode} real pile consumption`,async({page},info)=>{
    test.setTimeout(180000);const started=Date.now(),initial=prepared(mode),pawnId=initial.pawns[0]!.id,pileId=initial.piles[0]!.id,errors=observeErrors(page),rotation={value:0};
    const checkpoints:{name:string;tick:number;sha256:string;reloaded:boolean}[]=[],ring:unknown[]=[];let loaded=false,complete=false,failure:unknown,last:World|undefined;
    const read=async()=>{const w=await world(page);last=w;const p=w.pawns.find(v=>v.id===pawnId)!;ring.push({tick:w.tick,pawn:{x:p.x,z:p.z,hunger:p.hunger,state:p.state,need:p.need,draft:p.draft,motion:p.motion,moveCooldown:p.moveCooldown},piles:w.piles});if(ring.length>20)ring.shift();return w;};
    const capture=async(name:string,reload=true,screenshot=false)=>{
      await pause(page);const before=await read();expect(validateWorld(before)).toEqual([]);await page.keyboard.press('Escape');
      if(screenshot)await page.screenshot({path:info.outputPath(name+'-map.png')});await panel(page,'menu');
      const manager=page.locator('[data-save-manager]'),label='V346 '+mode+' '+name;await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();
      await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
      const path=info.outputPath(name+'.json');await(await download).saveAs(path);const raw=await readFile(path,'utf8');expect(deserializeWorld(raw)).toEqual(before);const entry={name,tick:before.tick,sha256:sha(raw),reloaded:false};checkpoints.push(entry);
      if(reload){await page.locator('#browse-saves').click();const row=front(page).locator('label').filter({has:page.locator('strong').filter({hasText:label})});await row.locator('input[name="front-save"]').check();await front(page).getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,before);entry.reloaded=true;}
      await info.attach(name,{contentType:'application/json',path});await page.keyboard.press('Escape');return before;
    };
    const run=async()=>{await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();};
    const wait=async(predicate:(w:World)=>boolean)=>{await expect.poll(async()=>{if(Date.now()-started>150000)throw Error('Bounded prepared consumption body expired');const w=await read();expect(errors).toEqual([]);expect(w.pawns[0]!.state).not.toMatch(/dead|downed/);return predicate(w);},{timeout:45000,intervals:[150]}).toBe(true);};
    try{
      expect(initial.schemaVersion).toBe(234);expect(validateWorld(initial)).toEqual([]);const input=info.outputPath('prepared-input.json');await writeFile(input,serializeWorld(initial));
      await page.goto('/?e2e');await front(page).getByRole('button',{name:'Charger une partie',exact:true}).click();await front(page).locator('input[type=file]').setInputFiles(input);await expectWorld(page,initial);loaded=true;await pause(page);
      if(mode==='drafted')await perform(page,{reason:'Préparation déclarée : mobiliser un pacifiste pour manger au contact de la pile',command:{type:'draft',pawnIds:[pawnId],enabled:true}},rotation);
      await menu(page,pawnId);const action=page.locator(`[data-order-consume="${pileId}"]`);await expect(action).toBeEnabled();await expect(action).toContainText('Consommer');await expect(page.locator('#order-menu')).toContainText(/régime|Rien/i);
      if(mode==='drafted'){const other=initial.piles[1]!;await expect(page.locator(`[data-order-consume="${other.id}"]`)).toBeEnabled();expect(await page.locator('[data-order-consume]').count()).toBe(2);}
      await action.click();await expect.poll(async()=>(await read()).pawns[0]!.need).toMatchObject({kind:'eat',forced:true,phase:'pickup',sourcePileId:pileId,quantity:14,progress:0});
      const approach=await capture('approach');expect(approach.pawns[0]!.hunger).toBe(30);expect(approach.piles).toEqual(initial.piles);await run();
      await wait(w=>w.pawns[0]!.need?.kind==='eat'&&w.pawns[0]!.need.carryPileId!==null&&w.pawns[0]!.need.phase!=='ingest');const cargoState=await capture('held',true,true),eater=cargoState.pawns[0]!;
      if(eater.need?.kind!=='eat')throw Error('Held portion has no eating owner');const carryId=eater.need.carryPileId!,cargo=cargoState.piles.find(v=>v.id===carryId)!;
      expect(cargo).toMatchObject({item:'rice',quantity:14,owner:{type:'pawn',pawnId}});expect(carryId).not.toBe(pileId);expect(cargoState.piles.find(v=>v.id===pileId)?.quantity).toBe(16);expect(eater.hunger).toBeLessThanOrEqual(30);
      await run();await wait(w=>w.pawns[0]!.need?.kind==='eat'&&w.pawns[0]!.need.phase==='ingest');const ingest=await capture('ingest',true,true),p=ingest.pawns[0]!;
      expect(p.need).toMatchObject({forced:true,phase:'ingest',carryPileId:carryId,quantity:14});expect(p.moveCooldown).toBe(0);expect(p.motion?.end??0).toBeLessThanOrEqual(ingest.tick);const cell={x:p.x,z:p.z};
      if(mode==='drafted'){expect(p.draft).toBeTruthy();expect(Math.abs(p.x-12)+Math.abs(p.z-5)).toBe(1);expect(p.need?.kind==='eat'&&p.need.dining?.seatId).toBeNull();}
      else{const chair=initial.structures.find(v=>v.kind==='stool')!;expect(cell).toEqual({x:chair.x,z:chair.z});expect(p.need?.kind==='eat'&&p.need.dining?.seatId).toBe(chair.id);}
      await run();await wait(w=>{const a=w.pawns[0]!;if(a.need?.kind==='eat'&&a.need.forced){expect({x:a.x,z:a.z}).toEqual(cell);expect(a.moveCooldown).toBe(0);expect(w.piles.some(v=>v.id===carryId)).toBe(true);return false;}return !w.piles.some(v=>v.id===carryId)&&a.hunger>95;});
      const final=await capture('final',true,mode==='drafted'),f=final.pawns[0]!;expect(f.orders.active).toBeNull();expect(f.foodPolicyId).toBe(4);expect(f.draft!==undefined).toBe(mode==='drafted');
      expect(final.piles.filter(v=>v.item==='rice').reduce((n,v)=>n+v.quantity,0)).toBe(16);expect(final.events.some(e=>/a mangé une portion \(14 ×/.test(e.message))).toBe(true);
      if(mode==='civil')expect(f.memories.some(m=>m.kind==='ate-without-table')).toBe(false);else expect(final.piles.find(v=>v.id===initial.piles[1]!.id)).toMatchObject({id:initial.piles[1]!.id,item:initial.piles[1]!.item,quantity:initial.piles[1]!.quantity,owner:initial.piles[1]!.owner});
      expect(checkpoints.every(v=>v.reloaded)).toBe(true);expect(errors).toEqual([]);complete=true;
    }catch(error){failure=error;throw error;}
    finally{
      let exportFailure:unknown;if(loaded&&failure)try{await capture('failure-continuation',false,true);}catch(error){exportFailure=error;}
      const path=info.outputPath('consuming-summary.json');await writeFile(path,JSON.stringify({ledgerVersion:346,mode,qualification:'Prepared 32-cell command feature only; no natural production, reserve campaign or recovery certified.',result:failure||exportFailure?'partial-failure':complete?'prepared-feature':'not-loaded',elapsedMs:Date.now()-started,failure:String(failure??exportFailure??''),checkpoints,errors,ring,last},null,2));await info.attach('consuming-summary',{contentType:'application/json',path});
    }
  });
});