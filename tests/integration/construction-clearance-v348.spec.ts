import { prepareConstructionFlora } from '../scenarios/construction-flora-v348';
import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {medicalCamp} from '../scenarios/health';
import {addMaterial,refreshStock} from '../../src/sim/materials';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {actionProgress} from '../../src/render/action-feedback';
import {world,pause,panel,expectWorld,observeErrors,cell} from './helpers';
import {perform,revealCells} from './player-actions';
import type {World} from '../../src/sim/types';

// Prepared regression scenes. No adoption/reconstruction of the player's image/save.
function prepared(mode:'plants'|'door'){
  const w=medicalCamp();w.tick=2000;Object.assign(w.pawns[0]!,{x:8,z:10,name:'Salomé'});w.pawns[0]!.priorities.build=1;
  if(mode==='plants')w.resources.push({id:w.nextId++,kind:'tree',species:'oak',x:12,z:10,amount:46,growth:.1,growthTick:w.tick},
    {id:w.nextId++,kind:'wild-plant',species:'grass',x:14,z:10,amount:0,growth:.5,growthTick:w.tick});
  addMaterial(w,'wood',mode==='plants'?8:30,{type:'ground',x:7,z:10},'wood');refreshStock(w);if(mode==='plants')prepareConstructionFlora(w);return w;
}
const sha=(raw:string)=>createHash('sha256').update(raw).digest('hex');
const wood=(w:World)=>w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0);

