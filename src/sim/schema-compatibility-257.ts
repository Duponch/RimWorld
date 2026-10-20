/** Closed supported geographic schema range. Historical contracts stay literal. */
export const isSchema256Or257=(value:unknown):value is 256|257|258|259|260|261|262|263|264|265=>value===256||value===257||value===258||value===259||value===260||value===261||(Number(value)===262||Number(value)===263)||value===264||value===265;
/** Capabilities introduced in263 continue through265. This is a closed family:
 * neither a future schema nor fields introduced after each guarded contract are admitted here. */
export const isSchema263OrLater=(value:unknown):value is 263|264|265=>value===263||value===264||value===265;
