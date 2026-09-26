import type { apparelAppearance } from '../render/character-apparel';
import { appearanceOf, BEARD_STYLES, HAIR_STYLES, type BodyTypeId, type HairId } from '../sim/pawn-appearance';
import type { Pawn, World } from '../sim/types';
import { portraitDataUrl } from './pawn-portrait';

type ApparelLook = Pick<ReturnType<typeof apparelAppearance>, 'signature' | 'color' | 'vest' | 'silhouette'>;

const BODY_LABEL: Record<BodyTypeId, string> = {
  Male: 'silhouette moyenne', Female: 'silhouette moyenne', Thin: 'silhouette fine',
  Hulk: 'silhouette robuste', Fat: 'silhouette large',
};
const HAIR_LABEL: Record<HairId, string> = {
  Lackland: 'courts', Revolt: 'relevés', Pigtails: 'en couettes', Afro: 'crépus',
  Burgundy: 'coiffés de côté', Troubadour: 'longs', GreasySwoop: 'balayés', Cute: 'longs',
  Decent: 'longs', FancyBun: 'en chignon', Senorita: 'en chignon', Flowy: 'longs et souples',
  Long: 'longs', Mop: 'ébouriffés', Wavy: 'ondulés', Messy: 'désordonnés',
  Curly: 'bouclés', Fringe: 'avec frange', Frozen: 'longs', Ponytails: 'attachés',
  Bowlcut: 'au bol', Bravo: 'courts', Rockstar: 'longs', Snazzy: 'coiffés de côté',
  Shaved: 'rasés', Mohawk: 'en crête',
};

/** Refreshes only when the visual identity or equipped apparel actually changes. */
export function updatePawnAppearanceInspection(container: HTMLElement, world: World, pawn: Pawn, look: ApparelLook): void {
  const appearance = appearanceOf(pawn, world.seed);
  // ColonistInspector moves this node into the Bio panel after its first update.
  let section = container.querySelector<HTMLElement>('.appearance-inspection');
  if (!section) {
    section = document.createElement('section');
    section.className = 'appearance-inspection';
    section.setAttribute('aria-label', 'Apparence du personnage');
    const image = document.createElement('img');
    image.className = 'appearance-inspection-portrait';
    image.width = 72; image.height = 72;
    const detail = document.createElement('div');
    detail.className = 'appearance-inspection-detail';
    const title = document.createElement('strong'); title.textContent = 'Apparence';
    const description = document.createElement('p'); description.className = 'appearance-inspection-description';
    const note = document.createElement('small'); note.className = 'appearance-inspection-note';
    detail.append(title, description, note); section.append(image, detail); container.append(section);
  }
  const key = [pawn.id, pawn.name, pawn.appearance ? 'saved' : 'projection',
    appearance.version, appearance.sex, appearance.bodyType, appearance.headType,
    appearance.hair, appearance.beard, appearance.skinColor, appearance.hairColor,
    look.signature, look.color ?? '', look.vest, look.silhouette].join('|');
  if (section.dataset.appearanceKey === key) return;
  section.dataset.appearanceKey = key;
  const image = section.querySelector<HTMLImageElement>('.appearance-inspection-portrait')!;
  image.src = portraitDataUrl(appearance, look);
  image.alt = `Portrait de ${pawn.name}`;
  const hair = HAIR_STYLES.find(style => style.id === appearance.hair);
  const beard = BEARD_STYLES.find(style => style.id === appearance.beard);
  const beardText = beard && beard.shape !== 'none' ? ', barbe visible' : '';
  section.querySelector<HTMLElement>('.appearance-inspection-description')!.textContent =
    `${BODY_LABEL[appearance.bodyType]} · cheveux ${HAIR_LABEL[hair?.id ?? 'Lackland']}${beardText}`;
  section.querySelector<HTMLElement>('.appearance-inspection-note')!.textContent = pawn.appearance
    ? `Présentation visuelle ${appearance.sex === 'male' ? 'masculine' : 'féminine'}.`
    : 'Apparence de présentation pour une ancienne sauvegarde.';
}
