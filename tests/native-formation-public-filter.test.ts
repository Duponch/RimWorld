import {expect,test,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {buildNativeWorld,setNativeWorldTab} from '../src/ui3d/native-world.ts';
import type {NativeControl,NativePage,NativeUiActions,NativeUiState} from '../src/ui3d/native-contract.ts';
import {prepareGroupScenario} from '../src/sim/group-scenario.ts';
import {initialWorldRegistry} from '../src/sim/world-map-context.ts';
import {preparePlanetHydration256} from '../src/sim/planet-geography-256.ts';
import {preparePlanetNavigation256} from '../src/sim/planet-route-256.ts';
import {geographicLocalSite256,validGeographicSiteBinding256} from '../src/sim/site-geographic-256.ts';
import {createGeographicSiteClimate256} from '../src/sim/site-climate.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {groupSourceChoices} from '../src/sim/group-authority.ts';
import type {MaterialPile} from '../src/sim/types.ts';

/* Reuses the existing cardboard-formation-pager-v484 fixture/callback pattern.
 * DECLARED32x32 UI fixture only: finite35food/20steel piles, one finite jade pile,
 * Home cells prepared. No mission, acquired gameplay item, played Core,
 * hauling, departure, actual browser input, Native or Whole-admission claim.
 * The command recorder never calls the SIM. All imports share the current product graph. No private298 content. */
// Only the immutable public Planet3 geography is reused. No acquired gameplay
// state, person, materials, research, mission, clock or historical result is adopted.
let fixturePlanet:ReturnType<typeof preparePlanetHydration256>['planet']|undefined;
function geographicPlanet(){
 if(!fixturePlanet){
  const text=readFileSync(resolve(process.env.ELSEWHERE_TEST_PUBLIC_ROOT??process.cwd(),'public/test-saves/v419/les-eclaircies.json'),'utf8');
  expect(createHash('sha256').update(text).digest('hex')).toBe('49e5d50abfac5a2ac0e609378877bb645da3e4559286cff706a33dc00f0df19f');
  const source=JSON.parse(text) as {planet?:unknown};fixturePlanet=preparePlanetHydration256(source.planet,297).planet;
  preparePlanetNavigation256(fixturePlanet); // Same cold hydration/navigation order as deserializeWorld.
 }
 return {...fixturePlanet}; // The restored immutable geography keeps its actual owner.
}
function fixture(){
 const world=prepareGroupScenario(),planet=geographicPlanet();
 world.planet=planet;world.site=geographicLocalSite256(planet,planet.homeTile);world.seed=world.site.mapSeed>>>0;
 world.climate=createGeographicSiteClimate256(planet,planet.homeTile,{tick:world.tick,calendarOrigin:0,schemaVersion:world.schemaVersion});
 initialWorldRegistry(world);world.worldMaps!.campaignSeed=planet.generationSeed;
 expect(validGeographicSiteBinding256(world)).toBe(true);
 for(let i=0;i<35;i++)world.piles.push({id:world.nextId++,kind:'food',item:'survival-meal',quantity:10,owner:{type:'ground',x:2+i%8,z:21+Math.floor(i/8)}} satisfies MaterialPile);
 for(let i=0;i<20;i++)world.piles.push({id:world.nextId++,kind:'steel',item:'steel',quantity:5,owner:{type:'ground',x:2+i%8,z:27+Math.floor(i/8)}} satisfies MaterialPile);
 addMaterial(world,'jade',1,{type:'ground',x:7,z:26},'jade');const jade=world.piles.find(p=>p.item==='jade')!;
 world.home=[...new Set(world.piles.flatMap(p=>p.owner.type==='ground'?[p.owner.z*world.width+p.owner.x]:[]))].sort((a,b)=>a-b);
 const destination=planet.civilianTile;if(destination===null)throw Error('Public geography has no civilian route target');
 let page:NativePage;
 const state:NativeUiState={world,panel:'world',category:'orders',tool:'select',orientation:0,selectedPawnIds:[],selectedObjects:[],constructionMaterial:'wood',creationStorage:{filters:{wood:true,food:true},priority:0},speed:0,hasGame:true,busy:false,saves:[]};
 const command=vi.fn(async(_value:Parameters<NativeUiActions['command']>[0])=>({ok:true}));
 const actions:NativeUiActions={command,panel:vi.fn(),category:vi.fn(),tool:vi.fn(),selectPawn:vi.fn(),speed:vi.fn(),rotate:vi.fn(),material:vi.fn(),creationStorage:vi.fn(),front:vi.fn(),save:vi.fn(),exportSave:vi.fn(),showPage:next=>{page=next;},refresh:vi.fn()};
 setNativeWorldTab('groups');page=buildNativeWorld(state,actions);
 const row=(id:string)=>{const found=page.rows.find(row=>row.id===id);if(!found)throw Error('Missing native row '+id);return found;};
 const control=(id:string):NativeControl=>{const found=[...page.rows.flatMap(row=>row.controls??[]),...page.actions??[]].find(c=>c.id===id);if(!found)throw Error('Missing native control '+id);return found;};
 const click=async(id:string)=>{const c=control(id);expect(c.disabled).not.toBe(true);await c.onActivate();};
 const commit=async(id:string,value:string)=>{const input=row(id).input;if(!input)throw Error('Missing native input '+id);expect(await input.onCommit(value)).not.toBe(false);};
 const select=()=>{const s=control('formation-item-filter').select;if(!s)throw Error('Missing real native select');return s;};
 const choose=async(value:string)=>{await select().onChange(value);};
 const visible=()=>page.rows.filter(row=>/^formation-pile-\d+$/.test(row.id));
 return {world,jade,destination,row,control,click,commit,select,choose,visible,command,get page(){return page;}};
}

test('the public item filter pages distinct original piles, preserves quantities across types and forwards the unchanged full formation draft',async()=>{
 const f=fixture(),all=groupSourceChoices(f.world),before=JSON.stringify(f.world),rng=f.world.rng,next=f.world.nextId,tick=f.world.tick;
 await f.click('group-formation-open');
 expect(f.select().value).toBe('');expect(f.select().options[0]).toMatchObject({value:'',label:'Tous les biens'});
 expect(new Set(f.select().options.slice(1).map(o=>o.value))).toEqual(new Set(all.map(c=>c.pile.item)));
 expect(f.visible().map(r=>r.id)).toEqual(all.slice(0,16).map(c=>`formation-pile-${c.pile.id}`));
 await f.click(`formation-person-${f.world.pawns[0]!.id}-toggle`);await f.commit('formation-destination',String(f.destination));
 const food=all.filter(c=>c.pile.item==='survival-meal');expect(food.length).toBeGreaterThan(32);
 await f.choose('survival-meal');expect(f.visible().map(r=>r.id)).toEqual(food.slice(0,16).map(c=>`formation-pile-${c.pile.id}`));
 expect(f.row('formation-sources-page').value).toBe(`1–16 / ${food.length}`);
 const first=food[0]!.pile.id,second=food[16]!.pile.id;expect(first).not.toBe(second);
 await f.commit(`formation-pile-${first}`,'4');await f.click('formation-sources-next');await f.commit(`formation-pile-${second}`,'2');
 expect(f.row('formation-sources-page').value).toBe(`17–32 / ${food.length}`);
 await f.choose('jade');expect(f.visible().map(r=>r.id)).toEqual([`formation-pile-${f.jade.id}`]);expect(f.page.rows.some(r=>r.id==='formation-sources-page')).toBe(false);
 await f.commit(`formation-pile-${f.jade.id}`,'1');
 await f.choose('survival-meal');expect(f.row('formation-sources-page').value).toBe(`1–16 / ${food.length}`);expect(f.row(`formation-pile-${first}`).input?.value).toBe('4');
 await f.click('formation-sources-next');expect(f.row(`formation-pile-${second}`).input?.value).toBe('2');
 await f.choose('');expect(f.row('formation-sources-page').value).toBe(`1–16 / ${all.length}`);
 await f.click('formation-preview');expect(f.page.id).toBe('formation-confirm');await f.click('formation-commit');
 const sources=[{pileId:first,quantity:4},{pileId:second,quantity:2},{pileId:f.jade.id,quantity:1}].sort((a,b)=>a.pileId-b.pileId);
 expect(f.command).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({type:'group-start',destination:f.destination,sources}));
 expect(f.command.mock.calls[0]![0]).not.toHaveProperty('sourceItem');expect(f.command.mock.calls[0]![0]).not.toHaveProperty('sourcePage');
 expect(JSON.stringify(f.world)).toBe(before);expect(f.world.rng).toBe(rng);expect(f.world.nextId).toBe(next);expect(f.world.tick).toBe(tick);
});

