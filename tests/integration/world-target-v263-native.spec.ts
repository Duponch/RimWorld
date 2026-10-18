import {test,expect,type Page} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../../src/sim/serialization';
import {registeredMap} from '../../src/sim/world-map-context';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {rotAge} from '../../src/sim/food-preservation';
import type {Pawn} from '../../src/sim/types';
import type {WildAnimal} from '../../src/sim/wildlife-state';
import {panel} from './helpers';
import {harness414} from './owners-v414-native-helper';

type Branch263='ATTACK'|'STASH';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
type Trace263={direction:string;worker:number;type:string;id?:number;command?:{type:string;[key:string]:unknown};ok?:boolean;reason?:string;at:number};
const trace263=(page:Page)=>page.evaluate(()=>(window as unknown as {__owners414Transport:Trace263[]}).__owners414Transport.slice());
function stableHuman263(p:Pawn){const {x,z,path,motion,moveCooldown,planCooldown,state,draft,bedId,bedSlot,allowedAreaId,allowedAreaReturn,...stable}=p;return stable;}
function stableAnimal263(a:WildAnimal){const {x,z,path,motion,state,nextDecision,domestic,...stable}=a;if(!domestic)return stable;const {bedId,...settings}=domestic;return {...stable,domestic:settings};}
async function acquired263(branch:Branch263){
 const prefix='WORLD_TARGET263_NATIVE_'+branch,input=process.env[prefix+'_INPUT'],expectedSHA=process.env[prefix+'_INPUT_SHA256'];
 if(!input||!expectedSHA||!/^[a-f0-9]{64}$/.test(expectedSHA))throw Error(prefix+' requires the real ROOT SIM checkpoint path and exact SHA256; no fallback');
 const bytes=await readFile(input,'utf8');expect(sha(bytes)).toBe(expectedSHA);const raw=await decodeStoredSave(bytes),root=deserializeCampaign(raw);
 expect(Number(root.schemaVersion)).toBe(263);expect(serializeCampaign(root)).toBe(raw);
 if(!root.worldMaps||!root.worldGroups||!root.worldPawns||!root.worldFactions)throw Error('Actual263 owners required');
 const records=root.worldGroups.groups.filter(r=>r.pendingEntry263);expect(records).toHaveLength(1);expect(root.worldGroups.groups.some(r=>r.pending261)).toBe(false);
 const record=records[0]!,pending=record.pendingEntry263!,g=record.state;if(!('members'in g)||record.localMapId!==null)throw Error('Actual arrived caravan required');
 expect(pending.revision).toBe(1);expect(g.tile).toBe(g.destination);expect(g.segment).toBeNull();expect(g.lastPersonalTick).toBe(root.tick);
 expect(pending.target.kind).toBe(branch==='ATTACK'?'attack-settlement':'visit-site');
 const target=structuredClone(pending.target),settlement=target.kind==='attack-settlement'?root.worldFactions.settlements.find(s=>s.id===target.settlementId):undefined,site=target.kind==='visit-site'?root.worldSites263?.entries.find(s=>s.id===target.siteId):undefined;
 if(target.kind==='attack-settlement'){expect(target.confirmed).toBe(true);expect(settlement).toMatchObject({factionId:target.factionId,tile:g.tile});expect(target.factionId).not.toBe(root.worldFactions.playerFactionId);}
 if(target.kind==='visit-site'){if(!site||site.kind!=='item-stash'||site.closed)throw Error('Actual unclosed ItemStash ticket required');expect(site.tile).toBe(g.tile);}
 const draftPeople=target.kind==='attack-settlement'||site?.factionId===null||site?.factionId!==undefined&&root.worldFactions.relations.some(r=>r.aId===Math.min(root.worldFactions!.playerFactionId,site.factionId!)&&r.bId===Math.max(root.worldFactions!.playerFactionId,site.factionId!)&&r.kind==='hostile');
 return {input,expectedSHA,rawSHA:sha(raw),tick:root.tick,groupId:g.id,tile:g.tile,target,draftPeople,
  people:structuredClone(g.members),animals:structuredClone(g.animalOwners?.members??[]),items:structuredClone(g.items),packed:structuredClone(g.packed??[]),
  existingMaps:root.worldMaps.sites.map(r=>({id:r.id,tile:r.tile,kind:r.kind})),
  itemStash:site?.kind==='item-stash'?structuredClone(site):undefined};
}

