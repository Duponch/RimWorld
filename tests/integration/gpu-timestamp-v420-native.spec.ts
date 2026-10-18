import {test,expect,type Page} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../../src/sim/serialization';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {harness414,sha414} from './owners-v414-native-helper';
import {panel,pause} from './helpers';
import {installFoundationPerformanceProbe419,captureFoundationPerformance419,assertSameFoundationView419,type FoundationPerformanceCapture419} from './performance-after-demo-v419';

const INPUTS=[{label:'A-aulnes10733',pathEnv:'GPU420_A_INPUT',shaEnv:'GPU420_A_RAW_SHA256',sha:'19bd59c90dfbae4983d04cb6eae95a2eb728cd61b59b19172c37366e7704be47',tick:10733},{label:'B-created35-before-patrimony',pathEnv:'GPU420_B_INPUT',shaEnv:'GPU420_B_RAW_SHA256',sha:'748409f4b5ceba787fd59db233c2580433895cd530a077ac3fa9a1d885392df0',tick:35}]as const;
const NOTICE='After the actual demonstration only: four sequential2s native timestamp-query windows (pause/x1 per immutable real input), each preceded by constant1s warm-up. Two different actual workloads, not a causal A/B, render-pass GPU sums only; no worker-total/native-encode/IPC/whole-device GPU duration, no FPS threshold. Private diagnostic copies only; no factory/helper, person/work/terrain/health edits, extra colony, replayed demonstration or public instrumentation.';
test.skip(process.env.GPU420_NATIVE!=='1','ROOT opt-in only AFTER delivered demonstration; mandatory two actual path+decoded-RAW-SHA inputs.');
type Camera=FoundationPerformanceCapture419['start']['camera'];
const context=(page:Page)=>page.evaluate(()=>((window as unknown as {__performanceAudit:{context():FoundationPerformanceCapture419['start']}}).__performanceAudit.context()));

async function settings(page:Page){
 await pause(page);await panel(page,'menu');
 for(const id of ['textures-enabled','ground-grass-enabled','diorama-enabled','room-enabled','decor-occlusion-enabled'])await page.locator('#'+id).setChecked(true);
 for(const id of ['sound-enabled','music-enabled'])await page.locator('#'+id).setChecked(false);
 await page.locator('#game-performance-balanced').click();await page.locator('#lighting-reset').click();
 await expect(page.locator('#game-shadow-frequency')).toHaveValue('60');await expect(page.locator('#game-shadow-resolution')).toHaveValue('2048');await expect(page.locator('#game-animation-enabled')).toBeChecked();
 for(const [id,n]of [['game-animation-near','24'],['game-animation-far','8'],['game-animation-frequency','12'],['lighting-sun','100'],['lighting-moon','100'],['lighting-ambient','100']]as const)await expect(page.locator('#'+id)).toHaveValue(n);
 await page.keyboard.press('Escape');
 for(const [id,pressed]of [['wall-cutaway','false'],['roof-toggle','false'],['foliage-toggle','false'],['zones-toggle','false']]as const){const node=page.locator('#'+id);if(await node.getAttribute('aria-pressed')!==pressed)await node.click();await expect(node).toHaveAttribute('aria-pressed',pressed);}
 if((await context(page)).camera.mode!=='orthographic')await page.locator('#camera-mode').click();
}
/** Existing V397 pointer/wheel restore: numeric camera is READ, never set by an API. */
async function restoreCamera(page:Page,target:Camera){
 await pause(page);await page.keyboard.press('Escape');
 if((await context(page)).camera.mode!==target.mode)await page.locator('#camera-mode').click();
 const anchor=await page.evaluate(()=>{const c=document.querySelector<HTMLCanvasElement>('#viewport canvas')!,b=c.getBoundingClientRect();for(let y=b.top+90;y<b.bottom-120;y+=30)for(let x=b.left+b.width*.55;x<b.right-30;x+=30)if(document.elementFromPoint(x,y)===c)return {x,y};throw Error('No actual uncovered camera gesture point');});
 for(let n=0;n<4;n++){const current=(await context(page)).camera,ratio=target.span/current.span;if(Math.abs(ratio-1)<.00001)break;await page.mouse.move(anchor.x,anchor.y);await page.mouse.wheel(0,Math.log(ratio)/-Math.log(.95)*100);await page.waitForTimeout(250);}
 for(let n=0;n<24;n++){const offset=await page.evaluate(target=>{const b=document.querySelector('#viewport canvas')!.getBoundingClientRect(),p=window.__lisiere.projectCell(target[0]!,target[2]!);return {dx:b.width/2-p.x,dy:b.height/2-p.y};},target.target);if(Math.hypot(offset.dx,offset.dy)<.005)break;await page.mouse.move(anchor.x,anchor.y);await page.mouse.down({button:'middle'});await page.mouse.move(anchor.x+Math.max(-300,Math.min(300,offset.dx)),anchor.y+Math.max(-180,Math.min(180,offset.dy)),{steps:8});await page.mouse.up({button:'middle'});await page.waitForTimeout(250);}
 await page.waitForTimeout(500);
}

