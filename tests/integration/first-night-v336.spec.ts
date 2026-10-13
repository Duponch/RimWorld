import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {world,pause,panel,tool,cell,dragRectangle,expectWorld,observeErrors} from './helpers';
import {generateStartingWorld,startingSiteChoices,resolveStartingSite} from '../../src/sim/starting-world';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import type {World,Cell} from '../../src/sim/types';

const CASES=[{biome:'temperate-forest',tile:0},{biome:'boreal-forest',tile:81},{biome:'arid-shrubland',tile:119}] as const;
const front=(page:Page)=>page.locator('.front-menu');
const button=(page:Page,name:string)=>front(page).getByRole('button',{name,exact:true});

/** Select a real SVG surface after rotating the globe through its normal
 * keyboard controls. No hidden input, forced click or model mutation. */
async function chooseTile(page:Page,id:number):Promise<void>{
  const svg=page.locator('.front-menu .planet-view svg');await svg.scrollIntoViewIfNeeded();await svg.focus();
  for(let turn=0;turn<54;turn++){
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    const point=await front(page).locator(`[data-planet-tile="${id}"]`).evaluate(el=>{
      const path=el as SVGPathElement,d=path.getAttribute('d');if(!d||getComputedStyle(path).display==='none')return null;
      const values=d.match(/-?\d+(?:\.\d+)?/g)?.map(Number);if(!values||values.length<6)return null;
      let x=0,y=0;for(let i=0;i<values.length;i+=2){x+=values[i]!;y+=values[i+1]!;}
      const matrix=path.getScreenCTM();if(!matrix)return null;
      const p=new DOMPoint(x/(values.length/2),y/(values.length/2)).matrixTransform(matrix);
      return document.elementFromPoint(p.x,p.y)?.closest('[data-planet-tile]')===path?{x:p.x,y:p.y}:null;
    });
    if(point){await page.mouse.click(point.x,point.y);await expect(front(page).locator('[data-planet-selection]')).toHaveValue(String(id));return;}
    await page.keyboard.press('ArrowRight');
  }
  throw Error(`La case ${id} n’a pas offert de surface accessible après une rotation complète.`);
}

async function create(page:Page,tile:number):Promise<World>{
  await page.goto('/?e2e');await button(page,'Nouvelle partie').click();await button(page,'Suivant').click();
  await front(page).getByRole('radio',{name:'Récit d’aventure',exact:true}).check();
  await front(page).getByRole('radio',{name:'Rechargeable à tout moment',exact:true}).check();await button(page,'Suivant').click();
  await page.locator('#front-seed').fill('42');await button(page,'Générer').click();await chooseTile(page,tile);
  await button(page,'Suivant').click();const site=front(page).locator('dialog');
  if(await site.isVisible())await site.getByRole('button',{name:'Confirmer',exact:true}).click();
  await button(page,'Démarrer').click();const warning=front(page).locator('dialog');
  if(await warning.isVisible())await warning.getByRole('button',{name:'Confirmer',exact:true}).click();
  await expect(front(page)).toBeHidden({timeout:90000});await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90000});
  const pending=await world(page);expect(pending.tick).toBe(0);expect(pending.width).toBe(250);expect(pending.startingArrival?.phase).toBe('incoming');
  await page.locator('.starting-arrival').getByRole('button',{name:'Reprendre',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.__lisiere.world.startingArrival?.phase)).toBe('opened');await pause(page);
  const guide=page.locator('.learning-readout');if(await guide.evaluate(n=>(n as HTMLDetailsElement).open))await guide.locator(':scope > summary').click();
  expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');return world(page);
}

/** A player can choose a patch visible near the landing. Low plants remain;
 * builders clear their actual sites. This search never changes the map. */
function emptyPatch(w:World):Cell{
  const landing=w.scenario!.landing,occupied=new Set<number>();
  for(const r of w.resources)if(r.kind==='tree'||r.kind==='rock')occupied.add(r.z*w.width+r.x);
  for(const p of w.pawns)occupied.add(p.z*w.width+p.x);
  for(const p of w.piles)if(p.owner.type==='ground')occupied.add(p.owner.z*w.width+p.owner.x);
  const candidates:Cell[]=[];
  for(let z=landing.z-15;z<=landing.z+9;z++)for(let x=landing.x-15;x<=landing.x+9;x++){
    if(x<1||z<1||x+10>=w.width||z+6>=w.height)continue;
    let free=true;
    for(let dz=0;dz<6&&free;dz++)for(let dx=0;dx<6;dx++){
      const i=(z+dz)*w.width+x+dx,t=w.tiles[i]!;
      if(t.terrain==='water'||t.terrain==='rock'||occupied.has(i)){free=false;break;}
    }
    if(free)candidates.push({x,z});
  }
  candidates.sort((a,b)=>(a.x+2.5-landing.x)**2+(a.z+2.5-landing.z)**2-((b.x+2.5-landing.x)**2+(b.z+2.5-landing.z)**2)||a.z-b.z||a.x-b.x);
  if(!candidates[0])throw Error('Aucun petit abri vide proche ne peut être préparé sans modifier la carte.');
  return candidates[0];
}

