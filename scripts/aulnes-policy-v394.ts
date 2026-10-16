/** Immutable played V386 parent; no historical builder or preparation rerun. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aulnesCommand,aulnesHash} from './aulnes-workshop-v381.ts';
import {decodeStoredSave} from '../src/ui/save-storage-codec.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {APPAREL,type ApparelItem} from '../src/sim/apparel-rules.ts';
import {SCHEMA_VERSION,type Command,type World} from '../src/sim/types.ts';

export const AULNES_V394_SOURCE='public/test-saves/v386/les-aulnes-integrees.json';
export const AULNES_V394_PARENT_SHA='dfd9302647b4d1cabaa8760a150209c6804a788f48a0b0596660318b4d1707ee';
export const AULNES_V394_START=10373;
export const AULNES_V394_POLICY=4;
export const AULNES_V394_ITEM='muffalo-wool-tuque' satisfies ApparelItem;
export const AULNES_V394_RECIPIENTS=[19871,20337] as const;

export async function loadAulnesV386(){
  assert.equal(SCHEMA_VERSION,250,'This bounded derivative targets the current250 loader.');
  const stored=readFileSync(AULNES_V394_SOURCE,'utf8'),raw=await decodeStoredSave(stored);
  assert.equal(aulnesHash(raw),AULNES_V394_PARENT_SHA,'Immutable played V386 parent changed.');
  const historical=JSON.parse(raw);assert.equal(historical.schemaVersion,246);assert.equal(historical.tick,AULNES_V394_START);
  // The existing loader strictly validates246 and each migration frontier.
  const world=deserializeWorld(raw);assert.equal(world.schemaVersion,SCHEMA_VERSION);assert.deepEqual(validateWorld(world),[]);
  assert.deepEqual(world,{...historical,schemaVersion:SCHEMA_VERSION},'Loading must not add history/property/permissions.');
  return {world,storedHash:aulnesHash(stored),rawHash:aulnesHash(raw)};
}

/** One ordinary V392 command. Every other World field must remain exact. */
export function prepareAulnesPolicyV394(source:World){
  assert.equal(source.schemaVersion,250);assert.equal(SCHEMA_VERSION,250);
  assert.deepEqual([source.width,source.height,source.tick],[250,250,AULNES_V394_START]);
  assert.equal(source.pawns.length,15);assert.equal(source.wildlife?.animals.filter(a=>a.domestic).length,9);
  const policy=source.apparelPolicies?.find(p=>p.id===AULNES_V394_POLICY);assert.ok(policy&&policy.label==='Défense entretenue');
  assert.ok(!policy.allowedItems.includes(AULNES_V394_ITEM),'The immutable parent policy must still exclude this tuque.');
  assert.ok(policy.allowedMaterials.includes('muffalo-wool'),'Append only: do not broaden the material filter.');
  assert.equal(APPAREL[AULNES_V394_ITEM].material,'muffalo-wool');
  for(const id of AULNES_V394_RECIPIENTS){const pawn=source.pawns.find(p=>p.id===id);assert.ok(pawn&&pawn.apparelPolicyId===policy.id&&pawn.apparelAutomation===true&&pawn.state==='sleeping');}
  assert.ok(source.piles.some(p=>p.id===28063&&p.item===AULNES_V394_ITEM&&p.owner.type==='ground'));
  assert.equal(source.pawns.find(p=>p.id===19869)?.cooking?.recipe,'shirt');
  assert.equal(source.pawns.find(p=>p.id===20352)?.cooking?.recipe,'tuque');
  const before=serializeWorld(source),world=structuredClone(source),command:Command={type:'apparel-policy-update',policyId:policy.id,
    allowedItems:[...policy.allowedItems,AULNES_V394_ITEM],allowedMaterials:[...policy.allowedMaterials],
    minQuality:policy.minQuality,maxQuality:policy.maxQuality,minHitPointsPercent:policy.minHitPointsPercent,maxHitPointsPercent:policy.maxHitPointsPercent};
  aulnesCommand(world,command);
  assert.deepEqual({...world,apparelPolicies:source.apparelPolicies},source,'Only the shared policy filter may change at this paused tick.');
  assert.deepEqual(world.apparelPolicies,source.apparelPolicies!.map(p=>p.id===policy.id?{...p,allowedItems:[...p.allowedItems,AULNES_V394_ITEM]}:p));
  assert.equal(serializeWorld(source),before,'Preparation must not mutate its input.');assert.deepEqual(validateWorld(world),[]);
  return {world,preparation:{preparedAt:world.tick,parentRawSha256:AULNES_V394_PARENT_SHA,policyId:policy.id,item:AULNES_V394_ITEM,
    declared:'Only the ordinary apparel-policy-update appends the existing wool tuque. No item, research, work, owner, forced flag, Auto setting, task, cargo, sleep or deadline changes at the command.'}};
}

/** Small immutable observation; this does not decide or mutate any activity. */
export function observeAulnesV394(world:World){
  const bill=world.structures.find(s=>s.id===20988)?.bills?.find(b=>b.id===26682);
  return {tick:world.tick,tuques:world.piles.filter(p=>p.item===AULNES_V394_ITEM).map(p=>({id:p.id,owner:{...p.owner},apparel:p.apparel?{...p.apparel}:undefined})),
    unfinished:world.piles.filter(p=>p.unfinished?.billId===26682).map(p=>({id:p.id,owner:{...p.owner},progress:p.unfinished!.progress})),
    bill:bill?structuredClone(bill):null,
    recipients:AULNES_V394_RECIPIENTS.map(id=>{const p=world.pawns.find(p=>p.id===id);return p?{id:p.id,name:p.name,state:p.state,hunger:p.hunger,rest:p.rest,automatic:p.apparelAutomation,nextApparelCheckAt:p.nextApparelCheckAt,need:p.need?structuredClone(p.need):null,equipmentTask:p.equipmentTask?{...p.equipmentTask}:null}:null;}),
    marin:(()=>{const p=world.pawns.find(p=>p.id===20352);return p?{state:p.state,cell:{x:p.x,z:p.z},task:p.cooking?structuredClone(p.cooking):null}:null;})()};
}
