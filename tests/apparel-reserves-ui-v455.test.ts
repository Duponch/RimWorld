import {afterEach,expect,test,vi} from 'vitest';
import {billControls,updateBillControls,apparelReserveDescription278} from '../src/ui/bill-controls.ts';
import {newCookingBill,countedProducts,billWanted} from '../src/sim/cooking-bills.ts';
import {queryCookingBillStatus} from '../src/sim/cooking-diagnostics.ts';
import {newApparelCountFilter278} from '../src/sim/apparel-count-278.ts';
import {applyCommand} from '../src/sim/engine.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {apparelReserveWorkshop455} from './scenarios/apparel-reserves-v455.ts';
import type {Command,Structure} from '../src/sim/types.ts';

/** Narrow DOM port of the real controls, including bubbling input/change.
 * Native pointer/layout and rendering remain the separate muted UI route. */
class UiNode455 {
 children:(UiNode455|string)[]=[];parent?:UiNode455;dataset:Record<string,string>={};attributes=new Map<string,string>();
 value='';checked=false;disabled=false;hidden=false;id='';className='';title='';type='';min='';max='';step='';
 onclick:(()=>void)|null=null;private text='';private listeners=new Map<string,(()=>void)[]>();
 constructor(readonly tag:string){}
 set textContent(value:string){this.text=value;this.children=[];}
 get textContent():string{return this.text+this.children.map(c=>typeof c==='string'?c:c.textContent).join('');}
 set innerHTML(_value:string){throw Error('Reserve UI must use literal text.');}
 append(...nodes:(UiNode455|string)[]){for(const node of nodes){this.children.push(node);if(node instanceof UiNode455)node.parent=this;}}
 setAttribute(key:string,value:string){this.attributes.set(key,value);}
 addEventListener(name:string,listener:()=>void){const rows=this.listeners.get(name)??[];rows.push(listener);this.listeners.set(name,rows);}
 emit(name:string){for(const listener of this.listeners.get(name)??[])listener();this.parent?.emit(name);}
 click(){if(!this.disabled)this.onclick?.();}
 querySelectorAll<T=UiNode455>(selector:string):T[]{
  const attr=/^\[data-([a-z-]+)(?:="([^"]*)")?\]$/.exec(selector),key=attr?.[1]?.replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase());
  const match=(n:UiNode455)=>key?Object.hasOwn(n.dataset,key)&&(attr![2]===undefined||n.dataset[key]===attr![2]):selector.startsWith('.')?n.className.split(' ').includes(selector.slice(1)):n.tag===selector;
  return this.children.flatMap(n=>typeof n==='string'?[]:[...(match(n)?[n]:[]),...n.querySelectorAll<UiNode455>(selector)]) as unknown as T[];
 }
 querySelector<T=UiNode455>(selector:string):T|null{return this.querySelectorAll<T>(selector)[0]??null;}
}
afterEach(()=>vi.unstubAllGlobals());
function controls(legacy=false){
 const f=apparelReserveWorkshop455();if(legacy){const old=newCookingBill(f.bill.id,'shirt',277);Object.assign(f.bill,old,{mode:'until',target:1});delete f.bill.apparelCount;}
 vi.stubGlobal('document',{createElement:(tag:string)=>new UiNode455(tag)});const commands:Command[]=[];
 const root=billControls(f.station,c=>commands.push(c)) as unknown as UiNode455;
 const update=()=>updateBillControls(root as unknown as ParentNode,f.station,f.w);update();
 const form=root.querySelector(`[data-bill="${f.bill.id}"]`)!;
 return {...f,root,form,commands,update,field:(key:string)=>form.querySelector(`[data-field="${key}"]`)!,apply:()=>form.querySelector('[data-apply-bill]')!.click(),cancel:()=>form.querySelector('[data-cancel-bill-draft]')!.click()};
}

