import {test,expect,type Page} from '@playwright/test';
import {world,panel,expectWorld,observeErrors,pause} from './helpers';
import {generateStartingWorld,startingSiteChoices,resolveStartingSite} from '../../src/sim/starting-world';
import {validateWorld,deserializeWorld} from '../../src/sim/serialization';
import {readFile} from 'node:fs/promises';

const front=(page:Page)=>page.locator('.front-menu');
const button=(page:Page,name:string)=>front(page).getByRole('button',{name,exact:true});
async function story(page:Page){
  await button(page,'Nouvelle partie').click();await button(page,'Suivant').click();
  await front(page).getByRole('radio',{name:'Récit d’aventure',exact:true}).check();
  await front(page).getByRole('radio',{name:'Rechargeable à tout moment',exact:true}).check();
  await button(page,'Suivant').click();
}

test('V333 five native pages retain their draft and create the actual selected people and site',async({page},info)=>{
  test.setTimeout(180000);const errors=observeErrors(page);
  await page.goto('/?e2e');await story(page);
  await expect(front(page)).toHaveAttribute('data-page','world');
  await page.locator('#front-seed').fill('');await button(page,'Générer').click();
  await expect(page.locator('#front-seed')).toHaveAttribute('aria-invalid','true');
  await page.locator('#front-seed').fill('42');
  await expect(page.locator('#front-world-coverage')).toBeDisabled();
  await button(page,'Modifier…').click();await expect(front(page).locator('dialog')).toBeVisible();
  await page.keyboard.press('Escape');await expect(front(page).locator('dialog')).toHaveCount(0);
  await page.screenshot({path:info.outputPath('world-1440.png')});
  await button(page,'Générer').click();await expect(front(page)).toHaveAttribute('data-page','site');
  const globe=generateStartingWorld(42),tile=startingSiteChoices(globe)[0]!,resolved=resolveStartingSite({version:1,seed:42,tile});
  // The initial real home tile is selected and visible on the front hemisphere.
  expect(tile).toBe(0);await expect(page.locator('#front-site-facts')).toContainText('250 × 250');
  await page.screenshot({path:info.outputPath('site-1440.png')});
  await button(page,'Suivant').click();await front(page).locator('dialog').getByRole('button',{name:'Annuler',exact:true}).click();
  await expect(front(page)).toHaveAttribute('data-page','site');
  await button(page,'Suivant').click();await front(page).locator('dialog').getByRole('button',{name:'Confirmer',exact:true}).click();
  await expect(front(page)).toHaveAttribute('data-page','pawns');
  await expect(page.locator('[data-candidate-serial]')).toHaveCount(8);
  await expect(page.locator('[data-candidate-skill]')).toHaveCount(12);
  await expect(page.locator('[data-team-skill]')).toHaveCount(8);
  const name=page.getByRole('textbox',{name:'Nom du personnage',exact:true});
  await name.fill('');await button(page,'Démarrer').click();
  await expect(name).toHaveAttribute('aria-invalid','true');await expect(front(page)).toHaveAttribute('data-page','pawns');
  await name.fill('Équipe 333');
  const namesBeforeRenewal=await page.locator('[data-candidate-serial] .front-candidate-labels strong').allTextContents();
  await page.locator('[data-candidate-serial="8"]').click();
  const portraitBeforeRenewal=await page.locator('.front-candidate-portrait-controls img').getAttribute('src');
  await front(page).getByRole('button',{name:'Aléatoire',exact:true}).click();
  expect((await page.locator('[data-candidate-serial] .front-candidate-labels strong').allTextContents()).slice(0,7)).toEqual(namesBeforeRenewal.slice(0,7));
  expect(await page.locator('.front-candidate-portrait-controls img').getAttribute('src')).not.toBe(portraitBeforeRenewal);
  const card=page.locator('[data-candidate-serial="5"]'),target=page.locator('[data-candidate-serial="1"]');
  await page.evaluate(()=>{
    (window as any).__draftDragEvents=[];
    for(const type of ['dragstart','dragover','drop','dragend'])document.addEventListener(type,event=>{
      const target=event.target as Element;(window as any).__draftDragEvents.push({type,tag:target.tagName,
        serial:target.closest<HTMLElement>('[data-candidate-serial]')?.dataset.candidateSerial});
    },{capture:true});
  });
  await card.scrollIntoViewIfNeeded();const sourceBox=(await card.boundingBox())!,targetBox=(await target.boundingBox())!;
  await page.mouse.move(sourceBox.x+sourceBox.width/2,sourceBox.y+sourceBox.height/2);await page.mouse.down();
  await page.mouse.move(sourceBox.x+sourceBox.width/2+10,sourceBox.y+sourceBox.height/2-10,{steps:4});
  await page.mouse.move(targetBox.x+30,targetBox.y+12,{steps:12});await page.mouse.move(targetBox.x+31,targetBox.y+12);await page.mouse.up();
  await info.attach('drag-events',{contentType:'application/json',body:JSON.stringify(await page.evaluate(()=>(window as any).__draftDragEvents))});
  await expect(page.locator('[data-candidate-serial]').first()).toHaveAttribute('data-candidate-serial','5');
  await page.locator('[data-candidate-serial="1"]').click();await expect(name).toHaveValue('Équipe 333');
  const selectedNames=await page.locator('[data-candidate-serial] .front-candidate-labels strong').allTextContents();
  const skills=await page.locator('[data-candidate-skill]').evaluateAll(rows=>Object.fromEntries(rows.map(row=>[
    (row as HTMLElement).dataset.candidateSkill,Math.round(Number((row.querySelector('.front-candidate-skill-meter') as HTMLElement).style.getPropertyValue('--skill-level'))*20)])));
  const avatar=page.locator('.front-candidate-portrait-controls img');const clothed=await avatar.getAttribute('src');
  await page.locator('.front-candidate-clothing input').uncheck();expect(await avatar.getAttribute('src')).not.toBe(clothed);
  await page.locator('.front-candidate-clothing input').check();expect(await avatar.getAttribute('src')).toBe(clothed);
  await page.screenshot({path:info.outputPath('pawns-1440.png')});
  await page.setViewportSize({width:960,height:720});await page.screenshot({path:info.outputPath('pawns-960.png')});
  expect(await front(page).evaluate(root=>root.scrollWidth<=root.clientWidth)).toBe(true);
  await page.setViewportSize({width:1440,height:1000});
  await button(page,'Retour').click();await expect(front(page)).toHaveAttribute('data-page','site');
  await button(page,'Retour').click();await expect(page.locator('#front-seed')).toHaveValue('42');
  await button(page,'Générer').click();await button(page,'Suivant').click();
  await front(page).locator('dialog').getByRole('button',{name:'Confirmer',exact:true}).click();
  await expect(page.locator('[data-candidate-serial]').first()).toHaveAttribute('data-candidate-serial','5');
  await page.locator('[data-candidate-serial="1"]').click();await expect(name).toHaveValue('Équipe 333');
  await page.locator('.front-candidate-team').dblclick();expect(await page.evaluate(()=>String(getSelection()))).toBe('');
  await button(page,'Démarrer').click();
  // A native capability warning can be needed after a manual reorder.
  const confirm=front(page).locator('dialog').getByRole('button',{name:'Confirmer',exact:true});
  if(await confirm.isVisible())await confirm.click();
  await expect(front(page)).toBeHidden({timeout:90000});await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90000});
  const created=await world(page);expect(created.tick).toBe(0);expect(created.seed).toBe(resolved.seed);
  expect(created.site).toMatchObject({...resolved.site});expect(created.planet?.homeTile).toBe(tile);expect(created.planet?.generationSeed).toBe(42);
  expect(created.climate?.revision).toBe(2);expect(created.scenario?.revision).toBe(10);
  expect(created.pawns).toHaveLength(0);expect(created.startingArrival?.phase).toBe('incoming');
  if(!created.startingArrival||created.startingArrival.phase==='opened')throw Error('Starting custody missing');
  const contained=created.startingArrival.pods.map(pod=>pod.pawn);
  expect(contained.map(p=>p.name)).toEqual(selectedNames.slice(0,3));
  expect(Object.fromEntries(Object.entries(contained[1]!.skills!).map(([key,value])=>[key,value.level]))).toEqual(skills);
  expect(validateWorld(created)).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
  await page.locator('[data-speed="1"]').click();await expect.poll(async()=>page.evaluate(()=>window.__lisiere.tick)).toBeGreaterThan(1);await pause(page);
  await panel(page,'menu');const continued=await world(page),manager=page.locator('[data-save-manager]');
  expect(continued.tick).toBeLessThan(15);expect(continued.startingArrival?.phase).toBe('incoming');expect(continued.pawns).toHaveLength(0);
  await manager.locator('[data-save-manager-name]').fill('Capsules V335');await manager.locator('[data-save-manager-action="create"]').click();
  await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const downloadPromise=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
  const file=await downloadPromise,exportPath=info.outputPath('new-start.json');await file.saveAs(exportPath);
  expect(deserializeWorld(await readFile(exportPath,'utf8'))).toEqual(continued);
  await page.locator('#browse-saves').click();await front(page).locator('input[name="front-save"]').first().check();
  await button(page,'Charger').click();await expectWorld(page,continued);
  await expect(page.locator('.starting-arrival')).toBeVisible();await page.screenshot({path:info.outputPath('capsules-iso.png')});
  await page.locator('#camera-mode').click();await expectWorld(page,continued);await page.screenshot({path:info.outputPath('capsules-perspective.png')});
  await page.locator('#camera-mode').click();
  await page.locator('.starting-arrival').getByRole('button',{name:'Reprendre',exact:true}).click();
  await expect.poll(async()=>page.evaluate(()=>window.__lisiere.world.startingArrival?.phase)).toBe('opened');await pause(page);
  const opened=await world(page);expect(opened.pawns.map(p=>p.id)).toEqual(contained.map(p=>p.id));
  expect(opened.relationships).toEqual(created.relationships);expect(validateWorld(opened)).toEqual([]);
  for(const pod of created.startingArrival.pods)for(const item of pod.items){
    const live=opened.piles.find(pile=>pile.id===item.id);expect(live).toBeDefined();expect(live?.item).toBe(item.item);expect(live?.quantity).toBe(item.quantity);
  }
  await expect(page.locator('.starting-arrival')).toBeHidden();expect(errors).toEqual([]);
  await info.attach('new-start-summary',{contentType:'application/json',body:JSON.stringify({tile,seed:created.seed,ticks:[created.tick,continued.tick,opened.tick],people:contained.map(p=>({id:p.id,name:p.name})),errors})});
});
