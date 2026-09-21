import {resolve} from 'node:path';
import {writeFile,copyFile} from 'node:fs/promises';
import {decodeStoredSave} from '../src/ui/save-storage-codec.ts';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const url='https://lisiere-duponch.netlify.app';
const version=process.env.VALIDATION_VERSION??'v93';
const browser=await chromium.launch({channel:'chromium'});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))errors.push(m.text());});
const result={url,checkedAt:new Date().toISOString()};
try{
  const response=await page.goto(url);result.status=response.status();
  if(result.status!==200)throw Error('Production HTTP failed');
  const front=page.locator('.front-menu');await front.waitFor();
  await page.screenshot({path:`artifacts/netlify-${version}-home.png`});
  await front.getByRole('button',{name:'Nouvelle partie',exact:true}).click();
  await front.getByRole('button',{name:'Suivant',exact:true}).click();
  await front.getByRole('radio',{name:'Récit d’aventure',exact:true}).check();
  await front.getByRole('radio',{name:'Rechargeable à tout moment',exact:true}).check();
  await front.getByRole('button',{name:'Suivant',exact:true}).click();
  await front.getByRole('button',{name:'Démarrer',exact:true}).click();
  await front.waitFor({state:'hidden',timeout:60000});
  await page.locator('[data-speed="0"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-speed="0"]').getAttribute('aria-pressed')==='true');
  result.debugExport=await page.evaluate(()=>typeof window.__lisiere);if(result.debugExport!=='undefined')throw Error('Debug export in production');
  result.people=await page.locator('.colonist').count();if(result.people!==3)throw Error('Crashlanded did not start');
  await page.locator('.colonist').first().click();
  for(const name of ['Bio','Besoins','Santé','Équipement','Social']){
    await page.getByRole('tab',{name,exact:true}).click();
    if(await page.locator('[role=tabpanel]:visible').count()!==1)throw Error('Inspector panel missing');
  }
  await page.getByRole('tab',{name:'Santé',exact:true}).click();
  await page.screenshot({path:`artifacts/netlify-${version}-colony.png`});
  await page.locator('[data-panel=menu]').click();await page.locator('#save').click();
  await page.waitForFunction(()=>!!localStorage.getItem('lisiere.save.v1'));
  const raw=await decodeStoredSave(await page.evaluate(()=>localStorage.getItem('lisiere.save.v1')));
  const w=JSON.parse(raw),saved={schema:w.schemaVersion,tick:w.tick,pawns:w.pawns.length};
  result.save=saved;await page.locator('#load').click();
  await page.waitForFunction(()=>!document.querySelector('.game-shell').inert);
  await page.reload();await page.locator('.front-menu').waitFor();
  await page.getByRole('button',{name:'Charger une partie',exact:true}).click();
  result.savedSlots=await page.locator('.front-save:not(.front-save-disabled)').count();
  if(!result.savedSlots)throw Error('Cold saved slot missing');
  await front.locator('.front-save input').first().check();await page.getByRole('button',{name:'Charger',exact:true}).click();await front.waitFor({state:'hidden',timeout:60000});
  if(await page.locator('.colonist').count()!==saved.pawns)throw Error('Cold restoration failed');
  result.coldRestore=true;
  await page.locator('[data-panel=architect]').click();
  result.pngTools=await page.locator('.tool-icon').evaluateAll(nodes=>nodes.filter(n=>!n.textContent&&getComputedStyle(n).backgroundImage.includes('architect-')).length);
  if(result.pngTools!==60)throw Error('Architect PNGs missing');
  await page.evaluate(()=>document.fonts.ready);
  result.fonts=await page.evaluate(()=>({sans:document.fonts.check('14px "Lisiere Sans"'),serif:document.fonts.check('23px "Lisiere Serif"')}));
  result.assets=await page.evaluate(async()=>{
    const rows=[];for(const name of ['planet','panel-frame','icons','portraits','architect-1','architect-2']){
      const response=await fetch('/assets/ui/lisiere/'+name+'.png');rows.push({name,status:response.status,cache:response.headers.get('cache-control')});
    }return rows;
  });
  if(result.assets.some(a=>a.status!==200))throw Error('Missing deployed illustration');
  result.errors=errors;if(errors.length)throw Error('Browser errors recorded');
  result.passed=true;
}finally{
  result.errors=errors;await writeFile(`artifacts/netlify-smoke-${version}.json`,JSON.stringify(result,null,2)+'\n');
  await copyFile('artifacts/netlify-latest.json',`artifacts/netlify-${version}.json`);await browser.close();
  console.log(JSON.stringify(result));
}
