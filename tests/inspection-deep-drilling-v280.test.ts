import { expect,test } from 'vitest';
import { createWorld } from '../src/sim/index';
import { toolDefinitions } from '../src/ui/layout';
import { researchLinks,researchProjects } from '../src/ui/research-panel';
import { placementMaterial } from '../src/ui/construction-controls';
import { buildingLabels } from '../src/ui/building-labels';
import { ARCHITECT_ICON_MAPPING,ARCHITECT_ICON_ORDER } from '../src/ui/architect-icons';
import { deepDrillingInspection } from '../src/ui/deep-drilling-inspection';
import { powerInspection } from '../src/ui/power-inspection';
import type { Structure } from '../src/sim/types';

function fixture(){
  const world=createWorld(280,32,32);
  const drill:Structure={id:world.nextId++,kind:'deep-drill',x:12,z:12,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null},deepDrill:{progress:5000,yieldPct:.5,rng:1}};
  const scanner:Structure={id:world.nextId++,kind:'ground-scanner',x:7,z:7,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null},deepScanner:{daysWorking:3}};
  world.structures=[drill,scanner];world.deepResources={adoptedAt:world.tick,rng:1,discoveries:1,cells:[{index:12*world.width+12,item:'gold',count:120}]};
  return {world,drill,scanner};
}

test('architect and research expose the complete two-building chain and fixed ingredients',()=>{
  for(const id of ['deep-drill','ground-scanner'] as const){
    const tool=toolDefinitions.find(t=>t.id===id)!;
    expect(tool.category).toBe('production');expect(placementMaterial(id,'wood')).toBe('steel');
    expect(buildingLabels[id]).toBeTruthy();expect(ARCHITECT_ICON_ORDER).toContain(id);expect(ARCHITECT_ICON_MAPPING[id]).toBeDefined();
  }
  expect(toolDefinitions.find(t=>t.id==='ground-scanner')!.hint).toContain('1 composant avancé');
  expect(researchProjects.find(p=>p.id==='deep-drilling')!.cost).toBe(1000);expect(researchProjects.find(p=>p.id==='ground-scanner')!.cost).toBe(1000);
  expect(researchLinks).toContainEqual(['microelectronics','deep-drilling']);expect(researchLinks).toContainEqual(['deep-drilling','ground-scanner']);
});

test('scanner projects the guarantee rather than probability, with an actual worker and roof refusal',()=>{
  const {world,scanner}=fixture(),before=structuredClone(world);
  expect(deepDrillingInspection(world,scanner)).toContain('Découverte garantie : 50 %');
  expect(deepDrillingInspection(world,scanner)).toContain('ne mesure pas une probabilité');expect(world).toEqual(before);
  const worker=world.pawns[0]!;worker.name='Chercheur';worker.deepWork={kind:'scan',structureId:scanner.id,spot:{x:7,z:9}};worker.state='moving';
  expect(deepDrillingInspection(world,scanner)).toContain('Chercheur rejoint le poste');worker.state='working';worker.x=7;worker.z=9;worker.path=[];worker.moveCooldown=0;delete worker.motion;
  expect(deepDrillingInspection(world,scanner)).toContain('Chercheur travaille au contact');
  world.roofing={constructed:[scanner.z*world.width+scanner.x],build:[],remove:[],cursor:0};
  expect(deepDrillingInspection(world,scanner)).toContain('Scanner bloqué');
});

test('drill projects the remaining chosen cell and partial work, without promising a completed output',()=>{
  const {world,drill,scanner}=fixture();const text=deepDrillingInspection(world,drill);
  expect(text).toContain('Portion en cours : 50 %');expect(text).toContain('120 unité(s) en 12, 12');expect(text).toContain('Réserves finies');
  expect(powerInspection(world,drill)).toContain('Prochaine réserve');
  scanner.power!.on=false;expect(deepDrillingInspection(world,drill)).toContain('Alimenter un scanner');
  world.deepResources!.cells=[];expect(deepDrillingInspection(world,drill)).toContain('Aucun minerai dans les 21 cases');
  drill.power!.switchOn=false;expect(deepDrillingInspection(world,drill)).toContain('Arrêt manuel');
});
