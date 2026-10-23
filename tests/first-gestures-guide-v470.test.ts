import {expect,test} from 'vitest';
import {createFirstGesturesGuide} from '../src/ui/first-gestures-guide';
import {createFirstGesturesLearning,LESSONS,type FirstGesturesLearning,type FirstGesturesLearningState} from '../src/ui/first-gestures-learning';
import type {FirstDayGuideAction} from '../src/ui/first-day-guide';
import type {World} from '../src/sim/types';

/** A literal DOM port tests retained nodes and callbacks without starting a
 * browser. Native focus/layout and real commands belong to ROOT's quiet run. */
class GuideDocument470 {
 created=0;activeElement:GuideNode470|null=null;
 createElement(tag:string){this.created++;return new GuideNode470(this,tag);}
}
class GuideNode470 {
 children:GuideNode470[]=[];parentElement:GuideNode470|null=null;dataset:Record<string,string>={};attributes=new Map<string,string>();
 hidden=false;disabled=false;type='';className='';title='';onclick:(()=>void)|null=null;private literal='';
 constructor(readonly ownerDocument:GuideDocument470,readonly tag:string){}
 set innerHTML(_value:string){throw Error('Guide content must stay literal.');}
 set textContent(value:string){this.literal=value;this.replaceChildren();}
 get textContent():string{return this.literal+this.children.map(child=>child.textContent).join('');}
 get visible():boolean{return !this.hidden&&(!this.parentElement||this.parentElement.visible);}
 append(...nodes:GuideNode470[]){for(const node of nodes){this.children.push(node);node.parentElement=this;}}
 replaceChildren(...nodes:GuideNode470[]){for(const node of this.children)node.parentElement=null;this.children=[];this.append(...nodes);}
 setAttribute(key:string,value:string){this.attributes.set(key,value);}
 removeAttribute(key:string){this.attributes.delete(key);}
 getAttribute(key:string){return this.attributes.get(key)??null;}
 focus(){if(this.visible)this.ownerDocument.activeElement=this;}
 click(){if(!this.disabled&&this.visible)this.onclick?.();}
 querySelectorAll(selector:string):GuideNode470[]{
  const attr=/^\[data-([a-z-]+)(?:="([^"]*)")?\]$/.exec(selector),key=attr?.[1]?.replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase());
  const matches=(node:GuideNode470)=>key?Object.hasOwn(node.dataset,key)&&(attr![2]===undefined||node.dataset[key]===attr![2]):node.tag===selector;
  return this.children.flatMap(node=>[...(matches(node)?[node]:[]),...node.querySelectorAll(selector)]);
 }
 querySelector(selector:string){return this.querySelectorAll(selector)[0];}
}
function fixture(raw:string|null=null,writeResult=true){
 const doc=new GuideDocument470(),host=doc.createElement('host'),actions:FirstDayGuideAction[]=[];let stored=raw,writes=0,view:ReturnType<typeof createFirstGesturesGuide>|undefined;
 const learning=createFirstGesturesLearning({read:()=>stored,write:value=>{writes++;if(writeResult)stored=value;return writeResult;},changed:()=>view?.update()});
 view=createFirstGesturesGuide(host as unknown as HTMLElement,{learning,onAction:action=>actions.push(action)});
 const part=(key:string)=>host.querySelector(`[data-${key}]`)!;
 return {doc,host,actions,learning,view,part,get stored(){return stored;},get writes(){return writes;}};
}
const prepared=(learned:FirstGesturesLearningState['learned'],enabled=false)=>JSON.stringify({version:1,enabled,learned});
function confirmWork(f:ReturnType<typeof fixture>){
 const before={pawns:[{id:7,state:'idle',priorities:{haul:0}}]} as unknown as World;
 const token=f.learning.prepare({type:'priority',pawnId:7,work:'haul',value:1},before);expect(token).toBeDefined();expect(f.learning.confirm(token)).toBe(true);
}

test('opening the optional offer creates no knowledge and routes no game action',()=>{
 const f=fixture();expect(f.host.hidden).toBe(true);expect(f.writes).toBe(0);f.view.setActive(true);
 expect(f.part('first-gestures-start').textContent).toBe('Commencer');expect(f.part('first-gestures-summary').textContent).toBe('0 / 4 gestes repérés');expect(f.host.querySelectorAll('[data-first-gesture-indicator]')).toHaveLength(4);
 expect(f.learning.state).toEqual({version:1,enabled:false,learned:{}});expect(f.actions).toEqual([]);expect(f.writes).toBe(0);
});

