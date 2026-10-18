import {test,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {registeredMap} from '../src/sim/world-map-context';
import {registeredMapPresentation} from '../src/sim/world-map-presentation';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {materialAllowedForPlayer256} from '../src/sim/material-permission-256';
import {decodeStoredSave} from '../src/ui/save-storage-codec';
import * as incidentChance from '../src/sim/caravan-incident-calculation-261';
import {runtime415} from './helpers/reform-v260-fixture';
import {writeTestFileSync} from './test-output';
import type {World,Command,MaterialPile,Cell} from '../src/sim/types';
import type {CampaignState} from '../src/sim/world-map-state';

const REWARDS=[61462,61463,61464,61465,61466,61467,61468,61469];
const GOODS=[['cloth',9],['medicine',8],['cloth',7],['gold',44],['plasteel',6],['advanced-component',1],['gold',1],['silver',1]]as const;
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
function restored(raw:string):World {const root:CampaignState=deserializeCampaign(raw);if(Number(root.schemaVersion)!==263||!('pawns'in root)||root.planet?.revision!==3||!root.worldMaps||!root.worldGroups||!root.worldFactions||!root.worldPawns)throw Error('Actual complete263 campaign required');expect(validateWorld(root)).toEqual([]);return root;}
const position=(p:Cell&{motion?:{end:number;from:Cell}|null},tick:number):Cell=>p.motion&&p.motion.end>tick?p.motion.from:p;
const contact=(a:Cell,b:Cell)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)<=1;
function bound(name:string,fallback:number,max:number){const n=Number(process.env[name]??fallback);if(!Number.isSafeInteger(n)||n<1||n>max)throw Error(`${name} must be an integer1..${max}`);return n;}
const NOTICE='Continuation ONLY of ROOT future acquired UI Reform B caravan export. No Site-entry, Reform, group-start, pickup, route selection, generator or actor replay. Existing saved route and enter-home action remain literal. Before time, only actual forbidden ground meals at home may receive ordinary Allow commands. Existing QA adaptation from return02: unrelated caravan chances call their actual arithmetic/PRNG, then suppress only their result; no natural-MTB claim. Real physiology, needs, route, entry and contact unloading continue.';

/** Same return/unload authorities as return02, but its input must now be the
 * REAL UI immediate-Reform export. The old physical-eight-pickup pilot remains
 * immutable and is never used as a preparation fallback. */
