import {test,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization';
import {stepWorld} from '../src/sim/engine';
import {registeredMap} from '../src/sim/world-map-context';
import {registeredMapPresentation} from '../src/sim/world-map-presentation';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {groupHumanHandler257} from '../src/sim/group-human-admission-257';
import {hasMentalBreak} from '../src/sim/mental-state';
import {materialAllowedForPlayer256} from '../src/sim/material-permission-256';
import * as incidentChance from '../src/sim/caravan-incident-calculation-261';
import {runtime415} from './helpers/reform-v260-fixture';
import {writeTestFileSync} from './test-output';
import type {World,MaterialPile,Cell} from '../src/sim/types';
import type {CampaignState} from '../src/sim/world-map-state';

const REWARDS=[61462,61463,61464,61465,61466,61467,61468,61469];
const GOODS=[['cloth',9],['medicine',8],['cloth',7],['gold',44],['plasteel',6],['advanced-component',1],['gold',1],['silver',1]]as const;
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
function restored(raw:string):World {const root:CampaignState=deserializeCampaign(raw);if(Number(root.schemaVersion)!==263||!('pawns'in root)||root.planet?.revision!==3||!root.worldMaps||!root.worldGroups||!root.worldFactions||!root.worldPawns)throw Error('Actual complete263 campaign required');expect(validateWorld(root)).toEqual([]);return root;}
const contact=(a:Cell,b:Cell)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)<=1;
function bound(name:string,fallback:number,max:number){const n=Number(process.env[name]??fallback);if(!Number.isSafeInteger(n)||n<1||n>max)throw Error(`${name} must be an integer1..${max}`);return n;}
const COMPLETED_SHA='487bad573d175436595ff5a3056f76a20f8817fc841cbb4cafd87f0b54c9879b';
const NOTICE="Continuation ONLY of ROOT actual unloading15093 RAW487bad57… from unload15091-01 RED30.502s. Arrival15091 and two real unloading ticks have ALREADY happened: cloth9/medicine8 at15092, cloth7/gold44 at15093 are four actual ground originals, never replayed or fabricated. Prior receipt proves the first three drops; the fourth actual gold ground owner is checked read-only, not retrospectively promoted to a new contact trace. Only ten remaining inventory piles are stepped. Same originals7/8, downed resident9 and real visitor135907; no travel/entry/Reform/queue/permission/ration/care replay. New physical deposits admit the actual carrier OR another real admitted member touching both carrier and destination with completed motions, witnessed before/after the real step. Existing chance arithmetic/draws then result suppression for future ticks remains declared, never a natural-MTB proof.";
/** Existing unloading/contact/reload oracle ONLY. The actual15093 prefix is
 * already durable; only ten remaining inventory piles can be newly dropped. */
