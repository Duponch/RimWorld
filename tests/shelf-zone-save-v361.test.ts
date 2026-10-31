import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotAdoption,type SnapshotMessage,type SnapshotValidationContext} from '../src/bridge/snapshots.ts';
import {createOwnedValidationGeometryOwner,type OwnedGeometryReuseWitness} from '../src/sim/owned-validation-geometry.ts';
import type {OwnedResourceReuseWitness} from '../src/sim/owned-validation-resources.ts';
import {PowerParentValidationCache} from '../src/sim/power-parent-validation.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld} from '../src/sim/serialization.ts';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {validShelfTransport} from '../src/sim/shelf-save.ts';
import {groundCapacity} from '../src/sim/ground-placement.ts';
import {groundMaxStacks,storageCellById} from '../src/sim/shelf-storage.ts';
import {SCHEMA_VERSION,type Cell,type StockpileCell,type World} from '../src/sim/types.ts';
import {shelfZoneCamp,shelfZone,acceptShelfZone,untilShelfZone,exactShelfZone} from './scenarios/shelf-zone-v361.ts';
import {visitorTradeFixture} from './scenarios/visitors.ts';
import {visitorGroupDanger} from '../src/sim/visitors.ts';

// Prepared physical boundaries, not a qualification of the V360 campaign.
// This differential owner mirrors the existing geometry lifecycle; it grants
// no authority to arbitrary World consumers or mutable public callers.
class GeometryDecoder extends SnapshotDecoder {
  readonly #owner=createOwnedValidationGeometryOwner();
  override adopt(packet:SnapshotMessage<true>):SnapshotAdoption {
    this.#owner.discard();
    try{const result=super.adopt(packet);if(result.status==='applied')this.#owner.commit(result.world);else this.#owner.discard();return result;}
    catch(error){this.#owner.discard();throw error;}
  }
  protected override createValidationContext(next:World,_resources?:OwnedResourceReuseWitness,reuse?:OwnedGeometryReuseWitness):SnapshotValidationContext {
    const geometry=this.#owner.prepare(next,reuse);geometry.groundAllows({x:4,z:4});
    return {powerParents:new PowerParentValidationCache(),geometry,resourceFacts:geometry.resourceFacts};
  }
}
function applied(decoder:SnapshotDecoder,packet:SnapshotMessage<true>):World {
  const result=decoder.adopt(structuredClone(packet));expect(result.status,result.status==='resync'?result.reason:'').toBe('applied');
  if(result.status!=='applied')throw Error('Legal prepared shelf checkpoint rejected');return result.world;
}
interface Stage {w:World;target:Cell;retired:StockpileCell}
function constructionStages(){
  const w=shelfZoneCamp(),target={x:17,z:18};shelfZone(w,target,{x:18,z:18});
  const retired=structuredClone(w.stockpiles.find(z=>z.x===target.x&&z.z===target.z)!);
  const riceId=w.nextId;addGroundMaterial(w,'food',5,target,'rice');const woodId=w.nextId;addGroundMaterial(w,'wood',10,{x:12,z:16},'wood');
  acceptShelfZone(w,{type:'designate',kind:'small-shelf',...target,orientation:0,material:'wood'});
  const blueprint:Stage={w:structuredClone(w),target,retired};
  untilShelfZone(w,()=>w.jobs.some(j=>j.kind==='small-shelf'&&j.construction==='frame'),600);
  const frame:Stage={w:structuredClone(w),target,retired};
  untilShelfZone(w,()=>w.structures.some(s=>s.kind==='small-shelf'),600);
  const s=w.structures.find(s=>s.kind==='small-shelf')!,finished:Stage={w:structuredClone(w),target,retired};
  return {blueprint,frame,finished,w,s,riceId,woodId};
}
function installationStage(){
  const f=constructionStages(),{w,s}=f,original=structuredClone(s),target={x:23,z:20};
  acceptShelfZone(w,{type:'designate',kind:'uninstall',targetId:s.id,x:s.x,z:s.z});
  untilShelfZone(w,()=>w.packed.some(p=>p.building.id===s.id),300);
  // The packed object's former geometry is inactive. Redrawing a reserve
  // there must remain legal while the same physical furniture moves elsewhere.
  shelfZone(w,{x:s.x,z:s.z});shelfZone(w,target,{x:24,z:20});
  const retired=structuredClone(w.stockpiles.find(z=>z.x===target.x&&z.z===target.z)!);
  acceptShelfZone(w,{type:'install',structureId:s.id,...target,orientation:1});
  return {...f,w,s,original,installed:{w:structuredClone(w),target,retired} satisfies Stage};
}

test('V361 real blueprint/frame/finished states preserve payment, physical item and exact RAW/full/delta worlds',()=>{
  const f=constructionStages(),cell=f.finished.w.structures.find(s=>s.id===f.s.id)!.shelf!.cells[0]!;
  expect(f.blueprint.w.jobs[0]!.construction).toBe('blueprint');expect(f.blueprint.w.jobs[0]!.escrow.wood).toBe(0);
  expect(f.frame.w.jobs[0]!.construction).toBe('frame');
  expect(f.frame.w.piles.filter(p=>p.item==='wood'&&p.owner.type==='job'&&p.owner.jobId===f.frame.w.jobs[0]!.id).reduce((n,p)=>n+p.quantity,0)).toBe(10);
  expect(f.finished.w.jobs).toEqual([]);expect(f.finished.w.piles.some(p=>p.id===f.woodId)).toBe(false);
  for(const state of [f.blueprint,f.frame,f.finished]){
    exactShelfZone(state.w);expect(state.w.stockpiles.some(z=>z.id===state.retired.id)).toBe(false);
    expect(state.w.piles.find(p=>p.id===f.riceId)).toMatchObject({item:'rice',quantity:5,owner:{type:'ground',...state.target}});
    expect(groundMaxStacks(state.w,state.target)).toBe(state===f.finished?3:1);
    expect(storageCellById(state.w,cell)?.shelfId).toBe(state===f.finished?f.s.id:undefined);
    expect(groundCapacity(state.w,state.target,'steel')).toBe(state===f.finished?150:0);
    for(const Decoder of [SnapshotDecoder,GeometryDecoder]){
      const decoder=new Decoder(),encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0});
      const first=applied(decoder,encoder.encode(state.w,0,1,true)),before=structuredClone(first);
      expect(applied(decoder,encoder.encode(state.w,0,1))).toEqual(state.w);expect(first).toEqual(before);
    }
  }
});

