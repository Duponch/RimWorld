import {test,expect,type Page} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../../src/sim/serialization';
import {registeredMap} from '../../src/sim/world-map-context';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {reformSourceChoices260,previewGroupReform260} from '../../src/sim/group-reform-260';
import {captureGroupMass} from '../../src/sim/group-capture';
import {materialAllowedForPlayer256} from '../../src/sim/material-permission-256';
import {harness414,tile414} from './owners-v414-native-helper';
import type {Pawn} from '../../src/sim/types';

const REWARDS=[61462,61463,61464,61465,61466,61467,61468,61469];
const GOODS=[['cloth',9],['medicine',8],['cloth',7],['gold',44],['plasteel',6],['advanced-component',1],['gold',1],['silver',1]]as const;
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const kg=(n:number)=>`${(n/1000).toLocaleString('fr-FR',{maximumFractionDigits:3})} kg`;
type Trace={direction:string;worker:number;id?:number;type:string;command?:{type:string;quote?:string;originMapId?:number;memberIds?:number[];sources?:{pileId:number;quantity:number}[];packedIds?:number[];destination?:number};ok?:boolean;checkpoint?:unknown;epoch?:number;revision?:number;at:number};
const rows=(page:Page)=>page.evaluate(()=>(window as unknown as {__owners414Transport:Trace[]}).__owners414Transport.slice());
async function reformACK(page:Page){
 await expect.poll(async()=>{const log=await rows(page),sent=log.findLast(r=>r.direction==='sent'&&r.command?.type==='group-reform');return !!sent&&log.some(r=>r.direction==='received'&&r.type==='reply'&&r.worker===sent.worker&&r.id===sent.id);}).toBe(true);
 const log=await rows(page),sent=log.findLast(r=>r.direction==='sent'&&r.command?.type==='group-reform')!,reply=log.find(r=>r.direction==='received'&&r.type==='reply'&&r.worker===sent.worker&&r.id===sent.id)!;
 expect(reply.ok).toBe(true);expect(reply.checkpoint).toBeUndefined();expect(log.some(r=>r.direction==='received'&&r.worker===sent.worker&&['snapshot','campaign-only'].includes(r.type)&&r.at>=sent.at&&r.at<=reply.at&&Number.isSafeInteger(r.epoch)&&Number.isSafeInteger(r.revision))).toBe(true);
 expect(log.filter(r=>r.direction==='sent'&&r.type==='command').map(r=>r.command?.type)).toEqual(['group-reform']);return {sent,reply};
}
async function acquired(){
 const input=process.env.WORLD_SITES263_REFORM_NATIVE_INPUT,inputSHA=process.env.WORLD_SITES263_REFORM_NATIVE_INPUT_SHA256;
 if(!input||!inputSHA||!/^[a-f0-9]{64}$/.test(inputSHA))throw Error('Future real native B AFTER entry path and exact SHA256 required; no entry/reform/factory fallback');
 const bytes=await readFile(input,'utf8');expect(sha(bytes)).toBe(inputSHA);const raw=await decodeStoredSave(bytes),root=deserializeCampaign(raw);expect(Number(root.schemaVersion)).toBe(263);expect(validateWorld(root)).toEqual([]);expect(serializeCampaign(root)).toBe(raw);
 const header=root.worldMaps?.sites.find(s=>s.id===root.worldMaps!.selectedMapId),site=root.worldSites263?.entries.find(s=>s.id===1),homeHeader=root.worldMaps?.sites.find(s=>s.id===0&&s.kind==='settlement');
 if(header?.kind!=='quest-site'||header.target263?.kind!=='quest-site'||header.target263.siteId!==1||!site||site.kind!=='item-stash'||site.tile!==116286||site.threat.kind!=='none'||site.closed||site.mapId!==header.id||site.items.length||site.expiresAtCore!==null||!homeHeader||homeHeader.tile===null||!root.worldGroups||root.worldGroups.groups.length||!root.planet)throw Error('Actual first Site1/none entered with genuine home0, no other group/pending, required');
 const map=registeredMap(root,header.id)!,home=registeredMap(root,0)!,people=[7,8].map(id=>map.pawns.find(p=>p.id===id));
 if(people.some(p=>!p||p.state!=='idle'||p.jobId!==null||p.bedId!==null||p.orders.active||p.orders.queue.length||p.recreation.task)||!home.pawns.some(p=>p.id===9))throw Error('Same freshly entered idle7/8 and resident9 required; do not clear work, beds, orders or clinical state to adapt this input');
 expect(header.target263.retained).toEqual({passStory:false,next:null,destination:null});
 const rewards=REWARDS.map(id=>map.piles.find(p=>p.id===id));for(const [i,p]of rewards.entries()){if(!p||p.owner.type!=='ground'||p.item!==GOODS[i]![0]||p.quantity!==GOODS[i]![1])throw Error('The eight actual rewards differ; preserve the real refusal');}
 const selected=new Set([7,8]),sourceThings=map.piles.filter(p=>REWARDS.includes(p.id)||p.owner.type==='inventory'&&selected.has(p.owner.pawnId)),packs=map.packed.filter(p=>p.owner.type==='inventory'&&selected.has(p.owner.pawnId));
 const choices=reformSourceChoices260(map);for(const p of sourceThings){const choice=choices.find(c=>c.pile===p);if(!materialAllowedForPlayer256(p)||!choice||choice.reason||choice.available!==p.quantity)throw Error(`Actual source${p.id} is not available/allowed; no permission hook or altered RAW`);}
 const sources=sourceThings.map(p=>({pileId:p.id,quantity:p.quantity})),packedIds=packs.map(p=>p.building.id),preview=previewGroupReform260(map,{originMapId:header.id,memberIds:[7,8],sources,packedIds,animalIds:[],destination:homeHeader.tile});
 if(!preview.ok||!preview.quote)throw Error(preview.ok?'Actual Reform quote missing':preview.reason);if(preview.mass.grams>preview.mass.capacityGrams)throw Error('Actual goods are overloaded; no source or unit is removed to make this witness pass');
 const intrinsic=map.piles.filter(p=>['equipment','apparel'].includes(p.owner.type)&&'pawnId'in p.owner&&selected.has(p.owner.pawnId));
 return {root,input,inputSHA,raw,tick:root.tick,mapId:header.id,tile:site.tile,homeTile:homeHeader.tile,groupId:root.planet.nextGroupId,pileCount:map.piles.length,packCount:map.packed.length,sources,packedIds,preview,people:structuredClone(people.filter((p):p is Pawn=>p!==undefined)),goods:structuredClone([...sourceThings,...intrinsic]),packs:structuredClone(packs),homePeople:structuredClone(home.pawns),foodPolicies:structuredClone(map.foodPolicies)};
}
function released(old:Pawn,mapId:number){const p=structuredClone(old);p.needCooldown=20;p.planCooldown=0;p.path=[];p.moveCooldown=0;p.state='idle';p.jobId=null;p.haul=null;p.cooking=null;p.need=null;p.orders.active=null;p.orders.queue=[];p.recreation.task=null;p.bedId=null;delete p.draft;delete p.motion;delete p.bedSlot;delete p.allowedAreaId;delete p.allowedAreaReturn;if(p.mapAreas)p.mapAreas={...p.mapAreas,assignments:p.mapAreas.assignments.filter(a=>a.mapId!==mapId)};return p;}
interface SourceTraversal263 {expectedSources:number;pageLimit:number;pages:{ordinal:number;visibleIds:number[];selected:{pileId:number;before:string;quantity:number;changed:boolean}[];wallMilliseconds:number}[];wallMilliseconds?:number}
async function quantities(page:Page,sources:{pileId:number;quantity:number}[],witness:SourceTraversal263){
 const box=page.getByRole('heading',{name:'Biens au sol et inventaires réels',exact:true}).locator('..'),previous=box.getByRole('button',{name:'Précédents',exact:true}),next=box.getByRole('button',{name:'Suivants',exact:true}),remaining=new Map(sources.map(s=>[s.pileId,s.quantity]));
 expect(remaining.size,'Distinct original source IDs').toBe(sources.length);await expect(previous,'Fresh real Reform panel begins at first source page; never reset per source').toBeDisabled();
 const started=performance.now();
 for(let ordinal=1;ordinal<=witness.pageLimit&&remaining.size;ordinal++){
  const at=performance.now(),visible=await box.locator('[data-group-pile]').evaluateAll(elements=>elements.map(e=>({id:Number((e as HTMLElement).dataset.groupPile),value:(e.querySelector('input[type=number]') as HTMLInputElement|null)?.value??null})));
  expect(visible.length,'Actual nonempty source page').toBeGreaterThan(0);expect(visible.every(r=>Number.isSafeInteger(r.id)&&r.value!==null)).toBe(true);
  const row:SourceTraversal263['pages'][number]={ordinal,visibleIds:visible.map(r=>r.id),selected:[],wallMilliseconds:0};witness.pages.push(row);
  // DOM reads observe real controls only. Each selected source is filled via
  // ordinary UI once, on its already displayed page; no commands or DOM edits.
  for(const source of visible){const q=remaining.get(source.id);if(q===undefined)continue;const input=box.locator(`[data-group-pile="${source.id}"] input[type=number]`);await expect(input).toBeEditable();const before=await input.inputValue(),changed=before!==String(q);if(changed)await input.fill(String(q));await expect(input).toHaveValue(String(q));row.selected.push({pileId:source.id,before,quantity:q,changed});remaining.delete(source.id);}
  row.wallMilliseconds=performance.now()-at;if(!remaining.size)break;if(!await next.isEnabled())break;await next.click();
 }
 witness.wallMilliseconds=performance.now()-started;
 expect([...remaining.keys()],'Every exact requested source found in one forward traversal of the genuine pages').toEqual([]);
 expect(witness.pages.flatMap(p=>p.selected).map(s=>({pileId:s.pileId,quantity:s.quantity})).sort((a,b)=>a.pileId-b.pileId)).toEqual(sources.slice().sort((a,b)=>a.pileId-b.pileId));
}

