import {expect,test} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {configuredInitialCalendarScalars256} from '../../src/sim/initial-calendar-256';
import {planetGeography256} from '../../src/sim/planet-geography-256';
import {worldCreationCalendarFacts262} from '../../src/ui/world-creation-calendar-262';
import {harness414} from './owners-v414-native-helper';

const SEED='Fondations263 · démonstration une colonie';
/** Future ROOT-only creation, not a fixture factory. A displayed temperate site
 * is chosen on ONE generated planet. No inspection/filter of the local map,
 * reroll, terrain edit, actor preparation or patrimony call occurs here. */
test('one new263 home250/spring, real capsule opening, exact reload and patrimony input',async({page},info)=>{
 test.skip(process.env.FINAL_DEMO263_NATIVE!=='1','Future creation only AFTER ROOT qualification V418');
 const h=await harness414(page,info,'new final demonstration263; no prepared patrimony',{exactAdoptionOnce415:true});
 await page.addInitScript(()=>{
  const rows:unknown[]=[],seen=new WeakSet<Worker>();Object.defineProperty(window,'__demo263CreationTransport',{value:rows});
  const original=Worker.prototype.postMessage as (...args:unknown[])=>void;
  Worker.prototype.postMessage=function(this:Worker,...args:unknown[]){
   if(!seen.has(this)){seen.add(this);this.addEventListener('message',(e:MessageEvent)=>{const d=e.data;
    if(d?.type==='reply')rows.push({direction:'reply',at:performance.now(),id:d.id,ok:d.ok,reason:d.reason,checkpoint:d.checkpoint});
    else if(d?.type==='world-draft-progress')rows.push({direction:'progress',at:performance.now(),id:d.id,generation:d.generation,progress:structuredClone(d.progress)});
   });}
   const d=args[0] as {type?:string;id?:number;request?:unknown;ticket?:unknown};
   if(d?.type?.startsWith('world-draft-'))rows.push({direction:'sent',at:performance.now(),type:d.type,id:d.id,request:structuredClone(d.request),ticket:structuredClone(d.ticket)});
   original.apply(this,args);
  } as Worker['postMessage'];
 });
 const front=page.locator('.front-menu'),button=(name:string)=>front.getByRole('button',{name,exact:true});
 const captures:unknown[]=[],choices:unknown[]=[];let creationTransport:unknown[]=[];
 async function capture(name:string){const path=info.outputPath(name+'.png');await page.screenshot({path,fullPage:true});await info.attach(name,{path,contentType:'image/png'});captures.push({name,path});}
 async function collectCreation(){creationTransport=await page.evaluate(()=>(window as unknown as {__demo263CreationTransport:unknown[]}).__demo263CreationTransport??[]);}
 try{
  await page.goto('/?e2e');await button('Options').click();const max=front.locator('#front-max-settlements');await max.selectOption('1');await expect(max).toBeEnabled();await expect(max).toHaveValue('1');await button('Retour').click();
  await button('Nouvelle partie').click();await expect(front.locator('.front-scenario-selected').filter({hasText:'Atterrissage forcé'})).toHaveAttribute('aria-pressed','true');await button('Suivant').click();await front.getByRole('radio',{name:'Récit d’aventure',exact:true}).check();await front.getByRole('radio',{name:'Rechargeable à tout moment',exact:true}).check();await button('Suivant').click();
  await front.locator('#front-seed').fill(SEED);await front.locator('#front-world-coverage').selectOption('0.3');await button('Modifier…').click();
  const advanced=front.getByRole('dialog',{name:'Paramètres avancés',exact:true});await advanced.locator('input[name="front-map-size"][value="250"]').check();await advanced.locator('input[name="front-start-season"][value="spring"]').check();await capture('01-advanced250-spring');await advanced.getByRole('button',{name:'Fermer',exact:true}).click();
  h.proof.stage='one planet generation';await button('Générer').click();const dense=front.locator('.planet-dense-view'),select=dense.locator('[data-planet-selection]');await expect(select).toBeVisible({timeout:120_000});
  let selected:number|undefined;
  // One forward traversal of the REAL displayed list. Occupied/adjacent sites
  // retain their actual refusal; only a different manual choice on this same
  // planet is allowed. No river requirement and no hidden local-map query.
  for(let p=0;p<2048&&selected===undefined;p++){
   const options=await select.locator('option').evaluateAll(elements=>elements.map(e=>({value:(e as HTMLOptionElement).value,label:e.textContent??''})));
   for(const candidate of options.filter(o=>/ · Forêt tempérée · (plat|petites collines)$/.test(o.label))){
    await select.selectOption(candidate.value);const facts=await front.locator('#front-site-facts').textContent(),admissible=await button('Suivant').isEnabled();choices.push({...candidate,facts,admissible});
    if(admissible){selected=Number(candidate.value);break;}
   }
   if(selected!==undefined)break;const next=dense.getByRole('button',{name:'Suivantes',exact:true});if(!await next.isEnabled())break;await next.click();
  }
  h.proof.siteChoices=choices;if(selected===undefined)throw Error('No admissible displayed temperate flat/small-hills site on this ONE planet; no reroll');
  const chosenTile=selected,facts=front.locator('#front-site-facts');await expect(facts).toContainText('250 × 250');await expect(facts).toContainText('Printemps');await expect(facts).toContainText('5500');await expect(facts).toContainText('Cours d’eau');h.proof.siteFacts=await facts.textContent();await capture('02-real-site-before-confirmation');
  await button('Suivant').click();const confirm=front.getByRole('dialog',{name:'Confirmer le départ',exact:true});await expect(confirm).toContainText('250 × 250');await expect(confirm).toContainText('Printemps');await confirm.getByRole('button',{name:'Confirmer',exact:true}).click();
  h.proof.stage='one local factory creation';await button('Démarrer').click();if(await confirm.isVisible())await confirm.getByRole('button',{name:'Confirmer',exact:true}).click();await expect(front).toBeHidden({timeout:120_000});await expect(page.locator('#loading')).toHaveCount(0,{timeout:120_000});await h.stop();await collectCreation();
  const requests=creationTransport as {direction:string;type?:string;request?:unknown;ticket?:unknown}[];
  expect(requests.filter(r=>r.direction==='sent'&&r.type==='world-draft-generate')).toHaveLength(1);expect(requests.filter(r=>r.direction==='sent'&&r.type==='world-draft-confirm')).toHaveLength(1);expect(requests.find(r=>r.direction==='sent'&&r.type==='world-draft-confirm')!.request).toMatchObject({tile:chosenTile,size:250,season:'spring'});expect(requests.filter(r=>r.direction==='sent'&&r.type==='world-draft-start')).toHaveLength(1);expect(requests.find(r=>r.direction==='sent'&&r.type==='world-draft-start')!.ticket).toMatchObject({tile:chosenTile,size:250,season:'spring'});
  // Exports are durable BEFORE all scenario assertions. Do not hold this full
  // initial World during opening/reload; only original scalar identities remain.
  const originals=await(async()=>{
   const saved=await h.exported('00-actual-created-before-opening');const w=saved.root;if(!('tiles'in w))throw Error('Actual loaded new home required');
   expect(w.schemaVersion).toBe(263);expect(w.tick).toBe(0);expect(w.width).toBe(250);expect(w.height).toBe(250);expect(w.worldMaps!.sites.map(s=>({id:s.id,kind:s.kind}))).toEqual([{id:0,kind:'settlement'}]);expect(w.worldMaps!.selectedMapId).toBe(0);expect(w.worldMaps!.rootMapId).toBe(0);expect(w.worldGroups!.groups).toHaveLength(0);
   if(w.planet?.revision!==3||w.climate?.revision!==4)throw Error('Actual geographic planet and calendar required');expect(w.planet.homeTile).toBe(chosenTile);
   const surface=planetGeography256(w.planet).surface,tile=surface.tiles[chosenTile]!;expect(surface.seedText).toBe(SEED);expect(tile.biome).toBe('temperate-forest');expect(['flat','small-hills']).toContain(tile.hilliness);
   const clock=configuredInitialCalendarScalars256(w.climate.definition,{season:'spring'});expect(w.worldMaps!.calendarOrigin).toBe(clock.localStartAbsCore/10);expect(w.climate.calendarOrigin).toBe(clock.localStartAbsCore/10);
   const a=w.startingArrival;if(a?.profile!=='crashlanded-pods-core256-v1'||a.phase==='opened')throw Error('Actual unopened creation capsules required; no replay or synthetic arrival');expect(a.pods).toHaveLength(3);expect(a.destroyedPods??[]).toEqual([]);
   const people=a.pods.map(p=>({id:p.pawn.id,name:p.pawn.name})),reserves=w.worldPawns!.owners.filter(r=>r.startingPawnLeftBehind).map(r=>r.actor.id);expect(reserves).toHaveLength(5);
   h.proof.creation={path:saved.path,sha256:saved.fileSHA256,tick:w.tick,tile:chosenTile,seed:SEED,size:250,season:'spring',calendar:worldCreationCalendarFacts262(tile,'spring'),people,reserves};return {people,reserves,tick:w.tick};
  })();
  expect(await page.evaluate(()=>{const m=window.__lisiere.world.campaignMap;return m?.revision===2?m.maxSettlements:null;})).toBe(1);
  h.proof.stage='single real capsule-opening run';await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();
  let openingFailure:unknown;try{
   await expect.poll(()=>page.evaluate(()=>{const w=window.__lisiere.world;return w.startingArrival?.phase==='opened'||w.tick>=120;}),{timeout:90_000,intervals:[100],message:'Actual capsule opening, bounded120 local ticks; no offered arrival state'}).toBe(true);
  }catch(error){openingFailure=error;}finally{await h.stop();}
  // Retain the bounded refusal as well: never regenerate/repair a capsule.
  h.proof.stage='actual opened or bounded refusal export';
  const final=await(async()=>{
   const saved=await h.exported('01-actual-opened-or-bounded-refusal');if(openingFailure)throw openingFailure;const w=saved.root;if(!('tiles'in w))throw Error('Actual loaded home required');const a=w.startingArrival;
   if(a?.profile!=='crashlanded-pods-core256-v1'||a.phase!=='opened')throw Error('Capsules did not open within the declared real-time/tick bound');expect(a.destroyedPods??[]).toEqual([]);expect(a.openedAt).toBeLessThanOrEqual(w.tick);expect(w.tick).toBeGreaterThan(originals.tick);expect(w.tick).toBeLessThanOrEqual(130);
   expect(w.pawns.map(p=>({id:p.id,name:p.name})).sort((a,b)=>a.id-b.id)).toEqual([...originals.people].sort((a,b)=>a.id-b.id));expect(w.pawns.every(p=>p.state!=='dead'&&!p.health?.death)).toBe(true);expect(w.jobs).toHaveLength(0);expect(w.research?.project).toBeFalsy();expect(w.worldGroups!.groups).toHaveLength(0);expect(w.worldPawns!.owners.filter(r=>r.startingPawnLeftBehind).map(r=>r.actor.id)).toEqual(originals.reserves);for(const p of originals.people)expect(w.worldPawns!.owners.some(r=>r.actor.id===p.id)).toBe(false);
   await page.keyboard.press('Escape');await capture('03-opened-real-home250-spring');h.actualGPU();h.proof.realOpening={tick:w.tick,openedAt:a.openedAt,playedLocalTicks:w.tick-originals.tick,noPreparedPatrimony:true};h.proof.preReloadTransport=await page.evaluate(()=>(window as unknown as {__owners414Transport:unknown[]}).__owners414Transport.slice());await h.load(saved.path,w);return {canonical:saved.canonical,path:saved.path,sha256:saved.fileSHA256,tick:w.tick};
  })();
  const reloaded=await h.exported('02-opened-reloaded-exact');expect(reloaded.canonical).toBe(final.canonical);expect(reloaded.root.tick).toBe(final.tick);h.actualGPU();expect(await page.evaluate(()=>{const m=window.__lisiere.world.campaignMap;return m?.revision===2?m.maxSettlements:null;})).toBe(1);
  const ticket={path:resolve(reloaded.path),sha256:reloaded.fileSHA256,tick:reloaded.root.tick,notice:'Actual new263 UI creation, ordinary capsule opening and exact paused reload. No patrimony applied. ROOT may supply this path+SHA to prepareFinalDemonstration263 only after V418 qualification; preserve actual input on any refusal.'};await writeFile(info.outputPath('patrimony-input.json'),JSON.stringify(ticket,null,2));h.proof.patrimonyInput=ticket;h.proof.exactReload=true;await h.finish();
 }catch(error){await h.failure(error);throw error;}finally{
  if(!creationTransport.length)try{await collectCreation();}catch{/* h.save keeps the actual transport/error checkpoints. */}
  const timed=creationTransport as {direction:string;type?:string;id?:number;at:number;ok?:boolean}[];h.proof.mainTransportWallDurations=timed.filter(r=>r.direction==='sent'&&['world-draft-generate','world-draft-start'].includes(r.type??'')).map(sent=>{const reply=timed.find(r=>r.direction==='reply'&&r.id===sent.id);return {operation:sent.type,id:sent.id,sentAt:sent.at,replyAt:reply?.at,wallMilliseconds:reply?reply.at-sent.at:null,ok:reply?.ok,scope:'MAIN send→received ACK; scheduling/yields/transport/publication included, not Worker CPU/GPU/FPS; no threshold'};});h.proof.creationTransport=creationTransport;h.proof.captures=captures;h.proof.siteChoices=choices;await h.save();
 }
});
