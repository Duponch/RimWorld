// Distinct natural V345 reserve branch; V344 recovery remains unchanged.
import {test,expect,type Page} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {world,pause,panel,expectWorld,observeErrors,settledCells} from './helpers';
import {perform,revealCells} from './player-actions';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {consumeReason,consumeProposal} from '../../src/sim/consuming';
import type {Cell,Pawn,World,WorldEvent} from '../../src/sim/types';

const INPUT='tmp/early-access-v345/native/colony-reserve-v345-V345-d-0c080-nd-actual-reserve-ingestion/failure-outcome.json';
const INPUT_SHA='83b7ceaff676e6d40193ca5711f09d65a8b03a23457c2c8ce8f24ecd33fbf220';
const SIDE_SHA='5da48f95bbb6f7045a573bb6bceca374c7e33fd500d4d3e45a39c36f0a7616a3';
const IDS=[18530,18532,18534],IRIS=18530,SOURCE=19664,OTHER=19655,SEED=3398550437;
const sha=(raw:string)=>createHash('sha256').update(raw).digest('hex');
const inside=(c:Cell)=>c.x>=121&&c.x<=124&&c.z>=111&&c.z<=114;
const stationary=(p:Pawn,tick:number)=>p.moveCooldown===0&&(p.motion?.end??0)<=tick;
const actor=(w:World)=>w.pawns.find(p=>p.id===IRIS)!;
async function observe(page:Page){return page.evaluate(ids=>{
  const w=window.__lisiere.world,live=(p:{state:string;health?:{death?:unknown}})=>!p.health?.death&&!['dead','downed'].includes(p.state);
  return {tick:w.tick,seed:w.seed,backend:window.__lisiere.backend,incident:window.__lisiere.incident,people:w.pawns.filter(p=>ids.includes(p.id)),
    piles:w.piles.filter(p=>p.item==='survival-meal'),events:w.events,danger:[...w.pawns.filter(p=>live(p)&&p.faction==='outlaws'&&!p.prisoner&&!p.raid?.exiting).map(p=>p.id),
      ...(w.wildlife?.animals??[]).filter(a=>live(a)&&a.manhunter&&!a.manhunter.exhausted).map(a=>a.id),...(w.mechanoids??[]).filter(live).map(p=>p.id)]};
},IDS);}
type Observation=Awaited<ReturnType<typeof observe>>;
type Ledger={version:347;origin:{path:string;tick:number;sha256:string;sidecarSha256:string};inheritedV345:unknown;seed:number;people:number[];
  snapshotTick?:number;snapshotSha256?:string;notes:unknown[];cargo?:{sourceId:number;sourceQuantity:number;remaining:number;carryId:number;quantity:number;tick:number};
  ingestion?:{carryId:number;cell:Cell;tick:number;hunger:number;progress:number};eaten?:{tick:number;hunger:number;event:WorldEvent};
  checkpoints:{name:string;path:string;tick:number;sha256:string;reloaded:boolean;proof:unknown}[]};

