import { expect,test,vi } from 'vitest';
import { createWorld } from '../src/sim/index';
import { toolDefinitions } from '../src/ui/layout';
import { researchProjects,researchLinks } from '../src/ui/research-panel';
import { placementMaterial } from '../src/ui/construction-controls';
import { buildingLabels } from '../src/ui/building-labels';
import { ARCHITECT_ICON_MAPPING,ARCHITECT_ICON_ORDER } from '../src/ui/architect-icons';
import { foodPolicyLayout } from '../src/ui/food-policy-controls';
import { updateFoodStocks } from '../src/ui/food-stocks';
import { nutrientPasteInspection,pasteTaskLabel } from '../src/ui/nutrient-paste-inspection';
import { powerInspection } from '../src/ui/power-inspection';
import { pasteSpot } from '../src/sim/nutrient-paste';
import type { Structure } from '../src/sim/types';

function fixture(){
  const world=createWorld(282,32,32);world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.resources=[];world.jobs=[];world.piles=[];
  const dispenser:Structure={id:world.nextId++,kind:'nutrient-paste-dispenser',x:12,z:12,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null}};
  const hopper:Structure={id:world.nextId++,kind:'hopper',x:10,z:12,orientation:0,footprint:'standard',material:'steel'};
  world.structures=[dispenser,hopper];return {world,dispenser,hopper};
}

test('Architecte, existing research graph and food permissions expose the complete chain',()=>{
  for(const kind of ['nutrient-paste-dispenser','hopper'] as const){
    const tool=toolDefinitions.find(t=>t.id===kind)!;expect(tool.category).toBe('production');expect(placementMaterial(kind,'wood')).toBe('steel');
    expect(buildingLabels[kind]).toBeTruthy();expect(ARCHITECT_ICON_ORDER).toContain(kind);expect(ARCHITECT_ICON_MAPPING[kind]).toBeDefined();
  }
  expect(toolDefinitions.find(t=>t.id==='nutrient-paste-dispenser')!.hint).toContain('125 acier + 3 composants');expect(toolDefinitions.find(t=>t.id==='hopper')!.hint).toContain('15 acier');
  expect(researchProjects.find(p=>p.id==='nutrient-paste')!.cost).toBe(400);expect(researchLinks.some(([from,to])=>from==='nutrient-paste'&&to==='packaged-survival-meals')).toBe(false);
  expect(foodPolicyLayout()).toContain('data-allowed-food="nutrient-paste-meal"');
});

test('dispenser inspection counts only cardinally linked physical stock and distinguishes five from six',()=>{
  const {world,dispenser,hopper}=fixture();
  world.piles=[{id:world.nextId++,item:'rice',kind:'food',quantity:5,owner:{type:'ground',x:hopper.x,z:hopper.z}}];
  const diagonal:Structure={...hopper,id:world.nextId++,x:10,z:10};world.structures.push(diagonal);world.piles.push({id:world.nextId++,item:'corn',kind:'food',quantity:60,owner:{type:'ground',x:diagonal.x,z:diagonal.z}});
  const before=structuredClone(world),text=nutrientPasteInspection(world,dispenser);expect(text).toContain('1 trémie(s) liée(s)');expect(text).toContain('5 unité(s)');expect(text).toContain('six unités nécessaires');expect(world).toEqual(before);
  world.piles[0]!.quantity=6;expect(nutrientPasteInspection(world,dispenser)).toContain('six unités disponibles');
});

test('dispenser reports confirmed power and rotated contact, including compact breakdown inspection',()=>{
  const {world,dispenser}=fixture();expect(powerInspection(world,dispenser)).toContain('Alimenté · 200 W');
  dispenser.orientation=1;expect(nutrientPasteInspection(world,dispenser)).toContain('Retrait en 15, 12');
  dispenser.power!.on=false;expect(nutrientPasteInspection(world,dispenser)).toContain('Sans alimentation');
  dispenser.power!.switchOn=false;expect(nutrientPasteInspection(world,dispenser)).toContain('Arrêt manuel');
  dispenser.breakdown={brokenAt:world.tick};expect(powerInspection(world,dispenser,true)).toContain('En panne · 200 W');
});

