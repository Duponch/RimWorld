import {cancelShooting} from './shooting-state.ts';
import {cancelMelee} from './melee-state.ts';
import {cancelMechanoidRanged} from './mechanoid-ranged-state.ts';
import {cancelHunting} from './hunting-state.ts';
import {isSchema277OrLater} from './schema-compatibility-257.ts';
import {captureShipCasketHumans277,captureShipCasketAnimals277,captureShipCasketMechanoids277,shipCasketActor277,type ShipCasketOccupant277} from './ship-casket-state-277.ts';
import {registeredCampaign,registeredMapId} from './world-map-context.ts';
import {terminalWorldPawn256,type WorldPawnOwner256} from './world-pawn-state-256.ts';
import type {World,Pawn} from './types.ts';

/** Local-owner adaptation, produced only by real terminal holder loss. This is
 * not a native field or an invented clinical death/departure receipt. */
export interface ShipCasketTerminal277 {revision:1;mapId:number;atCore:number;kind:ShipCasketOccupant277['kind'];visitorGroup?:number;raidGroup?:number;podIncident?:number}
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const data=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.getOwnPropertyDescriptor(v,k)?.enumerable===true&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
export function validShipCasketTerminal277(row:WorldPawnOwner256|Record<string,unknown>,version:number,atCore:number,nextId=Number.MAX_SAFE_INTEGER):boolean {
 const d=Object.getOwnPropertyDescriptor(row,'shipCasketTerminal277');if(!d)return !('shipCasketTerminal277'in row);
 if(!isSchema277OrLater(version)||!d.enumerable||!Object.hasOwn(d,'value')||!data(d.value))return false;
 const r=d.value;
 return ['revision','mapId','atCore','kind'].every(k=>Object.hasOwn(r,k))&&Reflect.ownKeys(r).every(k=>typeof k==='string'&&['revision','mapId','atCore','kind','visitorGroup','raidGroup','podIncident'].includes(k))
  &&r.revision===1&&int(r.mapId)&&r.mapId===row.originMapId&&int(r.atCore,0,atCore)&&r.atCore===row.clockCore&&r.atCore%10===0&&r.kind===row.kind&&row.mode==='dead'
  &&(row.destroyed===true||data(row.actor)&&data(row.actor.health)&&data(row.actor.health.death))
  &&['visitorGroup','raidGroup','podIncident'].every(k=>!Object.hasOwn(r,k)||int(r[k],1,k==='podIncident'?32:nextId-1))
  &&(r.kind==='human'?!('visitorGroup'in r&&'raidGroup'in r)&&!('podIncident'in r&&('visitorGroup'in r||'raidGroup'in r)):!('visitorGroup'in r)&&!('podIncident'in r)&&(r.kind==='mechanical'||!('raidGroup'in r)));
}
export const shipCasketMechanicalReferences277=(w:Pick<World,'schemaVersion'|'tick'|'structures'>)=>captureShipCasketMechanoids277(w).map(r=>r.mech);
/** Same original references; they are never active map actors. */
export const shipCasketHumanReferences277=(w:Pick<World,'schemaVersion'|'tick'>&Partial<Pick<World,'structures'>>):Pawn[]=>w.structures?captureShipCasketHumans277(w as Pick<World,'schemaVersion'|'tick'|'structures'>).map(r=>r.pawn):[];
export const shipCasketAnimalReferences277=(w:Pick<World,'schemaVersion'|'tick'|'structures'>)=>captureShipCasketAnimals277(w).map(r=>r.animal);
export function shipCasketTerminalParticipant277(w:World,id:number,kind:ShipCasketOccupant277['kind'],group?:number,source:'raid'|'visitor'|'pod'='raid'):WorldPawnOwner256|undefined {
 const mapId=registeredMapId(w);if(!isSchema277OrLater(w.schemaVersion)||mapId===undefined)return;
 return registeredCampaign(w).worldPawns?.owners.find(r=>r.actor.id===id&&r.kind===kind&&terminalWorldPawn256(r)&&validShipCasketTerminal277(r,w.schemaVersion,w.tick*10,w.nextId)&&r.shipCasketTerminal277?.mapId===mapId
  &&(group===undefined||r.shipCasketTerminal277[source==='raid'?'raidGroup':source==='visitor'?'visitorGroup':'podIncident']===group));
}
export interface ShipCasketNotificationPlan277 {current():boolean;commit():boolean}
/** DeSpawn preserves cohort/status references. Physical arrays and job cleanup
 * remain the transfer service's single commit. No Lord is rebuilt or lost. */
