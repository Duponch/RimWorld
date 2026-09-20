import { expect,test } from 'vitest';
import { calendarTick } from '../src/sim/calendar';
import { naturalLight,growingLightIntegral } from '../src/sim/environment';
import { createScenarioWorld } from '../src/sim/new-game';
import { assignmentAt,hourOfDay } from '../src/sim/schedule';
import { outdoorTemperature } from '../src/sim/temperature';
import { plantGrowth } from '../src/sim/plants';
import { serializeWorld,deserializeWorld } from '../src/sim/serialization';
import { stepWorld } from '../src/sim/engine';

test('six o’clock arrival shares civil phase across schedule, climate and natural growth without aging the world',()=>{
  const w=createScenarioWorld(42,32,'crashlanded'),old=createScenarioWorld(42,32,'survivors');
  expect(w.tick).toBe(0);expect(calendarTick(w)).toBe(1500);expect(calendarTick(old)).toBe(0);
  const p=w.pawns[0]!;p.schedule[6]='work';p.schedule[0]='sleep';expect(assignmentAt(w,p)).toBe('work');expect(hourOfDay(calendarTick(w))).toBe(6);
  expect(outdoorTemperature(w)).toBe(outdoorTemperature(1500));expect(outdoorTemperature(old)).toBe(outdoorTemperature(0));
  expect(naturalLight(calendarTick(w))).toBeGreaterThan(naturalLight(calendarTick(old)));
  const berry=w.resources.find(r=>r.kind==='berries')!;berry.growth=0;berry.growthTick=0;berry.growthThermalFactor=1;
  w.tiles[berry.z*w.width+berry.x]!.terrain='grass';w.tick=2000;
  expect(plantGrowth(w,berry)).toBeCloseTo((growingLightIntegral(3500)-growingLightIntegral(1500))/(6*6000),12);
  w.tick=4499;expect(hourOfDay(calendarTick(w))).toBe(23);w.tick=4500;expect(hourOfDay(calendarTick(w))).toBe(0);
});
test('phase survives a saved continuation and historical midnight remains unchanged',()=>{
  for(const scenario of ['crashlanded','survivors'] as const){
    const w=createScenarioWorld(93,32,scenario);stepWorld(w,1510);const copy=deserializeWorld(serializeWorld(w));
    expect(calendarTick(copy)).toBe(w.tick+(scenario==='crashlanded'?1500:0));
    stepWorld(w,270);stepWorld(copy,270);expect(serializeWorld(copy)).toBe(serializeWorld(w));
  }
});
