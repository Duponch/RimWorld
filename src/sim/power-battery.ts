/** One unit is 1/120000 watt-day. This resolves half-efficient charging at
 * each 1/60000-day Core boundary without a floating energy remainder. */
export const BATTERY_ENERGY_SCALE=120_000;
export const BATTERY_CAPACITY=600*BATTERY_ENERGY_SCALE;
export const BATTERY_START_RESERVE=5*BATTERY_ENERGY_SCALE;
export const BATTERY_START_THRESHOLD=BATTERY_ENERGY_SCALE/10;
export const BATTERY_LEAK_PER_CORE_TICK=10;
/** V87 half is one extra half-quantum (1/240000 Wd), needed by 17.5 W
 * thermostat standby. Absence retains every historical stored integer. */
export interface BatteryState {stored:number;half?:true}
export interface BatteryOwner {id:number;battery:BatteryState}
export const newBatteryState=():BatteryState=>({stored:0});
export const batteryQuanta=(state:BatteryState):number=>state.stored+(state.half?.5:0);
export const batteryWattDays=(state:BatteryState):number=>batteryQuanta(state)/BATTERY_ENERGY_SCALE;
function setQuanta(state:BatteryState,value:number):void {
  state.stored=Math.floor(value);if(value!==state.stored)state.half=true;else delete state.half;
}
export function leakBattery(state:BatteryState):number {
  const quantity=batteryQuanta(state),lost=Math.min(quantity,BATTERY_LEAK_PER_CORE_TICK);setQuanta(state,quantity-lost);return lost;
}
/** Fire/explosion spending is clamped to the physically remaining energy. */
export function drainBatteryWattDays(state:BatteryState,amount:number):number {
  if(!Number.isFinite(amount)||amount<0)throw new Error('Invalid battery expenditure.');
  const quantity=batteryQuanta(state),lost=Math.min(quantity,Math.round(amount*BATTERY_ENERGY_SCALE*2)/2);
  setQuanta(state,quantity-lost);return lost/BATTERY_ENERGY_SCALE;
}
/** Equal shares, redistributing at full/empty boundaries. A rotating stable
 * order shares indivisible quanta without drawing from the gameplay PRNG. */
function transfer(batteries:readonly BatteryOwner[],amount:number,charging:boolean,coreTick:number):number {
  if(!Number.isSafeInteger(amount*2)||amount<0)throw new Error('Invalid half-quantum energy transfer.');
  // Preserve the original rounding/distribution whenever no half unit exists.
  const scale=Number.isInteger(amount)&&batteries.every(b=>!b.battery.half)?1:2;
  let remaining=amount*scale,eligible=batteries.filter(b=>charging?batteryQuanta(b.battery)<BATTERY_CAPACITY:batteryQuanta(b.battery)>0).sort((a,b)=>a.id-b.id);
  while(remaining>0&&eligible.length){
    const share=Math.floor(remaining/eligible.length),extra=remaining%eligible.length,start=((coreTick%eligible.length)+eligible.length)%eligible.length;
    let moved=0;
    for(let n=0;n<eligible.length;n++){
      const state=eligible[(start+n)%eligible.length]!.battery,stored=batteryQuanta(state)*scale,room=charging?BATTERY_CAPACITY*scale-stored:stored;
      const quantity=Math.min(room,share+(n<extra?1:0));setQuanta(state,(stored+(charging?quantity:-quantity))/scale);moved+=quantity;
    }
    remaining-=moved;if(!moved)break;
    eligible=eligible.filter(b=>charging?batteryQuanta(b.battery)<BATTERY_CAPACITY:batteryQuanta(b.battery)>0);
  }
  return amount-remaining/scale;
}
/** amount already includes the 50% charge loss; returned value is stored. */
export const chargeBatteries=(batteries:readonly BatteryOwner[],amount:number,coreTick:number):number=>transfer(batteries,amount,true,coreTick);
export const dischargeBatteries=(batteries:readonly BatteryOwner[],amount:number,coreTick:number):number=>transfer(batteries,amount,false,coreTick);
