import type { JobKind } from '../sim/types';
import { scheduleLayout } from './schedule-controls';
import { foodPolicyLayout } from './food-policy-controls';
import { DEFAULT_MAP_SIZE, MAP_SIZE_PRESETS } from '../sim/map-config';

const mapSizeLabels: Record<number, string> = { 32: 'terrain d’essai', 64: 'compacte', 128: 'compacte', 200: 'petite', 250: 'moyenne' };

export type Tool = 'haul-chunks' | 'select' | Exclude<JobKind, 'sow'> | 'cancel' | 'stockpile' | 'remove-stockpile' | 'growing' | 'remove-growing';
export type Panel = 'architect' | 'work' | 'schedule' | 'assign' | 'history' | 'menu' | null;
export type ArchitectCategory = 'orders' | 'zones' | 'structure' | 'furniture' | 'temperature' | 'recreation' | 'production';
export const toolDefinitions: { id: Tool; icon: string; title: string; hint: string; key: string; category: ArchitectCategory }[] = [
  { id: 'select', icon: '↖', title: 'Inspecter', hint: 'Choisir une case ou un colon', key: 'Échap', category: 'orders' },
  { id:'mine',icon:'⚒',title:'Miner',hint:'Désigner les massifs à creuser. Les fragments restent au sol après extraction.',key:'M',category:'orders' },
  { id:'haul-chunks',icon:'▰',title:'Transporter les fragments',hint:'Désigner les fragments à ranger dans une réserve qui les accepte.',key:'',category:'orders' },
  { id: 'chop', icon: '♧', title: 'Abattre', hint: 'Cliquer ou tracer un rectangle sur les arbres à couper. Échap annule le tracé.', key: 'C', category: 'orders' },
  { id: 'harvest', icon: '⁙', title: 'Récolter', hint: 'Cliquer ou tracer un rectangle sur les plantes récoltables.', key: 'R', category: 'orders' },
  { id: 'cut', icon: '✂', title: 'Couper les plantes', hint: 'Libérer la case du buisson ; récupérer ses baies si elles sont récoltables.', key: '', category: 'orders' },
  { id:'uninstall',icon:'▣',title:'Désinstaller',hint:'Emballer un meuble pour le conserver et le déplacer.',key:'',category:'orders' },
  { id: 'deconstruct', icon: '⚒', title: 'Déconstruire', hint: 'Retirer un bâtiment par un travail de Construction. Environ la moitié des matériaux récupérée ; aucun remboursement pour le feu de camp.', key: '', category: 'orders' },
  { id: 'cancel', icon: '×', title: 'Annuler', hint: 'Cliquer ou tracer un rectangle pour retirer les ordres. Les matériaux restent sur place.', key: 'X', category: 'orders' },
  { id: 'wall', icon: '▥', title: 'Mur', hint: 'une case libre · mur de 2,80 m', key: 'B', category: 'structure' },
  { id: 'bed', icon: '▰', title: 'Lit', hint: 'empreinte 1 × 2 · Q / E pour tourner', key: 'L', category: 'furniture' },
  { id: 'table', icon: '▤', title: 'Table', hint: '1 × 2 · placer des tabourets contre le bord · Q / E pour tourner', key: '', category: 'furniture' },
  { id: 'horseshoes', icon: '∩', title: 'Fers à cheval', hint: '3 joueurs maximum · places de lancer à 5 cases avec vue dégagée', key: '', category: 'recreation' },
  { id: 'campfire', icon: '♨', title: 'Feu de camp', hint: 'combustible initial inclus · brûle 10 bois par jour', key: '', category: 'temperature' },
  { id: 'stonecutter', icon: '⚒', title: 'Table de taille de pierre', hint: '3 × 1 · Q / E pour tourner · fabrication de blocs à venir', key: '', category: 'production' },
  { id: 'stool', icon: '⊓', title: 'Tabouret', hint: '1 × 1 · une place par colon, adjacente à une table', key: '', category: 'furniture' },
  { id: 'growing', icon: '♧', title: 'Zone de culture', hint: 'Tracer un champ de riz. Semis sans graines et récolte à maturité, via le travail Culture.', key: '', category: 'zones' },
  { id: 'remove-growing', icon: '⊠', title: 'Retirer une culture', hint: 'Retirer la zone conserve les plantes déjà semées.', key: '', category: 'zones' },
  { id: 'stockpile', icon: '▧', title: 'Réserve', hint: 'Tracer un rectangle de stockage. Les cases occupées et les réserves existantes sont ignorées.', key: 'S', category: 'zones' },
  { id: 'remove-stockpile', icon: '⊠', title: 'Retirer', hint: 'Cliquer ou tracer un rectangle pour retirer des cases de réserve ; les objets restent au sol.', key: '', category: 'zones' },
];

