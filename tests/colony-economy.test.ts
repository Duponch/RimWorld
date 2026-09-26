import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyCommand, createWorld, deserializeWorld, serializeWorld, stepWorld, validateWorld } from '../src/sim/index.ts';
import { adoptColonyEconomy, flushColonyLosses, notifyColonyLoss, sampleColonyEconomy, WEALTH_SAMPLE_INTERVAL } from '../src/sim/colony-economy.ts';
import { assessBody } from '../src/sim/body-capacities.ts';
import { reconcilePawnHealth } from '../src/sim/health.ts';
import { injurePawn } from '../src/sim/health.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { HP_UNIT } from '../src/sim/injury-rules.ts';
import { moodThoughts } from '../src/sim/mood.ts';
import type { World } from '../src/sim/types.ts';

describe('économie V105 : adoption et relevé', () => {
  it('reprend la démonstration V104 sans modifier son contenu ni lui imposer une adoption', () => {
    const saved=readFileSync('public/test-saves/v104/sculpture.json','utf8');
    const original=JSON.parse(saved),migrated=deserializeWorld(saved);
    expect(original.schemaVersion).toBe(104);
    expect(migrated).toEqual({...original,schemaVersion:106,pawns:original.pawns.map((p:any)=>({...p,priorities:{...p.priorities,handle:0}}))});
    expect(migrated.economy).toBeUndefined();
    expect(validateWorld(migrated)).toEqual([]);
  });

  it('adopte une fois les actifs existants sans créer de bien, réécrire un pion ou tirer du hasard', () => {
    const world=createWorld(105,16,16),before=structuredClone(world),rng=world.rng;
    expect(world.economy).toBeUndefined();
    expect(applyCommand(world,{type:'adopt-economy'}).ok).toBe(true);
    expect(world.economy).toMatchObject({profile:'colony-prosperity-v1',adoptedAt:0,sampledAt:0,nextSampleAt:WEALTH_SAMPLE_INTERVAL,adaptationDays:0});
    expect(world.rng).toBe(rng);
    expect(world.pawns).toEqual(before.pawns);
    expect(world.piles).toEqual(before.piles);
    expect(world.structures).toEqual(before.structures);
    expect(world.jobs).toEqual(before.jobs);
    const accepted=serializeWorld(world);
    expect(applyCommand(world,{type:'adopt-economy'}).ok).toBe(true);
    expect(serializeWorld(world)).toBe(accepted);
    expect(deserializeWorld(serializeWorld(world))).toEqual(world);
    expect(validateWorld(world)).toEqual([]);
  });

  it('partage un relevé sparse à 501 ticks et garde le PRNG intact', () => {
    const world=createWorld(106,16,16);expect(adoptColonyEconomy(world)).toBe(true);
    const first=world.economy!.wealth,rng=world.rng;
    world.piles.push({id:world.nextId++,item:'silver',kind:'silver',quantity:10,owner:{type:'ground',x:8,z:8}});
    world.tick=WEALTH_SAMPLE_INTERVAL-1;sampleColonyEconomy(world);
    expect(world.economy!.sampledAt).toBe(0);
    expect(world.economy!.wealth).toBe(first);
    world.tick=WEALTH_SAMPLE_INTERVAL;sampleColonyEconomy(world);
    expect(world.economy!.sampledAt).toBe(WEALTH_SAMPLE_INTERVAL);
    expect(world.economy!.nextSampleAt).toBe(WEALTH_SAMPLE_INTERVAL*2);
    expect(world.economy!.wealth.items).toBeCloseTo(first.items+10,8);
    expect(world.rng).toBe(rng);
    expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  });

  it('fait changer la pensée d’attentes au seuil exact du relevé partagé', () => {
    const world=createWorld(107,16,16);adoptColonyEconomy(world);
    const person=world.pawns[0]!,wealth=world.economy!.wealth;
    world.economy!.wealth={...wealth,knownTotal:14999.99};
    expect(moodThoughts(world,person).find(t=>t.id.startsWith('expectations-'))?.offset).toBe(30);
    world.economy!.wealth={...wealth,knownTotal:15000};
    expect(moodThoughts(world,person).find(t=>t.id.startsWith('expectations-'))?.offset).toBe(24);
    expect(moodThoughts(world,person).some(t=>t.id==='camp-expectations')).toBe(false);
  });

  it('branche le même palier sur la baisse de tolérance aux loisirs, sans accélérer la jauge', () => {
    const historical=createWorld(117,16,16),adopted=createWorld(117,16,16);
    adoptColonyEconomy(adopted);
    const wealth=adopted.economy!.wealth;
    adopted.economy!.wealth={...wealth,knownTotal:15000};
    for(const w of [historical,adopted]){
      w.pawns[0]!.recreation.tolerance.solitary=50;
      w.pawns[0]!.recreation.level=55;
    }
    stepWorld(historical);stepWorld(adopted);
    expect(historical.pawns[0]!.recreation.tolerance.solitary).toBeCloseTo(50-18/6000,10);
    expect(adopted.pawns[0]!.recreation.tolerance.solitary).toBeCloseTo(50-13/6000,10);
    expect(adopted.pawns[0]!.recreation.level).toBeCloseTo(historical.pawns[0]!.recreation.level,10);
  });
});

