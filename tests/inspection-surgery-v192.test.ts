import { expect,test,vi } from 'vitest';
import { createWorld } from '../src/sim/engine';
import { createMedicalRecord } from '../src/sim/injury-state';
import { HUMAN_YEAR_TICKS } from '../src/sim/human-age';
import { healthSurgeryView,requestInspectedAmputation,cancelInspectedAmputation,healthAnestheticText,healthInjuryRows } from '../src/ui/health-inspection';
import type { BodyPartId } from '../src/sim/body-definition';
import type { Pawn } from '../src/sim/types';

const limbs=['left-arm','right-arm','left-leg','right-leg'] as const;
/** Prepared infection boundary. These tests exercise the real pure view/click
 * dispatch used by the inspector, not DOM rendering or a finished operation. */
function patient(parts:readonly BodyPartId[]=limbs){
  const world=createWorld(192,16,16),pawn=world.pawns[0]!;
  pawn.health={...createMedicalRecord(world.tick),infections:{nextId:parts.length+1,immunity:0,
    cases:parts.map((part,i)=>({id:i+1,part,bornAt:world.tick,severity:300_000_000,luck:1_000_000}))}};
  return {world,pawn};
}

test('all four directly infected limbs are choices; requesting only sends patient/part and never removes anatomy',()=>{
  const {world,pawn}=patient(),before=JSON.stringify(world),actions={request:vi.fn(),cancel:vi.fn()};
  const view=healthSurgeryView(pawn,world);
  expect(view.choices.map(choice=>choice.part)).toEqual(limbs);expect(view.choices.every(choice=>choice.reason===undefined)).toBe(true);
  expect(view.canCancel).toBe(false);expect(view.status).toContain('Aucune amputation');
  for(const limb of limbs)expect(requestInspectedAmputation(pawn,limb,actions)).toBeUndefined();
  expect(actions.request.mock.calls).toEqual(limbs.map(part=>[pawn.id,part]));expect(actions.cancel).not.toHaveBeenCalled();
  expect(JSON.stringify(world)).toBe(before);expect(pawn.health!.missing).toEqual([]);expect(pawn.surgeryRequest).toBeUndefined();
});

test('a hand/foot-only infection, wound or scar never admits the healthy parent; full immunity does not erase a present case',()=>{
  const {pawn}=patient(['left-hand','right-foot']),actions={request:vi.fn(),cancel:vi.fn()};
  expect(healthSurgeryView(pawn).choices.every(choice=>choice.reason?.includes('directement'))).toBe(true);
  expect(requestInspectedAmputation(pawn,'left-arm',actions)).toContain('directement');
  pawn.health!.injuries=[{id:1,part:'left-arm',kind:'cut',severity:1000,bornAt:0,scar:{threshold:500,pain:1}}];
  expect(requestInspectedAmputation(pawn,'left-arm',actions)).toContain('directement');expect(actions.request).not.toHaveBeenCalled();
  pawn.health!.infections!.cases.push({id:3,part:'left-arm',bornAt:0,severity:100_000_000,luck:1_000_000});
  pawn.health!.infections!.immunity=1_000_000_000;
  expect(healthSurgeryView(pawn).choices[0]!.reason).toBeUndefined();
});

test('lost parents, minors, non-colonists, captives and deceased patients remain disabled without dispatch or mutation',()=>{
  const {pawn}=patient(),edits:((p:Pawn)=>void)[]=[
    p=>{p.health!.missing=[{part:'left-shoulder',bornAt:0}];},
    p=>{p.age={biologicalTicks:17*HUMAN_YEAR_TICKS,chronologicalTicks:25*HUMAN_YEAR_TICKS};},
    p=>{p.faction='outlanders';},
    p=>{p.prisoner={capturedAt:0,initialResistance:1,resistance:1,mode:'maintain',chatDay:0,chatCount:0,rng:1};},
    p=>{p.state='dead';p.health!.death={tick:0,cause:'infection'};},
  ];
  for(const edit of edits){
    const copy=structuredClone(pawn);edit(copy);const before=JSON.stringify(copy),actions={request:vi.fn(),cancel:vi.fn()};
    expect(healthSurgeryView(copy).choices[0]!.reason).toBeTruthy();expect(requestInspectedAmputation(copy,'left-arm',actions)).toBeTruthy();
    expect(actions.request).not.toHaveBeenCalled();expect(JSON.stringify(copy)).toBe(before);
  }
});

