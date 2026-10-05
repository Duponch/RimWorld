import { expect,test } from 'vitest';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { tryGroupDeparture } from '../src/sim/group-driver.ts';
import { groupPermission,groupTradeQuote } from '../src/sim/group-authority.ts';
import { captureGroupMass,type AwayGroup } from '../src/sim/group-capture.ts';
import { ensureCommercialPost } from '../src/sim/commercial-post.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { addResolvedInjury,createMedicalRecord,medicalBleed,medicalStatus } from '../src/sim/injury-state.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import type { MaterialPile,Pawn,World } from '../src/sim/types.ts';

function active(w:World):AwayGroup {
  if(!w.group||!('members' in w.group))throw Error('Missing original group owners');
  return w.group;
}
function checkpoint(w:World):World {
  expect(validateWorld(w)).toEqual([]);
  const twin=deserializeWorld(serializeWorld(w));expect(twin).toEqual(w);
  const result=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));
  expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world).toEqual(w);
  return twin;
}
function allItems(w:World):Pick<MaterialPile,'item'|'quantity'>[] {
  return [...w.piles,...active(w).items,...(w.civilianPost?.stock??[]),
    ...(w.groupLosses??[]).flatMap(loss=>loss.items)];
}
const amount=(w:World,item:string)=>allItems(w).filter(p=>p.item===item).reduce((sum,p)=>sum+p.quantity,0);

/** Prepare the last map exit and the visit boundary. The true departure,
 * purchase, clinical death, loss transfer and sale all use their producers. */
function visiting() {
  const w=createScenarioWorld(216,32,'survivors'),members=w.pawns.slice(0,2),survivor=members[0]!,patient=members[1]!;
  for(const p of w.pawns){
    delete p.health;delete p.background;delete p.traits;p.hunger=95;p.rest=95;p.recreation.level=100;
    p.schedule.fill('work');p.apparelAutomation=false;p.skills.social={level:0,xp:0,dailyXp:0,passion:0};
    for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
  }
  addMaterial(w,'food',2,{type:'inventory',pawnId:survivor.id},'survival-meal');
  addMaterial(w,'textile',1200,{type:'inventory',pawnId:survivor.id},'cloth');
  addMaterial(w,'silver',1000,{type:'inventory',pawnId:patient.id},'silver');
  checkpoint(w);
  expect(applyCommand(w,{type:'planet-adopt'}).ok).toBe(true);
  expect(applyCommand(w,{type:'group-start',memberIds:members.map(p=>p.id),destination:w.planet!.civilianTile,sources:[]}).ok).toBe(true);
  const preparing=w.group;if(!preparing||!('manifest' in preparing))throw Error('Missing actual formation');
  preparing.phase='leaving';
  for(const exit of preparing.exits){
    const p=w.pawns.find(p=>p.id===exit.pawnId)!;if(!exit.cell)throw Error('No legal exit');
    p.x=exit.cell.x;p.z=exit.cell.z;p.path=[];p.moveCooldown=0;p.planCooldown=0;delete p.motion;
  }
  tryGroupDeparture(w);const group=active(w);
  expect(group.members[0]).toBe(survivor);expect(group.members[1]).toBe(patient);
  group.phase='at-site';group.tile=w.planet!.civilianTile;group.destination=group.tile;group.route=[group.tile];group.segment=null;group.stop={kind:'at-site'};
  expect(ensureCommercialPost(w)).toBe(true);checkpoint(w);
  return {w,survivor,patient};
}

test('a real loss exposes sale goods while overloaded, then an atomic nonempty sale restores capacity without spending terminal possessions',()=>{
  const {w,survivor,patient}=visiting(),medicine=w.civilianPost!.stock.find(p=>p.item==='medicine')!;
  const purchase=[{pileId:medicine.id,quantity:20}],buy=groupTradeQuote(w,'buy',purchase);
  if(!buy.ok)throw Error(buy.reason);
  expect(applyCommand(w,{type:'group-buy',lines:purchase,quote:buy.signature}).ok).toBe(true);
  expect(active(w).items.find(p=>p.item==='medicine')?.owner).toEqual({type:'inventory',pawnId:survivor.id});
  checkpoint(w);

  patient.health=createMedicalRecord(w.tick);addResolvedInjury(patient.health,'left-hand','cut',6000,()=>.999999);
  patient.health.bloodLoss=BLOOD_UNIT-1;patient.medicalCare='none';
  expect(medicalBleed(patient.health)).toBeGreaterThanOrEqual(.1);
  const status=medicalStatus(patient.health);patient.state=status==='mobile'?'idle':status;
  const beforeDeath=checkpoint(w);
  for(let i=0;i<6&&!w.groupLosses?.some(loss=>loss.pawn.id===patient.id);i++){
    stepWorld(w);stepWorld(beforeDeath);expect(w).toEqual(beforeDeath);
  }
  const loss=w.groupLosses?.find(l=>l.pawn.id===patient.id);if(!loss)throw Error('Missing clinical death and terminal ownership');
  expect(loss.pawn).toBe(patient);expect(loss.tick).toBe(patient.health.death!.tick);
  expect(active(w).members).toEqual([survivor]);const frozen=JSON.stringify(loss),mass=captureGroupMass(active(w).members,active(w).items)!;
  expect(mass.grams).toBeGreaterThan(mass.capacityGrams);checkpoint(w);

  const unchanged=serializeWorld(w),facts=groupPermission(w),catalogue=groupTradeQuote(w,'sell',[]);
  expect(facts.actions.sell.ok).toBe(true);expect(facts.trade?.sells.length).toBeGreaterThan(0);expect(catalogue.ok).toBe(true);
  if(!catalogue.ok)throw Error(catalogue.reason);
  expect(catalogue.mass.grams).toBeGreaterThan(catalogue.mass.capacityGrams);
  expect(applyCommand(w,{type:'group-sell',lines:[],quote:catalogue.signature}).ok).toBe(false);
  const cloth=active(w).items.filter(p=>p.item==='cloth');
  expect(groupTradeQuote(w,'sell',[{pileId:cloth[0]!.id,quantity:1}]).ok).toBe(false);
  expect(serializeWorld(w)).toBe(unchanged);

  const sale=cloth.slice(0,8).map(p=>({pileId:p.id,quantity:p.quantity}));
  expect(sale.reduce((sum,line)=>sum+line.quantity,0)).toBe(600);
  const quote=groupTradeQuote(w,'sell',sale);if(!quote.ok)throw Error(quote.reason);
  expect(quote.mass.grams).toBeLessThanOrEqual(quote.mass.capacityGrams);
  const totals={cloth:amount(w,'cloth'),silver:amount(w,'silver'),medicine:amount(w,'medicine')},rng=w.rng;
  expect(applyCommand(w,{type:'group-sell',lines:sale,quote:quote.signature}).ok).toBe(true);
  expect(active(w).members[0]).toBe(survivor);expect(JSON.stringify(loss)).toBe(frozen);expect(w.rng).toBe(rng);
  expect(captureGroupMass(active(w).members,active(w).items)?.grams).toBe(quote.mass.grams);
  expect(amount(w,'cloth')).toBe(totals.cloth);expect(amount(w,'silver')).toBe(totals.silver);expect(amount(w,'medicine')).toBe(totals.medicine);
  const twin=checkpoint(w);stepWorld(w,5);stepWorld(twin,5);expect(w).toEqual(twin);expect(JSON.stringify(loss)).toBe(frozen);checkpoint(w);
});
