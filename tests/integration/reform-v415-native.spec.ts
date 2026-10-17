import {test,expect,type Page} from '@playwright/test';
import {readPreparedReform415,require415} from '../helpers/reform-v260-fixture';
import {registeredMap} from '../../src/sim/world-map-context';
import {harness414,tile414} from './owners-v414-native-helper';

test.skip(process.env.REFORM415_NATIVE!=='1','ROOT only: adopted260 frozen native Chrome server; independent prepared fixture, no MAIN3408/A1807 replay');
type Row415={direction:string;worker:number;id?:number;type:string;command?:{type:string;quote?:string;originMapId?:number;memberIds?:number[];sources?:{pileId:number;quantity:number}[];destination?:number};ok?:boolean;checkpoint?:unknown;epoch?:number;revision?:number;at:number};
/** Reuses the V414 observer. Only observes real UI→worker transport; never
 * sends through Worker, test hooks or a direct command API. */
async function ack415(page:Page){
 const rows=()=>page.evaluate(()=>(window as unknown as {__owners414Transport:Row415[]}).__owners414Transport.slice());
 await expect.poll(async()=>{const log=await rows(),request=log.findLast(r=>r.direction==='sent'&&r.command?.type==='group-reform');return request&&log.some(r=>r.direction==='received'&&r.type==='reply'&&r.id===request.id&&r.worker===request.worker);}).toBe(true);
 const log=await rows(),request=log.findLast(r=>r.direction==='sent'&&r.command?.type==='group-reform')!,reply=log.find(r=>r.direction==='received'&&r.type==='reply'&&r.id===request.id&&r.worker===request.worker)!;
 expect(reply.ok).toBe(true);expect(reply.checkpoint).toBeUndefined();expect(log.some(r=>r.direction==='received'&&r.worker===request.worker&&['snapshot','campaign-only'].includes(r.type)&&r.at>=request.at&&r.at<=reply.at&&Number.isSafeInteger(r.epoch)&&Number.isSafeInteger(r.revision))).toBe(true);
 expect(log.filter(r=>r.direction==='sent'&&r.command&&['group-start','group-cancel','group-enter'].includes(r.command.type))).toEqual([]);return {request,reply};
}