test.skipIf(process.env.WORLD_SITES263_REFORM_RETURN_SIM!=='1')('future real UI Reform B caravan: saved route→enterHome→eight real drops, exact RAW/transport/reload',async()=>{
 const input=process.env.WORLD_SITES263_REFORM_RETURN_INPUT,inputSHA=process.env.WORLD_SITES263_REFORM_RETURN_INPUT_SHA256;
 if(!input||!inputSHA||!/^[a-f0-9]{64}$/.test(inputSHA))throw Error('Future genuine UI Reform caravan export path and exact SHA required; no entry/Reform/start fallback');
 const bytes=readFileSync(input,'utf8');expect(sha(bytes)).toBe(inputSHA);const raw=await decodeStoredSave(bytes);
 // This scope returns only serialized data and scalar witnesses. It releases
 // its runtime/World before the independent final reload/Decoder below.
 const playReturn=()=>{
  const root=restored(raw);expect(serializeCampaign(root)).toBe(raw);
  const checkpoint=(label:string,extra:object={})=>{const path=`artifacts/world-sites263-reformed-return/${label}-RAW.json`;writeTestFileSync(path,JSON.stringify(root));expect(validateWorld(root)).toEqual([]);const saved=serializeCampaign(root);writeTestFileSync(path,saved);writeTestFileSync(path.replace(/-RAW\.json$/,'-receipt.json'),JSON.stringify({input,inputSHA256:inputSHA,sha256:sha(saved),tick:root.tick,notice:NOTICE,...extra},null,2));return {raw:saved,sha256:sha(saved),tick:root.tick};};
  function fail(label:string,reason:string,extra:object={}):never {checkpoint(label,{reason,...extra});throw Error(reason);}
  const candidates=root.worldGroups!.groups.filter(r=>'members'in r.state&&r.state.members.map(p=>p.id).slice().sort((a,b)=>a-b).join(',')==='7,8');
  if(candidates.length!==1||root.worldGroups!.groups.length!==1)fail('00-input-refused','Exactly the one real reformed7/8 caravan is required');
  const owner=candidates[0]!,g=owner.state;if(!('members'in g))throw Error('Actual away state required');
  const homeHeader=root.worldMaps!.sites.find(s=>s.id===0&&s.kind==='settlement'),site=root.worldSites263?.entries.find(s=>s.id===1),originMapId=g.reorganization?.birth?.kind==='reform'?g.reorganization.birth.sourceMapId:undefined;
  if(owner.localMapId!==null||g.phase!=='travelling'||g.segment!==null||g.paused||g.departedAt!==root.tick||g.lastPersonalTick!==root.tick||originMapId===undefined||owner.originMapId!==originMapId||!homeHeader||homeHeader.tile===null||g.destination!==homeHeader.tile||g.tile!==116286||!site||site.kind!=='item-stash'||site.tile!==116286||site.threat.kind!=='none'||!site.closed||site.closed.reason!=='map-removed'||site.closed.atCore!==root.tick*10||site.mapId!==null||site.items.length||root.worldMaps!.sites.some(s=>s.id===originMapId))fail('00-input-refused','Input must be the acquired same-tick UI Reform of first Site1/none, already removed, with its literal home route');
  expect(owner.arrival261).toEqual({tile:homeHeader.tile,action:{kind:'enter',mapId:0}});expect(owner.pending261).toBeUndefined();expect(owner.pendingEntry263).toBeUndefined();
  const groupId=g.id,startTick=root.tick,players=g.members.slice(),things=REWARDS.map(id=>g.items.find(p=>p.id===id));for(const [i,p]of things.entries())if(!p||p.owner.type!=='inventory'||![7,8].includes(p.owner.pawnId)||p.item!==GOODS[i]![0]||p.quantity!==GOODS[i]![1])fail('00-rewards-refused','Eight genuine original reward stacks are required, not a reconstruction');
  const rewards=things.filter((p):p is MaterialPile=>p!==undefined),otherGoods=g.items.filter(p=>!REWARDS.includes(p.id)&&p.kind!=='food'),packs=g.packed?.slice()??[],home=registeredMap(root,0)!;if(!home.pawns.some(p=>p.id===9))fail('00-home-refused','Actual resident9/home0 required, without a substitute colony');
  const run=runtime415(root),command=(c:Command)=>{const result=applyCommand(root,c,run);if(!result.ok)fail('actual-command-refused',result.reason??'Actual command refused',{command:c});};
  const record=()=>root.worldGroups!.groups.find(r=>r.state.id===groupId),savedRoute=structuredClone({route:g.route,destination:g.destination,arrival:owner.arrival261}),closed=structuredClone(site.closed);
  checkpoint('01-real-reformed-caravan-before-time',{groupId,originMapId,savedRoute});
  const meals=home.piles.filter(p=>p.owner.type==='ground'&&p.item==='survival-meal'&&!materialAllowedForPlayer256(p)),permissions=meals.map(p=>({pileId:p.id,quantity:p.quantity,owner:structuredClone(p.owner)}));
  if(meals.length){const selected=root.worldMaps!.selectedMapId;if(selected!==0)command({type:'map-view',mapId:0});for(const p of meals)command({type:'material-forbid',pileId:p.id,forbidden:false});if(selected!==0)command({type:'map-view',mapId:selected});expect(root.tick).toBe(startTick);for(const [i,p]of meals.entries()){expect(materialAllowedForPlayer256(p)).toBe(true);expect(p.quantity).toBe(permissions[i]!.quantity);expect(p.owner).toEqual(permissions[i]!.owner);}checkpoint('01a-existing-home-meals-allowed-without-time',{permissions});}
  expect({route:g.route,destination:g.destination,arrival:owner.arrival261}).toEqual(savedRoute);
  const actualChance=incidentChance.caravanIncidentOccurs261,chance=vi.spyOn(incidentChance,'caravanIncidentOccurs261').mockImplementation((...args:Parameters<typeof actualChance>)=>{actualChance(...args);return false;});
  const drops:{sourceIds:number[];item:MaterialPile['item'];quantity:number;tick:number;targets:{id:number;added:number;cell:Cell}[]}[]=[];
  try{
   const travelLimit=bound('WORLD_SITES263_REFORM_RETURN_TRAVEL_TICKS',30000,100000);
   for(let n=0;n<travelLimit&&record()?.localMapId!==0;n++){const r=record();if(!r||r.pending261||r.pendingEntry263)fail('02-route-refused','Real owner missing or unrelated pending; do not fabricate a decision',{groupId});stepWorld(root,1,undefined,run);if((n+1)%5000===0)checkpoint('02-latest-actual-route-progress',{groupId,steps:n+1,savedRoute});}
   if(record()?.localMapId!==0)fail('03-home-entry-refused','Saved route and its true enter-home action did not finish within the declared bound',{groupId});
   const returned=registeredMap(root,0)!;for(const p of players)expect(returned.pawns).toContain(p);for(const p of rewards)expect(returned.piles).toContain(p);expect(returned.pawns.some(p=>p.id===9)).toBe(true);checkpoint('03-real-home0-before-unload',{groupId});
   const unloadLimit=bound('WORLD_SITES263_REFORM_RETURN_UNLOAD_TICKS',2000,10000);
   for(let n=0;n<unloadLimit&&record();n++){
    const pending=rewards.filter(p=>returned.piles.includes(p)&&p.owner.type==='inventory').map(p=>({pile:p,quantity:p.quantity,carrierId:p.owner.type==='inventory'?p.owner.pawnId:undefined,ground:new Map(returned.piles.filter(q=>q.item===p.item&&q.owner.type==='ground').map(q=>[q.id,q.quantity]))}));stepWorld(root,1,undefined,run);
    const done=pending.filter(old=>old.pile.owner.type==='ground'||!returned.piles.includes(old.pile));
    for(const item of new Set(done.map(old=>old.pile.item))){const batch=done.filter(old=>old.pile.item===item),ground=batch[0]!.ground,quantity=batch.reduce((n,old)=>n+old.quantity,0),targets=returned.piles.filter(p=>p.item===item&&p.owner.type==='ground'&&p.quantity>(ground.get(p.id)??0)).map(p=>({id:p.id,added:p.quantity-(ground.get(p.id)??0),cell:{x:p.owner.type==='ground'?p.owner.x:-1,z:p.owner.type==='ground'?p.owner.z:-1}}));expect(targets.reduce((n,p)=>n+p.added,0)).toBe(quantity);for(const target of targets)expect(batch.some(row=>{const carrier=players.find(p=>p.id===row.carrierId);return !!carrier&&contact(position(carrier,root.tick),target.cell)&&(carrier.motion?.end??0)<=root.tick;})).toBe(true);drops.push({sourceIds:batch.map(old=>old.pile.id),item,quantity,tick:root.tick,targets});}
   }
   if(record())fail('04-unload-refused','Ordinary home unloading remains unfinished; no forced drop/stockpile/filter',{groupId,drops});
   expect(drops.flatMap(d=>d.sourceIds).sort((a,b)=>a-b)).toEqual(REWARDS);for(const p of otherGoods)expect(returned.piles).toContain(p);for(const p of packs)expect(returned.packed).toContain(p);for(const id of [7,8])expect(root.worldPawns!.owners.some(r=>r.actor.id===id)).toBe(false);
   expect(root.worldMaps!.sites.filter(s=>s.kind==='settlement')).toHaveLength(1);expect(root.worldMaps!.sites.some(s=>s.id===originMapId)).toBe(false);expect(site.closed).toEqual(closed);expect(root.tick).toBeGreaterThan(startTick);
   const final=checkpoint('04-eight-rewards-returned-and-physically-unloaded',{groupId,originMapId,drops,permissions,declaredBounds:{travelLimit,unloadLimit}});return {...final,groupId,originMapId,drops,permissions,startTick};
  }catch(error){try{checkpoint('99-last-actual-state-on-failure',{error:String(error),groupId,drops});}catch(cause){writeTestFileSync('artifacts/world-sites263-reformed-return/failure.json',JSON.stringify({error:String(error),captureError:String(cause)}));}throw error;}finally{chance.mockRestore();}
 };
 const final=playReturn();
 {const root=restored(final.raw);expect(serializeCampaign(root)).toBe(final.raw);expect(root.tick).toBe(final.tick);const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();for(const kind of ['checkpoint','delta']as const){const packet=structuredClone(encoder.encode(root,0,0));expect(packet.kind).toBe(kind);const adopted=decoder.adopt(packet);expect(adopted.status).toBe('applied');if(adopted.status!=='applied')throw Error('Actual final transport adoption required');expect(adopted.world).toEqual(registeredMapPresentation(root));expect(serializeCampaign(root)).toBe(final.raw);}}
 expect(sha(readFileSync(input,'utf8'))).toBe(inputSHA);writeTestFileSync('artifacts/world-sites263-reformed-return/proof.json',JSON.stringify({complete:true,notice:NOTICE,input,inputSHA256:inputSHA,finalSHA256:final.sha256,tick:final.tick,groupId:final.groupId,originMapId:final.originMapId,drops:final.drops,permissions:final.permissions,exactFinalReload:true},null,2));
},1_800_000);
