import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {expect,test,type Page} from '@playwright/test';
import {deserializeWorld,serializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {decodeStoredSave} from '../../src/ui/save-storage-codec.ts';
import {mapObjectsAt} from '../../src/ui/map-object-selection.ts';
import {cell,expectWorld,observeErrors,panel,pause,pawnTab,saveKey,world} from './helpers.ts';
import {revealCells} from './player-actions.ts';
import {writeTestFile} from '../test-output.ts';

const fonts=[
  {id:'comfortaa',family:'Comfortaa'},{id:'baloo-2',family:'Baloo 2'},
  {id:'bree-serif',family:'Bree Serif'},{id:'grandstander',family:'Grandstander'},
  {id:'patrick-hand',family:'Patrick Hand'},{id:'quicksand',family:'Quicksand'},
] as const;

test('V317 selected management controls remain visually distinct',async({playwright,baseURL})=>{
  const browser=await playwright.chromium.launch({channel:'chrome',headless:process.env.PAPER_V317_HEADLESS==='1',args:[]});
  const page=await browser.newPage({baseURL,viewport:{width:1920,height:1080}}),errors=observeErrors(page);
  try{
    await page.goto('/?scenario=camp&e2e&size=32');
    await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);await pause(page);const initial=await world(page);
    await panel(page,'architect');
    const selected=page.locator('[data-category="production"]'),other=page.locator('[data-category="structure"]');
    const colors=()=>page.evaluate(()=>[...document.querySelectorAll<HTMLElement>('#architect-panel [data-category]')].filter(e=>!e.hidden).map(e=>({id:e.dataset.category,active:e.classList.contains('active'),color:getComputedStyle(e).backgroundColor})));
    await selected.click();await page.mouse.move(1800,300);
    await expect.poll(async()=>{const rows=await colors();return rows.find(r=>r.id==='production')?.color!==rows.find(r=>r.id==='structure')?.color;}).toBe(true);
    await expect(selected).toHaveClass(/active/);await expect(other).not.toHaveClass(/active/);
    await page.screenshot({path:test.info().outputPath('active-production.png'),animations:'disabled'});
    await other.click();await page.mouse.move(1800,300);
    await expect.poll(async()=>{const rows=await colors();return rows.find(r=>r.id==='production')?.color!==rows.find(r=>r.id==='structure')?.color;}).toBe(true);
    await expect(other).toHaveClass(/active/);await expect(selected).not.toHaveClass(/active/);
    const categoryColors=await colors();
    await page.keyboard.press('Escape');await panel(page,'research');
    const node=page.locator('.research-node-select').first();await node.focus();
    // Tab is the game's Architect shortcut, not DOM traversal. A directional
    // key switches Chrome to keyboard modality without activating research.
    await expect(node).toBeFocused();await page.keyboard.press('ArrowRight');
    const focus=await node.evaluate(e=>({visible:e.matches(':focus-visible'),offset:getComputedStyle(e).outlineOffset,width:getComputedStyle(e).outlineWidth}));
    expect(focus.visible).toBe(true);expect(parseFloat(focus.offset)).toBeLessThan(0);expect(parseFloat(focus.width)).toBeGreaterThan(0);
    const tip=page.locator('#game-tooltip');await expect(tip).toBeVisible();
    const progression=tip.locator('dt').filter({hasText:'Progression'});
    const tipLayout=await progression.evaluate(e=>({height:e.getBoundingClientRect().height,lineHeight:parseFloat(getComputedStyle(e).lineHeight),overflow:e.parentElement!.scrollWidth-e.parentElement!.clientWidth}));
    expect(tipLayout.height).toBeLessThanOrEqual(tipLayout.lineHeight+1);expect(tipLayout.overflow).toBeLessThanOrEqual(1);
    await page.screenshot({path:test.info().outputPath('research-keyboard-focus.png'),animations:'disabled'});
    await expectWorld(page,initial);expect(errors).toEqual([]);
    await writeTestFile(test.info().outputPath('report.json'),JSON.stringify({categoryColors,focus,tipLayout,errors,tick:initial.tick,worldUnchanged:true},null,2));
  }finally{await page.close();await browser.close();}
});

