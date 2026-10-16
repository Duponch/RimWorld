import {expect,test} from 'vitest';
import {queryPawnStatus} from '../src/sim/diagnostics.ts';
import {productionWorkTotal,type ProductionRecipe} from '../src/sim/production-recipes.ts';
import {equipmentCamp} from './scenarios/equipment.ts';

// Presentation inputs only: the observed Aulnes regression is also inspected
// through its real ongoing work; these cases do not claim production histories.
const cases:readonly [Exclude<ProductionRecipe,'simple-meal'>|undefined,string][]=[
 ['tuque','Production : tuque'],['pants','Production : pantalon'],
 ['make-pemmican','Production : préparer du pemmican'],
 ['make-recon-armor','Production : combinaison de reconnaissance'],
 ['cook-survival-meal','Production : cuisiner un repas de survie emballé'],
 ['smelt-weapon','Fond une arme'],
 [undefined,'Prépare un repas simple'],
];
test.each(cases)('working %s reports the actual recipe, retaining legacy meal semantics', (recipe,label)=>{
 const world=equipmentCamp(1),pawn=world.pawns[0]!;pawn.state='working';pawn.need=null;
 pawn.cooking={recipe,stationId:1,billId:2,spot:{x:pawn.x,z:pawn.z},actionCell:{x:pawn.x+1,z:pawn.z},phase:'work',ingredients:[],progress:productionWorkTotal(recipe??'simple-meal')/2,productId:null,storageId:null};
 const before=JSON.stringify(world);expect(queryPawnStatus(world,pawn)).toMatchObject({code:'cooking',reason:`${label} (50 %).`});expect(JSON.stringify(world)).toBe(before);
});
