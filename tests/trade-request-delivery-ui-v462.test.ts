import {afterEach,expect,test,vi} from 'vitest';
import {createTradeRequestDelivery284} from '../src/ui/trade-request-delivery-284.ts';
import {reorganizationCamp256} from './helpers/group-reorganization-v256.ts';
import {tradeRequestContent284} from '../src/sim/trade-request-content-284.ts';
import {newWeaponState} from '../src/sim/equipment-rules.ts';
import type {GroupPanelSnapshot} from '../src/ui/group-panel.ts';
import type {TradeRequest284,TradeRequestQuote284,TradeRequestCommand284} from '../src/sim/trade-request-state-284.ts';
import type {MaterialPile,World} from '../src/sim/types.ts';

const quotes=vi.hoisted(()=>({quote:vi.fn()}));
vi.mock('../src/sim/trade-request-fulfill-284',()=>({quoteTradeRequestFulfill284:quotes.quote}));

/** DOM/ACK/consent ports only. The quote is explicitly mocked: none of these
 * assertions qualifies physical inventory, diplomacy, carrier allocation,
 * RNG, caravan arrival, or a real request fulfillment transaction. */
class DeliveryNode462 {
 children:DeliveryNode462[]=[];parentElement:DeliveryNode462|null=null;dataset:Record<string,string>={};attributes=new Map<string,string>();
 hidden=false;disabled=false;type='';private value='';private listeners=new Map<string,(()=>void)[]>();
 constructor(readonly tag:string){}
 set textContent(value:string){this.value=value;for(const child of this.children)child.parentElement=null;this.children=[];}
 get textContent():string{return this.value+this.children.map(n=>n.textContent).join(' ');}
 set innerHTML(_value:string){throw Error('Snapshot text must stay literal');}
 append(...nodes:DeliveryNode462[]){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
 remove(){if(this.parentElement){this.parentElement.children=this.parentElement.children.filter(n=>n!==this);this.parentElement=null;}}
 setAttribute(key:string,value:string){this.attributes.set(key,value);}
 addEventListener(name:string,listener:()=>void,options?:{signal?:AbortSignal}){
  const handlers=this.listeners.get(name)??[];handlers.push(listener);this.listeners.set(name,handlers);
  options?.signal?.addEventListener('abort',()=>this.listeners.set(name,(this.listeners.get(name)??[]).filter(fn=>fn!==listener)),{once:true});
 }
 click(){if(!this.disabled)for(const listener of this.listeners.get('click')??[])listener();}
 all(tag:string):DeliveryNode462[]{return this.children.flatMap(n=>[...(n.tag===tag?[n]:[]),...n.all(tag)]);}
}
afterEach(()=>{quotes.quote.mockReset();vi.unstubAllGlobals();});
const settled=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};
function deferred<T>(){let resolve!:(value:T)=>void,reject!:(reason:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}

function setup(pause:null|(()=>Promise<unknown>)=async()=>{},send:(command:TradeRequestCommand284)=>Promise<boolean>=async()=>true){
 const f=reorganizationCamp256(),w=f.w,g=f.g;let version=1;
 const reward:MaterialPile={id:w.nextId++,item:'revolver',kind:'weapon',quantity:1,owner:{type:'trade-request284',requestId:1,optionId:1},weapon:newWeaponState('revolver')};
 // Authored read projection for this widget, not an incident/arrival or a
 // claimed valid full campaign containing this request. The away group and
 // person are the fixture's actual original owners, never a fake World.
 const request:TradeRequest284={id:1,homeMapId:f.record.originMapId,settlementId:1,factionId:1,giverId:g.members[0]!.id,tile:g.tile,settlementName:'Destination <littérale>',offeredAtCore:w.tick*10,offerExpiresAtCore:w.tick*10+240001,durationCore:720000,
  family:'component',quantity:2,baseMarketValue:tradeRequestContent284('component')!.baseMarketValue,wealth:{basis:'known-material-v1',value:0,items:0,structures:0,floors:0,unpricedPiles:0,unpricedPacked:0,unpricedStructures:0,unpricedPawns:g.members.length},rewardBudget:250,
  options:[{id:1,goodwill:20,original:[{id:reward.id,item:reward.item,quantity:1,quality:'normal'}],items:[reward]}],dismissed:false,status:'accepted',cleanup:[],acceptedAtCore:w.tick*10,expiresAtCore:w.tick*10+720000,selectedOptionId:1};
 w.tradeRequests284={revision:1,adoptedAtCore:w.tick*10,nextId:2,entries:[request]};
 const snapshot:GroupPanelSnapshot={world:w,planet:w.planet,group:g,losses:[]};
 const quote=(requestId=1,groupId=g.id):TradeRequestQuote284=>({ok:true,quote:`preview-${version}-${requestId}-${groupId}`,requestId,groupId,available:2,required:2,consumed:[{pileId:g.items[0]!.id,item:'component',quantity:2}],rewards:[{id:reward.id,item:reward.item,quantity:1,quality:'normal',pawnId:g.members[0]!.id}],mass:{grams:40000,capacityGrams:35000}});
 quotes.quote.mockImplementation((_world:World,requestId:number,groupId:number)=>quote(requestId,groupId));
 vi.stubGlobal('document',{createElement:(tag:string)=>new DeliveryNode462(tag)});
 const host=new DeliveryNode462('main'),sent:TradeRequestCommand284[]=[],sender=vi.fn(async(command:TradeRequestCommand284)=>{sent.push(command);return send(command);});
 const ui=createTradeRequestDelivery284(host as unknown as HTMLElement,{send:sender,...pause?{pause}:{}});ui.update(snapshot);
 const button=(label:string)=>host.all('button').find(b=>b.textContent===label)!;
 const prepare=button('Préparer la remise'),confirm=button('Confirmer la remise'),cancel=button('Annuler'),section=host.children[0]!,error=section.children[4]!;
 return {f,w,g,request,snapshot,quote,host,section,error,prepare,confirm,cancel,ui,sent,sender,changeQuote(){version++;}};
}

test('pause acknowledgement precedes the preview and a separate confirmation sends exactly once while busy',async()=>{
 const pauseAck=deferred<unknown>(),sendAck=deferred<boolean>(),pause=vi.fn(()=>pauseAck.promise),f=setup(pause,()=>sendAck.promise);
 expect(f.confirm.hidden).toBe(true);f.prepare.click();expect(pause).toHaveBeenCalledTimes(1);expect(f.confirm.hidden).toBe(true);expect(f.prepare.disabled).toBe(true);expect(f.sent).toEqual([]);
 pauseAck.resolve(undefined);await settled();expect(f.confirm.hidden).toBe(false);expect(f.confirm.disabled).toBe(false);expect(f.sent).toEqual([]);
 expect(f.section.textContent).toContain('Destination <littérale>');expect(f.section.textContent).toContain('(normal)');expect(f.section.textContent).toContain('relations +20');expect(f.section.textContent).toContain('surchargera');
 f.confirm.click();f.confirm.click();expect(f.sent).toEqual([{type:'trade-request-fulfill',requestId:1,groupId:f.g.id,quote:f.quote().quote,confirm:true}]);
 expect(f.prepare.disabled).toBe(true);expect(f.confirm.disabled).toBe(true);expect(f.cancel.disabled).toBe(true);sendAck.resolve(true);await settled();expect(f.confirm.hidden).toBe(true);expect(f.sender).toHaveBeenCalledTimes(1);
});

test('canceling a prepared preview sends no command and another preview needs a new pause acknowledgement',async()=>{
 const pause=vi.fn(async()=>{}),f=setup(pause);f.prepare.click();await settled();expect(f.confirm.hidden).toBe(false);
 f.cancel.click();expect(f.confirm.hidden).toBe(true);expect(f.sent).toEqual([]);f.confirm.click();expect(f.sent).toEqual([]);
 f.prepare.click();await settled();expect(pause).toHaveBeenCalledTimes(2);expect(f.confirm.hidden).toBe(false);expect(f.sent).toEqual([]);
});

test('a changed quote revokes consent both on snapshot update and immediately before confirmation',async()=>{
 const f=setup();f.prepare.click();await settled();const confirm=f.confirm;
 f.changeQuote();f.ui.update({...f.snapshot,world:{...f.w,tick:f.w.tick+1}});expect(confirm.hidden).toBe(true);expect(f.error.textContent).toContain('situation a changé');confirm.click();expect(f.sent).toEqual([]);
 f.prepare.click();await settled();expect(f.confirm).toBe(confirm);expect(confirm.hidden).toBe(false);
 f.changeQuote();confirm.click();await settled();expect(confirm.hidden).toBe(true);expect(f.error.textContent).toContain('remise a changé');expect(f.sent).toEqual([]);
});

test('an external lock revokes an existing preview and unlocking cannot restore its old consent',async()=>{
 const f=setup();f.prepare.click();await settled();expect(f.confirm.hidden).toBe(false);
 f.ui.update(f.snapshot,'Un autre panneau est ouvert.');expect(f.prepare.disabled).toBe(true);expect(f.confirm.hidden).toBe(true);f.confirm.click();expect(f.sent).toEqual([]);
 f.ui.update(f.snapshot);expect(f.prepare.disabled).toBe(false);expect(f.confirm.hidden).toBe(true);f.confirm.click();expect(f.sent).toEqual([]);
 f.prepare.click();await settled();expect(f.confirm.hidden).toBe(false);expect(f.sent).toEqual([]);
});

test('an external lock during a pending pause cancels that opening even when the lock disappears before ACK',async()=>{
 const ack=deferred<unknown>(),f=setup(()=>ack.promise);f.prepare.click();f.ui.update(f.snapshot,'La partie est bloquée.');f.ui.update(f.snapshot);
 ack.resolve(undefined);await settled();expect(f.confirm.hidden).toBe(true);expect(f.sent).toEqual([]);expect(f.prepare.disabled).toBe(false);f.confirm.click();expect(f.sent).toEqual([]);
});

test('the parent soft waiting lock can clear before its own pause ACK without canceling preparation',async()=>{
 const ack=deferred<unknown>(),f=setup(()=>ack.promise);f.prepare.click();
 f.ui.update(f.snapshot,'La pause attend sa réponse.',false);expect(f.prepare.disabled).toBe(true);expect(f.confirm.hidden).toBe(true);
 f.ui.update(f.snapshot,undefined,false);expect(f.confirm.hidden).toBe(true);ack.resolve(undefined);await settled();
 expect(f.confirm.hidden).toBe(false);expect(f.confirm.disabled).toBe(false);expect(f.sent).toEqual([]);
});

test('a group change, reset or disposal prevents a late pause ACK from preparing a latent handover',async()=>{
 for(const action of ['group','reset','dispose'] as const){
  const ack=deferred<unknown>(),f=setup(()=>ack.promise);f.prepare.click();
  // This changed-ID read port is an interface identity stimulus only; no
  // second live group is inserted into the actual campaign by this test.
  if(action==='group')f.ui.update({...f.snapshot,group:{...f.g,id:f.g.id+100}});
  else if(action==='reset')f.ui.reset();else f.ui.dispose();
  ack.resolve(undefined);await settled();expect(f.sent).toEqual([]);
  if(action==='group'){expect(f.confirm.hidden).toBe(true);expect(f.prepare.disabled).toBe(false);}else expect(f.section.parentElement===null||f.section.hidden).toBe(true);
  f.confirm.click();expect(f.sent).toEqual([]);
 }
});

test('missing or rejected pause stays visibly unavailable with no preview or delivery command',async()=>{
 const missing=setup(null);expect(missing.prepare.disabled).toBe(true);expect(missing.section.textContent).toContain('pause du jeu est indisponible');missing.prepare.click();await settled();expect(missing.confirm.hidden).toBe(true);expect(missing.sent).toEqual([]);
 const pause=vi.fn(async():Promise<unknown>=>{throw Error('Pause non confirmée.');}),f=setup(pause);f.prepare.click();await settled();expect(f.error.textContent).toBe('Pause non confirmée.');expect(f.confirm.hidden).toBe(true);expect(f.prepare.disabled).toBe(false);expect(f.sent).toEqual([]);
 pause.mockResolvedValueOnce(undefined);f.prepare.click();await settled();expect(f.confirm.hidden).toBe(false);expect(f.sent).toEqual([]);
});

test('a late send ACK cannot affect the newly selected group or issue a second handover',async()=>{
 const ack=deferred<boolean>(),f=setup(async()=>{},()=>ack.promise);f.prepare.click();await settled();f.confirm.click();expect(f.sent).toHaveLength(1);
 const originalGroup=f.g.id;f.ui.update({...f.snapshot,group:{...f.g,id:originalGroup+100}});expect(f.confirm.hidden).toBe(true);
 ack.resolve(true);await settled();expect(f.confirm.hidden).toBe(true);expect(f.sent).toHaveLength(1);expect(f.sent[0]).toMatchObject({groupId:originalGroup});
});
