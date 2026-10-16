import {afterEach,expect,test,vi} from 'vitest';
import * as exposureRules from '../src/sim/deterioration-rules';
import {deteriorationInspection} from '../src/ui/deterioration-inspection';
import {itemInformation} from '../src/ui/item-information';
import {deconstructionCamp} from './scenarios/deconstruction';
import {addMaterial} from '../src/sim/materials';

function fixture(){const world=deconstructionCamp(0);addMaterial(world,'wood',10,{type:'ground',x:8,z:8},'wood');
  const pile=world.piles.at(-1)!;pile.damage=4;return {world,pile};}
afterEach(()=>vi.restoreAllMocks());

test('V396 selected-item UI preserves the exposure distinctions and explains only mean environmental wear',()=>{
  const {world,pile}=fixture(),before=JSON.stringify(world),spy=vi.spyOn(exposureRules,'deteriorationExposure');
  for(const [status,label,rate,roofed,outdoor] of [
    ['outside','Au sol exposé',.5,false,true],
    ['covered-outside','Auvent extérieur couvert',.25,true,true],
    ['unroofed-inside','Au sol non couvert, à température intérieure',.25,false,false],
    ['protected-shelf','Protégé par une étagère',0,false,true],
    ['protected-inside','Intérieur couvert',0,true,false],
    ['not-ground','Hors sol',0,false,true],
  ] as const){
    spy.mockReturnValue({status,baseRate:.5,rate,roofed,usesOutdoorTemperature:outdoor,terrainFactor:0});
    const view=deteriorationInspection(world,pile)!;
    expect(view.health).toEqual({current:146,maximum:150,label:'État'});expect(view.summary).toContain(label);
    expect(view.rows.find(row=>row.label==='Exposition')!.value).toBe(label);
    const mean=view.rows.find(row=>row.label==='Détérioration moyenne')!;
    expect(mean.value).toBe(rate===.5?'0,5 PV/jour':rate===.25?'0,25 PV/jour':'0 PV/jour');
    expect(mean.description).toContain('pas une date garantie');expect(mean.description).toContain('moitié du taux de base');
    expect(mean.description).toContain('ni du feu ni de la pourriture');expect(mean.description).toContain('accès et transport non évalués');
  }
  spy.mockReturnValue({status:'terrain-exposed',baseRate:.5,rate:1.5,roofed:true,usesOutdoorTemperature:false,terrainFactor:3});
  const wet=deteriorationInspection(world,pile)!;expect(wet.summary).toContain('Intérieur couvert, sol humide exposé');
  expect(wet.rows).toContainEqual(expect.objectContaining({label:'Supplément du terrain',value:'+3 × taux de base'}));
  expect(wet.rows.find(row=>row.label==='Détérioration moyenne')!.value).toBe('1,5 PV/jour');
  expect(spy).toHaveBeenCalledTimes(7);expect(JSON.stringify(world)).toBe(before);
});

test('V396 object-information enriches only its selected confirmed pile, and leaves scope admission to the business reader',()=>{
  const {world,pile}=fixture(),before=JSON.stringify(world),spy=vi.spyOn(exposureRules,'deteriorationExposure');
  spy.mockReturnValue({status:'covered-outside',baseRate:.5,rate:.25,roofed:true,usesOutdoorTemperature:true,terrainFactor:0});
  const view=itemInformation(pile,world);expect(spy).toHaveBeenCalledTimes(1);expect(spy).toHaveBeenCalledWith(world,pile);
  expect(view.rows).toContainEqual(expect.objectContaining({label:'Points de vie',value:'146 / 150'}));
  expect(view.rows).toContainEqual(expect.objectContaining({label:'Détérioration moyenne',value:'0,25 PV/jour'}));
  spy.mockClear();const withoutContext=itemInformation(pile);expect(spy).not.toHaveBeenCalled();
  expect(withoutContext.rows.some(row=>row.label==='Exposition')).toBe(false);
  spy.mockReturnValue({status:'out-of-scope',baseRate:0,rate:0,roofed:false,usesOutdoorTemperature:true,terrainFactor:0});
  expect(deteriorationInspection(world,pile)).toBeUndefined();expect(itemInformation(pile,world)).toEqual(withoutContext);
  expect(JSON.stringify(world)).toBe(before);
});
