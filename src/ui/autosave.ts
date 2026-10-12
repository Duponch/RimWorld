export const AUTOSAVE_PREFERENCE_KEY='lisiere.autosave-minutes.v1';
export const AUTOSAVE_MINUTES=Object.freeze([0,1,3,5,10,15]);
export const DEFAULT_AUTOSAVE_MINUTES=5;
export function autosaveMinutes(value:unknown):number {
  const parsed=typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):NaN;
  return AUTOSAVE_MINUTES.includes(parsed)?parsed:DEFAULT_AUTOSAVE_MINUTES;
}
export interface AutosaveState {generation:number;tick:number;playing:boolean;available:boolean}

/** One inexpensive poll per second in the host, no World traversal or catch-up.
 * Only active, visible play accrues time; long suspended timer gaps are excluded. */
export class AutosaveScheduler {
  private lastTime:number|undefined;
  private previousPlaying=false;
  private generation:number|undefined;
  private elapsed=0;
  private lastSavedTick=-1;
  private pending=false;
  private interval=DEFAULT_AUTOSAVE_MINUTES;
  private retryAt=0;
  setMinutes(minutes:number):void {
    this.interval=autosaveMinutes(minutes);this.elapsed=0;this.lastTime=undefined;this.previousPlaying=false;
  }
  noteSaved(generation:number,tick:number):void {
    if(this.generation!==generation)return;
    this.elapsed=0;this.lastSavedTick=tick;
  }
  async poll(now:number,state:AutosaveState,save:()=>Promise<void>,onError:(error:unknown)=>void):Promise<void> {
    if(this.generation!==state.generation){
      this.generation=state.generation;this.elapsed=0;this.lastSavedTick=-1;this.lastTime=undefined;this.retryAt=0;
    }
    const delta=this.lastTime===undefined?0:Math.max(0,Math.min(2_000,now-this.lastTime));
    this.lastTime=now;
    if(this.interval&&state.playing&&this.previousPlaying)this.elapsed+=delta;
    this.previousPlaying=state.playing;
    if(!this.interval||this.pending||!state.playing||!state.available||now<this.retryAt||
      state.tick===this.lastSavedTick||this.elapsed<this.interval*60_000)return;
    this.pending=true;
    const generation=state.generation,tick=state.tick;
    try {
      await save();
      if(this.generation===generation)this.noteSaved(generation,tick);
    }catch(error){
      if(this.generation===generation)this.retryAt=now+60_000;
      onError(error);
    }finally{this.pending=false;}
  }
}
