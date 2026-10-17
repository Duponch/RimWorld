import {expect,test} from 'vitest';
import {registryCamp,preparedMap} from './helpers/world-maps-v255.ts';
import {notifyMapLost} from '../src/sim/world-map-lost.ts';
import {detachMapOwners,captureLostOwners} from '../src/sim/world-lost-owners.ts';
import {validLostArchiveShape} from '../src/sim/world-lost-save.ts';
import {validWorldMapRegistry} from '../src/sim/world-map-save.ts';
import {bindBornHumanFaction259,commitJoinedPlayer259} from '../src/sim/world-affiliation-259.ts';
import {initialWorldPawns256} from '../src/sim/world-pawn-state-256.ts';
import {preparePassedToWorld256} from '../src/sim/world-pawn-transition-256.ts';
import {prepareMapRemoved259} from '../src/sim/world-pawn-map-removed-259.ts';
import type {WorldFactionRegistry256} from '../src/sim/world-faction-state.ts';

/** Declared small record/registry fixtures. The notifier and PassedToWorld
 * execute their real functions. The removed archive and later local return are
 * explicit preparation, not acquired geographic MapRemoved/return chronology.
 * ROOT's acquired1499 continuation validates the complete removal producer. */
function source(){
 const root=registryCamp();
 const factions:WorldFactionRegistry256={revision:1,contentModel:'original-faction-content-v1',generatedAt:0,playerFactionId:1,nextFactionId:3,nextSettlementId:1,factions:[{id:1,def:'PlayerColony',hidden:false,name:'Prepared player',randomKey:1,colorFromSpectrum:0,leaderOwnerId:null,lifecycle259:{revision:1,defeated:false,temporary:false}},{id:2,def:'Pirate',hidden:false,name:'Prepared foreign',randomKey:2,colorFromSpectrum:.5,leaderOwnerId:null,lifecycle259:{revision:1,defeated:false,temporary:false}}],relations:[],settlements:[],leaders:[]};
 root.worldFactions=factions;root.worldPawns=initialWorldPawns256();const map=preparedMap(root,52,'camp'),victim=map.pawns[0]!;
 expect(bindBornHumanFaction259(root,victim,1)).toBe(true);return {root,map,victim,factions};
}
function passed(){
 const f=source(),{root,map,victim,factions}=f;
 notifyMapLost(root,map,1,false);expect(root.worldGroups!.lostMemories.some(m=>m.otherId===victim.id&&m.kind==='colonist-lost')).toBe(true);
 const compact=detachMapOwners(map,1,52),human=compact.humans.find(h=>h.pawn===victim)!;
 const plan=preparePassedToWorld256(root.worldPawns!,{kind:'human',actor:victim,factionId:1,originMapId:1,context:compact.context,clockCore:0,enteredAtAbsCore:0,mode:'active',items:human.items,packed:human.packed},factions,{float(){return 0;}},{version:259,situation:'Free',conditions:[{factionId:1,defeated:false,temporary:false,techLevel:4},{factionId:2,defeated:false,temporary:false,techLevel:5}]});
 expect(plan.ok).toBe(true);if(!plan.ok)throw Error(plan.reason);plan.commit();expect(root.worldPawns!.owners[0]!.actor).toBe(victim);
 // Prepared durable receipt corresponding to this actual original's transfer.
 // The complete geographic producer writes this after its own staged commit.
 compact.lostColonistIds259=[victim.id];compact.humans=compact.humans.filter(h=>h.pawn!==victim);map.pawns=map.pawns.filter(p=>p!==victim);
 root.worldGroups!.abandonedContents.push(compact);root.worldMaps!.sites=root.worldMaps!.sites.filter(m=>m.id!==1);root.worldMaps!.retired.push({id:1,tile:52,kind:'camp',createdAt:0,removedAt:0,reason:'abandon',markerUntilCore:1800000});
 expect(validWorldMapRegistry(root)).toBe(true);return {...f,compact,owner:root.worldPawns!.owners[0]!};
}
test('real loss notifier and actual human WP transfer keep one durable scalar reference, no archive actor',()=>{
 const f=passed();expect(f.compact.lostColonistIds259).toEqual([f.victim.id]);expect(f.compact.humans.some(h=>h.id===f.victim.id)).toBe(false);expect(captureLostOwners(f.root).byId.has(f.victim.id)).toBe(false);expect(f.root.worldPawns!.owners.filter(r=>r.actor===f.victim)).toHaveLength(1);
});
test('declared later return of the same original does not require a current WP foreign key',()=>{
 const f=passed(),before=JSON.stringify(f.compact),memories=structuredClone(f.root.worldGroups!.lostMemories);
 f.root.worldPawns!.owners=f.root.worldPawns!.owners.filter(r=>r!==f.owner);commitJoinedPlayer259(f.root,f.victim);f.victim.faction='colony';f.root.pawns.push(f.victim);f.root.piles.push(...f.owner.items);f.root.packed.push(...f.owner.packed);
 expect(validWorldMapRegistry(f.root)).toBe(true);expect(JSON.stringify(f.compact)).toBe(before);expect(f.root.worldGroups!.lostMemories).toEqual(memories);
});
test('future field, duplicate/out of range identities, wrong victim and mismatched archive date reject',()=>{
 const f=passed(),a=f.compact;
 expect(validLostArchiveShape(a,0,f.root.nextId,258,f.root)).toBe(false);
 for(const ids of [[f.victim.id,f.victim.id],[0],[f.root.nextId],[]])expect(validLostArchiveShape({...a,lostColonistIds259:ids},0,f.root.nextId,259,f.root)).toBe(false);
 expect(validLostArchiveShape({...a,lostColonistIds259:undefined},0,f.root.nextId,259,f.root)).toBe(false);const hidden=Object.defineProperty({...a},'lostColonistIds259',{value:[f.victim.id],enumerable:false});expect(validLostArchiveShape(hidden,0,f.root.nextId,259,f.root)).toBe(false);let reads=0;const accessor=Object.defineProperty({...a},'lostColonistIds259',{get(){reads++;throw Error('not data');},enumerable:true});expect(validLostArchiveShape(accessor,0,f.root.nextId,259,f.root)).toBe(false);expect(reads).toBe(0);
 const original=a.lostColonistIds259;a.lostColonistIds259=[f.root.pawns[0]!.id];expect(validWorldMapRegistry(f.root)).toBe(false);a.lostColonistIds259=original;
 f.root.worldGroups!.lostMemories[0]!.at=1;expect(validWorldMapRegistry(f.root)).toBe(false);
});
test('unsupported removal refuses before notifier, receipt, actor, owner, RNG or registry mutation',()=>{
 const f=source(),before=JSON.stringify(f.root);const result=prepareMapRemoved259(f.root,f.map,1,false);expect(result.ok).toBe(false);expect(JSON.stringify(f.root)).toBe(before);expect(f.root.worldGroups!.abandonedContents).toEqual([]);
});
