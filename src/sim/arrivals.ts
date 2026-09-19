import { startingTraits } from './traits.ts';
import { ARRIVAL_NAMES,arrivalRandom,type ArrivalCommand } from './arrival-state.ts';
import { arrivalEntry } from './arrival-entry.ts';
import { isColonist } from './affiliation.ts';
import { startingPawn } from './starting-pawns.ts';
import { newApparelState } from './apparel-rules.ts';
import { TICKS_PER_DAY,type World,type CommandResult } from './types.ts';

const log=(w:World,message:string)=>{w.events.push({tick:w.tick,type:'command',message});if(w.events.length>80)w.events.splice(0,w.events.length-80);};
export function enableArrivals(world:World):void {
  if(world.arrivals)return;
  const s=world.arrivals={profile:'camp-arrivals-v1' as const,rng:((world.seed^0xa7719e31)>>>0)||1,nextCheck:0,serial:0,accepted:0,declined:0,expired:0};
  s.nextCheck=world.tick+Math.floor(TICKS_PER_DAY*(1.5+arrivalRandom(s)*.5));
}
export function advanceArrivals(world:World):void {
  const s=world.arrivals;if(!s)return;
  if(s.pending&&world.tick>=s.pending.expiresAt){s.expired++;delete s.pending;log(world,'La demande d’accueil a expiré. Le voyageur poursuit sa route.');}
  if(world.tick<s.nextCheck)return;
  // Explicit provisional pacing. Complete population intent, difficulty and
  // competing incidents belong to the future storyteller, not this profile.
  s.nextCheck=world.tick+Math.floor(TICKS_PER_DAY*(4+arrivalRandom(s)*4));
  if(s.pending||world.pawns.filter(p=>isColonist(p)&&p.state!=='dead').length>=12||!arrivalEntry(world,s.rng))return;
  const profile=Math.floor(arrivalRandom(s)*3) as 0|1|2;
  const name=ARRIVAL_NAMES[Math.floor(arrivalRandom(s)*ARRIVAL_NAMES.length)]!;
  s.pending={id:++s.serial,openedAt:world.tick,expiresAt:world.tick+TICKS_PER_DAY,name,profile,traits:startingTraits(profile)};
  log(world,`${name} demande à rejoindre la colonie. Répondez dans la journée.`);
}
export function applyArrival(world:World,command:ArrivalCommand):CommandResult {
  const refuse=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
  if(command.type==='enable-arrivals') {enableArrivals(world);return {ok:true};}
  const s=world.arrivals,o=s?.pending;
  if(!o||!Number.isSafeInteger(command.offerId)||command.offerId!==o.id||typeof command.accept!=='boolean'||world.tick>=o.expiresAt)return refuse('Cette demande n’est plus disponible.');
  if(!command.accept) {
    for(const p of world.pawns)if(isColonist(p)&&p.state!=='dead'&&!p.mental?.crisis) {
      const memories=(p.deniedJoining??[]).filter(t=>t>world.tick);
      // Same-tick duplicate decisions cannot occur for this sole pending letter.
      p.deniedJoining=[...memories,world.tick+6*TICKS_PER_DAY].slice(-5);
    }
    s!.declined++;delete s!.pending;log(world,`La demande de ${o.name} a été refusée.`);return {ok:true};
  }
  if(world.pawns.length>=world.width*world.height||world.piles.length>=32768||world.nextId>Number.MAX_SAFE_INTEGER-2)return refuse('La carte ne peut plus accueillir cette personne.');
  const entry=arrivalEntry(world,s!.rng);if(!entry)return refuse('Aucune entrée libre et accessible depuis la colonie. La demande reste ouverte.');
  const pawn=startingPawn(world.nextId,o.name,entry.x,entry.z,o.profile,55);
  if(o.traits)pawn.traits=[...o.traits];
  pawn.hunger=75;pawn.rest=80;pawn.foodPolicyId=world.foodPolicies[0]!.id;
  // Clothing crosses the map boundary with its owner; it is an external input,
  // not a withdrawal from colony stock or a textile-production recipe.
  const shirt={id:world.nextId+1,kind:'apparel' as const,item:'cloth-shirt' as const,quantity:1,owner:{type:'apparel' as const,pawnId:pawn.id},apparel:newApparelState('cloth-shirt')};
  world.nextId+=2;world.pawns.push(pawn);world.piles.push(shirt);
  s!.accepted++;delete s!.pending;
  log(world,`${pawn.name} rejoint la colonie par le bord de la carte avec sa chemise. Prévoyez un couchage et ses affectations.`);
  return {ok:true};
}
