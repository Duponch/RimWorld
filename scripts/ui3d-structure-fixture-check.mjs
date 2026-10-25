// ROOT only, after sources are frozen. This prepared World/UI fixture is not a
// live colony or a performance benchmark. No server or human browser is touched.
import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const option=name=>process.argv.find(value=>value.startsWith(name+'='))?.slice(name.length+1);
const origin=new URL(option('--base')??'http://127.0.0.1:5196');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(origin.hostname)&&!['5173','5184'].includes(origin.port));
const folder=resolve('tmp/ui3d-structure-v479','fixture-'+new Date().toISOString().replaceAll(':','-'));
await mkdir(folder,{recursive:true});
async function boot(THREE,NativeStage,createWorld,applyCommand,buildNativePanel,buildNativeToolPalette,projectProgress,researchCost,researchProjects,resetNativeResearch){
 const world=createWorld(479311,32,32);world.research={project:null,points:0};
 const effects={panels:[],tools:[],categories:[],commands:[],errors:[],escapes:0,preparations:[{kind:'prepared-world',seed:479311,width:32,height:32,schema:world.schemaVersion,pawns:world.pawns.length,research:'empty'}]};
 const state={world,epoch:479311,panel:null,category:'structure',tool:'select',orientation:0,selectedPawnIds:[],selectedObjects:[],constructionMaterial:'wood',creationStorage:{priority:3,filters:{wood:true,food:true}},speed:0,hasGame:true,busy:false,saves:[]};
 let current=null,palette=null,frame=0,disposed=false;
 let stage;
 const show=page=>{current=page;stage.showPage(page);};
 const refresh=()=>{stage.setPanel(state.panel);show(palette?buildNativeToolPalette(state,actions,palette):buildNativePanel(state,actions));};
 const close=()=>{palette=null;state.panel=null;refresh();};
 const panel=id=>{palette=null;state.panel=state.panel===id?null:id;effects.panels.push(state.panel);refresh();};
 const tools=kind=>{palette=palette===kind?null:kind;state.panel=null;refresh();};
 const actions={command:async command=>{const result=applyCommand(world,command);effects.commands.push({command:structuredClone(command),ok:result.ok});refresh();return result;},
  panel:id=>{palette=null;state.panel=id;effects.panels.push(id);refresh();},category:value=>{state.category=value;effects.categories.push(value);refresh();},
  tool:value=>{state.tool=value;effects.tools.push(value);refresh();},selectPawn:()=>{},speed:()=>{},rotate:direction=>{state.orientation=(state.orientation+direction+4)%4;refresh();},
  material:value=>{state.constructionMaterial=value;refresh();},creationStorage:value=>{state.creationStorage=structuredClone(value);refresh();},
  front:()=>{},save:()=>{},exportSave:()=>{},showPage:show,refresh,closePage:()=>{palette=null;current=null;stage.showPage(null);},readState:()=>state};
 stage=new NativeStage({onPanel:panel,onTools:tools,onEscape:()=>{effects.escapes++;close();},onError:message=>effects.errors.push(message)});
 await stage.ready;
 const renderer=new THREE.WebGPURenderer({antialias:true});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0x436457,1);
 renderer.domElement.style.cssText='position:fixed;inset:0;width:100%;height:100%;touch-action:none';document.body.append(renderer.domElement);await renderer.init();
 const background=new THREE.Scene(),camera=new THREE.PerspectiveCamera();stage.setFrontVisible(false);stage.setWorldVisible(true);
 const resize=()=>renderer.setSize(innerWidth,innerHeight);addEventListener('resize',resize);
 const tick=now=>{if(disposed)return;renderer.render(background,camera);stage.renderOverlay(renderer,now);frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);
 const pixels=new WeakMap();
 const pieces=()=>{
  stage.scene.updateMatrixWorld(true);const result=[];
  stage.scene.traverse(piece=>{const data=piece.userData;if(!data.nativeId||!data.w||!data.h)return;
   let visible=true;for(let parent=piece;parent;parent=parent.parent)if(!parent.visible){visible=false;break;}
   const corners=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([x,y])=>new THREE.Vector3(x*data.w/2,y*data.h/2,0).applyMatrix4(piece.matrixWorld).project(stage.camera)).map(p=>({x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}));
   const left=Math.min(...corners.map(p=>p.x)),right=Math.max(...corners.map(p=>p.x)),top=Math.min(...corners.map(p=>p.y)),bottom=Math.max(...corners.map(p=>p.y));
   // One read per icon canvas. Repeated readback can change Canvas raster mode.
   if(data.nativeStyle==='icon'&&!pixels.has(data.canvas)){const rgba=data.ctx.getImageData(0,0,data.wPx,data.hPx).data;let dark=0;for(let i=0;i<rgba.length;i+=4)if(rgba[i]<80&&rgba[i+1]<75&&rgba[i+2]<65&&rgba[i+3]>200)dark++;pixels.set(data.canvas,dark);}
   result.push({id:data.nativeId,visible,paper:data.paper,style:data.nativeStyle,region:data.nativeRegion,width:data.w*100,height:data.h*100,tooltip:data.tooltip??'',darkIconPixels:pixels.get(data.canvas),screen:{left,right,top,bottom,x:(left+right)/2,y:(top+bottom)/2}});
  });return result;
 };
 const model=()=>current?{id:current.id,layout:current.layout,palette:current.palette,rows:current.rows.map(row=>({id:row.id,label:row.label,value:row.value,detail:row.detail,region:row.region,controlStyle:row.controlStyle,graphNode:row.graphNode,controls:row.controls?.map(c=>({id:c.id,label:c.label,icon:c.icon,hint:c.hint,disabled:!!c.disabled,active:!!c.active}))})),research:current.research?{...current.research,nodeCount:current.rows.filter(r=>r.graphNode).length}:null}:null;
 window.__structureFixture={stage,effects,state,
  get ready(){return stage.diagnostics().overlayRenders>2;},
  get ui(){return {...stage.diagnostics(),hostBackend:renderer.backend?.isWebGPUBackend?'WebGPU':'WebGL',pieces:pieces(),model:model(),focus:stage.pageControls.filter(hit=>!hit.control?.disabled)[stage.focusIndex]?.control?.id??null,tooltipText:stage.hintText??'',regionOffsets:{...stage.regionOffsets},researchProject:world.research?.project??null};},
  point(id){const d=stage.diagnostics(),record=d.controls.find(c=>c.id===id)??d.targets.find(c=>c.nativeId===id);if(!record)return null;const hit=stage.hit(record.x,record.y);return {...record,id,hit:hit?.control?.id??hit?.piece.userData.nativeId};},
  close,
  grantCatalogue(){for(const p of researchProjects)Object.assign(projectProgress(world.research,p.id),{points:researchCost(p.id),completedAt:0});effects.preparations.push({kind:'all-research-for-catalogue-geometry'});refresh();},
  resetResearch(){world.research={project:null,points:0};resetNativeResearch();effects.preparations.push({kind:'empty-research-for-independent-tree-check'});refresh();},
  dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);removeEventListener('resize',resize);stage.dispose();renderer.domElement.remove();void renderer.dispose();}
 };
 refresh();
}
const fixture=resolve(folder,'fixture.html');
const imports='import * as THREE from "three/webgpu";import {NativeStage} from "/src/ui3d/NativeStage.ts";import {createWorld,applyCommand} from "/src/sim/index.ts";import {buildNativePanel,buildNativeToolPalette} from "/src/ui3d/native-panels.ts";import {projectProgress,researchCost} from "/src/sim/research.ts";import {researchProjects} from "/src/ui/research-projects.ts";import {resetNativeResearch} from "/src/ui3d/native-research.ts";';
await writeFile(fixture,'<!doctype html><meta charset="UTF-8"><link rel="icon" href="data:,"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}</style><body><script type="module">'+imports+'('+boot.toString()+')(THREE,NativeStage,createWorld,applyCommand,buildNativePanel,buildNativeToolPalette,projectProgress,researchCost,researchProjects,resetNativeResearch);</script>');
const sha=x=>createHash('sha256').update(x).digest('hex');
const report={folder,protocol:'native-structure-fixture-v479-1',preparedWorld:{seed:479311,width:32,height:32,schema:293,research:'explicit empty progress, temporary all-research catalogue and reset recorded'},
 driverSHA:sha(await readFile(new URL(import.meta.url))),profiles:[],errors:[],limits:['Prepared deterministic UI fixture, not an acquired GameSession or performance comparison.','Blank host still exercises real native WebGPU scene, clipping, raycasts, shared overlay cache and painted icon canvases.','Keyboard/mouse actions use native controls; only declared catalogue/research preparation writes fixture progress directly.']};
