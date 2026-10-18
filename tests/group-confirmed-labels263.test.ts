import {expect,test} from 'vitest';
import {groupConfirmedArrivalText,groupPanelLocalOrigin} from '../src/ui/group-confirmed-labels';
import type {GroupPanelSnapshot} from '../src/ui/group-panel';

/** Scalar UI projection witnesses only: no valid World/factory/ownership or
 * travelled chronology is manufactured or claimed by these pure readers. */
function projection(){return {world:{schemaVersion:263},originMapId:1,campaign:{maps:[{id:0,tile:84051,kind:'settlement'},{id:1,tile:116286,kind:'quest-site'}],groups:[]}} as unknown as GroupPanelSnapshot;}
test('new formation reads its actual selected Site header rather than legacy home fallback',()=>{
 const s=projection(),before=JSON.stringify(s);expect(groupPanelLocalOrigin(s)).toEqual({originTile:116286,originLabel:'Site temporaire · case 116286'});expect(JSON.stringify(s)).toBe(before);
 s.campaign!.maps[1]!.kind='foreign-settlement';expect(groupPanelLocalOrigin(s)).toEqual({originTile:116286,originLabel:'Établissement étranger · case 116286'});
 s.group={id:1,destination:84051,phase:'loading',memberIds:[7,8]} as GroupPanelSnapshot['group'];expect(groupPanelLocalOrigin(s)?.originTile).toBe(116286);delete s.group;
 s.originMapId=0;expect(groupPanelLocalOrigin(s)).toEqual({originTile:84051,originLabel:'Foyer · case 84051'});
});
test('absent/mapless origin stays unknown, and an away group keeps its independent location fact',()=>{
 const s=projection();s.originMapId=99;expect(groupPanelLocalOrigin(s)).toBeUndefined();s.originMapId=1;s.campaign!.maps[1]!.tile=null;expect(groupPanelLocalOrigin(s)).toBeUndefined();s.campaign!.maps[1]!.tile=116286;s.group={id:1,destination:84051,members:[]} as unknown as GroupPanelSnapshot['group'];expect(groupPanelLocalOrigin(s)).toBeUndefined();
});
function travelling(){const s=projection();s.group={id:1,destination:84051} as GroupPanelSnapshot['group'];s.campaign!.groups=[{id:1,arrival261:{tile:84051,action:{kind:'enter',mapId:0}}}] as NonNullable<GroupPanelSnapshot['campaign']>['groups'];return s;}
test('confirmed enter0 is reported from actual record independently of a future stop draft, without rewriting it',()=>{
 const s=travelling(),before=JSON.stringify(s);expect(groupConfirmedArrivalText(s)).toBe('Ordre d’arrivée confirmé : entrer sur Foyer · case 84051.');expect(JSON.stringify(s)).toBe(before);
 // An absent projection is not evidence of a confirmed stop.
 s.campaign!.groups=[];expect(groupConfirmedArrivalText(s)).toBe('Ordre d’arrivée confirmé indisponible.');
});
test('real record without arrival action means stop; other saved actions retain their own identity',()=>{
 const s=travelling(),record=s.campaign!.groups[0]!;delete record.arrival261;expect(groupConfirmedArrivalText(s)).toContain('s’arrêter sur la tuile de destination · case 84051');
 record.arrival261={tile:116286,action:{kind:'visit-site',siteId:1}};expect(groupConfirmedArrivalText(s)).toBe('Ordre d’arrivée confirmé : visiter le Site 1 · case 116286.');
 record.arrival261={tile:8,action:{kind:'attack-settlement',settlementId:4,factionId:3,confirmed:true}};expect(groupConfirmedArrivalText(s)).toContain('attaquer l’établissement 4 · case 8');
 record.arrival261={tile:8,action:{kind:'trade',settlementId:4,factionId:3,postId:2}};expect(groupConfirmedArrivalText(s)).toContain('faire du commerce avec l’établissement 4 · case 8');
});
