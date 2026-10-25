import type {NativeUiState,NativeUiActions,NativePage,NativeRow,NativeControl} from './native-contract';
import {buildNativeWorld,syncNativeWorldState} from './native-world';
import {nativeArrivalRows} from './native-arrivals';
import {toolDefinitions,workColumns} from './native-catalog';
import type {ArchitectCategory} from '../ui/layout';
import {architectCategoryAvailable,architectToolAvailable} from '../ui/architect-availability';
import {isColonist} from '../sim/affiliation';
import {backgroundWorkRefusal,type BackgroundSkillId} from '../sim/colonist-backgrounds';
import {queryPawnStatus} from '../sim/diagnostics';
import {calendarTick} from '../sim/calendar';
import {hourOfDay,type ScheduleAssignment} from '../sim/schedule';
import {TICKS_PER_DAY,type Command,type Pawn,type WorkType,type World} from '../sim/types';
import {animalSpecies} from '../sim/animal-species';
import {actualAnimalName256} from '../sim/starting-pet-state-256';
import {knownPosition256} from '../ui/exploration-readers-256';
import {animalActivity} from '../ui/animal-activity';
import {animalLifeStage,animalNutritionMax,gestationTicks} from '../sim/animal-life';
import {animalBody} from '../sim/wildlife-health';
import {canTameSpecies} from '../sim/animal-handling';
import {slaughterRefusal} from '../sim/animal-slaughter';
import {readAnimalTraining282,trainingRefusal282} from '../sim/animal-training-282';
import {MEDICAL_CARE,type MedicalCare} from '../sim/medicine-rules';
import {productKind,productFullness} from '../sim/animal-products';
import {animalPenStatus} from '../ui/pen-status';
import {supportsAnimalAreas287,currentAnimalAreaChoice287} from '../sim/animal-area-policy-287';
import type {AnimalAreaChoice287} from '../sim/animal-area-state-287';
import {AUTO_SLAUGHTER_SPECIES,defaultAutoSlaughterConfig,type AutoSlaughterConfig,type AutoSlaughterSpecies} from '../sim/auto-slaughter-state';
import {autoSlaughterCounts,autoSlaughterTargets} from '../sim/auto-slaughter';
import {researchProjects} from '../ui/research-projects';
import {captureResearchStationIssues,readResearchReadiness} from '../ui/research-readiness';
import {researchPrerequisite,researchUnlocked,RESEARCH_SCALE,type ResearchProject} from '../sim/research';
import {expectationForWealth} from '../sim/expectations';
import {ITEM_DEFINITIONS} from '../sim/items';
import {FOOD_ITEMS} from '../sim/food-policy';
import {effectiveDrugPolicies265,type BeerPolicy265} from '../sim/alcohol-policy-265';
import {APPAREL,type ApparelItem} from '../sim/apparel-rules';
import {APPAREL_POLICY_MATERIALS267,apparelPolicyMaterialLabel267} from '../sim/apparel-policy';
import {WEAPON_QUALITIES,QUALITY_LABELS,type WeaponQuality} from '../sim/equipment-rules';
import {tradeRequestContent284} from '../sim/trade-request-content-284';
import {worldSettlementAccess256} from '../sim/world-faction-access';
import {peaceTalksFacts293} from '../ui/peace-talks-293';
import {constructionMaterials} from '../sim/construction-materials';
import {STORAGE_FILTER_TREE,STORAGE_LEAVES,storageTreeSelection,storageTreePermissions,storageSearchNodes,storageNodeState,setStorageNode,type StorageFilterNode} from '../ui/storage-filter-tree';
import type {StorageControlSettings} from '../ui/storage-item-controls';

/** Native drafts only. Confirmed World objects are borrowed and never edited. */
let latest:NativeUiState|undefined;
let host:NativeUiActions|undefined;
let researchSelection:ResearchProject|undefined;
let scheduleBrush:ScheduleAssignment='anything';
let scheduleClipboard:ScheduleAssignment[]|undefined;
let scheduleRange:{pawnId:number;from:number;to:number}|undefined;
let lastIdentity='',lastTick=-1;
let dispatching=false;
const categories:readonly [ArchitectCategory,string][]=[['orders','Ordres'],['zones','Zones'],['structure','Structure'],['floors','Sols'],['furniture','Mobilier'],['temperature','Température'],['recreation','Loisirs'],['production','Production'],['power','Énergie'],['ship','Vaisseau']];
const assignmentLabels:Record<ScheduleAssignment,string>={anything:'Libre',work:'Travail',sleep:'Sommeil',recreation:'Loisir'};
const assignmentSymbols:Record<ScheduleAssignment,string>={anything:'·',work:'T',sleep:'Z',recreation:'L'};
const stageLabels={baby:'Petit',juvenile:'Jeune',adult:'Adulte'} as const;
const money=(value:number)=>`${value.toLocaleString('fr-FR',{maximumFractionDigits:2})} argent`;
const days=(ticks:number)=>`${Math.max(0,ticks/TICKS_PER_DAY).toLocaleString('fr-FR',{maximumFractionDigits:2})} j`;
const signed=(n:number)=>`${n>0?'+':''}${n}`;
const button=(id:string,label:string,onActivate:NativeControl['onActivate'],extra:Partial<NativeControl>={}):NativeControl=>({id,label,onActivate,...extra});
const row=(id:string,label:string,value?:string,detail?:string,controls?:NativeControl[]):NativeRow=>({id,label,value,detail,controls});
function currentWorld():World {const world=latest?.world;if(!world)throw Error('La carte locale n’est plus disponible.');return world;}
function currentPawn(id:number):Pawn {const pawn=currentWorld().pawns.find(p=>p.id===id);if(!pawn)throw Error('Cette personne n’est plus présente sur la carte.');return pawn;}
function currentAnimal(id:number){const animal=currentWorld().wildlife?.animals.find(a=>a.id===id);if(!animal)throw Error('Cet animal n’est plus présent sur la carte.');return animal;}
async function send(command:Command):Promise<unknown>{
 if(!host||!latest||dispatching||latest.busy)throw Error('Attendez la fin de l’opération courante.');
 dispatching=true;
 try {const result=await host.command(command);if(result&&typeof result==='object'&&'ok'in result&&result.ok===false)throw Error('reason'in result&&typeof result.reason==='string'?result.reason:'La commande a été refusée.');return result;}
 finally {dispatching=false;host.refresh();}
}
function open(page:NativePage):void {host?.showPage(page);}
function redraw():void {host?.refresh();}
function back():void {const state=latest,actions=host;if(!state||!actions)return;const page=buildNativePanel(state,actions);if(page)open(page);}
function detailPage(id:string,title:string,rows:NativeRow[],actions:NativeControl[]=[]):NativePage{return {id,title,rows,actions:[...actions,button(`${id}-back`,'Retour',back)],modal:true,width:7.8,onClose:back};}
function choose(id:string,title:string,choices:{id:string;label:string;detail?:string;active?:boolean;disabled?:boolean;choose:()=>void|Promise<unknown>}[],after:()=>void=back):void {
 open(detailPage(id,title,choices.map(choice=>row(choice.id,choice.label,undefined,choice.detail,[button(`${choice.id}-choose`,choice.active?'Choisi':'Choisir',async()=>{await choice.choose();after();},{active:choice.active,disabled:choice.disabled})]))));
}
function confirm(id:string,title:string,detail:string,action:()=>Promise<unknown>):void {open(detailPage(id,title,[row(`${id}-message`,detail)], [button(`${id}-confirm`,'Confirmer',async()=>{await action();back();})]));}
function inputPage(id:string,title:string,value:string,onCommit:(value:string)=>void|Promise<unknown>,detail?:string,maxLength=60):void {
 let draft=value;
 const input:NativeRow={id:`${id}-input`,label:'Nom',detail,input:{value,placeholder:'Saisir un nom',maxLength,onCommit:text=>{draft=text;}}};
 open(detailPage(id,title,[input],[button(`${id}-apply`,'Appliquer',async()=>{await onCommit(draft);back();})]));
}

