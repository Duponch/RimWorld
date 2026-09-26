import { describe,expect,it } from 'vitest';
import { FixedClock } from '../src/bridge/fixed-clock.ts';
import { MotionTimeline,MOTION_BUFFER_TICKS } from '../src/render/MotionTimeline.ts';

type Speed=1|3|6;
type SpeedChange=readonly [at:number,speed:Speed];
type Message={at:number;tick:number;speed:Speed};
const DURATION_MS=18_000,FRAME_MS=1000/240;
const speedPlans:Readonly<Record<string,readonly SpeedChange[]>>={
  cycle:[[2500,3],[5000,6],[7500,1],[10000,3],[12500,6],[15000,1]],
  jump:[[2500,6],[5000,1],[7500,3],[10000,6],[12500,1],[15000,6]],
};

/** Worker clock and 20 ms batch publication, with ordered alternating 0/20 ms delivery jitter. */
function confirmedMessages(changes:readonly SpeedChange[],phase:number):Message[] {
  const clock=new FixedClock();clock.reset(0);
  const sent:Message[]=[];
  let tick=0,speed:Speed=1,lastDelivery=0;
  const publish=(at:number)=>{
    const jitter=(sent.length%2)*20;
    lastDelivery=Math.max(lastDelivery,at+jitter); // Worker messages retain order.
    sent.push({at:lastDelivery,tick,speed});
  };
  const batch=(at:number)=>{const ticks=clock.advance(at,speed);tick+=ticks;if(ticks>0)publish(at);};
  const events:{at:number;kind:'batch'|'speed';speed?:Speed}[]=[];
  for(let at=phase||20;at<=DURATION_MS;at+=20)events.push({at,kind:'batch'});
  for(const [at,next] of changes)events.push({at,kind:'speed',speed:next});
  events.sort((a,b)=>a.at-b.at||(a.kind==='speed'?-1:1));
  for(const event of events){
    batch(event.at);
    if(event.kind==='speed'){speed=event.speed!;publish(event.at);}
  }
  return sent;
}

function replay(changes:readonly SpeedChange[],phase:number):{stalled:number;firstMove:number;minimumReserve:number} {
  const messages=confirmedMessages(changes,phase),timeline=new MotionTimeline();
  timeline.adopt(0,1,[],0,true);
  let next=0,firstMove=-1,stalled=0,minimumReserve=Infinity,previous=timeline.tick;
  // Leave 100 ms after the final measured frame, so a finite input stream is
  // never mistaken for a production starvation event.
  for(let frame=1;frame<=Math.floor((DURATION_MS-100)/FRAME_MS);frame++){
    const now=frame*FRAME_MS;
    while(messages[next]&&messages[next]!.at<=now){
      const message=messages[next++]!,before=timeline.tick;
      timeline.adopt(message.tick,message.speed,[],message.at);
      expect(timeline.tick,`phase ${phase}, livraison ${next} : réception ne doit pas déplacer le curseur`).toBe(before);
    }
    const played=timeline.advance(now),confirmed=messages[next-1]?.tick??0;
    expect(played,`phase ${phase}, image ${frame} : aucune extrapolation`).toBeLessThanOrEqual(confirmed+1e-9);
    expect(played,`phase ${phase}, image ${frame} : pas de retour en arrière`).toBeGreaterThanOrEqual(previous-1e-9);
    expect(played-previous,`phase ${phase}, image ${frame} : pas de rattrapage accéléré ni saut`).toBeLessThanOrEqual(6*6*FRAME_MS/1000+1e-9);
    if(firstMove<0&&played>previous+1e-9)firstMove=now;
    if(firstMove>=0){
      minimumReserve=Math.min(minimumReserve,confirmed-played);
      if(played<=previous+1e-9)stalled++;
    }
    previous=played;
  }
  return {stalled,firstMove,minimumReserve};
}

describe('latence du tampon confirmé à deux ticks',()=>{
  it('préserve le mouvement sans famine ni accélération lors de 40 replays à 240 Hz',()=>{
    expect(MOTION_BUFFER_TICKS).toBe(2);
    let runs=0,minimumReserve=Infinity;
    for(const [name,changes] of Object.entries(speedPlans))for(let phase=0;phase<20;phase++){
      const result=replay(changes,phase),context=`${name}, phase worker ${phase} ms`;
      expect(result.firstMove,`${context} : amorçage absent`).toBeGreaterThan(0);
      expect(result.stalled,`${context} : image sans tick confirmé après amorçage`).toBe(0);
      minimumReserve=Math.min(minimumReserve,result.minimumReserve);runs++;
    }
    expect(runs).toBe(40);
    expect(minimumReserve).toBeGreaterThan(0);
  });

  it('après une pause entièrement vidée, attend deux nouveaux ticks ; un snapshot répété ne déplace pas le curseur',()=>{
    const timeline=new MotionTimeline();timeline.adopt(0,1,[],0,true);
    timeline.adopt(2,1,[],340);expect(timeline.advance(340)).toBe(0);
    expect(timeline.advance(500)).toBeCloseTo(.96,8);
    timeline.adopt(2,0,[],500);expect(timeline.advance(1000)).toBe(2);
    timeline.adopt(2,6,[],1000);expect(timeline.advance(1010)).toBe(2);
    timeline.adopt(3,6,[],1040);expect(timeline.advance(1040)).toBe(2);
    timeline.adopt(4,6,[],1070);expect(timeline.advance(1070)).toBe(2);
    expect(timeline.advance(1080)).toBeCloseTo(2.36,8);
    const before=timeline.tick;timeline.adopt(4,6,[],1080);expect(timeline.tick).toBe(before);
    expect(timeline.advance(1080+FRAME_MS)).toBeCloseTo(before+6*6*FRAME_MS/1000,8);
  });
});
