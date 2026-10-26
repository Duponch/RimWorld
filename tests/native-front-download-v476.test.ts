import {afterEach,describe,expect,it,vi} from 'vitest';
import {createNativeFrontMenu} from '../src/ui3d/native-front';
import type {FrontMenuOptions} from '../src/ui/front-menu';
import type {NativePage} from '../src/ui3d/native-contract';
import type {TestColony} from '../src/ui/test-colonies';

afterEach(()=>vi.unstubAllGlobals());
function fixture(filename='les-eclaircies.json'){
 const save:TestColony={id:'eclaircies-v419',release:'v419',label:'Éclaircies',description:'Situation préparée',filename,pawns:3,colonists:3,width:128,height:128,tick:1725,focus:[],steps:['Observer la colonie.'],prepared:true,provenance:'Fixture du catalogue',sha256:'a'.repeat(64)};
 const link={href:'',download:'',click:vi.fn()},createElement=vi.fn((tag:string)=>{if(tag!=='a')throw Error('Only the browser download service may create a node');return link;});
 // Firefox-compatible service surface: no showSaveFilePicker, DOM insertion,
 // layout, hit testing, or visible control exists in this model test.
 vi.stubGlobal('window',{});vi.stubGlobal('document',{createElement});
 const yes=()=>true,no=()=>false,asyncNoop=async()=>{};
 const options:FrontMenuOptions={onStart:asyncNoop,onLoad:asyncNoop,onResume:asyncNoop,
  getTexturesEnabled:yes,onTexturesEnabledChange:yes,getGroundGrassEnabled:yes,onGroundGrassEnabledChange:yes,getDioramaEnabled:yes,onDioramaEnabledChange:yes,getRoomEnabled:yes,onRoomEnabledChange:yes,
  getLightingSettings:()=>({sun:1,moon:1,ambient:1}),onLightingSettingsChange:yes,getSoundEnabled:no,onSoundEnabledChange:yes,getSoundVolume:()=>0,onSoundVolumeChange:yes,onTestSound:asyncNoop,getMusicEnabled:no,onMusicEnabledChange:yes,getMusicVolume:()=>0,onMusicVolumeChange:yes,
  getSaves:()=>[],getTestColonies:async()=>[save],onLoadTest:vi.fn(asyncNoop),onImport:vi.fn(asyncNoop)};
 let page:NativePage|undefined;const menu=createNativeFrontMenu(options,next=>{page=next??undefined;});
 const click=async(id:string)=>{const control=[...(page?.rows.flatMap(row=>row.controls??[])??[]),...(page?.actions??[])].find(control=>control.id===id);if(!control)throw Error(`Missing native control ${id}`);expect(control.disabled).not.toBe(true);await control.onActivate();};
 return {menu,click,link,createElement,options,get page(){return page!;}};
}
describe('native test-colony browser download',()=>{
 it('downloads the row’s original file without requiring File System Access or loading a colony',async()=>{
  const f=fixture();f.menu.showLoad();await f.click('test-colonies');await f.click('download-test-eclaircies-v419');
  expect(f.createElement).toHaveBeenCalledExactlyOnceWith('a');expect(f.link.href).toBe('/test-saves/v419/les-eclaircies.json');expect(f.link.download).toBe('les-eclaircies.json');expect(f.link.click).toHaveBeenCalledOnce();expect(f.options.onLoadTest).not.toHaveBeenCalled();expect(f.page.rows.some(row=>row.id==='front-error')).toBe(false);
 });
 it('does not dispatch an invalid catalogue path through the download service',async()=>{
  const f=fixture('../outside.json');f.menu.showLoad();await f.click('test-colonies');await f.click('download-test-eclaircies-v419');
  expect(f.link.click).not.toHaveBeenCalled();expect(f.page.rows.find(row=>row.id==='front-error')?.label).toContain('Fichier de colonie inconnu');expect(f.options.onLoadTest).not.toHaveBeenCalled();
 });
});
