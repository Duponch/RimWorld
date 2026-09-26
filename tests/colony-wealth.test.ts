import { describe, expect, it } from 'vitest';
import { colonyWealth } from '../src/sim/colony-wealth.ts';
import { expectationForWealth } from '../src/sim/expectations.ts';
import type { MaterialPile, Pawn, Structure, World } from '../src/sim/types.ts';

const world = (parts: Partial<World> = {}): World => ({
  pawns:[],piles:[],packed:[],structures:[],tiles:[],...parts,
} as World);
const building = (id: number, damage = 0): Structure => ({
  id,kind:'bed',x:0,z:0,orientation:0,footprint:'standard',material:'wood',damage,
});
const pile = (id: number, item: MaterialPile['item'], quantity: number, owner: MaterialPile['owner']): MaterialPile => ({
  id,item,kind:item==='silver'?'silver':item==='wood'?'wood':'food',quantity,owner,
});
const pawn = (id: number, faction: Pawn['faction'] = 'colony'): Pawn => ({
  id,faction,state:'idle',x:0,z:0,
} as Pawn);

describe('richesse physique de la colonie', () => {
  it('compte bâtiments sans effet PV, sols une fois et objets en transit', () => {
    const w = world({
      structures:[building(1,50)],tiles:[{terrain:'soil',floor:'wood-planks'}],
      piles:[pile(2,'silver',10,{type:'ground',x:0,z:0}),pile(3,'wood',5,{type:'job',jobId:1})],
    });
    const value = colonyWealth(w);
    expect(value.items).toBe(16);
    expect(value.structures).toBeCloseTo(56.016,8);
    expect(value.floors).toBeCloseTo(3.906,8);
    expect(value.knownTotal).toBeCloseTo(75.922,8);
    expect(value.knownStorytellerWealth).toBeCloseTo(16+(56.016+3.906)/2,8);
    expect(value.complete).toBe(true);
  });

  it('déplace le même meuble entre richesse de bâtiment et richesse d’objet', () => {
    const installed = colonyWealth(world({structures:[building(1)]}));
    const packed = colonyWealth(world({packed:[{building:building(1),owner:{type:'ground',x:0,z:0}}]}));
    expect(packed.knownTotal).toBeCloseTo(installed.knownTotal,8);
    expect(packed.knownStorytellerWealth).toBeCloseTo(installed.knownStorytellerWealth*2,8);
  });

  it('inclut équipement colonial et biens au sol, exclut les inventaires neutres', () => {
    const w = world({pawns:[pawn(1),pawn(2,'outlanders')],piles:[
      pile(10,'silver',20,{type:'ground',x:0,z:0}),
      pile(11,'silver',10,{type:'equipment',pawnId:1}),
      pile(12,'silver',100,{type:'inventory',pawnId:2}),
    ],packed:[
      {building:building(20),owner:{type:'pawn',pawnId:1}},
      {building:building(21),owner:{type:'inventory',pawnId:2}},
    ]});
    const value = colonyWealth(w);
    expect(value.items).toBeCloseTo(30+56.016,8);
    expect(value.unpricedPawnIds).toEqual([1]);
    expect(value.complete).toBe(false);
  });

  it('garde la valeur des ingrédients incorporés, distingue inconnus et vrais zéros', () => {
    const work: MaterialPile = {id:5,item:'unfinished-sculpture',kind:'unfinished',quantity:1,
      owner:{type:'ground',x:0,z:0},artWork:{recipe:'small-sculpture',authorId:1,progress:0,material:'wood',parts:[30,20]}};
    const unknown: MaterialPile = {id:6,item:'hare-corpse',kind:'corpse',quantity:1,owner:{type:'ground',x:0,z:0}};
    const chunk: MaterialPile = {id:7,item:'granite-chunk',kind:'chunk',quantity:1,owner:{type:'ground',x:0,z:0}};
    const value = colonyWealth(world({piles:[work,unknown,chunk]}));
    expect(value.items).toBe(60);
    expect(value.unpricedPileIds).toEqual([6]);
    expect(value.complete).toBe(false);
  });
});

describe('attentes selon la richesse', () => {
  it.each([
    [0,'extremely-low',30,.18,2],[14999.99,'extremely-low',30,.18,2],
    [15000,'very-low',24,.13,3],[31000,'low',18,.11,3],[81000,'moderate',12,.10,4],
    [182000,'high',6,.08,5],[308000,'sky-high',0,.07,6],
  ] as const)('à %s : %s et %+s humeur', (wealth,id,offset,joyToleranceDropPerDay,joyKindsNeeded) => {
    expect(expectationForWealth(wealth)).toMatchObject({id,moodOffset:offset,joyFallFactor:1,joyToleranceDropPerDay,joyKindsNeeded});
  });
  it('refuse un échantillon non valide', () => {
    expect(() => expectationForWealth(-1)).toThrow(RangeError);
    expect(() => expectationForWealth(NaN)).toThrow(RangeError);
  });
});
