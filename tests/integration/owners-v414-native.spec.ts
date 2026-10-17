import {test,expect} from '@playwright/test';
import {registeredMap} from '../../src/sim/world-map-context';
import {readGroupPanelSnapshot} from '../../src/ui/group-adapter';
import {isColonist} from '../../src/sim/affiliation';
import {world} from './helpers';
import {inspectPerson} from './player-actions';
import {harness414,input414,tile414} from './owners-v414-native-helper';

test.skip(process.env.OWNERS414_NATIVE!=='1','ROOT only: two future acquired checkpoints, SHA manifest and frozen native Chrome server required');

test('QA branch A: already physically captured human, paused UI formation/cancel, literal dossier and exact full reload',async({page},info)=>{
 const h=await harness414(page,info,'QA branch A from acquired capture-after-carry-cancel; capture/contact chronology belongs to pure-SIM evidence, not this browser branch');
 try{
  const {manifest,root}=await input414('capture'),m=manifest.capture,map=registeredMap(root,m.mapId);h.proof.input=manifest.capture;h.proof.notice=manifest.notice;
  if(!map)throw Error('Declared real Camp absent');expect([map.width,map.height]).toEqual([200,200]);expect(root.worldMaps!.selectedMapId).toBe(m.mapId);expect(root.worldMaps!.sites.find(s=>s.id===m.mapId)?.kind).toBe('camp');expect(root.worldGroups!.groups).toHaveLength(0);
  const captive=map.pawns.find(p=>p.id===m.captiveId),captain=map.pawns.find(p=>p.id===m.captainId);if(!captive||!captain)throw Error('Declared same humans missing');expect(captive.prisoner).toBeDefined();expect(captive.worldAffiliation259).toMatchObject({guestStatus:'Prisoner',hostFactionId:root.worldFactions!.playerFactionId});
  const originalDossier=structuredClone(captive.prisoner),originalGoods=structuredClone({piles:map.piles,packed:map.packed}),originalPeople=map.pawns.map(p=>({id:p.id,name:p.name,health:p.health}));
  await h.load(m.path,root);h.actualGPU();await h.groups();
  await expect(page.locator(`[data-group-member="${m.captiveId}"]`)).toContainText('Prisonnier');
  for(const id of [m.captainId,m.captiveId]){const choice=page.locator(`[data-group-member="${id}"] input[type=checkbox]`).first();await expect(choice).toHaveAttribute('aria-disabled','false');await choice.check();}
  await tile414(page,m.destination);await page.locator('[data-group-preview="formation"]').click();await expect(page.locator('[data-group-route]')).toContainText('Route proposée');
  const start=page.locator('[data-group-action="start"]');await expect(start).toHaveAttribute('aria-disabled','false');await start.click();
  await expect.poll(async()=>readGroupPanelSnapshot(await world(page))?.group?.phase).toBe('gathering');await h.ack('group-start');
  const formed=await world(page),g=readGroupPanelSnapshot(formed)?.group;if(!g||!('manifest'in g))throw Error('Real selected preparation absent');expect(g.admission?.revision).toBe(2);expect(g.memberIds).toEqual([m.captainId,m.captiveId]);expect(formed.tick).toBe(root.tick);
  await page.screenshot({path:info.outputPath('01-paused-real-captive-in-formation.png')});
  await page.locator('[data-group-action="cancel"]').click();await expect.poll(async()=>readGroupPanelSnapshot(await world(page))?.group).toBeUndefined();await h.ack('group-cancel');
  const cancelled=await h.exported('capture-ui-formation-cancel'),current=registeredMap(cancelled.root,m.mapId)!;expect(cancelled.root.tick).toBe(root.tick);expect(current.pawns.map(p=>({id:p.id,name:p.name,health:p.health}))).toEqual(originalPeople);expect({piles:current.piles,packed:current.packed}).toEqual(originalGoods);expect(current.pawns.find(p=>p.id===m.captiveId)?.prisoner).toEqual(originalDossier);expect(current.wildlife?.animals).toEqual(map.wildlife?.animals);
  await h.load(cancelled.path,cancelled.root);const reload=await h.exported('capture-ui-exact-reload');expect(reload.canonical).toBe(cancelled.canonical);
  await page.keyboard.press('Escape');await inspectPerson(page,m.captiveId,'prisoner');await page.screenshot({path:info.outputPath('02-same-captive-dossier-after-exact-reload.png')});
  h.proof.exactFullReload=true;h.proof.pausedAt=root.tick;await h.finish();
 }catch(error){await h.failure(error);throw error;}finally{await h.save();}
});

