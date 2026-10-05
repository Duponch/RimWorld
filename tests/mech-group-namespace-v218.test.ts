// Private, unexecuted candidate. Imports target tests/mech-group-namespace-v218.test.ts.
import { expect,test } from 'vitest';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { tryGroupDeparture } from '../src/sim/group-driver.ts';
import { captureHumanOwners } from '../src/sim/human-owners.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { groundCapacity } from '../src/sim/ground-placement.ts';
import { captureStandability } from '../src/sim/furniture-travel.ts';
import { enableMechanoidRaids,createMechanoidRaid,advanceMechanoidRaid } from '../src/sim/mechanoid-raids.ts';
import { createMechaMedicalRecord,commitMechanoidImpact } from '../src/sim/mechanoid-health.ts';
import { advanceMechanoidCorpses } from '../src/sim/mechanoid-corpse.ts';
import { damagePile,pileMaxHp } from '../src/sim/thing-damage.ts';
import { createMedicalRecord,addResolvedInjury,medicalBleed,medicalStatus } from '../src/sim/injury-state.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import type { Cell,Pawn,World } from '../src/sim/types.ts';

const identityError='Mechanical historical identity reused by another owner.';
const noMechanicalDraw=()=>{throw Error('A solid mechanical injury must not draw biological randomness.');};

function checkpoint(w:World):void {
  expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const adopted=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));
  expect(adopted.status).toBe('applied');
  if(adopted.status==='applied')expect(adopted.world).toEqual(w);
}

/** Preserve real terrain, flora, possessions and every incident calendar. */
function departure() {
  const w=createScenarioWorld(216,32,'crashlanded');
  for(const p of w.pawns){
    delete p.health;delete p.background;delete p.traits;
    p.hunger=95;p.rest=95;p.recreation.level=100;p.apparelAutomation=false;p.schedule.fill('work');
    for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
  }
  checkpoint(w);
  const people=w.pawns.slice(0,2),person=people[0]!;
  addMaterial(w,'food',people.length,{type:'inventory',pawnId:person.id},'survival-meal');
  addMaterial(w,'silver',3,{type:'inventory',pawnId:person.id},'silver');
  const silver=w.piles.find(p=>p.item==='silver'&&p.owner.type==='inventory'&&p.owner.pawnId===person.id);
  if(!silver)throw Error('The real inventory silver was not created.');
  checkpoint(w);
  expect(applyCommand(w,{type:'planet-adopt'}).ok).toBe(true);
  expect(applyCommand(w,{type:'group-start',memberIds:people.map(p=>p.id),destination:w.planet!.civilianTile,sources:[]}).ok).toBe(true);
  const formation=w.group;
  if(!formation||!('exits' in formation))throw Error('The real group formation is missing.');
  // Prepare only the final legal exit frontier, as in the V216 owner tests.
  // The atomic producer below transfers the original people and possessions.
  formation.phase='leaving';
  for(const exit of formation.exits){
    const p=w.pawns.find(p=>p.id===exit.pawnId);
    if(!p||!exit.cell)throw Error('The formation has no real member or legal exit.');
    p.x=exit.cell.x;p.z=exit.cell.z;p.state='idle';p.path=[];
    p.moveCooldown=0;p.planCooldown=0;delete p.motion;
  }
  tryGroupDeparture(w);
  const away=w.group;
  if(!away||!('members' in away))throw Error('The original-owner departure did not complete.');
  expect(away.members).toEqual(people);
  expect(away.members[0]).toBe(person);expect(away.items).toContain(silver);
  expect(w.pawns.some(p=>p.id===person.id)).toBe(false);expect(w.piles.some(p=>p.id===silver.id)).toBe(false);
  // A stationary current site is prepared; no geographic journey is claimed.
  away.phase='at-site';away.tile=w.planet!.civilianTile;away.destination=away.tile;
  away.route=[away.tile];away.segment=null;away.stop={kind:'at-site'};
  checkpoint(w);
  return {w,person,silver};
}

/** Use existing free edge cells, including the real capacity for a whole corpse. */
function raidSites(w:World):Cell[] {
  const stands=captureStandability(w),occupied=new Set<number>(),sites:Cell[]=[];
  for(const a of [...w.pawns,...(w.wildlife?.animals??[]),...(w.mechanoids??[])]){
    occupied.add(a.z*w.width+a.x);
    if(a.motion&&a.motion.end>w.tick)occupied.add(a.motion.from.z*w.width+a.motion.from.x);
  }
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++){
    if(x!==0&&z!==0&&x!==w.width-1&&z!==w.height-1)continue;
    const cell={x,z};
    if(!occupied.has(z*w.width+x)&&stands(cell)&&groundCapacity(w,cell,'scyther-corpse')>=1)sites.push(cell);
    if(sites.length===2)return sites;
  }
  throw Error('No two legal mechanical entry/corpse cells exist in the actual map.');
}