test.each(['blueprint','frame','finished','install'] as const)('V361 corrupt stockpile under real %s is refused by RAW/checkpoint/delta/sparse without polluting confirmed geometry',stage=>{
  const state=stage==='install'?installationStage().installed:constructionStages()[stage],w=state.w;
  exactShelfZone(w);expect(validShelfTransport(w)).toBe(true);
  for(const mutation of ['retired owner restored','zone moved alone'] as const){
    const corrupt=(view:Pick<World,'stockpiles'>)=>{
      if(mutation==='retired owner restored')view.stockpiles.push(structuredClone(state.retired));
      else Object.assign(view.stockpiles[0]!,state.target);
    };
    const raw=structuredClone(w);corrupt(raw);const input=structuredClone(raw);
    expect(validShelfTransport(raw)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow(/shelf|Storage overlaps/i);expect(raw).toEqual(input);
    for(const Decoder of [SnapshotDecoder,GeometryDecoder])for(const transport of ['checkpoint','delta','sparse'] as const){
      const decoder=new Decoder(),encoder=new SnapshotEncoder({structureDelta:transport==='sparse',minimumStructures:0});
      const first=applied(decoder,encoder.encode(w,0,1,true)),before=structuredClone(first);
      const correct=structuredClone(encoder.encode(w,0,1,transport==='checkpoint')),bad=structuredClone(correct);corrupt(bad.world);
      expect(bad.kind).toBe(transport==='checkpoint'?'checkpoint':'delta');
      if(transport==='sparse'&&bad.kind==='delta')expect(bad.structures).toEqual({removed:[],upserted:[]});
      expect(decoder.adopt(bad).status).toBe('resync');expect(first).toEqual(before);
      expect(applied(decoder,correct)).toEqual(w);expect(first).toEqual(before);
    }
  }
});

test('V361 a real packed shelf and install blueprint preserve identity, inactive source cells and exact resumed custody',()=>{
  const f=installationStage(),{w,s,original,installed}=f;exactShelfZone(w);
  expect(w.packed.find(p=>p.building.id===s.id)!.building).toEqual(original);
  expect(w.stockpiles.some(z=>z.x===original.x&&z.z===original.z)).toBe(true);expect(w.stockpiles.some(z=>z.id===installed.retired.id)).toBe(false);
  for(const id of original.shelf!.cells)expect(storageCellById(w,id)).toBeUndefined();
  expect(groundMaxStacks(w,installed.target)).toBe(1);expect(validShelfTransport(w)).toBe(true);
  const encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),decoder=new GeometryDecoder(),first=applied(decoder,encoder.encode(w,0,1,true)),before=structuredClone(first);
  untilShelfZone(w,()=>w.packed.some(p=>p.building.id===s.id&&p.owner.type==='pawn'),300);exactShelfZone(w);
  expect(applied(decoder,encoder.encode(w,0,1))).toEqual(w);expect(first).toEqual(before);
  const restored=deserializeWorld(serializeWorld(w));
  for(let n=0;n<300&&w.jobs.some(j=>j.kind==='install');n++){stepWorld(w);stepWorld(restored);expect(restored).toEqual(w);}
  expect(w.jobs.some(j=>j.kind==='install')).toBe(false);const installedShelf=w.structures.find(b=>b.id===s.id)!;
  expect(installedShelf).toMatchObject({...installed.target,orientation:1});expect(installedShelf.shelf).toEqual(original.shelf);expect(w.packed).toEqual([]);
  exactShelfZone(w);expect(applied(decoder,encoder.encode(w,0,1))).toEqual(w);expect(first).toEqual(before);
});

