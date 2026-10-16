import {afterEach,expect,test,vi} from 'vitest';
import {APPAREL,APPAREL_MATERIALS} from '../src/sim/apparel-rules';
import {createApparelPolicyEditor,apparelPolicyKnownUsers,type ApparelPolicyUpdate,type ApparelPolicyEditorCommand} from '../src/ui/apparel-policy-editor';
import {clearForcedWorkshopV388} from './scenarios/clear-forced-v388';

class NodeFixture {
  children:NodeFixture[]=[];dataset:Record<string,string>={};attributes=new Map<string,string>();listeners=new Map<string,Array<(event:Record<string,unknown>)=>void>>();
  textContent='';value='';checked=false;disabled=false;open=false;hidden=false;
  onclick:(()=>void)|null=null;onchange:(()=>void)|null=null;oninput:(()=>void)|null=null;onsubmit:((e:{preventDefault():void})=>void)|null=null;
  set innerHTML(_s:string){throw Error('Saved labels must remain literal.');}
  setAttribute(k:string,v:string){this.attributes.set(k,v);}removeAttribute(k:string){this.attributes.delete(k);}
  replaceChildren(...nodes:NodeFixture[]){this.children=nodes;}
  querySelectorAll<T=NodeFixture>(selector:string):T[]{const key=selector.slice(6,-1).replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase());return this.children.filter(c=>Object.hasOwn(c.dataset,key)) as unknown as T[];}
  addEventListener(name:string,handler:(event:Record<string,unknown>)=>void){this.listeners.set(name,[...(this.listeners.get(name)??[]),handler]);}
  fire(name:string,event:Record<string,unknown>={}){for(const h of this.listeners.get(name)??[])h(event);}
  focus(){}showModal(){this.open=true;}close(){this.open=false;}
}
function dom(){
  const ids=['manage-apparel-policies','apparel-policy-dialog','apparel-policy-choice','apparel-policy-form','apparel-policy-feedback','apparel-policy-draft-status','apply-apparel-policy','cancel-apparel-policy','close-apparel-policies','apparel-min-quality','apparel-max-quality','apparel-min-hp','apparel-max-hp','apparel-policy-users','apparel-policy-elsewhere','copy-apparel-policy','rename-apparel-policy','apparel-policy-name-editor','apparel-policy-name','apparel-policy-name-heading','apparel-policy-name-source','apparel-policy-name-error','confirm-apparel-policy-name','cancel-apparel-policy-name'];
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
  let resolve!:(error:string|null)=>void;const ui=createApparelPolicyEditor(d.root as unknown as HTMLElement,c=>{if(c.type!=='apparel-policy-update')throw Error('Unexpected name command in the existing filter test.');commands.push(c);return new Promise(r=>{resolve=r;});});
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
  const ui=createApparelPolicyEditor(d.root as unknown as HTMLElement,c=>{if(c.type!=='apparel-policy-update')throw Error('Unexpected name command in the existing filter test.');sent.push(c);return new Promise(r=>{resolve=r;});});ui.update(f.world);d.el('manage-apparel-policies').onclick!();
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

test('V404 dirty filters explicitly block names; cancel and invalid input send no registry command',async()=>{
 const f=clearForcedWorkshopV388(),d=dom(),sent:ApparelPolicyEditorCommand[]=[],ui=createApparelPolicyEditor(d.root as unknown as HTMLElement,async c=>{sent.push(c);return null;});const before=JSON.stringify(f.world);ui.update(f.world);d.el('manage-apparel-policies').onclick!();
 d.check('muffalo-wool-tuque').onchange!();expect(d.el('copy-apparel-policy').disabled).toBe(true);expect(d.el('rename-apparel-policy').disabled).toBe(true);expect(d.el('apparel-policy-draft-status').textContent).toContain('Appliquez ou annulez');d.el('copy-apparel-policy').onclick!();expect(sent).toEqual([]);
 d.el('cancel-apparel-policy').onclick!();d.el('manage-apparel-policies').onclick!();d.el('copy-apparel-policy').onclick!();expect(d.el('apparel-policy-name-editor').hidden).toBe(false);d.el('apparel-policy-name').value='Hiver';d.el('cancel-apparel-policy-name').onclick!();expect(d.el('apparel-policy-name-editor').hidden).toBe(true);expect(sent).toEqual([]);
 d.el('copy-apparel-policy').onclick!();for(const invalid of ['','   ','x'.repeat(61),'a\u0001b']){d.el('apparel-policy-name').value=invalid;d.el('confirm-apparel-policy-name').onclick!();await flush();expect(sent).toEqual([]);expect(d.el('apparel-policy-name-error').textContent).toContain('1 à 60');}
 d.el('cancel-apparel-policy-name').onclick!();expect(JSON.stringify(f.world)).toBe(before);
});
test('V404 copy waits for ACK plus the actual new ID/confirmed filters, then selects the copy without assigning',async()=>{
 const f=clearForcedWorkshopV388(),d=dom(),sent:ApparelPolicyEditorCommand[]=[],before=JSON.stringify(f.world),source=f.world.apparelPolicies![0]!,id=f.world.nextApparelPolicyId!;let resolve!:(error:string|null)=>void;
 const ui=createApparelPolicyEditor(d.root as unknown as HTMLElement,c=>{sent.push(c);return new Promise(r=>{resolve=r;});});ui.update(f.world);d.el('manage-apparel-policies').onclick!();d.el('copy-apparel-policy').onclick!();d.el('apparel-policy-name').value='  Hiver  ';d.el('confirm-apparel-policy-name').onclick!();d.el('confirm-apparel-policy-name').onclick!();
 expect(sent).toEqual([{type:'apparel-policy-copy',policyId:source.id,label:'Hiver'}]);expect(d.el('copy-apparel-policy').disabled).toBe(true);expect(d.el('apparel-policy-name').disabled).toBe(true);expect(JSON.stringify(f.world)).toBe(before);
 const confirmed=structuredClone(f.world);confirmed.apparelPolicies!.push({...structuredClone(source),id,label:'Hiver'});confirmed.nextApparelPolicyId=id+1;ui.update(confirmed);expect(d.el('apparel-policy-choice').value).toBe(String(source.id));resolve(null);await flush();expect(d.el('apparel-policy-choice').value).toBe(String(id));expect(d.el('apparel-policy-name-editor').hidden).toBe(true);expect(d.el('apparel-policy-feedback').textContent).toContain('Copie confirmée');expect(d.el('apparel-policy-users').textContent).toContain('Aucune personne affectée');expect(confirmed.pawns).toEqual(f.world.pawns);expect(confirmed.piles).toEqual(f.world.piles);
});
test('V404 refusal keeps the literal name draft, and rename confirms only its original ID',async()=>{
 const f=clearForcedWorkshopV388(),d=dom(),sent:ApparelPolicyEditorCommand[]=[];f.world.apparelPolicies![0]={...f.world.apparelPolicies![0]!,label:'<img src=x> ancien'};const before=JSON.stringify(f.world),id=f.world.apparelPolicies![0]!.id;let resolve!:(error:string|null)=>void;
 const ui=createApparelPolicyEditor(d.root as unknown as HTMLElement,c=>{sent.push(c);return new Promise(r=>{resolve=r;});});ui.update(f.world);d.el('manage-apparel-policies').onclick!();d.el('rename-apparel-policy').onclick!();expect(d.el('apparel-policy-name-source').textContent).toBe('Politique : <img src=x> ancien');d.el('apparel-policy-name').value='Été – Équipe';d.el('confirm-apparel-policy-name').onclick!();resolve('<b>Refus conservé</b>');await flush();expect(d.el('apparel-policy-name-error').textContent).toBe('<b>Refus conservé</b>');expect(d.el('apparel-policy-name').value).toBe('Été – Équipe');expect(d.el('apparel-policy-name').disabled).toBe(false);expect(JSON.stringify(f.world)).toBe(before);
 d.el('confirm-apparel-policy-name').onclick!();resolve(null);await flush();expect(d.el('apparel-policy-name').disabled).toBe(true);ui.update(f.world);expect(d.el('apparel-policy-name-editor').hidden).toBe(false);
 const confirmed=structuredClone(f.world);confirmed.apparelPolicies![0]={...confirmed.apparelPolicies![0]!,label:'Été – Équipe'};ui.update(confirmed);expect(sent).toEqual([{type:'apparel-policy-rename',policyId:id,label:'Été – Équipe'},{type:'apparel-policy-rename',policyId:id,label:'Été – Équipe'}]);expect(d.el('apparel-policy-choice').value).toBe(String(id));expect(d.el('apparel-policy-feedback').textContent).toContain('Nom confirmé');expect(confirmed.nextApparelPolicyId).toBe(f.world.nextApparelPolicyId);expect(confirmed.pawns).toEqual(f.world.pawns);expect(confirmed.piles).toEqual(f.world.piles);
});
