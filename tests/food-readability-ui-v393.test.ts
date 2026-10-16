import {afterEach,expect,test,vi} from 'vitest';
import * as reader from '../src/sim/food-readability';
import {readStatusAlerts} from '../src/ui/status-alerts';
import {readFirstDayGuide} from '../src/ui/first-day-guide';
import {createFoodPolicyControls} from '../src/ui/food-policy-controls';
import {queryPawnStatus} from '../src/sim/diagnostics';
import {foodReadabilityWorkshopV393} from './scenarios/food-readability-v393';
import {FOOD_ITEMS} from '../src/sim/food-policy';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
const food=(w:ReturnType<typeof foodReadabilityWorkshopV393>['world'],r?:reader.FoodReadability)=>readFirstDayGuide(w,r).find(s=>s.id==='food')!;
test('V393 abundant forbidden stock is explained consistently and the same-tick policy change removes only the incompatible-type finding',()=>{
  const f=foodReadabilityWorkshopV393(),w=f.world,p=w.pawns[0]!,before=JSON.stringify(w),r=reader.captureFoodReadability(w);
  expect(r.freshNutrition).toBe(18);expect(r.blockedPawnIds).toEqual([p.id]);
  expect(readStatusAlerts(w,r).find(a=>a.key==='food-policy-blocked')).toMatchObject({targets:[],context:{panel:'assign'}});
  expect(food(w,r).status).toBe('started');expect(food(w,r).body).toContain('ne garantit ni accès');expect(queryPawnStatus(w,p,r).code).toBe('food-policy-blocked');expect(JSON.stringify(w)).toBe(before);
  w.foodPolicies[0]={...w.foodPolicies[0]!,allowed:['survival-meal']};const corrected=reader.captureFoodReadability(w);
  expect(corrected.freshNutrition).toBe(r.freshNutrition);expect(corrected.blockedPawnIds).toEqual([]);expect(readStatusAlerts(w,corrected).some(a=>a.key==='food-policy-blocked')).toBe(false);expect(food(w,corrected).status).toBe('ready');
});
test('V393 no evaluable person, engaged meals and unchecked paste never turn a large physical total into guide readiness',()=>{
  const f=foodReadabilityWorkshopV393(),w=f.world,id=f.pawnId,original=reader.captureFoodReadability(w),before=JSON.stringify(w);
  const shape=(status:reader.FoodReadabilityStatus):reader.FoodReadability=>({...original,blockedPawnIds:[],evaluatedPawnIds:[],engagedPawnIds:status==='engaged'?[id]:[],pasteUncheckedPawnIds:status==='paste-unchecked'?[id]:[],excludedPawnIds:status==='excluded'?[id]:[],byPawn:new Map([[id,{pawnId:id,status,freshPileCount:1}]])});
  for(const status of ['engaged','paste-unchecked','excluded'] as const){const reading=shape(status);expect(food(w,reading).status).not.toBe('ready');expect(readStatusAlerts(w,reading).some(a=>a.key==='food-policy-blocked')).toBe(false);}
  expect(food(w,shape('engaged')).detail).toContain('repas engagé');expect(food(w,shape('paste-unchecked')).detail).toContain('Pâte nutritive non évaluée');expect(JSON.stringify(w)).toBe(before);
});
test('V393 injected reading avoids recapture in pure UI readers; standalone calls each capture once',()=>{
  const f=foodReadabilityWorkshopV393(),reading=reader.captureFoodReadability(f.world),spy=vi.spyOn(reader,'captureFoodReadability');
  readStatusAlerts(f.world,reading);readFirstDayGuide(f.world,reading);expect(spy).not.toHaveBeenCalled();
  readStatusAlerts(f.world);expect(spy).toHaveBeenCalledTimes(1);readFirstDayGuide(f.world);expect(spy).toHaveBeenCalledTimes(2);
});

class NodeFixture {
  children:NodeFixture[]=[];dataset:Record<string,string>={};hidden=false;open=false;value='';checked=false;className='';textContent='';type='';scope='';innerHTML='';
  onclick:(()=>void)|null=null;onchange:(()=>void)|null=null;onsubmit:((e:{preventDefault():void})=>void)|null=null;
  append(...n:NodeFixture[]){this.children.push(...n);}replaceChildren(...n:NodeFixture[]){this.children=n;}
  addEventListener(){}setAttribute(){}removeAttribute(){}showModal(){this.open=true;}close(){this.open=false;}
  querySelectorAll<T=NodeFixture>():T[]{return this.children as unknown as T[];}
}
test('V393 Assignations captures once for all rows, and uses the injected cycle reading without one capture per colon',()=>{
  const f=foodReadabilityWorkshopV393(),w=f.world,second=structuredClone(w.pawns[0]!);second.id=w.nextId++;second.name='Second';w.pawns.push(second);
  const map=new Map<string,NodeFixture>(),el=(id:string)=>{let n=map.get(id);if(!n){n=new NodeFixture();map.set(id,n);}return n;};
  const dialog=el('food-policy-dialog');for(const item of FOOD_ITEMS){const c=new NodeFixture();c.dataset.allowedFood=item;dialog.append(c);}
  vi.stubGlobal('document',{createElement:()=>new NodeFixture(),getElementById:el});
  const reading=reader.captureFoodReadability(w),spy=vi.spyOn(reader,'captureFoodReadability'),send=vi.fn(async()=>null),ui=createFoodPolicyControls(new NodeFixture() as unknown as HTMLElement,send);
  ui.update(w,reading);expect(spy).not.toHaveBeenCalled();expect(el('food-policy-rows').children).toHaveLength(2);expect(el('food-policy-rows').children.every(row=>row.children.at(-1)!.textContent.includes('Aucun aliment autorisé parmi les piles fraîches'))).toBe(true);
  ui.update(w);expect(spy).toHaveBeenCalledTimes(1);expect(send).not.toHaveBeenCalled();
});