export function prepareShipCasketDespawn277(w:World,o:ShipCasketOccupant277):ShipCasketNotificationPlan277 {
 const a=shipCasketActor277({revision:1,heldAt:w.tick,occupant:o,items:[],packed:[]})!,tick=w.tick;
 const p=o.kind==='human'?o.pawn:undefined,visitor=p?.visitor,raid=p?.raid,pod=p?.podRescue;
 const group=visitor?w.visitors?.groups.find(g=>g.id===visitor.group&&g.members.includes(a.id)):undefined;
 const incident=pod?w.podRescues?.incidents.find(i=>i.id===pod.incidentId&&i.pawnId===a.id):undefined;
 if(!isSchema277OrLater(w.schemaVersion)||visitor&&!group||pod&&!incident)throw Error('Spatial casket lacks its actual local incident/cohort reference');
 let done=false;
 const current=()=>!done&&w.tick===tick&&(!p||p.visitor===visitor&&p.raid===raid&&p.podRescue===pod)&&(!group||w.visitors?.groups.includes(group)===true)&&(!incident||w.podRescues?.incidents.includes(incident)===true);
 return {current,commit(){if(!current())return false;done=true;if(visitor)visitor.goal=null;if(raid)raid.goal=null;
  for(const q of w.pawns){let stopped=false;if(q.shooting?.order?.targetId===a.id){cancelShooting(q);stopped=true;}if(q.melee?.order?.targetId===a.id&&!q.melee.order.structure){cancelMelee(q);stopped=true;}if(q.tactics?.targetId===a.id){delete q.tactics;stopped=true;}if(o.kind==='animal'&&q.hunting?.animalId===a.id){cancelHunting(q);stopped=true;}if(stopped){q.path=[];q.planCooldown=0;}}
  const key=(o.kind==='human'?'pawn':o.kind==='animal'?'animal':'mech')+':'+a.id;for(const m of w.mechanoids??[]){let stopped=false;if(m.melee?.order?.targetId===a.id&&!m.melee.order.structure){cancelMelee(m);stopped=true;}if(m.ranged?.order?.targetKey===key){cancelMechanoidRanged(m);stopped=true;}if(stopped){m.path=[];m.planCooldown=0;if(m.raid)m.raid.goal=null;if(m.temple)m.temple.goal=null;if(m.site263)m.site263.goal=null;}}
  for(const animal of w.wildlife?.animals??[]){if(animal.predation?.targetId===a.id)delete animal.predation;if(animal.threat?.targetId===a.id)delete animal.threat;if(animal.retaliation?.targetId===a.id)delete animal.retaliation;if(animal.manhunter?.targetId===a.id)delete animal.manhunter.targetId;}
  return true;}};
}
/** A cohort may have changed phase while its real member was suspended. Only
 * its current mandate is adopted; biological clocks are handled separately. */
export function prepareShipCasketSpawn277(w:World,o:ShipCasketOccupant277):ShipCasketNotificationPlan277 {
 const tick=w.tick,p=o.kind==='human'?o.pawn:undefined,visitor=p?.visitor,raid=p?.raid;
 const group=visitor?w.visitors?.groups.find(g=>g.id===visitor.group&&g.members.includes(p!.id)):undefined;
 const raidGroup=raid?[...w.raids?.active?[w.raids.active]:[],...w.raids?.extraActive261??[]].find(g=>g.id===raid.group&&g.members.includes(p!.id)):undefined;
 if(!isSchema277OrLater(w.schemaVersion)||visitor&&!group)throw Error('Spatial casket lost its actual visitor cohort');
 let done=false;const current=()=>!done&&w.tick===tick&&(!p||p.visitor===visitor&&p.raid===raid)&&(!group||w.visitors?.groups.includes(group)===true);
 return {current,commit(){if(!current())return false;done=true;if(visitor&&group){visitor.phase=group.phase;visitor.goal=null;}if(raid){raid.goal=null;raid.exiting=!raidGroup||raidGroup.phase==='withdraw'||!!p?.prisoner;}return true;}};
}
/** Preflight BEFORE draft cleanup. Caller attaches receipt to the one terminal
 * WorldPawn row and commits this plan only after that real transfer succeeds. */
export function prepareShipCasketTerminal277(w:World,o:ShipCasketOccupant277):ShipCasketNotificationPlan277&{receipt:ShipCasketTerminal277} {
 const mapId=registeredMapId(w);if(!isSchema277OrLater(w.schemaVersion)||mapId===undefined)throw Error('Spatial terminal loss lacks a real registered map');
 const tick=w.tick,a=shipCasketActor277({revision:1,heldAt:tick,occupant:o,items:[],packed:[]})!,p=o.kind==='human'?o.pawn:undefined;
 const visitor=p?.visitor,raid=o.kind==='human'?o.pawn.raid:o.kind==='mechanical'?o.mech.raid:undefined,pod=p?.podRescue;
 const incident=pod?w.podRescues?.incidents.find(i=>i.id===pod.incidentId&&i.pawnId===a.id):undefined;
 if(pod&&!incident)throw Error('Actual terminal spatial-casket incident disappeared');
 const receipt:ShipCasketTerminal277={revision:1,mapId,atCore:tick*10,kind:o.kind,...visitor?{visitorGroup:visitor.group}:{},...raid?{raidGroup:raid.group}:{},...pod?{podIncident:pod.incidentId}:{}};
 const stamp=JSON.stringify([visitor,raid,pod]),before=incident?JSON.stringify(incident):undefined;let done=false;
 const current=()=>!done&&w.tick===tick&&JSON.stringify([visitor,raid,pod])===stamp&&(!incident||w.podRescues?.incidents.includes(incident)===true&&JSON.stringify(incident)===before);
 return {receipt,current,commit(){if(!current())return false;
  const row=registeredCampaign(w).worldPawns?.owners.find(r=>r.actor.id===a.id&&r.kind===o.kind&&JSON.stringify(r.shipCasketTerminal277)===JSON.stringify(receipt)&&terminalWorldPawn256(r));if(!row)return false;
  done=true;if(incident){incident.result=row.destroyed?'destroyed277':'dead';incident.resolvedAt=row.actor.health?.death?.tick??tick;}
  const groups=raid?[...w.raids?.active?[w.raids.active]:[],...w.raids?.extraActive261??[],...w.raids?.mechActive?[w.raids.mechActive]:[],...w.raids?.extraMechActive261??[]]:[];
  for(const g of groups)if(g.id===raid!.group&&g.members.includes(a.id)&&!g.lost.includes(a.id)){g.lost.push(a.id);g.lost.sort((x,y)=>x-y);}
  return true;
 }};
}
