// ROOT executes only after the shared SIM fixture/contracts have passed.
// All play uses the ordinary native UI and GameSession, never injected commands.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {sha,openNativeGameJourney,nativeGameControls} from './native-game-journey.mjs';

const driverPath=fileURLToPath(import.meta.url),root=resolve(dirname(driverPath),'..');
const option=(n,f)=>process.argv.find(v=>v.startsWith('--'+n+'='))?.slice(n.length+3)??f;
const origin=new URL(option('origin','http://127.0.0.1:5196')),budgetMs=Number(option('budget-seconds','240'))*1000;
const folder=resolve(root,'tmp/door-over-wall-v483','native-'+new Date().toISOString().replaceAll(':','-')+'-'+process.pid);await mkdir(folder,{recursive:true});
const report={protocol:'native-game-journey-door-over-wall-v483-1',created:new Date().toISOString(),folder,origin:origin.href,browserPath:option('browser','.playwright/chromium-1243/chrome-win64/chrome.exe'),phases:[],served:[],captures:[],saves:[],checks:[],errors:[],pageErrors:[],
 limits:['The initial camp explicitly prepares flat terrain, native adult constructors without healing or altered skills/needs, finite5wood, forbidden65steel/2components and10meals. The imported completed wooden wall is obtained by actual SIM designation, walking, finite delivery, frame and construction in the shared fixture; no finished Structure is injected.',
 'The native journey places the steel door through Architect, shows its future plan over the intact wall, plays real wall deconstruction with forbidden future materials, pauses in the open ordinary blueprint phase, unlocks the finite steel through its ordinary inspector permission, then plays delivery, frame and actual door completion.',
 'Read-only probes observe snapshot facts and current native UI only. All whole exports/reloads are exact while paused. This bounded journey gives no FPS, CPU/GPU or global comfort conclusion.']};
