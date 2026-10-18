import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../../src/sim/serialization';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {harness414} from './owners-v414-native-helper';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
async function acquired(){
 const path=process.env.WORLD_SITES263_LABELS_NATIVE_INPUT,inputSHA=process.env.WORLD_SITES263_LABELS_NATIVE_INPUT_SHA256;
 if(!path||!inputSHA||!/^[a-f0-9]{64}$/.test(inputSHA))throw Error('ROOT future completed/valid current10500 export path and full SHA required; neither partial10500 nor ancestor8075 nor entry/Reform/journey fallback');
 const bytes=await readFile(path,'utf8');expect(sha(bytes)).toBe(inputSHA);const root=deserializeCampaign(await decodeStoredSave(bytes));expect(root.schemaVersion).toBe(263);expect(validateWorld(root)).toEqual([]);
 const record=root.worldGroups?.groups.find(r=>r.state.id===root.worldGroups!.selectedGroupId),g=record?.state;
 if(!record||!g||!('members'in g)||g.id!==2||g.phase!=='travelling'||!root.planet||record.arrival261?.action.kind!=='enter'||record.arrival261.action.mapId!==0||record.arrival261.tile!==g.destination||root.tick!==10500)throw Error('Actual ROOT-completed valid10500 group2 travelling with confirmed enter0 required; no older state or clock/clinical repair');
 expect(g.members.map(p=>p.id)).toEqual([7,8]);
 const rewards=[[61462,'cloth',9],[61463,'medicine',8],[61464,'cloth',7],[61465,'gold',44],[61466,'plasteel',6],[61467,'advanced-component',1],[61468,'gold',1],[61469,'silver',1]] as const;
 for(const [id,item,quantity]of rewards){const pile=g.items.find(p=>p.id===id);expect(pile).toMatchObject({id,item,quantity,owner:{type:'inventory'}});if(pile?.owner.type==='inventory')expect([7,8]).toContain(pile.owner.pawnId);}
 return {path,inputSHA,root,canonical:serializeCampaign(root),groupId:g.id,tick:root.tick,tile:g.tile,homeTile:root.planet.homeTile,civilianTile:root.planet.civilianTile};
}
test('read-only actual post-Reform labels separate confirmed enter0 from the next-order draft, complete export/reload stays exact',async({page},info)=>{
 test.skip(process.env.WORLD_SITES263_LABELS_NATIVE!=='1','ROOT actual post-Reform input path+SHA opt-in; no fallback');
 const h=await harness414(page,info,'263 current completed10500 read-only origin/arrival labels; no order or simulation tick',{exactAdoptionOnce415:true});
 try{
  let loaded:Awaited<ReturnType<typeof acquired>>|undefined=await acquired();const b=(({root:_root,...metadata})=>metadata)(loaded);h.proof.input={path:b.path,sha256:b.inputSHA,tick:b.tick,groupId:b.groupId};await h.load(b.path,loaded.root);loaded=undefined;h.actualGPU();await h.groups();
  await expect(page.locator('[data-group-origin]')).toContainText('Groupe');await expect(page.locator('[data-group-origin]')).toContainText(b.tile===b.homeTile?'Foyer':b.tile===b.civilianTile?'Comptoir civil':`Case ${b.tile}`);
  const confirmed=page.locator('[data-group-arrival-confirmed]'),draft=page.getByRole('combobox',{name:'Action à l’arrivée du nouvel ordre',exact:true});await expect(confirmed).toBeVisible();await expect(confirmed).toContainText('Ordre d’arrivée confirmé : entrer sur Foyer');await expect(draft.locator('..')).toContainText('Nouvel ordre (non confirmé)');
  h.proof.labels={origin:await page.locator('[data-group-origin]').textContent(),confirmed:await confirmed.textContent(),nextDraft:await draft.inputValue()};await page.screenshot({path:info.outputPath('01-read-only-confirmed-enter0-and-unconfirmed-draft.png')});
  {const exported=await h.exported('02-read-only-labels-complete');expect(exported.canonical).toBe(b.canonical);await h.load(exported.path,exported.root);}
  {const reloaded=await h.exported('03-read-only-labels-reloaded-exact');expect(reloaded.canonical).toBe(b.canonical);expect(reloaded.root.tick).toBe(b.tick);}
  await h.groups();await expect(confirmed).toContainText('Ordre d’arrivée confirmé : entrer sur Foyer');await page.screenshot({path:info.outputPath('04-read-only-labels-after-reload.png')});await h.finish();expect(h.transport.filter(r=>r.direction==='sent'&&r.type==='command')).toEqual([]);expect(sha(await readFile(b.path,'utf8'))).toBe(b.inputSHA);h.proof.noCommands=true;h.proof.exactCompleteReload=true;
 }catch(error){h.proof.complete=false;await h.failure(error);throw error;}finally{await h.save();}
});
