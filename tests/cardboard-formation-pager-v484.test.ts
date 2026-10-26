import {expect,test,vi} from 'vitest';
import {buildNativeWorld,setNativeWorldTab} from '../src/ui3d/native-world';
import {layoutNativePage} from '../src/ui3d/native-layout';
import type {NativeControl,NativePage,NativeUiActions,NativeUiState} from '../src/ui3d/native-contract';
import {groupSourceChoices} from '../src/sim/group-authority';
import {registryCamp} from './helpers/world-maps-v255';
import type {MaterialPile} from '../src/sim/types';

/** Declared initial UI fixture: extra finite ration piles, no loading, trip or
 * World tick played. Callbacks below edit page drafts and a command recorder;
 * they never dispatch a browser action or execute a SIM departure. */
function fixture(extra=35){
  const world=registryCamp();
  for(let i=0;i<extra;i++)world.piles.push({id:world.nextId++,kind:'food',item:'survival-meal',quantity:10,
    owner:{type:'ground',x:2+i%8,z:21+Math.floor(i/8)}} satisfies MaterialPile);
  const all=groupSourceChoices(world),destination=world.planet!.civilianTile;
  let page:NativePage;
  const state:NativeUiState={world,panel:'world',category:'orders',tool:'select',orientation:0,selectedPawnIds:[],selectedObjects:[],
    constructionMaterial:'wood',creationStorage:{filters:{wood:true,food:true},priority:0},speed:0,hasGame:true,busy:false,saves:[]};
  const command=vi.fn(async(_value:Parameters<NativeUiActions['command']>[0])=>({ok:true}));
  const actions:NativeUiActions={command,panel:vi.fn(),category:vi.fn(),tool:vi.fn(),selectPawn:vi.fn(),speed:vi.fn(),rotate:vi.fn(),
    material:vi.fn(),creationStorage:vi.fn(),front:vi.fn(),save:vi.fn(),exportSave:vi.fn(),showPage:next=>{page=next;},refresh:vi.fn()};
  setNativeWorldTab('groups');page=buildNativeWorld(state,actions);
  const row=(id:string)=>{const found=page.rows.find(row=>row.id===id);if(!found)throw Error('Missing native row '+id);return found;};
  const control=(id:string):NativeControl=>{const found=[...page.rows.flatMap(row=>row.controls??[]),...page.actions??[]].find(c=>c.id===id);if(!found)throw Error('Missing native control '+id);return found;};
  const click=async(id:string)=>{const c=control(id);expect(c.disabled).not.toBe(true);await c.onActivate();};
  const commit=async(id:string,value:string)=>{const input=row(id).input;if(!input)throw Error('Missing native input '+id);expect(await input.onCommit(value)).not.toBe(false);};
  const visible=()=>page.rows.filter(row=>/^formation-pile-\d+$/.test(row.id));
  return {world,all,destination,state,actions,command,row,control,click,commit,visible,get page(){return page;}};
}

test('formation exposes at most sixteen real source inputs and an exact first-page count',async()=>{
  const f=fixture(),before=JSON.stringify(f.world);await f.click('group-formation-open');
  expect(f.visible()).toHaveLength(16);
  expect(f.visible().map(row=>row.id)).toEqual(f.all.slice(0,16).map(c=>`formation-pile-${c.pile.id}`));
  expect(f.row('formation-sources-page').value).toBe(`1–16 / ${f.all.length}`);
  expect(JSON.stringify(f.world)).toBe(before);expect(f.command).not.toHaveBeenCalled();
});

test('previous and next reach a partial final page with natural labels, boundary states and quantity-preserving hints',async()=>{
  const f=fixture();await f.click('group-formation-open');
  expect(f.control('formation-sources-previous')).toMatchObject({label:'Précédents',disabled:true});
  expect(f.control('formation-sources-next')).toMatchObject({label:'Suivants',disabled:false});
  expect(f.control('formation-sources-next').hint).toContain('quantités choisies sont conservées');
  await f.click('formation-sources-next');await f.click('formation-sources-next');
  expect(f.visible()).toHaveLength(f.all.length-32);
  expect(f.row('formation-sources-page').value).toBe(`33–${f.all.length} / ${f.all.length}`);
  expect(f.control('formation-sources-next').disabled).toBe(true);expect(f.control('formation-sources-previous').disabled).toBe(false);
  await f.click('formation-sources-previous');expect(f.row('formation-sources-page').value).toBe(`17–32 / ${f.all.length}`);
  expect(f.command).not.toHaveBeenCalled();
});

