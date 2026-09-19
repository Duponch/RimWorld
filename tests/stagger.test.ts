import { SCHEMA_VERSION } from '../src/sim/types';
import { expect,test } from 'vitest';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { applyBulletStagger,expireStaggers } from '../src/sim/stagger';
import { startTravel } from '../src/sim/movement';
import { travelPieces,travelEnd,neutralTravelDuration,type TravelSegment } from '../src/sim/travel-timing';
import { MotionRecorder } from '../src/bridge/motion-tracks';
import { MotionTimeline } from '../src/render/MotionTimeline';
import { PawnLayer } from '../src/render/PawnLayer';
import { travelHeight } from '../src/render/furniture-motion';
import { equipmentCamp } from './scenarios/equipment';
import { rescueCamp } from './scenarios/rescue';
import { validateRescues } from '../src/sim/rescue-save';
import { firingCamp } from './scenarios/shooting';
import { registerWorldProjectile } from '../src/sim/projectile-system';
import { createBulletFlight } from '../src/sim/bullet-flight';

const fraction=(m:TravelSegment,t:number)=>{
  const p=travelPieces(m).find(p=>t<p.end)??travelPieces(m).at(-1)!;
  const a=Math.max(0,Math.min(1,(t-p.start)/(p.end-p.start)));
  return (p.fromFraction??0)+a*((p.toFraction??1)-(p.fromFraction??0));
};

test('piecewise distance matches independent fine-step integration on cardinal/diagonal, terrain and slow bodies',()=>{
  for(const diagonal of [false,true])for(const speed of [1,.8,.128])for(const delay of [0,.2,5]) {
    const m:TravelSegment={from:{x:2,z:2},to:{x:3,z:diagonal?3:2},start:0,end:0,speedFactor:speed,terrainDelay:delay,stagger:[{start:.7,end:10.2},{start:11,end:20.5},{start:22,end:31.5}]};
    m.end=travelEnd(m);const duration=neutralTravelDuration(m),rate=Math.max(.17,duration/45);
    let paid=0,elapsed=0;const dt=.0001;
    while(paid<duration&&elapsed<50){const factor=m.stagger!.some(s=>elapsed+dt/2>=s.start&&elapsed+dt/2<s.end)?rate:1;paid+=factor*dt;elapsed+=dt;}
    expect(Math.abs(elapsed-m.end)).toBeLessThan(.00021);expect(m.end).toBeLessThanOrEqual(45.00001);
    const pieces=travelPieces(m);expect(pieces[0].fromFraction).toBe(0);expect(pieces.at(-1)!.toFraction).toBeCloseTo(1,12);
    for(let i=1;i<pieces.length;i++){expect(pieces[i].start).toBeCloseTo(pieces[i-1].end,12);expect(pieces[i].fromFraction).toBeCloseTo(pieces[i-1].toFraction!,12);}
  }
});