test('two real250 homes: only four short timestamp-query pause/x1 windows, preserved complete before/after states',async({page},info)=>{
 const sources=INPUTS.map(row=>{const path=process.env[row.pathEnv],sha=process.env[row.shaEnv];if(!path||!isAbsolute(path)||!sha||!/^[a-f0-9]{64}$/.test(sha)||sha!==row.sha)throw Error('Exact immutable '+row.label+' path and decoded RAW SHA required; no fallback');return {...row,path,sha};});
 await installFoundationPerformanceProbe419(page);const h=await harness414(page,info,NOTICE,{exactAdoptionOnce415:true});
 const captures:FoundationPerformanceCapture419[]=[],checkpoints:object[]=[];let reference:Camera|undefined,loaded=false;
 h.proof.inputs=sources;h.proof.status='PREPARED_DIAGNOSTIC_RUNNING_NOT_GAMEPLAY_PROGRESSION';
 h.proof.deliveryMode=process.env.GPU420_PREINSTRUMENTED==='1'?'ROOT_PRIVATE_COMPILED_PROBE_NOT_COMPARABLE_TO_CPU_DEV_BASELINE':'PRIVATE_DEV_ROUTE_WITH_NATIVE_HMR_ERRORS_UNFILTERED';
 try{
  for(const source of sources){
   // Release each admitted World before loading the other input; reports contain
   // only scalar context, timings and file receipts, never a retained full World.
   await(async()=>{
    loaded=false;h.proof.currentInput=source.label;
    const bytes=await readFile(source.path,'utf8'),raw=await decodeStoredSave(bytes);expect(sha414(raw)).toBe(source.sha);
    const root=deserializeCampaign(raw);if(!('tiles'in root)||!root.worldMaps)throw Error('Actual registered loaded map required');expect(validateWorld(root)).toEqual([]);expect(root.tick).toBe(source.tick);expect([root.width,root.height]).toEqual([250,250]);expect(root.worldMaps.sites.map(s=>({id:s.id,kind:s.kind}))).toEqual([{id:0,kind:'settlement'}]);
    if(source.tick===35){expect(root.pawns).toHaveLength(3);expect(root.jobs).toHaveLength(0);expect(root.startingArrival?.phase).toBe('opened');expect(root.worldGroups!.groups).toHaveLength(0);}
    const canonical=serializeCampaign(root),originalSchema=Number(raw.match(/^\{"schemaVersion":(\d+),/)?.[1]);
    loaded=false;await h.load(source.path,root);loaded=true;await settings(page);if(reference)await restoreCamera(page,reference);else reference=(await context(page)).camera;
    const before=await h.exported(source.label+'-00-before-windows');expect(before.canonical).toBe(canonical);checkpoints.push({label:source.label,stage:'before',sourceSchema:originalSchema,admittedSchema:root.schemaVersion,tick:before.root.tick,path:before.path,sha256:before.fileSHA256,sourceFileSHA256:sha414(bytes),sourceDecodedRAWSHA256:source.sha});
    await page.keyboard.press('Escape');
    const paused=await captureFoundationPerformance419(page,{label:source.label+'-pause',speed:0,windowMs:2000,gpu420:true});captures.push(paused);await writeFile(info.outputPath(source.label+'-pause.json'),JSON.stringify(paused,null,2));
    const playing=await captureFoundationPerformance419(page,{label:source.label+'-x1',speed:1,windowMs:2000,gpu420:true});captures.push(playing);await writeFile(info.outputPath(source.label+'-x1.json'),JSON.stringify(playing,null,2));
    // Export outside timing even if the paired-view assertion is about to fail.
    const after=await h.exported(source.label+'-01-last-real-after-windows');expect(after.root.tick).toBeGreaterThanOrEqual(before.root.tick);expect(after.root.tick).toBeGreaterThanOrEqual(playing.end.tick);if(after.root.tick===before.root.tick)expect(after.canonical).toBe(before.canonical);
    checkpoints.push({label:source.label,stage:'after',tick:after.root.tick,path:after.path,sha256:after.fileSHA256,advanced:after.root.tick>before.root.tick,notice:'Real diagnostic copy advancement including constant x1 warm-up and pause acknowledgement; never a new demonstration checkpoint.'});h.proof.latestDiagnosticContinuation={path:after.path,sha256:after.fileSHA256,tick:after.root.tick};
    for(const observed of [paused,playing]){expect(observed.gpu420?.raw.complete,JSON.stringify(observed.gpu420?.raw.errors)).toBe(true);expect(observed.gpu420!.raw.frames.length).toBeGreaterThan(0);expect(observed.gpu420!.passSumPerFreshFrameMs).not.toBeNull();}
    assertSameFoundationView419(paused,playing,false); // actual captures, paired speeds intentionally differ
    h.actualGPU();expect(sha414(await readFile(source.path,'utf8'))).toBe(sha414(bytes));
   })();
  }
  expect(captures).toHaveLength(4);assertSameFoundationView419(captures[0]!,captures[2]!);assertSameFoundationView419(captures[1]!,captures[3]!);
  await h.finish();h.proof.completeDiagnosticOnly=true;h.proof.status='FOUR_GPU_PASS_WINDOWS_OBSERVED_NO_PERFORMANCE_THRESHOLD';
 }catch(error){h.proof.complete=false;h.proof.completeDiagnosticOnly=false;h.proof.status='REFUSED_OR_PARTIAL_DIAGNOSTIC_NO_FAVOURABLE_RERUN';if(loaded)await h.failure(error);else h.proof.error=String(error);throw error;}finally{
  h.proof.referenceCamera=reference;h.proof.checkpoints=checkpoints;h.proof.results=captures;h.proof.unmeasured={gpuMs:null,workerTotalMs:null,nativeEncodeMs:null,nativeIPCTransitMs:null};h.proof.notice=NOTICE;await writeFile(info.outputPath('gpu-timestamp-summary.json'),JSON.stringify({notice:NOTICE,checkpoints,captures,unmeasured:h.proof.unmeasured},null,2));await h.save();
 }
});
