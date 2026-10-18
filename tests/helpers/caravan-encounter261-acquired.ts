import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {expect,vi} from 'vitest';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../../src/sim/serialization.ts';
import {registeredMap} from '../../src/sim/world-map-context.ts';
import {GroupCampaignRuntime256} from '../../src/sim/group-campaign-runtime-256.ts';
import {GroupCaravanPhysical256} from '../../src/sim/group-caravan-physical-256.ts';
import {createGroupCampaignGeometry256} from '../../src/sim/group-campaign-geometry-256.ts';
import {preparePlanetNavigation256} from '../../src/sim/planet-route-256.ts';
import {planetGeography256} from '../../src/sim/planet-geography-256.ts';
import {findPlanetRoute,planetCostContext,planetQueryBudget} from '../../src/sim/planet-navigation.ts';
import {captureGroupMass} from '../../src/sim/group-capture.ts';
import {previewGroupReform260} from '../../src/sim/group-reform-260.ts';
import {caravanMapAllowed261} from '../../src/sim/caravan-incidents-261.ts';
import * as calculation from '../../src/sim/caravan-incident-calculation-261.ts';
import * as demand from '../../src/sim/caravan-demand-capture-261.ts';
import * as health from '../../src/sim/health.ts';
import {applyCommand,stepWorld} from '../../src/sim/engine.ts';
import {writeTestFileSync,testOutputPath} from '../test-output.ts';
import type {World,MaterialPile} from '../../src/sim/types.ts';
import type {CampaignState} from '../../src/sim/world-map-state.ts';
import type {EncounterGroup261,CaravanIncident261} from '../../src/sim/caravan-encounter-state-261.ts';

export const INPUT261_SHA='70dea3811dab70e7225cced4c715c8438b1d7aecec6aa173ac72eaa52115e699';
export const sha261=(s:string)=>createHash('sha256').update(s).digest('hex');
export const sources261=[{pileId:36326,quantity:10},{pileId:2308,quantity:10},{pileId:36331,quantity:9},{pileId:36332,quantity:7}];
export const NOTICE261='Prepared branches, not natural incidents: immutable acquired Camp736260, strict product migration changes only schema number; real Reform of7/8 and existing four finite stacks; actual adjacent free terrestrial route and ordinary ticks. Chance/opportunity alone is explicitly stubbed false during preparation, then true only for the named incident at the next real1000Core boundary. Demand selection uses a declared bounded value tape while EVERY actual healthRandom call still advances its real owner. Faction, roster, goods, pending, story, IDs, owners, WorldPawns and command/bridge authorities are actual product paths. No seed search, injected pending, battlefield/victory or fabricated resources. Current NPC producer is provisional. No natural MTBR or campaign chronology proven.';
export function admitted261(root:CampaignState):asserts root is World {
 if(Number(root.schemaVersion)!==261||!('pawns'in root)||root.planet?.revision!==3||!root.worldMaps||!root.worldGroups||!root.worldPawns||!root.worldFactions)throw Error('Actual261 geographic campaign authorities required');
 expect(validateWorld(root)).toEqual([]);
}
export function checkpoint261(root:CampaignState,label:string,extra:object={}) {
 const path=testOutputPath(`artifacts/caravan261/${label}-RAW.json`) as string;
 // Preserve a genuine refusal before the strict admission, never repair it.
 writeTestFileSync(path,JSON.stringify(root));admitted261(root);
 const raw=serializeCampaign(root);writeTestFileSync(path,raw);
 writeTestFileSync(path.replace(/-RAW\.json$/,'-receipt.json'),JSON.stringify({path,sha256:sha261(raw),inputSHA256:INPUT261_SHA,tick:root.tick,rng:root.rng,nextId:root.nextId,notice:NOTICE261,...extra},null,2));
 return raw;
}
export function away261(record:EncounterGroup261){const g=record.state;if(!('members'in g))throw Error('True away owners required');return g;}
export function totals261(items:readonly MaterialPile[]){const result:Record<string,number>={};for(const p of items)result[p.item]=(result[p.item]??0)+p.quantity;return result;}
export function runtime261(root:World){if(root.planet?.revision!==3)throw Error('Actual planet absent');preparePlanetNavigation256(root.planet);const runtime=new GroupCampaignRuntime256(createGroupCampaignGeometry256(root),new GroupCaravanPhysical256());runtime.bootstrap(root);return runtime;}