function creationStorageEditor():void {
 if(!latest||!host)return;
 const initial=latest.creationStorage,selected=storageTreeSelection(initial.filters,initial.items),expanded=new Set<string>();
 let priority=initial.priority,allowFresh=initial.allowFresh!==false,allowRotten=initial.allowRotten!==false,search='';
 let minQuality=initial.quality?.min??'awful',maxQuality=initial.quality?.max??'legendary',qualityEnabled=!!initial.quality;
 let minHp=initial.hitPoints?.min??0,maxHp=initial.hitPoints?.max??100,hpEnabled=!!initial.hitPoints;
 const quality=(bound:'min'|'max'):void=>choose(`storage-quality-${bound}`,'Qualité',(WEAPON_QUALITIES as readonly WeaponQuality[]).map(value=>({id:value,label:QUALITY_LABELS[value],active:value===(bound==='min'?minQuality:maxQuality),choose:()=>{if(bound==='min')minQuality=value;else maxQuality=value;}})),()=>open(make()));
 const make=():NativePage=>{
  const visible=search.trim()?storageSearchNodes(search):undefined,rows:NativeRow[]=[
   row('creation-storage-priority','Priorité',undefined,undefined,([[1,'Basse'],[2,'Normale'],[3,'Préférée'],[4,'Importante'],[5,'Critique']] as const).map(([value,label])=>button(`creation-storage-priority-${value}`,label,()=>{priority=value;open(make());},{active:priority===value}))),
   row('creation-storage-all','Objets acceptés',`${selected.size} / ${STORAGE_LEAVES.length}`,undefined,[button('creation-storage-clear','Tout effacer',()=>{selected.clear();open(make());}),button('creation-storage-allow','Tout autoriser',()=>{for(const item of STORAGE_LEAVES)selected.add(item);open(make());})]),
   {id:'creation-storage-search',label:'Rechercher un objet',input:{value:search,placeholder:'Nom d’objet ou de catégorie',onCommit:value=>{search=value;open(make());}}},
   row('creation-storage-fresh','État de conservation',undefined,undefined,[button('creation-storage-fresh-toggle',allowFresh?'Frais autorisés':'Frais interdits',()=>{allowFresh=!allowFresh;open(make());},{active:allowFresh}),button('creation-storage-rotten-toggle',allowRotten?'Pourris autorisés':'Pourris interdits',()=>{allowRotten=!allowRotten;open(make());},{active:allowRotten})]),
   row('creation-storage-quality','Filtre de qualité',qualityEnabled?`${QUALITY_LABELS[minQuality]} → ${QUALITY_LABELS[maxQuality]}`:'Toutes qualités',undefined,[button('creation-storage-quality-toggle',qualityEnabled?'Désactiver le filtre':'Activer le filtre',()=>{qualityEnabled=!qualityEnabled;open(make());},{active:qualityEnabled}),...qualityEnabled?[button('creation-storage-quality-min','Minimum',()=>quality('min')),button('creation-storage-quality-max','Maximum',()=>quality('max'))]:[]]),
   row('creation-storage-hp','Filtre de points de vie',hpEnabled?`${minHp}–${maxHp} %`:'Tous états',undefined,[button('creation-storage-hp-toggle',hpEnabled?'Désactiver le filtre':'Activer le filtre',()=>{hpEnabled=!hpEnabled;open(make());},{active:hpEnabled})]),
  ];
  if(hpEnabled)rows.push({id:'creation-storage-hp-min',label:'PV minimum (%)',input:{value:String(minHp),kind:'number',onCommit:value=>{const n=Number(value);if(!Number.isInteger(n)||n<0||n>100)throw Error('Pourcentage entier de 0 à 100 requis.');minHp=n;}}},{id:'creation-storage-hp-max',label:'PV maximum (%)',input:{value:String(maxHp),kind:'number',onCommit:value=>{const n=Number(value);if(!Number.isInteger(n)||n<0||n>100)throw Error('Pourcentage entier de 0 à 100 requis.');maxHp=n;}}});
  const visit=(node:StorageFilterNode,depth:number):void=>{if(visible&&!visible.has(node.id))return;const status=storageNodeState(node,selected),children=!!node.children?.length;rows.push(row(`creation-storage-node-${node.id}`,`${'· '.repeat(depth)}${node.label}`,status==='all'?'Tout autorisé':status==='none'?'Interdit':'Partiellement autorisé',undefined,[button(`creation-storage-node-${node.id}-toggle`,status==='all'?'Interdire':'Autoriser',()=>{setStorageNode(node,selected,status!=='all');open(make());},{active:status==='all'}),...children?[button(`creation-storage-node-${node.id}-expand`,expanded.has(node.id)?'Replier':'Détails',()=>{expanded.has(node.id)?expanded.delete(node.id):expanded.add(node.id);open(make());})]:[]]));if(children&&(visible||expanded.has(node.id)))for(const child of node.children!)visit(child,depth+1);};
  for(const node of STORAGE_FILTER_TREE)visit(node,0);
  return detailPage('creation-storage','Réglages de la nouvelle réserve',rows,[button('creation-storage-apply','Appliquer aux prochaines zones',()=>{
   if(qualityEnabled&&WEAPON_QUALITIES.indexOf(minQuality)>WEAPON_QUALITIES.indexOf(maxQuality)||hpEnabled&&minHp>maxHp)throw Error('Le minimum dépasse le maximum.');
   const settings:StorageControlSettings={...storageTreePermissions(selected),priority,allowFresh,allowRotten,...qualityEnabled?{quality:{min:minQuality,max:maxQuality}}:{},...hpEnabled?{hitPoints:{min:minHp,max:maxHp}}:{}};
   host!.creationStorage(settings);back();
  })]);
 };open(make());
}

