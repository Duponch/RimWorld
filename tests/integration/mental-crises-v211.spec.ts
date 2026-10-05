import { expect, test, type Page } from '@playwright/test';
import { hostileTo } from '../../src/sim/affiliation.ts';
import { mentalCrisisLabel } from '../../src/sim/mental-catalog.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../../src/sim/serialization.ts';
import { structureMaxHp } from '../../src/sim/thing-damage-rules.ts';
import type { Pawn, World } from '../../src/sim/types.ts';
import { mentalCrisesNativeFixture, type AggressiveCrisisKind } from '../helpers/mental-crises-v211.ts';
import { testOutputPath, writeTestFileSync } from '../test-output.ts';
import { cell, expectWorld, observeErrors, panel, pause, pawnTab, saveKey, settledCells, world } from './helpers.ts';
import { inspectPerson, perform, revealCells } from './player-actions.ts';

// Certified by the real helper/stepWorld producer. No episode or damage exists
// in these initial saves; the browser orders and observes the unfinished job.
const cases:readonly {kind:AggressiveCrisisKind;rng:number}[]=[
  {kind:'tantrum',rng:1},{kind:'berserk',rng:1},{kind:'murderous-rage',rng:50},
];
const person=(w:World,id:number):Pawn=>{const p=w.pawns.find(p=>p.id===id);if(!p)throw new Error(`Missing actor ${id}.`);return p;};
const injuryCount=(p:Pawn):number=>(p.health?.injuries.length??0)+(p.health?.missing.length??0);

async function saveAndReload(page:Page,expected:World):Promise<void> {
  await pause(page);await panel(page,'menu');await page.locator('#save').click();
  await expect.poll(()=>page.evaluate(key=>{
    const raw=window.__lisiere.saveRepository.peekItem(key);return raw?JSON.parse(raw).tick:null;
  },saveKey)).toBe(expected.tick);
  const saved=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);
  expect(saved).not.toBeNull();expect(deserializeWorld(saved!)).toEqual(expected);
  await page.locator('#load').click();await expectWorld(page,expected);await page.keyboard.press('Escape');
}

async function gpuEvidence(page:Page) {
  expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
  const hardware=await page.evaluate(async()=>{
    try {
      const adapter=await navigator.gpu?.requestAdapter(),info=adapter?.info;
      return {adapterAvailable:!!adapter,vendor:info?.vendor??null,architecture:info?.architecture??null,
        device:info?.device??null,description:info?.description??null,
        isFallbackAdapter:(info as unknown as {isFallbackAdapter?:boolean}|undefined)?.isFallbackAdapter
          ??(adapter as unknown as {isFallbackAdapter?:boolean}|null)?.isFallbackAdapter??null,error:null};
    }catch(error){return {adapterAvailable:false,vendor:null,architecture:null,device:null,description:null,
      isFallbackAdapter:null,error:String(error)};}
  });
  expect(hardware.isFallbackAdapter).not.toBe(true);
  expect(JSON.stringify(hardware)).not.toMatch(/swiftshader|llvmpipe|lavapipe|software adapter|basic render driver/i);
  const limit=!hardware.adapterAvailable?'Adaptateur de diagnostic indisponible ; seul le backend WebGPU de Lisière est confirmé.'
    :hardware.isFallbackAdapter===null?'Indicateur de repli indisponible ; identité relevée, absence de repli non certifiée par ce signal.':null;
  return {backend:'WebGPU',hardware,limit};
}

