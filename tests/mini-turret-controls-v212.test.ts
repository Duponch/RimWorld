import { afterEach,expect,test,vi } from 'vitest';
import { updateMiniTurretControls } from '../src/ui/mini-turret-controls.ts';
import { campTurret,miniTurretCamp } from './scenarios/mini-turret-v212.ts';

/** Focus ownership and safe content only; native input/tooltip placement is
 * verified by the actual browser route rather than this DOM double. */
class ElementFixture {
  children:ElementFixture[]=[];parentElement:ElementFixture|null=null;dataset:Record<string,string>={};attributes=new Map<string,string>();
  className='';type='';tabIndex=-1;disabled=false;onclick:(()=>void)|null=null;onchange:(()=>void)|null=null;private text='';private choice='';
  constructor(readonly tag='div'){}
  set textContent(value:string){this.text=value;this.children=[];}get textContent():string{return this.text+this.children.map(c=>c.textContent).join('');}
  set innerHTML(_value:string){throw Error('Presentation must use textContent.');}
  set value(value:string){this.choice=value;}get value():string{return this.choice||(this.tag==='select'?this.options[0]?.value??'':'');}
  get options():ElementFixture[]{return this.children.filter(c=>c.tag==='option');}
  append(...children:ElementFixture[]):void{for(const c of children){c.parentElement=this;this.children.push(c);}}
  remove():void{if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this);this.parentElement=null;}
  setAttribute(k:string,v:string){this.attributes.set(k,v);}getAttribute(k:string){return this.attributes.get(k)??null;}
  hasAttribute(k:string){return this.attributes.has(k);}removeAttribute(k:string){this.attributes.delete(k);}
  querySelector<T=ElementFixture>(selector:string):T|null{
    const match=/^\[data-([a-z-]+)(?:="([^"]*)")?\]$/.exec(selector);if(!match)throw Error(`Unsupported selector ${selector}`);
    const key=match[1]!.replace(/-([a-z])/g,(_,letter:string)=>letter.toUpperCase());
    for(const c of this.children){if(Object.hasOwn(c.dataset,key)&&(match[2]===undefined||c.dataset[key]===match[2]))return c as T;const nested=c.querySelector<T>(selector);if(nested)return nested;}return null;
  }
}
afterEach(()=>vi.unstubAllGlobals());
test('confirmed updates preserve the worker choice and focusable facts, while policies send no optimistic mutation',()=>{
  vi.stubGlobal('document',{createElement:(tag:string)=>new ElementFixture(tag)});
  const world=miniTurretCamp(),structure=campTurret(world),root=new ElementFixture(),send=vi.fn();structure.turret!.ammoQ=236;world.pawns[0]!.priorities.haul=1;
  world.pawns[0]!.name='<b>Service</b> & canon';
  const update=()=>updateMiniTurretControls(root as unknown as HTMLElement,world,structure,send);update();
  const card=root.querySelector<ElementFixture>('[data-turret-id]')!,worker=card.querySelector<ElementFixture>('[data-turret-worker]')!;
  worker.value=String(world.pawns[0]!.id);worker.onchange!();
  const hold=card.querySelector<ElementFixture>('[data-turret-hold-fire]')!,ammo=card.querySelector<ElementFixture>('[data-turret-fact="ammo"]')!;
  expect(ammo.tabIndex).toBe(0);expect(ammo.hasAttribute('data-tooltip')).toBe(true);
  expect(worker.options[0]!.textContent).toBe('<b>Service</b> & canon');expect(card.textContent).toContain('Désinstallation indisponible');
  const before=JSON.stringify(world);hold.onclick!();expect(send).toHaveBeenLastCalledWith({type:'turret-hold-fire',structureId:structure.id,enabled:true});expect(JSON.stringify(world)).toBe(before);
  structure.turret!.holdFire=true;update();expect(card.querySelector('[data-turret-hold-fire]')).toBe(hold);expect(card.querySelector('[data-turret-fact="ammo"]')).toBe(ammo);
  expect(worker.value).toBe(String(world.pawns[0]!.id));expect(hold.getAttribute('aria-pressed')).toBe('true');
  card.querySelector<ElementFixture>('[data-turret-rearm]')!.onclick!();expect(send).toHaveBeenLastCalledWith({type:'order-haul',pawnId:world.pawns[0]!.id,queue:false,target:{type:'turret',structureId:structure.id}});
});
test('a refused or full service remains keyboard inspectable and sends no order, including a real work incapacity',()=>{
  vi.stubGlobal('document',{createElement:(tag:string)=>new ElementFixture(tag)});
  const world=miniTurretCamp(),structure=campTurret(world),root=new ElementFixture(),send=vi.fn(),pawn=world.pawns[0]!;
  const update=()=>updateMiniTurretControls(root as unknown as HTMLElement,world,structure,send);update();
  const rearm=root.querySelector<ElementFixture>('[data-turret-rearm]')!;expect(rearm.disabled).toBe(false);expect(rearm.getAttribute('aria-disabled')).toBe('true');expect(rearm.hasAttribute('data-tooltip')).toBe(true);
  rearm.onclick!();expect(send).not.toHaveBeenCalled();
  structure.turret!.ammoQ=236;pawn.background={childhood:'school-child',adulthood:'researcher'};pawn.priorities.haul=1;update();
  expect(rearm.getAttribute('aria-disabled')).toBe('true');rearm.onclick!();expect(send).not.toHaveBeenCalled();
  updateMiniTurretControls(root as unknown as HTMLElement,world,undefined,send);expect(root.querySelector('[data-turret-id]')).toBeNull();
});
