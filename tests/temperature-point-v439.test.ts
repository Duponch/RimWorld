import {expect,test} from 'vitest';
import {roomCamp} from './scenarios/rooms';
import {TemperatureView,temperatureAt,outdoorTemperature} from '../src/sim/temperature';

test('point temperature matches the batch oracle after current cell, region, temperature and calendar edits',()=>{
  const world=roomCamp();world.thermal={regions:[{cells:[66,67,98],temperature:-7},{cells:[164,165],temperature:38}]};
  const compare=()=>{
    const before=JSON.stringify(world),view=new TemperatureView(world);
    for(let z=0;z<world.height;z++)for(let x=0;x<world.width;x++)expect(temperatureAt(world,{x,z})).toBe(view.at(world,{x,z}));
    expect(JSON.stringify(world)).toBe(before);
  };
  compare();world.thermal.regions[0]!.temperature=3.125;compare();
  world.thermal.regions[0]!.cells.splice(0,1);world.thermal.regions[1]!.cells.push(67);compare();
  // A raw reader also retains the all-cell view's last-write semantics without
  // assuming sorted/disjoint lists from a validated save.
  world.thermal.regions.push({cells:[98,67,66],temperature:42});compare();
  world.thermal.regions.reverse();compare();
  delete world.thermal;world.tick+=1500;compare();
  expect(temperatureAt(world,{x:2,z:2})).toBe(outdoorTemperature(world));
});
