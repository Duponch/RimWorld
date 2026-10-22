import {afterEach,expect,test,vi} from 'vitest';
import {createTradeRequests284} from '../src/ui/trade-requests-284.ts';
import {createQuestUI} from '../src/ui/quests.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {generateForeignWorldFactions256,completeWorldFactionRegistry256} from '../src/sim/world-faction-generation.ts';
import {defaultWorldGenerationSettings} from '../src/sim/world-generation-settings.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {tradeRequestContent284} from '../src/sim/trade-request-content-284.ts';
import {initialWorldRegistry} from '../src/sim/world-map-context.ts';
import {campaignOnlySummary} from '../src/sim/world-map-presentation.ts';
import type {Command,MaterialPile,World} from '../src/sim/types.ts';
import type {TradeRequest284} from '../src/sim/trade-request-state-284.ts';

/** Authored DOM port for persistent controls and real command payloads only.
 * Layout, pointer interaction and keyboard behavior remain native UI checks. */
class Node462 {
 children:(Node462|string)[]=[];parentElement:Node462|null=null;dataset:Record<string,string>={};attributes=new Map<string,string>();
 hidden=false;disabled=false;checked=false;id='';type='';name='';value='';className='';tabIndex=0;private ownText='';
 onclick:(()=>void)|null=null;onchange:(()=>void)|null=null;
 constructor(readonly tag:string){}
 get textContent():string{return this.ownText+this.children.map(n=>typeof n==='string'?n:n.textContent).join('');}
 set textContent(value:string){this.ownText=value;for(const n of this.children)if(n instanceof Node462)n.parentElement=null;this.children=[];}
 set innerHTML(_value:string){throw Error('Names must remain literal');}
 append(...nodes:(Node462|string)[]){for(const n of nodes){if(n instanceof Node462){n.remove();n.parentElement=this;}this.children.push(n);}}
 prepend(...nodes:(Node462|string)[]){for(const n of [...nodes].reverse()){if(n instanceof Node462){n.remove();n.parentElement=this;}this.children.unshift(n);}}
 remove(){if(this.parentElement){const parent=this.parentElement;parent.children=parent.children.filter(n=>n!==this);this.parentElement=null;}}
 replaceChildren(...nodes:(Node462|string)[]){this.textContent='';this.append(...nodes);}
 setAttribute(key:string,value:string){this.attributes.set(key,value);}
 focus(){document462.activeElement=this;}
 click(){if(!this.disabled)this.onclick?.();}
 choose(){if(!this.disabled){this.checked=true;this.onchange?.();}}
 querySelectorAll<T=Node462>(selector:string):T[]{
  const attr=/^\[data-([a-z-\d]+)(?:="([^"]*)")?\]$/.exec(selector),key=attr?.[1]?.replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase());
  const matches=(n:Node462)=>key?Object.hasOwn(n.dataset,key)&&(attr![2]===undefined||n.dataset[key]===attr![2]):selector.startsWith('.')?n.className.split(' ').includes(selector.slice(1)):selector.startsWith('#')?n.id===selector.slice(1):n.tag===selector;
  return this.children.flatMap(n=>typeof n==='string'?[]:[...(matches(n)?[n]:[]),...n.querySelectorAll<Node462>(selector)]) as T[];
 }
 querySelector<T=Node462>(selector:string):T|null{return this.querySelectorAll<T>(selector)[0]??null;}
}
let document462:{activeElement:Node462|null;createElement(tag:string):Node462;getElementById(id:string):Node462|null;querySelector(selector:string):Node462|null};
afterEach(()=>vi.unstubAllGlobals());
const settled=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};
function deferred(){let resolve!:(value:unknown)=>void,reject!:(reason:unknown)=>void;const promise=new Promise<unknown>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function fixture(){
 const w=deconstructionCamp(2);(w as {schemaVersion:number}).schemaVersion=284;delete w.gameProfile;delete w.raids;w.tick=100;
 const tiles=Array.from({length:128},(_,i)=>({biome:'temperate-forest' as const,hilliness:'flat' as const,neighbours:[(i+127)%128,(i+1)%128]}));
 const generated=generateForeignWorldFactions256({version:284,tick:100,tiles,selection:defaultWorldGenerationSettings().factions,population:3,nextFactionId:1,nextSettlementId:1,nextThingId:w.nextId,random:new WorldGenerationRandom(718)});
 if(!generated.ok)throw Error(generated.reason);const complete=completeWorldFactionRegistry256({version:284,draft:generated.draft,playerDef:'PlayerColony',name:'Camp témoin',postWorldRandom:new WorldGenerationRandom(718)});
 if(!complete.ok)throw Error(complete.reason);w.worldFactions=complete.registry;w.nextId=generated.nextThingId;
 const faction=w.worldFactions.factions.find(f=>f.def==='OutlanderCivil')!,destination=w.worldFactions.settlements.find(s=>s.factionId===faction.id)!;
 faction.name='Faction <nom>';destination.name='Rive <destination>';const giver=w.worldFactions.leaders.find(l=>l.factionId===faction.id)!.pawn;giver.name='Chef <nom>';
 const thing:MaterialPile={id:w.nextId++,kind:'gold',item:'gold',quantity:5,owner:{type:'trade-request284',requestId:1,optionId:1}};
 const request:TradeRequest284={id:1,homeMapId:0,settlementId:destination.id,factionId:faction.id,giverId:giver.id,tile:destination.tile,settlementName:destination.name,offeredAtCore:1000,offerExpiresAtCore:241001,durationCore:720000,
  family:'component',quantity:2,baseMarketValue:tradeRequestContent284('component')!.baseMarketValue,wealth:{basis:'known-material-v1',value:0,items:0,structures:0,floors:0,unpricedPiles:0,unpricedPacked:0,unpricedStructures:0,unpricedPawns:2},rewardBudget:250,
  options:[{id:1,goodwill:0,original:[{id:thing.id,item:'gold',quantity:5}],items:[thing]},{id:2,goodwill:20,original:[],items:[]}],dismissed:false,status:'offered',cleanup:[]};
 w.tradeRequests284={revision:1,adoptedAtCore:1000,nextId:2,entries:[request]};
 const host=new Node462('main');host.id='quests-content';
 document462={activeElement:null,createElement:tag=>new Node462(tag),getElementById:id=>id===host.id?host:host.querySelector(`#${id}`),querySelector:selector=>host.querySelector(selector)};
 vi.stubGlobal('document',document462);const sent:Command[]=[];
 return {w,request,host,sent,destination};
}

test('commercial offers remain visible through the asylum early return, using real names and no automatic command',()=>{
 const f=fixture(),before=JSON.stringify(f.w),ui=createQuestUI(async c=>{f.sent.push(c);});ui.update(f.w);
 const section=f.host.querySelector('[data-trade-requests284]')!;expect(section.hidden).toBe(false);
 expect(section.textContent).toContain('Faction <nom>');expect(section.textContent).toContain('Chef <nom>');expect(section.textContent).toContain('Rive <destination>');
 expect(section.textContent).toContain('Accepter sous 4 j');expect(section.textContent).toContain('12 j pour livrer');expect(section.textContent).toContain('Relations +20');
 expect(f.host.querySelector('[data-trade-request-answer]')!.disabled).toBe(true);expect(f.sent).toEqual([]);expect(JSON.stringify(f.w)).toBe(before);
});

test('reward draft, focused controls and DOM identity survive ordinary tick snapshots and pending acceptance',async()=>{
 const f=fixture(),pending=deferred(),ui=createTradeRequests284(f.host as unknown as HTMLElement,async c=>{f.sent.push(c);return pending.promise;});ui.update(f.w);
 const radio=f.host.querySelector('[data-trade-reward="2"]')!,answer=f.host.querySelector('[data-trade-request-answer]')!;radio.choose();radio.focus();
 for(let n=1;n<=8;n++)ui.update({...f.w,tick:f.w.tick+n});
 expect(f.host.querySelector('[data-trade-reward="2"]')).toBe(radio);expect(radio.checked).toBe(true);expect(document462.activeElement).toBe(radio);expect(answer.disabled).toBe(false);
 answer.click();expect(f.sent).toEqual([{type:'trade-request-answer',requestId:1,optionId:2}]);expect(answer.disabled).toBe(true);expect(radio.disabled).toBe(true);
 ui.update({...f.w,tick:109});expect(f.host.querySelector('[data-trade-request-answer]')).toBe(answer);expect(radio.checked).toBe(true);
 pending.resolve({ok:true});await settled();expect(answer.disabled).toBe(false);expect(radio.checked).toBe(true);expect(f.request.status).toBe('offered');
});

test('mask and restore send reversible dismissal commands while preserving the unsubmitted reward choice',async()=>{
 const f=fixture(),ui=createTradeRequests284(f.host as unknown as HTMLElement,async c=>{f.sent.push(c);});ui.update(f.w);
 const radio=f.host.querySelector('[data-trade-reward="1"]')!,dismiss=f.host.querySelector('[data-trade-request-dismiss]')!;radio.choose();dismiss.click();await settled();
 expect(f.sent).toEqual([{type:'trade-request-dismiss',requestId:1,dismissed:true}]);expect(f.request.dismissed).toBe(false);
 f.request.dismissed=true;ui.update({...f.w,tick:101});expect(dismiss.textContent).toBe('Restaurer l’offre');expect(f.host.textContent).toContain('Son délai continue');
 dismiss.click();await settled();expect(f.sent[1]).toEqual({type:'trade-request-dismiss',requestId:1,dismissed:false});f.request.dismissed=false;ui.update({...f.w,tick:102});
 expect(f.host.querySelector('[data-trade-reward="1"]')).toBe(radio);expect(radio.checked).toBe(true);expect(f.host.querySelector('[data-trade-request-answer]')!.disabled).toBe(false);
});

test('command errors remain readable and retryable; a lost target disables acceptance without sending another command',async()=>{
 const f=fixture(),send=vi.fn(async(c:Command)=>{f.sent.push(c);throw Error('L’offre a changé.');}),ui=createTradeRequests284(f.host as unknown as HTMLElement,send);ui.update(f.w);
 const radio=f.host.querySelector('[data-trade-reward="2"]')!,answer=f.host.querySelector('[data-trade-request-answer]')!,error=f.host.querySelector('[data-trade-request-error]')!;
 radio.choose();answer.click();await settled();expect(error.textContent).toBe('L’offre a changé.');expect(answer.disabled).toBe(false);expect(radio.checked).toBe(true);
 f.w.worldFactions!.settlements=f.w.worldFactions!.settlements.filter(s=>s!==f.destination);ui.update({...f.w,tick:101});
 expect(answer.disabled).toBe(true);expect(f.host.querySelector('[data-trade-request-status]')!.textContent).toContain('plus disponible');answer.click();expect(send).toHaveBeenCalledTimes(1);
});

test('a real campaign-only summary updates world requests without local arrays, then local presentation returns with the same draft',()=>{
 const f=fixture();initialWorldRegistry(f.w);
 const ui=createQuestUI(async c=>{f.sent.push(c);});ui.update(f.w);
 const local=f.host.querySelector('[data-quest-local]')!,radio=f.host.querySelector('[data-trade-reward="2"]')!;radio.choose();radio.focus();
 const summary=campaignOnlySummary(f.w);for(const key of ['pawns','tiles','resources','width','height'])expect(Object.hasOwn(summary,key)).toBe(false);
 // This uses the real campaign presentation constructor; no map destruction,
 // travel, or full save admission is claimed by this bounded DOM test.
 const before=JSON.stringify(summary);ui.updateCampaign(summary);expect(local.hidden).toBe(true);expect(f.host.querySelector('[data-trade-reward="2"]')).toBe(radio);expect(radio.checked).toBe(true);expect(document462.activeElement).toBe(radio);expect(JSON.stringify(summary)).toBe(before);
 f.request.quantity=7;summary.tick++;ui.updateCampaign(summary);expect(f.host.textContent).toContain('7 Composants');expect(local.hidden).toBe(true);
 f.w.tick=summary.tick+1;ui.update(f.w);expect(local.hidden).toBe(false);expect(f.host.querySelector('[data-trade-reward="2"]')).toBe(radio);expect(radio.checked).toBe(true);expect(f.host.querySelector('[data-trade-request-answer]')!.disabled).toBe(false);expect(f.sent).toEqual([]);
});

test('persistent offer letters open and focus their real row without commands, including campaign-only and lifecycle removal',()=>{
 const f=fixture();initialWorldRegistry(f.w);
 const alerts=new Node462('aside'),panel=new Node462('section'),nav=new Node462('button');alerts.id='alerts';panel.id='quests-panel';panel.hidden=true;
 const originalGet=document462.getElementById;document462.getElementById=id=>id==='alerts'?alerts:id==='quests-panel'?panel:originalGet(id);
 const originalQuery=document462.querySelector;document462.querySelector=selector=>selector==='[data-panel="quests"]'?nav:originalQuery(selector);
 const frames:FrameRequestCallback[]=[];vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.push(callback);return frames.length;});nav.onclick=()=>{panel.hidden=false;};
 const ui=createTradeRequests284(f.host as unknown as HTMLElement,async c=>{f.sent.push(c);});ui.update(f.w);
 const row=f.host.querySelector('[data-trade-request="1"]')!,letter=alerts.querySelector('[data-trade-request-letter="1"]')!,before=JSON.stringify(f.w);
 expect(letter.className).toBe('arrival-letter');expect(letter.textContent).toContain('2 Composants pour Rive <destination>');expect(row.tabIndex).toBe(-1);
 ui.update({...f.w});expect(alerts.querySelector('[data-trade-request-letter="1"]')).toBe(letter);letter.click();expect(panel.hidden).toBe(false);expect(document462.activeElement).toBe(null);frames.shift()!(0);expect(document462.activeElement).toBe(row);expect(f.sent).toEqual([]);expect(JSON.stringify(f.w)).toBe(before);
 f.request.dismissed=true;ui.update(f.w);expect(letter.parentElement).toBe(null);f.request.dismissed=false;ui.update(f.w);expect(alerts.querySelectorAll('[data-trade-request-letter]')).toHaveLength(1);
 // The real summary constructor supplies shared request ownership without a local map.
 const summary=campaignOnlySummary(f.w);ui.update(summary);const summaryLetter=alerts.querySelector('[data-trade-request-letter="1"]')!;expect(summaryLetter).toBe(letter);
 f.request.status='accepted';ui.update(summary);expect(letter.parentElement).toBe(null);f.request.status='offered';ui.update(summary);expect(letter.parentElement).toBe(alerts);
 ui.update({...summary,tick:Math.ceil(f.request.offerExpiresAtCore/10)});expect(letter.parentElement).toBe(null);
 ui.update(f.w);const restored=alerts.querySelector('[data-trade-request-letter="1"]')!;expect(restored).not.toBe(letter);
 ui.update({...f.w,seed:f.w.seed+1,planet:undefined,tradeRequests284:{...f.w.tradeRequests284!,entries:[]}});expect(restored.parentElement).toBe(null);expect(alerts.querySelectorAll('[data-trade-request-letter]')).toHaveLength(0);
 ui.update(f.w);const last=alerts.querySelector('[data-trade-request-letter="1"]')!;ui.update({...f.w,tradeRequests284:{...f.w.tradeRequests284!,entries:[]}});expect(last.parentElement).toBe(null);expect(f.sent).toEqual([]);
});