test.use({channel:'chrome'});
test.describe('V348 prepared construction regressions',()=>{
  test.skip(process.env.V348!=='1','ROOT opt-in Chrome scenes; no natural-campaign or human-save recovery claim.');
  for(const mode of ['plants','door'] as const)test(`V348 ${mode} actual construction and phase inspection`,async({page},info)=>{
    test.setTimeout(240000);page.setDefaultTimeout(10000);const started=Date.now(),deadline=started+180000,initial=prepared(mode),pawnId=initial.pawns[0]!.id,errors=observeErrors(page),rotation={value:0};
    const checkpoints:{name:string;tick:number;sha256:string;reloaded:boolean}[]=[],ring:unknown[]=[];let loaded=false,failure:unknown,complete=false,last:World|undefined,backend:unknown;
    const front=()=>page.locator('.front-menu'),run=async()=>{await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();};
    const read=async()=>{const w=await world(page);last=w;backend=await page.evaluate(()=>window.__lisiere.backend);const incident=await page.evaluate(()=>window.__lisiere.incident);if(incident.simulationStopped||incident.graphicsFault)throw Error('Actual technical incident; preserve this prepared state.');if(w.pawns.some(p=>p.faction==='outlaws'&&!p.prisoner&&p.state!=='dead'&&p.state!=='downed')||w.wildlife?.animals.some(a=>a.manhunter&&!a.manhunter.exhausted&&!['dead','downed'].includes(a.state)))throw Error('Natural danger interrupted this bounded preparation.');ring.push({tick:w.tick,incident,jobs:w.jobs,pawns:w.pawns,resources:w.resources,piles:w.piles});if(ring.length>20)ring.shift();
      expect(errors).toEqual([]);if(Date.now()>deadline)throw Error('Bounded prepared construction body expired');expect(w.pawns[0]!.state).not.toMatch(/dead|downed/);expect(w.pawns[0]!.mental?.crisis).toBeUndefined();return w;};
    const wait=async(done:(w:World)=>boolean)=>{await expect.poll(async()=>done(await read()),{timeout:60000,intervals:[150]}).toBe(true);};
    const capture=async(name:string,reload=true,screenshot=false)=>{
      await pause(page);const before=await world(page);last=before;expect(validateWorld(before)).toEqual([]);await page.keyboard.press('Escape');if(screenshot)await page.screenshot({path:info.outputPath(name+'-map.png')});await panel(page,'menu');
      const manager=page.locator('[data-save-manager]'),label='V348 '+mode+' '+name;await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
      const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await download).saveAs(path);const raw=await readFile(path,'utf8');expect(deserializeWorld(raw)).toEqual(before);
      const record={name,tick:before.tick,sha256:sha(raw),reloaded:false};checkpoints.push(record);
      if(reload){await page.locator('#browse-saves').click();const row=front().locator('label').filter({has:page.locator('strong').filter({hasText:label})});await row.locator('input[name="front-save"]').check();await front().getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,before);record.reloaded=true;}
      await info.attach(name,{contentType:'application/json',path});await page.keyboard.press('Escape');return before;
    };
    try{
      expect(validateWorld(initial)).toEqual([]);const input=info.outputPath('prepared-input.json');await writeFile(input,serializeWorld(initial));await page.goto('/?e2e');await front().getByRole('button',{name:'Charger une partie',exact:true}).click();await front().locator('input[type=file]').setInputFiles(input);await expectWorld(page,initial);loaded=true;await pause(page);
      backend=await page.evaluate(()=>window.__lisiere.backend);expect(backend).toBe('WebGPU');await page.locator('#orders-open').click();await expect(page.locator('#orders-tools')).toBeVisible();await expect(page.locator('#orders-tools [data-tool="select"]')).toHaveCount(0);await page.keyboard.press('Escape');
      await perform(page,{reason:'Créer un vrai plan mural avec matières au sol',command:{type:'designate',kind:'wall',material:'wood',x:12,z:10}},rotation);const ghost=await capture('ghost');expect(ghost.jobs[0]).toMatchObject({kind:'wall',construction:'blueprint',progress:0});expect(wood(ghost)).toBe(mode==='plants'?8:30);const oldJobId=ghost.jobs[0]!.id;
      if(mode==='plants'){
        const treeId=initial.resources[0]!.id;await run();await wait(w=>(w.jobs.find(j=>j.id===oldJobId)?.clearance?.progress??0)>20);
        const cutting=await capture('clearing',true,true),p=cutting.pawns[0]!,j=cutting.jobs.find(v=>v.id===oldJobId)!;expect(cutting.resources.some(v=>v.id===treeId)).toBe(true);expect(wood(cutting)).toBe(8);
        expect(actionProgress(cutting,p)).toMatchObject({kind:'clearing',total:100});expect(j.progress).toBe(0);await page.locator(`[data-pawn="${pawnId}"]`).click();await expect(page.locator('#selected-action')).toContainText(/dégagement|dégage/i);
        await page.keyboard.press('Escape');await revealCells(page,[{x:12,z:10}]);for(let attempt=0;attempt<4;attempt++){await cell(page,12,10);if(/dégagement|dégage/i.test(await page.locator('#cell-job').textContent()??''))break;}await expect(page.locator('#cell-job')).toContainText(/dégagement|dégage/i);await run();let previous=j.clearance!.progress;
        await wait(w=>{const current=w.jobs.find(v=>v.id===oldJobId);if(w.resources.some(v=>v.id===treeId)){expect(current?.clearance?.progress??0).toBeGreaterThanOrEqual(previous);previous=current!.clearance!.progress;expect(wood(w)).toBe(8);return false;}return w.structures.some(v=>v.kind==='wall');});
        const built=await capture('wall-built');expect(built.resources.some(v=>v.id===treeId)).toBe(false);expect(wood(built)).toBe(3);expect(built.events.filter(v=>v.message.includes('a dégagé le chantier'))).toHaveLength(1);
        await perform(page,{reason:'Poser un vrai plancher sur une herbe légère avec les trois bois restants',command:{type:'designate',kind:'lay-floor',floor:'wood-planks',x:14,z:10}},rotation);
        expect((await world(page)).resources.some(v=>v.id===initial.resources[1]!.id)).toBe(true);await run();await wait(w=>{expect(w.jobs.every(v=>v.kind!=='lay-floor'||v.clearance===undefined)).toBe(true);return w.tiles[10*w.width+14]!.floor==='wood-planks';});
        const final=await capture('floor-finished',true,true);expect(final.resources.some(v=>v.id===initial.resources[1]!.id)).toBe(false);expect(wood(final)).toBe(0);expect(final.jobs).toEqual([]);
      }else{
        await perform(page,{reason:'Remplacer le fantôme mural impayé par une vraie intention de porte',command:{type:'designate',kind:'door',material:'wood',x:12,z:10}},rotation);
        const replaced=await capture('door-replaced',true,true);expect(replaced.jobs).toHaveLength(1);expect(replaced.jobs[0]).toMatchObject({kind:'door',construction:'blueprint',escrow:{wood:0,food:0}});expect(replaced.jobs[0]!.id).not.toBe(oldJobId);expect(wood(replaced)).toBe(30);
        await page.keyboard.press('Escape');await revealCells(page,[{x:12,z:10}]);await cell(page,12,10);await expect(page.locator('#cell-title')).toContainText(/porte/i);await run();await wait(w=>w.jobs[0]?.construction==='frame'&&w.piles.filter(v=>v.owner.type==='job'&&v.item==='wood').reduce((n,v)=>n+v.quantity,0)===25);
        const frame=await capture('door-frame');expect(frame.piles.filter(v=>v.owner.type==='job'&&v.item==='wood').reduce((n,v)=>n+v.quantity,0)).toBe(25);await run();await wait(w=>w.structures.some(v=>v.kind==='door'));
        const final=await capture('door-finished',true,true);expect(final.jobs).toEqual([]);expect(wood(final)).toBe(5);expect(final.piles.some(v=>v.owner.type==='job')).toBe(false);
      }
      expect(checkpoints.every(v=>v.reloaded)).toBe(true);expect(errors).toEqual([]);if(Date.now()>deadline)throw Error('Bounded prepared construction body expired');complete=true;
    }catch(error){failure=error;throw error;}
    finally{
      let exportFailure:unknown;if(loaded&&failure)try{await capture('failure-outcome',false,true);}catch(error){exportFailure=error;}
      const path=info.outputPath('construction-v348-summary.json');await writeFile(path,JSON.stringify({version:348,mode,channel:'chrome',backend,qualification:'Prepared 32-cell construction regression only; no reproduction or repair of a human save, natural campaign or FPS certified.',result:failure||exportFailure?'partial-failure':complete?'prepared-regression':'not-loaded',elapsedMs:Date.now()-started,failure:String(failure??exportFailure??''),checkpoints,errors,ring,last},null,2));await info.attach('construction-v348-summary',{contentType:'application/json',path});
    }
  });
});