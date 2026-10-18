import {expect,test} from 'vitest';
import {harness,preparing,away,exact,resumed} from './helpers/group-admission-v412.ts';
import {applyCommand,serializeCampaign,deserializeCampaign} from '../src/sim/index.ts';
import {groupHumanAdmissionReason257,validGroupHumanPreparation257} from '../src/sim/group-human-admission-257.ts';
import {validCaravan261Historical} from '../src/sim/caravan-schema-historical-261.ts';
import {prepareReformDeparture260,type ReformDepartureInput260} from '../src/sim/group-reform-departure-260.ts';
import {reformHumanOrigin260} from '../src/sim/work-release.ts';
import {applyMeleeStun} from '../src/sim/stun.ts';
import type {AwayGroup} from '../src/sim/group-capture.ts';

/** Existing declared32² admission harness. Mobilisation and movement are true
 * player commands; no manufactured motion and no claimed full Reform map. */
function movingDraft(){
 const f=harness(),p=f.map.pawns[0]!;expect(f.w.schemaVersion).toBe(261);
 f.command({type:'draft',pawnIds:[p.id],enabled:true});f.command({type:'fire-at-will',pawnIds:[p.id],enabled:false});
 f.command({type:'draft-move',pawnIds:[p.id],target:{x:12,z:16},queue:false});
 f.until(()=>!!p.motion&&p.motion.end>f.w.tick,40);expect(p.draft?.target).toEqual({x:12,z:16});return {...f,p};
}

test('new261 accepts actual drafted movement, preserves its edge and mobilisation until true departure, and resumes exactly',()=>{
 const f=movingDraft(),draft=f.p.draft!,edge=structuredClone(f.p.motion),gear=f.map.piles.filter(i=>'pawnId'in i.owner&&i.owner.pawnId===f.p.id),gearIds=new Set(gear.map(i=>i.id)),id=f.start([f.p]);
 expect(preparing(f,id).humanPreparation?.undraftIds261).toEqual([f.p.id]);expect(f.p.draft).toBe(draft);expect(f.p.motion).toEqual(edge);
 exact(f.w,'draft261-intent-before-edge-end');const copy=resumed(f.w),copyPawn=copy.map.pawns.find(p=>p.id===f.p.id)!;
 for(const a of [f,copy]){
  const p=a.map.pawns.find(p=>p.id===f.p.id)!,originalGear=a.map.piles.filter(i=>gearIds.has(i.id));
  for(let n=0;n<1600;n++){
   const state=a.w.worldGroups!.groups.find(r=>r.state.id===id)?.state;if(state&&'members'in state)break;
   expect(p.draft).toBeDefined();a.step();
  }
  const g=away(a,id);expect(g.members.find(q=>q.id===p.id)).toBe(p);expect(p.draft).toBeUndefined();expect('humanPreparation'in g).toBe(false);
  for(const item of originalGear)expect(g.items.find(i=>i.id===item.id)).toBe(item);exact(a.w,'draft261-true-departure');
 }
 expect(copyPawn.draft).toBeUndefined();expect(serializeCampaign(copy.w)).toBe(serializeCampaign(f.w));
});

test('refused draft formation and cancellation preserve the actual mobilisation and edge; combat reaction stays refused',()=>{
 const f=movingDraft(),food=f.map.piles.find(i=>i.item==='survival-meal'&&i.owner.type==='ground')!,before=JSON.stringify(f.w),draft=f.p.draft,edge=structuredClone(f.p.motion);
 expect(applyCommand(f.w,{type:'group-start',originMapId:0,memberIds:[f.p.id],sources:[{pileId:food.id,quantity:food.quantity+1}],destination:52},f.runtime).ok).toBe(false);
 expect(JSON.stringify(f.w)).toBe(before);expect(f.p.draft).toBe(draft);
 const id=f.start([f.p]);f.command({type:'group-cancel',groupId:id});expect(f.p.draft).toBe(draft);expect(f.p.motion).toEqual(edge);expect(f.w.worldGroups!.groups).toEqual([]);
 applyMeleeStun(f.map,f.p,f.w.tick*10);expect(groupHumanAdmissionReason257(f.map,f.p,true)).toBeDefined();
});

