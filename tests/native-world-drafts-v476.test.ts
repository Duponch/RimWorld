import {describe,expect,it,vi} from 'vitest';
import {buildNativeWorld,focusNativeCaravanTrade,setNativeWorldTab} from '../src/ui3d/native-world';
import type {NativePage,NativeUiActions,NativeUiState} from '../src/ui3d/native-contract';
import type {World} from '../src/sim/types';
import {prepareGroupScenario} from '../src/sim/group-scenario';
import {previewCommercialLoading} from '../src/sim/commercial-loading';
import {registryCamp} from './helpers/world-maps-v255';
import {reorganizationCamp256} from './helpers/group-reorganization-v256';
import {campaignPresentation} from '../src/sim/secondary-site-presentation';

/** Native page models only: real prepared owners, no DOM, worker or renderer. */
function fixture(world:World,tab:'maps'|'groups'|'individual'='maps'){
 let page:NativePage;
 const state:NativeUiState={world,panel:'world',category:'orders',tool:'select',orientation:0,selectedPawnIds:[],selectedObjects:[],constructionMaterial:'wood',creationStorage:{filters:{wood:true,food:true},priority:0},speed:0,hasGame:true,busy:false,saves:[]};
 const command=vi.fn(async(_command:Parameters<NativeUiActions['command']>[0])=>({ok:true}));
 const actions:NativeUiActions={command,panel:vi.fn(),category:vi.fn(),tool:vi.fn(),selectPawn:vi.fn(),speed:vi.fn(),rotate:vi.fn(),material:vi.fn(),creationStorage:vi.fn(),front:vi.fn(),save:vi.fn(),exportSave:vi.fn(),showPage:next=>{page=next;},refresh:vi.fn()};
 setNativeWorldTab(tab);page=buildNativeWorld(state,actions);
 const row=(id:string)=>{const value=page.rows.find(row=>row.id===id);if(!value)throw Error(`Missing native row ${id}`);return value;};
 const click=async(id:string)=>{const control=[...page.rows.flatMap(row=>row.controls??[]),...(page.actions??[])].find(control=>control.id===id);if(!control)throw Error(`Missing native control ${id}`);expect(control.disabled).not.toBe(true);await control.onActivate();};
 const commit=async(id:string,text:string)=>{const input=row(id).input;if(!input)throw Error(`Missing native input ${id}`);expect(await input.onCommit(text)).not.toBe(false);};
 return {state,row,click,commit,actions,command,get page(){return page;}};
}
const kg=(grams:number)=>`${(grams/1000).toLocaleString('fr-FR',{maximumFractionDigits:3})} kg`;