test('starting and opening an existing control do not masquerade as an accepted command',()=>{
 const f=fixture();f.view.setActive(true);f.part('first-gestures-start').click();expect(f.learning.state.enabled).toBe(true);
 expect(f.part('first-gesture-current').dataset.firstGestureCurrent).toBe('work');expect(f.part('first-gesture-instruction').textContent).toBe(LESSONS[0]!.instruction);
 f.part('first-gesture-action').click();expect(f.actions).toEqual([{panel:'work'}]);expect(f.learning.state.learned).toEqual({});expect(f.part('first-gesture-origin="work"').textContent).toBe('À découvrir');
});

test('confirmed evidence and a personal declaration retain distinct accessible origins',()=>{
 const f=fixture();f.view.setActive(true);f.part('first-gestures-start').click();confirmWork(f);
 expect(f.part('first-gesture-origin="work"').textContent).toBe('Ordre accepté');expect(f.part('first-gesture-indicator="work"').getAttribute('aria-label')).toContain('Ordre accepté');expect(f.part('first-gesture-current').dataset.firstGestureCurrent).toBe('storage');
 f.part('first-gesture-declare').click();expect(f.learning.state.learned).toEqual({work:'confirmed',storage:'declared'});expect(f.part('first-gesture-origin="storage"').textContent).toBe('Je connais déjà ce geste');expect(f.part('first-gesture-indicator="storage"').getAttribute('aria-label')).toContain('Je connais déjà ce geste');expect(f.part('first-gestures-summary').textContent).toBe('2 / 4 gestes repérés');expect(f.actions).toEqual([]);
});

test('each current lesson routes precisely to the existing tool without learning from the route',()=>{
 const f=fixture();f.view.setActive(true);f.part('first-gestures-start').click();
 for(const lesson of LESSONS){
  expect(f.part('first-gesture-current').dataset.firstGestureCurrent).toBe(lesson.id);const before=f.learning.state;f.part('first-gesture-action').click();expect(f.actions.at(-1)).toEqual(lesson.action);expect(f.learning.state).toEqual(before);f.part('first-gesture-declare').click();
 }
 expect(f.actions).toEqual([{panel:'work'},{panel:'architect',mapTools:'zones',tool:'stockpile'},{panel:'architect',category:'furniture',tool:'sleeping-spot'},{panel:'architect',mapTools:'zones',tool:'growing'}]);
 expect(f.part('first-gesture-action').hidden).toBe(true);expect(f.part('first-gestures-summary').textContent).toBe('4 / 4 gestes repérés');expect(f.host.textContent).toContain('geste d’interface');
});

test('pause preserves knowledge and resume returns to the next unknown lesson',()=>{
 const f=fixture();f.view.setActive(true);f.part('first-gestures-start').click();f.part('first-gesture-declare').click();const before=f.learning.state.learned;
 expect(f.part('first-gestures-stop').textContent).toBe('Interrompre le parcours');
 f.part('first-gestures-stop').click();expect(f.learning.state.enabled).toBe(false);expect(f.learning.state.learned).toEqual(before);expect(f.part('first-gestures-start').textContent).toBe('Reprendre');expect(f.part('first-gesture-current').hidden).toBe(true);
 f.part('first-gestures-start').click();expect(f.learning.current).toBe('storage');expect(f.part('first-gesture-current').hidden).toBe(false);expect(f.learning.state.learned).toEqual(before);
});

test('a completed enabled course can be ended without erasing its four known gestures',()=>{
 const f=fixture(prepared({work:'confirmed',storage:'declared',beds:'confirmed',cultivation:'declared'},true));f.view.setActive(true);
 const stop=f.part('first-gestures-stop');expect(stop.hidden).toBe(false);expect(stop.textContent).toBe('Terminer le parcours');const learned=f.learning.state.learned;stop.focus();stop.click();
 expect(f.learning.state.enabled).toBe(false);expect(f.learning.state.learned).toEqual(learned);expect(stop.hidden).toBe(true);expect(f.doc.activeElement).toBe(f.part('first-gestures-review'));expect(f.actions).toEqual([]);
});

test('a new view resumes browser knowledge independently of a world or save import',()=>{
 const original=fixture(prepared({work:'confirmed',storage:'declared'},false));original.view.setActive(true);const before=original.learning.state;
 const next=fixture(original.stored);next.view.setActive(true);expect(next.learning.state).toEqual(before);expect(next.part('first-gestures-start').textContent).toBe('Reprendre');expect(next.part('first-gesture-origin="work"').textContent).toBe('Ordre accepté');expect(next.part('first-gesture-origin="storage"').textContent).toBe('Je connais déjà ce geste');expect(next.writes).toBe(0);
 next.part('first-gestures-start').click();expect(next.learning.current).toBe('beds');expect(next.actions).toEqual([]);
});

