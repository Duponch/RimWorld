import { STONE_LABELS } from '../sim/geology';
import { DEFAULT_MAP_SIZE } from '../sim/map-config';
import { resolveSite, type SiteOptions } from '../sim/site';

interface SiteConfigurationOptions {
  seed: string;
  site: SiteOptions;
  onSeed: (seed: string) => void;
  onSite: (site: SiteOptions) => void;
  onError: (message: string) => void;
}

export function parseSiteSeed(seed: string): number | undefined {
  if (!/^\d+$/.test(seed.trim())) return undefined;
  const value = Number(seed);
  return Number.isSafeInteger(value) && value >= 0 && value <= 0xffffffff ? value : undefined;
}

export function randomSiteSeed(): string {
  return String(crypto.getRandomValues(new Uint32Array(1))[0]);
}

const reliefs: { value: SiteOptions['hilliness']; label: string; description: string }[] = [
  { value: 'flat', label: 'Plat', description: 'Davantage d’espace ouvert, moins de massifs et de filons.' },
  { value: 'small-hills', label: 'Petites collines', description: 'Des espaces ouverts entre des massifs rocheux dispersés.' },
  { value: 'large-hills', label: 'Grandes collines', description: 'Des massifs plus présents et davantage de filons potentiels.' },
];

/** A local configuration, not a preview of an ungenerated world tile. */
export function createSiteConfiguration(options: SiteConfigurationOptions): { element: HTMLElement; seedInput: HTMLInputElement } {
  let seed = options.seed;
  let site = { biome:'temperate-forest' as const,...options.site };
  const root = document.createElement('div');
  root.className = 'front-split front-configuration';
  root.innerHTML = `<section class="front-card front-site-controls"><p class="front-kicker">SITE LOCAL</p><h2>Choisir le terrain</h2>
    <p>Le milieu détermine la végétation et la faune ; le relief détermine la présence des massifs rocheux et des filons.</p><label for="front-biome">Milieu</label><select id="front-biome" aria-label="Milieu"><option value="temperate-forest">Forêt tempérée</option><option value="boreal-forest">Forêt boréale</option><option value="arid-shrubland">Broussailles arides</option></select><p id="front-biome-description" class="front-small"></p>
    <label class="front-seed-label" for="front-seed">Graine de la carte</label><div class="front-seed-row"><input id="front-seed" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" aria-describedby="front-seed-help"><button id="front-random-seed" type="button">Aléatoire</button></div>
    <p id="front-seed-help" class="front-small">Un entier entre 0 et 4 294 967 295. La graine et les réglages reproduisent la même carte dans cette version.</p>
    <fieldset class="front-relief-options"><legend>Relief</legend></fieldset>
    <p class="front-small front-site-default">Petites collines est la proposition de Lisière, pas un site imposé par RimWorld.</p>
    </section><section class="front-card front-summary"><p class="front-kicker">VOTRE SITE</p><h2 id="front-biome-title">Forêt tempérée</h2>
    <dl class="front-map-facts"><div><dt>Relief</dt><dd id="front-site-relief"></dd></div><div><dt>Rivière</dt><dd>Sans rivière</dd></div><div><dt>Roches locales</dt><dd id="front-site-stones" aria-live="polite"></dd></div><div><dt>Taille</dt><dd>${DEFAULT_MAP_SIZE} × ${DEFAULT_MAP_SIZE} cases</dd></div></dl>
    <p class="front-small">Trois profils locaux sont proposés. La planète et les cours d’eau restent à développer.</p>
    <dl class="front-start-summary"><div><dt>Scénario et équipe</dt><dd>Atterrissage forcé <span>Adaptation partielle · 3 personnes aux profils fixes</span></dd></div><div><dt>Narrateur et difficulté</dt><dd>Cassandra Classique <span>Introduction partielle · Récit d’aventure</span></dd></div><div><dt>Sauvegardes</dt><dd>Rechargeable à tout moment</dd></div></dl>
    <p class="front-small">Vous arrivez avec vos provisions et aucun bâtiment. La carte s’ouvre en pause pour vous laisser examiner les lieux.</p></section>`;
  const biomes={
    'temperate-forest':{label:'Forêt tempérée',description:'Feuillus, baies et gibier. Bois et nourriture sauvage complètent vos provisions.'},
    'boreal-forest':{label:'Forêt boréale',description:'Conifères, mousses et grands herbivores. Préparez chauffage, réserves et vêtements chauds.'},
    'arid-shrubland':{label:'Broussailles arides',description:'Végétation plus clairsemée, agaves et cactus. Choisissez vos ressources et protégez-vous de la chaleur.'},
  };
  const biomeSelect=root.querySelector<HTMLSelectElement>('#front-biome')!;
  biomeSelect.value=site.biome;
  biomeSelect.addEventListener('change',()=>{site={...site,biome:biomeSelect.value as keyof typeof biomes};options.onSite({...site});updateDescription();});
  const seedInput = root.querySelector<HTMLInputElement>('#front-seed')!;
  seedInput.value = seed;
  const fieldset = root.querySelector<HTMLFieldSetElement>('.front-relief-options')!;
  const reliefText = root.querySelector<HTMLElement>('#front-site-relief')!;
  const stones = root.querySelector<HTMLElement>('#front-site-stones')!;

  function updateDescription(): void {
    root.querySelector('#front-biome-title')!.textContent=biomes[site.biome].label;
    root.querySelector('#front-biome-description')!.textContent=biomes[site.biome].description;
    reliefText.textContent = reliefs.find(relief => relief.value === site.hilliness)!.label;
    const parsed = parseSiteSeed(seed);
    stones.textContent = parsed === undefined ? 'Saisissez une graine valide.' : resolveSite(parsed, site).stones.map(stone => STONE_LABELS[stone]).join(', ');
  }

  for (const relief of reliefs) {
    const row = document.createElement('label');
    row.className = 'front-relief';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = 'front-site-hilliness'; input.value = relief.value;
    input.checked = site.hilliness === relief.value;
    input.setAttribute('aria-label', relief.label);
    input.setAttribute('aria-describedby', `front-relief-${relief.value}-help`);
    const text = document.createElement('span');
    const label = document.createElement('strong'); label.textContent = relief.label;
    const description = document.createElement('span'); description.textContent = relief.description;
    description.id = `front-relief-${relief.value}-help`;
    text.append(label, description);
    row.append(input, text);
    fieldset.append(row);
    input.addEventListener('change', () => {
      site = { ...site,hilliness: relief.value };
      options.onSite({ ...site });
      updateDescription();
    });
  }
  seedInput.addEventListener('input', () => {
    seed = seedInput.value;
    seedInput.removeAttribute('aria-invalid');
    options.onSeed(seed);
    updateDescription();
  });
  root.querySelector<HTMLButtonElement>('#front-random-seed')!.addEventListener('click', () => {
    try {
      seed = randomSiteSeed();
      seedInput.value = seed;
      seedInput.removeAttribute('aria-invalid');
      options.onSeed(seed);
      updateDescription();
    } catch {
      options.onError('La génération aléatoire est indisponible. Vous pouvez saisir une graine.');
    }
  });
  updateDescription();
  return { element: root, seedInput };
}
