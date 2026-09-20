/** Surface Core 1.6.4871 only. Probabilities are conditional weights, not a
 * guaranteed timetable. The explicit local site supplies rainfall in mm/year. */
export const WEATHER_KINDS=['clear','fog','rain','dry-thunderstorm','rainy-thunderstorm','foggy-rain','snow-gentle','snow-hard'] as const;
export type WeatherKind=typeof WEATHER_KINDS[number];
export interface WeatherDefinition {label:string;weight:number;rain:number;snow:number;wind:number;offset:number;movement:number;accuracy:number;minimum:number;maximum:number;storm:boolean;priority:number}
export const WEATHER:Readonly<Record<WeatherKind,Readonly<WeatherDefinition>>>=Object.freeze({
  clear:{label:'Ensoleillé',weight:18,rain:0,snow:0,wind:1,offset:0,movement:1,accuracy:1,minimum:-999,maximum:999,storm:false,priority:0},
  fog:{label:'Brouillard',weight:1,rain:0,snow:0,wind:.5,offset:0,movement:1,accuracy:.5,minimum:-999,maximum:999,storm:false,priority:1},
  rain:{label:'Pluie',weight:2,rain:1,snow:0,wind:1.5,offset:0,movement:.9,accuracy:.8,minimum:0,maximum:100,storm:false,priority:1},
  'dry-thunderstorm':{label:'Orage sec',weight:1,rain:0,snow:0,wind:1.5,offset:1.25,movement:1,accuracy:1,minimum:0,maximum:999,storm:true,priority:2},
  'rainy-thunderstorm':{label:'Orage pluvieux',weight:1,rain:1,snow:0,wind:1.5,offset:1.25,movement:.8,accuracy:.8,minimum:0,maximum:999,storm:true,priority:2},
  'foggy-rain':{label:'Pluie et brouillard',weight:1,rain:1,snow:0,wind:1.5,offset:0,movement:.9,accuracy:.5,minimum:0,maximum:999,storm:false,priority:1},
  'snow-gentle':{label:'Neige légère',weight:4,rain:1,snow:.8,wind:1.5,offset:0,movement:1,accuracy:.8,minimum:-999,maximum:-.5,storm:false,priority:1},
  'snow-hard':{label:'Neige forte',weight:4,rain:1,snow:1.2,wind:1.5,offset:0,movement:.8,accuracy:.8,minimum:-999,maximum:-.5,storm:false,priority:1},
});
export function rainfallWeight(kind:WeatherKind,rainfall:number):number {
  if(kind==='clear'||kind==='dry-thunderstorm')return 1;
  const r=Math.max(0,rainfall);
  if(kind==='snow-gentle'||kind==='snow-hard')return r<300?r/600:r<1300?.5+(r-300)/2000:1;
  if(r<1300)return r/1300;
  if(kind==='rain')return 1+Math.min(2700,r-1300)*2/2700;
  if(kind==='rainy-thunderstorm')return 1+Math.min(2700,r-1300)/2700;
  return 1;
}
