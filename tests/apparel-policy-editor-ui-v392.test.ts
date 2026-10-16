import {afterEach,expect,test,vi} from 'vitest';
import {APPAREL,APPAREL_MATERIALS} from '../src/sim/apparel-rules';
import {createApparelPolicyEditor,apparelPolicyKnownUsers,type ApparelPolicyUpdate} from '../src/ui/apparel-policy-editor';
import {clearForcedWorkshopV388} from './scenarios/clear-forced-v388';

class NodeFixture {
  children:NodeFixture[]=[];dataset:Record<string,string>={};attributes=new Map<string,string>();listeners=new Map<string,Array<(event:Record<string,unknown>)=>void>>();
  textContent='';value='';checked=false;disabled=false;open=false;
  onclick:(()=>void)|null=null;onchange:(()=>void)|null=null;oninput:(()=>void)|null=null;onsubmit:((e:{preventDefault():void})=>void)|null=null;
  set innerHTML(_s:string){throw Error('Saved labels must remain literal.');}
  setAttribute(k:string,v:string){this.attributes.set(k,v);}removeAttribute(k:string){this.attributes.delete(k);}
  replaceChildren(...nodes:NodeFixture[]){this.children=nodes;}
  querySelectorAll<T=NodeFixture>(selector:string):T[]{const key=selector.slice(6,-1).replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase());return this.children.filter(c=>Object.hasOwn(c.dataset,key)) as unknown as T[];}
  addEventListener(name:string,handler:(event:Record<string,unknown>)=>void){this.listeners.set(name,[...(this.listeners.get(name)??[]),handler]);}
  fire(name:string,event:Record<string,unknown>={}){for(const h of this.listeners.get(name)??[])h(event);}
  showModal(){this.open=true;}close(){this.open=false;}
}
function dom(){
  const ids=['manage-apparel-policies','apparel-policy-dialog','apparel-policy-choice','apparel-policy-form','apparel-policy-feedback','apparel-policy-draft-status','apply-apparel-policy','cancel-apparel-policy','close-apparel-policies','apparel-min-quality','apparel-max-quality','apparel-min-hp','apparel-max-hp','apparel-policy-users','apparel-policy-elsewhere'];
  const map=new Map(ids.map(id=>[id,new NodeFixture()])),dialog=map.get('apparel-policy-dialog')!,root=new NodeFixture();
  for(const item of Object.keys(APPAREL)){const n=new NodeFixture();n.dataset.apparelAllowedItem=item;dialog.children.push(n);}
  for(const material of APPAREL_MATERIALS){const n=new NodeFixture();n.dataset.apparelAllowedMaterial=material;dialog.children.push(n);}
  const documentFixture={activeElement:null as NodeFixture|null,createElement:()=>new NodeFixture(),getElementById:(id:string)=>map.get(id)??null};vi.stubGlobal('document',documentFixture);
  const el=(id:string)=>map.get(id)!,check=(item:string)=>dialog.children.find(c=>c.dataset.apparelAllowedItem===item)!;
  return {root,map,el,check,dialog,documentFixture,submit:()=>el('apparel-policy-form').onsubmit!({preventDefault(){}})};
}
afterEach(()=>vi.unstubAllGlobals());
const flush=async()=>{await Promise.resolve();await Promise.resolve();};

