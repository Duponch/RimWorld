import {expect,test} from 'vitest';
import {preparedCassandraExpedition,incidentCommand} from './scenarios/secondary-incidents-v379.ts';
import {flushSecondaryContext} from '../src/sim/secondary-site-context.ts';
import {campaignPresentation,validCampaignPresentation} from '../src/sim/secondary-site-presentation.ts';
import {startAnimalManhunter} from '../src/sim/animal-manhunter.ts';
import {adultAgeTicks} from '../src/sim/animal-life.ts';
import {injurePawn} from '../src/sim/health.ts';
import {HP_UNIT} from '../src/sim/injury-rules.ts';
import {serializeWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {PresentationChanges} from '../src/bridge/presentation-changes.ts';
import {readStatusAlerts} from '../src/ui/status-alerts.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';
import type {World} from '../src/sim/types.ts';
function fixture(){
 const f=preparedCassandraExpedition(),{w,local}=f;
 const a:WildAnimal={id:w.nextId++,species:'hare',sex:'male',ageTicks:adultAgeTicks('hare'),x:16,z:16,food:.2,rest:1,state:'idle',path:[],nextDecision:w.tick};
 local.wildlife??={profile:'temperate-hares-v1',rng:1,animals:[],eatenPlants:0,eatenNutrition:0,eatenItems:0};local.wildlife.animals.push(a);
 incidentCommand(w,{type:'secondary-view',site:'home'});flushSecondaryContext(w);return {...f,a,p:local.pawns[0]!};
}
function wound(w:World,p:World['pawns'][number]){injurePawn(w,p,'left-leg','crush',40*HP_UNIT);injurePawn(w,p,'right-leg','crush',40*HP_UNIT);expect(p.state).toBe('downed');}
function packet(w:World){const result=structuredClone(new SnapshotEncoder().encode(campaignPresentation(w),0,0,true));if(result.kind!=='checkpoint')throw Error('Expected checkpoint');return result;}

test('V398 remote knowledge shares active predicates and transports only counted real identities without save state',()=>{
 const {w,local,a,p}=fixture();expect(startAnimalManhunter(local,a)).toBe(true);wound(local,p);flushSecondaryContext(w);
 const before=serializeWorld(w),shown=campaignPresentation(w),rows=shown.campaignMap!.incidents!;
 expect(rows.find(r=>r.kind==='manhunter')).toEqual({site:'secondary',kind:'manhunter',count:1,actorId:a.id});
 expect(rows.find(r=>r.kind==='downed')).toEqual({site:'secondary',kind:'downed',count:1,actorId:p.id});
 expect(shown.wildlife?.animals.some(x=>x.id===a.id)).toBe(false);expect(shown.secondarySite).toBeUndefined();expect(serializeWorld(w)).toBe(before);
 expect(new SnapshotDecoder().adopt(packet(w)).status).toBe('applied');
 for(const [kind,id,text] of [['manhunter',a.id,'en rage'],['downed',p.id,'à terre']] as const)expect(readStatusAlerts(shown).find(r=>r.key===`campaign:secondary:${kind}:${id}`)).toMatchObject({text:expect.stringContaining(text),targets:[],campaign:{site:'secondary',actorId:id}});
 incidentCommand(w,{type:'secondary-view',site:'secondary'});const active=campaignPresentation(w);
 expect(readStatusAlerts(active).some(r=>r.key==='manhunter')).toBe(true);expect(readStatusAlerts(active).some(r=>r.key==='downed')).toBe(true);
 expect(()=>serializeWorld(active)).toThrow(); // Projection remains forbidden as a complete save.
});

test('V398 bounded transport rejects aliases, false human/animal identities, extras, duplicates and old-schema extensions',()=>{
 const {w,local,a,p}=fixture();expect(startAnimalManhunter(local,a)).toBe(true);wound(local,p);flushSecondaryContext(w);const source=packet(w);
 const bads:Array<(v:World)=>void>=[
  v=>{(v as unknown as {wildlife:unknown}).wildlife=null;},
  v=>{v.campaignMap!.incidents!.find(r=>r.kind==='manhunter')!.actorId=p.id;},
  v=>{v.campaignMap!.incidents!.find(r=>r.kind==='downed')!.actorId=a.id;},
  v=>{v.campaignMap!.incidents!.find(r=>r.kind==='manhunter')!.actorId=v.pawns[0]!.id;},
  v=>{v.campaignMap!.incidents!.find(r=>r.kind==='manhunter')!.count=257;},
  v=>{v.wildlife!.animals=[null] as never;},
  v=>{v.campaignMap!.incidents!.push({...v.campaignMap!.incidents![0]!});},
  v=>{Object.assign(v.campaignMap!.incidents![0]!,{tiles:[]});},
  v=>{(v as {schemaVersion:number}).schemaVersion=251;},
 ];
 for(const corrupt of bads){const bad=structuredClone(source);corrupt(bad.world);expect(validCampaignPresentation(bad.world)).toBe(false);expect(new SnapshotDecoder().adopt(bad).status).toBe('resync');}
});

test('V398 remote manhunter admission and downing publish a changed summary at the same confirmed tick',()=>{
 const {w,local,a,p}=fixture(),changes=new PresentationChanges(),tick=w.tick;
 expect(changes.capture(campaignPresentation(w))).toBe(true);expect(changes.capture(campaignPresentation(w))).toBe(false);
 expect(startAnimalManhunter(local,a)).toBe(true);flushSecondaryContext(w);expect(w.tick).toBe(tick);
 expect(changes.capture(campaignPresentation(w))).toBe(true);expect(changes.capture(campaignPresentation(w))).toBe(false);
 wound(local,p);flushSecondaryContext(w);expect(w.tick).toBe(tick);expect(changes.capture(campaignPresentation(w))).toBe(true);
});
