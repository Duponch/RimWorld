import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { DOMESTIC_HEALROOT_DEMO_ID, DOMESTIC_HEALROOT_DEMO_PATH, DOMESTIC_HEALROOT_CELLS as cells } from '../../scripts/create-test-save-healroot-domestic-v195.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../../src/sim/serialization.ts';
import type { World } from '../../src/sim/types.ts';
import { TEST_COLONY_COUNT } from '../test-colony-count.ts';
import { testOutputPath, writeTestFile } from '../test-output.ts';
import { expectWorld, observeErrors, panel, pause, settledCells, world } from './helpers.ts';
import { inspectPerson, perform, revealCells } from './player-actions.ts';

interface Frame { tick:number; clock:number; pawnGeometry:number; pawnInstances:number; crops:{geometry:number;capacity:number}[] }
interface Probe { pipelines:number; buffers:number; bufferBytes:number; frames:Frame[] }
const frameProbe=`
const healrootDomesticFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){
 const result=healrootDomesticFrame.call(this,now);
 if(this.preparing||!this.world||!window.healrootDomesticProbe)return result;
 const p=this.pawns.feedbackSource;if(!p)return result;
 const frames=window.healrootDomesticProbe.frames;
 frames.push({tick:this.world.tick,clock:this.timeline.tick,pawnGeometry:p.id,pawnInstances:p.instanceCount,
  crops:this.crops.group.children.map(m=>({geometry:m.geometry.id,capacity:m.instanceMatrix.count}))});
 if(frames.length>2048)frames.shift();return result;
};`;
const herbal=(w:World)=>w.piles.filter(p=>p.item==='herbal-medicine').reduce((n,p)=>n+p.quantity,0);

