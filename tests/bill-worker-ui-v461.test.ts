import {afterEach,expect,test,vi} from 'vitest';
import {billControls,updateBillControls} from '../src/ui/bill-controls.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {productionRecipeSkill283} from '../src/sim/bill-worker-rules-283.ts';
import type {BillWorkerOption283,BillWorkerOptions283} from '../src/sim/bill-worker-state-283.ts';
import type {ProductionRecipe} from '../src/sim/production-recipes.ts';
import type {Command,Structure,World} from '../src/sim/types.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';

/** Narrow DOM port of the authored controls, extending neighboring bill UI
 * fixtures with bubbling, options and asynchronous detachment. It supplies no
 * worker-selection logic. Pointer/layout behavior remains the muted native UI. */
class UiNode461 {
  children:(UiNode461|string)[]=[];parentElement?:UiNode461;dataset:Record<string,string>={};attributes=new Map<string,string>();
  value='';checked=false;disabled=false;hidden=false;open=false;connected=false;id='';className='';title='';type='';min='';max='';step='';
  onclick:(()=>void)|null=null;private text='';private listeners=new Map<string,((event:UiEvent461)=>void)[]>();
  constructor(readonly tag:string){}
  get isConnected():boolean{return this.connected||!!this.parentElement?.isConnected;}
  get options():UiNode461[]{return this.children.filter((n):n is UiNode461=>n instanceof UiNode461&&n.tag==='option');}
  set textContent(value:string){this.text=value;for(const child of this.children)if(child instanceof UiNode461)child.parentElement=undefined;this.children=[];}
  get textContent():string{return this.text+this.children.map(c=>typeof c==='string'?c:c.textContent).join('');}
  set innerHTML(_value:string){throw Error('Worker names and descriptions must stay literal.');}
  append(...nodes:(UiNode461|string)[]){for(const node of nodes){this.children.push(node);if(node instanceof UiNode461)node.parentElement=this;}}
  prepend(...nodes:(UiNode461|string)[]){for(const node of nodes)if(node instanceof UiNode461)node.parentElement=this;this.children.unshift(...nodes);}
  replaceChildren(...nodes:(UiNode461|string)[]){this.textContent='';this.append(...nodes);}
  setAttribute(key:string,value:string){this.attributes.set(key,value);}
  getAttribute(key:string){return this.attributes.get(key)??null;}
  addEventListener(name:string,listener:(event:UiEvent461)=>void){const rows=this.listeners.get(name)??[];rows.push(listener);this.listeners.set(name,rows);}
  emit(name:string,event:UiEvent461={target:this,currentTarget:this,stopped:false,preventDefault(){},stopPropagation(){this.stopped=true;}}){
    event.currentTarget=this;for(const listener of this.listeners.get(name)??[])listener(event);
    if(!event.stopped)this.parentElement?.emit(name,event);
  }
  click(){if(!this.disabled)this.onclick?.();}
  focus(){this.emit('focus');}
  querySelectorAll<T=UiNode461>(selector:string):T[]{
    const attr=/^\[data-([a-z-]+)(?:="([^"]*)")?\]$/.exec(selector),key=attr?.[1]?.replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase());
    const match=(n:UiNode461)=>key?Object.hasOwn(n.dataset,key)&&(attr![2]===undefined||n.dataset[key]===attr![2]):selector.startsWith('.')?n.className.split(' ').includes(selector.slice(1)):n.tag===selector;
    return this.children.flatMap(n=>typeof n==='string'?[]:[...(match(n)?[n]:[]),...n.querySelectorAll<UiNode461>(selector)]) as unknown as T[];
  }
  querySelector<T=UiNode461>(selector:string):T|null{return this.querySelectorAll<T>(selector)[0]??null;}
}
interface UiEvent461 {target:UiNode461;currentTarget:UiNode461;stopped:boolean;key?:string;preventDefault():void;stopPropagation():void}
afterEach(()=>vi.unstubAllGlobals());
const settled=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};
function deferred<T>(){let resolve!:(value:T)=>void,reject!:(reason:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function ui(recipe:ProductionRecipe='shirt',customRead?:(billId:number)=>Promise<BillWorkerOptions283>){
  const w=deconstructionCamp(2,32);
  const station:Structure={id:w.nextId++,kind:recipe==='make-medicine'?'drug-lab':recipe==='burn-apparel'?'campfire':'tailor-bench',x:10,z:10,orientation:0,footprint:'standard',material:'wood',bills:[]};
  const bill=newCookingBill(w.nextId++,recipe);station.bills=[bill];w.structures.push(station);
  const assigned:BillWorkerOption283={pawnId:w.pawns[0]!.id,name:'Artisane <nom littéral>',level:8,description:'Travail désactivé · non affectée',enabled:true};
  const incapable:BillWorkerOption283={pawnId:w.pawns[1]!.id,name:'Personne incapable',level:0,description:'Ne fera jamais ce travail',enabled:false};
  const options:BillWorkerOptions283={structureId:station.id,billId:bill.id,skill:productionRecipeSkill283(recipe),candidates:[assigned,incapable]};
  vi.stubGlobal('document',{createElement:(tag:string)=>new UiNode461(tag)});
  const sent:Command[]=[],read=vi.fn(customRead??(async()=>options)),host=new UiNode461('host');host.connected=true;
  const root=billControls(station,c=>{sent.push(c);},read) as unknown as UiNode461;host.append(root);
  const update=(world:World=w)=>updateBillControls(root as unknown as ParentNode,station,world);update();
  const form=root.querySelector(`[data-bill="${bill.id}"]`)!,worker=form.querySelector('[data-bill-worker]')!;
  const choice=worker.querySelector('[data-bill-worker-pawn]')!,min=worker.querySelector('[data-bill-worker-skill="min"]')!,max=worker.querySelector('[data-bill-worker-skill="max"]')!;
  const apply=worker.querySelector('[data-apply-bill-worker]')!,cancel=worker.querySelector('[data-cancel-bill-worker]')!,refresh=worker.querySelector('[data-refresh-bill-worker]')!,status=worker.querySelector('[data-bill-worker-status]')!,range=worker.querySelector('[data-bill-worker-range]')!;
  return {w,station,bill,assigned,incapable,options,sent,read,host,root,form,worker,choice,min,max,apply,cancel,refresh,status,range,update,open(){worker.open=true;worker.emit('toggle');},field:(key:string)=>form.querySelector(`[data-field="${key}"]`)!};
}

test('legacy adapters stay compatible; current controls fetch only on useful opening or refresh, never snapshots',async()=>{
  const f=ui(),before=JSON.stringify(f.w);expect(f.read).not.toHaveBeenCalled();
  for(let n=0;n<20;n++)f.update();expect(f.read).not.toHaveBeenCalled();expect(f.sent).toEqual([]);
  expect(f.worker.hidden).toBe(false);f.update({...f.w,schemaVersion:282} as unknown as World);expect(f.worker.hidden).toBe(true);f.update();
  f.open();await settled();expect(f.read).toHaveBeenCalledTimes(1);expect(f.read).toHaveBeenLastCalledWith(f.bill.id);
  for(let n=0;n<20;n++)f.update();expect(f.read).toHaveBeenCalledTimes(1);
  f.refresh.click();await settled();expect(f.read).toHaveBeenCalledTimes(2);expect(JSON.stringify(f.w)).toBe(before);expect(f.sent).toEqual([]);
  const legacy=billControls(f.station,()=>{}) as unknown as UiNode461;expect(legacy.querySelector('[data-bill-worker]')).toBeNull();
});

test('readonly metadata distinguishes disabled work priority and permanent incapacity, keeping names literal',async()=>{
  const f=ui();f.open();await settled();
  const assigned=f.choice.options.find(o=>o.value===String(f.assigned.pawnId))!,incapable=f.choice.options.find(o=>o.value===String(f.incapable.pawnId))!;
  expect(assigned.disabled).toBe(false);expect(assigned.textContent).toContain('non affectée');expect(assigned.textContent).toContain('<nom littéral>');
  expect(incapable.disabled).toBe(true);expect(incapable.textContent).toContain('Ne fera jamais');expect(f.sent).toEqual([]);
  f.choice.value=String(f.assigned.pawnId);f.choice.emit('change');expect(f.range.hidden).toBe(true);expect(f.apply.disabled).toBe(false);
});

test('worker draft never dirties the general bill; naming hides and remembers the range, cancel sends nothing',async()=>{
  const f=ui(),before=JSON.stringify(f.w);f.open();await settled();
  f.min.value='8';f.min.emit('input');f.max.value='12';f.max.emit('change');
  expect(f.form.dataset.dirty).toBeUndefined();expect(f.range.hidden).toBe(false);expect(f.cancel.disabled).toBe(false);
  f.choice.value=String(f.assigned.pawnId);f.choice.emit('change');expect(f.range.hidden).toBe(true);f.update();
  f.choice.value='';f.choice.emit('change');expect(f.range.hidden).toBe(false);expect([f.min.value,f.max.value]).toEqual(['8','12']);
  f.cancel.click();expect([f.choice.value,f.min.value,f.max.value]).toEqual(['','0','20']);expect(f.sent).toEqual([]);expect(JSON.stringify(f.w)).toBe(before);
  f.field('radius').value='12';f.field('radius').emit('input');expect(f.form.dataset.dirty).toBe('true');
  f.min.value='6';f.min.emit('input');f.cancel.click();expect(f.field('radius').value).toBe('12');expect(f.form.dataset.dirty).toBe('true');
});

test('only applying the worker draft sends its independent command and confirmation keeps general fields intact',async()=>{
  const f=ui();f.open();await settled();f.field('target').value='7';f.field('target').emit('input');
  f.min.value='8';f.min.emit('input');f.max.value='12';f.max.emit('input');f.choice.value=String(f.assigned.pawnId);f.choice.emit('change');
  f.apply.click();expect(f.sent).toEqual([{type:'bill-worker-policy',structureId:f.station.id,billId:f.bill.id,policy:{pawnId:f.assigned.pawnId,skillMin:8,skillMax:12}}]);
  await settled();f.update();expect(f.status.textContent).toContain('attente');expect(f.bill.worker).toBeUndefined();expect(f.apply.disabled).toBe(true);
  const command=f.sent[0]!;if(command.type!=='bill-worker-policy')throw Error('Independent admission command expected');
  f.bill.worker={...command.policy};f.update();expect(f.status.textContent).toContain('confirmé');expect(f.cancel.disabled).toBe(true);
  expect(f.field('target').value).toBe('7');expect(f.form.dataset.dirty).toBe('true');expect(f.sent).toHaveLength(1);
});

test('authority updates and asynchronous choices preserve the later unsent draft',async()=>{
  const response=deferred<BillWorkerOptions283>(),f=ui('shirt',()=>response.promise);f.open();
  f.min.value='6';f.min.emit('input');f.max.value='11';f.max.emit('input');
  f.bill.worker={pawnId:f.assigned.pawnId,skillMin:2,skillMax:18};f.update();
  response.resolve(f.options);await settled();expect([f.choice.value,f.min.value,f.max.value]).toEqual(['','6','11']);expect(f.range.hidden).toBe(false);expect(f.sent).toEqual([]);
  f.cancel.click();expect([f.choice.value,f.min.value,f.max.value]).toEqual([String(f.assigned.pawnId),'2','18']);expect(f.range.hidden).toBe(true);
});

test('a confirmed away person keeps its actual metadata without becoming a new candidate or another Pawn',async()=>{
  const f=ui(),awayId=f.w.nextId++;f.bill.worker={pawnId:awayId,skillMin:4,skillMax:15};
  f.options.selected={pawnId:awayId,name:'Même personne absente',level:9,description:'En caravane · ne peut pas travailler ici',enabled:false};f.update();
  const before=JSON.stringify(f.w);f.open();await settled();
  expect(f.choice.value).toBe(String(awayId));expect(f.choice.options.find(o=>o.value===String(awayId))!.textContent).toContain('En caravane');
  expect(f.options.candidates.some(p=>p.pawnId===awayId)).toBe(false);expect(f.worker.textContent).toContain('ne peut pas travailler ici');expect(f.sent).toEqual([]);expect(JSON.stringify(f.w)).toBe(before);
  f.choice.value='';f.choice.emit('change');f.cancel.click();expect(f.choice.value).toBe(String(awayId));
});

test('blank, fractional, reversed and outside ranges cannot send even through the click handler',async()=>{
  const f=ui();f.open();await settled();
  for(const [min,max]of [['','20'],['-1','20'],['1.5','20'],['21','20'],['9','8'],['0','21']]){
    f.min.value=min!;f.max.value=max!;f.min.emit('input');expect(f.apply.disabled).toBe(true);f.apply.onclick!();expect(f.sent).toEqual([]);
  }
  f.cancel.click();f.min.value='20';f.max.value='20';f.min.emit('input');expect(f.apply.disabled).toBe(false);f.apply.click();expect(f.sent).toHaveLength(1);
});

test('failed or mismatched readonly responses explain the error and retain draft without sending commands',async()=>{
  const response=deferred<BillWorkerOptions283>(),f=ui('shirt',()=>response.promise);f.open();f.min.value='5';f.min.emit('input');
  response.reject(new Error('Liste momentanément indisponible'));await settled();expect(f.status.textContent).toContain('momentanément');expect(f.min.value).toBe('5');expect(f.refresh.disabled).toBe(false);
  f.read.mockResolvedValueOnce({...f.options,billId:f.bill.id+1,candidates:[{...f.assigned,name:'Mauvaise facture'}]});f.refresh.click();await settled();
  expect(f.status.textContent).toContain('ne correspond plus');expect(f.choice.textContent).not.toContain('Mauvaise facture');expect(f.min.value).toBe('5');expect(f.sent).toEqual([]);
  f.read.mockResolvedValueOnce(f.options);f.refresh.click();await settled();expect(f.choice.textContent).toContain(f.assigned.name);expect(f.min.value).toBe('5');
});

test('a stale response after schema withdrawal or inspector detachment cannot populate the abandoned selector',async()=>{
  for(const detach of [false,true]){
    const response=deferred<BillWorkerOptions283>(),f=ui('shirt',()=>response.promise);f.open();
    if(detach)f.host.replaceChildren();else f.update({...f.w,schemaVersion:282} as unknown as World);
    response.resolve(f.options);await settled();expect(f.choice.textContent).not.toContain(f.assigned.name);expect(f.sent).toEqual([]);
  }
});

test('recipe skill labels distinguish medicine Intellectual and a recipe with no skill range',async()=>{
  const medicine=ui('make-medicine');medicine.open();await settled();expect(medicine.range.hidden).toBe(false);expect(medicine.range.textContent).toContain('Intellectuel');
  expect(medicine.form.textContent).toContain('Artisanat 4 et Intellectuel 4');
  const burn=ui('burn-apparel');burn.open();await settled();expect(burn.range.hidden).toBe(true);expect(burn.worker.textContent).toContain('ne filtre aucune compétence');
  burn.choice.value=String(burn.assigned.pawnId);burn.choice.emit('change');burn.apply.click();expect(burn.sent).toEqual([{type:'bill-worker-policy',structureId:burn.station.id,billId:burn.bill.id,policy:{pawnId:burn.assigned.pawnId,skillMin:0,skillMax:20}}]);
});
