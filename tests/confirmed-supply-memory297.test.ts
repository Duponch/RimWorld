import {expect,test} from 'vitest';
import {MotionTimeline} from '../src/render/MotionTimeline';

// Pure NUM presentation contracts: declared monotonically received local ticks
// and wall-time delivery only. No World, Engine, Native grant, private-field
// seed or mutation of estimator state. One local tick is ten physical Cores.
function suppliedAtTwentyLocalTicksPerSecond(){
 const clock=new MotionTimeline();let latest=100,previous=100;
 clock.adopt(latest,6,[],0,true,true,true);
 // Fifty-millisecond receipts of one confirmed local tick:20/s, not36/s.
 // Startup receives its ordinary reserve before the measured running interval.
 for(let at=10;at<=1100;at+=10){
  if(at%50===0){latest=100+at/50;clock.adopt(latest,6,[],at,false,true,true);}
  const shown=clock.advance(at);
  expect(shown).toBeGreaterThanOrEqual(previous);expect(shown).toBeLessThanOrEqual(latest);previous=shown;
 }
 return{clock,latest};
}

function assertStoppedAtConfirmedFront(clock:MotionTimeline,latest:number,at:number){
 clock.adopt(latest,0,[],at,false,true,true);
 expect(clock.tick).toBe(latest);expect(clock.advance(at+100000)).toBe(latest);
}

test('a fifty-ms compatible burst does not erase acquired slower-supply evidence',()=>{
 const {clock,latest}=suppliedAtTwentyLocalTicksPerSecond();
 for(let at=1110;at<=1140;at+=10)clock.advance(at);
 // Seventeen confirmed Cores in50ms pass the existing one-Core quantization
 // allowance for nominal36/s. This short burst is not a full200ms recovery.
 const confirmed=latest+1.7,beforeReceipt=clock.tick;
 clock.adopt(confirmed,6,[],1150,false,true,true);
 expect(clock.tick).toBe(beforeReceipt); // ordinary adoption never seeks
 clock.advance(1150);
 // A legitimate nominal catch-up may first drain more than100ms of backlog.
 // Measure retained supply evidence after that catch-up, without a new receipt.
 for(let at=1160;at<=1200;at+=10)clock.advance(at);
 const before=clock.tick,shown=clock.advance(1201),delta=shown-before;
 expect(delta).toBeGreaterThan(0);expect(shown).toBeLessThanOrEqual(confirmed);
 // Nominal36/s would advance.036 in this exact1ms interval. The10-place
 // comparison rejects only number-rounding equivalence with that nominal rate.
 expect(delta).toBeLessThan(.036);expect(delta).not.toBeCloseTo(.036,10);
 assertStoppedAtConfirmedFront(clock,confirmed,1202);
});

test('a129.3ms confirmed gap retains acquired supply evidence when joining',()=>{
 const {clock,latest}=suppliedAtTwentyLocalTicksPerSecond();
 // NativeV3 had a129.3ms advancing-front gap adding one local tick. These
 // are only its public timing/progress inputs, not a replay of its World.
 for(let at=1110;at<=1220;at+=10)clock.advance(at);
 expect(clock.tick).toBe(latest); // existing >100ms confirmed-only fallback
 const confirmed=latest+1,beforeReceipt=clock.tick;
 clock.adopt(confirmed,6,[],1229.3,false,true,true);
 expect(clock.tick).toBe(beforeReceipt); // never rewind to latest-minus-reserve
 const shown=clock.advance(1230.3),delta=shown-beforeReceipt;
 expect(delta).toBeGreaterThan(0);expect(shown).toBeLessThanOrEqual(confirmed);
 expect(delta).toBeLessThan(.036);expect(delta).not.toBeCloseTo(.036,10);
 // The unchanged silence fallback still releases only received history.
 expect(clock.advance(1430.3)).toBe(confirmed);
 assertStoppedAtConfirmedFront(clock,confirmed,1431);
});