test('impact changes only future movement, refreshes without stacking and carries exact history through save and bridge',()=>{
  const w=equipmentCamp(1),p=w.pawns[0],recorder=new MotionRecorder();
  applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true});startTravel(w,p,{x:p.x+1,z:p.z+1});p.state='moving';
  const old=structuredClone(p.motion!),at=w.tick*10+7;w.tick++;p.moveCooldown=Math.max(0,p.motion!.end-w.tick);
  applyBulletStagger(w,p,at,.5);expect(p.stagger).toBeUndefined();expect(p.motion).toEqual(old);
  applyBulletStagger(w,p,at,1);const first=structuredClone(p.motion!);expect(p.stagger).toEqual({sinceCore:at,untilCore:at+95});
  expect(fraction(first,at/10)).toBeCloseTo(fraction(old,at/10),10);expect(fraction(first,at/10+.1)-fraction(first,at/10)).toBeCloseTo(.017/neutralTravelDuration(first),9);
  recorder.capture(w);const earlier=structuredClone(recorder.snapshot());
  const saved=deserializeWorld(serializeWorld(w));expect(saved).toEqual(w);
  w.tick++;p.moveCooldown=Math.max(0,p.motion!.end-w.tick);applyBulletStagger(w,p,w.tick*10,1);
  expect(p.stagger!.untilCore).toBe(w.tick*10+95);expect(p.motion!.stagger).toHaveLength(1);
  for(let t=old.start;t<w.tick;t+=.1)expect(fraction(p.motion!,t)).toBeCloseTo(fraction(first,t),10);
  recorder.capture(w);expect(earlier[0].segments.at(-1)!.end).toBe(first.end);
  const timeline=new MotionTimeline();timeline.adopt(w.tick,0,recorder.snapshot(),0,true);
  for(let t=old.start;t<=p.motion!.end;t+=.1){timeline.tick=t;const s=timeline.segment(p.id)!;const f=(s.fromFraction??0)+Math.max(0,Math.min(1,(t-s.start)/(s.end-s.start)))*((s.toFraction??1)-(s.fromFraction??0));expect(f).toBeCloseTo(fraction(p.motion!,t),9);}
  const copy=deserializeWorld(serializeWorld(w));for(let i=0;i<25;i++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);}
  expect(p.stagger).toBeUndefined();
  const historical=equipmentCamp(1) as any;startTravel(historical,historical.pawns[0],{x:4,z:5});historical.schemaVersion=56;const skills=structuredClone(historical.pawns[0].skills);delete historical.pawns[0].skills.melee;
  expect(deserializeWorld(JSON.stringify(historical))).toEqual({...historical,schemaVersion:SCHEMA_VERSION,pawns:historical.pawns.map((p:any)=>({...p,skills}))});
  historical.pawns[0].stagger={sinceCore:w.tick*10,untilCore:w.tick*10+95};expect(()=>deserializeWorld(JSON.stringify(historical))).toThrow(/version 56/);
  const bad=structuredClone(saved) as any;bad.pawns[0].motion.stagger[0].end+=.01;expect(validateWorld(bad).length).toBeGreaterThan(0);
  const early=structuredClone(saved) as any;early.schemaVersion=56;delete early.pawns[0].stagger;expect(()=>deserializeWorld(JSON.stringify(early))).toThrow(/version 56/);
});

