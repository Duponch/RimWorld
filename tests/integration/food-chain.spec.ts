import { expect,test,type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { foodWorkstationConstructionFixture } from '../scenarios/food-workstations';
import { medicalCamp } from '../scenarios/health';
import { fixtureBuilding } from '../scenarios/deconstruction';
import { createMedicalRecord } from '../../src/sim/injury-state';
import { reconcilePawnHealth } from '../../src/sim/health';
import { addGroundMaterial,refreshStock } from '../../src/sim/materials';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { newCookingBill } from '../../src/sim/cooking-bills';
import { observeErrors,panel,pawnTab,pause,saveKey,world,expectWorld } from './helpers';
import { perform } from './player-actions';
import type { Command,World } from '../../src/sim/types';

async function load(page:Page,w:World){await pause(page);await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(w)});await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,w);await page.keyboard.press('Escape');}
function feedingFixture():World {
  const w=medicalCamp(2),d=w.pawns[0]!,p=w.pawns[1]!;d.priorities.doctor=0;p.hunger=0;
  p.health={...createMedicalRecord(w.tick),malnutrition:810000000};reconcilePawnHealth(w,p);
  const b=fixtureBuilding(w,'bed',p.x,p.z);Object.assign(b,{medical:true});p.need={kind:'sleep',phase:'sleep',bedId:b.id,target:{x:p.x,z:p.z}};
  addGroundMaterial(w,'food',8,{x:d.x-2,z:d.z},'survival-meal');refreshStock(w);return w;
}

