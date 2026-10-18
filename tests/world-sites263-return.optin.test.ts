import {test,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {registeredMap} from '../src/sim/world-map-context';
import {materialAllowedForPlayer256} from '../src/sim/material-permission-256';
import {captureGroupMass} from '../src/sim/group-capture';
import {groupFormationAuthority,groupSourceChoices} from '../src/sim/group-authority';
import {previewGroupLoading} from '../src/sim/group-loading';
import {freightGroup} from '../src/sim/group-freight';
import {decodeStoredSave} from '../src/ui/save-storage-codec';
import * as incidentChance from '../src/sim/caravan-incident-calculation-261';
import {runtime415} from './helpers/reform-v260-fixture';
import {writeTestFileSync,testOutputPath} from './test-output';
import type {World,Command,MaterialPile,Cell} from '../src/sim/types';
import type {CampaignState} from '../src/sim/world-map-state';

const REWARD_IDS=[61462,61463,61464,61465,61466,61467,61468,61469]as const;
const EXPECTED_REWARDS=[['cloth',9],['medicine',8],['cloth',7],['gold',44],['plasteel',6],['advanced-component',1],['gold',1],['silver',1]]as const;
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const NOTICE='Prepared single continuation from ROOT FUTURE acquired native Site-entry export, exact path/SHA mandatory. Same first Site1/tile116286/none and Things61462..61469, same7/8, resident9/home0. Ordinary Allow/group-start, real pickups/contact/loading/mass/exit and actual route/enter/unload; no generator, producer, reroll, added goods, artificial time/positions/needs, combat/victory/healing or construction. Unrelated caravan chances are suppressed only AFTER actual calculation/PRNG draws. Checkpoints precede admission on refusal. Natural inventory consumption and actual ground merges remain actual transitions, never fake ID repairs.';
function require263(root:CampaignState):asserts root is World {if(Number(root.schemaVersion)!==263||!('pawns'in root)||root.planet?.revision!==3||!root.worldMaps||!root.worldGroups||!root.worldFactions||!root.worldPawns)throw Error('Actual complete263 geographic authority required');}
const position=(p:Cell&{motion?:{end:number;from:Cell}|null},tick:number):Cell=>p.motion&&p.motion.end>tick?p.motion.from:p;
const contact=(a:Cell,b:Cell)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)<=1;
const owned=(p:MaterialPile,ids:ReadonlySet<number>)=>'pawnId'in p.owner&&ids.has(p.owner.pawnId);
function bound(name:string,fallback:number,max:number){const n=Number(process.env[name]??fallback);if(!Number.isSafeInteger(n)||n<1||n>max)throw Error(`${name} must be an explicit bounded positive integer <=${max}`);return n;}

