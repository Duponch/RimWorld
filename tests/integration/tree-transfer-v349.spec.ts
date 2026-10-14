import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {treeTransferScene} from '../scenarios/tree-transfer-v349';
import {prepareConstructionFlora} from '../scenarios/construction-flora-v348';
import {medicalCamp} from '../scenarios/health';
import {addMaterial,refreshStock} from '../../src/sim/materials';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {isMinifiedTree} from '../../src/sim/tree-transfer';
import {world,pause,panel,expectWorld,observeErrors,cell} from './helpers';
import {perform,revealCells} from './player-actions';
import type {World,Cell} from '../../src/sim/types';

test.use({channel:'chrome'});
test.describe('V349 prepared physical tree / cancellation regressions',()=>{
  test.skip(process.env.V349!=='1','ROOT opt-in Chrome scenes; no human-save repair, natural campaign or FPS claim.');
  for(const mode of ['tree','cancel'] as const)test(`V349 ${mode} actual UI and exact custody`,async({page},info)=>{
    test.setTimeout(240000);page.setDefaultTimeout(10000);const started=Date.now(),deadline=started+180000,rotation={value:0},errors=observeErrors(page),initial=mode==='tree'?treeTransferScene('oak',.1):medicalCamp(2);
    if(mode==='tree'){initial.resources.push({id:initial.nextId++,kind:'wild-plant',species:'grass',x:20,z:14,amount:0,growth:.5,growthTick:initial.tick});prepareConstructionFlora(initial);}
    else {Object.assign(initial.pawns[0]!,{x:8,z:10});Object.assign(initial.pawns[1]!,{x:6,z:18});addMaterial(initial,'chunk',1,{type:'ground',x:12,z:10},'granite-chunk');refreshStock(initial);}
    const checkpoints:{name:string;tick:number;sha256:string;reloaded:boolean}[]=[],ring:unknown[]=[];let loaded=false,complete=false,last:World|undefined,backend:unknown,failure:unknown;
    const front=()=>page.locator('.front-menu');
    const read=async()=>{const w=await world(page);last=w;backend=await page.evaluate(()=>window.__lisiere.backend);const incident=await page.evaluate(()=>window.__lisiere.incident);if(incident.simulationStopped||incident.graphicsFault)throw Error('Actual technical incident; preserve prepared state');if(w.pawns.some(p=>p.faction==='outlaws'&&!p.prisoner&&!['dead','downed'].includes(p.state))||w.wildlife?.animals.some(a=>a.manhunter&&!a.manhunter.exhausted&&!['dead','downed'].includes(a.state)))throw Error('Natural danger interrupted the bounded preparation');expect(errors).toEqual([]);if(Date.now()>deadline)throw Error('Bounded V349 prepared body expired');ring.push({tick:w.tick,jobs:w.jobs,pawns:w.pawns,piles:w.piles,resources:w.resources});if(ring.length>20)ring.shift();return w;};
    const wait=async(done:(w:World)=>boolean)=>{await expect.poll(async()=>done(await read()),{timeout:65000,intervals:[150]}).toBe(true);};
    const run=async()=>{await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();};
    const selectWith=async(at:Cell,id:string)=>{await revealCells(page,[at]);for(let n=0;n<6;n++){await cell(page,at.x,at.z);if(await page.locator(id).isVisible())return;}await expect(page.locator(id)).toBeVisible();};
    const capture=async(name:string,reload=true,screenshot=false)=>{
      await pause(page);const before=await world(page);last=before;expect(validateWorld(before)).toEqual([]);await page.keyboard.press('Escape');if(screenshot)await page.screenshot({path:info.outputPath(name+'-map.png')});await panel(page,'menu');const manager=page.locator('[data-save-manager]'),label='V349 '+mode+' '+name;
      await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await download).saveAs(path);const raw=await readFile(path,'utf8');expect(deserializeWorld(raw)).toEqual(before);const record={name,tick:before.tick,sha256:createHash('sha256').update(raw).digest('hex'),reloaded:false};checkpoints.push(record);
      if(reload){await page.locator('#browse-saves').click();const row=front().locator('label').filter({has:page.locator('strong').filter({hasText:label})});await row.locator('input[name="front-save"]').check();await front().getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,before);record.reloaded=true;}await info.attach(name,{contentType:'application/json',path});await page.keyboard.press('Escape');return before;
    };
    try{
      expect(validateWorld(initial)).toEqual([]);const input=info.outputPath('prepared-input.json');await writeFile(input,serializeWorld(initial));await page.goto('/?e2e');await front().getByRole('button',{name:'Charger une partie',exact:true}).click();await front().locator('input[type=file]').setInputFiles(input);await expectWorld(page,initial);loaded=true;await pause(page);backend=await page.evaluate(()=>window.__lisiere.backend);expect(backend).toBe('WebGPU');
      if(mode==='tree'){
        const source=initial.resources[0]!,sourceId=source.id,grassId=initial.resources[1]!.id;
        await perform(page,{reason:'Créer un vrai fantôme mural sans supprimer la sélection de son arbre',command:{type:'designate',kind:'wall',material:'wood',x:12,z:10}},rotation);const ghost=await capture('ghost');const ghostId=ghost.jobs.find(j=>j.kind==='wall')!.id;
        await selectWith({x:12,z:10},'#cell-extract');await expect(page.locator('#cell-extract')).toContainText('Déraciner');await expect(page.locator('#cell-cut')).not.toContainText('Déraciner');await page.locator('#cell-extract').click();await wait(w=>w.jobs.some(j=>j.kind==='extract-tree'&&j.tree?.resourceId===sourceId));const ordered=await capture('ordered',true,true);expect(ordered.jobs.some(j=>j.id===ghostId)).toBe(true);expect(ordered.resources.some(r=>r.id===sourceId)).toBe(true);expect(ordered.piles.some(isMinifiedTree)).toBe(false);
        await run();await wait(w=>w.piles.some(isMinifiedTree));const boxed=await capture('boxed',true,true),pile=boxed.piles.find(isMinifiedTree)!;expect(pile.innerResource.id).toBe(sourceId);expect(boxed.resources.some(r=>r.id===sourceId)).toBe(false);expect(boxed.piles.filter(p=>p.item==='wood')).toEqual([]);expect(pile.plantPack.expiresAt-pile.plantPack.packedAt).toBe(42000);if(pile.owner.type!=='ground')throw Error('Wrapper has no actual ground cell');
        await selectWith(pile.owner,'#cell-replant');await page.locator('#cell-replant').click();await revealCells(page,[{x:20,z:14}]);await cell(page,20,14);await wait(w=>w.jobs.some(j=>j.kind==='replant-tree'&&j.tree?.resourceId===sourceId));expect((await read()).resources.some(r=>r.id===grassId)).toBe(true);await run();await wait(w=>w.piles.some(p=>p.id===pile.id&&p.owner.type==='pawn'));const held=await capture('held');expect(held.piles.find(p=>p.id===pile.id)).toMatchObject({innerResource:{id:sourceId},plantPack:pile.plantPack});expect(held.resources.some(r=>r.id===sourceId)).toBe(false);
        await run();await wait(w=>w.jobs.some(j=>j.kind==='replant-tree'&&(j.clearance?.progress??0)>5));const clearing=await capture('replant-clearing',true,true);expect(clearing.resources.some(r=>r.id===grassId)).toBe(true);await run();await wait(w=>w.resources.some(r=>r.id===sourceId&&r.x===20&&r.z===14));const final=await capture('replanted',true,true);expect(final.resources.some(r=>r.id===grassId)).toBe(false);expect(final.resources.find(r=>r.id===sourceId)?.damage).toBe(source.damage);expect(final.piles.some(p=>p.id===pile.id)).toBe(false);expect(final.jobs.some(j=>j.id===ghostId)).toBe(true);expect(final.piles.filter(p=>p.item==='wood')).toEqual([]);
      }else{
        const pile=initial.piles[0]!;await perform(page,{reason:'Désigner réellement un fragment pour transport',command:{type:'area',action:'haul-chunks',from:{x:12,z:10},to:{x:12,z:10}}},rotation);await wait(w=>w.piles.some(p=>p.id===pile.id&&p.haulRequested));const flagged=await capture('flagged');expect(flagged.jobs).toEqual([]);await selectWith({x:12,z:10},'#cell-cancel');await page.locator('#cell-cancel').click();await wait(w=>w.piles.some(p=>p.id===pile.id&&!Object.hasOwn(p,'haulRequested')));await capture('inspector-cancel',true,true);
        await perform(page,{reason:'Répéter la permission de transport avant un vrai geste rectangulaire Annuler',command:{type:'area',action:'haul-chunks',from:{x:12,z:10},to:{x:12,z:10}}},rotation);await wait(w=>w.piles.some(p=>p.id===pile.id&&p.haulRequested));await perform(page,{reason:'Annuler la permission par glisser-relâcher sur sa cellule sans inventer de Job',command:{type:'area',action:'cancel',from:{x:12,z:10},to:{x:12,z:10}}},rotation);await wait(w=>w.piles.some(p=>p.id===pile.id&&!Object.hasOwn(p,'haulRequested')));const final=await capture('area-cancel',true,true);expect(final.jobs).toEqual([]);expect(final.piles).toHaveLength(1);expect(final.piles[0]).toMatchObject({id:pile.id,quantity:1,owner:pile.owner});
      }
      expect(checkpoints.every(c=>c.reloaded)).toBe(true);expect(errors).toEqual([]);if(Date.now()>deadline)throw Error('Bounded V349 prepared body expired');complete=true;
    }catch(error){failure=error;throw error;}
    finally{
      let exportFailure:unknown;if(loaded&&failure)try{await capture('failure-outcome',false,true);}catch(error){exportFailure=error;}
      const path=info.outputPath('tree-transfer-v349-summary.json');await writeFile(path,JSON.stringify({version:349,mode,channel:'chrome',backend,qualification:'Prepared 32-cell regression only. Actual UI, workers, movement and custody; no human save, natural campaign, seven-day live campaign or FPS certified.',result:failure||exportFailure?'partial-failure':complete?'prepared-regression':'not-loaded',elapsedMs:Date.now()-started,failure:String(failure??exportFailure??''),checkpoints,errors,ring,last},null,2));await info.attach('tree-transfer-v349-summary',{contentType:'application/json',path});
    }
  });
});
