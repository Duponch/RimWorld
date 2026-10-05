import { describe,it,expect } from 'vitest';
import { commercialCamp } from './helpers/commercial-v193.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { generatePlanet,planetHomeInput,tileCoordinates,tileCorners } from '../src/sim/planet-generation.ts';
import { validatePlanet,validatePlanetTopology } from '../src/sim/planet-save.ts';
import { captureGroupMass,captureGroupTravel,captureGroupDeparture,groupDepartureCurrent,type PreparingGroup,type AwayGroup } from '../src/sim/group-capture.ts';
import { planInventoryPickup,commitInventoryPickup } from '../src/sim/inventory-pickup.ts';
import { emptyGroupLedger,previewGroupLoading,prepareGroupPickup,commitGroupPickup,groupCarrierTarget } from '../src/sim/group-loading.ts';
import { findPlanetRoute,planetCostContext,groupTicksPerMove,tileCivilCore,tileHour,PLANET_QUERY_NODES,PLANET_QUERY_ARCS } from '../src/sim/planet-navigation.ts';
import { prepareGroupRedirection,advanceGroupRoute } from '../src/sim/group-trip.ts';
import { groupFormationAuthority } from '../src/sim/group-authority.ts';
import { advanceGroup,tryGroupDeparture } from '../src/sim/group-driver.ts';
import { validateGroupState } from '../src/sim/group-save.ts';
import type { MaterialPile,World } from '../src/sim/types.ts';

const quota=()=>({nodes:PLANET_QUERY_NODES,arcs:PLANET_QUERY_ARCS});
function camp(){
  const fixture=commercialCamp(),w=fixture.world;
  w.planet=generatePlanet(42,planetHomeInput(w),w.tick);w.planet.nextGroupId=2;
  return fixture;
}
function loading(w:World,foodId:number):PreparingGroup {
  const members=w.pawns.slice(0,2),first=members[0]!;
  first.x=4;first.z=8;members[1]!.x=3;members[1]!.z=9;
  const preview=previewGroupLoading(w,members.map(p=>p.id),[{pileId:foodId,quantity:2}],groupFormationAuthority(w));
  expect(preview.kind).toBe('ready');if(preview.kind!=='ready')throw Error('Loading preparation refused');
  const group:PreparingGroup={id:1,startedAt:w.tick,destination:w.planet!.civilianTile,ledger:emptyGroupLedger(),phase:'loading',
    memberIds:members.map(p=>p.id),rendezvous:{x:4,z:8},meeting:members.map(p=>({pawnId:p.id,cell:{x:p.x,z:p.z}})),manifest:preview.manifest,cursor:0,
    exits:members.map((p,i)=>({pawnId:p.id,cell:{x:0,z:8+i}}))};
  w.group=group;return group;
}
function take(w:World,group:PreparingGroup):void {
  const pickup=prepareGroupPickup(w,group,groupFormationAuthority(w,true));
  expect(pickup.kind).toBe('ready');if(pickup.kind!=='ready')throw Error('Contact pickup refused');
  expect(commitGroupPickup(w,group,pickup.plan)).toBe(true);
}
function departed():World {
  const {world:w,foodId}=camp(),group=loading(w,foodId);take(w,group);group.phase='leaving';
  for(const exit of group.exits){const p=w.pawns.find(p=>p.id===exit.pawnId)!;p.x=exit.cell!.x;p.z=exit.cell!.z;p.path=[];p.moveCooldown=0;p.planCooldown=0;delete p.motion;}
  tryGroupDeparture(w);expect(w.group&&'members' in w.group).toBe(true);return w;
}

