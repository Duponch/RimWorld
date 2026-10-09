import { expect,test,vi } from 'vitest';
import { createWorld } from '../src/sim/engine.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { WOODEN_PARTS } from '../src/sim/artificial-parts-rules.ts';
import { installWoodenPart } from '../src/sim/artificial-parts.ts';
import type { WoodenPartKind,WoodenPartSite } from '../src/sim/artificial-parts-types.ts';
import type { World } from '../src/sim/types.ts';
import { healthSurgeryView,requestInspectedInstallation,cancelInspectedAmputation,healthInjuryRows,healthPartTooltip,healthCapacityRows } from '../src/ui/health-inspection.ts';

function patient(part:WoodenPartSite='left-leg'){
  const world=createWorld(275,16,16),pawn=world.pawns[0]!;
  pawn.health={...createMedicalRecord(world.tick),missing:[{part,bornAt:world.tick,tended:true}]};
  return {world,pawn};
}
const actions=()=>({request:vi.fn(),install:vi.fn(),cancel:vi.fn()});

test('the six wooden sites use the real installation guard and dispatch intent without altering anatomy',()=>{
  for(const [kind,rule] of Object.entries(WOODEN_PARTS))for(const part of rule.sites){
    const {world,pawn}=patient(part),send=actions(),before=JSON.stringify(world);
    const view=healthSurgeryView(pawn,world);
    expect(view.installations).toHaveLength(6);
    const choice=view.installations.find(c=>c.part===part&&c.implant===kind)!;
    expect(choice.reason).toBeUndefined();expect(choice.guidance).toContain('1 bois + 2 médicaments');
    expect(choice.guidance).toContain(`efficacité ${Math.round(rule.efficiency*100)} %`);
    expect(requestInspectedInstallation(pawn,part,kind as WoodenPartKind,send)).toBeUndefined();
    expect(send.install.mock.calls).toEqual([[pawn.id,part,kind]]);
    expect(send.request).not.toHaveBeenCalled();expect(JSON.stringify(world)).toBe(before);
    expect(pawn.surgeryRequest).toBeUndefined();
  }
});

test('healthy limbs, mismatched recipes and a missing parent cannot dispatch a replacement',()=>{
  const {world,pawn}=patient('left-hand'),send=actions();
  expect(requestInspectedInstallation(pawn,'left-leg','peg-leg',send)).toBeTruthy();
  expect(requestInspectedInstallation(pawn,'left-hand','peg-leg',send)).toBeTruthy();
  pawn.health!.missing=[{part:'left-arm',bornAt:world.tick,tended:true}];
  const before=JSON.stringify(world);
  expect(requestInspectedInstallation(pawn,'left-hand','wooden-hand',send)).toBeTruthy();
  expect(send.install).not.toHaveBeenCalled();expect(JSON.stringify(world)).toBe(before);
});

test('stale clicks respect pending intent, administered anesthesia and existing colonist permissions',()=>{
  const {world,pawn}=patient(),send=actions();
  expect(requestInspectedInstallation(undefined,'left-leg','peg-leg',send)).toContain('sélectionné');
  pawn.surgeryRequest={part:'left-leg',implant:'peg-leg',requestedAt:world.tick};
  expect(requestInspectedInstallation(pawn,'left-leg','peg-leg',send)).toContain('déjà');
  delete pawn.surgeryRequest;
  pawn.health!.anesthetic={bornAt:world.tick,expiresAtCore:(world.tick+4500)*10,severity:800_000_000,remainder:0};
  expect(requestInspectedInstallation(pawn,'left-leg','peg-leg',send)).toContain('anesthésie');
  delete pawn.health!.anesthetic;pawn.faction='outlanders';
  expect(requestInspectedInstallation(pawn,'left-leg','peg-leg',send)).toBeTruthy();
  expect(send.install).not.toHaveBeenCalled();
});

test('confirmed installation phases name the real recipe, ingredients and cancellation without promising success',()=>{
  const {world,pawn}=patient('right-foot'),send=actions(),doctor=world.pawns[1]!;
  pawn.surgeryRequest={part:'right-foot',implant:'wooden-foot',requestedAt:world.tick};
  expect(healthSurgeryView(pawn,world).status).toContain('pied en bois');
  expect(healthSurgeryView(pawn,world).status).toContain('en attente');
  for(const [phase,label] of [['pickup','bois et des médicaments'],['approach','approche du chevet'],['work','opération en cours']] as const){
    doctor.surgery={patientId:pawn.id,part:'right-foot',implant:'wooden-foot',bedId:100,spot:{x:3,z:3},phase,progress:0,workCore:0};
    const before=JSON.stringify(world),view=healthSurgeryView(pawn,world);
    expect(view.status).toContain(label);expect(view.canCancel).toBe(true);
    expect(view.installations.every(c=>c.reason?.includes('déjà'))).toBe(true);
    expect(JSON.stringify(world)).toBe(before);
  }
  const before=JSON.stringify(world);
  expect(cancelInspectedAmputation(pawn,send)).toBe(true);expect(send.cancel.mock.calls).toEqual([[pawn.id]]);
  expect(JSON.stringify(world)).toBe(before);
});

test('historical worlds expose no installation choices and callbacks remain optional',()=>{
  const {world,pawn}=patient();world.schemaVersion=209 as World['schemaVersion'];
  expect(healthSurgeryView(pawn,world).installations).toEqual([]);
  expect(healthSurgeryView(pawn,world).choices).toHaveLength(4);
  const oldActions={request:vi.fn(),cancel:vi.fn()};
  expect(requestInspectedInstallation(pawn,'left-leg','peg-leg',oldActions)).toContain('pas disponible');
  expect(oldActions.request).not.toHaveBeenCalled();
});

test('installed wooden anatomy is named once and replaced descendants are not presented as fresh wounds',()=>{
  for(const [kind,part,descendant,capacity,value] of [
    ['peg-leg','left-leg','left-foot','Mouvement','80 %'],
    ['wooden-hand','left-hand','left-thumb','Manipulation','80 %'],
    ['wooden-foot','left-foot','left-big-toe','Mouvement','90 %'],
  ] as const){
    const {pawn}=patient(part);expect(installWoodenPart(pawn.health!,part,kind)).toBe(true);
    const before=JSON.stringify(pawn),rule=WOODEN_PARTS[kind],rows=healthInjuryRows(pawn);
    expect(rows).toHaveLength(1);expect(rows[0]!.description).toBe(`${rule.label} · efficacité ${rule.efficiency*100} %`);
    expect(healthPartTooltip(pawn,part).rows).toContainEqual({label:'Prothèse',value:rule.label});
    const replaced=healthPartTooltip(pawn,descendant);
    expect(replaced.body).toContain('ne constitue pas une nouvelle plaie');
    expect(replaced.rows.some(row=>row.label==='Points de vie')).toBe(false);
    expect(healthCapacityRows(pawn)).toContainEqual({label:capacity,value});
    expect(JSON.stringify(pawn)).toBe(before);
  }
});