async function crisisInspection(page:Page,id:number,kind:AggressiveCrisisKind):Promise<void> {
  const label=mentalCrisisLabel(kind);await inspectPerson(page,id,'bio');
  await expect(page.locator('[data-bio-name]')).toHaveText('<b>Colère</b> & retour');
  await expect(page.locator('[data-bio-name] b')).toHaveCount(0);
  await expect(page.locator(`[data-pawn="${id}"]`)).toHaveAttribute('data-mental-crisis',kind);
  await expect(page.locator(`[data-pawn="${id}"] .pawn-symbol`)).toHaveAttribute('aria-label',new RegExp(label));
  await expect(page.locator('#alerts')).toContainText(label);
  await expect(page.locator('#toggle-draft')).toBeDisabled();
  await pawnTab(page,'needs');await expect(page.locator('#mood-target')).toContainText(label);
  const crisis=page.locator('#mood-crisis');await expect(crisis).toBeVisible();await expect(crisis).toContainText('Refuse les ordres');
  await crisis.focus();await expect(page.locator('#game-tooltip')).toContainText(label);await page.keyboard.press('Escape');
  await pawnTab(page,'journal');const row=page.locator('#pawn-journal-rows [data-kind="mental"]').first();
  await expect(row).toContainText('<b>Colère</b> & retour');await expect(row).toContainText(label.toLowerCase());await expect(row.locator('b')).toHaveCount(0);
  const filter=page.locator('[data-journal-filter="mental"]');await filter.focus();await page.keyboard.press('Enter');
  await expect(filter).toHaveAttribute('aria-checked','false');await expect(row).toBeHidden();
  await page.keyboard.press('Enter');await expect(filter).toHaveAttribute('aria-checked','true');await expect(row).toBeVisible();
  await row.focus();await expect(page.locator('#game-tooltip')).toContainText('<b>Colère</b> & retour');await page.keyboard.press('Escape');
}

/** Friendly Murder never supplies an ordinary hostile context attack. This is
 * the explicit player targeting control, using a real body hit-test and click. */
async function directedDefense(page:Page,defenderId:number,aggressorId:number):Promise<void> {
  await perform(page,{reason:'Défense volontaire précise contre le colon en colère meurtrière.',
    command:{type:'draft',pawnIds:[defenderId],enabled:true}},{value:0});
  const target=person(await world(page),aggressorId);await revealCells(page,[target]);
  const button=page.locator('#target-melee');await button.focus();await page.keyboard.press('Enter');
  await expect(button).toHaveAttribute('aria-pressed','true');
  const point=await page.evaluate(id=>window.__lisiere.projectPawn(id),aggressorId);expect(point).toBeDefined();
  expect(await page.evaluate(p=>document.elementFromPoint(p!.x,p!.y)?.tagName,point)).toBe('CANVAS');
  await page.mouse.click(point!.x,point!.y);
  await expect.poll(async()=>person(await world(page),defenderId).melee?.order?.targetId).toBe(aggressorId);
}