test('V392 draft identity survives confirmed refresh and refusal; commands use copied filters and safe labels, without touching the world',async()=>{
  const f=clearForcedWorkshopV388(),d=dom(),commands:ApparelPolicyUpdate[]=[];f.world.pawns[0]!.name='<img src=x> & Ada';
  let resolve!:(error:string|null)=>void;const ui=createApparelPolicyEditor(d.root as unknown as HTMLElement,c=>{commands.push(c);return new Promise(r=>{resolve=r;});});
  const before=JSON.stringify(f.world);ui.update(f.world);d.el('manage-apparel-policies').onclick!();
  expect(d.el('apparel-policy-users').textContent).toContain('<img src=x> & Ada');expect(d.el('apparel-policy-users').textContent).toContain(f.world.pawns[1]!.name);
  const input=d.check('muffalo-wool-tuque');input.checked=true;input.onchange!();d.documentFixture.activeElement=input;
  const refreshed=structuredClone(f.world);refreshed.tick++;refreshed.campaignPeople=[{id:999999,name:'Autre carte',status:'away'}];ui.update(refreshed);
  expect(input.checked).toBe(true);expect(d.documentFixture.activeElement).toBe(input);expect(d.el('apparel-policy-choice').disabled).toBe(true);
  expect(d.el('apparel-policy-elsewhere').textContent).toContain('affectations non visibles ici');d.submit();d.submit();
  expect(commands).toHaveLength(1);expect(Object.keys(commands[0]!).sort()).toEqual(['type','policyId','allowedItems','allowedMaterials','minQuality','maxQuality','minHitPointsPercent','maxHitPointsPercent'].sort());
  expect(commands[0]!.allowedItems).toContain('muffalo-wool-tuque');expect(commands[0]!.allowedItems).not.toBe(f.world.apparelPolicies![0]!.allowedItems);
  resolve('<b>Refus & brouillon conservé</b>');await flush();expect(d.el('apparel-policy-feedback').textContent).toBe('<b>Refus & brouillon conservé</b>');expect(input.checked).toBe(true);expect(input.disabled).toBe(false);
  commands[0]!.allowedItems.length=0;d.submit();expect(commands[1]!.allowedItems).toContain('muffalo-wool-tuque');resolve('Refus');await flush();expect(JSON.stringify(f.world)).toBe(before);
});

test('V392 success waits for confirmed filters, and invalid bounds/cancel preserve the confirmed policy and Auto',async()=>{
  const f=clearForcedWorkshopV388(),d=dom(),sent:ApparelPolicyUpdate[]=[];let resolve!:(error:string|null)=>void;
  const ui=createApparelPolicyEditor(d.root as unknown as HTMLElement,c=>{sent.push(c);return new Promise(r=>{resolve=r;});});ui.update(f.world);d.el('manage-apparel-policies').onclick!();
  d.el('apparel-min-hp').value='80';d.el('apparel-min-hp').oninput!();d.el('apparel-max-hp').value='20';d.el('apparel-max-hp').oninput!();d.submit();expect(sent).toEqual([]);expect(d.el('apparel-policy-feedback').textContent).toContain('minimum ≤ maximum');
  d.el('cancel-apparel-policy').onclick!();expect(d.dialog.open).toBe(false);d.el('manage-apparel-policies').onclick!();expect(d.el('apparel-min-hp').value).toBe('0');
  const input=d.check('muffalo-wool-tuque');input.checked=true;input.onchange!();d.submit();resolve(null);await flush();expect(input.disabled).toBe(true);expect(d.el('apparel-policy-feedback').textContent).toContain('attente');
  const confirmed=structuredClone(f.world),original=confirmed.apparelPolicies![0]!,c=sent[0]!;
  confirmed.apparelPolicies![0]={...original,allowedItems:[...c.allowedItems],allowedMaterials:[...c.allowedMaterials],minQuality:c.minQuality,maxQuality:c.maxQuality,minHitPointsPercent:c.minHitPointsPercent,maxHitPointsPercent:c.maxHitPointsPercent};
  ui.update(confirmed);expect(input.disabled).toBe(false);expect(input.checked).toBe(true);expect(d.el('apparel-policy-choice').disabled).toBe(false);expect(d.el('apparel-policy-feedback').textContent).toContain('Politique appliquée');
  expect(confirmed.pawns).toEqual(f.world.pawns);expect(confirmed.piles).toEqual(f.world.piles);expect(confirmed.apparelPolicies![0]!.id).toBe(original.id);expect(confirmed.apparelPolicies![0]!.label).toBe(original.label);
  const old=structuredClone(confirmed);Object.assign(old,{schemaVersion:89});ui.update(old);expect(d.el('manage-apparel-policies').disabled).toBe(true);
});

test('V392 affected users are only named through accessible owners, including the known traveller',()=>{
  const f=clearForcedWorkshopV388(),away=structuredClone(f.world.pawns[0]!);away.id=f.world.nextId++;away.name='Voyageur <b>';away.apparelPolicyId=1;
  const w=structuredClone(f.world);Object.assign(w,{group:{members:[away]}});const before=JSON.stringify(w),users=apparelPolicyKnownUsers(w,1);
  expect(users).toHaveLength(3);expect(users.some(s=>s.includes('Voyageur <b> (voyage collectif'))).toBe(true);expect(JSON.stringify(w)).toBe(before);
});
