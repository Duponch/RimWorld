import type {CampEntryProgressMessage256} from '../bridge/protocol';
const labels:Readonly<Record<string,string>>={preparing:'Préparation de la carte locale',shrines750:'Temples anciens',hives1120:'Ruches des grottes', 'physical10-220':'Relief, sols et grottes',roads390:'Routes',ruins750:'Vestiges',start850:'Accès au site',plants900:'Végétation',geysers950:'Geysers',chunks970:'Roches et gravats',snow1150:'Neige',animals1200:'Faune',fog1500:'Exploration',flowPostFog1600:'Courants'};
export const campPreparationLabel256=(phase:string):string=>Object.hasOwn(labels,phase)?labels[phase]!:'Préparation du terrain';
/** This view never interprets timeout/closing as a cancellation or a resume. */
export function createCampPreparationView256(host:HTMLElement,cancel:(id:number,groupId:number)=>Promise<unknown>){
 const doc=host.ownerDocument,root=doc.createElement('section'),heading=doc.createElement('strong'),status=doc.createElement('p'),bar=doc.createElement('progress'),button=doc.createElement('button');
 root.className='camp-entry-preparation';root.hidden=true;root.setAttribute('aria-live','polite');heading.textContent='Préparation de la carte locale';bar.max=1;bar.setAttribute('aria-label','Préparation de la carte locale');button.type='button';button.textContent='Annuler la préparation';root.append(heading,status,bar,button);host.append(root);
 let current:CampEntryProgressMessage256|undefined,cancelling=false,disposed=false;
 button.onclick=()=>{const captured=current;if(disposed||cancelling||!captured)return;cancelling=true;button.disabled=true;status.textContent='Annulation demandée, en attente de confirmation…';void cancel(captured.id,captured.groupId).catch(error=>{if(!disposed&&current?.id===captured.id){status.textContent=error instanceof Error?error.message:String(error);button.disabled=false;cancelling=false;}});};
 return {
  update(next:CampEntryProgressMessage256|undefined){if(disposed)return;const changed=current?.id!==next?.id;current=next;if(changed)cancelling=false;root.hidden=!next;button.disabled=cancelling;if(!next){status.textContent='';bar.removeAttribute('value');return;}if(!cancelling)status.textContent=campPreparationLabel256(next.progress.phase);const p=next.progress;if(p.completed!==undefined&&p.total!==undefined&&p.total>0)bar.value=p.completed/p.total;else bar.removeAttribute('value');},
  dispose(){disposed=true;current=undefined;root.remove();}
 };
}