async function saveResume(page:Page,w:World,name:string){
  await writeTestFile(`artifacts/healroot-domestic-v195-${name}.json`,serializeWorld(w));
  await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();
  await expectWorld(page,w);await page.keyboard.press('Escape');
}
type Boundary='pending'|'progress'|'born'|'harvested'|'carrying'|'stored'|'tending'|'treated';
async function advance(page:Page,boundary:Boundary,id:number){
  await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();
  await page.waitForFunction(({boundary,id,field,store})=>{
    const w=window.__lisiere.world,p=w.pawns.find(p=>p.id===id),j=w.jobs.find(j=>j.id===id);
    const ready=boundary==='pending'?w.jobs.some(j=>j.kind==='sow'&&j.x===field.x&&j.z===field.z)
      :boundary==='progress'?!!j&&j.progress>=5&&j.progress<25
      :boundary==='born'?w.resources.some(r=>r.kind==='healroot'&&r.x===field.x&&r.z===field.z)
      :boundary==='harvested'?!w.resources.some(r=>r.id===id)
      :boundary==='carrying'?p?.haul?.phase==='deliver'&&p.haul.carryPileId!==null
      :boundary==='stored'?w.piles.some(p=>p.item==='herbal-medicine'&&p.owner.type==='ground'&&p.owner.x===store.x&&p.owner.z===store.z)
      :boundary==='tending'?p?.tend?.phase==='tend'&&(p.tend.progress>0)
      :p?.health?.injuries.some(i=>i.tended!==undefined);
    if(!ready)return false;
    document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
  },{boundary,id,field:cells.field,store:cells.store},{polling:'raf',timeout:35_000});
  await pause(page);return world(page);
}
async function closeUp(page:Page,target:{x:number;z:number}){
  await page.keyboard.press('Escape');await revealCells(page,[target]);
  // revealCells can zoom out to uncover a selected pawn's panel. Pan the target
  // into a free viewport first, then retain that framing while zooming in.
  const observations:unknown[]=[];
  for(let n=0;n<18;n++){
    const [a,b]=await settledCells(page,[target,{x:target.x+1,z:target.z}]);
    const bounds=(await page.locator('#viewport canvas').boundingBox())!;
    const anchor={x:bounds.x+bounds.width*.74,y:bounds.y+bounds.height*.32};
    const center={x:bounds.x+a!.x,y:bounds.y+a!.y};
    const separation=Math.hypot(a!.x-b!.x,a!.y-b!.y);
    const clear=await page.evaluate(({anchor,center})=>[anchor,center].every(p=>document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS'),{anchor,center});
    observations.push({n,separation,anchor,center,clear});
    if(separation>=60&&clear)return;
    const dx=anchor.x-center.x,dy=anchor.y-center.y;
    if(!clear){
      await page.mouse.move(anchor.x,anchor.y);await page.mouse.down({button:'middle'});
      await page.mouse.move(anchor.x+Math.max(-250,Math.min(250,dx)),anchor.y+Math.max(-180,Math.min(180,dy)),{steps:8});
      await page.mouse.up({button:'middle'});
    }else{await page.mouse.move(center.x,center.y);await page.mouse.wheel(0,-300);}
    await page.waitForTimeout(250);
  }
  await page.screenshot({path:testOutputPath('artifacts/healroot-domestic-v195-camera-failure.png')});
  throw Error(`Le gros plan doit rendre le plant lisible : ${JSON.stringify(observations)}`);
}

test('V195 public medicinal field: skill refusal, physical sowing, prepared-mature harvest, haul and self-treatment with exact resumes',async({playwright})=>{
  test.setTimeout(240_000);
  const prepared=deserializeWorld(readFileSync(DOMESTIC_HEALROOT_DEMO_PATH,'utf8'));
  const [ada,harvester,patient]=prepared.pawns;
  const mature=prepared.resources.find(r=>r.kind==='healroot'&&r.x===cells.mature.x&&r.z===cells.mature.z)!;
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page),rotation={value:0},stages:Record<string,unknown>={};
  const act=(command:Parameters<typeof perform>[1]['command'],reason:string)=>perform(page,{command,reason},rotation);
  try{
    await page.addInitScript(()=>{
      const p:Probe={pipelines:0,buffers:0,bufferBytes:0,frames:[]};Object.assign(window,{healrootDomesticProbe:p});
      for(const name of ['createRenderPipeline','createRenderPipelineAsync'] as const){
        const original=GPUDevice.prototype[name];
        (GPUDevice.prototype[name] as unknown)=function(this:GPUDevice,...args:unknown[]){p.pipelines++;return (original as Function).apply(this,args);};
      }
      const create=GPUDevice.prototype.createBuffer;
      GPUDevice.prototype.createBuffer=function(this:GPUDevice,d:GPUBufferDescriptor){p.buffers++;p.bufferBytes+=d.size;return create.call(this,d);};
    });
    // Read-only renderer observation. Public catalogue, commands and worker are real.
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:frameProbe+await response.text()});});
    await page.goto('/?e2e');const front=page.locator('.front-menu');
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.getByRole('button',{name:'Colonies de test'}).click();
    expect(TEST_COLONY_COUNT).toBeGreaterThanOrEqual(45);await expect(front.locator('input[name="test-colony"]')).toHaveCount(TEST_COLONY_COUNT);
    await front.locator(`input[name="test-colony"][value="${DOMESTIC_HEALROOT_DEMO_ID}"]`).check();await front.getByRole('button',{name:'Charger cette colonie'}).click();
    await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:60_000});
    await expectWorld(page,prepared);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    const hardware=await page.evaluate(async()=>{
      const a=await navigator.gpu.requestAdapter();if(!a)throw Error('Adaptateur WebGPU absent.');
      return {...{vendor:a.info.vendor,architecture:a.info.architecture,device:a.info.device,description:a.info.description},fallback:(a as unknown as {isFallbackAdapter?:boolean}).isFallbackAdapter??null};
    });
    expect(hardware.fallback).not.toBe(true);expect(Object.values(hardware).join(' ')).not.toMatch(/swiftshader|llvmpipe|lavapipe/i);
    const capture=async(name:string,w:World)=>{
      expect(validateWorld(w)).toEqual([]);
      await expect.poll(()=>page.evaluate(t=>{const f=(window as unknown as {healrootDomesticProbe:Probe}).healrootDomesticProbe.frames.at(-1);return !!f&&f.tick===t&&Math.abs(f.clock-t)<.001;},w.tick)).toBe(true);
      const p=await page.evaluate(()=>{const p=(window as unknown as {healrootDomesticProbe:Probe}).healrootDomesticProbe;return {pipelines:p.pipelines,buffers:p.buffers,bufferBytes:p.bufferBytes,frame:p.frames.at(-1)!};});
      expect(p.frame.crops).toHaveLength(4);stages[name]={tick:w.tick,...p};return p;
    };
    const initial=await capture('prepared',prepared);
    const checkResident=async(name:string,w:World)=>{const p=await capture(name,w);expect(p.pipelines).toBe(initial.pipelines);expect(p.frame.pawnGeometry).toBe(initial.frame.pawnGeometry);expect(p.frame.pawnInstances).toBe(initial.frame.pawnInstances);expect(p.frame.crops).toEqual(initial.frame.crops);};
    expect(herbal(prepared)).toBe(0);expect(prepared.jobs).toHaveLength(0);
    const zone=prepared.growingZones[0]!;
    await act({type:'growing-policy',zoneId:zone.id,plant:'healroot',allowSow:true,allowCut:true},'Choisir la racine médicinale dans la case de riz vide.');
    await expect(page.locator('.storage-settings').filter({has:page.locator('#growing-plant')})).toContainText('Plantes 8');
    await act({type:'priority',pawnId:harvester!.id,work:'grow',value:1},'Présenter le semis au colon Plantes 7.');
    const pending=await advance(page,'pending',harvester!.id),sow=pending.jobs.find(j=>j.kind==='sow'&&j.x===cells.field.x&&j.z===cells.field.z)!;
    expect(sow.progress).toBe(0);expect(sow.reservedBy).toBeNull();
    await page.locator(`[data-pawn="${harvester!.id}"]`).click();await revealCells(page,[cells.field]);
    const [point]=await settledCells(page,[cells.field]),bounds=(await page.locator('#viewport canvas').boundingBox())!;
    await page.mouse.click(bounds.x+point!.x,bounds.y+point!.y,{button:'right'});
    const refused=page.locator(`[data-order-job="${sow.id}"]:not([data-order-haul])`);
    await expect(refused).toBeDisabled();await expect(refused).toContainText('Plantes 8');
    await page.keyboard.press('Escape');await expectWorld(page,pending);
    await act({type:'priority',pawnId:harvester!.id,work:'grow',value:0},'Séparer le témoin non admissible du semeur.');
    await act({type:'priority',pawnId:ada!.id,work:'grow',value:1},'Autoriser Ada Plantes 8 à semer physiquement.');
    await act({type:'order-job',pawnId:ada!.id,jobId:sow.id,queue:false},'Rejoindre la case pour le semis réel.');
    const ordered=await world(page);expect(ordered.pawns.find(p=>p.id===ada!.id)!.path.length).toBeGreaterThan(0);
    expect(ordered.pawns.find(p=>p.id===ada!.id)!.skills.plants!.xp).toBe(0);
    const sowing=await advance(page,'progress',sow.id),sewer=sowing.pawns.find(p=>p.id===ada!.id)!;
    expect(Math.abs(sewer.x-sow.x)+Math.abs(sewer.z-sow.z)).toBeLessThanOrEqual(1);expect(sewer.skills.plants!.xp).toBeGreaterThan(0);
    expect(sowing.resources.some(r=>r.x===cells.field.x&&r.z===cells.field.z)).toBe(false);expect(herbal(sowing)).toBe(0);
    await checkResident('sowing',sowing);await saveResume(page,sowing,'sowing');await checkResident('sowingReload',sowing);
    const born=await advance(page,'born',ada!.id),newPlant=born.resources.find(r=>r.kind==='healroot'&&r.x===cells.field.x&&r.z===cells.field.z)!;
    expect(newPlant.id).not.toBe(mature.id);expect(newPlant.plantLife!.bornAt).toBeGreaterThan(sowing.tick);expect(newPlant.growth).toBeLessThan(.01);
    await checkResident('born',born);await saveResume(page,born,'born');
    await closeUp(page,cells.field);await page.screenshot({path:testOutputPath('artifacts/healroot-domestic-v195-born-iso.png')});
    await page.locator('#camera-mode').click();await closeUp(page,cells.field);await page.screenshot({path:testOutputPath('artifacts/healroot-domestic-v195-born-perspective.png')});
    await page.locator('#camera-mode').click();await checkResident('twoCameras',born);

    await act({type:'priority',pawnId:ada!.id,work:'grow',value:0},'Conserver le jeune plant sans ressemis automatique.');
    await act({type:'priority',pawnId:harvester!.id,work:'gather',value:1},'Récolter le pied mûr préparé sans minimum Plantes 8.');
    await act({type:'designate',kind:'harvest',...cells.mature},'Désigner le seul pied préparé à maturité.');
    const harvest=(await world(page)).jobs.find(j=>j.kind==='harvest'&&j.x===mature.x&&j.z===mature.z)!;
    await act({type:'order-job',pawnId:harvester!.id,jobId:harvest.id,queue:false},'Marcher puis récolter avec Plantes 7.');
    const harvesting=await advance(page,'progress',harvest.id);
    expect(harvesting.resources.some(r=>r.id===mature.id)).toBe(true);expect(herbal(harvesting)).toBe(0);
    const harvestingPawn=harvesting.pawns.find(p=>p.id===harvester!.id)!;
    expect(harvestingPawn.skills.plants!.level).toBe(7);expect(harvestingPawn.skills.plants!.xp).toBeGreaterThan(0);
    expect(Math.abs(harvestingPawn.x-mature.x)+Math.abs(harvestingPawn.z-mature.z)).toBeLessThanOrEqual(1);
    await checkResident('harvesting',harvesting);await saveResume(page,harvesting,'harvesting');
    await closeUp(page,cells.mature);await page.screenshot({path:testOutputPath('artifacts/healroot-domestic-v195-harvesting-iso.png')});
    await page.locator('#camera-mode').click();await closeUp(page,cells.mature);await page.screenshot({path:testOutputPath('artifacts/healroot-domestic-v195-harvesting-perspective.png')});
    await page.locator('#camera-mode').click();await checkResident('harvestingCameras',harvesting);
    const harvested=await advance(page,'harvested',mature.id);await writeTestFile('artifacts/healroot-domestic-v195-harvest-result.json',serializeWorld(harvested));
    expect(herbal(harvested),'Le résultat seed42 doit donner une dose ; un échec réel est à diagnostiquer, jamais à contourner par un reset PRNG.').toBe(1);
    const dose=harvested.piles.find(p=>p.item==='herbal-medicine')!;expect(dose.owner.type).toBe('ground');
    await checkResident('harvested',harvested);
    await act({type:'priority',pawnId:harvester!.id,work:'haul',value:1},'Transporter réellement la dose vers la réserve médicale.');
    await act({type:'order-haul',pawnId:harvester!.id,target:{type:'pile',pileId:dose.id},queue:false},'Prendre puis livrer la dose.');
    const carrying=await advance(page,'carrying',harvester!.id),carrier=carrying.pawns.find(p=>p.id===harvester!.id)!,carryId=carrier.haul!.carryPileId!;
    expect(carrying.piles.find(p=>p.id===carryId)!.owner).toEqual({type:'pawn',pawnId:carrier.id});expect(herbal(carrying)).toBe(1);
    await checkResident('carrying',carrying);await saveResume(page,carrying,'carrying');
    const stored=await advance(page,'stored',harvester!.id),storedDose=stored.piles.find(p=>p.item==='herbal-medicine')!;
    expect(storedDose.id).toBe(carryId);expect(storedDose.owner).toEqual({type:'ground',...cells.store});expect(herbal(stored)).toBe(1);
    await checkResident('stored',stored);await saveResume(page,stored,'stored');

    await inspectPerson(page,patient!.id,'health');await page.locator('#self-tend-policy').check();
    await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===patient!.id)?.selfTend).toBe(true);
    await act({type:'priority',pawnId:patient!.id,work:'doctor',value:1},'Autoriser le troisième colon à soigner sa contusion.');
    await act({type:'order-tend',pawnId:patient!.id,patientId:patient!.id,queue:false},'Collecter la dose rangée et se soigner au contact.');
    const requested=await world(page);expect(requested.pawns.find(p=>p.id===patient!.id)!.tend!.medicine!.sourcePileId).toBe(storedDose.id);
    expect(requested.pawns.find(p=>p.id===patient!.id)!.tend!.phase).toBe('pickup');
    expect(requested.pawns.find(p=>p.id===patient!.id)!.path.length).toBeGreaterThan(0);
    expect(herbal(requested)).toBe(1);await saveResume(page,requested,'tendPickup');
    const tending=await advance(page,'tending',patient!.id),doctor=tending.pawns.find(p=>p.id===patient!.id)!;
    expect(doctor.tend!.medicine!.item).toBe('herbal-medicine');expect(herbal(tending)).toBe(1);
    const carriedMedicine=tending.piles.find(p=>p.id===doctor.tend!.medicine!.carryPileId)!;
    expect(carriedMedicine.owner).toEqual({type:'pawn',pawnId:patient!.id});
    await checkResident('tending',tending);await saveResume(page,tending,'tending');
    const treated=await advance(page,'treated',patient!.id);expect(herbal(treated)).toBe(0);
    expect(treated.pawns.find(p=>p.id===patient!.id)!.health!.injuries[0]!.tended).toBeDefined();
    expect(treated.resources.some(r=>r.id===newPlant.id)).toBe(true);expect(treated.resources.some(r=>r.id===mature.id)).toBe(false);
    await checkResident('treated',treated);await saveResume(page,treated,'treated');await checkResident('treatedReload',treated);
    await inspectPerson(page,patient!.id,'health');await page.screenshot({path:testOutputPath('artifacts/healroot-domestic-v195-treated.png')});
    expect(errors).toEqual([]);
    await writeTestFile('artifacts/healroot-domestic-v195-native.json',JSON.stringify({hardware,publicId:DOMESTIC_HEALROOT_DEMO_ID,actors:prepared.pawns.map(p=>({id:p.id,plants:p.skills.plants!.level})),matureId:mature.id,newPlantId:newPlant.id,sourceDoseId:dose.id,carryId,stages,errors,limits:'Scène préparée 32² ; maturité du pied récolté et contusion préparées. Semis, récolte, transport, soin et reprises réels. Ni sept jours de croissance naturelle, ni mesure GPU/CPU générale ; géométries résidentes des acteurs et quatre lots de cultures, chunks médicinaux autorisés à changer de contenu.'},null,2));
  }catch(error){
    await writeTestFile('artifacts/healroot-domestic-v195-native-failure.json',JSON.stringify({errors,stages,message:String(error),probe:await page.evaluate(()=>(window as unknown as {healrootDomesticProbe:Probe}).healrootDomesticProbe).catch(()=>null)},null,2));
    await page.screenshot({path:testOutputPath('artifacts/healroot-domestic-v195-native-failure.png')}).catch(()=>{});
    throw error;
  }finally{await browser.close();}
});