function architect(state:NativeUiState,actions:NativeUiActions,world:World):NativePage {
 const tools=toolDefinitions.filter(tool=>tool.category===state.category&&architectToolAvailable(world,tool.id));
 return {id:'architect',title:'Architecte',subtitle:'Choisir un outil, puis désigner les cases sur la carte.',width:7.8,rows:[
  row('architect-categories','Catégories',undefined,undefined,categories.filter(([id])=>architectCategoryAvailable(world,id)).map(([id,label])=>button(`category-${id}`,label,()=>{actions.category(id);redraw();},{active:id===state.category}))),
  ...state.category==='zones'?[row('architect-storage-settings','Nouvelle réserve',undefined,'Choisir la priorité, les catégories, les objets et leurs conditions avant de tracer la zone.',[button('architect-storage-settings-open','Réglages du stockage',creationStorageEditor)])]:[],
  ...tools.map(tool=>{const materials=constructionMaterials(tool.id);return row(`tool-${tool.id}`,tool.title,tool.key?`Raccourci ${tool.key}`:undefined,tool.hint,[button(`tool-${tool.id}-select`,'Placer',()=>actions.tool(tool.id),{active:state.tool===tool.id}),...(materials.length>1?[button(`tool-${tool.id}-material`,'Matériau',()=>choose(`material-${tool.id}`,`${tool.title} · matériau`,materials.map(material=>({id:material,label:ITEM_DEFINITIONS[material].label,active:state.constructionMaterial===material,choose:()=>actions.material(material)})),()=>actions.tool(tool.id)))]:[])]);}),
  row('architect-rotation','Orientation',`${state.orientation*90}°`,'La rotation s’applique aux constructions orientables.',[button('rotate-left','↶',()=>actions.rotate(-1)),button('rotate-right','↷',()=>actions.rotate(1))]),
 ],onClose:()=>void actions.panel(null)};
}
const workSkill:Partial<Record<WorkType,BackgroundSkillId>>={doctor:'medicine',warden:'social',handle:'animals',cook:'cooking',hunt:'shooting',build:'construction',grow:'plants',mine:'mining',gather:'plants',art:'artistic',craft:'crafting',research:'intellectual'};
function skillText(pawn:Pawn,work:WorkType):string {const id=workSkill[work],skill=id?pawn.skills[id]:undefined;return skill?`${skill.level}${' ♥'.repeat(skill.passion)}`:'—';}
function workPanel(world:World):NativePage {
 const pawns=world.pawns.filter(p=>isColonist(p)&&!p.prisoner);
 return {id:'work',title:'Travail',subtitle:'0 désactive un travail ; 1 est la priorité la plus élevée. Chaque case ouvre les cinq valeurs.',width:8.2,rows:[
  row('work-headings','Priorités',undefined,workColumns.map((c,i)=>`${i+1} ${c.label}`).join(' · ')),
  ...pawns.map(pawn=>({...row(`worker-${pawn.id}`,pawn.name,queryPawnStatus(world,pawn).reason,undefined,workColumns.map(({id,label},index)=>{
   const refusal=backgroundWorkRefusal(pawn,id),value=pawn.priorities[id];
   return button(`work-${pawn.id}-${id}`,`${index+1}:${refusal?'—':value}`,()=>choose(`priority-${pawn.id}-${id}`,`${pawn.name} · ${label}`,[0,1,2,3,4].map(priority=>({id:`priority-${priority}`,label:priority?`Priorité ${priority}`:'Désactivé',active:currentPawn(pawn.id).priorities[id]===priority,choose:()=>send({type:'priority',pawnId:pawn.id,work:id,value:priority})}))),{hint:refusal??`${label} · compétence ${skillText(pawn,id)}`,disabled:!!refusal||pawn.state==='dead',active:value===1});
  })),compact:true})),
  ...pawns.map(pawn=>row(`skills-${pawn.id}`,`${pawn.name} · compétences`,undefined,workColumns.filter(c=>workSkill[c.id]).map(c=>`${c.label} ${skillText(pawn,c.id)}`).join(' · '))),
 ],onClose:()=>void host?.panel(null)};
}
function schedulePanel(world:World):NativePage {
 const hour=hourOfDay(calendarTick(world));
 const rows:NativeRow[]=[row('schedule-brush','Activité à peindre',`Heure actuelle ${hour} h`,'Choisir l’activité puis une heure. Le mode plage permet de peindre plusieurs heures ensemble.',(Object.keys(assignmentLabels) as ScheduleAssignment[]).map(id=>button(`brush-${id}`,assignmentLabels[id],()=>{scheduleBrush=id;redraw();},{active:scheduleBrush===id})))];
 for(const pawn of world.pawns.filter(p=>isColonist(p)&&!p.prisoner)){
  rows.push({...row(`schedule-${pawn.id}`,pawn.name,undefined,undefined,Array.from({length:24},(_,h)=>{
   const assignment=pawn.schedule[h]??'anything';
   return button(`hour-${pawn.id}-${h}`,`${h}${assignmentSymbols[assignment]}`,()=>send({type:'schedule-paint',pawnId:pawn.id,hours:[h],assignment:scheduleBrush}),{hint:`${h} h · ${assignmentLabels[assignment]} → ${assignmentLabels[scheduleBrush]}`,active:h===hour,disabled:pawn.state==='dead'});
  })),compact:true});
  rows.push(row(`schedule-tools-${pawn.id}`,'',undefined,undefined,[
   button(`copy-${pawn.id}`,'Copier',()=>{scheduleClipboard=[...currentPawn(pawn.id).schedule];redraw();}),
   button(`paste-${pawn.id}`,'Coller',()=>send({type:'schedule-replace',pawnId:pawn.id,assignments:[...scheduleClipboard!]}),{disabled:!scheduleClipboard}),
   button(`range-${pawn.id}`,'Peindre une plage',()=>{
    scheduleRange={pawnId:pawn.id,from:0,to:23};
    const make=():NativePage=>detailPage(`range-${pawn.id}`,`${pawn.name} · plage de ${assignmentLabels[scheduleBrush]}`,[
     {id:'range-from',label:'Première heure (0–23)',input:{value:String(scheduleRange!.from),kind:'number',onCommit:value=>{const h=Number(value);if(!Number.isInteger(h)||h<0||h>23)throw Error('Heure comprise entre 0 et 23 requise.');scheduleRange!.from=h;}}},
     {id:'range-to',label:'Dernière heure (0–23)',input:{value:String(scheduleRange!.to),kind:'number',onCommit:value=>{const h=Number(value);if(!Number.isInteger(h)||h<0||h>23)throw Error('Heure comprise entre 0 et 23 requise.');scheduleRange!.to=h;}}},
    ],[button('range-commit','Peindre',async()=>{const range=scheduleRange!;const from=Math.min(range.from,range.to),to=Math.max(range.from,range.to);await send({type:'schedule-paint',pawnId:range.pawnId,hours:Array.from({length:to-from+1},(_,i)=>from+i),assignment:scheduleBrush});scheduleRange=undefined;back();})]);
    open(make());
   }),
  ]));
 }
 rows.push(row('schedule-help','Règles',undefined,'Une plage est une priorité, pas un ordre immédiat. Dormir exige un couchage accessible ; travailler permet toujours de manger. Temps libre laisse le colon gérer ses besoins. Le copier-coller conserve les 24 heures.'));
 return {id:'schedule',title:'Planning',subtitle:'24 heures · T Travail · Z Sommeil · L Loisir · · Temps libre',rows,width:8.2,onClose:()=>void host?.panel(null)};
}