describe('planet/group domain',()=>{
  it('generates one immutable geography from explicit home input without World RNG or IDs; raw corruption is refused',()=>{
    const {world:w}=commercialCamp(),before=JSON.stringify(w),home=planetHomeInput(w),p=generatePlanet(0,home,w.tick);
    expect(JSON.stringify(w)).toBe(before);expect(validatePlanet(p,w,196)).toEqual([]);
    expect(p.tiles).toHaveLength(162);expect(p.tiles.reduce((n,t)=>n+t.neighbours.length,0)).toBe(960);
    expect(p.tiles.filter(t=>t.neighbours.length===5)).toHaveLength(12);
    expect(tileCoordinates(p.tiles[p.homeTile]!).latitude).toBeCloseTo(home.latitude,9);
    expect(tileCoordinates(p.tiles[p.homeTile]!).longitude).toBeCloseTo(home.longitude,9);
    expect(validatePlanet(p,w,195).length).toBeGreaterThan(0);
    for(const corrupt of [
      (v:typeof p)=>{(v as unknown as Record<string,unknown>).latitude=home.latitude;},
      (v:typeof p)=>{delete (v.tiles as unknown[])[4];},
      (v:typeof p)=>{v.tiles[1]!.center=[...v.tiles[0]!.center];},
      (v:typeof p)=>{v.tiles[0]!.neighbours[0]=0;},
      (v:typeof p)=>{v.tiles[v.civilianTile]!.biome='ocean';},
      (v:typeof p)=>{v.adoptedAt=w.tick+1;},
    ]){const copy=structuredClone(p);corrupt(copy);expect(validatePlanet(copy,w,196).length).toBeGreaterThan(0);}
    expect(validatePlanetTopology(null).length).toBeGreaterThan(0);
    expect(()=>generatePlanet(2,{...home,meanTemperature:NaN},w.tick)).toThrow();
  });

  it('keeps the saved sphere renderable across seeds and polar rotations, rejecting folded or zero-vector geometry',()=>{
    const {world:w}=commercialCamp(),home=planetHomeInput(w);
    for(const seed of [0,1,42,0xffffffff])for(const position of [{latitude:home.latitude,longitude:home.longitude},{latitude:90,longitude:180},{latitude:-90,longitude:-180}]){
      const p=generatePlanet(seed,{...home,...position},w.tick);
      expect(validatePlanet(p,w,196)).toEqual([]);
      for(const tile of p.tiles){
        const corners=tileCorners(p,tile.id);
        expect(corners).toHaveLength(tile.neighbours.length);
        expect(corners.every(c=>c.every(Number.isFinite)&&Math.abs(Math.hypot(...c)-1)<1e-9)).toBe(true);
      }
    }
    const p=generatePlanet(42,home,w.tick),antipodal=structuredClone(p),origin=antipodal.tiles[0]!,near=antipodal.tiles[origin.neighbours[0]!]!;
    const opposite=antipodal.tiles.find(t=>Math.hypot(...t.center.map((v,i)=>v+origin.center[i]!))<1e-9);
    expect(opposite).toBeDefined();if(!opposite)throw Error('Prepared sphere has no antipode');
    [near.center,opposite.center]=[opposite.center,near.center];
    // The graph and the set of unit centers are unchanged, but the half-edge
    // interpolation used by the SVG route now normalizes a zero vector.
    expect(Math.hypot(...near.center.map((v,i)=>v+origin.center[i]!))).toBeLessThan(1e-9);
    expect(validatePlanetTopology(antipodal.tiles)).toEqual([expect.stringContaining('geometric edge')]);

    const collapsed=structuredClone(p),tile=collapsed.tiles[0]!,a=collapsed.tiles[tile.neighbours[0]!]!;
    const b=collapsed.tiles[tile.neighbours.find(id=>a.neighbours.includes(id))!]!;
    tile.center=[1,0,0];a.center=[-.5,Math.sqrt(3)/2,0];b.center=[-.5,-Math.sqrt(3)/2,0];
    // A real primal triangle has unit centers whose centroid is exactly zero.
    expect(tileCorners(collapsed,tile.id).some(c=>c.some(v=>!Number.isFinite(v)))).toBe(true);
    expect(validatePlanetTopology(collapsed.tiles).length).toBeGreaterThan(0);

    const folded=structuredClone(p),first=folded.tiles[0]!.neighbours[0]!,second=folded.tiles[0]!.neighbours.find(id=>!folded.tiles[first]!.neighbours.includes(id)&&id!==first)!;
    [folded.tiles[first]!.center,folded.tiles[second]!.center]=[folded.tiles[second]!.center,folded.tiles[first]!.center];
    expect(validatePlanetTopology(folded.tiles).length).toBeGreaterThan(0);
  });

  it('admits the whole shared route quota and derives speed from the same actual gear/inventory mass',()=>{
    const {world:w}=camp(),members=w.pawns.slice(0,2),light=captureGroupMass(members,[])!;
    addMaterial(w,'weapon',1,{type:'equipment',pawnId:members[0]!.id},'plasteel-knife');
    addMaterial(w,'silver',500,{type:'inventory',pawnId:members[1]!.id},'silver');
    const held=w.piles.filter(p=>{const owner=p.owner;return 'pawnId' in owner&&members.some(m=>m.id===owner.pawnId);}),mass=captureGroupMass(members,held)!;
    expect(mass.grams).toBe(4500);expect(mass.capacityGrams).toBe(70000);expect(groupTicksPerMove(mass)).toBeGreaterThan(groupTicksPerMove(light));
    const budget={nodes:161,arcs:960},before=JSON.stringify({w,budget});
    expect(findPlanetRoute(w.planet!,w.planet!.homeTile,w.planet!.civilianTile,planetCostContext(w,mass),budget)).toEqual({kind:'deferred',nodes:0,arcs:0});
    expect(JSON.stringify({w,budget})).toBe(before);
    const real=quota(),found=findPlanetRoute(w.planet!,w.planet!.homeTile,w.planet!.civilianTile,planetCostContext(w,mass),real);
    expect(found.kind).toBe('found');expect(real.nodes).toBeGreaterThanOrEqual(0);expect(real.arcs).toBeGreaterThanOrEqual(0);
    if(found.kind==='found'){expect(found.tiles[0]).toBe(w.planet!.homeTile);expect(found.tiles.at(-1)).toBe(w.planet!.civilianTile);expect(found.estimatedCore).toBeGreaterThan(0);}
    const unknown:MaterialPile={id:w.nextId,kind:'wood',item:'wood',quantity:1,owner:{type:'inventory',pawnId:members[0]!.id}};
    expect(captureGroupMass(members,[...held,unknown])).toBeUndefined();
  });

  it('uses one atomic pickup kernel: stale allocation refuses, a split keeps conditions, a full stack keeps its identity',()=>{
    const {world:w,foodId,pawnId}=commercialCamp(),source=w.piles.find(p=>p.id===foodId)!,rng=w.rng;
    const untouched=JSON.stringify(w),old=planInventoryPickup(w,source,pawnId,2)!;
    expect(JSON.stringify(w)).toBe(untouched);addMaterial(w,'silver',5,{type:'ground',x:10,z:10},'silver');
    const stale=JSON.stringify(w);expect(commitInventoryPickup(w,old)).toBe(false);expect(JSON.stringify(w)).toBe(stale);
    const split=planInventoryPickup(w,source,pawnId,2)!,nextId=w.nextId;
    expect(commitInventoryPickup(w,split)).toBe(true);expect(w.nextId).toBe(nextId+1);expect(source.quantity).toBe(2);
    expect(split.carried.id).toBe(nextId);expect(split.carried.damage).toBe(source.damage);expect(split.carried.owner).toEqual({type:'inventory',pawnId});
    const full=planInventoryPickup(w,source,pawnId,2)!;
    expect(full.carried).toBe(source);expect(commitInventoryPickup(w,full)).toBe(true);expect(w.nextId).toBe(nextId+1);
    expect(w.piles.filter(p=>p.item==='survival-meal'&&p.owner.type==='inventory')).toHaveLength(2);expect(w.rng).toBe(rng);
  });

  it('preserves physical contact, per-member meeting/exit cells and original collective owners',()=>{
    const {world:w,foodId}=camp(),group=loading(w,foodId),p=w.pawns.find(p=>p.id===group.manifest[0]!.carrierId)!;
    expect(groupCarrierTarget(w,{...group,phase:'gathering'},group.memberIds[1]!)).toEqual(group.meeting[1]!.cell);
    p.moveCooldown=1;const inFlight=JSON.stringify(w);
    expect(prepareGroupPickup(w,group,groupFormationAuthority(w,true)).kind).toBe('refused');expect(JSON.stringify(w)).toBe(inFlight);
    p.moveCooldown=0;take(w,group);group.phase='leaving';
    for(const exit of group.exits){const pawn=w.pawns.find(p=>p.id===exit.pawnId)!;pawn.x=exit.cell!.x;pawn.z=exit.cell!.z;pawn.path=[];delete pawn.motion;}
    group.exits[1]!.cell={...group.exits[0]!.cell!};const duplicate=JSON.stringify(w);
    expect(captureGroupDeparture(w,group,groupFormationAuthority(w,true)).kind).toBe('refused');expect(JSON.stringify(w)).toBe(duplicate);
    group.exits[1]!.cell={x:0,z:9};
    const captured=captureGroupDeparture(w,group,groupFormationAuthority(w,true));expect(captured.kind).toBe('ready');
    if(captured.kind!=='ready')throw Error('Departure capture refused');
    expect(groupDepartureCurrent(w,captured.capture)).toBe(true);expect(captured.capture.baseline.food).toBe(2);
    const originals=[...captured.capture.members],possessions=[...captured.capture.items],nextId=w.nextId,rng=w.rng;
    tryGroupDeparture(w);expect(w.group&&'members' in w.group).toBe(true);
    if(!w.group||!('members' in w.group))throw Error('Physical originals did not depart');
    expect(w.group.members).toEqual(originals);for(const pawn of originals){expect(w.group.members).toContain(pawn);expect(w.pawns).not.toContain(pawn);}
    for(const pile of possessions){expect(w.group.items).toContain(pile);expect(w.piles).not.toContain(pile);}
    expect(w.nextId).toBe(nextId);expect(w.rng).toBe(rng);expect(validateGroupState(w,196)).toEqual([]);
    for(const corrupt of [
      (v:World)=>{(v.group as AwayGroup).lastPersonalTick--;},
      (v:World)=>{(v.group as AwayGroup).items.find(i=>i.item==='survival-meal')!.quantity++;},
      (v:World)=>{(v.group as AwayGroup).members[0]!.jobId=1;},
      (v:World)=>{(v.group as AwayGroup).items.find(i=>i.item==='survival-meal')!.damage=50;},
    ]){const copy=structuredClone(w);corrupt(copy);expect(validateGroupState(copy,196).length).toBeGreaterThan(0);}
  });

  it('redirects from the engaged boundary, retains its cost, and emits a single arrival after the zero checkpoint',()=>{
    const w=departed(),g=w.group as AwayGroup,capture=captureGroupTravel(g,()=>({incapable:false,restNeed:false}))!,context=planetCostContext(w,capture.mass);
    const first=advanceGroupRoute(w.planet!,g,context,capture).state as AwayGroup;
    expect(first.segment).not.toBeNull();expect(first.route[0]).toBe(first.segment!.to);
    const redirect=prepareGroupRedirection(w.planet!,first,w.planet!.homeTile,context,quota());expect(redirect.kind).toBe('ready');
    if(redirect.kind!=='ready')throw Error('Redirection refused');expect(redirect.state.route[0]).toBe(first.segment!.to);expect(redirect.state.segment).toBe(first.segment);
    const atHome:AwayGroup={...redirect.state,tile:first.segment!.to,route:[w.planet!.homeTile],segment:{from:first.segment!.to,to:w.planet!.homeTile,totalCore:2,remainingCore:1}};
    const zero=advanceGroupRoute(w.planet!,atHome,context,capture);expect(zero.event).toBeNull();expect((zero.state as AwayGroup).segment!.remainingCore).toBe(0);
    const arrival=advanceGroupRoute(w.planet!,zero.state as AwayGroup,context,capture);expect(arrival.event).toBe('arrived');expect(arrival.state.phase).toBe('awaiting-entry');
    expect(advanceGroupRoute(w.planet!,arrival.state as AwayGroup,context,capture).event).toBeNull();
    expect(()=>advanceGroupRoute(w.planet!,g,{...context,mass:{...context.mass}},capture)).toThrow('share one actual mass');
    const forged=structuredClone(w);(forged.group as AwayGroup).route=[w.planet!.civilianTile];expect(validateGroupState(forged,196).length).toBeGreaterThan(0);
  });

  it('rests for the whole night even at100 or across95, resumes at06, and keeps the strict22/final-push boundaries',()=>{
    const base=departed();
    function prepared(rest:number,firstCore:number,finalPush=false):World {
      const w=structuredClone(base),g=w.group as AwayGroup,planet=w.planet!;
      // Authored healthy clock/segment exposure, not a simulated overnight
      // history. The real pickup and collective ownership come from departed().
      const route=[...g.route],from=finalPush?route.at(-2)!:route[0]!,to=finalPush?route.at(-1)!:route[1]!;
      g.tile=from;g.route=finalPush?[to]:route.slice(1);
      g.segment={from,to,totalCore:20001,remainingCore:finalPush?10000:15001};g.stop=null;
      const offset=tileCivilCore(planet,from,0),civil=(firstCore-offset+60000)%60000;
      w.tick=6000+civil/10-1;g.lastPersonalTick=w.tick;
      for(const p of g.members){delete p.health;p.rest=rest;p.hunger=95;p.state='idle';}
      return w;
    }
    const pass=(w:World)=>{w.tick++;advanceGroup(w);return w.group as AwayGroup;};
    // Primary reuse: Caravan_NeedsTracker.AnyPawnsNeedRest asks for Rest,
    // never a low level. Former95 oscillation must not grant rest AND distance.
    for(const rest of [100,95.01,94.99]){
      const w=prepared(rest,10),g=w.group as AwayGroup,p=g.members[0]!,age=p.age!.biologicalTicks,remaining=g.segment!.remainingCore;
      for(let i=0;i<4;i++){
        const next=pass(w);expect(next.stop).toEqual({kind:'night'});expect(next.segment!.remainingCore).toBe(remaining);
        expect(p.rest).toBeGreaterThanOrEqual(rest);expect(next.lastPersonalTick).toBe(w.tick);
      }
      expect(p.age!.biologicalTicks).toBe(age+4);
    }
    const morning=prepared(95,15000),p=(morning.group as AwayGroup).members[0]!,remaining=(morning.group as AwayGroup).segment!.remainingCore;
    const resumed=pass(morning),mass=captureGroupTravel(resumed,()=>({incapable:false,restNeed:true}))!.mass;
    expect(tileHour(morning.planet!,resumed.tile,planetCostContext(morning,mass).homeCivilCore)).toBe(6);
    expect(resumed.stop).toBeNull();expect(resumed.segment!.remainingCore).toBe(remaining-10);expect(p.rest).toBeLessThan(95);

    const edge=prepared(95,55000),edgeRest=(edge.group as AwayGroup).members[0]!;
    const at22=pass(edge);expect(at22.segment!.remainingCore).toBe(15000);expect(at22.stop).toEqual({kind:'night'});expect(edgeRest.rest).toBeLessThan(95);
    const restBefore=edgeRest.rest,after22=pass(edge);expect(after22.segment!.remainingCore).toBe(15000);expect(edgeRest.rest).toBeGreaterThan(restBefore);

    const final=prepared(95,10,true),finalRest=(final.group as AwayGroup).members[0]!;
    expect(pass(final).segment!.remainingCore).toBe(9990);expect(finalRest.rest).toBeLessThan(95);
    const beyond=prepared(95,10,true);(beyond.group as AwayGroup).segment!.remainingCore=10001;
    expect(pass(beyond).segment!.remainingCore).toBe(10001);expect((beyond.group as AwayGroup).stop).toEqual({kind:'night'});
  });
});
