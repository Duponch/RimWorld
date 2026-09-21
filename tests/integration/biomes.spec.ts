import { test,expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { world,panel,pause,expectWorld,observeErrors } from './helpers';
import { validateWorld } from '../../src/sim/serialization';
import { BIOME_LABELS } from '../../src/sim/site';
import { animalSpecies } from '../../src/sim/animal-species';

test('native V91: three playable biome choices, fauna, actual hunt designation, save/reload and resident presentation',async({playwright})=>{
  test.setTimeout(240000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const reports:unknown[]=[];
  try{
    for(const biome of ['temperate-forest','boreal-forest','arid-shrubland'] as const){
      if(process.env.V91_BIOME&&biome!==process.env.V91_BIOME)continue;
      const context=await browser.newContext({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
      const page=await context.newPage(),errors=observeErrors(page);
      await page.goto('/?e2e');const front=page.locator('.front-menu');
      await front.getByRole('button',{name:'Nouvelle partie',exact:true}).click();
      await front.getByRole('button',{name:'Suivant',exact:true}).click();
      await front.getByRole('radio',{name:'Récit d’aventure',exact:true}).check();
      await front.getByRole('radio',{name:'Rechargeable à tout moment',exact:true}).check();
      await front.getByRole('button',{name:'Suivant',exact:true}).click();
      await page.getByRole('combobox',{name:'Milieu',exact:true}).selectOption(biome);
      await page.locator('#front-seed').fill('42');
      await front.getByRole('button',{name:'Retour',exact:true}).click();
      await front.getByRole('button',{name:'Suivant',exact:true}).click();
      await expect(page.locator('#front-biome')).toHaveValue(biome);
      await page.screenshot({path:`artifacts/biome-menu-v91-${biome}.png`});
      await front.getByRole('button',{name:'Démarrer',exact:true}).click();
      await expect(front).toBeHidden({timeout:60000});await pause(page);
      const initial=await world(page);expect(validateWorld(initial)).toEqual([]);
      await expect(page.locator('#biome-current')).toHaveText(BIOME_LABELS[biome]);
      expect(initial).toMatchObject({schemaVersion:91,site:{revision:2,biome},flora:{biome},scenario:{revision:6}});
      expect(initial.resources.some(r=>r.species)).toBe(true);
      expect(initial.wildlife!.animals.length).toBeGreaterThan(0);
      await panel(page,'wildlife');
      const animal=initial.wildlife!.animals.find(a=>a.species!=='hare')??initial.wildlife!.animals[0]!;
      await expect(page.getByRole('button',{name:`Repérer ${animalSpecies(animal.species).label} ${animal.id}`,exact:true})).toBeVisible();
      await page.locator(`[data-animal-hunt="${animal.id}"]`).check();
      await expect.poll(async()=>(await world(page)).hunting?.targets.includes(animal.id)).toBe(true);
      await page.locator(`[data-animal-hunt="${animal.id}"]`).uncheck();
      await page.getByRole('button',{name:`Repérer ${animalSpecies(animal.species).label} ${animal.id}`,exact:true}).click();
      await page.getByRole('button',{name:'Fermer Faune',exact:true}).click();await page.waitForTimeout(350);
      await page.screenshot({path:`artifacts/biome-fauna-v91-${biome}.png`});
      // Observe a short real frame window, not an accelerated biological rule.
      const profiler=process.env.V91_PROFILE?await context.newCDPSession(page):undefined;
      if(profiler){await profiler.send('Profiler.enable');await profiler.send('Profiler.start');}
      await page.evaluate(()=>{
        const probe={frames:[] as number[],last:0,active:true};(window as any).__biomeProbe=probe;
        const frame=(t:number)=>{if(!probe.active)return;if(probe.last)probe.frames.push(t-probe.last);probe.last=t;requestAnimationFrame(frame);};requestAnimationFrame(frame);
      });
      const before=(await world(page)).tick,started=Date.now();await page.locator('[data-speed="6"]').click();
      await page.waitForTimeout(10000);await pause(page);const saved=await world(page),elapsedMs=Date.now()-started;
      const frames=await page.evaluate(()=>{const p=(window as any).__biomeProbe;p.active=false;return (p.frames as number[]).sort((a,b)=>a-b);});
      let profile:unknown;
      if(profiler){const raw=await profiler.send('Profiler.stop');const totals=new Map<string,number>();for(const node of raw.profile.nodes){const name=`${node.callFrame.functionName} (${node.callFrame.url.split('/').at(-1)})`;totals.set(name,(totals.get(name)??0)+(node.hitCount??0));}profile=[...totals].sort((a,b)=>b[1]-a[1]).slice(0,30);await profiler.detach();}
      expect(saved.tick).toBeGreaterThan(before);expect(validateWorld(saved)).toEqual([]);
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,saved);
      reports.push({biome,label:BIOME_LABELS[biome],plants:initial.resources.filter(r=>r.species).length,animals:initial.wildlife!.animals.map(a=>a.species),ticks:saved.tick-before,elapsedMs,actualSpeed:(saved.tick-before)/(elapsedMs/1000)/6,frames:frames.length,p95:frames[Math.floor(frames.length*.95)],max:frames.at(-1),...profile?{profile}:{},errors});
      expect(errors).toEqual([]);await context.close();
    }
  }finally{writeFileSync(`artifacts/biomes-native-v91${process.env.V91_PROFILE?'-profile':process.env.V91_BIOME?'-'+process.env.V91_BIOME:''}.json`,JSON.stringify(reports,null,2));await browser.close();}
});