// Controlled states exercise genuine player actions. The separate long CPU
// colony starts with its actual dotation and never receives these materials.
test('native food chain: construct stations, choose crops, cook with physical fuel, save and feed malnutrition',async({playwright})=>{
  test.setTimeout(240000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]}),page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  page.setDefaultTimeout(15000);const report:any={version:84,controlled:true,care:[]};
  try {
    const initial=foodWorkstationConstructionFixture();initial.jobs=[];
    addGroundMaterial(initial,'wood',20,{x:8,z:7},'wood');addGroundMaterial(initial,'food',10,{x:8,z:6},'potato');addGroundMaterial(initial,'food',10,{x:9,z:6},'corn');refreshStock(initial);expect(validateWorld(initial)).toEqual([]);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await load(page,initial);
    const rotation={value:0},act=(command:Command,reason:string)=>perform(page,{command,reason},rotation);
    for(const [kind,x] of [['fueled-stove',10],['electric-stove',15],['butcher-table',20]] as const)await act({type:'designate',kind,x,z:10,orientation:1},'Construire le poste depuis Architecte avec les matières physiques.');
    await act({type:'area',action:'growing',from:{x:7,z:15},to:{x:8,z:16}},'Désigner un champ de pommes de terre.');
    const potato=(await world(page)).growingZones[0]!;await act({type:'growing-policy',zoneId:potato.id,plant:'potato',allowSow:true,allowCut:true},'Choisir la culture résistante aux sols pauvres.');
    await act({type:'area',action:'growing',from:{x:11,z:15},to:{x:12,z:16}},'Désigner un champ de maïs distinct.');
    const corn=(await world(page)).growingZones[1]!;await act({type:'growing-policy',zoneId:corn.id,plant:'corn',allowSow:true,allowCut:true},'Choisir une récolte plus tardive.');
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.filter(s=>['fueled-stove','electric-stove','butcher-table'].includes(s.kind)).length,{timeout:65000}).toBe(3);
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.kind==='fueled-stove')?.fuel?.ticks??0,{timeout:20000}).toBeGreaterThan(0);await pause(page);
    const built=await world(page),stove=built.structures.find(s=>s.kind==='fueled-stove')!,electric=built.structures.find(s=>s.kind==='electric-stove')!,butcher=built.structures.find(s=>s.kind==='butcher-table')!;
    expect(electric.power?.on).toBe(false);expect(stove.fuel!.ticks).toBeGreaterThan(0);expect(stove.fuel!.burned).toBe(0);expect(validateWorld(built)).toEqual([]);
    for(const station of [stove,electric,butcher])await act({type:'bill-add',structureId:station.id},'Ajouter la recette du poste par son inspection.');
    const cooking=await world(page),bill=cooking.structures.find(s=>s.id===stove.id)!.bills![0]!;
    const settings=newCookingBill(1);settings.target=2;settings.destination='drop';settings.filters={berries:false,rice:false,'hare-meat':false,potato:true,corn:true};
    await act({type:'bill-update',structureId:stove.id,billId:bill.id,settings},'Cuisiner deux repas avec les deux légumes autorisés.');
    await act({type:'priority',pawnId:initial.pawns[0]!.id,work:'cook',value:1},'Donner le travail Cuisine au colon.');
    await act({type:'priority',pawnId:initial.pawns[0]!.id,work:'grow',value:2},'Semer les deux cultures après la cuisson.');
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).piles.filter(p=>p.item==='simple-meal').reduce((n,p)=>n+p.quantity,0),{timeout:30000}).toBe(2);
    await expect.poll(async()=>(await world(page)).resources.filter(r=>r.kind==='potato'||r.kind==='corn').length,{timeout:25000}).toBe(8);await pause(page);
    const cooked=await world(page);expect(cooked.structures.find(s=>s.id===stove.id)!.fuel!.burned).toBeGreaterThan(0);expect(cooked.piles.some(p=>p.item==='potato'||p.item==='corn')).toBe(false);expect(validateWorld(cooked)).toEqual([]);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,cooked);await page.keyboard.press('Escape');
    await page.screenshot({path:'artifacts/food-stations-v84.png'});report.stations={tick:cooked.tick,structures:cooked.structures.map(s=>({kind:s.kind,orientation:s.orientation,fuel:s.fuel,power:s.power})),plants:cooked.resources.filter(r=>r.kind==='potato'||r.kind==='corn').map(r=>({kind:r.kind,growth:r.growth})),producedMeals:2};
    for(const speed of [1,6]) {
      const clinic=feedingFixture(),d=clinic.pawns[0]!,p=clinic.pawns[1]!;expect(validateWorld(clinic)).toEqual([]);await load(page,clinic);
      await page.locator(`[data-pawn="${p.id}"]`).click();await pawnTab(page,'health');await expect(page.locator('[data-health="malnutrition"]')).toContainText('extrême');
      await act({type:'priority',pawnId:d.id,work:'doctor',value:1},'Autoriser le médecin à apporter un repas au patient.');
      await act({type:'order-feed',pawnId:d.id,patientId:p.id,queue:false},'Nourrir physiquement le colon inconscient.');
      await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();
      await expect.poll(async()=>(await world(page)).pawns.find(q=>q.id===p.id)!.hunger,{timeout:40000}).toBeGreaterThan(50);await pause(page);
      const fed=await world(page),patient=fed.pawns.find(q=>q.id===p.id)!;expect(patient.health!.malnutrition).toBeGreaterThan(0);expect(validateWorld(fed)).toEqual([]);
      await page.locator(`[data-pawn="${p.id}"]`).click();await pawnTab(page,'health');await expect(page.locator('[data-health="malnutrition"]')).toContainText('Récupère progressivement');
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,fed);await page.keyboard.press('Escape');
      report.care.push({speed,tick:fed.tick,hunger:patient.hunger,severity:patient.health!.malnutrition,food:fed.piles.filter(p=>p.kind==='food').reduce((n,p)=>n+p.quantity,0)});
      await page.screenshot({path:`artifacts/food-care-${speed}x-v84.png`});
    }
    report.errors=errors;expect(errors).toEqual([]);writeFileSync('artifacts/food-native-v84.json',JSON.stringify(report,null,2));
  } finally {await browser.close();}
});
