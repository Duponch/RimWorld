/** Closed supported geographic schema range. Historical contracts stay literal. */
export const isSchema256Or257=(value:unknown):value is 256|257|258|259|260|261|262|263|264|265|266|267|268|269|270|271|272|273|274|275|276|277|278|279|280|281|282|283|284=>value===256||value===257||value===258||value===259||value===260||value===261||(Number(value)===262||Number(value)===263)||value===264||value===265||value===266||value===267||value===268||value===269||value===270||value===271||value===272||value===273||value===274||value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284;
/** Capabilities introduced in263 continue through283. This is a closed family:
 * neither a future schema nor fields introduced after each guarded contract are admitted here. */
export const isSchema263OrLater=(value:unknown):value is 263|264|265|266|267|268|269|270|271|272|273|274|275|276|277|278|279|280|281|282|283|284=>value===263||value===264||value===265||value===266||value===267||value===268||value===269||value===270||value===271||value===272||value===273||value===274||value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284;
/** Brewing capabilities remain literal on265 and continue on the supported283. */
export const isSchema265OrLater=(value:unknown):value is 265|266|267|268|269|270|271|272|273|274|275|276|277|278|279|280|281|282|283|284=>value===265||value===266||value===267||value===268||value===269||value===270||value===271||value===272||value===273||value===274||value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284;

/** Smithing capabilities introduced267 continue only on the supported283. */
export const isSchema267OrLater=(value:unknown):value is 267|268|269|270|271|272|273|274|275|276|277|278|279|280|281|282|283|284=>value===267||value===268||value===269||value===270||value===271||value===272||value===273||value===274||value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284;

/** Mace and crafting-fuel records continue through the supported closed family. */
export const isSchema269OrLater=(value:unknown):value is 269|270|271|272|273|274|275|276|277|278|279|280|281|282|283|284=>value===269||value===270||value===271||value===272||value===273||value===274||value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284;

/** Long blades continue only in the supported closed schema family. */
export const isSchema270OrLater=(value:unknown):value is 270|271|272|273|274|275|276|277|278|279|280|281|282|283|284=>value===270||value===271||value===272||value===273||value===274||value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284;

/** Civil/active clocks and actual cryptosleep owners remain a closed family. */
export const isSchema271OrLater=(value:unknown):value is 271|272|273|274|275|276|277|278|279|280|281|282|283|284=>value===271||value===272||value===273||value===274||value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284;

/** Spears introduced272 continue on the supported283 only. */
export const isSchema272OrLater=(value:unknown):value is 272|273|274|275|276|277|278|279|280|281|282|283|284=>value===272||value===273||value===274||value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284;

/** Industrial prostheses continue only through the supported closed family. */
export const isSchema273OrLater=(value:unknown):value is 273|274|275|276|277|278|279|280|281|282|283|284=>value===273||value===274||value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284;

/** Diplomatic gifts and hysteresis continue only through the supported family. */
export const isSchema274OrLater=(value:unknown):value is 274|275|276|277|278|279|280|281|282|283|284=>value===274||value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284;

/** Ship reactor capabilities have no historical or future admission. */
export const isSchema275OrLater=(value:unknown):value is 275|276|277|278|279|280|281|282|283|284=>value===275||value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284;

/** Hull/engine research continues only through the supported closed family. */
export const isSchema276OrLater=(value:unknown):value is 276|277|278|279|280|281|282|283|284=>value===276||value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284;

/** Spatial cryptosleep continues only through the supported closed family. */
export const isSchema277OrLater=(value:unknown):value is 277|278|279|280|281|282|283|284=>value===277||value===278||value===279||value===280||value===281||value===282||value===283||value===284;

/** Apparel reserve settings have no historical or future admission. */
export const isSchema278OrLater=(value:unknown):value is 278|279|280|281|282|283|284=>value===278||value===279||value===280||value===281||value===282||value===283||value===284;

/** Ordinary apparel inventory begins only in the current closed family. */
export const isSchema279OrLater=(value:unknown):value is 279|280|281|282|283|284=>value===279||value===280||value===281||value===282||value===283||value===284;

/** Therapeutic captive surgery begins only in the supported closed family. */
export const isSchema280OrLater=(value:unknown):value is 280|281|282|283|284=>value===280||value===281||value===282||value===283||value===284;

/** Natural stone floor smoothing begins only in this supported family. */
export const isSchema281OrLater=(value:unknown):value is 281|282|283|284=>value===281||value===282||value===283||value===284;

/** Prospective animal learning and local hauling remain a closed family. */
export const isSchema282OrLater=(value:unknown):value is 282|283|284=>value===282||value===283||value===284;

/** Explicit bill worker policies begin only in this supported family. */
export const isSchema283OrLater=(value:unknown):value is 283|284=>value===283||value===284;

/** World trade requests and prospective corpse-wear provenance are closed to284. */
export const isSchema284OrLater=(value:unknown):value is 284=>value===284;