for(const {kind,rng} of cases)test(`V211 native ${kind}: mood entry, physical interruption, consequence, saved continuation and real end`,async({playwright})=>{
  test.setTimeout(180_000);
  const fixture=mentalCrisesNativeFixture(kind,rng),initial=fixture.world,label=mentalCrisisLabel(kind);
  expect(validateWorld(initial)).toEqual([]);expect(initial.pawns.every(p=>!p.mental?.crisis&&!injuryCount(p))).toBe(true);
  expect(initial.structures.every(s=>!s.damage)).toBe(true);
  const proof:Record<string,unknown>={kind,rng,prepared:{tick:initial.tick,mood:person(initial,fixture.aggressorId).mood,
    exposure:person(initial,fixture.aggressorId).mental?.below,positions:initial.pawns.map(p=>({id:p.id,x:p.x,z:p.z})),
    buildings:initial.structures.map(s=>({id:s.id,kind:s.kind,x:s.x,z:s.z,damage:s.damage??0})),
    unfinishedJobId:fixture.jobId,defenderMelee:person(initial,fixture.defenderId).skills.melee.level,
    notice:'Humeur, compteurs, objets intacts et compétence du défenseur préparés ; aucun épisode, coup, dégât, défense ou catharsis préjoué.'},stage:'load',complete:false};
  const browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  page.setDefaultTimeout(15_000);
  try {
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    proof.gpu=await gpuEvidence(page);

    proof.stage='engage work';await perform(page,{reason:'Engager réellement le travail avant le contrôle de l’exposition.',
      command:{type:'order-job',pawnId:fixture.aggressorId,jobId:fixture.jobId,queue:false}},{value:0});
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(({id,jobId})=>{
      const w=window.__lisiere.world,p=w.pawns.find(p=>p.id===id),job=w.jobs.find(j=>j.id===jobId);
      return !!p&&!!job&&!p.mental?.crisis&&p.jobId===jobId&&job.reservedBy===id&&!!p.motion&&p.motion.end>w.tick;
    },{id:fixture.aggressorId,jobId:fixture.jobId},{timeout:15_000});
    await pause(page);const engaged=await world(page),worker=person(engaged,fixture.aggressorId);
    expect(worker.mental?.crisis).toBeUndefined();expect(worker.orders.active).toBe(fixture.jobId);
    expect(engaged.jobs.find(j=>j.id===fixture.jobId)!.reservedBy).toBe(worker.id);expect(validateWorld(engaged)).toEqual([]);
    proof.engaged={tick:engaged.tick,jobId:worker.jobId,order:worker.orders.active,motion:worker.motion,
      progress:engaged.jobs.find(j=>j.id===fixture.jobId)!.progress};

    proof.stage='mood entry';await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(({id,kind})=>window.__lisiere.world.pawns.find(p=>p.id===id)?.mental?.crisis?.kind===kind,
      {id:fixture.aggressorId,kind},{timeout:15_000});
    await pause(page);const entered=await world(page),actor=person(entered,fixture.aggressorId),job=entered.jobs.find(j=>j.id===fixture.jobId)!;
    expect(actor.mental?.crisis?.kind).toBe(kind);expect(actor.jobId).toBeNull();expect(actor.orders).toEqual({active:null,queue:[]});expect(job.reservedBy).toBeNull();
    const entryEvent=entered.events.findLast(e=>e.message.includes(actor.name)&&e.message.toLowerCase().includes(label.toLowerCase()));
    expect(entryEvent).toBeDefined();
    expect(entered.resources).toEqual(initial.resources);expect(validateWorld(entered)).toEqual([]);
    if(worker.motion&&worker.motion.end>entered.tick)expect(actor.motion).toEqual(worker.motion);
    proof.entry={tick:entered.tick,eventTick:entryEvent!.tick,crisis:actor.mental!.crisis,jobProgress:job.progress,motion:actor.motion,
      capturedWorkEdgeStillActive:!!worker.motion&&worker.motion.end>entered.tick};
    await crisisInspection(page,fixture.aggressorId,kind);
    await page.keyboard.press('r');await expectWorld(page,entered);
    await inspectPerson(page,fixture.aggressorId);await revealCells(page,[job]);
    const [point]=await settledCells(page,[job]),bounds=(await page.locator('#viewport canvas').boundingBox())!;
    await page.mouse.click(bounds.x+point!.x,bounds.y+point!.y,{button:'right'});
    // The crisis provider returns its explicit refusal option, jobId0, rather
    // than pretending that the old civilian job is still an executable choice.
    const refused=page.locator('[data-order-job="0"]:not([data-order-haul])');
    await expect(refused).toBeDisabled();await expect(refused).toContainText(label);await page.keyboard.press('Escape');await expectWorld(page,entered);
    proof.refusedOrder=true;

    proof.stage='approach';await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id=>{
      const w=window.__lisiere.world,p=w.pawns.find(p=>p.id===id),c=p?.mental?.crisis;
      return !!c&&'targetId' in c&&c.targetId!==null&&p?.melee?.order?.auto==='mental'&&!!p.motion&&p.motion.end>w.tick;
    },fixture.aggressorId,{timeout:20_000});
    await pause(page);const approaching=await world(page),pursuer=person(approaching,fixture.aggressorId),crisis=pursuer.mental!.crisis!;
    if(!('targetId' in crisis)||crisis.targetId===null)throw new Error('Missing primary crisis target during actual approach.');
    const primaryTarget=crisis.targetId;expect(pursuer.melee?.order?.targetId).toBe(primaryTarget);expect(validateWorld(approaching)).toEqual([]);
    if(kind==='murderous-rage')expect(primaryTarget).toBe(fixture.victimId);
    await inspectPerson(page,fixture.aggressorId,'needs');await expect(page.locator('#mood-crisis')).toContainText('Cible :');
    if(kind!=='tantrum')await expect(page.locator('#mood-crisis')).toContainText(person(approaching,primaryTarget).name);
    proof.approach={tick:approaching.tick,primaryTarget,crisis,position:{x:pursuer.x,z:pursuer.z},motion:pursuer.motion};
    await page.setViewportSize({width:1280,height:720});
    const compact=await page.locator('[data-speed]').evaluateAll(buttons=>buttons.map(button=>{
      const r=button.getBoundingClientRect();return {speed:button.getAttribute('data-speed'),visible:r.width>0&&r.height>0,
        hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('[data-speed]')===button};
    }));
    expect(compact.length).toBeGreaterThanOrEqual(4);expect(compact.every(b=>b.visible&&b.hit)).toBe(true);
    proof.compactViewport={width:1280,height:720,speeds:compact};await page.setViewportSize({width:1440,height:1000});
    await page.screenshot({path:testOutputPath(`artifacts/mental-crises-v211-${kind}-approach.png`)});

    proof.stage='actual consequence';await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(({id,kind})=>{
      const w=window.__lisiere.world,p=w.pawns.find(p=>p.id===id),strike=p?.melee?.strike;if(!strike||strike.outcome!=='hit')return false;
      return kind==='tantrum'?!!strike.structure&&w.structures.some(s=>s.id===strike.targetId&&(s.damage??0)>0)
        :w.pawns.some(t=>t.id===strike.targetId&&(!!t.health?.injuries.length||!!t.health?.missing.length));
    },{id:fixture.aggressorId,kind},{timeout:25_000});
    await pause(page);const consequence=await world(page),attacker=person(consequence,fixture.aggressorId),strike=attacker.melee!.strike!;
    expect(strike.outcome).toBe('hit');expect((attacker.motion?.end??0)*10).toBeLessThanOrEqual(strike.atCore);
    expect(consequence.jobs.find(j=>j.id===fixture.jobId)!.progress).toBe(job.progress);
    expect(attacker.skills.plants).toEqual(actor.skills.plants);expect(consequence.resources).toEqual(initial.resources);expect(validateWorld(consequence)).toEqual([]);
    if(kind==='tantrum'){
      const damaged=consequence.structures.find(s=>s.id===strike.targetId)!;expect(damaged.damage).toBeGreaterThan(0);
      expect(Math.max(Math.abs(attacker.x-strike.structure!.x),Math.abs(attacker.z-strike.structure!.z))).toBeLessThanOrEqual(1);
      await page.keyboard.press('Escape');await revealCells(page,[damaged]);await cell(page,damaged.x,damaged.z);
      await expect(page.locator('.cell-health-caption strong')).toContainText(`${structureMaxHp(damaged)-damaged.damage!}/${structureMaxHp(damaged)} PV`);
      proof.consequence={tick:consequence.tick,strike,building:{id:damaged.id,damage:damaged.damage,maximumHp:structureMaxHp(damaged)}};
    }else{
      const victim=person(consequence,strike.targetId);expect(injuryCount(victim)).toBeGreaterThan(0);
      expect(Math.max(Math.abs(attacker.x-victim.x),Math.abs(attacker.z-victim.z))).toBeLessThanOrEqual(1);
      await inspectPerson(page,victim.id,'health');await expect(page.locator('[data-health="injuries"]')).not.toBeEmpty();
      proof.consequence={tick:consequence.tick,strike,victimId:victim.id,health:victim.health};
    }
    await page.screenshot({path:testOutputPath(`artifacts/mental-crises-v211-${kind}-consequence.png`)});
    proof.stage='save/reload consequence';await saveAndReload(page,consequence);proof.saved={tick:consequence.tick,exact:true,rng:consequence.rng};

    if(kind!=='tantrum'){
      const defender=person(consequence,fixture.defenderId);expect(defender.melee).toBeUndefined();expect(defender.draft).toBeUndefined();
      proof.stage='player defense';
      if(kind==='berserk'){
        expect(hostileTo(attacker,defender)).toBe(true);await inspectPerson(page,defender.id);
        await page.locator('#inspector-hostility').selectOption('attack');
        await expect.poll(async()=>person(await world(page),defender.id).hostilityResponse).toBe('attack');
        proof.defenseMode='Réaction Attaquer réglée par UI face à l’hostilité temporaire Berserk.';
      }else{
        expect(hostileTo(attacker,defender)).toBe(false);await directedDefense(page,defender.id,attacker.id);
        proof.defenseMode='Témoin initialement neutre ; mobilisation et mêlée dirigée précises par UI.';
      }
      // Observe the defender's first contact at1× before accelerating its end.
      await page.locator('[data-speed="1"]').click();
      await page.waitForFunction(({id,targetId})=>{
        const w=window.__lisiere.world,p=w.pawns.find(p=>p.id===id),target=w.pawns.find(p=>p.id===targetId),s=p?.melee?.strike;
        return s?.targetId===targetId&&s.outcome==='hit'&&(!!target?.health?.injuries.length||!!target?.health?.missing.length);
      },{id:defender.id,targetId:attacker.id},{timeout:30_000});
      await pause(page);const defended=await world(page),guard=person(defended,defender.id),injured=person(defended,attacker.id);
      expect(injuryCount(injured)).toBeGreaterThan(0);expect(validateWorld(defended)).toEqual([]);
      proof.defense={tick:defended.tick,strike:guard.melee?.strike,aggressorHealth:injured.health,aggressorState:injured.state};
    }

    proof.stage='real end';
    const endStartTick=(await world(page)).tick,endStartedAt=performance.now(),endTimeoutMs=kind==='tantrum'?120_000:45_000;
    const endSpeed=page.locator('[data-speed="6"]');await endSpeed.click();
    await expect(endSpeed).toHaveAttribute('aria-pressed','true');
    const activeSpeed=await page.locator('[data-speed][aria-pressed="true"]').getAttribute('data-speed');
    const endWait={requestedSpeed:6,activeSpeed,startTick:endStartTick,timeoutMs:endTimeoutMs,
      limit:'Parcours préparé : vitesse demandée et adoptée, débit réellement observé ; aucun benchmark général.'};
    proof.endWait=endWait;
    try {
      await page.waitForFunction(id=>{
        const live=window.__lisiere;
        return live.incident.simulationStopped||live.incident.graphicsFault||!live.world.pawns.find(p=>p.id===id)?.mental?.crisis;
      },fixture.aggressorId,{timeout:endTimeoutMs,polling:100});
      const stop=await page.evaluate(()=>({incident:{...window.__lisiere.incident},notice:document.querySelector('#notice')?.textContent??null}));
      proof.endIncident=stop;
      expect(stop.incident.simulationStopped,`Simulation arrêtée pendant la fin réelle : ${JSON.stringify(stop)}`).toBe(false);
      expect(stop.incident.graphicsFault,`Incident graphique pendant la fin réelle : ${JSON.stringify(stop)}`).toBe(false);
    } finally {
      const observedTick=(await world(page)).tick;
      proof.endWait={...endWait,observedTick,ticksElapsed:observedTick-endStartTick,
        wallMs:performance.now()-endStartedAt};
    }
    await pause(page);const ended=await world(page),recovered=person(ended,fixture.aggressorId);
    expect(recovered.mental?.crisis).toBeUndefined();expect(recovered.melee?.order?.auto).not.toBe('mental');expect(validateWorld(ended)).toEqual([]);
    const victim=kind==='murderous-rage'?person(ended,fixture.victimId):undefined;
    const ending=kind==='tantrum'?'durée naturelle':recovered.state==='dead'?'décès de l’agresseur'
      :recovered.state==='downed'?'incapacité physique de l’agresseur':recovered.state==='sleeping'?'sommeil réel'
        :victim?.state==='dead'?'décès de la cible meurtrière':'autre fin';
    if(kind==='tantrum')expect(ended.tick-entryEvent!.tick).toBeGreaterThanOrEqual(800);
    else expect(ending).not.toBe('autre fin');
    if(recovered.state==='dead')expect(recovered.mental!.catharsis).toEqual([]);
    else expect(recovered.mental!.catharsis.some(t=>t>ended.tick)).toBe(true);
    await inspectPerson(page,recovered.id,'needs');await expect(page.locator('#mood-crisis')).toBeHidden();
    if(recovered.state!=='dead')await expect(page.locator('[data-thought="catharsis"]')).toContainText('+40');
    if(kind==='tantrum'){
      await expect(page.locator('#toggle-draft')).toBeEnabled();await page.keyboard.press('r');
      await expect.poll(async()=>!!person(await world(page),recovered.id).draft).toBe(true);
      await page.keyboard.press('r');await expect.poll(async()=>!!person(await world(page),recovered.id).draft).toBe(false);
      proof.controlRestored=true;
    }else if(recovered.state==='downed'||recovered.state==='dead')await expect(page.locator('#toggle-draft')).toBeDisabled();
    proof.end={tick:ended.tick,ending,aggressorState:recovered.state,targetState:victim?.state,catharsis:recovered.mental!.catharsis,
      cooldown:recovered.mental!.cooldown,notice:'Un refus résiduel de mobilisation d’un blessé à terre vient de sa santé.'};
    await page.screenshot({path:testOutputPath(`artifacts/mental-crises-v211-${kind}-end.png`)});
    const final=await world(page);proof.stage='save/reload end';await saveAndReload(page,final);
    expect(errors).toEqual([]);proof.complete=true;proof.stage='complete';
  }finally{
    proof.errors=errors;
    try {
      const {worldJSON,...diagnostic}=await page.evaluate(()=>({incident:{...window.__lisiere.incident},
        notice:document.querySelector('#notice')?.textContent??null,backend:window.__lisiere.backend,
        activeSpeeds:[...document.querySelectorAll('[data-speed][aria-pressed="true"]')].map(button=>button.getAttribute('data-speed')),
        worldJSON:JSON.stringify(window.__lisiere.world)}));
      proof.lastDiagnostic=diagnostic;
      if(!proof.complete){
        const last=JSON.parse(worldJSON) as World;
        proof.lastObserved={tick:last.tick,pawns:last.pawns.map(p=>({id:p.id,state:p.state,mental:p.mental,melee:p.melee,health:p.health}))};
        const checkpointFile=`artifacts/mental-crises-v211-${kind}-failure-world.json`;
        // Preserve even a stopped/partial World verbatim; the save validator
        // must not prevent capture of the state that explains the failure.
        writeTestFileSync(checkpointFile,worldJSON+'\n');proof.failureCheckpoint=checkpointFile;
      }
    }catch(error){proof.lastObservationError=String(error);}
    writeTestFileSync(`artifacts/mental-crises-v211-${kind}-native.json`,JSON.stringify({date:new Date().toISOString(),...proof},null,2)+'\n');
    await browser.close();
  }
});
