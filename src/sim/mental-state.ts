import type { Cell,Pawn,World } from './types.ts';

export interface MentalState {
  /** Sampled exposure in Core ticks, saturated once eligible. */
  below:[number,number,number];
  /** Local ticks awake until another mood break is allowed. */
  cooldown:number;
  catharsis:number[];
  crisis?:{kind:'sad-wander';age:number;target:Cell|null;waitUntil:number};
}
export const BREAK_THRESHOLDS=[35,20,5] as const;
export const BREAK_MTB_DAYS=[4,.8,.5] as const;
export const CATHARSIS_DURATION=18000;
export const hasMentalBreak=(pawn:Pawn):boolean=>!!pawn.mental?.crisis;
export function mentalState(pawn:Pawn):MentalState {
  return pawn.mental??={below:[0,0,0],cooldown:0,catharsis:[]};
}
export function finishMentalBreak(world:World,pawn:Pawn,reward=true):void {
  const m=pawn.mental;if(!m?.crisis)return;
  delete m.crisis;pawn.path=[];if(!pawn.need&&pawn.state!=='downed'&&pawn.state!=='dead')pawn.state='idle';pawn.planCooldown=0;pawn.needCooldown=0;
  m.cooldown=1500;
  if(reward) {
    m.catharsis=m.catharsis.filter(t=>t>world.tick);
    if(m.catharsis.length===5)m.catharsis.shift();
    m.catharsis.push(world.tick+CATHARSIS_DURATION);
    world.events.push({tick:world.tick,type:'need',message:`${pawn.name} sort de son errance triste.`});
    if(world.events.length>80)world.events.splice(0,world.events.length-80);
  }
}
