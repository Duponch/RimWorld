import type { apparelAppearance } from '../render/character-apparel';
import { BEARD_STYLES, HAIR_STYLES, HEAD_TYPES, type PawnAppearance } from '../sim/pawn-appearance';

type ApparelLook = Pick<ReturnType<typeof apparelAppearance>, 'signature' | 'color' | 'vest' | 'silhouette'>;
const CACHE_LIMIT = 256;
const cache = new Map<string, string>();
const hex = (color: number) => `#${(color & 0xffffff).toString(16).padStart(6, '0')}`;

function hairArt(shape: string, color: string): string {
  switch (shape) {
    case 'shaved': return `<path d="M29 30Q48 8 67 30" fill="none" stroke="${color}" stroke-width="3"/>`;
    case 'mohawk': return `<path d="M42 18L43 5L49 14L56 4L55 23Z" fill="${color}"/>`;
    case 'afro': return `<path d="M25 38Q18 26 27 20Q27 11 36 13Q43 4 50 12Q59 5 64 15Q75 16 70 29Q74 36 68 41L64 31Q48 23 31 31Z" fill="${color}"/>`;
    case 'bun': return `<circle cx="68" cy="27" r="10" fill="${color}"/><path d="M28 37Q27 13 49 14Q69 14 68 36L61 31Q45 25 33 36Z" fill="${color}"/>`;
    case 'tails': return `<path d="M30 28Q21 25 19 39L16 62Q27 60 31 47M66 28Q75 25 77 39L80 62Q69 60 65 47" fill="${color}"/><path d="M28 37Q26 13 49 14Q70 16 68 38L61 29Q45 23 32 35Z" fill="${color}"/>`;
    case 'long': return `<path d="M28 35Q24 17 39 14Q59 7 67 24L73 72Q66 77 61 69L62 31Q48 24 32 36L32 68Q25 75 22 69Z" fill="${color}"/>`;
    case 'curly': return `<path d="M28 40Q19 34 25 27Q22 20 31 18Q32 10 41 13Q47 8 52 14Q61 9 65 18Q73 21 69 28Q75 36 66 41L62 29Q48 22 33 31Z" fill="${color}"/>`;
    case 'wavy': return `<path d="M28 33Q22 17 37 15Q43 9 51 14Q67 8 69 27L72 58Q63 55 63 44L61 30Q53 24 48 30Q39 23 33 35L30 56Q21 57 24 48Z" fill="${color}"/>`;
    case 'bowl': return `<path d="M25 35Q24 12 48 13Q72 13 71 35L64 38L61 29H35L32 38Z" fill="${color}"/>`;
    case 'fringe': return `<path d="M27 33Q27 13 48 13Q68 13 69 33L59 30L54 36L47 29L39 36L34 29Z" fill="${color}"/>`;
    case 'messy': return `<path d="M27 36L22 23L32 25L30 13L40 20L47 10L53 19L64 13L64 25L73 24L67 39L61 29Q43 25 32 35Z" fill="${color}"/>`;
    case 'swept': return `<path d="M27 35Q25 18 38 15Q58 7 69 24L62 31Q51 29 45 23Q39 34 30 37Z" fill="${color}"/>`;
    default: return `<path d="M28 34Q26 15 45 14Q65 10 69 32L61 28Q46 24 32 35Z" fill="${color}"/>`;
  }
}

function beardArt(shape: string, color: string): string {
  switch (shape) {
    case 'full': return `<path d="M31 48Q34 67 48 70Q63 67 65 48L59 56Q48 61 37 56Z" fill="${color}"/>`;
    case 'long': return `<path d="M31 48Q34 66 43 69L48 82L54 69Q63 65 65 48L59 56Q48 62 37 56Z" fill="${color}"/>`;
    case 'goatee': return `<path d="M40 58Q48 62 56 58L52 70L48 74L44 70Z" fill="${color}"/><path d="M40 52Q48 48 56 52" fill="none" stroke="${color}" stroke-width="2"/>`;
    case 'moustache': return `<path d="M39 52Q44 48 48 52Q52 48 57 52L54 55L48 53L42 55Z" fill="${color}"/>`;
    case 'chops': return `<path d="M31 45L39 48L38 61Q31 60 31 45M65 45L57 48L58 61Q65 60 65 45" fill="${color}"/>`;
    case 'stubble': return `<path d="M32 50Q35 66 48 67Q61 66 64 50" fill="none" stroke="${color}" stroke-opacity=".45" stroke-width="4"/>`;
    default: return '';
  }
}

