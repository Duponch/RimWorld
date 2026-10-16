import {expect,test} from 'vitest';
import {registryCamp,preparedMap,command,startOne,until} from './helpers/world-maps-v255.ts';
import {registeredMap,flushRegisteredMap,projectionAllowsFilth} from '../src/sim/world-map-context.ts';
import {globalOwnerContexts} from '../src/sim/world-map-owners.ts';
import {ensureFilth} from '../src/sim/filth-rules.ts';
import {captureHumanOwners} from '../src/sim/human-owners.ts';
import {serializeCampaign,deserializeCampaign,validateWorld} from '../src/sim/index.ts';

test('root registry validation knows real people on another map and rejects an unknown social counterpart',()=>{
 const w=registryCamp(),other=preparedMap(w),home=registeredMap(w,0)!,p=home.pawns[0]!,counterpart=other.pawns[0]!;
 // Declared memory fixture before its validation baseline, not a played social event.
 p.social={rng:1,memories:[{otherId:counterpart.id,kind:'chitchat',at:w.tick,offset:1}]};flushRegisteredMap(home);flushRegisteredMap(other);
 expect(home.pawns.some(p=>p.id===counterpart.id)).toBe(false);expect(captureHumanOwners(home).people.has(counterpart.id)).toBe(true);expect(validateWorld(w)).toEqual([]);
 const text=serializeCampaign(w),copy=deserializeCampaign(text);expect(serializeCampaign(copy)).toBe(text);const bad=JSON.parse(text);bad.pawns.find((q:any)=>q.id===p.id).social.memories[0].otherId=w.nextId;expect(validateWorld(bad)).toContain('Invalid social memory.');expect(()=>deserializeCampaign(JSON.stringify(bad))).toThrow();expect(serializeCampaign(w)).toBe(text);
});

test('removing the original map preserves only its validated filth witness through a plain away-owner view',()=>{
 const w=registryCamp(),first=startOne(w);until(w,()=>w.worldGroups!.groups.some(g=>g.state.id===first.id&&'members'in g.state),3000);const g=w.worldGroups!.groups.find(g=>g.state.id===first.id)!.state;if(!('members'in g))throw Error('No real departed caravan');const source=registeredMap(w,0)!;
 // Explicit paused personal-foot preparation to exercise the owner capability; no acquisition or RNG claim.
 ensureFilth(source);g.members[0]!.filthFeet={lastTerrain:'dirt',carried:[{kind:'dirt',thickness:1}]};flushRegisteredMap(source);expect(validateWorld(w)).toEqual([]);
 command(w,{type:'map-abandon',mapId:0,confirm:true});expect(w.worldGroups!.abandonedContents[0]!.filthPresent).toBe(true);const view=globalOwnerContexts(w,true).find(v=>v.group?.id===first.id)!;expect(view.filth).toBeUndefined();expect(projectionAllowsFilth(view)).toBe(true);expect(validateWorld(w)).toEqual([]);
 const text=serializeCampaign(w),copy=deserializeCampaign(text);expect(serializeCampaign(copy)).toBe(text);const bad=JSON.parse(text);bad.worldGroups.abandonedContents[0].filthPresent=false;expect(validateWorld(bad)).toContain('Invalid away group person.');expect(()=>deserializeCampaign(JSON.stringify(bad))).toThrow();expect(serializeCampaign(w)).toBe(text);
},30000);
