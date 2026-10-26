// ROOT only after the shared scenario and contracts pass. Ordinary native UI;
// no injected commands, live World edits or shortened reading duration.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {sha,openNativeGameJourney,nativeGameControls} from './native-game-journey.mjs';

const driverPath=fileURLToPath(import.meta.url),root=resolve(dirname(driverPath),'..');
const option=(n,f)=>process.argv.find(v=>v.startsWith('--'+n+'='))?.slice(n.length+3)??f;
const origin=new URL(option('origin','http://127.0.0.1:5196')),budgetMs=Number(option('budget-seconds','240'))*1000;
const resumePath=option('resume','');
let resume;
if(resumePath){
 const path=resolve(root,resumePath),bytes=await readFile(path),previous=JSON.parse(bytes);
 assert.equal(sha(bytes),'95849eda479f34320ac54c6e4ed5e212686ecdec198e58ab59f4c3af1c1c54f2');assert.equal(previous.protocol,'native-game-journey-novel-v482-1');assert.equal(previous.status,'failed');assert.equal(previous.phase,'reload-exact-played-reading-and-preferences');
 const row=previous.saves.find(s=>s.label==='reloaded-manual-reading-exact');assert.ok(row);const save=await readFile(row.path);assert.equal(sha(save),'cdeeee40b28d591f1f0295ab9b6020e5601f9668681d9742bf4d3f25e60551f8');assert.equal(sha(save),row.sha256);
 resume={path,sha256:sha(bytes),previous,row,data:save.toString('utf8')};
}
const folder=resolve(root,'tmp/novel-v482','native-'+new Date().toISOString().replaceAll(':','-')+'-'+process.pid);await mkdir(folder,{recursive:true});
const oldReportPath=resolve(root,'tmp/toxic-fallout-v481/native-2026-10-26T04-01-45.763Z-26724/report.json');
const oldReportBytes=await readFile(oldReportPath),oldReport=JSON.parse(oldReportBytes);assert.equal(sha(oldReportBytes),'f58dd98528cdee4acc2a62d937c51f1d24895df5ef97c24750fa0ac7e69db6e0');assert.equal(oldReport.status,'passed');
const oldRow=oldReport.saves.find(s=>s.label==='played-dose-paused');assert.ok(oldRow);const oldBytes=await readFile(oldRow.path),old=JSON.parse(oldBytes);
assert.equal(sha(oldBytes),'71965d8d91399346f793cd19af49f2954096ac2ae87fd8e09e3e17f6fcc89da2');assert.equal(sha(oldBytes),oldRow.sha256);assert.equal(old.schemaVersion,294);assert.ok(old.miscIncidents?.toxicFallout?.active);
const report={protocol:'native-game-journey-novel-v482-1',created:new Date().toISOString(),folder,origin:origin.href,browserPath:option('browser','.playwright/chromium-1243/chrome-win64/chrome.exe'),phases:[],served:[],captures:[],saves:[],checks:[],errors:[],pageErrors:[],
 legacy:{reportPath:oldReportPath,reportSHA256:sha(oldReportBytes),path:oldRow.path,sha256:sha(oldBytes),schema:294,tick:old.tick},
 limits:['Prepared tick0 shared property: flat32-square camp, adult constructors with original health/skills/needs, completed communication/power/seating/storage and1500silver. No earlier construction, purchase, capsule arrival, pickup or reading is claimed at preparation.',
 'Actual orbital contact, basket quotation, payment, capsule arrival, inspector order, walking, pickup, seating, reading and interruption use native controls and the existing GameSession. Probes only read facts and GPU input attributes; they never write a live World or inject a command.',
 'This bounded native journey interrupts one real manual session after actual gains. It does not shorten500/800 or claim a completed reading session here; duration and successful storage completion belong to separate SIM contracts.',
 'Paused whole exports, reload and policy assignment are exact. The real archived294 active condition migrates by schema number only without creating books, policy/tolerance state or retrospective XP. No FPS, CPU/GPU cost or physical VRAM conclusion follows.']};