for(const branch of ['ATTACK','STASH'] as const)test('same real pending263 '+branch+': ordinary import resumes entry, same originals, paused full export/reload',async({page},info)=>{
 test.skip(process.env['WORLD_TARGET263_NATIVE_'+branch]!=='1','ROOT only after real SIM checkpoint; no input, factory or journey substituted');
 const h=await harness414(page,info,'Prepared263 '+branch+' from exact real SIM pending; automatic Worker resume on ordinary UI import, no new order or played tick',{exactAdoptionOnce415:true});
 try{
  const b=await acquired263(branch);h.proof.input={path:b.input,sha256:b.expectedSHA,rawSHA256:b.rawSHA,tick:b.tick,groupId:b.groupId,target:b.target,notice:'ROOT must supply the actual SIM acquired checkpoint after producers/admission; this spec does not fabricate it'};
  h.proof.attackConfirmationScope='Not exercised: no real pre-order checkpoint supplied; the saved confirmed intention is never recreated';
  // The imported pending owns its real modal and Worker auto-resumes it.
  // Do not call h.load/stop or issue another caravan-order on this first load.
  await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(b.input);
  await expect(front).toBeHidden({timeout:90_000});await expect(page.locator('#loading')).toHaveCount(0,{timeout:90_000});
  const dialog=page.locator('dialog.caravan-encounter-dialog');
  // An already-generated target may adopt before its transient modal paints.
  // Capture it only if it is actually present; never delay or fake the Worker.
  if(await dialog.isVisible())await page.screenshot({path:info.outputPath('01-actual-same-pending-entry.png')});
  const kind=branch==='ATTACK'?'foreign-settlement':'quest-site';
  let actualTick:number|undefined,refusal:string|undefined;
  await expect.poll(async()=>{const result=await page.evaluate(({id,tile,kind})=>{const api=window.__lisiere,w=api.world,m=w.campaignMap,dialog=document.querySelector('dialog.caravan-encounter-dialog');if(dialog&&[...dialog.querySelectorAll('button')].some(b=>b.textContent==='Réessayer cette entrée'))return {tick:undefined,refusal:dialog.querySelector('[role=status]')?.textContent??'Actual entry refused'};if(m?.revision!==2)return {tick:undefined,refusal:undefined};const header=m.maps.find(r=>r.id===m.activeMapId);return header?.kind===kind&&header.tile===tile&&!m.groups.some(r=>r.id===id)&&!api.incident.waiting&&!api.incident.simulationStopped?{tick:w.tick,refusal:undefined}:{tick:undefined,refusal:undefined};},{id:b.groupId,tile:b.tile,kind});actualTick=result.tick;refusal=result.refusal;return actualTick!==undefined||refusal!==undefined;},{timeout:180_000,message:'Same actual pending263 commits or retains its real refusal; never reroute/retry a favorable generation'}).toBe(true);
  if(refusal!==undefined)throw Error('Actual263 entry refused without retry: '+refusal);expect(actualTick).toBe(b.tick);
  await expect(dialog).not.toBeVisible();await expect(page.locator('[data-speed="0"]')).toHaveAttribute('aria-pressed','true');h.actualGPU();
  const firstTransport=await trace263(page);expect(firstTransport.filter(r=>r.direction==='sent'&&r.type==='command')).toEqual([]);
  const sent=firstTransport.find(r=>r.direction==='sent'&&r.type==='load');if(!sent)throw Error('Actual UI load request absent');const reply=firstTransport.find(r=>r.direction==='received'&&r.type==='reply'&&r.worker===sent.worker&&r.id===sent.id);expect(reply?.ok,reply?.reason).toBe(true);
  h.proof.initialTransport=firstTransport;h.proof.loadWallMilliseconds=reply!.at-sent.at;h.proof.transportScope='Existing MAIN sent/reply performance.now timestamps; not Worker CPU, GPU, FPS or a threshold';
  await page.screenshot({path:info.outputPath('02-actual-target-map-paused.png')});
  let exported:Awaited<ReturnType<typeof h.exported>>|undefined=await h.exported('03-actual-target-complete-before-reload');
  if(!('pawns'in exported.root))throw Error('Actual loaded target campaign required');const root=exported.root;expect(validateWorld(root)).toEqual([]);expect(root.tick).toBe(b.tick);
  const maps=root.worldMaps!,header=maps.sites.find(r=>r.id===maps.selectedMapId);if(!header)throw Error('Actual selected target header absent');expect(header.kind).toBe(kind);expect(header.tile).toBe(b.tile);expect(['camp','battlefield']).not.toContain(header.kind);
  const map=registeredMap(root,header.id)!;if(!map)throw Error('Actual target body absent');expect(map.tick).toBe(b.tick);expect(root.worldGroups!.groups.some(r=>r.state.id===b.groupId)).toBe(false);
  if(b.target.kind==='attack-settlement')expect(header.target263).toMatchObject({revision:1,kind:'foreign-settlement',settlementId:b.target.settlementId,factionId:b.target.factionId});
  else expect(header.target263).toMatchObject({revision:1,kind:'quest-site',siteId:b.target.siteId});
  for(const old of b.existingMaps)expect(maps.sites.find(r=>r.id===old.id)).toMatchObject(old);
  for(const old of b.people){const actual=map.pawns.filter(p=>p.id===old.id);expect(actual).toHaveLength(1);const p=actual[0]!;expect(stableHuman263(p)).toEqual(stableHuman263(old));expect(p.state).toBe(old.state==='downed'?'downed':'idle');expect(p.path).toEqual([]);expect(p.motion).toBeUndefined();expect(p.moveCooldown).toBe(0);expect(p.planCooldown).toBe(0);expect(p.draft).toEqual(b.draftPeople&&old.state!=='downed'&&!old.prisoner&&old.faction!=='outlaws'&&old.faction!=='outlanders'?{lastActiveTick:b.tick,target:null,queue:[]}:old.draft);expect(root.worldPawns!.owners.some(r=>r.actor.id===old.id)).toBe(false);}
  for(const old of b.animals){const actual=map.wildlife?.animals.filter(a=>a.id===old.id)??[];expect(actual).toHaveLength(1);expect(stableAnimal263(actual[0]!)).toEqual(stableAnimal263(old));expect(actual[0]!.state).toBe(old.state==='downed'?'downed':'idle');expect(actual[0]!.nextDecision).toBe(b.tick);expect(root.worldPawns!.owners.some(r=>r.actor.id===old.id)).toBe(false);}
  for(const old of b.items){const actual=map.piles.filter(p=>p.id===old.id);expect(actual).toEqual([old]);}
  for(const old of b.packed)expect(map.packed.filter(p=>p.building.id===old.building.id)).toEqual([old]);
  if(b.itemStash){const site=root.worldSites263?.entries.find(s=>s.id===b.itemStash!.id);if(!site||site.kind!=='item-stash')throw Error('Actual Site authority disappeared');expect(site.threat).toEqual(b.itemStash.threat);expect(site.createdAtCore).toBe(b.itemStash.createdAtCore);expect(site.mapId).toBe(header.id);expect(site.expiresAtCore).toBeNull();expect(site.items).toEqual([]);expect(site.closed).toBeUndefined();
   for(const old of b.itemStash.items){const actual=map.piles.filter(p=>p.id===old.id);expect(actual).toHaveLength(1);const p=actual[0]!;expect(p.owner.type).toBe('ground');expect({...p,owner:old.owner,...old.rot?{rot:old.rot}:{}}).toEqual(old);if(old.rot)expect(p.rot).toEqual({progress:rotAge(old,b.itemStash.heldAtCore/10),atTick:b.tick});}
  }
  // Preserve the actual complete RAW/hash for the subsequent exact UI import.
  const raw=await decodeStoredSave(await readFile(exported.path,'utf8'));await writeFile(info.outputPath('03-actual-target-RAW.json'),raw);h.proof.actualOutput={mapId:header.id,kind:header.kind,tile:header.tile,tick:root.tick,rawSHA256:sha(raw),fileSHA256:exported.fileSHA256,memberIds:b.people.map(p=>p.id),animalIds:b.animals.map(a=>a.id),itemIds:b.items.map(p=>p.id)};
  const expectedCanonical=exported.canonical;await h.load(exported.path,root);exported=undefined;
  await expect(dialog).not.toBeVisible();await expect(page.locator('[data-speed="0"]')).toHaveAttribute('aria-pressed','true');const reloaded=await h.exported('04-exact-paused-target-reimport');expect(reloaded.canonical).toBe(expectedCanonical);expect(reloaded.root.tick).toBe(b.tick);h.actualGPU();
  await page.keyboard.press('Escape');await panel(page,'world');await page.locator('#world-tab-maps').click();const row=page.locator(`.map-registry-row[data-map-id="${header.id}"]`);await expect(row).toContainText(branch==='ATTACK'?'Établissement étranger':'Site temporaire');await expect(row).not.toContainText('Camp temporaire');await expect(row).not.toContainText('Champ de bataille');await page.screenshot({path:info.outputPath('05-real-target-header-after-exact-reload.png')});
  expect(sha(await readFile(b.input,'utf8'))).toBe(b.expectedSHA);h.proof.exactFullReload=true;h.proof.noPlayedTick=true;await h.finish();
 }catch(error){
  h.proof.error=String(error);
  try{await page.screenshot({path:info.outputPath('failure-at-actual-entry-no-bypass.png')});h.proof.actualNotice=await page.locator('dialog.caravan-encounter-dialog [role=status]').textContent({timeout:1_000});}catch{/* Keep original failure. */}
  try{
   h.proof.failureConfirmedHeader=await page.evaluate(()=>{const a=window.__lisiere as typeof window.__lisiere&{hasActiveMap:boolean},w=a.world,m=w?.campaignMap;return {hasActiveMap:a.hasActiveMap,tick:w?.tick,seed:w?.seed,mapId:m?.revision===2?m.activeMapId:null,incident:a.incident};});
   const button=page.locator('[data-save-manager-action="export"]');
   if(!await button.count()||await button.isDisabled())throw Error('Normal export is unavailable; no state or disabled flag is bypassed');
   // Diagnostic only after RED: trigger the existing read-only export handler
   // despite an obstructing loading surface. This is never a UI pass or retry.
   const pending=page.waitForEvent('download',{timeout:20_000});void pending.catch(()=>{});
   await button.evaluate(element=>(element as HTMLButtonElement).click());
   const path=info.outputPath('failure-current-complete.json');await(await pending).saveAs(path);
   const bytes=await readFile(path,'utf8'),raw=await decodeStoredSave(bytes),root=deserializeCampaign(raw);expect(validateWorld(root)).toEqual([]);
   h.proof.failureCompleteExport={path,fileSHA256:sha(bytes),rawSHA256:sha(raw),tick:root.tick,purpose:'Failure-only actual Worker save through existing export handler; no played tick, altered World, renderer bypass qualification or favorable retry'};
  }catch(capture){h.proof.failureCompleteExportError=String(capture);}
  throw error;
 }finally{await h.save();}
});
