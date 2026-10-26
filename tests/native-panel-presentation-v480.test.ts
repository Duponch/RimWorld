import {describe,expect,it,vi} from 'vitest';
import {createWorld} from '../src/sim/index';
import {AUTO_SLAUGHTER_SPECIES} from '../src/sim/auto-slaughter-state';
import {buildNativePanel} from '../src/ui3d/native-panels';
import {createNativeTextLexicon,tokenizeNativeText} from '../src/ui3d/native-rich-text';
import type {NativePage,NativeUiActions,NativeUiState} from '../src/ui3d/native-contract';

function fixture(panel:'history'|'animals'){
 const world=createWorld(480331+(panel==='animals'?1:0),16,16),noop=()=>{};
 const state:NativeUiState={world,epoch:480331,panel,category:'structure',tool:'select',orientation:0,
  selectedPawnIds:[],selectedObjects:[],constructionMaterial:'wood',creationStorage:{priority:3,filters:{wood:true,food:true}},speed:0,hasGame:true,busy:false,saves:[]};
 let shown:NativePage|undefined;
 const actions:NativeUiActions={command:vi.fn(async()=>({ok:true})),panel:noop,category:noop,tool:noop,selectPawn:noop,speed:noop,
  rotate:noop,material:noop,creationStorage:noop,front:noop,save:noop,exportSave:noop,showPage:page=>{shown=page;},refresh:noop,readState:()=>state};
 return {world,state,actions,get shown(){return shown;}};
}

describe('native list presentation preserves the original data and actions',()=>{
 it('keeps chronological event content while carrying explicit semantic names and object labels',()=>{
  const f=fixture('history');f.world.pawns[0]!.name='Éloïse';
  f.world.events=[{tick:0,type:'job',message:'Éloïse a cuisiné 1 Repas simple (10 riz).'},
   {tick:12,type:'need',message:'Éloïse se repose.'}];
  const before=JSON.stringify(f.world),page=buildNativePanel(f.state,f.actions)!;
  expect(JSON.stringify(f.world)).toBe(before);expect(f.actions.command).not.toHaveBeenCalled();
  const events=page.rows.filter(row=>row.id.startsWith('event-'));
  expect(events.map(row=>row.value)).toEqual([...f.world.events].reverse().map(event=>event.message));
  expect(events.every(row=>row.presentation==='record'&&row.labelWidth===72)).toBe(true);
  expect(page.rows.filter(row=>row.id.startsWith('economy-')).every(row=>row.presentation==='summary')).toBe(true);
  const spans=tokenizeNativeText(events[1]!.value!,createNativeTextLexicon(page.textEntities));
  expect(spans.some(span=>span.kind==='person'&&span.text==='Éloïse')).toBe(true);
  expect(spans.some(span=>span.kind==='item'&&span.text==='Repas simple')).toBe(true);
  expect(spans.map(span=>span.text).join('')).toBe(events[1]!.value);
 });

 it('keeps every quota action within its species record and decorates the real editor without issuing commands',async()=>{
  const f=fixture('animals'),before=JSON.stringify(f.world),page=buildNativePanel(f.state,f.actions)!;
  expect(page.rows.find(row=>row.id==='animals-quotas-heading')).toMatchObject({label:'Abattage automatique',emphasis:'heading',presentation:'plain'});
  for(const species of AUTO_SLAUGHTER_SPECIES){
   const record=page.rows.find(row=>row.id==='quota-'+species)!;
   expect(record.presentation).toBe('record');expect(record.value).toContain('animaux · limite');expect(record.detail).toContain('gestantes');
   expect(record.controls?.map(control=>control.id)).toEqual(['quota-'+species+'-edit']);
  }
  await page.rows.find(row=>row.id==='quota-hare')!.controls![0]!.onActivate();
  expect(f.shown?.id).toBe('quota-hare');expect(f.shown?.textEntities).toBe(page.textEntities);
  expect(f.shown?.rows.some(row=>row.id==='quota-maxTotal'&&row.input)).toBe(true);
  expect(f.actions.command).not.toHaveBeenCalled();expect(JSON.stringify(f.world)).toBe(before);
 });
});
