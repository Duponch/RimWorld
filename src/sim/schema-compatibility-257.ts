/** Closed supported geographic schema range. Historical contracts stay literal. */
export const isSchema256Or257=(value:unknown):value is 256|257|258|259|260|261|262|263|264|265|266|267|268|269|270|271|272|273|274|275|276|277|278|279|280|281|282|283|284|285|286=>value===256||value===257||value===258||value===259||value===260||value===261||(Number(value)===262||Number(value)===263)||value===264||value===265||value===266||value===267||value===268||value===269||value===270||value===271||value===272||value===273||value===274||value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284||value===285||value===286;
/** Capabilities introduced in263 continue through286. This is a closed family:
 * neither a future schema nor fields introduced after each guarded contract are admitted here. */
export const isSchema263OrLater=(value:unknown):value is 263|264|265|266|267|268|269|270|271|272|273|274|275|276|277|278|279|280|281|282|283|284|285|286=>value===263||value===264||value===265||value===266||value===267||value===268||value===269||value===270||value===271||value===272||value===273||value===274||value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284||value===285||value===286;
/** Brewing capabilities remain literal on265 and continue on the supported286. */
export const isSchema265OrLater=(value:unknown):value is 265|266|267|268|269|270|271|272|273|274|275|276|277|278|279|280|281|282|283|284|285|286=>value===265||value===266||value===267||value===268||value===269||value===270||value===271||value===272||value===273||value===274||value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284||value===285||value===286;

/** Smithing capabilities introduced267 continue only on the supported286. */
export const isSchema267OrLater=(value:unknown):value is 267|268|269|270|271|272|273|274|275|276|277|278|279|280|281|282|283|284|285|286=>value===267||value===268||value===269||value===270||value===271||value===272||value===273||value===274||value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284||value===285||value===286;

/** Mace and crafting-fuel records continue through the supported closed family. */
export const isSchema269OrLater=(value:unknown):value is 269|270|271|272|273|274|275|276|277|278|279|280|281|282|283|284|285|286=>value===269||value===270||value===271||value===272||value===273||value===274||value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284||value===285||value===286;

/** Long blades continue only in the supported closed schema family. */
export const isSchema270OrLater=(value:unknown):value is 270|271|272|273|274|275|276|277|278|279|280|281|282|283|284|285|286=>value===270||value===271||value===272||value===273||value===274||value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284||value===285||value===286;

/** Civil/active clocks and actual cryptosleep owners remain a closed family. */
export const isSchema271OrLater=(value:unknown):value is 271|272|273|274|275|276|277|278|279|280|281|282|283|284|285|286=>value===271||value===272||value===273||value===274||value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284||value===285||value===286;

/** Spears introduced272 continue on the supported286 only. */
export const isSchema272OrLater=(value:unknown):value is 272|273|274|275|276|277|278|279|280|281|282|283|284|285|286=>value===272||value===273||value===274||value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284||value===285||value===286;

/** Industrial prostheses continue only through the supported closed family. */
export const isSchema273OrLater=(value:unknown):value is 273|274|275|276|277|278|279|280|281|282|283|284|285|286=>value===273||value===274||value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284||value===285||value===286;

/** Diplomatic gifts and hysteresis continue only through the supported family. */
export const isSchema274OrLater=(value:unknown):value is 274|275|276|277|278|279|280|281|282|283|284|285|286=>value===274||value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284||value===285||value===286;

/** Ship reactor capabilities have no historical or future admission. */
export const isSchema275OrLater=(value:unknown):value is 275|276|277|278|279|280|281|282|283|284|285|286=>value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284||value===285||value===286;

/** Hull/engine research continues only through the supported closed family. */
export const isSchema276OrLater=(value:unknown):value is 276|277|278|279|280|281|282|283|284|285|286=>value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284||value===285||value===286;

/** Spatial cryptosleep continues only through the supported closed family. */
export const isSchema277OrLater=(value:unknown):value is 277|278|279|280|281|282|283|284|285|286=>value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284||value===285||value===286;

/** Apparel reserve settings have no historical or future admission. */
export const isSchema278OrLater=(value:unknown):value is 278|279|280|281|282|283|284|285|286=>value===278||value===279||value===280||value===281||value===282||value===283||value===284||value===285||value===286;

/** Ordinary apparel inventory begins only in the current closed family. */
export const isSchema279OrLater=(value:unknown):value is 279|280|281|282|283|284|285|286=>value===279||value===280||value===281||value===282||value===283||value===284||value===285||value===286;

/** Therapeutic captive surgery begins only in the supported closed family. */
export const isSchema280OrLater=(value:unknown):value is 280|281|282|283|284|285|286=>value===280||value===281||value===282||value===283||value===284||value===285||value===286;

/** Natural stone floor smoothing begins only in this supported family. */
export const isSchema281OrLater=(value:unknown):value is 281|282|283|284|285|286=>value===281||value===282||value===283||value===284||value===285||value===286;

/** Prospective animal learning and local hauling remain a closed family. */
export const isSchema282OrLater=(value:unknown):value is 282|283|284|285|286=>value===282||value===283||value===284||value===285||value===286;

/** Explicit bill worker policies begin only in this supported family. */
export const isSchema283OrLater=(value:unknown):value is 283|284|285|286=>value===283||value===284||value===285||value===286;

/** World trade requests and prospective corpse-wear provenance are introduced284 and closed through286. */
export const isSchema284OrLater=(value:unknown):value is 284|285|286=>value===284||value===285||value===286;

/** Adult couple capabilities continue only through the supported family. */
export const isSchema285OrLater=(value:unknown):value is 285|286=>value===285||value===286;
