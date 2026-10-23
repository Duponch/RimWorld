import {expect,test} from 'vitest';
import {peaceTalksCamp473} from './scenarios/peace-talks-v473.ts';
import {draftPeaceTriumph293,PEACE_REWARD_PALETTE_293} from '../src/sim/peace-talks-rewards-293.ts';
import {pileMarketValue} from '../src/sim/trade-prices.ts';
import {groupCaravanPileMass256,captureProspectiveGroupMass256} from '../src/sim/group-caravan-mass-256.ts';
import {freightGroup} from '../src/sim/group-freight.ts';
import {WORLD_FACTION_TECH_LEVEL_259} from '../src/sim/world-faction-catalog.ts';

test('finite represented gift palette uses real unit values, bounded stacks and original inventory carriers',()=>{
 const {w,groupId}=peaceTalksCamp473(false),g=w.worldGroups!.groups.find(r=>r.state.id===groupId)!.state;if(!('members'in g))throw Error('Original caravan absent');
 const before=JSON.stringify(g),rng=w.rng,nextId=w.nextId,carriers=new Set([...g.members,...g.animalOwners?.members??[]].map(p=>p.id));
 for(const factionDef of ['TribeCivil','OutlanderCivil','Pirate'] as const)for(let i=1;i<=24;i++){
  const draft=draftPeaceTriumph293({group:g,factionDef,tile:g.tile,tick:w.tick,version:293,rng:(i*0x9e3779b9)>>>0,nextId});if(!draft.ok)throw Error(draft.reason);
  expect(draft.budget).toBeGreaterThanOrEqual(500);expect(draft.budget).toBeLessThanOrEqual(1200);expect(draft.items.length).toBeGreaterThanOrEqual(2);expect(draft.items.length).toBeLessThanOrEqual(16);
  expect(draft.marketValue).toBeGreaterThanOrEqual(500);expect(draft.marketValue).toBeLessThanOrEqual(1200);expect(draft.massGrams).toBeLessThanOrEqual(20000);
  expect(draft.items.reduce((n,p)=>n+pileMarketValue(p)!*p.quantity,0)).toBe(draft.marketValue);expect(draft.items.reduce((n,p)=>n+groupCaravanPileMass256(p,freightGroup(g),293)!*p.quantity,0)).toBe(draft.massGrams);
  expect(new Set(draft.items.map(p=>p.item)).size).toBeGreaterThanOrEqual(2);expect(draft.items.some(p=>p.item==='silver')).toBe(false);
  draft.items.forEach((p,index)=>{expect(p.id).toBe(nextId+index);expect(p.owner.type).toBe('inventory');if(p.owner.type!=='inventory')throw Error('No carrier');expect(carriers.has(p.owner.pawnId)).toBe(true);expect(PEACE_REWARD_PALETTE_293.find(r=>r.item===p.item)!.tech).toBeLessThanOrEqual(WORLD_FACTION_TECH_LEVEL_259[factionDef]);expect(draft.delivered[index]).toEqual({id:p.id,item:p.item,quantity:p.quantity,carrierId:p.owner.pawnId});});
 }
 expect(JSON.stringify(g)).toBe(before);expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);
},120_000);

test('a physically overloaded caravan receives the same finite package without an invented capacity',()=>{
 const {w,groupId}=peaceTalksCamp473(false),g=w.worldGroups!.groups.find(r=>r.state.id===groupId)!.state;if(!('members'in g))throw Error('Original caravan absent');
 // Initial isolated mass boundary, not a played delivery or ledger claim.
 const load=g.items.find(p=>p.owner.type==='inventory'&&p.item==='cloth')!;load.quantity=1000000;
 const before=captureProspectiveGroupMass256(g,293)!;expect(before.grams).toBeGreaterThan(before.capacityGrams);
 const draft=draftPeaceTriumph293({group:g,factionDef:'OutlanderCivil',tile:g.tile,tick:w.tick,version:293,rng:519,nextId:w.nextId});if(!draft.ok)throw Error(draft.reason);
 const after=captureProspectiveGroupMass256({...g,items:[...g.items,...draft.items]},293)!;expect(after.capacityGrams).toBe(before.capacityGrams);expect(after.grams).toBe(before.grams+draft.massGrams);expect(load.quantity).toBe(1000000);
},120_000);

test('old and future families cannot acquire prospective gift IDs or mutate the source',()=>{
 const {w,groupId}=peaceTalksCamp473(false),g=w.worldGroups!.groups.find(r=>r.state.id===groupId)!.state;if(!('members'in g))throw Error('Original caravan absent');const before=JSON.stringify(g);
 for(const version of [292,294])expect(draftPeaceTriumph293({group:g,factionDef:'OutlanderCivil',tile:g.tile,tick:w.tick,version,rng:77,nextId:w.nextId}).ok).toBe(false);expect(JSON.stringify(g)).toBe(before);
},120_000);
