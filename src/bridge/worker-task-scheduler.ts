/** One task port in the existing Worker. No simulation, timer, World or
 * admission state lives here. A factory only permits controlled Node ports. */
export class WorkerTaskScheduler {
 private generation=0;private pending=false;
 private readonly channel:MessageChannel;
 constructor(private readonly run:()=>void,createChannel:()=>MessageChannel=()=>new MessageChannel()){
  this.channel=createChannel();
  this.channel.port1.onmessage=event=>{
   // An old generation cannot consume the pending bit of a newer task.
   if(event.data!==this.generation)return;
   if(!this.pending)return;
   this.pending=false;this.run();
  };
  // Node's test ports must not retain the process; browsers have no unref.
  (this.channel.port1 as MessagePort&{unref?:()=>void}).unref?.();
  (this.channel.port2 as MessagePort&{unref?:()=>void}).unref?.();
 }
 get scheduled():boolean{return this.pending;}
 request():void {
  if(this.pending)return;this.pending=true;
  try{this.channel.port2.postMessage(this.generation);}catch(error){this.pending=false;throw error;}
 }
 invalidate():void {this.generation++;this.pending=false;}
}
