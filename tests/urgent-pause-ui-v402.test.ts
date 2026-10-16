import {expect,test,vi} from 'vitest';
import {createThreatPausePreference,readThreatPausePreference,threatPauseMode,createDeferredResumeGuard} from '../src/ui/threat-pause-settings';
import {urgentThreatLabel,createUrgentThreatFeedback} from '../src/ui/urgent-threat-feedback';
import type {ThreatPauseMode,UrgentThreatReceipt} from '../src/bridge/urgent-threats';

test('local preference admits only the three modes and unavailable storage keeps Major',()=>{
 for(const value of [null,undefined,'','all','0',{},true])expect(threatPauseMode(value)).toBe('major');
 expect(threatPauseMode('never')).toBe('never');expect(threatPauseMode('any-threat')).toBe('any-threat');
 expect(readThreatPausePreference(()=>{throw Error('Storage denied');})).toBe('major');
});
test('mode waits for worker ack, suppresses duplicate changes and keeps the same initialization barrier',async()=>{
 let accept!:(value:unknown)=>void;const confirm=vi.fn(()=>new Promise(r=>{accept=r;})),store=vi.fn(()=>true),changed=vi.fn();
 const pref=createThreatPausePreference({initial:'major',confirm,store,changed}),pending=pref.set('any-threat'),barrier=pref.whenSettled();
 expect(pref.mode).toBe('major');expect(pref.pending).toBe(true);expect(store).not.toHaveBeenCalled();
 await expect(pref.set('never')).rejects.toThrow('attend');expect(pref.whenSettled()).toBe(barrier);
 accept(undefined);expect(await pending).toBe(true);await barrier;expect(pref.mode).toBe('any-threat');expect(pref.pending).toBe(false);expect(store).toHaveBeenCalledExactlyOnceWith('any-threat');
});
test('stored desired Any is never active if the initial worker ack is refused',async()=>{
 const store=vi.fn(()=>true),confirm=vi.fn(async()=>{throw Error('Transport indisponible');}),pref=createThreatPausePreference({initial:'any-threat',confirm,store,changed:()=>{}});
 expect(pref.mode).toBe('major');const pending=pref.initialize();expect(pref.mode).toBe('major');expect(pref.pending).toBe(true);
 await expect(pending).rejects.toThrow('Transport indisponible');expect(confirm).toHaveBeenCalledExactlyOnceWith('any-threat');expect(pref.mode).toBe('major');expect(pref.pending).toBe(false);expect(store).not.toHaveBeenCalled();
});
test('refused config preserves the genuinely confirmed choice and never stores a false applied mode',async()=>{
 const store=vi.fn(()=>true),confirm=vi.fn(async()=>undefined),pref=createThreatPausePreference({initial:'never',confirm,store,changed:()=>{}});
 expect(pref.mode).toBe('major');await pref.initialize();expect(pref.mode).toBe('never');expect(confirm).toHaveBeenCalledExactlyOnceWith('never');expect(store).not.toHaveBeenCalled();
 confirm.mockRejectedValue(Error('Refus connu'));
 await expect(pref.set('major')).rejects.toThrow('Refus connu');expect(pref.mode).toBe('never');expect(pref.pending).toBe(false);expect(store).not.toHaveBeenCalled();
 await expect(pref.set('bogus' as ThreatPauseMode)).rejects.toThrow('invalide');
});
test('successful ack survives storage failure and initialization adds no artificial persistence',async()=>{
 const store=vi.fn(()=>{throw Error('No quota');}),confirm=vi.fn(async()=>undefined),pref=createThreatPausePreference({initial:'never',confirm,store,changed:()=>{}});
 expect(pref.mode).toBe('major');expect(await pref.initialize()).toBe(true);expect(pref.mode).toBe('never');expect(confirm).toHaveBeenLastCalledWith('never');expect(store).not.toHaveBeenCalled();
 expect(await pref.set('any-threat')).toBe(false);expect(pref.mode).toBe('any-threat');expect(pref.pending).toBe(false);
});
test('urgent confirmation invalidates pending menu/commerce resumes even after explicit play later clears the lock',()=>{
 const guard=createDeferredResumeGuard(),before=guard.capture();expect(guard.allows(before)).toBe(true);
 guard.confirm(true);expect(guard.allows(before)).toBe(false);const during=guard.capture();expect(guard.allows(during)).toBe(false);
 guard.confirm(false);expect(guard.allows(before)).toBe(false);expect(guard.allows(during)).toBe(false);expect(guard.allows(guard.capture())).toBe(true);
 const pending=guard.capture();guard.cancel();expect(guard.allows(pending)).toBe(false);
});

/** Minimal DOM double for this component only; native keyboard/layout and
 * current-map adoption are exercised by the opt-in composed native pilot. */