test('V361 paid shelf229 resumes neutrally; shelf228 future content remains rejected before migration',()=>{
  const {finished}=constructionStages(),w=finished.w,legacy={...structuredClone(w),schemaVersion:229},before=structuredClone(legacy);
  expect(deserializeWorld(JSON.stringify(legacy))).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(legacy).toEqual(before);
  const future={...structuredClone(w),schemaVersion:228};expect(()=>deserializeWorld(JSON.stringify(future))).toThrow(/shelf/i);
  expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(future as World,0,1,true))).status).toBe('resync');
});

test('V361 shelf metadata cannot be exported as trader inventory or gain active capacity through an archive',()=>{
  const {world:w,traderId}=visitorTradeFixture(),trader=w.pawns.find(p=>p.id===traderId)!;
  visitorGroupDanger(w,trader,'danger');untilShelfZone(w,()=>w.visitors!.departed.some(d=>d.pawn.id===traderId),600);exactShelfZone(w);
  const building=structuredClone(constructionStages().s);building.id=w.nextId++;building.shelf!.cells=[w.nextId++];
  const bad=structuredClone(w),departure=bad.visitors!.departed.find(d=>d.pawn.id===traderId)!;
  departure.packed=[{building,owner:{type:'inventory',pawnId:traderId}}];const before=structuredClone(bad);
  expect(validShelfTransport(bad)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/shelf/i);expect(bad).toEqual(before);
  const decoder=new SnapshotDecoder(),encoder=new SnapshotEncoder(),first=applied(decoder,encoder.encode(w,0,1,true)),held=structuredClone(first);
  const correct=structuredClone(encoder.encode(w,0,1,true)),packet=structuredClone(correct);Object.assign(packet,{world:bad});
  expect(decoder.adopt(packet).status).toBe('resync');expect(first).toEqual(held);expect(applied(decoder,correct)).toEqual(w);
  for(const id of building.shelf!.cells)expect(storageCellById(w,id)).toBeUndefined();
});
