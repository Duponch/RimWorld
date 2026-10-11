import {expect,test} from 'vitest';
import {slaughterCamp} from './helpers/slaughter-v309.ts';
import {defaultAutoSlaughterConfig} from '../src/sim/auto-slaughter-state.ts';
import {animalInspectorView} from '../src/ui/animal-inspector.ts';
import {animalActivity} from '../src/ui/animal-activity.ts';
import {animalsPanelScaffold} from '../src/ui/animals-panel.ts';

test('V318 inspector identifies a quota without checking manual slaughter',()=>{
  const {world,animalId}=slaughterCamp();world.autoSlaughter=[{...defaultAutoSlaughterConfig('hare'),maxTotal:0}];
  const animal=world.wildlife!.animals.find(a=>a.id===animalId)!;
  expect(animalActivity(world,animal)).toBe('Désigné pour abattage · quota du troupeau');
  const view=animalInspectorView(world,animalId)!;expect(view.slaughterDesignated).toBe(false);expect(view.activity).toContain('quota du troupeau');
});

test('V318 both causes remain readable and lifting quota preserves manual intent',()=>{
  const {world,animalId}=slaughterCamp();const animal=world.wildlife!.animals.find(a=>a.id===animalId)!;
  animal.domestic!.slaughter=true;world.autoSlaughter=[{...defaultAutoSlaughterConfig('hare'),maxTotal:0}];
  expect(animalInspectorView(world,animalId)).toMatchObject({slaughterDesignated:true,activity:'Désigné pour abattage · quota du troupeau + ordre manuel'});
  delete world.autoSlaughter;expect(animalActivity(world,animal)).toBe('Désigné pour abattage');expect(animalInspectorView(world,animalId)!.slaughterDesignated).toBe(true);
});

test('V318 scaffold exposes regulation and explains protected population without invented bonds',()=>{
  const scaffold=animalsPanelScaffold();expect(scaffold).toContain('Réguler le troupeau');expect(scaffold).toContain('gestantes protégées');expect(scaffold).toContain('data-domestic-list');expect(scaffold).not.toMatch(/bonded|liens affectifs/i);
});