test('hopper presents fixed transport settings and surviving stock after dispenser removal',()=>{
  const {world,dispenser,hopper}=fixture();world.piles=[{id:world.nextId++,item:'rice',kind:'food',quantity:6,owner:{type:'ground',x:hopper.x,z:hopper.z}}];
  const text=nutrientPasteInspection(world,hopper);expect(text).toContain('Trémie sans énergie');expect(text).toContain('Priorité Important (3), fixe');expect(text).toContain('35 %');expect(text).toContain('6 Riz');
  world.structures=world.structures.filter(s=>s.id!==dispenser.id);expect(nutrientPasteInspection(world,hopper)).toContain('0 distributeur(s)');expect(nutrientPasteInspection(world,hopper)).toContain('6 Riz');
  world.jobs=[{id:world.nextId++,kind:'nutrient-paste-dispenser',x:dispenser.x,z:dispenser.z,orientation:0,footprint:'standard',status:'active',reservedBy:null,progress:0,escrow:{wood:0,food:0},material:'steel',construction:'blueprint'}];
  expect(nutrientPasteInspection(world,hopper)).toContain('plan adjacent en construction');
});

test('collection labels distinguish a meal already produced from approach and later patient delivery',()=>{
  const {world,dispenser}=fixture(),doctor=world.pawns[0]!,patient=world.pawns[1]!,spot=pasteSpot(dispenser);patient.name='Patient';
  doctor.feed={patientId:patient.id,spot:{x:patient.x,z:patient.z},sourcePileId:null,carryPileId:null,quantity:1,phase:'pickup',progress:0,paste:{dispenserId:dispenser.id,spot,ingredients:[{pileId:999,quantity:6}]}};
  expect(pasteTaskLabel(world,doctor)).toBe('Rejoint le distributeur pour nourrir Patient');
  doctor.feed.phase='collect';doctor.feed.carryPileId=1000;delete doctor.feed.paste!.ingredients;doctor.feed.paste!.producedAt=world.tick;
  expect(pasteTaskLabel(world,doctor)).toBe('Récupère un repas de pâte nutritive pour Patient');expect(nutrientPasteInspection(world,dispenser)).toContain('récupère son repas');
  doctor.feed.phase='deliver';expect(pasteTaskLabel(world,doctor)).toBeUndefined();expect(nutrientPasteInspection(world,dispenser)).not.toContain(doctor.name);
});

test('food HUD counts only real colony meals and presents every supported hopper ingredient',()=>{
  // This narrow DOM port records the same rows updated in place by the HUD.
  class Node {
    dataset:Record<string,string>={};children:Node[]=[];hidden=false;className='';textContent='';title='';
    constructor(readonly tag:string){}
    append(...children:Node[]){this.children.push(...children);}
    querySelector(selector:string):Node|undefined {return selector==='strong'?this.children.find(c=>c.tag==='strong'):this.children.find(c=>c.dataset.item===selector.match(/data-item="([^"]+)"/)?.[1]);}
  }
  const {world,hopper}=fixture(),container=new Node('div'),pawn=world.pawns[0]!;
  world.piles=[{id:world.nextId++,item:'rice',kind:'food',quantity:6,owner:{type:'ground',x:hopper.x,z:hopper.z}},
    {id:world.nextId++,item:'milk',kind:'food',quantity:7,owner:{type:'ground',x:9,z:9}},
    {id:world.nextId++,item:'nutrient-paste-meal',kind:'food',quantity:1,owner:{type:'pawn',pawnId:pawn.id}},
    {id:world.nextId++,item:'nutrient-paste-meal',kind:'food',quantity:9,owner:{type:'orbital-ship',shipId:999}}];
  vi.stubGlobal('document',{createElement:(tag:string)=>new Node(tag)});
  try{
    updateFoodStocks(container as unknown as HTMLElement,world);
    const meal=container.querySelector('[data-item="nutrient-paste-meal"]')!;
    expect(meal.hidden).toBe(false);expect(meal.querySelector('strong')!.textContent).toBe('1');expect(meal.title).toContain('0.9 nutrition');
    expect(container.querySelector('[data-item="milk"]')!.querySelector('strong')!.textContent).toBe('7');
    expect(container.querySelector('[data-item="rice"]')!.querySelector('strong')!.textContent).toBe('6');
    world.piles=world.piles.filter(p=>p.owner.type!=='pawn');updateFoodStocks(container as unknown as HTMLElement,world);expect(meal.hidden).toBe(true);expect(meal.querySelector('strong')!.textContent).toBe('0');
  }finally{vi.unstubAllGlobals();}
});
