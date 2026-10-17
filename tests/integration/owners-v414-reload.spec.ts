import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pause,panel,observeErrors} from './helpers';
import {inspectPerson} from './player-actions';

// This is the remaining read-only UI phase of A07. Formation/cancellation are
// already played; importing its actual complete export must not replay them.
test.skip(process.env.OWNERS414_NATIVE!=='1','ROOT only, actual A07 export and frozen native03 server required');
test('V414 A07 remainder: actual cancelled captive reload and dossier, no formation replay',async({page},info)=>{
 const path=process.env.OWNERS414_RELOAD_INPUT;
 if(!path)throw Error('Actual completed A07 export path required');
 const expected=await readFile(path,'utf8'),sha=(s:string)=>createHash('sha256').update(s).digest('hex');
 expect(sha(expected)).toBe('7067a0b1093feab8cc1502300838d630247df7d40cfe0de6e5edcd7173ed0bc5');
 const errors=observeErrors(page),hardware:unknown[]=[];
 const proof:Record<string,unknown>={complete:false,scope:'Read-only remainder after real A07 formation/cancel and completed exact reload exports; no commands replayed',input:{path,sha256:sha(expected)},pausedAt:1807};
 page.on('console',m=>{const prefix='Lisière renderer diagnostics';if(m.text().startsWith(prefix)){try{hardware.push(JSON.parse(m.text().slice(prefix.length).trim()));}catch{}}});
 try{
  await page.goto('/?e2e');const front=page.locator('.front-menu');
  await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
  await front.locator('input[type=file]').setInputFiles(path);
  await expect(front).toBeHidden({timeout:90_000});await expect(page.locator('#loading')).toHaveCount(0,{timeout:90_000});
  await pause(page);await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);
  const current=await page.evaluate(()=>({tick:window.__lisiere.world.tick,captive:window.__lisiere.world.pawns.find(p=>p.id===28366)?.prisoner,incident:window.__lisiere.incident}));
  expect(current.tick).toBe(1807);expect(current.captive).toBeDefined();
  expect(current.incident).toMatchObject({simulationStopped:false,graphicsFault:false,waiting:0});
  await inspectPerson(page,28366,'prisoner');
  await expect(page.locator('#inspector')).toHaveAttribute('data-colonist-inspector-pawn','28366');
  await page.screenshot({path:info.outputPath('02-same-captive-dossier-after-actual-A07-reload.png')});
  await panel(page,'menu');const pending=page.waitForEvent('download');
  await page.locator('[data-save-manager-action="export"]').click();
  const output=info.outputPath('capture-A07-remainder-exact.json');await(await pending).saveAs(output);
  const actual=await readFile(output,'utf8');
  // Entire admitted campaign, both maps, exact bytes. Avoid retaining several
  // hydrated campaign copies in the browser driver's process at the same time.
  expect(sha(actual)).toBe(sha(expected));
  expect(errors).toEqual([]);const gpu=hardware.at(-1) as {backend?:string;context?:string;adapter?:{vendor?:string;architecture?:string}}|undefined;
  expect(gpu?.backend).toBe('WebGPU');expect(gpu?.context).toBe('GPUCanvasContext');
  expect(gpu?.adapter?.vendor).toBeTruthy();expect(JSON.stringify(gpu)).not.toMatch(/swiftshader|llvmpipe|lavapipe|software adapter|basic render driver/i);
  proof.complete=true;proof.exactFullCampaignBytes=true;proof.output={path:output,sha256:sha(actual)};
 }catch(error){proof.error=String(error);throw error;}
 finally{await writeFile(info.outputPath('proof.json'),JSON.stringify({...proof,errors,rendererDiagnostics:hardware},null,2));}
});
