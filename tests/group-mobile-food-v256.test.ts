import {expect,test} from 'vitest';
import {registryCamp} from './helpers/world-maps-v255.ts';
import {registeredMap,flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {groupMemberReason,previewGroupFormation,groupSourceChoices} from '../src/sim/group-authority.ts';
import {scoutPreparationReason} from '../src/sim/caravan-trip.ts';
import {serializeCampaign,deserializeCampaign,validateWorld,stepWorld,applyCommand} from '../src/sim/index.ts';

import {GroupCampaignRuntime256} from '../src/sim/group-campaign-runtime-256.ts';
import {GroupCaravanPhysical256} from '../src/sim/group-caravan-physical-256.ts';
import {createGroupCampaignGeometry256} from '../src/sim/group-campaign-geometry-256.ts';
import type {Command} from '../src/sim/types.ts';

/** Reuse the admitted camp and its original owners; only runtime continuations
 * are constructed here. The prepared-away reorganization fixture would skip
 * the actual loading/departure that these tests must exercise. */
function local(){
 const w=registryCamp(),map=registeredMap(w,w.worldMaps!.rootMapId!)!,p=map.pawns[0]!;
 const runtime=new GroupCampaignRuntime256(createGroupCampaignGeometry256(w),new GroupCaravanPhysical256());runtime.bootstrap(w);
 const command=(c:Command)=>{const result=applyCommand(w,c,runtime);expect(result.ok,result.reason??JSON.stringify(c)).toBe(true);};
 const step=()=>stepWorld(w,1,undefined,runtime);
 const until=(predicate:()=>boolean,limit=9000)=>{for(let i=0;i<limit&&!predicate();i++)step();expect(predicate(),JSON.stringify({tick:w.tick,groups:w.worldGroups!.groups.map(g=>({id:g.state.id,phase:g.state.phase})),events:w.worldGroups!.events.slice(-3)})).toBe(true);};
 return {w,map,p,command,step,until};
}

/** Declared finite meal stock and diet; the actual loading and departure below
 * must succeed through the normal transaction, never a prepared away array. */
test('a new collective group loads and departs with actual simple meals despite rejecting both scout provisions',()=>{
 const {w,map,p,command,until}=local(),health=p.health;
 command({type:'food-policy-update',policyId:p.foodPolicyId,name:'Repas simples seulement',allowed:['simple-meal']});
 addMaterial(map,'food',4,{type:'ground',x:13,z:23},'simple-meal');flushRegisteredMap(map);
 const food=map.piles.find(i=>i.item==='simple-meal'&&i.owner.type==='ground')!,sourceId=food.id,sourceQuantity=food.quantity;
 expect(validateWorld(w)).toEqual([]);expect(w.foodPolicies.find(r=>r.id===p.foodPolicyId)!.allowed).toEqual(['simple-meal']);
 expect(groupMemberReason(map,p)).toBeUndefined();expect(scoutPreparationReason(map,p)).not.toBeNull();expect(groupSourceChoices(map).some(r=>r.pile===food&&r.available===sourceQuantity)).toBe(true);
 const before=JSON.stringify(w);expect(previewGroupFormation(map,[p.id],[{pileId:sourceId,quantity:4}],52).ok).toBe(true);expect(JSON.stringify(w)).toBe(before);
 command({type:'group-start',originMapId:w.worldMaps!.rootMapId!,memberIds:[p.id],sources:[{pileId:sourceId,quantity:4}],destination:52});
 const id=w.worldGroups!.selectedGroupId!;until(()=>w.worldGroups!.groups.some(r=>r.state.id===id&&'members'in r.state),1800);
 const g=w.worldGroups!.groups.find(r=>r.state.id===id)!.state;if(!('members'in g))throw Error('Actual selected-food formation did not depart');
 expect(g.members).toContain(p);expect(map.pawns).not.toContain(p);expect(p.health).toBe(health);expect(g.travel?.revision).toBe(1);
 const loaded=g.items.filter(i=>i.item==='simple-meal');expect(loaded).toHaveLength(1);expect(loaded[0]!.id).toBe(sourceId);expect(loaded[0]!.quantity).toBe(sourceQuantity);expect(loaded[0]!.owner).toEqual({type:'inventory',pawnId:p.id});expect(map.piles.some(i=>i.id===sourceId)).toBe(false);expect(g.items.some(i=>['survival-meal','pemmican'].includes(i.item))).toBe(false);
 expect(validateWorld(w)).toEqual([]);const raw=serializeCampaign(w);expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);
});

test('a new collective group may really depart with zero provisions while needs and finite ground stocks remain real',()=>{
 const {w,map,p,command,until,step}=local();
 command({type:'food-policy-update',policyId:p.foodPolicyId,name:'Aucun aliment autorisé',allowed:[]});
 const ground=map.piles.filter(i=>i.owner.type==='ground'&&i.item==='survival-meal'),stock=ground.map(i=>({id:i.id,quantity:i.quantity,owner:{...i.owner}})),health=p.health;
 expect(groupMemberReason(map,p)).toBeUndefined();expect(scoutPreparationReason(map,p)).not.toBeNull();expect(previewGroupFormation(map,[p.id],[],52).ok).toBe(true);
 command({type:'group-start',originMapId:w.worldMaps!.rootMapId!,memberIds:[p.id],sources:[],destination:52});
 const id=w.worldGroups!.selectedGroupId!;until(()=>w.worldGroups!.groups.some(r=>r.state.id===id&&'members'in r.state),1800);
 const g=w.worldGroups!.groups.find(r=>r.state.id===id)!.state;if(!('members'in g))throw Error('Actual no-provisions formation did not depart');
 expect(g.members).toContain(p);expect(map.pawns).not.toContain(p);expect(p.health).toBe(health);expect(g.travel?.revision).toBe(1);expect(g.baseline.food).toBe(0);expect(g.ledger.foodLoaded).toBe(0);expect(g.items.some(i=>i.owner.type==='inventory')).toBe(false);
 for(const row of stock){const original=map.piles.find(i=>i.id===row.id)!;expect(original.quantity).toBe(row.quantity);expect(original.owner).toEqual(row.owner);}
 const personal=g.lastPersonalTick,tick=w.tick,hunger=p.hunger;for(let i=0;i<15;i++)step();const continued=w.worldGroups!.groups.find(r=>r.state.id===id)!.state;if(!('members'in continued))throw Error('Actual no-provisions group owner disappeared');expect(continued.lastPersonalTick).toBe(personal+15);expect(w.tick).toBe(tick+15);expect(p.hunger).toBeLessThan(hunger);expect(w.foodPolicies.find(r=>r.id===p.foodPolicyId)!.allowed).toEqual([]);
 expect(validateWorld(w)).toEqual([]);const raw=serializeCampaign(w);expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);
});
