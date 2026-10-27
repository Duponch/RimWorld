// NativeWorld regression: current host guards with actual native page models;
// existing registryCamp owners/preview/readers and real applyCommand callback.
// These are native page-model contracts, not a DOM/renderer/played campaign.
import {test,expect,vi} from 'vitest';
import {buildNativeWorld,setNativeWorldTab,syncNativeWorldState} from '../src/ui3d/native-world';
import type {NativePage,NativeControl,NativeUiActions,NativeUiState} from '../src/ui3d/native-contract';
import type {Command} from '../src/sim/types';
import {applyCommand} from '../src/sim/index';
import {serializeCampaign} from '../src/sim/serialization';
import {campaignPresentation} from '../src/sim/secondary-site-presentation';
import {registryCamp} from './helpers/world-maps-v255';

function fixture(){
 const root=registryCamp(),view=campaignPresentation(root);let page:NativePage;
 const base:NativeUiState={world:view,panel:'world',category:'orders',tool:'select',orientation:0,selectedPawnIds:[],selectedObjects:[],constructionMaterial:'wood',creationStorage:{filters:{wood:true,food:true},priority:0},speed:0,hasGame:true,busy:false,saves:[]};
 let live={...base},captured={...base},dispatch:(command:Command)=>Promise<unknown>=async command=>applyCommand(root,command);
 const command=vi.fn((value:Command)=>dispatch(value)),refresh=vi.fn(),exported:string[]=[];
 const actions:NativeUiActions={command,readState:vi.fn(function(this:NativeUiActions){expect(this).toBe(actions);return live;}),panel:vi.fn(),category:vi.fn(),tool:vi.fn(),selectPawn:vi.fn(),speed:vi.fn(),rotate:vi.fn(),material:vi.fn(),creationStorage:vi.fn(),front:vi.fn(),save:vi.fn(),
  // Declared host export lifecycle: actual fixture serialization, UI busy
  // snapshot published, then the host reader is free. No fake GameSession/Worker.
  exportSave:vi.fn(async()=>{live={...live,busy:true};captured={...live};syncNativeWorldState(captured,actions);try{exported.push(serializeCampaign(root));}finally{live={...live,busy:false};}}),
  showPage:next=>{page=next;},refresh};
 setNativeWorldTab('groups');page=buildNativeWorld(captured,actions);
 const row=(id:string)=>{const r=page.rows.find(r=>r.id===id);if(!r)throw Error('Missing native row '+id);return r;};
 const control=(id:string):NativeControl=>{const c=[...page.rows.flatMap(r=>r.controls??[]),...(page.actions??[])].find(c=>c.id===id);if(!c)throw Error('Missing native control '+id);expect(c.disabled).not.toBe(true);return c;};
 const click=async(id:string)=>{await control(id).onActivate();};
 const input=async(id:string,value:string)=>{const field=row(id).input;expect(field).toBeDefined();expect(await field!.onCommit(value)).not.toBe(false);};
 async function confirm(){
  await click('group-formation-open');expect(page.id).toBe('formation');const person=page.rows.find(r=>r.id.startsWith('formation-person-')&&r.controls?.some(c=>!c.disabled));expect(person).toBeDefined();const memberId=Number(person!.id.slice('formation-person-'.length));await click('formation-person-'+memberId+'-toggle');await input('formation-destination','52');
  const food=root.piles.find(p=>p.owner.type==='ground'&&p.item==='survival-meal'&&p.quantity>=8);expect(food).toBeDefined();await input('formation-pile-'+food!.id,'8');expect(row('formation-draft-preview').value).toBe('Choix admissibles');await click('formation-preview');expect(page.id).toBe('formation-confirm');expect(control('formation-commit')).toBeDefined();
  return {type:'group-start' as const,originMapId:0,memberIds:[memberId],sources:[{pileId:food!.id,quantity:8}],animalIds:[],packedIds:[],destination:52};
 }
 return {root,actions,command,refresh,exported,confirm,row,control,click,input,get page(){return page;},get captured(){return captured;},get live(){return live;},
  flags(snapshot:Pick<NativeUiState,'busy'> & Partial<Pick<NativeUiState,'fault'>>,current:Pick<NativeUiState,'busy'> & Partial<Pick<NativeUiState,'fault'>>){captured={...base,...snapshot};live={...base,...current};syncNativeWorldState(captured,actions);},
  dispatch(next:(command:Command)=>Promise<unknown>){dispatch=next;},
  expectUnchanged(raw:string){expect(serializeCampaign(root)).toBe(raw);},
  expectStarted(expected:Command){expect(command).toHaveBeenCalledExactlyOnceWith(expected);expect(root.worldGroups!.groups).toHaveLength(1);const group=root.worldGroups!.groups[0]!.state;expect(group.phase).toBe('gathering');expect(root.tick).toBe(base.world!.tick);expect(page.id).toBe('world');expect(refresh).toHaveBeenCalledTimes(1);expect(actions.readState).toHaveBeenCalledTimes(1);},
 };
}
test('formation build→draft→confirm→actual export busy snapshot→live free invokes the real group command once',async()=>{
 const f=fixture(),expected=await f.confirm(),raw=serializeCampaign(f.root);await f.actions.exportSave();expect(f.captured.busy).toBe(true);expect(f.live.busy).toBe(false);expect(f.exported).toEqual([raw]);expect(f.page.id).toBe('formation-confirm');await f.click('formation-commit');f.expectStarted(expected);
});
test('a stale captured fault cannot reject a current healthy formation or leak its old message',async()=>{
 const f=fixture(),expected=await f.confirm();f.flags({busy:false,fault:'old captured fault'},{busy:false});await f.click('formation-commit');f.expectStarted(expected);
});
test.each([
 [{busy:false},{busy:true},'Attendez la fin de l’opération courante.'],
 [{busy:false,fault:'obsolete fault'},{busy:false,fault:'new live fault'},'new live fault'],
] as const)('current busy/fault rejects before command, using the SAME live snapshot message (%j → %j)',async(snapshot,current,message)=>{
 const f=fixture();await f.confirm();const before=serializeCampaign(f.root);f.flags(snapshot,current);await expect(f.click('formation-commit')).rejects.toThrow(message);expect(f.command).not.toHaveBeenCalled();expect(f.refresh).not.toHaveBeenCalled();expect(f.actions.readState).toHaveBeenCalledTimes(1);f.expectUnchanged(before);expect(f.page.id).toBe('formation-confirm');
});
test('a missing host reader keeps captured busy/fault guards and permits the existing healthy fallback',async()=>{
 const f=fixture(),expected=await f.confirm(),before=serializeCampaign(f.root);f.actions.readState=undefined;
 for(const [captured,message]of [[{busy:true},'Attendez la fin de l’opération courante.'],[{busy:false,fault:'captured fallback fault'},'captured fallback fault']] as const){f.flags(captured,{busy:false});await expect(f.click('formation-commit')).rejects.toThrow(message);expect(f.command).not.toHaveBeenCalled();expect(f.refresh).not.toHaveBeenCalled();f.expectUnchanged(before);}
 f.flags({busy:false},{busy:false});await f.click('formation-commit');expect(f.command).toHaveBeenCalledExactlyOnceWith(expected);expect(f.refresh).toHaveBeenCalledTimes(1);expect(f.root.worldGroups!.groups).toHaveLength(1);
});
test('pending excludes a second activation; refusal releases pending and refreshes once, allowing a real retry',async()=>{
 const f=fixture(),expected=await f.confirm(),before=serializeCampaign(f.root);let release!:(value:unknown)=>void;const held=new Promise<unknown>(resolve=>{release=resolve;});f.dispatch(()=>held);const first=f.click('formation-commit'),firstRefused=expect(first).rejects.toThrow('declared transport refusal');
 try{await expect(f.click('formation-commit')).rejects.toThrow('Attendez la fin de l’opération courante.');expect(f.command).toHaveBeenCalledTimes(1);expect(f.refresh).not.toHaveBeenCalled();}finally{release({ok:false,reason:'declared transport refusal'});await firstRefused;}
 expect(f.actions.readState).toHaveBeenCalledTimes(2);expect(f.refresh).toHaveBeenCalledTimes(1);f.expectUnchanged(before);expect(f.page.id).toBe('formation-confirm');f.dispatch(async command=>applyCommand(f.root,command));await f.click('formation-commit');expect(f.command).toHaveBeenCalledTimes(2);expect(f.command.mock.calls[1]![0]).toEqual(expected);expect(f.refresh).toHaveBeenCalledTimes(2);expect(f.root.worldGroups!.groups).toHaveLength(1);expect(f.page.id).toBe('world');expect(f.actions.readState).toHaveBeenCalledTimes(3);
});
test('a thrown host command keeps the draft/owners, refreshes and clears pending for real retry',async()=>{
 const f=fixture(),expected=await f.confirm(),before=serializeCampaign(f.root);f.dispatch(async()=>{throw Error('declared callback failure');});await expect(f.click('formation-commit')).rejects.toThrow('declared callback failure');expect(f.command).toHaveBeenCalledExactlyOnceWith(expected);expect(f.refresh).toHaveBeenCalledTimes(1);expect(f.actions.readState).toHaveBeenCalledTimes(1);expect(f.page.id).toBe('formation-confirm');f.expectUnchanged(before);
 f.dispatch(async command=>applyCommand(f.root,command));await f.click('formation-commit');expect(f.command).toHaveBeenCalledTimes(2);expect(f.refresh).toHaveBeenCalledTimes(2);expect(f.root.worldGroups!.groups).toHaveLength(1);expect(f.page.id).toBe('world');
});
test('a thrown host reader propagates before pending/command/refresh and does not poison a later attempt',async()=>{
 const f=fixture(),expected=await f.confirm(),before=serializeCampaign(f.root);const original=f.actions.readState;f.actions.readState=vi.fn(()=>{throw Error('declared live reader failure');});await expect(f.click('formation-commit')).rejects.toThrow('declared live reader failure');expect(f.command).not.toHaveBeenCalled();expect(f.refresh).not.toHaveBeenCalled();f.expectUnchanged(before);f.actions.readState=original;await f.click('formation-commit');f.expectStarted(expected);
});
