import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { huntingCamp } from '../scenarios/hunting';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { observeErrors,panel,saveKey,world,expectWorld,pause } from './helpers';
import { perform } from './player-actions';
import type { Command } from '../../src/sim/types';

const probe=`window.__huntingFrames=[];
const huntingFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(now){const result=huntingFrame.call(this,now);if(this.preparing||!this.world)return result;
window.__huntingHoverMaterial=this.hover.material.id;window.__huntingAreaMaterial=this.areaMesh?.material?.id;
const g=this.pawns.pawnMesh?.geometry;if(!g)return result;const from=g.getAttribute('aFrom'),to=g.getAttribute('aTo'),travel=g.getAttribute('aTravel'),cargo=g.getAttribute('aCargo');
window.__huntingFrames.push({now,clock:this.timeline.tick,pawns:this.world.pawns.map((p,i)=>{const span=travel.getY(i)-travel.getX(i),alpha=span>0?Math.max(0,Math.min(1,(this.pawns.travelTime.value-travel.getX(i))/span)):1;return {id:p.id,x:from.getX(i)+(to.getX(i)-from.getX(i))*alpha,z:from.getZ(i)+(to.getZ(i)-from.getZ(i))*alpha,cargo:cargo.getX(i),amount:cargo.getY(i),hunt:p.hunting?.phase,cooking:p.cooking?.recipe,phase:p.cooking?.phase,ingesting:p.need?.kind==='eat'&&p.need.phase==='ingest'?this.world.piles.find(q=>q.id===p.need.carryPileId)?.item:undefined};}),corpses:this.world.piles.filter(p=>p.kind==='corpse').map(p=>({id:p.id,owner:p.owner.type})),wildlife:this.world.wildlife?.animals.length??0});return result;};`;
type Frame={clock:number;pawns:{id:number;x:number;z:number;cargo:number;amount:number;hunt?:string;cooking?:string;phase?:string;ingesting?:string}[];corpses:{id:number;owner:string}[];wildlife:number};

