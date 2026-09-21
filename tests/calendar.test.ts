import { expect,test } from 'vitest';
import { calendarTick } from '../src/sim/calendar';
import { annualGrowingLightIntegral,naturalLight } from '../src/sim/environment';
import { createScenarioWorld } from '../src/sim/new-game';
import { assignmentAt,hourOfDay } from '../src/sim/schedule';
import { outdoorTemperature } from '../src/sim/temperature';
import { plantGrowth } from '../src/sim/plants';
import { serializeWorld,deserializeWorld } from '../src/sim/serialization';
import { stepWorld } from '../src/sim/engine';
import { advanceWildlife,enableWildlife } from '../src/sim/wildlife';
import { HARE } from '../src/sim/wildlife-state';
import { seasonalOutdoorTemperature } from '../src/sim/site-climate';

test('six o’clock arrival shares civil phase across schedule, climate and natural growth without aging the world',()=>{
  const w=createScenarioWorld(42,32,'crashlanded'),old=createScenarioWorld(42,32,'survivors');
  expect(w.tick).toBe(0);expect(calendarTick(w)).toBe(1500);expect(calendarTick(old)).toBe(0);
  const p=w.pawns[0]!;p.schedule[6]='work';p.schedule[0]='sleep';expect(assignmentAt(w,p)).toBe('work');expect(hourOfDay(calendarTick(w))).toBe(6);
  expect(outdoorTemperature(w)).toBe(seasonalOutdoorTemperature(w));expect(outdoorTemperature(old)).toBe(seasonalOutdoorTemperature(old));
  expect(naturalLight(calendarTick(w))).toBeGreaterThan(naturalLight(calendarTick(old)));
  // A tiny site need not contain wild berries. This probe tests civil phase,
  // independently of the natural population drawn by the generator.
  const berry={id:w.nextId++,kind:'berries' as const,x:p.x,z:p.z,amount:10,growth:0,growthTick:0,growthThermalFactor:1};
  w.tiles[berry.z*w.width+berry.x]!.terrain='grass';w.tick=2000;
  expect(plantGrowth(w,berry)).toBeCloseTo((annualGrowingLightIntegral(w,2000)-annualGrowingLightIntegral(w,0))/(6*6000),12);
  w.tick=4499;expect(hourOfDay(calendarTick(w))).toBe(23);w.tick=4500;expect(hourOfDay(calendarTick(w))).toBe(0);
});
test('phase survives a saved continuation and historical midnight remains unchanged',()=>{
  for(const scenario of ['crashlanded','survivors'] as const){
    const w=createScenarioWorld(93,32,scenario);stepWorld(w,1510);const copy=deserializeWorld(serializeWorld(w));
    expect(calendarTick(copy)).toBe(w.tick+(scenario==='crashlanded'?1500:0));
    stepWorld(w,270);stepWorld(copy,270);expect(serializeWorld(copy)).toBe(serializeWorld(w));
  }
});
test('hare night rest shares the civil dawn and evening boundaries without shifting historical camps',()=>{
  for(const scenario of ['crashlanded','survivors'] as const)for(const tick of [249,250,3999,4000]){
    const w=createScenarioWorld(42,32,scenario);
    // One fed, moderately rested animal isolates the night decision from hunger,
    // fatigue emergencies, existing travel and the sampled natural population.
    w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[{id:w.nextId++,kind:'berries',x:8,z:8,amount:10}];
    delete w.wildlife;enableWildlife(w,1,'natural');
    const hare=w.wildlife!.animals[0]!;w.tick=tick;hare.rest=.6;hare.food=HARE.nutrition;hare.nextDecision=tick;
    advanceWildlife(w);
    const expected=scenario==='crashlanded'?tick===249||tick===4000:tick<2500;
    expect(hare.state==='sleeping',`${scenario}, elapsed ${tick}`).toBe(expected);
  }
});