test.skipIf(process.env.WORLD_SITES263_REFORM_RETURN_RESUME10500_SIM!=='1')('actual home15093: four durable reward drops, only ten remaining piles, exact reload',async()=>{
 const input=process.env.WORLD_SITES263_REFORM_RETURN_RESUME10500_INPUT,inputSHA=process.env.WORLD_SITES263_REFORM_RETURN_RESUME10500_INPUT_SHA256;
 if(!input||!inputSHA||!/^[a-f0-9]{64}$/.test(inputSHA))throw Error('Exact acquired unloading15093 RAW487bad57… path and SHA required; no previous unloading/queue/route/entry fallback');
 const raw=readFileSync(input,'utf8');expect(inputSHA).toBe(COMPLETED_SHA);expect(sha(raw)).toBe(COMPLETED_SHA);
 // This scope returns only serialized data and scalar witnesses. It releases
 // its runtime/World before the independent final reload/Decoder below.
 const playReturn=()=>{
  const root=restored(raw);expect(serializeCampaign(root)).toBe(raw);expect(root.tick).toBe(15093);expect(root.worldPawns!.atCore).toBe(150930);expect(root.rng).toBe(1928114723);expect(root.nextId).toBe(135957);
  const checkpoint=(label:string,extra:object={})=>{const path=`artifacts/world-sites263-reformed-return-resume10500/${label}-RAW.json`;writeTestFileSync(path,JSON.stringify(root));expect(validateWorld(root)).toEqual([]);const saved=serializeCampaign(root);writeTestFileSync(path,saved);writeTestFileSync(path.replace(/-RAW\.json$/,'-receipt.json'),JSON.stringify({input,inputSHA256:inputSHA,sha256:sha(saved),tick:root.tick,notice:NOTICE,...extra},null,2));return {raw:saved,sha256:sha(saved),tick:root.tick};};
  function fail(label:string,reason:string,extra:object={}):never {checkpoint(label,{reason,...extra});throw Error(reason);}
  const candidates=root.worldGroups!.groups.filter(r=>r.state.id===2);
  if(candidates.length!==1||root.worldGroups!.groups.length!==1)fail('00-input-refused','Exactly the real already-arrived group2 unloading owner is required');
  const owner=candidates[0]!,g=owner.state;if(g.phase!=='unloading')throw Error('Actual unloading state required, never an away-members container');
  const homeHeader=root.worldMaps!.sites.find(s=>s.id===0&&s.kind==='settlement'),site=root.worldSites263?.entries.find(s=>s.id===1),originMapId=owner.originMapId,home=registeredMap(root,0);
  if(owner.localMapId!==0||originMapId!==1||!home||!homeHeader||homeHeader.tile!==84051||g.destination!==homeHeader.tile||!site||site.kind!=='item-stash'||site.tile!==116286||site.threat.kind!=='none'||!site.closed||site.closed.reason!=='map-removed'||site.closed.atCore!==80750||site.mapId!==null||site.items.length||root.worldMaps!.sites.some(s=>s.id===originMapId))fail('00-input-refused','Input must be exact15093 unloading on real home0, Site1 removed; no previous drop, route or entry replay');
  expect(g.memberIds.slice().sort((a,b)=>a-b)).toEqual([7,8]);expect(owner.arrival261).toBeUndefined();expect(owner.pending261).toBeUndefined();expect(owner.pendingEntry263).toBeUndefined();
  const extraFood=[[61472,'survival-meal',10],[61473,'survival-meal',10],[61502,'agave-fruit',2],[61752,'agave-fruit',1],[135019,'agave-fruit',1],[135954,'berries',2]] as const,expectedPending=[...REWARDS.slice(4),...extraFood.map(([id])=>id)];
  expect(g.pendingPileIds.slice().sort((a,b)=>a-b)).toEqual(expectedPending.slice().sort((a,b)=>a-b));expect(g.pendingPackedIds??[]).toEqual([]);
  const groupId=g.id,startTick=root.tick,players=g.memberIds.map(id=>{const p=home.pawns.find(p=>p.id===id);if(!p)fail('00-player-refused','Actual returned original missing from home');return p;}),carried=g.pendingPileIds.map(id=>{const p=home.piles.find(p=>p.id===id);if(!p||p.owner.type!=='inventory'||![7,8].includes(p.owner.pawnId))fail('00-owner-refused','Every actual pending pile must still belong to original7/8 inventory');return p;});
  const things=REWARDS.map(id=>home.piles.find(p=>p.id===id));for(const [i,p]of things.entries())if(!p||p.item!==GOODS[i]![0]||p.quantity!==GOODS[i]![1])fail('00-rewards-refused','Eight genuine original reward stacks are required, not a reconstruction');
  for(const [id,item,quantity]of extraFood)expect(carried.find(p=>p.id===id)).toMatchObject({id,item,quantity,owner:{type:'inventory'}});
  const rewards=things.filter((p):p is MaterialPile=>p!==undefined),otherGoods=carried.filter(p=>!REWARDS.includes(p.id)),packs=home.packed.filter(p=>p.owner.type==='inventory'&&[7,8].includes(p.owner.pawnId)),initialInventory=carried.map(p=>({id:p.id,item:p.item,quantity:p.quantity,owner:structuredClone(p.owner)}));expect(otherGoods).toHaveLength(6);expect(packs).toHaveLength(0);
  const prefixCells=[{x:102,z:0},{x:103,z:0},{x:104,z:0},{x:102,z:1}],historicalGround=rewards.slice(0,4).map((p,i)=>{expect(p.owner).toEqual({type:'ground',...prefixCells[i]!});expect(g.pendingPileIds).not.toContain(p.id);return {id:p.id,item:p.item,quantity:p.quantity,owner:structuredClone(p.owner),historicalTick:i<2?15092:15093,evidence:i<3?'prior actual receipt contact assertion':'actual15093 ground owner only; no replay/contact trace invented'};});
  expect(carried).toHaveLength(10);expect(g.admission).toEqual({revision:2});expect(players.map(p=>({id:p.id,x:p.x,z:p.z}))).toEqual([{id:7,x:103,z:0},{id:8,x:102,z:0}]);
  for(const p of players)expect(p.motion?.end??0).toBeLessThanOrEqual(root.tick);
  // Actual gold44 is ground at102,1: member8 touches this target and carrier7.
  expect(contact(players[1]!,players[0]!)).toBe(true);expect(contact(players[1]!,prefixCells[3]!)).toBe(true);
  const resident=home.pawns.find(p=>p.id===9),visitor=home.pawns.find(p=>p.id===135907);if(!resident||!visitor?.visitor)fail('00-home-refused','Keep actual resident9 and visitor135907 without substitution');expect(resident.state).toBe('downed');
  const run=runtime415(root),record=()=>root.worldGroups!.groups.find(r=>r.state.id===groupId),closed=structuredClone(site.closed),returned=home;
  for(const p of players)expect(returned.pawns).toContain(p);for(const p of rewards)expect(returned.piles).toContain(p);checkpoint('03-real-home0-before-unload',{groupId,originMapId,initialInventory,historicalGround,people:home.pawns.map(p=>({id:p.id,state:p.state,visitor:!!p.visitor})),notice:'Same actual15093 after four real drops, no previous unloading tick or command replayed'});
  const permissions:object[]=[];expect(home.piles.filter(p=>p.owner.type==='ground'&&p.item==='survival-meal').every(p=>materialAllowedForPlayer256(p))).toBe(true); // Original Allow already happened, no permission command.
  const actualChance=incidentChance.caravanIncidentOccurs261,chance=vi.spyOn(incidentChance,'caravanIncidentOccurs261').mockImplementation((...args:Parameters<typeof actualChance>)=>{actualChance(...args);return false;});
  const memberSnapshot=()=>players.map(p=>{expect(returned.pawns).toContain(p);return {id:p.id,cell:{x:p.x,z:p.z},motion:p.motion?structuredClone(p.motion):null,moveCooldown:p.moveCooldown,eligible:groupHumanHandler257(p)&&!hasMentalBreak(p)&&!p.flee&&!p.melee&&!p.shooting};});
  type MemberWitness=ReturnType<typeof memberSnapshot>[number];
  const drops:{sourceIds:number[];item:MaterialPile['item'];quantity:number;tick:number;targets:{id:number;added:number;cell:Cell}[];before:MemberWitness[];after:MemberWitness[];contacts:{sourceId:number;targetId:number;carrierId:number;handlerId:number;phase:'before'|'after'}[]}[]=[];
  try{
   const unloadLimit=bound('WORLD_SITES263_REFORM_RETURN_UNLOAD_TICKS',2000,10000);
   for(let n=0;n<unloadLimit&&record();n++){
    const before=memberSnapshot(),beforeTick=root.tick,pending=carried.filter(p=>returned.piles.includes(p)&&p.owner.type==='inventory').map(p=>({pile:p,quantity:p.quantity,carrierId:p.owner.type==='inventory'?p.owner.pawnId:undefined,ground:new Map(returned.piles.filter(q=>q.item===p.item&&q.owner.type==='ground').map(q=>[q.id,q.quantity]))}));stepWorld(root,1,undefined,run);const after=memberSnapshot();expect(root.tick).toBe(beforeTick+1);
    const done=pending.filter(old=>old.pile.owner.type==='ground'||!returned.piles.includes(old.pile));
    for(const item of new Set(done.map(old=>old.pile.item))){
     const batch=done.filter(old=>old.pile.item===item),ground=batch[0]!.ground,quantity=batch.reduce((n,old)=>n+old.quantity,0),targets=returned.piles.filter(p=>p.item===item&&p.owner.type==='ground'&&p.quantity>(ground.get(p.id)??0)).map(p=>({id:p.id,added:p.quantity-(ground.get(p.id)??0),cell:{x:p.owner.type==='ground'?p.owner.x:-1,z:p.owner.type==='ground'?p.owner.z:-1}}));
     expect(targets.reduce((n,p)=>n+p.added,0)).toBe(quantity);
     const contacts:{sourceId:number;targetId:number;carrierId:number;handlerId:number;phase:'before'|'after'}[]=[];
     for(const target of targets)for(const row of batch)for(const [phase,members]of [['before',before],['after',after]]as const){
      const carrier=members.find(p=>p.id===row.carrierId);if(!carrier||(carrier.motion?.end??0)>root.tick)continue;
      for(const handler of members){
       if(!handler.eligible||handler.moveCooldown!==0||(handler.motion?.end??0)>root.tick||!contact(handler.cell,target.cell))continue;
       if(handler.id!==carrier.id&&(!g.admission||!contact(handler.cell,carrier.cell)))continue;
       contacts.push({sourceId:row.pile.id,targetId:target.id,carrierId:carrier.id,handlerId:handler.id,phase});
      }
     }
     // Every actual source and every quantity increase needs a physical handler.
     for(const row of batch)expect(contacts.some(c=>c.sourceId===row.pile.id)).toBe(true);
     for(const target of targets)expect(contacts.some(c=>c.targetId===target.id)).toBe(true);
     drops.push({sourceIds:batch.map(old=>old.pile.id),item,quantity,tick:root.tick,targets,before,after,contacts});
    }
   }
   if(record())fail('04-unload-refused','Ordinary home unloading remains unfinished; no forced drop/stockpile/filter',{groupId,drops});
   expect(drops.flatMap(d=>d.sourceIds).filter(id=>REWARDS.includes(id)).sort((a,b)=>a-b)).toEqual(REWARDS.slice(4));
   expect([...historicalGround.map(p=>p.id),...drops.flatMap(d=>d.sourceIds).filter(id=>REWARDS.includes(id))].sort((a,b)=>a-b)).toEqual(REWARDS);
   expect(drops.flatMap(d=>d.sourceIds).sort((a,b)=>a-b)).toEqual(initialInventory.map(p=>p.id).sort((a,b)=>a-b));
   for(const item of new Set(initialInventory.map(p=>p.item)))expect(drops.filter(d=>d.item===item).reduce((n,d)=>n+d.quantity,0)).toBe(initialInventory.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0));
   for(const p of packs)expect(returned.packed).toContain(p);for(const p of players)expect(returned.pawns).toContain(p);expect(returned.pawns).toContain(resident);for(const id of [7,8])expect(root.worldPawns!.owners.some(r=>r.actor.id===id)).toBe(false);
   expect(root.worldMaps!.sites.filter(s=>s.kind==='settlement')).toHaveLength(1);expect(root.worldMaps!.sites.some(s=>s.id===originMapId)).toBe(false);expect(site.closed).toEqual(closed);expect(root.tick).toBeGreaterThan(startTick);
   const final=checkpoint('04-eight-rewards-returned-and-physically-unloaded',{groupId,originMapId,historicalGround,drops,permissions,declaredBounds:{unloadLimit}});return {...final,groupId,originMapId,historicalGround,drops,permissions,startTick};
  }catch(error){try{checkpoint('99-last-actual-state-on-failure',{error:String(error),groupId,drops});}catch(cause){writeTestFileSync('artifacts/world-sites263-reformed-return-resume10500/failure.json',JSON.stringify({error:String(error),captureError:String(cause)}));}throw error;}finally{chance.mockRestore();}
 };
 const final=playReturn();
 {const root=restored(final.raw);expect(serializeCampaign(root)).toBe(final.raw);expect(root.tick).toBe(final.tick);const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();for(const kind of ['checkpoint','delta']as const){const packet=structuredClone(encoder.encode(root,0,0));expect(packet.kind).toBe(kind);const adopted=decoder.adopt(packet);expect(adopted.status).toBe('applied');if(adopted.status!=='applied')throw Error('Actual final transport adoption required');expect(adopted.world).toEqual(registeredMapPresentation(root));expect(serializeCampaign(root)).toBe(final.raw);}}
 expect(sha(readFileSync(input,'utf8'))).toBe(inputSHA);writeTestFileSync('artifacts/world-sites263-reformed-return-resume10500/proof.json',JSON.stringify({complete:true,notice:NOTICE,input,inputSHA256:inputSHA,finalSHA256:final.sha256,tick:final.tick,groupId:final.groupId,originMapId:final.originMapId,historicalGround:final.historicalGround,drops:final.drops,permissions:final.permissions,exactFinalReload:true},null,2));
},1_800_000);
