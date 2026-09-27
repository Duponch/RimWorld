import { expect,test } from '@playwright/test';
import { animalCombatCamp } from '../scenarios/animal-combat';

test('WebGPU gait follows presented distance through slowdown, a stopped piece, resume and pause',async ({playwright})=>{
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  try {
  await page.goto('/?scenario=camp&size=32&e2e');
  await expect(page.locator('#loading')).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).__lisiere.backend)).toBe('WebGPU');
  const fixture=animalCombatCamp();
  const report=await page.evaluate(async world=>{
    // Vite serves the same resident rig modules used by the live WebGPU scene.
    // @ts-ignore browser module URL
    const {PawnLayer}=await import('/src/render/PawnLayer.ts');
    // @ts-ignore browser module URL
    const {WildlifeLayer}=await import('/src/render/WildlifeLayer.ts');
    // @ts-ignore browser module URL
    const {MotionTimeline}=await import('/src/render/MotionTimeline.ts');
    // @ts-ignore browser module URL
    const {HUMAN_GAIT_RADIANS_PER_UNIT,animalGaitRadiansPerUnit}=await import('/src/render/gait-presentation.ts');
    const pawn=world.pawns[0]!,animal=world.wildlife!.animals[0]!;
    world.tick=101;
    const edge={from:{x:10,z:10},to:{x:11,z:10},start:100,end:104};
    Object.assign(pawn,{x:11,z:10,state:'moving',motion:edge,path:[]});
    Object.assign(animal,{x:11,z:10,state:'moving',motion:edge});
    const timeline=new MotionTimeline(),people=new PawnLayer(),fauna=new WildlifeLayer();
    const set=(segment:typeof edge,tick:number)=>{
      timeline.tracks.set(pawn.id,[segment]);timeline.tracks.set(animal.id,[segment]);timeline.tick=tick;
      people.updateTravel(world,timeline);fauna.update(world,timeline);
    };
    people.update(world,1,true);set(edge,101);
    const human=people.feedbackSource!,humanMotion=human.getAttribute('aMotion');
    const animalGeometry=(fauna.mesh.children.find((child:any)=>child.name.includes(animal.species)) as any).geometry;
    const animalMotion=animalGeometry.getAttribute('aAnimal');
    const sample=()=>{
      const ht=human.getAttribute('aTravel'),hf=human.getAttribute('aFrom'),hz=human.getAttribute('aTo');
      const at=animalGeometry.getAttribute('aTravel'),af=animalGeometry.getAttribute('aFrom'),az=animalGeometry.getAttribute('aTo');
      const progress=(t:any)=>Math.max(0,Math.min(1,(people.travelTime.value-t.getX(0))/(t.getY(0)-t.getX(0))));
      const hDistance=Math.hypot(hz.getX(0)-hf.getX(0),hz.getZ(0)-hf.getZ(0))*progress(ht);
      const aDistance=Math.hypot(az.getX(0)-af.getX(0),az.getZ(0)-af.getZ(0))*Math.max(0,Math.min(1,(fauna.travelTime.value-at.getX(0))/(at.getY(0)-at.getX(0))));
      return {tick:timeline.tick,hWalk:humanMotion.getX(0),aWalk:animalMotion.getX(0),hPhase:humanMotion.getW(0)+hDistance*HUMAN_GAIT_RADIANS_PER_UNIT,
        aPhase:animalMotion.getW(0)+aDistance*animalGaitRadiansPerUnit(animal.species),hActivity:humanMotion.getY(0),aActivity:animalMotion.getY(0),hVersion:humanMotion.version,aVersion:animalMotion.version};
    };
    const samples=[sample()];
    set(edge,101.5);samples.push(sample());
    const slow={...edge,end:108};set(slow,101.5);samples.push(sample());
    set(slow,102);samples.push(sample());
    const stop={...edge,edgeStart:100,start:102,end:103,fromFraction:.25,toFraction:.25};
    set(stop,102);samples.push(sample());
    set(stop,102.5);samples.push(sample());
    const resume={...edge,edgeStart:100,start:103,end:109,fromFraction:.25,toFraction:1};
    set(resume,103);samples.push(sample());
    set(resume,104);samples.push(sample());
    set(resume,104);samples.push(sample());
    people.dispose();fauna.dispose();
    return {samples,hRate:HUMAN_GAIT_RADIANS_PER_UNIT,aRate:animalGaitRadiansPerUnit(animal.species)};
  },fixture);
  const [first,moving,slowStart,slowMove,stopStart,stopEnd,resumeStart,resumeMove,paused]=report.samples;
  const same=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))<1e-4;
  expect(moving!.hPhase-first!.hPhase).toBeCloseTo(.125*report.hRate,3);
  expect(moving!.aPhase-first!.aPhase).toBeCloseTo(.125*report.aRate,3);
  expect(same(slowStart!.hPhase,moving!.hPhase)).toBe(true);
  expect(same(slowStart!.aPhase,moving!.aPhase)).toBe(true);
  expect(slowMove!.hPhase-slowStart!.hPhase).toBeCloseTo(.0625*report.hRate,3);
  expect(slowMove!.aPhase-slowStart!.aPhase).toBeCloseTo(.0625*report.aRate,3);
  expect([stopStart!.hWalk,stopStart!.aWalk,stopEnd!.hWalk,stopEnd!.aWalk]).toEqual([0,0,0,0]);
  expect(same(resumeStart!.hPhase,slowMove!.hPhase)).toBe(true);
  expect(same(resumeStart!.aPhase,slowMove!.aPhase)).toBe(true);
  expect(resumeMove!.hPhase).toBeGreaterThan(resumeStart!.hPhase);
  expect(resumeMove!.aPhase).toBeGreaterThan(resumeStart!.aPhase);
  expect(paused).toEqual(resumeMove);
  expect([first!.hActivity,first!.aActivity,resumeMove!.hActivity,resumeMove!.aActivity]).toEqual([0,0,0,0]);
  } finally {await browser.close();}
});
