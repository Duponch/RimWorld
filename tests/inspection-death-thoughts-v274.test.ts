import { expect,test } from 'vitest';
import { TICKS_PER_DAY,type Structure,type World } from '../src/sim/types.ts';
import { moodInspectionView } from '../src/ui/mood-inspection.ts';
import { burialMoodGuidance } from '../src/ui/burial-controls.ts';
import { injurePawn } from '../src/sim/health.ts';
import { advanceHumanCorpses } from '../src/sim/human-corpses.ts';
import { initialGrave } from '../src/sim/burial.ts';
import { medicalCamp } from './scenarios/health.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';

test('Besoins projects each negative death memory with its effect and remaining time',()=>{
  const world=medicalCamp(2),[observer,deceased]=world.pawns;
  observer!.traits=[];deceased!.state='dead';
  observer!.deathThoughts=[
    {kind:'witnessed-ally-death',otherId:deceased!.id,at:world.tick},
    {kind:'witnessed-outsider-death',otherId:deceased!.id,at:world.tick},
    {kind:'witnessed-family-death',otherId:deceased!.id,at:world.tick},
    {kind:'colonist-died',otherId:deceased!.id,at:world.tick},
    {kind:'observed-corpse',otherId:deceased!.id,at:world.tick},
    {kind:'observed-rotting-corpse',otherId:deceased!.id,at:world.tick},
  ];
  const thoughts=moodInspectionView(world,observer!).thoughts;
  for(const [kind,offset,hours] of [
    ['witnessed-ally-death',-5,48],['witnessed-outsider-death',-3,24],
    ['witnessed-family-death',-6,144],['colonist-died',-3,144],
    ['observed-corpse',-4,12],['observed-rotting-corpse',-6,12],
  ] as const){
    const thought=thoughts.find(t=>t.id===`death-${kind}`);
    expect(thought).toMatchObject({offset,display:String(offset)});
    expect(thought!.label.length).toBeGreaterThan(0);
    expect(thought!.tooltip).toContain(`encore ${hours} h`);
  }
  expect(thoughts.map(t=>t.offset)).toEqual(thoughts.map(t=>t.offset).sort((a,b)=>b-a));
});

test('Besoins distinguishes Bloodlust relief and expires corpse memories independently',()=>{
  const world=medicalCamp(2),observer=world.pawns[0]!,deceased=world.pawns[1]!;
  observer.traits=['bloodlust'];deceased.state='dead';
  observer.deathThoughts=[{kind:'witnessed-bloodlust-death',otherId:deceased.id,at:world.tick}];
  expect(moodInspectionView(world,observer).thoughts.find(t=>t.id==='death-witnessed-bloodlust-death'))
    .toMatchObject({offset:8,display:'+8',tooltip:expect.stringContaining('encore 96 h')});
  observer.traits=[];
  observer.deathThoughts=[{kind:'observed-corpse',otherId:deceased.id,at:world.tick},
    {kind:'colonist-died',otherId:deceased.id,at:world.tick}];
  world.tick+=TICKS_PER_DAY/2;
  const thoughts=moodInspectionView(world,observer).thoughts;
  expect(thoughts.some(t=>t.id==='death-observed-corpse')).toBe(false);
  expect(thoughts.find(t=>t.id==='death-colonist-died')?.tooltip).toContain('encore 132 h');
});

test('funeral guidance explains future exposure and keeps historical inspection unchanged',()=>{
  expect(burialMoodGuidance({schemaVersion:208 as World['schemaVersion']})).toBe('');
  const world=medicalCamp();
  expect(burialMoodGuidance(world)).toContain('ne renouvelle plus');
  expect(burialMoodGuidance(world)).toContain('persistent jusqu’à leur propre expiration');
});

test('Besoins separates an unburied-body situation from memories retained after burial',()=>{
  const world=medicalCamp(2),observer=world.pawns[0]!,deceased=world.pawns[1]!;
  observer.traits=[];
  injurePawn(world,deceased,'heart','bruise',15000);advanceHumanCorpses(world);
  world.tick+=9001;
  const situation=moodInspectionView(world,observer).thoughts.find(t=>t.id==='death-colonist-unburied');
  expect(situation).toMatchObject({offset:-10,display:'-10'});
  expect(situation!.tooltip).not.toContain('encore ');
  const grave:Structure=fixtureBuilding(world,'grave',12,12);grave.grave=initialGrave();
  const pile=world.piles.find(p=>p.id===deceased.body!.pileId)!;
  pile.owner={type:'grave',graveId:grave.id};grave.grave.corpseId=pile.id;
  observer.deathThoughts=[{kind:'observed-corpse',otherId:deceased.id,at:world.tick}];
  const thoughts=moodInspectionView(world,observer).thoughts;
  expect(thoughts.some(t=>t.id==='death-colonist-unburied')).toBe(false);
  expect(thoughts.find(t=>t.id==='death-observed-corpse')).toMatchObject({offset:-4,tooltip:expect.stringContaining('encore 12 h')});
});
