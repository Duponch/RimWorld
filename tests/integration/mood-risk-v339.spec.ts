import {expect,test,type Page} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {medicalCamp} from '../scenarios/health';
import {deserializeWorld,serializeWorld,validateWorld} from '../../src/sim/serialization';
import type {World} from '../../src/sim/types';
import {expectWorld,observeErrors,panel,pause,saveKey,world} from './helpers';

/** The six-person checkpoint is prepared only to qualify UI grouping and
 * navigation. V339_INPUT optionally adds the literal acquired V338 camp;
 * neither case changes a need or calls a command through a browser hook. */
function preparedGroups():World {
  const w=medicalCamp(6,32),moods=[4,10,15,25,30,34];
  w.pawns.forEach((p,i)=>{p.name=['Extrême','Majeur A','<b>Majeur B</b>','Mineur A','Mineur B','Mineur C'][i]!;p.mood=moods[i]!;delete p.traits;});
  w.pawns.reverse();return w;
}
async function centered(page:Page,id:number){
  await expect.poll(()=>page.evaluate(id=>{
    const p=window.__lisiere.world.pawns.find(p=>p.id===id)!;
    const point=window.__lisiere.projectCell(p.x,p.z),box=document.querySelector('#viewport canvas')!.getBoundingClientRect();
    return Math.hypot(point.x-box.width/2,point.y-box.height/2);
  },id)).toBeLessThan(1);
}
async function selectedNeeds(page:Page,w:World,id:number){
  await expect(page.locator('[data-colonist-tab="needs"]')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#inspector')).toContainText(w.pawns.find(p=>p.id===id)!.name);
  await expect(page.locator('[data-colonist-panel="needs"]')).toBeVisible();
  await expect(page.locator('#mood-gauge')).toHaveCount(1);
  await centered(page,id);
}

test('V339 native preventive alerts: prepared groups and optional literal food-camp continuation',async({playwright},info)=>{
  test.setTimeout(240000);
  const prepared=preparedGroups(),ids=[...prepared.pawns].sort((a,b)=>a.id-b.id).map(p=>p.id),
    cases:{name:string;initial:World;key:string;ids:number[];literal:boolean}[]=[{name:'prepared-groups',initial:prepared,key:'mood-risk-high',ids:ids.slice(0,3),literal:false}];
  if(process.env.V339_INPUT){
    const raw=await readFile(process.env.V339_INPUT,'utf8'),initial=deserializeWorld(raw);
    expect(createHash('sha256').update(raw).digest('hex')).toBe('e6eea52468ce91196a2a3b816b1df488e09acf47a498bfddb6891bb810a21925');
    expect(initial.tick).toBe(39073);expect(initial.pawns.find(p=>p.id===18532)).toMatchObject({name:'Gaël',mood:31,state:'resting',traits:['bloodlust','pessimist','nervous']});
    cases.push({name:'literal-v338',initial,key:'mood-risk-minor',ids:[18532],literal:true});
  }
  const browser=await playwright.chromium.launch({channel:'chrome'}),evidence:unknown[]=[];
  try{for(const scenario of cases){
    const {name,initial,key,ids:targets}=scenario;
    expect(validateWorld(initial),`${name}: valid input`).toEqual([]);
    const context=await browser.newContext({baseURL:process.env.LISIERE_BASE_URL??'http://127.0.0.1:5411',viewport:{width:1440,height:1000}});
    const page=await context.newPage(),errors=observeErrors(page);page.setDefaultTimeout(25000);
    try{
      await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
      await page.goto('/?scenario=camp&size=32&seed=339&e2e');await expect(page.locator('#loading')).toHaveCount(0);
      await pause(page);await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
      expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
      const alert=page.locator(`[data-alert="${key}"]`),tip=page.locator('#game-tooltip');
      await expect(alert).toBeVisible();await expect(page.locator('[data-alert^="mood-risk-"]')).toHaveCount(1);
      await expect(alert).not.toHaveAttribute('title',/.+/);
      await alert.focus();await expect(tip).toBeVisible();
      await expect(tip).toContainText('aléatoire');
      if(!scenario.literal){
        await expect(alert).toContainText('extrême');await expect(alert).toContainText('1');
        for(const p of initial.pawns)await expect(tip).toContainText(p.name);
        await expect(tip.locator('b')).toHaveCount(0);
      }else{
        await expect(alert).toContainText('mineur');await expect(tip).toContainText('Gaël');
      }
      await alert.press('Enter');await selectedNeeds(page,initial,targets[0]!);await expect(alert).toBeFocused();
      if(targets.length>1){
        await alert.press('Space');await selectedNeeds(page,initial,targets[1]!);
        await alert.click();await selectedNeeds(page,initial,targets[2]!);
        await alert.press('Enter');await selectedNeeds(page,initial,targets[0]!);
      }
      const node=await alert.elementHandle();
      // The actual clock changes confirmed snapshots. The alert node and its
      // ring persist through refreshes; no automatic pause is introduced.
      await page.locator('[data-speed="1"]').click();await alert.focus();
      await expect.poll(()=>page.evaluate(()=>window.__lisiere.tick)).toBeGreaterThan(initial.tick+8);
      await expect(page.locator('[data-speed="1"]')).toHaveAttribute('aria-pressed','true');
      await expect(alert).toBeFocused();expect(await alert.evaluate((element,old)=>element===old,node)).toBe(true);
      await alert.press('Enter');await selectedNeeds(page,await world(page),targets[targets.length>1?1:0]!);
      await pause(page);const continued=await world(page);expect(validateWorld(continued)).toEqual([]);
      const moodDetails=page.locator('#mood-inspection');
      if(!await moodDetails.evaluate(n=>(n as HTMLDetailsElement).open))await moodDetails.locator(':scope > summary').click();
      await expect(page.locator('#mood-gauge')).toBeVisible();
      await expect(page.locator('#mood-break-thresholds')).toContainText(scenario.literal?'43 / 24.57 / 6.14':'35 / 20 / 5');
      await page.screenshot({path:info.outputPath(`${name}-needs.png`)});
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,continued);await page.keyboard.press('Escape');
      await expect(alert).toBeVisible();await alert.press('Enter');await selectedNeeds(page,continued,targets[0]!);
      await page.screenshot({path:info.outputPath(`${name}-reload.png`)});
      await panel(page,'menu');const download=page.waitForEvent('download');await page.locator('[data-save-manager-action="export"]').click();
      const file=await download,path=info.outputPath(`${name}.json`);await file.saveAs(path);
      expect(deserializeWorld(await readFile(path,'utf8'))).toEqual(continued);
      expect(errors).toEqual([]);evidence.push({name,literal:scenario.literal,prepared:!scenario.literal,initialTick:initial.tick,continuedTick:continued.tick,backend:'WebGPU',targets,needs:true,focusStable:true,clockAlive:true,reloadExact:true,errors});
    }finally{await context.close();}
  }}finally{await browser.close();await writeFile(info.outputPath('mood-risk-summary.json'),JSON.stringify(evidence,null,2));}
});