test('explicit review clears only learning markers and preserves the current enabled choice',()=>{
 const f=fixture(prepared({work:'confirmed',storage:'declared'},true));f.view.setActive(true);const button=f.part('first-gestures-review');expect(button.title).toContain('seulement');button.click();
 expect(f.learning.state).toEqual({version:1,enabled:true,learned:{}});expect(f.part('first-gesture-current').dataset.firstGestureCurrent).toBe('work');expect(f.actions).toEqual([]);expect(f.part('first-gestures-review').hidden).toBe(true);expect(JSON.parse(f.stored!)).toEqual(f.learning.state);
});

test('unavailable browser storage warns that session knowledge will not survive reload',()=>{
 const f=fixture(null,false);f.view.setActive(true);f.part('first-gestures-start').click();f.part('first-gesture-declare').click();
 expect(f.learning.state.learned.work).toBe('declared');expect(f.part('first-gestures-warning').hidden).toBe(false);expect(f.part('first-gestures-warning').getAttribute('role')).toBe('status');expect(f.part('first-gestures-warning').textContent).toContain('perdus au rechargement');expect(f.stored).toBeNull();
 const reloaded=fixture(f.stored);reloaded.view.setActive(true);expect(reloaded.learning.state.learned).toEqual({});
});

test('refresh retains the focused controls and indicators without recreating any DOM node',()=>{
 const f=fixture();f.view.setActive(true);f.part('first-gestures-start').click();const action=f.part('first-gesture-action'),indicator=f.part('first-gesture-indicator="work"'),created=f.doc.created;action.focus();
 for(let i=0;i<80;i++)f.view.update();expect(f.part('first-gesture-action')).toBe(action);expect(f.part('first-gesture-indicator="work"')).toBe(indicator);expect(f.doc.activeElement).toBe(action);expect(f.doc.created).toBe(created);
 confirmWork(f);expect(f.part('first-gesture-action')).toBe(action);expect(f.doc.activeElement).toBe(action);expect(f.doc.created).toBe(created);
});

test('only a focused control that becomes hidden relays focus to a visible next control',()=>{
 const f=fixture();f.view.setActive(true);const start=f.part('first-gestures-start'),open=f.part('first-gesture-action'),stop=f.part('first-gestures-stop'),declare=f.part('first-gesture-declare'),review=f.part('first-gestures-review');
 start.focus();start.click();expect(f.doc.activeElement).toBe(open);stop.focus();stop.click();expect(f.doc.activeElement).toBe(start);start.click();expect(f.doc.activeElement).toBe(open);
 declare.focus();declare.click();expect(f.doc.activeElement).toBe(declare);review.focus();review.click();expect(f.doc.activeElement).toBe(open);
 declare.focus();for(const _lesson of LESSONS)declare.click();expect(declare.hidden).toBe(true);expect(f.doc.activeElement).toBe(review);
 review.click();expect(f.doc.activeElement).toBe(open);
 const outside=f.doc.createElement('button');outside.focus();f.view.update();expect(f.doc.activeElement).toBe(outside);
});

test('hidden and disposed updates never read the learning model and cannot keep active callbacks',()=>{
 const doc=new GuideDocument470(),host=doc.createElement('host'),unreadable=new Proxy({} as FirstGesturesLearning,{get(){throw Error('Hidden guide read its model.');}}),actions:FirstDayGuideAction[]=[];
 const view=createFirstGesturesGuide(host as unknown as HTMLElement,{learning:unreadable,onAction:a=>actions.push(a)});expect(()=>view.update()).not.toThrow();view.setActive(false);expect(()=>view.update()).not.toThrow();const buttons=host.querySelectorAll('button');view.dispose();expect(()=>view.update()).not.toThrow();expect(()=>view.setActive(true)).not.toThrow();expect(buttons.every(button=>button.onclick===null)).toBe(true);expect(host.children).toHaveLength(0);expect(actions).toEqual([]);
});

test('reset releases old callbacks while reactivation preserves nodes and player knowledge',()=>{
 const f=fixture();f.view.setActive(true);const start=f.part('first-gestures-start'),oldStart=start.onclick!,created=f.doc.created;f.view.reset();expect(start.onclick).toBeNull();oldStart();expect(f.learning.state.enabled).toBe(false);
 f.view.setActive(true);expect(f.part('first-gestures-start')).toBe(start);expect(f.doc.created).toBe(created);oldStart();expect(f.learning.state.enabled).toBe(false);start.click();expect(f.learning.state.enabled).toBe(true);f.part('first-gesture-declare').click();const learned=f.learning.state.learned;f.view.reset();f.view.setActive(true);expect(f.learning.state.learned).toEqual(learned);
});
