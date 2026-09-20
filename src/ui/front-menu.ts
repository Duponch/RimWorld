import { DEFAULT_MAP_SIZE } from '../sim/map-config';
import './front-menu.css';

export interface FrontMenuDraft {
  seed: number;
  size: number;
}

export interface FrontMenuSave {
  key: string;
  label: string;
  detail: string;
  disabled?: boolean;
}

export interface FrontMenuOptions {
  onStart: (draft: FrontMenuDraft) => Promise<void>;
  onLoad: (key: string) => Promise<void>;
  onResume: () => Promise<void>;
  getSaves: () => FrontMenuSave[];
}

export interface FrontMenu {
  showHome(hasGame?: boolean): void;
  setHasGame(hasGame: boolean): void;
  showCreation(): void;
  showLoad(): void;
  hide(): void;
  isOpen(): boolean;
  setBusy(busy: boolean, message?: string): void;
  showError(message: string): void;
}

type Page = 'home' | 'scenario' | 'story' | 'configuration' | 'load';
type Control = HTMLButtonElement | HTMLInputElement | HTMLSelectElement;

const scenery = `<svg class="front-landscape" viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="front-sky" x2="0" y2="1"><stop stop-color="#0c2329"/><stop offset=".6" stop-color="#647c71"/><stop offset="1" stop-color="#b5a27b"/></linearGradient>
    <linearGradient id="front-river" x2=".6" y2="1"><stop stop-color="#a7bcab"/><stop offset="1" stop-color="#364e48"/></linearGradient>
  </defs>
  <path fill="url(#front-sky)" d="M0 0h1440v1000H0z"/>
  <circle cx="412" cy="244" r="79" fill="#d6c89b" opacity=".65"/>
  <path fill="#819283" d="m0 510 174-118 101 36 207-179 105 140 120-65 182 214 182-110 269 135v437H0z"/>
  <path fill="#bbc0a4" opacity=".48" d="m409 312 73-63 105 140-104-90-28 45z"/>
  <path fill="#526e65" d="m0 541 126-44 144 108 189-119 180 85 180-149 239 194 178-107 204 76v415H0z"/>
  <path fill="#34544d" d="m0 603 102-26 211 157 215-142 234 120 166-108 210 71 302-46v371H0z"/>
  <path fill="url(#front-river)" d="m734 636-77 102 100 74-116 188h303L805 811l-92-89 39-86z"/>
  <path fill="#193e36" d="m0 747 213-73 191 89 156-19 69 76-89 180H0zm1440-69-204 40-156 128-222 154h582z"/>
  <g fill="#132e2a">
    <path d="m-42 778 78-186 75 186H67v43h49L36 640l-77 181H5v47h-47l78-166 80 166H67v132H5V778z"/>
    <path d="m89 856 71-164 71 164h-44v38h50l-77-151-80 151h52v106h55V856z"/>
    <path d="m211 1000 108-257 104 257zM327 816h-19v184h19z"/>
    <path d="m1169 940 79-207 86 207h-61v60h-45v-60zm121-139 83-219 92 219h-64v46h57l-85-183-81 183h56v153h53V801z"/>
  </g>
  <g fill="#d7b578" opacity=".85"><path d="m552 794 15-12 18 12v15h-33z"/><path d="m583 813 10-8 12 8v12h-22z"/></g>
  <path fill="#3b332a" d="m547 795 20-18 23 18-6 3-17-13-14 13zm31 19 15-13 16 13-5 3-11-10-10 10z"/>
</svg>`;

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function action(label: string, handler: () => void, className = ''): HTMLButtonElement {
  const button = element('button', className, label);
  button.type = 'button';
  button.addEventListener('click', handler);
  return button;
}

function unavailable(label: string, note = 'À venir'): HTMLButtonElement {
  const button = element('button', 'front-unavailable', label);
  button.type = 'button';
  button.disabled = true;
  button.title = `${label} : ${note.toLocaleLowerCase('fr')}`;
  button.append(element('span', 'front-choice-note', note));
  return button;
}

