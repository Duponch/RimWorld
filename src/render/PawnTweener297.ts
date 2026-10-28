/** Recurrent root displacement from confirmed movement only. No simulation, future
 * clock, shader, per-frame object, pass or compute buffer is created here. */
export class PawnTweener297 {
 private capacity=0;
 private ids=new Float64Array(0);private valid=new Uint8Array(0);
 private positions=new Float32Array(0);
 readonly pose={x:0,y:0,z:0};
 ensure(count:number):void {
  if(count<=this.capacity)return;this.capacity=2**Math.ceil(Math.log2(Math.max(1,count)));
  const ids=new Float64Array(this.capacity),valid=new Uint8Array(this.capacity),positions=new Float32Array(this.capacity*3);
  ids.set(this.ids);valid.set(this.valid);positions.set(this.positions);this.ids=ids;this.valid=valid;this.positions=positions;
 }
 reset():void {this.valid.fill(0);}
 /** Returns the same reusable result. A caller may not retain it. Explicit
  * reset supersedes pause (new map/owner/teleport/body transition). */
 advance(slot:number,id:number,x:number,y:number,z:number,dt:number,speed:number,reset=false):Readonly<{x:number;y:number;z:number}> {
  if(!Number.isInteger(slot)||slot<0||slot>=this.capacity||!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(z)||!Number.isFinite(dt)||!Number.isFinite(speed)||!Number.isFinite(id)||dt<0||speed<0)throw Error('Invalid PawnTweener297 input');
  x=Math.fround(x);y=Math.fround(y);z=Math.fround(z);
  const j=slot*3,fresh=reset||!this.valid[slot]||this.ids[slot]!==id;
  if(fresh||speed>=5){this.positions[j]=x;this.positions[j+1]=y;this.positions[j+2]=z;this.valid[slot]=1;this.ids[slot]=id;}
  else if(speed>0){const alpha=Math.min(1,.09*dt*60*speed);this.positions[j]+=(x-this.positions[j]!)*alpha;this.positions[j+1]+=(y-this.positions[j+1]!)*alpha;this.positions[j+2]+=(z-this.positions[j+2]!)*alpha;}
  this.pose.x=this.positions[j]!;this.pose.y=this.positions[j+1]!;this.pose.z=this.positions[j+2]!;return this.pose;
 }
}
