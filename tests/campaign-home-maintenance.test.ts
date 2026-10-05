import assert from 'node:assert/strict';
import {test,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {fixturePower} from './scenarios/power.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {triggerBreakdown} from '../src/sim/breakdowns.ts';
import {newPowerState,isPowerActive} from '../src/sim/power-rules.ts';
import {reconcilePower} from '../src/sim/power.ts';
import type {Structure,World} from '../src/sim/types.ts';
import {energyDecisions,energyHomeDecisions,energyPlan,metalAccount,type EnergyPlayerState} from './scenarios/energy-player.ts';

/** Certified prepared regression. No failed campaign is edited.
 * It uses the original scenario's ordinary Construction skill and priorities;
 * no calendar seed, repair success, damage or component is boosted at runtime. */
export function homeMaintenanceProof() {
  const w=deconstructionCamp(3),origin={x:5,z:10},plan=energyPlan({origin});
  if(w.home?.length)assert.equal(applyCommand(w,{type:'area',action:'remove-home',from:{x:0,z:0},to:{x:w.width-1,z:w.height-1}}).ok,true);
  const generator=fixturePower(w,'wood-generator',plan.generator.x,plan.generator.z);
  const stove:Structure={id:w.nextId++,kind:'electric-stove',...plan.stove,orientation:0,footprint:'standard',material:'steel',power:newPowerState('electric-stove'),bills:[]};
  w.structures.push(stove);
  for(let x=plan.origin.x+5;x<=plan.origin.x+14;x++)w.structures.push({id:w.nextId++,kind:'power-conduit',x,z:plan.origin.z+5,orientation:0,footprint:'standard',material:'steel',power:newPowerState('power-conduit')});
  for(const z of [plan.origin.z+3,plan.origin.z+4])w.structures.push({id:w.nextId++,kind:'power-conduit',x:plan.origin.x+14,z,orientation:0,footprint:'standard',material:'steel',power:newPowerState('power-conduit')});
  addGroundMaterial(w,'component',1,{x:plan.stove.x-2,z:plan.stove.z+2},'component');
  reconcilePower(w);
  for(let n=0;n<300&&!isPowerActive(stove);n++){stepWorld(w);assert.deepEqual(validateWorld(w),[],`network startup tick ${w.tick}`);}
  assert.deepEqual(validateWorld(w),[]);
  assert.equal(isPowerActive(stove),true,'real network must power the prepared intact appliance');
  assert.equal(triggerBreakdown(w,stove.id),true);
  const brokenAt=stove.breakdown!.brokenAt,originalId=stove.id;
  assert.equal(isPowerActive(stove),false);
  assert.equal(w.jobs.some(j=>j.fixBreakdown?.structureId===stove.id),false,'outside Home no repair intention exists');
  assert.deepEqual(validateWorld(w),[]);

  const notebook:EnergyPlayerState={startTick:w.tick,origin,stage:'done',stageTick:w.tick,initialSteel:metalAccount(w,'steel'),initialComponents:metalAccount(w,'component'),milestones:{},nightDrainTicks:0,previousBattery:0,electricMeals:0};
  const before=serializeWorld(w),decisions=energyHomeDecisions(w,notebook);
  assert.equal(serializeWorld(w),before,'player policy is a read-only projection');
  assert.equal(decisions.length,2,'only the installed stove and generator are painted; absent assets are excluded');
  const occupied=new Set([stove,generator].flatMap(footprintCells).map(c=>c.z*w.width+c.x));
  for(const decision of decisions){
    const command=decision.command;
    assert.equal(command.type,'area');
    if(command.type!=='area')throw Error('Expected ordinary Home area command.');
    assert.equal(command.action,'home');
    for(let z=command.from.z;z<=command.to.z;z++)for(let x:number=command.from.x;x<=command.to.x;x++)assert.equal(occupied.has(z*w.width+x),true,'no absent plan cell is painted');
    assert.equal(applyCommand(w,command).ok,true);
  }
  assert.equal(stove.breakdown?.brokenAt,brokenAt,'painting Home cannot reset the breakdown');
  assert.equal(w.piles.filter(p=>p.item==='component').reduce((n,p)=>n+p.quantity,0),1,'component is not spent by designation');
  assert.equal(w.jobs.filter(j=>j.fixBreakdown?.structureId===stove.id).length,1);
  assert.deepEqual(energyHomeDecisions(w,notebook),[],'confirmed Home is not re-requested');

  let carried=false,delivered=false,resumed:World|undefined,steps=0;
  for(;steps<1200&&(!carried||!delivered||!!stove.breakdown||!isPowerActive(stove));steps++){
    stepWorld(w);if(resumed)stepWorld(resumed);
    assert.deepEqual(validateWorld(w),[],`confirmed tick ${w.tick}`);
    if(resumed)assert.equal(serializeWorld(resumed),serializeWorld(w),'continuation through carrying, work and power adoption must remain exact');
    carried ||= w.piles.some(p=>p.item==='component'&&p.owner.type==='pawn');
    delivered ||= w.piles.some(p=>p.item==='component'&&p.owner.type==='job');
    if(carried&&!resumed)resumed=deserializeWorld(serializeWorld(w));
  }
  assert.equal(carried,true,'Construction must really carry the component');
  assert.equal(delivered,true,'component must really reach the repair job');
  assert.equal(stove.breakdown,undefined,'repair resolves through the real work producer');
  assert.equal(isPowerActive(stove),true,'network adopts the repaired appliance');
  assert.equal(w.structures.find(s=>s.id===originalId),stove,'repair preserves original building identity');
  assert.equal(w.piles.filter(p=>p.item==='component').reduce((n,p)=>n+p.quantity,0),0,'one physical component is consumed');
  assert.equal(w.jobs.some(j=>j.fixBreakdown?.structureId===stove.id),false);
  assert.ok(resumed);
  for(let n=0;n<80;n++){stepWorld(w);stepWorld(resumed);assert.deepEqual(validateWorld(w),[]);assert.equal(serializeWorld(resumed),serializeWorld(w));}
  return {preparedAt:notebook.startTick,brokenAt,finishedAt:w.tick,steps,structureId:stove.id,componentConsumed:1,powered:isPowerActive(stove),resumed:true};
}

test('Campaign maintenance: Home painting, real component delivery, repair and exact continuation',()=>homeMaintenanceProof(),10000);

test('Campaign energy policy prioritizes actual device Home footprints in the committed V85 continuation',()=>{
  const w=deserializeWorld(gunzipSync(readFileSync('tests/fixtures/colony-v85.json.gz')).toString('utf8'));
  const player=(JSON.parse(readFileSync('artifacts/energy-colony-v85.json','utf8')) as {player:EnergyPlayerState}).player;
  expect(w.tick).toBe(253280);expect(w.scenario?.id).toBe('crashlanded');
  const p=energyPlan(player),sites=[['electric-stove',p.stove],['wood-generator',p.generator],['battery',p.battery],
    ['solar-generator',p.solar],['power-switch',p.switch],['cooler',p.cooler]] as const;
  const devices=sites.map(([kind,c])=>w.structures.find(s=>s.kind===kind&&s.x===c.x&&s.z===c.z)!);
  expect(devices.every(Boolean)).toBe(true);
  const occupied=new Set(devices.flatMap(footprintCells).map(c=>c.z*w.width+c.x));
  for(const device of devices){
    const cells=footprintCells(device),from={x:Math.min(...cells.map(c=>c.x)),z:Math.min(...cells.map(c=>c.z))},
      to={x:Math.max(...cells.map(c=>c.x)),z:Math.max(...cells.map(c=>c.z))};
    if(cells.some(c=>w.home?.includes(c.z*w.width+c.x)))
      expect(applyCommand(w,{type:'area',action:'remove-home',from,to}).ok).toBe(true);
  }
  const before=serializeWorld(w),decisions=energyDecisions(w,player);
  expect(serializeWorld(w)).toBe(before);expect(decisions).toEqual(energyHomeDecisions(w,player));
  expect(decisions).toHaveLength(devices.length);
  for(const {command} of decisions){
    expect(command.type).toBe('area');
    if(command.type!=='area')throw Error('Expected ordinary Home command');
    expect(command.action).toBe('home');
    for(let z=command.from.z;z<=command.to.z;z++)for(let x=command.from.x;x<=command.to.x;x++)
      expect(occupied.has(z*w.width+x),`actual occupied cell ${x},${z}`).toBe(true);
    expect(applyCommand(w,command).ok).toBe(true);
  }
  expect(energyHomeDecisions(w,player)).toEqual([]);expect(validateWorld(w)).toEqual([]);
},10000);
