import { isColonist } from '../sim/affiliation';
import { ITEM_DEFINITIONS } from '../sim/items';
import { orbitalAtContact,orbitalTradeGoods,orbitalTradeReason,quoteOrbitalTrade } from '../sim/orbital-rules';
import { tradeImprovement } from '../sim/trade-negotiator';
import type { Command,World } from '../sim/types';
import type { TradeLine } from '../sim/trade-state';
import './trade-panel.css';

export function createOrbitalTradeUI(send:(c:Command)=>Promise<unknown>,pause:()=>Promise<unknown>,focus:(id:number)=>void,resume:()=>Promise<unknown>){
  const button=document.createElement('button');button.id='orbital-letter';button.className='arrival-letter';
  const dialog=document.createElement('dialog');dialog.id='orbital-dialog';dialog.className='trade-dialog';
  const heading=document.createElement('h2');heading.textContent='Commerce orbital';
  const ship=document.createElement('select'),pawn=document.createElement('select'),console=document.createElement('select');
  for(const [select,id,label] of [[ship,'ship','Vaisseau'],[pawn,'negotiator','Négociateur'],[console,'console','Console']] as const){
    select.id=`orbital-${id}`;select.dataset.orbitalSelect=id;select.setAttribute('aria-label',label);
  }
  const contact=document.createElement('button'),cancel=document.createElement('button');
  contact.id='orbital-contact';contact.textContent='Rejoindre la console';cancel.id='orbital-cancel';cancel.textContent='Annuler l’appel';
  const status=document.createElement('p'),hint=document.createElement('p');status.id='orbital-status';hint.className='muted';
  const table=document.createElement('table');table.id='orbital-goods';
  const total=document.createElement('p'),error=document.createElement('p');total.id='orbital-total';error.id='orbital-error';error.setAttribute('role','alert');
  const shortfall=document.createElement('label'),accept=document.createElement('input');accept.type='checkbox';accept.id='orbital-shortfall';shortfall.append(accept,' Accepter la perte d’argent indiquée');
  const confirm=document.createElement('button'),close=document.createElement('button');confirm.id='orbital-confirm';close.id='orbital-close';confirm.textContent='Conclure l’échange';close.textContent='Fermer';
  dialog.append(heading,ship,pawn,console,contact,cancel,status,hint,table,total,shortfall,error,confirm,close);document.body.append(dialog);
  let current:World|undefined,busy=false,last=-Infinity,stockKey='',readyKey='',shownQuote='',preferredConsole:number|undefined;
  const quantities=new Map<number,number>();
  const lines=():TradeLine[]=>[...quantities].filter(([,n])=>n!==0).map(([pileId,quantity])=>({pileId,quantity}));
  function balance(){
    confirm.disabled=true;shortfall.hidden=true;shownQuote='';if(!current)return;
    const q=quoteOrbitalTrade(current,Number(pawn.value),Number(ship.value),lines());
    if(!q.ok){total.textContent=lines().length?q.reason:'Choisissez les quantités à acheter ou vendre.';return;}
    total.textContent=q.net>=0?`À payer : ${q.net} argent.`:`À recevoir : ${-q.paid} argent${q.forgone?` · Le vaisseau manque de ${q.forgone} argent.`:'.'}`;
    shownQuote=q.signature;shortfall.hidden=!q.forgone;confirm.disabled=busy||!!q.forgone&&!accept.checked;
  }
  async function run(action:()=>Promise<unknown>){
    if(busy)return;busy=true;error.textContent='';render();
    try{await action();}catch(e){error.textContent=e instanceof Error?e.message:String(e);}
    finally{busy=false;if(dialog.open)render();}
  }
  function open(consoleId?:number){preferredConsole=consoleId;stockKey='';last=-Infinity;if(!dialog.open)dialog.showModal();render();}
  button.onclick=()=>open();
  close.onclick=()=>dialog.close();
  dialog.oncancel=e=>{if(busy)e.preventDefault();};
  dialog.onclose=()=>{
    const p=current?.pawns.find(p=>p.id===Number(pawn.value));
    if(p?.orbitalTrade)void run(async()=>{await send({type:'cancel-orbital-trade',pawnId:p.id});await resume();});
  };
  const reset=()=>{quantities.clear();stockKey='';readyKey='';accept.checked=false;render();};ship.onchange=pawn.onchange=console.onchange=reset;accept.onchange=balance;
  contact.onclick=()=>void run(async()=>{
    const consoleId=Number(console.value);focus(consoleId);
    await send({type:'order-orbital-trade',pawnId:Number(pawn.value),shipId:Number(ship.value),consoleId});await resume();
  });
  cancel.onclick=()=>void run(async()=>{await send({type:'cancel-orbital-trade',pawnId:Number(pawn.value)});quantities.clear();readyKey='';await resume();});
  confirm.onclick=()=>{const confirmedQuote=shownQuote;void run(async()=>{
    if(!current)return;
    const pawnId=Number(pawn.value),shipId=Number(ship.value),basket=lines(),q=quoteOrbitalTrade(current,pawnId,shipId,basket);
    if(!q.ok)throw new Error(q.reason);
    if(q.signature!==confirmedQuote){render();throw new Error('Le panier a changé : vérifiez les nouveaux prix avant de confirmer.');}
    await send({type:'orbital-trade-execute',pawnId,shipId,lines:basket,quote:q.signature,acceptShortfall:accept.checked});
    quantities.clear();stockKey='';readyKey='';dialog.close();await resume();
  });};
  function options(select:HTMLSelectElement,entries:{id:number;label:string}[]){
    const key=entries.map(e=>`${e.id}:${e.label}`).join('|');if(select.dataset.key===key)return;
    const prior=select.value;select.replaceChildren(...entries.map(e=>new Option(e.label,String(e.id))));
    if(entries.some(e=>String(e.id)===prior))select.value=prior;select.dataset.key=key;
  }
  function render(){
    if(!current||!dialog.open)return;
    const w=current,ships=w.orbital?.ships.filter(s=>s.announced&&s.departAt>w.tick)??[];
    options(ship,ships.map(s=>({id:s.id,label:`${s.name} · ${s.kind==='bulk'?'Gros':'Exotique'} · départ dans ${Math.max(0,s.departAt-w.tick)} ticks`})));
    options(pawn,w.pawns.filter(p=>isColonist(p)&&p.state!=='dead').map(p=>({id:p.id,label:`${p.name} · Social ${p.skills.social?.level??0}`})));
    options(console,w.structures.filter(s=>s.kind==='comms-console').map(s=>({id:s.id,label:`Console #${s.id} · ${s.x}, ${s.z}`})));
    if(preferredConsole!==undefined){if([...console.options].some(o=>Number(o.value)===preferredConsole))console.value=String(preferredConsole);preferredConsole=undefined;}
    const task=w.pawns.find(p=>p.id===Number(pawn.value))?.orbitalTrade;
    if(task){ship.value=String(task.shipId);console.value=String(task.consoleId);}
    const p=w.pawns.find(p=>p.id===Number(pawn.value)),s=ships.find(s=>s.id===Number(ship.value)),c=w.structures.find(c=>c.id===Number(console.value));
    const ready=!!p&&!!s&&orbitalAtContact(w,p,s),reason=p&&s?orbitalTradeReason(w,p,s,c):undefined;
    close.disabled=busy;ship.disabled=pawn.disabled=console.disabled=busy||!!p?.orbitalTrade;
    contact.disabled=busy||!p||!s||!c||!!p.orbitalTrade||!!reason;cancel.hidden=!p?.orbitalTrade;cancel.disabled=busy;
    table.hidden=hint.hidden=confirm.hidden=!ready;shortfall.hidden=true;
    status.textContent=!w.orbital?'Le calendrier orbital sera adopté pour les événements futurs.':!s?'Aucun vaisseau détecté. Alimenter une console pour découvrir les vaisseaux encore en orbite.':!c?'Construisez une console de communication et une balise, puis alimentez-les.':p?.orbitalTrade?.shipId===s.id?(ready?`Au contact · avantage du négociateur ${(tradeImprovement(p)*100).toFixed(1)} %`:'Le négociateur rejoint la console.'):(reason??'Rejoindre reprend le temps. La partie se met en pause au contact pour préparer le panier.');
    if(!ready){total.textContent='';confirm.disabled=true;shownQuote='';stockKey='';return;}
    const key=`${p.id}:${s.id}:${p.orbitalTrade!.startedAt}`;
    if(readyKey!==key&&!busy){readyKey=key;void run(pause);}
    const stock=orbitalTradeGoods(w,p,s),next=stock.goods.map(g=>`${g.pile.id}:${g.available}:${g.unitPrice}:${g.refusal??''}`).join('|');
    if(stockKey!==next){
      stockKey=next;table.replaceChildren();const head=document.createElement('tr');
      for(const label of ['Objet','Échange','Stock','Prix unitaire','Quantité']){const th=document.createElement('th');th.textContent=label;head.append(th);}table.append(head);
      for(const g of stock.goods){
        const row=document.createElement('tr'),name=document.createElement('td'),side=document.createElement('td'),available=document.createElement('td'),price=document.createElement('td'),quantity=document.createElement('td');
        name.textContent=ITEM_DEFINITIONS[g.pile.item].label;side.textContent=g.side==='buy'?'Acheter':'Vendre';available.textContent=String(g.available);price.textContent=g.refusal?'Refusé':g.unitPrice.toFixed(2);if(g.refusal)row.title=g.refusal;
        const input=document.createElement('input');input.type='number';input.min='0';input.max=String(g.available);input.step='1';input.value=String(Math.abs(quantities.get(g.pile.id)??0));input.disabled=!!g.refusal;
        input.dataset.pile=String(g.pile.id);input.dataset.item=g.pile.item;input.dataset.side=g.side;input.setAttribute('aria-label',`${side.textContent} ${name.textContent}`);
        input.oninput=()=>{quantities.set(g.pile.id,(g.side==='buy'?1:-1)*Number(input.value));accept.checked=false;balance();};
        quantity.append(input);row.append(name,side,available,price,quantity);table.append(row);
      }
    }
    const money=stock.silver.reduce((n,x)=>n+x.quantity,0),merchant=stock.merchantSilver.reduce((n,x)=>n+x.quantity,0);
    hint.textContent=`Argent couvert disponible : colonie ${money}, vaisseau ${merchant}. Seuls les biens au sol couverts par une balise alimentée et libres de réservation sont vendables. Les achats et l’argent reçu arrivent en capsule, puis sont rangés. Ce canal échange des marchandises, sans animaux, équipement ou sculptures.`;
    balance();
  }
  return {open,update(w:World){
    current=w;const ships=w.orbital?.ships.filter(s=>s.announced&&s.departAt>w.tick)??[];
    button.hidden=ships.length===0;const remaining=ships.length?Math.min(...ships.map(s=>s.departAt-w.tick)):0;
    button.textContent=`Vaisseaux : ${ships.length} · Commerce orbital · départ dans ${remaining} ticks`;
    const alerts=document.getElementById('alerts');if(alerts&&button.parentElement!==alerts)alerts.append(button);
    if(dialog.open&&performance.now()-last>250){last=performance.now();render();}
  }};
}