/** Cosmetic journey on the unchanged, paused public colony. All controls are
 * actual DOM controls. No model command, injected offer, resource or task is
 * used to make the interface look populated. ROOT alone executes this test. */
test('V317 paper UI: real Aulnes dossiers, panels, six fonts and exact reload',async({playwright,baseURL})=>{
  test.setTimeout(240_000);
  const source='public/test-saves/v284/les-aulnes-integrees.json';
  const raw=await readFile(source,'utf8'),sha256=createHash('sha256').update(raw).digest('hex');
  expect(sha256).toBe('6d75f98d4435e8b4569f11fce1969a71d31ba523fcf36ad864f35ba3191eedb1');
  const initial=deserializeWorld(await decodeStoredSave(raw));
  expect(validateWorld(initial)).toEqual([]);expect(initial.tick).toBe(8434);expect(initial.pawns).toHaveLength(15);
  const browser=await playwright.chromium.launch({channel:'chrome',headless:process.env.PAPER_V317_HEADLESS==='1',args:[]});
  const page=await browser.newPage({baseURL:baseURL??process.env.PAPER_V317_URL??'http://127.0.0.1:5388',viewport:{width:2560,height:1440}});
  page.setDefaultTimeout(12_000);
  const errors=observeErrors(page),checks:{name:string;detail?:unknown}[]=[],captures:string[]=[];
  let loaded=false,completed=false;
  const screenshotAudits:{name:string;detail:unknown}[]=[];
  const frame=()=>page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  const record=(name:string,detail?:unknown)=>checks.push({name,detail});
  const screenshot=async(name:string)=>{
    const path=test.info().outputPath(`${name}.png`);await page.screenshot({path});captures.push(path);
    const detail=await page.evaluate(()=>{
      const visible=(e:Element)=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;};
      const heavyBorders=[...document.querySelectorAll<HTMLElement>('#app *')].filter(visible).flatMap(e=>{
        const c=getComputedStyle(e);if(c.visibility==='hidden'||Number(c.opacity)===0)return [];
        const sides=['Top','Right','Bottom','Left'] as const;
        const borders=sides.map(side=>({side,width:parseFloat(c[`border${side}Width`]),color:c[`border${side}Color`]})).filter(b=>b.width>=2);
        return borders.length?[{tag:e.tagName,id:e.id,className:e.className,text:(e.textContent??'').trim().slice(0,90),borders}]:[];
      });
      const warnings=[...document.querySelectorAll<HTMLElement>('#notice,#incident-panel,.front-error')].filter(visible).map(e=>({id:e.id,text:e.textContent}));
      return {heavyBorders,warnings};
    });
    screenshotAudits.push({name,detail});
  };
  async function assertCardFits(selector:string,label:string){
    const bounds=await page.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,scroll:e.scrollWidth,client:e.clientWidth,width:innerWidth,height:innerHeight};});
    expect(bounds.left,`${label}: left`).toBeGreaterThanOrEqual(0);expect(bounds.top,`${label}: top`).toBeGreaterThanOrEqual(0);
    expect(bounds.right,`${label}: right`).toBeLessThanOrEqual(bounds.width+1);expect(bounds.bottom,`${label}: bottom`).toBeLessThanOrEqual(bounds.height+1);
    expect(bounds.scroll,`${label}: horizontal overflow`).toBeLessThanOrEqual(bounds.client+1);record(label,bounds);
  }
  async function exactCheckpoint(label:string){
    await page.keyboard.press('Escape');await pause(page);await expectWorld(page,initial);
    await panel(page,'menu');await page.locator('#save').click();
    await expect.poll(async()=>{const stored=await page.evaluate(k=>window.__lisiere.saveRepository.peekItem(k),saveKey);return stored?serializeWorld(deserializeWorld(await decodeStoredSave(stored))):null;}).toBe(serializeWorld(initial));
    await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    record(`Exact save/reload ${label}`,{tick:initial.tick,humans:initial.pawns.length});
  }
  try{
    await page.goto('/?e2e');
    const front=page.locator('.front-menu');await expect(front).toBeVisible();
    await screenshot('home-2560');
    await front.getByRole('button',{name:'Options',exact:true}).click();
    await expect(front).toHaveAttribute('data-page','options');await expect(page.locator('#front-ui-font')).toBeVisible();
    await screenshot('options-2560');
    await front.getByRole('button',{name:'Retour',exact:true}).click();
    await front.getByRole('button',{name:'Nouvelle partie',exact:true}).click();
    await front.getByRole('button',{name:'Suivant',exact:true}).click();
    await front.getByRole('radio',{name:'Récit d’aventure',exact:true}).check();
    await front.getByRole('radio',{name:'Rechargeable à tout moment',exact:true}).check();
    await front.getByRole('button',{name:'Suivant',exact:true}).click();
    const seed=page.locator('#front-seed');await seed.fill('314159');await seed.focus();await page.keyboard.press('Control+A');
    expect(await seed.evaluate((e:HTMLInputElement)=>({start:e.selectionStart,end:e.selectionEnd,value:e.value}))).toEqual({start:0,end:6,value:'314159'});
    record('Editable text remains selectable through real keyboard input');

    await page.goto('/?scenario=camp&e2e&size=32');
    await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);await pause(page);
    await page.evaluate(({key,data})=>window.__lisiere.saveRepository.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');loaded=true;
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    await exactCheckpoint('baseline');
    const pawn=initial.pawns.find(p=>p.name==='Noé')??initial.pawns.find(p=>!p.prisoner)!;
    await page.locator(`[data-pawn="${pawn.id}"]`).click();
    for(const tab of ['journal','gear','social','bio','needs','health'] as const){
      await pawnTab(page,tab);await expect(page.locator('[data-colonist-panel]:visible')).toHaveCount(1);
      await assertCardFits('.colonist-inspector-pages',`Dossier ${tab} fits 2560`);await screenshot(`dossier-${tab}-2560`);
    }
    await pawnTab(page,'bio');
    await expect(page.locator('[data-bio-name]')).toHaveText(pawn.name);
    await expect(page.locator('.appearance-inspection-portrait')).toHaveJSProperty('complete',true);
    expect(await page.locator('.appearance-inspection-portrait').evaluate((e:HTMLImageElement)=>e.naturalWidth)).toBeGreaterThan(0);
    const mining=page.locator('[data-skill-entry="mining"]'),tip=page.locator('#game-tooltip');
    await mining.hover();await expect(tip).toBeVisible();await expect(tip).toContainText('Minage');await expect(tip).toContainText('Expérience du niveau');
    await screenshot('mining-tooltip-2560');await page.keyboard.press('Escape');await expect(tip).toBeHidden();
    await expect(page.locator('[data-colonist-panel="bio"]')).toBeVisible();
    await page.locator('[data-bio-name]').hover();await mining.hover();await expect(tip).toBeVisible();
    await page.locator('[data-bio-name]').hover();await expect(tip).toBeHidden();record('Real mining tooltip appears, Escape dismisses it and hover departure hides it');
    await page.locator('[data-bio-name]').dblclick();
    expect(await page.evaluate(()=>getSelection()?.toString()??'')).toBe('');record('Double click on dossier text does not select interface text');
    const hitzones=await page.locator('#inspector').evaluate(host=>{
      const pages=host.querySelector('.colonist-inspector-pages')!.getBoundingClientRect(),h=host.getBoundingClientRect();
      const summary=host.querySelector('.colonist-inspector-summary')!.getBoundingClientRect(),actions=host.querySelector('.colonist-inspector-actions')!.getBoundingClientRect();
      const targets=[{name:'Beside dossier',x:(pages.right+h.right)/2,y:(pages.top+pages.bottom)/2},{name:'Between footer cards',x:(summary.right+actions.left)/2,y:(summary.top+summary.bottom)/2}];
      return {pointer:getComputedStyle(host).pointerEvents,targets:targets.map(p=>({...p,tag:document.elementFromPoint(p.x,p.y)?.tagName})),tabs:[...host.querySelectorAll<HTMLElement>('[data-colonist-tab]')].map(button=>{const r=button.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('[data-colonist-tab]')===button;})};
    });
    expect(hitzones.pointer).toBe('none');expect(hitzones.targets.map(t=>t.tag)).toEqual(['CANVAS','CANVAS']);expect(hitzones.tabs.every(Boolean)).toBe(true);record('Transparent inspector gaps reach canvas while tabs remain real hit targets',hitzones);

    for(const name of ['work','schedule','assign','research','wildlife','world','quests','menu'] as const){
      await panel(page,name);await assertCardFits(`#${name}-panel`,`Management ${name} fits 2560`);await screenshot(`panel-${name}-2560`);await page.keyboard.press('Escape');
    }
    for(const name of ['animals','history'] as const){
      await page.locator(`[data-panel="${name}"]`).click();await expect(page.locator(`#${name}-panel`)).toBeVisible();
      await assertCardFits(`#${name}-panel`,`Management ${name} fits 2560`);await screenshot(`panel-${name}-2560`);await page.keyboard.press('Escape');
    }
    await panel(page,'world');await page.locator('[data-world-tab="group"]').click();await expect(page.locator('#group-content')).toBeVisible();
    await screenshot('world-globe-2560');await page.locator('[data-world-tab="individual"]').click();await expect(page.locator('#individual-world-content')).toBeVisible();await page.keyboard.press('Escape');
    await panel(page,'architect');
    const categories=await page.locator('#architect-panel [data-category]').evaluateAll(buttons=>buttons.map(b=>(b as HTMLElement).dataset.category!));
    expect(categories).not.toContain('orders');expect(categories).not.toContain('zones');
    for(const category of categories){
      await page.locator(`#architect-panel [data-category="${category}"]`).click();
      await expect(page.locator(`#architect-panel [data-category="${category}"]`)).toHaveClass(/active/);
      expect(await page.locator('#architect-panel .tool:not([hidden])').count(),`Actual tools in ${category}`).toBeGreaterThan(0);
      await assertCardFits('#architect-panel',`Architect category ${category} fits 2560`);await screenshot(`architect-${category}-2560`);
    }
    await page.keyboard.press('Escape');
    for(const name of ['orders','zones'] as const){
      await page.locator(`#${name}-open`).click();await expect(page.locator(`#${name}-tools`)).toBeVisible();
      expect(await page.locator(`#${name}-tools [data-tool]`).count()).toBeGreaterThan(0);
      await screenshot(`${name}-drawer-2560`);await page.keyboard.press('Escape');await expect(page.locator(`#${name}-tools`)).toBeHidden();
    }
    // Select an existing physical reserve. Filtering its display stays passive.
    const reserve=initial.stockpiles.find(s=>mapObjectsAt(initial,s).length===1)??initial.stockpiles[0]!;
    expect(reserve).toBeDefined();await revealCells(page,[reserve]);
    for(let attempt=0;attempt<6&&!await page.locator('#cell-storage').isVisible();attempt++)await cell(page,reserve.x,reserve.z);
    await expect(page.locator('#cell-storage')).toBeVisible();
    const search=page.locator('#cell-storage [data-storage-search]');await search.fill('riz');
    await expect(page.locator('#cell-storage [data-storage-item="rice"]')).toBeVisible();await screenshot('existing-storage-2560');
    await search.fill('');await page.keyboard.press('Escape');record('Existing stockpile has passive actual item search');

    for(const viewport of [{width:2560,height:1440},{width:1920,height:1080}]){
      await page.setViewportSize(viewport);
      for(const font of fonts){
        await panel(page,'menu');await page.locator('#ui-font').selectOption(font.id);
        await page.evaluate(async family=>{await Promise.all([400,700].map(weight=>document.fonts.load(`${weight} 16px "${family}"`,'Éléonore, cœur, œuf, Noël.')));},font.family);
        await page.keyboard.press('Escape');await page.locator(`[data-pawn="${pawn.id}"]`).click();await pawnTab(page,'bio');await frame();
        const layout=await page.locator('#inspector').evaluate(host=>{
          const pages=host.querySelector<HTMLElement>('.colonist-inspector-pages')!,bio=host.querySelector<HTMLElement>('.bio-columns')!,h=host.getBoundingClientRect();
          return {font:getComputedStyle(host).fontFamily,pageOverflow:pages.scrollWidth-pages.clientWidth,bioOverflow:bio.scrollWidth-bio.clientWidth,documentOverflow:document.documentElement.scrollWidth-innerWidth,
            host:{top:h.top,bottom:h.bottom,right:h.right},height:innerHeight,width:innerWidth,
            rows:[...host.querySelectorAll<HTMLElement>('.skill-entry-heading')].map(row=>{const caption=row.querySelector('.skill-caption')!,range=document.createRange();range.selectNodeContents(caption);const text=range.getBoundingClientRect(),track=row.querySelector('.paper-skill-track')!.getBoundingClientRect(),rating=row.querySelector('.skill-rating')!.getBoundingClientRect(),icon=row.querySelector('.paper-skill-icon')!.getBoundingClientRect();return {text:row.textContent,iconOverlap:icon.right-text.left,barOverlap:text.right-track.left,ratingOverlap:track.right-rating.left,overflow:row.scrollWidth-row.clientWidth};})};
        });
        expect(layout.font).toContain(font.family);expect(layout.pageOverflow).toBeLessThanOrEqual(1);expect(layout.bioOverflow).toBeLessThanOrEqual(1);expect(layout.documentOverflow).toBeLessThanOrEqual(1);
        expect(layout.host.top).toBeGreaterThanOrEqual(0);expect(layout.host.bottom).toBeLessThanOrEqual(viewport.height+1);expect(layout.host.right).toBeLessThanOrEqual(viewport.width+1);
        expect(layout.rows).toHaveLength(12);
        for(const row of layout.rows){expect(row.iconOverlap,`${font.id}: icon/label ${row.text}`).toBeLessThanOrEqual(1);expect(row.barOverlap,`${font.id}: label/bar ${row.text}`).toBeLessThanOrEqual(1);expect(row.ratingOverlap,`${font.id}: bar/rating ${row.text}`).toBeLessThanOrEqual(1);expect(row.overflow,`${font.id}: row ${row.text}`).toBeLessThanOrEqual(1);}
        record(`Six-font Bio matrix ${font.id} ${viewport.width}×${viewport.height}`,layout);await screenshot(`bio-${font.id}-${viewport.width}`);
      }
      await panel(page,'architect');await page.locator('[data-category="production"]').click();await assertCardFits('#architect-panel',`Production fits ${viewport.width}`);await screenshot(`production-${viewport.width}`);await page.keyboard.press('Escape');
      await panel(page,'work');await assertCardFits('#work-panel',`Work fits ${viewport.width}`);await screenshot(`work-${viewport.width}`);await page.keyboard.press('Escape');
    }
    await panel(page,'menu');await page.locator('#ui-font').selectOption('comfortaa');await page.keyboard.press('Escape');
    await exactCheckpoint('final');
    expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false});
    record('All original offers, possessions, actors and commands remain exactly unchanged',{tick:(await world(page)).tick});
    completed=true;
  }catch(error){
    if(loaded){await writeTestFile(test.info().outputPath('failed-world.json'),serializeWorld(await world(page)));}
    try{await screenshot('failure');}catch(captureError){record('Failure capture unavailable',String(captureError));}throw error;
  }finally{
    await writeTestFile(test.info().outputPath('report.json'),JSON.stringify({status:completed?'pass':'fail',source,sha256,declaredDotation:[],checks,captures,screenshotAudits,errors,limits:'Paused real Aulnes UI, live fonts, semantic pointers and exact save/reload; no campaign, simulation evolution or FPS claim.'},null,2));
    await page.close();await browser.close();
  }
});
