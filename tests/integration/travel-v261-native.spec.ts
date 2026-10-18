import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../../src/sim/serialization';
import {registeredMap} from '../../src/sim/world-map-context';
import {planetGeography256} from '../../src/sim/planet-geography-256';
import type {World} from '../../src/sim/types';
import type {CampaignState} from '../../src/sim/world-map-state';
import {harness414,tile414} from './owners-v414-native-helper';

test.skip(process.env.TRAVEL261_NATIVE!=='1','ROOT only, frozen261 after V415; exact acquired Camp736, no preparation replay');
const INPUT_SHA='70dea3811dab70e7225cced4c715c8438b1d7aecec6aa173ac72eaa52115e699';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const memberIds=[7,8],sources=[{pileId:36326,quantity:10},{pileId:2308,quantity:10},{pileId:36331,quantity:9},{pileId:36332,quantity:7}];
function admitted261(root:CampaignState):asserts root is World {
 if(Number(root.schemaVersion)!==261||!('pawns'in root)||root.planet?.revision!==3||!root.worldMaps||!root.worldGroups||!root.worldPawns)throw Error('Actual migrated261 campaign required');
 expect(validateWorld(root)).toEqual([]);
}
async function acquired261(){
 // Reuse415's explicit baseline input option; no seed/factory/departure fallback.
 const manifestPath=process.env.REFORM415_BASELINE_MANIFEST;if(!manifestPath)throw Error('ROOT must supply acquired Camp736 REFORM415_BASELINE_MANIFEST');
 const manifestRaw=await readFile(manifestPath,'utf8'),m=JSON.parse(manifestRaw) as {status:string;schemaVersion:number;path:string;sha256:string;baselineTick:number;memberIds:number[];sources:typeof sources};
 expect(m).toMatchObject({status:'complete-reform-targeted-passed',schemaVersion:260,sha256:INPUT_SHA,baselineTick:736,memberIds,sources});
 const raw=await readFile(m.path,'utf8');expect(sha(raw)).toBe(INPUT_SHA);expect(raw.startsWith('{"schemaVersion":260,')).toBe(true);
 const canonical=raw.replace(/^\{"schemaVersion":260,/, '{"schemaVersion":261,');
 const root=deserializeCampaign(raw);admitted261(root);expect(serializeCampaign(root)).toBe(canonical);
 expect(root.tick).toBe(736);expect(root.worldMaps!.sites.map(s=>[s.id,s.tile,s.kind])).toEqual([[0,0,'settlement'],[1,39970,'camp']]);expect(root.worldMaps!.selectedMapId).toBe(1);expect(root.worldGroups!.groups).toEqual([]);
 const camp=registeredMap(root,1)!;expect([registeredMap(root,0)!.width,camp.width,camp.height]).toEqual([250,200,200]);expect(camp.pawns.map(p=>p.id)).toEqual(memberIds);
 for(const line of sources)expect(camp.piles.find(p=>p.id===line.pileId)).toMatchObject({quantity:line.quantity,owner:{type:'inventory'}});
 // These are actual recorded neighbours, verified after normal hydration.
 const planet=root.planet;if(planet?.revision!==3)throw Error('Actual acquired geographic planet absent');const geography=planetGeography256(planet);expect(geography.surface.seedText).toBe('Elsewhere');expect(geography.surface.tiles[0]!.neighbours).toEqual(expect.arrayContaining([39970,39971]));
 expect(root.worldMaps!.sites.every(s=>!Object.hasOwn(s,'story261')&&!Object.hasOwn(s,'battlefield261'))).toBe(true);
 expect(sha(await readFile(m.path,'utf8'))).toBe(INPUT_SHA);
 return {root,canonical,path:m.path,manifestPath,manifestSHA256:sha(manifestRaw),pileCount:camp.piles.length};
}
type Row261={direction:string;worker:number;id?:number;type:string;command?:{type:string;quote?:string;originMapId?:number;memberIds?:number[];sources?:typeof sources;destination?:number};ok?:boolean;checkpoint?:unknown;epoch?:number;revision?:number;at:number};
const rows261=(page:Page)=>page.evaluate(()=>(window as unknown as {__owners414Transport:Row261[]}).__owners414Transport.slice());
async function noCommands261(page:Page){expect((await rows261(page)).filter(r=>r.direction==='sent'&&r.type==='command')).toEqual([]);}
async function ack261(page:Page){
 await expect.poll(async()=>{const log=await rows261(page),request=log.findLast(r=>r.direction==='sent'&&r.command?.type==='group-reform');return !!request&&log.some(r=>r.direction==='received'&&r.type==='reply'&&r.id===request.id&&r.worker===request.worker);}).toBe(true);
 const log=await rows261(page),request=log.findLast(r=>r.direction==='sent'&&r.command?.type==='group-reform')!,reply=log.find(r=>r.direction==='received'&&r.type==='reply'&&r.id===request.id&&r.worker===request.worker)!;
 expect(reply.ok).toBe(true);expect(reply.checkpoint).toBeUndefined();expect(log.some(r=>r.direction==='received'&&r.worker===request.worker&&['snapshot','campaign-only'].includes(r.type)&&r.at>=request.at&&r.at<=reply.at&&Number.isSafeInteger(r.epoch)&&Number.isSafeInteger(r.revision))).toBe(true);
 expect(log.filter(r=>r.direction==='sent'&&r.type==='command').map(r=>r.command?.type)).toEqual(['group-reform']);return {request,reply};
}
// Planner consumes this ordinary numeric globe gesture while preserving the
// underlying departure destination; do not assert its unrelated selected value.
async function plannerPoint261(page:Page,id:number){const dense=page.locator('[data-group-panel] .planet-dense-view');await expect(dense).toBeVisible();await dense.getByRole('spinbutton',{name:'Numéro de case du globe',exact:true}).fill(String(id));await dense.getByRole('button',{name:'Afficher la case',exact:true}).click();}
async function quantity261(page:Page,pileCount:number,pileId:number,quantity:number){
 const box=page.getByRole('heading',{name:'Biens au sol et inventaires réels',exact:true}).locator('..'),previous=box.getByRole('button',{name:'Précédents',exact:true}),next=box.getByRole('button',{name:'Suivants',exact:true});
 while(await previous.isEnabled())await previous.click();const input=box.locator(`[data-group-pile="${pileId}"] input[type=number]`);
 for(let n=0;n<=Math.ceil(pileCount/20)&&!await input.count();n++){if(!await next.isEnabled())break;await next.click();}await expect(input).toBeEditable();await input.fill(String(quantity));
}

test('acquired Camp736: strict neutral261 migration, generic planner, real food-warning cancel and same-tick Reform with exact reload',async({page},info)=>{
 const h=await harness414(page,info,'261 on acquired Camp736: real menus only; neutral migration then generic/actual planner and Reform; no timeline or incident fabricated',{exactAdoptionOnce415:true});
 try{
  let input:Awaited<ReturnType<typeof acquired261>>|undefined=await acquired261();const path=input.path,baseline=input.canonical,pileCount=input.pileCount,groupId=input.root.planet!.nextGroupId;
  const resume=process.env.TRAVEL261_RESUME_AFTER_GENERIC;if(resume){const bytes=await readFile(resume,'utf8');expect(sha(bytes)).toBe('8391ba7108bc75dc88e515f35514029534165933fe636e4d29b8f950eb549cea');expect(bytes).toBe(baseline);h.proof.reusedGeneric={path:resume,sha256:sha(bytes),source:'Native01 generic planner and exact export acquired before preview refusal; no SIM command or tick occurred'};}
  h.proof.input={path,sha256:INPUT_SHA,manifestPath:input.manifestPath,manifestSHA256:input.manifestSHA256,tick:736,oldSchema:260,newSchema:261};
  const originalPeople=registeredMap(input.root,1)!.pawns.filter(p=>memberIds.includes(p.id)).map(p=>structuredClone(p)),originalGoods=registeredMap(input.root,1)!.piles.filter(p=>sources.some(l=>l.pileId===p.id)||['equipment','apparel'].includes(p.owner.type)&&'pawnId'in p.owner&&memberIds.includes(p.owner.pawnId)).map(p=>structuredClone(p)),homePeople=structuredClone(registeredMap(input.root,0)!.pawns);
  await h.load(resume??path,input.root);input=undefined;h.actualGPU();await h.groups();
  await expect(page.locator('[data-speed="0"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-group-action="start"]')).toHaveText('Reformer la caravane');
  const planner=page.locator('[data-group-planner]');if(!resume){await page.locator('[data-group-planner-open]').click();await expect(planner.getByRole('heading',{name:'Estimation sans caravane',exact:true})).toBeVisible();await expect(planner).toContainText('fondée sur une vitesse moyenne');
  await plannerPoint261(page,39970);await plannerPoint261(page,0);await plannerPoint261(page,39971);await expect(planner.locator('ol > li')).toHaveCount(3);await expect(planner).toContainText('arrivée finale estimée');await expect(page.locator('[data-group-planner-accept]')).toBeHidden();
  await planner.locator('[data-group-planner-remove="0"]').click();await expect(planner.locator('ol > li')).toHaveCount(2);await page.screenshot({path:info.outputPath('01-generic-real-globe-planner.png')});await page.locator('[data-group-planner-cancel]').click();await expect(planner).toBeHidden();await noCommands261(page);
  {const exported=await h.exported('261-generic-closed-unchanged');expect(exported.canonical).toBe(baseline);}await h.groups();}
  for(const id of memberIds){const choice=page.locator(`[data-group-member="${id}"] input[type=checkbox]`).first();await expect(choice).toHaveAttribute('aria-disabled','false');await choice.check();}
  // One unit from the real36326 stack, all other selected quantities remain0.
  // This changes a UI draft only; it never grants food or permission.
  await quantity261(page,pileCount,36326,1);await tile414(page,0);await page.locator('[data-group-preview="formation"]').click();await expect(page.locator('[data-group-provisions]')).toContainText('Autonomie estimée');await expect(page.locator('[data-group-provisions]')).toContainText('pourriture');await expect(page.locator('[data-group-provisions]')).toContainText('forage');
  await page.locator('[data-group-action="start"]').click();const notice=page.locator('[data-group-departure-notice]');await expect(notice).toBeVisible();await expect(notice).toContainText('nourriture');h.proof.actualFoodWarning=await notice.textContent();await page.screenshot({path:info.outputPath('02-real-food-warning-before-cancel.png')});await page.locator('[data-group-departure-cancel]').click();await expect(notice).toBeHidden();await noCommands261(page);
  {const exported=await h.exported('261-food-warning-cancel-unchanged');expect(exported.canonical).toBe(baseline);}await h.groups();
  for(const id of memberIds)await page.locator(`[data-group-member="${id}"] input[type=checkbox]`).first().check();for(const line of sources)await quantity261(page,pileCount,line.pileId,line.quantity);
  await page.locator('[data-group-preview="formation"]').click();await expect(page.locator('[data-group-route]')).toContainText('Route proposée');
  await page.locator('[data-group-planner-open]').click();await expect(planner.getByRole('heading',{name:'Planificateur de voyage',exact:true})).toBeVisible();await expect(planner.locator('ol > li')).toHaveCount(1);await expect(planner.locator('[data-group-planner-remove="0"]')).toHaveCount(0);
  await plannerPoint261(page,0);await plannerPoint261(page,39971);await expect(planner.locator('ol > li')).toHaveCount(3);await page.locator('[data-group-planner-accept]').click();await expect(planner).toBeHidden();await expect(page.locator('[data-group-reform-stationary]')).not.toBeChecked();await expect(page.locator('[data-planet-selection]')).toHaveValue('0');await noCommands261(page);
  await page.locator('[data-group-preview="formation"]').click();await expect(page.locator('[data-group-provisions]')).toContainText('Autonomie estimée');const start=page.locator('[data-group-action="start"]');await expect(start).toHaveAttribute('aria-disabled','false');await page.screenshot({path:info.outputPath('03-real-reform261-original-goods-route.png')});await start.click();
  if(await notice.isVisible()){h.proof.finalActualWarnings=await notice.textContent();await page.locator('[data-group-departure-confirm]').click();}
  await expect.poll(()=>page.evaluate(id=>{const m=window.__lisiere.world.campaignMap;return m?.revision===2?m.groups.find(g=>g.id===id)?.phase:undefined;},groupId)).toBe('travelling');const ack=await ack261(page);h.proof.reformACK=ack;
  expect(ack.request.command).toMatchObject({type:'group-reform',originMapId:1,destination:0});expect(ack.request.command!.memberIds?.slice().sort((a,b)=>a-b)).toEqual(memberIds);expect(ack.request.command!.sources?.slice().sort((a,b)=>a.pileId-b.pileId)).toEqual(sources.slice().sort((a,b)=>a.pileId-b.pileId));expect(ack.request.command!.quote).toMatch(/^reform260:/);
  const projected=await page.evaluate(()=>{const w=window.__lisiere.world,m=w.campaignMap;if(m?.revision!==2)throw Error('Actual campaign projection absent');return {tick:w.tick,mapIds:m.maps.map(s=>s.id),retiredCamps:m.retiredCamps};});expect(projected.tick).toBe(736);expect(projected.mapIds).toEqual([0]);expect(projected.retiredCamps).toContainEqual(expect.objectContaining({retiredMapId:1,markerUntilCore:7360+1_800_000}));
  await page.screenshot({path:info.outputPath('04-confirmed-reform261-and-marker.png')});let expectedCanonical:string;
  {const exported=await h.exported('261-reform-complete-before-reload');admitted261(exported.root);const root=exported.root,record=root.worldGroups!.groups.find(r=>r.state.id===groupId),g=record?.state;if(!g||!('members'in g))throw Error('Actual reformed261 original caravan absent');
   expect(root.tick).toBe(736);expect(g.phase).toBe('travelling');expect(g.destination).toBe(0);expect(g.tile).toBe(39970);expect(g.segment).toBeNull();expect(g.departedAt).toBe(736);expect(g.route).toEqual([39970,0]);expect(g.reorganization?.birth).toEqual({kind:'reform',sourceMapId:1,at:736});expect(record!.encounters261).toEqual({revision:1});
   // Historical260 had no incident/story. Migration and ordinary Camp Reform
   // must not fabricate retained story/action or a pending encounter to test it.
   for(const key of ['story261','pending261','arrival261'])expect(Object.hasOwn(record!,key)).toBe(false);
   expect(g.members).toEqual(originalPeople.map(p=>({...p,needCooldown:20})));expect(g.items).toHaveLength(originalGoods.length);for(const p of originalGoods){const actual=g.items.find(q=>q.id===p.id)!;if(sources.some(l=>l.pileId===p.id)){expect({...actual,owner:p.owner}).toEqual(p);expect(actual.owner.type).toBe('inventory');if(actual.owner.type==='inventory')expect(memberIds).toContain(actual.owner.pawnId);}else expect(actual).toEqual(p);}
   expect(registeredMap(root,1)).toBeUndefined();expect(root.worldMaps!.retired.find(r=>r.id===1)).toMatchObject({kind:'camp',reason:'camp-empty',removedAt:736,markerUntilCore:7360+1_800_000});expect(registeredMap(root,0)!.pawns).toEqual(homePeople);for(const id of memberIds)expect(root.worldPawns!.owners.some(r=>r.actor.id===id)).toBe(false);
   expectedCanonical=exported.canonical;await h.load(exported.path,root);}
  {const reloaded=await h.exported('261-reform-complete-exact-reload');expect(reloaded.canonical).toBe(expectedCanonical);}expectedCanonical='';
  expect(sha(await readFile(path,'utf8'))).toBe(INPUT_SHA);h.proof.sameTick=736;h.proof.source260Immutable=true;h.proof.neutralMigration=!resume;h.proof.exactCompleteReload=true;h.proof.retainedStoryScope='Absent on acquired historical Camp; no positive Battlefield story transfer claimed';await h.finish();
 }catch(error){await h.failure(error);throw error;}finally{await h.save();}
});