test('prepared real Camp: UI people+finite goods+route, same-tick Reform ACK, actual removal/marker and exact complete reload',async({page},info)=>{
 const h=await harness414(page,info,'V415 acquired independent full-source250/Camp200 baseline; actual paused Reform260 UI/Worker only, no repeated preparation journey',{exactAdoptionOnce415:true});
 try{
  let input:ReturnType<typeof readPreparedReform415>|undefined=readPreparedReform415();const f=input.manifest,pileCount=input.camp.piles.length;h.proof.input=f;
  const originalPeople=input.camp.pawns.filter(p=>f.memberIds.includes(p.id)).map(p=>structuredClone(p)),originalGoods=input.camp.piles.filter(p=>f.sources.some(l=>l.pileId===p.id)||['equipment','apparel'].includes(p.owner.type)&&'pawnId'in p.owner&&f.memberIds.includes(p.owner.pawnId)).map(p=>structuredClone(p)),homePeople=structuredClone(registeredMap(input.root,f.homeMapId)!.pawns),groupId=input.root.planet!.nextGroupId;
  await h.load(f.path,input.root);input=undefined;await h.actualGPU();await h.groups();await expect(page.locator('[data-group-action="start"]')).toHaveText('Reformer la caravane');
  for(const id of f.memberIds){const choice=page.locator(`[data-group-member="${id}"] input[type=checkbox]`).first();await expect(choice).toHaveAttribute('aria-disabled','false');await choice.check();}
  const sourceBox=page.getByRole('heading',{name:'Biens au sol et inventaires réels',exact:true}).locator('..');
  for(const line of f.sources){
   const previous=sourceBox.getByRole('button',{name:'Précédents',exact:true}),next=sourceBox.getByRole('button',{name:'Suivants',exact:true});
   while(await previous.isEnabled())await previous.click();const input=sourceBox.locator(`[data-group-pile="${line.pileId}"] input[type=number]`);
   for(let n=0;n<=Math.ceil(pileCount/20)&&!await input.count();n++){if(!await next.isEnabled())break;await next.click();}
   await expect(input).toBeEditable();await input.fill(String(line.quantity));
  }
  await tile414(page,f.destination);await expect(page.locator('[data-group-reform-stationary]')).not.toBeChecked();await page.locator('[data-group-preview="formation"]').click();await expect(page.locator('[data-group-route]')).toContainText('Route proposée');
  const start=page.locator('[data-group-action="start"]');await expect(start).toHaveAttribute('aria-disabled','false');await page.screenshot({path:info.outputPath('01-real-reform-plan-people-goods-route.png')});await start.click();
  await expect.poll(()=>page.evaluate(id=>{const m=window.__lisiere.world.campaignMap;return m?.revision===2?m.groups.find(g=>g.id===id)?.phase:undefined;},groupId)).toBe('travelling');const ack=await ack415(page);h.proof.reformACK=ack;
  expect(ack.request.command).toMatchObject({type:'group-reform',originMapId:f.campMapId,destination:f.destination});expect(ack.request.command!.memberIds?.slice().sort((a,b)=>a-b)).toEqual(f.memberIds.slice().sort((a,b)=>a-b));expect(ack.request.command!.sources?.slice().sort((a,b)=>a.pileId-b.pileId)).toEqual(f.sources.slice().sort((a,b)=>a.pileId-b.pileId));expect(ack.request.command!.quote).toMatch(/^reform260:/);
  const projected=await page.evaluate(()=>{const w=window.__lisiere.world,m=w.campaignMap;if(m?.revision!==2)throw Error('Confirmed registered campaign projection absent');return {tick:w.tick,mapIds:m.maps.map(s=>s.id),retiredCamps:m.retiredCamps};});expect(projected.tick).toBe(f.baselineTick);
  expect(projected.mapIds).not.toContain(f.campMapId);expect(projected.retiredCamps).toContainEqual(expect.objectContaining({retiredMapId:f.campMapId,markerUntilCore:f.baselineTick*10+1_800_000}));
  await page.screenshot({path:info.outputPath('02-confirmed-caravan-and-retired-camp.png')});let expectedCanonical:string;{const exported=await h.exported('reform-ui-complete-before-reload');require415(exported.root);const root=exported.root,g=root.worldGroups!.groups.find(r=>r.state.id===groupId)?.state;
  if(!g||!('members'in g))throw Error('Same confirmed true caravan absent from full RAW');expect(root.tick).toBe(f.baselineTick);expect(g.phase).toBe('travelling');expect(g.segment).toBeNull();expect(g.departedAt).toBe(root.tick);expect(g.reorganization?.birth).toEqual({kind:'reform',sourceMapId:f.campMapId,at:root.tick});
  // Real release imposes the existing20-tick need cooldown even on these idle
  // originals. All other prepared actor fields remain byte-for-byte literal.
  expect(g.members).toEqual(originalPeople.map(p=>({...p,needCooldown:20})));expect(g.items).toHaveLength(originalGoods.length);for(const p of originalGoods){const actual=g.items.find(q=>q.id===p.id)!;if(f.sources.some(l=>l.pileId===p.id)){expect({...actual,owner:p.owner}).toEqual(p);expect(actual.owner.type).toBe('inventory');if(actual.owner.type==='inventory')expect(f.memberIds).toContain(actual.owner.pawnId);}else expect(actual).toEqual(p);}
  expect(registeredMap(root,f.campMapId)).toBeUndefined();expect(root.worldMaps!.retired.find(r=>r.id===f.campMapId)).toMatchObject({kind:'camp',reason:'camp-empty',removedAt:root.tick,markerUntilCore:root.tick*10+1_800_000});expect(registeredMap(root,f.homeMapId)!.pawns).toEqual(homePeople);for(const id of f.memberIds)expect(root.worldPawns!.owners.some(r=>r.actor.id===id)).toBe(false);
  expectedCanonical=exported.canonical;await h.load(exported.path,root);}
  {const reloaded=await h.exported('reform-ui-complete-exact-reload');expect(reloaded.canonical).toBe(expectedCanonical);}expectedCanonical='';h.proof.sameTick=f.baselineTick;h.proof.exactCompleteReload=true;await h.finish();
 }catch(error){await h.failure(error);throw error;}finally{await h.save();}
});
