import {vi} from 'vitest';
/** Same small DOM fixture contract as group-travel-ui-v256; no browser or SIM
 * behaviour is asserted by these presentation-only nodes. */
export class PreparationNode {
 children:PreparationNode[]=[];parentElement:PreparationNode|null=null;dataset:Record<string,string>={};style:Record<string,string>={};attributes=new Map<string,string>();listeners=new Map<string,Array<(event:Record<string,unknown>)=>void>>();
 open=false;showModal(){this.open=true;}close(){this.open=false;}
 className='';type='';value='';hidden=false;disabled=false;readOnly=false;checked=false;tabIndex=0;private text='';constructor(readonly tag='div'){}
 set textContent(value:string){this.text=value;this.replaceChildren();}get textContent():string{return this.text+this.children.map(c=>c.textContent).join(' ');}
 set innerHTML(_v:string){throw Error('Use literal text.');}
 append(...nodes:PreparationNode[]){for(const n of nodes){n.remove();n.parentElement=this;this.children.push(n);}}
 insertBefore(n:PreparationNode,b:PreparationNode|null){n.remove();n.parentElement=this;const i=b?this.children.indexOf(b):-1;if(i<0)this.children.push(n);else this.children.splice(i,0,n);}
 replaceChildren(...nodes:PreparationNode[]){for(const c of this.children)c.parentElement=null;this.children=[];this.append(...nodes);}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this);this.parentElement=null;}
 setAttribute(k:string,v:string){this.attributes.set(k,v);if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase())]=v;}
 getAttribute(k:string){return this.attributes.get(k)??null;}hasAttribute(k:string){return this.attributes.has(k);}removeAttribute(k:string){this.attributes.delete(k);}
 querySelectorAll(selector:string):PreparationNode[]{if(selector!=='*')throw Error('Only node inventory is needed.');return this.children.flatMap(c=>[c,...c.querySelectorAll('*')]);}
 querySelector(selector:string):PreparationNode|null {if(selector!=='h3')throw Error('Unexpected fixture selector '+selector);return this.querySelectorAll('*').find(n=>n.tag===selector)??null;}
 get options():PreparationNode[]{return this.children.filter(n=>n.tag==='option');}
 addEventListener(k:string,fn:(event:Record<string,unknown>)=>void){const all=this.listeners.get(k)??[];all.push(fn);this.listeners.set(k,all);}
 fire(k:string,event:Record<string,unknown>={}){for(const fn of this.listeners.get(k)??[])fn({target:this,...event});}
}
export function preparationDOM(){vi.stubGlobal('document',{activeElement:null,createElement:(tag:string)=>new PreparationNode(tag),createElementNS:(_ns:string,tag:string)=>new PreparationNode(tag),createTextNode:(text:string)=>{const node=new PreparationNode('#text');node.textContent=text;return node;}});vi.stubGlobal('Element',PreparationNode);vi.stubGlobal('Option',class extends PreparationNode{constructor(label:string,value:string){super('option');this.textContent=label;this.value=value;}});vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());return new PreparationNode();}
export const preparationFind=(host:PreparationNode,key:string)=>host.querySelectorAll('*').find(n=>Object.hasOwn(n.dataset,key))!;