class Node {
 children:Node[]=[];parent?:Node;attributes=new Map<string,string>();listeners=new Map<string,(e:{stopPropagation():void})=>void>();
 textContent='';className='';id='';type='';hidden=false;disabled=false;dataset:Record<string,string>={};onclick:(()=>unknown)|null=null;
 constructor(readonly ownerDocument:{createElement:()=>Node}){}
 set innerHTML(_text:string){throw Error('Use literal textContent');}
 append(...nodes:Node[]){for(const n of nodes){n.parent=this;this.children.push(n);}}prepend(n:Node){n.parent=this;this.children.unshift(n);}
 replaceChildren(...nodes:Node[]){this.children=[];this.append(...nodes);}remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
 setAttribute(k:string,v:string){this.attributes.set(k,v);}addEventListener(k:string,v:(e:{stopPropagation():void})=>void){this.listeners.set(k,v);}
}
function dom(){const doc:{createElement:()=>Node}={createElement:()=>new Node(doc)},host=new Node(doc);return {host,all:(root:Node):Node[]=>{const walk=(n:Node):Node[]=>[n,...n.children.flatMap(walk)];return walk(root);}};}
const receipt:UrgentThreatReceipt={generation:1,serial:1,pauseRevision:1,paused:true,tick:4012,rows:[{mapId:1,site:'secondary',kind:'raid',totalArrivals:1,lastTick:4012,lastCount:2,actorId:81,delta:1}]};
test('receipt feedback names its true site, keeps the last identity, dedupes and never exposes a resume action',async()=>{
 const d=dom(),view=vi.fn(async()=>undefined),ui=createUrgentThreatFeedback(d.host as unknown as HTMLElement,{view});ui.show(receipt);
 const root=d.host.children[0]!,nodes=d.all(root),texts=nodes.map(n=>n.textContent).join(' ');expect(texts).toContain('Carte 1');expect(texts).toContain('Jeu mis en pause');
 const button=nodes.find(n=>n.textContent==='Voir la carte')!;await button.onclick!();expect(view).toHaveBeenCalledExactlyOnceWith({mapId:1,actorId:81});
 ui.show(structuredClone(receipt));expect(d.all(root).find(n=>n.textContent==='Voir la carte')).toBe(button);
 expect(nodes.filter(n=>n.type==='button').map(n=>n.textContent)).toEqual(['Voir la carte','Fermer']);
 const newer={...receipt,serial:2,rows:[{...receipt.rows[0]!,actorId:82,totalArrivals:2,delta:1}]};ui.show(newer);await d.all(root).find(n=>n.textContent==='Voir la carte')!.onclick!();expect(view).toHaveBeenLastCalledWith({mapId:1,actorId:82});
});
test('target refusal stays literal, and dismissing a pending navigation never resurrects an old receipt',async()=>{
 const d=dom();let resolve!:(reason:string|undefined)=>void;const ui=createUrgentThreatFeedback(d.host as unknown as HTMLElement,{view:()=>new Promise(r=>{resolve=r;})});ui.show({...receipt,paused:false});
 const root=d.host.children[0]!,button=d.all(root).find(n=>n.textContent==='Voir la carte')!,pending=button.onclick!() as Promise<void>;
 expect(button.disabled).toBe(true);resolve('<img src=x> cible absente');await pending;expect(d.all(root).some(n=>n.textContent==='<img src=x> cible absente')).toBe(true);
 const later=button.onclick!() as Promise<void>;d.all(root).find(n=>n.textContent==='Fermer')!.onclick!();resolve('late refusal');await later;expect(root.hidden).toBe(true);
 expect(urgentThreatLabel({...receipt.rows[0]!,kind:'manhunter',mapId:0,site:'home',lastCount:1,delta:2})).toContain('Foyer · Animal en rage');
});
test('distinct map IDs keep true site labels and targets even when legacy site names collide',async()=>{
 const d=dom(),view=vi.fn(async()=>undefined),ui=createUrgentThreatFeedback(d.host as unknown as HTMLElement,{view,mapName:id=>id===3?'Colonie · case65':'Camp · case70'});
 ui.show({...receipt,serial:3,rows:[{...receipt.rows[0]!,mapId:3,actorId:83},{...receipt.rows[0]!,mapId:4,actorId:84}]});
 const root=d.host.children[0]!,buttons=d.all(root).filter(node=>node.textContent==='Voir la carte');expect(root.children[0]!.children[2]!.children.map(node=>node.children[0]!.textContent)).toEqual(['Colonie · case65 · Raid humain · 2 assaillant(s) · 1 nouvelle(s) arrivée(s)','Camp · case70 · Raid humain · 2 assaillant(s) · 1 nouvelle(s) arrivée(s)']);
 await buttons[1]!.onclick!();expect(view).toHaveBeenCalledExactlyOnceWith({mapId:4,actorId:84});
});