test('real moving-target impact, immediate visible slowdown and no attack cooldown penalty',()=>{
  const w=equipmentCamp(2),p=w.pawns[1];w.rng=81733;p.x=20;p.z=10;
  applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true});applyCommand(w,{type:'draft-move',pawnIds:[p.id],target:{x:20,z:18},queue:false});
  const bullet=registerWorldProjectile(w,createBulletFlight({origin:{x:5.5,z:10.5},destination:{x:20.5,z:10.5},launcherKey:`pawn:${w.pawns[0].id}`,equipmentKey:null,intendedKey:`pawn:${p.id}`,usedKey:`pawn:${p.id}`,flags:7,preventFriendlyFire:false,speedPerCoreTick:.55}),'normal',{friendlyPawnIds:w.pawns.map(p=>p.id),friendlyFireFactor:.4});
  const recorder=new MotionRecorder(),layer=new PawnLayer();layer.update(w,0,true);
  for(let i=0;i<8&&!bullet.arrival;i++){stepWorld(w);recorder.capture(w);expect(validateWorld(w)).toEqual([]);}
  expect(bullet.arrival?.effect).toBe('pawn');expect(p.stagger).toBeDefined();expect(p.motion!.stagger).toBeDefined();
  const m=p.motion!,timeline=new MotionTimeline();timeline.adopt(w.tick,1,recorder.snapshot(),0,true);layer.update(w,0,true);
  for(let tick=m.start;tick<m.end;tick+=.1){timeline.tick=tick;layer.updateTravel(w,timeline);const g=(layer as any).pawnMesh.geometry,a=g.getAttribute('aFrom'),b=g.getAttribute('aTo'),t=g.getAttribute('aTravel'),clock=layer.travelTime.value;const alpha=Math.max(0,Math.min(1,(clock-t.getX(1))/(t.getY(1)-t.getX(1))));const z=a.getZ(1)+(b.getZ(1)-a.getZ(1))*alpha;expect(z).toBeCloseTo(m.from.z+(m.to.z-m.from.z)*fraction(m,tick),4);}
  // Presentation-only surfaces: split timing must not restart the furniture
  // climb, nor change past height when the trajectory is retimed.
  for(const [y0,y1] of [[0,.85],[.85,0]]) {
    (layer as any).travelSurfaces=new Map([[m.from.z*w.width+m.from.x,y0],[m.to.z*w.width+m.to.x,y1]]);(layer as any).travelKeys.clear();
    for(let tick=m.start;tick<m.end;tick+=.05) {
      timeline.tick=tick;layer.updateTravel(w,timeline);const g=(layer as any).pawnMesh.geometry,a=g.getAttribute('aFrom'),b=g.getAttribute('aTo'),t=g.getAttribute('aTravel');
      const alpha=Math.max(0,Math.min(1,(layer.travelTime.value-t.getX(1))/(t.getY(1)-t.getX(1)))),distance=t.getZ(1)+(t.getW(1)-t.getZ(1))*alpha;
      const vertical=Math.max(0,Math.min(1,3*distance-(y0>y1?2:0))),gpuY=a.getY(1)+(b.getY(1)-a.getY(1))*vertical;
      expect(gpuY).toBeCloseTo(travelHeight(y0,y1,fraction(m,tick)),4);
    }
  }
  const after=deserializeWorld(serializeWorld(w));for(let i=0;i<20;i++){stepWorld(w);stepWorld(after);expect(w).toEqual(after);}
  expect(p.stagger).toBeUndefined();expect(p.z).toBeGreaterThan(m.to.z);
  const firing=firingCamp(),shooter=firing.pawns[0],since=firing.tick*10;
  applyCommand(firing,{type:'shoot',pawnIds:[shooter.id],targetId:firing.pawns[1].id});applyBulletStagger(firing,shooter,since,1);
  stepWorld(firing,2);expect(firing.projectiles?.[0].emittedAtCore).toBe(since+18);expect(shooter.shooting?.stance).toMatchObject({phase:'cooldown',endsAtCore:since+114});
});

test('carried patient and carrier share retimed travel; expiry and next edge retain the remaining fraction',()=>{
  const w=rescueCamp(),carrier=w.pawns[0],patient=w.pawns[1];
  expect(applyCommand(w,{type:'order-rescue',pawnId:carrier.id,patientId:patient.id,queue:false}).ok).toBe(true);
  for(let i=0;i<120&&carrier.rescue?.phase!=='carry';i++)stepWorld(w);
  for(let i=0;i<20&&!carrier.moveCooldown;i++)stepWorld(w);
  expect(carrier.rescue?.phase).toBe('carry');expect(carrier.motion).toBeDefined();
  applyBulletStagger(w,carrier,w.tick*10,1);expect(patient.motion).toEqual(carrier.motion);expect(patient.motion?.stagger).not.toBe(carrier.motion?.stagger);
  const copy=deserializeWorld(serializeWorld(w));
  const divergent=structuredClone(w);divergent.pawns[1].motion!.stagger![0].end+=.1;
  expect(validateWorld(divergent).length).toBeGreaterThan(0);
  expect(validateRescues(divergent)).toContain('Carried patient does not share carrier edge.');
  for(let i=0;i<120&&carrier.rescue;i++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);}
  expect(carrier.rescue).toBeUndefined();expect(patient.need?.kind).toBe('sleep');
  const simple=equipmentCamp(1),walker=simple.pawns[0];startTravel(simple,walker,{x:4,z:5});simple.tick++;applyBulletStagger(simple,walker,simple.tick*10,1);
  const end=walker.motion!.end;simple.tick=Math.ceil(end);walker.moveCooldown=0;expireStaggers(simple);startTravel(simple,walker,{x:5,z:5});
  expect(walker.motion!.start).toBe(end);expect(walker.motion!.end-walker.motion!.start).toBeCloseTo(3,8);
});