test('native hunting chain: live prey, physical corpse and save, butchery, useful cooking and ingestion at 1×/6×',async({playwright})=>{
  test.setTimeout(240000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page),reports=[];
  const requestFailures:{url:string;error:string|null}[]=[];
  const consoleFailures:{text:string;location:{url:string;lineNumber:number;columnNumber:number}}[]=[];
  page.on('requestfailed',request=>requestFailures.push({url:request.url(),error:request.failure()?.errorText??null}));
  page.on('console',message=>{if(message.type()==='error')consoleFailures.push({text:message.text(),location:message.location()});});
  page.setDefaultTimeout(10000);
  try {
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(huntingCamp())});
    await page.addInitScript(trace=>{
      const state=window as any;state.__huntingPipelines=0;state.__huntingPipelineEvents=[];
      const shaders=new WeakMap<GPUShaderModule,string>();
      if(trace){const shader=GPUDevice.prototype.createShaderModule;GPUDevice.prototype.createShaderModule=function(d){const m=shader.call(this,d);shaders.set(m,d.code);return m;};}
      for(const key of ['createRenderPipeline','createRenderPipelineAsync'] as const){const fn=GPUDevice.prototype[key];(GPUDevice.prototype as any)[key]=function(...args:any[]){
        const d=args[0] as GPURenderPipelineDescriptor;state.__huntingPipelines++;state.__huntingPipelineEvents.push({count:state.__huntingPipelines,tick:state.__lisiere?.tick,label:d.label,now:performance.now(),vertex:trace?shaders.get(d.vertex.module):undefined,fragment:trace&&d.fragment?shaders.get(d.fragment.module):undefined,primitive:d.primitive,depthStencil:d.depthStencil});
        return (fn as any).apply(this,args);
      };}
    },process.env.HUNTING_PIPELINE_TRACE==='1');
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
    for(const speed of (process.env.HUNTING_UI_SPEEDS==='6'?[6]:[1,6])) {
      const initial=huntingCamp(),hunter=initial.pawns[0]!,cook=initial.pawns[1]!,animal=initial.wildlife!.animals[0]!;
      initial.stockpiles=[];cook.hunger=22;
      expect(validateWorld(initial)).toEqual([]);
      await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
      await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);
      const rotation={value:0},act=(command:Command,reason:string)=>perform(page,{reason,command},rotation);
      await act({type:'food-policy-assign',pawnId:cook.id,policyId:2},'Conserver les ingrédients et manger le repas cuisiné.');
      await act({type:'stockpile',x:8,z:8,enabled:true,filters:{wood:false,food:false,corpse:true}},'Préparer une réserve de dépouilles.');
      await act({type:'designate',kind:'butcher-spot',x:8,z:10},'Placer la boucherie gratuite.');
      await act({type:'priority',pawnId:cook.id,work:'build',value:1},'Préparer le foyer de cuisson.');
      await act({type:'designate',kind:'campfire',x:12,z:10},'Construire un vrai feu avec le bois du camp.');
      await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
      await expect.poll(async()=>(await world(page)).structures.some(s=>s.kind==='campfire'),{timeout:15000}).toBe(true);
      await pause(page);await act({type:'priority',pawnId:cook.id,work:'build',value:0},'Le cuisinier reprend sa spécialité.');
      const ready=await world(page),spot=ready.structures.find(s=>s.kind==='butcher-spot')!,fire=ready.structures.find(s=>s.kind==='campfire')!;
      await act({type:'hunt',animalId:animal.id,enabled:true},'Désigner le lièvre vivant depuis Faune.');
      await expect(page.locator(`[data-animal-hunt="${animal.id}"]`)).toBeChecked();
      const pipelines=await page.evaluate(()=>{(window as any).__huntingFrames=[];return (window as any).__huntingPipelines;});
      await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();
      // The real Pause button retains the short carrying phase at maximum speed.
      await page.waitForFunction(id=>{if(!window.__lisiere.world.piles.some(p=>p.id===id&&p.kind==='corpse'&&p.owner.type==='pawn'))return false;(document.querySelector('[data-speed="0"]') as HTMLButtonElement).click();return true;},animal.id,{polling:'raf',timeout:85000});
      await expect(page.locator('[data-speed="0"]')).toHaveAttribute('aria-pressed','true');
      const carried=await world(page),corpse=carried.piles.find(p=>p.id===animal.id)!;
      expect(corpse.owner).toEqual({type:'pawn',pawnId:hunter.id});expect(corpse.corpse?.health.death).toBeDefined();expect(carried.wildlife!.animals).toHaveLength(0);expect(carried.pawns[0]!.priorities.haul).toBe(0);expect(validateWorld(carried)).toEqual([]);
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,carried);
      await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();
      await expect.poll(async()=>{const w=await world(page),p=w.piles.find(p=>p.id===animal.id);return p?.owner.type==='ground'&&p.owner.x===8&&p.owner.z===8&&!w.pawns[0]!.hunting&&!w.pawns[0]!.haul;},{timeout:25000}).toBe(true);
      await pause(page);await act({type:'bill-add',structureId:spot.id},'Dépecer la vraie dépouille chassée.');
      await expect(page.locator('#add-cooking-bill')).toContainText('dépecer');
      await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();
      await expect.poll(async()=>(await world(page)).butchery?.completed,{timeout:25000}).toBe(1);
      await pause(page);const butchered=await world(page);
      expect(butchered.butchery!.meat).toBeGreaterThanOrEqual(10);expect(butchered.butchery!.leather).toBeGreaterThan(0);expect(butchered.piles.some(p=>p.id===animal.id)).toBe(false);
      expect(butchered.piles.filter(p=>p.item==='hare-meat').reduce((n,p)=>n+p.quantity,0)).toBe(butchered.butchery!.meat);
      await act({type:'bill-add',structureId:fire.id},'Cuisiner la viande en repas simple.');
      const bill=(await world(page)).structures.find(s=>s.id===fire.id)!.bills![0]!;
      await act({type:'bill-update',structureId:fire.id,billId:bill.id,settings:{...bill,filters:{rice:false,berries:false,'hare-meat':true},destination:'drop'}},'Employer seulement la viande de cette chasse.');
      await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();
      await expect.poll(async()=>(await world(page)).pawns[1]!.hunger,{timeout:30000}).toBeGreaterThan(80);
      await pause(page);const final=await world(page);
      expect(final.piles.filter(p=>p.item==='simple-meal')).toHaveLength(0);expect(final.piles.filter(p=>p.item==='hare-meat').reduce((n,p)=>n+p.quantity,0)+10).toBe(final.butchery!.meat);
      expect(final.piles.filter(p=>p.item==='light-leather').reduce((n,p)=>n+p.quantity,0)).toBe(final.butchery!.leather);
      expect(final.pawns[1]!.hunger).toBeGreaterThan(80);expect(final.pawns[1]!.skills.cooking!.xp).toBeGreaterThan(0);expect(validateWorld(final)).toEqual([]);
      const frames=await page.evaluate(()=>(window as any).__huntingFrames as Frame[]);
      expect(frames.some(f=>f.pawns.some(p=>p.cargo===27&&p.amount===1))).toBe(true);
      expect(frames.some(f=>f.pawns.some(p=>p.cooking==='butcher-creature'&&p.phase==='work'))).toBe(true);
      expect(frames.some(f=>f.pawns.some(p=>p.cargo===29))).toBe(true);
      expect(frames.some(f=>f.pawns.some(p=>p.ingesting==='simple-meal'))).toBe(true);
      expect(frames.some(f=>f.pawns.some(p=>p.ingesting==='hare-meat'))).toBe(false);
      let intervals=0,maxJump=0;
      for(let i=1;i<frames.length;i++){const a=frames[i-1]!,b=frames[i]!,dt=b.clock-a.clock;if(dt<=0||dt>2)continue;for(const p of a.pawns){const q=b.pawns.find(q=>q.id===p.id)!;const jump=Math.hypot(q.x-p.x,q.z-p.z);expect(jump).toBeLessThanOrEqual(dt*1.01+.02);maxJump=Math.max(maxJump,jump);intervals++;}}
      const cursorMaterials=await page.evaluate(()=>({hover:(window as any).__huntingHoverMaterial,area:(window as any).__huntingAreaMaterial}));
      const pipelineEvents=await page.evaluate(start=>(window as any).__huntingPipelineEvents.filter((p:any)=>p.count>start),pipelines);
      writeFileSync(`artifacts/hunting-ui-stage-${speed}x-v79.json`,JSON.stringify({speed,start:ready.tick,corpseCarried:carried.tick,finished:final.tick,frames:frames.length,intervals,maxJump,cursorMaterials,pipelineEvents,world:final},null,2));
      await page.screenshot({path:`artifacts/hunting-ui-${speed}x-v79.png`});
      expect(intervals).toBeGreaterThan(20);expect(pipelineEvents).toHaveLength(0);
      await page.locator(`[data-pawn="${cook.id}"]`).click();if(await page.locator('.skills-inspection').getAttribute('open')===null)await page.locator('.skills-inspection summary').first().click();await expect(page.locator('[data-skill="cooking"]')).toContainText('Cuisine 8');await expect(page.locator('#fps-counter')).toBeVisible();
      await page.screenshot({path:`artifacts/hunting-ui-${speed}x-v79.png`});
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,final);
      reports.push({speed,start:ready.tick,corpseCarried:carried.tick,finished:final.tick,meat:final.butchery!.meat,leather:final.butchery!.leather,mealsIngested:1,frames:frames.length,intervals,maxJump});
    }
    writeFileSync('artifacts/hunting-ui-v79.json',JSON.stringify({date:new Date().toISOString(),backend:await page.evaluate(()=>window.__lisiere.backend),reports,errors,requestFailures,consoleFailures},null,2));
    expect(errors).toEqual([]);
  } finally {await browser.close();}
});
