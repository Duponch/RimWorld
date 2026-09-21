# Faune diversifiée — contrat V91

V91 étend la boucle V76–V79 à cinq herbivores obtenables dans les trois nouveaux biomes : lièvre, cerf, mufalo, gazelle et dromadaire. Le lièvre des neiges possède un profil moteur complet et testé, mais son habitat Core local est la toundra, biome non sélectionnable dans ce lot; il reste donc préparatoire. [Valeurs, sources et écarts](../research/fauna-diversity-reference-v91.md).

## Espèces et autorité commune

`animal-species.ts` est l’autorité centrale des IDs, besoins, déplacement, taille, santé, poids écologique, groupes, mêlée, dépouille, viande et cuir. `animalBodyModel(species)` fournit l’anatomie immuable correspondante. Le lièvre historique conserve exactement sa capacité 0,2, faim 0,18/jour, cadence, anatomie, attaques et rendements antérieurs.

Les nouvelles espèces ne sont pas des lièvres redimensionnés. Cerf, mufalo et gazelle utilisent quatre sabots; le dromadaire ajoute une bosse. Échelle sanitaire, PV de chaque partie, vitesse, nutrition, faim, groupes et attaques viennent du profil propre. Un dossier médical animal sauvegarde l’`AnimalSpeciesId`; santé, feu, infection, hygiène, mêlée, chasse et cadavre consultent ce corps. Un corps d’une autre espèce ou un modèle humain substitué est refusé.

## Présence et renouvellement

`enableBiomeWildlife(world, biome)` crée le profil `biome-herbivores-v1` uniquement pour une nouvelle partie. Le vieux `enableWildlife` et `temperate-hares-v1` restent inchangés pour les fixtures et parties historiques. Aucune migration V90 ne choisit un biome, ne crée un animal ou ne réécrit un PRNG.

La population utilise un budget de poids écologique :

`cible complète = largeur × hauteur × densité animale / 10000`

`cible V91 = cible complète × communalité des espèces livrées / communalité Core totale`

Le reliquat des espèces absentes n’est jamais redistribué. La pose initiale choisit dans le sous-ensemble livré jusqu’à la cible; les groupes conservent leur taille et peuvent la dépasser. Ensuite un contrôle sauvegardé a lieu tous les 122 ticks locaux. Sous la cible, il effectue le tirage de renouvellement et le choix sur la communalité Core entière : tomber dans une espèce absente ne produit rien. Une arrivée pose un groupe adulte sur des cellules libres accessibles près de végétaux. Ce mécanisme n’est ni reproduction ni quota garanti.

Les trois profils jouables sont forêt tempérée, forêt boréale et broussailles arides. Le moteur contient aussi la toundra comme référence stricte afin de tester le lièvre des neiges, sans l’exposer comme choix fonctionnel. En particulier, le lièvre des neiges ne remplace pas le lièvre boréal observé dans Core 1.6.4871.

## Besoins, broutage et combat

Chaque animal dépense son débit alimentaire propre et cherche à manger sous 45 % de sa capacité. Une plante est une réserve nutritionnelle `nutrition de l’espèce × croissance`. Après contact et cinquante ticks d’ingestion, l’animal prend au plus son manque, la croissance diminue de la fraction exacte et la plante disparaît seulement si elle est entièrement consommée. Les travaux devenus invalides sont libérés. Baies, cultures, agave et repas admis restent des piles discrètes avec réservations communes; viande et dépouille sont exclues du régime herbivore.

Le déplacement emploie la vitesse de l’espèce sur le noyau de navigation commun. Santé, ralentissements, incapacité, fuite, saignement et faim médicale utilisent son anatomie. La riposte choisit parmi les vrais outils du profil, avec dégâts et récupération propres. La menace, le délai de riposte et les règles civiles V78 ne changent pas. Aucun tempérament prédateur ou manhunter général n’est ajouté.

## Chasse, dépouille et produits

La chasse existante peut désigner toutes les espèces. La chute et la conversion conservent ID, espèce, sexe, dossier médical, orientation et âge thermique. Les items sont distincts : `hare-corpse`, `deer-corpse`, `muffalo-corpse`, `gazelle-corpse`, `dromedary-corpse` et leurs viandes; le lièvre des neiges possède les IDs préparatoires équivalents. Les cuirs sont cuir léger, cuir ordinaire, fourrure bleue et cuir de chameau.

`corpseProducts` résout les deux sorties depuis l’identité de la dépouille. `corpseYield` applique la couverture anatomique et la courbe historique, puis la boucherie applique compétence, poste et arrondi. Quand un gros animal donne plus de 75 unités, une pile de viande au plus est portée et tout surplus viande/cuir est réparti au sol par piles respectant leur limite. La transaction simule d’abord cellules, capacités, IDs, compteurs, XP et deux tirages. Si une sortie ne tient pas, rien ne change. Après réussite, les recettes et filtres conservent l’espèce de viande; un repas simple en consomme dix unités physiques.

Les cuirs suivent les recettes de confection communes du lot. Leur source reste lisible jusqu’à consommation par la recette; ils ne sont pas fusionnés en tissu générique pendant transport ou stockage.

## Sauvegarde V91

Le schéma 90 est validé avant la migration neutre vers 91. Toute espèce autre que le lièvre, profil biome, état de population, nouvelle dépouille, viande ou cuir sous un schéma antérieur est une corruption. V91 valide :

- profil et biome connus, cible recalculée exactement, prochain contrôle dans sa fenêtre, compteurs entiers;
- espèce admise dans le biome, nutrition bornée par sa capacité, repas borné par sa consommation et frappe correspondant à un outil de l’espèce;
- dossier médical dont `body` égale l’espèce de l’acteur ou du corps;
- item de dépouille égal à l’espèce, quantité un, identité unique et âge thermique cohérent;
- produits et filtres V91 seulement dans un monde V91.

Le chargement V90 n’adopte pas le nouveau profil, ne remplit pas le budget et ne modifie pas ses régimes. Le PRNG de la faune reste séparé de cultures, météo, santé et combat.

## Coûts et validation bornée

Le contrôle de population est sparse. Un tick animal conserve au plus une recherche alimentaire potentiellement globale, partagée par priorité tournante; la pose d’un groupe réutilise une capture de navigation et s’arrête au plafond existant. Les modèles anatomiques et profils sont immuables et construits une fois. Le rendu est regroupé par forme côté couche graphique; ce contrat ne revendique ni débit 6× ni parité de population Core sans mesure séparée.

Les contrôles V91 couvrent les six profils, corps et attaques; budgets des quatre profils de référence; renouvellement sauvegardé sans reproduction; rejet sous V90; corps et produits; saturation atomique d’une grande boucherie; puis une chaîne courte dromadaire pilotée : collecte, sauvegarde pendant le travail, reprise, piles de viande/cuir, dix viandes cuites et repas ingéré. Les régressions bornées rejouent faune, combat animal, mêlée, chasse, corps et boucherie. Les mesures natives restent centrales et successives ; les campagnes naturelles sur plusieurs jours sont périodiques selon les contrats touchés.

## Limites

Pas de prédateur, apprivoisement, reproduction, jeunes, lait, tonte, animal de bât, caravane ou migration saisonnière. La toundra, la neige accumulée et le lièvre des neiges jouable attendent un profil de site complet. L’équilibre à long terme entre végétation, groupes et chasse n’est pas déduit d’un scénario court; il doit être observé lors des campagnes contrôlées prévues pour le lot.