export function storageSettings(prefix: string): string {
  return `<div class="storage-settings" id="${prefix}-settings">
    <div class="storage-filters"><label><input id="${prefix}-wood" type="checkbox" checked> Bois</label><label><input id="${prefix}-food" type="checkbox" checked> Nourriture</label><label><input id="${prefix}-steel" type="checkbox" checked> Acier</label><label><input id="${prefix}-chunk" type="checkbox"> Fragments de roche</label><label><input id="${prefix}-furniture" type="checkbox" checked> Meubles emballés</label></div>
    <label>Priorité de réserve<select id="${prefix}-priority"><option value="1">1 · basse</option><option value="2" selected>2 · normale</option><option value="3">3 · importante</option><option value="4">4 · critique</option></select></label>
    <label>Capacité (unités)<input id="${prefix}-capacity" type="number" min="1" max="75" step="1" value="75"></label>
  </div>`;
}

export function gameLayout(): string {
  const tabs = [
    ['architect', 'Architecte'], ['work', 'Travail'], ['schedule', 'Horaires'], ['assign', 'Affectations'],
    ['animals', 'Animaux'], ['wildlife', 'Faune'], ['research', 'Recherche'], ['quests', 'Quêtes'],
    ['world', 'Monde'], ['history', 'Historique'], ['factions', 'Factions'], ['menu', 'Menu'],
  ];
  return `<main class="game-shell">
    <div id="viewport" aria-label="Carte de la colonie en trois dimensions"></div>
    <header class="colonist-bar" aria-label="Colons"><div id="colonists"></div></header>
    <aside class="resource-list panel" aria-label="Ressources disponibles" title="Objets au sol et portés. Les matériaux déjà livrés aux chantiers sont comptés séparément.">
      <div class="resource-heading">Ressources</div>
      <div class="resource"><span class="resource-symbol wood">▤</span><span>Bois</span><strong id="wood">—</strong></div>
      <div class="resource"><span class="resource-symbol">▱</span><span>Acier</span><strong id="steel">—</strong></div>
      <div class="resource"><span class="resource-symbol food">⁙</span><span>Nutrition</span><strong id="food">—</strong></div>
      <div id="food-items"></div>
      <div id="material-status" class="material-status"></div>
      <div class="resource-foot"><span id="population">3</span> colons · <span id="map-size">${DEFAULT_MAP_SIZE} × ${DEFAULT_MAP_SIZE}</span></div>
    </aside>
    <span id="fps-counter" aria-live="off" title="Cadence du rendu, indépendante de la vitesse de simulation">— FPS</span>
    <div class="corner-tools"><span class="game-title">LISIÈRE</span><button id="help-open" aria-label="Ouvrir l’aide" title="Aide">?</button></div>
    <aside id="alerts" class="alerts" aria-label="Alertes de la colonie"></aside>
    <div id="pause-banner" hidden>EN PAUSE</div>
    <div id="notice" role="status" aria-live="polite" hidden></div>
    <div id="area-feedback" role="status" aria-live="polite" hidden></div>

    <section id="inspector" class="inspector panel" aria-label="Inspection" hidden></section>
    <section id="architect-panel" class="management-panel architect-panel panel" aria-label="Architecte" hidden>
      <div class="panel-heading"><h2>Architecte</h2><button data-close-panel aria-label="Fermer Architecte">×</button></div>
      <div class="architect-body"><nav class="architect-categories" aria-label="Catégories de construction">
        <button data-category="orders" class="active">Ordres</button><button data-category="zones">Zones</button>
        <button data-category="temperature">Température</button><button data-category="structure">Structure</button><button disabled>Sols</button><button data-category="furniture">Meubles</button>
        <button data-category="recreation">Loisirs</button><button data-category="production">Production</button><button disabled>Énergie</button><button disabled>Sécurité</button><button disabled>Température</button>
      </nav><div class="architect-content">
        <div class="tools">${toolDefinitions.map(tool => `<button data-tool="${tool.id}" data-tool-category="${tool.category}" title="${tool.hint}" aria-label="${tool.title}" aria-pressed="false" class="tool"><span class="tool-icon">${tool.icon}</span><span>${tool.title}</span><kbd>${tool.key}</kbd></button>`).join('')}</div>
        <p id="tool-instruction">Choisissez un ordre, puis cliquez sur la carte.</p>
        <label id="construction-material-controls" hidden>Matériau <select id="construction-material"><option value="wood">Bois</option><option value="steel">Acier</option></select></label>
        <div id="placement-controls" hidden><button id="rotate-building" aria-label="Tourner la construction">Tourner · E</button><span id="placement-orientation">0°</span></div>
        <div id="storage-options" hidden>${storageSettings('stockpile')}<p class="muted">Réglages appliqués à chaque case désignée. Une réserve de priorité plus élevée attire les objets.</p></div>
        <p class="muted" id="job-count">Aucun ordre en cours</p>
      </div></div>
    </section>
    <section id="work-panel" class="management-panel work-panel panel" aria-label="Travail" hidden>
      <div class="panel-heading"><h2>Travail</h2><button data-close-panel aria-label="Fermer Travail">×</button></div>
      <p>Priorités manuelles : <b>1</b> haute · <b>4</b> basse · <b>0</b> désactivée. Le transport livre aussi les chantiers.</p>
      <div class="work-table-wrap"><table><thead><tr><th>Colon</th><th>Collecte</th><th>Construction</th><th>Transport</th><th>Culture</th><th>Cuisine</th><th>Minage</th><th>Activité</th></tr></thead><tbody id="work-rows"></tbody></table></div>
    </section>
    ${scheduleLayout()}
    ${foodPolicyLayout()}
    <section id="history-panel" class="management-panel history-panel panel" aria-label="Historique" hidden>
      <div class="panel-heading"><h2>Historique</h2><button data-close-panel aria-label="Fermer Historique">×</button></div>
      <div id="journal-items"></div>
    </section>
    <section id="menu-panel" class="management-panel menu-panel panel" aria-label="Menu du jeu" hidden>
      <div class="panel-heading"><h2>Lisière</h2><button data-close-panel aria-label="Fermer Menu">×</button></div>
      <button id="save">Sauvegarder</button><button id="load">Recharger</button><button id="new-colony">Nouvelle colonie</button>
      <button id="restore-previous" disabled>Colonie précédente</button><button id="show-diagnostics">Afficher les diagnostics</button>
      <p class="muted">Sauvegarde locale à ce navigateur.</p>
    </section>

    <aside class="time-panel panel" aria-label="Temps de jeu">
      <div class="view-controls"><button id="wall-cutaway" aria-pressed="false" title="Coupe visuelle : les murs gardent leurs collisions">Murs : hauts</button><button id="foliage-toggle" aria-pressed="false" title="Masquer le feuillage pour voir les colons">Feuillage</button><button id="view-home" title="Recentrer sur la colonie">⌂</button></div>
      <div class="camera-controls"><button id="camera-mode" aria-pressed="false" title="Basculer en perspective ; glisser avec le bouton droit pour tourner">Vue : iso</button></div>
      <div id="clock">00:00</div><div id="day">Jour 1</div><div class="biome-label" title="Site tempéré provisoire. Saisons et météo à venir.">Forêt tempérée</div>
      <div class="time-controls" aria-label="Vitesse de simulation">
        <button data-speed="0" aria-label="Pause" title="Pause · Espace">Ⅱ</button><button data-speed="1" aria-label="Vitesse normale" title="1× · touche 1">▷</button>
        <button data-speed="3" aria-label="Vitesse 3 fois" title="3× · touche 2">▷▷</button><button data-speed="6" aria-label="Vitesse 6 fois" title="6× · touche 3">▷▷▷</button>
      </div>
    </aside>
    <div id="metrics" class="diagnostics" hidden></div>
    <nav class="main-tabs panel" aria-label="Gestion de la colonie">${tabs.map(([id, label]) => `<button data-panel="${id}" ${['architect', 'work', 'schedule', 'assign', 'history', 'menu'].includes(id) ? 'aria-pressed="false"' : 'disabled title="Fonctionnalité à venir"'}>${label}</button>`).join('')}</nav>
    <div id="loading" class="loading"><h1>LISIÈRE</h1><p>Préparation de votre colonie…</p></div>
    <dialog id="help" class="help-dialog"><form method="dialog"><button class="close" aria-label="Fermer l’aide">×</button></form><span class="section-label">CARNET DE SURVIE</span><h2>Votre première journée</h2>
      <p>Vous donnez les ordres. Les colons choisissent leurs tâches et se déplacent de façon autonome.</p>
      <ol><li><b>Architecte → Ordres</b> : récolter les baies et abattre les arbres ; les matériaux apparaissent au sol.</li><li><b>Architecte → Zones</b> : désigner des cases de réserve et choisir leurs filtres. Les transporteurs y regroupent les objets.</li><li><b>Architecte → Structure / Meubles</b> : poser des murs et des lits. Les matériaux doivent être livrés avant de construire. <b>Q / E</b> tourne le lit.</li><li><b>Travail</b> : régler collecte, construction et transport ; 1 est la plus forte priorité, 0 désactive.</li><li><b>Menu</b> : sauvegarder, recharger ou choisir la taille d'une nouvelle colonie.</li></ol>
      <p>Abattage, récolte, réserves et annulation : cliquer ou maintenir le bouton gauche pour tracer un rectangle. Les cases retenues sont surlignées. Relâcher applique ; Échap ou clic droit annule le tracé.</p>
      <p><b>Espace</b> : pause · <b>1 / 2 / 3</b> : vitesse · <b>Tab</b> : Architecte · <b>F1</b> : Travail · <b>F2</b> : Horaires · <b>Échap</b> : annuler le tracé, puis fermer · <b>Ctrl+S</b> : sauvegarder.</p>
      <p>Molette : zoom · glisser le bouton droit : tourner · bouton central ou flèches : déplacer la caméra. La coupe des murs sert à voir les intérieurs ; leurs obstacles restent en place.</p>
      <p class="muted">Inspectez un chantier pour comprendre son attente, ou une réserve pour modifier ses filtres. Horaires permet de régler les plages de travail et de sommeil. Un piquet de fers à cheval offre une autre famille de loisirs que l’observation du ciel. La santé et les pièces restent à développer. Les onglets grisés indiquent les domaines actuellement indisponibles.</p>
    </dialog>
    <dialog id="new-world-dialog" class="help-dialog"><form id="new-world-form"><button type="button" class="close" id="new-world-close" aria-label="Fermer la création">×</button><h2>Nouvelle colonie</h2>
      <label class="field">Graine<input id="world-seed" inputmode="numeric" type="number" min="0" max="4294967295" value="42" required></label>
      <label class="field">Taille de la carte<select id="world-size">${[32, ...MAP_SIZE_PRESETS].map(size => `<option value="${size}"${size === DEFAULT_MAP_SIZE ? ' selected' : ''}>${size} × ${size} · ${mapSizeLabels[size]} · ${(size * size).toLocaleString('fr-FR')} cases</option>`).join('')}</select></label>
      <p>La même graine et la même taille produisent le même terrain. La partie actuelle restera accessible avec « Colonie précédente ».</p>
      <p id="new-world-error" role="alert" hidden></p>
      <button type="submit" class="primary-action">Créer la colonie</button>
    </form></dialog>
  </main>`;
}