test('QA branch B: actual arrived caravan, real UI LaterGeoSettle250 through worker/adoption/ACK, same owners and exact full reload',async({page},info)=>{
 const h=await harness414(page,info,'QA branch B from acquired actual259-before-later-settlement; no replay of the old journey or final demonstration');
 try{
  const {manifest,root}=await input414('settle'),m=manifest.settle;h.proof.input=m;h.proof.notice=manifest.notice;
  expect(root.worldMaps!.sites.filter(s=>s.kind==='settlement')).toHaveLength(0);const record=root.worldGroups!.groups.find(r=>r.state.id===m.groupId);if(!record||!('members'in record.state))throw Error('Declared real arrived caravan absent');const before=record.state;expect(before.phase).toBe('at-site');expect(record.localMapId).toBeNull();
  const originalItems=structuredClone(before.items),originalPacked=structuredClone(before.packed??[]),ids=before.members.map(p=>p.id),animals=before.animalOwners?.members.map(a=>a.id)??[];
  await h.load(m.path,root);await h.groups();await expect(page.locator('[data-group-panel] .group-error')).toBeHidden();
  const selector=page.getByRole('combobox',{name:'Choisir une caravane'});await expect(selector.locator(`option[value="${m.groupId}"]`)).toHaveCount(1);if(await selector.inputValue()!==String(m.groupId))await selector.selectOption(String(m.groupId));
  await expect.poll(()=>page.evaluate(()=>((window as unknown as {__lisiere:{campaign:{maxSettlements:number}}}).__lisiere.campaign.maxSettlements))).toBe(1);
  const settle=page.locator('[data-site-action="settle"]');await expect(settle).toHaveAttribute('aria-disabled','false');await settle.click();
  await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:120_000});
  await expect.poll(async()=>{const w=await page.evaluate(()=>window.__lisiere.world);return w?.campaignMap?.revision===2?w.campaignMap.maps.filter(m=>m.kind==='settlement').length:0;},{timeout:120_000}).toBe(1);
  const ack=await h.ack('group-enter');expect(ack.request.command).toMatchObject({groupId:m.groupId,mode:'settle'});expect(ack.reply.checkpoint).toBeDefined();
  expect(h.transport.some(r=>r.direction==='received'&&r.type==='camp-entry-progress'&&r.navigation===ack.request.navigation&&r.worker===ack.request.worker),'Actual worker generation progress must be observed').toBe(true);
  const settled=await h.exported('settled250-ui-complete'),site=settled.root.worldMaps!.sites.find(s=>s.kind==='settlement')!,map=registeredMap(settled.root,site.id)!;h.actualGPU();
  expect([map.width,map.height]).toEqual([250,250]);expect(settled.root.tick).toBe(root.tick);expect(site.settledAt).toBe(root.tick);expect(map).not.toHaveProperty('startingArrival');expect(map.pawns.map(p=>p.id).sort((a,b)=>a-b)).toEqual([...ids].sort((a,b)=>a-b));
  for(const p of before.members){const current=map.pawns.filter(q=>q.id===p.id);expect(current).toHaveLength(1);expect(current[0]!.name).toBe(p.name);expect(current[0]!.health).toEqual(p.health);expect(current[0]!.prisoner).toEqual(p.prisoner);}
  for(const a of animals)expect(map.wildlife?.animals.filter(q=>q.id===a)).toHaveLength(1);
  // Actual settlement entry drops inventory on this map; equipment and apparel
  // keep their human holders. All non-owner payload, identity and quantity stay
  // exact. This named holder transition is not ignored by the reload oracle.
  const dropping=new Set([...before.members.filter(p=>isColonist(p)||p.visitor).map(p=>p.id),...before.animalOwners?.members.filter(a=>a.domestic).map(a=>a.id)??[]]);
  for(const item of originalItems){const matches=map.piles.filter(p=>p.id===item.id);expect(matches).toHaveLength(1);const current=matches[0]!;expect({...current,owner:item.owner}).toEqual(item);if(item.owner.type==='inventory'&&dropping.has(item.owner.pawnId))expect(current.owner.type).toBe('ground');else expect(current.owner).toEqual(item.owner);}
  for(const pack of originalPacked){const matches=map.packed.filter(p=>p.building.id===pack.building.id);expect(matches).toHaveLength(1);expect(matches[0]!.building).toEqual(pack.building);expect(matches[0]!.owner.type).toBe('ground');}
  // Generated terrain/ruins/fauna are legitimate; this checks no second starting
  // roster or capsule endowment, and preserves every original carried Thing.
  await page.keyboard.press('Escape');await page.screenshot({path:info.outputPath('03-real-later-settlement250-original-travellers.png')});
  await h.load(settled.path,settled.root);const reload=await h.exported('settled250-ui-exact-reload');expect(reload.canonical).toBe(settled.canonical);h.proof.exactFullReload=true;h.proof.settlement={id:site.id,tick:root.tick,ids,animals};await h.finish();
 }catch(error){await h.failure(error);throw error;}finally{await h.save();}
});
