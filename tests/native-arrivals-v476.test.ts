import {describe,expect,it,vi} from 'vitest';
import {buildNativeArrivals,nativeArrivalRows} from '../src/ui3d/native-arrivals';
import type {NativeControl,NativePage,NativeUiActions,NativeUiState} from '../src/ui3d/native-contract';
import {createWorld} from '../src/sim/engine';
import {advanceArrivals,applyArrival,enableArrivals} from '../src/sim/arrivals';
import {serializeWorld,validateWorld} from '../src/sim/serialization';
import {createScenarioWorld} from '../src/sim/new-game';
import {prepareGroupScenario} from '../src/sim/group-scenario';
import {TICKS_PER_DAY,type World} from '../src/sim/types';

/** Declared due incident at the genuine initial tick, not a simulated waiting
 * period. The real offer producer runs; no deterioration/other owner clock is
 * skipped or repaired to disguise an unplayed interval. */
function offered(world:World=createWorld(42)){enableArrivals(world);world.arrivals!.nextCheck=world.tick;advanceArrivals(world);expect(world.arrivals!.pending).toBeDefined();expect(validateWorld(world)).toEqual([]);return world;}
function fixture(world:World){
 let current:NativeUiState={world,epoch:1,panel:'quests',category:'orders',tool:'select',orientation:0,selectedPawnIds:[],selectedObjects:[],constructionMaterial:'wood',creationStorage:{filters:{wood:true,food:true},priority:0},speed:0,hasGame:true,busy:false,saves:[]};
 let shown:NativePage|undefined;
 const command=vi.fn(async(command:Parameters<NativeUiActions['command']>[0])=>{if(command.type!=='answer-arrival'&&command.type!=='enable-arrivals')throw Error('Unexpected command');return applyArrival(current.world!,command);});
 const actions:NativeUiActions={command,readState:()=>current,refresh:vi.fn(),showPage:page=>{shown=page;},closePage:vi.fn(),panel:vi.fn(),category:vi.fn(),tool:vi.fn(),selectPawn:vi.fn(),speed:vi.fn(),rotate:vi.fn(),material:vi.fn(),creationStorage:vi.fn(),front:vi.fn(),save:vi.fn(),exportSave:vi.fn()};
 const page=buildNativeArrivals(current,actions);
 const find=(id:string):NativeControl=>{const found=[...(page.actions??[]),...page.rows.flatMap(row=>row.controls??[])].find(control=>control.id===id);if(!found)throw Error(`Missing native control ${id}`);return found;};
 const click=async(id:string)=>{const control=find(id);expect(control.disabled).not.toBe(true);await control.onActivate();};
 return {page,actions,command,find,click,get state(){return current;},setState:(next:NativeUiState)=>{current=next;},get shown(){return shown;}};
}