describe('économie V105 : adaptation et sauvegarde stricte', () => {
  it('retient une chute violente mais ne punit pas un effondrement médical', () => {
    const violent=createWorld(108,16,16);adoptColonyEconomy(violent);violent.economy!.adaptationDays=40;
    notifyColonyLoss(violent,violent.pawns[0]!,'downed');
    expect(violent.economy!.pendingLosses).toEqual([{pawnId:violent.pawns[0]!.id,kind:'downed',population:3}]);
    flushColonyLosses(violent);expect(violent.economy!.adaptationDays).toBe(34);
    const illness=createWorld(109,16,16);adoptColonyEconomy(illness);illness.economy!.adaptationDays=40;
    const patient=illness.pawns[0]!;patient.health=createMedicalRecord(illness.tick);
    reconcilePawnHealth(illness,patient,assessBody({damage:[],missing:[],pain:0,consciousnessOffset:-1}));
    expect(patient.state).toBe('downed');
    expect(illness.economy!.pendingLosses).toBeUndefined();
    flushColonyLosses(illness);expect(illness.economy!.adaptationDays).toBe(40);
  });

  it('un décès remplace la chute du même tick et se rejoue après sauvegarde', () => {
    const world=createWorld(110,16,16);adoptColonyEconomy(world);world.economy!.adaptationDays=40;
    const person=world.pawns[0]!;
    injurePawn(world,person,'left-leg','crush',30*HP_UNIT);
    injurePawn(world,person,'right-leg','crush',30*HP_UNIT);
    expect(person.state).toBe('downed');
    expect(world.economy!.pendingLosses?.[0]?.kind).toBe('downed');
    const replay=deserializeWorld(serializeWorld(world));
    injurePawn(world,person,'brain','crush',10*HP_UNIT);
    injurePawn(replay,replay.pawns.find(p=>p.id===person.id)!,'brain','crush',10*HP_UNIT);
    expect(person.state).toBe('dead');
    expect(world.economy!.pendingLosses).toEqual([{pawnId:person.id,kind:'died',population:2}]);
    flushColonyLosses(world);flushColonyLosses(replay);
    expect(world.economy!.adaptationDays).toBe(10);
    expect(serializeWorld(replay)).toBe(serializeWorld(world));
  });

  it('refuse un état économique corrompu sans altérer la sauvegarde source', () => {
    const world=createWorld(111,16,16);adoptColonyEconomy(world);
    const source=serializeWorld(world);
    const changes:((bad:World)=>void)[]=[
      bad=>{bad.economy!.nextSampleAt--;},
      bad=>{bad.economy!.wealth={...bad.economy!.wealth,knownTotal:bad.economy!.wealth.knownTotal+1};},
      bad=>{bad.economy!.wealth={...bad.economy!.wealth,unpricedPawnIds:[bad.pawns[0]!.id,bad.pawns[0]!.id]};},
      bad=>{bad.economy!.wealth={...bad.economy!.wealth,complete:true};},
      bad=>{bad.economy!.adaptationDays=Number.POSITIVE_INFINITY;},
    ];
    for(const change of changes){const bad=structuredClone(world);change(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
    expect(serializeWorld(world)).toBe(source);
  });
});
