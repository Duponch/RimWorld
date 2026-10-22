# Demandes commerciales mondiales — référence du lot V462

22 octobre 2026. **V462 publiée, schéma284.** La [note de qualification](../gameplay/trade-requests-v462.md) donne les contrôles, reprises, publication et limites. Cette référence couvre une famille de quêtes et ses interactions avec production, habitants, équipement, inventaires, voyages, diplomatie et conservation. Elle ne ferme aucun ensemble ni l'audit des autres domaines Core.

## Sources et limites de la comparaison

Installation locale fraîchement relue : RimWorld **1.6.4871 rev590**, Core sans DLC ; assemblage `E:/Steam/steamapps/common/RimWorld/RimWorldWin64_Data/Managed/Assembly-CSharp.dll`, SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Définitions et méthodes ciblées lues dans cette installation ; aucun code, texte de quête ou asset propriétaire intégré au produit. Les faits numériques et règles ont une implémentation originale.

Les [notes officielles de la version1.2](https://ludeon.com/blog/2020/08/1-2-update-with-new-quests-psycasts-gear-and-more/) et des [raffinements1.2.2753](https://ludeon.com/blog/2020/09/update-1-2-2753-add-new-gear-new-permits-and-many-refinements/) ont été revérifiées sur Internet le22octobre. Elles situent les évolutions des quêtes et les changements ultérieurs ; les clauses détaillées ci-dessous proviennent des workers et définitions actuels, pas d'une extrapolation des annonces ou des DLC.

Ancrages primaires : `Core/Defs/QuestScriptDefs/Script_TradeRequest.xml`, `ThingSetMakerDefs/ThingSetMakers_Reward.xml`, `QuestNode_TradeRequest_GetRequestedThing`, `QuestNode_TradeRequest_RandomOfferDuration`, `QuestNode_TradeRequest_Initiate`, `PlayerItemAccessibilityUtility`, `QuestNode_GetNearbySettlement`, `TradeRequestComp`, `QuestGen_Rewards`, `RewardsGenerator`, `Reward_Items`, `Reward_Pawn`, `Reward_Goodwill`, `QuestPart_Choice`, `QuestPart_GiveToCaravan`, `CaravanInventoryUtility`, `WealthWatcher`, `PriceUtility`, `StatWorker_MarketValue`, `StatPart_Health`, `Apparel.Notify_PawnKilled/Notify_PawnResurrected`.

Les recherches privées du lot distinguent production/accessibilité, richesse, récompenses/propriétaires et provenance des vêtements. Elles corrigent notamment deux résumés préparatoires plus anciens : **l'accessibilité ne simule pas récursivement une chaîne de production**, et **la valeur abstraite sans Stuff n'est pas celle du DefaultStuff de travail**.

## Offre, produit et faisabilité

- Root TradeRequest : poids1,1, progression minimale8. L'occasion d'un autre root non représenté n'est pas redistribuée. Une adoption prospective ne rejoue aucune occasion passée.
- Vrai établissement non hostile visitable, distance mondiale approximative strictement inférieure à32, sans autre demande offerte/active liée à cette destination. Donneur issu de sa vraie faction. Pas de cible, chef, stock ou faction créés pour rendre l'offre possible.
- Sélection uniforme d'une **ThingDef admissible**, pas entre variantes de matière. Transportable/acquérable, valeur/masse de base≥5 ; pourriture initiale≥10jours ; aucun aliment humain, argent ou groupe explicitement exclu. Bière, croquettes et pemmican sont exclus comme HumanEdible ; sculptures minifiables refusées par alwaysHaulable. Les matières d'un même vêtement ou d'une même arme restent des bindings de famille, pas autant de tickets.
- Valeur souhaitée entière500–2500 inclus, courbe de richesse `(0;0,3),(50000;1),(300000;2)`, divisée par BaseMarketValue abstraite. Arrondi entier, puis multiple5 au-delà100 et multiple10 au-delà200. La valeur abstraite d'un produit àStuff utilise le coût de supposition2 quand Stuff est absent ; le travail d'une recette utilise séparément le DefaultStuff natif. Exemple : chemiseCollar99,72 abstrait, pas77,22 de la variante tissu.
- **PossiblyAccessible** : stock réel suffisant, sinon stock+potentiels indépendants. **PlayerCanMake** : une branche de potentiel doit avoir ajouté son marqueur. Un stock déjà présent ne remplace pas ce second test.
- Recensement récursif des vrais objets/cartes/caravanes contrôlées proches≤5 ; pas de récompense non reçue, archive terminale ou stock futur de marchand. Déconstruction, récolteNow/Soon, dépeçage et fonte ont des branches distinctes. Aucun potentiel de minage, tonte, traite, ponte ou fermentation passive ajouté par supposition.
- Atelier : colons libres vivants non à terre avec Crafting actif (`WorkIsActive`, priorité>0), postes réellement spawnés dédupliqués par ThingDef, recherches de recette et au moins une Thing non foggée pour chaque quota d'ingrédient. Pas de vérification de la quantité totale, réservation, chemin, facture, électricité ou compétence minimale dans ce prédicteur. Capacité `floor(N×27000/travailCore)` par fabrication et produit explicite ; les produits potentiels d'une recette ne deviennent jamais les ingrédients présents d'une autre.

Le calcul ne crée ni ne réserve rien. La vraie fabrication et la formation du fret continuent d'exiger les ressources, personnes, compétences, postes et déplacements déjà représentés.

## Deux délais et remise

L'offre laisse4–8jours pour accepter. Durée de mission tirée12–28jours à la génération de l'offre, puis minimum `ceil(max(t+6;1,35t))` où t est le trajet estimé en jours depuis le foyer sans vraie caravane. Recherche et arrivée génériques3300Core/mouvement dans ce chemin, distinctes de l'affichage3464 du planificateur. Minimum>28 : pas d'offre, sans destination de secours. L'échéance active part de l'acceptation ; un chargement ne retire ni n'ajoute du délai.

Remise dédiée et confirmée : même caravane immobile à l'établissement demandé, avant l'échéance stricte. Seulement ses inventaires humains/animaux, aucun bien porté/équipé ou prélevé ailleurs. Même famille, frais, Normal+ si qualité ; aucun minimum de PV ajouté. Les vêtements ne doivent pas avoir été portés par un cadavre. Aucun meilleur négociateur ou acte de vente n'est requis.

La quantité exacte est consommée, en parcourant l'ordre des membres puis chaque inventaire en sens inverse. Un fragment conserve une vraie identité de consommation, le reste garde son original. Aucun crédit partiel ni stock marchand alimenté. Bonus diplomatique demandé+12, puis effet de la récompense choisie séparément, avec ajustements et hystérésis existants. Succès et transfert une seule fois aux porteurs de la caravane ayant rempli la demande.

## Choix et propriétaires des récompenses

Budget : valeur abstraite×quantité×courbe `(0;1,15),(50000;1),(300000;0,85)`×tirage1,5–2,1. Minimum250 pour la génération standard ; pas de facteur de difficulté supplémentaire dans ce root. Jusqu'à trois options, avec suppression des doublons/échecs. La branche native peut contenir objets, réputation, **humain** ou effets mixtes ; l'honneur Royalty ne relève pas de Core.

La réputation suit la courbe valeur→gain `(100;10),(500;15),(1000;20),(2000;35),(5000;50)`, arrondi probabiliste, plafond100, éligibilité de faction et goodwill≤92. Elle reste distincte du bonus12 de remise. Les lots d'objets sont créés à l'offre et conservés par leurs parts, pas retirés à chaque lecture/reprise. Exclusion de la définition demandée dans le générateur principal ; le remplissage de reliquat ne porte pas ce filtre.

Le choix nettoie les options écartées ; échec/expiration nettoient les récompenses non distribuées. Manifests et reçus décrivent les anciens objets sans créer d'autres propriétaires. Les objets choisis rejoignent la vraie caravane. Choix natif du porteur : capable pas déjà surchargé, sinon capable, sinon tout candidat ; pile entière, surcharge possible. Il ne s'agit pas d'un refus commercial pour manque de place.

Hostilité pendant la mission et timeout sont des causes de fin. L'offre expire séparément. Masquer une offre n'est pas une preuve de destruction de son contenu. Les workers et signaux relus ne démontrent aucun échec immédiat sur destruction de l'établissement ou décès du chef : cible perdue indisponible, pas de résurrection/retargeting. L'événement réel de destruction doit rester prouvable après retrait du site temporaire pour ne pas casser un ancien journal.

## Adaptations locales décidées et travail restant

- Horloge locale10Core/tick ; RNG local sauvegardé et tirage temporaire de quantité explicitement original, sans parité de seed native prétendue. Cuir estimé par arrondi pair pur, sans appeler le producteur réel ou consommer son RNG.
- Les57familles liées au catalogue actuel sont confrontées à l'accessibilité ; les filières non représentées ne sont pas inventées. Crafting est le métier local regroupé. Croissance/récupération suivent les définitions locales déclarées et le seul facteur de récolte courant1.
- Richesse utilisée : **proxy matériel connu entier**, avec les composantes et nombres d'objets/personnes non chiffrés conservés. Les frontières de connaissance/prix du lecteur local sont déclarées. Ce n'est ni la richesse pondérée du narrateur, ni WealthTotal natif, ni une borne basse mathématique démontrée. Aucun prix humain/animal forfaitaire ou rééquilibrage de raids.
- Premier contenu récompense :23types existants, qualité normale, ressources de complément et réputation. Distribution originale bornée ; objets rares/livres, humains récompensés, effets mixtes et pondération standard exhaustive restent ouverts. Plusieurs choix et leurs vrais objets sont conservés ; un paiement argent unique n'est pas substitué.
- Robustesse : conserver des piles distinctes et refuser toute la transaction sans mutation si aucun destinataire ne permet de tout représenter. La perte native sur échecTryAdd n'est pas copiée. Surcharge admise, signalée et soumise au vrai arrêt de marche existant.
- Provenance d'habit prospective : neuf documenté propre, vrai décès marque tous les types portés représentés, avant retrait en caravane. Retrait/transfert ne nettoient pas. Ancien sans provenance reste inconnu et n'est pas offert propre par migration ; il n'est pas étiqueté cadavre par supposition. Le natif réinitialise lors d'une vraie résurrection ordinaire ; aucune résurrection locale livrée et aucun reset inventé.
- Schéma284 : validation283 stricte avant changement de numéro, aucun gain/offre/RNG/personne/date/provenance créé par migration. Holder de quête exclusif, reçus scalaires, RAW/public/résident, voyages et continuités sont qualifiés dans les périmètres et préparations de la note du lot.

La note du lot distingue parcours natif muet acquis, préparations explicites, reprises et contrôles de conservation. Aucun gain FPS global, distribution exhaustive des récompenses ou clôture des six ensembles n'est établi.
