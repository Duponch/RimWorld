import {isSchema284OrLater} from '../sim/schema-compatibility-257.ts';
import type {Command,World} from '../sim/types';
import type {CampaignState} from '../sim/world-map-state';
import type {RelationshipPerson} from '../sim/relationship-state';
import type {TradeRequest284,TradeRewardOption284} from '../sim/trade-request-state-284';
import {tradeRequestContent284} from '../sim/trade-request-content-284';
import {ITEM_DEFINITIONS} from '../sim/items';
import {QUALITY_LABELS} from '../sim/equipment-rules';
import {worldSettlementAccess256} from '../sim/world-faction-access';

const text=(node:HTMLElement,value:string)=>{if(node.textContent!==value)node.textContent=value;};
const remaining=(core:number):string=>{
 const minutes=Math.ceil(Math.max(0,core)*1440/60000),days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60),rest=minutes%60;
 if(days)return `${days} j${hours?` ${hours} h`:''}`;
 return hours?`${hours} h${rest?` ${rest} min`:''}`:`${minutes} min`;
};
function rewardText(option:TradeRewardOption284):string {
 const effects=option.original.map(p=>`${p.quantity} ${ITEM_DEFINITIONS[p.item].label}${p.quality?` (${QUALITY_LABELS[p.quality]})`:''}`);
 if(option.goodwill)effects.push(`Relations +${option.goodwill}`);
 return effects.join(' · ');
}
interface RewardRow284 {label:HTMLLabelElement;radio:HTMLInputElement;description:HTMLSpanElement}
interface RequestRow284 {
 element:HTMLElement;title:HTMLElement;source:HTMLElement;status:HTMLElement;timing:HTMLElement;body:HTMLElement;
 options:HTMLFieldSetElement;legend:HTMLElement;rewards:Map<number,RewardRow284>;hint:HTMLElement;
 answer:HTMLButtonElement;dismiss:HTMLButtonElement;letter:HTMLButtonElement;progress:HTMLElement;error:HTMLElement;lastStatus?:TradeRequest284['status'];
}
/** Real local or campaign-only presentation, with no invented map/Pawn array. */
export type TradeRequestPresentation284=Pick<CampaignState,'schemaVersion'|'tick'|'tradeRequests284'|'worldFactions'|'worldPawns'|'planet'>&{
 pawns?:readonly World['pawns'][number][];campaignPeople?:readonly RelationshipPerson[];people?:readonly RelationshipPerson[];seed?:number;campaignSeed?:number;
};

/** Persistent request/radio nodes: ordinary tick updates do not replace a
 * focused control or discard its unsubmitted reward choice. Only real commands
 * cross the boundary; neither hiding nor reading an offer consumes anything. */
