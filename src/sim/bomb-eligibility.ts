/** Core reseeds Rand from Thing identity. This local integer avalanche is an
 * explicit adaptation, independent of the World RNG and stable above 32 bits. */
export function miniTurretExplosive(id:number):boolean {
  if(!Number.isSafeInteger(id)||id<1)return false;
  let n=(id>>>0)^Math.imul(Math.floor(id/0x100000000),0x9e3779b1)^0x68bc21eb;
  n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);n=(n^(n>>>15))>>>0;
  return n>0x80000000;
}
