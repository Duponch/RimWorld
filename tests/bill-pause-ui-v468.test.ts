import {afterEach,expect,test,vi} from 'vitest';
import {billControls,updateBillControls} from '../src/ui/bill-controls.ts';
import {billPauseControls289} from '../src/ui/bill-pause-controls-289.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {PRODUCTION_RECIPES,type ProductionRecipe} from '../src/sim/production-recipes.ts';
import {SCHEMA_VERSION,type Command,type Structure,type World} from '../src/sim/types.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';

/** Small DOM port shared in shape with the existing bill UI fixtures. These
 * checks concern independent drafts and confirmed publications; native pointer
 * layout and actual production remain the separate muted integration route. */
class UiNode468 {
  children:(UiNode468|string)[]=[];parentElement?:UiNode468;dataset:Record<string,string>={};attributes=new Map<string,string>();
  value='';checked=false;disabled=false;hidden=false;open=false;connected=false;id='';className='';title='';type='';min='';max='';step='';
  onclick:(()=>void)|null=null;private text='';private listeners=new Map<string,((event:UiEvent468)=>void)[]>();
  constructor(readonly tag:string){}
  get isConnected():boolean{return this.connected||!!this.parentElement?.isConnected;}
  get options():UiNode468[]{return this.children.filter((n):n is UiNode468=>n instanceof UiNode468&&n.tag==='option');}
  set textContent(value:string){this.text=value;for(const child of this.children)if(child instanceof UiNode468)child.parentElement=undefined;this.children=[];}
  get textContent():string{return this.text+this.children.map(c=>typeof c==='string'?c:c.textContent).join('');}
  set innerHTML(_value:string){throw Error('Bill pause controls must keep content literal.');}
  append(...nodes:(UiNode468|string)[]){for(const node of nodes){this.children.push(node);if(node instanceof UiNode468)node.parentElement=this;}}
  prepend(...nodes:(UiNode468|string)[]){for(const node of nodes)if(node instanceof UiNode468)node.parentElement=this;this.children.unshift(...nodes);}
  replaceChildren(...nodes:(UiNode468|string)[]){this.textContent='';this.append(...nodes);}
  setAttribute(key:string,value:string){this.attributes.set(key,value);}
  addEventListener(name:string,listener:(event:UiEvent468)=>void){const rows=this.listeners.get(name)??[];rows.push(listener);this.listeners.set(name,rows);}
  emit(name:string,event:UiEvent468={target:this,currentTarget:this,stopped:false,preventDefault(){},stopPropagation(){this.stopped=true;}}){
    event.currentTarget=this;for(const listener of this.listeners.get(name)??[])listener(event);
    if(!event.stopped)this.parentElement?.emit(name,event);
  }
  click(){if(!this.disabled)this.onclick?.();}
  querySelectorAll<T=UiNode468>(selector:string):T[]{
    const attr=/^\[data-([a-z-]+)(?:="([^"]*)")?\]$/.exec(selector),key=attr?.[1]?.replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase());
    const match=(n:UiNode468)=>key?Object.hasOwn(n.dataset,key)&&(attr![2]===undefined||n.dataset[key]===attr![2]):selector.startsWith('.')?n.className.split(' ').includes(selector.slice(1)):n.tag===selector;
    return this.children.flatMap(n=>typeof n==='string'?[]:[...(match(n)?[n]:[]),...n.querySelectorAll<UiNode468>(selector)]) as unknown as T[];
  }
  querySelector<T=UiNode468>(selector:string):T|null{return this.querySelectorAll<T>(selector)[0]??null;}
}
interface UiEvent468 {target:UiNode468;currentTarget:UiNode468;stopped:boolean;key?:string;preventDefault():void;stopPropagation():void}
afterEach(()=>vi.unstubAllGlobals());
const settled=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();await Promise.resolve();};
function deferred(){let resolve!:()=>void,reject!:(reason:unknown)=>void;const promise=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function ui(recipe:ProductionRecipe='shirt',response?:(command:Command)=>unknown){
  vi.stubGlobal('document',{createElement:(tag:string)=>new UiNode468(tag)});
  const w=deconstructionCamp(2,32),bill=newCookingBill(w.nextId++,recipe);bill.mode='until';bill.target=10;
  const station:Structure={id:w.nextId++,kind:'tailor-bench',x:10,z:10,orientation:0,footprint:'standard',material:'wood',bills:[bill]};w.structures.push(station);
  const sent:Command[]=[],send=(command:Command)=>{sent.push(command);return response?.(command);};
  const root=billControls(station,send) as unknown as UiNode468,host=new UiNode468('host');host.connected=true;host.append(root);
  const form=root.querySelector(`[data-bill="${bill.id}"]`)!,pause=form.querySelector('[data-bill-pause]');
  const update=(world:World=w)=>updateBillControls(root as unknown as ParentNode,station,world);update();
  const field=(key:string)=>form.querySelector(`[data-field="${key}"]`)!;
  const part=(key:string)=>pause!.querySelector(`[data-${key}]`)!;
  return {w,bill,station,sent,send,root,host,form,pause,field,part,update};
}
function draft(f:ReturnType<typeof ui>,threshold='5'){
  f.part('bill-pause-enabled').checked=true;f.part('bill-pause-enabled').emit('change');
  f.part('bill-pause-resume-at').value=threshold;f.part('bill-pause-resume-at').emit('input');
}

test('pause controls are prospective, pure, and visible only for current until bills with supported recipes',()=>{
  const f=ui(),before=JSON.stringify(f.w);expect(f.pause!.hidden).toBe(false);
  expect(f.part('bill-pause-enabled').checked).toBe(false);expect(f.part('bill-pause-resume-at').value).toBe('5');
  for(let n=0;n<10;n++)f.update();expect(f.sent).toEqual([]);expect(JSON.stringify(f.w)).toBe(before);expect(f.bill.reservePause).toBeUndefined();
  for(const schemaVersion of [288,287,SCHEMA_VERSION+1]){f.update({...f.w,schemaVersion} as unknown as World);expect(f.pause!.hidden).toBe(true);}
  for(const schemaVersion of [289,SCHEMA_VERSION]){f.update({...f.w,schemaVersion} as unknown as World);expect(f.pause!.hidden).toBe(false);}
  f.update();for(const mode of ['times','forever'] as const){f.bill.mode=mode;f.update();expect(f.pause!.hidden).toBe(true);}
  f.bill.mode='until';f.update();expect(f.pause!.hidden).toBe(false);
  const excluded=new Set(['smelt-weapon','smelt-apparel','cremate-corpse','burn-apparel']);
  for(const recipe of Object.keys(PRODUCTION_RECIPES) as ProductionRecipe[]){
    const bill=newCookingBill(1,recipe);bill.mode='until';
    const control=billPauseControls289(2,bill,()=>{}),node=control.element as unknown as UiNode468;
    control.refresh(f.w,bill,0);expect(node.hidden,recipe).toBe(excluded.has(recipe));
  }
  const slag=ui('smelt-slag');expect(slag.pause!.hidden).toBe(false);
});

test('independent apply sends only policy; snapshots confirm without dirtying or replacing general bill and apparel drafts',async()=>{
  const f=ui();f.field('target').value='17';f.field('target').emit('input');f.field('reserveHpMin').value='55';f.field('reserveHpMin').emit('input');
  draft(f,'4');expect(f.form.dataset.dirty).toBe('true');
  f.part('apply-bill-pause').click();expect(f.sent).toEqual([{type:'bill-pause-policy',structureId:f.station.id,billId:f.bill.id,policy:{enabled:true,resumeAt:4}}]);
  expect(f.bill.reservePause).toBeUndefined();await settled();f.update();expect(f.part('bill-pause-status').textContent).toContain('attente');
  expect(f.part('apply-bill-pause').disabled).toBe(true);
  f.bill.reservePause={enabled:true,resumeAt:4,paused:false};f.update();expect(f.part('bill-pause-status').textContent).toContain('confirmée');
  expect(f.part('cancel-bill-pause').disabled).toBe(true);expect(f.field('target').value).toBe('17');expect(f.field('reserveHpMin').value).toBe('55');expect(f.form.dataset.dirty).toBe('true');
  expect(f.sent).toHaveLength(1);
});

test('pause edits and cancellation never dirty the general form and retain a later unsent draft across publications',()=>{
  const f=ui();draft(f,'3');expect(f.form.dataset.dirty).toBeUndefined();
  f.bill.reservePause={enabled:true,resumeAt:7,paused:true};f.update();expect(f.part('bill-pause-resume-at').value).toBe('3');
  expect(f.part('bill-pause-confirmed').textContent).toContain('reprise à 7');
  f.part('cancel-bill-pause').click();expect(f.part('bill-pause-resume-at').value).toBe('7');expect(f.part('bill-pause-enabled').checked).toBe(true);expect(f.sent).toEqual([]);
  draft(f,'2');f.field('radius').value='12';f.field('radius').emit('input');
  f.form.querySelector('[data-cancel-bill-draft]')!.click();expect(f.part('bill-pause-resume-at').value).toBe('2');expect(f.part('apply-bill-pause').disabled).toBe(false);expect(f.sent).toEqual([]);
});

test('invalid thresholds cannot send, while zero target explicitly uses the disabled minus-one threshold',async()=>{
  const f=ui();
  for(const value of ['','-1','-2','1.5','10','11','10000','NaN']){
    draft(f,value);expect(f.part('apply-bill-pause').disabled,value).toBe(true);f.part('apply-bill-pause').onclick!();expect(f.sent).toEqual([]);
  }
  f.part('cancel-bill-pause').click();f.bill.target=0;f.update();draft(f,'-1');
  expect(f.part('bill-pause-resume-at').min).toBe('-1');expect(f.part('bill-pause-resume-at').disabled).toBe(true);expect(f.pause!.textContent).toContain('aucune quantité');
  f.part('apply-bill-pause').click();expect(f.sent[0]).toEqual({type:'bill-pause-policy',structureId:f.station.id,billId:f.bill.id,policy:{enabled:true,resumeAt:-1}});
  await settled();
});

test('manual resume uses confirmed memory and count, leaves manual suspension and an unsent threshold unchanged',async()=>{
  const f=ui();f.bill.reservePause={enabled:true,resumeAt:5,paused:true};f.bill.suspended=true;f.update();draft(f,'2');
  const before=JSON.stringify(f.w);expect(f.part('resume-bill-pause').hidden).toBe(false);expect(f.part('bill-pause-confirmed').textContent).toContain('Suspension manuelle active');
  f.part('resume-bill-pause').click();expect(f.sent).toEqual([{type:'bill-pause-resume',structureId:f.station.id,billId:f.bill.id}]);expect(JSON.stringify(f.w)).toBe(before);
  await settled();f.bill.reservePause.paused=false;f.update();expect(f.part('resume-bill-pause').hidden).toBe(true);expect(f.part('bill-pause-status').textContent).toContain('Reprise confirmée');
  expect(f.part('bill-pause-resume-at').value).toBe('2');expect(f.bill.suspended).toBe(true);expect(f.bill.reservePause.resumeAt).toBe(5);
  const standalone=billPauseControls289(f.station.id,f.bill,f.send);f.bill.reservePause.paused=true;standalone.refresh(f.w,f.bill,10);
  const button=(standalone.element as unknown as UiNode468).querySelector('[data-resume-bill-pause]')!;expect(button.hidden).toBe(true);button.onclick!();expect(f.sent).toHaveLength(1);
});

test('command rejection retains draft and explains the refusal, with pending controls locked until completion',async()=>{
  const response=deferred(),f=ui('shirt',()=>response.promise);draft(f,'4');f.part('apply-bill-pause').click();
  expect(f.part('bill-pause-enabled').disabled).toBe(true);expect(f.part('cancel-bill-pause').disabled).toBe(true);f.part('apply-bill-pause').onclick!();expect(f.sent).toHaveLength(1);
  response.reject(new Error('Le poste a disparu.'));await settled();expect(f.part('bill-pause-status').textContent).toContain('poste a disparu');
  expect(f.part('bill-pause-resume-at').value).toBe('4');expect(f.part('apply-bill-pause').disabled).toBe(false);expect(f.bill.reservePause).toBeUndefined();
});

test('synchronous refusal and rejected manual resume never fabricate a confirmed state',async()=>{
  const f=ui('shirt',()=>{throw Error('Réglage refusé.');});draft(f,'4');f.part('apply-bill-pause').click();expect(f.part('bill-pause-status').textContent).toContain('Réglage refusé');expect(f.part('apply-bill-pause').disabled).toBe(false);
  const g=ui('shirt',()=>Promise.reject(new Error('Reprise refusée.')));g.bill.reservePause={enabled:true,resumeAt:5,paused:true};g.update();g.part('resume-bill-pause').click();await settled();
  expect(g.part('bill-pause-status').textContent).toContain('Reprise refusée');expect(g.bill.reservePause.paused).toBe(true);expect(g.part('resume-bill-pause').hidden).toBe(false);expect(g.part('resume-bill-pause').disabled).toBe(false);
});

test('stale command rejection after withdrawing the current schema cannot overwrite a later visible draft',async()=>{
  const response=deferred(),f=ui('shirt',()=>response.promise);draft(f,'4');f.part('apply-bill-pause').click();
  f.update({...f.w,schemaVersion:288} as unknown as World);f.update();draft(f,'3');
  response.reject(new Error('Ancienne commande.'));await settled();expect(f.part('bill-pause-resume-at').value).toBe('3');expect(f.part('bill-pause-status').textContent).not.toContain('Ancienne commande');expect(f.part('apply-bill-pause').disabled).toBe(false);
});

test('general bill updates omit reservePause and automatic pause status remains explicit below the target',()=>{
  const f=ui();f.bill.reservePause={enabled:true,resumeAt:5,paused:true};f.update();
  expect(f.form.querySelector('[data-bill-status]')!.textContent).toContain('pause automatique acquise');
  expect(f.part('bill-pause-confirmed').textContent).toContain('0 / 10');expect(f.part('bill-pause-confirmed').textContent).toContain('reprise à 5 ou moins');
  f.form.querySelector('[data-apply-bill]')!.click();const command=f.sent[0]!;expect(command.type).toBe('bill-update');if(command.type!=='bill-update')throw Error('General settings expected');
  expect(Object.hasOwn(command.settings,'reservePause')).toBe(false);expect(Object.hasOwn(command.settings,'worker')).toBe(false);expect(f.bill.reservePause.paused).toBe(true);
});
