import { isColonist } from '../sim/affiliation';
import { scoutEligible } from '../sim/caravan-trip';
import { commercialPreparationReason,previewCommercialLoading } from '../sim/commercial-loading';
import { commercialMass } from '../sim/commercial-mass';
import { quoteCommercial,type CommercialQuote } from '../sim/commercial-post';
import type { CommercialBuyLine,CommercialCommand } from '../sim/commercial-state';
import { ITEM_DEFINITIONS } from '../sim/items';
import { biologicalYears } from '../sim/human-age';
import { negotiatorRefusal } from '../sim/trade-contact';
import { tradeImprovement } from '../sim/trade-goods';
import { TICKS_PER_DAY,type Command,type Pawn,type World } from '../sim/types';

const owned=(w:World,p:Pawn)=>w.piles.filter(i=>'pawnId' in i.owner&&i.owner.pawnId===p.id);
const kg=(grams:number)=>`${(grams/1000).toLocaleString('fr-FR',{maximumFractionDigits:3})} kg`;
const needs=(p:Pawn|undefined)=>p?`${p.name} · faim ${Math.round(p.hunger)} % · repos ${Math.round(p.rest)} %.`:'';
const possessions=(items:World['piles'])=>items.filter(i=>i.owner.type==='inventory')
  .map(i=>`${i.quantity} ${ITEM_DEFINITIONS[i.item].label}`).join(', ');

/** Projection only: closing, displaying or refreshing this view sends no order. */
export function commercialPhaseView(w:World) {
  const t=w.commercialTrip,p=t&&('pawn' in t?t.pawn:w.pawns.find(p=>p.id===t.pawnId));
  if(!t)return {status:w.scout?'Terminez la reconnaissance avant une expédition commerciale.':'Préparez un colon libre, deux ou trois rations et de l’argent au sol.',needs:'',possessions:'',mass:null,canCancel:false,atPost:false};
  const name=p?.name??'Le colon',items='items' in t?t.items:p?owned(w,p):[];
  let status:string;
  switch(t.phase){
    case 'loading':status=`${name} rejoint les sources pour charger rations et argent au contact (${t.cursor}/${t.manifest.length} prises).`;break;
    case 'leaving':status=`${name} marche vers une bordure avec ses provisions et son argent.`;break;
    case 'outbound':status=`${name} est hors carte · comptoir civil dans ${Math.max(0,Math.ceil((t.arrivesAt-w.tick)*24/TICKS_PER_DAY))} h de jeu.`;break;
    case 'at-post':status=`${name} est au comptoir civil. Achetez ou repartez sans achat. Si le temps reprend, départ automatique dans ${Math.max(0,Math.ceil((t.decisionUntil-w.tick)*24*60/TICKS_PER_DAY))} min de jeu.`;break;
    case 'returning':status=`${name} revient avec ses possessions · rentrée prévue dans ${Math.max(0,Math.ceil((t.returnAt-w.tick)*24/TICKS_PER_DAY))} h de jeu.`;break;
    case 'awaiting-entry':status=`${name} attend une entrée accessible au bord de la colonie. Ses besoins sont suspendus pendant cette attente.`;break;
    case 'unloading':status=`${name} dépose physiquement son inventaire · ${t.pendingPileIds.length} piles restantes. Une place saturée peut retarder le dépôt.`;break;
  }
  return {status,needs:needs(p),possessions:`Inventaire : ${possessions(items)||'vide'}.${'consumed' in t?` Rations consommées : ${t.consumed}. Achats : ${t.bought.medicine} médicaments, ${t.bought.component} composants.`:''}`,
    mass:p?commercialMass(w,p,items):null,canCancel:t.phase==='loading'||t.phase==='leaving'||t.phase==='unloading',atPost:t.phase==='at-post'};
}

/** The same revalidation used by the confirm button; a stale quote never sends
 * an exchange. This does not replace the worker's authoritative validation. */
export function commercialPurchaseCommand(w:World,lines:CommercialBuyLine[],shownQuote:string):
  {ok:true;command:Extract<CommercialCommand,{type:'commercial-buy'}>}|{ok:false;reason:string} {
  if(!lines.length)return {ok:false,reason:'Choisissez au moins un achat.'};
  const q=quoteCommercial(w,lines);if(!q.ok)return q;
  if(q.signature!==shownQuote)return {ok:false,reason:'Le devis a changé : vérifiez le nouveau panier avant de confirmer.'};
  return {ok:true,command:{type:'commercial-buy',lines:lines.map(l=>({...l})),quote:q.signature}};
}

