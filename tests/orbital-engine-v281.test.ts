import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {quoteOrbitalTrade} from '../src/sim/orbital-rules.ts';
import {serviceCell} from '../src/sim/service-reservations.ts';
import {colonyWealth} from '../src/sim/colony-wealth.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {orbitalCamp} from './helpers/orbital-v281.ts';
import {advanceOrbital} from '../src/sim/orbital.ts';
import {crashlandedProfile} from '../src/sim/game-profile.ts';

test('prospective orbital calendar emits once at its sampled active check and never during eight off days',()=>{
  const {world:w}=orbitalCamp();w.gameProfile=crashlandedProfile();const state=w.orbital!,rng=w.rng;
  state.ships=[];w.piles=w.piles.filter(p=>p.owner.type!=='orbital-ship');
  w.tick=state.scheduledAt-1;advanceOrbital(w);expect(state.ships).toHaveLength(0);
  w.tick++;advanceOrbital(w);expect(state.ships).toHaveLength(1);const id=state.ships[0]!.id,after=structuredClone(state);
  advanceOrbital(w);expect(state).toEqual(after);expect(state.ships[0]!.id).toBe(id);
  for(let day=7;day<15;day++){w.tick=state.cycleStart+day*6000;advanceOrbital(w);expect(state.ships.every(s=>s.id===id)).toBe(true);}
  const start=state.cycleStart;w.tick=start+90000;advanceOrbital(w);expect(state.cycleStart).toBe(start+90000);
  expect(state.scheduledAt).toBeGreaterThanOrEqual(state.cycleStart);expect(state.scheduledAt).toBeLessThan(state.cycleStart+42000);expect(w.rng).toBe(rng);
});

test('engine reaches the actual console, preserves flight on reload and deposits physical purchases',()=>{
  const f=orbitalCamp(),w=f.world,p=w.pawns.find(p=>p.id===f.negotiatorId)!;
  expect(applyCommand(w,{type:'order-orbital-trade',pawnId:p.id,shipId:f.shipId,consoleId:f.consoleId}).ok).toBe(true);
  for(let i=0;i<100&&p.orbitalTrade?.phase!=='ready';i++)stepWorld(w);
  expect(p.orbitalTrade?.phase).toBe('ready');expect(serviceCell(p)).toEqual({x:15,z:15});expect(validateWorld(w)).toEqual([]);
  const component=w.piles.find(p=>p.item==='component'&&p.owner.type==='orbital-ship')!,lines=[{pileId:component.id,quantity:3}];
  const q=quoteOrbitalTrade(w,p.id,f.shipId,lines);expect(q.ok).toBe(true);if(!q.ok)return;
  expect(applyCommand(w,{type:'orbital-trade-execute',pawnId:p.id,shipId:f.shipId,lines,quote:q.signature,acceptShortfall:false}).ok).toBe(true);
  expect(w.orbital!.pending).toHaveLength(1);const copy=deserializeWorld(serializeWorld(w));
  stepWorld(w,11);stepWorld(copy,11);expect(copy).toEqual(w);expect(w.orbital!.pending).toEqual([]);expect(validateWorld(w)).toEqual([]);
  expect(w.piles.filter(p=>p.item==='component'&&p.owner.type==='ground').reduce((n,p)=>n+p.quantity,0)).toBe(8);
});

test('an explicit replacement order releases contact and the service claim through common work release',()=>{
  const f=orbitalCamp(),w=f.world,p=w.pawns.find(p=>p.id===f.negotiatorId)!;
  expect(applyCommand(w,{type:'order-orbital-trade',pawnId:p.id,shipId:f.shipId,consoleId:f.consoleId}).ok).toBe(true);
  expect(serviceCell(p)).toEqual({x:15,z:15});
  expect(applyCommand(w,{type:'clear-orders',pawnId:p.id}).ok).toBe(true);
  expect(p.orbitalTrade).toBeUndefined();expect(serviceCell(p)).toBeNull();expect(validateWorld(w)).toEqual([]);
});

test('finite foreign stock changes neither local warehouse totals nor colonial wealth',()=>{
  const {world:w}=orbitalCamp();refreshStock(w);const stock=structuredClone(w.stock),wealth=colonyWealth(w);
  const local={...w,piles:w.piles.filter(p=>p.owner.type!=='orbital-ship')};refreshStock(local);
  expect(local.stock).toEqual(stock);expect(colonyWealth(local)).toEqual(wealth);
});