test('an old apparel bill adopts no reserve filter on inspection, unrelated apply or cancelled explicit activation',()=>{
 const f=controls(true),before=JSON.stringify(f.w),group=f.form.querySelector('[data-apparel-reserve-fields]')!,enable=f.form.querySelector('[data-enable-apparel-reserve]')!;
 expect(f.form.querySelector('[data-apparel-reserve]')!.hidden).toBe(false);expect(enable.hidden).toBe(false);expect(group.hidden).toBe(true);expect(f.commands).toEqual([]);
 f.field('radius').value='12';f.field('radius').emit('input');f.apply();expect(f.commands).toHaveLength(1);
 const ordinary=f.commands[0]!;if(ordinary.type!=='bill-update')throw Error('Actual bill update expected');expect(Object.hasOwn(ordinary.settings,'apparelCount')).toBe(false);expect(ordinary.settings.radius).toBe(12);
 expect(Object.hasOwn(f.bill,'apparelCount')).toBe(false);enable.click();expect(group.hidden).toBe(false);expect(f.form.querySelector('[data-bill-draft]')!.hidden).toBe(false);f.field('reserveHpMin').value='51';f.field('reserveHpMin').emit('input');f.cancel();
 expect(group.hidden).toBe(true);expect(enable.hidden).toBe(false);expect(f.field('radius').value).toBe(String(f.bill.radius));expect(f.commands).toHaveLength(1);expect(JSON.stringify(f.w)).toBe(before);
 enable.click();f.apply();const explicit=f.commands.at(-1)!;if(explicit.type!=='bill-update')throw Error('Explicit bill update expected');expect(explicit.settings.apparelCount).toEqual(newApparelCountFilter278());expect(Object.hasOwn(f.bill,'apparelCount')).toBe(false);
});

test('product reserve is separate from ingredients; cancelling a draft restores only confirmed settings and no command',()=>{
 const f=controls(),before=JSON.stringify(f.w),group=f.form.querySelector('[data-apparel-reserve-fields]')!,ingredients=f.form.querySelector('details')!;
 expect(group.parent).not.toBe(ingredients);expect(f.form.textContent).toContain(apparelReserveDescription278);expect(f.form.textContent).not.toMatch(/migration|schéma|rétroactif/i);
 expect(f.field('reserveHpMin').max).toBe('100');expect(f.field('reserveHpMax').step).toBe('1');expect(f.field('reserveHpMin').value).toBe('51');expect(f.field('reserveIncludeEquipped').checked).toBe(false);
 f.field('reserveHpMin').value='0';f.field('reserveIncludeEquipped').checked=true;f.field('cloth').checked=false;f.field('target').value='7';f.field('target').emit('input');f.update();
 expect(f.form.querySelector('[data-bill-status]')!.textContent).toContain('0 / 1');expect(f.field('target').value).toBe('7');expect(f.field('reserveHpMin').value).toBe('0');expect(f.commands).toEqual([]);expect(JSON.stringify(f.w)).toBe(before);
 f.cancel();expect(f.field('target').value).toBe('1');expect(f.field('reserveHpMin').value).toBe('51');expect(f.field('reserveIncludeEquipped').checked).toBe(false);expect(f.field('cloth').checked).toBe(f.bill.filters.cloth);expect(f.form.querySelector('[data-bill-draft]')!.hidden).toBe(true);expect(f.commands).toEqual([]);expect(JSON.stringify(f.w)).toBe(before);
});

test('only the authoritative applied bill changes the shared counter and target diagnostic, including a loose product and worn original',()=>{
 const f=controls();f.bill.target=2;addMaterial(f.w,'apparel',1,{type:'ground',x:5,z:5},'cloth-shirt');f.update();
 expect(countedProducts(f.w,f.bill)).toBe(1);expect(f.form.querySelector('[data-bill-status]')!.textContent).toContain('1 / 2');expect(billWanted(f.w,f.bill)).toBe(true);
 f.field('reserveHpMin').value='0';f.field('reserveIncludeEquipped').checked=true;f.field('reserveIncludeEquipped').emit('change');f.apply();
 expect(f.commands).toHaveLength(1);const c=f.commands[0]!;if(c.type!=='bill-update')throw Error('Actual update required');expect(c.settings.apparelCount).toMatchObject({hpMin:0,includeEquipped:true});
 f.update();expect(countedProducts(f.w,f.bill)).toBe(1);expect(f.form.querySelector('[data-bill-status]')!.textContent).toContain('1 / 2');expect(f.form.querySelector('[data-bill-draft]')!.hidden).toBe(false);
 expect(applyCommand(f.w,c)).toMatchObject({ok:true});f.update();expect(countedProducts(f.w,f.bill)).toBe(2);expect(billWanted(f.w,f.bill)).toBe(false);expect(queryCookingBillStatus(f.w,f.station,f.bill)).toEqual({code:'target-met',reason:'Seuil de réserve vestimentaire atteint avec les critères confirmés.'});
 expect(f.form.querySelector('[data-bill-status]')!.textContent).toContain('2 / 2 vêtement(s) admis dans la réserve confirmée');expect(f.form.querySelector('[data-bill-status]')!.textContent).not.toMatch(/stocké|porté/);expect(f.form.querySelector('[data-bill-draft]')!.hidden).toBe(true);expect(f.form.querySelector('[data-cancel-bill-draft]')!.disabled).toBe(true);
 f.cancel();expect(f.field('reserveHpMin').value).toBe('0');expect(f.field('reserveIncludeEquipped').checked).toBe(true);expect(f.old.owner).toEqual({type:'apparel',pawnId:f.wearer.id});expect(f.commands).toHaveLength(1);
});