test('V347 one real interior reserve portion from the distinct literal V345 branch',async({page},info)=>{
  test.skip(!process.env.V347_INPUT,'ROOT opt-in literal V34558111 branch and SHA-bound evidence only.');test.setTimeout(180000);page.setDefaultTimeout(10000);
  const started=Date.now(),deadline=started+120000,input=resolve(process.env.V347_INPUT!),errors=observeErrors(page),rotation={value:0},ring:Observation[]=[];
  let e!:Ledger,loaded=false,complete=false,failure:unknown,last:Observation|undefined,carryId:number|undefined;
  const front=()=>page.locator('.front-menu'),run=async()=>{await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();};
  const guard=(s:Observation)=>{
    if(Date.now()>deadline)throw Error('Bounded V347 body expired');expect(errors).toEqual([]);if(s.incident.simulationStopped||s.incident.graphicsFault)throw Error('Technical incident; preserve the actual branch.');
    if(s.danger.length)throw Error('New natural danger; no retry for a win.');
    if(s.people.length!==3||s.people.some(p=>p.health?.death||['dead','downed'].includes(p.state)||p.prisoner||p.mental?.crisis))throw Error('An original person is unavailable; preserve this outcome.');
    expect(s.seed).toBe(SEED);expect(s.people.map(p=>p.id).sort((a,b)=>a-b)).toEqual(IDS);
  };
  const read=async()=>{last=await observe(page);ring.push(last);if(ring.length>20)ring.shift();guard(last);return last;};
  const wait=async(done:(s:Observation)=>boolean)=>{await expect.poll(async()=>{if(Date.now()>deadline)throw Error('Bounded V347 body expired');return done(await read());},{timeout:45000,intervals:[150]}).toBe(true);};
  const capture=async(name:string,qualify?:(w:World)=>void,reload=true,screenshot=false)=>{
    await pause(page);const before=await world(page);expect(validateWorld(before)).toEqual([]);last=await observe(page);if(name!=='failure-outcome')guard(last);qualify?.(before);
    await page.keyboard.press('Escape');if(screenshot)await page.screenshot({path:info.outputPath(name+'-map.png')});await panel(page,'menu');
    const manager=page.locator('[data-save-manager]'),label='V347 '+name;await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();
    await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
    const path=info.outputPath(name+'.json');await(await download).saveAs(path);const raw=await readFile(path,'utf8');expect(deserializeWorld(raw)).toEqual(before);const entry={name,path,tick:before.tick,sha256:sha(raw),reloaded:false,proof:last};
    e.checkpoints.push(entry);e.snapshotTick=before.tick;e.snapshotSha256=entry.sha256;
    if(reload){await page.locator('#browse-saves').click();const row=front().locator('label').filter({has:page.locator('strong').filter({hasText:label})});await row.locator('input[name="front-save"]').check();await front().getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,before);entry.reloaded=true;}
    await writeFile(path+'.evidence.json',JSON.stringify(e,null,2));await info.attach(name,{contentType:'application/json',path});await page.keyboard.press('Escape');return before;
  };
  try{
    expect(input).toBe(resolve(INPUT));const raw=await readFile(input,'utf8'),sideRaw=await readFile(input+'.evidence.json','utf8');expect(sha(raw)).toBe(INPUT_SHA);expect(sha(sideRaw)).toBe(SIDE_SHA);
    const literal=JSON.parse(raw) as World,initial=deserializeWorld(raw),side=JSON.parse(sideRaw);expect([literal.schemaVersion,literal.tick]).toEqual([233,58111]);expect(initial).toEqual({...literal,schemaVersion:234});expect(validateWorld(initial)).toEqual([]);
    expect([side.version,side.seed,side.snapshotTick,side.snapshotSha256]).toEqual([345,SEED,58111,INPUT_SHA]);expect(side.people).toEqual(IDS);expect(side.eaten).toBeUndefined();expect([initial.seed,initial.width,initial.height]).toEqual([SEED,250,250]);
    expect(initial.piles.filter(p=>p.item==='survival-meal').reduce((n,p)=>n+p.quantity,0)).toBe(16);expect(initial.piles.find(p=>p.id===SOURCE)).toMatchObject({item:'survival-meal',quantity:6,owner:{type:'ground',x:121,z:114}});expect(initial.piles.find(p=>p.id===OTHER)).toMatchObject({item:'survival-meal',quantity:10,owner:{type:'ground',x:122,z:114}});
    e={version:347,origin:{path:input,tick:58111,sha256:INPUT_SHA,sidecarSha256:SIDE_SHA},inheritedV345:side,seed:SEED,people:IDS,notes:[],checkpoints:[]};
    e.notes.push({branch:'Distinct V345 reserve56911 continuation; V344 recovery66636 remains separate.',qualification:'Existing provisions only; inherited V345 delivery and prior ingestions earn no new credit.',initialActors:initial.pawns.filter(p=>IDS.includes(p.id))});
    await page.goto('/?e2e');await front().getByRole('button',{name:'Charger une partie',exact:true}).click();await front().locator('input[type=file]').setInputFiles(input);await expectWorld(page,initial);await pause(page);loaded=true;await read();
    await capture('initial-copy',w=>expect(w).toEqual(initial));
    const beforeDraft=await world(page);expect(consumeReason(beforeDraft,actor(beforeDraft),beforeDraft.piles.find(p=>p.id===SOURCE))).toBeUndefined();
    await perform(page,{reason:'Mobiliser Iris pour quitter son sommeil réel et consommer une seule ration intérieure',command:{type:'draft',pawnIds:[IRIS],enabled:true}},rotation);
    const drafted=await world(page),iris=actor(drafted),pile=drafted.piles.find(p=>p.id===SOURCE)!;expect(iris.draft).toBeTruthy();expect(iris.need).toBeNull();expect(consumeReason(drafted,iris,pile)).toBeUndefined();expect(consumeProposal(drafted,iris,pile)?.task.quantity).toBe(1);
    await page.keyboard.press('Escape');await page.locator(`[data-pawn="${IRIS}"]`).click();await revealCells(page,[{x:121,z:114}]);await settledCells(page,[{x:121,z:114}]);
    const point=await page.evaluate(()=>{const b=document.querySelector('#viewport canvas')!.getBoundingClientRect(),p=window.__lisiere.projectCell(121,114);return {x:b.left+p.x,y:b.top+p.y};});expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,point)).toBe('CANVAS');
    await page.mouse.click(point.x,point.y,{button:'right'});const action=page.locator(`[data-order-consume="${SOURCE}"]`);await expect(action).toBeEnabled();await expect(action).toContainText('Consommer');await action.click();
    await expect.poll(async()=>(await read()).people.find(p=>p.id===IRIS)?.need).toMatchObject({kind:'eat',forced:true,phase:'pickup',sourcePileId:SOURCE,carryPileId:null,quantity:1,progress:0});
    await capture('ordered',w=>{expect(actor(w).need).toMatchObject({phase:'pickup',forced:true,quantity:1});expect(w.piles.find(p=>p.id===SOURCE)?.quantity).toBe(6);},true,true);await run();
    await wait(s=>{const p=s.people.find(p=>p.id===IRIS)!;return p.need?.kind==='eat'&&p.need.forced===true&&p.need.carryPileId!==null;});
    await capture('cargo',w=>{const p=actor(w);if(p.need?.kind!=='eat')throw Error('No physical meal task');carryId=p.need.carryPileId??undefined;if(carryId===undefined)throw Error('No held portion');
      expect(carryId).not.toBe(SOURCE);expect(w.piles.find(v=>v.id===carryId)).toMatchObject({item:'survival-meal',quantity:1,owner:{type:'pawn',pawnId:IRIS}});expect(w.piles.find(v=>v.id===SOURCE)?.quantity).toBe(5);
      e.cargo={sourceId:SOURCE,sourceQuantity:6,remaining:5,carryId,quantity:1,tick:w.tick};});await run();
    await wait(s=>s.people.find(p=>p.id===IRIS)?.need?.kind==='eat'&&s.people.find(p=>p.id===IRIS)!.need!.phase==='ingest');
    await capture('ingest',w=>{const p=actor(w);expect(p.need).toMatchObject({forced:true,phase:'ingest',carryPileId:carryId,quantity:1});expect(p.draft).toBeTruthy();expect(inside(p)).toBe(true);expect(stationary(p,w.tick)).toBe(true);
      expect(Math.abs(p.x-121)+Math.abs(p.z-114)).toBeLessThanOrEqual(1);if(p.need?.kind!=='eat')throw Error('No physical ingestion');e.ingestion={carryId:carryId!,cell:{x:p.x,z:p.z},tick:w.tick,hunger:p.hunger,progress:p.need.progress};},true,true);await run();
    await wait(s=>{const p=s.people.find(p=>p.id===IRIS)!;if(p.need?.kind==='eat'&&p.need.forced){expect(p.need).toMatchObject({phase:'ingest',carryPileId:carryId});expect({x:p.x,z:p.z}).toEqual(e.ingestion!.cell);expect(stationary(p,s.tick)).toBe(true);expect(s.piles.some(v=>v.id===carryId)).toBe(true);return false;}
      return !s.piles.some(v=>v.id===carryId)&&p.hunger>e.ingestion!.hunger&&s.events.some(v=>v.tick>=e.ingestion!.tick&&v.type==='need'&&v.message.startsWith('Iris a mangé une portion (1 × Repas de survie)'));});
    await capture('consumed',w=>{const p=actor(w),event=w.events.find(v=>v.tick>=e.ingestion!.tick&&v.type==='need'&&v.message.startsWith('Iris a mangé une portion (1 × Repas de survie)'))!;
      expect(event).toBeTruthy();expect(w.piles.some(v=>v.id===carryId)).toBe(false);expect(w.piles.find(v=>v.id===SOURCE)?.quantity).toBe(5);expect(w.piles.find(v=>v.id===OTHER)?.quantity).toBe(10);expect(w.piles.filter(v=>v.item==='survival-meal').reduce((n,v)=>n+v.quantity,0)).toBe(15);
      expect(inside(p)).toBe(true);expect(stationary(p,w.tick)).toBe(true);expect({x:p.x,z:p.z}).toEqual(e.ingestion!.cell);expect(p.hunger).toBeGreaterThan(e.ingestion!.hunger);expect(p.orders.active).toBeNull();expect(p.need).toBeNull();e.eaten={tick:w.tick,hunger:p.hunger,event};},true,true);
    expect(e.checkpoints).toHaveLength(5);expect(e.checkpoints.every(v=>v.reloaded)).toBe(true);expect(errors).toEqual([]);complete=true;
  }catch(error){failure=error;throw error;}
  finally{
    let exportFailure:unknown;if(loaded&&failure&&e)try{await capture('failure-outcome',undefined,false,true);}catch(error){exportFailure=error;}
    const path=info.outputPath('colony-reserve-use-summary.json');await writeFile(path,JSON.stringify({ledgerVersion:347,result:failure||exportFailure?'partial-failure':complete?'single-reserve-portion':'not-loaded',qualification:'One physical existing interior ration only; no new production, durable autonomy, recovery or campaign completion certified.',elapsedMs:Date.now()-started,failure:String(failure??exportFailure??''),ledger:e,errors,ring,last},null,2));await info.attach('colony-reserve-use-summary',{contentType:'application/json',path});
  }
});