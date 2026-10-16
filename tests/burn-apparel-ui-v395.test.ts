import {afterEach,expect,test,vi} from 'vitest';
import {billControls,updateBillControls,burnApparelDescription} from '../src/ui/bill-controls';
import {newCookingBill} from '../src/sim/cooking-bills';
import {BURN_APPAREL_INPUTS} from '../src/sim/burn-apparel-content';
import {productionWorkTotal} from '../src/sim/production-recipes';
import {pawnWorkPose,WORK_POSE} from '../src/render/work-presentation';
import {actionProgress} from '../src/render/action-feedback';
import {burnApparelWorkshopV395} from './scenarios/burn-apparel-v395';
import type {Command} from '../src/sim/types';

class NodeFixture {
  children:(NodeFixture|string)[]=[];dataset:Record<string,string>={};attributes=new Map<string,string>();
  value='';checked=false;disabled=false;hidden=false;id='';className='';title='';type='';min='';max='';step='';
  onclick:(()=>void)|null=null;private text='';
  constructor(readonly tag:string){}
  set textContent(value:string){this.text=value;this.children=[];}
  get textContent():string{return this.text+this.children.map(c=>typeof c==='string'?c:c.textContent).join('');}
  set innerHTML(_value:string){throw Error('UI text must stay literal.');}
  append(...nodes:(NodeFixture|string)[]){this.children.push(...nodes);}
  addEventListener(_name:string,_listener:unknown){}
  setAttribute(key:string,value:string){this.attributes.set(key,value);}
  querySelectorAll<T=NodeFixture>(selector:string):T[]{
    const attribute=/^\[data-([a-z-]+)(?:="([^"]*)")?\]$/.exec(selector);
    const key=attribute?.[1]?.replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase());
    const match=(node:NodeFixture)=>key?Object.hasOwn(node.dataset,key)&&(attribute![2]===undefined||node.dataset[key]===attribute![2])
      :selector.startsWith('.')?node.className.split(' ').includes(selector.slice(1)):node.tag===selector;
    const all:NodeFixture[]=[];for(const c of this.children)if(c instanceof NodeFixture){if(match(c))all.push(c);all.push(...c.querySelectorAll<NodeFixture>(selector));}
    return all as unknown as T[];
  }
  querySelector<T=NodeFixture>(selector:string):T|null{return this.querySelectorAll<T>(selector)[0]??null;}
}
afterEach(()=>vi.unstubAllGlobals());

test.each(['campfire','electric-crematorium'] as const)('V395 %s exposes only burnable apparel, no product destination and explicit destructive filters',kind=>{
  const f=burnApparelWorkshopV395(),w=f.world,station=w.structures.find(s=>s.id===f.stationId)!;
  station.kind=kind;if(kind==='electric-crematorium')station.power={on:true,parentId:null};
  const bill=newCookingBill(w.nextId++,'burn-apparel');station.bills=[bill];
  vi.stubGlobal('document',{createElement:(tag:string)=>new NodeFixture(tag)});
  const commands:Command[]=[],before=JSON.stringify(w),root=billControls(station,c=>commands.push(c)) as unknown as NodeFixture;
  const add=root.querySelector('[data-add-recipe="burn-apparel"]')!;expect(add).toBeTruthy();
  expect(add.title).toBe(burnApparelDescription);add.onclick!();expect(commands.shift()).toEqual({type:'bill-add',structureId:station.id,recipe:'burn-apparel'});
  const form=root.querySelector(`[data-bill="${bill.id}"]`)!;
  expect(form.querySelector('[data-field="mode"]')!.children.filter(c=>c instanceof NodeFixture).map(c=>(c as NodeFixture).value)).toEqual(['times','forever']);
  expect(form.querySelector('[data-field="destination"]')).toBeNull();
  expect(form.querySelector('[data-field="flak-helmet"]')).toBeNull();
  for(const item of BURN_APPAREL_INPUTS)expect(form.querySelector(`[data-field="${item}"]`)!.checked,item).toBe(false);
  expect(form.querySelector('.bill-cost')!.textContent).toBe(burnApparelDescription);
  expect(form.textContent).not.toContain('25 % des métaux');
  expect(form.querySelector('[data-field="hpMin"]')!.max).toBe('100');
  expect(form.querySelector('[data-field="hpMax"]')!.max).toBe('100');
  form.querySelector('[data-field="cloth-shirt"]')!.checked=true;
  form.querySelector('[data-field="hpMin"]')!.value='0';form.querySelector('[data-field="hpMax"]')!.value='50';
  form.querySelector('[data-field="qualityMin"]')!.value='normal';form.querySelector('[data-field="qualityMax"]')!.value='excellent';
  form.querySelector(`[data-apply-bill="${bill.id}"]`)!.onclick!();
  expect(commands).toHaveLength(1);expect(commands[0]).toMatchObject({type:'bill-update',structureId:station.id,billId:bill.id,
    settings:{mode:'times',target:1,destination:'drop',smeltFilter:{hpMin:0,hpMax:50,qualityMin:'normal',qualityMax:'excellent'}}});
  if(commands[0]!.type!=='bill-update')throw Error('Expected bill update');
  expect(Object.entries(commands[0]!.settings.filters).filter(([,on])=>on)).toEqual([['cloth-shirt',true]]);
  updateBillControls(root as unknown as ParentNode,station,w);expect(add.hidden).toBe(false);expect(add.disabled).toBe(false);
  expect(form.querySelector('[data-bill-status]')!.textContent).toContain('Brûler des vêtements');
  expect(form.querySelector('[data-bill-reason]')!.textContent.length).toBeGreaterThan(0);expect(JSON.stringify(w)).toBe(before);
});

test('V395 existing resident work pose/progress reads the real counter without a new render path or a world write',()=>{
  const f=burnApparelWorkshopV395(),w=f.world,p=w.pawns[0]!,station=w.structures.find(s=>s.id===f.stationId)!;
  const spot={x:station.x,z:station.z-1};p.state='working';p.cooking={recipe:'burn-apparel',stationId:station.id,billId:1,
    spot,actionCell:spot,phase:'work',ingredients:[],progress:productionWorkTotal('burn-apparel')/2,productId:null,storageId:null};
  const before=JSON.stringify(w);expect(pawnWorkPose(p,undefined,station.kind)).toBe(WORK_POSE.craft);
  expect(actionProgress(w,p)).toMatchObject({kind:'production',total:60000,completed:30000,fraction:.5});expect(JSON.stringify(w)).toBe(before);
  p.cooking.phase='gather';expect(pawnWorkPose(p,undefined,station.kind)).toBe(WORK_POSE.ground);expect(actionProgress(w,p)).toBeUndefined();
});