test.skipIf(process.env.WORLD_SITES263_RETURN_SIM!=='1')('future actual native Site1 none: eight contact pickups, same owners depart/close Site and return/unload home0 with exact RAW',async()=>{
 const input=process.env.WORLD_SITES263_RETURN_INPUT,inputSHA=process.env.WORLD_SITES263_RETURN_INPUT_SHA256;
 if(!input||!inputSHA||!/^[a-f0-9]{64}$/.test(inputSHA))throw Error('ROOT must provide the FUTURE genuine post-entry native export path and its exact SHA; no fallback');
 const bytes=readFileSync(input,'utf8');expect(sha(bytes)).toBe(inputSHA);const raw=await decodeStoredSave(bytes),root=deserializeCampaign(raw);require263(root);expect(serializeCampaign(root)).toBe(raw);expect(validateWorld(root)).toEqual([]);
 const checkpoint=(label:string,extra:object={})=>{
  const p=testOutputPath(`artifacts/world-sites263-return/${label}-RAW.json`)as string;writeTestFileSync(p,JSON.stringify(root));expect(validateWorld(root)).toEqual([]);const value=serializeCampaign(root);writeTestFileSync(p,value);const receipt={revision:1,schemaVersion:263,path:p,sha256:sha(value),input,inputSHA256:inputSHA,tick:root.tick,notice:NOTICE,...extra};writeTestFileSync(p.replace(/-RAW\.json$/,'-receipt.json'),JSON.stringify(receipt,null,2));return {raw:value,...receipt};
 };
 function fail(label:string,reason:string,extra:object={}):never {checkpoint(label,{reason,...extra});throw Error(reason);}
 const site=root.worldSites263?.entries.find(s=>s.id===1),header=root.worldMaps!.sites.find(s=>s.kind==='quest-site'&&s.target263?.kind==='quest-site'&&s.target263.siteId===1),homeHeader=root.worldMaps!.sites.find(s=>s.id===0&&s.kind==='settlement');
 if(!site||site.kind!=='item-stash'||site.tile!==116286||site.threat.kind!=='none'||site.closed||!header||site.mapId!==header.id||site.expiresAtCore!==null||site.items.length||root.worldMaps!.selectedMapId!==header.id||!homeHeader||homeHeader.tile===null)fail('00-source-refused','Input must be the actual first Site none AFTER native entry, with real home0');
 const mapId=header.id,homeTile=homeHeader.tile,map=registeredMap(root,mapId)!,home=registeredMap(root,0)!;
 const members=[7,8].map(id=>map.pawns.find(p=>p.id===id));if(members.some(p=>!p)||!home.pawns.some(p=>p.id===9)||root.worldGroups!.groups.some(r=>'members'in r.state?r.state.members.some(p=>p.id===7||p.id===8):r.state.memberIds.some(id=>id===7||id===8)))fail('00-people-refused','Actual7/8 on Site and9 at home, with no competing owner, required');
 const people=members.filter((p):p is NonNullable<typeof p>=>!!p),ids=new Set(people.map(p=>p.id));
 const rewards=REWARD_IDS.map(id=>map.piles.find(p=>p.id===id));if(rewards.some((p,i)=>!p||p.owner.type!=='ground'||p.item!==EXPECTED_REWARDS[i]![0]||p.quantity!==EXPECTED_REWARDS[i]![1]))fail('00-rewards-refused','The eight original ground rewards differ; no new item or quantity is prepared');
 const things=rewards.filter((p):p is MaterialPile=>!!p),beforeOwned=map.piles.filter(p=>owned(p,ids)),beforePacks=map.packed.filter(p=>p.owner.type==='inventory'&&ids.has(p.owner.pawnId)),beforeOwnedRows=beforeOwned.map(p=>({id:p.id,item:p.item,quantity:p.quantity,owner:{...p.owner}})),beforeTick=root.tick;
 const run=runtime415(root),command=(c:Command)=>{const r=applyCommand(root,c,run);if(!r.ok)fail(`command-refused-${c.type}`,r.reason??'Actual command refused',{command:c});};
 checkpoint('01-actual-native-entry-before-Allow',{mapId,homeMapId:0,people:people.map(p=>({id:p.id,x:p.x,z:p.z})),rewardIds:REWARD_IDS,beforeOwned:beforeOwnedRows});
 // Conditional player permission on the ACTUAL input only. No tick, needs,
 // health, quantity, placement or earlier arrival is changed here.
 const homeMeals=home.piles.filter(p=>p.owner.type==='ground'&&p.item==='survival-meal'&&!materialAllowedForPlayer256(p));
 if(homeMeals.length){
  const allowed=homeMeals.map(p=>({id:p.id,quantity:p.quantity,owner:{...p.owner}}));
  command({type:'map-view',mapId:0});for(const p of homeMeals)command({type:'material-forbid',pileId:p.id,forbidden:false});command({type:'map-view',mapId});
  expect(root.tick).toBe(beforeTick);expect(root.worldMaps!.selectedMapId).toBe(mapId);for(let i=0;i<homeMeals.length;i++){expect(materialAllowedForPlayer256(homeMeals[i]!)).toBe(true);expect(homeMeals[i]!.quantity).toBe(allowed[i]!.quantity);expect(homeMeals[i]!.owner).toEqual(allowed[i]!.owner);}
  checkpoint('01a-home0-existing-meals-allowed-without-step',{allowed});
 }
 for(const p of things)command({type:'material-forbid',pileId:p.id,forbidden:false});
 const choices=groupSourceChoices(map);for(const p of things){const c=choices.find(c=>c.pile===p);if(!c||c.reason||c.available!==p.quantity)fail('02-selection-refused',c?.reason??'Original reward is not fully available',{pileId:p.id});}
 const sources=things.map(p=>({pileId:p.id,quantity:p.quantity})),preview=previewGroupLoading(map,people.map(p=>p.id),sources,groupFormationAuthority(map));
 if(preview.kind!=='ready')fail('02-loading-refused','The actual mass/reservations/access refuse these original rewards',{kind:preview.kind,...preview.kind==='refused'?{reason:preview.reason}:{}});
 expect(preview.mass.grams).toBeLessThanOrEqual(preview.mass.capacityGrams);const promised=preview.manifest.map(l=>({...l}));
 const groupId=root.planet!.nextGroupId,actualChance=incidentChance.caravanIncidentOccurs261,chance=vi.spyOn(incidentChance,'caravanIncidentOccurs261').mockImplementation((...args:Parameters<typeof actualChance>)=>{actualChance(...args);return false;});
 const pickupRows:{pileId:number;quantity:number;carrierId:number;tick:number;cell:Cell}[]=[],drops:{sourceIds:number[];item:MaterialPile['item'];quantity:number;tick:number;targets:{id:number;added:number;cell:Cell}[]}[]=[];
 try{
 command({type:'group-start',originMapId:mapId,memberIds:people.map(p=>p.id),sources,destination:homeTile});
 const record=()=>root.worldGroups!.groups.find(r=>r.state.id===groupId);let pickupCheckpoint=false;
 const formationLimit=bound('WORLD_SITES263_RETURN_FORMATION_TICKS',5000,30000);
 for(let n=0;n<formationLimit;n++){
  const r=record(),g=r?.state;if(!r||!g)fail('03-formation-cancelled','Actual formation was cancelled; carried goods stay at their real owners',{groupId,pickupRows});if('members'in g)break;
  const grounded=things.filter(p=>p.owner.type==='ground').map(p=>({pile:p,quantity:p.quantity,cell:{x:(p.owner as {x:number}).x,z:(p.owner as {z:number}).z}}));stepWorld(root,1,undefined,run);
  for(const old of grounded)if(old.pile.owner.type==='inventory'){
   const carrierId=old.pile.owner.pawnId,carrier=people.find(p=>p.id===carrierId);expect(carrier).toBeDefined();expect(old.pile.quantity).toBe(old.quantity);expect(contact(position(carrier!,root.tick),old.cell)).toBe(true);expect((carrier!.motion?.end??0)<=root.tick).toBe(true);pickupRows.push({pileId:old.pile.id,quantity:old.quantity,carrierId:carrier!.id,tick:root.tick,cell:old.cell});
  }
  if(!pickupCheckpoint&&things.every(p=>p.owner.type==='inventory')){pickupCheckpoint=true;checkpoint('03-eight-originals-picked-up-before-exit',{groupId,pickupRows,promised,massPreview:preview.mass});}
 }
 const departed=record()?.state;if(!departed||!('members'in departed))fail('04-departure-refused','Physical pickups/exit did not finish within the declared bound',{groupId,pickupRows});
 expect(pickupCheckpoint).toBe(true);expect(pickupRows.map(p=>p.pileId).sort((a,b)=>a-b)).toEqual([...REWARD_IDS]);for(const p of people)expect(departed.members).toContain(p);for(const p of things){expect(departed.items).toContain(p);expect(p.quantity).toBe(EXPECTED_REWARDS[REWARD_IDS.indexOf(p.id as typeof REWARD_IDS[number])]![1]);}
 for(const p of beforeOwned)if(p.kind!=='food')expect(departed.items).toContain(p);for(const p of beforePacks)expect(departed.packed).toContain(p);
 const mass=captureGroupMass(departed.members,departed.items,freightGroup(departed),root.schemaVersion,departed.packed,departed.animalOwners?.members);if(!mass)fail('04-mass-refused','True departure inventory has no admitted mass');expect(mass.carriers.every(c=>c.grams<=c.capacityGrams)).toBe(true);
 expect(root.worldMaps!.sites.some(s=>s.id===mapId)).toBe(false);expect(root.worldMaps!.retired.find(s=>s.id===mapId)).toMatchObject({kind:'quest-site',reason:'abandon'});expect(site.closed).toMatchObject({reason:'map-removed'});expect(site.mapId).toBeNull();expect(site.items).toEqual([]);
 checkpoint('04-real-departure-and-Site-closed',{groupId,pickupRows,mass,beforeOwned:beforeOwnedRows});
 command({type:'caravan-order',groupId,destination:homeTile,action:{kind:'enter',mapId:0}});
 const travelLimit=bound('WORLD_SITES263_RETURN_TRAVEL_TICKS',10000,100000);
 for(let n=0;n<travelLimit&&record()?.localMapId!==0;n++){
  const r=record();if(!r||r.pending261||r.pendingEntry263)fail('05-route-refused','Real caravan disappeared or received an unrelated unresolved pending',{groupId});stepWorld(root,1,undefined,run);if((n+1)%2000===0)checkpoint(`05-route-${n+1}`,{groupId});
 }
 if(record()?.localMapId!==0)fail('06-home-entry-refused','The real return route/entry did not finish within its declared bound',{groupId});
 const returned=registeredMap(root,0)!;for(const p of people)expect(returned.pawns).toContain(p);expect(returned.pawns.some(p=>p.id===9)).toBe(true);for(const p of things)expect(returned.piles).toContain(p);checkpoint('06-real-home0-before-unload',{groupId});
 const unloadLimit=bound('WORLD_SITES263_RETURN_UNLOAD_TICKS',2000,10000);
 for(let n=0;n<unloadLimit&&record();n++){
  const pending=things.filter(p=>returned.piles.includes(p)&&p.owner.type==='inventory').map(p=>({pile:p,quantity:p.quantity,ground:new Map(returned.piles.filter(q=>q.item===p.item&&q.owner.type==='ground').map(q=>[q.id,q.quantity]))}));stepWorld(root,1,undefined,run);
  const done=pending.filter(old=>old.pile.owner.type==='ground'||!returned.piles.includes(old.pile));
  for(const item of new Set(done.map(old=>old.pile.item))){const batch=done.filter(old=>old.pile.item===item),ground=batch[0]!.ground,quantity=batch.reduce((n,old)=>n+old.quantity,0),targets=returned.piles.filter(p=>p.item===item&&p.owner.type==='ground'&&p.quantity>(ground.get(p.id)??0)).map(p=>({id:p.id,added:p.quantity-(ground.get(p.id)??0),cell:{x:(p.owner as {x:number}).x,z:(p.owner as {z:number}).z}}));expect(targets.reduce((n,p)=>n+p.added,0)).toBe(quantity);for(const target of targets)expect(people.some(p=>contact(position(p,root.tick),target.cell))).toBe(true);drops.push({sourceIds:batch.map(old=>old.pile.id),item,quantity,tick:root.tick,targets});}
 }
 if(record())fail('07-unload-refused','The ordinary home unloading remains unfinished',{groupId,drops});
 expect(drops.flatMap(p=>p.sourceIds).sort((a,b)=>a-b)).toEqual([...REWARD_IDS]);expect(root.worldMaps!.sites.filter(s=>s.kind==='settlement')).toHaveLength(1);expect(root.worldMaps!.sites.some(s=>s.id===mapId)).toBe(false);expect(site.closed).toMatchObject({reason:'map-removed'});expect(root.tick).toBeGreaterThan(beforeTick);
 const final=checkpoint('07-eight-rewards-returned-and-unloaded',{groupId,pickupRows,drops,declaredBounds:{formationLimit,travelLimit,unloadLimit}});expect(serializeCampaign(deserializeCampaign(final.raw))).toBe(final.raw);expect(sha(readFileSync(input,'utf8'))).toBe(inputSHA);
 writeTestFileSync('artifacts/world-sites263-return/proof.json',JSON.stringify({complete:true,notice:NOTICE,input,inputSHA256:inputSHA,finalSHA256:final.sha256,groupId,mapId,pickupRows,drops,exactFinalReload:true},null,2));
 }catch(error){checkpoint('99-last-state-on-failure',{error:String(error),groupId,pickupRows,drops});throw error;}finally{chance.mockRestore();}
},600_000);
