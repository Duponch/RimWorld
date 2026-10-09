import { expect,test } from 'vitest';
import { createWorld } from '../src/sim/index';
import { toolDefinitions } from '../src/ui/layout';
import { placementMaterial } from '../src/ui/construction-controls';
import { buildingLabels } from '../src/ui/building-labels';
import { ARCHITECT_ICON_MAPPING,ARCHITECT_ICON_ORDER } from '../src/ui/architect-icons';
import { orbitalInspection } from '../src/ui/orbital-inspection';
import { powerInspection } from '../src/ui/power-inspection';
import type { Structure } from '../src/sim/types';

function fixture(){
  const world=createWorld(281,32,32);
  const console:Structure={id:world.nextId++,kind:'comms-console',x:12,z:12,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null}};
  const beacon:Structure={id:world.nextId++,kind:'orbital-beacon',x:7,z:7,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null}};
  world.structures=[console,beacon];return {world,console,beacon};
}

test('Architecte exposes the exact two machines with fixed steel and existing research',()=>{
  for(const kind of ['orbital-beacon','comms-console'] as const){
    const tool=toolDefinitions.find(t=>t.id===kind)!;expect(tool.category).toBe('production');
    expect(tool.hint).toContain('Microélectronique');expect(placementMaterial(kind,'wood')).toBe('steel');
    expect(buildingLabels[kind]).toBeTruthy();expect(ARCHITECT_ICON_ORDER).toContain(kind);expect(ARCHITECT_ICON_MAPPING[kind]).toBeDefined();
  }
  expect(toolDefinitions.find(t=>t.id==='comms-console')!.hint).toContain('120 acier + 4 composants');
  expect(toolDefinitions.find(t=>t.id==='orbital-beacon')!.hint).toContain('40 acier + 1 composant');
});

test('beacon inspection reports topology and covered ground without changing the snapshot',()=>{
  const {world,beacon}=fixture(),before=structuredClone(world),text=orbitalInspection(world,beacon);
  expect(text).toContain('Alimentée · 40 W');expect(text).toContain('sans traverser les portes, murs et roche');expect(text).toContain('sous toit autorisé');expect(world).toEqual(before);
  beacon.power!.on=false;expect(orbitalInspection(world,beacon)).toContain('Sans alimentation');
  beacon.power!.switchOn=false;expect(orbitalInspection(world,beacon)).toContain('Arrêt manuel');
  beacon.breakdown={brokenAt:world.tick};expect(orbitalInspection(world,beacon)).toContain('En panne');
});

test('console distinguishes approach, power requirements and a finite passing ship',()=>{
  const {world,console,beacon}=fixture(),p=world.pawns[0]!;
  world.orbital={profile:'orbital-v1',adoptedAt:world.tick,rng:1,cycleStart:world.tick,scheduledAt:world.tick+100,nextCheckAt:world.tick+100,ships:[{id:world.nextId++,name:'Cargo test',kind:'bulk',arrivedAt:world.tick,departAt:world.tick+4000,announced:true}],pending:[]};
  p.name='Négociateur';p.orbitalTrade={shipId:world.orbital.ships[0]!.id,consoleId:console.id,spot:{x:12,z:14},phase:'approach',startedAt:world.tick};
  const text=orbitalInspection(world,console);expect(text).toContain('Négociateur rejoint la console');expect(text).toContain('1 vaisseau(x)');expect(text).toContain('capsule puis rangés');expect(powerInspection(world,console)).toContain('rejoint la console');
  beacon.power!.on=false;expect(orbitalInspection(world,console)).toContain('une balise alimentée est nécessaire');
  world.tick=world.orbital.ships[0]!.departAt;expect(orbitalInspection(world,console)).toContain('0 vaisseau(x)');
});