export function createTradeRequests284(host:HTMLElement,send:(command:Command)=>Promise<unknown>):{update(world:TradeRequestPresentation284):void} {
 const section=document.createElement('section');section.dataset.tradeRequests284='';
 const heading=document.createElement('h3');heading.textContent='Demandes commerciales';
 const intro=document.createElement('p');intro.textContent='Préparez les biens demandés, choisissez une récompense puis livrez la commande à l’établissement avec une caravane.';
 const empty=document.createElement('p');empty.dataset.tradeRequestEmpty='';
 const active=document.createElement('div'),historyHeading=document.createElement('h4'),history=document.createElement('div');
 active.dataset.tradeRequestActive='';history.dataset.tradeRequestHistory='';historyHeading.textContent='Demandes précédentes';
 section.append(heading,intro,empty,active,historyHeading,history);host.append(section);
 const rows=new Map<number,RequestRow284>(),drafts=new Map<number,number>();
 let current:TradeRequestPresentation284|undefined,busy:{id:number;kind:'answer'|'dismiss'}|undefined,generation=0,identity:string|undefined,lastTick=-1;
 const find=(id:number)=>current?.tradeRequests284?.entries.find(r=>r.id===id);
 const availability=(request:TradeRequest284,world:TradeRequestPresentation284):string|undefined=>{
  if(request.status!=='offered'||world.tick*10>=request.offerExpiresAtCore)return 'Cette offre n’est plus disponible.';
  const registry=world.worldFactions,settlement=registry?.settlements.find(s=>s.id===request.settlementId);
  if(!registry||!settlement||request.destinationLost||settlement.factionId!==request.factionId||settlement.tile!==request.tile)return 'L’établissement destinataire n’est plus disponible.';
  const access=worldSettlementAccess256(registry,request.settlementId);
  return !access.ok||!access.canTrade?'L’établissement destinataire n’est plus visitable.':undefined;
 };
 const dispatch=async(id:number,command:Command,kind:'answer'|'dismiss'):Promise<void>=>{
  if(busy||!current)return;const row=rows.get(id),request=find(id);if(!row||!request)return;
  if(kind==='answer'){
   const refusal=availability(request,current);
   if(refusal){text(row.error,refusal);render();return;}
   if(command.type!=='trade-request-answer'||!request.options.some(o=>o.id===command.optionId)){text(row.error,'Choisissez une récompense avant d’accepter.');return;}
  }else if(request.status!=='offered'||current.tick*10>=request.offerExpiresAtCore){text(row.error,'Cette offre n’est plus disponible.');render();return;}
  const token=generation;busy={id,kind};text(row.error,'');render();
  try{
   const result=await send(command);
   if(result&&typeof result==='object'&&'ok'in result&&result.ok===false)throw Error('reason'in result&&typeof result.reason==='string'?result.reason:'La commande a été refusée.');
  }catch(error){if(token===generation&&rows.get(id)===row)text(row.error,error instanceof Error?error.message:String(error));}
  finally{if(token===generation){busy=undefined;render();}}
 };
 const createRow=(id:number):RequestRow284=>{
  const element=document.createElement('article');element.dataset.tradeRequest=String(id);element.tabIndex=-1;
  const title=document.createElement('h4'),source=document.createElement('p'),status=document.createElement('p'),timing=document.createElement('p'),body=document.createElement('div');
  status.dataset.tradeRequestStatus='';timing.dataset.tradeRequestTiming='';
  const options=document.createElement('fieldset'),legend=document.createElement('legend');options.append(legend);options.dataset.tradeRewardOptions='';
  const hint=document.createElement('p'),answer=document.createElement('button'),dismiss=document.createElement('button'),progress=document.createElement('p'),error=document.createElement('p');
  answer.type=dismiss.type='button';answer.textContent='Accepter la demande';answer.dataset.tradeRequestAnswer='';dismiss.dataset.tradeRequestDismiss='';
  progress.setAttribute('role','status');error.setAttribute('role','alert');error.dataset.tradeRequestError='';
  body.append(options,hint,answer);element.append(title,source,status,timing,body,dismiss,progress,error);
  const letter=document.createElement('button');letter.type='button';letter.className='arrival-letter';letter.dataset.tradeRequestLetter=String(id);
  const row:RequestRow284={element,title,source,status,timing,body,options,legend,rewards:new Map(),hint,answer,dismiss,letter,progress,error};
  letter.onclick=()=>{
   const request=find(id);if(!current||rows.get(id)!==row||request?.status!=='offered'||request.dismissed||current.tick*10>=request.offerExpiresAtCore)return;
   if(document.getElementById('quests-panel')?.hidden)document.querySelector<HTMLButtonElement>('[data-panel="quests"]')?.click();
   requestAnimationFrame(()=>{const latest=find(id);if(rows.get(id)===row&&latest?.status==='offered'&&!latest.dismissed&&current&&current.tick*10<latest.offerExpiresAtCore)element.focus();});
  };
  answer.onclick=()=>{const optionId=drafts.get(id);if(optionId!==undefined)void dispatch(id,{type:'trade-request-answer',requestId:id,optionId},'answer');};
  dismiss.onclick=()=>{const request=find(id);if(request)void dispatch(id,{type:'trade-request-dismiss',requestId:id,dismissed:!request.dismissed},'dismiss');};
  return row;
 };
 const renderRow=(request:TradeRequest284,row:RequestRow284,world:TradeRequestPresentation284):void=>{
  const core=world.tick*10,offered=request.status==='offered',accepted=request.status==='accepted',masked=offered&&request.dismissed;
  const content=tradeRequestContent284(request.family),faction=world.worldFactions?.factions.find(f=>f.id===request.factionId),destination=world.worldFactions?.settlements.find(s=>s.id===request.settlementId);
  const retained=world.worldPawns?.owners.find(p=>p.kind==='human'&&p.actor.id===request.giverId);
  const person=world.campaignPeople?.find(p=>p.id===request.giverId)??world.people?.find(p=>p.id===request.giverId)??world.pawns?.find(p=>p.id===request.giverId)
   ??world.worldFactions?.leaders.find(p=>p.pawn.id===request.giverId)?.pawn
   ??(retained?.kind==='human'?retained.actor:undefined);
  const name=destination?.name??request.settlementName;
  text(row.title,`${request.quantity} ${content?.label??'biens demandés'} pour ${name}`);
  text(row.letter,`Demande commerciale : ${request.quantity} ${content?.label??'biens demandés'} pour ${name}`);
  if(offered&&!masked&&core<request.offerExpiresAtCore){const alerts=document.getElementById('alerts');if(alerts&&row.letter.parentElement!==alerts)alerts.prepend(row.letter);}else row.letter.remove();
  text(row.source,`${faction?.name??'Faction indisponible'}${person?` · Demande de ${person.name}`:''} · Destination : ${name}`);
  if(row.lastStatus!==undefined&&row.lastStatus!==request.status)text(row.error,'');row.lastStatus=request.status;
  const refusal=availability(request,world);
  text(row.status,offered?masked?'Offre masquée. Son délai continue de courir.':refusal??'Offre à accepter.':accepted?'Demande acceptée.':request.status==='succeeded'?'Livraison effectuée.':request.status==='failed'?'Demande échouée : la faction est devenue hostile.':request.closed?.reason==='mission-expired'?'Demande expirée : la livraison n’a pas été effectuée à temps.':'Offre expirée sans acceptation.');
  text(row.timing,offered?`Accepter sous ${remaining(request.offerExpiresAtCore-core)}. Après acceptation : ${remaining(request.durationCore)} pour livrer.`:accepted?`Livrer sous ${remaining((request.expiresAtCore??core)-core)}. Le délai a commencé à l’acceptation.`:request.status==='succeeded'?'La récompense choisie a été remise à la caravane qui a livré les biens.':'Aucune récompense n’a été remise.');
  row.body.hidden=masked;
  text(row.legend,offered?'Choisissez une récompense':request.selectedOptionId!==undefined?'Récompense choisie':'Récompenses proposées');
  const optionIds=new Set(request.options.map(o=>o.id));
  if(drafts.has(request.id)&&!optionIds.has(drafts.get(request.id)!))drafts.delete(request.id);
  for(const [id,reward]of row.rewards)if(!optionIds.has(id)){reward.label.remove();row.rewards.delete(id);}
  const selected=request.selectedOptionId??drafts.get(request.id);
  for(const option of request.options){
   let reward=row.rewards.get(option.id);
   if(!reward){
    const label=document.createElement('label'),radio=document.createElement('input'),description=document.createElement('span');
    radio.type='radio';radio.name=`trade-request-${request.id}-reward`;radio.value=String(option.id);radio.dataset.tradeReward=String(option.id);label.append(radio,description);
    radio.onchange=()=>{if(radio.checked){drafts.set(request.id,option.id);render();}};
    row.options.append(label);reward={label,radio,description};row.rewards.set(option.id,reward);
   }
   text(reward.description,rewardText(option));reward.radio.checked=option.id===selected;reward.radio.disabled=!!busy||!offered||!!refusal;
   reward.label.hidden=!offered&&request.selectedOptionId!==undefined&&request.selectedOptionId!==option.id;
  }
  text(row.hint,offered?'Livrez les biens dans les inventaires de la caravane : frais, de qualité normale ou meilleure si applicable, et vêtements non souillés. La récompense suit la livraison complète. Masquer l’offre ne la refuse pas et n’arrête pas son délai.':accepted?(request.destinationLost?'La destination a disparu ; la livraison est indisponible.':`Apportez les biens à ${name}, puis remplissez la demande depuis votre caravane.`):'');
  row.answer.hidden=!offered;row.answer.disabled=!!busy||!!refusal||selected===undefined;
  row.dismiss.hidden=!offered;row.dismiss.disabled=!!busy||core>=request.offerExpiresAtCore;text(row.dismiss,masked?'Restaurer l’offre':'Masquer l’offre');
  text(row.progress,busy?.id===request.id?busy.kind==='answer'?'Acceptation en cours…':'Mise à jour en cours…':'');
 };
 function render():void {
  if(!current)return;section.hidden=!isSchema284OrLater(current.schemaVersion);
  const entries=section.hidden?[]:current.tradeRequests284?.entries??[],ids=new Set(entries.map(r=>r.id));
  for(const [id,row]of rows)if(!ids.has(id)){row.letter.remove();row.element.remove();rows.delete(id);drafts.delete(id);}
  const live=entries.filter(r=>r.status==='offered'||r.status==='accepted').length;
  empty.hidden=live>0;text(empty,entries.length?'Aucune demande commerciale en cours.':'Aucune demande commerciale proposée.');historyHeading.hidden=history.hidden=live===entries.length;
  for(const request of entries){let row=rows.get(request.id);if(!row){row=createRow(request.id);rows.set(request.id,row);}
   const parent=request.status==='offered'||request.status==='accepted'?active:history;
   if(row.element.parentElement!==parent)parent.append(row.element);renderRow(request,row,current);
  }
 }
 return {update(world){
  const key=String(world.planet?.generationSeed??world.campaignSeed??world.seed);
  if(identity!==undefined&&(identity!==key||world.tick<lastTick)){generation++;busy=undefined;drafts.clear();for(const row of rows.values()){row.letter.remove();row.element.remove();}rows.clear();}
  identity=key;lastTick=world.tick;current=world;render();
 }};
}
