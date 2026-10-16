import type {UrgentThreatReceipt,UrgentThreatArrival} from '../bridge/urgent-threats';
import './urgent-threat-feedback.css';
export type UrgentThreatTarget=Pick<UrgentThreatArrival,'site'|'actorId'>;
export function urgentThreatLabel(row:UrgentThreatArrival):string {
 const site=row.site==='home'?'Foyer':'Second site',kind=row.kind==='raid'?'Raid humain':row.kind==='mechanoid'?'Raid mécanique':'Animal en rage';
 return `${site} · ${kind} · ${row.lastCount} ${row.kind==='manhunter'?'animal(aux)':'assaillant(s)'} · ${row.delta} nouvelle(s) arrivée(s)`;
}
/** Receipt presentation only; no World access, clock command, sound or detection.
 * At most the six acknowledged producer slots are shown. */
export function createUrgentThreatFeedback(host:HTMLElement,options:{view:(target:UrgentThreatTarget)=>Promise<string|undefined>}){
 const doc=host.ownerDocument,root=doc.createElement('section'),heading=doc.createElement('strong'),status=doc.createElement('p'),rows=doc.createElement('div'),error=doc.createElement('p'),close=doc.createElement('button');
 root.className='urgent-threat-feedback';root.id='urgent-threat-feedback';root.hidden=true;root.setAttribute('aria-label','Nouvelles menaces');
 const message=doc.createElement('div');message.setAttribute('role','alert');message.setAttribute('aria-live','assertive');message.append(heading,status,rows);
 heading.textContent='Nouvelle menace';error.setAttribute('role','status');error.hidden=true;close.type='button';close.textContent='Fermer';close.setAttribute('aria-label','Fermer les avertissements de menace');root.append(message,error,close);host.prepend(root);
 let generation=0,disposed=false,lastReceipt='',busy=false;const controls:HTMLButtonElement[]=[];
 const reset=()=>{generation++;lastReceipt='';root.hidden=true;busy=false;rows.replaceChildren();controls.length=0;error.hidden=true;};
 close.onclick=()=>reset();
 for(const type of ['pointerdown','pointerup','click','dblclick','keydown','keyup'] as const)root.addEventListener(type,event=>event.stopPropagation());
 return {
  show(receipt:UrgentThreatReceipt){
   if(disposed||!receipt.rows.length||lastReceipt===`${receipt.generation}:${receipt.serial}`)return;
   generation++;lastReceipt=`${receipt.generation}:${receipt.serial}`;root.hidden=false;busy=false;error.hidden=true;rows.replaceChildren();controls.length=0;
   heading.textContent=receipt.rows.length>1?'Nouvelles menaces':'Nouvelle menace';status.textContent=receipt.paused?'Jeu mis en pause. Reprenez avec les commandes de temps.':'La simulation suit la vitesse choisie.';
   for(const row of receipt.rows){
    const line=doc.createElement('div'),text=doc.createElement('p'),button=doc.createElement('button');text.textContent=urgentThreatLabel(row);button.type='button';button.textContent='Voir la carte';button.dataset.urgentSite=row.site;
    button.onclick=async()=>{
     if(disposed||busy)return;const current=generation;busy=true;for(const control of controls)control.disabled=true;
     try{const reason=await options.view({site:row.site,...row.actorId!==undefined?{actorId:row.actorId}:{}});if(current!==generation||disposed)return;error.textContent=reason??'';error.hidden=!reason;}
     catch(cause){if(current===generation&&!disposed){error.textContent=cause instanceof Error?cause.message:String(cause);error.hidden=false;}}
     finally{if(current===generation&&!disposed){busy=false;for(const control of controls)control.disabled=false;}}
    };
    controls.push(button);line.append(text,button);rows.append(line);
   }
  },
  reset:()=>{if(!disposed)reset();},dispose:()=>{disposed=true;reset();root.remove();},
 };
}