import {describe,expect,it,vi} from 'vitest';
import {createNativeSaveManager} from '../src/ui3d/native-saves';
import type {NativePage} from '../src/ui3d/native-contract';
import type {SavedColony} from '../src/ui/game-session';

function fixture(){
  let page:NativePage|undefined;
  let entries:SavedColony[]=[{key:'lisiere.named.v1.1',kind:'named',label:'Camp sûr',detail:'Jour 2 · 250 × 250',savedAt:20,revision:'opaque-A'}];
  const options={readSaves:()=>entries,refresh:vi.fn(async()=>{}),save:vi.fn(async()=>{}),saveNamed:vi.fn(async()=>{}),deleteSave:vi.fn(async()=>{}),load:vi.fn(async()=>{}),exportSave:vi.fn(async()=>{}),show:(next:NativePage)=>{page=next;},close:vi.fn(),blocked:()=>false};
  const manager=createNativeSaveManager(options);
  const click=async(id:string)=>{
    const control=[...(page?.rows.flatMap(row=>row.controls??[])??[]),...(page?.actions??[])].find(control=>control.id===id);
    if(!control)throw Error(`Missing native control ${id}`);expect(control.disabled).not.toBe(true);await control.onActivate();
  };
  return {manager,options,click,get page(){return page!;},setEntries:(next:SavedColony[])=>{entries=next;}};
}
describe('native save manager ownership and consent',()=>{
  it('loads the clicked complete card directly once while keeping management actions separate',async()=>{
    const f=fixture();await f.manager.open();const row=f.page.rows.find(row=>row.id==='native-save-slot-lisiere.named.v1.1')!;
    expect(row.controlStyle).toBe('card');expect(row.controls![0]).toMatchObject({id:'native-save-load-lisiere.named.v1.1',label:'Camp sûr',presentation:'card',description:'Jour 2 · 250 × 250'});expect(row.controls![0]!.caption).toContain('Sauvegarde nommée');
    await f.click('native-save-select-lisiere.named.v1.1');expect(f.options.load).not.toHaveBeenCalled();expect(f.page.rows.flatMap(row=>row.controls??[]).some(control=>control.id==='native-save-load')).toBe(false);
    await f.click('native-save-load-lisiere.named.v1.1');expect(f.options.load).toHaveBeenCalledExactlyOnceWith('lisiere.named.v1.1');expect(f.options.close).toHaveBeenCalledOnce();f.manager.dispose();expect(f.options.close).toHaveBeenCalledOnce();
  });
  it('revalidates the exact clicked revision before direct loading',async()=>{
    const f=fixture();await f.manager.open();f.options.refresh.mockImplementationOnce(async()=>{f.setEntries([{key:'lisiere.named.v1.1',kind:'named',label:'Copie changée',detail:'Jour 3',savedAt:21,revision:'opaque-B'}]);});await f.click('native-save-load-lisiere.named.v1.1');expect(f.options.load).not.toHaveBeenCalled();expect(f.options.close).not.toHaveBeenCalled();expect(f.page.rows.map(row=>row.label).join(' ')).toMatch(/changé|disparu/);f.manager.dispose();
  });
  it('preserves the real session-blocked guard after refreshing a directly clicked copy',async()=>{
    const f=fixture();await f.manager.open();f.options.refresh.mockImplementationOnce(async()=>{f.options.blocked=()=>true;});await f.click('native-save-load-lisiere.named.v1.1');expect(f.options.load).not.toHaveBeenCalled();expect(f.options.close).not.toHaveBeenCalled();expect(f.page.rows.map(row=>row.label).join(' ')).toContain('Attendez la fin');f.manager.dispose();
  });
  it('requires explicit confirmation and commits the exact selected revision',async()=>{
    const f=fixture();await f.manager.open();await f.click('native-save-select-lisiere.named.v1.1');await f.click('native-save-overwrite');
    expect(f.page.id).toBe('native-saves-confirm');expect(f.options.saveNamed).not.toHaveBeenCalled();
    await f.click('native-save-confirm-cancel');expect(f.options.saveNamed).not.toHaveBeenCalled();
    await f.click('native-save-overwrite');await f.click('native-save-confirm-apply');
    expect(f.options.saveNamed).toHaveBeenCalledExactlyOnceWith('Camp sûr','lisiere.named.v1.1','opaque-A');f.manager.dispose();
  });
  it('refuses a stale deletion after refresh changes the selected copy',async()=>{
    const f=fixture();await f.manager.open();await f.click('native-save-select-lisiere.named.v1.1');await f.click('native-save-delete');
    const apply=f.page.actions!.find(control=>control.id==='native-save-confirm-apply')!;
    f.options.refresh.mockImplementationOnce(async()=>{f.setEntries([{key:'lisiere.named.v1.1',kind:'named',label:'Copie d’un autre onglet',detail:'Jour 3',savedAt:21,revision:'opaque-B'}]);});
    await apply.onActivate();expect(f.options.deleteSave).not.toHaveBeenCalled();expect(f.page.id).toBe('native-saves');
    expect(f.page.rows.map(row=>row.label).join(' ')).toMatch(/changé|disparu/);f.manager.dispose();
  });
  it('creates in a free slot without silently converting creation into overwrite',async()=>{
    const f=fixture();await f.manager.open();await f.page.rows.find(row=>row.id==='native-save-name')!.input!.onCommit('Nouvelle halte');
    await f.click('native-save-create');expect(f.options.saveNamed).toHaveBeenCalledExactlyOnceWith('Nouvelle halte');
    expect(f.options.deleteSave).not.toHaveBeenCalled();f.manager.dispose();
  });
});
