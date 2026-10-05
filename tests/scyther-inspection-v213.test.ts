import { expect,test } from 'vitest';
import { scytherCamp,producedScytherCorpse } from './scenarios/scyther-v213.ts';
import { mechanoidView } from '../src/sim/mechanoid-presentation.ts';
import { itemInformation } from '../src/ui/item-information.ts';
import { tacticalAttackPolicy } from '../src/ui/order-menu.ts';
import { mechaAssessment } from '../src/sim/mechanoid-health.ts';

test('inspection keeps a safe literal real target, mechanical capacities and anatomical HP separate from object HP and food',()=>{
  const {world,actor}=scytherCamp(),victim=world.pawns[0]!;victim.name='<img src=x> & Noé';
  actor.melee={order:{targetId:victim.id,startedDowned:false,jobUntilCore:world.tick*10+400},strike:null};
  const before=JSON.stringify(world),view=mechanoidView(world,actor);
  expect(view.target).toEqual({id:victim.id,label:victim.name,cell:{x:victim.x,z:victim.z}});expect(view.parts).toHaveLength(32);
  expect(view.parts.some(p=>p.id==='skull'||p.id==='heart')).toBe(false);expect(view.mass).toBe(60);expect(view.hostile).toBe(true);expect(view.capacities.moving).toBe(1);expect(JSON.stringify(world)).toBe(before);
  delete actor.melee;producedScytherCorpse(world,actor);const pile=world.piles.find(p=>p.id===actor.id)!;pile.damage=9;
  const info=itemInformation(pile),mass=info.rows.find(row=>row.label==='Masse restante')!,hp=info.rows.find(row=>row.label==='Points de vie')!;
  expect(hp.value).toBe('91 / 100');expect(mass.value).not.toBe('60,000 kg');expect(info.rows.some(row=>row.label==='Nutrition')).toBe(false);
  expect(info.rows.find(row=>row.label==='Parties absentes')!.value).toContain('Lame droite');expect(info.rows.find(row=>row.label==='Usage')!.description).toContain('carcasse entière');
  expect(mechaAssessment(pile.mechCorpse!).vitalFailure).toBe(true);
});
test('a selected mechanical owner receives no colonial authority while a drafted colonist may attack the real hostile machine',()=>{
  const {world,actor}=scytherCamp();expect(tacticalAttackPolicy(world,new Set([actor.id]),world.pawns[0]!.id,false).options).toEqual([]);
  const colonist=world.pawns[0]!;colonist.draft={target:null,queue:[],lastActiveTick:world.tick};colonist.x=17;colonist.z=16;
  const policy=tacticalAttackPolicy(world,new Set([colonist.id]),actor.id,false);expect(policy.target).toBe(`Scyther ${actor.id}`);
  expect(policy.options.find(p=>p.kind==='melee')).toMatchObject({enabled:true,pawnIds:[colonist.id]});
});
