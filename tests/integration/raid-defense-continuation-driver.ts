/* PRIVATE ROOT preparation. Adoption: tests/integration/raid-defense-continuation-driver.ts.
 * New explicit defense mandate; never resumes the stopped V362 driver. */
import {expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {world,pause,panel,expectWorld,observeErrors,tool,cell,settledCells} from './helpers';
import {perform,revealCells} from './player-actions';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {shotPlan,shootingQueries} from '../../src/sim/shooting';
import {shotCover} from '../../src/sim/combat-report';
import {doorOpenness} from '../../src/sim/door-rules';
import {canStandAt} from '../../src/sim/furniture-travel';
import {structureMaxHp} from '../../src/sim/thing-damage-rules';
import type {World,Pawn,Command,Cell} from '../../src/sim/types';

const SOURCE='tmp/early-access-defense/native-01/raid-defense-Real-raid2-de-12885-efuge-and-actual-rifle-line/';
const INPUT=SOURCE+'conservation.json',INPUT_SHA='8c1966f9a0d7d45c411936d78e4f2a0158c56c806012eeef72b3e3ef31b286fd';
const PARENT_SHA='96495249692a03643f95d3554264f65e90b0f2863ad0eda5c38f7a47f52397e9';
const ORIGINALS=[18530,18532,18534],PATIENTS=[19768,19771],IRIS=18530,GAEL=18532,LEONIE=18534,ENEMY=19852,DOOR=18648,RIFLE=18558,END=77565;
const POST:Cell={x:126,z:115},REFUGE=new Map<number,Cell>([[IRIS,{x:124,z:111}],[LEONIE,{x:121,z:113}],[GAEL,{x:124,z:114}]]);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const stationary=(w:World,p:Pawn)=>p.moveCooldown===0&&(p.motion?.end??w.tick)<=w.tick;
const inside=(c:Cell)=>c.x>=121&&c.x<=124&&c.z>=111&&c.z<=114;
const person=(w:World,id:number)=>w.pawns.find(p=>p.id===id)??w.visitors?.departed.find(d=>d.pawn.id===id)?.pawn;
const pawn=(w:World,id:number)=>w.pawns.find(p=>p.id===id)!;
const owned=(w:World,id:number)=>[...w.piles,...(w.visitors?.departed.find(d=>d.pawn.id===id)?.items??[])].filter(p=>'pawnId' in p.owner&&p.owner.pawnId===id);
class Stop extends Error{constructor(readonly reason:string,readonly detail:unknown){super(reason);}}

export async function runRaidDefenseContinuation(page:Page,info:TestInfo){
 expect(process.env.DEFENSE_CONTINUE_WRAPPER).toBe('1');page.setDefaultTimeout(10000);
 const segment=process.env.DEFENSE_CONTINUE_SEGMENT!,seconds=Number(process.env.DEFENSE_CONTINUE_BODY_SECONDS??120);expect(segment).toMatch(/^[a-zA-Z0-9_-]{1,32}$/);expect(seconds>=100&&seconds<=150).toBe(true);
 const raw=await readFile(INPUT,'utf8');expect(hash(raw)).toBe(INPUT_SHA);const initial=deserializeWorld(raw);expect(initial).toEqual({...JSON.parse(raw),schemaVersion:initial.schemaVersion});expect(initial.tick).toBe(74421);expect(validateWorld(initial)).toEqual([]);
 const parentText=await readFile(SOURCE+'ledger.json','utf8');expect(hash(parentText)).toBe(PARENT_SHA);const parent=JSON.parse(parentText);expect(parent.resumeAllowed).toBe(false);expect(parent.checkpoint).toMatchObject({sha256:INPUT_SHA,tick:74421,reloaded:false});
 expect(initial.raids?.active).toMatchObject({id:2,phase:'assault',deadline:77465,members:[ENEMY]});expect(initial.piles.find(p=>p.id===RIFLE)).toMatchObject({item:'bolt-action-rifle',quantity:1,owner:{type:'equipment',pawnId:GAEL}});
 const errors=observeErrors(page),lifecycle:unknown[]=[],journal:unknown[]=[],ring:unknown[]=[],actions:unknown[]=[],geometry:unknown[]=[],combatTrace:unknown[]=[],structuralDamage:unknown[]=[],enemyInjuries=new Set<number>(),projectileIds=new Set<number>(),checkpoints:{name:string;path:string;sha256:string;tick:number;reloaded:boolean}[]=[],rotation={value:0};
 const started=Date.now();let bodyStarted=started,deadline=Infinity,observeUntil=Infinity,loaded=false,finalizing=false,last:World|undefined,stage='input',stop='not-started',failure:unknown,exportFailure:unknown,fallback:unknown,backend:unknown,lastJournal=-1,lastKey='',civilSheltered=false,retreating=false,isolated=false,shotAcceptedAt:number|undefined,emissionObservedAt:number|undefined,raidOutcome:unknown;
 const injuries=new Map([...ORIGINALS,...PATIENTS].map(id=>[id,new Set(person(initial,id)?.health?.injuries.map(i=>i.id)??[])])),missing=new Map([...ORIGINALS,...PATIENTS].map(id=>[id,new Set(person(initial,id)?.health?.missing.map(i=>i.part)??[])])),infections=new Map([...ORIGINALS,...PATIENTS].map(id=>[id,new Set(person(initial,id)?.health?.infections?.cases.map(i=>i.id)??[])]));
 const property=PATIENTS.flatMap(id=>owned(initial,id).filter(p=>p.kind!=='food').map(p=>structuredClone(p))),initialDamage=new Map(initial.structures.map(s=>[s.id,s.damage??0]));
 const damageSeen=new Map(initialDamage);for(const s of initial.structures)if((s.damage??0)>0)structuralDamage.push({kind:'inherited-damage',tick:initial.tick,id:s.id,damage:s.damage,maxHp:structureMaxHp(s)});
 const push=(a:unknown[],v:unknown,max=192)=>{a.push(v);if(a.length>max)a.shift();};
 const crash=()=>lifecycle.push({kind:'pagecrash',elapsedMs:Date.now()-started}),closed=()=>lifecycle.push({kind:'pageclose',elapsedMs:Date.now()-started}),disconnected=()=>lifecycle.push({kind:'browserdisconnected',elapsedMs:Date.now()-started});page.on('crash',crash);page.on('close',closed);const browser=page.context().browser();browser?.on('disconnected',disconnected);
 const guard=(w:World)=>{
  if(errors.length||lifecycle.length)throw new Stop('technical-event',{errors,lifecycle});
  for(const id of [...ORIGINALS,...PATIENTS]){const p=person(w,id);if(!p||p.state==='dead'||p.health?.death)throw new Stop('protected-death-or-loss',{id,tick:w.tick,p});if(ORIGINALS.includes(id)&&(p.state==='downed'||p.mental?.crisis||p.collapsePending))throw new Stop('original-incapacity',{id,tick:w.tick,p});
   if(ORIGINALS.includes(id)&&p.hunger<=12.5)throw new Stop('original-hunger-intervention-required',{id,tick:w.tick,hunger:p.hunger});
   if(p.health?.injuries.some(i=>!injuries.get(id)!.has(i.id))||p.health?.missing.some(i=>!missing.get(id)!.has(i.part)))throw new Stop('first-protected-injury',{id,tick:w.tick,p});
   if(p.health?.infections?.cases.some(i=>!infections.get(id)!.has(i.id)))throw new Stop('new-infection',{id,tick:w.tick,p});
   if(PATIENTS.includes(id)){expect(p).toMatchObject({faction:'outlanders',visitor:{group:5}});expect(p.visitor?.medicalGuestAt).toBe(person(initial,id)?.visitor?.medicalGuestAt);}
  }
  for(const [id,damage] of initialDamage){const s=w.structures.find(s=>s.id===id);if(!s)throw new Stop('structure-destruction-or-breach',{id,tick:w.tick,damageBefore:damage});const maximum=structureMaxHp(s),current=s.damage??0,previous=damageSeen.get(id)??damage;
   if(current!==previous){structuralDamage.push({kind:'actual-structure-damage-change',id,tick:w.tick,damageBefore:previous,damageNow:current,maxHp:maximum,remaining:maximum-current,repairQualified:false});damageSeen.set(id,current);}
   if(maximum>0&&maximum-current<=maximum*.5)throw new Stop('structure-critical-hp',{id,tick:w.tick,s,maxHp:maximum,remaining:maximum-current});
  }
  if(w.pawns.some(p=>p.id!==ENEMY&&p.faction==='outlaws'&&!p.prisoner&&!['dead','downed'].includes(p.state))||w.wildlife?.animals.some(a=>a.manhunter&&!['dead','downed'].includes(a.state))||w.fires?.items.length||(w.raids?.serial??0)!==2)throw new Stop('new-danger',{tick:w.tick,raids:w.raids});
  const enemy=w.pawns.find(p=>p.id===ENEMY);if(enemy&&!['dead','downed'].includes(enemy.state)&&(inside(enemy)||enemy.motion&&enemy.motion.end>w.tick&&(inside(enemy.motion.from)||inside(enemy.motion.to))))throw new Stop('enemy-entry-or-entering-edge',{tick:w.tick,enemy});
  if(civilSheltered)for(const id of [IRIS,LEONIE])if(!inside(pawn(w,id)))throw new Stop('civilian-left-refuge',{id,tick:w.tick});
  if(isolated&&(!w.structures.find(s=>s.id===DOOR)?.door?.forbidden||w.structures.find(s=>s.id===DOOR)?.door?.open||doorOpenness(w.structures.find(s=>s.id===DOOR)!,w.tick)!==0||ORIGINALS.some(id=>!inside(pawn(w,id)))))throw new Stop('isolation-lost',{tick:w.tick});
  for(const old of property){const id='pawnId' in old.owner?old.owner.pawnId:0;expect(owned(w,id).find(p=>p.id===old.id)).toMatchObject({id:old.id,item:old.item,quantity:old.quantity,owner:old.owner});}
  expect(w.piles.find(p=>p.id===RIFLE)).toMatchObject({item:'bolt-action-rifle',owner:{type:'equipment',pawnId:GAEL}});
  if(!finalizing&&w.tick>=END)throw new Stop('tick-bound',{tick:w.tick,overshoot:w.tick-END});if(!finalizing&&Date.now()>deadline)throw new Stop('body-bound',{tick:w.tick,stage});
 };
 const sample=(w:World)=>({tick:w.tick,stage,people:[...ORIGINALS,...PATIENTS,ENEMY].map(id=>person(w,id)),door:w.structures.find(s=>s.id===DOOR),doorFraction:w.structures.find(s=>s.id===DOOR)?doorOpenness(w.structures.find(s=>s.id===DOOR)!,w.tick):null,rifle:w.piles.find(p=>p.id===RIFLE),piles:w.piles.filter(p=>p.kind==='food'||p.kind==='medicine'||p.kind==='weapon'),raids:w.raids,events:w.events.slice(-15),projectiles:w.projectiles});
 const read=async(conserve=false)=>{const w=await world(page);last=w;backend=await page.evaluate(()=>window.__lisiere.backend);if(!conserve){guard(w);const technical=await page.evaluate(()=>window.__lisiere.incident);if(technical.graphicsFault||technical.simulationStopped)throw new Stop('technical-incident',technical);if(!finalizing){for(const injury of w.pawns.find(p=>p.id===ENEMY)?.health?.injuries??[])if(!enemyInjuries.has(injury.id)){enemyInjuries.add(injury.id);combatTrace.push({observedTick:w.tick,targetId:ENEMY,injury:structuredClone(injury),qualification:'Actual injury, attribution limited to observed combat state'});}for(const projectile of w.projectiles??[])if(projectile.flight.launcherKey==='pawn:18532'&&projectile.emittedAtCore>initial.tick*10&&!projectileIds.has(projectile.id)){projectileIds.add(projectile.id);emissionObservedAt??=w.tick;combatTrace.push({kind:'new-projectile-physically-observed',tick:w.tick,projectile:structuredClone(projectile),shooterStance:pawn(w,GAEL).shooting?.stance});}}}const value=sample(w);push(ring,value,16);const key=JSON.stringify([stage,...w.pawns.filter(p=>ORIGINALS.includes(p.id)||p.id===ENEMY).map(p=>[p.id,p.state,p.shooting?.stance?.phase,p.shooting?.order?.targetId,p.melee?.strike]),w.raids?.active?.phase]);if(w.tick-lastJournal>=30||key!==lastKey){push(journal,value);lastJournal=w.tick;lastKey=key;}return w;};
 const closeMenu=async()=>{if(await page.locator('#menu-panel').isVisible())await page.locator('[data-panel="menu"]').click();};
 const run=async(speed:1|6)=>{await pause(page);await read();await closeMenu();await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();};
 const wait=async(done:(w:World)=>boolean)=>{while(Date.now()<observeUntil){const w=await read();if(done(w))return w;await page.waitForTimeout(100);}throw new Stop('segment-bound',{tick:last?.tick,stage});};
 const act=async(command:Command,reason:string)=>{await pause(page);await read();await perform(page,{command,reason},rotation);const w=await read();actions.push({command,reason,tick:w.tick});return w;};
 const capture=async(name:string,reload:boolean,conserve=false)=>{
  await pause(page);await closeMenu();const before=await read(conserve);expect(validateWorld(before)).toEqual([]);expect(checkpoints.length).toBeLessThan(2);await page.screenshot({path:info.outputPath(name+'.png')});
  await panel(page,'menu');const manager=page.locator('[data-save-manager]'),label=`Defense ${segment} ${name}`;await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await download).saveAs(path);const text=await readFile(path,'utf8');expect(deserializeWorld(text)).toEqual(before);const record={name,path,sha256:hash(text),tick:before.tick,reloaded:false};checkpoints.push(record);
  if(reload){await page.locator('#browse-saves').click();const front=page.locator('.front-menu'),row=front.locator('label').filter({has:page.locator('strong').filter({hasText:label})});await row.locator('input[name="front-save"]').check();await front.getByRole('button',{name:'Charger',exact:true}).click();await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90000});await expectWorld(page,before);record.reloaded=true;}
  await closeMenu();return before;
 };
 const doorPermission=async(forbidden:boolean)=>{
  await pause(page);const w=await read(),door=w.structures.find(s=>s.id===DOOR)!;await tool(page,'select');
  for(let n=0;n<w.pawns.length+7;n++){await revealCells(page,[door]);await cell(page,door.x,door.z);if(await page.locator('#door-forbidden').isVisible())break;}
  await expect(page.locator('#door-forbidden')).toBeVisible();await page.locator('#door-forbidden').setChecked(forbidden);await wait(state=>state.structures.find(s=>s.id===DOOR)?.door?.forbidden===forbidden);actions.push({kind:'actual-door-permission',forbidden,tick:last!.tick,physicalClosureNotInferred:true});
 };
 const holdFire=async()=>{
  await pause(page);await read();await page.keyboard.press('Escape');await page.locator(`[data-pawn="${GAEL}"]`).click();const button=page.locator('#fire-at-will');await expect(button).toBeVisible();if(await button.getAttribute('aria-pressed')==='true')await button.click();await wait(w=>pawn(w,GAEL).draft?.holdFire===true);actions.push({kind:'fire-at-will-off-manual-orders-only',tick:last!.tick,pawnId:GAEL});
 };
 /** Existing V338 projection/pan interaction, now using the actual human
  * contextual tactical action. Every command is sent by the real menu. */
 const shootVisible=async()=>{
  await pause(page);let w=await read();const g=pawn(w,GAEL),enemy=pawn(w,ENEMY),queries=shootingQueries(w),plan=shotPlan(w,g,ENEMY,queries),cover=shotCover(queries.grid(),enemy,g);
  const evidence={tick:w.tick,shooterId:GAEL,targetId:ENEMY,shooter:{x:g.x,z:g.z,motion:g.motion},target:{x:enemy.x,z:enemy.z,state:enemy.state},door:w.structures.find(s=>s.id===DOOR),plan:'reason' in plan?{reason:plan.reason}:{weaponId:plan.weapon.id,item:plan.weapon.item,quality:plan.weapon.weapon?.quality,range:plan.profile.range,line:plan.line},cover};geometry.push(evidence);
  if('reason' in plan||!stationary(w,g)||cover.blockChance<=0)return false;
  await page.keyboard.press('Escape');await page.locator(`[data-pawn="${GAEL}"]`).click();await revealCells(page,[enemy]);let point:{x:number;y:number}|undefined;
  for(let attempt=0;attempt<12;attempt++){
   await settledCells(page,[enemy]);const frame=await page.evaluate(id=>{
    const canvas=document.querySelector<HTMLCanvasElement>('#viewport canvas')!,b=canvas.getBoundingClientRect(),body=window.__lisiere.projectPawn(id);if(!body)return null;
    const clear=[[0,0],[-10,0],[10,0],[0,-10],[0,10]].every(([dx,dy])=>document.elementFromPoint(body.x+dx,body.y+dy)===canvas);
    const preferred={x:b.x+b.width*.72,y:b.y+b.height*.30};let anchor:{x:number;y:number;score:number}|undefined;
    for(let y=b.top+18;y<b.bottom-18;y+=24)for(let x=b.left+18;x<b.right-18;x+=24){if(![[0,0],[-10,0],[10,0],[0,-10],[0,10]].every(([dx,dy])=>document.elementFromPoint(x+dx,y+dy)===canvas))continue;const score=Math.hypot(x-preferred.x,y-preferred.y);if(!anchor||score<anchor.score)anchor={x,y,score};}
    return {body,clear,anchor};
   },ENEMY);if(!frame)throw new Stop('target-projection-absent',{tick:w.tick});if(frame.clear){point=frame.body;break;}if(!frame.anchor)throw new Stop('no-clear-canvas-pan',{tick:w.tick});
   await page.mouse.move(frame.anchor.x,frame.anchor.y);await page.mouse.down({button:'middle'});await page.mouse.move(frame.anchor.x+Math.max(-250,Math.min(250,frame.anchor.x-frame.body.x)),frame.anchor.y+Math.max(-180,Math.min(180,frame.anchor.y-frame.body.y)),{steps:8});await page.mouse.up({button:'middle'});
  }
  if(!point)throw new Stop('target-body-not-visible',{tick:w.tick});expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,point)).toBe('CANVAS');
  await page.mouse.click(point.x,point.y,{button:'right'});const button=page.locator('[data-tactical-attack="shoot"]');await expect(button).toBeVisible();await expect(button).toBeEnabled();await button.click();w=await wait(state=>pawn(state,GAEL).shooting?.order?.targetId===ENEMY);
  shotAcceptedAt??=w.tick;actions.push({kind:'manual-rifle-order-accepted',tick:w.tick,pawnId:GAEL,targetId:ENEMY,weaponId:RIFLE,geometry:evidence});return true;
 };
 const retreat=async(reason:string)=>{
  if(retreating)return;retreating=true;stage='gael-retreat';await pause(page);let w=await read();if(w.structures.find(s=>s.id===DOOR)?.door?.forbidden)await doorPermission(false);
  if(!inside(pawn(w,GAEL))||!stationary(w,pawn(w,GAEL)))await act({type:'draft-move',pawnIds:[GAEL],target:REFUGE.get(GAEL)!,queue:false},reason);
  await run(1);await wait(state=>ORIGINALS.every(id=>inside(pawn(state,id))&&stationary(state,pawn(state,id))));await pause(page);await read();stage='close-isolation';await doorPermission(true);await run(1);
  w=await wait(state=>{const door=state.structures.find(s=>s.id===DOOR)!;return door.door?.forbidden===true&&!door.door.open&&doorOpenness(door,state.tick)===0&&ORIGINALS.every(id=>inside(pawn(state,id))&&stationary(state,pawn(state,id)));});
  isolated=true;actions.push({kind:'actual-closed-isolation',tick:w.tick,doorId:DOOR,fraction:0,originals:ORIGINALS});
 };
 try{
  const file=info.outputPath('literal-input.json');await writeFile(file,raw);await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(file);await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90000});await expectWorld(page,initial);loaded=true;bodyStarted=Date.now();deadline=bodyStarted+seconds*1000;observeUntil=deadline-18000;
  await pause(page);stage='initial';await capture('initial',true);let w=await read();expect(canStandAt(w,POST)).toBe(true);expect(w.structures.find(s=>s.id===DOOR)?.door?.holdOpen).toBe(false);
  expect(w.structures.find(s=>s.id===18647)?.damage).toBe(18);
  for(const id of ORIGINALS)expect(pawn(w,id).draft).toBeDefined();
  expect(pawn(w,GAEL)).toMatchObject({x:126,z:115,draft:{holdFire:true},shooting:{order:{targetId:ENEMY,weaponId:RIFLE},stance:{phase:'cooldown',startedAtCore:744162,endsAtCore:744252}}});
  expect(stationary(w,pawn(w,GAEL))).toBe(true);expect([IRIS,LEONIE].every(id=>inside(pawn(w,id))&&stationary(w,pawn(w,id)))).toBe(true);civilSheltered=true;
  actions.push({kind:'inherited-post-order-cooldown-and-civilian-refuge-retained',tick:w.tick,post:POST,shooter:pawn(w,GAEL),wallDamage18Retained:true,qualification:'No repeated draft, relocation, fire-toggle or shooting command'});
  stage='defense-watch';await run(6);let currentSpeed:1|6=6,lastPlanTick=-1;
  while(Date.now()<observeUntil){w=await read();const enemy=w.pawns.find(p=>p.id===ENEMY),g=pawn(w,GAEL),distance=enemy?Math.hypot(enemy.x-g.x,enemy.z-g.z):Infinity;
   const disabled=!enemy||['dead','downed'].includes(enemy.state)||enemy.raid?.exiting||w.raids?.active?.phase==='withdraw'||!w.raids?.active;
   if(disabled&&!retreating){raidOutcome={tick:w.tick,target:enemy,raids:w.raids,qualification:enemy?.state==='downed'?'Raider downed, not healed or captured':enemy?.state==='dead'?'Raider dead; death conserved':'Actual withdrawal/absence observed'};await retreat('Replier le tireur après cessation physique de l’assaut');w=await read();}
   if(!disabled&&!retreating&&(distance<=16||enemy.melee?.order?.targetId===GAEL||enemy.melee?.strike)){actions.push({kind:'retreat-threshold-observed',tick:w.tick,distance,enemy});await retreat('Repli avant contact, sans attendre une blessure du défenseur');w=await read();}
   if(!retreating&&distance>16&&w.tick-lastPlanTick>=3){lastPlanTick=w.tick;const q=shootingQueries(w),plan=shotPlan(w,g,ENEMY,q),cover=enemy?shotCover(q.grid(),enemy,g):null;
    push(geometry,{kind:'actual-shot-readiness',tick:w.tick,from:{x:g.x,z:g.z},target:enemy?{x:enemy.x,z:enemy.z}:null,reason:'reason' in plan?plan.reason:undefined,line:'reason' in plan?undefined:plan.line,cover},192);
    if(!('reason' in plan)&&cover&&cover.blockChance>0&&g.shooting?.order?.targetId!==ENEMY){stage='manual-shot';await shootVisible();stage='defense-watch';await run(1);currentSpeed=1;}
   }
   w=await read();const target=w.pawns.find(p=>p.id===ENEMY),active=w.raids?.active;
   const attack=pawn(w,GAEL).lastAttack;if(attack?.targetId===ENEMY&&attack.atCore>initial.tick*10&&emissionObservedAt===undefined){emissionObservedAt=w.tick;combatTrace.push({kind:'new-emission-from-retained-mandate',observedTick:w.tick,atCore:attack.atCore,stance:pawn(w,GAEL).shooting?.stance,projectiles:w.projectiles?.filter(p=>p.flight.launcherKey==='pawn:18532'&&p.emittedAtCore>initial.tick*10),qualification:'New attack clock observed, not a new UI order or inferred hit'});}
   if(isolated&&!active&&w.raids?.last?.id===2&&ORIGINALS.every(id=>inside(pawn(w,id))&&stationary(w,pawn(w,id)))){stop='raid-cleared-observed';raidOutcome={tick:w.tick,last:w.raids.last,target,limits:'Observed raid outcome, no recovery/campaign guarantee'};break;}
   if(isolated&&shotAcceptedAt===undefined&&emissionObservedAt===undefined){stop='refuge-without-new-shot-line';raidOutcome={tick:w.tick,target,raids:w.raids,limits:'Protected retreat observed; no new rifle emission/raid victory qualified'};break;}
   const near=!!target&&Math.hypot(target.x-pawn(w,GAEL).x,target.z-pawn(w,GAEL).z)<=42||retreating&&!isolated,next:1|6=near?1:6;if(next!==currentSpeed){await run(next);currentSpeed=next;}await page.waitForTimeout(100);
  }
  if(stop==='not-started')stop='segment-bound';
 }catch(e){failure=e instanceof Stop?{reason:e.reason,detail:e.detail}:e;stop=e instanceof Stop?e.reason:'technical-or-oracle-error';}
 finally{
  finalizing=true;if(loaded&&!page.isClosed()&&checkpoints.length<2)try{stage=failure?'conservation':'issue';await capture(stage,!failure,!!failure);}catch(e){exportFailure=String(e);}
  if(last){const validation=validateWorld(last);if(!validation.length){const text=serializeWorld(last),path=info.outputPath('last-adopted.json');await writeFile(path,text);fallback={path,tick:last.tick,sha256:hash(text),provenance:'Last adopted read, not UI export'};}else fallback={validation:validation.slice(0,12),count:validation.length};}
  const ledger={kind:'explicit-raid-defense-continuation',inputSha:INPUT_SHA,parentLedgerSha:PARENT_SHA,newMandate:true,priorV362ResumeStillForbidden:true,priorDefenseResumeStillForbidden:true,segment,checkpoint:checkpoints.at(-1),resumeAllowed:false,stop,actions,raidOutcome,shotAcceptedAt,emissionObservedAt,structuralDamage};const ledgerPath=info.outputPath('ledger.json'),text=JSON.stringify(ledger,null,2);await writeFile(ledgerPath,text);
  const report=info.outputPath('raid-defense-summary.json');await writeFile(report,JSON.stringify({segment,inputPath:INPUT,inputSha:INPUT_SHA,parentLedgerSha:PARENT_SHA,inputSchema:JSON.parse(raw).schemaVersion,adoptedSchema:initial.schemaVersion,channel:'chrome',backend,bodyMs:Date.now()-bodyStarted,overallMs:Date.now()-started,stop,failure:failure instanceof Error?{message:failure.message,stack:failure.stack}:failure,exportFailure,post:POST,retreatDistance:16,civilSheltered,retreating,isolated,shotAcceptedAt,emissionObservedAt,structuralDamage,raidOutcome,raidCleared:stop==='raid-cleared-observed'&&!failure&&!exportFailure,campaignQualified:false,allVisitorsSaved:false,ammunitionCounterInvented:false,combatTrace,geometry,actions,checkpoints,ledger:{path:ledgerPath,sha256:hash(text)},errors,lifecycle,journal,ring,fallback,last:last?sample(last):null},null,2));await info.attach('raid defense summary',{contentType:'application/json',path:report});page.off('crash',crash);page.off('close',closed);browser?.off('disconnected',disconnected);
 }
 if(failure)throw failure instanceof Error?failure:new Error(JSON.stringify(failure));expect(exportFailure).toBeUndefined();expect(stop,'A bounded protection attempt is partial, not a cleared raid').toBe('raid-cleared-observed');expect(checkpoints.at(-1)?.reloaded).toBe(true);
}
