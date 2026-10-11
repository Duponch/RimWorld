import { expect,test } from '@playwright/test';
import { animalRescueCamp } from '../helpers/animal-rescue-v310.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../../src/sim/serialization.ts';
import { decodeStoredSave } from '../../src/ui/save-storage-codec.ts';
import type { World } from '../../src/sim/types.ts';
import { cell,expectWorld,observeErrors,panel,pause,saveKey,tool,world } from './helpers.ts';
import { perform,revealCells } from './player-actions.ts';
import { writeTestFile } from '../test-output.ts';

// Observe the same resident species rig used for live animals and corpses.
// No simulation object or renderer buffer is written by this probe.
const rendererProbe=`
window.__animalRescueFrames=[];
const animalRescueFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){
  const result=animalRescueFrame.call(this,now);if(this.preparing||!this.world)return result;
  const values=(g,name,index)=>{const a=g.getAttribute(name);return [a.getX(index),a.getY(index),a.getZ(index),a.getW(index)];};
  for(const pawn of this.world.pawns){
    if(pawn.animalRescue?.phase!=='carry')continue;
    const source=this.pawns.animalCorpseCarrier(pawn.id);if(!source)continue;
    const instances=this.wildlife.rigs.flatMap(rig=>rig.animals.flatMap((animal,index)=>animal.id===pawn.animalRescue.animalId?[{rig,index}]:[]));
    const bodies=instances.map(({rig,index})=>({
      from:values(rig.mesh.geometry,'aFrom',index),to:values(rig.mesh.geometry,'aTo',index),travel:values(rig.mesh.geometry,'aTravel',index),
      carrier:values(rig.mesh.geometry,'aCarrier',index),state:values(rig.mesh.geometry,'aAnimal',index),visible:rig.mesh.visible,
      submitted:index<rig.mesh.geometry.instanceCount
    }));
    window.__animalRescueFrames.push({tick:this.world.tick,play:this.timeline.tick,pawnId:pawn.id,animalId:pawn.animalRescue.animalId,
      from:values(source.geometry,'aFrom',source.index),to:values(source.geometry,'aTo',source.index),travel:values(source.geometry,'aTravel',source.index),bodies});
    if(window.__animalRescueFrames.length>240)window.__animalRescueFrames.shift();
  }
  return result;
};`;

const units=(w:World,item:'medicine'|'rice')=>w.piles.filter(p=>p.item===item).reduce((sum,p)=>sum+p.quantity,0);

