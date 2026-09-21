import { test, expect } from '@playwright/test';
import { revealCells } from './player-actions';
import { writeFileSync } from 'node:fs';
import { world, pause, panel, expectWorld, observeErrors, tool, cell } from './helpers';

test('V92 native: menus, pawn dossiers, responsive HUD, GPU designations and exact save', async ({playwright}) => {
  test.setTimeout(180_000);
  const browser = await playwright.chromium.launch({channel:'chromium',args:[]});
  const context = await browser.newContext({baseURL:process.env.V92_URL ?? 'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const page = await context.newPage(), errors = observeErrors(page), report: Record<string,unknown> = {};
  // Instrument the development response only; no diagnostics are shipped to Netlify.
  await page.route('**/src/main.ts*', async route => {
    const response=await route.fetch();
    await route.fulfill({response,body:`const v92Frame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(...args){window.__v92View=this;return v92Frame.apply(this,args);};\n`+await response.text()});
  });
  try {
    await page.goto('/?e2e'); const front=page.locator('.front-menu');
    await expect(front).toBeVisible();
    await expect(front).toHaveCSS('background-image', /planet.png/);
    await page.screenshot({path:'artifacts/interface-v92-home.png'});
    await front.getByRole('button',{name:'Nouvelle partie',exact:true}).click();
    await front.getByRole('button',{name:'Suivant',exact:true}).click();
    await front.getByRole('radio',{name:'Récit d’aventure',exact:true}).check();
    await front.getByRole('radio',{name:'Rechargeable à tout moment',exact:true}).check();
    await front.getByRole('button',{name:'Suivant',exact:true}).click();
    await page.locator('#front-seed').fill('42');
    await page.screenshot({path:'artifacts/interface-v92-setup.png'});
    await front.getByRole('button',{name:'Démarrer',exact:true}).click();
    await expect(front).toBeHidden({timeout:60_000});await pause(page);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    await page.locator('.colonist').first().click();
    for (const [name, selector] of [['Bio','.skills-inspection'],['Besoins','.needs'],['Santé','#health-inspection'],['Équipement','#equipment-details'],['Social','#social-inspection']]) {
      await page.getByRole('tab',{name,exact:true}).click();
      await expect(page.locator(selector).first()).toBeVisible();
      await expect(page.locator('[role=tabpanel]:visible')).toHaveCount(1);
      await page.screenshot({path:`artifacts/interface-v92-${name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}.png`});
    }
    await page.locator('.colonist').nth(1).click();
    await expect(page.getByRole('tab',{name:'Social',exact:true})).toHaveAttribute('aria-selected','true');
    await page.getByRole('tab',{name:'Bio',exact:true}).click();
    report.portraits=await page.locator('.portrait-head').evaluateAll(nodes=>nodes.map(n=>({parent:n.parentElement!.className,image:getComputedStyle(n).backgroundImage,position:getComputedStyle(n).backgroundPosition})));
    const sizes=[];
    for(const [width,height] of [[1280,720],[1920,1080],[1440,1000]]){
      await page.setViewportSize({width,height});
      const layout=await page.evaluate(()=>{
        const rect=(s:string)=>{const r=document.querySelector(s)!.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};};
        return {inspector:rect('#inspector'),resources:rect('.resource-list'),tabs:rect('.colonist-inspector-tabs'),time:rect('.time-panel'),alerts:rect('.alerts'),nav:rect('.main-tabs'),pageWidth:document.documentElement.scrollWidth};
      });
      expect(layout.inspector.right).toBeLessThan(layout.time.x);
      expect(layout.resources.bottom).toBeLessThanOrEqual(layout.tabs.y);
      expect(layout.inspector.bottom).toBeLessThan(layout.nav.y);
      expect(layout.time.bottom).toBeLessThan(layout.nav.y);
      expect(layout.alerts.bottom).toBeLessThan(layout.time.y);
      expect(layout.pageWidth).toBe(width);sizes.push({width,height,...layout});
    }
    report.layout=sizes;report.portraits=await page.locator('.portrait-head').evaluateAll(nodes=>nodes.map(n=>({parent:n.parentElement!.className,image:getComputedStyle(n).backgroundImage,position:getComputedStyle(n).backgroundPosition})));
    await page.screenshot({path:'artifacts/interface-v92-layout.png'});
    const prevented=await page.locator('#viewport canvas').evaluate(node=>!node.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:800,clientY:450})));
    expect(prevented).toBe(true);
    await page.keyboard.press('Escape');
    // Real pointer designations: choose an unobscured on-screen tree and rock.
    for(const kind of ['chop','mine'] as const){
      await tool(page,kind);
      const target=await page.evaluate(kind=>{
        const w=window.__lisiere.world,pawn=w.pawns[0]!;
        const candidates=kind==='chop'?w.resources.filter(r=>r.kind==='tree'):w.tiles.flatMap((t,i)=>t.terrain==='rock'?[{x:i%w.width,z:Math.floor(i/w.width)}]:[]);
        return candidates.sort((a,b)=>(a.x-pawn.x)**2+(a.z-pawn.z)**2-(b.x-pawn.x)**2-(b.z-pawn.z)**2)[0];
      },kind);
      expect(target,kind).toBeTruthy();await revealCells(page,[target!]);await cell(page,target!.x,target!.z);
      await expect.poll(async()=>(await world(page)).jobs.some(j=>j.kind===kind&&j.x===target!.x&&j.z===target!.z)).toBe(true);
    }
    await page.keyboard.press('Escape');
    report.gpu=await page.evaluate(()=>{const v=(window as any).__v92View;return {grass:v.grass.mesh.geometry.instanceCount,icons:v.designations.mesh.geometry.instanceCount,grassMesh:v.grass.mesh.name,iconMesh:v.designations.mesh.name,drawCalls:v.stats.drawCalls};});
    expect((report.gpu as any).icons).toBeGreaterThanOrEqual(2);
    await page.screenshot({path:'artifacts/interface-v92-designations.png'});
    await page.locator('.colonist').first().click();
    const rightPoint=await page.evaluate(()=>{const p=window.__lisiere.world.pawns[0]!;return window.__lisiere.projectCell(p.x+2,p.z);});
    await page.mouse.click(rightPoint.x,rightPoint.y,{button:'right'});
    await expect(page.locator('#order-menu')).toBeVisible();await page.keyboard.press('Escape');
    // A/B on the same paused world isolates the cost of the blade draw.
    report.grassAB=[];
    for(const enabled of [false,true,false,true]){
      await page.evaluate(on=>{(window as any).__v92View.grass.mesh.visible=on;},enabled);
      await page.waitForTimeout(500);
      const timings=await page.evaluate(()=>new Promise(resolve=>{
        const frames:number[]=[];let prior=performance.now();const start=prior;
        const sample=(t:number)=>{frames.push(t-prior);prior=t;if(t-start>2500&&frames.length>=120){frames.sort((a,b)=>a-b);resolve({n:frames.length,p50:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],max:frames.at(-1)});}else requestAnimationFrame(sample);};requestAnimationFrame(sample);
      }));
      (report.grassAB as unknown[]).push({enabled,...timings as object});
    }
    // One short measured native window covers the new shader at the real 250² site.
    await page.evaluate(()=>{const p={frames:[] as number[],last:0,active:true};(window as any).__v92=p;const frame=(t:number)=>{if(!p.active)return;if(p.last)p.frames.push(t-p.last);p.last=t;requestAnimationFrame(frame);};requestAnimationFrame(frame);});
    const before=(await world(page)).tick, start=Date.now();
    await page.locator('[data-speed="6"]').click();await page.waitForTimeout(10000);await pause(page);
    const saved=await world(page), elapsed=Date.now()-start;
    report.performance=await page.evaluate(()=>{const p=(window as any).__v92;p.active=false;const frames=p.frames.sort((a:number,b:number)=>a-b);return {frames:frames.length,p95:frames[Math.floor(frames.length*.95)],max:frames.at(-1)};});
    report.simulation={ticks:saved.tick-before,elapsedMs:elapsed,speed:(saved.tick-before)/elapsed*1000/6};
    await page.screenshot({path:'artifacts/interface-v92-colony.png'});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,saved);
    expect(errors).toEqual([]);
  } finally {
    report.errors=errors;writeFileSync('artifacts/interface-native-v92.json',JSON.stringify(report,null,2));await browser.close();
  }
});
