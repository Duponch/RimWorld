import {expect,test} from 'vitest';
import {createWorld} from '../src/sim/engine';
import {newPowerState} from '../src/sim/power-rules';
import {vitalsMonitorInspection} from '../src/ui/vitals-monitor-inspection';
import {vitalsMonitorParts} from '../src/render/vitals-monitor-parts';
import {researchProjects,researchLinks} from '../src/ui/research-panel';
import {ARCHITECT_ICON_ORDER,ARCHITECT_ICON_MAPPING} from '../src/ui/architect-icons';
import {fixtureBuilding} from './scenarios/deconstruction';
import type {Structure} from '../src/sim/types';

test('inspection distinguishes an unlinked bed, live service and a linked inactive monitor without mutating World',()=>{
  const w=createWorld(276,16,16);w.structures=[];
  const bed=fixtureBuilding(w,'hospital-bed',6,6);
  expect(vitalsMonitorInspection(w,bed)).toContain('Aucun');
  const monitor:Structure=fixtureBuilding(w,'vitals-monitor',5,6);Object.assign(monitor,{material:'steel',power:{...newPowerState('vitals-monitor'),on:true}});
  const before=JSON.stringify(w);
  expect(vitalsMonitorInspection(w,bed)).toContain('actif (+7');
  expect(vitalsMonitorInspection(w,monitor)).toContain('1 lit(s)');
  expect(JSON.stringify(w)).toBe(before);
  monitor.power!.on=false;
  expect(vitalsMonitorInspection(w,bed)).toContain('hors service (aucun bonus)');
  const ordinary=fixtureBuilding(w,'bed',7,8);expect(vitalsMonitorInspection(w,ordinary)).toBe('');
});

test('rigid monitor model shares placements and rotates its front display while power changes only display ink',()=>{
  const w=createWorld(276,16,16);w.structures=[];
  const monitor:Structure=fixtureBuilding(w,'vitals-monitor',6,6);Object.assign(monitor,{power:{...newPowerState('vitals-monitor'),on:true}});
  const on=vitalsMonitorParts(w);expect(on.length).toBeGreaterThan(8);expect(on.every(p=>p.key===monitor.id)).toBe(true);
  expect(on[3]!.z).toBeLessThan(monitor.z);
  monitor.orientation=1;expect(vitalsMonitorParts(w)[3]!.x).toBeLessThan(monitor.x);
  monitor.orientation=0;monitor.power!.on=false;
  const off=vitalsMonitorParts(w);expect(off.map(({color,...p})=>p)).toEqual(on.map(({color,...p})=>p));
  expect(off.filter((p,i)=>p.color!==on[i]!.color)).toHaveLength(5);
});

test('hospital research and architect tools are reachable with original atlas coordinates preserved',()=>{
  expect(researchProjects.find(p=>p.id==='sterile-materials')).toMatchObject({cost:600});
  expect(researchProjects.find(p=>p.id==='vitals-monitor')).toMatchObject({cost:2500});
  expect(researchLinks).toContainEqual(['hospital-bed','vitals-monitor']);
  expect(researchLinks).toContainEqual(['multi-analyzer','vitals-monitor']);
  for(const id of ['sterile-tile','vitals-monitor']){expect(ARCHITECT_ICON_ORDER).toContain(id);expect(ARCHITECT_ICON_MAPPING[id]).toBeDefined();}
  expect(ARCHITECT_ICON_MAPPING['steel-tile']).toEqual({atlas:0,column:0,row:1});
});
