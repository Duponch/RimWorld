import {expect,test} from 'vitest';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {medicalCamp} from './scenarios/health';
import {prepareConstructionFlora} from './scenarios/construction-flora-v348';
import {fixtureBuilding} from './scenarios/deconstruction';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {refreshStock} from '../src/sim/materials';
import {RoofContext} from '../src/sim/roof-rules';
import {gatherResource,clearingDuration} from '../src/sim/gathering';
import {damagePile} from '../src/sim/thing-damage';
import {specificWorkActivity} from '../src/ui/work-activity';
import {queryJobStatus} from '../src/sim/diagnostics';
import {actionProgress} from '../src/render/action-feedback';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization';
import type {World,Resource} from '../src/sim/types';

// Bounded 32-cell saturated-world fixtures. Real commands/work/wood damage and
// literal common chop producer; not a natural campaign or saved-player repair.
const wood=(w:World)=>w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0);
function exact(w:World){expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);const raw=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1,true)));expect(raw.status).toBe('applied');if(raw.status==='applied')expect(raw.world).toEqual(w);}
function camp(mode:'wall'|'roof'){
  const w=medicalCamp();w.tick=2000;const p=w.pawns[0]!;Object.assign(p,{x:8,z:10,name:'Salomé'});p.priorities.build=1;
  const r:Resource={id:w.nextId++,kind:'tree',species:'oak',x:12,z:10,amount:46,growth:1,growthTick:w.tick};w.resources=[r];
  if(mode==='roof'){const support=fixtureBuilding(w,'wall',11,10);Object.assign(support,{material:'wood'});expect(new RoofContext(w).supported(10*w.width+12)).toBe(true);}
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)if(!w.structures.some(s=>s.x===x&&s.z===z))w.piles.push({id:w.nextId++,kind:'wood',item:'wood',quantity:75,owner:{type:'ground',x,z}});
  refreshStock(w);prepareConstructionFlora(w);exact(w);
  const result=applyCommand(w,mode==='wall'?{type:'designate',kind:'wall',material:'wood',x:12,z:10}:{type:'area',action:'build-roof',from:{x:12,z:10},to:{x:12,z:10}});expect(result.ok).toBe(true);exact(w);
  // Roof areas are intentions. The actual five-tick scheduler owns Job IDs.
  if(mode==='roof')for(let n=0;n<5&&!w.jobs.some(j=>j.kind==='build-roof');n++)stepWorld(w);
  exact(w);const job=w.jobs.find(j=>j.kind===(mode==='wall'?'wall':'build-roof'))!;expect(job).toBeDefined();return {w,p,r,job};
}

test.each(['wall','roof'] as const)('V351 saturated real %s clearance retains its paid work/claim through refusal, then resolves once after true space is freed',mode=>{
  const {w,p,r,job}=camp(mode),initial=wood(w),rng=w.rng,duration=clearingDuration(r);let blocked=false;
  for(let n=0;n<240&&!blocked;n++){stepWorld(w);expect(w.resources.includes(r)).toBe(true);blocked=job.clearance?.progress===duration-1&&job.clearance.workRemainder===9999;}
  expect(blocked).toBe(true);expect(job.status).toBe('active');expect(job.reservedBy).toBe(p.id);expect(p.jobId).toBe(job.id);expect(wood(w)).toBe(initial);expect(w.rng).toBe(rng);exact(w);
  const beforeReaders=structuredClone(w);
  expect(specificWorkActivity(w,p)).toBe('En attente · place pour les produits du dégagement');
  expect(queryJobStatus(w,job)).toMatchObject({code:'blocked',reason:'Attend de la place pour les produits du dégagement.'});
  expect(actionProgress(w,p)).toMatchObject({kind:'clearing',completed:duration-0.0001,total:duration});
  expect(w).toEqual(beforeReaders);
  const copy=deserializeWorld(serializeWorld(w)),skill=structuredClone(p.skills.plants),ids=w.nextId,piles=structuredClone(w.piles),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();expect(p.planCooldown).toBe(20);expect(decoder.adopt(structuredClone(encoder.encode(w,0,1,true))).status).toBe('applied');
  for(let n=1;n<=60;n++){
    stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(job.clearance).toMatchObject({progress:duration-1,workRemainder:9999});expect(job.reservedBy).toBe(p.id);expect(p.jobId).toBe(job.id);expect(p.state).toBe('working');expect(p.planCooldown).toBe(n%20===0?20:20-n%20);expect(p.skills.plants).toEqual(skill);expect(w.resources.includes(r)).toBe(true);expect(wood(w)).toBe(initial);expect(w.piles).toEqual(piles);expect(w.rng).toBe(rng);expect(w.nextId).toBe(ids);
    const raw=decoder.adopt(structuredClone(encoder.encode(w,0,1,false)));expect(raw.status).toBe('applied');if(raw.status==='applied')expect(raw.world).toEqual(w);
  }exact(w);
  // Three genuine lost stacks give room both for the chop output and, for a
  // wall, the existing item that must later be moved off its final footprint.
  for(const c of [{x:12,z:9},{x:13,z:10},{x:12,z:11}]){const pile=w.piles.find(i=>i.owner.type==='ground'&&i.owner.x===c.x&&i.owner.z===c.z)!;expect(damagePile(w,pile,150,'bomb')).toBe(true);}expect(wood(w)).toBe(initial-225);exact(w);
  const expected=deserializeWorld(serializeWorld(w)),expectedTree=expected.resources.find(x=>x.id===r.id)!,quantity=gatherResource(expected,expectedTree,'chop',job.id,expected.pawns[0]!);expect(quantity).not.toBeNull();expect(quantity!).toBeGreaterThan(0);
  for(let n=0;n<20&&w.resources.includes(r);n++)stepWorld(w);expect(w.resources.includes(r)).toBe(false);expect(w.piles).toEqual(expected.piles);expect(w.rng).toBe(expected.rng);expect(wood(w)).toBe(initial-225+quantity!);expect(w.events.filter(e=>e.message.includes('a dégagé le chantier'))).toHaveLength(1);exact(w);
  const reloaded=deserializeWorld(serializeWorld(w));for(let n=0;n<500&&w.jobs.some(j=>j.id===job.id);n++){stepWorld(w);stepWorld(reloaded);expect(reloaded).toEqual(w);}expect(w.jobs.some(j=>j.id===job.id)).toBe(false);expect(wood(w)).toBe(initial-225+quantity!-(mode==='wall'?5:0));expect(w.events.filter(e=>e.message.includes('a dégagé le chantier'))).toHaveLength(1);if(mode==='wall')expect(w.structures.some(s=>s.kind==='wall'&&s.x===12&&s.z===10)).toBe(true);else expect(w.roofing!.constructed).toContain(10*w.width+12);exact(w);
});

test('V351 cancelling a genuinely blocked clearance preserves its original tree and all wood instead of deleting the obstacle',()=>{
  const {w,p,r,job}=camp('wall');for(let n=0;n<240&&(job.clearance?.progress!==99||job.clearance?.workRemainder!==9999);n++)stepWorld(w);expect(job.clearance).toMatchObject({progress:99,workRemainder:9999});const quantity=wood(w),rng=w.rng;
  expect(applyCommand(w,{type:'cancel-job',jobId:job.id}).ok).toBe(true);expect(w.resources.includes(r)).toBe(true);expect(wood(w)).toBe(quantity);expect(w.rng).toBe(rng);expect(p.jobId).toBeNull();expect(w.jobs.some(j=>j.id===job.id)).toBe(false);exact(w);
});
