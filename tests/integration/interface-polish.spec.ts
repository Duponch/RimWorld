import { test, expect, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { observeErrors, pause, panel, world, expectWorld } from './helpers';
import { visitorTradeFixture } from '../scenarios/visitors';
import { serializeWorld } from '../../src/sim/serialization';

async function screenshot(page:Page,name:string){await page.screenshot({path:`artifacts/interface-v94-${name}.png`});}
test('V94 native: stable management panels, upright plants, complete HUD and illustrated cursors',async({playwright})=>{
  test.setTimeout(240_000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.setDefaultTimeout(15_000);
  const errors=observeErrors(page),report:Record<string,unknown>={};
  page.on('pageerror',error=>{report.errorStack=error.stack;});
  await page.route('**/src/main.ts*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:`const v94Frame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(...args){window.__v94View=this;return v94Frame.apply(this,args);};\n`+await response.text()});
  });
  try{
    await page.goto('http://127.0.0.1:5173/?e2e');
    const front=page.locator('.front-menu');await expect(front).toBeVisible();
    await page.evaluate(()=>document.fonts.ready);await screenshot(page,'home');
    await front.getByRole('button',{name:'Nouvelle partie',exact:true}).click();await screenshot(page,'scenario');
    await front.getByRole('button',{name:'Suivant',exact:true}).click();
    await front.getByRole('radio',{name:'Récit d’aventure',exact:true}).check();
    await front.getByRole('radio',{name:'Rechargeable à tout moment',exact:true}).check();await screenshot(page,'story');
    await front.getByRole('button',{name:'Suivant',exact:true}).click();await page.locator('#front-seed').fill('42');await screenshot(page,'site');
    await front.getByRole('button',{name:'Démarrer',exact:true}).click();await expect(front).toBeHidden({timeout:60_000});await pause(page);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    await screenshot(page,'hud');await page.locator('.colonist').first().click();
    for(const name of ['Bio','Besoins','Santé','Équipement','Social']){
      await page.getByRole('tab',{name,exact:true}).click();await expect(page.locator('[role=tabpanel]:visible')).toHaveCount(1);await screenshot(page,name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
    }
    await page.locator('.colonist').nth(1).click();await expect(page.getByRole('tab',{name:'Social',exact:true})).toHaveAttribute('aria-selected','true');
    await page.getByRole('tab',{name:'Bio',exact:true}).click();
    const layouts=[];
    for(const [width,height] of [[1280,720],[1920,1080],[1440,1000]]){
      await page.setViewportSize({width,height});
      const layout=await page.evaluate(()=>{
        const rect=(s:string)=>{const r=document.querySelector(s)!.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height,width:r.width};};
        return {inspector:rect('#inspector'),resources:rect('.resource-list'),pages:rect('.colonist-inspector-pages'),time:rect('.time-panel'),alerts:rect('.alerts'),nav:rect('.main-tabs'),pageWidth:document.documentElement.scrollWidth};
      });
      expect.soft(layout.resources.width).toBe(216);
      expect.soft(layout.inspector.bottom).toBeLessThan(layout.nav.y);
      expect.soft(layout.pages.height).toBeGreaterThan(190);
      expect.soft(layout.inspector.right).toBeLessThan(layout.time.x);
      expect.soft(layout.alerts.bottom).toBeLessThan(layout.time.y);
      expect.soft(layout.pageWidth).toBe(width);layouts.push({width,height,...layout});
      await screenshot(page,`bio-${width}`);
    }
    report.layouts=layouts;
    await page.keyboard.press('Escape');await panel(page,'architect');
    const frame=await page.locator('#architect-panel').boundingBox();const categories=await page.locator('[data-category]').evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).dataset.category!));
    const seen=[];
    for(const category of categories){
      await page.locator(`[data-category="${category}"]`).click();
      expect.soft(await page.locator('#architect-panel').boundingBox()).toEqual(frame);
      const ids=await page.locator('[data-tool]:visible').evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).dataset.tool!));
      for(const id of ids){
        const button=page.locator(`[data-tool="${id}"]`);if(await button.isDisabled())continue;
        await button.click();expect.soft(await page.locator('#architect-panel').boundingBox()).toEqual(frame);seen.push(id);
      }
      await screenshot(page,`architect-${category}`);
    }
    report.categories=categories;report.selectedTools=seen;
    const images=await page.locator('.tool-icon').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,image:getComputedStyle(n).backgroundImage})));
    expect(images).toHaveLength(60);expect(images.every(n=>n.text===''&&n.image.includes('architect-'))).toBe(true);report.pngTools=images.length;
    const cursorImages=new Set<string>();
    for(const [id,category,kind] of [['select','orders','select'],['mine','orders','mine'],['chop','orders','chop'],['harvest','orders','harvest'],['cut','orders','cut'],['wall','structure','build'],['deconstruct','orders','deconstruct'],['stockpile','zones','zones'],['cancel','orders','cancel']]){
      await page.locator(`[data-category="${category}"]`).click();await page.locator(`[data-tool="${id}"]`).click();
      await expect(page.locator('#viewport')).toHaveAttribute('data-cursor',kind);
      const cursor=await page.locator('#viewport canvas').evaluate(n=>getComputedStyle(n).cursor);
      expect(cursor).toContain('data:image/png;base64,');
      const hotspot=cursor.match(/\) (\d+) (\d+),/);expect(hotspot).toBeTruthy();
      expect(Number(hotspot![1])).toBeLessThanOrEqual(6);expect(Number(hotspot![2])).toBeLessThanOrEqual(3);cursorImages.add(cursor);
    }
    expect(cursorImages.size).toBe(9);report.cursors=cursorImages.size;
    await page.locator('[data-category="orders"]').click();await page.locator('[data-tool="chop"]').click();
    await page.locator('#architect-panel [data-close-panel]').click();
    await expect(page.locator('#architect-panel')).toBeHidden();await expect(page.locator('#viewport')).toHaveAttribute('data-cursor','chop');
    const chopTarget=await page.evaluate(()=>{
      const canvas=document.querySelector<HTMLCanvasElement>('#viewport canvas')!,bounds=canvas.getBoundingClientRect();
      for(const resource of window.__lisiere.world.resources)if(resource.kind==='tree'){
        const point=window.__lisiere.projectCell(resource.x,resource.z),x=bounds.x+point.x,y=bounds.y+point.y;
        if(document.elementFromPoint(x,y)===canvas)return {x:resource.x,z:resource.z,screenX:x,screenY:y};
      }
      return null;
    });
    expect(chopTarget).not.toBeNull();await page.mouse.click(chopTarget!.screenX,chopTarget!.screenY);
    await expect.poll(async()=>{const w=await world(page);return w.jobs.some(job=>job.kind==='chop'&&job.x===chopTarget!.x&&job.z===chopTarget!.z);}).toBe(true);
    report.realChop={x:chopTarget!.x,z:chopTarget!.z};
    await page.keyboard.press('Escape');await expect(page.locator('#viewport')).toHaveAttribute('data-cursor','select');
    await page.setViewportSize({width:1280,height:720});await panel(page,'architect');
    const compactFrame=await page.locator('#architect-panel').boundingBox();
    const completeResources=await page.locator('.resource-list').boundingBox();expect(completeResources!.width).toBe(216);
    await expect(page.locator('.resource-name').first()).toBeVisible();
    for(const category of categories){await page.locator(`[data-category="${category}"]`).click();expect(await page.locator('#architect-panel').boundingBox()).toEqual(compactFrame);}
    await page.locator('[data-category="furniture"]').click();await page.locator('[data-tool="armchair"]').click();
    await expect(page.locator('#construction-material')).toHaveValue('cloth');await screenshot(page,'architect-1280');
    await page.locator('#construction-material').click();await screenshot(page,'material-picker');await page.keyboard.press('Escape');
    await page.setViewportSize({width:1440,height:1000});await page.keyboard.press('Escape');
    const management:Record<string,unknown>={};
    for(const name of ['work','schedule','assign','research','wildlife','history','menu']){
      await page.locator(`[data-panel="${name}"]`).click();await screenshot(page,name);
      const resourceWidth=await page.locator('.resource-list').evaluate(node=>node.getBoundingClientRect().width);expect(resourceWidth).toBe(216);
      if(['work','schedule','assign'].includes(name)){
        const wrap=page.locator(`#${name}-panel .${name==='schedule'?'schedule-table-wrap':'work-table-wrap'}`).first();
        const dimensions=await wrap.evaluate(node=>({client:node.clientWidth,scroll:node.scrollWidth}));expect(dimensions.scroll).toBe(dimensions.client);management[name]=dimensions;
      }
      if(name==='schedule'){
        const copy=await page.locator('.schedule-copy').first().evaluate(node=>({gap:getComputedStyle(node).gap,buttons:[...node.querySelectorAll('button')].map(button=>button.getBoundingClientRect().width)}));
        expect(copy.gap).not.toBe('0px');expect(new Set(copy.buttons).size).toBe(1);management.scheduleCopy=copy;
      }
      if(name==='wildlife'){
        const row=page.locator('.fauna-row').first();if(await row.count()){
          const columns=await row.evaluate(node=>[...node.children].slice(0,6).map(child=>({x:child.getBoundingClientRect().x,width:child.getBoundingClientRect().width})));
          await page.locator('[data-speed="1"]').click();await page.waitForTimeout(700);await pause(page);
          const after=await row.evaluate(node=>[...node.children].slice(0,6).map(child=>({x:child.getBoundingClientRect().x,width:child.getBoundingClientRect().width})));
          expect(after).toEqual(columns);management.wildlifeColumns=columns;
        }
      }
      if(name==='assign'){await page.locator('#manage-food-policies').click();await screenshot(page,'food-policy');await page.keyboard.press('Escape');}
    }
    report.management=management;
    await page.locator('#help-open').click();await screenshot(page,'help');await page.keyboard.press('Escape');
    await panel(page,'work');
    const priority=page.locator('[data-work="build"]').first();const old=await priority.inputValue();await priority.selectOption(old==='1'?'2':'1');
    await expect.poll(async()=>String((await world(page)).pawns[0].priorities.build)).toBe(old==='1'?'2':'1');await priority.selectOption(old);
    await page.keyboard.press('Escape');await page.locator('.colonist').first().click();
    await page.getByRole('tab',{name:'Bio',exact:true}).click();await page.getByRole('tab',{name:'Bio',exact:true}).press('ArrowRight');
    await expect(page.getByRole('tab',{name:'Besoins',exact:true})).toHaveAttribute('aria-selected','true');
    expect(await page.locator('#viewport canvas').evaluate(n=>!n.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true})))).toBe(true);
    const point=await page.evaluate(()=>{const p=window.__lisiere.world.pawns[0];return window.__lisiere.projectCell(p.x+2,p.z);});
    await page.mouse.click(point.x,point.y,{button:'right'});await expect(page.locator('#order-menu')).toBeVisible();await screenshot(page,'orders');await page.keyboard.press('Escape');
    const before=(await world(page)).tick,start=Date.now();
    const frames=page.evaluate(()=>new Promise<number[]>(resolve=>{const samples:number[]=[];let last=performance.now();const end=last+8000;const frame=(t:number)=>{samples.push(t-last);last=t;if(t>end)resolve(samples);else requestAnimationFrame(frame);};requestAnimationFrame(frame);}));
    await page.locator('[data-speed="6"]').click();const timings=(await frames).sort((a,b)=>a-b);await pause(page);
    const saved=await world(page),elapsed=Date.now()-start;
    const plantPresentation=await page.evaluate(()=>{const view=(window as any).__v94View;return {instances:view.plants.instanceCount(),group:view.plants.group.name,oldGrass:'grass' in view};});
    expect(plantPresentation.instances).toBeGreaterThan(0);expect(plantPresentation.group).toBe('plant-cluster-layer');expect(plantPresentation.oldGrass).toBe(false);report.plants=plantPresentation;
    writeFileSync('tmp/interface-v94-checkpoint.json',JSON.stringify(saved));
    report.performance={frames:timings.length,p95:timings[Math.floor(timings.length*.95)],max:timings.at(-1),speed:(saved.tick-before)/elapsed*1000/6};
    await panel(page,'menu');await page.locator('#save').click();
    try{await expect(page.locator('#load')).toBeEnabled();}catch(error){report.saveDiagnostics=await page.evaluate(()=>({notice:document.querySelector('#notice')?.textContent,slots:localStorage.length,load:document.querySelector('#load')?.outerHTML,save:document.querySelector('#save')?.outerHTML}));throw error;}
    await page.locator('#load').click();await expectWorld(page,saved);
    await page.reload();await expect(front).toBeVisible();await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await screenshot(page,'saves');
    await front.locator('.front-save input').first().check();await front.getByRole('button',{name:'Charger',exact:true}).click();await expect(front).toBeHidden({timeout:60_000});await expectWorld(page,saved);report.coldRestore=true;
    report.fonts=await page.evaluate(()=>({sans:document.fonts.check('14px "Lisiere Sans"'),serif:document.fonts.check('23px "Lisiere Serif"')}));
    expect(errors).toEqual([]);
    report.passed=true;
  }finally{report.errors=errors;writeFileSync('artifacts/interface-native-v94.json',JSON.stringify(report,null,2));await browser.close();}
});

