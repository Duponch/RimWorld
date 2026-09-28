import { SCENARIOS, DEFAULT_SCENARIO } from '../sim/scenario-definitions';
import type { JobKind, WorkType } from '../sim/types';
import { scheduleLayout } from './schedule-controls';
import { foodPolicyLayout } from './food-policy-controls';
import { apparelAssignmentLayout } from './apparel-policy-controls';
import { DEFAULT_MAP_SIZE, MAP_SIZE_PRESETS } from '../sim/map-config';
import { ITEM_DEFINITIONS } from '../sim/items';
import { FLOOR_KINDS,FLOOR_DEFINITIONS,type BuildableFloorKind } from '../sim/flooring';

const mapSizeLabels: Record<number, string> = { 32: 'terrain d’essai', 64: 'compacte', 128: 'compacte', 200: 'petite', 250: 'moyenne' };

export type Tool = BuildableFloorKind | 'home' | 'remove-home' | 'ignore-roof' | 'haul-chunks' | 'select' | Exclude<JobKind, 'sow'|'repair'|'fix-breakdown'|'flick'|'lay-floor'> | 'cancel' | 'stockpile' | 'remove-stockpile' | 'growing' | 'remove-growing';
export type Panel = 'animals' | 'wildlife' | 'research' | 'architect' | 'work' | 'schedule' | 'assign' | 'history' | 'menu' | null;
export type ArchitectCategory = 'orders' | 'zones' | 'structure' | 'floors' | 'furniture' | 'temperature' | 'recreation' | 'production' | 'power';
/** Visible Core work order (naturalPriority), omitting Smithing and Tailoring
 * because Lisière has no distinct priorities for them. The same sequence owns
 * both headings and controls so a display-only reorder cannot shift a pawn's
 * actual work setting into another column. */
