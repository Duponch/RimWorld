import {expect,test} from 'vitest';
import {IMPRESSION_LABELS,IMPRESSION_THRESHOLDS,ROOM_MEMORY_DURATION,ROOM_MEMORY_OFFSETS,impressionStage,roomImpressiveness} from '../src/sim/room-impressiveness';

test('Core impression combines the four factors, logarithmic excess and the soft space limit',()=>{
  expect(roomImpressiveness({wealth:1500,beauty:3,space:125,cleanliness:0})).toBe(100);
  expect(roomImpressiveness({wealth:0,beauty:0,space:125,cleanliness:0})).toBeCloseTo(32.5,8);
  expect(roomImpressiveness({wealth:1500,beauty:3,space:12.5,cleanliness:0})).toBeCloseTo(50.96875,8);
  expect(roomImpressiveness({wealth:1500,beauty:-3,space:125,cleanliness:0})).toBeCloseTo(-2.5,8);
  expect(roomImpressiveness({wealth:1500*Math.E,beauty:3,space:125,cleanliness:0})).toBeCloseTo(116.25,8);
  expect(roomImpressiveness({wealth:1500,beauty:3,space:125,cleanliness:1})).toBe(100);
  expect(roomImpressiveness({wealth:1500,beauty:3,space:125,cleanliness:-2.5})).toBeCloseTo(48.75,8);
});

test('score stages include each threshold and preserve the null memory stages',()=>{
  expect(IMPRESSION_LABELS).toHaveLength(IMPRESSION_THRESHOLDS.length+1);
  for(let i=0;i<IMPRESSION_THRESHOLDS.length;i++){
    const threshold=IMPRESSION_THRESHOLDS[i]!;
    expect(impressionStage(threshold)).toBe(i+1);
    expect(impressionStage(threshold-1e-6)).toBe(i);
  }
  expect(impressionStage(-100)).toBe(0);
  expect(impressionStage(500)).toBe(9);
  expect(ROOM_MEMORY_OFFSETS.bedroom).toEqual([-2,null,1,2,3,4,5,6,7,8]);
  expect(ROOM_MEMORY_OFFSETS.barracks).toEqual([-7,-5,-4,-3,-2,-1,1,2,3,4]);
  expect(ROOM_MEMORY_OFFSETS.dining).toEqual([null,null,null,2,3,4,5,6,7,8]);
  expect(ROOM_MEMORY_OFFSETS.recreation).toEqual(ROOM_MEMORY_OFFSETS.dining);
  expect(ROOM_MEMORY_DURATION).toBe(6000);
});
