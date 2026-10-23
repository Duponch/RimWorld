import {afterEach,expect,test,vi} from 'vitest';
import {createPeaceTalks293,peaceTalksFacts293,type PeaceTalksPresentation293} from '../src/ui/peace-talks-293';
import {worldTargetChoices263,worldSiteLabel263} from '../src/ui/world-target-ui-263';
import {groupConfirmedArrivalText} from '../src/ui/group-confirmed-labels';
import {preparationDOM,PreparationNode} from './helpers/group-preparation-dom';
import type {PeaceTalksSite293,PeaceTalksResult293} from '../src/sim/peace-talks-state-293';
import type {World} from '../src/sim/types';
import type {GroupPanelSnapshot} from '../src/ui/group-panel';

/** Scalar presentation witnesses, not acquired offers, cargo or a journey. */
function projection():{world:PeaceTalksPresentation293;site:PeaceTalksSite293} {
 const site:PeaceTalksSite293={kind:'peace-talks',id:7,tile:42,factionId:2,createdAtCore:0,expiresAtCore:720000,mapId:null,questTag:'PeaceTalks_<A>'};
 const world={schemaVersion:293,tick:10,worldSites263:{revision:1,nextId:8,entries:[site]},worldFactions:{playerFactionId:1,factions:[{id:2,name:'<A & B>',hidden:false}],relations:[],settlements:[]}} as unknown as PeaceTalksPresentation293;
 return {world,site};
}
function result(outcome:PeaceTalksResult293['outcome']='success'):PeaceTalksResult293 {
 return {groupId:3,negotiatorId:9,outcome,negotiationAbility:.4,goodwill:{before:-100,kindBefore:'hostile',requested:60,adjusted:60,after:-40,kindAfter:'hostile'},socialXp:{direct:true,requested:6000,credited:2100}};
}
afterEach(()=>vi.unstubAllGlobals());

test('V473 inspecting an offer or routing choice neither rolls nor mutates scalar facts',()=>{
 const {world,site}=projection(),before=JSON.stringify(world),facts=peaceTalksFacts293(world,site);
 expect(facts.title).toBe('Pourparlers avec <A & B>');expect(facts.active).toBe(true);expect(facts.body).toContain('désastre');
 expect(worldSiteLabel263(site,world.tick*10)).toContain('Pourparlers');
 expect(worldTargetChoices263(world as World,42)).toEqual([{key:'peace:7',label:'Participer aux pourparlers · <A & B>',target:{kind:'peace-talks',siteId:7},ok:true,confirmAttack:false}]);
 expect(JSON.stringify(world)).toBe(before);
});

test('V473 expiry closes the offered action at its exact boundary; closed and future offers are absent',()=>{
 const {world,site}=projection();world.tick=site.expiresAtCore/10;
 expect(peaceTalksFacts293(world,site).active).toBe(false);expect(worldTargetChoices263(world as World,42)[0]).toMatchObject({ok:false,reason:'Le délai des pourparlers est écoulé.'});
 site.closed={atCore:site.expiresAtCore,reason:'expired'};expect(worldTargetChoices263(world as World,42)).toEqual([]);
 expect(peaceTalksFacts293(world,site).body).toContain('Aucune négociation ni récompense');delete site.closed;
 for(const version of [292,294]){world.schemaVersion=version;expect(worldTargetChoices263(world as World,42)).toEqual([]);}
});

test('V473 nominal success reports the actual still-hostile relation and passion-adjusted XP',()=>{
 const {world,site}=projection();site.closed={atCore:100,reason:'resolved',result:result()};const facts=peaceTalksFacts293(world,site);
 expect(facts.status).toContain('Succès diplomatique');expect(facts.body).toContain('Relations hostiles');expect(facts.body).toMatch(/2\s?100 XP/);expect(facts.body).not.toMatch(/6\s?000 XP/);expect(facts.active).toBe(false);
});

test('V473 Disaster history distinguishes pending attack and entered combat from diplomatic resolution',()=>{
 const {world,site}=projection(),r=result('disaster');r.attack={phase:'pending',groupId:3,points:100,enemyIds:[17]};site.closed={atCore:100,reason:'resolved',result:r};
 expect(peaceTalksFacts293(world,site).body).toContain('elle reste engagée');r.attack={phase:'entered',mapId:4,atCore:100,points:100,enemyIds:[17]};
 expect(peaceTalksFacts293(world,site).body).toContain('Le combat et ses victimes restent réels');
});

test('V473 physical gift history names the delivered scalar receipt without requiring a second live owner',()=>{
 const {world,site}=projection(),r=result('triumph');r.reward={budget:600,marketValue:600,massGrams:1200,delivered:[{id:88,item:'gold',quantity:60,carrierId:9}]};site.closed={atCore:100,reason:'resolved',result:r};
 const before=JSON.stringify(world),facts=peaceTalksFacts293(world,site);expect(facts.body).toContain('Cadeaux remis à la caravane : 60');expect(facts.body).toContain('1,2 kg');expect(JSON.stringify(world)).toBe(before);
});

test('V473 keyed literal DOM survives a mapless update and removes its active letter on expiry',()=>{
 const host=preparationDOM(),alerts=new PreparationNode(),doc=document as unknown as {getElementById:(id:string)=>PreparationNode|null};
 Object.assign(alerts,{prepend:(n:PreparationNode)=>alerts.insertBefore(n,alerts.children[0]??null)});doc.getElementById=id=>id==='alerts'?alerts:null;
 const {world,site}=projection(),view=createPeaceTalks293(host as unknown as HTMLElement),before=JSON.stringify(world);view.update(world);
 const nodes=host.querySelectorAll('*'),row=nodes.find(n=>n.dataset.peaceTalksSite==='7')!;expect(row.textContent).toContain('<A & B>');expect(alerts.children).toHaveLength(1);
 view.update(structuredClone(world));expect(host.querySelectorAll('*').find(n=>n.dataset.peaceTalksSite==='7')).toBe(row);expect(JSON.stringify(world)).toBe(before);
 site.closed={atCore:100,reason:'expired'};view.update(world);expect(alerts.children).toHaveLength(0);expect(row.textContent).toContain('expirés');
 world.schemaVersion=294;view.update(world);expect(host.children[0]!.hidden).toBe(true);expect(host.querySelectorAll('*').some(n=>n.dataset.peaceTalksSite==='7')).toBe(false);
});

test('V473 the confirmed caravan arrival retains its diplomatic identity independently of a draft',()=>{
 const snapshot={world:{schemaVersion:293},group:{id:3,destination:42},campaign:{maps:[],groups:[{id:3,arrival261:{tile:42,action:{kind:'peace-talks',siteId:7}}}]}} as unknown as GroupPanelSnapshot;
 const before=JSON.stringify(snapshot);expect(groupConfirmedArrivalText(snapshot)).toBe('Ordre d’arrivée confirmé : participer aux pourparlers · case 42.');expect(JSON.stringify(snapshot)).toBe(before);
});
