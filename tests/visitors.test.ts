import { expect,test } from 'vitest';
import { deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { advanceVisitors,enableVisitors,visitorGroupDanger,visitorMayTrade } from '../src/sim/visitors.ts';
import { consumeVisitorOpportunity,newVisitorAgenda,VISITOR_FLOWS,VISITOR_YEAR } from '../src/sim/visitor-state.ts';
import { validateVisitors } from '../src/sim/visitor-save.ts';
import { visitorAtEdge,visitorArrival } from '../src/sim/visitor-navigation.ts';
import { rotAge } from '../src/sim/food-preservation.ts';
import { visitorTradeFixture } from './scenarios/visitors.ts';
import { deconstructionCamp,fixtureBuilding } from './scenarios/deconstruction.ts';
import type { World } from '../src/sim/types.ts';

function replay(w:World,ticks:number):void {
  expect(validateWorld(w)).toEqual([]);const clone=deserializeWorld(serializeWorld(w));
  stepWorld(w,ticks);stepWorld(clone,ticks);expect(serializeWorld(clone)).toBe(serializeWorld(w));
}
function until(w:World,condition:()=>boolean,max=3500):void {for(let i=0;i<max&&!condition();i++)stepWorld(w);expect(condition(),JSON.stringify({tick:w.tick,pawns:w.pawns.map(p=>({id:p.id,state:p.state,visitor:p.visitor,need:p.need,x:p.x,z:p.z,path:p.path.length})),groups:w.visitors?.groups})).toBe(true);}

test('neutral calendars retain yearly counts/spacing, independent RNG and explicit adoption without an intro replay',()=>{
  for(const kind of ['traveler','visitor'] as const){const a=newVisitorAgenda(42,kind,0),copy=structuredClone(a),rule=VISITOR_FLOWS[kind];let prior=-VISITOR_YEAR;
    for(let cycle=0;cycle<3;cycle++){const scheduled=[...a.pending];expect(scheduled).toHaveLength(rule.count);
      for(const tick of scheduled){expect(tick-prior).toBeGreaterThanOrEqual(rule.spacing);expect(tick%100).toBe(0);expect(consumeVisitorOpportunity(a,kind,tick)).toBe(true);expect(consumeVisitorOpportunity(copy,kind,tick)).toBe(true);prior=tick;}
      expect(a).toEqual(copy);
    }
  }
  const w=deconstructionCamp();w.tick=12000;enableVisitors(w);expect(w.visitors!.introAt).toBeNull();expect(w.visitors!.traveler.pending[0]).toBeGreaterThan(w.tick);
  expect(w.visitors!.visitor.pending[0]).toBeGreaterThan(w.tick);const before=JSON.stringify(w.visitors);enableVisitors(w,true);expect(JSON.stringify(w.visitors)).toBe(before);
  expect(validateVisitors({...w,schemaVersion:87} as unknown as World,87,new Set())).toEqual(['Legacy save contains visitor state.']);
});

test('real intro produces finite owned stock, physical personal ingestion and exact continuation without eating colonial supplies',()=>{
  const {world:w,traderId}=visitorTradeFixture(),p=w.pawns.find(p=>p.id===traderId)!;
  expect(validateWorld(w)).toEqual([]);expect(p.faction).toBe('outlanders');expect(visitorMayTrade(w,p)).toBe(true);
  const personal=w.piles.find(i=>p.visitor!.personalFoodIds.includes(i.id))!,initial=personal.quantity,age=rotAge(personal,w.tick);
  const colony={id:w.nextId++,kind:'food' as const,item:'survival-meal' as const,quantity:7,owner:{type:'ground' as const,x:15,z:15}};w.piles.push(colony);
  p.hunger=5;stepWorld(w);expect(p.need?.kind).toBe('eat');expect(p.hunger).toBeLessThan(6);expect(visitorMayTrade(w,p)).toBe(false);
  const carried=w.piles.find(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)!;expect(carried.quantity).toBe(1);expect(rotAge(carried,w.tick)).toBeGreaterThanOrEqual(age);
  expect(w.piles.find(i=>i.id===personal.id)!.quantity).toBe(initial-1);replay(w,20);
  until(w,()=>p.need===null,100);expect(p.hunger).toBeGreaterThan(90);expect(colony.quantity).toBe(7);expect(w.piles.some(i=>i.id===carried.id)).toBe(false);
  expect(p.visitor!.personalFoodIds).not.toContain(carried.id);expect(p.bedId).toBeNull();replay(w,25);
});

test('arrival starts the strictly elapsed halt, then genuine border departure freezes possessions and rejects corrupted archives',()=>{
  const {world:w,traderId}=visitorTradeFixture(),p=w.pawns.find(p=>p.id===traderId)!;
  until(w,()=>p.visitor!.phase==='staying');const g=w.visitors!.groups.find(g=>g.id===p.visitor!.group)!;
  expect(g.arrivedAt).toBe(w.tick);expect(visitorAtEdge(w,p)).toBe(false);
  replay(w,15);until(w,()=>p.visitor!.phase==='leaving');expect((w.tick-g.arrivedAt!)*10).toBeGreaterThan(g.durationCore);
  const owned=w.piles.filter(i=>'pawnId' in i.owner&&i.owner.pawnId===p.id).map(i=>i.id);
  until(w,()=>!w.pawns.includes(p));const d=w.visitors!.departed.find(d=>d.pawn.id===traderId)!;
  expect(visitorAtEdge(w,d.pawn)).toBe(true);expect(d.pawn.health).toEqual(p.health);expect(d.items.map(i=>i.id)).toEqual(owned);expect(w.visitors!.groups).toHaveLength(0);
  const frozen=JSON.stringify(d);replay(w,30);expect(JSON.stringify(w.visitors!.departed[0])).toBe(frozen);
  for(const mutate of [(v:World)=>v.visitors!.departed[0]!.pawn.id=v.pawns[0]!.id,(v:World)=>v.visitors!.departed[0]!.items[0]!.id=v.pawns[0]!.id,(v:World)=>v.visitors!.departed[0]!.pawn.hunger=Infinity,(v:World)=>v.visitors!.departed[0]!.pawn.need={kind:'sleep',phase:'sleep',bedId:null,target:{x:1,z:1}},(v:World)=>v.visitors!.departed[0]!.items[0]!.owner={type:'inventory',pawnId:v.pawns[0]!.id}]){const bad=structuredClone(w);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
});

test('blocked incidence is atomic; aggression closes trading and a sealed exit retains the person and inventory',()=>{
  const blocked=deconstructionCamp();for(let i=0;i<blocked.tiles.length;i++)if(i<blocked.width||i>=blocked.tiles.length-blocked.width||i%blocked.width===0||i%blocked.width===blocked.width-1)blocked.tiles[i]={terrain:'rock'};
  enableVisitors(blocked,true);blocked.tick=15000;const rng=blocked.visitors!.rng,nextId=blocked.nextId,pawns=blocked.pawns.length;advanceVisitors(blocked);
  expect(blocked.visitors!.introAt).toBeNull();expect(blocked.visitors!.rng).toBe(rng);expect(blocked.nextId).toBe(nextId);expect(blocked.pawns).toHaveLength(pawns);expect(blocked.piles).toHaveLength(0);
  const {world:w,traderId}=visitorTradeFixture(),p=w.pawns.find(p=>p.id===traderId)!;until(w,()=>p.visitor!.phase==='staying');
  for(let z=p.z-1;z<=p.z+1;z++)for(let x=p.x-1;x<=p.x+1;x++)if(x!==p.x||z!==p.z)fixtureBuilding(w,'wall',x,z);
  const ids=w.piles.filter(i=>'pawnId' in i.owner&&i.owner.pawnId===p.id).map(i=>i.id);visitorGroupDanger(w,p,'hostile');expect(visitorMayTrade(w,p)).toBe(false);
  replay(w,80);expect(w.pawns).toContain(p);expect(p.visitor!.phase).toBe('leaving');expect(p.visitor!.goal).toBeNull();expect(w.piles.filter(i=>'pawnId' in i.owner&&i.owner.pawnId===p.id).map(i=>i.id)).toEqual(ids);
  const crossing=visitorArrival(deconstructionCamp(),123,3,'traveler');expect(crossing).not.toBeNull();expect(visitorAtEdge(w,crossing!.spot)).toBe(true);expect((crossing!.entry.x-crossing!.spot.x)**2+(crossing!.entry.z-crossing!.spot.z)**2).toBeGreaterThanOrEqual(256);
});
