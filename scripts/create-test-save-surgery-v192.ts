import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { surgeryCamp } from '../tests/helpers/surgery-v192.ts';
import { applyCommand } from '../src/sim/engine.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION,type World } from '../src/sim/types.ts';

export const SURGERY_DEMO_ID='chirurgie-therapeutique-v192';
export const SURGERY_DEMO_CANDIDATE='tmp/v192/chirurgie-therapeutique.json';

/** Prepared infection and an explicitly historical visual control. No request,
 * admission, route, dose administration, operation or postoperative care is granted. */
export function prepareSurgeryDemo():World {
  const {world,doctorId,patientId,helperId}=surgeryCamp('medicine',32);
  const doctor=world.pawns.find(p=>p.id===doctorId)!,patient=world.pawns.find(p=>p.id===patientId)!,control=world.pawns.find(p=>p.id===helperId)!;
  doctor.name='Ada';patient.name='Basile';control.name='Céleste';
  assert.equal(applyCommand(world,{type:'priority',pawnId:doctor.id,work:'doctor',value:1}).ok,true);control.priorities.doctor=0;
  control.health=createMedicalRecord(world.tick);
  control.health.missing=[{part:'right-leg',bornAt:world.tick-1000,tended:true}];
  control.x=12;control.z=12;
  for(const pawn of world.pawns){pawn.hunger=100;pawn.rest=100;pawn.recreation.level=100;pawn.apparelAutomation=false;}
  refreshStock(world);assert.deepEqual(validateWorld(world),[]);return world;
}

export function surgeryDemoEntry(world:World,sha256:string){return {
  id:SURGERY_DEMO_ID,release:'v192',label:'Chirurgie thérapeutique · 3 colons',
  description:'Demander l’amputation du bras infecté de Basile depuis Santé, observer lit, médicament, anesthésie, opération et soins réels. Céleste sert de témoin visuel d’une ancienne jambe perdue.',
  filename:'chirurgie-therapeutique.json',pawns:world.pawns.length,colonists:3,width:world.width,height:world.height,tick:world.tick,
  focus:['infection directe','demande et annulation','lit et médecin','médicament physique','anesthésie','amputation','soins postopératoires','sauvegarde et reprise'],
  steps:[
    'Charger en pause. Basile porte une infection directement sur le bras gauche ; son cas préparé est déjà soigné. Santé permet aussi de continuer les soins et attendre l’immunité.',
    'Dans Santé de Basile, demander le bras gauche. Reprendre pour observer sa marche vers le vrai lit et Ada collecter une dose industrielle puis rejoindre le chevet.',
    'Sauvegarder pendant la collecte ou l’opération, recharger puis reprendre. La dose doit être consommée une seule fois et l’anesthésie persiste indépendamment de la tâche.',
    'Après l’issue, observer les soins ordinaires de la plaie fraîche et le portrait. L’opération peut échouer ; aucun résultat clinique n’est préparé. Céleste a déjà une ancienne jambe droite absente, uniquement comme témoin graphique.',
  ],prepared:true,
  provenance:'Scène préparée 32×32 au schéma 179, issue du helper clinique surgeryCamp, graine 42 et tick 3000. Terrain grass dégagé, trois colons libres adultes avec besoins hauts ; travaux désactivés sauf Médecin 1 pour Ada, Patient 1/Repos au lit 3 pour Basile. Ada et Céleste ont Médecine 8. Basile possède un unique cas d’infection directe left-arm de gravité 0,1, immunité 0 et soin 100 % préparé, échéance 37 500 Core après le départ. Lit médical normal existant en (10,10), trois doses industrielles au sol en (13,3), flux déterministe rng 2 fixé avant simulation. Céleste possède une ancienne racine right-leg manquante et soignée, préparée 1 000 ticks avant le départ, sans tâche clinique associée. Aucune demande, route, admission, dose consommée, anesthésie, opération ou soin postopératoire accordé. Fixture préparée, pas acquisition naturelle, campagne ni preuve de charge 250×250.',
  sha256,
};}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/create-test-save-surgery-v192.ts')){
  assert.equal(SCHEMA_VERSION,179,'Do not rewrite the V192 reference under a later schema.');
  const world=prepareSurgeryDemo(),raw=serializeWorld(world);assert.deepEqual(deserializeWorld(raw),world);
  const output=process.argv[2]??SURGERY_DEMO_CANDIDATE;
  mkdirSync(dirname(output),{recursive:true});writeFileSync(output,raw);
  console.log(JSON.stringify({path:output,entry:surgeryDemoEntry(world,createHash('sha256').update(raw).digest('hex'))}));
}
