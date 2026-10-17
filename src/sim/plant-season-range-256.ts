/** Original seasonal admission calculation for an actual prospective tile.
 * Core1.6.4871 Tile.Min/MaxTemperature sample seasonal-only temperature every
 * 27000 Core ticks, over [0,3600000). Neither daily Perlin/sun variation nor
 * a current map condition participates in these immutable annual bounds. */
const f=Math.fround;
export interface PlantClimateTile256 {readonly center:readonly [number,number,number];readonly meanTemperature:number}
export function plantSeasonAmplitude256(tile:PlantClimateTile256,radius:number):number {
 if(!Number.isFinite(radius)||radius<=0||!Number.isFinite(tile.meanTemperature)||tile.center.length!==3||!tile.center.every(Number.isFinite)||Math.abs(tile.center[1])>radius)throw Error('Invalid real tile climate');
 const distance=Math.abs(f(tile.center[1]/radius));
 const magnitude=distance<=f(.1)?f(3+f(f(4-3)*f(distance/f(.1)))):f(4+f(f(28-4)*f(f(distance-f(.1))/f(1-f(.1)))));
 return tile.center[1]>=0?magnitude:-magnitude;
}
export function plantSeasonTemperature256(tile:PlantClimateTile256,radius:number,absoluteCoreTick:number):number {
 if(!Number.isSafeInteger(absoluteCoreTick)||absoluteCoreTick<0)throw Error('Invalid seasonal Core tick');
 const tick=absoluteCoreTick===0?1:absoluteCoreTick;
 const yearFraction=f(f(f(tick/60000)%60)/60),winterBeginning=f(10/12);
 const angle=f(f(f(Math.PI)*2)*f(yearFraction-winterBeginning));
 return f(tile.meanTemperature+f(f(Math.cos(angle))*-plantSeasonAmplitude256(tile,radius)));
}
export function plantSeasonRange256(tile:PlantClimateTile256,radius:number):Readonly<{min:number;max:number}> {
 let min=Infinity,max=-Infinity;
 for(let tick=0;tick<3600000;tick+=27000){const value=plantSeasonTemperature256(tile,radius,tick);min=Math.min(min,value);max=Math.max(max,value);}
 return {min,max};
}