/** Presentation only: the caller owns pause acknowledgements, persistence and world publication. */
export function createFrontMenu(host: HTMLElement, options: FrontMenuOptions): FrontMenu {
  const root = element('section', 'front-menu');
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'front-title');
  root.innerHTML = `${scenery}<div class="front-shade" aria-hidden="true"></div>
    <header class="front-top"><span class="front-wordmark">LISIÈRE</span><span>Un simulateur de colonie</span></header>
    <div class="front-frame">
      <div class="front-heading"><p class="front-eyebrow"></p><h1 id="front-title" tabindex="-1"></h1><ol class="front-steps" aria-label="Étapes de création"></ol></div>
      <div class="front-content"></div>
      <div class="front-feedback"><p class="front-error" role="alert" hidden></p><p class="front-status" role="status" aria-live="polite" hidden></p></div>
      <footer class="front-footer"></footer>
    </div><div class="front-bottom"><span>LISIÈRE · EN DÉVELOPPEMENT</span><span class="front-pause-note"></span></div>`;
  host.append(root);

  const find = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const title = find<HTMLHeadingElement>('#front-title');
  const eyebrow = find<HTMLParagraphElement>('.front-eyebrow');
  const steps = find<HTMLOListElement>('.front-steps');
  const content = find<HTMLDivElement>('.front-content');
  const footer = find<HTMLElement>('.front-footer');
  const error = find<HTMLParagraphElement>('.front-error');
  const status = find<HTMLParagraphElement>('.front-status');
  const pauseNote = find<HTMLSpanElement>('.front-pause-note');
  let page: Page = 'home';
  let hasGame = false;
  let busy = false;
  let operationPending = false;
  let previousFocus: HTMLElement | null = null;
  let enabledBeforeBusy: Control[] = [];
  let seed = '';
  let difficultyChosen = false;
  let reloadChosen = false;
  let selectedSave: string | undefined;

  function clearError(): void {
    error.hidden = true;
    error.textContent = '';
  }

  function showError(message: string): void {
    error.textContent = message;
    error.hidden = false;
  }

  function setBusy(next: boolean, message = 'Préparation de la colonie…'): void {
    if (next && !busy) {
      enabledBeforeBusy = [...root.querySelectorAll<Control>('button, input, select')].filter(control => !control.disabled);
      for (const control of enabledBeforeBusy) control.disabled = true;
    } else if (!next && busy) {
      for (const control of enabledBeforeBusy) if (control.isConnected) control.disabled = false;
      enabledBeforeBusy = [];
    }
    busy = next;
    root.setAttribute('aria-busy', String(busy));
    status.hidden = !busy;
    status.textContent = busy ? message : '';
  }

  async function run(operation: () => Promise<void>, message: string): Promise<void> {
    if (busy || operationPending) return;
    operationPending = true;
    clearError();
    setBusy(true, message);
    try {
      await operation();
    } catch (cause) {
      showError(cause instanceof Error ? cause.message : 'L’opération a échoué. Vos choix et vos sauvegardes sont conservés.');
    } finally {
      operationPending = false;
      setBusy(false);
      if (!root.hidden && !root.contains(document.activeElement)) title.focus();
    }
  }

  function reveal(): void {
    if (root.hidden) previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root.hidden = false;
    pauseNote.textContent = hasGame ? 'COLONIE EN PAUSE' : '';
  }

  function navigate(next: Page): void {
    if (busy || operationPending) return;
    page = next;
    clearError();
    content.replaceChildren();
    footer.replaceChildren();
    steps.replaceChildren();
    root.dataset.page = page;
    eyebrow.textContent = page === 'home' ? 'UNE HISTOIRE À CONSTRUIRE' : page === 'load' ? 'VOS COLONIES' : 'NOUVELLE PARTIE';
    title.textContent = { home: 'Lisière', scenario: 'Choisir un scénario', story: 'Choisir votre histoire', configuration: 'Préparer le départ', load: 'Charger une partie' }[page];
    if (page !== 'home' && page !== 'load') {
      const active = ['scenario', 'story', 'configuration'].indexOf(page);
      ['Scénario', 'Histoire', 'Départ'].forEach((label, index) => {
        const item = element('li', index === active ? 'is-current' : '', `${index + 1}  ${label}`);
        if (index === active) item.setAttribute('aria-current', 'step');
        steps.append(item);
      });
    }
    if (page === 'home') renderHome();
    else if (page === 'scenario') renderScenario();
    else if (page === 'story') renderStory();
    else if (page === 'configuration') renderConfiguration();
    else renderLoad();
    reveal();
    title.focus({ preventScroll: true });
    content.scrollTop = 0;
  }

  function renderHome(): void {
    const intro = element('div', 'front-home-intro');
    intro.append(element('p', '', 'Trois vies. Un nouveau foyer.'), element('p', 'front-home-subtitle', 'À vous d’écrire la suite.'));
    const nav = element('nav', 'front-home-actions');
    nav.setAttribute('aria-label', 'Menu principal');
    if (hasGame) nav.append(action('Reprendre la colonie', () => { void run(options.onResume, 'Reprise de la colonie…'); }, 'front-primary'));
    nav.append(action('Nouvelle partie', showCreation, hasGame ? '' : 'front-primary'), action('Charger une partie', showLoad));
    const later = element('div', 'front-later');
    later.append(unavailable('Tutoriel'), unavailable('Options'), unavailable('Mods'), unavailable('Crédits'));
    nav.append(later);
    content.append(intro, nav);
  }

  function addNavigation(back: () => void, nextLabel?: string, next?: () => void): void {
    footer.append(action('Retour', back, 'front-back'));
    if (page !== 'load') footer.append(action('Annuler la création', () => navigate('home'), 'front-quiet'));
    if (nextLabel && next) footer.append(action(nextLabel, next, 'front-primary front-next'));
  }

  function renderScenario(): void {
    content.innerHTML = `<div class="front-split">
      <div class="front-choice-list" aria-label="Scénarios">
        <button type="button" class="front-scenario-selected" aria-pressed="true"><strong>Atterrissage forcé</strong><span>Trois personnes pour bâtir une colonie.</span><span class="front-tag">Adaptation partielle</span></button>
      </div>
      <article class="front-card front-scenario-detail"><p class="front-kicker">LE DÉPART CLASSIQUE</p><h2>Atterrissage forcé</h2>
        <p>Trois survivants arrivent dans une vallée inconnue. Vos provisions vous laissent le temps de choisir un abri, de vous installer et de préparer les prochaines récoltes.</p>
        <h3>Vos provisions</h3><dl class="front-supplies">
          <div><dt>Bois</dt><dd>300</dd></div><div><dt>Acier</dt><dd>450</dd></div><div><dt>Composants</dt><dd>30</dd></div>
          <div><dt>Rations de survie</dt><dd>50</dd></div><div><dt>Médicaments</dt><dd>30</dd></div><div><dt>Revolver et gilet</dt><dd>1 de chaque</dd></div>
        </dl><p class="front-small">Chaque personne porte une chemise en tissu. Vêtements complexes et Climatisation sont déjà connus.</p>
        <div class="front-limitation"><strong>Une adaptation encore partielle</strong><p>Le départ ne comprend pas encore l’argent, le fusil, le couteau, le casque, le pantalon de protection, l’animal domestique ou les provisions dispersées du scénario de référence. L’arrivée en capsules reste à venir.</p></div>
      </article></div>`;
    const list = find<HTMLDivElement>('.front-choice-list');
    list.append(unavailable('Tribu perdue'), unavailable('Le riche explorateur'), unavailable('Brutalité nue'), unavailable('Personnalisé'));
    addNavigation(() => navigate('home'), 'Suivant', () => navigate('story'));
  }

  function radioChoice(group: HTMLFieldSetElement, name: string, label: string, checked: boolean, disabled: boolean, onChange?: () => void): HTMLInputElement {
    const row = element('label', `front-radio${disabled ? ' front-radio-disabled' : ''}`);
    const input = element('input');
    input.type = 'radio';
    input.name = name;
    input.value = label;
    input.checked = checked;
    input.disabled = disabled;
    if (onChange) input.addEventListener('change', onChange);
    row.append(input, element('span', '', label));
    if (disabled) row.append(element('small', '', 'À venir'));
    group.append(row);
    return input;
  }

  function renderStory(): void {
    const split = element('div', 'front-story-layout');
    const narrator = element('article', 'front-card front-narrator');
    narrator.innerHTML = `<div class="front-narrator-mark" aria-hidden="true">C</div><p class="front-kicker">NARRATEUR</p><h2>Cassandra Classique</h2><span class="front-tag">Introduction partielle</span><p>Une installation, des rencontres et des menaces : Cassandra donne un rythme au début de la colonie.</p><p class="front-small">La suite du narrateur et la variété de ses événements restent incomplètes.</p>`;
    narrator.append(unavailable('Phoebe Amicale'), unavailable('Randy Aléatoire'));
    const choices = element('div', 'front-story-choices');
    const difficulty = element('fieldset', 'front-fieldset');
    difficulty.append(element('legend', '', 'Niveau d’aventure'));
    let difficultyInput: HTMLInputElement | undefined;
    for (const label of ['Pacifique', 'Bâtisseur de communauté', 'Récit d’aventure', 'Lutte pour la survie', 'De sang et de poussière', 'Perdre est amusant', 'Personnalisation en détail']) {
      const available = label === 'Récit d’aventure';
      const input = radioChoice(difficulty, 'front-difficulty', label, available && difficultyChosen, !available, () => { difficultyChosen = true; clearError(); });
      if (available) difficultyInput = input;
    }
    const help = element('p', 'front-choice-help', 'Récit d’aventure laisse de la marge pour établir votre colonie, tout en conservant des dangers. Les réglages s’appliquent aux systèmes présents ; le jeu de référence reste plus complet.');
    help.id = 'front-difficulty-help';
    difficultyInput!.setAttribute('aria-describedby', help.id);
    difficulty.append(help);
    const saving = element('fieldset', 'front-fieldset');
    saving.append(element('legend', '', 'Mode de sauvegarde'));
    const reloadInput = radioChoice(saving, 'front-save-mode', 'Rechargeable à tout moment', reloadChosen, false, () => { reloadChosen = true; clearError(); });
    reloadInput.setAttribute('aria-describedby', 'front-save-help');
    radioChoice(saving, 'front-save-mode', 'Engagement', false, true);
    const saveHelp = element('p', 'front-choice-help', 'Vous pouvez sauvegarder et revenir à une partie enregistrée dans ce navigateur.');
    saveHelp.id = 'front-save-help';
    saving.append(saveHelp);
    choices.append(difficulty, saving);
    split.append(narrator, choices);
    content.append(split);
    addNavigation(() => navigate('scenario'), 'Suivant', () => {
      if (!difficultyChosen || !reloadChosen) {
        showError(!difficultyChosen && !reloadChosen ? 'Choisissez Récit d’aventure et le mode de sauvegarde pour continuer.' : !difficultyChosen ? 'Choisissez un niveau d’aventure pour continuer.' : 'Choisissez le mode de sauvegarde pour continuer.');
        (!difficultyChosen ? difficultyInput : reloadInput)?.focus();
        return;
      }
      navigate('configuration');
    });
  }

  function readSeed(): number | undefined {
    if (!/^\d+$/.test(seed.trim())) return undefined;
    const value = Number(seed);
    return Number.isSafeInteger(value) && value >= 0 && value <= 0xffffffff ? value : undefined;
  }

  function randomizeSeed(): void {
    seed = String(crypto.getRandomValues(new Uint32Array(1))[0]);
  }

  function renderConfiguration(): void {
    content.innerHTML = `<div class="front-split front-configuration">
      <section class="front-card"><p class="front-kicker">CARTE LOCALE</p><h2>Une vallée tempérée</h2>
        <p>Le départ utilise pour l’instant un seul paysage : une vallée boisée avec une rivière. La planète et le choix du site viendront ensuite.</p>
        <label class="front-seed-label" for="front-seed">Graine de la carte</label><div class="front-seed-row"><input id="front-seed" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" aria-describedby="front-seed-help"><button id="front-random-seed" type="button">Aléatoire</button></div>
        <p id="front-seed-help" class="front-small">Un entier entre 0 et 4 294 967 295. Une même graine reproduit le même départ pour cette version.</p>
        <dl class="front-map-facts"><div><dt>Taille</dt><dd>${DEFAULT_MAP_SIZE} × ${DEFAULT_MAP_SIZE} cases</dd></div><div><dt>Milieu</dt><dd>Forêt tempérée · profil local partiel</dd></div><div><dt>Équipe</dt><dd>3 personnes · profils fixes</dd></div></dl>
        <p class="front-small">La sélection parmi huit candidats et leurs biographies ne sont pas encore disponibles.</p>
      </section><section class="front-card front-summary"><p class="front-kicker">VOTRE COLONIE</p><h2>Prêts à vous installer</h2>
        <dl><div><dt>Scénario</dt><dd>Atterrissage forcé <span>Adaptation partielle</span></dd></div><div><dt>Narrateur</dt><dd>Cassandra Classique <span>Introduction partielle</span></dd></div><div><dt>Difficulté</dt><dd>Récit d’aventure</dd></div><div><dt>Sauvegardes</dt><dd>Rechargeable à tout moment</dd></div></dl>
        <p class="front-small">Vous commencez avec trois personnes, vos provisions et aucun bâtiment. La carte s’ouvre en pause pour vous laisser examiner les lieux.</p>
      </section></div>`;
    const input = find<HTMLInputElement>('#front-seed');
    input.value = seed;
    input.addEventListener('input', () => { seed = input.value; input.removeAttribute('aria-invalid'); clearError(); });
    find<HTMLButtonElement>('#front-random-seed').addEventListener('click', () => {
      try {
        randomizeSeed();
        input.value = seed;
        input.removeAttribute('aria-invalid');
        clearError();
      } catch {
        showError('La génération aléatoire est indisponible. Vous pouvez saisir une graine.');
      }
    });
    addNavigation(() => navigate('story'), 'Démarrer', () => {
      const parsed = readSeed();
      if (parsed === undefined) {
        showError('La graine doit être un entier compris entre 0 et 4 294 967 295.');
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }
      void run(() => options.onStart({ seed: parsed, size: DEFAULT_MAP_SIZE }), 'Génération de la carte et préparation de la colonie…');
    });
  }

  function renderLoad(): void {
    let saves: FrontMenuSave[];
    try {
      saves = options.getSaves();
    } catch (cause) {
      saves = [];
      showError(cause instanceof Error ? cause.message : 'Les sauvegardes de ce navigateur ne sont pas accessibles.');
    }
    content.append(element('p', 'front-load-intro', 'Choisissez une sauvegarde, puis confirmez le chargement. La colonie sera ouverte en pause.'));
    const list = element('fieldset', 'front-save-list');
    list.append(element('legend', 'front-visually-hidden', 'Sauvegardes disponibles'));
    const loadButton = action('Charger', () => {
      if (selectedSave === undefined) return;
      const key = selectedSave;
      void run(() => options.onLoad(key), 'Vérification et chargement de la sauvegarde…');
    }, 'front-primary front-next');
    loadButton.disabled = true;
    selectedSave = undefined;
    for (const save of saves) {
      const row = element('label', `front-save${save.disabled ? ' front-save-disabled' : ''}`);
      const radio = element('input');
      radio.type = 'radio';
      radio.name = 'front-save';
      radio.value = save.key;
      radio.disabled = save.disabled ?? false;
      const text = element('span');
      text.append(element('strong', '', save.label), element('span', '', save.detail));
      if (save.disabled) text.append(element('span', 'front-save-unavailable', 'Indisponible'));
      radio.addEventListener('change', () => { selectedSave = save.key; loadButton.disabled = false; clearError(); });
      row.append(radio, text);
      list.append(row);
    }
    if (saves.length === 0) {
      const empty = element('div', 'front-empty');
      empty.append(element('span', 'front-empty-mark', '⌂'), element('h2', '', 'Aucune colonie enregistrée'), element('p', '', 'Vos sauvegardes apparaîtront ici après avoir commencé et enregistré une partie.'));
      content.append(empty);
    } else content.append(list);
    addNavigation(() => navigate('home'));
    footer.append(loadButton);
  }

  function showHome(nextHasGame = hasGame): void {
    if (busy || operationPending) return;
    hasGame = nextHasGame;
    navigate('home');
  }

  function setHasGame(next: boolean): void {
    hasGame = next;
    pauseNote.textContent = hasGame ? 'COLONIE EN PAUSE' : '';
  }

  function showCreation(): void {
    if (busy || operationPending) return;
    difficultyChosen = false;
    reloadChosen = false;
    seed = '';
    try { randomizeSeed(); } catch { /* Manual entry remains available. */ }
    navigate('scenario');
  }

  function showLoad(): void {
    navigate('load');
  }

  function hide(): void {
    root.hidden = true;
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  }

  root.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      if (busy || operationPending) return;
      if (page === 'configuration') navigate('story');
      else if (page === 'story') navigate('scenario');
      else if (page !== 'home') navigate('home');
      else if (hasGame) void run(options.onResume, 'Reprise de la colonie…');
    } else if (event.key === 'Tab') {
      const candidates = [...root.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter(node => node.getClientRects().length > 0);
      const first = candidates[0];
      const last = candidates.at(-1);
      if (!first || !last) {
        event.preventDefault();
        title.focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === title)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  for (const type of ['keyup', 'pointerdown', 'pointerup', 'click', 'dblclick', 'wheel'] as const) {
    root.addEventListener(type, event => event.stopPropagation());
  }

  return { showHome, setHasGame, showCreation, showLoad, hide, isOpen: () => !root.hidden, setBusy, showError };
}