function animalArea(id:number):void {
 const world=currentWorld(),animal=currentAnimal(id),current=currentAnimalAreaChoice287(world,animal);
 const choices:{id:string;label:string;choice:AnimalAreaChoice287|null}[]=[{id:'unrestricted',label:'Sans restriction',choice:null},{id:'home',label:'Zone de foyer',choice:{kind:'home'}},...(world.allowedAreas??[]).map(area=>({id:`area-${area.id}`,label:area.label,choice:{kind:'allowed' as const,areaId:area.id}}))];
 choose(`animal-area-${id}`,'Zone autorisée',choices.map(choice=>({id:choice.id,label:choice.label,active:JSON.stringify(current)===JSON.stringify(choice.choice),choose:()=>send({type:'animal-area-assign',animalId:id,choice:choice.choice})})));
}
function animalDetails(id:number):void {
 const world=currentWorld(),animal=currentAnimal(id),species=animalSpecies(animal.species),name=actualAnimalName256(animal)??`${species.label} ${animal.id}`;
 const rows:NativeRow[]=[row('animal-state','État',animalActivity(world,animal)),row('animal-age','Âge',`${(animal.ageTicks/(TICKS_PER_DAY*60)).toLocaleString('fr-FR',{maximumFractionDigits:2})} an · ${stageLabels[animalLifeStage(animal)]}`),row('animal-food','Nourriture',`${Math.round(100*animal.food/animalNutritionMax(animal))} %`),row('animal-mobility','Mobilité',`${Math.round(100*animalBody(animal).capacities.moving)} %`),row('animal-position','Position',`${animal.x}, ${animal.z}`)];
 if(animal.pregnancy)rows.push(row('animal-pregnancy','Gestation',`${Math.round(100*animal.pregnancy.progress/gestationTicks(animal.species))} %`));
 if(animal.domestic){
  rows.push(row('animal-care','Soins',MEDICAL_CARE[animal.domestic.care],undefined,[button('animal-care-choose','Choisir',()=>choose(`animal-care-${id}`,'Politique médicale',(Object.keys(MEDICAL_CARE) as MedicalCare[]).map(care=>({id:care,label:MEDICAL_CARE[care],active:currentAnimal(id).domestic?.care===care,choose:()=>send({type:'animal-care-policy',animalId:id,care})}))))]));
  if(world.schemaVersion>=287&&supportsAnimalAreas287(animal.species))rows.push(row('animal-area','Zone autorisée',animalAreaLabel(world,animal),undefined,[button('animal-area-edit','Choisir',()=>animalArea(id))]));
  if(world.schemaVersion>=282)for(const skill of ['obedience','haul'] as const){const training=readAnimalTraining282(animal,skill),refusal=trainingRefusal282(world,animal,skill);rows.push(row(`training-${skill}`,skill==='haul'?'Transport':'Obéissance',`${training.steps}/${training.maxSteps}${training.learned?' · acquis':''}`,refusal??'Les leçons exigent un dresseur, la nourriture et les prérequis physiques.',[button(`training-${skill}-toggle`,training.wanted?'Demandé':'Demander',()=>send({type:'animal-training',animalId:id,skill,wanted:!readAnimalTraining282(currentAnimal(id),skill).wanted}),{active:training.wanted,disabled:!!refusal})]));}
 }
 open(detailPage(`animal-${id}`,name,rows,[button('animal-locate','Repérer',()=>host?.selectPawn(id))]));
}
function animalAreaLabel(world:World,animal:NonNullable<World['wildlife']>['animals'][number]):string {
 if(world.schemaVersion<287||!supportsAnimalAreas287(animal.species))return animalPenStatus(world,animal)??'Libre';
 const choice=currentAnimalAreaChoice287(world,animal);return choice===null?'Sans restriction':choice.kind==='home'?'Zone de foyer':world.allowedAreas?.find(a=>a.id===choice.areaId)?.label??'Zone indisponible';
}
function quotaEditor(species:AutoSlaughterSpecies):void {
 let draft={...(currentWorld().autoSlaughter?.find(c=>c.species===species)??defaultAutoSlaughterConfig(species))};
 const fields:readonly [keyof Pick<AutoSlaughterConfig,'maxTotal'|'maxMales'|'maxMalesYoung'|'maxFemales'|'maxFemalesYoung'>,string][]=[['maxTotal','Total'],['maxMales','Mâles adultes'],['maxMalesYoung','Jeunes mâles'],['maxFemales','Femelles adultes'],['maxFemalesYoung','Jeunes femelles']];
 const make=():NativePage=>detailPage(`quota-${species}`,`${animalSpecies(species).label} · abattage automatique`,[
  row('quota-help','Limites',undefined,'−1 signifie sans limite. Les plus âgés excédentaires sont désignés ; le travail reste physique. Les désignations manuelles sont indépendantes.'),
  ...fields.map(([key,label]):NativeRow=>({id:`quota-${key}`,label,input:{value:String(draft[key]),kind:'number',onCommit:value=>{const n=Number(value);if(!Number.isSafeInteger(n)||n< -1)throw Error('Limite entière supérieure ou égale à −1 requise.');draft={...draft,[key]:n};}}})),
  row('quota-pregnant','Inclure les femelles gestantes',draft.allowPregnant?'Oui':'Non',undefined,[button('quota-pregnant-toggle',draft.allowPregnant?'Oui':'Non',()=>{draft={...draft,allowPregnant:!draft.allowPregnant};open(make());},{active:draft.allowPregnant})]),
 ],[button('quota-apply','Appliquer',async()=>{await send({type:'auto-slaughter-policy',config:{...draft}});back();})]);open(make());
}
function animalsPanel(world:World):NativePage {
 const animals=world.wildlife?.animals.filter(a=>!!a.domestic&&a.state!=='dead')??[],targets=autoSlaughterTargets(world);
 const rows:NativeRow[]=animals.map(animal=>{
  const product=productKind(animal),refusal=slaughterRefusal(world,animal),training=readAnimalTraining282(animal,'haul');
  const controls=[button(`animal-${animal.id}-locate`,'Repérer',()=>host?.selectPawn(animal.id)),button(`animal-${animal.id}-details`,'Dossier',()=>animalDetails(animal.id)),button(`animal-${animal.id}-slaughter`,animal.domestic!.slaughter?'Abattage demandé':'Abattre',()=>send({type:'slaughter',animalId:animal.id,enabled:!currentAnimal(animal.id).domestic?.slaughter}),{active:!!animal.domestic!.slaughter,disabled:!!refusal&&!animal.domestic!.slaughter,hint:refusal})];
  if(world.schemaVersion>=282)controls.push(button(`animal-${animal.id}-haul`,training.wanted?'Transport demandé':'Entraîner',()=>send({type:'animal-training',animalId:animal.id,skill:'haul',wanted:!readAnimalTraining282(currentAnimal(animal.id),'haul').wanted}),{active:training.wanted,disabled:!!trainingRefusal282(world,animal,'haul'),hint:trainingRefusal282(world,animal,'haul')??`${training.steps}/${training.maxSteps}`}));
  if(world.schemaVersion>=287&&supportsAnimalAreas287(animal.species))controls.push(button(`animal-${animal.id}-area`,'Zone',()=>animalArea(animal.id)));
  return row(`animal-${animal.id}`,actualAnimalName256(animal)??`${animalSpecies(animal.species).label} ${animal.id}`,`${animal.sex==='female'?'♀':'♂'} · ${(animal.ageTicks/(TICKS_PER_DAY*60)).toLocaleString('fr-FR',{maximumFractionDigits:2})} an · ${stageLabels[animalLifeStage(animal)]}`,[animalActivity(world,animal,targets),animalAreaLabel(world,animal),MEDICAL_CARE[animal.domestic!.care],product?`${product==='milk'?'Lait':'Laine'} ${Math.round(100*productFullness(animal))} %`:'',animal.pregnancy?`Gestation ${Math.round(100*animal.pregnancy.progress/gestationTicks(animal.species))} %`:''].filter(Boolean).join(' · '),controls);
 });
 if(!animals.length)rows.push(row('animals-empty','Aucun animal domestique.'));
 if(world.schemaVersion>=228)for(const species of AUTO_SLAUGHTER_SPECIES){const c=autoSlaughterCounts(world,species),config=world.autoSlaughter?.find(c=>c.species===species)??defaultAutoSlaughterConfig(species);rows.push(row(`quota-${species}`,animalSpecies(species).label,`${c.total} animaux · limite ${config.maxTotal<0?'∞':config.maxTotal}`,`Adultes ${c.males} ♂ / ${c.females} ♀ · jeunes ${c.malesYoung} ♂ / ${c.femalesYoung} ♀ · gestantes ${c.pregnant}`,[button(`quota-${species}-edit`,'Quotas',()=>quotaEditor(species))]));}
 return {id:'animals',title:'Animaux',rows,width:7.8,onClose:()=>void host?.panel(null)};
}
function wildlifePanel(state:NativeUiState,world:World):NativePage {
 const animals=world.wildlife?.animals.filter(a=>!a.domestic&&knownPosition256(world,a))??[];
 const rows:NativeRow[]=[];
 if(!world.wildlife)rows.push(row('wildlife-enable','Partie historique',undefined,'Introduire la faune adopte le circuit existant.',[button('enable-wildlife','Introduire la faune',()=>send({type:'enable-wildlife'}))]));
 for(const animal of animals){const hunted=world.hunting?.targets.includes(animal.id)??false;const drafted=state.selectedPawnIds.length>0&&state.selectedPawnIds.every(id=>world.pawns.some(p=>p.id===id&&isColonist(p)&&!p.prisoner&&p.draft&&p.state!=='dead'&&p.state!=='downed'));
  const controls=[button(`wildlife-${animal.id}-focus`,'Repérer',()=>host?.selectPawn(animal.id)),button(`wildlife-${animal.id}-hunt`,hunted?'Chasse désignée':'Chasser',()=>send({type:'hunt',animalId:animal.id,enabled:!currentWorld().hunting?.targets.includes(animal.id)}),{active:hunted,disabled:animal.state==='dead'})];
  if(canTameSpecies(animal.species))controls.push(button(`wildlife-${animal.id}-tame`,animal.taming?.designated?'Apprivoisement demandé':'Apprivoiser',()=>send({type:'tame',animalId:animal.id,enabled:!currentAnimal(animal.id).taming?.designated}),{active:!!animal.taming?.designated,disabled:animal.state==='dead'}));
  controls.push(button(`wildlife-${animal.id}-shoot`,'Tirer',()=>send({type:'shoot',pawnIds:[...(latest?.selectedPawnIds??[])],targetId:animal.id}),{disabled:!drafted||animal.state==='dead'}),button(`wildlife-${animal.id}-melee`,'Mêlée',()=>send({type:'melee',pawnIds:[...(latest?.selectedPawnIds??[])],targetId:animal.id}),{disabled:!drafted||animal.state==='dead'}));
  rows.push(row(`wildlife-${animal.id}`,actualAnimalName256(animal)??`${animalSpecies(animal.species).label} ${animal.id}`,`${animal.sex==='female'?'Femelle':'Mâle'} · ${animal.x}, ${animal.z}`,animalActivity(world,animal),controls));
 }
 if(world.wildlife&&!animals.length)rows.push(row('wildlife-empty','Aucun animal sauvage connu.'));
 return {id:'wildlife',title:'Faune',subtitle:'Les ordres de combat utilisent les colons mobilisés sélectionnés.',rows,width:7.8,onClose:()=>void host?.panel(null)};
}

