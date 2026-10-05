import { expect,test } from 'vitest';
import { familyDemoCouple,prepareFamilyDemo } from '../scripts/create-family-v214-test-save.ts';
import { producedFamilyOffer } from './helpers/family-v214.ts';
import { applyCommand } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { tryAddRelationship } from '../src/sim/relationship-runtime.ts';
import { relationshipLinkCompare } from '../src/sim/relationship-state.ts';
import { relationshipInspectionRows,offeredRelationshipText } from '../src/ui/relationship-inspection.ts';
import { socialOpinionRows,socialLastText } from '../src/ui/social-inspection.ts';
import { moodInspectionView } from '../src/ui/mood-inspection.ts';
import { SnapshotDecoder,SnapshotEncoder,type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { PresentationChanges } from '../src/bridge/presentation-changes.ts';
import type { World } from '../src/sim/types.ts';

function withArchivedParent():World{
  const w=prepareFamilyDemo(),parent=w.nextId++;
  w.prisonDepartures=[{pawnId:parent,name:'<b>Parent</b> & absent',capturedAt:0,tick:w.tick,cell:{x:0,z:16},items:[]}];
  expect(tryAddRelationship(w,{kind:'parent',aId:familyDemoCouple(w)[0].id,bId:parent,recordedAt:w.tick})).toBe(true);
  return w;
}
function adopted(decoder:SnapshotDecoder,packet:SnapshotMessage):World{
  const result=decoder.adopt(packet);if(result.status!=='applied')throw Error(JSON.stringify(result));return result.world;
}

test('real links keep their direction, literal identity and absent status without a fabricated reciprocal zero',()=>{
  const w=withArchivedParent(),[a,b]=familyDemoCouple(w),parent=w.prisonDepartures![0]!;
  a.social={rng:1,memories:[{kind:'insult',otherId:b.id,at:w.tick,offset:-15}]};
  const before=JSON.stringify(w),rows=socialOpinionRows(w,a),partner=rows.find(row=>row.id===b.id)!;
  expect(partner.own).toBe(partner.reciprocal!-15);expect(partner.causes).toContain('Insulte : -15');expect(partner.relationships).toContain('Partenaire');
  const absent=rows.find(row=>row.id===parent.pawnId)!;
  expect(absent).toMatchObject({name:'<b>Parent</b> & absent (absent)',own:30,reciprocal:null,status:'Absent',relationships:'Parent'});
  expect(absent.reciprocalCauses).toContain('indisponible');expect(relationshipInspectionRows(w,a).find(row=>row.id===parent.pawnId)).toMatchObject({kinds:['parent'],status:'departed'});
  expect(relationshipInspectionRows(w,{id:parent.pawnId}).find(row=>row.id===a.id)?.kinds).toContain('child');
  expect(JSON.stringify(w)).toBe(before);
  a.state='dead';expect(socialOpinionRows(w,b).find(row=>row.id===a.id)?.reciprocal).toBeNull();
  expect(socialOpinionRows(w,a).every(row=>row.own===null)).toBe(true);
});

test('the actual future offer announces one existing human and admission registers that exact link without a false family history',()=>{
  const prepared=prepareFamilyDemo(),w=producedFamilyOffer(),offer=structuredClone(w.arrivals!.pending!),link=offer.relationship!;
  expect(prepared.arrivals!.pending).toBeUndefined();expect(w.relationships).toEqual(prepared.relationships);expect(w.pawns).toHaveLength(3);
  const name=w.pawns.find(p=>p.id===link.otherId)!.name,announcement=offeredRelationshipText(w,link);
  expect(announcement).toContain(name);expect(announcement).toContain('Présent');expect(offeredRelationshipText(w,undefined)).toBe('');
  const restored=deserializeWorld(serializeWorld(w));expect(restored.arrivals!.pending!.relationship).toEqual(link);
  const decoder=new SnapshotDecoder(),encoder=new SnapshotEncoder(),confirmed=adopted(decoder,structuredClone(encoder.encode(w,0,0)));
  const good=structuredClone(encoder.encode(w,0,0,true)),missingAge=structuredClone(good);delete missingAge.world.arrivals!.pending!.age;delete missingAge.world.arrivals!.pending!.background;
  expect(decoder.adopt(missingAge).status).toBe('resync');expect(confirmed).toEqual(w);expect(adopted(decoder,good)).toEqual(w);
  const nextId=w.nextId;expect(applyCommand(w,{type:'answer-arrival',offerId:offer.id,accept:true}).ok).toBe(true);
  const joined=w.pawns.at(-1)!;expect(joined.id).toBe(nextId);expect(joined.name).toBe(offer.name);
  const row=relationshipInspectionRows(w,joined).find(row=>row.id===link.otherId)!;expect(row.kinds).toContain(link.kind);expect(row.name).toBe(name);
  expect(joined.familyBereavement).toBeUndefined();expect(joined.romanceMemories).toBeUndefined();expect(validateWorld(w)).toEqual([]);
  expect(serializeWorld(restored)).not.toBe(serializeWorld(w));
});

test('same-tick family packets validate the complete human and Thing namespace before atomic checkpoint or delta adoption',()=>{
  for(const checkpoint of [false,true]){
    const w=withArchivedParent();expect(validateWorld(w)).toEqual([]);
    const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),confirmed=adopted(decoder,structuredClone(encoder.encode(w,0,0))),raw=JSON.stringify(confirmed);
    const good=structuredClone(encoder.encode(w,0,0,checkpoint));
    const corruptions:Array<(packet:SnapshotMessage)=>void>=[
      p=>{p.world.relationships!.links[0]!.bId=w.piles[0]!.id;},
      p=>{p.world.relationships!.links.push({...p.world.relationships!.links[0]!});},
      p=>{const link=p.world.relationships!.links.find(l=>l.kind==='parent')!;p.world.relationships!.links.push({...link,aId:link.bId,bId:link.aId});p.world.relationships!.links.sort(relationshipLinkCompare);},
      p=>{const old=p.world.prisonDepartures![0]!.pawnId,id=w.structures[0]!.id;p.world.prisonDepartures![0]!.pawnId=id;p.world.relationships!.links.find(l=>l.bId===old)!.bId=id;},
      p=>{Object.assign(p.world.prisonDepartures![0]!,{name:undefined});},
      p=>{Object.assign(p.world.prisonDepartures![0]!,{name:{text:'Nom forgé'}});},
      p=>{p.world.prisonDepartures![0]!.tick=w.tick+1;},
      p=>{p.world.pawns[0]!.romanceMemories=[{otherId:w.piles[0]!.id,kind:'rebuffed-opinion',at:w.tick}];},
    ];
    for(const corrupt of corruptions){const bad=structuredClone(good);corrupt(bad);expect(decoder.adopt(bad).status).toBe('resync');expect(JSON.stringify(confirmed)).toBe(raw);}
    expect(adopted(decoder,good)).toEqual(w);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  }
  const old=prepareFamilyDemo();delete old.relationships;(old as {schemaVersion:number}).schemaVersion=194;
  const packet=structuredClone(new SnapshotEncoder().encode(old,0,0));expect(new SnapshotDecoder().adopt(packet).status).toBe('applied');
  for(const forge of [(p:SnapshotMessage)=>Object.assign(p.world,{relationships:undefined}),
    (p:SnapshotMessage)=>Object.assign(p.world.pawns[0]!,{romanceMemories:undefined}),
    (p:SnapshotMessage)=>Object.assign(p.world.pawns[0]!,{familyBereavement:undefined})]){
    const bad=structuredClone(packet);forge(bad);expect(new SnapshotDecoder().adopt(bad).status).toBe('resync');
  }
});

test('confirmed couple and housing changes publish at the same tick while the Bio and mood projections only read state',()=>{
  const w=prepareFamilyDemo(),[a,b]=familyDemoCouple(w),changes=new PresentationChanges();
  expect(changes.capture(w)).toBe(true);expect(changes.capture(structuredClone(w))).toBe(false);
  expect(moodInspectionView(w,a).thoughts.some(t=>t.id==='want-shared-room')).toBe(true);
  const beds=w.structures.filter(s=>s.kind==='bed');
  for(const [i,p] of [a,b].entries())expect(applyCommand(w,{type:'assign-bed',bedId:beds[i]!.id,pawnId:p.id}).ok).toBe(true);
  expect(changes.capture(w)).toBe(true);expect(changes.capture(w)).toBe(false);expect(w.tick).toBe(0);
  const before=JSON.stringify(w);expect(moodInspectionView(w,a).thoughts.some(t=>t.id==='want-shared-room')).toBe(false);expect(JSON.stringify(w)).toBe(before);
  a.social={rng:1,memories:[],last:{kind:'romance-attempt',otherId:b.id,initiated:true,tick:w.tick}};
  expect(socialLastText(w,a)).toContain('tenté un rapprochement amoureux');expect(changes.capture(w)).toBe(true);
});