function retireOneMechanicalOwner(w:World):number {
  expect(enableMechanoidRaids(w)).toBe(true);
  const group=createMechanoidRaid(w,{budget:300,roster:['scyther','scyther']},{rng:0x12345678},raidSites(w));
  if(!group)throw Error('The real mechanical raid was refused.');
  checkpoint(w);
  const actor=w.mechanoids!.find(m=>m.id===group.members[0])!;
  const record=createMechaMedicalRecord(w.tick);
  addResolvedInjury(record,'scyther-reactor','crack',27000,noMechanicalDraw);
  expect(commitMechanoidImpact(w,actor,record,{rng:w.rng},w.tick*10)).toBe(true);
  advanceMechanoidRaid(w);advanceMechanoidCorpses(w);
  const corpse=w.piles.find(p=>p.id===actor.id&&p.mechCorpse);
  if(!corpse)throw Error('The same-ID physical corpse was not produced.');
  expect(corpse.mechCorpse!.health.death).toBeDefined();checkpoint(w);
  expect(damagePile(w,corpse,pileMaxHp(corpse,w.schemaVersion),'bullet')).toBe(true);
  expect(w.mechanoids!.some(m=>m.id===actor.id)).toBe(false);
  expect(w.piles.some(p=>p.id===actor.id)).toBe(false);
  expect(w.destroyed?.items?.['scyther-corpse']).toBe(1);
  expect(w.raids!.mechActive).toBe(group);expect(group.phase).toBe('assault');
  expect(group.lost).toEqual([actor.id]);expect(w.mechanoids!.some(m=>m.state!=='dead')).toBe(true);
  // A genuine historical, absent participant remains legal after the fix.
  checkpoint(w);return actor.id;
}

function refusesIdentityReuse(w:World,retiredId:number,ownedId:number):void {
  const original=JSON.stringify(w),bad=structuredClone(w),group=bad.raids!.mechActive!;
  expect(group.members).toContain(retiredId);expect(group.lost).toContain(retiredId);
  // Only reference fields change. Owners, baseline, calendar, anatomy and RNG do not.
  group.members=group.members.map(id=>id===retiredId?ownedId:id);
  group.lost=group.lost.map(id=>id===retiredId?ownedId:id).sort((a,b)=>a-b);
  expect(()=>validateWorld(bad)).not.toThrow();expect(validateWorld(bad)).toContain(identityError);
  expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/Invalid.*save/);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,1,true)));
  if(first.status!=='applied')throw Error(`Baseline adoption refused: ${first.status}`);
  const retained=JSON.stringify(first.world),packet=structuredClone(encoder.encode(bad,0,1,true));
  const refusals:ReturnType<SnapshotDecoder['adopt']>[]=[];
  expect(()=>{refusals.push(decoder.adopt(packet));}).not.toThrow();expect(refusals[0]?.status).toBe('resync');
  expect(JSON.stringify(first.world)).toBe(retained);
  const retry=decoder.adopt(structuredClone(encoder.encode(w,0,1,true)));
  expect(retry.status).toBe('applied');if(retry.status==='applied')expect(retry.world).toEqual(w);
  expect(JSON.stringify(w)).toBe(original);
}

test('a retired mechanical participant cannot alias original group people or possessions, living or clinically terminal',()=>{
  const {w,person,silver}=departure(),retiredId=retireOneMechanicalOwner(w);
  const living=captureHumanOwners(w).byId.get(person.id);
  expect(living?.kind).toBe('group-away');expect(living?.pawn).toBe(person);expect(living?.items).toContain(silver);
  refusesIdentityReuse(w,retiredId,person.id);refusesIdentityReuse(w,retiredId,silver.id);

  // The established V216 clinical producer, not a fabricated death or GroupLoss.
  person.health=createMedicalRecord(w.tick);
  addResolvedInjury(person.health,'left-hand','cut',6000,()=>.999999);
  person.health.bloodLoss=BLOOD_UNIT-1;person.medicalCare='none';
  expect(medicalBleed(person.health)).toBeGreaterThanOrEqual(.1);
  const status=medicalStatus(person.health);person.state=status==='mobile'?'idle':status;
  checkpoint(w);
  for(let i=0;i<6&&!w.groupLosses?.some(l=>l.pawn.id===person.id);i++)stepWorld(w);
  const loss=w.groupLosses?.find(l=>l.pawn.id===person.id);
  if(!loss)throw Error('The real clinical terminal transfer did not occur within six ticks.');
  expect(loss.pawn).toBe(person);expect(loss.items).toContain(silver);
  expect(loss.tick).toBe(person.health!.death!.tick);
  expect(captureHumanOwners(w).byId.get(person.id)?.kind).toBe('group-loss');
  expect(w.raids!.mechActive!.lost).toContain(retiredId);
  checkpoint(w);
  refusesIdentityReuse(w,retiredId,loss.pawn.id);refusesIdentityReuse(w,retiredId,silver.id);
});