test('undraft intent is exact261, real selected original only, absent from old260 and never grafted onto engaged legacy preparations',()=>{
 const f=movingDraft(),id=f.start([f.p]),g=preparing(f,id),prep=g.humanPreparation!;
 expect(validGroupHumanPreparation257(prep,f.map,g,261)).toBe(true);
 expect(validGroupHumanPreparation257(prep,f.map,g,260)).toBe(false);
 for(const invalid of [[],[f.p.id,f.p.id],[f.w.nextId],undefined])expect(validGroupHumanPreparation257({...prep,undraftIds261:invalid},f.map,g,261)).toBe(false);
 expect(validCaravan261Historical({inactiveMap:{humanPreparation:{undraftIds261:[f.p.id]}}},260)).toBe(false);
 const old=JSON.parse(serializeCampaign(f.w));old.schemaVersion=260;expect(()=>deserializeCampaign(JSON.stringify(old))).toThrow();
 delete prep.undraftIds261;expect(validGroupHumanPreparation257(prep,f.map,g,261)).toBe(false);expect(groupHumanAdmissionReason257(f.map,f.p)).toBeDefined();
});

/** Existing concrete Reform write-set boundary, not a full saved caravan.
 * The clothed original belongs to the declared harness; its draft-move edge
 * comes from real player commands. No weapon acquisition is claimed. */
function reformUnit(){
 const f=movingDraft(),origin=Object.freeze(reformHumanOrigin260(f.map,f.p)),intrinsic=f.map.piles.filter(i=>'pawnId'in i.owner&&i.owner.pawnId===f.p.id&&['equipment','apparel'].includes(i.owner.type));
 const next={id:f.w.planet!.nextGroupId,members:[f.p],items:intrinsic.map(i=>structuredClone(i))} as unknown as AwayGroup;
 const record={originMapId:0,localMapId:null,context:{seed:f.map.seed,width:f.map.width,height:f.map.height},state:next};
 const input:ReformDepartureInput260={people:[f.p],humanOrigins:new Map([[f.p.id,origin]]),animals:[],captured:new Set(),drops:new Map(),inventoryDrops:new Map(),transfers:[],intrinsic,packs:[],packUpdates:[],next,record,nextId:f.w.nextId,mapId:0};
 return {...f,origin,intrinsic,next,input};
}
test('Reform sealed StopDead removes draft only at commit and keeps the same original, gear and random stream',()=>{
 const f=reformUnit(),before=JSON.stringify(f.w),draft=f.p.draft,gear=JSON.stringify(f.intrinsic),rng=f.w.rng,plan=prepareReformDeparture260(f.map,f.input);
 expect(JSON.stringify(f.w)).toBe(before);expect(f.p.draft).toBe(draft);expect(plan.valueAfter(f.p,'draft')).toBeUndefined();plan.begin();plan.commit();
 expect(f.next.members[0]).toBe(f.p);expect(f.p.draft).toBeUndefined();expect({x:f.p.x,z:f.p.z}).toEqual(f.origin);expect(f.p.motion).toBeUndefined();expect(f.next.items).toEqual(f.intrinsic);expect(JSON.stringify(f.intrinsic)).toBe(gear);expect(f.w.rng).toBe(rng);
});
test('Reform stale draft or immutable deletion recipient refuses before demobilisation and any owner mutation',()=>{
 const f=reformUnit(),plan=prepareReformDeparture260(f.map,f.input);f.command({type:'fire-at-will',pawnIds:[f.p.id],enabled:true});const before=JSON.stringify(f.w);
 expect(plan.current()).toBe(false);expect(()=>plan.begin()).toThrow();expect(JSON.stringify(f.w)).toBe(before);expect(f.p.draft).toBeDefined();
 const q=reformUnit();Object.defineProperty(q.p,'draft',{value:q.p.draft,enumerable:true,writable:true,configurable:false});const frozen=JSON.stringify(q.w);expect(()=>prepareReformDeparture260(q.map,q.input)).toThrow();expect(JSON.stringify(q.w)).toBe(frozen);expect(q.map.pawns).toContain(q.p);
});