test('waiting request, collection, bedside approach and work are projections of the confirmed patient/doctor states',()=>{
  const {world,pawn}=patient();pawn.surgeryRequest={part:'right-leg',requestedAt:world.tick};
  const doctor=world.pawns[1]!,before=JSON.stringify(world),pending=healthSurgeryView(pawn,world);
  expect(pending.status).toContain('jambe droite');expect(pending.status).toContain('en attente');expect(pending.canCancel).toBe(true);
  expect(pending.choices.every(choice=>choice.reason?.includes('déjà'))).toBe(true);expect(JSON.stringify(world)).toBe(before);
  for(const [phase,text] of [['pickup','collecte'],['approach','approche'],['work','opération en cours']] as const){
    doctor.surgery={patientId:pawn.id,part:'right-leg',bedId:100,spot:{x:3,z:3},phase,progress:0,workCore:0};
    const checkpoint=JSON.stringify(world);expect(healthSurgeryView(pawn,world).status).toContain(text);expect(JSON.stringify(world)).toBe(checkpoint);
  }
});

test('stale clicks cannot replace a pending request or request an infection already cleared',()=>{
  const {pawn}=patient(),actions={request:vi.fn(),cancel:vi.fn()};
  expect(requestInspectedAmputation(undefined,'left-arm',actions)).toContain('sélectionné');
  pawn.surgeryRequest={part:'right-leg',requestedAt:0};expect(requestInspectedAmputation(pawn,'left-arm',actions)).toContain('déjà');
  delete pawn.surgeryRequest;pawn.health!.infections!.cases=[];expect(requestInspectedAmputation(pawn,'left-arm',actions)).toContain('directement');
  expect(actions.request).not.toHaveBeenCalled();
});

test('cancel only dispatches existing intent and preserves administered anesthesia, dose ownership and the medical record',()=>{
  const {world,pawn}=patient(),actions={request:vi.fn(),cancel:vi.fn()};
  expect(cancelInspectedAmputation(pawn,actions)).toBe(false);expect(cancelInspectedAmputation(undefined,actions)).toBe(false);
  pawn.surgeryRequest={part:'left-arm',requestedAt:0};
  pawn.health!.anesthetic={bornAt:0,expiresAtCore:45_000,severity:1_000_000_000,remainder:0};
  const before=JSON.stringify(world);expect(cancelInspectedAmputation(pawn,actions)).toBe(true);
  expect(actions.cancel.mock.calls).toEqual([[pawn.id]]);expect(JSON.stringify(world)).toBe(before);
  expect(healthSurgeryView({...pawn,surgeryRequest:undefined}).choices.every(choice=>choice.reason?.includes('anesthésie'))).toBe(true);
  pawn.state='dead';expect(cancelInspectedAmputation(pawn,actions)).toBe(false);expect(actions.cancel).toHaveBeenCalledTimes(1);
});

test('clinical anesthesia stages and real missing-part rows update independently of the request, with no guessed duration',()=>{
  const {pawn}=patient();expect(healthAnestheticText(pawn)).toBe('');
  pawn.health!.anesthetic={bornAt:0,expiresAtCore:45_000,severity:800_000_000,remainder:0};expect(healthAnestheticText(pawn)).toContain('sédation');
  pawn.health!.anesthetic.severity=799_999_999;expect(healthAnestheticText(pawn)).toContain('réveil progressif');
  pawn.health!.anesthetic.severity=599_999_999;expect(healthAnestheticText(pawn)).toContain('dissipation');
  pawn.health!.missing=[{part:'left-arm',bornAt:0}];
  expect(healthInjuryRows(pawn)).toContainEqual({part:'Bras gauche',description:'Partie perdue'});expect(pawn.surgeryRequest).toBeUndefined();
  pawn.state='dead';expect(healthAnestheticText(pawn)).toContain('Dossier arrêté au décès');
});