export const workColumns: readonly {id: WorkType; label: string}[] = [
  {id:'firefight',label:'Incendie'}, {id:'patient',label:'Patient'},
  {id:'doctor',label:'Médecin'}, {id:'bedrest',label:'Repos au lit'},
  {id:'basic',label:'Manutention'}, {id:'warden',label:'Geôlier'},
  {id:'handle',label:'Dressage'}, {id:'cook',label:'Cuisine'},
  {id:'hunt',label:'Chasse'}, {id:'build',label:'Construction'},
  {id:'grow',label:'Culture'}, {id:'mine',label:'Minage'},
  {id:'gather',label:'Foresterie'}, {id:'art',label:'Art'},
  {id:'craft',label:'Artisanat'}, {id:'haul',label:'Transport'},
  {id:'clean',label:'Nettoyage'}, {id:'research',label:'Recherche'},
];
export const toolDefinitions: { id: Tool; title: string; hint: string; key: string; category: ArchitectCategory }[] = [
  ...FLOOR_KINDS.map(id=>({id,title:FLOOR_DEFINITIONS[id].label,hint:`${FLOOR_DEFINITIONS[id].quantity} ${ITEM_DEFINITIONS[FLOOR_DEFINITIONS[id].item!].label} par case · Construction ${FLOOR_DEFINITIONS[id].skill}${FLOOR_DEFINITIONS[id].research==='stonecutting'?' · recherche Taille de pierre':FLOOR_DEFINITIONS[id].research==='smithing'?' · recherche Forge':''} · cliquer ou tracer un rectangle`,key:'',category:'floors' as const})),
  {id:'remove-floor',title:'Retirer le sol',hint:'Travail de Construction · récupère environ la moitié du matériau · conserve le terrain naturel',key:'',category:'floors'},
  {id:'grave',title:'Tombe',hint:'1 × 2 · creusée sans matériau · un corps · Q / E pour tourner',key:'',category:'furniture'},
  { id: 'select', title: 'Inspecter', hint: 'Choisir un colon, un objet ou une zone ; survoler le terrain pour le lire', key: 'Échap', category: 'orders' },
  { id:'mine',title:'Miner',hint:'Désigner les massifs à creuser. Les fragments restent au sol après extraction.',key:'M',category:'orders' },
  { id:'haul-chunks',title:'Transporter les fragments',hint:'Désigner les fragments à ranger dans une réserve qui les accepte.',key:'',category:'orders' },
  { id: 'chop', title: 'Abattre', hint: 'Cliquer ou tracer un rectangle sur les arbres à couper. Échap annule le tracé.', key: 'C', category: 'orders' },
  { id: 'harvest', title: 'Récolter', hint: 'Cliquer ou tracer un rectangle sur les plantes récoltables.', key: 'R', category: 'orders' },
  { id: 'cut', title: 'Couper les plantes', hint: 'Libérer la case ; récupérer le produit si la plante est récoltable.', key: '', category: 'orders' },
  { id:'uninstall',title:'Désinstaller',hint:'Emballer un meuble pour le conserver et le déplacer.',key:'',category:'orders' },
  { id: 'deconstruct', title: 'Déconstruire', hint: 'Retirer un bâtiment par un travail de Construction. Environ la moitié des matériaux récupérée ; aucun remboursement pour le feu de camp.', key: '', category: 'orders' },
  { id: 'cancel', title: 'Annuler', hint: 'Cliquer ou tracer un rectangle pour retirer les ordres. Les matériaux restent sur place.', key: 'X', category: 'orders' },
  { id:'door',title:'Porte',hint:'orientation automatique · ouverture au passage · choisir le matériau',key:'',category:'structure' },
  { id:'autodoor',title:'Porte automatique',hint:'Construction 6 · recherche Portes automatiques · 50 W · passage rapide sous courant, porte ordinaire sans courant',key:'',category:'structure' },
  { id: 'wall', title: 'Mur', hint: 'une case libre · mur de 2,80 m', key: 'B', category: 'structure' },
  { id: 'fence', title: 'Clôture', hint: '1 matériau par case · limite physique pour les herbivores errants', key: '', category: 'structure' },
  { id: 'fence-gate', title: 'Portillon', hint: '25 matériaux · accès nécessaire pour conduire les animaux dans un enclos', key: '', category: 'structure' },
  { id: 'pen-marker', title: 'Marqueur d’enclos', hint: '30 matériaux · désigne un enclos pour les herbivores errants', key: '', category: 'structure' },
  { id: 'bed', title: 'Lit', hint: 'empreinte 1 × 2 · Q / E pour tourner', key: 'L', category: 'furniture' },
  { id: 'table', title: 'Table', hint: '1 × 2 · placer des tabourets contre le bord · Q / E pour tourner', key: '', category: 'furniture' },
  { id:'table-square',title:'Table carrée',hint:'2 × 2 · 50 matériaux · Q / E pour tourner',key:'',category:'furniture'},
  { id:'table-long',title:'Table longue',hint:'2 × 4 · 95 matériaux · Q / E pour tourner',key:'',category:'furniture'},
  { id:'dining-chair',title:'Chaise de salle à manger',hint:'1 × 1 · 45 bois ou acier · Construction 4 · Mobilier complexe',key:'',category:'furniture'},
  { id:'armchair',title:'Fauteuil',hint:'1 × 1 · 110 tissu ou cuir léger · Construction 5 · Mobilier complexe',key:'',category:'furniture'},
  { id:'end-table',title:'Table de chevet',hint:'1 × 1 · améliore le confort du lit adjacent · Mobilier complexe',key:'',category:'furniture'},
  { id:'dresser',title:'Commode',hint:'2 × 1 · améliore les lits dans un rayon de 6 cases · Mobilier complexe',key:'',category:'furniture'},
  { id:'flower-pot',title:'Pot de fleurs',hint:'1 × 1 · 20 matériaux · l’hémérocalle doit être semée et entretenue',key:'',category:'furniture'},
  { id: 'horseshoes', title: 'Fers à cheval', hint: '3 joueurs maximum · places de lancer à 5 cases avec vue dégagée', key: '', category: 'recreation' },
  { id: 'chess-table', title: 'Table d’échecs', hint: '1 × 1 · 70 bois, métal ou pierre · Mobilier complexe · 2 joueurs maximum avec sièges adjacents', key: '', category: 'recreation' },
  {id:'heater',title:'Radiateur',hint:'50 acier, 1 composant · Construction 5 · 175 W · thermostat',key:'',category:'temperature'},
  {id:'wind-turbine',title:'Éolienne',hint:'7 × 2 · 100 acier, 2 composants · Construction 4 · couloir de vent dégagé · Q / E pour tourner',key:'',category:'power'},
  {id:'cooler',title:'Climatiseur',hint:'Faces bleue froide / rouge chaude · Construction 5 · Climatisation requise · Q/E : tourner',key:'',category:'temperature'},
  {id:'wood-generator',title:'Générateur à bois',hint:'2 × 2 · 1 000 W · réservoir vide à remplir · 22 bois/jour',key:'',category:'power'},
  {id:'power-conduit',title:'Câble électrique',hint:'1 acier par case · raccorde les bâtiments · peut passer sous un mur · aucun remboursement à la déconstruction',key:'',category:'power'},
  {id:'power-switch',title:'Interrupteur électrique',hint:'1 × 1 · coupe le réseau après intervention d’un colon · Travail : Manutention',key:'',category:'power'},
  {id:'battery',title:'Batterie',hint:'1 × 2 · 600 Wj · rendement de charge 50 % · recherche Batteries · Q / E pour tourner',key:'',category:'power'},
  {id:'solar-generator',title:'Générateur solaire',hint:'4 × 4 · jusqu’à 1 700 W au soleil · sans toit · Construction 6 · recherche Panneaux solaires',key:'',category:'power'},
  {id:'standing-lamp',title:'Lampe sur pied',hint:'30 W · raccordement à un réseau proche · n’éclaire que si alimentée',key:'',category:'furniture'},
  { id: 'passive-cooler', title: 'Refroidisseur passif', hint: 'combustible initial inclus · seuil de 17 °C · 10 bois/jour', key: '', category: 'temperature' },
  { id: 'campfire', title: 'Feu de camp', hint: 'combustible initial inclus · brûle 10 bois par jour', key: '', category: 'temperature' },
  {id:'research-bench',title:'Bureau de recherche simple',hint:'3 × 2 · 75 matériaux + 25 acier · Q / E pour tourner',key:'',category:'production'},
  {id:'tailor-bench',title:'Établi de tailleur',hint:'3 × 1 · 75 matériaux · nécessite Vêtements complexes',key:'',category:'production'},
  {id:'art-bench',title:'Atelier de sculpture',hint:'3 × 1 · 75 bois ou acier + 50 acier · manuel · petites et grandes sculptures · Q / E pour tourner',key:'',category:'production'},
  {id:'machining-table',title:'Atelier d’usinage',hint:'3 × 1 · 150 acier + 5 composants · 350 W · Construction 4 · Usinage',key:'',category:'production'},
  {id:'hi-tech-research-bench',title:'Bureau de recherche haute technologie',hint:'5 × 2 · 250 acier + 10 composants · 250 W · Construction 6 · Microélectronique',key:'',category:'production'},
  {id:'multi-analyzer',title:'Multi-analyseur',hint:'2 × 2 · 40 acier + 50 plastacier + 20 or + 8 composants · 200 W · Construction 8',key:'',category:'production'},
  {id:'fabrication-bench',title:'Établi de fabrication',hint:'5 × 2 · 200 acier + 12 composants + 2 composants avancés · 250 W · Construction 6',key:'',category:'production'},
  {id:'electric-tailor-bench',title:'Établi de tailleur électrique',hint:'3 × 1 · 75 matériaux + 50 acier + 2 composants · 120 W · Construction 4',key:'',category:'production'},
  {id:'crafting-spot',title:'Emplacement d’artisanat',hint:'Gratuit et immédiat · 60 tissus → tenue tribale · Q / E pour tourner',key:'',category:'production'},
  {id:'fueled-stove',title:'Cuisinière à bois',hint:'3 × 1 · 80 acier · consomme du bois pendant la cuisson · Q / E pour tourner',key:'',category:'production'},
  {id:'electric-stove',title:'Cuisinière électrique',hint:'3 × 1 · 80 acier, 2 composants · Construction 4 · 350 W · Q / E pour tourner',key:'',category:'production'},
  {id:'butcher-table',title:'Table de boucherie',hint:'3 × 1 · 95 bois · rendement du poste 100 % · Q / E pour tourner',key:'',category:'production'},
  {id:'butcher-spot',title:'Emplacement de boucherie',hint:'Gratuit et immédiat · dépouille fraîche → viande et cuir · rendement du poste 70 % · Q / E pour tourner',key:'',category:'production'},
  { id: 'stonecutter', title: 'Table de taille de pierre', hint: '3 × 1 · Q / E pour tourner · 1 fragment → 20 blocs · travail Artisanat', key: '', category: 'production' },
  { id: 'stool', title: 'Tabouret', hint: '1 × 1 · une place par colon, adjacente à une table', key: '', category: 'furniture' },
  { id: 'growing', title: 'Zone de culture', hint: 'Tracer un champ, puis choisir Riz ou Coton dans son inspection. Semis sans graines et récolte à maturité, via le travail Culture.', key: '', category: 'zones' },
  { id:'build-roof',title:'Construire un toit',hint:'Désigner la couverture à poser par les bâtisseurs. Aucun matériau requis ; supports nécessaires.',key:'',category:'zones' },
  { id:'remove-roof',title:'Retirer un toit',hint:'Retirer physiquement la couverture et empêcher son ajout automatique.',key:'',category:'zones' },
  { id:'ignore-roof',title:'Ignorer le toit',hint:'Effacer la zone de toiture sans changer la couverture déjà posée.',key:'',category:'zones' },
  { id: 'remove-growing', title: 'Retirer une culture', hint: 'Retirer la zone conserve les plantes déjà semées.', key: '', category: 'zones' },
  { id: 'stockpile', title: 'Réserve', hint: 'Tracer un rectangle de stockage. Les cases occupées et les réserves existantes sont ignorées.', key: 'S', category: 'zones' },
  { id:'home',title:'Zone de foyer',hint:'Tracer les cases où les bâtisseurs doivent entretenir les murs et portes endommagés.',key:'',category:'zones' },
  { id:'remove-home',title:'Retirer le foyer',hint:'Retire la permission de réparation sans démolir les ouvrages.',key:'',category:'zones' },
  { id: 'remove-stockpile', title: 'Retirer', hint: 'Cliquer ou tracer un rectangle pour retirer des cases de réserve ; les objets restent au sol.', key: '', category: 'zones' },
];

