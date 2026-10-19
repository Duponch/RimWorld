import {afterEach,expect,test,vi} from 'vitest';
import {RoomInspection} from '../src/ui/room-inspection';
import type {World} from '../src/sim/types';
import {roomCamp} from './scenarios/rooms';

afterEach(()=>vi.unstubAllGlobals());

function fixture(existing=false){
  let hiddenAncestor=false;
  const makeLine=()=>({id:'room-description',className:'muted',hidden:false,dataset:{} as Record<string,string>,
    closest:vi.fn((selector:string)=>selector==='[hidden]'&&hiddenAncestor?{}:null),replaceChildren:vi.fn()});
  let line:ReturnType<typeof makeLine>|undefined=existing?makeLine():undefined;
  const insertion={after(node:ReturnType<typeof makeLine>){line=node;}};
  const panel={hidden:false,classList:{contains:()=>false},
    querySelector:vi.fn((selector:string)=>selector==='#room-description'?line??null:selector==='#selected-action'?insertion:null)};
  vi.stubGlobal('document',{createElement:(tag:string)=>tag==='div'?makeLine():{className:'',textContent:'',append:vi.fn()}});
  return {panel,element:panel as unknown as HTMLElement,line:()=>line!,hideAncestor(value:boolean){hiddenAncestor=value;}};
}
function unreadableWorld():World {
  return new Proxy({} as World,{get(){throw Error('A hidden room must not read World');}});
}

test('a hidden inspector or room-section ancestor returns before any World computation',()=>{
  const inspection=new RoomInspection(),view=fixture(true),world=unreadableWorld();
  view.panel.hidden=true;
  expect(()=>inspection.update(view.element,world,{x:13,z:13})).not.toThrow();expect(view.panel.querySelector).not.toHaveBeenCalled();
  view.panel.hidden=false;view.hideAncestor(true);view.line().dataset.copy='previous visible room';
  expect(()=>inspection.update(view.element,world,{x:13,z:13})).not.toThrow();
  expect(view.line().closest).toHaveBeenCalledWith('[hidden]');expect(view.line().dataset.copy).toBe('previous visible room');expect(view.line().replaceChildren).not.toHaveBeenCalled();
});

test('first creation remains populated and opening the room section computes the current room at the same tick',()=>{
  const inspection=new RoomInspection(),view=fixture(),world=roomCamp(),cell={x:13,z:13};
  inspection.update(view.element,world,cell);
  expect(view.line().dataset.copy).toContain('Pièce non couverte · 36 cases.');expect(view.line().hidden).toBe(false);
  const previous=view.line().dataset.copy,writes=view.line().replaceChildren.mock.calls.length;
  const breached={...world,structures:world.structures.filter(structure=>!(structure.x===11&&structure.z===10))};
  expect(breached.tick).toBe(world.tick);view.hideAncestor(true);inspection.update(view.element,breached,cell);
  expect(view.line().dataset.copy).toBe(previous);expect(view.line().replaceChildren).toHaveBeenCalledTimes(writes);
  view.hideAncestor(false);inspection.update(view.element,breached,cell);
  expect(view.line().dataset.copy).toContain('Extérieur');expect(view.line().dataset.copy).toContain('Beauté : pas de score de pièce.');
  expect(view.line().hidden).toBe(false);
});