test('an authoritative acknowledgement preserves every later draft field and a later explicit reserve activation',()=>{
 for(const [key,value]of [['mode','forever'],['target','7'],['suspended',true],['cloth',false],['muffalo-wool',false],['radius','12'],['destination','drop'],['reserveHpMin','1'],['reserveHpMax','99'],['reserveQualityMin','good'],['reserveQualityMax','masterwork'],['reserveIncludeEquipped',true]] as const){
  const f=controls();f.field('reserveHpMin').value='0';f.field('reserveHpMin').emit('input');f.apply();const command=f.commands[0]!;
  const field=f.field(key);if(typeof value==='boolean')field.checked=value;else field.value=value;field.emit('change');
  expect(applyCommand(f.w,command)).toMatchObject({ok:true});f.update();expect(f.form.querySelector('[data-bill-draft]')!.hidden,key).toBe(false);expect(typeof value==='boolean'?field.checked:field.value,key).toBe(value);
  f.cancel();expect(f.form.querySelector('[data-bill-draft]')!.hidden,key).toBe(true);expect(f.field('reserveHpMin').value).toBe('0');
 }
 const f=controls(true);f.field('radius').value='12';f.field('radius').emit('input');f.apply();const command=f.commands[0]!;f.form.querySelector('[data-enable-apparel-reserve]')!.click();
 expect(applyCommand(f.w,command)).toMatchObject({ok:true});f.update();expect(f.form.querySelector('[data-bill-draft]')!.hidden).toBe(false);expect(f.form.querySelector('[data-apparel-reserve-fields]')!.hidden).toBe(false);expect(f.bill.apparelCount).toBeUndefined();
});

test('invalid empty, fractional, reversed and outside bounds cannot send an apparel-count update',()=>{
 const f=controls(),before=JSON.stringify(f.w);
 for(const [min,max,qmin,qmax]of [['','100','normal','legendary'],['-1','100','normal','legendary'],['51.5','100','normal','legendary'],['101','100','normal','legendary'],['90','80','normal','legendary'],['0','100','legendary','poor']]){
  f.cancel();f.field('reserveHpMin').value=min!;f.field('reserveHpMax').value=max!;f.field('reserveQualityMin').value=qmin!;f.field('reserveQualityMax').value=qmax!;f.field('reserveHpMin').emit('input');
  expect(f.form.querySelector('[data-apply-bill]')!.disabled).toBe(true);expect(f.form.querySelector('[data-apparel-reserve-error]')!.hidden).toBe(false);f.form.querySelector('[data-apply-bill]')!.onclick!();expect(f.commands).toEqual([]);
 }
 f.cancel();expect(f.form.querySelector('[data-apply-bill]')!.disabled).toBe(false);expect(JSON.stringify(f.w)).toBe(before);
});

test('all twelve existing clothing recipes expose the same product controls; weapon, meal and destruction bills do not',()=>{
 const f=controls();
 for(const recipe of ['tribalwear','shirt','pants','duster','parka','tuque','make-flak-vest','make-flak-helmet','make-recon-helmet','make-recon-armor','make-plate-armor','make-simple-helmet'] as const){
  const bill=newCookingBill(f.w.nextId++,recipe);f.station.bills=[bill];const root=billControls(f.station,()=>{}) as unknown as UiNode455;updateBillControls(root as unknown as ParentNode,f.station,f.w);
  expect(bill.apparelCount).toEqual(newApparelCountFilter278());expect(root.querySelector('[data-apparel-reserve]')!.hidden,recipe).toBe(false);expect(root.querySelector('[data-field="reserveIncludeEquipped"]')!.checked).toBe(false);
 }
 for(const [recipe,kind]of [['make-plasteel-knife','crafting-spot'],['simple-meal','campfire'],['smelt-apparel','electric-smelter'],['burn-apparel','campfire']] as const){
  const station:Structure={...f.station,kind,bills:[newCookingBill(f.w.nextId++,recipe)]};const root=billControls(station,()=>{}) as unknown as UiNode455;expect(root.querySelector('[data-apparel-reserve]')).toBeNull();expect(station.bills![0]!.apparelCount).toBeUndefined();
 }
});