function options(select:HTMLSelectElement,entries:{id:number;label:string}[]):void {
  const signature=JSON.stringify(entries);if(select.dataset.signature===signature)return;
  const previous=select.value;select.replaceChildren(...entries.map(e=>new Option(e.label,String(e.id))));
  if(entries.some(e=>String(e.id)===previous))select.value=previous;select.dataset.signature=signature;
}

export function createCommercialUI(root:HTMLElement,send:(command:Command)=>Promise<unknown>):{update:(world:World)=>void} {
  root.classList.add('commercial-content');
  const heading=document.createElement('h2');heading.textContent='Monde · commerce';
  const intro=document.createElement('p');intro.textContent='Un colon rejoint un comptoir civil : trois heures à l’aller, trois heures au retour. Médicaments et composants uniquement ; aucune planète ni vente générale.';
  const form=document.createElement('div');form.className='commercial-form';
  function select(label:string,id:string){const l=document.createElement('label');l.textContent=label;const s=document.createElement('select');s.id=id;s.setAttribute('aria-label',label);l.append(s);form.append(l);return s;}
  const pawnSelect=select('Colon','commercial-pawn'),foodSelect=select('Rations au sol','commercial-food'),quantitySelect=select('Repas de survie','commercial-quantity');
  quantitySelect.append(new Option('2','2'),new Option('3','3'));
  const silverLabel=document.createElement('label');silverLabel.textContent='Argent à embarquer';
  const silver=document.createElement('input');silver.id='commercial-silver';silver.type='number';silver.min='1';silver.step='1';silver.value='100';silver.setAttribute('aria-label','Argent à embarquer');silverLabel.append(silver);form.append(silverLabel);
  const start=document.createElement('button');start.id='commercial-start';start.type='button';start.textContent='Préparer l’expédition';form.append(start);
  const preparation=document.createElement('p');preparation.id='commercial-preparation';
  const status=document.createElement('p');status.id='commercial-status';status.setAttribute('role','status');
  const needText=document.createElement('p');needText.id='commercial-needs';
  const inventory=document.createElement('p');inventory.id='commercial-inventory';
  const weight=document.createElement('p');weight.id='commercial-weight';
  const actions=document.createElement('div');actions.className='commercial-actions';
  const cancel=document.createElement('button');cancel.id='commercial-cancel';cancel.type='button';
  const back=document.createElement('button');back.id='commercial-return';back.type='button';actions.append(cancel,back);
  const shop=document.createElement('section');shop.id='commercial-shop';
  const shopHeading=document.createElement('h3');shopHeading.textContent='Achats au comptoir';
  const table=document.createElement('table');table.id='commercial-goods';
  const total=document.createElement('p');total.id='commercial-total';
  const confirm=document.createElement('button');confirm.id='commercial-buy';confirm.type='button';confirm.textContent='Confirmer les achats';
  const deadline=document.createElement('p');deadline.className='muted';deadline.textContent='La visite dure au maximum une heure si le temps avance. Fermer Monde ou sauvegarder garde la visite en cours. Les achats restent dans l’inventaire jusqu’au retour et au dépôt.';
  shop.append(shopHeading,table,total,confirm,deadline);
  const unload=document.createElement('div');unload.id='commercial-unload-list';
  const note=document.createElement('p');note.className='muted';note.textContent='Charge maximale : 35 kg, vêtements et équipement compris. Le chargement, la sortie, la rentrée et les dépôts exigent des déplacements réels ; le trajet hors carte est abstrait.';
  const feedback=document.createElement('p');feedback.id='commercial-feedback';feedback.setAttribute('role','alert');
  root.replaceChildren(heading,intro,form,preparation,status,needText,inventory,weight,actions,shop,unload,note,feedback);
  let current:World|undefined,busy=false,visit='',stockKey='',quoteBasis='',shownQuote='';
  const quoteCache=new Map<string,CommercialQuote>();
  const quantities=new Map<number,number>();
  const lines=():CommercialBuyLine[]=>[...quantities].filter(([,n])=>n!==0).map(([pileId,quantity])=>({pileId,quantity}));
  // The quote depends on stock, exact possessions and negotiator state. Tick
  // movement alone does not rebuild it, except when the visit deadline expires.
  function getQuote(basket:CommercialBuyLine[]):CommercialQuote {
    const key=JSON.stringify(basket),cached=quoteCache.get(key);if(cached)return cached;
    const q=quoteCommercial(current!,basket);if(quoteCache.size>=2)quoteCache.clear();quoteCache.set(key,q);return q;
  }
  function balance():void {
    confirm.disabled=true;shownQuote='';if(!current||current.commercialTrip?.phase!=='at-post')return;
    const basket=lines(),q=getQuote(basket);
    if(!q.ok){total.textContent=q.reason;return;}
    shownQuote=q.signature;
    total.textContent=`À payer : ${q.totalSilver} argent · reste porté : ${q.remainingSilver} · charge après achat : ${kg(q.mass.grams)} / ${kg(q.mass.capacityGrams)}.`;
    confirm.disabled=busy||!basket.length;
  }
  async function run(command:Command,after?:()=>void):Promise<void> {
    if(busy)return;busy=true;feedback.textContent='';render();
    try{const result=await send(command);if(result&&typeof result==='object'&&'ok' in result&&result.ok===false)throw new Error('reason' in result?String(result.reason):'Commande refusée.');after?.();}
    catch(e){feedback.textContent=e instanceof Error?e.message:String(e);}finally{busy=false;render();}
  }
  start.onclick=()=>{if(!current||start.disabled)return;const quantity=Number(quantitySelect.value);if(quantity!==2&&quantity!==3)return;void run({type:'commercial-start',pawnId:Number(pawnSelect.value),foodPileId:Number(foodSelect.value),quantity,silver:Number(silver.value)});};
  cancel.onclick=()=>void run({type:'commercial-cancel'});
  back.onclick=()=>void run({type:'commercial-return'});
  confirm.onclick=()=>{if(!current||busy)return;const result=commercialPurchaseCommand(current,lines(),shownQuote);if(!result.ok){feedback.textContent=result.reason;quoteCache.clear();render();return;}void run(result.command,()=>{quantities.clear();quoteCache.clear();stockKey='';});};
  for(const s of [pawnSelect,foodSelect,quantitySelect])s.onchange=()=>render();silver.oninput=()=>render();
  function render():void {
    if(!current)return;const w=current,t=w.commercialTrip,view=commercialPhaseView(w);
    root.setAttribute('aria-busy',String(busy));
    form.hidden=preparation.hidden=!!t;shop.hidden=!view.atPost;cancel.hidden=!view.canCancel;back.hidden=!view.atPost;
    cancel.textContent=t?.phase==='unloading'?'Arrêter le déchargement':'Annuler la préparation';cancel.disabled=back.disabled=busy;
    back.textContent=t?.phase==='at-post'&&(t.bought.medicine||t.bought.component)?'Repartir avec les achats':'Repartir sans achat';
    status.textContent=view.status;needText.textContent=view.needs;inventory.textContent=view.possessions;
    weight.textContent=view.mass?`Charge portée : ${kg(view.mass.grams)} / ${kg(view.mass.capacityGrams)} (vêtements et équipement inclus).`:t?'Masse des possessions indisponible.':'';
    if(!t){
      const candidates=w.scout?[]:w.pawns.filter(p=>scoutEligible(w,p)===null&&commercialPreparationReason(w,p)===null);
      options(pawnSelect,candidates.map(p=>({id:p.id,label:p.name})));
      // Survival meals are non-perishable; the loading domain rejects poison.
      const foods=w.piles.filter(p=>p.item==='survival-meal'&&p.owner.type==='ground'&&p.quantity>=2&&!p.foodPoison);
      options(foodSelect,foods.map(p=>({id:p.id,label:`Pile ${p.id} · ${p.quantity} repas`})));
      const food=foods.find(p=>p.id===Number(foodSelect.value)),p=candidates.find(p=>p.id===Number(pawnSelect.value));
      const three=quantitySelect.options[1]!;three.disabled=!food||food.quantity<3;if(three.disabled&&quantitySelect.value==='3')quantitySelect.value='2';
      const money=w.piles.reduce((n,i)=>n+(i.item==='silver'&&i.owner.type==='ground'?i.quantity:0),0);silver.max=String(money);
      const amount=Number(silver.value),mass=p?previewCommercialLoading(w,p,Number(quantitySelect.value),amount):null;
      start.disabled=busy||!p||!food||!Number.isSafeInteger(amount)||amount<1||amount>money||!mass||mass.grams>mass.capacityGrams;
      pawnSelect.disabled=foodSelect.disabled=quantitySelect.disabled=silver.disabled=busy;
      preparation.textContent=`Argent au sol : ${money}.${mass?` Charge prévue : ${kg(mass.grams)} / ${kg(mass.capacityGrams)}, équipement inclus.`:' Choisissez une somme entière et des possessions dont le poids est connu.'} Les sources doivent aussi être accessibles et libres de réservation.`;
      if(!candidates.length&&!w.scout)status.textContent='Aucun colon adulte sain, libre et capable de négocier n’est disponible. Un autre colon doit rester au foyer.';
      needText.textContent=needs(p);
    }
    const nextVisit=t?.phase==='at-post'?`${t.pawn.id}:${t.startedAt}:${t.arrivedAt}`:'';
    if(nextVisit!==visit){visit=nextVisit;quantities.clear();stockKey='';quoteCache.clear();}
    if(view.atPost){
      const trip=t as Extract<NonNullable<World['commercialTrip']>,{phase:'at-post'}>,p=trip.pawn;
      const basis=JSON.stringify([trip.pawn.id,trip.phase,w.tick>trip.decisionUntil,
        isColonist(p),p.prisoner,p.visitor,p.raid,p.podRescue,p.age&&biologicalYears(p.age)<18,
        negotiatorRefusal(p),tradeImprovement(p),trip.items,w.civilianPost,w.nextId]);
      if(quoteBasis!==basis){quoteBasis=basis;quoteCache.clear();}
      // Empty preview supplies the current stock even if the edited basket is invalid.
      const preview=getQuote([]);
      if(preview.ok){
        const next=JSON.stringify(preview.goods);
        if(stockKey!==next){
          stockKey=next;table.replaceChildren();const head=document.createElement('tr');
          for(const title of ['Objet','Stock','Prix unitaire','À acheter']){const th=document.createElement('th');th.textContent=title;head.append(th);}table.append(head);
          for(const g of preview.goods){
            const row=document.createElement('tr');for(const text of [ITEM_DEFINITIONS[g.item].label,String(g.available),g.unitPrice.toFixed(2)]){const cell=document.createElement('td');cell.textContent=text;row.append(cell);}
            const cell=document.createElement('td'),input=document.createElement('input');input.type='number';input.min='0';input.max=String(g.available);input.step='1';input.value=String(quantities.get(g.pileId)??0);
            input.dataset.commercialPile=String(g.pileId);input.dataset.item=g.item;input.setAttribute('aria-label',`Acheter ${ITEM_DEFINITIONS[g.item].label}, pile ${g.pileId}`);
            input.oninput=()=>{quantities.set(g.pileId,input.value===''?Number.NaN:Number(input.value));balance();};cell.append(input);row.append(cell);table.append(row);
          }
        }
        for(const input of table.querySelectorAll<HTMLInputElement>('input'))input.disabled=busy;
      }else{table.replaceChildren();stockKey='';}
      balance();
    }
    unload.hidden=!!t;
    const inventories=!t?w.pawns.filter(p=>isColonist(p)&&!p.prisoner&&!p.visitor&&w.piles.some(i=>i.owner.type==='inventory'&&i.owner.pawnId===p.id&&['survival-meal','silver','medicine','component'].includes(i.item))):[];
    const unloadKey=JSON.stringify(inventories.map(p=>[p.id,p.name]));
    if(unload.dataset.signature!==unloadKey){unload.dataset.signature=unloadKey;unload.replaceChildren(...inventories.map(p=>{const b=document.createElement('button');b.type='button';b.id=`commercial-unload-${p.id}`;b.textContent=`Décharger l’inventaire de ${p.name}`;b.onclick=()=>void run({type:'commercial-unload',pawnId:p.id});return b;}));}
    for(const b of unload.querySelectorAll<HTMLButtonElement>('button'))b.disabled=busy;
  }
  return {update(w:World){current=w;render();}};
}