test('V310 native: animal spots, carried edge reload/release, medical dose, food cargo and normal sleep',async({playwright})=>{
  test.setTimeout(180000);
  const fixture=animalRescueCamp(),prepared=fixture.world;
  expect(validateWorld(prepared)).toEqual([]);expect(serializeWorld(deserializeWorld(serializeWorld(prepared)))).toBe(serializeWorld(prepared));
  expect(units(prepared,'medicine')).toBe(3);expect(units(prepared,'rice')).toBe(75);
  const browser=await playwright.chromium.launch({channel:'chrome',args:[]});
  const page=await browser.newPage({baseURL:process.env.ANIMAL_RESCUE_V310_BASE_URL??'http://127.0.0.1:5173',viewport:{width:2560,height:1440}});
  page.setDefaultTimeout(20000);
  const errors=observeErrors(page),checkpoints:{label:string;tick:number}[]=[],rotation={value:0};
  const patient=(w:World)=>w.wildlife!.animals.find(a=>a.id===fixture.animalId)!;
  const doctor=(w:World)=>w.pawns.find(p=>p.id===fixture.doctorId)!;
  const priority=async(value:number)=>perform(page,{reason:'Attribuer ou interrompre le service médical physique.',command:{type:'priority',pawnId:fixture.doctorId,work:'doctor',value}},rotation);
  try{
    await page.addInitScript(()=>{
      const state=window as any;state.__animalRescueShaders=[];
      const create=GPUDevice.prototype.createShaderModule;
      GPUDevice.prototype.createShaderModule=function(descriptor){state.__animalRescueShaders.push(descriptor.code);return create.call(this,descriptor);};
    });
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:rendererProbe+await response.text()});});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);await pause(page);
    await page.evaluate(async({key,data})=>window.__lisiere.saveRepository.setItem(key,data),{key:saveKey,data:serializeWorld(prepared)});
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,prepared);await page.keyboard.press('Escape');
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');

    async function checkpoint(label:string){
      await pause(page);const snapshot=await world(page);expect(validateWorld(snapshot)).toEqual([]);
      await page.keyboard.press('Escape');await panel(page,'menu');await page.locator('#save').click();
      await expect.poll(async()=>{
        const raw=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);
        return raw?serializeWorld(deserializeWorld(await decodeStoredSave(raw))):null;
      }).toBe(serializeWorld(snapshot));
      await page.locator('#load').click();await expectWorld(page,snapshot);await page.keyboard.press('Escape');
      checkpoints.push({label,tick:snapshot.tick});await writeTestFile(test.info().outputPath(`checkpoint-${label}.json`),serializeWorld(snapshot));return snapshot;
    }
    async function inspectAnimal(){
      await page.keyboard.press('Escape');await page.locator('[data-panel="animals"]').click();
      await page.locator(`[data-domestic-focus="${fixture.animalId}"]`).click();
    }
    async function placeSpot(target:{x:number;z:number}){
      await page.keyboard.press('Escape');await panel(page,'architect');await page.locator('[data-category="furniture"]').click();
      await page.locator('[data-tool="animal-sleeping-spot"]').click();await revealCells(page,[target]);await cell(page,target.x,target.z);
      await expect.poll(async()=>(await world(page)).structures.some(s=>s.kind==='animal-sleeping-spot'&&s.x===target.x&&s.z===target.z)).toBe(true);
      await page.keyboard.press('Escape');return (await world(page)).structures.find(s=>s.kind==='animal-sleeping-spot'&&s.x===target.x&&s.z===target.z)!;
    }
    async function inspectSpot(spot:{id:number;x:number;z:number}){
      await tool(page,'select');await page.keyboard.press('Escape');await revealCells(page,[spot]);
      const card=page.locator(`[data-animal-spot="${spot.id}"]`);
      for(let attempt=0;attempt<4;attempt++){await cell(page,spot.x,spot.z);if(await card.isVisible())break;await revealCells(page,[spot]);}
      await expect(card).toBeVisible();return card;
    }
    async function watch(phase:'carry-edge'|'deposited'|'medicine'|'treated'|'food-carry'|'feed'|'fed'|'sleep',spotId:number){
      await page.waitForFunction(({phase,animalId,doctorId,sleeperId,spotId})=>{
        const w=window.__lisiere.world,d=w.pawns.find(p=>p.id===doctorId)!,a=w.wildlife!.animals.find(a=>a.id===animalId)!;
        const sleeper=w.wildlife!.animals.find(a=>a.id===sleeperId)!;
        const ready=phase==='carry-edge'?d.animalRescue?.phase==='carry'&&!!d.motion&&d.motion.start<w.tick&&w.tick<d.motion.end-1
          :phase==='deposited'?a.animalRest?.phase==='sleep'&&a.animalRest.spotId===spotId&&!d.animalRescue
          :phase==='medicine'?!!d.animalCare?.medicine?.carryPileId&&d.animalCare.phase==='treat'&&d.animalCare.progress>0
          :phase==='treated'?a.health!.injuries.length>0&&a.health!.injuries.every(i=>i.tended!==undefined)&&!d.animalCare
          :phase==='food-carry'?d.animalFeed?.phase==='deliver'&&!!d.animalFeed.carryPileId
          :phase==='feed'?d.animalFeed?.phase==='feed'&&d.animalFeed.progress>0
          :phase==='fed'?w.wildlife!.eatenItems>0&&!d.animalFeed
          :sleeper.animalRest?.phase==='sleep'&&sleeper.animalRest.spotId===spotId&&sleeper.state==='sleeping';
        if(!ready)return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
      },{phase,animalId:fixture.animalId,doctorId:fixture.doctorId,sleeperId:fixture.sleeperId,spotId},{polling:'raf',timeout:45000});
      await pause(page);
    }
    async function run(phase:Parameters<typeof watch>[0],spotId:number,speed:'1'|'6'='1'){
      await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();await watch(phase,spotId);
    }

    const normal=await placeSpot(fixture.normalSpot),medical=await placeSpot(fixture.medicalSpot);
    const medicalCard=await inspectSpot(medical);await medicalCard.locator('[data-animal-spot-medical]').check();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===medical.id)?.medical).toBe(true);
    const placed=await checkpoint('places');expect(placed.jobs).toHaveLength(0);expect(placed.structures).toHaveLength(2);
    expect(placed.structures.find(s=>s.id===normal.id)?.medical).toBeUndefined();expect(units(placed,'medicine')).toBe(3);expect(units(placed,'rice')).toBe(75);
    await priority(1);await inspectAnimal();const rescueButton=page.locator(`[data-animal-rescue="${fixture.doctorId}"]`);
    await expect(rescueButton).toBeEnabled();await rescueButton.click();
    await expect.poll(async()=>doctor(await world(page)).animalRescue?.animalId).toBe(fixture.animalId);
    await run('carry-edge',medical.id);const carried=await checkpoint('animal-carry-edge'),carrier=doctor(carried),carriedAnimal=patient(carried);
    expect(carrier.animalRescue).toMatchObject({animalId:fixture.animalId,spotId:medical.id,phase:'carry'});
    expect(carrier.motion!.start).toBeLessThan(carried.tick);expect(carrier.motion!.end).toBeGreaterThan(carried.tick);
    expect(carriedAnimal.motion).toEqual(carrier.motion);expect([carriedAnimal.x,carriedAnimal.z]).toEqual([carrier.x,carrier.z]);expect(carriedAnimal.path).toEqual([]);
    expect(carriedAnimal.state).toBe('downed');expect(carriedAnimal.animalRest).toBeUndefined();expect(carriedAnimal.domestic!.bedId).toBeUndefined();
    expect(carried.wildlife!.animals.filter(a=>a.id===fixture.animalId)).toHaveLength(1);expect(carried.piles.some(p=>p.owner.type==='pawn')).toBe(false);
    await expect.poll(()=>page.evaluate(id=>(window as any).__animalRescueFrames.some((f:any)=>f.animalId===id&&f.bodies.length===1&&f.bodies[0].carrier[0]===1),fixture.animalId)).toBe(true);
    const frames=await page.evaluate(()=>(window as any).__animalRescueFrames as {tick:number;play:number;from:number[];to:number[];travel:number[];bodies:{from:number[];to:number[];travel:number[];carrier:number[];state:number[];visible:boolean;submitted:boolean}[]}[]);
    expect(frames.length).toBeGreaterThan(0);
    for(const frame of frames){expect(frame.bodies).toHaveLength(1);const body=frame.bodies[0]!;expect(body.visible).toBe(true);expect(body.submitted).toBe(true);expect(body.carrier[0]).toBe(1);expect(body.state[2]).toBe(1);expect(body.from).toEqual(frame.from);expect(body.to).toEqual(frame.to);expect(body.travel).toEqual(frame.travel);}
    const shaders=await page.evaluate(()=>[...new Set((window as any).__animalRescueShaders.filter((code:string)=>code.includes('aCarrier')&&code.includes('aAnimal')))] as string[]);
    expect(shaders.length).toBeGreaterThan(0);await writeTestFile(test.info().outputPath('animal-rescue.wgsl'),shaders.join('\n\n'));
    const animal_carriedImage=test.info().outputPath('animal-carried.png');await page.screenshot({path:animal_carriedImage});await test.info().attach('animal-carried',{path:animal_carriedImage,contentType:'image/png'});

    await priority(0);const released=await checkpoint('rescue-released-edge');expect(doctor(released).animalRescue).toBeUndefined();
    expect(released.tick).toBe(carried.tick);expect(patient(released)).toEqual({...carriedAnimal,nextDecision:released.tick});expect(units(released,'medicine')).toBe(3);expect(units(released,'rice')).toBe(75);
    await priority(1);await run('deposited',medical.id);const deposited=await checkpoint('animal-deposited');
    expect(patient(deposited).animalRest).toEqual({spotId:medical.id,phase:'sleep'});expect(patient(deposited).state).toBe('downed');
    expect([patient(deposited).x,patient(deposited).z]).toEqual([medical.x,medical.z]);expect(patient(deposited).motion?.end??0).toBeLessThanOrEqual(deposited.tick);
    expect(patient(deposited).domestic!.bedId).toBeUndefined();expect(deposited.pawns.some(p=>p.animalRescue?.animalId===fixture.animalId)).toBe(false);
    await run('medicine',medical.id);const bedside=await checkpoint('medicine-bedside'),care=doctor(bedside).animalCare!;
    expect(care.phase).toBe('treat');expect(care.progress).toBeGreaterThan(0);expect(units(bedside,'medicine')).toBe(3);
    expect(bedside.piles.find(p=>p.id===care.medicine!.carryPileId)!.owner).toEqual({type:'pawn',pawnId:fixture.doctorId});
    expect(Math.abs(doctor(bedside).x-patient(bedside).x)+Math.abs(doctor(bedside).z-patient(bedside).z)).toBe(1);
    await run('treated',medical.id);const treated=await checkpoint('animal-treated');expect(units(treated,'medicine')).toBe(3-fixture.doses);
    expect(patient(treated).health!.injuries.every(i=>i.tended!==undefined)).toBe(true);expect(patient(treated).health!.death).toBeUndefined();

    await run('food-carry',medical.id);const foodCarry=await world(page),feed=doctor(foodCarry).animalFeed!,ration=foodCarry.piles.find(p=>p.id===feed.carryPileId)!;
    expect(ration.owner).toEqual({type:'pawn',pawnId:fixture.doctorId});expect(ration.quantity).toBe(feed.quantity);expect(units(foodCarry,'rice')).toBe(75);
    await priority(0);const foodReleased=await checkpoint('ration-released');expect(doctor(foodReleased).animalFeed).toBeUndefined();
    expect(foodReleased.tick).toBe(foodCarry.tick);expect(patient(foodReleased)).toEqual(patient(foodCarry));
    expect(foodReleased.piles.find(p=>p.id===ration.id)!.owner.type).toBe('ground');expect(foodReleased.piles.find(p=>p.id===ration.id)!.quantity).toBe(ration.quantity);
    expect(units(foodReleased,'rice')).toBe(75);expect(foodReleased.wildlife!.eatenItems).toBe(foodCarry.wildlife!.eatenItems);
    await priority(1);await run('feed',medical.id);const feeding=await checkpoint('assisted-ingestion'),activeFeed=doctor(feeding).animalFeed!;
    expect(activeFeed.phase).toBe('feed');expect(activeFeed.progress).toBeGreaterThan(0);expect(activeFeed.progress).toBeLessThan(75);
    expect(Math.abs(doctor(feeding).x-patient(feeding).x)+Math.abs(doctor(feeding).z-patient(feeding).z)).toBe(1);
    await inspectAnimal();await page.locator('[data-animal-tab="health"]').click();await expect(page.locator('[data-animal-content="health"]')).toContainText('Alimentation au contact');
    const animal_fed_at_bedsideImage=test.info().outputPath('animal-fed-at-bedside.png');await page.screenshot({path:animal_fed_at_bedsideImage});await test.info().attach('animal-fed-at-bedside',{path:animal_fed_at_bedsideImage,contentType:'image/png'});
    await run('fed',medical.id);const fed=await checkpoint('animal-fed');
    expect(75-units(fed,'rice')).toBe(activeFeed.quantity);expect(fed.wildlife!.eatenItems).toBe(activeFeed.quantity);
    expect(fed.wildlife!.eatenNutrition).toBeCloseTo(activeFeed.quantity*.05,12);expect(patient(fed).food).toBeGreaterThan(patient(feeding).food);
    expect(units(fed,'medicine')).toBe(2);expect(patient(fed).animalRest).toEqual({spotId:medical.id,phase:'sleep'});
    const sleeping=()=>world(page).then(w=>w.wildlife!.animals.find(a=>a.id===fixture.sleeperId)!.animalRest?.phase==='sleep');
    if(!await sleeping())await run('sleep',normal.id);
    const final=await checkpoint('normal-sleep-and-medical-rest'),sleeper=final.wildlife!.animals.find(a=>a.id===fixture.sleeperId)!;
    expect(sleeper.state).toBe('sleeping');expect(sleeper.animalRest).toEqual({spotId:normal.id,phase:'sleep'});expect(sleeper.domestic!.bedId).toBe(normal.id);
    expect(sleeper.rest).toBeGreaterThan(.2);expect([sleeper.x,sleeper.z]).toEqual([normal.x,normal.z]);expect(sleeper.health).toBeUndefined();
    expect(patient(final).health!.death).toBeUndefined();expect(final.wildlife!.animals).toHaveLength(2);expect(errors).toEqual([]);
    const normal_and_medical_spotsImage=test.info().outputPath('normal-and-medical-spots.png');await page.screenshot({path:normal_and_medical_spotsImage});await test.info().attach('normal-and-medical-spots',{path:normal_and_medical_spotsImage,contentType:'image/png'});
    const report=test.info().outputPath('report.json');await writeTestFile(report,JSON.stringify({preparedScene:true,clinicalPreparation:'70% blood loss and two untreated nonbleeding bruises',backend:'WebGPU',viewport:{width:2560,height:1440},checkpoints,frames,medicineConsumed:3-units(final,'medicine'),riceConsumed:75-units(final,'rice'),animalId:fixture.animalId,sleeperId:fixture.sleeperId,normalSpotId:normal.id,medicalSpotId:medical.id,errors},null,2));
    await test.info().attach('animal-rescue-report',{contentType:'application/json',path:report});
  }catch(error){
    await writeTestFile(test.info().outputPath('failed-world.json'),JSON.stringify(await world(page)));
    await writeTestFile(test.info().outputPath('failed-diagnostic.json'),JSON.stringify({errors,checkpoints,notice:await page.locator('#notice').textContent(),incident:await page.evaluate(()=>window.__lisiere.incident)},null,2));throw error;
  }finally{await browser.close();}
});