test('V94 native: trade modal preserves readable controls and real contact',async({playwright})=>{
  test.setTimeout(90_000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=observeErrors(page);
  page.setDefaultTimeout(15_000);
  try{
    const {world:initial,traderId,pawnId}=visitorTradeFixture();
    await page.addInitScript(data=>localStorage.setItem('lisiere.save.v1',data),serializeWorld(initial));
    await page.goto('http://127.0.0.1:5173/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('.front-save input').first().check();await front.getByRole('button',{name:'Charger',exact:true}).click();await expect(front).toBeHidden({timeout:60_000});
    await page.locator('#trade-letter').click();await page.locator('#trade-merchant').selectOption(String(traderId));await page.locator('#trade-negotiator').selectOption(String(pawnId));await page.locator('#trade-contact').click();
    await expect(page.locator('#trade-goods')).toBeVisible({timeout:30_000});await screenshot(page,'trade');
    const rect=await page.locator('#trade-dialog').boundingBox();expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.y).toBeGreaterThanOrEqual(0);expect(rect!.y+rect!.height).toBeLessThanOrEqual(720);
    await page.locator('#trade-close').click();expect(errors).toEqual([]);
    writeFileSync('artifacts/interface-trade-v94.json',JSON.stringify({passed:true,viewport:{width:1280,height:720},rect,errors}));
  }finally{await browser.close();}
});