let prepared:undefined|{raw:string;input:string;boundary:number;target:{tile:number;estimatedCore:number;route:number[]};groupId:number};
/** Once per test file: a RAW string is cached, never a second live World. */
function prepared261(){
 if(prepared)return prepared;
 const input=process.env.CARAVAN261_INPUT;if(!input)throw Error('ROOT must supply exact acquired Camp736 in CARAVAN261_INPUT; no fallback or skip');
 const source=readFileSync(input,'utf8');expect(sha261(source)).toBe(INPUT261_SHA);expect(source.startsWith('{"schemaVersion":260,')).toBe(true);
 const root=deserializeCampaign(source);admitted261(root);expect(serializeCampaign(root)).toBe(source.replace(/^\{"schemaVersion":260,/,'{"schemaVersion":261,'));
 expect(root.tick).toBe(736);expect(root.worldGroups!.groups).toEqual([]);const camp=registeredMap(root,1);if(!camp)throw Error('Actual acquired Camp1 absent');expect(camp.pawns.map(p=>p.id)).toEqual([7,8]);
 const people=camp.pawns.slice(),piles=sources261.map(l=>{const p=camp.piles.find(p=>p.id===l.pileId);if(!p||p.quantity!==l.quantity||p.owner.type!=='inventory')throw Error('Actual finite acquired inventory differs');return p;}),runtime=runtime261(root),planet=root.planet!;if(planet.revision!==3)throw Error('Actual geographic planet absent');
 const gate=vi.spyOn(calculation,'caravanIncidentOccurs261').mockReturnValue(false);
 try{
 const origin=39970,geography=planetGeography256(planet),mass=captureGroupMass(people,piles,true,261);
 if(!mass)throw Error('Actual selected source mass absent');
 const context=planetCostContext(root,mass),candidates=geography.surface.tiles[origin]!.neighbours.filter(tile=>caravanMapAllowed261(root,tile)).flatMap(tile=>{const r=findPlanetRoute(planet,origin,tile,context,planetQueryBudget(planet));return r.kind==='found'&&r.tiles.length===2?[{tile,estimatedCore:r.estimatedCore,route:r.tiles}]:[];}).sort((a,b)=>a.estimatedCore-b.estimatedCore||a.tile-b.tile);
 const target=candidates[0];if(!target)throw Error('No actual adjacent free supported terrestrial route; no fallback world');
 const draft={originMapId:1,memberIds:[7,8],sources:sources261.map(p=>({...p})),destination:target.tile},preview=previewGroupReform260(camp,draft);if(!preview.ok)throw Error('Actual acquired Reform prerequisite: '+preview.reason);expect(preview.route).toEqual(target.route);
 const groupId=planet.nextGroupId,result=applyCommand(root,{type:'group-reform',...draft,quote:preview.quote},runtime);expect(result.ok,result.reason).toBe(true);
 const record=root.worldGroups!.groups.find(r=>r.state.id===groupId) as EncounterGroup261|undefined;if(!record)throw Error('True Reform record absent');expect(record.encounters261).toEqual({revision:1});
 expect(root.tick).toBe(736);for(const p of people)expect(away261(record).members).toContain(p);for(const p of piles)expect(away261(record).items).toContain(p);
 const start=root.tick;for(let n=0;n<5500&&away261(record).phase!=='at-site';n++)stepWorld(root,1,undefined,runtime);
 checkpoint261(root,'01-real-arrival-or-refusal',{target,candidates,preparationTicks:root.tick-start});
 if(away261(record).phase!=='at-site'||away261(record).tile!==target.tile)throw Error('Actual one-edge arrival absent within5500 real ticks; no repair/retry');
 expect(record.pending261).toBeUndefined();expect(record.story261).toBeUndefined();expect(caravanMapAllowed261(root,target.tile)).toBe(true);
 // The next ordinary frontier is selected once, never repeatedly attempted.
 const boundary=(Math.floor(root.tick/100)+1)*100;while(root.tick<boundary-1)stepWorld(root,1,undefined,runtime);
 const raw=checkpoint261(root,'02-prepared-before-real-producer',{boundary,target});
 expect(sha261(readFileSync(input,'utf8'))).toBe(INPUT261_SHA);
 return prepared={raw,input,boundary,target,groupId};
 }finally{gate.mockRestore();}
}
/** Actual producer against the one saved prepared baseline; no pending injected. */
export function preparedEncounterSource261(){return {...prepared261()};}
export function pendingFixture261(kind:Extract<CaravanIncident261,'meeting'|'demand'|'ambush'>,branch:'objects'|'human'='objects'){
 const {raw,input,boundary,target,groupId}=prepared261(),root=deserializeCampaign(raw);admitted261(root);const runtime=runtime261(root);
 const record=root.worldGroups!.groups.find(r=>r.state.id===groupId) as EncounterGroup261|undefined;if(!record)throw Error('Actual prepared Caravan absent');
 const people=away261(record).members.slice(),piles=away261(record).items.slice(),rngBefore=root.rng;
 const gate=vi.spyOn(calculation,'caravanIncidentOccurs261').mockImplementation((_biome,incident)=>incident===kind);
 const beforeIds=new Set([...away261(record).members,...away261(record).items,...root.worldPawns!.owners.map(r=>r.actor)].map(p=>p.id));
 const tape=branch==='human'?[0,0]:[.9,0,0,0],tapeWitness:{before:number;after:number;drawsUsed:number;provided:number[];actualCalls:number}[]=[];
 const actualSelect=demand.selectCurrentDemand261,actualRandom=health.healthRandom;
 const selector=vi.spyOn(demand,'selectCurrentDemand261').mockImplementation((capture,random)=>{
  let cursor=0;const rngBefore=random.rng;
  const randomSpy=vi.spyOn(health,'healthRandom').mockImplementation(state=>{const actual=actualRandom(state),i=cursor++;return tape[i]??actual;});
  try{const selected=actualSelect(capture,random);tapeWitness.push({before:rngBefore,after:random.rng,drawsUsed:selected.drawsUsed,provided:tape.slice(),actualCalls:cursor});return selected;}finally{randomSpy.mockRestore();}
 });
 try{stepWorld(root,12,undefined,runtime);}finally{selector.mockRestore();gate.mockRestore();}
 const pending=record.pending261;
 checkpoint261(root,`${kind}-${branch}-03-real-pending-before-decision`,{boundary,target,branch,tapeWitness});
 if(!pending||pending.kind!==kind)throw Error(`True ${kind} producer did not produce its admissible pending at the one chosen frontier; no retry`);
 expect(root.tick).toBe(boundary);expect(pending.atCore).toBe(boundary*10);expect(pending.people.length).toBeGreaterThan(0);expect(root.rng).not.toBe(rngBefore);
 for(const p of people)expect(away261(record).members).toContain(p);
 for(const p of [...pending.people,...pending.items])expect(beforeIds.has(p.id)).toBe(false);
 if(kind==='demand'){expect(tapeWitness).toHaveLength(1);expect(tapeWitness[0]!.actualCalls).toBeGreaterThanOrEqual(tapeWitness[0]!.drawsUsed);expect(tapeWitness[0]!.after).not.toBe(tapeWitness[0]!.before);}
 expect(sha261(readFileSync(input,'utf8'))).toBe(INPUT261_SHA);
 return {root,runtime,record,pending,input,people,piles,boundary,target,tapeWitness};
}
