import {expect,test,vi} from 'vitest';
import {applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld} from '../src/sim/index.ts';
import {prepareGroupScenario} from '../src/sim/group-scenario.ts';
import {processGroupOnMap} from '../src/sim/group-driver.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {considerFlee,processFlee,threatQueries} from '../src/sim/threats.ts';
import {considerAutomaticCombat} from '../src/sim/automatic-combat.ts';
import {processMelee} from '../src/sim/melee.ts';
import {startingPawn} from '../src/sim/starting-pawns.ts';
import {damagePile} from '../src/sim/thing-damage.ts';
import {blockedCells} from '../src/sim/pathfinding.ts';
import {moveToward} from '../src/sim/travel.ts';
import {search,type SearchBudget} from '../src/sim/work-planner.ts';
import {WeightedSearch} from '../src/sim/weighted-search.ts';
import {LightEnvironmentCache} from '../src/sim/light-environment.ts';
import {commercialCamp} from './helpers/commercial-v193.ts';
import type {NeedContext} from '../src/sim/needs.ts';
import type {World} from '../src/sim/types.ts';

function ordinaryContext(w:World,p:World['pawns'][number],budget:SearchBudget):NeedContext {
  return {search:goals=>search(w,p,blockedCells(w),new Set(),budget,goals),
    move:(cell,exact)=>moveToward(w,p,cell,true,()=>blockedCells(w),budget,exact),release:()=>false,event:()=>{}};
}
function unloading() {
  const {world:w}=commercialCamp(32);stepWorld(w);
  const p=w.pawns[0]!;Object.assign(p,{x:6,z:10,planCooldown:0});delete p.background;delete p.traits;delete p.health;
  addMaterial(w,'silver',7,{type:'inventory',pawnId:p.id},'silver');
  const cargo=w.piles.at(-1)!;
  expect(applyCommand(w,{type:'planet-adopt'}).ok).toBe(true);
  expect(applyCommand(w,{type:'group-unload',memberIds:[p.id]}).ok).toBe(true);
  expect(validateWorld(w)).toEqual([]);return {w,p,cargo};
}

test('actual flee, pursuit and aim interrupt unloading without clearing their routes, edge or recovery owners',()=>{
  for(const kind of ['flee','melee','shooting'] as const){
    const {w,p,cargo}=unloading(),enemy=startingPawn(w.nextId++,'Adversaire',kind==='shooting'?10:9,10,0,100,w.seed,w.tick);
    enemy.faction='outlaws';enemy.schedule.fill('work');delete enemy.health;w.pawns.push(enemy);
    const budget={remaining:3,pairs:32768},light=new LightEnvironmentCache();
    if(kind==='flee')considerFlee(w,p,threatQueries(w));
    else {
      expect(applyCommand(w,{type:'hostility-response',pawnId:p.id,response:'attack'}).ok).toBe(true);
      if(kind==='shooting')addMaterial(w,'weapon',1,{type:'equipment',pawnId:p.id},'revolver');
      considerAutomaticCombat(w,p,budget);
      if(kind==='melee')processMelee(w,p,()=>blockedCells(w),budget,()=>light.read(w));
    }
    expect(kind==='flee'?p.flee:kind==='melee'?p.melee:p.shooting).toBeDefined();
    if(kind==='melee')expect(p.motion?.end).toBeGreaterThan(w.tick);
    const active={path:structuredClone(p.path),motion:structuredClone(p.motion),state:p.state,planCooldown:p.planCooldown,
      flee:structuredClone(p.flee),melee:structuredClone(p.melee),shooting:structuredClone(p.shooting)},owner=structuredClone(cargo.owner);
    const noOverwrite:NeedContext={search:()=>{throw Error('Danger must keep control');},move:()=>{throw Error('Unload took danger movement');},release:()=>false,event:()=>{}};
    expect(processGroupOnMap(w,p,noOverwrite)).toBe(false);expect(w.group).toBeUndefined();
    expect({path:p.path,motion:p.motion,state:p.state,planCooldown:p.planCooldown,flee:p.flee,melee:p.melee,shooting:p.shooting}).toEqual(active);
    expect(w.piles).toContain(cargo);expect(cargo.owner).toEqual(owner);expect(cargo.quantity).toBe(7);
    if(kind==='flee'){
      processFlee(w,p,threatQueries(w),()=>blockedCells(w),budget,()=>light.read(w));
      expect(p.flee).toBeDefined();expect(p.motion?.end).toBeGreaterThan(w.tick);
    }
    expect(validateWorld(w)).toEqual([]);
    const twin=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(twin);
    expect(serializeWorld(twin)).toBe(serializeWorld(w));expect(validateWorld(w)).toEqual([]);
    expect(w.piles.find(i=>i.id===cargo.id)).toMatchObject({quantity:7,owner});
  }
});