const researchMinimum:Partial<Record<ResearchProject,number>>={'tree-sowing':291,firefoam:290,'ship-cryptosleep':277,'ship-engine':276,'ship-basics':275,'ship-reactor':275,prosthetics:273,cryptosleep:271,'long-blades':270,brewing:265,'geothermal-power':264,pemmican:248,'biofuel-refining':218,'nutrient-paste':217,'deep-drilling':215,'ground-scanner':215,'sterile-materials':211,'vitals-monitor':211,'drug-production':206,'medicine-production':206,hydroponics:203,'gun-turrets':193,'tube-television':190,'packaged-survival-meals':188,'hospital-bed':187,autodoors:143};
function researchPanel(world:World):NativePage {
 const projects=researchProjects.filter(p=>world.schemaVersion>=(researchMinimum[p.id]??0)),selected=projects.find(p=>p.id===researchSelection)??projects.find(p=>p.id===world.research?.project)??projects[0]!;
 researchSelection=selected.id;
 const stations=captureResearchStationIssues(world),readiness=readResearchReadiness(world,selected.id,stations),missing=researchPrerequisite(world,selected.id),done=researchUnlocked(world,selected.id),active=world.research?.project===selected.id;
 const issueLabel={bench:'Bureau de recherche construit requis','advanced-bench':'Bureau avancé construit requis',power:'Alimentation active requise',analyzer:'Multi-analyseur alimenté relié requis'};
 const names=(ids:readonly number[])=>ids.map(id=>world.pawns.find(p=>p.id===id)?.name??`#${id}`).join(', ')||'Aucun';
 const points=(selected.progress(world)?.points??0)/RESEARCH_SCALE;
 const rows:NativeRow[]=[row('research-selected',selected.title,`${points.toFixed(1)} / ${selected.cost} points`,selected.detail,[button('research-start',done?'Terminée':active?'Projet actif':'Lancer',()=>send({type:'research-project',project:selected.id}),{disabled:done||active||!!missing||selected.id==='vitals-monitor'&&!stations.vitalsMonitorAvailable})]),row('research-prerequisite','Prérequis',missing??'Prérequis acquis'),row('research-station','Installation',readiness.stationIssue?issueLabel[readiness.stationIssue]:'Installation compatible disponible'),row('research-workers','Chercheurs affectés',names(readiness.assignedIds),`En travail : ${names(readiness.workingIds)} · en déplacement : ${names(readiness.movingIds)} · indisponibilité médicale : ${names(readiness.medicallyUnavailableIds)}`),row('research-context','Organisation',undefined,undefined,[button('research-open-work','Travail',()=>host?.panel('work')),button('research-open-production','Production',()=>{host?.category('production');return host?.panel('architect');}),button('research-pause','Suspendre la recherche',()=>send({type:'research-project',project:null}),{disabled:!world.research?.project})])];
 for(const project of projects){const p=(project.progress(world)?.points??0)/RESEARCH_SCALE,complete=researchUnlocked(world,project.id),prerequisite=researchPrerequisite(world,project.id),issue=stations.issues.get(project.id);rows.push(row(`research-${project.id}`,project.title,complete?'Terminée':`${p.toFixed(1)} / ${project.cost}`,prerequisite?`Nécessite ${prerequisite}`:issue?issueLabel[issue]:world.research?.project===project.id?'Projet actif':'Disponible',[button(`research-${project.id}-select`,'Détails',()=>{researchSelection=project.id;redraw();},{active:project.id===selected.id})]));}
 return {id:'research',title:'Recherche',subtitle:'Tous les projets, leurs progrès et leurs conditions réelles.',rows,width:7.8,onClose:()=>void host?.panel(null)};
}
function historyPanel(state:NativeUiState):NativePage {
 const source=state.world??state.campaign,rows:NativeRow[]=[];
 if(state.world){const economy=state.world.economy;if(economy){const wealth=economy.wealth,expect=expectationForWealth(wealth.knownTotal);rows.push(row('economy-total','Patrimoine évalué',`${money(wealth.knownTotal)}${wealth.complete?'':' au minimum'}`,`Relevé jour ${1+Math.floor(economy.sampledAt/TICKS_PER_DAY)} · attentes ${expect.label} (${signed(expect.moodOffset)} humeur)`),row('economy-parts','Composition',undefined,`Objets ${money(wealth.items)} · bâtiments ${money(wealth.structures)} · sols ${money(wealth.floors)}`),row('economy-coverage','Couverture',wealth.complete?'Complète':'Valeurs manquantes',`${wealth.unpricedPawnIds.length} personnes ; ${(wealth.unpricedPileIds?.length??0)+(wealth.unpricedPackedIds?.length??0)+(wealth.unpricedStructureIds?.length??0)} autres biens non évalués.`));}else rows.push(row('economy-adopt','Patrimoine',undefined,'La partie conserve ses règles historiques. Adopter le suivi part des biens présents.',[button('economy-enable','Activer le suivi économique',()=>send({type:'adopt-economy'}))]));}
 const events=source?.events??[];for(let i=events.length-1;i>=0;i--){const event=events[i]!;rows.push(row(`event-${i}`,`Jour ${1+Math.floor(event.tick/TICKS_PER_DAY)}`,event.message));}
 if(!events.length)rows.push(row('history-empty','Aucun événement consigné.'));
 return {id:'history',title:'Historique',rows,width:7.8,onClose:()=>void host?.panel(null)};
}

