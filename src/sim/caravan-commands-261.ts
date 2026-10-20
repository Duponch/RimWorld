import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import {prepareEncounterForeignWorld261} from './caravan-foreign-world-261.ts';
import {prepareDemandPayment261} from './caravan-demand-payment-261.ts';
import {prepareMeetingTrade261,type MeetingTradeLine261} from './caravan-meeting-trade-261.ts';
import {caravanMapAllowed261} from './caravan-incidents-261.ts';
import type {CampaignState} from './world-map-state.ts';
import type {CommandResult} from './types.ts';
export type CaravanCommand261=
 |{type:'caravan-encounter-choice';groupId:number;choice:'continue'|'give'|'attack'|'fight'|'retry'}
 |{type:'caravan-meeting-trade';groupId:number;lines:MeetingTradeLine261[];quote:string;acceptShortfall:boolean};
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
export function validCaravanCommand261(v:unknown):v is CaravanCommand261 {
 if(!plain(v)||!Number.isSafeInteger(v.groupId)||Number(v.groupId)<1)return false;
 const keys=Reflect.ownKeys(v);
 if(v.type==='caravan-encounter-choice')return keys.length===3&&['type','groupId','choice'].every(k=>Object.hasOwn(v,k))&&['continue','give','attack','fight','retry'].includes(String(v.choice));
 return v.type==='caravan-meeting-trade'&&keys.length===5&&['type','groupId','lines','quote','acceptShortfall'].every(k=>Object.hasOwn(v,k))&&Array.isArray(v.lines)&&v.lines.length<=128&&Reflect.ownKeys(v.lines).length===v.lines.length+1&&v.lines.every(l=>plain(l)&&Reflect.ownKeys(l).length===2&&Object.hasOwn(l,'pileId')&&Object.hasOwn(l,'quantity')&&Number.isSafeInteger(l.pileId)&&Number(l.pileId)>0&&Number.isSafeInteger(l.quantity)&&Number(l.quantity)!==0)&&typeof v.quote==='string'&&typeof v.acceptShortfall==='boolean';
}
export function applyCaravanCommand261(root:CampaignState,c:CaravanCommand261):CommandResult {
 const fail=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
 if((Number(root.schemaVersion)!==261&&(Number(root.schemaVersion)!==262&&!isSchema263OrLater(Number(root.schemaVersion))))||!validCaravanCommand261(c))return fail('Commande de rencontre invalide.');
 const r=root.worldGroups?.groups.find(r=>r.state.id===c.groupId),p=r?.pending261,g=r?.state;
 if(!r||!p||!g||!('members'in g)||r.localMapId!==null||p.atCore!==root.tick*10)return fail('Cette rencontre réelle est absente.');
 if(c.type==='caravan-encounter-choice'&&c.choice==='retry')return p.decision!=='open'?{ok:true}:fail('Choisissez d’abord la décision réelle.');
 if(p.decision!=='open')return fail('Cette décision de bataille a déjà été prise ; sa préparation doit se terminer.');
 if(c.type==='caravan-meeting-trade'){
  const plan=prepareMeetingTrade261(root,r,c.lines,c.quote,c.acceptShortfall);if(!plan.ok)return fail(plan.reason);if(!plan.current())return fail('Le panier a changé.');plan.commit();return {ok:true};
 }
 if(c.choice==='attack'||c.choice==='fight'){
  if(c.choice==='attack'&&p.kind!=='meeting'||c.choice==='fight'&&p.kind!=='demand'||!caravanMapAllowed261(root,g.tile))return fail('Ce choix ne possède pas son vrai incident ou sa tuile libre.');
  // Persist the actual accepted decision BEFORE worker generation may yield.
  // No tick, faction/RNG draw, new actor or map is committed by this assignment.
  if(p.kind==='meeting')p.decision='attack';else if(p.kind==='demand')p.decision='fight';return {ok:true};
 }
 if(c.choice==='give'){
  if(p.kind!=='demand')return fail('Cette rencontre ne réclame pas de cession.');const plan=prepareDemandPayment261(root,r);if(!plan.ok)return fail(plan.reason);if(!plan.current())return fail('Les propriétaires de la demande ont changé.');plan.commit();return {ok:true};
 }
 if(p.kind!=='meeting')return fail('Cette rencontre exige Donner ou Combattre.');
 const transfer=prepareEncounterForeignWorld261(root,r);if(!transfer.ok)return fail(transfer.reason);if(!transfer.current())return fail('Les vrais étrangers ont changé.');transfer.commit();delete r.pending261;return {ok:true};
}