const persist=()=>writeFile(resolve(folder,'report.json'),JSON.stringify(report,null,2));
const phase=async name=>{report.phase=name;report.phases.push({name,at:new Date().toISOString()});await persist();console.log(JSON.stringify({phase:name}));};
const preparationHTML=String.raw`<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><title>Préparation déclarée Romans V482</title><script type="module">
try {const {prepareNovelScenario482}=await import('/tests/scenarios/novel-v482.ts');const {serializeCampaign}=await import('/src/sim/serialization.ts');const {world,...ledger}=prepareNovelScenario482();window.__novelPrepared={data:serializeCampaign(world),ledger,schema:world.schemaVersion,tick:world.tick};}catch(error){window.__novelPrepareError=String(error?.stack??error);}
</script>`;
report.preparationHTMLSHA=sha(preparationHTML);await writeFile(resolve(folder,'preparation.html'),preparationHTML);
const featureHook=String.raw`
window.__nativeJourney.novelFacts=ids=>{
 const w=snapshot;if(!w)return null;const p=w.pawns.find(p=>p.id===ids.readerId),book=w.piles.find(p=>p.id===ids.bookId);
 const slot=renderer?.pawns?.pawnIndices?.get(ids.readerId),motion=renderer?.pawns?.feedbackSource?.getAttribute('aMotion'),cargo=renderer?.pawns?.feedbackSource?.getAttribute('aCargo');
 return {schema:w.schemaVersion,tick:w.tick,reader:p?{id:p.id,name:p.name,x:p.x,z:p.z,state:p.state,motion:p.motion,joy:p.recreation.level,tolerance:p.recreation.tolerance,policy:p.readingPolicy295,task:p.recreation.task,intellectual:p.skills.intellectual,memories:p.memories,trade:p.orbitalTrade}:null,
  book:book?{id:book.id,kind:book.kind,item:book.item,quantity:book.quantity,owner:book.owner,damage:book.damage??0,book:book.book}:null,
  bookCopies:w.piles.filter(p=>p.id===ids.bookId).length,silver:w.piles.filter(p=>p.item==='silver'&&p.owner.type==='ground').reduce((n,p)=>n+p.quantity,0),pending:w.orbital?.pending??[],receipt:w.trade?.recent?.at(-1),
  gpu:slot===undefined?null:{slot,activity:motion?.getY(slot),cargoKind:cargo?.getX(slot)}};
};
window.__nativeJourney.novelObservations=[];
`;
let journey,page;
await persist();
try{
 journey=await openNativeGameJourney({root,origin,budgetMs,report,persist,driverPath,scenarioPaths:['tests/scenarios/novel-v482.ts'],hook:featureHook,preparation:{path:'/__novel-prepare-v482.html',html:preparationHTML}});
 let prepared;
 if(resume){
  await phase('join-preserved-native-acquisitions');
  assert.deepEqual(Object.keys(journey.sources).sort(),Object.keys(resume.previous.sources).sort());
  const changes=Object.keys(journey.sources).filter(k=>journey.sources[k]!==resume.previous.sources[k]).sort();
  assert.deepEqual(changes,['scripts/novel-game-v482.mjs','src/sim/player-orders.ts'],'only the resume driver and manual clear-orders product fix changed');
  const reusedSaves=[],reusedCaptures=[];
  for(const row of resume.previous.saves){assert.equal(sha(await readFile(row.path)),row.sha256);reusedSaves.push(row);}
  for(const row of resume.previous.captures){assert.equal(sha(await readFile(row.path)),row.sha256);reusedCaptures.push({label:row.label,path:row.path,sha256:row.sha256});}
  report.resume={reportPath:resume.path,reportSHA256:resume.sha256,checkpoint:resume.row,sourceChanges:changes.map(path=>({path,before:resume.previous.sources[path],after:journey.sources[path]})),reusedSaves,reusedCaptures,reusedChecks:resume.previous.checks};
  const original=JSON.parse(resume.data);assert.equal(original.schemaVersion,295);assert.equal(original.tick,64);
  prepared={data:resume.data,ledger:resume.previous.preparation,schema:295,tick:original.tick};
 }else{
  await phase('prepare-unpurchased-original-stock');
  const preparer=await journey.newPage();await Promise.race([journey.routeFailure,preparer.goto(new URL('/__novel-prepare-v482.html',origin).href,{waitUntil:'domcontentloaded',timeout:Math.min(60000,journey.remaining())})]);
  await Promise.race([journey.routeFailure,preparer.waitForFunction(()=>window.__novelPrepared||window.__novelPrepareError,null,{timeout:Math.min(60000,journey.remaining())})]);
  assert.equal(await preparer.evaluate(()=>window.__novelPrepareError),undefined);prepared=await preparer.evaluate(()=>window.__novelPrepared);await preparer.close();
  assert.equal(prepared.schema,295);assert.equal(prepared.tick,0);
 }
 report.preparation=prepared.ledger;
 const inputPath=resolve(folder,'prepared-input.json');await writeFile(inputPath,prepared.data);report.input={path:inputPath,sha256:sha(prepared.data),bytes:Buffer.byteLength(prepared.data),schema:295,tick:prepared.tick};
 page=await journey.newPage();const c=nativeGameControls({page,journey,report,persist,schema:295}),{wait,ready,ui,model,click,close,reveal,capture,exportWhole,management,worldClick}=c;
 const facts=()=>page.evaluate(ids=>window.__nativeJourney.novelFacts(ids),prepared.ledger.ids),url=new URL('/',origin);url.searchParams.set('e2e','1');url.searchParams.set('ui','native');
 await phase('ordinary-gamesession-import');await Promise.race([journey.routeFailure,page.goto(url.href,{waitUntil:'domcontentloaded',timeout:Math.min(60000,journey.remaining())})]);
 await wait(()=>window.__nativeJourney?.ready,null,60000);await page.evaluate(data=>window.__nativeJourney.load(data),prepared.data);await ready();
 const input=await exportWhole(resume?'loaded-resume-checkpoint-exact':'loaded-unpurchased-exact');assert.equal(input.sha256,sha(prepared.data));assert.deepEqual(input.parsed,JSON.parse(prepared.data));
 const initialFacts=await facts();report.before=initialFacts;
 const audio=await page.evaluate(()=>window.__nativeJourney.state);for(const k of ['soundEnabled','musicEnabled'])assert.equal(audio[k],false);for(const k of ['soundVolume','musicVolume'])assert.equal(audio[k],0);assert.equal(await page.locator('button,select,input,dialog').count(),0);
 report.preferencesBefore=await page.evaluate(()=>window.__nativeJourney.preferences);
 let active;
 if(!resume){
 assert.equal(initialFacts.book.owner.type,'orbital-ship');assert.equal(initialFacts.silver,1500);assert.equal(initialFacts.reader.task,null);
 await phase('native-orbital-contact-and-priced-basket');await worldClick(prepared.ledger.cells.console);await wait(id=>window.__nativeJourney.model?.id==='inspect-structure-'+id,prepared.ledger.ids.consoleId);await reveal('special-orbital-trade');await click('special-orbital-trade');
 await wait(()=>window.__nativeJourney.model?.id==='native-local-trade-orbital');await click('native-local-trade-negotiator-'+prepared.ledger.ids.readerId);await click('native-local-trade-partner-'+prepared.ledger.ids.shipId);await click('native-local-trade-approach');
 await wait(ids=>window.__nativeJourney.novelFacts(ids)?.reader.trade?.phase==='ready'&&window.__nativeJourney.state.speed===0&&!window.__nativeJourney.state.waiting,prepared.ledger.ids,35000);await ready();
 const contact=await exportWhole('actual-contact-paused'),goodId='native-local-trade-good-pile:'+prepared.ledger.ids.bookId;
 const good=(await model()).rows.find(r=>r.id===goodId);assert.ok(good,'actual original Novel in the native orbital stock');assert.ok(good.label.includes(prepared.ledger.baseline.book.title));
 await reveal(goodId+'-more');await click(goodId+'-more');await reveal('native-local-trade-check-quote');await click('native-local-trade-check-quote');await wait(()=>window.__nativeJourney.model?.id==='native-local-trade-confirm');
 const confirmation=await model(),total=confirmation.rows.find(r=>r.id==='native-local-trade-confirmed-total');assert.equal(total?.label,'À payer');assert.ok(confirmation.rows.some(r=>r.id==='native-local-trade-confirmed-pile:'+prepared.ledger.ids.bookId&&r.value==='Acheter × 1'));
 report.quotedTotal=total.value;await capture('native-actual-orbital-quote-1440x1000',facts);await click('native-local-trade-confirm-apply');
 await wait(ids=>window.__nativeJourney.novelFacts(ids)?.book?.owner.type==='ground',prepared.ledger.ids,20000);await click('hud:speed:0');await ready();
 const delivered=await exportWhole('paid-and-landed-original');report.delivery=await facts();const receipt=delivered.parsed.trade?.recent?.at(-1);
 // The authoritative currency delta and basket quote must agree. Price wording
 // is display-local; the saved actual receipt supplies the exact integer.
 const paid=contact.parsed.piles.filter(p=>p.item==='silver'&&p.owner.type==='ground').reduce((n,p)=>n+p.quantity,0)-report.delivery.silver;
 assert.ok(Number.isSafeInteger(paid)&&paid>0);report.paid=paid;report.savedReceipt=receipt;
 assert.equal(receipt?.silver,paid);assert.ok(receipt.lines.some(line=>line.item==='novel'&&line.quantity===1));assert.equal(delivered.parsed.trade.bought.novel,1);
 const quoteNumber=Number(total.value.replace(/[^0-9,.-]/g,'').replace(',','.'));assert.equal(paid,quoteNumber);
 assert.equal(report.delivery.book.id,prepared.ledger.ids.bookId);assert.equal(report.delivery.bookCopies,1);assert.deepEqual(report.delivery.book.book,prepared.ledger.baseline.book);assert.equal(report.delivery.pending.length,0);
 assert.equal(report.delivery.reader.intellectual?.xp??0,initialFacts.reader.intellectual?.xp??0);report.checks.push('Actual native console contact, finite original Novel stock, quoted payment debited and real capsule arrival; no book or XP fabricated');

 await phase('native-inspector-reading-order');await close();const ground=report.delivery.book.owner;assert.equal(ground.type,'ground');await worldClick({x:ground.x,z:ground.z});
 await wait(id=>window.__nativeJourney.model?.id==='inspect-pile-'+id,prepared.ledger.ids.bookId);await reveal('book-read-select');await click('book-read-select');await click('select-option:book-read-select:'+prepared.ledger.ids.readerId);
 await wait(ids=>window.__nativeJourney.novelFacts(ids)?.reader.task?.activity==='read'&&window.__nativeJourney.novelFacts(ids)?.reader.task?.stage==='pickup'&&!window.__nativeJourney.state.waiting,prepared.ledger.ids);await close();
 const ordered=await exportWhole('reading-order-before-walking');assert.equal(ordered.parsed.pawns.find(p=>p.id===prepared.ledger.ids.readerId).recreation.task.manual,true);
 const xpBefore=(await facts()).reader.intellectual?.xp??0;await click('hud:speed:6');
 await wait(({ids,xpBefore})=>{const f=window.__nativeJourney.novelFacts(ids);if(!f)return false;const out=window.__nativeJourney.novelObservations;if(out.at(-1)?.tick!==f.tick)out.push(f);return f.reader.task?.stage==='read'&&f.reader.task.elapsed>=5&&f.reader.intellectual?.xp>xpBefore;},{ids:prepared.ledger.ids,xpBefore},35000);
 await click('hud:speed:0');await ready();active=await exportWhole('actual-active-reading');report.active=await facts();report.observations=await page.evaluate(()=>window.__nativeJourney.novelObservations);
 const transit=report.observations.filter(f=>f.reader.task?.stage==='pickup'||f.reader.task?.stage==='seat');assert.ok(transit.length,'observed actual pre-reading travel');assert.ok(transit.every(f=>(f.reader.intellectual?.xp??0)===xpBefore),'no XP before the actual read phase');
 assert.ok(transit.every(f=>f.reader.joy<=report.delivery.reader.joy),'no joy granted in pickup/seating');assert.ok(report.observations.some(f=>f.reader.task?.stage==='seat'&&f.book.owner.type==='pawn'),'same original book was carried while travelling to the seat');
 assert.equal(report.active.bookCopies,1);assert.equal(report.active.book.owner.type,'pawn');assert.equal(report.active.book.owner.pawnId,prepared.ledger.ids.readerId);assert.deepEqual(report.active.book.book,prepared.ledger.baseline.book);assert.ok(report.active.reader.joy>report.delivery.reader.joy);assert.equal(report.active.gpu?.activity,14,'resident GPU input selects the actual read pose/open-book branch');assert.ok(report.active.gpu?.cargoKind>0);
 await click('hud:pawn:'+prepared.ledger.ids.readerId);await close();for(const viewport of [{width:1440,height:1000},{width:960,height:800}]){await page.setViewportSize(viewport);await capture('original-held-open-book-'+viewport.width+'x'+viewport.height,facts);}await page.setViewportSize({width:1440,height:1000});
 const afterViews=await exportWhole('active-after-paused-views');assert.equal(afterViews.sha256,active.sha256);assert.deepEqual(afterViews.parsed,active.parsed);report.checks.push('Native inspector order, real pickup and seat trip without gain, active joy/XP from the one held original, current GPU reading input and both viewport captures');

 await phase('native-policy-does-not-interrupt-manual-reading');await management('assign');await wait(()=>window.__nativeJourney.model?.id==='assign');await reveal('assign-reading-'+prepared.ledger.ids.readerId);await click('assign-reading-'+prepared.ledger.ids.readerId);await wait(id=>window.__nativeJourney.model?.id==='reading-choice-'+id,prepared.ledger.ids.readerId);
 assert.deepEqual((await model()).rows.filter(r=>r.id==='1'||r.id==='2').map(r=>r.label),['Romans autorisés','Aucune lecture']);await click('2-choose');await wait(ids=>window.__nativeJourney.novelFacts(ids)?.reader.policy===2&&!window.__nativeJourney.state.waiting,prepared.ledger.ids);
 const policy=await exportWhole('manual-reading-policy-two');const expected=structuredClone(active.parsed);expected.pawns.find(p=>p.id===prepared.ledger.ids.readerId).readingPolicy295=2;assert.deepEqual(policy.parsed,expected);await capture('native-reading-policy-two-1440x1000',facts);
 await phase('reload-exact-played-reading-and-preferences');await page.evaluate(data=>window.__nativeJourney.load(data),policy.data);await ready();const reloaded=await exportWhole('reloaded-manual-reading-exact');assert.equal(reloaded.sha256,policy.sha256);assert.deepEqual(reloaded.parsed,policy.parsed);assert.deepEqual(await page.evaluate(()=>window.__nativeJourney.preferences),report.preferencesBefore);
 }else{
  await phase('resume-exact-played-manual-reading');active=input;report.active=initialFacts;
  assert.equal(initialFacts.reader.id,1);assert.equal(initialFacts.reader.policy,2);assert.equal(initialFacts.reader.task.bookId,56);assert.equal(initialFacts.reader.task.elapsed,5);assert.equal(initialFacts.reader.task.manual,true);assert.equal(initialFacts.book.owner.type,'pawn');assert.equal(initialFacts.book.owner.pawnId,1);
  assert.deepEqual(report.preferencesBefore,resume.previous.preferencesBefore);assert.equal(initialFacts.gpu?.activity,14);await capture('resumed-original-active-reading',facts);
  report.checks.push('Previous actual native purchase/delivery/travel/reading/policy2/exact whole reload and captures reused by exact report/file/source hashes; only player-orders product source changed');
 }
 await phase('native-clear-orders-interruption');
 await click('hud:pawn:'+prepared.ledger.ids.readerId);await reveal('clear-orders');await click('clear-orders');await wait(ids=>window.__nativeJourney.novelFacts(ids)?.reader.task===null&&!window.__nativeJourney.state.waiting,prepared.ledger.ids);
 const dropped=await exportWhole('native-interruption-original-dropped');report.dropped=await facts();assert.equal(report.dropped.book.owner.type,'ground');assert.equal(report.dropped.bookCopies,1);assert.deepEqual(report.dropped.book.book,report.active.book.book);assert.equal(report.dropped.book.damage,report.active.book.damage);assert.equal(report.dropped.reader.intellectual.xp,report.active.reader.intellectual.xp);assert.equal(report.dropped.reader.joy,report.active.reader.joy);assert.equal(dropped.parsed.tick,active.parsed.tick);await capture('native-interruption-same-original-dropped',facts);
 report.checks.push('Native shared policy catalog, manual task unaffected by automatic policy2, exact whole reload/preferences, native clear-orders interruption preserves acquired XP and drops the same reusable object');

 await phase('genuine-active294-migration-number-only');await page.evaluate(data=>window.__nativeJourney.load(data),oldBytes.toString('utf8'));await ready();const migrated=await exportWhole('active294-migrated-as295');const oldExpected=structuredClone(old);oldExpected.schemaVersion=295;assert.deepEqual(migrated.parsed,oldExpected);assert.equal(migrated.tick,old.tick);assert.deepEqual(migrated.parsed.miscIncidents.toxicFallout,old.miscIncidents.toxicFallout);
 assert.ok(migrated.parsed.pawns.every(p=>!Object.hasOwn(p,'readingPolicy295')&&!Object.hasOwn(p.recreation.tolerance,'reading')&&!Object.hasOwn(p.recreation.bored,'reading')));await page.waitForTimeout(180);const still=await exportWhole('active294-migrated-still-paused-exact');assert.equal(still.sha256,migrated.sha256);assert.deepEqual(await page.evaluate(()=>window.__nativeJourney.preferences),report.preferencesBefore);report.checks.push('Genuine archived294 active condition and entire campaign migrate295 by number only; paused import/inspection gives no book, policy, tolerance, RNG or XP');
 await journey.verify();assert.equal(sha(await readFile(oldReportPath)),report.legacy.reportSHA256);assert.equal(sha(await readFile(oldRow.path)),report.legacy.sha256);assert.deepEqual(report.errors,[]);assert.deepEqual(report.pageErrors,[]);report.status='passed';await phase('complete');
}catch(error){report.status='failed';report.failure=String(error?.stack??error);throw error;}
finally{await journey?.close();await persist();console.log(JSON.stringify({folder,status:report.status,phase:report.phase}));}
