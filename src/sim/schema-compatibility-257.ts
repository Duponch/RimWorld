/** Closed supported geographic schema range. Historical contracts stay literal. */
export const isSchema256Or257=(value:unknown):value is 256|257|258|259|260|261|262|263|264|265|266|267|268|269|270|271|272|273=>value===256||value===257||value===258||value===259||value===260||value===261||(Number(value)===262||Number(value)===263)||value===264||value===265||value===266||value===267||value===268||value===269||value===270||value===271||value===272||value===273;
/** Capabilities introduced in263 continue through273. This is a closed family:
 * neither a future schema nor fields introduced after each guarded contract are admitted here. */
export const isSchema263OrLater=(value:unknown):value is 263|264|265|266|267|268|269|270|271|272|273=>value===263||value===264||value===265||value===266||value===267||value===268||value===269||value===270||value===271||value===272||value===273;
/** Brewing capabilities remain literal on265 and continue on the supported273. */
export const isSchema265OrLater=(value:unknown):value is 265|266|267|268|269|270|271|272|273=>value===265||value===266||value===267||value===268||value===269||value===270||value===271||value===272||value===273;

/** Smithing capabilities introduced267 continue only on the supported273. */
export const isSchema267OrLater=(value:unknown):value is 267|268|269|270|271|272|273=>value===267||value===268||value===269||value===270||value===271||value===272||value===273;

/** Mace and crafting-fuel records continue through the supported closed family. */
export const isSchema269OrLater=(value:unknown):value is 269|270|271|272|273=>value===269||value===270||value===271||value===272||value===273;

/** Long blades continue only in the supported closed schema family. */
export const isSchema270OrLater=(value:unknown):value is 270|271|272|273=>value===270||value===271||value===272||value===273;

/** Civil/active clocks and actual cryptosleep owners remain a closed family. */
export const isSchema271OrLater=(value:unknown):value is 271|272|273=>value===271||value===272||value===273;

/** Spears introduced272 continue on the supported273 only. */
export const isSchema272OrLater=(value:unknown):value is 272|273=>value===272||value===273;