const browser=await chromium.launch({executablePath:option('--executable')??resolve('.playwright/chromium-1243/chrome-win64/chrome.exe'),headless:process.argv.includes('--headless'),timeout:60000,args:['--mute-audio','--enable-unsafe-webgpu']});
const watchdog=setTimeout(()=>void browser.close(),300000);
const persist=()=>writeFile(resolve(folder,'report.json'),JSON.stringify(report,null,2));
let page;
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});page=await context.newPage();page.setDefaultTimeout(10000);
 page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|device.*lost/i.test(m.text()))report.errors.push(m.text());});
 const ui=()=>page.evaluate(()=>window.__structureFixture.ui),effects=()=>page.evaluate(()=>window.__structureFixture.effects);
 const wait=(predicate,arg=null)=>page.waitForFunction(predicate,arg,{timeout:10000});
 const settle=async()=>{await page.mouse.move(page.viewportSize().width-12,8);await wait(()=>window.__structureFixture.ui.activeAnimations===0);await page.waitForTimeout(80);};
 const point=async id=>{const p=await page.evaluate(id=>window.__structureFixture.point(id),id);assert.ok(p,'native control exists '+id);assert.equal(p.disabled??false,false,'enabled '+id);assert.equal(p.hit,id,'actual native raycast reaches '+id);return p;};
 const click=async id=>{const p=await point(id);await page.mouse.click(p.x,p.y);};
 const management=async id=>{const p=(await ui()).management.find(p=>p.id===id);assert.ok(p);await page.mouse.click(p.x,p.y);};
 const capture=async(profile,label)=>{await page.screenshot({path:resolve(folder,label+'.png')});profile.captures.push({label,ui:await ui(),effects:await effects()});await persist();};
 const regionPoint=(state,key)=>{const rect=state.regions[key];assert.ok(rect,'region '+key);return {x:state.pageBounds.x+rect.x+rect.width*.55,y:state.pageBounds.y+rect.y+rect.height*.55};};
 await page.goto(origin.href+relative(resolve('.'),fixture).replaceAll('\\','/'),{waitUntil:'networkidle',timeout:90000});await wait(()=>window.__structureFixture?.ready);
 assert.equal(await page.locator('button,input,select,dialog').count(),0,'no DOM game controls');
 assert.equal((await ui()).hostBackend,'WebGPU');assert.equal((await ui()).backend,'WebGPU');
 assert.equal((await effects()).preparations[0].schema,293);assert.equal((await effects()).preparations[0].pawns,3);
 for(const viewport of [{width:1440,height:1000},{width:960,height:800}]){
  const profile={viewport,captures:[],checks:[]};report.profiles.push(profile);await page.setViewportSize(viewport);await page.evaluate(()=>window.__structureFixture.close());await settle();
  for(const kind of ['orders','zones']){
   await click('map-dock:'+kind);await wait(kind=>window.__structureFixture.ui.page==='map-tools-'+kind,kind);await settle();
   let state=await ui();assert.equal(state.model.layout,'palette');assert.ok(!state.pieces.some(p=>p.id==='page:map-tools-'+kind),'no opaque palette backdrop');
   const buttons=state.controls.filter(c=>c.region==='catalogue');assert.ok(buttons.length>=8);assert.ok(buttons.every(c=>c.style==='icon'&&c.width===48&&c.height===46));
   const actualIcons=state.pieces.filter(p=>p.visible&&p.region==='catalogue');assert.ok(actualIcons.every(p=>p.darkIconPixels>10),'painted marker pictograms');
   await capture(profile,kind+'-'+viewport.width);await click('map-dock:'+kind);await wait(()=>window.__structureFixture.ui.page===null);
  }
  await click('map-dock:orders');await wait(()=>window.__structureFixture.ui.page==='map-tools-orders');
  await click('tool-mine-select');await wait(()=>window.__structureFixture.state.tool==='mine');assert.equal((await ui()).page,'map-tools-orders','selection retains its tray');
  await click('map-dock:orders');await wait(()=>window.__structureFixture.ui.page===null);
  await management('architect');await wait(()=>window.__structureFixture.ui.model?.layout==='architect');await click('category-structure');await wait(()=>window.__structureFixture.state.category==='structure');await settle();
  let state=await ui();assert.deepEqual(Object.keys(state.regions).sort(),['catalogue','details','navigation']);
  const tiles=state.controls.filter(c=>c.style==='tile');assert.ok(tiles.length>=3);assert.ok(tiles.every(c=>c.height===148&&c.width/c.height<2));
  if(viewport.width===1440){const y=Math.min(...tiles.map(c=>c.y)),first=tiles.filter(c=>Math.abs(c.y-y)<3);assert.equal(first.length,4,'four catalogue columns at desktop width');}
  const beforeOptions=(await effects()).commands.length;await click('tool-wall-select');await wait(()=>window.__structureFixture.state.tool==='wall');state=await ui();
  assert.equal(state.page,'architect','prepared fixture keeps its selected construction dossier open');
  const material=state.controls.find(c=>c.id==='tool-wall-material');assert.ok(material&&material.region==='details');assert.ok(material.width<state.regions.details.width*.75,'material choice keeps its natural width');
  const nextMaterial=await page.evaluate(()=>window.__structureFixture.state.constructionMaterial==='steel'?'wood':'steel');await click('tool-wall-material');await wait(()=>!!window.__structureFixture.ui.dropdown);await click('select-option:tool-wall-material:'+nextMaterial);await wait(material=>window.__structureFixture.state.constructionMaterial===material,nextMaterial);
  const oldOrientation=await page.evaluate(()=>window.__structureFixture.state.orientation);await click('rotate-right');await wait(previous=>window.__structureFixture.state.orientation===(previous+1)%4,oldOrientation);
  assert.equal((await ui()).model.rows.find(r=>r.id==='architect-rotation').value,((oldOrientation+1)%4*90)+'°');assert.equal((await effects()).commands.length,beforeOptions,'material and orientation are UI selections before placement');
  await capture(profile,'architect-selected-'+viewport.width);
  for(const category of ['floors','furniture']){await click('category-'+category);await wait(category=>window.__structureFixture.state.category===category,category);assert.ok((await ui()).controls.some(c=>c.style==='tile'));await capture(profile,category+'-'+viewport.width);}
  await page.evaluate(()=>window.__structureFixture.grantCatalogue());await click('category-production');await settle();state=await ui();assert.ok(state.maxScroll>0,'production has a real catalogue scrollbar');
  const navigationBefore=state.controls.filter(c=>c.region==='navigation').map(c=>[c.id,c.x,c.y]);const detailBefore=state.rows.filter(r=>r.region==='details').map(r=>[r.id,r.top]);
  const wheel=regionPoint(state,'catalogue');await page.mouse.move(wheel.x,wheel.y);await page.mouse.wheel(0,340);await wait(()=>window.__structureFixture.ui.scroll>0);state=await ui();
  assert.deepEqual(state.controls.filter(c=>c.region==='navigation').map(c=>[c.id,c.x,c.y]),navigationBefore,'catalogue scrolling keeps category rail fixed');
  assert.deepEqual(state.rows.filter(r=>r.region==='details').map(r=>[r.id,r.top]),detailBefore,'catalogue scrolling keeps detail column fixed');
  assert.ok(state.pieces.some(p=>p.id==='native-scroll-thumb'),'visible catalogue scrollbar');await capture(profile,'production-scrolled-'+viewport.width);
  await page.evaluate(()=>{window.__structureFixture.close();window.__structureFixture.resetResearch();});
  await management('research');await wait(()=>window.__structureFixture.ui.model?.layout==='research');await settle();state=await ui();
  assert.equal(state.model.research.nodeCount,42);assert.equal(state.model.research.links.length,30);assert.ok(state.model.rows.some(r=>r.id==='research-tabs'&&r.controls[0].label==='Principal'));
  assert.ok(state.controls.some(c=>c.style==='research'));assert.ok(!state.pieces.some(p=>/^research-.+-start$/.test(p.id)),'research play action shares its card surface');assert.ok(!state.pieces.some(p=>p.id.startsWith('row-hint:research-node-')),'no duplicate graph hint planes');assert.ok(state.model.rows.some(r=>r.region==='details'&&r.id==='research-selected-description'));
  assert.ok(!state.model.rows.some(r=>r.id.startsWith('research-grid-')),'research remains a graph');
  const candidates=state.controls.filter(c=>c.style==='research'&&!c.active);
  let selected;
  for(const candidate of candidates){const id=candidate.id.replace(/^research-/,'').replace(/-select$/,'');const play=state.controls.find(c=>c.id==='research-'+id+'-start');if(!play||play.disabled)continue;const p=await page.evaluate(id=>window.__structureFixture.point(id),candidate.id),playPoint=await page.evaluate(id=>window.__structureFixture.point(id),play.id);if(p?.hit===candidate.id&&playPoint?.hit===play.id){selected={id,control:candidate.id};break;}}
  assert.ok(selected,'visible selectable unlocked project');const commandsBefore=(await effects()).commands.length;
  await click(selected.control);await wait(id=>window.__structureFixture.ui.model.research.selected===id,selected.id);assert.equal((await effects()).commands.length,commandsBefore,'node selection sends no research command');
  await click('research-'+selected.id+'-start');await wait(id=>window.__structureFixture.ui.researchProject===id,selected.id);assert.equal((await effects()).commands.length,commandsBefore+1);
  assert.deepEqual((await effects()).commands.at(-1),{command:{type:'research-project',project:selected.id},ok:true});
  const hovered=await point(selected.control);await page.mouse.move(hovered.x,hovered.y);await wait(()=>!!window.__structureFixture.ui.tooltip);assert.ok((await ui()).tooltipText.includes('Progression :'));
  await capture(profile,'research-selected-'+viewport.width);await settle();state=await ui();
  const graphBefore=state.graph.y,detailOffset=state.scroll;const graphPoint=regionPoint(state,'graph');await page.mouse.move(graphPoint.x,graphPoint.y);await page.mouse.wheel(0,250);await wait(y=>window.__structureFixture.ui.graph.y>y,graphBefore);
  assert.equal((await ui()).scroll,detailOffset,'graph and dossier scroll independently');
  if(viewport.width===960){
   state=await ui();assert.ok(state.graph.bounds.width<state.graph.width);assert.ok(state.pieces.some(p=>p.id==='native-scroll:graph:x:thumb'),'horizontal graph scrollbar');
   const previous=state.graph.x;await page.keyboard.down('Shift');await page.mouse.wheel(0,200);await page.keyboard.up('Shift');await wait(x=>window.__structureFixture.ui.graph.x>x,previous);
  }
  state=await ui();const graphReset=regionPoint(state,'graph');await page.mouse.move(graphReset.x,graphReset.y);await page.mouse.wheel(0,-10000);await wait(()=>window.__structureFixture.ui.graph.y===0);
  if(viewport.width===960){await page.keyboard.down('Shift');await page.mouse.wheel(0,-10000);await page.keyboard.up('Shift');await wait(()=>window.__structureFixture.ui.graph.x===0);}
  assert.ok(!(await ui()).controls.some(c=>c.id==='research-tree-sowing-select'),'first logical graph node starts outside the visible clip');
  await page.evaluate(()=>{window.__structureFixture.stage.focusIndex=-1;});
  const commandCount=(await effects()).commands.length;let focusedNode=null;
  for(let tab=0;tab<24;tab++){await page.keyboard.press('Tab');const focused=await ui();if(/^research-.+-select$/.test(focused.focus??'')){focusedNode=focused;break;}}
  assert.ok(focusedNode,'keyboard reaches a graph node outside initial viewport');assert.ok(focusedNode.graph.y>0,'Tab scrolls the offscreen node into view');
  const focused=await point(focusedNode.focus);assert.equal(focused.hit,focusedNode.focus);await page.keyboard.press('Enter');
  await wait(()=>window.__structureFixture.ui.model.research.selected==='tree-sowing');assert.equal((await effects()).commands.length,commandCount,'keyboard node selection remains command-free');
  await page.keyboard.press('Tab');assert.equal((await ui()).focus,'research-tree-sowing-start');await page.keyboard.press('Enter');await wait(()=>window.__structureFixture.ui.researchProject==='tree-sowing');
  assert.equal((await effects()).commands.length,commandCount+1,'offscreen keyboard control retains its current command after autoscroll');await capture(profile,'research-keyboard-'+viewport.width);
  await settle();const first=(await ui()).cache.cacheRenders;await page.waitForTimeout(450);const second=(await ui()).cache.cacheRenders;assert.equal(second,first,'settled scene does not continuously recapture');
  profile.checks.push('native icon trays, three-part workbench, independent scroll, graph/dossier, mouse and offscreen keyboard nodes, current tooltip, stable cache');
  assert.deepEqual((await effects()).errors,[]);await page.evaluate(()=>window.__structureFixture.close());
 }
 assert.deepEqual(report.errors,[]);report.effects=await effects();report.status='passed';await page.evaluate(()=>window.__structureFixture.dispose());await context.close();
}catch(error){report.status='failed';report.failure=String(error);if(page){report.failureUI=await page.evaluate(()=>window.__structureFixture?.ui).catch(cause=>({error:String(cause)}));report.effects=await page.evaluate(()=>window.__structureFixture?.effects).catch(()=>null);await page.screenshot({path:resolve(folder,'failure.png')}).catch(()=>{});}throw error;}
finally{clearTimeout(watchdog);await persist();await browser.close();console.log(JSON.stringify({folder,status:report.status}));}
