import {afterEach,expect,test,vi} from 'vitest';
import {createMapRegistryPanel,createMapJumpTo,type MapRegistryState} from '../src/ui/map-registry-panel';
import {SimulationRequestError} from '../src/bridge/protocol';
/** Same small DOM boundary pattern as group-ui-v216/urgent-pause-ui-v402.
 * Native layout, focus traversal and pointer clipping remain ROOT's browser. */
class Node {
 children:Node[]=[];parentElement:Node|null=null;dataset:Record<string,string>={};attributes=new Map<string,string>();
 className='';hidden=false;disabled=false;type='';value='';open=false;isConnected=true;onclick:(()=>unknown)|null=null;onchange:(()=>unknown)|null=null;private text='';
 constructor(readonly ownerDocument:Doc,readonly tag='div'){}
 set textContent(value:string){this.text=value;this.replaceChildren();}get textContent():string{return this.text+this.children.map(n=>n.textContent).join(' ');}
 set innerHTML(_value:string){throw Error('Snapshot names must stay literal.');}
 append(...nodes:Node[]){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
 insertBefore(node:Node,before:Node|null){node.remove();node.parentElement=this;const index=before?this.children.indexOf(before):-1;if(index<0)this.children.push(node);else this.children.splice(index,0,node);}
 replaceChildren(...nodes:Node[]){for(const node of this.children)node.parentElement=null;this.children=[];this.append(...nodes);}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(n=>n!==this);this.parentElement=null;}
 setAttribute(key:string,value:string){this.attributes.set(key,value);}getAttribute(key:string){return this.attributes.get(key)??null;}hasAttribute(key:string){return this.attributes.has(key);}removeAttribute(key:string){this.attributes.delete(key);}
 addEventListener(){}showModal(){this.open=true;}close(){this.open=false;}focus(){this.ownerDocument.activeElement=this;}
}
class Doc {activeElement:Node|null=null;createElement(tag:string){return new Node(this,tag);}}
function dom(){const doc=new Doc(),host=new Node(doc);vi.stubGlobal('HTMLElement',Node);return {host,all(root=host):Node[]{return [root,...root.children.flatMap(node=>this.all(node))];}};}
const facts=():MapRegistryState=>({tick:42,selectedMapId:3,maxSettlements:2,settlements:1,maps:[{id:3,tile:65,name:'Camp <img src=x>',kind:'camp',active:true,createdAt:10,people:1,view:{ok:true},settle:{ok:true},abandon:{ok:true},abandonedPeople:[{id:81,name:'Ada <script>'}],groundItems:7,structures:1}]});
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
afterEach(()=>vi.unstubAllGlobals());
test('settlement waits for explicit confirmation and changes no displayed map before confirmed facts',async()=>{
 const d=dom();let resolve!:(value:unknown)=>void;const settle=vi.fn(()=>new Promise(r=>{resolve=r;})),ui=createMapRegistryPanel(d.host as unknown as HTMLElement,{view:vi.fn(),prepare:vi.fn(),settle,abandon:vi.fn()});ui.update(facts());
 const click=(text:string)=>d.all().find(n=>n.tag==='button'&&n.textContent===text)!.onclick!();
 click('S’installer');expect(settle).not.toHaveBeenCalled();click('Annuler');expect(settle).not.toHaveBeenCalled();
 click('S’installer');const dialog=d.all().find(n=>n.tag==='dialog')!;dialog.children.find(n=>n.tag==='button'&&n.textContent==='S’installer')!.onclick!();expect(settle).toHaveBeenCalledExactlyOnceWith(3);
 expect(d.all().some(n=>n.tag==='p'&&n.textContent.includes('Camp temporaire'))).toBe(true);resolve(undefined);await flush();expect(d.all().some(n=>n.tag==='p'&&n.textContent.includes('Camp temporaire'))).toBe(true);
 const next=facts();next.maps=[{...next.maps[0]!,kind:'settlement'}];next.settlements=2;ui.update(next);expect(d.all().some(n=>n.tag==='p'&&n.textContent.includes('Colonie · case 65'))).toBe(true);
});
test('abandonment names the true affected people and refuses stale consequences without sending',()=>{
 const d=dom(),abandon=vi.fn(),ui=createMapRegistryPanel(d.host as unknown as HTMLElement,{view:vi.fn(),prepare:vi.fn(),settle:vi.fn(),abandon});ui.update(facts());d.all().find(n=>n.tag==='button'&&n.textContent==='Abandonner')!.onclick!();
 const dialog=d.all().find(n=>n.tag==='dialog')!;expect(dialog.textContent).toContain('Ada <script>');expect(dialog.textContent).toContain('7 unité(s) au sol');
 const changed=facts();changed.maps[0]!.abandonedPeople=[{id:82,name:'Noé'}];ui.update(changed);dialog.children.find(n=>n.tag==='button'&&n.textContent==='Abandonner')!.onclick!();expect(abandon).not.toHaveBeenCalled();expect(d.all().some(n=>n.textContent.includes('La situation de cette carte a changé'))).toBe(true);
});
test('unknown outcomes keep the map actions locked until accepted replacement',async()=>{
 const d=dom(),view=vi.fn(async()=>{throw new SimulationRequestError('<img src=x> timeout','unknown');}),ui=createMapRegistryPanel(d.host as unknown as HTMLElement,{view,prepare:vi.fn(),settle:vi.fn(),abandon:vi.fn()}),state=facts();state.maps[0]!.active=false;ui.update(state);
 d.all().find(n=>n.tag==='button'&&n.textContent==='Afficher')!.onclick!();await flush();expect(view).toHaveBeenCalledExactlyOnceWith(3);expect(d.all().find(n=>n.tag==='button'&&n.textContent==='Abandonner')!.disabled).toBe(true);ui.update(state);expect(d.all().find(n=>n.tag==='button'&&n.textContent==='Afficher')!.disabled).toBe(true);
 ui.resetForReplacement();ui.update(state);expect(d.all().find(n=>n.tag==='button'&&n.textContent==='Afficher')!.disabled).toBe(false);
});
test('JumpTo preserves target identity while labels change and ignores stale completion after replacement',async()=>{
 const d=dom();let resolve!:(value:unknown)=>void;const go=vi.fn(()=>new Promise(r=>{resolve=r;})),ui=createMapJumpTo(d.host as unknown as HTMLElement,go);ui.update([{kind:'map',id:3,label:'Camp',active:true},{kind:'group',id:5,label:'Ada'}]);const select=d.all().find(n=>n.tag==='select')!;select.value='group:5';ui.update([{kind:'map',id:3,label:'Colonie',active:true},{kind:'group',id:5,label:'Ada · en voyage'}]);expect(select.value).toBe('group:5');d.all().find(n=>n.tag==='button')!.onclick!();expect(go).toHaveBeenCalledExactlyOnceWith({kind:'group',id:5,label:'Ada · en voyage'});ui.resetForReplacement();ui.update([{kind:'map',id:9,label:'Autre colonie',active:true}]);resolve(undefined);await flush();expect(select.value).toBe('map:9');expect(d.all().find(n=>n.tag==='button')!.disabled).toBe(false);
});