const persist=()=>writeFile(resolve(folder,'report.json'),JSON.stringify(report,null,2));
const phase=async name=>{report.phase=name;report.phases.push({name,at:new Date().toISOString()});await persist();console.log(JSON.stringify({phase:name}));};
const preparationHTML=String.raw`<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><title>Mur réellement construit V483</title><script type="module">
try {const {buildDoorOverWallScenario483}=await import('/tests/scenarios/door-over-wall-v483.ts');const {serializeCampaign}=await import('/src/sim/serialization.ts');const {world,checkpoint,...ledger}=buildDoorOverWallScenario483();window.__doorPrepared={data:serializeCampaign(world),ledger,schema:world.schemaVersion,tick:world.tick};}catch(error){window.__doorPrepareError=String(error?.stack??error);}
</script>`;
report.preparationHTMLSHA=sha(preparationHTML);await writeFile(resolve(folder,'preparation.html'),preparationHTML);
const hook=String.raw`
window.__nativeJourney.wallDoorFacts=ids=>{
 const w=snapshot;if(!w)return null;const wall=w.structures.find(s=>s.id===ids.wallId),deconstruction=w.jobs.find(j=>j.deconstruction?.structureId===ids.wallId),plan=deconstruction?.wallDoor296?.plan;
 const steelDelivered=jobId=>w.piles.filter(p=>p.item==='steel'&&p.owner.type==='job'&&p.owner.jobId===jobId).reduce((n,p)=>n+p.quantity,0);
 return {schema:w.schemaVersion,tick:w.tick,selection:{object:selectedObject,cell:selectedCell,markerVisible:!!renderer?.objectSelection?.visible},wall:wall?{id:wall.id,kind:wall.kind,material:wall.material,x:wall.x,z:wall.z,damage:wall.damage??0}:null,deconstruction:deconstruction?{id:deconstruction.id,kind:deconstruction.kind,progress:deconstruction.progress,status:deconstruction.status,reservedBy:deconstruction.reservedBy,wallDoor296:deconstruction.wallDoor296,escrow:deconstruction.escrow}:null,
  plan:plan??null,jobs:w.jobs.filter(j=>j.x===16&&j.z===16).map(j=>({id:j.id,kind:j.kind,construction:j.construction,material:j.material,progress:j.progress,status:j.status,reservedBy:j.reservedBy,escrow:j.escrow,steelDelivered:steelDelivered(j.id)})),
  door:w.structures.find(s=>s.kind==='door'&&s.x===16&&s.z===16)??null,pawns:w.pawns.map(p=>({id:p.id,x:p.x,z:p.z,state:p.state,jobId:p.jobId,haul:p.haul,orders:p.orders,motion:p.motion})),
  steel:w.piles.filter(p=>p.item==='steel').map(p=>({id:p.id,quantity:p.quantity,owner:p.owner,forbidden:p.forbidden})),wood:w.piles.filter(p=>p.item==='wood').map(p=>({id:p.id,quantity:p.quantity,owner:p.owner})),deconstructed:w.deconstructed,nextId:w.nextId};
};
window.__nativeJourney.wallDoorObservations=[];
`;
let journey,page;
await persist();
try{
 journey=await openNativeGameJourney({root,origin,budgetMs,report,persist,driverPath,scenarioPaths:['tests/scenarios/door-over-wall-v483.ts'],hook,preparation:{path:'/__wall-door-prepare-v483.html',html:preparationHTML}});
 await phase('real-paid-wall-shared-fixture');let prepared;
 const preparedPath=option('prepared','');
 if(preparedPath){
  // Optional ROOT-created envelope has the exact same {data,ledger,schema,tick}
  // shape, enabling honest reuse of a separately recorded SIM acquisition.
  const path=resolve(root,preparedPath),bytes=await readFile(path);prepared=JSON.parse(bytes);report.preparedEnvelope={path,sha256:sha(bytes)};
 }else{
  const preparer=await journey.newPage();await Promise.race([journey.routeFailure,preparer.goto(new URL('/__wall-door-prepare-v483.html',origin).href,{waitUntil:'domcontentloaded',timeout:Math.min(60000,journey.remaining())})]);
  await Promise.race([journey.routeFailure,preparer.waitForFunction(()=>window.__doorPrepared||window.__doorPrepareError,null,{timeout:Math.min(60000,journey.remaining())})]);
  assert.equal(await preparer.evaluate(()=>window.__doorPrepareError),undefined);prepared=await preparer.evaluate(()=>window.__doorPrepared);await preparer.close();
 }
 assert.equal(prepared.schema,296);assert.ok(prepared.tick>0);assert.equal(prepared.tick,prepared.ledger.played.readyAt);assert.ok(prepared.ledger.played.observations.some(o=>o.phase.startsWith('delivery-')));assert.ok(prepared.ledger.played.observations.some(o=>o.phase==='frame'&&o.delivered===5));assert.ok(prepared.ledger.played.observations.some(o=>o.progress>0));
 report.preparation=prepared.ledger;const inputPath=resolve(folder,'paid-wall-input.json');await writeFile(inputPath,prepared.data);report.input={path:inputPath,sha256:sha(prepared.data),bytes:Buffer.byteLength(prepared.data),schema:296,tick:prepared.tick};
 page=await journey.newPage();const c=nativeGameControls({page,journey,report,persist,schema:296}),{wait,ready,model,click,close,reveal,capture,exportWhole,management,worldClick}=c;
 const facts=()=>page.evaluate(ids=>window.__nativeJourney.wallDoorFacts(ids),prepared.ledger.ids),url=new URL('/',origin);url.searchParams.set('e2e','1');url.searchParams.set('ui','native');
 await phase('ordinary-gamesession-import-paid-wall');await Promise.race([journey.routeFailure,page.goto(url.href,{waitUntil:'domcontentloaded',timeout:Math.min(60000,journey.remaining())})]);await wait(()=>window.__nativeJourney?.ready,null,60000);await page.evaluate(data=>window.__nativeJourney.load(data),prepared.data);await ready();
 const input=await exportWhole('paid-wall-loaded-exact');assert.equal(input.sha256,sha(prepared.data));assert.deepEqual(input.parsed,JSON.parse(prepared.data));assert.equal(await page.locator('button,select,input,dialog').count(),0);
 const initial=await facts();assert.equal(initial.wall.kind,'wall');assert.equal(initial.wall.material,'wood');assert.equal(initial.wood.length,0);assert.equal(initial.deconstruction,null);assert.ok(initial.steel.every(p=>p.forbidden));report.before=initial;report.preferencesBefore=await page.evaluate(()=>window.__nativeJourney.preferences);await capture('paid-wooden-wall-1440x1000',facts);

 await phase('native-architect-steel-door-plan-over-intact-wall');await management('architect');await wait(()=>window.__nativeJourney.model?.id==='architect');await click('category-structure');await click('tool-door-select');
 // Choosing the construction collapses Architect. Reopen to choose its real
 // material and then select the same tool to return to placement on the map.
 await management('architect');await wait(()=>window.__nativeJourney.model?.id==='architect');await reveal('tool-door-material');await click('tool-door-material');await click('select-option:tool-door-material:steel');await click('tool-door-select');
 await worldClick(prepared.ledger.cells.wall);await wait(ids=>!!window.__nativeJourney.wallDoorFacts(ids)?.plan&&!window.__nativeJourney.state.waiting,prepared.ledger.ids);await close();await ready();
 const planned=await exportWhole('plan-over-intact-wall-before-work'),plannedFacts=await facts(),planId=plannedFacts.plan.id,deconstructionId=plannedFacts.deconstruction.id;report.planIds={planId,deconstructionId};assert.notEqual(planId,deconstructionId);assert.notEqual(planId,initial.wall.id);assert.deepEqual(plannedFacts.wall,initial.wall);assert.equal(plannedFacts.plan.kind,'door');assert.equal(plannedFacts.plan.material,'steel');assert.equal(plannedFacts.deconstruction.progress,0);assert.equal(plannedFacts.deconstruction.reservedBy,null);assert.equal(plannedFacts.jobs.length,1);assert.equal(plannedFacts.steel.reduce((n,p)=>n+p.quantity,0),65);assert.deepEqual(planned.parsed.piles,input.parsed.piles);
 for(const viewport of [{width:1440,height:1000},{width:960,height:800}]){await page.setViewportSize(viewport);await capture('future-steel-door-over-paid-wall-'+viewport.width+'x'+viewport.height,facts);}await page.setViewportSize({width:1440,height:1000});
 // A world click inspects the standing wall. Its native control selects the
 // independent future identity; outside clicks keep their ordinary dismissal.
 await wait(cell=>{const p=window.__nativeJourney.cellPoint(cell);return p?.visible&&!p.blocked&&p.hit?.x===cell.x&&p.hit?.z===cell.z;},prepared.ledger.cells.wall);
 await worldClick(prepared.ledger.cells.wall);await wait(()=>window.__nativeJourney.model?.id?.startsWith('inspect-structure-'));
 await reveal('wall-door-inspect-job-'+planId);await click('wall-door-inspect-job-'+planId);await wait(id=>window.__nativeJourney.model?.id==='inspect-job-'+id,planId);
 assert.equal((await model())?.id,'inspect-job-'+planId);const selectedPlan=await facts();assert.deepEqual(selectedPlan.selection.object,{kind:'job',id:planId});assert.deepEqual(selectedPlan.selection.cell,prepared.ledger.cells.wall);assert.equal(selectedPlan.selection.markerVisible,true);await capture('native-future-plan-inspector',facts);await close();
 await page.evaluate(data=>window.__nativeJourney.load(data),planned.data);await ready();const planReload=await exportWhole('plan-over-wall-reloaded-exact');assert.equal(planReload.sha256,planned.sha256);assert.deepEqual(planReload.parsed,planned.parsed);report.checks.push('Paid finished wall from actual finite construction; native Architect steel-door placement preserves wall, independent future identity, native plan inspection and both viewport captures; exact whole reload before assignment');

 await phase('actual-contact-deconstruction-with-forbidden-door-material');await click('hud:speed:1');
 await wait(ids=>{const f=window.__nativeJourney.wallDoorFacts(ids);if(!f)return false;const out=window.__nativeJourney.wallDoorObservations;if(out.at(-1)?.tick!==f.tick)out.push(f);return f.deconstruction?.progress>0;},prepared.ledger.ids,30000);await click('hud:speed:0');await ready();
 const atContact=await exportWhole('real-wall-contact-work'),contactFacts=await facts();report.contact=contactFacts;assert.ok(contactFacts.wall);assert.ok(contactFacts.deconstruction.progress>0);const worker=contactFacts.pawns.find(p=>p.id===contactFacts.deconstruction.reservedBy);assert.ok(worker);assert.equal(Math.abs(worker.x-16)+Math.abs(worker.z-16),1);assert.ok(contactFacts.steel.every(p=>p.forbidden&&p.owner.type==='ground'));await capture('native-real-wall-deconstruction-contact',facts);
 await page.evaluate(data=>window.__nativeJourney.load(data),atContact.data);await ready();const contactReload=await exportWhole('real-contact-work-reloaded-exact');assert.equal(contactReload.sha256,atContact.sha256);
 await click('hud:speed:1');await wait(ids=>!window.__nativeJourney.wallDoorFacts(ids)?.wall,prepared.ledger.ids,30000);await click('hud:speed:0');await ready();
 const open=await exportWhole('wall-removed-ordinary-door-blueprint'),openFacts=await facts();report.open=openFacts;assert.equal(openFacts.wall,null);assert.equal(openFacts.deconstruction,null);assert.equal(openFacts.door,null);assert.equal(openFacts.jobs.length,1);assert.deepEqual(openFacts.jobs[0],{id:planId,kind:'door',construction:'blueprint',material:'steel',progress:0,status:'pending',reservedBy:null,escrow:openFacts.jobs[0].escrow,steelDelivered:0});assert.equal(openFacts.jobs[0].steelDelivered,0);assert.equal(openFacts.deconstructed.count,1);const refund=openFacts.wood.reduce((n,p)=>n+p.quantity,0);assert.ok([2,3].includes(refund));assert.equal(refund+openFacts.deconstructed.lostWood,5);assert.ok(openFacts.pawns.every(p=>p.jobId!==deconstructionId&&p.orders.active!==deconstructionId&&!p.orders.queue.includes(deconstructionId)));await capture('native-open-ordinary-door-blueprint',facts);
 await page.evaluate(data=>window.__nativeJourney.load(data),open.data);await ready();const openReload=await exportWhole('open-phase-reloaded-exact');assert.equal(openReload.sha256,open.sha256);assert.deepEqual(openReload.parsed,open.parsed);report.checks.push('Real pawn contact/work removes old wall without access to door steel, old wood refund2or3 plus loss ledger equals5, actual open ordinary blueprint keeps reserved plan ID, old work references purged; exact whole reload during work and open phase');

 await phase('native-permission-unlocks-finite-steel-and-real-delivery-frame-work');await close();await worldClick(prepared.ledger.cells.steel);await wait(id=>window.__nativeJourney.model?.id==='inspect-pile-'+id,prepared.ledger.ids.steelId);await reveal('object-action-material-permission');await click('object-action-material-permission');await wait(ids=>window.__nativeJourney.wallDoorFacts(ids)?.steel.every(p=>!p.forbidden)&&!window.__nativeJourney.state.waiting,prepared.ledger.ids);await close();
 const unlocked=await exportWhole('native-steel-allowed');const expectedUnlocked=structuredClone(open.parsed);delete expectedUnlocked.piles.find(p=>p.id===prepared.ledger.ids.steelId).forbidden;assert.deepEqual(unlocked.parsed,expectedUnlocked);
 await click('hud:speed:1');await wait(({ids,planId})=>{const f=window.__nativeJourney.wallDoorFacts(ids);if(!f)return false;const out=window.__nativeJourney.wallDoorObservations;if(out.at(-1)?.tick!==f.tick)out.push(f);return f.pawns.some(p=>p.haul?.destination.type==='job'&&p.haul.destination.jobId===planId);},{ids:prepared.ledger.ids,planId},30000);await click('hud:speed:0');await ready();const hauling=await exportWhole('actual-door-material-hauling');report.hauling=await facts();assert.ok(report.hauling.pawns.some(p=>p.haul?.destination.type==='job'&&p.haul.destination.jobId===planId));
 await page.evaluate(data=>window.__nativeJourney.load(data),hauling.data);await ready();assert.equal((await exportWhole('actual-hauling-reloaded-exact')).sha256,hauling.sha256);
 // An ordinary frame starts at the first real delivery. This checkpoint
 // observes all 25 steel physically inside it, not the first partial load or
 // the wood/food-only escrow summary retained for historical saves.
 await click('hud:speed:1');await wait(({ids,planId})=>window.__nativeJourney.wallDoorFacts(ids)?.jobs.some(j=>j.id===planId&&j.construction==='frame'&&j.steelDelivered===25),{ids:prepared.ledger.ids,planId},30000);await click('hud:speed:0');await ready();const frame=await exportWhole('door-paid-frame');report.frame=await facts();assert.equal(report.frame.jobs[0].steelDelivered,25);assert.equal(report.frame.steel.reduce((n,p)=>n+p.quantity,0),65);await capture('native-door-paid-frame',facts);
 await page.evaluate(data=>window.__nativeJourney.load(data),frame.data);await ready();assert.equal((await exportWhole('paid-frame-reloaded-exact')).sha256,frame.sha256);
 await click('hud:speed:1');await wait(({ids,planId})=>{const f=window.__nativeJourney.wallDoorFacts(ids);return !f?.door&&f?.jobs.some(j=>j.id===planId&&j.construction==='frame'&&j.steelDelivered===25&&j.progress>0&&f.pawns.some(p=>p.id===j.reservedBy&&p.jobId===j.id&&p.state==='working'));},{ids:prepared.ledger.ids,planId},30000);await click('hud:speed:0');await ready();
 const work=await exportWhole('actual-paid-door-construction-work');report.work=await facts();assert.equal(report.work.wall,null);assert.equal(report.work.door,null);assert.ok(report.work.jobs[0].progress>0);assert.equal(report.work.jobs[0].steelDelivered,25);await capture('native-paid-door-construction-work',facts);
 await page.evaluate(data=>window.__nativeJourney.load(data),work.data);await ready();assert.equal((await exportWhole('actual-paid-door-work-reloaded-exact')).sha256,work.sha256);
 await click('hud:speed:3');await wait(ids=>!!window.__nativeJourney.wallDoorFacts(ids)?.door,prepared.ledger.ids,45000);await click('hud:speed:0');await ready();const complete=await exportWhole('native-finished-steel-door');report.complete=await facts();assert.equal(report.complete.door.material,'steel');assert.equal(report.complete.jobs.length,0);assert.equal(report.complete.steel.reduce((n,p)=>n+p.quantity,0),40);assert.equal(report.complete.wood.reduce((n,p)=>n+p.quantity,0),refund);assert.equal(report.complete.deconstructed.count,1);await capture('native-finished-steel-door-1440x1000',facts);
 await page.evaluate(data=>window.__nativeJourney.load(data),complete.data);await ready();const reloaded=await exportWhole('native-complete-reloaded-exact');assert.equal(reloaded.sha256,complete.sha256);assert.deepEqual(reloaded.parsed,complete.parsed);assert.deepEqual(await page.evaluate(()=>window.__nativeJourney.preferences),report.preferencesBefore);report.observations=await page.evaluate(()=>window.__nativeJourney.wallDoorObservations);report.checks.push('Native permission changes only the prepared finite steel permission, real hauling and paid25steel frame then ordinary work completes steel door; remaining40steel and recovered wood conserved; exact whole reload during haul/frame/complete and preferences preserved');
 await journey.verify();assert.deepEqual(report.errors,[]);assert.deepEqual(report.pageErrors,[]);report.status='passed';await phase('complete');
}catch(error){report.status='failed';report.failure=String(error?.stack??error);throw error;}
finally{await journey?.close();await persist();console.log(JSON.stringify({folder,status:report.status,phase:report.phase}));}