test('quantities survive page changes and confirmation forwards all pages to the existing formation authority',async()=>{
  const f=fixture(),before=JSON.stringify(f.world),first=f.all[0]!.pile.id,second=f.all[16]!.pile.id;
  await f.click('group-formation-open');await f.click(`formation-person-${f.world.pawns[0]!.id}-toggle`);await f.commit('formation-destination',String(f.destination));
  await f.commit(`formation-pile-${first}`,'4');await f.click('formation-sources-next');await f.commit(`formation-pile-${second}`,'2');
  await f.click('formation-sources-previous');expect(f.row(`formation-pile-${first}`).input?.value).toBe('4');
  await f.click('formation-sources-next');expect(f.row(`formation-pile-${second}`).input?.value).toBe('2');
  expect(f.row('formation-draft-preview').value).toBe('Choix admissibles');await f.click('formation-preview');await f.click('formation-commit');
  expect(f.command).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({type:'group-start',destination:f.destination,
    sources:[{pileId:first,quantity:4},{pileId:second,quantity:2}].sort((a,b)=>a.pileId-b.pileId)}));
  expect(f.command.mock.calls[0]![0]).not.toHaveProperty('sourcePage');expect(JSON.stringify(f.world)).toBe(before);
});

test('fresh source shrink clamps the current page and removes unnecessary paging controls',async()=>{
  const f=fixture();await f.click('group-formation-open');await f.click('formation-sources-next');await f.click('formation-sources-next');
  const keep=new Set(f.all.slice(0,8).map(c=>c.pile.id));f.world.piles=f.world.piles.filter(p=>p.owner.type!=='ground'||keep.has(p.id));
  const before=JSON.stringify(f.world);await f.commit('formation-destination',String(f.destination));
  expect(f.visible()).toHaveLength(8);expect(f.visible().map(row=>row.id)).toEqual(f.all.slice(0,8).map(c=>`formation-pile-${c.pile.id}`));
  expect(f.page.rows.some(row=>row.id==='formation-sources-page')).toBe(false);expect(JSON.stringify(f.world)).toBe(before);
});

test('opening a new formation resets its transient page and selection without changing the campaign',async()=>{
  const f=fixture(),before=JSON.stringify(f.world);await f.click('group-formation-open');await f.commit(`formation-pile-${f.all[0]!.pile.id}`,'3');
  await f.click('formation-sources-next');await f.click('formation-back');await f.click('group-formation-open');
  expect(f.row('formation-sources-page').value).toBe(`1–16 / ${f.all.length}`);
  expect(f.row(`formation-pile-${f.all[0]!.pile.id}`).input?.value).toBe('0');expect(JSON.stringify(f.world)).toBe(before);
});

test('source information remains readable through native hints and its painted labels fit inside their allocated rows',async()=>{
  const f=fixture();await f.click('group-formation-open');const source=f.all[0]!,row=f.row(`formation-pile-${source.pile.id}`);
  expect(row.hint).toContain(`${source.pile.quantity} présentes`);expect(row.hint).toContain(`${source.available} disponibles`);
  expect(row.hint).toContain(`pile ${source.pile.id}`);expect(row.hint).toContain('sol (');
  expect(row.label).toContain(`${source.available} dispo.`);
  expect(f.control(`formation-pile-${source.pile.id}-clear`)).toMatchObject({label:'Retirer',icon:'cancel',presentation:'icon',hint:'Retirer cette pile du chargement.'});
  for(const viewport of [{width:1440,height:1000},{width:960,height:800}]){
    const box=layoutNativePage(f.page,viewport,false,(text,size)=>text.length*size*.6),rows=box.rows.filter(r=>/^formation-pile-\d+$/.test(r.row.id));
    expect(rows).toHaveLength(16);
    for(const [index,r]of rows.entries()){
      // NativeStage paints labels at18px then20px per wrapped line; a detail
      // paints after that. No next source may begin inside this text's ink.
      const lastLabel=18+(Math.max(1,r.labelLines.length)-1)*20;
      const lastInk=r.detailLines.length?18+Math.max(1,r.labelLines.length,r.valueLines.length)*20+2+(r.detailLines.length-1)*18:lastLabel;
      expect(lastInk).toBeLessThan(r.height);if(rows[index+1])expect(r.top+lastInk).toBeLessThan(rows[index+1]!.top);
    }
  }
});

test('paging does not discard a selected source that became forbidden and the ordinary preview still refuses it',async()=>{
  const f=fixture(),chosen=f.all[0]!.pile;await f.click('group-formation-open');await f.click(`formation-person-${f.world.pawns[0]!.id}-toggle`);
  await f.commit('formation-destination',String(f.destination));await f.commit(`formation-pile-${chosen.id}`,'3');chosen.forbidden=true;
  const before=JSON.stringify(f.world);await f.click('formation-sources-next');await f.click('formation-sources-previous');
  expect(f.row(`formation-pile-${chosen.id}`).input?.value).toBe('3');expect(f.row(`formation-pile-${chosen.id}`).hint).toContain('interdit');
  expect(f.row('formation-draft-preview').value).toBe('source-or-carrier-capacity');expect(f.row(`formation-pile-${chosen.id}`).hint).toMatch(/interdit/i);await expect(f.click('formation-preview')).rejects.toThrow('source-or-carrier-capacity');
  expect(f.command).not.toHaveBeenCalled();expect(JSON.stringify(f.world)).toBe(before);
});