describe('native numeric drafts retain the committed choices and recalculate their projections',()=>{
 it('keeps the current page and real owners when a trade-arrival group is no longer at the post',()=>{
  const {w,g}=reorganizationCamp256(),view=campaignPresentation(w),f=fixture(view,'maps'),before=JSON.stringify(view),page=f.page;
  expect(g.phase).toBe('awaiting-entry');
  expect(focusNativeCaravanTrade(f.state,f.actions,g.id)).toBe(false);
  expect(focusNativeCaravanTrade(f.state,f.actions,Number.MAX_SAFE_INTEGER)).toBe(false);
  expect(f.page).toBe(page);expect(JSON.stringify(view)).toBe(before);
  expect(f.command).not.toHaveBeenCalled();expect(f.actions.speed).not.toHaveBeenCalled();
 });
 it('updates the inspected tile and rejects an invalid edit without changing its committed selection',async()=>{
  const f=fixture(registryCamp());await f.commit('world-tile','52');
  expect(f.row('world-tile').input?.value).toBe('52');expect(f.row('world-selected-tile').label).toContain('Case 52');
  await expect(f.commit('world-tile','9007199254740991')).rejects.toThrow('Entier');
  expect(f.row('world-tile').input?.value).toBe('52');expect(f.row('world-selected-tile').label).toContain('Case 52');expect(f.actions.command).not.toHaveBeenCalled();
 });

 it('redisplays a split quantity, updates its summary, and sends exactly that inventory allocation',async()=>{
  const {w,g,members}=reorganizationCamp256(),pile=g.items.find(p=>p.owner.type==='inventory'&&p.item==='survival-meal')!;
  // The UI receives the confirmed selected-map projection, never the complete
  // campaign authority. The raw fixture has no campaignMap presentation rows.
  const view=campaignPresentation(w);expect(view.campaignMap?.revision).toBe(2);
  const f=fixture(view,'groups');await f.click(`world-group-${g.id}-open`);await f.click('group-split');await f.click(`split-person-${members[0]!.id}-toggle`);
  const retainedInput=f.row(`split-pile-${pile.id}`).input!;await f.commit(`split-pile-${pile.id}`,'2');
  expect(retainedInput.value).toBe('2');expect(f.row(`split-pile-${pile.id}`).input?.value).toBe('2');expect(f.row('split-draft-summary').value).toContain('2 unités');
  await expect(f.commit(`split-pile-${pile.id}`,String(pile.quantity+1))).rejects.toThrow('Entier');
  expect(f.row(`split-pile-${pile.id}`).input?.value).toBe('2');expect(f.row('split-draft-summary').value).toContain('2 unités');
  await f.click('split-confirm');expect(f.actions.command).toHaveBeenCalledExactlyOnceWith({type:'group-split',groupId:g.id,memberIds:[members[0]!.id],inventory:[{pileId:pile.id,quantity:2}],packedIds:[],animalIds:[]});
  expect(pile.quantity).toBe(4); // Editing and sending a page model never mutate the owner.
 });

 it('recalculates silver-only loading and preserves that quantity through explicit confirmation',async()=>{
  const w=prepareGroupScenario(),f=fixture(w,'individual');await f.click('commercial-prepare-action');
  const selected=f.page.rows.flatMap(row=>row.controls??[]).find(control=>control.id.startsWith('commercial-person-')&&control.active)!;
  const pawn=w.pawns.find(p=>selected.id===`commercial-person-${p.id}-choose`)!;
  const before=f.row('commercial-draft-mass').value;await f.commit('commercial-silver','25');
  const mass=previewCommercialLoading(w,pawn,2,25);expect(mass).not.toBeNull();if(!mass)throw Error('Prepared loading must be admissible');
  expect(f.row('commercial-silver').input?.value).toBe('25');expect(f.row('commercial-draft-mass').value).toBe(`${kg(mass.grams)} / ${kg(mass.capacityGrams)}`);expect(f.row('commercial-draft-mass').value).not.toBe(before);
  await f.click('commercial-preview');expect(f.row('commercial-money').value).toBe('25');expect(f.row('commercial-load').value).toBe(`${kg(mass.grams)} / ${kg(mass.capacityGrams)}`);expect(f.actions.command).not.toHaveBeenCalled();
  await f.click('commercial-confirm-confirm');expect(f.actions.command).toHaveBeenCalledWith(expect.objectContaining({type:'commercial-start',pawnId:pawn.id,quantity:2,silver:25}));expect(f.command.mock.calls[0]![0]).not.toHaveProperty('cargo');
 });

 it('recalculates textile cargo and keeps a rejected fractional edit out of the sent draft',async()=>{
  const w=prepareGroupScenario(),pile=w.piles.find(p=>p.item==='cloth'&&p.owner.type==='ground')!,f=fixture(w,'individual');await f.click('commercial-prepare-action');
  const selected=f.page.rows.flatMap(row=>row.controls??[]).find(control=>control.id.startsWith('commercial-person-')&&control.active)!;
  const pawn=w.pawns.find(p=>selected.id===`commercial-person-${p.id}-choose`)!;
  await f.commit('commercial-silver','25');await f.commit(`commercial-cargo-${pile.id}`,'4');await f.click('commercial-quantity-3');
  const mass=previewCommercialLoading(w,pawn,3,25,[{pileId:pile.id,quantity:4}]);if(!mass)throw Error('Prepared cargo must be admissible');
  expect(f.row(`commercial-cargo-${pile.id}`).input?.value).toBe('4');expect(f.row('commercial-draft-mass').value).toBe(`${kg(mass.grams)} / ${kg(mass.capacityGrams)}`);
  await expect(f.commit(`commercial-cargo-${pile.id}`,'4.5')).rejects.toThrow('Entier');expect(f.row(`commercial-cargo-${pile.id}`).input?.value).toBe('4');
  await f.click('commercial-preview');await f.click('commercial-confirm-confirm');expect(f.actions.command).toHaveBeenCalledWith(expect.objectContaining({type:'commercial-start',quantity:3,silver:25,cargo:[{pileId:pile.id,quantity:4}]}));
 });
});
