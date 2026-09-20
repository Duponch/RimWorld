/** One unit is 1/120000 watt-day. This resolves half-efficient charging at
 * each 1/60000-day Core boundary without a floating energy remainder. */
export const BATTERY_ENERGY_SCALE=120_000;
export const BATTERY_CAPACITY=600*BATTERY_ENERGY_SCALE;
export const BATTERY_START_RESERVE=5*BATTERY_ENERGY_SCALE;
export const BATTERY_START_THRESHOLD=BATTERY_ENERGY_SCALE/10;
export const BATTERY_LEAK_PER_CORE_TICK=10;
export interface BatteryState {stored:number}
export interface BatteryOwner {id:number;battery:BatteryState}
export const newBatteryState=():BatteryState=>({stored:0});
export const batteryWattDays=(state:BatteryState):number=>state.stored/BATTERY_ENERGY_SCALE;
export function leakBattery(state:BatteryState):number {
  const lost=Math.min(state.stored,BATTERY_LEAK_PER_CORE_TICK);state.stored-=lost;return lost;
}
/** Equal shares, redistributing at full/empty boundaries. A rotating stable
 * order shares indivisible quanta without drawing from the gameplay PRNG. */
function transfer(batteries:readonly BatteryOwner[],amount:number,charging:boolean,coreTick:number):number {
  let remaining=amount,eligible=batteries.filter(b=>charging?b.battery.stored<BATTERY_CAPACITY:b.battery.stored>0).sort((a,b)=>a.id-b.id);
  while(remaining>0&&eligible.length){
    const share=Math.floor(remaining/eligible.length),extra=remaining%eligible.length,start=((coreTick%eligible.length)+eligible.length)%eligible.length;
    let moved=0;
    for(let n=0;n<eligible.length;n++){
      const state=eligible[(start+n)%eligible.length]!.battery,room=charging?BATTERY_CAPACITY-state.stored:state.stored;
      const quantity=Math.min(room,share+(n<extra?1:0));state.stored+=charging?quantity:-quantity;moved+=quantity;
    }
    remaining-=moved;if(!moved)break;
    eligible=eligible.filter(b=>charging?b.battery.stored<BATTERY_CAPACITY:b.battery.stored>0);
  }
  return amount-remaining;
}
/** amount already includes the 50% charge loss; returned value is stored. */
export const chargeBatteries=(batteries:readonly BatteryOwner[],amount:number,coreTick:number):number=>transfer(batteries,amount,true,coreTick);
export const dischargeBatteries=(batteries:readonly BatteryOwner[],amount:number,coreTick:number):number=>transfer(batteries,amount,false,coreTick);