test('existing297 permissions remain authoritative while removed types reject stale callbacks and reset the filtered page without dropping quantities',async()=>{
 const f=fixture(),person=f.world.pawns[0]!.id;await f.click('group-formation-open');
 const baseline=JSON.stringify(f.world),initial=f.page,absentCallback=f.select().onChange;
 expect(f.select().options.some(o=>o.value==='uranium')).toBe(false);
 expect(()=>absentCallback('uranium')).toThrow('sources disponibles');expect(f.page).toBe(initial);expect(JSON.stringify(f.world)).toBe(baseline);
 await f.click(`formation-person-${person}-toggle`);await f.commit('formation-destination',String(f.destination));
 await f.choose('jade');await f.commit(`formation-pile-${f.jade.id}`,'1');expect(f.row('formation-draft-preview').value).toBe('Choix admissibles');
 // Declared permission fault. In297 this pile stays PUBLIC with a refusal;
 // the UI filter must never clear its Forbid or make its pickup admissible.
 f.jade.forbidden=true;const forbidden=JSON.stringify(f.world);
 await f.choose('');await f.choose('jade');expect(f.select().options.some(o=>o.value==='jade')).toBe(true);
 expect(f.row(`formation-pile-${f.jade.id}`).input?.value).toBe('1');expect(f.row(`formation-pile-${f.jade.id}`).hint).toContain('interdit');
 expect(f.row('formation-draft-preview').value).toBe('source-or-carrier-capacity');await expect(f.click('formation-preview')).rejects.toThrow('source-or-carrier-capacity');
 expect(f.jade.forbidden).toBe(true);expect(JSON.stringify(f.world)).toBe(forbidden);expect(f.command).not.toHaveBeenCalled();
 const staleJade=f.select().onChange;f.world.piles=f.world.piles.filter(p=>p!==f.jade);const removed=JSON.stringify(f.world),prior=f.page;
 expect(()=>staleJade('jade')).toThrow('sources disponibles');expect(f.page).toBe(prior);expect(JSON.stringify(f.world)).toBe(removed);
 await f.commit('formation-destination',String(f.destination));expect(f.select().value).toBe('');expect(f.select().options.some(o=>o.value==='jade')).toBe(false);
 // Restore the SAME diagnostic original, still forbidden; its saved quantity survives.
 f.world.piles.push(f.jade);await f.commit('formation-destination',String(f.destination));await f.choose('jade');
 expect(f.row(`formation-pile-${f.jade.id}`).input?.value).toBe('1');expect(f.jade.forbidden).toBe(true);
 const food=groupSourceChoices(f.world).filter(c=>c.pile.item==='survival-meal');await f.choose('survival-meal');await f.commit(`formation-pile-${food[0]!.pile.id}`,'3');await f.click('formation-sources-next');
 expect(f.row('formation-sources-page').value).toBe(`17–32 / ${food.length}`);const staleFood=f.select().onChange,foodIds=new Set(food.map(c=>c.pile.id));
 f.world.piles=f.world.piles.filter(p=>!foodIds.has(p.id));const vanished=JSON.stringify(f.world);
 expect(()=>staleFood('survival-meal')).toThrow('sources disponibles');expect(JSON.stringify(f.world)).toBe(vanished);
 await f.commit('formation-destination',String(f.destination));const others=groupSourceChoices(f.world);expect(others.length).toBeGreaterThan(16);
 expect(f.select().value).toBe('');expect(f.row('formation-sources-page').value).toBe(`1–16 / ${others.length}`);
 f.world.piles.push(...food.map(c=>c.pile));await f.commit('formation-destination',String(f.destination));await f.choose('survival-meal');expect(f.row(`formation-pile-${food[0]!.pile.id}`).input?.value).toBe('3');
 await f.choose('jade');expect(f.row(`formation-pile-${f.jade.id}`).input?.value).toBe('1');expect(f.jade.forbidden).toBe(true);
 const oldDraftCallback=f.select().onChange;await f.click('formation-back');await f.click('group-formation-open');
 expect(()=>oldDraftCallback('')).toThrow('brouillon courant');expect(f.select().value).toBe('');expect(f.command).not.toHaveBeenCalled();
});