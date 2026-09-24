import {resolve} from 'node:path';
import {writeFile,copyFile,readFile} from 'node:fs/promises';
import {decodeStoredSave} from '../src/ui/save-storage-codec.ts';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const url='https://lisiere-duponch.netlify.app';
const version=process.env.VALIDATION_VERSION??'v95';
const browser=await chromium.launch({channel:'chromium'});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
async function requireCursor(selector,kind){
  await page.waitForFunction(name=>getComputedStyle(document.querySelector('#app')).getPropertyValue(`--cursor-${name}`).includes('data:image/png;base64,'),kind);
  const expected=await page.locator('#app').evaluate((node,name)=>getComputedStyle(node).getPropertyValue(`--cursor-${name}`).trim(),kind);
  const actual=await page.locator(selector).first().evaluate(node=>getComputedStyle(node).cursor);
  if(actual!==expected)throw Error(`Wrong ${kind} cursor on ${selector}`);
  return actual;
}
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))errors.push(m.text());});
const result={url,checkedAt:new Date().toISOString()};
try{
  const response=await page.goto(url);result.status=response.status();
  if(result.status!==200)throw Error('Production HTTP failed');
  const front=page.locator('.front-menu');await front.waitFor();
  await page.screenshot({path:`artifacts/netlify-${version}-home.png`});
  result.semanticCursors={};
  result.semanticCursors.button=await requireCursor('.front-home-actions button:not(:disabled)','link');
  result.semanticCursors.forbidden=await requireCursor('.front-later button:disabled','forbidden');
  await front.getByRole('button',{name:'Nouvelle partie',exact:true}).click();
  await front.getByRole('button',{name:'Suivant',exact:true}).click();
  await front.getByRole('radio',{name:'Récit d’aventure',exact:true}).check();
  await front.getByRole('radio',{name:'Rechargeable à tout moment',exact:true}).check();
  await front.getByRole('button',{name:'Suivant',exact:true}).click();
  result.semanticCursors.text=await requireCursor('#front-seed','text');
  await page.evaluate(()=>{
    const front=document.querySelector('.front-menu');window.__v95BusyCursor='';
    const observer=new MutationObserver(()=>{if(front.getAttribute('aria-busy')==='true'){window.__v95BusyCursor=getComputedStyle(front).cursor;observer.disconnect();}});
    observer.observe(front,{attributes:true,attributeFilter:['aria-busy']});
  });
  await front.getByRole('button',{name:'Démarrer',exact:true}).click();
  await front.waitFor({state:'hidden',timeout:60000});
  const observedWait=await page.evaluate(()=>window.__v95BusyCursor);
  const expectedWait=await page.locator('#app').evaluate(node=>getComputedStyle(node).getPropertyValue('--cursor-wait').trim());
  if(observedWait!==expectedWait)throw Error('Busy state did not show the wait cursor');
  result.semanticCursors.wait=observedWait;
  await page.locator('[data-speed="0"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-speed="0"]').getAttribute('aria-pressed')==='true');
  result.debugExport=await page.evaluate(()=>typeof window.__lisiere);if(result.debugExport!=='undefined')throw Error('Debug export in production');
  result.people=await page.locator('.colonist').count();if(result.people!==3)throw Error('Crashlanded did not start');
  result.resourceWidth=await page.locator('.resource-list').evaluate(node=>node.getBoundingClientRect().width);
  if(result.resourceWidth!==216)throw Error('Resource register collapsed');
  await page.locator('.colonist').first().click();
  result.selectedPortrait=await page.locator('.colonist').first().evaluate(node=>{const label=node.querySelector('strong'),style=getComputedStyle(label);return {text:label.textContent,display:style.display,visibility:style.visibility,opacity:style.opacity};});
  if(!result.selectedPortrait.text||result.selectedPortrait.display==='none'||result.selectedPortrait.visibility==='hidden'||result.selectedPortrait.opacity==='0')throw Error('Selected portrait label missing');
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
  const cursors=new Set();
  for(const [id,category] of [['select','orders'],['mine','orders'],['chop','orders'],['harvest','orders'],['cut','orders'],['wall','structure'],['deconstruct','orders'],['stockpile','zones'],['cancel','orders']]){
    await page.locator(`[data-category="${category}"]`).click();await page.locator(`[data-tool="${id}"]`).click();
    await page.locator('#viewport').waitFor({state:'visible'});
    if(await page.locator('#viewport').getAttribute('data-cursor')!=='pointer')throw Error(`Map pointer changed for ${id}`);
    cursors.add(await requireCursor('#viewport canvas','pointer'));
  }
  result.cursors=cursors.size;if(result.cursors!==1)throw Error('Architect tools no longer share one pointer');
  await page.locator('#architect-panel [data-close-panel]').click();
  const canvasPoint=await page.locator('#viewport canvas').evaluate(canvas=>{
    const bounds=canvas.getBoundingClientRect();
    for(const fx of [.5,.65,.35])for(const fy of [.5,.4,.6]){
      const x=bounds.x+bounds.width*fx,y=bounds.y+bounds.height*fy;
      if(document.elementFromPoint(x,y)===canvas)return {x,y};
    }
    return null;
  });
  if(!canvasPoint)throw Error('No clear map point for camera cursor checks');
  await page.mouse.move(canvasPoint.x,canvasPoint.y);
  const releasedCursor=page.evaluate(()=>new Promise(resolve=>document.querySelector('#viewport canvas').addEventListener('pointerup',event=>resolve(getComputedStyle(event.currentTarget).cursor),{once:true})));
  await page.mouse.down({button:'middle'});
  result.semanticCursors.grabbing=await requireCursor('#viewport canvas','grabbing');
  await page.mouse.move(canvasPoint.x+24,canvasPoint.y+12);await page.mouse.up({button:'middle'});
  result.semanticCursors.grab=await releasedCursor;
  const expectedGrab=await page.locator('#app').evaluate(node=>getComputedStyle(node).getPropertyValue('--cursor-grab').trim());
  if(result.semanticCursors.grab!==expectedGrab)throw Error('Camera release did not show grab cursor');
  await page.mouse.move(canvasPoint.x,canvasPoint.y);
  const zoomCursor=page.evaluate(()=>new Promise(resolve=>document.querySelector('#viewport canvas').addEventListener('wheel',()=>requestAnimationFrame(()=>resolve(getComputedStyle(document.querySelector('#viewport canvas')).cursor)),{once:true})));
  await page.mouse.wheel(0,-150);result.semanticCursors.zoom=await zoomCursor;
  const expectedZoom=await page.locator('#app').evaluate(node=>getComputedStyle(node).getPropertyValue('--cursor-zoom').trim());
  if(result.semanticCursors.zoom!==expectedZoom)throw Error('Mouse-wheel zoom did not show magnifier cursor');
  result.semanticCursors.pointer=cursors.values().next().value;
  if(new Set(Object.values(result.semanticCursors)).size!==8)throw Error('Semantic cursor shapes are not distinct');
  result.semanticCursors=Object.fromEntries(Object.entries(result.semanticCursors).map(([kind,cursor])=>[kind,cursor.match(/\) (\d+) (\d+),/)?.slice(1).map(Number)]));
  result.management={};
  for(const name of ['work','schedule','assign']){
    await page.locator(`[data-panel="${name}"]`).click();const wrap=page.locator(`#${name}-panel .${name==='schedule'?'schedule-table-wrap':'work-table-wrap'}`).first();
    result.management[name]=await wrap.evaluate(node=>({client:node.clientWidth,scroll:node.scrollWidth}));if(result.management[name].client!==result.management[name].scroll)throw Error(`${name} panel scrolls horizontally`);
  }
  await page.locator('[data-panel="wildlife"]').click();const wildlife=page.locator('.fauna-row').first();
  result.wildlifeColumns=await wildlife.count()?await wildlife.evaluate(node=>[...node.children].slice(0,6).map(child=>({x:child.getBoundingClientRect().x,width:child.getBoundingClientRect().width}))):[];
  await page.evaluate(()=>document.fonts.ready);
  result.fonts=await page.evaluate(()=>({sans:document.fonts.check('14px "Lisiere Sans"'),serif:document.fonts.check('23px "Lisiere Serif"')}));
  result.assets=await page.evaluate(async()=>{
    const rows=[];for(const name of ['planet','panel-frame','icons','portraits','architect-1','architect-2','cursors-v95']){
      const response=await fetch('/assets/ui/lisiere/'+name+'.png');rows.push({name,status:response.status,cache:response.headers.get('cache-control')});
    }return rows;
  });
  if(result.assets.some(a=>a.status!==200))throw Error('Missing deployed illustration');
  result.errors=errors;if(errors.length)throw Error('Browser errors recorded');
  result.passed=true;
}finally{
  result.errors=errors;await writeFile(`artifacts/netlify-smoke-${version}.json`,JSON.stringify(result,null,2)+'\n');
  const latest=JSON.parse(await readFile('artifacts/netlify-latest.json','utf8'));
  // A rate-limited status lookup may leave the rolling record on the previous
  // release even though the new site is already serving. Never mislabel it.
  if(!process.env.EXPECTED_DEPLOY_ID||latest.deployId===process.env.EXPECTED_DEPLOY_ID)await copyFile('artifacts/netlify-latest.json',`artifacts/netlify-${version}.json`);
  await browser.close();
  console.log(JSON.stringify(result));
}
