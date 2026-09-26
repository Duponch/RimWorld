# Commerce des sculptures V105 — confrontation du 26 septembre 2026

## Sources et limite

La source principale est l'installation locale **RimWorld Core 1.6.4871 rev590** sous `E:/Steam/steamapps/common/RimWorld`. Les définitions `Data/Core/Defs/TraderKindDefs/TraderKinds_Visitor_Outlander.xml` et `Data/Core/Defs/ThingDefs_Buildings/Buildings_Art.xml` sont relues directement. Les règles locales de valeur et de panier sont dans `src/sim/room-market-value.ts`, `trade-prices.ts`, `trade-goods.ts` et `trade.ts`. Le corpus original `docs/reference/originals/Documentation_developpement.html`, chapitre commerce (§ panier de transaction), demande qualité, état, négociateur, disponibilités et confirmation atomique avec objets et argent revalidés.

La [documentation communautaire actuelle du commerce](https://rimworldwiki.com/wiki/Trade) et celle du [facteur de vente](https://rimworldwiki.com/wiki/Sell_Price_Multiplier), consultées le 26 septembre 2026, corroborent l'Art échangeable et le facteur sculpture ×1,1. Elles décrivent des familles de marchands plus larges que le visiteur local livré ; les définitions installées déterminent ici le profil précis.

## Constat Core et décision

`Visitor_Outlander_Standard` possède `StockGenerator_BuyTradeTag` avec `Art`, mais sa section **Buildings** ne génère aucun stock. `SculptureBase` est minifiable (`MinifiedThing`), porte `tradeTags Art` et `SellPriceFactor 1.10`. Les petites et grandes sculptures livrées par Lisière héritent de ces propriétés. Donc le petit visiteur **achète** les œuvres minifiées de la colonie ; il n'arrive **pas** avec de l'Art à vendre. Une œuvre précédemment vendue et encore dans son inventaire physique peut être rachetée pendant sa visite. Aucun type de marchand ni stock artistique initial n'est inventé en V105. Le commerce des meubles ordinaires n'est pas déduit du seul caractère minifiable : leurs tags et les autres profils Core diffèrent.

La valeur marchande d'une sculpture dépend de sa matière homogène, du `WorkToMake` propre à cette matière, de sa qualité et de ses PV restants. `structureRoomMarketValue` porte déjà cette valeur Core et son arrondi au-delà de 200. Le prix applique ensuite les facteurs existants du commerce : vente colonie ×0,6 ×1,1, achat ×1,4, puis amélioration Social du négociateur et arrondi unitaire déjà adopté en V88. Le ×1,1 est réservé à la **vente** ; l'argent est arrondi sur le solde du panier entier. Le marchand n'a que son argent physique fini, et une perte éventuelle demande une acceptation explicite.

## Contrat local adopté

Une ligne de panier `packedId` désigne exactement un objet et accepte seulement −1 ou +1. Seuls les paquets de sculpture au sol dans le foyer/une réserve et atteignables sont proposés à la vente. Les paquets portés, installés, réservés pour transport ou installation, ou hors zone de commerce sont exclus. Le rachat vise uniquement une sculpture dont le propriétaire est l'inventaire du marchand présent. Le paquet n'est jamais transformé en pile ni agrégé par matière. La cotation capture identité, taille, matière, qualité, dégâts, auteur/date, propriétaire, argent et prix ; une modification oblige à recoter.

La transaction utilise un brouillon du monde pour toutes les marchandises, œuvres, cases de dépôt et piles d'argent. Un achat de sculpture exige une case complète libre près du contact. Si le dernier dépôt échoue, aucune vente, aucun achat, aucun paiement ni compteur ne sont appliqués. Les reçus V105 ajoutent les caractéristiques factuelles des œuvres et les compteurs Art, en conservant les lignes et registres V88–V104. La sortie du visiteur archive son inventaire d'œuvres distinctement de ses piles. Cette provenance factuelle ne crée ni titre narratif ni récit Core.

Les ajouts de V105 concernent le commerce et la richesse globale ; ils ne changent pas les recettes, le tirage du petit visiteur, les probabilités de visites ni les anciennes sauvegardes. Les autres marchands, la majestueuse, la diplomatie et les récits d'Art restent hors lot.
