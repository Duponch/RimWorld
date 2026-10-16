import {afterEach,expect,test,vi} from 'vitest';
import {createApparelPolicyControls,forcedApparelByPawn,type ApparelAssignmentCommand} from '../src/ui/apparel-policy-controls';
import {equipmentInspectionView} from '../src/ui/equipment-inspection';
import {equipmentCamp} from './scenarios/equipment';
import {addMaterial} from '../src/sim/materials';

/** Small DOM double for ownership, safe labels and confirmed command dispatch.
 * Actual pointer, panels and tooltip presentation belong to the native route. */
class NodeFixture {
  children:NodeFixture[]=[];parentElement:NodeFixture|null=null;dataset:Record<string,string>={};attributes=new Map<string,string>();
  type='';hidden=false;disabled=false;checked=false;title='';value='';textContent='';onclick:(()=>void)|null=null;onchange:(()=>void)|null=null;
  constructor(readonly tag='div'){}
  append(...nodes:NodeFixture[]){for(const n of nodes){n.parentElement=this;this.children.push(n);}}
  replaceChildren(...nodes:NodeFixture[]){this.children=[];this.append(...nodes);}
  insertBefore(node:NodeFixture,before:NodeFixture|null){node.parentElement=this;const i=before?this.children.indexOf(before):-1;if(i<0)this.children.push(node);else this.children.splice(i,0,node);}
  contains(node:NodeFixture):boolean{return node===this||this.children.some(c=>c.contains(node));}
  closest(tag:string):NodeFixture|null{return this.tag===tag?this:this.parentElement?.closest(tag)??null;}
  setAttribute(k:string,v:string){this.attributes.set(k,v);}removeAttribute(k:string){this.attributes.delete(k);}
  querySelector<T=NodeFixture>(selector:string):T|null{
    const match=/^\[data-([a-z-]+)(?:="([^"]*)")?\]$/.exec(selector);if(!match)throw Error(selector);
    const key=match[1]!.replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase());
    for(const c of this.children){if(Object.hasOwn(c.dataset,key)&&(match[2]===undefined||c.dataset[key]===match[2]))return c as T;const nested=c.querySelector<T>(selector);if(nested)return nested;}return null;
  }
}
afterEach(()=>vi.unstubAllGlobals());
function prepared(){
  const world=equipmentCamp(2),pawn=world.pawns[0]!,other=world.pawns[1]!;world.piles=[];
  const garment=(owner:Parameters<typeof addMaterial>[3],item:'cloth-shirt'|'muffalo-wool-tuque'='cloth-shirt')=>{
    addMaterial(world,'apparel',1,owner,item);const piece=world.piles.at(-1)!;piece.apparel!.forced=true;return piece;
  };
  const worn=garment({type:'apparel',pawnId:pawn.id}),foreign=garment({type:'apparel',pawnId:other.id});
  garment({type:'inventory',pawnId:pawn.id});garment({type:'pawn',pawnId:pawn.id});garment({type:'ground',x:pawn.x,z:pawn.z},'muffalo-wool-tuque');
  return {world,pawn,other,worn,foreign};
}
function dom(ids:number[]){
  const root=new NodeFixture(),feedback=new NodeFixture();
  for(const id of ids){const row=new NodeFixture('tr');for(let i=0;i<4;i++)row.append(new NodeFixture('td'));
    const food=new NodeFixture('select');food.dataset.foodPolicyPawn=String(id);row.children[1]!.append(food);root.append(row);}
  vi.stubGlobal('document',{createElement:(tag:string)=>new NodeFixture(tag),getElementById:()=>feedback});return {root,feedback};
}

test('V388 forced presentation only uses actual apparel owners and never changes the world',()=>{
  const f=prepared(),before=JSON.stringify(f.world),map=forcedApparelByPawn(f.world);
  expect([...map.keys()]).toEqual([f.pawn.id,f.other.id]);expect(map.get(f.pawn.id)).toHaveLength(1);
  expect(equipmentInspectionView(f.world,f.pawn).apparel).toMatchObject([{id:f.worn.id,forced:true}]);
  delete f.worn.apparel!.forced;expect(equipmentInspectionView(f.world,f.pawn).apparel[0]!.forced).toBe(false);
  f.worn.apparel!.forced=true;expect(JSON.stringify(f.world)).toBe(before);
});

test('V388 one button sends the exact command, waits for confirmation and leaves Auto and ownership untouched',async()=>{
  const f=prepared(),{root}=dom([f.pawn.id,f.other.id]);let resolve!:(error:string|null)=>void;
  const sent:ApparelAssignmentCommand[]=[],send=(command:ApparelAssignmentCommand)=>{sent.push(command);return new Promise<string|null>(r=>{resolve=r;});};
  const ui=createApparelPolicyControls(root as unknown as HTMLElement,send);ui.update(f.world);
  const button=root.querySelector<NodeFixture>(`[data-apparel-clear-forced-pawn="${f.pawn.id}"]`)!;
  expect(button.hidden).toBe(false);expect(button.disabled).toBe(false);expect(button.textContent).toBe('Effacer le port forcé');
  const before=JSON.stringify(f.world);button.onclick!();button.onclick!();
  expect(sent).toEqual([{type:'apparel-clear-forced',pawnId:f.pawn.id}]);expect(button.disabled).toBe(true);expect(JSON.stringify(f.world)).toBe(before);
  const confirmed=structuredClone(f.world);delete confirmed.piles.find(p=>p.id===f.worn.id)!.apparel!.forced;ui.update(confirmed);resolve(null);await Promise.resolve();await Promise.resolve();
  expect(button.hidden).toBe(true);expect(button.disabled).toBe(true);
  expect(root.querySelector<NodeFixture>(`[data-apparel-clear-forced-pawn="${f.other.id}"]`)!.hidden).toBe(false);
  expect(root.querySelector<NodeFixture>(`[data-apparel-automation-pawn="${f.pawn.id}"]`)!.checked).toBe(f.pawn.apparelAutomation??false);
});

test('V388 rejection keeps the marker and safe feedback; downed metadata remains available, dead/old schema do not',async()=>{
  const f=prepared(),{root,feedback}=dom([f.pawn.id,f.other.id]);
  const ui=createApparelPolicyControls(root as unknown as HTMLElement,async()=>'<b>Refus & état conservé</b>');ui.update(f.world);
  const button=root.querySelector<NodeFixture>(`[data-apparel-clear-forced-pawn="${f.pawn.id}"]`)!;button.onclick!();await Promise.resolve();await Promise.resolve();
  expect(feedback.textContent).toBe('<b>Refus & état conservé</b>');expect(button.hidden).toBe(false);expect(button.disabled).toBe(false);
  ui.update({...f.world,pawns:f.world.pawns.map(p=>p.id===f.pawn.id?{...p,state:'downed' as const}:p)});expect(button.hidden).toBe(false);
  ui.update({...f.world,pawns:f.world.pawns.map(p=>p.id===f.pawn.id?{...p,state:'dead' as const}:p)});expect(button.hidden).toBe(true);
  const historical=structuredClone(f.world);(historical as {schemaVersion:number}).schemaVersion=89;
  ui.update(historical);expect(button.hidden).toBe(true);
});