export function storageSettings(prefix: string): string {
  return `<div class="storage-settings" id="${prefix}-settings">
    <div class="storage-filters"><label><input id="${prefix}-silver" type="checkbox" checked> Argent</label><label><input id="${prefix}-unfinished" type="checkbox" checked> Ouvrages inachevés</label><label><input id="${prefix}-textile" type="checkbox" checked> Textiles</label><label><input id="${prefix}-apparel" type="checkbox" checked> Vêtements</label><label><input id="${prefix}-weapon" type="checkbox" checked> Armes</label><label><input id="${prefix}-medicine" type="checkbox" checked> Médicaments</label><label><input id="${prefix}-wood" type="checkbox" checked> Bois</label><label><input id="${prefix}-food" type="checkbox" checked> Nourriture</label><label><input id="${prefix}-component" type="checkbox" checked> Composants</label><label><input id="${prefix}-advanced-component" type="checkbox" checked> Composants avancés</label><label><input id="${prefix}-steel" type="checkbox" checked> Acier</label><label><input id="${prefix}-gold" type="checkbox" checked> Or</label><label><input id="${prefix}-plasteel" type="checkbox" checked> Plastacier</label><label><input id="${prefix}-blocks" type="checkbox" checked> Blocs de pierre</label><label><input id="${prefix}-chunk" type="checkbox"> Fragments de roche</label><label><input id="${prefix}-corpse" type="checkbox"> Dépouilles animales</label><label><input id="${prefix}-furniture" type="checkbox" checked> Meubles emballés</label></div>
    <label>Priorité de réserve<select id="${prefix}-priority"><option value="1">1 · basse</option><option value="2" selected>2 · normale</option><option value="3">3 · importante</option><option value="4">4 · critique</option></select></label>
    <label>Capacité (unités)<input id="${prefix}-capacity" type="number" min="1" max="${ITEM_DEFINITIONS.silver.stackLimit}" step="1" value="${ITEM_DEFINITIONS.silver.stackLimit}"></label>
    <div id="${prefix}-items"></div>
  </div>`;
}