test('future acquired native B: actual Reform panel, eight rewards and held originals transfer/retract Site at same tick, exact complete reload',async({page},info)=>{
 test.skip(process.env.WORLD_SITES263_REFORM_NATIVE!=='1','ROOT only, exact future native B post-entry export required; no fallback');
 const h=await harness414(page,info,'263 B actual UI immediate Reform; original7/8, eight rewards and actual held goods, same tick then exact full reload',{exactAdoptionOnce415:true});
 try{
  let loaded:Awaited<ReturnType<typeof acquired>>|undefined=await acquired();const b=(({root:_root,raw:_raw,...metadata})=>metadata)(loaded);
  h.proof.input={path:b.input,sha256:b.inputSHA,tick:b.tick,mapId:b.mapId,siteId:1};h.proof.selection={memberIds:[7,8],sources:b.sources,packedIds:b.packedIds,notice:'Actual source eligibility/permissions and current food policies retained; only real paginated controls, no invented filter'};
  await h.load(b.input,loaded.root);loaded=undefined;h.actualGPU();await h.groups();await expect(page.locator('[data-speed="0"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-group-action="start"]')).toHaveText('Reformer la caravane');await expect(page.locator('[data-group-retreat-choice]')).toHaveAttribute('aria-pressed','false');
  for(const id of [7,8]){const check=page.locator(`[data-group-member="${id}"] input[type=checkbox]`).first();await expect(check).toHaveAttribute('aria-disabled','false');await check.check();}
  const traversal:SourceTraversal263={expectedSources:b.sources.length,pageLimit:Math.ceil(b.pileCount/20),pages:[]};h.proof.sourcePageTraversal=traversal;await quantities(page,b.sources,traversal);
  if(b.packedIds.length){const box=page.getByRole('heading',{name:'Meubles minifiés',exact:true}).locator('..'),previous=box.getByRole('button',{name:'Précédents',exact:true}),next=box.getByRole('button',{name:'Suivants',exact:true});for(const id of b.packedIds){while(await previous.isEnabled())await previous.click();const check=box.locator(`[data-group-packed="${id}"] input[type=checkbox]`);for(let n=0;n<=Math.ceil(b.packCount/12)&&!await check.count();n++){if(!await next.isEnabled())break;await next.click();}await expect(check).toBeEnabled();await check.check();}}
  await tile414(page,b.homeTile);await expect(page.locator('[data-group-reform-stationary]')).not.toBeChecked();await page.locator('[data-group-preview="formation"]').click();await expect(page.locator('[data-group-route]')).toContainText('Route proposée');await expect(page.locator('[data-group-mass]')).toContainText(`Charge ${kg(b.preview.mass.grams)} / ${kg(b.preview.mass.capacityGrams)}`);await expect(page.locator('[data-group-provisions]')).toContainText('Autonomie estimée');
  const start=page.locator('[data-group-action="start"]');await expect(start).toHaveAttribute('aria-disabled','false');await page.screenshot({path:info.outputPath('01-real-quest-reform-eight-rewards-mass-route.png')});await start.click();const notice=page.locator('[data-group-departure-notice]');if(await notice.isVisible()){h.proof.actualWarnings=await notice.textContent();await page.locator('[data-group-departure-confirm]').click();}
  await expect.poll(()=>page.evaluate(id=>{const w=window.__lisiere.world,m=w.campaignMap;return m?.revision===2?{tick:w.tick,phase:m.groups.find(g=>g.id===id)?.phase}:undefined;},b.groupId)).toEqual({tick:b.tick,phase:'travelling'});
  const ack=await reformACK(page);expect(ack.sent.command).toMatchObject({type:'group-reform',originMapId:b.mapId,destination:b.homeTile,quote:b.preview.quote});expect(ack.sent.command!.memberIds?.slice().sort((a,b)=>a-b)).toEqual([7,8]);expect(ack.sent.command!.sources?.slice().sort((a,b)=>a.pileId-b.pileId)).toEqual(b.sources.slice().sort((a,b)=>a.pileId-b.pileId));expect(ack.sent.command!.packedIds?.slice().sort((a,b)=>a-b)).toEqual(b.packedIds.slice().sort((a,b)=>a-b));h.proof.reformACK=ack;
  await page.screenshot({path:info.outputPath('02-real-caravan-Site-removed-without-time.png')});let canonical:string;
  {let exported:Awaited<ReturnType<typeof h.exported>>|undefined=await h.exported('03-real-reformed-caravan-before-reload');const root=exported.root,record=root.worldGroups!.groups.find(r=>r.state.id===b.groupId),g=record?.state;if(!g||!('members'in g)||!record)throw Error('Actual reformed original caravan missing');
   expect(root.tick).toBe(b.tick);expect(g.phase).toBe('travelling');expect(g.tile).toBe(b.tile);expect(g.destination).toBe(b.homeTile);expect(g.route).toEqual(b.preview.route);expect(g.segment).toBeNull();expect(g.departedAt).toBe(b.tick);expect(g.paused).toBe(false);expect(g.reorganization?.birth).toEqual({kind:'reform',sourceMapId:b.mapId,at:b.tick});expect(record.arrival261).toEqual({tile:b.homeTile,action:{kind:'enter',mapId:0}});
   expect(g.members).toEqual(b.people.map(p=>released(p,b.mapId)));expect(g.items).toHaveLength(b.goods.length);for(const old of b.goods){const p=g.items.find(p=>p.id===old.id);expect(p).toBeDefined();if(b.sources.some(s=>s.pileId===old.id)){expect({...p,owner:old.owner}).toEqual(old);expect(p!.owner.type).toBe('inventory');if(p!.owner.type==='inventory')expect([7,8]).toContain(p!.owner.pawnId);}else expect(p).toEqual(old);}expect(g.packed??[]).toHaveLength(b.packs.length);for(const old of b.packs){const p=g.packed?.find(p=>p.building.id===old.building.id);expect(p?.building).toEqual(old.building);expect(p?.owner.type).toBe('inventory');}
   const mass=captureGroupMass(g.members,g.items,true,root.schemaVersion,g.packed,g.animalOwners?.members);expect(mass).toBeDefined();expect([mass!.grams,mass!.capacityGrams]).toEqual([b.preview.mass.grams,b.preview.mass.capacityGrams]);expect(root.foodPolicies).toEqual(b.foodPolicies);
   expect(registeredMap(root,b.mapId)).toBeUndefined();const retired=root.worldMaps!.retired.find(s=>s.id===b.mapId);expect(retired).toMatchObject({kind:'quest-site',reason:'abandon',removedAt:b.tick});expect(Object.hasOwn(retired!,'markerUntilCore')).toBe(false);const site=root.worldSites263!.entries.find(s=>s.id===1);expect(site).toMatchObject({kind:'item-stash',id:1,mapId:null,items:[],closed:{atCore:b.tick*10,reason:'map-removed',lost:[]}});expect(root.worldMaps!.sites.map(s=>[s.id,s.kind])).toEqual([[0,'settlement']]);expect(registeredMap(root,0)!.pawns).toEqual(b.homePeople);for(const id of [7,8])expect(root.worldPawns!.owners.some(r=>r.actor.id===id)).toBe(false);
   canonical=exported.canonical;await h.load(exported.path,root);exported=undefined;}
  {const reloaded=await h.exported('04-exact-reformed-caravan-reload');expect(reloaded.canonical).toBe(canonical);expect(reloaded.root.tick).toBe(b.tick);await writeFile(info.outputPath('return-SIM-input.json'),JSON.stringify({status:'actual-native-B-reform-caravan-acquired',path:reloaded.path,sha256:reloaded.fileSHA256,canonicalSHA256:sha(reloaded.canonical),tick:b.tick,groupId:b.groupId,originMapId:b.mapId,rewardIds:REWARDS,notice:'Future SIM return must consume this exact acquired export; no entry/Reform/pickup replay'},null,2));h.proof.returnInput={path:reloaded.path,sha256:reloaded.fileSHA256};}
  expect(sha(await readFile(b.input,'utf8'))).toBe(b.inputSHA);h.proof.sameTick=b.tick;h.proof.noPhysicalPickupOrEdgeWalk=true;h.proof.exactCompleteReload=true;await h.finish();
 }catch(error){await h.failure(error);throw error;}finally{await h.save();}
});
