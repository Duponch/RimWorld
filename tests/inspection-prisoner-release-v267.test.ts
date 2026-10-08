import { expect,test } from 'vitest';
import { prisonerReleaseInspection } from '../src/ui/prisoner-inspection';

type Patient=Parameters<typeof prisonerReleaseInspection>[1];
type Warden=Parameters<typeof prisonerReleaseInspection>[0]['pawns'][number];
const patient=(change:Partial<Patient>={}):Patient=>({id:7,state:'idle',prisoner:{capturedAt:1,initialResistance:10,resistance:4,mode:'release',chatDay:0,chatCount:0,rng:1},...change});
const warden=(phase:'approach'|'carry',patientId=7):Warden=>({id:2,name:'Lou',rescue:{patientId,bedId:0,phase,release:{drop:{x:3,z:4},exit:{x:0,z:4}}}});

test('a release request waits for a real warden and keeps the instruction reversible',()=>{
  const p=patient(),w={pawns:[]},before=JSON.stringify([w,p]);
  const view=prisonerReleaseInspection(w,p)!;
  expect(view.status).toContain('Attend la prise en charge');
  expect(view.modeDisabled).toBe(false);
  expect(view.hint).toContain('soins et la nourriture restent nécessaires');
  expect(JSON.stringify([w,p])).toBe(before);
});

test('only the task for this prisoner describes approach and actual portage',()=>{
  expect(prisonerReleaseInspection({pawns:[warden('carry',8)]},patient())!.status).toContain('Attend la prise en charge');
  expect(prisonerReleaseInspection({pawns:[warden('approach')]},patient())!.status).toContain('Lou, geôlier en route');
  expect(prisonerReleaseInspection({pawns:[warden('carry')]},patient())!.status).toContain('Lou porte le prisonnier');
});

test('a downed prisoner waits for recovery without claiming the release is already effective',()=>{
  const view=prisonerReleaseInspection({pawns:[]},patient({state:'downed'}))!;
  expect(view.status).toContain('Attend de pouvoir se relever');
  expect(view.modeDisabled).toBe(false);
});

test('effective release takes precedence over a stale task and cannot be cancelled even at tick zero',()=>{
  const p=patient();p.prisoner!.releasedAt=0;
  const view=prisonerReleaseInspection({pawns:[warden('carry')]},p)!;
  expect(view.status).toContain('Quitte la carte par ses propres moyens');
  expect(view.modeDisabled).toBe(true);
  expect(view.hint).toContain('ne peut plus être annulée');
  expect(prisonerReleaseInspection({pawns:[]},{...p,state:'downed'})!.status).toContain('ne peut pas encore quitter');
});

test('ordinary captivity, death and unrelated pawns retain their existing status',()=>{
  const p=patient();p.prisoner!.mode='recruit';
  expect(prisonerReleaseInspection({pawns:[]},p)).toBeUndefined();
  expect(prisonerReleaseInspection({pawns:[]},patient({state:'dead'}))).toBeUndefined();
  expect(prisonerReleaseInspection({pawns:[]},patient({prisoner:undefined}))).toBeUndefined();
});
