import { expect,test,vi } from 'vitest';
import { createWorld } from '../src/sim/index';
import { newCookingBill } from '../src/sim/cooking-bills';
import { newBuildingFuel } from '../src/sim/fuel';
import { toolDefinitions,storageSettings,gameLayout } from '../src/ui/layout';
import { researchProjects } from '../src/ui/research-panel';
import { placementMaterial } from '../src/ui/construction-controls';
import { buildingLabels } from '../src/ui/building-labels';
import { ARCHITECT_ICON_MAPPING,ARCHITECT_ICON_ORDER } from '../src/ui/architect-icons';
import { billControls } from '../src/ui/bill-controls';
import { updateFireControls } from '../src/ui/fire-controls';
import { biofuelPowerInspection,powerInspection } from '../src/ui/power-inspection';
import type { Command,Structure } from '../src/sim/types';

function fixture(){
  const world=createWorld(283,32,32);world.resources=[];world.jobs=[];world.piles=[];
  const refinery:Structure={id:world.nextId++,kind:'biofuel-refinery',x:12,z:12,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null},bills:[]};
  const generator:Structure={id:world.nextId++,kind:'chemfuel-generator',x:17,z:12,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null},fuel:newBuildingFuel('chemfuel-generator')};
  world.structures=[refinery,generator];return {world,refinery,generator};
}

test('Architecte and research expose both ends of the material energy chain',()=>{
  for(const kind of ['biofuel-refinery','chemfuel-generator'] as const){
    expect(placementMaterial(kind,'wood')).toBe('steel');expect(buildingLabels[kind]).toBeTruthy();
    expect(ARCHITECT_ICON_ORDER).toContain(kind);expect(ARCHITECT_ICON_MAPPING[kind]).toBeDefined();
  }
  const refinery=toolDefinitions.find(t=>t.id==='biofuel-refinery')!,generator=toolDefinitions.find(t=>t.id==='chemfuel-generator')!;
  expect(refinery.category).toBe('production');expect(refinery.hint).toContain('150 acier + 3 composants');expect(refinery.hint).toContain('170 W');expect(refinery.hint).toContain('Q / E');
  expect(generator.category).toBe('power');expect(generator.hint).toContain('100 acier + 3 composants');expect(generator.hint).toContain('4,5');expect(generator.hint).not.toContain('Q / E');
  const research=researchProjects.find(p=>p.id==='biofuel-refining')!;expect(research.cost).toBe(700);expect(research.detail).toContain('35 biocarburants');
  expect(storageSettings('stockpile')).toContain('id="stockpile-chemfuel"');expect(gameLayout()).toContain('id="chemfuel-stock"');
});

test('reservoir inspection projects the real fuel and preserves stopped and broken states',()=>{
  const {world,generator,refinery}=fixture(),label={textContent:''},root={querySelector:()=>label} as unknown as ParentNode;
  generator.fuel!.ticks=9000;const before=structuredClone(world);
  expect(powerInspection(world,generator)).toContain('Réservoir 15 / 30 biocarburants');expect(powerInspection(world,generator)).toContain('4,5 unités/jour');
  updateFireControls(root,generator);expect(label.textContent).toContain('15 / 30 biocarburants');expect(label.textContent).not.toContain('bois');expect(world).toEqual(before);
  generator.power!.switchOn=false;expect(biofuelPowerInspection(world,generator)).toContain('Arrêt manuel');
  generator.power!.switchOn=true;generator.power!.on=false;generator.fuel!.ticks=0;expect(biofuelPowerInspection(world,generator)).toContain('Réservoir vide');
  generator.breakdown={brokenAt:world.tick};expect(powerInspection(world,generator,true)).toContain('En panne');expect(powerInspection(world,generator,true)).toContain('biocarburants');
  refinery.power!.on=false;expect(biofuelPowerInspection(world,refinery)).toContain('Sans alimentation');expect(biofuelPowerInspection(world,refinery)).toContain('170 W');
});

// Narrow DOM port for reviewing the actual controls and their dispatched command.
class Node {
  dataset:Record<string,string>={};children:Array<Node|string>=[];textContent='';className='';id='';title='';value='';type='';min='';max='';step='';checked=false;
  onclick:(()=>void)|undefined;onchange:(()=>void)|undefined;
  constructor(readonly tag:string){}
  append(...children:Array<Node|string>){this.children.push(...children);}
  setAttribute(_key:string,_value:string){}
  addEventListener(_event:string,_handler:()=>void){}
  nodes():Node[]{return [this,...this.children.flatMap(c=>typeof c==='string'?[]:c.nodes())];}
}

test('organic bill starts with plant filters and lets the player select an actual animal input',()=>{
  const {refinery}=fixture(),bill=newCookingBill(12,'chemfuel-from-organics');refinery.bills=[bill];
  const commands:Command[]=[];vi.stubGlobal('document',{createElement:(tag:string)=>new Node(tag)});
  try{
    const root=billControls(refinery,c=>commands.push(c)) as unknown as Node,nodes=root.nodes();
    const field=(name:string)=>nodes.find(n=>n.dataset.field===name)!;
    for(const item of ['berries','rice','potato','corn','agave-fruit'])expect(field(item).checked).toBe(true);
    expect(field('hare-meat').checked).toBe(false);expect(field('milk').checked).toBe(false);
    expect(nodes.some(n=>n.dataset.field==='simple-meal')).toBe(false);
    expect(nodes.find(n=>n.className==='bill-cost')!.textContent).toContain('3,5 nutrition');
    field('hare-meat').checked=true;nodes.find(n=>n.dataset.applyBill==='12')!.onclick!();
    expect(commands).toEqual([expect.objectContaining({type:'bill-update',structureId:refinery.id,billId:12,settings:expect.objectContaining({filters:expect.objectContaining({'hare-meat':true,milk:false,rice:true})})})]);
    expect(bill.filters['hare-meat']).toBe(false);
  }finally{vi.unstubAllGlobals();}
});
