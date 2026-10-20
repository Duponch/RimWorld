import {expect,test} from 'vitest';
import {reorganizationCamp256} from './helpers/group-reorganization-v256.ts';
import {harness as campaignHarness,contact} from './helpers/group-admission-v412.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {ITEM_DEFINITIONS} from '../src/sim/items.ts';
import {groupFormationAuthority,groupSourceChoices,previewGroupFormation} from '../src/sim/group-authority.ts';
import {previewGroupLoading} from '../src/sim/group-loading.ts';
import {regularGroupFreight258,groupFreightUnitMass258} from '../src/sim/group-freight-contract-258.ts';
import {stepWorld,applyCommand} from '../src/sim/engine.ts';
import {serializeCampaign,deserializeCampaign,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {GroupCampaignRuntime256} from '../src/sim/group-campaign-runtime-256.ts';
import {GroupCaravanPhysical256} from '../src/sim/group-caravan-physical-256.ts';
import {createGroupCampaignGeometry256} from '../src/sim/group-campaign-geometry-256.ts';
import {openGroupReorganization,groupReorganizationBalance} from '../src/sim/group-reorganization-balance.ts';
import {captureGroupMass} from '../src/sim/group-capture.ts';
import {planetTile} from '../src/sim/planet-geography-256.ts';
import {planetCostContext,planetEdgeCost} from '../src/sim/planet-navigation.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {initialDrugPolicies265} from '../src/sim/alcohol-policy-265.ts';
import {registeredMap,flushRegisteredMap} from '../src/sim/world-map-context.ts';
import type {AwayGroup} from '../src/sim/group-capture.ts';
import type {MaterialPile,World} from '../src/sim/types.ts';

class ObservedPhysical extends GroupCaravanPhysical256 {
  calls=0;
  override afterTween(...args:Parameters<GroupCaravanPhysical256['afterTween']>):void {
    this.calls++;super.afterTween(...args);
  }
}
function runtime(w:World){
  const physical=new ObservedPhysical(),run=new GroupCampaignRuntime256(createGroupCampaignGeometry256(w),physical);
  run.bootstrap(w);return {physical,run};
}
function group(w:World,id:number):AwayGroup {
  const g=w.worldGroups!.groups.find(r=>r.state.id===id)?.state;
  if(!g||!('members'in g))throw Error('Expected the same real away owner');return g;
}
function mass(w:World,g:AwayGroup){
  const result=captureGroupMass(g.members,g.items,!!g.freight,w.schemaVersion,g.packed,g.animalOwners?.members);
  if(!result)throw Error('Prepared original possessions have no admitted physical mass');return result;
}
function roundTrip(w:World):World {
  expect(validateWorld(w)).toEqual([]);const text=serializeCampaign(w),restored=deserializeWorld(text);
  expect(serializeCampaign(restored)).toBe(text);return restored;
}

/** Declared preparation only: two original away members, two beers on the
 * OTHER member, existing alcohol addiction at the current clinical frontier,
 * and an actually adjacent return edge already paid to its boundary. No
 * loading/travel/drinking acquisition is claimed. Re-open conservation only
 * after all prepared stock exists, before any tested physical step. */
function prepared(){
  const f=reorganizationCamp256(true),{w,g,members}=f,[drinker,carrier]=members;
  if(!drinker||!carrier||!w.planet)throw Error('Actual prepared caravan owners missing');
  w.drugPolicies=initialDrugPolicies265();w.nextDrugPolicyId=5;
  drinker.drugPolicyId=2;carrier.drugPolicyId=1;
  drinker.health=createMedicalRecord(w.tick);
  drinker.health.alcohol={bornAt:w.tick,high:0,tolerance:0,hangover:0,lastDoseTick:w.tick,dosesToday:1,addiction:{severity:Math.fround(.5),need:0}};
  for(const p of members){p.hunger=100;p.rest=100;p.recreation.level=100;p.priorities.haul=1;}
  const beer:MaterialPile={id:w.nextId++,kind:'beer',item:'beer',quantity:2,owner:{type:'inventory',pawnId:carrier.id}};
  g.items.push(beer);
  const origins=g.reorganization!.memberOrigins;
  g.reorganization=openGroupReorganization(g,w.worldGroups!.losses,w.tick,origins);
  expect(g.reorganization.opening.beer).toBe(2);expect(g.reorganization.inventoryEffects?.beer).toBeUndefined();
  const home=w.planet.homeTile,from=planetTile(w.planet,home)!.neighbours.find(id=>planetTile(w.planet!,id)?.biome!=='ocean');
  if(from===undefined)throw Error('Prepared planet has no actual passable home neighbour');
  const edge=planetEdgeCost(w.planet,from,home,planetCostContext(w,mass(w,g)));
  if(edge===undefined)throw Error('Prepared return edge has no actual planetary cost');
  g.tile=from;g.destination=home;g.phase='travelling';g.route=[home];g.segment={from,to:home,totalCore:Math.fround(edge),remainingCore:0};g.paused=true;g.stop={kind:'paused'};
  expect(groupReorganizationBalance(g,g.reorganization,w.worldGroups!.losses)).toBe(true);
  return {...f,drinker,carrier,beer};
}

test('real caravan physical steps drink another carrier beer, conserve the opening, resume exactly and return the same remainder',()=>{
  const {w,g,drinker,carrier,beer,record}=prepared(),id=g.id,origin=record.originMapId,initialDose=drinker.health!.alcohol!.lastDoseTick;
  const initialItems=g.items.map(p=>({pile:p,id:p.id,quantity:p.quantity,owner:structuredClone(p.owner)}));
  const initialMass=mass(w,g),initialCarrier=initialMass.carriers.find(c=>c.pawnId===carrier.id)!.grams;
  const initialDrinker=initialMass.carriers.find(c=>c.pawnId===drinker.id)!.grams;
  const exactStart=roundTrip(w),live=runtime(w),replayed=runtime(exactStart);
  let consumed=false;
  for(let i=0;i<45&&!consumed;i++){
    stepWorld(w,1,undefined,live.run);stepWorld(exactStart,1,undefined,replayed.run);
    expect(serializeCampaign(exactStart)).toBe(serializeCampaign(w));
    const current=group(w,id),source=current.items.find(p=>p.id===beer.id);
    consumed=source?.quantity===1;
  }
  expect(consumed).toBe(true);expect(live.physical.calls).toBeGreaterThan(0);expect(replayed.physical.calls).toBeGreaterThan(0);
  const current=group(w,id),afterMass=mass(w,current);
  expect(current.members.find(p=>p.id===drinker.id)).toBe(drinker);expect(current.members.find(p=>p.id===carrier.id)).toBe(carrier);
  expect(current.items.find(p=>p.id===beer.id)).toBe(beer);expect(beer).toMatchObject({quantity:1,owner:{type:'inventory',pawnId:carrier.id}});
  expect(afterMass.grams).toBe(initialMass.grams-300);expect(afterMass.carriers.find(c=>c.pawnId===carrier.id)!.grams).toBe(initialCarrier-300);
  expect(afterMass.carriers.find(c=>c.pawnId===drinker.id)!.grams).toBe(initialDrinker);
  expect(current.reorganization!.inventoryEffects!.beer).toBe(-1);expect(current.reorganization!.opening.beer).toBe(2);
  expect(groupReorganizationBalance(current,current.reorganization!,w.worldGroups!.losses)).toBe(true);
  expect(drinker.health!.alcohol!.lastDoseTick).toBeGreaterThan(initialDose);expect(drinker.health!.alcohol!.addiction!.need).toBeGreaterThan(.1);
  for(const item of initialItems)if(item.id!==beer.id){expect(current.items.find(p=>p.id===item.id)).toBe(item.pile);expect(item.pile.quantity).toBe(item.quantity);expect(item.pile.owner).toEqual(item.owner);}
  const resumed=roundTrip(w),resumedRuntime=runtime(resumed);
  for(let i=0;i<12;i++){stepWorld(w,1,undefined,live.run);stepWorld(resumed,1,undefined,resumedRuntime.run);expect(serializeCampaign(resumed)).toBe(serializeCampaign(w));}
  // The prepared edge was paused at its paid boundary. A real unpause now
  // commits arrival and normal map reinsertion; no actor or pile is recreated.
  const unpause=applyCommand(w,{type:'group-pause',groupId:id,paused:false},live.run);expect(unpause.ok,unpause.reason).toBe(true);
  for(let i=0;i<5&&!registeredMap(w,origin)!.pawns.some(p=>p.id===drinker.id);i++)stepWorld(w,1,undefined,live.run);
  const home=registeredMap(w,origin)!;
  expect(home.pawns.find(p=>p.id===drinker.id)).toBe(drinker);expect(home.pawns.find(p=>p.id===carrier.id)).toBe(carrier);
  expect(home.piles.find(p=>p.id===beer.id)).toBe(beer);expect(beer.quantity).toBe(1);
  // Reinserted inventories are then unloaded by the ordinary group activity.
  for(let i=0;i<600&&beer.owner.type!=='ground';i++)stepWorld(w,1,undefined,live.run);
  expect(beer.owner.type).toBe('ground');expect(home.piles.find(p=>p.id===beer.id)).toBe(beer);expect(beer.quantity).toBe(1);
  roundTrip(w);
});

test('265 selects and physically loads all three brewing goods, then cancellation and unloading return the same finite stock;258/264 refuse them',()=>{
  const f=campaignHarness(),{w,map}=f,members=map.pawns.slice(0,2),memberIds=members.map(p=>p.id),origin=w.worldMaps!.rootMapId!;
  // Finite ground supplies are explicitly prepared before any tested command.
  // The established V413 campaign pilot owns gathering, movement and pickups.
  const stocks:MaterialPile[]=[];
  for(const [item,quantity,x] of [['hops',4,13],['wort',3,15],['beer',2,17]] as const){
    addMaterial(map,ITEM_DEFINITIONS[item].kind,quantity,{type:'ground',x,z:16},item);
    const pile=map.piles.find(p=>p.item===item&&p.owner.type==='ground'&&p.owner.x===x&&p.owner.z===16)!;
    expect(pile).toBeDefined();stocks.push(pile);
  }
  refreshStock(map);flushRegisteredMap(map);
  const original=stocks.map(p=>({pile:p,id:p.id,item:p.item,quantity:p.quantity,cell:p.owner.type==='ground'?{x:p.owner.x,z:p.owner.z}:null}));
  expect(original.every(p=>p.cell!==null)).toBe(true);
  // These are read-only eligibility views, not forged historical save fixtures.
  // No old command, migration or current factory is silently relabelled.
  for(const version of [258,264]){
    const oldView={...map,schemaVersion:version} as unknown as World;
    const choices=groupSourceChoices(oldView);
    for(const p of stocks){
      expect(regularGroupFreight258(p,version),`${version}:${p.item}`).toBe(false);
      expect(groupFreightUnitMass258(p,version),`${version}:${p.item}`).toBeUndefined();
      expect(choices.some(c=>c.pile.id===p.id),`${version}:${p.item}`).toBe(false);
    }
  }
  const choices=groupSourceChoices(map),sources=stocks.map(p=>({pileId:p.id,quantity:p.quantity}));
  for(const p of stocks){expect(regularGroupFreight258(p,265),p.item).toBe(true);expect(choices.find(c=>c.pile===p)).toMatchObject({available:p.quantity});}
  const unchanged=serializeCampaign(w);
  expect(previewGroupLoading(map,memberIds,sources,groupFormationAuthority(map)).kind).toBe('ready');
  expect(previewGroupFormation(map,memberIds,sources,52).ok).toBe(true);expect(serializeCampaign(w)).toBe(unchanged);
  f.command({type:'group-start',originMapId:origin,memberIds,sources,destination:52});
  const id=w.worldGroups!.selectedGroupId!;
  const started=w.worldGroups!.groups.find(r=>r.state.id===id)!.state;
  if(!('manifest'in started))throw Error('Expected actual loading preparation');
  expect(started.manifest.map(l=>l.item).sort()).toEqual(['beer','hops','wort']);
  const picked=new Set<number>();
  for(let i=0;i<700&&picked.size<stocks.length;i++){
    const ground=new Map(stocks.flatMap(p=>p.owner.type==='ground'?[[p.id,{x:p.owner.x,z:p.owner.z}] as const]:[]));
    f.step();
    for(const p of stocks)if(!picked.has(p.id)&&p.owner.type==='inventory'){
      const source=ground.get(p.id),holder=map.pawns.find(q=>p.owner.type==='inventory'&&q.id===p.owner.pawnId);
      expect(source).toBeDefined();expect(holder).toBeDefined();
      expect(contact(holder!,source!),p.item).toBe(true);expect(holder!.moveCooldown).toBe(0);expect(holder!.motion?.end??0).toBeLessThanOrEqual(w.tick);
      expect(map.piles.find(q=>q.id===p.id)).toBe(p);picked.add(p.id);
    }
  }
  expect(picked.size).toBe(3);
  const loaded=w.worldGroups!.groups.find(r=>r.state.id===id)!.state;
  expect('members'in loaded).toBe(false);expect(validateWorld(w)).toEqual([]);
  const loadedSave=serializeCampaign(w);expect(serializeCampaign(deserializeCampaign(loadedSave))).toBe(loadedSave);
  f.command({type:'group-cancel',groupId:id});expect(w.worldGroups!.groups.some(r=>r.state.id===id)).toBe(false);
  for(const row of original){expect(map.piles.find(p=>p.id===row.id)).toBe(row.pile);expect(row.pile.quantity).toBe(row.quantity);}
  f.until(()=>members.every(p=>p.state==='idle'&&p.moveCooldown===0&&(p.motion?.end??0)<=w.tick),40);
  // Cancellation keeps actual carried inventory. A real unload command owns
  // the subsequent floor restitution; no test relocates a carrier or pile.
  f.command({type:'group-unload',originMapId:origin,memberIds});
  f.until(()=>stocks.every(p=>p.owner.type==='ground'),600);
  for(const row of original){
    expect(map.piles.find(p=>p.id===row.id)).toBe(row.pile);expect(row.pile.quantity).toBe(row.quantity);expect(row.pile.owner.type).toBe('ground');
    expect(map.piles.filter(p=>p.item===row.item).reduce((n,p)=>n+p.quantity,0)).toBe(row.quantity);
  }
  expect(validateWorld(w)).toEqual([]);const final=serializeCampaign(w);expect(serializeCampaign(deserializeCampaign(final))).toBe(final);
});

test('a genuinely acquired post-drink checkpoint reloads its clinical owner and returns the same one-beer remainder',()=>{
  const f=prepared(),{w,drinker,carrier,beer}=f,id=f.g.id,origin=f.record.originMapId,live=runtime(w),before=mass(w,f.g);
  for(let i=0;i<45&&beer.quantity!==1;i++)stepWorld(w,1,undefined,live.run);
  expect(beer.quantity).toBe(1);expect(live.physical.calls).toBeGreaterThan(0);
  const acquired=group(w,id),acquiredMass=mass(w,acquired),clinical=structuredClone(drinker.health),policies=structuredClone(w.drugPolicies);
  expect(acquiredMass.grams).toBe(before.grams-300);
  expect(acquiredMass.carriers.find(p=>p.pawnId===carrier.id)!.grams).toBe(before.carriers.find(p=>p.pawnId===carrier.id)!.grams-300);
  expect(acquired.reorganization!.inventoryEffects!.beer).toBe(-1);
  expect(groupReorganizationBalance(acquired,acquired.reorganization!,w.worldGroups!.losses)).toBe(true);
  // This is a fresh runtime loaded from the actual dose checkpoint. The
  // uninterrupted/reloaded rest comparison remains in the original test.
  const loaded=roundTrip(w),returning=group(loaded,id),run=runtime(loaded),p=returning.members.find(p=>p.id===drinker.id)!,holder=returning.members.find(p=>p.id===carrier.id)!,remainder=returning.items.find(p=>p.id===beer.id)!;
  expect(p.health).toEqual(clinical);expect(loaded.drugPolicies).toEqual(policies);expect(mass(loaded,returning)).toEqual(acquiredMass);
  expect(p.drugPolicyId).toBe(2);expect(holder.drugPolicyId).toBe(1);expect(remainder).toMatchObject({id:beer.id,quantity:1,owner:{type:'inventory',pawnId:carrier.id}});
  const lastDose=p.health!.alcohol!.lastDoseTick,doses=p.health!.alcohol!.dosesToday;
  const result=applyCommand(loaded,{type:'group-pause',groupId:id,paused:false},run.run);expect(result.ok,result.reason).toBe(true);
  for(let i=0;i<5&&!registeredMap(loaded,origin)!.pawns.some(q=>q.id===p.id);i++)stepWorld(loaded,1,undefined,run.run);
  const home=registeredMap(loaded,origin)!;
  expect(home.pawns.find(q=>q.id===p.id)).toBe(p);expect(home.pawns.find(q=>q.id===holder.id)).toBe(holder);expect(home.piles.find(q=>q.id===remainder.id)).toBe(remainder);
  expect(remainder.quantity).toBe(1);
  for(let i=0;i<600&&remainder.owner.type!=='ground';i++)stepWorld(loaded,1,undefined,run.run);
  expect(remainder.owner.type).toBe('ground');expect(home.piles.find(q=>q.id===beer.id)).toBe(remainder);
  expect(home.piles.filter(q=>q.item==='beer').reduce((n,q)=>n+q.quantity,0)).toBe(1);
  expect(p.health!.alcohol!.lastDoseTick).toBe(lastDose);expect(p.health!.alcohol!.dosesToday).toBe(doses);
  expect(p.drugPolicyId).toBe(2);expect(holder.drugPolicyId).toBe(1);expect(loaded.drugPolicies).toEqual(policies);
  roundTrip(loaded);
});