describe('native ordinary arrival letter ownership and decisions',()=>{
 it('reads the recorded offer without changing its owners, clocks or random streams, and postpones without a command',async()=>{
  const world=offered(),offer=world.arrivals!.pending!,before=serializeWorld(world),f=fixture(world);
  expect(f.page.rows.find(row=>row.id==='arrival-offer')?.label).toContain(offer.name);
  expect(f.page.rows.find(row=>row.id==='arrival-time')?.value).toBe('24 h');
  expect(f.page.rows.find(row=>row.id==='arrival-skill-construction')).toBeDefined();
  expect(f.page.rows.find(row=>row.id==='arrival-refusal-effect')?.value).toContain('six jours');
  const entries=nativeArrivalRows(f.state,f.actions);await entries[0]!.controls![0]!.onActivate();expect(f.shown?.id).toBe('native-arrivals');
  await f.click('arrival-postpone');expect(f.actions.closePage).toHaveBeenCalledOnce();expect(f.command).not.toHaveBeenCalled();expect(serializeWorld(world)).toBe(before);
 });

 it('admits the original offered identity by the actual command, including its external shirt, and fences a repeated old button',async()=>{
  const world=offered(),offer=world.arrivals!.pending!,id=world.nextId,count=world.pawns.length,f=fixture(world),accept=f.find('arrival-accept');
  await accept.onActivate();expect(f.command).toHaveBeenCalledExactlyOnceWith({type:'answer-arrival',offerId:offer.id,accept:true});
  expect(world.pawns).toHaveLength(count+1);expect(world.pawns.at(-1)).toMatchObject({id,name:offer.name,foodPolicyId:world.foodPolicies[0]!.id});
  expect(world.piles.at(-1)).toMatchObject({id:id+1,item:'cloth-shirt',quantity:1,owner:{type:'apparel',pawnId:id}});
  expect(world.arrivals!.pending).toBeUndefined();expect(f.page.rows.find(row=>row.id==='arrival-empty')).toBeDefined();expect(validateWorld(world)).toEqual([]);
  await expect(accept.onActivate()).rejects.toThrow('n’est plus disponible');expect(f.command).toHaveBeenCalledTimes(1);
 });

 it('sends an explicit refusal and preserves the actual six-day memory consequence',async()=>{
  const world=offered(),offer=world.arrivals!.pending!,count=world.pawns.length,f=fixture(world);await f.click('arrival-decline');
  expect(f.command).toHaveBeenCalledExactlyOnceWith({type:'answer-arrival',offerId:offer.id,accept:false});expect(world.pawns).toHaveLength(count);expect(world.arrivals!.declined).toBe(1);
  expect(world.pawns[0]!.deniedJoining).toContain(world.tick+6*TICKS_PER_DAY);expect(validateWorld(world)).toEqual([]);
 });

 it('rejects stale content, expiration and a replacement epoch before sending any old decision',async()=>{
  const world=offered(),f=fixture(world),accept=f.find('arrival-accept'),offer=world.arrivals!.pending!,name=offer.name;
  offer.name='Autre identité annoncée';await expect(accept.onActivate()).rejects.toThrow('contenu a changé');expect(f.command).not.toHaveBeenCalled();offer.name=name;
  const tick=world.tick;world.tick=offer.expiresAt;await expect(accept.onActivate()).rejects.toThrow('n’est plus disponible');expect(f.command).not.toHaveBeenCalled();world.tick=tick;
  f.setState({...f.state,epoch:2});await expect(accept.onActivate()).rejects.toThrow('partie ou la carte a changé');expect(f.command).not.toHaveBeenCalled();
 });

 it('rechecks runtime blocking and current-read availability even if an old enabled button is called',async()=>{
  const f=fixture(offered()),accept=f.find('arrival-accept');f.setState({...f.state,busy:true});await expect(accept.onActivate()).rejects.toThrow('Attendez');expect(f.command).not.toHaveBeenCalled();
  f.setState({...f.state,busy:false,fault:'Incident courant'});await expect(accept.onActivate()).rejects.toThrow('Incident courant');expect(f.command).not.toHaveBeenCalled();
  const page=buildNativeArrivals({...f.state,fault:undefined},{...f.actions,readState:undefined});expect(page.actions?.find(control=>control.id==='arrival-accept')?.disabled).toBe(true);
 });

 it('offers historical enablement only where permitted, without creating a traveler or past event',async()=>{
  const world=createWorld(42),count=world.pawns.length,tick=world.tick,rng=world.rng,f=fixture(world);expect(world.arrivals).toBeUndefined();
  await f.click('arrival-enable');expect(f.command).toHaveBeenCalledExactlyOnceWith({type:'enable-arrivals'});expect(world.arrivals?.pending).toBeUndefined();expect(world.arrivals?.nextCheck).toBeGreaterThan(tick);expect(world.pawns).toHaveLength(count);expect(world.tick).toBe(tick);expect(world.rng).toBe(rng);
  const modern=createScenarioWorld(42,32,'crashlanded');expect(modern.gameProfile).toBeDefined();const g=fixture(modern);expect(g.page.actions?.some(control=>control.id==='arrival-enable')).toBe(false);expect(nativeArrivalRows(g.state,g.actions)).toEqual([]);
 });

 it('retains a physically refused offer and shows the authority reason without changing its World',async()=>{
  // This declared camp's people, supplies and buildings are all inside the
  // border, with no natural-resource owners there. Closing its empty border
  // therefore changes accessibility without stranding any entity or pile.
  const world=offered(prepareGroupScenario());for(let i=0;i<world.tiles.length;i++){const x=i%world.width,z=Math.floor(i/world.width);if(x===0||z===0||x===world.width-1||z===world.height-1)world.tiles[i]={terrain:'water'};}
  expect(validateWorld(world)).toEqual([]);
  const before=serializeWorld(world),f=fixture(world);await expect(f.click('arrival-accept')).rejects.toThrow('Aucune entrée');
  expect(serializeWorld(world)).toBe(before);expect(world.arrivals!.pending).toBeDefined();expect(f.page.rows.find(row=>row.id==='arrival-feedback')?.value).toContain('Aucune entrée');expect(f.find('arrival-accept').disabled).toBe(false);
 });
});
