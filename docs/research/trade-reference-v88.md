# Commerce du petit visiteur — référence V88

État : implémentation V88 validée dans le périmètre des [preuves](../history/validation-trade-v88.md). Périmètre : Core sans extensions, visiteur standard des étrangers, argent et objets physiques du catalogue Lisière. Cette étude ne certifie ni les autres marchands ni une économie complète.

## Corpus, version et sources

Lecture du chapitre 27 « Commerce et économie » du corpus via [reference-adoption](reference-adoption.md), puis des entrées **SYS-145**, **TEST-145** et **UI-032** du classeur original. Adoption : panier explicite, disponibilité revalidée et échange atomique. Adaptation : dialogue de contact avec un petit visiteur, inventaire et monnaie physiques ; marché mondial, caravanes et commerce orbital différés. Ces identifiants fixent un contrat fonctionnel, pas une preuve de parité déjà acquise.

Relecture ciblée le 20 septembre 2026 de l'installation locale **1.6.4871 rev590**, `E:/Steam/steamapps/common/RimWorld`, en lecture seule. Les fichiers de définitions et classes ne sont pas redistribués. Provenances numériques : `TraderKinds_Visitor_Outlander.xml`, `Stats_Basics_General.xml`, `Stats_Pawns_Social.xml`, `Difficulties.xml`, définitions des ressources, aliments, vêtements, armes et matériaux ; classes `TradeUtility`, `Tradeable`, `TradeDeal`, `StatWorker_MarketValue`, `StatWorker`, `StatPart_Quality`, `StatPart_Health`, `PawnCapacityFactor`, `StockGenerator*`, `ThingSetMaker_TraderStock`, `QualityUtility`, `PawnInventoryGenerator` et `RaceProperties` de l'assembly installé. Le relevé est celui de cette révision locale, pas la certification du dernier correctif public.

