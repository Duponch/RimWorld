import {expect,test} from 'vitest';
import {applyCommand,createWorld} from '../src/sim/index.ts';
import {addGroundMaterial,addMaterial} from '../src/sim/materials.ts';
import {animalSpecies} from '../src/sim/animal-species.ts';
import {colonyWealth} from '../src/sim/colony-wealth.ts';
import {animalHandlingHolding} from '../src/sim/animal-handling.ts';
import {addResolvedInjury,createMedicalRecord} from '../src/sim/injury-state.ts';
import {designateHunt,huntingWanted} from '../src/sim/hunting.ts';
import {huntingPermission} from '../src/sim/hunting-state.ts';
import {advanceWildlife,wildPopulationWeight} from '../src/sim/wildlife.ts';
import {animalInspectorView,animalInspectorScaffold} from '../src/ui/animal-inspector.ts';
import {animalsPanelScaffold} from '../src/ui/animals-panel.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';
import {animalCombatCamp} from './scenarios/animal-combat.ts';

function fixture(){
  const w=createWorld(106,16,16);
  w.resources=[];w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.structures=[];w.jobs=[];w.piles=[];
  const a:WildAnimal={id:w.nextId++,species:'hare',sex:'female',x:5,z:7,
    food:.02,rest:1,state:'idle',path:[],nextDecision:w.tick};
  w.wildlife={profile:'temperate-hares-v1',rng:1,animals:[a],eatenPlants:0,eatenNutrition:0,eatenItems:0};
  return {w,a};
}
const own=(w:ReturnType<typeof fixture>['w'],a:WildAnimal)=>{
  a.domestic={since:w.tick,care:'herbal',tameness:5,nextDecay:w.tick+45000,lastTraining:w.tick};
};

test('un lièvre possédé quitte le budget sauvage mais garde faim, nourriture et identité physiques',()=>{
  const {w,a}=fixture(),wildWeight=wildPopulationWeight(w.wildlife!);
  expect(wildWeight).toBe(animalSpecies('hare').ecoSystemWeight);
  own(w,a);expect(wildPopulationWeight(w.wildlife!)).toBe(0);
  addGroundMaterial(w,'food',5,{x:6,z:7},'rice');
  const food=w.piles.find(p=>p.item==='rice')!,id=a.id;
  for(let i=0;i<500&&!w.wildlife!.eatenItems;i++){w.tick++;advanceWildlife(w);}
  expect(w.wildlife!.eatenItems).toBeGreaterThan(0);
  expect(w.piles.find(p=>p.id===food.id)?.quantity??0).toBeLessThan(5);
  expect(w.wildlife!.animals.find(x=>x.id===id)).toBe(a);
  expect(a.food).toBeGreaterThan(.02);
  expect(wildPopulationWeight(w.wildlife!)).toBe(0);
});

test('la propriété marque la valeur du lièvre comme inconnue sans lui inventer un prix',()=>{
  const {w,a}=fixture(),wild=colonyWealth(w);
  expect(wild.unpricedPawnIds).not.toContain(a.id);
  own(w,a);
  const domestic=colonyWealth(w);
  expect(domestic.unpricedPawnIds).toContain(a.id);
  expect(domestic.knownTotal).toBe(wild.knownTotal);
  expect(domestic.complete).toBe(false);
});

test('une désignation de chasse ou sa permission ne survit pas à la propriété',()=>{
  const {w,a}=fixture(),hunter=w.pawns[0]!;
  hunter.priorities.hunt=1;addMaterial(w,'weapon',1,{type:'equipment',pawnId:hunter.id},'revolver');
  expect(designateHunt(w,{type:'hunt',animalId:a.id,enabled:true}).ok).toBe(true);
  expect(huntingWanted(w,hunter)).toBe(true);
  own(w,a);
  expect(designateHunt(w,{type:'hunt',animalId:a.id,enabled:true}).ok).toBe(false);
  hunter.hunting={animalId:a.id,startedAt:w.tick,phase:'stalk',progress:0};
  expect(huntingPermission(w,hunter,a.id)).toBe(false);
  expect(huntingWanted(w,hunter)).toBe(false);
  expect(designateHunt(w,{type:'hunt',animalId:a.id,enabled:false}).ok).toBe(true);
  expect(hunter.hunting).toBeUndefined();
  expect(w.hunting?.targets).toEqual([]);
});

test('les ordres directs de tir et de mêlée refusent le lièvre allié sans mutation',()=>{
  const w=animalCombatCamp(),a=w.wildlife!.animals[0]!,p=w.pawns[0]!;
  own(w,a);
  const before=JSON.stringify(w);
  for(const type of ['shoot','melee'] as const){
    const result=applyCommand(w,{type,pawnIds:[p.id],targetId:a.id});
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/appartient à la colonie/);
    expect(JSON.stringify(w)).toBe(before);
  }
});

test('le dresseur ne retient le lièvre qu’au contact ; faim continue et trajet du lièvre reste libre',()=>{
  const {w,a}=fixture(),handler=w.pawns[0]!;
  handler.x=5;handler.z=6;handler.priorities.handle=1;
  handler.skills.animals={level:8,xp:0,dailyXp:0,passion:0};
  a.taming={designated:true};a.food=.18;a.path=[{x:6,z:7}];
  handler.animalHandling={animalId:a.id,kind:'tame',sourcePileId:999,carryPileId:null,
    quantity:2,phase:'interact',step:0,progress:0};
  expect(animalHandlingHolding(w,a.id)).toBe(true);
  const food=a.food;w.tick++;advanceWildlife(w);
  expect({x:a.x,z:a.z}).toEqual({x:5,z:7});expect(a.path).toEqual([{x:6,z:7}]);
  expect(a.food).toBeLessThan(food);
  handler.animalHandling.phase='approach';
  expect(animalHandlingHolding(w,a.id)).toBe(false);
  w.tick++;advanceWildlife(w);
  expect({x:a.x,z:a.z}).toEqual({x:6,z:7});
});

test('le lièvre blessé se couche pour un vrai soin mais se relève pour chercher de la nourriture',()=>{
  const {w,a}=fixture();own(w,a);
  a.food=.18;a.rest=1;
  const record=createMedicalRecord(w.tick);record.body='hare';
  addResolvedInjury(record,'tail','cut',1000,()=>.99);a.health=record;
  w.tick++;advanceWildlife(w);expect(a.state).toBe('sleeping');
  for(let i=0;i<5;i++){w.tick++;advanceWildlife(w);expect(a.state).toBe('sleeping');}
  a.food=.04;w.tick++;advanceWildlife(w);
  expect(a.state).not.toBe('sleeping');
});

test('les dossiers séparent sauvage et domestique libre, sans promettre de dressage avancé',()=>{
  const {w,a}=fixture();
  expect(animalInspectorView(w,a.id)).toMatchObject({identity:'Femelle · sauvage',canTame:true,domestic:false});
  expect(animalInspectorView(w,a.id)!.species.join(' ')).toContain('Animaux 8');
  own(w,a);
  expect(animalInspectorView(w,a.id)).toMatchObject({identity:'Femelle · domestique libre',canHunt:false,canTame:false,domestic:true,care:'herbal'});
  expect(animalInspectorView(w,a.id)!.health.join(' ')).toContain('Statut : domestique libre');
  expect(animalInspectorScaffold()).toContain('data-animal-care');
  expect(animalsPanelScaffold()).toContain('Aucun animal domestique');
  expect(animalsPanelScaffold()).not.toMatch(/Obéissance|entraînement|enclos placé/i);
});