test('destroying an unserved source cancels gathering or loading at the tick boundary, retaining true earlier pickups',()=>{
  for(const phase of ['gathering','loading'] as const){
    const w=prepareGroupScenario(),members=w.pawns.slice(0,2),food=w.piles.filter(p=>p.item==='survival-meal'),cloth=w.piles.find(p=>p.item==='cloth')!;
    const sources=[...food.map(p=>({pileId:p.id,quantity:4})),{pileId:cloth.id,quantity:60}];
    expect(applyCommand(w,{type:'planet-adopt'}).ok).toBe(true);
    expect(applyCommand(w,{type:'group-start',memberIds:members.map(p=>p.id),sources,destination:w.planet!.civilianTile}).ok).toBe(true);
    if(phase==='loading'){
      for(let i=0;i<800&&!(w.group&&'cursor' in w.group&&w.group.cursor===1);i++)stepWorld(w);
      expect(w.group).toMatchObject({phase:'loading',cursor:1});
    }else expect(w.group?.phase).toBe('gathering');
    const carried=w.piles.filter(p=>{const owner=p.owner;return owner.type==='inventory'&&members.some(m=>m.id===owner.pawnId);}),saved=carried.map(p=>({id:p.id,quantity:p.quantity,owner:structuredClone(p.owner)}));
    if(phase==='loading')expect(saved.length).toBeGreaterThan(0);
    const nextId=w.nextId;
    // A real damage producer destroys a later promised pile; the currently
    // approached food pile remains available. No synthetic inventory loss.
    expect(damagePile(w,cloth,1000,'bomb')).toBe(true);expect(w.piles).not.toContain(cloth);
    stepWorld(w);expect(w.group).toBeUndefined();expect(validateWorld(w)).toEqual([]);
    expect(w.nextId).toBe(nextId);
    for(const pile of carried){expect(w.piles).toContain(pile);expect(pile).toMatchObject(saved.find(s=>s.id===pile.id)!);}
    const twin=deserializeWorld(serializeWorld(w));stepWorld(w,3);stepWorld(twin,3);expect(serializeWorld(twin)).toBe(serializeWorld(w));
    expect(w.piles.some(p=>p.id===cloth.id)).toBe(false);
  }
});

test('unloading at PATH quota0 performs no weighted search, then uses one admitted ordinary route and a real deposit',()=>{
  const {w,p,cargo}=unloading();
  // Occupy the origin and four contacts so a usable floor requires movement.
  for(const [x,z] of [[6,10],[6,9],[7,10],[6,11],[5,10]])addMaterial(w,'wood',1,{type:'ground',x:x!,z:z!},'wood');
  refreshStock(w);const groundBefore=w.piles.filter(i=>i.item==='silver'&&i.owner.type==='ground').reduce((n,i)=>n+i.quantity,0);
  const budget={remaining:0,pairs:32768},ctx=ordinaryContext(w,p,budget),id=w.nextId,rng=w.rng,spy=vi.spyOn(WeightedSearch.prototype,'advance');
  try {
    expect(processGroupOnMap(w,p,ctx)).toBe(true);expect(spy).not.toHaveBeenCalled();
    expect(budget.remaining).toBe(0);expect(p.motion?.end??0).toBeLessThanOrEqual(w.tick);expect(cargo.owner.type).toBe('inventory');
    expect(w.nextId).toBe(id);expect(w.rng).toBe(rng);expect(w.group?.phase).toBe('unloading');
    budget.remaining=1;
    expect(processGroupOnMap(w,p,ctx)).toBe(true);expect(spy).toHaveBeenCalledTimes(1);expect(budget.remaining).toBe(0);
    expect(p.motion?.end).toBeGreaterThan(w.tick);
  }finally{spy.mockRestore();}
  for(let i=0;i<150&&w.group;i++)stepWorld(w);
  expect(w.group).toBeUndefined();expect(w.piles.some(i=>i.id===cargo.id&&i.owner.type==='inventory')).toBe(false);
  expect(w.piles.filter(i=>i.item==='silver'&&i.owner.type==='ground').reduce((n,i)=>n+i.quantity,0)).toBe(groundBefore+7);
  expect(validateWorld(w)).toEqual([]);
});