Recherche publique renouvelée sur les sources du développeur : [Trade interfaces, Tynan, 19 juin 2013](https://ludeon.com/blog/2013/06/trade-interfaces/) explique le panier, les stocks finis, la différence achat/vente et le refus d'insolvabilité à la confirmation ; [Alpha 13](https://ludeon.com/blog/2016/04/alpha-13-released/) situe l'arrivée des caravanes terrestres ; [Alpha 17](https://ludeon.com/blog/2017/05/alpha-17-on-the-road-released/) décrit notamment une ancienne révision des prix. Ce sont des sources primaires **historiques** : leurs anciens multiplicateurs et leur canal orbital ne remplacent pas les définitions et classes actuelles. Les descriptions communautaires servent à trouver les questions à vérifier, pas à combler silencieusement une règle absente.

## Valeur d'un objet et prix négocié

Relecture complémentaire de la chaîne actuelle `JobDriver_TradeWithPawn → Dialog_Trade → TradeDeal.TryExecute → Tradeable.ResolveTrade → Pawn_TraderTracker` : aucun apprentissage Social générique n'est déclenché par cette transaction. Lisière n'ajoute donc pas d'XP à la conclusion. La notification à la faction, le récit et la fin éventuelle d'une inspiration commerciale sont des effets distincts, encore partiels ou absents localement ; ce constat n'est pas extrapolé aux composants particuliers d'objets ni aux extensions.

Une valeur de marché n'est pas le prix payé par le marchand. La valeur dépend du vrai type d'objet, de sa matière fixe, de sa qualité et, pour certains objets seulement, de ses points de vie. Aucun prix générique n'est attribué à tout `food`, `weapon` ou `apparel`.

Sans valeur explicite, Core utilise les matériaux et le travail : valeur des coûts matériels + travail × **0,0036**, avec les multiplicateurs de matière du travail. Une recette calculable unique peut fournir ces coûts ; sinon la liste de coûts et la matière de l'objet les donnent. Les objets de Lisière dont la matière est fixe gardent cette matière : une chemise en tissu ne vaut pas une chemise abstraite sans matière. Les valeurs avant qualité et usure sont :

| Objet livré | Valeur de base | Particularité commerciale |
| --- | ---: | --- |
| Argent | 1 | Monnaie, aucune marge achat/vente |
| Bois ; acier ; tissu ; cuir léger | 1,2 ; 1,9 ; 1,5 ; 1,9 | Le visiteur accepte le tissu, pas les trois autres |
| Composant | 32 | Accepté par ce visiteur |
| Herbes médicinales ; médicament ; médicament avancé | 10 ; 18 ; 50 | Seul le médicament industriel figure dans son profil |
| Baies ; riz/pomme de terre/maïs ; viande de lièvre | 1,2 ; 1,1 ; 2 | Refus du petit visiteur |
| Repas simple ; ration de survie | 15 ; 24 | Repas simple non revendable ; ration acceptée |
| Blocs des cinq pierres | 0,9 | Non revendables dans Core ; pas de rachat implicite |
| Tenue tribale en tissu ; chemise en tissu | 96,48 ; 77,22 | La tenue est revendable mais jamais générée pour vente par le marchand |
| Gilet pare-balles | 223,4 | Arrondi normal intact à225 ; hors catégorie du petit visiteur |
| Revolver ; fusil à verrou | 135,4 ; 253,2 | Fusil normal intact arrondi à255 ; revente des armes ×0,20 supplémentaire |
| Couteau en plastacier | 284,256 | Arrondi normal intact à285 ; ce visiteur n'achète ni ne vend les armes de mêlée |

Les qualités déplorable, médiocre, normal, bon, excellent, chef-d'œuvre et légendaire donnent respectivement ×0,5 /0,75 /1 /1,25 /1,5 /2,5 /5. Les gains des quatre dernières qualités sont plafonnés à500 /1000 /2000 /3000. La qualité précède l'usure ; le résultat supérieur à200 est ensuite arrondi au multiple de cinq le plus proche, avec les moitiés vers l'entier pair.

La courbe d'usure relie les points `(fraction PV, multiplicateur)` : `(0,0)`, `(0,5;0,1)`, `(0,6;0,5)`, `(0,9;1)`, puis reste à1. Elle concerne les armes et vêtements. Les ressources, aliments et médicaments examinés ont `healthAffectsPrice=false`, même quand ils ont des PV : un bois brûlé partiellement ne reçoit pas un faux rabais générique. Un aliment frais mais âgé ne reçoit pas de décote linéaire de pourriture ; une pile déjà pourrie n'est pas disponible. Les objets inachevés, dépouilles, paquets de mobilier et objets historiques sans profil commercial restent exclus dans cette tranche. Taint des vêtements, biocodage, traits d'armes, rechargements et effets d'extensions ne sont pas inventés.

Pour cette difficulté, la perte commerciale `L` vaut **0**. Pour un bonus final de négociation `B`, les prix sont :

- achat joueur : `max(0,5 ; valeur ×1,4 ×(1+L) ×(1−B))` ;
- vente joueur : `max(0,01 ; valeur ×0,6 ×SellPriceFactor ×(1−L) ×(1+B))` ; `SellPriceFactor=0,20` pour les armes,1 pour les autres objets considérés ;
- prix unitaire supérieur à99,5 : arrondi entier pair en cas de moitié ; prix de vente plafonné au prix d'achat ;
- argent : toujours1 ; somme du panier achat moins vente, puis **un seul arrondi entier du solde**, sans arrondir chaque unité bon marché avant la somme.

Le bonus du négociateur n'est pas son `SocialImpact`. Avec les capacités actuelles, sans titre de chef ni inspiration : `B=clamp(0 ;0,395 ;0,015×Social×(0,1+0,9×clamp01(Parole/0,95))×(0,1+0,9×clamp01(Audition/0,80)))`. Les tolérances de défaut sont respectivement5% et20%. Le titre de chef peut fournir un autre effet dans Core ; aucun titre n'est attribué artificiellement à nos colons. Les primes de vente des drogues/produits animaux, prix des établissements et circonstances hors de ce visiteur restent distinctes.

## Stock et objets acceptés par le visiteur

Le profil vérifié est **Visitor_Outlander_Standard**, pas un caravanier de gros. Les stocks matériels existants donnent50–250argent,−2–5composants (un tirage nul ou négatif ne crée rien),3–6rations de survie et1–6médicaments industriels. Chaque visite crée son stock une fois ; aucun renouvellement pendant la visite. Les réserves personnelles de nourriture sont séparées et ne sont pas proposées dans la fenêtre de vente.

Deux erreurs faciles sont évitées. Le générateur `MultiDef` tissu/chocolat n'a ici ni intervalle de quantité ni intervalle de valeur : sa quantité effective est **zéro**, même si ses deux types font partie de ce que le visiteur accepte. Les catégories de vente ne sont donc pas déduites des seules piles tirées. Par ailleurs `BuyExpensiveSimple` exclut explicitement armes, vêtements, médicaments et drogues ; son seuil15par unité de volume ne transforme pas un couteau ou du médicament avancé en marchandise acceptée. Les permissions générales de la définition s'appliquent aussi : un repas simple « achetable seulement » n'est pas revendable malgré sa valeur15.

La catégorie aléatoire d'arme à distance tire0–1objet parmi les **25** définitions Core admissibles ; celle de vêtements tire0–1objet parmi les **22** définitions Core admissibles (extensions désactivées). La pondération de sélection est une courbe de valeur abstraite :0→1,500→0,5,1500→0,2,5000→0,1. Toutes les positions absentes du catalogue Lisière gardent leur poids et produisent une absence, pas un revolver de remplacement. Les deux armes effectivement produites sont revolver/fusil ; le seul vêtement représentable est la chemise **si sa matière est réellement le tissu**, dont la commonalité est1,4sur3,875pour les29matières Core admissibles de cette chemise. Une sélection en laine ou cuir n'est pas convertie en tissu. La tenue tribale, de permission `Sellable`, ne fait pas partie des offres tirées ; le gilet n'a pas le tag `Clothing`.

Les vêtements/armes du stock prennent la distribution de qualité du générateur Trader : normale gaussienne de centre numérique2,5et largeur1, tronquée vers l'entier, bornée de normale à chef-d'œuvre. Lisière emploie son propre flux déterministe persisté ; cette correspondance de distributions ne reproduit pas la séquence de Unity. Les positions et poids des sélections manquantes sont conservés, mais les autres catégories absentes (canons renforcés, drogues récréatives, extensions, etc.) ne sont pas générées et aucun équivalent n'est distribué à leur place. Ce stock reste donc matériellement plus étroit que le stock Core.

La tenue et la chemise sont revendables à ce visiteur avec leurs vrais PV/qualité ; le tissu, les composants, les rations, les médicaments industriels et les deux armes à distance aussi. Le reste de notre table de valeurs n'est pas automatiquement une liste de ventes permises. Le couteau a une valeur de marché vérifiée et un usage possible ailleurs ; sa présence dans le catalogue ne change pas le profil du marchand.

## Provisions et conservation

Le parent `OutlanderBase` prévoit 2,55 nutrition. `PawnInventoryGenerator` choisit un repas simple 50 %, raffiné 25 %, ration 25 % si les aliments sont autorisés à la génération ; avec nutrition 0,9, l'arrondi aléatoire donne 2 ou 3 unités (3 avec probabilité 5/6). Ces objets sont marqués non vendables. **Adaptation annoncée V88** : le repas raffiné absent est remplacé par un repas simple dans les provisions personnelles seulement, en conservant les tirages ; ce remplacement n'élargit pas les marchandises. Pas de ration fictive renouvelée pour résoudre un trajet mal préparé.

Les piles sont des identités de `World.piles` avec propriétaire `inventory`, distinct de la cargaison de travail. La planification du stock est pure : identités et PRNG ne sont engagés qu'après validation de l'entrée physique. Le panier doit ensuite vérifier détenteur, disponibilité, provisions privées, santé du négociateur/contact, argent des deux côtés et place physique de sortie avant toute mutation. Scinder une pile garde ses âges/PV/qualité ; une vente n'est pas une production et une revente ne répare ni ne rafraîchit un objet. Ces exigences SYS/TEST-145 sont vérifiées centralement par la transaction ; le module de prix seul ne les garantit pas.

## Portée de la validation

`tests/trade-economy.test.ts` regroupe valeurs fabriquées, frontière d'usure, monnaie/arrondis, vrai refus des catégories et planification déterministe avec catégories manquantes. Il ne remplace pas le scénario de contact, échange physique, refus atomique et continuation du lot. Les valeurs de marché ne pilotent pas encore une richesse générale, les attentes, tous les budgets de raids ou une simulation économique mondiale. La disponibilité d'un fusil lors d'une visite demeure aléatoire, pas une échéance de progression promise.