function foodEditor(id:number):void {
 const policy=currentWorld().foodPolicies.find(p=>p.id===id);if(!policy)throw Error('Ce régime n’existe plus.');
 let name=policy.name;const allowed=new Set(policy.allowed);
 const make=():NativePage=>detailPage(`food-policy-${id}`,policy.name,[
  {id:'food-name',label:'Nom du régime',input:{value:name,maxLength:60,onCommit:value=>{name=value;}}},
  row('food-users','Utilisateurs présents',currentWorld().pawns.filter(p=>p.foodPolicyId===id).map(p=>p.name).join(', ')||'Aucun','Modifier ce régime partagé affecte toutes les personnes qui l’utilisent.'),
  row('food-all','Aliments',undefined,undefined,[button('food-allow-all','Tout autoriser',()=>{for(const item of FOOD_ITEMS)allowed.add(item);open(make());}),button('food-deny-all','Tout interdire',()=>{allowed.clear();open(make());})]),
  ...FOOD_ITEMS.map(item=>row(`food-${item}`,ITEM_DEFINITIONS[item].label,undefined,undefined,[button(`food-${item}-toggle`,allowed.has(item)?'Autorisé':'Interdit',()=>{allowed.has(item)?allowed.delete(item):allowed.add(item);open(make());},{active:allowed.has(item)})])),
 ],[button('food-apply','Appliquer',async()=>{await send({type:'food-policy-update',policyId:id,name,allowed:[...allowed]});back();}),button('food-copy','Dupliquer',()=>inputPage(`food-copy-${id}`,'Dupliquer le régime',`${policy.name} copie`,value=>send({type:'food-policy-create',name:value,copyFromId:id}))),button('food-delete','Supprimer',()=>confirm(`food-delete-${id}`,'Supprimer ce régime ?',`La commande vérifie les utilisateurs et le régime de remplacement.`,()=>send({type:'food-policy-delete',policyId:id})))]);
 open(make());
}
function drugEditor(id:number):void {
 const policy=effectiveDrugPolicies265(currentWorld()).find(p=>p.id===id);if(!policy)throw Error('Cette politique n’existe plus.');
 let name=policy.name,beer:BeerPolicy265={...policy.beer};
 const booleans:readonly [keyof Pick<BeerPolicy265,'allowedForAddiction'|'allowedForJoy'|'allowScheduled'>,string][]=[['allowedForAddiction','Autoriser pour dépendance'],['allowedForJoy','Autoriser pour loisir'],['allowScheduled','Prise programmée']];
 const numbers:readonly [keyof Pick<BeerPolicy265,'daysFrequency'|'onlyIfMoodBelow'|'onlyIfJoyBelow'|'takeToInventory'>,string,number,number,number][]=[['daysFrequency','Fréquence en jours',1,.1,25],['onlyIfMoodBelow','Seulement si humeur inférieure (%)',100,1,100],['onlyIfJoyBelow','Seulement si loisir inférieur (%)',100,1,100],['takeToInventory','Quantité dans l’inventaire',1,0,3]];
 const make=():NativePage=>detailPage(`drug-policy-${id}`,policy.name,[
  {id:'drug-name',label:'Nom',input:{value:name,maxLength:60,onCommit:value=>{name=value;}}},row('drug-item','Substance','Bière','Les effets passent par une consommation physique ; ce réglage ne donne aucun objet.'),
  ...booleans.map(([key,label])=>row(`drug-${key}`,label,undefined,undefined,[button(`drug-${key}-toggle`,beer[key]?'Oui':'Non',()=>{beer={...beer,[key]:!beer[key]};open(make());},{active:beer[key]})])),
  ...numbers.map(([key,label,scale,min,max]):NativeRow=>({id:`drug-${key}`,label,input:{value:String(beer[key]*scale),kind:'number',onCommit:value=>{const n=Number(value);if(!Number.isFinite(n)||n<min||n>max||key==='takeToInventory'&&!Number.isInteger(n))throw Error(`Valeur attendue entre ${min} et ${max}.`);beer={...beer,[key]:n/scale};}}})),
 ],[button('drug-apply','Appliquer',async()=>{await send({type:'drug-policy-update',policyId:id,name,beer:{...beer}});back();}),button('drug-copy','Dupliquer',()=>inputPage(`drug-copy-${id}`,'Dupliquer',`${name} copie`,value=>send({type:'drug-policy-create',name:value,copyFromId:id}))),button('drug-default','Choisir par défaut',async()=>{await send({type:'drug-policy-default',policyId:id});back();}),button('drug-delete','Supprimer',()=>confirm(`drug-delete-${id}`,'Supprimer cette politique ?',policy.name,()=>send({type:'drug-policy-delete',policyId:id})))]);
 open(make());
}
function apparelEditor(id:number):void {
 const policy=currentWorld().apparelPolicies?.find(p=>p.id===id);if(!policy)throw Error('Cette tenue n’existe plus.');
 const items=new Set(policy.allowedItems),materials=new Set(policy.allowedMaterials);
 let minQuality=policy.minQuality,maxQuality=policy.maxQuality,minHitPointsPercent=policy.minHitPointsPercent,maxHitPointsPercent=policy.maxHitPointsPercent;
 const quality=(which:'min'|'max'):void=>choose(`quality-${which}`,'Qualité',(WEAPON_QUALITIES as readonly WeaponQuality[]).map(value=>({id:value,label:QUALITY_LABELS[value],active:value===(which==='min'?minQuality:maxQuality),choose:()=>{if(which==='min')minQuality=value;else maxQuality=value;}})),()=>open(make()));
 const make=():NativePage=>detailPage(`apparel-policy-${id}`,policy.label,[
  row('apparel-users','Utilisateurs présents',currentWorld().pawns.filter(p=>p.apparelPolicyId===id).map(p=>p.name).join(', ')||'Aucun','Appliquer modifie les filtres partagés ; les affectations, Auto et ports forcés sont indépendants.'),
  row('apparel-quality','Qualité',`${QUALITY_LABELS[minQuality]} → ${QUALITY_LABELS[maxQuality]}`,undefined,[button('apparel-min-quality','Minimum',()=>quality('min')),button('apparel-max-quality','Maximum',()=>quality('max'))]),
  {id:'apparel-min-hp',label:'PV minimum (%)',input:{value:String(minHitPointsPercent*100),kind:'number',onCommit:value=>{const n=Number(value);if(!Number.isFinite(n)||n<0||n>100)throw Error('Pourcentage de 0 à 100 requis.');minHitPointsPercent=n/100;}}},
  {id:'apparel-max-hp',label:'PV maximum (%)',input:{value:String(maxHitPointsPercent*100),kind:'number',onCommit:value=>{const n=Number(value);if(!Number.isFinite(n)||n<0||n>100)throw Error('Pourcentage de 0 à 100 requis.');maxHitPointsPercent=n/100;}}},
  ...(Object.keys(APPAREL) as ApparelItem[]).map(item=>row(`apparel-item-${item}`,APPAREL[item].label,undefined,undefined,[button(`apparel-item-${item}-toggle`,items.has(item)?'Autorisé':'Interdit',()=>{items.has(item)?items.delete(item):items.add(item);open(make());},{active:items.has(item)})])),
  ...APPAREL_POLICY_MATERIALS267.map(material=>row(`apparel-material-${material}`,apparelPolicyMaterialLabel267(material),undefined,undefined,[button(`apparel-material-${material}-toggle`,materials.has(material)?'Autorisée':'Interdite',()=>{materials.has(material)?materials.delete(material):materials.add(material);open(make());},{active:materials.has(material)})])),
 ],[button('apparel-apply','Appliquer',async()=>{if(WEAPON_QUALITIES.indexOf(minQuality)>WEAPON_QUALITIES.indexOf(maxQuality)||minHitPointsPercent>maxHitPointsPercent)throw Error('Le minimum dépasse le maximum.');await send({type:'apparel-policy-update',policyId:id,allowedItems:[...items],allowedMaterials:[...materials],minQuality,maxQuality,minHitPointsPercent,maxHitPointsPercent});back();}),button('apparel-copy','Copier les filtres confirmés',()=>inputPage(`apparel-copy-${id}`,'Copier la tenue',`${policy.label} copie`,label=>send({type:'apparel-policy-copy',policyId:id,label}))),button('apparel-rename','Renommer',()=>inputPage(`apparel-rename-${id}`,'Renommer la tenue',policy.label,label=>send({type:'apparel-policy-rename',policyId:id,label})))]);
 open(make());
}
function areaEditor():void {
 const world=currentWorld();
 open(detailPage('allowed-areas','Zones autorisées',[
  row('areas-help','Règles',`${world.allowedAreas?.length??0} / 10`,'Une zone vide équivaut à Sans restriction. Les trajets peuvent traverser le reste de la carte.'),
  ...(world.allowedAreas??[]).map(area=>row(`area-${area.id}`,area.label,`${area.cells.length} cases · #${area.color.toString(16).padStart(6,'0')}`,undefined,[
   button(`area-${area.id}-rename`,'Renommer',()=>inputPage(`area-rename-${area.id}`,'Nom de zone',area.label,label=>send({type:'allowed-area-settings',areaId:area.id,label}),undefined,64)),
   button(`area-${area.id}-color`,'Couleur',()=>{let draft=area.color.toString(16).padStart(6,'0');open(detailPage('area-color','Couleur de zone',[{id:'area-color-input',label:'Couleur hexadécimale',input:{value:draft,maxLength:7,onCommit:value=>{draft=value.replace(/^#/,'');}}}],[button('area-color-apply','Appliquer',async()=>{if(!/^[0-9a-fA-F]{6}$/.test(draft))throw Error('Six chiffres hexadécimaux requis.');await send({type:'allowed-area-settings',areaId:area.id,color:parseInt(draft,16)});areaEditor();})]));}),
   ...(host?.paintAllowedArea?[button(`area-${area.id}-expand`,'Agrandir',()=>host?.paintAllowedArea?.(area.id,true)),button(`area-${area.id}-shrink`,'Réduire',()=>host?.paintAllowedArea?.(area.id,false))]:[]),
   button(`area-${area.id}-paint`,'Rectangle par coordonnées',()=>paintAreaCoordinates(area.id)),
   button(`area-${area.id}-delete`,'Supprimer',()=>confirm(`area-delete-${area.id}`,'Supprimer cette zone ?',area.label,()=>send({type:'allowed-area-delete',areaId:area.id}))),
  ])),
 ],[button('area-new','Nouvelle zone',async()=>{await send({type:'allowed-area-create'});areaEditor();},{disabled:(world.allowedAreas?.length??0)>=10})]));
}
/** Coordinate entry is native and sends the same bounded rectangle command. */
function paintAreaCoordinates(areaId:number):void {
 const world=currentWorld();let fromX=latest?.selectedCell?.x??0,fromZ=latest?.selectedCell?.z??0,toX=fromX,toZ=fromZ,enabled=true;
 const make=():NativePage=>detailPage(`area-paint-${areaId}`,'Modifier la zone',[
  row('paint-mode','Opération',enabled?'Agrandir':'Réduire',undefined,[button('paint-toggle',enabled?'Ajouter les cases':'Retirer les cases',()=>{enabled=!enabled;open(make());})]),
  ...([['from-x','Début X',()=>fromX,(n:number)=>{fromX=n;},world.width],['from-z','Début Z',()=>fromZ,(n:number)=>{fromZ=n;},world.height],['to-x','Fin X',()=>toX,(n:number)=>{toX=n;},world.width],['to-z','Fin Z',()=>toZ,(n:number)=>{toZ=n;},world.height]] as const).map(([id,label,read,write,limit]):NativeRow=>({id,label,input:{value:String(read()),kind:'number',onCommit:value=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<0||n>=limit)throw Error(`Coordonnée de 0 à ${limit-1} requise.`);write(n);}}})),
 ],[button('paint-apply','Appliquer le rectangle',async()=>{await send({type:'allowed-area-paint',areaId,enabled,from:{x:fromX,z:fromZ},to:{x:toX,z:toZ}});areaEditor();})]);open(make());
}
function assignPanel(world:World):NativePage {
 const rows:NativeRow[]=[];
 for(const pawn of world.pawns.filter(p=>isColonist(p)&&!p.prisoner)){
  const food=world.foodPolicies.find(p=>p.id===pawn.foodPolicyId),apparel=world.apparelPolicies?.find(p=>p.id===pawn.apparelPolicyId),drug=effectiveDrugPolicies265(world).find(p=>p.id===pawn.drugPolicyId)??effectiveDrugPolicies265(world)[0]!;
   const controls=[button(`assign-food-${pawn.id}`,'Régime',()=>choose(`food-choice-${pawn.id}`,`${pawn.name} · alimentation`,currentWorld().foodPolicies.map(policy=>({id:`food-${policy.id}`,label:policy.name,active:currentPawn(pawn.id).foodPolicyId===policy.id,choose:()=>send({type:'food-policy-assign',pawnId:pawn.id,policyId:policy.id})})))),button(`assign-response-${pawn.id}`,'Hostilité',()=>choose(`response-${pawn.id}`,`${pawn.name} · réaction hostile`,(['flee','ignore','attack'] as const).map(response=>({id:response,label:{flee:'Fuir',ignore:'Ignorer',attack:'Attaquer'}[response],active:(currentPawn(pawn.id).hostilityResponse??'flee')===response,choose:()=>send({type:'hostility-response',pawnId:pawn.id,response})})))),button(`assign-area-${pawn.id}`,'Zone',()=>choose(`area-choice-${pawn.id}`,`${pawn.name} · zone autorisée`,[{id:0,label:'Sans restriction'},...(currentWorld().allowedAreas??[])].map(area=>({id:`area-${area.id}`,label:area.label,active:(currentPawn(pawn.id).allowedAreaId??0)===area.id,choose:()=>send({type:'assign-allowed-area',pawnId:pawn.id,areaId:area.id||null})}))))];
  if(world.schemaVersion>=90&&apparel){controls.push(button(`assign-apparel-${pawn.id}`,'Tenue',()=>choose(`apparel-choice-${pawn.id}`,`${pawn.name} · tenue`,(currentWorld().apparelPolicies??[]).map(policy=>({id:`apparel-${policy.id}`,label:policy.label,active:currentPawn(pawn.id).apparelPolicyId===policy.id,choose:()=>send({type:'apparel-policy-assign',pawnId:pawn.id,policyId:policy.id,automatic:!!currentPawn(pawn.id).apparelAutomation})})))),button(`assign-auto-${pawn.id}`,pawn.apparelAutomation?'Auto actif':'Auto inactif',()=>{const p=currentPawn(pawn.id);return send({type:'apparel-policy-assign',pawnId:p.id,policyId:p.apparelPolicyId??apparel.id,automatic:!p.apparelAutomation});},{active:!!pawn.apparelAutomation}),button(`assign-forced-${pawn.id}`,'Libérer le port forcé',()=>send({type:'apparel-clear-forced',pawnId:pawn.id})));}
  if(world.schemaVersion>=265)controls.push(button(`assign-drug-${pawn.id}`,'Drogues',()=>choose(`drug-choice-${pawn.id}`,`${pawn.name} · drogues`,effectiveDrugPolicies265(currentWorld()).map(policy=>({id:`drug-${policy.id}`,label:policy.name,active:currentPawn(pawn.id).drugPolicyId===policy.id,choose:()=>send({type:'drug-policy-assign',pawnId:pawn.id,policyId:policy.id})})))));
  rows.push(row(`assign-${pawn.id}`,pawn.name,food?.name??'Régime inconnu',[apparel?.label,world.schemaVersion>=265?drug.name:'',pawn.allowedAreaId?world.allowedAreas?.find(a=>a.id===pawn.allowedAreaId)?.label:'Sans restriction',queryPawnStatus(world,pawn).reason].filter(Boolean).join(' · '),controls.map(c=>({...c,disabled:c.disabled||pawn.state==='dead'||!!pawn.health?.death||!!pawn.visitor}))));
 }
 rows.push(row('manage-food','Régimes alimentaires',undefined,undefined,[button('food-new','Nouveau régime',()=>inputPage('new-food','Nouveau régime','Nouveau régime',name=>send({type:'food-policy-create',name}))),...world.foodPolicies.map(policy=>button(`food-edit-${policy.id}`,policy.name,()=>foodEditor(policy.id)))]));
 if(world.apparelPolicies)rows.push(row('manage-apparel','Politiques de tenue',undefined,'Filtre des vêtements et matières, qualité, PV, copie et renommage.',world.apparelPolicies.map(policy=>button(`apparel-edit-${policy.id}`,policy.label,()=>apparelEditor(policy.id)))));
 if(world.schemaVersion>=265)rows.push(row('manage-drugs','Politiques de drogues',undefined,undefined,[button('drug-new','Nouvelle politique',()=>inputPage('new-drug','Nouvelle politique','Nouvelle politique',name=>send({type:'drug-policy-create',name}))),...effectiveDrugPolicies265(world).map(policy=>button(`drug-edit-${policy.id}`,policy.name,()=>drugEditor(policy.id)))]));
 rows.push(row('manage-areas','Zones autorisées',`${world.allowedAreas?.length??0} zones`,undefined,[button('areas-manage','Gérer les zones',areaEditor)]));
 return {id:'assign',title:'Assignations',rows,width:8.2,onClose:()=>void host?.panel(null)};
}

function questsPanel(state:NativeUiState):NativePage {
 const source=state.world??state.campaign,rows:NativeRow[]=[];
 if(!source)return {id:'quests',title:'Quêtes',rows:[row('quests-empty','Aucune partie active.')],onClose:()=>void host?.panel(null)};
 if(state.world){const world=state.world,eligible=!!world.gameProfile&&world.raids?.profile==='cassandra-raids-v1';
  if(!world.quests&&eligible)rows.push(row('quest-enable','Demandes d’asile',undefined,'Après activation, une première demande peut se présenter après huit jours de jeu.',[button('quest-enable-action','Recevoir des demandes',()=>send({type:'enable-quests'}))]));
  for(const quest of [...(world.quests?.entries??[])].reverse()){
   const controls:NativeControl[]=quest.status==='offered'?[button(`quest-${quest.id}-accept`,'Accueillir',()=>send({type:'answer-quest',questId:quest.id,accept:true}),{disabled:world.tick>=quest.expiresAt}),button(`quest-${quest.id}-refuse`,'Refuser sans pénalité',()=>send({type:'answer-quest',questId:quest.id,accept:false}),{disabled:world.tick>=quest.expiresAt})]:[];
   const detail=quest.status==='offered'?`Répondre sous ${days(quest.expiresAt-world.tick)} · arrivée ${days(quest.joinDelay)} et poursuite ${days(quest.raidDelay)} après acceptation. Un bandit au couteau poursuit cette personne.`:quest.arrivedAt!==undefined?'Personne arrivée ; la poursuite et son combat suivent leurs règles physiques.':'Dossier conservé.';
   rows.push(row(`quest-${quest.id}`,quest.name,({offered:'Offre en cours',accepted:'Acceptée',refused:'Refusée',expired:'Expirée',concluded:'Conclue'} as const)[quest.status],detail,controls));
   if(quest.relationship)rows.push(row(`quest-${quest.id}-relationship`,'Lien proposé',`${quest.relationship.kind} · personne #${quest.relationship.otherId}`));
   if(quest.background)rows.push(row(`quest-${quest.id}-background`,'Parcours',`${quest.background.childhood}${quest.background.adulthood?` · ${quest.background.adulthood}`:''}`));
  }
 }
 for(const request of [...(source.tradeRequests284?.entries??[])].reverse()){
  const content=tradeRequestContent284(request.family),familyLabel=content?.label??request.family,settlement=source.worldFactions?.settlements.find(s=>s.id===request.settlementId),access=source.worldFactions&&settlement?worldSettlementAccess256(source.worldFactions,request.settlementId):undefined,offered=request.status==='offered'&&source.tick*10<request.offerExpiresAtCore,available=offered&&!request.destinationLost&&!!access?.ok&&!!access.canTrade;
  const controls:NativeControl[]=[];
  if(offered){for(const option of request.options)controls.push(button(`trade-request-${request.id}-option-${option.id}`,`Accepter · récompense ${option.id}`,()=>confirm(`trade-answer-${request.id}`,'Accepter la demande commerciale',`${request.quantity} ${familyLabel} à livrer à ${request.settlementName}. Récompense : ${option.original.map(p=>`${p.quantity} ${ITEM_DEFINITIONS[p.item].label}`).join(', ')}${option.goodwill?` · relations +${option.goodwill}`:''}.`,()=>send({type:'trade-request-answer',requestId:request.id,optionId:option.id})),{disabled:!available}));controls.push(button(`trade-request-${request.id}-dismiss`,request.dismissed?'Réafficher la lettre':'Masquer la lettre',()=>send({type:'trade-request-dismiss',requestId:request.id,dismissed:!request.dismissed})));}
  rows.push(row(`trade-request-${request.id}`,`${request.quantity} ${familyLabel}`,`${request.settlementName} · case ${request.tile} · ${request.status}`,request.status==='accepted'?`Livrer avec une caravane sous ${days((request.expiresAtCore??source.tick*10)/10-source.tick)}.`:offered?`Offre sous ${days(request.offerExpiresAtCore/10-source.tick)} · durée de mission ${days(request.durationCore/10)}.`:request.closed?.reason,controls));
  for(const option of request.options)rows.push(row(`trade-request-${request.id}-reward-${option.id}`,`Récompense ${option.id}`,undefined,[...option.original.map(p=>`${p.quantity} ${ITEM_DEFINITIONS[p.item].label}${p.quality?` (${QUALITY_LABELS[p.quality]})`:''}`),option.goodwill?`Relations +${option.goodwill}`:''].filter(Boolean).join(' · ')));
 }
 for(const site of source.worldSites263?.entries??[])if(site.kind==='peace-talks'){const facts=peaceTalksFacts293(source,site);rows.push(row(`peace-${site.id}`,facts.title,facts.status,`${facts.destination} ${facts.body}`,[button(`peace-${site.id}-world`,'Monde',()=>host?.panel('world'))]));}
 rows.push(...nativeArrivalRows(state,host!));
 if(!rows.length)rows.push(row('quests-empty','Aucune quête signalée.'));
 return {id:'quests',title:'Quêtes',rows,width:7.8,onClose:()=>void host?.panel(null)};
}
function menuPanel(state:NativeUiState,actions:NativeUiActions):NativePage {
 const world=state.world,legacy:NativeRow[]=[];
 if(world){
  if(!world.climate)legacy.push(row('legacy-climate','Saisons et météo',undefined,'Activation prospective à l’heure actuelle ; aucune croissance passée ajoutée.',[button('legacy-climate-adopt','Activer les saisons',()=>send({type:'climate-adopt'}),{disabled:state.busy})]));
  if(!world.raids)legacy.push(row('legacy-raids','Raids du camp',undefined,'Calendrier historique : première attaque dans 3,5 à 4 jours, puis 6 à 8 jours après chaque issue.',[button('legacy-raids-adopt','Activer les raids',()=>send({type:'enable-raids'}),{disabled:state.busy})]));
  if(!world.raids?.mechanoid||world.schemaVersion>=197&&!world.raids.mechanoid.ranged)legacy.push(row('legacy-mech-raids','Raids mécaniques futurs',undefined,'Concurrence prospective aux occasions Cassandra à partir du jour 45. Aucun raid créé maintenant.',[button('legacy-mech-adopt','Admettre les raids mécaniques futurs',()=>send({type:'enable-mech-raids'}),{disabled:state.busy||world.schemaVersion<194||world.raids?.profile!=='cassandra-raids-v1'})]));
  if(!world.gameProfile&&!world.heatwaves)legacy.push(row('legacy-heatwaves','Canicules du camp',undefined,'Calendrier historique : première canicule dans 6 à 7 jours, sans exposition passée.',[button('legacy-heatwaves-adopt','Activer les canicules',()=>send({type:'enable-heatwaves'}),{disabled:state.busy})]));
 }
 return {id:'menu',title:'Menu',rows:[
  row('menu-game','Partie',undefined,state.fault,[button('menu-resume','Reprendre',()=>actions.panel(null),{disabled:!!state.fault}),button('menu-save','Sauvegarder',actions.save,{disabled:state.busy||!state.hasGame||!!state.fault}),button('menu-load','Charger',()=>actions.front('load'),{disabled:state.busy}),button('menu-export','Exporter',actions.exportSave,{disabled:state.busy||!state.hasGame||!!state.fault})]),
  row('menu-new','Autres actions',undefined,undefined,[button('menu-create','Nouvelle colonie',()=>actions.front('create'),{disabled:state.busy}),button('menu-home','Accueil',()=>actions.front('home'),{disabled:state.busy})]),
  ...state.saves.map(save=>row(`menu-save-${save.key}`,save.label,save.kind,save.detail)),
  ...legacy,
 ],onClose:()=>void actions.panel(null)};
}

/** Refresh confirmed readers while an owned native editor keeps its draft. */
export function syncNativePanelState(state:NativeUiState,actions:NativeUiActions):void {
 latest=state;host=actions;
 syncNativeWorldState(state,actions);
 const source=state.world??state.campaign,identity=state.world?`${state.world.seed}:${state.world.width}:${state.world.height}`:state.campaign?`campaign:${state.campaign.campaignSeed}`:'none';
 if(identity!==lastIdentity||(source&&source.tick<lastTick)){researchSelection=undefined;scheduleClipboard=undefined;scheduleRange=undefined;lastIdentity=identity;}
 lastTick=source?.tick??-1;
}
/** Builds data for native meshes. It never reads a legacy control or emits HTML. */
export function buildNativePanel(state:NativeUiState,actions:NativeUiActions):NativePage|null {
 syncNativePanelState(state,actions);
 if(state.panel===null)return null;
 if(state.panel==='menu')return menuPanel(state,actions);
 if(state.panel==='history')return historyPanel(state);
 if(state.panel==='quests')return questsPanel(state);
 if(state.panel==='world')return buildNativeWorld(state,actions);
 const world=state.world;
 if(!world)return {id:'no-local-map',title:'Carte locale nécessaire',rows:[row('no-local-map-message','Cette campagne n’a pas de carte locale active.')],onClose:()=>void actions.panel(null)};
 switch(state.panel){
  case 'architect':return architect(state,actions,world);
  case 'work':return workPanel(world);
  case 'schedule':return schedulePanel(world);
  case 'assign':return assignPanel(world);
  case 'animals':return animalsPanel(world);
  case 'wildlife':return wildlifePanel(state,world);
  case 'research':return researchPanel(world);
 }
}
