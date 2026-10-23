import {countedProducts} from '../sim/cooking-bills';
import {defaultBillResumeAt289,supportsBillReservePause289,validBillReservePausePolicy289} from '../sim/bill-pause-rules-289';
import type {BillReservePausePolicy289} from '../sim/bill-pause-state-289';
import type {CookingBill} from '../sim/cooking-types';
import type {Command,World} from '../sim/types';

const same=(a:BillReservePausePolicy289,b:BillReservePausePolicy289)=>a.enabled===b.enabled&&a.resumeAt===b.resumeAt;

/** This draft only reads confirmed stock and memory. Its independent commands
 * never send paused, rewrite a bill, or dirty the general production form. */
export function billPauseControls289(structureId:number,bill:CookingBill,send:(command:Command)=>unknown){
  const element=document.createElement('fieldset'),heading=document.createElement('legend');
  element.dataset.billPause=String(bill.id);element.hidden=true;heading.textContent='Pause et reprise de la réserve';element.append(heading);
  const enabled=document.createElement('input'),enableLabel=document.createElement('label');
  enabled.type='checkbox';enabled.dataset.billPauseEnabled=String(bill.id);enableLabel.append(enabled,'Mettre en pause une fois la cible atteinte');
  const threshold=document.createElement('input'),thresholdLabel=document.createElement('label');
  threshold.type='number';threshold.step='1';threshold.dataset.billPauseResumeAt=String(bill.id);thresholdLabel.append('Reprendre à cette quantité ou moins',threshold);
  const confirmedText=document.createElement('p');confirmedText.dataset.billPauseConfirmed=String(bill.id);
  const help=document.createElement('p');help.className='muted';help.textContent='La pause attend la baisse de la même réserve comptée ci-dessus. Les travaux et livraisons déjà engagés continuent ; la suspension manuelle reste indépendante.';
  const zero=document.createElement('p');zero.className='muted';zero.textContent='Avec une cible de 0, le seuil est −1 : aucune quantité de réserve ne permet une reprise automatique.';
  const status=document.createElement('p');status.dataset.billPauseStatus=String(bill.id);status.setAttribute('role','status');
  const actions=document.createElement('div');actions.className='bill-actions';
  const apply=document.createElement('button'),cancel=document.createElement('button'),resume=document.createElement('button');
  for(const button of [apply,cancel,resume])button.type='button';
  apply.textContent='Appliquer la pause';apply.dataset.applyBillPause=String(bill.id);
  cancel.textContent='Annuler';cancel.dataset.cancelBillPause=String(bill.id);
  resume.textContent='Reprendre maintenant';resume.dataset.resumeBillPause=String(bill.id);resume.title='Retire seulement la pause automatique ; conserve la suspension manuelle, la cible et le seuil.';
  actions.append(apply,cancel,resume);element.append(enableLabel,thresholdLabel,confirmedText,help,zero,status,actions);
  let current=bill,confirmed:BillReservePausePolicy289=policy(bill),available=false,count=0,dirty=false,pending=false,feedback='',generation=0;
  let sent:BillReservePausePolicy289|undefined,resuming=false;
  function policy(next:CookingBill):BillReservePausePolicy289{return next.reservePause?{enabled:next.reservePause.enabled,resumeAt:next.reservePause.resumeAt}:{enabled:false,resumeAt:defaultBillResumeAt289(next.target)};}
  const value=():BillReservePausePolicy289=>({enabled:enabled.checked,resumeAt:threshold.value.trim()===''?NaN:Number(threshold.value)});
  const valid=(draft:BillReservePausePolicy289)=>validBillReservePausePolicy289(draft)&&(!draft.enabled||(current.target===0?draft.resumeAt===-1:draft.resumeAt>=0&&draft.resumeAt<current.target));
  function restore(){enabled.checked=confirmed.enabled;threshold.value=String(confirmed.resumeAt);dirty=false;}
  function render(){
    element.hidden=!available;
    const draft=value(),invalid=!valid(draft),locked=!available||pending||!!sent||resuming;
    enabled.disabled=locked;threshold.disabled=locked||!draft.enabled||current.target===0;
    threshold.min=current.target===0?'-1':'0';threshold.max=String(draft.enabled?current.target-1:9999);thresholdLabel.hidden=!draft.enabled;zero.hidden=current.target!==0;
    apply.disabled=locked||!dirty||invalid;cancel.disabled=locked||!dirty;
    resume.hidden=!available||!current.reservePause?.enabled||!current.reservePause.paused||count>=current.target;resume.disabled=locked;
    confirmedText.textContent=`Réserve confirmée : ${count} / ${current.target}. ${current.reservePause?.paused?'Pause automatique acquise':confirmed.enabled?'Pause automatique en attente de la cible':'Pause automatique désactivée'}${confirmed.enabled?` ; reprise à ${confirmed.resumeAt} ou moins`:''}.${current.suspended?' Suspension manuelle active.':''}`;
    status.textContent=invalid?current.target===0?'La cible 0 utilise uniquement le seuil −1.':`Choisissez un seuil entier de 0 à ${current.target-1}, inférieur à la cible confirmée.`:sent||resuming?'Commande envoyée ; attente de la confirmation.':feedback||(dirty?'Brouillon non appliqué.':'Réglages confirmés.');
    element.setAttribute('aria-busy',String(pending||!!sent||resuming));
  }
  function changed(){
    if(!available||pending||sent||resuming)return;
    if(enabled.checked&&current.target===0)threshold.value='-1';
    dirty=!same(value(),confirmed);feedback='';render();
  }
  enabled.addEventListener('change',changed);threshold.addEventListener('input',changed);threshold.addEventListener('change',changed);
  element.addEventListener('input',event=>event?.stopPropagation());element.addEventListener('change',event=>event?.stopPropagation());
  element.addEventListener('keydown',event=>{if(event.key!=='Escape')event.stopPropagation();});
  cancel.onclick=()=>{if(pending||sent||resuming)return;restore();feedback='Brouillon annulé ; réglages confirmés conservés.';render();};
  function dispatch(command:Command){
    const token=generation,connected=element.isConnected;pending=true;feedback='';render();
    const active=()=>token===generation&&(!connected||element.isConnected);
    const refused=(error:unknown)=>{if(!active())return;sent=undefined;resuming=false;feedback=error instanceof Error?error.message:String(error);};
    try{
      void Promise.resolve(send(command)).catch(refused).finally(()=>{if(active()){pending=false;render();}});
    }catch(error){refused(error);if(active()){pending=false;render();}}
  }
  apply.onclick=()=>{
    const draft=value();if(!available||pending||sent||resuming||!dirty||!valid(draft)||apply.disabled)return;
    sent={...draft};dispatch({type:'bill-pause-policy',structureId,billId:bill.id,policy:{...draft}});
  };
  resume.onclick=()=>{
    if(!available||pending||sent||resuming||!current.reservePause?.enabled||!current.reservePause.paused||count>=current.target)return;
    resuming=true;dispatch({type:'bill-pause-resume',structureId,billId:bill.id});
  };
  restore();render();
  return {element,refresh(world:World,next:CookingBill,confirmedCount?:number){
    if(next.id!==bill.id||next.recipe!==bill.recipe)return;
    const nextAvailable=world.schemaVersion===289&&next.mode==='until'&&supportsBillReservePause289(next.recipe);
    if(available&&!nextAvailable){generation++;pending=false;sent=undefined;resuming=false;feedback='';}
    current=next;available=nextAvailable;confirmed=policy(next);count=available?(confirmedCount??countedProducts(world,next)):0;
    if(sent&&same(sent,confirmed)){sent=undefined;restore();feedback='Pause confirmée ; les engagements sont conservés.';}
    else if(!dirty&&!sent)restore();
    if(resuming&&!next.reservePause?.paused){resuming=false;feedback='Reprise confirmée ; la suspension manuelle reste inchangée.';}
    render();
  }};
}
