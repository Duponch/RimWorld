import { expect,test } from 'vitest';
import { medicalCamp,controlledInjury } from './scenarios/health';
import { equipmentCamp } from './scenarios/equipment';
import { healthCapacityRows,healthInjuryRows } from '../src/ui/health-inspection';
import { equipmentInspectionView } from '../src/ui/equipment-inspection';
import { socialLastText,socialOpinionRows } from '../src/ui/social-inspection';
import { moodInspectionView } from '../src/ui/mood-inspection';
import { moodTarget,moodThoughts } from '../src/sim/mood';
import { newApparelState } from '../src/sim/apparel-rules';
import { newWeaponState } from '../src/sim/equipment-rules';

test('health dossier shows only measured capacities and orders wounds by anatomy',()=>{
  const world=medicalCamp(),pawn=world.pawns[0]!;
  const healthy=healthCapacityRows(pawn);
  expect(healthy).toHaveLength(12);
  expect(healthy.find(row=>row.label==='Douleur')?.value).toBe('Aucune');
  expect(healthy.find(row=>row.label==='Vue')?.value).toBe('100 %');
  expect(healthInjuryRows(pawn)).toEqual([]);

  controlledInjury(world,pawn,'right-eye',1000);
  controlledInjury(world,pawn,'left-eye',2000);
  const rows=healthInjuryRows(pawn);
  expect(rows.map(row=>row.part)).toEqual(['Œil gauche','Œil droit']);
  expect(rows[0]!.description).toContain('−2.00 PV');
  expect(Number(healthCapacityRows(pawn).find(row=>row.label==='Vue')!.value.replace(' %',''))).toBeLessThan(100);
  pawn.health!.injuries.find(injury=>injury.part==='left-eye')!.tended=800;
  expect(healthInjuryRows(pawn)[0]!.description).toContain('soignée (80 %)');
});

test('equipment dossier lists owned objects and actual protection without invented mass',()=>{
  const world=equipmentCamp(1),pawn=world.pawns[0]!;
  const empty=equipmentInspectionView(world,pawn);
  expect(empty.inventory).toEqual([]);
  expect(empty.comfort).toContain('16.0 °C à 26.0 °C');
  expect(JSON.stringify(empty)).not.toContain('kg');

  world.piles.push({id:world.nextId++,kind:'apparel',item:'cloth-shirt',quantity:1,owner:{type:'apparel',pawnId:pawn.id},apparel:newApparelState('cloth-shirt')});
  world.piles.push({id:world.nextId++,kind:'weapon',item:'revolver',quantity:1,owner:{type:'equipment',pawnId:pawn.id},weapon:newWeaponState('revolver')});
  world.piles.push({id:world.nextId++,kind:'food',item:'simple-meal',quantity:1,owner:{type:'pawn',pawnId:pawn.id}});
  world.piles.push({id:world.nextId++,kind:'food',item:'rice',quantity:10,owner:{type:'ground',x:pawn.x,z:pawn.z}});
  const view=equipmentInspectionView(world,pawn);
  expect(view.comfort).toContain('11.3 °C à 27.8 °C');
  expect(view.primary).toContain('Revolver');
  expect(view.apparel).toMatchObject([{name:'Chemise en tissu (normal)',condition:'100/100 PV'}]);
  expect(view.apparel[0]!.protection).toContain('Tranchant 7 %');
  expect(view.inventory).toEqual(['Repas simple']);
  expect(JSON.stringify(view)).not.toContain('kg');
});

test('social dossier sorts real opinions and keeps the two directions separate',()=>{
  const world=medicalCamp(3),pawn=world.pawns[0]!,liked=world.pawns[1]!,known=world.pawns[2]!;
  pawn.social={rng:1,memories:[
    {otherId:liked.id,kind:'rapport',at:world.tick,offset:20},
    {otherId:known.id,kind:'chitchat',at:world.tick,offset:5},
  ]};
  liked.social={rng:2,memories:[{otherId:pawn.id,kind:'insult',at:world.tick,offset:-15}]};
  const rows=socialOpinionRows(world,pawn);
  expect(rows.map(row=>row.id)).toEqual([liked.id,known.id]);
  expect(rows[0]).toMatchObject({own:20,reciprocal:-15,causes:'Rapprochement : +20'});
  expect(rows[1]).toMatchObject({own:5,reciprocal:0});
  expect(socialLastText(world,pawn)).toBe('Aucun échange récent.');
  pawn.social.last={otherId:liked.id,kind:'slight',tick:world.tick,initiated:true};
  expect(socialLastText(world,pawn)).toContain(`A vexé ${liked.name}`);
});

test('mood dossier orders actual thoughts without displaying a fictitious base thought',()=>{
  const world=medicalCamp(),pawn=world.pawns[0]!;
  pawn.hunger=10;pawn.comfort=80;
  const view=moodInspectionView(world,pawn);
  expect(view.target).toBe(moodTarget(moodThoughts(world,pawn)));
  expect(view.thoughts.every(row=>row.offset!==0)).toBe(true);
  expect(view.thoughts.map(row=>row.offset)).toEqual([...view.thoughts.map(row=>row.offset)].sort((a,b)=>b-a));
  expect(view.thoughts.some(row=>row.id==='base')).toBe(false);
  expect(view.thoughts.some(row=>row.id==='ravenous'&&row.display==='-12')).toBe(true);
  expect(view.thoughts.some(row=>row.id==='extremely-comfortable'&&row.display==='+8')).toBe(true);
});