function makeSvg(appearance: PawnAppearance, look: ApparelLook): string {
  const skin = hex(appearance.skinColor), hair = hex(appearance.hairColor);
  const garment = hex(look.color ?? 0x789082);
  const head = HEAD_TYPES.find(entry => entry.id === appearance.headType);
  const hairShape = HAIR_STYLES.find(entry => entry.id === appearance.hair)?.shape ?? 'short';
  const beardShape = BEARD_STYLES.find(entry => entry.id === appearance.beard)?.shape ?? 'none';
  const narrow = head?.width === 'narrow';
  const jaw = head?.jaw === 'pointy' ? 4 : head?.jaw === 'wide' ? -3 : 0;
  const left = narrow ? 32 : 29, right = 96 - left;
  const chin = 67 + jaw;
  const shoulder = appearance.bodyType === 'Fat' ? 4 : appearance.bodyType === 'Thin' ? -5 : appearance.bodyType === 'Hulk' ? 6 : 0;
  const vest = look.vest ? '<path d="M28 74L39 67L48 88L57 67L68 74L65 96H31Z" fill="#455450" opacity=".82"/>' : '';
  const outer = look.silhouette >= 3 ? '<path d="M18 85L28 70L36 68L41 96H20ZM78 85L68 70L60 68L55 96H76Z" fill="#364b47" opacity=".55"/>' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" data-head="${appearance.headType}" data-hair="${appearance.hair}" data-beard="${appearance.beard}">
  <defs><linearGradient id="paper" x2="0" y2="1"><stop stop-color="#f4eee0"/><stop offset="1" stop-color="#d9d0b9"/></linearGradient></defs>
  <rect width="96" height="96" rx="8" fill="url(#paper)"/>
  <path d="M${24-shoulder} 96Q${26-shoulder} 72 38 70L58 70Q${70+shoulder} 72 ${72+shoulder} 96Z" fill="${garment}" stroke="#334b41" stroke-opacity=".35"/>
  ${outer}${vest}
  <path d="M41 62L55 62L56 74Q48 80 40 74Z" fill="${skin}"/>
  <path d="M${left} 36Q${left} 21 48 20Q${right} 21 ${right} 36L${right-2} 51Q${right-4} 62 48 ${chin}Q${left+4} 62 ${left+2} 51Z" fill="${skin}" stroke="#705d4d" stroke-opacity=".3"/>
  <path d="M36 43h7M53 43h7" stroke="#443b34" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M48 45L46 53L49 54" fill="none" stroke="#805f4a" stroke-opacity=".5" stroke-width="1.5"/>
  <path d="M42 59Q48 62 54 59" fill="none" stroke="#874e47" stroke-opacity=".65" stroke-width="1.4"/>
  ${beardArt(beardShape, hair)}${hairArt(hairShape, hair)}
  </svg>`;
}

/** One SVG data URL per persisted identity + apparel signature; safe to reuse across UI updates. */
export function portraitDataUrl(appearance: PawnAppearance, look: ApparelLook): string {
  const key = [appearance.version, appearance.sex, appearance.bodyType, appearance.headType,
    appearance.hair, appearance.beard, appearance.skinColor, appearance.hairColor,
    look.signature, look.color ?? '', look.vest, look.silhouette].join('|');
  const cached = cache.get(key);
  if (cached) return cached;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(makeSvg(appearance, look))}`;
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  cache.set(key, url);
  return url;
}

export function portraitCacheSize(): number { return cache.size; }
