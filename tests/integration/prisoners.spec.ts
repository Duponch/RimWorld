import { expect,test,type Page } from '@playwright/test';
import { readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { prisonerUiFixture,recruitmentUiFixture } from '../scenarios/prison-camp';
import { deserializeWorld,serializeWorld,validateWorld } from '../../src/sim/serialization';
import { isColonist } from '../../src/sim/affiliation';
import { medicalCare } from '../../src/sim/medicine-rules';
import { observeErrors,panel,pause,saveKey,world,expectWorld } from './helpers';
import { inspectPerson,perform } from './player-actions';
import type { Command,World } from '../../src/sim/types';

async function load(page:Page,state:World,raw=serializeWorld(state)):Promise<void> {
  await pause(page);
  await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:raw});
  await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,state);await page.keyboard.press('Escape');
}
async function roundTrip(page:Page):Promise<World> {
  await pause(page);const state=await world(page);expect(validateWorld(state)).toEqual([]);
  await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,state);await page.keyboard.press('Escape');return state;
}
const medicineUnits=(w:World)=>w.piles.filter(p=>p.kind==='medicine').reduce((sum,p)=>sum+p.quantity,0);

// Two explicit clinical/boundary checkpoints. The long pilot starts healthy and
// proves natural capture/recruitment separately; no raid or week is invented here.
test('native captivity: physical capture, care, policies, conversations and recruitment survive reload',async({playwright})=>{
  test.setTimeout(300000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  page.setDefaultTimeout(15000);
  const report:Record<string,unknown>={version:86,controlledCheckpoints:['temporary blood loss and bruise; enclosed room and physical supplies','healthy captive with resistance .01; no natural persuasion duration claimed']};
  try {
    const initial=prisonerUiFixture(),{actorId,patientId,bedId}=initial;
    expect(validateWorld(initial.world)).toEqual([]);
    expect(initial.world.pawns.find(p=>p.id===patientId)!.state).toBe('downed');
    expect(initial.world.pawns.find(p=>p.id===patientId)!.prisoner).toBeUndefined();
    expect(initial.world.structures.find(s=>s.id===bedId)!.prisoner).toBeUndefined();
    await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await load(page,initial.world);
    const rotation={value:0},act=(command:Command,reason:string)=>perform(page,{command,reason},rotation);
    await act({type:'prison-bed',bedId,enabled:true},'Affecter le lit de la cellule à la captivité.');
    await expect(page.locator('#bed-owner')).toBeHidden();await expect(page.locator('#bed-prisoner-description')).toContainText('Réservé aux captifs');
    await act({type:'medical-bed',bedId,enabled:true},'Le lit de prison peut aussi recevoir un patient.');
    await act({type:'order-capture',pawnId:actorId,patientId,queue:false},'Capturer par le menu contextuel ; aucun statut avant l’arrivée.');
    await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();
    await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===actorId)?.rescue?.phase,{timeout:30000}).toBe('carry');await pause(page);
    const carried=await world(page),carrier=carried.pawns.find(p=>p.id===actorId)!,patient=carried.pawns.find(p=>p.id===patientId)!;
    expect(carrier.rescue?.capture).toBe(true);expect(patient.prisoner).toBeUndefined();expect({x:patient.x,z:patient.z}).toEqual({x:carrier.x,z:carrier.z});
    await page.screenshot({path:'artifacts/prison-carry-v86.png'});await roundTrip(page);
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>!!(await world(page)).pawns.find(p=>p.id===patientId)?.prisoner,{timeout:30000}).toBe(true);await pause(page);
    const captured=await world(page),captive=captured.pawns.find(p=>p.id===patientId)!;
    expect(captive.bedId).toBeNull();expect(captive.need?.kind).toBe('sleep');if(captive.need?.kind==='sleep')expect(captive.need.bedId).toBe(bedId);expect(captive.prisoner!.mode).toBe('maintain');expect(captive.prisoner!.initialResistance).toBeGreaterThanOrEqual(7);
    expect(captured.pawns.filter(isColonist)).toHaveLength(2);expect(captured.pawns).toHaveLength(initial.world.pawns.length);
    await inspectPerson(page,patientId);await expect(page.locator('#prisoner-resistance')).toContainText(captive.prisoner!.resistance.toFixed(1));
    await expect(page.locator('#toggle-draft')).toHaveCount(0);await expect(page.locator('#self-tend-policy')).toHaveCount(0);await expect(page.locator('#selected-action')).not.toContainText('Hors-la-loi');
    const beforeR=await world(page);await page.keyboard.press('r');await expectWorld(page,beforeR);
    await act({type:'food-policy-assign',pawnId:patientId,policyId:2},'Affecter un régime partagé au captif.');
    await panel(page,'assign');await page.locator('#manage-food-policies').click();await page.locator('#food-policy-choice').selectOption('2');
    await expect(page.locator('#food-policy-users')).toContainText(`${captive.name} (prisonnier)`);await page.locator('#delete-food-policy').click();await expect(page.locator('#food-policy-feedback')).toContainText('utilisé');expect((await world(page)).foodPolicies.some(policy=>policy.id===2)).toBe(true);await page.locator('#close-food-policies').click();
    await inspectPerson(page,patientId);await page.locator('#medical-policy').selectOption('dry');
    await expect.poll(async()=>medicalCare((await world(page)).pawns.find(p=>p.id===patientId)!)).toBe('dry');
    await page.locator('#medical-policy').selectOption('industrial');await expect.poll(async()=>medicalCare((await world(page)).pawns.find(p=>p.id===patientId)!)).toBe('industrial');
    await act({type:'priority',pawnId:actorId,work:'warden',value:1},'Activer Geôlier dans le tableau Travail.');
    await expect(page.locator(`select[data-owner="${actorId}"][data-work="warden"]`)).toHaveAccessibleName(/Priorité Geôlier/);
    await act({type:'priority',pawnId:2,work:'doctor',value:1},'Le médecin soigne indépendamment des conversations.');
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>medicineUnits(await world(page)),{timeout:45000}).toBeLessThan(medicineUnits(captured));
    await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===patientId)!.hunger,{timeout:45000}).toBeGreaterThan(50);await pause(page);
    const cared=await world(page);expect(validateWorld(cared)).toEqual([]);expect(cared.pawns.find(p=>p.id===patientId)!.prisoner!.resistance).toBe(captive.prisoner!.resistance);
    await inspectPerson(page,patientId);await page.screenshot({path:'artifacts/prison-care-v86.png'});await roundTrip(page);
    report.capture={started:initial.world.tick,carrying:carried.tick,captured:captured.tick,cared:cared.tick,patientId,bedId,resistance:captive.prisoner!.resistance,medicineBefore:medicineUnits(captured),medicineAfter:medicineUnits(cared),hungerAfter:cared.pawns.find(p=>p.id===patientId)!.hunger};

    const boundary=recruitmentUiFixture();expect(validateWorld(boundary.world)).toEqual([]);await load(page,boundary.world);
    await act({type:'prisoner-mode',patientId:boundary.patientId,mode:'reduce'},'Épuiser la dernière résistance sans recruter.');
    await act({type:'priority',pawnId:boundary.actorId,work:'warden',value:1},'Confier les entretiens au geôlier.');
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>{const t=(await world(page)).pawns.find(p=>p.id===boundary.actorId)?.ward;return t?.kind==='chat'&&t.phase==='rapport';},{timeout:20000}).toBe(true);await pause(page);
    const conversation=await roundTrip(page);expect(conversation.pawns.find(p=>p.id===boundary.actorId)?.ward?.kind).toBe('chat');
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===boundary.patientId)!.prisoner?.resistance,{timeout:20000}).toBe(0);await pause(page);
    const reduced=await world(page);expect(reduced.pawns.filter(isColonist)).toHaveLength(2);expect(reduced.pawns.find(p=>p.id===boundary.patientId)!.prisoner?.mode).toBe('reduce');
    await act({type:'prisoner-mode',patientId:boundary.patientId,mode:'recruit'},'À zéro résistance, un nouvel entretien permet l’adhésion.');
    await page.screenshot({path:'artifacts/prison-resistance-v86.png'});
    // Keep this identity selected across the worker’s faction transition.
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>isColonist((await world(page)).pawns.find(p=>p.id===boundary.patientId)!),{timeout:60000}).toBe(true);await pause(page);
    await expect(page.locator('#prisoner-inspection')).toHaveCount(0);await expect(page.locator('#toggle-draft')).toBeVisible();
    await expect(page.locator(`#colonists [data-pawn="${boundary.patientId}"]`)).toBeVisible();
    const recruited=await world(page),newColonist=recruited.pawns.find(p=>p.id===boundary.patientId)!;
    expect(recruited.pawns.filter(isColonist)).toHaveLength(3);expect(recruited.pawns).toHaveLength(boundary.world.pawns.length);expect(newColonist.prisoner).toBeUndefined();expect(newColonist.recruitment?.fromFaction).toBe('outlaws');expect(validateWorld(recruited)).toEqual([]);
    await page.screenshot({path:'artifacts/prison-recruited-v86.png'});
    await act({type:'prison-bed',bedId:boundary.bedId,enabled:false},'Rendre le lit à la colonie après le recrutement.');
    await page.locator('#bed-owner').selectOption(String(boundary.patientId));await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===boundary.patientId)!.bedId).toBe(boundary.bedId);
    await panel(page,'work');await expect(page.locator(`select[data-owner="${boundary.patientId}"][data-work="warden"]`)).toBeVisible();
    await roundTrip(page);await inspectPerson(page,boundary.patientId);await page.setViewportSize({width:1024,height:768});await expect(page.locator('#fps-counter')).toBeVisible();await expect(page.locator('#toggle-draft')).toBeVisible();await page.screenshot({path:'artifacts/prison-recruited-small-v86.png'});await page.setViewportSize({width:1440,height:1000});
    report.recruitment={prepared:boundary.world.tick,conversation:conversation.tick,reduced:reduced.tick,recruited:recruited.tick,identity:boundary.patientId,provenance:newColonist.recruitment};

    // An actual published V85 checkpoint, not a current save with its version relabelled.
    const historicalPath='artifacts/cold-store-checkpoint-v85.json',historicalText=readFileSync(historicalPath,'utf8'),historical=JSON.parse(historicalText) as World;
    expect(historical.schemaVersion).toBe(85);const migrated=deserializeWorld(historicalText);await load(page,migrated,historicalText);
    expect((await world(page)).pawns.every(p=>!p.prisoner&&!p.recruitment&&!p.ward)).toBe(true);expect((await world(page)).structures.every(s=>!s.prisoner)).toBe(true);
    expect(migrated.pawns.map(p=>p.id)).toEqual(historical.pawns.map(p=>p.id));expect(migrated.piles).toEqual(historical.piles);
    report.historical={source:historicalPath,sha256:createHash('sha256').update(historicalText).digest('hex'),from:85,to:migrated.schemaVersion,tick:migrated.tick};
    await panel(page,'menu');
    const invalid=JSON.stringify({...migrated,schemaVersion:migrated.schemaVersion+1});
    await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:invalid});await page.locator('#load').click();
    await expect(page.locator('#notice')).toContainText(/version|schéma|incompatible|invalide|valide/i);await expectWorld(page,migrated);
    expect(await page.evaluate(key=>localStorage.getItem(key),saveKey)).toBe(invalid);
    expect(errors).toEqual([]);report.errors=errors;writeFileSync('artifacts/prison-native-v86.json',JSON.stringify(report,null,2));
  } catch(error) {
    const tag=`prison-native-failed-v86-${Date.now()}`;await page.screenshot({path:`artifacts/${tag}.png`}).catch(()=>{});
    const state=await world(page).catch(()=>undefined);if(state)writeFileSync(`tmp/${tag}-checkpoint.json`,JSON.stringify(state));
    const notice=await page.locator('#notice').textContent().catch(()=>null);
    writeFileSync(`artifacts/${tag}.json`,JSON.stringify({...report,failure:String(error),notice,tick:state?.tick,validation:state?validateWorld(state):undefined,checkpoint:state?`tmp/${tag}-checkpoint.json`:null,errors},null,2));
    throw error;
  } finally {await browser.close();}
});