function shelterEvidence(w:World,patch:Cell,spots:Cell[]){
  const walls:Cell[]=[];
  for(let dx=0;dx<6;dx++){walls.push({x:patch.x+dx,z:patch.z},{x:patch.x+dx,z:patch.z+5});}
  for(let dz=1;dz<5;dz++)walls.push({x:patch.x,z:patch.z+dz});
  for(let dz=1;dz<4;dz++)walls.push({x:patch.x+5,z:patch.z+dz});
  const actual=walls.filter(c=>w.structures.some(s=>s.kind==='wall'&&s.x===c.x&&s.z===c.z)).length;
  const door=w.structures.some(s=>s.kind==='door'&&s.x===patch.x+5&&s.z===patch.z+4);
  const roof=new Set(w.roofing?.constructed??[]),covered=spots.every(c=>roof.has(c.z*w.width+c.x)&&roof.has((c.z+1)*w.width+c.x));
  return {walls:actual,door,covered};
}

async function saveAndReload(page:Page,info:TestInfo,name:string):Promise<World>{
  await pause(page);const before=await world(page);expect(validateWorld(before)).toEqual([]);await panel(page,'menu');
  const manager=page.locator('[data-save-manager]');await manager.locator('[data-save-manager-name]').fill(name);
  await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const promise=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
  const file=await promise,path=info.outputPath(name+'.json');await file.saveAs(path);expect(deserializeWorld(await readFile(path,'utf8'))).toEqual(before);
  await page.locator('#browse-saves').click();
  const row=front(page).locator('label').filter({has:page.locator('strong').filter({hasText:new RegExp('^'+name+'$')})});
  await row.locator('input[name="front-save"]').check();await button(page,'Charger').click();
  await expectWorld(page,before);return before;
}