export function gameLayout(): string {
  const tabs = [
    ['architect', 'Architecte'], ['work', 'Travail'], ['schedule', 'Planning'], ['assign', 'Assignations'],
    ['animals', 'Animaux'], ['wildlife', 'Faune'], ['research', 'Recherche'], ['quests', 'Quêtes'],
    ['world', 'Monde'], ['history', 'Historique'], ['factions', 'Factions'], ['menu', 'Menu'],
  ];
  return `<main class="game-shell">
    <div id="viewport" aria-label="Carte de la colonie en trois dimensions"></div>
    <header class="colonist-bar" aria-label="Colons"><div id="colonists"></div></header>
    <aside class="resource-list panel" aria-label="Ressources disponibles" title="Objets au sol et portés. Les matériaux déjà livrés aux chantiers sont comptés séparément.">
      <div class="resource-heading">Ressources</div>
      <div id="resources">
      <div class="resource"><span class="resource-symbol wood">▤</span><span>Bois</span><strong id="wood">—</strong></div>
      <div class="resource"><span class="resource-symbol">▱</span><span>Acier</span><strong id="steel">—</strong></div>
      <div class="resource" id="plasteel-stock" hidden><span class="resource-symbol">▱</span><span>Plastacier</span><strong id="plasteel">—</strong></div>
      <div class="resource" id="gold-stock" hidden><span class="resource-symbol">◆</span><span>Or</span><strong id="gold">—</strong></div>
      <div class="resource" id="cloth-stock" hidden><span class="resource-symbol">▤</span><span>Tissu</span><strong id="cloth">—</strong></div>
      <div class="resource"><span class="resource-symbol">⚙</span><span>Composants</span><strong id="component">—</strong></div><div class="resource"><span class="resource-symbol">¤</span><span>Argent</span><strong id="silver">—</strong></div>
      <div class="resource" id="advanced-component-stock" hidden><span class="resource-symbol">⚙</span><span>Comp. avancés</span><strong id="advanced-component">—</strong></div>
      <div class="resource"><span class="resource-symbol">✚</span><span>Médicaments</span><strong id="medicine">—</strong></div>
      <div class="resource"><span class="resource-symbol">▦</span><span>Blocs</span><strong id="blocks">—</strong></div>
      <div class="resource"><span class="resource-symbol food">⁙</span><span>Nutrition</span><strong id="food">—</strong></div>
      </div><div id="food-items"></div>
      <div id="material-status" class="material-status"></div>
      <div class="resource-foot"><span id="population">3</span> colons · <span id="map-size">${DEFAULT_MAP_SIZE} × ${DEFAULT_MAP_SIZE}</span></div>
    </aside>
    <span id="fps-counter" aria-live="off" title="Cadence du rendu, indépendante de la vitesse de simulation">— FPS</span>
    <div class="corner-tools"><span class="game-title">LISIÈRE</span><button id="help-open" aria-label="Ouvrir l’aide" title="Guide complet">?</button></div>
    <details class="learning-readout" aria-label="Conseils de jeu"><summary>Conseils</summary>
      <div class="learning-concepts"><p>Notions disponibles</p>
        <details><summary>Emploi du temps</summary><p>Planning règle les heures de travail, de loisir et de repos de chaque colon.</p><button data-guide-panel="schedule" type="button">Ouvrir Planning</button></details>
        <details><summary>Ordres sur la carte</summary><p>Dans Architecte, désignez les arbres à abattre et les plantes à récolter. Les colons exécutent ces ordres selon leurs priorités et leur accès.</p><button data-guide-panel="architect" type="button">Ouvrir Architecte</button></details>
        <details><summary>Recherche</summary><p>Choisissez un projet ; un colon affecté à la recherche pourra progresser à un bureau construit et utilisable.</p><button data-guide-panel="research" type="button">Ouvrir Recherche</button></details>
      </div>
    </details>
    <aside id="alerts" class="alerts" aria-label="Alertes de la colonie"><div id="status-alerts"></div><div class="alert-jumps"><button id="inspect-threat" hidden>Menace armée · voir</button><button id="inspect-fire" hidden>Incendie · voir</button></div></aside>
    <div id="pause-banner" hidden>EN PAUSE</div>
    <div id="notice" role="status" aria-live="polite" hidden></div>
    <div id="area-feedback" role="status" aria-live="polite" hidden></div>
    <aside id="map-hover-readout" aria-label="Informations sous le pointeur" aria-live="off" hidden></aside>
    <aside id="map-cell-details" aria-label="Détails de la case sous le pointeur" aria-live="off" hidden></aside>

    <section id="inspector" class="inspector panel" aria-label="Inspection" hidden></section>
    <section id="architect-panel" class="management-panel architect-panel panel" aria-label="Architecte" hidden>
      <div class="panel-heading"><h2>Architecte</h2><button data-close-panel aria-label="Fermer Architecte">×</button></div>
      <div class="architect-body"><nav class="architect-categories" aria-label="Catégories de construction">
        <button data-category="orders" class="active">Ordres</button><button data-category="zones">Zones</button>
        <button data-category="temperature">Température</button><button data-category="structure">Structure</button><button data-category="floors">Sols</button><button data-category="furniture">Meubles</button>
        <button data-category="recreation">Loisirs</button><button data-category="production">Production</button><button data-category="power">Énergie</button><button disabled>Sécurité</button>
      </nav><div class="architect-content">
        <div class="tools">${toolDefinitions.map(tool => `<button data-tool="${tool.id}" data-tool-category="${tool.category}" title="${tool.hint}" aria-label="${tool.title}" aria-pressed="false" class="tool"><span class="tool-icon" aria-hidden="true"></span><span>${tool.title}</span><kbd>${tool.key}</kbd></button>`).join('')}</div>
        <div class="architect-options"><p id="tool-instruction">Choisissez un ordre, puis cliquez sur la carte.</p>
        <label id="construction-material-controls" hidden>Matériau <select id="construction-material"><option value="wood">Bois</option><option value="steel">Acier</option></select></label>
        <div id="placement-controls" hidden><button id="rotate-building" aria-label="Tourner la construction">Tourner · E</button><span id="placement-orientation">0°</span></div>
        <div id="storage-options" hidden>${storageSettings('stockpile')}<p class="muted">Réglages appliqués à chaque case désignée. Une réserve de priorité plus élevée attire les objets.</p></div>
        <p class="muted" id="job-count">Aucun ordre en cours</p></div>
      </div></div>
    </section>
    <section id="work-panel" class="management-panel work-panel panel" aria-label="Travail" hidden>
      <div class="panel-heading"><h2>Travail</h2><button data-close-panel aria-label="Fermer Travail">×</button></div>
      <p>Priorités manuelles : <b>1</b> haute · <b>4</b> basse · <b>0</b> désactivée. Le transport livre aussi les chantiers.</p>
      <div class="work-table-wrap"><table><thead><tr><th>Colon</th>${workColumns.map(column=>`<th data-work-heading="${column.id}">${column.label}</th>`).join('')}<th>Activité</th></tr></thead><tbody id="work-rows"></tbody></table></div>
    </section>
    ${scheduleLayout()}
    ${apparelAssignmentLayout(foodPolicyLayout())}
    <section id="animals-panel" class="management-panel panel" aria-label="Animaux domestiques" hidden><div class="panel-heading"><h2>Animaux domestiques</h2><button data-close-panel aria-label="Fermer">×</button></div><div id="animals-content"></div></section>
    <section id="wildlife-panel" class="management-panel panel" aria-label="Faune" hidden><div class="panel-heading"><h2>Faune</h2><button data-close-panel aria-label="Fermer Faune">×</button></div><div id="wildlife-content"></div></section>
    <section id="research-panel" class="management-panel panel" aria-label="Recherche" hidden><div class="panel-heading"><h2>Recherche</h2><button data-close-panel aria-label="Fermer Recherche">×</button></div><div id="research-content"></div></section>
    <section id="history-panel" class="management-panel history-panel panel" aria-label="Historique" hidden>
      <div class="panel-heading"><h2>Historique</h2><button data-close-panel aria-label="Fermer Historique">×</button></div>
      <div id="colony-economy"></div>
      <div id="journal-items"></div>
    </section>
    <section id="menu-panel" class="management-panel menu-panel panel" aria-label="Menu du jeu" hidden>
      <div class="panel-heading"><h2>Lisière</h2><button data-close-panel aria-label="Fermer Menu">×</button></div><p id="scenario-current" class="muted"></p><div id="climate-options"></div>
      <fieldset class="presentation-settings"><legend>Affichage</legend>
        <label class="presentation-setting"><span><strong id="textures-enabled-label">Textures 3D stylisées</strong><small id="textures-enabled-description">Détails peints des volumes 3D. Choix conservé dans ce navigateur.</small></span><input id="textures-enabled" type="checkbox" aria-labelledby="textures-enabled-label" aria-describedby="textures-enabled-description" checked></label>
        <label class="presentation-setting"><span><strong id="ground-grass-label">Tapis d’herbe</strong><small id="ground-grass-description">Brins décoratifs sur la terre visible. Désactivé : aucun brin ni traitement associé.</small></span><input id="ground-grass-enabled" type="checkbox" aria-labelledby="ground-grass-label" aria-describedby="ground-grass-description" checked></label>
      </fieldset>
      <fieldset class="presentation-settings audio-settings"><legend>Son</legend>
        <label class="presentation-setting"><span><strong id="sound-enabled-label">Effets sonores</strong><small id="sound-enabled-description">Bruitages spatialisés selon la caméra, sans musique. Choix conservé dans ce navigateur.</small></span><input id="sound-enabled" type="checkbox" aria-labelledby="sound-enabled-label" aria-describedby="sound-enabled-description" checked></label>
        <label class="presentation-setting"><span><strong id="sound-volume-label">Volume des effets</strong><small id="sound-volume-description">Réglage général des bruitages.</small></span><input id="sound-volume" type="range" min="0" max="100" step="1" value="75" aria-labelledby="sound-volume-label" aria-describedby="sound-volume-description"></label>
      </fieldset>
      <details class="legacy-scenario-settings"><summary>Événements d’une ancienne colonie</summary><p class="muted">Ces activations concernent seulement les sauvegardes historiques sans narrateur.</p><div class="legacy-event-controls"><button id="enable-arrivals">Activer les demandes d’accueil</button><button id="enable-raids">Activer les raids du camp</button><button id="enable-heatwaves">Activer les canicules du camp</button></div></details>
      <button id="save">Sauvegarder</button><button id="load">Recharger</button><button id="browse-saves">Charger une partie</button><button id="new-colony">Nouvelle colonie</button>
      <button id="return-home">Sauvegarder et accueil</button><button id="restore-previous" disabled>Colonie précédente</button><button id="show-diagnostics">Afficher les diagnostics</button>
      <p class="muted">Sauvegarde locale à ce navigateur.</p>
    </section>

    <aside class="time-panel panel" aria-label="Temps et commandes de vue">
      <div class="site-readout" aria-label="Conditions et date du site"><div id="outdoor-temperature" class="biome-label"></div><div id="weather" class="biome-label"></div><div id="clock">00:00</div><div id="day">Jour 1</div><div id="biome-current" class="biome-label" title="Milieu local. Climat et saisons indiqués dans le menu."></div></div>
      <div class="time-controls" aria-label="Vitesse de simulation">
        <button data-speed="0" aria-label="Pause" title="Pause · Espace">Ⅱ</button><button data-speed="1" aria-label="Vitesse normale" title="1× · touche 1">▷</button>
        <button data-speed="3" aria-label="Vitesse 3 fois" title="3× · touche 2">▷▷</button><button data-speed="6" aria-label="Vitesse 6 fois" title="6× · touche 3">▷▷▷</button>
      </div>
      <div class="view-controls" aria-label="Commandes de vue"><button id="wall-cutaway" aria-pressed="false" title="Coupe visuelle : les murs gardent leurs collisions">Murs : hauts</button><button id="roof-toggle" aria-pressed="false" title="Afficher la couverture ; masquer ne retire pas le toit">Toits : masqués</button><button id="foliage-toggle" aria-pressed="false" title="Masquer le feuillage pour voir les colons">Feuillage</button><button id="view-home" title="Recentrer sur la colonie">⌂</button></div>
      <div class="camera-controls"><button id="camera-mode" aria-pressed="false" title="Basculer en perspective ; glisser avec le bouton droit pour tourner">Vue : iso</button></div>
    </aside>
    <div id="metrics" class="diagnostics" hidden></div>
    <nav class="main-tabs panel" aria-label="Gestion de la colonie">${tabs.map(([id, label]) => `<button data-panel="${id}" ${['architect', 'work', 'schedule', 'assign', 'history', 'menu', 'research', 'wildlife', 'animals'].includes(id) ? 'aria-pressed="false"' : 'disabled title="Fonctionnalité à venir"'}>${label}</button>`).join('')}</nav>
    <div id="loading" class="loading"><h1>LISIÈRE</h1><p>Préparation de votre colonie…</p></div>
    <dialog id="help" class="help-dialog"><form method="dialog"><button class="close" aria-label="Fermer l’aide">×</button></form><span class="section-label">CARNET DE SURVIE</span><h2>Votre première journée</h2>
      <p>Vous donnez les ordres. Les colons choisissent leurs tâches et se déplacent de façon autonome.</p>
      <ol><li><b>Architecte → Ordres</b> : récolter les baies et abattre les arbres ; les matériaux apparaissent au sol.</li><li><b>Architecte → Zones</b> : désigner des cases de réserve et choisir leurs filtres. Les transporteurs y regroupent les objets.</li><li><b>Architecte → Structure / Meubles</b> : poser des murs et des lits. Les matériaux doivent être livrés avant de construire. <b>Q / E</b> tourne le lit.</li><li><b>Travail</b> : régler collecte, construction et transport ; 1 est la plus forte priorité, 0 désactive.</li><li><b>Menu</b> : sauvegarder, recharger ou choisir la taille d'une nouvelle colonie.</li></ol>
      <p>Abattage, récolte, réserves et annulation : cliquer ou maintenir le bouton gauche pour tracer un rectangle. Les cases retenues sont surlignées. Relâcher applique ; Échap ou clic droit annule le tracé.</p>
      <p><b>Espace</b> : pause · <b>1 / 2 / 3</b> : vitesse · <b>Tab</b> : Architecte · <b>F1</b> : Travail · <b>F2</b> : Planning · <b>Échap</b> : annuler le tracé, puis fermer · <b>Ctrl+S</b> : sauvegarder.</p>
      <p>Molette : zoom · glisser le bouton droit : tourner · bouton central ou flèches : déplacer la caméra. La coupe des murs sert à voir les intérieurs ; leurs obstacles restent en place.</p>
      <p class="muted">Inspectez un chantier pour comprendre son attente, ou une réserve pour modifier ses filtres. Planning permet de régler les plages de travail et de repos. Un piquet de fers à cheval offre une autre famille de loisirs que l’observation du ciel. Les onglets grisés indiquent les domaines actuellement indisponibles.</p>
    </dialog>
    <dialog id="new-world-dialog" class="help-dialog"><form id="new-world-form"><button type="button" class="close" id="new-world-close" aria-label="Fermer la création">×</button><h2>Nouvelle colonie</h2>
      <label class="field">Graine<input id="world-seed" inputmode="numeric" type="number" min="0" max="4294967295" value="42" required></label>
      <label class="field">Taille de la carte<select id="world-size">${[32, ...MAP_SIZE_PRESETS].map(size => `<option value="${size}"${size === DEFAULT_MAP_SIZE ? ' selected' : ''}>${size} × ${size} · ${mapSizeLabels[size]} · ${(size * size).toLocaleString('fr-FR')} cases</option>`).join('')}</select></label>
      <label class="field">Scénario<select id="world-scenario">${Object.entries(SCENARIOS).map(([id,s])=>`<option value="${id}"${id===DEFAULT_SCENARIO?' selected':''}>${s.label}</option>`).join('')}</select></label>
      <p id="scenario-description">${SCENARIOS[DEFAULT_SCENARIO].description}</p>
      <p>Un scénario, sa graine et sa taille reproduisent le même départ. Le site proposé est une vallée tempérée ; les autres biomes ne sont pas encore sélectionnables. La partie actuelle restera accessible avec « Colonie précédente ».</p>
      <p id="new-world-error" role="alert" hidden></p>
      <button type="submit" class="primary-action">Créer la colonie</button>
    </form></dialog>
  </main>`;
}
