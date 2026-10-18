import {test,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {registeredMap} from '../src/sim/world-map-context';
import {previewGroupLoading} from '../src/sim/group-loading';
import {groupMemberChoices,groupSourceChoices,groupFormationAuthority} from '../src/sim/group-authority';
import {findPlanetRoute,planetCostContext,planetQueryBudget} from '../src/sim/planet-navigation';
import {worldTargetAccess263} from '../src/sim/world-target-access-263';
import {prepareWorldTargetEntry263} from '../src/sim/world-target-entry-263';
import * as incidentChance from '../src/sim/caravan-incident-calculation-261';
import {runtime415,drain415} from './helpers/reform-v260-fixture';
import {writeTestFileSync,testOutputPath} from './test-output';
import type {World,Command} from '../src/sim/types';
import type {CampaignState} from '../src/sim/world-map-state';
import type {WorldEntryTarget263} from '../src/sim/world-sites-state-263';

const INPUT_SHA='b6ce782e1640d9786f0ba1ecdef9aa8be8cda0b5f270afe9ecaa0a13d379e71f';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const NOTICE='Continuation of acquired landing29/root263 SHAb6ce782e, originally Birth02: its FIRST Site1/tile116286 ticket none and eight same Things61462..61469. No tick0/producer/capsule replay, reseed or reroll; repeated Allow choices at paused29 only after the QA mass refusal, before any formation; no natural-MTB claim. Threat/contents/tile/timeout stay literal. Actual capsules, same original7/8, resident9, finite starting survival meals, ordinary Allow/formation/contact/departure and actual route. During preparation only, unrelated caravan chance results are suppressed AFTER calling their real arithmetic/PRNG so their draws remain real. No Site/pending/actor/route or owner is inserted. No victory, damage, healing, equipment grant or map repair. This QA supplies true pending inputs for ROOT native; it does not assert a completed visit/collection/retreat.';
function require263(root:CampaignState):asserts root is World {if(Number(root.schemaVersion)!==263||!('pawns'in root)||root.width!==325||root.height!==325||root.planet?.revision!==3||!root.worldMaps||!root.worldGroups||!root.worldFactions||!root.worldPawns)throw Error('Exact acquired native325 campaign required');}
function checkpoint(root:World,label:string,extra:object={}){
 const p=testOutputPath(`artifacts/world-sites263-travel/${label}-RAW.json`) as string;
 // A refusal is persisted BEFORE admission, never overwritten by a repair.
 writeTestFileSync(p,JSON.stringify(root));expect(validateWorld(root)).toEqual([]);const raw=serializeCampaign(root);writeTestFileSync(p,raw);
 writeTestFileSync(p.replace(/-RAW\.json$/,'-receipt.json'),JSON.stringify({revision:1,schemaVersion:263,path:p,sha256:sha(raw),inputSHA256:INPUT_SHA,tick:root.tick,notice:NOTICE,...extra},null,2));return {raw,path:p,sha256:sha(raw)};
}
let prepared:undefined|{raw:string;input:string;siteId:number;foodIds:number[]};
function source(){
 if(prepared)return prepared;
 const input=process.env.WORLD_SITES263_INPUT;if(!input||process.env.WORLD_SITES263_INPUT_SHA256!==INPUT_SHA)throw Error('Exact acquired landing29 path/SHA required; no factory/fallback');
 const bytes=readFileSync(input,'utf8');expect(sha(bytes)).toBe(INPUT_SHA);const root=deserializeCampaign(bytes);require263(root);
 expect(root.tick).toBe(29);expect(root.startingArrival?.phase).toBe('opened');expect(root.pawns.map(p=>p.id)).toEqual([7,8,9]);expect(serializeCampaign(root)).toBe(bytes);
 const entries=root.worldSites263?.entries;if(!entries||entries.length!==1)throw Error('Exact acquired first Site registry required');const site=entries[0]!;
 if(site.kind!=='item-stash'||site.id!==1||site.tile!==116286||site.mapId!==null||site.closed||site.threat.kind!=='none')throw Error('Actual Birth02 Site1/none differs; no substitute ticket');
 expect(site.items.map(p=>p.id)).toEqual([61462,61463,61464,61465,61466,61467,61468,61469]);const siteId=site.id;
 const foodIds=[4309,61472,61473,61474,61475],foods=foodIds.map(id=>root.piles.find(p=>p.id===id));
 if(foods.some(p=>!p||p.item!=='survival-meal'||p.owner.type!=='ground')||foods.reduce((n,p)=>n+p!.quantity,0)!==50)throw Error('Same actual fifty capsule meals required');
 return prepared={raw:bytes,input,siteId,foodIds};
}
const opt=test.skipIf(process.env.WORLD_SITES263_TRAVEL_SIM!=='1');
for(const branch of ['visit-site','attack-settlement']as const)opt(`acquired landing29: physical formation/contact/route to genuine ${branch} pending`,()=>{
 const base=source(),root=deserializeCampaign(base.raw);require263(root);const run=runtime415(root),homeId=root.worldMaps!.rootMapId!,home=registeredMap(root,homeId)!;
 const command=(c:Command)=>{const result=applyCommand(root,c,run);if(!result.ok){checkpoint(root,`${branch}-command-refused`,{command:c,reason:result.reason});throw Error(result.reason??'Actual command refused');}};
 const members=[7,8].map(id=>home.pawns.find(p=>p.id===id)!);if(members.some(p=>!p)||!home.pawns.some(p=>p.id===9))throw Error('Same actual starters7/8 plus resident9 required');
 for(const p of members){const choice=groupMemberChoices(home).find(c=>c.pawn===p);if(!choice?.ok){checkpoint(root,`${branch}-member-refused`,{pawnId:p.id,reason:choice?.reason});throw Error(choice?.reason??'Original member inadmissible');}}
 let remaining=30;const sources:{pileId:number;quantity:number}[]=[];for(const id of base.foodIds){if(!remaining)break;const food=home.piles.find(p=>p.id===id);if(!food)throw Error('Actual capsule meal stack missing');command({type:'material-forbid',pileId:id,forbidden:false});const choice=groupSourceChoices(home).find(c=>c.pile===food);if(!choice||choice.reason||choice.available<1)throw Error('Actual allowed finite food unavailable');const quantity=Math.min(remaining,choice.available);sources.push({pileId:id,quantity});remaining-=quantity;}if(remaining)throw Error('Actual30 finite meals unavailable');
 const loading=previewGroupLoading(home,members.map(p=>p.id),sources,groupFormationAuthority(home));if(loading.kind!=='ready'){checkpoint(root,`${branch}-loading-refused`,{reason:loading.kind==='refused'?loading.reason:'deferred'});throw Error('Actual loading preview refused');}const mass=loading.mass;if(root.planet?.revision!==3)throw Error('Actual departure planet absent');
 const planet=root.planet,from=planet.homeTile,context=planetCostContext(root,mass);
 const site=root.worldSites263!.entries.find(s=>s.id===base.siteId);if(!site||site.kind!=='item-stash')throw Error('The ONE real Site is absent');
 // A player chooses an actual accessible foreign settlement at the least real
 // route cost. No map generation, enemy roster or biome is tried/filtered.
 const choices=branch==='visit-site'?[{tile:site.tile,target:{kind:'visit-site',siteId:site.id}as WorldEntryTarget263}]:root.worldFactions!.settlements.map(s=>({tile:s.tile,target:{kind:'attack-settlement',settlementId:s.id,factionId:s.factionId,confirmed:true}as WorldEntryTarget263}));
 const routes=choices.filter(c=>worldTargetAccess263(root,c.target,c.tile).ok).flatMap(c=>{const route=findPlanetRoute(planet,from,c.tile,context,planetQueryBudget(planet));return route.kind==='found'?[{...c,route:route.tiles,estimatedCore:route.estimatedCore}]:[];}).sort((a,b)=>a.estimatedCore-b.estimatedCore||a.tile-b.tile);
 const choice=routes[0];if(!choice){checkpoint(root,`${branch}-route-refused`,{siteId:site.id});throw Error('No actual route; preserve this branch, no reroll or alternate world');}
 checkpoint(root,`${branch}-04-before-formation`,{choice,candidates:routes.length});const id=planet.nextGroupId;
 const actualChance=incidentChance.caravanIncidentOccurs261,chance=vi.spyOn(incidentChance,'caravanIncidentOccurs261').mockImplementation((...args:Parameters<typeof actualChance>)=>{actualChance(...args);return false;});
 try{
 command({type:'group-start',originMapId:homeId,memberIds:members.map(p=>p.id),sources,destination:choice.tile});
 const state=()=>root.worldGroups!.groups.find(r=>r.state.id===id)?.state;
 for(let n=0;n<2000;n++){const preparing=state();if(!preparing||'members'in preparing)break;stepWorld(root,1,undefined,run);}
 checkpoint(root,`${branch}-05-departure-or-refusal`,{groupId:id,choice});const departed=state();if(!departed||!('members'in departed))throw Error('Real formation/contact/departure refused within2000ticks');
 for(const p of members){expect(departed.members).toContain(p);expect(home.pawns).not.toContain(p);}expect(departed.ledger.foodLoaded).toBe(30);expect(departed.items.some(p=>p.item==='survival-meal'&&p.owner.type==='inventory')).toBe(true);
 command({type:'caravan-order',groupId:id,destination:choice.tile,action:choice.target});
 const bound=Number(process.env.WORLD_SITES263_MAX_TRAVEL_TICKS??'10000');if(!Number.isSafeInteger(bound)||bound<1||bound>100000)throw Error('Explicit bounded travel limit1..100000 required');
 for(let n=0;n<bound&&!root.worldGroups!.groups.find(r=>r.state.id===id)?.pendingEntry263;n++){
  const record=root.worldGroups!.groups.find(r=>r.state.id===id);if(!record||record.pending261){checkpoint(root,`${branch}-unrelated-refusal`,{groupId:id});throw Error('Actual caravan missing or unrelated pending; no fake resolution');}
  stepWorld(root,1,undefined,run);if((n+1)%2000===0)checkpoint(root,`${branch}-route-${n+1}`,{groupId:id,choice});
 }
 const result=checkpoint(root,`${branch}-06-pending-or-refusal`,{groupId:id,choice});const record=root.worldGroups!.groups.find(r=>r.state.id===id),g=record?.state;
 if(!record?.pendingEntry263||!g||!('members'in g))throw Error('True pending did not arrive within the one declared route bound; resume checkpoint, no restart/reroll');
 expect(record.pendingEntry263.target).toEqual(choice.target);expect(g.tile).toBe(choice.tile);expect(g.segment).toBeNull();expect(g.lastPersonalTick).toBe(root.tick);for(const p of members)expect(g.members).toContain(p);
 expect(serializeCampaign(deserializeCampaign(result.raw))).toBe(result.raw);
 writeTestFileSync(`artifacts/world-sites263-travel/${branch}-native-input.json`,JSON.stringify({revision:1,schemaVersion:263,status:'real-pending-route-acquired',...result,inputSHA256:INPUT_SHA,groupId:id,target:choice.target,tile:choice.tile,tick:root.tick,notice:NOTICE},(_k,v)=>_k==='raw'?undefined:v,2));
 // Optional SAME pending continuation for ROOT's grouped SIM qualification.
 // The native checkpoint above always precedes generation, without a fake map.
 if(process.env.WORLD_SITES263_ENTER_SIM==='1'){
  const held=site.items.slice(),players=g.members.slice(),goods=g.items.slice(),entry=drain415(prepareWorldTargetEntry263(root,id));if(entry.status!=='ready'){checkpoint(root,`${branch}-entry-refused`,{reason:entry.reason,phase:entry.phase});throw Error(entry.reason);}const admitted=entry.commit();if(!admitted.ok){checkpoint(root,`${branch}-entry-commit-refused`,{reason:admitted.reason});throw Error(admitted.reason);}
  const mapId=root.worldMaps!.selectedMapId!,map=registeredMap(root,mapId)!,header=root.worldMaps!.sites.find(s=>s.id===mapId)!;expect(header.kind).toBe(branch==='visit-site'?'quest-site':'foreign-settlement');for(const p of players)expect(map.pawns).toContain(p);for(const p of goods)expect(map.piles).toContain(p);
  if(branch==='visit-site'){expect(site.items).toEqual([]);expect(site.mapId).toBe(mapId);expect(site.expiresAtCore).toBeNull();for(const p of held){expect(map.piles).toContain(p);expect(p.owner.type).toBe('ground');}}
  const entered=checkpoint(root,`${branch}-07-real-entered`,{mapId,threat:branch==='visit-site'?site.threat:undefined});expect(serializeCampaign(deserializeCampaign(entered.raw))).toBe(entered.raw);
 }
 expect(sha(readFileSync(base.input,'utf8'))).toBe(INPUT_SHA);
 }finally{chance.mockRestore();}
},600_000);