for(const selected of CASES)test(`first natural night ${selected.biome}: shelter, three floor sleepers and exact recovery`,async({page},info)=>{
  if(process.env.V336_BIOME&&process.env.V336_BIOME!==selected.biome)test.skip();
  test.setTimeout(360000);const errors=observeErrors(page),globe=generateStartingWorld(42);
  expect(startingSiteChoices(globe)).toContain(selected.tile);expect(globe.tiles[selected.tile]!.biome).toBe(selected.biome);
  const expected=resolveStartingSite({version:1,seed:42,tile:selected.tile}),initial=await create(page,selected.tile);
  expect(initial.seed).toBe(expected.seed);expect(initial.climate?.revision).toBe(2);expect(initial.site?.biome).toBe(selected.biome);
  const originalIds=initial.pawns.map(p=>p.id),patch=emptyPatch(initial),spots=[1,2,3].map(dx=>({x:patch.x+dx,z:patch.z+2}));
  await info.attach('chosen-start',{contentType:'application/json',body:JSON.stringify({worldSeed:42,tile:selected.tile,seed:initial.seed,biome:selected.biome,climate:initial.climate,people:initial.pawns.map(p=>({id:p.id,name:p.name})),patch})});
  await saveAndReload(page,info,'arrival-'+selected.biome);
  await tool(page,'sleeping-spot');for(const spot of spots)await cell(page,spot.x,spot.z);await page.keyboard.press('Escape');
  const placed=await world(page);expect(placed.structures.filter(s=>s.kind==='sleeping-spot')).toHaveLength(3);
  expect(placed.jobs).toEqual(initial.jobs);expect(placed.piles).toEqual(initial.piles);expect(placed.seed).toBe(initial.seed);expect(placed.nextId).toBe(initial.nextId+3);
  for(let index=0;index<spots.length;index++){
    const at=spots[index]!;await cell(page,at.x,at.z);await page.locator('#bed-owner').selectOption(String(originalIds[index]));
    await expect.poll(()=>page.evaluate(id=>window.__lisiere.world.pawns.find(p=>p.id===id)?.bedId,originalIds[index]!)).toBe(placed.structures.find(s=>s.kind==='sleeping-spot'&&s.x===at.x&&s.z===at.z)!.id);
    await page.keyboard.press('Escape');
  }
  await tool(page,'wall');
  await dragRectangle(page,patch,{x:patch.x+5,z:patch.z});await dragRectangle(page,{x:patch.x,z:patch.z+5},{x:patch.x+5,z:patch.z+5});
  await dragRectangle(page,{x:patch.x,z:patch.z+1},{x:patch.x,z:patch.z+4});await dragRectangle(page,{x:patch.x+5,z:patch.z+1},{x:patch.x+5,z:patch.z+3});
  await tool(page,'door');await cell(page,patch.x+5,patch.z+4);
  await tool(page,'build-roof');await dragRectangle(page,{x:patch.x+1,z:patch.z+1},{x:patch.x+4,z:patch.z+4});
  if(selected.biome==='boreal-forest'){await tool(page,'campfire');await cell(page,patch.x+4,patch.z+2);}
  if(selected.biome==='arid-shrubland'){await tool(page,'passive-cooler');await cell(page,patch.x+4,patch.z+2);}
  await tool(page,'stockpile');await dragRectangle(page,{x:patch.x+7,z:patch.z+1},{x:patch.x+10,z:patch.z+4});await page.keyboard.press('Escape');
  await page.locator('[data-speed="6"]').click();
  await expect.poll(()=>page.evaluate(()=>window.__lisiere.world.structures.some(s=>s.kind==='wall')),{timeout:45000,intervals:[1000]}).toBe(true);
  const construction=await saveAndReload(page,info,'building-'+selected.biome);expect(construction.tick).toBeLessThan(4000);
  const spotIds=placed.structures.filter(s=>s.kind==='sleeping-spot').map(s=>s.id),witnesses=new Map<number,{tick:number;rest:number;gain:number;awake?:number}>();
  const observations:unknown[]=[];let sleepingReload=false;await page.locator('[data-speed="6"]').click();
  try {await expect.poll(async()=>{
    const state=await page.evaluate(ids=>{const w=window.__lisiere.world;return {tick:w.tick,people:w.pawns.filter(p=>ids.includes(p.id)).map(p=>({id:p.id,state:p.state,rest:p.rest,hunger:p.hunger,x:p.x,z:p.z,bed:p.bedId,need:p.need,motion:p.motion,dead:!!p.health?.death})),walls:w.structures.filter(s=>s.kind==='wall').length,doors:w.structures.filter(s=>s.kind==='door').length,roofs:w.roofing?.constructed.length??0};},originalIds);
    observations.push(state);
    const sleeping=(p:typeof state.people[number])=>!p.dead&&p.state==='sleeping'&&p.need?.kind==='sleep'&&p.need.phase==='sleep'&&p.need.bedId!==null&&spotIds.includes(p.need.bedId)&&p.need.target.x===p.x&&p.need.target.z===p.z&&(p.motion?.end??0)<=state.tick;
    const awake=(p:typeof state.people[number])=>!p.dead&&['idle','moving','working','eating','hungry'].includes(p.state)&&!(p.need?.kind==='sleep'&&p.need.phase==='sleep');
    for(const p of state.people){const old=witnesses.get(p.id);
      if(sleeping(p)){if(!old)witnesses.set(p.id,{tick:state.tick,rest:p.rest,gain:0});else old.gain=Math.max(old.gain,p.rest-old.rest);}
      else if(state.tick>=6000&&old&&old.gain>=1&&awake(p)&&old.awake===undefined)old.awake=state.tick;
    }
    if(!sleepingReload&&state.people.length===3&&state.people.every(sleeping)&&witnesses.size===3){
      const overnight=await saveAndReload(page,info,'sleeping-'+selected.biome);
      expect(shelterEvidence(overnight,patch,spots)).toEqual({walls:19,door:true,covered:true});
      sleepingReload=true;await page.screenshot({path:info.outputPath('first-night-'+selected.biome+'.png')});await page.locator('[data-speed="6"]').click();
    }
    if(state.tick>7200)throw Error('La première nuit dépasse le budget de progression réel prévu ; examiner les observations sans sauter l’horloge.');
    return state.tick>=6100&&state.people.length===3&&state.people.every(awake)&&witnesses.size===3&&[...witnesses.values()].every(w=>w.gain>=1&&w.awake!==undefined);
  },{timeout:240000,intervals:[1000]}).toBe(true);
  }finally{
    await info.attach('night-observations',{contentType:'application/json',body:JSON.stringify({biome:selected.biome,patch,witnesses:[...witnesses.entries()],observations,errors})});
  }
  const dawn=await saveAndReload(page,info,'dawn-'+selected.biome);expect(dawn.pawns.map(p=>p.id)).toEqual(originalIds);
  expect(dawn.structures.filter(s=>s.kind==='wall')).toHaveLength(19);expect(dawn.structures.filter(s=>s.kind==='door')).toHaveLength(1);
  expect(shelterEvidence(dawn,patch,spots)).toEqual({walls:19,door:true,covered:true});
  expect(dawn.roofing?.constructed.length??0).toBeGreaterThanOrEqual(16);expect(sleepingReload).toBe(true);
  expect(dawn.stockpiles.length).toBeGreaterThan(0);
  expect(dawn.piles.some(p=>p.owner.type==='ground'&&dawn.stockpiles.some(c=>p.owner.type==='ground'&&c.x===p.owner.x&&c.z===p.owner.z))).toBe(true);
  if(selected.biome!=='temperate-forest'){
    const thermal=dawn.structures.find(s=>s.kind===(selected.biome==='boreal-forest'?'campfire':'passive-cooler'));
    expect(thermal?.fuel?.ticks).toBeGreaterThan(0);expect(thermal?.fuel?.burned).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
  await info.attach('natural-night-summary',{contentType:'application/json',body:JSON.stringify({tile:selected.tile,biome:selected.biome,seed:initial.seed,ticks:[initial.tick,construction.tick,dawn.tick],people:originalIds,witnesses:[...witnesses.entries()],observations,errors})});
});

